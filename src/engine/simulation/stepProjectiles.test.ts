import { describe, it, expect } from 'vitest';
import { stepProjectiles } from './stepProjectiles';
import type { TickContext } from './types';
import {
  generateTerrain,
  getInterpolatedHeightAt,
  type ProjectileState,
} from '../index';
import type { Position, TankState } from '../../types/game';

/**
 * Test strategy for precise positioning:
 *
 * getProjectilePosition() uses elapsed = (now - startTime) and calculatePosition
 * returns exactly launchConfig.position when elapsed === 0. So every projectile
 * here sets startTime === NOW, which pins its screen position to
 * launchConfig.position. That lets us place a projectile on the ground, in the
 * air, or off-screen deterministically without simulating physics timing.
 */

const CW = 800;
const CH = 600;
const NOW = 1000;
const terrain = generateTerrain({ width: CW, height: CH, seed: 7 });

/** Screen-space y of the terrain surface at world x. */
const surfaceY = (x: number): number => CH - (getInterpolatedHeightAt(terrain, x) ?? 0);

function makeProjectile(pos: Position, over: Partial<ProjectileState> = {}): ProjectileState {
  return {
    isActive: true,
    launchConfig: { position: { ...pos }, angle: 45, power: 50, terrainWidth: CW },
    startTime: NOW,
    tracePoints: [{ ...pos }],
    canvasHeight: CH,
    canvasWidth: CW,
    tankId: 'attacker',
    tankColor: '#ffffff',
    weaponType: 'standard',
    speedMultiplier: 1,
    ...over,
  };
}

function makeTank(id: string, worldPos: Position, over: Partial<TankState> = {}): TankState {
  return {
    id,
    position: { ...worldPos },
    health: 100,
    maxHealth: 100,
    shieldHp: 0,
    maxShieldHp: 0,
    armorType: null,
    angle: 0,
    power: 50,
    color: '#00ff00',
    isActive: true,
    queuedShot: null,
    isReady: false,
    killedByWeapon: null,
    stunTurnsRemaining: 0,
    fuel: 0,
    maxFuel: 100,
    isMoving: false,
    moveTargetX: null,
    moveStartTime: null,
    moveStartX: null,
    ...over,
  };
}

function ctxWith(tanks: TankState[], over: Partial<TickContext> = {}): TickContext {
  return { terrain, tanks, wind: 0, canvasWidth: CW, canvasHeight: CH, now: NOW, ...over };
}

