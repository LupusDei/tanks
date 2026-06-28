import { describe, it, expect } from 'vitest';
import {
  createEmptySimulationState,
  isSimulationIdle,
  isTankHit,
  isTankDestroyed,
  isMoveComplete,
  isExplosionSpawned,
  isProjectileResolved,
  isCraterCreated,
  type SimEvent,
  type SimulationState,
} from './types';

describe('createEmptySimulationState', () => {
  it('should return empty collections and null wind particles (happy path)', () => {
    const s = createEmptySimulationState();
    expect(s.projectiles).toEqual([]);
    expect(s.explosions).toEqual([]);
    expect(s.destructions).toEqual([]);
    expect(s.moneyAnimations).toEqual([]);
    expect(s.windParticles).toBeNull();
  });

  it('should return a fresh object each call (no shared references / edge)', () => {
    const a = createEmptySimulationState();
    const b = createEmptySimulationState();
    expect(a).not.toBe(b);
    expect(a.projectiles).not.toBe(b.projectiles);
  });
});

describe('isSimulationIdle', () => {
  it('should be true for an empty state', () => {
    expect(isSimulationIdle(createEmptySimulationState())).toBe(true);
  });

  it('should be false when a projectile is active', () => {
    const s = createEmptySimulationState();
    // Minimal stand-in; only length is inspected by isSimulationIdle.
    s.projectiles.push({} as SimulationState['projectiles'][number]);
    expect(isSimulationIdle(s)).toBe(false);
  });

  it('should ignore money animations and wind particles (edge)', () => {
    const s = createEmptySimulationState();
    s.moneyAnimations.push({} as SimulationState['moneyAnimations'][number]);
    expect(isSimulationIdle(s)).toBe(true);
  });
});

describe('SimEvent type guards', () => {
  const hit: SimEvent = { type: 'TankHit', tankId: 't1', damage: 35, weaponType: 'standard', x: 1, y: 2 };
  const dead: SimEvent = { type: 'TankDestroyed', tankId: 't2', weaponType: 'precision' };
  const move: SimEvent = { type: 'MoveComplete', tankId: 't3', finalX: 100 };
  const resolved: SimEvent = { type: 'ProjectileResolved', ownerTankId: 't4', outOfBounds: true };
  const crater: SimEvent = { type: 'CraterCreated', x: 50, radius: 40, depth: 20 };
  const boom: SimEvent = { type: 'ExplosionSpawned', x: 5, y: 6, weaponType: 'heavy_artillery', blastRadius: 35 };
  const all = [hit, dead, move, resolved, crater, boom];

  it('should narrow each variant correctly (happy path)', () => {
    expect(all.filter(isTankHit)).toEqual([hit]);
    expect(all.filter(isTankDestroyed)).toEqual([dead]);
    expect(all.filter(isMoveComplete)).toEqual([move]);
    expect(all.filter(isProjectileResolved)).toEqual([resolved]);
    expect(all.filter(isCraterCreated)).toEqual([crater]);
    expect(all.filter(isExplosionSpawned)).toEqual([boom]);
  });

  it('should be mutually exclusive (a TankHit is not any other type / edge)', () => {
    expect(isTankDestroyed(hit)).toBe(false);
    expect(isMoveComplete(hit)).toBe(false);
    expect(isProjectileResolved(hit)).toBe(false);
    expect(isCraterCreated(hit)).toBe(false);
  });

  it('should narrow the field type for safe access (compile + runtime)', () => {
    const found = all.find(isCraterCreated);
    expect(found?.radius).toBe(40);
  });
});
