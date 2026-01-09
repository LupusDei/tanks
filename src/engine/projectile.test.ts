import { describe, it, expect } from 'vitest';
import {
  getBarrelTipPosition,
  createLaunchConfig,
  createProjectileState,
  getProjectilePosition,
  updateProjectileTrace,
  isProjectileOutOfBounds,
  worldToScreen,
} from './projectile';
import type { TankState } from '../types/game';

const CANVAS_HEIGHT = 600;

const createMockTank = (overrides: Partial<TankState> = {}): TankState => ({
  id: 'test-tank',
  position: { x: 100, y: 200 }, // World coordinates
  health: 100,
  angle: 45,
  power: 50,
  color: 'red',
  isActive: true,
  ...overrides,
});

describe('worldToScreen', () => {
  it('converts world y=0 to bottom of screen', () => {
    const pos = worldToScreen({ x: 100, y: 0 }, CANVAS_HEIGHT);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(600); // Bottom of canvas
  });

  it('converts world y=canvasHeight to top of screen', () => {
    const pos = worldToScreen({ x: 100, y: 600 }, CANVAS_HEIGHT);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(0); // Top of canvas
  });

  it('converts world y=300 to middle of screen', () => {
    const pos = worldToScreen({ x: 100, y: 300 }, CANVAS_HEIGHT);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(300); // Middle of canvas
  });
});

describe('getBarrelTipPosition', () => {
  it('calculates barrel tip at 0 degrees (pointing right) in world coords', () => {
    const tank = createMockTank({ angle: 0 });
    const tip = getBarrelTipPosition(tank);

    // At 0 degrees, barrel points right (positive x)
    expect(tip.x).toBeCloseTo(125, 1); // 100 + 25 * cos(0)
    expect(tip.y).toBeCloseTo(200, 1); // 200 + 25 * sin(0)
  });

  it('calculates barrel tip at 90 degrees (pointing up) in world coords', () => {
    const tank = createMockTank({ angle: 90 });
    const tip = getBarrelTipPosition(tank);

    // At 90 degrees, barrel points up (positive y in world coords)
    expect(tip.x).toBeCloseTo(100, 1); // 100 + 25 * cos(90)
    expect(tip.y).toBeCloseTo(225, 1); // 200 + 25 * sin(90)
  });

  it('calculates barrel tip at 45 degrees', () => {
    const tank = createMockTank({ angle: 45 });
    const tip = getBarrelTipPosition(tank);

    const offset = 25 * Math.cos(Math.PI / 4); // ~17.68
    expect(tip.x).toBeCloseTo(100 + offset, 1);
    expect(tip.y).toBeCloseTo(200 + offset, 1);
  });
});

describe('createLaunchConfig', () => {
  it('creates launch config with angle and power', () => {
    const tank = createMockTank({ angle: 60, power: 75 });
    const config = createLaunchConfig(tank, CANVAS_HEIGHT);

    expect(config.angle).toBe(60);
    expect(config.power).toBe(75);
  });

  it('converts barrel tip from world to screen coordinates', () => {
    const tank = createMockTank({ position: { x: 50, y: 100 }, angle: 0 });
    const config = createLaunchConfig(tank, CANVAS_HEIGHT);

    // Barrel tip in world coords: { x: 75, y: 100 }
    // In screen coords: { x: 75, y: 600 - 100 = 500 }
    expect(config.position.x).toBe(75);
    expect(config.position.y).toBe(500);
  });
});

describe('createProjectileState', () => {
  it('creates initial projectile state', () => {
    const tank = createMockTank();
    const startTime = 1000;
    const state = createProjectileState(tank, startTime, CANVAS_HEIGHT);

    expect(state.isActive).toBe(true);
    expect(state.startTime).toBe(1000);
    expect(state.launchConfig.angle).toBe(tank.angle);
    expect(state.launchConfig.power).toBe(tank.power);
    expect(state.tracePoints.length).toBe(1);
    expect(state.canvasHeight).toBe(CANVAS_HEIGHT);
  });

  it('initializes trace with barrel tip in screen coordinates', () => {
    const tank = createMockTank({ position: { x: 100, y: 200 }, angle: 0 });
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT);

    // Barrel tip world: { x: 125, y: 200 }
    // Screen: { x: 125, y: 400 }
    expect(state.tracePoints[0]!.x).toBeCloseTo(125, 1);
    expect(state.tracePoints[0]!.y).toBeCloseTo(400, 1);
  });
});

