import { describe, it, expect } from 'vitest';
import {
  MOVEMENT_ANIMATION_DURATION,
  LARGE_TERRAIN_WIDTH,
  TANK_BODY_WIDTH,
  TANK_WHEEL_RADIUS,
  TANK_BODY_HEIGHT,
  getMaxMovementDistance,
  calculateFuelCost,
  checkTankCollision,
  calculateMovementTarget,
  easeInOutQuad,
  getAnimatedPosition,
  getFinalPosition,
} from './movement';
import type { TankState, TerrainData } from '../types/game';

// Helper function to create a mock tank
function createMockTank(overrides: Partial<TankState> = {}): TankState {
  return {
    id: 'test-tank',
    position: { x: 640, y: 100 },
    health: 100,
    maxHealth: 100,
    angle: 0,
    power: 50,
    color: 'green',
    isActive: true,
    isReady: false,
    queuedShot: null,
    shieldHp: 0,
    maxShieldHp: 0,
    armorType: null,
    killedByWeapon: null,
    stunTurnsRemaining: 0,
    fuel: 50,
    maxFuel: 100,
    isMoving: false,
    moveTargetX: null,
    moveStartTime: null,
    moveStartX: null,
    ...overrides,
  };
}

// Helper function to create mock terrain
function createMockTerrain(width: number = 1280, height: number = 720): TerrainData {
  const points: number[] = [];
  for (let i = 0; i < width; i++) {
    points.push(100); // Flat terrain at height 100
  }
  return { width, height, points };
}

describe('movement constants', () => {
  it('MOVEMENT_ANIMATION_DURATION is 500ms', () => {
    expect(MOVEMENT_ANIMATION_DURATION).toBe(500);
  });

  it('LARGE_TERRAIN_WIDTH is 1280', () => {
    expect(LARGE_TERRAIN_WIDTH).toBe(1280);
  });

  it('TANK_BODY_WIDTH is 50', () => {
    expect(TANK_BODY_WIDTH).toBe(50);
  });

  it('TANK_WHEEL_RADIUS is 5', () => {
    expect(TANK_WHEEL_RADIUS).toBe(5);
  });

  it('TANK_BODY_HEIGHT is 16', () => {
    expect(TANK_BODY_HEIGHT).toBe(16);
  });
});

describe('getMaxMovementDistance', () => {
  it('returns 0 when fuel is 0', () => {
    expect(getMaxMovementDistance(0, 1280)).toBe(0);
  });

  it('returns 0 when fuel is negative', () => {
    expect(getMaxMovementDistance(-10, 1280)).toBe(0);
  });

  it('returns 1280px for 100 fuel on Large terrain', () => {
    // 100 fuel = 4 * 25 fuel = 4 * 320px = 1280px (full terrain width)
    expect(getMaxMovementDistance(100, 1280)).toBe(1280);
  });

  it('returns 320px for 25 fuel on Large terrain', () => {
    // 25 fuel = 320px = 25% of Large terrain
    expect(getMaxMovementDistance(25, 1280)).toBe(320);
  });

  it('scales with terrain width', () => {
    // For Medium terrain (960px), movement distance should be proportionally smaller
    const largeDist = getMaxMovementDistance(100, 1280);
    const mediumDist = getMaxMovementDistance(100, 960);
    expect(mediumDist).toBe(largeDist * (960 / 1280));
  });

  it('returns proportional distance for partial fuel', () => {
    const fullFuel = getMaxMovementDistance(100, 1280);
    const halfFuel = getMaxMovementDistance(50, 1280);
    expect(halfFuel).toBeCloseTo(fullFuel * 0.5, 5);
  });
});

describe('calculateFuelCost', () => {
  it('returns 0 for zero distance', () => {
    expect(calculateFuelCost(0, 1280)).toBe(0);
  });

  it('returns 0 for negative distance', () => {
    expect(calculateFuelCost(-100, 1280)).toBe(0);
  });

  it('returns 25 fuel for 320px on Large terrain', () => {
    // 320px = 25% of Large terrain = 25 fuel
    expect(calculateFuelCost(320, 1280)).toBe(25);
  });

  it('rounds up to prevent free movement', () => {
    // 1px should cost at least 1 fuel (ceiling)
    expect(calculateFuelCost(1, 1280)).toBeGreaterThanOrEqual(1);
  });

  it('scales inversely with terrain width', () => {
    // Same pixel distance on smaller terrain costs more fuel
    const largeCost = calculateFuelCost(100, 1280);
    const mediumCost = calculateFuelCost(100, 960);
    expect(mediumCost).toBeGreaterThan(largeCost);
  });

  it('is inverse of getMaxMovementDistance', () => {
    // If 50 fuel gets you X distance, then X distance should cost approximately 50 fuel
    const fuel = 50;
    const distance = getMaxMovementDistance(fuel, 1280);
    const cost = calculateFuelCost(distance, 1280);
    // Allow small rounding difference due to ceil
    expect(cost).toBeGreaterThanOrEqual(fuel);
    expect(cost).toBeLessThanOrEqual(fuel + 1);
  });
});

