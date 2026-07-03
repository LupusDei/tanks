import { describe, it, expect } from 'vitest';
import { stepFalling } from './stepFalling';
import type { TickContext } from './types';
import { generateTerrain } from '../terrain';
import type { TankState, TerrainData } from '../../types/game';

const terrain: TerrainData = generateTerrain({ width: 800, height: 600, seed: 5 });

function makeTank(overrides: Partial<TankState> = {}): TankState {
  return {
    id: 'player', position: { x: 100, y: 200 }, health: 100, maxHealth: 100,
    shieldHp: 0, maxShieldHp: 0, armorType: null, angle: 45, power: 50, color: 'red',
    isActive: true, queuedShot: null, isReady: false, killedByWeapon: null,
    stunTurnsRemaining: 0, fuel: 100, maxFuel: 100, isMoving: false,
    moveTargetX: null, moveStartTime: null, moveStartX: null,
    ...overrides,
  };
}

function ctxAt(now: number, tanks: TankState[]): TickContext {
  return { now, terrain, tanks, wind: 0, canvasWidth: 800, canvasHeight: 600 };
}

describe('stepFalling (tanks-311)', () => {
  it('should emit FallComplete once a falling tank reaches its target (happy path)', () => {
    const t = makeTank({ isFalling: true, fallStartY: 200, fallTargetY: 120, fallStartTime: 0 });
    // Far enough in time for the fall to finish.
    const result = stepFalling([t], ctxAt(10_000, [t]));
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({ type: 'FallComplete', tankId: 'player', finalY: 120 });
  });

  it('should NOT emit while a tank is still mid-fall (edge)', () => {
    const t = makeTank({ isFalling: true, fallStartY: 200, fallTargetY: 120, fallStartTime: 1000 });
    // now barely past startTime -> still falling.
    const result = stepFalling([t], ctxAt(1050, [t]));
    expect(result.events).toHaveLength(0);
  });

  it('should ignore tanks that are not falling or missing fall fields (error path)', () => {
    const notFalling = makeTank({ id: 'a', isFalling: false });
    const badFields = makeTank({ id: 'b', isFalling: true, fallStartY: null, fallTargetY: 120, fallStartTime: 0 });
    const result = stepFalling([notFalling, badFields], ctxAt(10_000, [notFalling, badFields]));
    expect(result.events).toHaveLength(0);
  });

  it('should emit one event per completed falling tank', () => {
    const a = makeTank({ id: 'a', isFalling: true, fallStartY: 300, fallTargetY: 100, fallStartTime: 0 });
    const b = makeTank({ id: 'b', isFalling: true, fallStartY: 250, fallTargetY: 90, fallStartTime: 0 });
    const result = stepFalling([a, b], ctxAt(10_000, [a, b]));
    expect(result.events.map((e) => e.tankId).sort()).toEqual(['a', 'b']);
  });
});