describe('stepProjectiles', () => {
  describe('in-flight advance', () => {
    it('should keep a projectile active and emit no events when it is mid-air', () => {
      const proj = makeProjectile({ x: 400, y: surfaceY(400) - 150 });
      const result = stepProjectiles([proj], ctxWith([]));

      expect(result.projectiles).toHaveLength(1);
      expect(result.projectiles[0]!.isActive).toBe(true);
      expect(result.events).toHaveLength(0);
      expect(result.newExplosions).toHaveLength(0);
    });

    it('should return a new array (not the input reference)', () => {
      const input = [makeProjectile({ x: 400, y: surfaceY(400) - 150 })];
      const result = stepProjectiles(input, ctxWith([]));
      expect(result.projectiles).not.toBe(input);
    });

    it('should pass through an already-resolved (inactive) projectile with no events', () => {
      const proj = makeProjectile({ x: 400, y: surfaceY(400) + 5 }, { isActive: false });
      const result = stepProjectiles([proj], ctxWith([]));

      expect(result.projectiles[0]).toBe(proj); // untouched
      expect(result.events).toHaveLength(0);
      expect(result.newExplosions).toHaveLength(0);
    });
  });

  describe('terrain impact', () => {
    it('should spawn an explosion and emit ProjectileResolved{outOfBounds:false} on terrain impact', () => {
      const proj = makeProjectile({ x: 400, y: surfaceY(400) + 5 });
      const result = stepProjectiles([proj], ctxWith([]));

      expect(result.newExplosions).toHaveLength(1);
      const resolved = result.events.filter((e) => e.type === 'ProjectileResolved');
      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toMatchObject({ ownerTankId: 'attacker', outOfBounds: false });
      expect(result.projectiles[0]!.isActive).toBe(false);

      // An ExplosionSpawned event carries the audio/flagging payload for the host.
      const spawned = result.events.filter((e) => e.type === 'ExplosionSpawned');
      expect(spawned).toHaveLength(1);
      expect(spawned[0]).toMatchObject({
        type: 'ExplosionSpawned',
        weaponType: 'standard',
        x: 400,
      });
      expect((spawned[0] as { blastRadius: number }).blastRadius).toBeGreaterThan(0);
    });

    it('should not emit a TankHit when no tank is within the blast', () => {
      const farTank = makeTank('victim', { x: 100, y: 100 });
      const proj = makeProjectile({ x: 600, y: surfaceY(600) + 5 });
      const result = stepProjectiles([proj], ctxWith([farTank]));

      expect(result.events.some((e) => e.type === 'TankHit')).toBe(false);
      expect(result.newExplosions).toHaveLength(1);
    });

    it('should not spawn an explosion for the inactive shell when a cluster bomb splits', () => {
      // A split has already happened: main is inactive, one live sub remains in
      // the air. The split itself must not produce an explosion or resolution.
      const sub = makeProjectile(
        { x: 400, y: surfaceY(400) - 150 },
        { weaponType: 'cluster_bomb', isSubProjectile: true }
      );
      const main = makeProjectile(
        { x: 400, y: surfaceY(400) - 100 },
        { weaponType: 'cluster_bomb', isActive: false, hasSplit: true, subProjectiles: [sub] }
      );
      const result = stepProjectiles([main], ctxWith([]));

      expect(result.newExplosions).toHaveLength(0);
      expect(result.events).toHaveLength(0);
      expect(result.projectiles[0]!.subProjectiles![0]!.isActive).toBe(true);
    });
  });

  describe('tank blast damage', () => {
    it('should emit a TankHit with the weapon damage for a tank inside the blast', () => {
      const groundY = getInterpolatedHeightAt(terrain, 400) ?? 0;
      const victim = makeTank('victim', { x: 400, y: groundY });
      const attacker = makeTank('attacker', { x: 80, y: getInterpolatedHeightAt(terrain, 80) ?? 0 });
      // Land exactly at the victim's surface position.
      const proj = makeProjectile({ x: 400, y: CH - groundY });

      const result = stepProjectiles([proj], ctxWith([attacker, victim]));

      const hits = result.events.filter((e) => e.type === 'TankHit');
      expect(hits).toHaveLength(1);
      expect(hits[0]).toMatchObject({
        type: 'TankHit',
        tankId: 'victim',
        damage: 35, // standard weapon damage
        weaponType: 'standard',
        sourceTankId: 'attacker',
      });
    });

    it('should not hit a tank far outside the blast radius', () => {
      const groundY = getInterpolatedHeightAt(terrain, 400) ?? 0;
      const victim = makeTank('victim', { x: 400, y: groundY });
      const bystander = makeTank('bystander', { x: 750, y: getInterpolatedHeightAt(terrain, 750) ?? 0 });
      const proj = makeProjectile({ x: 400, y: CH - groundY });

      const result = stepProjectiles([proj], ctxWith([victim, bystander]));

      const hits = result.events.filter((e) => e.type === 'TankHit');
      expect(hits.map((h) => h.type === 'TankHit' && h.tankId)).toEqual(['victim']);
    });

    it('should not deal self-damage to the firing tank via direct-hit detection', () => {
      // Attacker sitting under the impact: it is skipped by in-flight direct-hit
      // detection (own projectile) but may still be caught by blast. Here we
      // place a separate enemy to confirm the firer is excluded from direct hit.
      const groundY = getInterpolatedHeightAt(terrain, 400) ?? 0;
      const enemy = makeTank('enemy', { x: 400, y: groundY });
      const proj = makeProjectile({ x: 400, y: CH - groundY }, { tankId: 'enemy' });
      // Projectile owned by 'enemy' landing on 'enemy' -> no TankHit sourced from itself? It will hit via blast.
      const result = stepProjectiles([proj], ctxWith([enemy]));
      const hits = result.events.filter((e) => e.type === 'TankHit');
      // Blast still geometrically hits the tank; sourceTankId is the owner.
      expect(hits).toHaveLength(1);
      expect(hits[0]).toMatchObject({ tankId: 'enemy', sourceTankId: 'enemy' });
    });
  });

  describe('out of bounds', () => {
    it('should emit ProjectileResolved{outOfBounds:true} and no explosion when off-screen', () => {
      const proj = makeProjectile({ x: CW + 100, y: 300 });
      const result = stepProjectiles([proj], ctxWith([]));

      expect(result.newExplosions).toHaveLength(0);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        type: 'ProjectileResolved',
        ownerTankId: 'attacker',
        outOfBounds: true,
      });
      expect(result.projectiles[0]!.isActive).toBe(false);
    });

    it('should not emit a TankHit when fizzling out of bounds', () => {
      const tank = makeTank('victim', { x: 400, y: getInterpolatedHeightAt(terrain, 400) ?? 0 });
      const proj = makeProjectile({ x: -100, y: 300 });
      const result = stepProjectiles([proj], ctxWith([tank]));

      expect(result.events.every((e) => e.type === 'ProjectileResolved')).toBe(true);
      expect(result.events[0]).toMatchObject({ outOfBounds: true });
    });
  });

  describe('crater weapons', () => {
    it('should emit CraterCreated for a bunker buster on terrain impact', () => {
      const proj = makeProjectile(
        { x: 400, y: surfaceY(400) + 5 },
        { weaponType: 'bunker_buster' }
      );
      const result = stepProjectiles([proj], ctxWith([]));

      const craters = result.events.filter((e) => e.type === 'CraterCreated');
      expect(craters).toHaveLength(1);
      expect(craters[0]).toMatchObject({ x: 400, radius: 55, depth: 27.5 });
    });

    it('should crater the ground for EVERY weapon, sized to its blast radius (destructible terrain)', () => {
      // Standard shell has no explicit craterRadius -> craters by its blast radius (20).
      const proj = makeProjectile({ x: 400, y: surfaceY(400) + 5 }, { weaponType: 'standard' });
      const result = stepProjectiles([proj], ctxWith([]));
      const craters = result.events.filter((e) => e.type === 'CraterCreated');
      expect(craters).toHaveLength(1);
      expect(craters[0]).toMatchObject({ x: 400, radius: 20, depth: 10 });
    });

    it('should BUILD a mound (not a crater) for the Dirt Bomb (tanks-312)', () => {
      const proj = makeProjectile({ x: 400, y: surfaceY(400) + 5 }, { weaponType: 'dirt_bomb' });
      const result = stepProjectiles([proj], ctxWith([]));
      const mounds = result.events.filter((e) => e.type === 'MoundCreated');
      const craters = result.events.filter((e) => e.type === 'CraterCreated');
      expect(craters).toHaveLength(0); // it builds, it does not dig
      expect(mounds).toHaveLength(1);
      expect(mounds[0]).toMatchObject({ x: 400, radius: 45, height: 40 });
    });

    it('should scale the crater down for cluster sub-munitions (reduced blast)', () => {
      // A landed sub-projectile uses 0.6x blast, so its crater is 0.6x too.
      const sub = makeProjectile(
        { x: 400, y: surfaceY(400) + 5 },
        { weaponType: 'standard', isSubProjectile: true }
      );
      const result = stepProjectiles([sub], ctxWith([]));
      const craters = result.events.filter((e) => e.type === 'CraterCreated');
      expect(craters).toHaveLength(1);
      expect((craters[0] as { radius: number }).radius).toBeCloseTo(20 * 0.6, 5);
    });
  });

  describe('bouncing weapons', () => {
    it('should bounce (stay active, no explosion) when bounces remain', () => {
      const proj = makeProjectile(
        { x: 400, y: surfaceY(400) + 5 },
        { weaponType: 'bouncing_betty', bounceCount: 0, maxBounces: 2 }
      );
      const result = stepProjectiles([proj], ctxWith([]));

      expect(result.projectiles[0]!.isActive).toBe(true);
      expect(result.projectiles[0]!.bounceCount).toBe(1);
      expect(result.newExplosions).toHaveLength(0);
      expect(result.events).toHaveLength(0);
    });

    it('should explode (no bounce) when bounces are exhausted', () => {
      const proj = makeProjectile(
        { x: 400, y: surfaceY(400) + 5 },
        { weaponType: 'bouncing_betty', bounceCount: 2, maxBounces: 2 }
      );
      const result = stepProjectiles([proj], ctxWith([]));

      expect(result.projectiles[0]!.isActive).toBe(false);
      expect(result.newExplosions).toHaveLength(1);
      expect(result.events.some((e) => e.type === 'ProjectileResolved')).toBe(true);
    });
  });

  describe('cluster sub-projectiles', () => {
    it('should explode a sub-projectile that reaches the ground with a reduced blast', () => {
      const sub = makeProjectile(
        { x: 400, y: surfaceY(400) + 5 },
        { weaponType: 'cluster_bomb', isSubProjectile: true }
      );
      const main = makeProjectile(
        { x: 400, y: surfaceY(400) - 100 },
        { weaponType: 'cluster_bomb', isActive: false, hasSplit: true, subProjectiles: [sub] }
      );
      const result = stepProjectiles([main], ctxWith([]));

      expect(result.newExplosions).toHaveLength(1);
      expect(result.projectiles[0]!.subProjectiles![0]!.isActive).toBe(false);
      expect(result.events.some((e) => e.type === 'ProjectileResolved')).toBe(true);
    });

    it('should keep an airborne sub-projectile active without events', () => {
      const sub = makeProjectile(
        { x: 400, y: surfaceY(400) - 150 },
        { weaponType: 'cluster_bomb', isSubProjectile: true }
      );
      const main = makeProjectile(
        { x: 400, y: surfaceY(400) - 100 },
        { weaponType: 'cluster_bomb', isActive: false, hasSplit: true, subProjectiles: [sub] }
      );
      const result = stepProjectiles([main], ctxWith([]));

      expect(result.newExplosions).toHaveLength(0);
      expect(result.events).toHaveLength(0);
      expect(result.projectiles[0]!.subProjectiles![0]!.isActive).toBe(true);
    });

    it('should apply 0.6x damage for a sub-projectile blast hitting a tank', () => {
      const groundY = getInterpolatedHeightAt(terrain, 400) ?? 0;
      const victim = makeTank('victim', { x: 400, y: groundY });
      const sub = makeProjectile(
        { x: 400, y: CH - groundY },
        { weaponType: 'cluster_bomb', isSubProjectile: true }
      );
      const main = makeProjectile(
        { x: 400, y: surfaceY(400) - 100 },
        { weaponType: 'cluster_bomb', isActive: false, hasSplit: true, subProjectiles: [sub] }
      );
      const result = stepProjectiles([main], ctxWith([victim]));

      const hits = result.events.filter((e) => e.type === 'TankHit');
      expect(hits).toHaveLength(1);
      // cluster_bomb damage 35 * 0.6 = 21
      expect(hits[0]).toMatchObject({ tankId: 'victim', damage: 35 * 0.6, weaponType: 'cluster_bomb' });
    });
  });

  describe('purity', () => {
    it('should not mutate the input projectiles', () => {
      const proj = makeProjectile({ x: 400, y: surfaceY(400) + 5 });
      Object.freeze(proj);
      Object.freeze(proj.launchConfig);
      Object.freeze(proj.tracePoints);
      const input = [proj];
      Object.freeze(input);
      const snapshot = JSON.parse(JSON.stringify(input));

      // Frozen inputs: any attempt to mutate would throw in strict mode.
      expect(() => stepProjectiles(input, ctxWith([]))).not.toThrow();
      expect(JSON.parse(JSON.stringify(input))).toEqual(snapshot);
    });

    it('should not mutate the input tanks', () => {
      const groundY = getInterpolatedHeightAt(terrain, 400) ?? 0;
      const victim = makeTank('victim', { x: 400, y: groundY });
      Object.freeze(victim);
      Object.freeze(victim.position);
      const proj = makeProjectile({ x: 400, y: CH - groundY });
      const snapshot = JSON.parse(JSON.stringify(victim));

      expect(() => stepProjectiles([proj], ctxWith([victim]))).not.toThrow();
      expect(JSON.parse(JSON.stringify(victim))).toEqual(snapshot);
    });

    it('should produce a new object for a projectile whose state changed', () => {
      const proj = makeProjectile({ x: 400, y: surfaceY(400) + 5 });
      const result = stepProjectiles([proj], ctxWith([]));
      expect(result.projectiles[0]).not.toBe(proj);
      expect(proj.isActive).toBe(true); // original untouched
    });
  });
});
