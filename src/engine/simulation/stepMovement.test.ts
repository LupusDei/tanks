import { describe, it, expect } from 'vitest';
import { stepMovement } from './stepMovement';
import type { TickContext } from './types';
import { generateTerrain } from '../terrain';
import { calculateAnimationDuration } from '../movement';
import type { TankState, TerrainData } from '../../types/game';

// Deterministic terrain shared across tests.
const terrain: TerrainData = generateTerrain({ width: 800, height: 600, seed: 42 });

/**
 * Build a real TankState with sane defaults, overridable per test.
 * No mocks — we use the actual type so the test verifies behavior, not shape.
 */
function makeTank(overrides: Partial<TankState> = {}): TankState {
  return {
    id: 'tank-1',
    position: { x: 100, y: 200 },
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
    ...overrides,
  };
}

/** Build a moving tank whose animation runs from startX -> targetX starting at moveStartTime. */
function makeMovingTank(
  id: string,
  startX: number,
  targetX: number,
  moveStartTime: number
): TankState {
  return makeTank({
    id,
    position: { x: startX, y: 200 },
    isMoving: true,
    moveStartX: startX,
    moveTargetX: targetX,
    moveStartTime,
  });
}

function ctxAt(now: number): TickContext {
  return {
    now,
    terrain,
    tanks: [],
    wind: 0,
    canvasWidth: terrain.width,
    canvasHeight: terrain.height,
  };
}

describe('stepMovement', () => {
  it('should emit exactly one MoveComplete with correct finalX when a tank animation has elapsed past its duration', () => {
    const startX = 100;
    const targetX = 300;
    const moveStartTime = 0;
    const duration = calculateAnimationDuration(targetX - startX, terrain.width);
    const tank = makeMovingTank('tank-1', startX, targetX, moveStartTime);

    // now is well past the animation duration -> animation is complete.
    const result = stepMovement([tank], ctxAt(moveStartTime + duration + 1000));

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({
      type: 'MoveComplete',
      tankId: 'tank-1',
      finalX: targetX,
    });
  });

  it('should emit nothing for a tank still mid-animation (edge: progress < 1)', () => {
    const startX = 100;
    const targetX = 300;
    const moveStartTime = 1000;
    const duration = calculateAnimationDuration(targetX - startX, terrain.width);
    const tank = makeMovingTank('tank-1', startX, targetX, moveStartTime);

    // now is only halfway through the animation.
    const result = stepMovement([tank], ctxAt(moveStartTime + duration / 2));

    expect(result.events).toHaveLength(0);
  });

  it('should emit nothing for a non-moving tank (isMoving false)', () => {
    const tank = makeTank({ isMoving: false });
    const result = stepMovement([tank], ctxAt(999999));
    expect(result.events).toHaveLength(0);
  });

  it('should emit nothing when move fields are null even if isMoving is true (error/invalid state)', () => {
    const tankMissingTarget = makeTank({ isMoving: true, moveStartX: 100, moveStartTime: 0, moveTargetX: null });
    const tankMissingStartX = makeTank({ id: 't2', isMoving: true, moveStartX: null, moveStartTime: 0, moveTargetX: 300 });
    const tankMissingStartTime = makeTank({ id: 't3', isMoving: true, moveStartX: 100, moveStartTime: null, moveTargetX: 300 });

    const result = stepMovement(
      [tankMissingTarget, tankMissingStartX, tankMissingStartTime],
      ctxAt(999999)
    );

    expect(result.events).toHaveLength(0);
  });

  it('should emit one event per completing tank when multiple tanks complete', () => {
    const tankA = makeMovingTank('a', 100, 250, 0);
    const tankB = makeMovingTank('b', 400, 600, 0);
    // A mix: one still mid-animation should be excluded.
    const tankC = makeMovingTank('c', 50, 700, 5000);

    const durA = calculateAnimationDuration(250 - 100, terrain.width);
    const durB = calculateAnimationDuration(600 - 400, terrain.width);
    const now = Math.max(durA, durB) + 1; // past A and B, but C started at 5000 (far from done)

    const result = stepMovement([tankA, tankB, tankC], ctxAt(now));

    const ids = result.events.map(e => e.tankId).sort();
    expect(ids).toEqual(['a', 'b']);
    expect(result.events).toHaveLength(2);
    // Each completes exactly once with finalX === its targetX.
    expect(result.events.find(e => e.tankId === 'a')?.finalX).toBe(250);
    expect(result.events.find(e => e.tankId === 'b')?.finalX).toBe(600);
  });

  it('should be pure: it must not mutate the input tanks', () => {
    const tank = makeMovingTank('tank-1', 100, 300, 0);
    const snapshot = structuredClone(tank);
    const tanks = [tank];

    stepMovement(tanks, ctxAt(1_000_000));

    expect(tank).toEqual(snapshot);
    expect(tanks).toHaveLength(1);
  });
});