describe('checkTankCollision', () => {
  it('returns null when no other tanks exist', () => {
    const tank = createMockTank({ position: { x: 100, y: 100 } });
    const result = checkTankCollision(tank, [tank], 200);
    expect(result).toBeNull();
  });

  it('ignores dead tanks', () => {
    const tank = createMockTank({ id: 'tank1', position: { x: 100, y: 100 } });
    const deadTank = createMockTank({
      id: 'tank2',
      position: { x: 150, y: 100 },
      health: 0,
    });
    const result = checkTankCollision(tank, [tank, deadTank], 200);
    expect(result).toBeNull();
  });

  it('detects collision when moving right toward another tank', () => {
    const movingTank = createMockTank({ id: 'tank1', position: { x: 100, y: 100 } });
    const blockingTank = createMockTank({ id: 'tank2', position: { x: 200, y: 100 } });

    const result = checkTankCollision(movingTank, [movingTank, blockingTank], 250);

    expect(result).not.toBeNull();
    expect(result!.collidedTankId).toBe('tank2');
    // Should stop at TANK_BODY_WIDTH (50) before the blocking tank
    expect(result!.collidesAt).toBe(200 - TANK_BODY_WIDTH);
  });

  it('detects collision when moving left toward another tank', () => {
    const movingTank = createMockTank({ id: 'tank1', position: { x: 300, y: 100 } });
    const blockingTank = createMockTank({ id: 'tank2', position: { x: 200, y: 100 } });

    const result = checkTankCollision(movingTank, [movingTank, blockingTank], 100);

    expect(result).not.toBeNull();
    expect(result!.collidedTankId).toBe('tank2');
    // Should stop at TANK_BODY_WIDTH (50) after the blocking tank
    expect(result!.collidesAt).toBe(200 + TANK_BODY_WIDTH);
  });

  it('returns nearest collision when multiple tanks block path', () => {
    const movingTank = createMockTank({ id: 'tank1', position: { x: 100, y: 100 } });
    const nearTank = createMockTank({ id: 'tank2', position: { x: 200, y: 100 } });
    const farTank = createMockTank({ id: 'tank3', position: { x: 400, y: 100 } });

    const result = checkTankCollision(
      movingTank,
      [movingTank, nearTank, farTank],
      500
    );

    expect(result).not.toBeNull();
    expect(result!.collidedTankId).toBe('tank2');
    expect(result!.collidesAt).toBe(200 - TANK_BODY_WIDTH);
  });

  it('does not detect collision when target is before other tank', () => {
    const movingTank = createMockTank({ id: 'tank1', position: { x: 100, y: 100 } });
    const otherTank = createMockTank({ id: 'tank2', position: { x: 300, y: 100 } });

    // Target X is before the other tank, no collision
    const result = checkTankCollision(movingTank, [movingTank, otherTank], 200);

    expect(result).toBeNull();
  });

  it('ignores tanks behind movement direction', () => {
    const movingTank = createMockTank({ id: 'tank1', position: { x: 300, y: 100 } });
    const behindTank = createMockTank({ id: 'tank2', position: { x: 100, y: 100 } });

    // Moving right, tank behind should be ignored
    const result = checkTankCollision(movingTank, [movingTank, behindTank], 500);

    expect(result).toBeNull();
  });
});

