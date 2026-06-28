import { describe, it, expect } from 'vitest';
import { stepEffects } from './stepEffects';
import {
  createExplosion,
  EXPLOSION_DURATION_MS,
  createTankDestruction,
  DESTRUCTION_DURATION_MS,
  type ExplosionState,
  type TankDestructionState,
} from '../index';
import type { TankState } from '../../types/game';

/**
 * Build a real, killed TankState so createTankDestruction returns a non-null
 * destruction with realistic debris/particles.
 */
function makeKilledTank(overrides: Partial<TankState> = {}): TankState {
  return {
    id: 'tank-1',
    position: { x: 100, y: 50 },
    angle: 45,
    power: 50,
    health: 0,
    color: 'red',
    fuel: 100,
    isAI: false,
    killedByWeapon: 'standard',
    ...overrides,
  } as TankState;
}

const CANVAS_HEIGHT = 600;

describe('stepEffects', () => {
  it('should retain an unfinished explosion and drop a finished one when stepping at now', () => {
    const startTime = 1000;
    const active = createExplosion({ x: 10, y: 20 }, startTime, 20, 'standard');
    const finished = createExplosion({ x: 30, y: 40 }, startTime, 20, 'standard');

    // standard durationMultiplier is 1.0, so duration === EXPLOSION_DURATION_MS.
    // now is just past the finished explosion's full duration but only partway
    // through the active one (which we give a later startTime).
    const activeLater = createExplosion(
      { x: 10, y: 20 },
      startTime + EXPLOSION_DURATION_MS, // active still has plenty of time left
      20,
      'standard'
    );
    const now = startTime + EXPLOSION_DURATION_MS + 1;

    const result = stepEffects([finished, activeLater, active], [], now);

    expect(result.explosions).toEqual([activeLater]);
    expect(result.destructions).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it('should retain an unfinished destruction and drop a finished one when stepping at now', () => {
    const startTime = 5000;
    const finished = createTankDestruction(makeKilledTank(), CANVAS_HEIGHT, startTime)!;
    const active = createTankDestruction(
      makeKilledTank({ id: 'tank-2' }),
      CANVAS_HEIGHT,
      startTime + DESTRUCTION_DURATION_MS
    )!;

    const now = startTime + DESTRUCTION_DURATION_MS + 1;

    const result = stepEffects([], [finished, active], now);

    expect(result.destructions).toEqual([active]);
    expect(result.explosions).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it('should drop entries already flagged isActive === false', () => {
    const startTime = 0;
    const inactiveExplosion: ExplosionState = {
      ...createExplosion({ x: 0, y: 0 }, startTime, 20, 'standard'),
      isActive: false,
    };
    const inactiveDestruction: TankDestructionState = {
      ...createTankDestruction(makeKilledTank(), CANVAS_HEIGHT, startTime)!,
      isActive: false,
    };

    // now is well within the time window — only the isActive flag should drop them.
    const result = stepEffects([inactiveExplosion], [inactiveDestruction], startTime + 1);

    expect(result.explosions).toEqual([]);
    expect(result.destructions).toEqual([]);
  });

  it('should return empty arrays and no events for empty inputs', () => {
    const result = stepEffects([], [], 12345);

    expect(result.explosions).toEqual([]);
    expect(result.destructions).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it('should retain an explosion exactly at the moment before completion (boundary)', () => {
    const startTime = 100;
    // durationMultiplier 1.0 -> finished exactly at startTime + EXPLOSION_DURATION_MS.
    const explosion = createExplosion({ x: 1, y: 1 }, startTime, 20, 'standard');

    const justBefore = startTime + EXPLOSION_DURATION_MS - 1;
    expect(stepEffects([explosion], [], justBefore).explosions).toEqual([explosion]);

    const exactlyAt = startTime + EXPLOSION_DURATION_MS;
    expect(stepEffects([explosion], [], exactlyAt).explosions).toEqual([]);
  });

  it('should not mutate the input arrays or their elements (purity)', () => {
    const startTime = 2000;
    const explosion = createExplosion({ x: 5, y: 5 }, startTime, 20, 'standard');
    const destruction = createTankDestruction(makeKilledTank(), CANVAS_HEIGHT, startTime)!;

    const explosions = [explosion];
    const destructions = [destruction];
    const explosionSnapshot = JSON.parse(JSON.stringify(explosion));
    const destructionSnapshot = JSON.parse(JSON.stringify(destruction));

    const result = stepEffects(explosions, destructions, startTime + 1);

    // Inputs unchanged in length and contents.
    expect(explosions).toEqual([explosion]);
    expect(destructions).toEqual([destruction]);
    expect(explosion).toEqual(explosionSnapshot);
    expect(destruction).toEqual(destructionSnapshot);

    // Returned arrays are new array instances, not the same references.
    expect(result.explosions).not.toBe(explosions);
    expect(result.destructions).not.toBe(destructions);
  });
});