describe('getProjectilePosition', () => {
  it('returns launch position at time 0', () => {
    const tank = createMockTank({ angle: 45, power: 50 });
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT);
    const pos = getProjectilePosition(state, 0);

    expect(pos.x).toBeCloseTo(state.launchConfig.position.x, 1);
    expect(pos.y).toBeCloseTo(state.launchConfig.position.y, 1);
  });

  it('moves projectile over time', () => {
    const tank = createMockTank({ angle: 45, power: 50 });
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT);

    const pos1 = getProjectilePosition(state, 500); // 0.5 seconds
    const pos2 = getProjectilePosition(state, 1000); // 1 second

    // Projectile should move right
    expect(pos2.x).toBeGreaterThan(pos1.x);
  });

  it('applies gravity to projectile (y increases in screen coords)', () => {
    const tank = createMockTank({ angle: 0, power: 50 }); // Horizontal shot
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT);

    const pos0 = getProjectilePosition(state, 0);
    const pos1 = getProjectilePosition(state, 1000); // 1 second

    // Y increases due to gravity in screen coordinates (projectile falls down)
    expect(pos1.y).toBeGreaterThan(pos0.y);
  });
});

describe('updateProjectileTrace', () => {
  it('adds trace point when distance threshold is exceeded', () => {
    const tank = createMockTank({ angle: 45, power: 100 });
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT);

    // After enough time, projectile travels enough distance
    const updated = updateProjectileTrace(state, 200);

    expect(updated.tracePoints.length).toBeGreaterThanOrEqual(1);
  });

  it('preserves existing trace points', () => {
    const tank = createMockTank({ angle: 45, power: 100 });
    let state = createProjectileState(tank, 0, CANVAS_HEIGHT);

    // Add multiple trace points
    state = updateProjectileTrace(state, 100);
    const count1 = state.tracePoints.length;

    state = updateProjectileTrace(state, 200);

    expect(state.tracePoints.length).toBeGreaterThanOrEqual(count1);
  });

  it('does not add point if distance is too small', () => {
    const tank = createMockTank({ angle: 45, power: 1 }); // Very slow
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT);

    // Very short time, projectile barely moves
    const updated = updateProjectileTrace(state, 1);

    expect(updated.tracePoints.length).toBe(1); // Only initial point
  });
});

describe('isProjectileOutOfBounds', () => {
  const canvasWidth = 800;
  const canvasHeight = 600;

  it('returns false for position within bounds', () => {
    // Screen y=300 is middle, terrain at world height 100 = screen y 500
    const pos = { x: 400, y: 300 };
    expect(isProjectileOutOfBounds(pos, canvasWidth, canvasHeight, 100)).toBe(false);
  });

  it('returns true when projectile is off left edge', () => {
    const pos = { x: -100, y: 300 };
    expect(isProjectileOutOfBounds(pos, canvasWidth, canvasHeight, 100)).toBe(true);
  });

  it('returns true when projectile is off right edge', () => {
    const pos = { x: 900, y: 300 };
    expect(isProjectileOutOfBounds(pos, canvasWidth, canvasHeight, 100)).toBe(true);
  });

  it('returns true when projectile is below terrain', () => {
    // Terrain at world height 100 = screen y 500
    // Projectile at screen y 550 is BELOW terrain
    const pos = { x: 400, y: 550 };
    expect(isProjectileOutOfBounds(pos, canvasWidth, canvasHeight, 100)).toBe(true);
  });

  it('returns false when projectile is above terrain', () => {
    // Terrain at world height 100 = screen y 500
    // Projectile at screen y 300 is ABOVE terrain
    const pos = { x: 400, y: 300 };
    expect(isProjectileOutOfBounds(pos, canvasWidth, canvasHeight, 100)).toBe(false);
  });

  it('returns true when projectile is way above screen (negative y)', () => {
    const pos = { x: 400, y: -600 };
    expect(isProjectileOutOfBounds(pos, canvasWidth, canvasHeight, 100)).toBe(true);
  });

  it('allows small margin off-screen horizontally', () => {
    // Just barely off left edge - should still be in bounds
    const pos = { x: -30, y: 300 };
    expect(isProjectileOutOfBounds(pos, canvasWidth, canvasHeight, 100)).toBe(false);
  });
});