describe('calculateMovementTarget', () => {
  it('returns current position when fuel is 0', () => {
    const tank = createMockTank({ position: { x: 640, y: 100 }, fuel: 0 });
    const terrain = createMockTerrain();

    const result = calculateMovementTarget(tank, 'right', [tank], terrain);

    expect(result.targetX).toBe(640);
    expect(result.fuelCost).toBe(0);
  });

  it('moves left with Q key', () => {
    const tank = createMockTank({ position: { x: 640, y: 100 }, fuel: 25 });
    const terrain = createMockTerrain();

    const result = calculateMovementTarget(tank, 'left', [tank], terrain);

    expect(result.targetX).toBeLessThan(640);
    expect(result.fuelCost).toBeGreaterThan(0);
  });

  it('moves right with E key', () => {
    const tank = createMockTank({ position: { x: 640, y: 100 }, fuel: 25 });
    const terrain = createMockTerrain();

    const result = calculateMovementTarget(tank, 'right', [tank], terrain);

    expect(result.targetX).toBeGreaterThan(640);
    expect(result.fuelCost).toBeGreaterThan(0);
  });

  it('respects terrain left boundary', () => {
    const tank = createMockTank({ position: { x: 50, y: 100 }, fuel: 100 });
    const terrain = createMockTerrain();

    const result = calculateMovementTarget(tank, 'left', [tank], terrain);

    // Should not go below TANK_BODY_WIDTH / 2 margin
    expect(result.targetX).toBeGreaterThanOrEqual(TANK_BODY_WIDTH / 2);
  });

  it('respects terrain right boundary', () => {
    const tank = createMockTank({ position: { x: 1230, y: 100 }, fuel: 100 });
    const terrain = createMockTerrain();

    const result = calculateMovementTarget(tank, 'right', [tank], terrain);

    // Should not exceed terrain.width - TANK_BODY_WIDTH / 2 margin
    expect(result.targetX).toBeLessThanOrEqual(terrain.width - TANK_BODY_WIDTH / 2);
  });

  it('stops at tank collision', () => {
    const movingTank = createMockTank({
      id: 'tank1',
      position: { x: 100, y: 100 },
      fuel: 100,
    });
    const blockingTank = createMockTank({
      id: 'tank2',
      position: { x: 200, y: 100 },
    });
    const terrain = createMockTerrain();

    const result = calculateMovementTarget(
      movingTank,
      'right',
      [movingTank, blockingTank],
      terrain
    );

    // Should stop before the blocking tank
    expect(result.targetX).toBe(200 - TANK_BODY_WIDTH);
  });

  it('click-to-move respects fuel limit', () => {
    const tank = createMockTank({ position: { x: 640, y: 100 }, fuel: 25 });
    const terrain = createMockTerrain();
    const maxDist = getMaxMovementDistance(25, terrain.width);

    // Click far away - should be limited by fuel
    const result = calculateMovementTarget(tank, 'right', [tank], terrain, 1200);

    expect(result.targetX - tank.position.x).toBeLessThanOrEqual(maxDist + 1);
  });

  it('click-to-move can be shorter than fuel allows', () => {
    const tank = createMockTank({ position: { x: 640, y: 100 }, fuel: 100 });
    const terrain = createMockTerrain();

    // Click nearby - should move to click position, not max fuel distance
    const clickX = 660;
    const result = calculateMovementTarget(tank, 'right', [tank], terrain, clickX);

    expect(result.targetX).toBe(clickX);
    expect(result.fuelCost).toBeLessThan(100);
  });

  it('calculates fuel cost for actual distance traveled', () => {
    const tank = createMockTank({ position: { x: 640, y: 100 }, fuel: 50 });
    const terrain = createMockTerrain();

    const result = calculateMovementTarget(tank, 'right', [tank], terrain);
    const actualDistance = Math.abs(result.targetX - tank.position.x);
    const expectedCost = calculateFuelCost(actualDistance, terrain.width);

    expect(result.fuelCost).toBe(expectedCost);
  });
});

describe('easeInOutQuad', () => {
  it('returns 0 at t=0', () => {
    expect(easeInOutQuad(0)).toBe(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeInOutQuad(1)).toBe(1);
  });

  it('returns 0.5 at t=0.5', () => {
    expect(easeInOutQuad(0.5)).toBe(0.5);
  });

  it('is slower at start than linear (ease-in)', () => {
    const t = 0.25;
    expect(easeInOutQuad(t)).toBeLessThan(t);
  });

  it('is faster at end than linear (ease-out)', () => {
    const t = 0.75;
    expect(easeInOutQuad(t)).toBeGreaterThan(t);
  });

  it('is symmetric around t=0.5', () => {
    const t1 = 0.3;
    const t2 = 0.7;
    // easeInOutQuad(0.3) + easeInOutQuad(0.7) should equal 1
    expect(easeInOutQuad(t1) + easeInOutQuad(t2)).toBeCloseTo(1, 10);
  });

  it('produces smooth progression', () => {
    // Values should increase monotonically
    const prev: number[] = [];
    for (let t = 0; t <= 1; t += 0.1) {
      const val = easeInOutQuad(t);
      if (prev.length > 0) {
        expect(val).toBeGreaterThanOrEqual(prev[prev.length - 1]!);
      }
      prev.push(val);
    }
  });
});

