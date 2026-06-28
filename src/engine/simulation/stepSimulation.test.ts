import { describe, it, expect } from 'vitest';
import { stepSimulation } from './stepSimulation';
import { createEmptySimulationState, type SimulationState, type TickContext } from './types';
import { generateTerrain } from '../terrain';
import { createProjectileState, calculateTankPosition } from '../index';
import type { TankState, TerrainData } from '../../types/game';

const terrain: TerrainData = generateTerrain({ width: 800, height: 600, seed: 7 });

function makeTank(id: string, x: number): TankState {
  return {
    id,
    position: { x, y: 200 },
    health: 100,
    maxHealth: 100,
    shieldHp: 0,
    maxShieldHp: 0,
    armorType: null,
    angle: 45,
    power: 50,
    color: 'red',
    isActive: true,
    queuedShot: null,
    isReady: false,
    killedByWeapon: null,
    stunTurnsRemaining: 0,
    fuel: 100,
    maxFuel: 100,
    isMoving: false,
    moveTargetX: null,
    moveStartTime: null,
    moveStartX: null,
  };
}

function ctxAt(now: number, tanks: TankState[] = []): TickContext {
  return { now, terrain, tanks, wind: 0, canvasWidth: 800, canvasHeight: 600 };
}

function makeProjectile(now: number): SimulationState['projectiles'][number] {
  // A firing tank seated ON the terrain, aimed steeply up at high power so the
  // shot stays airborne for well beyond a single tick.
  const onTerrain = calculateTankPosition(terrain, 100);
  const shooter: TankState = {
    ...makeTank('player', 100),
    position: onTerrain,
    angle: 5, // near-vertical (0 = straight up in this game's UI angle convention)
    power: 90,
  };
  return createProjectileState(shooter, now, 600, 800, 'standard');
}

describe('stepSimulation', () => {
  it('should return an idle empty state with no events for an empty simulation (happy path)', () => {
    const state = createEmptySimulationState();
    const result = stepSimulation(state, 16, ctxAt(1000));
    expect(result.events).toEqual([]);
    expect(result.state.projectiles).toEqual([]);
    expect(result.state.explosions).toEqual([]);
    // Ambient creates the wind particle system on first tick.
    expect(result.state.windParticles).not.toBeNull();
  });

  it('should advance an in-flight projectile without resolving it early (happy path)', () => {
    const state = createEmptySimulationState();
    const startNow = 1000;
    state.projectiles = [makeProjectile(startNow)];
    // Small time delta: projectile is still airborne, so no ProjectileResolved.
    const result = stepSimulation(state, 16, ctxAt(startNow + 16, [makeTank('player', 100)]));
    expect(result.state.projectiles).toHaveLength(1);
    const resolved = result.events.filter((e) => e.type === 'ProjectileResolved');
    expect(resolved).toHaveLength(0);
  });

  it('should aggregate events from all sub-steps (edge: movement completion included)', () => {
    const state = createEmptySimulationState();
    const mover = makeTank('player', 100);
    mover.isMoving = true;
    mover.moveStartX = 100;
    mover.moveTargetX = 300;
    mover.moveStartTime = 0;
    // now far past any animation duration → MoveComplete should be emitted.
    const result = stepSimulation(state, 16, ctxAt(10_000_000, [mover]));
    const moveEvents = result.events.filter((e) => e.type === 'MoveComplete');
    expect(moveEvents).toHaveLength(1);
    expect(moveEvents[0]).toMatchObject({ type: 'MoveComplete', tankId: 'player' });
  });

  it('should not mutate the input state (purity)', () => {
    const state = createEmptySimulationState();
    state.projectiles = [makeProjectile(1000)];
    const projRef = state.projectiles;
    const explRef = state.explosions;
    stepSimulation(state, 16, ctxAt(1016, [makeTank('player', 100)]));
    // Same array references on the input object — step returns NEW collections.
    expect(state.projectiles).toBe(projRef);
    expect(state.explosions).toBe(explRef);
  });

  it('should be deterministic for identical inputs (determinism snapshot)', () => {
    const build = (): SimulationState => {
      const s = createEmptySimulationState();
      s.projectiles = [makeProjectile(1000)];
      return s;
    };
    const tanks = [makeTank('player', 100), makeTank('enemy', 700)];
    const a = stepSimulation(build(), 16, ctxAt(1200, tanks));
    const b = stepSimulation(build(), 16, ctxAt(1200, tanks));
    // Events are a pure function of inputs.
    expect(a.events).toEqual(b.events);
    expect(a.state.projectiles.length).toBe(b.state.projectiles.length);
  });
});