describe('getAnimatedPosition', () => {
  const terrain = createMockTerrain();

  it('returns start position at time 0', () => {
    const result = getAnimatedPosition(100, 200, terrain, 1000, 1000);

    expect(result.position.x).toBeCloseTo(100, 5);
    expect(result.complete).toBe(false);
  });

  it('returns end position after animation duration', () => {
    const result = getAnimatedPosition(
      100,
      200,
      terrain,
      1000,
      1000 + MOVEMENT_ANIMATION_DURATION + 1
    );

    expect(result.position.x).toBeCloseTo(200, 5);
    expect(result.complete).toBe(true);
  });

  it('returns midpoint at half duration (with easing)', () => {
    const result = getAnimatedPosition(
      100,
      200,
      terrain,
      1000,
      1000 + MOVEMENT_ANIMATION_DURATION / 2
    );

    // At t=0.5, easeInOutQuad returns 0.5
    expect(result.position.x).toBeCloseTo(150, 5);
    expect(result.complete).toBe(false);
  });

  it('calculates correct Y position from terrain', () => {
    const result = getAnimatedPosition(100, 200, terrain, 1000, 1000);

    // Y should be terrainHeight (100) + TANK_WHEEL_RADIUS + TANK_BODY_HEIGHT/2
    const expectedY = 100 + TANK_WHEEL_RADIUS + TANK_BODY_HEIGHT / 2;
    expect(result.position.y).toBeCloseTo(expectedY, 5);
  });

  it('handles moving left (decreasing X)', () => {
    const result = getAnimatedPosition(
      200,
      100,
      terrain,
      1000,
      1000 + MOVEMENT_ANIMATION_DURATION + 1
    );

    expect(result.position.x).toBeCloseTo(100, 5);
    expect(result.complete).toBe(true);
  });
});

describe('getFinalPosition', () => {
  const terrain = createMockTerrain();

  it('returns correct X position', () => {
    const result = getFinalPosition(640, terrain);
    expect(result.x).toBe(640);
  });

  it('calculates Y from terrain height', () => {
    const result = getFinalPosition(640, terrain);
    // Y should be terrainHeight (100) + TANK_WHEEL_RADIUS + TANK_BODY_HEIGHT/2
    const expectedY = 100 + TANK_WHEEL_RADIUS + TANK_BODY_HEIGHT / 2;
    expect(result.y).toBeCloseTo(expectedY, 5);
  });

  it('handles edge of terrain', () => {
    const result = getFinalPosition(0, terrain);
    expect(result.x).toBe(0);
    // Y calculation should still work at edge
    const expectedY = 100 + TANK_WHEEL_RADIUS + TANK_BODY_HEIGHT / 2;
    expect(result.y).toBeCloseTo(expectedY, 5);
  });
});

describe('movement system integration', () => {
  it('full movement cycle: move right, hit boundary', () => {
    const terrain = createMockTerrain(500);
    const tank = createMockTank({
      position: { x: 450, y: 100 },
      fuel: 100,
    });

    const result = calculateMovementTarget(tank, 'right', [tank], terrain);

    // Should stop at terrain boundary (500 - 25 margin)
    expect(result.targetX).toBe(terrain.width - TANK_BODY_WIDTH / 2);
    // Should have used some fuel
    expect(result.fuelCost).toBeGreaterThan(0);
    expect(result.fuelCost).toBeLessThan(100); // Not full fuel since bounded
  });

  it('full movement cycle: move left, hit tank', () => {
    const terrain = createMockTerrain();
    const movingTank = createMockTank({
      id: 'player',
      position: { x: 400, y: 100 },
      fuel: 100,
    });
    const blockingTank = createMockTank({
      id: 'enemy',
      position: { x: 200, y: 100 },
    });

    const result = calculateMovementTarget(
      movingTank,
      'left',
      [movingTank, blockingTank],
      terrain
    );

    // Should stop before blocking tank
    expect(result.targetX).toBe(200 + TANK_BODY_WIDTH);
    // Fuel cost should be for the actual distance
    const distance = Math.abs(result.targetX - movingTank.position.x);
    expect(result.fuelCost).toBe(calculateFuelCost(distance, terrain.width));
  });

  it('click-to-move with collision', () => {
    const terrain = createMockTerrain();
    const movingTank = createMockTank({
      id: 'player',
      position: { x: 640, y: 100 },
      fuel: 100,
    });
    const blockingTank = createMockTank({
      id: 'enemy',
      position: { x: 700, y: 100 },
    });

    // Click beyond the blocking tank
    const result = calculateMovementTarget(
      movingTank,
      'right',
      [movingTank, blockingTank],
      terrain,
      800
    );

    // Should stop at collision point, not click position
    expect(result.targetX).toBe(700 - TANK_BODY_WIDTH);
  });
});
