import { describe, it, expect } from 'vitest';
import {
  getBarrelTipPosition,
  createLaunchConfig,
  createProjectileState,
  getProjectilePosition,
  updateProjectileTrace,
  isProjectileOutOfBounds,
  worldToScreen,
  screenToWorld,
  checkTerrainCollision,
  uiAngleToPhysicsAngle,
  getProjectileVisual,
  renderProjectile,
  handleProjectileBounce,
  findNearestTarget,
  updateHomingTracking,
} from './projectile';
import type { TankState, TerrainData } from '../types/game';

const CANVAS_HEIGHT = 600;
const CANVAS_WIDTH = 800;

// UI angle system: 0 = up, positive = left, negative = right
// Physics angle system: 0 = right, 90 = up
const createMockTank = (overrides: Partial<TankState> = {}): TankState => ({
  id: 'test-tank',
  position: { x: 100, y: 200 }, // World coordinates
  health: 100,
  maxHealth: 100,
  shieldHp: 0,
  maxShieldHp: 0,
  armorType: null,
  angle: -45, // UI angle: 45° right of up (aiming toward right)
  power: 50,
  color: 'red',
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
  // DOME_OFFSET = 5 (bodyHeight/4 = 20/4)
  // TURRET_LENGTH = 25

  it('calculates barrel tip at UI angle 0 (pointing up) in world coords', () => {
    const tank = createMockTank({ angle: 0 });
    const tip = getBarrelTipPosition(tank);

    // UI angle 0 = straight up, physics angle = 90
    // barrel tip.x = 100 + 25 * cos(90°) = 100
    // barrel tip.y = 200 + 5 (dome) + 25 * sin(90°) = 230
    expect(tip.x).toBeCloseTo(100, 1);
    expect(tip.y).toBeCloseTo(230, 1);
  });

  it('calculates barrel tip at UI angle -90 (pointing right) in world coords', () => {
    const tank = createMockTank({ angle: -90 });
    const tip = getBarrelTipPosition(tank);

    // UI angle -90 = pointing right, physics angle = 0
    // barrel tip.x = 100 + 25 * cos(0°) = 125
    // barrel tip.y = 200 + 5 (dome) + 25 * sin(0°) = 205
    expect(tip.x).toBeCloseTo(125, 1);
    expect(tip.y).toBeCloseTo(205, 1);
  });

  it('calculates barrel tip at UI angle -45 (45° right of up)', () => {
    const tank = createMockTank({ angle: -45 });
    const tip = getBarrelTipPosition(tank);

    // UI angle -45 = 45° right of up, physics angle = 45
    // DOME_OFFSET = 5
    const offset = 25 * Math.cos(Math.PI / 4); // ~17.68
    expect(tip.x).toBeCloseTo(100 + offset, 1);
    expect(tip.y).toBeCloseTo(205 + offset, 1); // 200 + 5 (dome) + offset
  });
});

describe('createLaunchConfig', () => {
  it('creates launch config with physics angle and power', () => {
    const tank = createMockTank({ angle: 60, power: 75 });
    const config = createLaunchConfig(tank, CANVAS_HEIGHT, CANVAS_WIDTH);

    // UI angle 60 converts to physics angle 150 (90 + 60)
    expect(config.angle).toBe(150);
    expect(config.power).toBe(75);
  });

  it('converts barrel tip from world to screen coordinates', () => {
    // UI angle 0 = straight up, physics angle = 90
    const tank = createMockTank({ position: { x: 50, y: 100 }, angle: 0 });
    const config = createLaunchConfig(tank, CANVAS_HEIGHT, CANVAS_WIDTH);

    // UI angle 0 = straight up, so barrel tip is directly above tank
    // Barrel tip in world coords: { x: 50, y: 100 + 5 (dome) + 25 = 130 }
    // In screen coords: { x: 50, y: 600 - 130 = 470 }
    expect(config.position.x).toBe(50);
    expect(config.position.y).toBe(470);
  });
});

describe('createProjectileState', () => {
  it('creates initial projectile state', () => {
    const tank = createMockTank();
    const startTime = 1000;
    const state = createProjectileState(tank, startTime, CANVAS_HEIGHT, CANVAS_WIDTH);

    expect(state.isActive).toBe(true);
    expect(state.startTime).toBe(1000);
    // UI angle -45 converts to physics angle 45 (90 + -45)
    expect(state.launchConfig.angle).toBe(uiAngleToPhysicsAngle(tank.angle));
    expect(state.launchConfig.power).toBe(tank.power);
    expect(state.tracePoints.length).toBe(1);
    expect(state.canvasHeight).toBe(CANVAS_HEIGHT);
  });

  it('initializes trace with barrel tip in screen coordinates', () => {
    // UI angle 0 = straight up
    const tank = createMockTank({ position: { x: 100, y: 200 }, angle: 0 });
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH);

    // UI angle 0 = straight up, barrel tip directly above tank
    // Barrel tip world: { x: 100, y: 200 + 5 (dome) + 25 = 230 }
    // Screen: { x: 100, y: 600 - 230 = 370 }
    expect(state.tracePoints[0]!.x).toBeCloseTo(100, 1);
    expect(state.tracePoints[0]!.y).toBeCloseTo(370, 1);
  });
});

describe('getProjectilePosition', () => {
  it('returns launch position at time 0', () => {
    // UI angle -45 = 45° right of up (toward opponent)
    const tank = createMockTank({ angle: -45, power: 50 });
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH);
    const pos = getProjectilePosition(state, 0);

    expect(pos.x).toBeCloseTo(state.launchConfig.position.x, 1);
    expect(pos.y).toBeCloseTo(state.launchConfig.position.y, 1);
  });

  it('moves projectile over time', () => {
    // UI angle -45 = 45° right of up, physics angle = 45
    const tank = createMockTank({ angle: -45, power: 50 });
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH);

    const pos1 = getProjectilePosition(state, 500); // 0.5 seconds
    const pos2 = getProjectilePosition(state, 1000); // 1 second

    // Projectile should move right (positive x direction)
    expect(pos2.x).toBeGreaterThan(pos1.x);
  });

  it('applies gravity to projectile (y increases in screen coords)', () => {
    // UI angle -90 = horizontal shot to the right, physics angle = 0
    const tank = createMockTank({ angle: -90, power: 50 });
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH);

    const pos0 = getProjectilePosition(state, 0);
    const pos1 = getProjectilePosition(state, 1000); // 1 second

    // Y increases due to gravity in screen coordinates (projectile falls down)
    expect(pos1.y).toBeGreaterThan(pos0.y);
  });
});

describe('updateProjectileTrace', () => {
  it('adds trace point when distance threshold is exceeded', () => {
    // UI angle -45 = 45° right of up
    const tank = createMockTank({ angle: -45, power: 100 });
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH);

    // After enough time, projectile travels enough distance
    const updated = updateProjectileTrace(state, 200);

    expect(updated.tracePoints.length).toBeGreaterThanOrEqual(1);
  });

  it('preserves existing trace points', () => {
    // UI angle -45 = 45° right of up
    const tank = createMockTank({ angle: -45, power: 100 });
    let state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH);

    // Add multiple trace points
    state = updateProjectileTrace(state, 100);
    const count1 = state.tracePoints.length;

    state = updateProjectileTrace(state, 200);

    expect(state.tracePoints.length).toBeGreaterThanOrEqual(count1);
  });

  it('does not add point if distance is too small', () => {
    // UI angle -45, very slow power
    const tank = createMockTank({ angle: -45, power: 1 });
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH);

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

describe('screenToWorld', () => {
  it('converts screen y=0 to top of world (canvasHeight)', () => {
    const pos = screenToWorld({ x: 100, y: 0 }, CANVAS_HEIGHT);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(600); // Top of world
  });

  it('converts screen y=canvasHeight to bottom of world (0)', () => {
    const pos = screenToWorld({ x: 100, y: 600 }, CANVAS_HEIGHT);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(0); // Bottom of world
  });

  it('converts screen y=300 to middle of world', () => {
    const pos = screenToWorld({ x: 100, y: 300 }, CANVAS_HEIGHT);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(300); // Middle of world
  });

  it('is inverse of worldToScreen', () => {
    const original = { x: 150, y: 250 };
    const screen = worldToScreen(original, CANVAS_HEIGHT);
    const backToWorld = screenToWorld(screen, CANVAS_HEIGHT);
    expect(backToWorld.x).toBe(original.x);
    expect(backToWorld.y).toBe(original.y);
  });
});

describe('checkTerrainCollision', () => {
  const canvasHeight = 600;

  // Create a simple terrain with flat height of 100 (in world coords)
  const flatTerrain: TerrainData = {
    points: new Array(800).fill(100),
    width: 800,
    height: 600,
  };

  // Create terrain with a hill in the middle
  const hillyTerrain: TerrainData = {
    points: Array.from({ length: 800 }, (_, x) => {
      if (x >= 350 && x <= 450) {
        return 200; // Hill in the middle
      }
      return 100; // Flat elsewhere
    }),
    width: 800,
    height: 600,
  };

  it('returns no collision when projectile is above terrain', () => {
    // Screen y=400 -> world y=200, terrain height=100
    // Projectile at world y=200 is ABOVE terrain at 100
    const pos = { x: 400, y: 400 };
    const result = checkTerrainCollision(pos, flatTerrain, canvasHeight);
    expect(result.hit).toBe(false);
    expect(result.point).toBeNull();
    expect(result.worldPoint).toBeNull();
  });

  it('returns collision when projectile is at terrain level', () => {
    // Screen y=500 -> world y=100, terrain height=100
    // Projectile exactly at terrain level
    const pos = { x: 400, y: 500 };
    const result = checkTerrainCollision(pos, flatTerrain, canvasHeight);
    expect(result.hit).toBe(true);
    expect(result.point).not.toBeNull();
    expect(result.worldPoint).not.toBeNull();
  });

  it('returns collision when projectile is below terrain', () => {
    // Screen y=550 -> world y=50, terrain height=100
    // Projectile below terrain
    const pos = { x: 400, y: 550 };
    const result = checkTerrainCollision(pos, flatTerrain, canvasHeight);
    expect(result.hit).toBe(true);
  });

  it('returns collision point at terrain surface', () => {
    // Projectile below terrain, collision point should be at terrain surface
    const pos = { x: 400, y: 550 };
    const result = checkTerrainCollision(pos, flatTerrain, canvasHeight);
    expect(result.hit).toBe(true);
    // World point should be at terrain height (100)
    expect(result.worldPoint?.x).toBe(400);
    expect(result.worldPoint?.y).toBe(100);
    // Screen point should be canvasHeight - terrainHeight = 500
    expect(result.point?.x).toBe(400);
    expect(result.point?.y).toBe(500);
  });

  it('detects collision with hill', () => {
    // At x=400 (middle of hill), terrain is at 200
    // Screen y=450 -> world y=150, which is BELOW hill at 200
    const pos = { x: 400, y: 450 };
    const result = checkTerrainCollision(pos, hillyTerrain, canvasHeight);
    expect(result.hit).toBe(true);
    expect(result.worldPoint?.y).toBe(200); // Hill height
  });

  it('returns no collision when above hill', () => {
    // At x=400 (middle of hill), terrain is at 200
    // Screen y=350 -> world y=250, which is ABOVE hill at 200
    const pos = { x: 400, y: 350 };
    const result = checkTerrainCollision(pos, hillyTerrain, canvasHeight);
    expect(result.hit).toBe(false);
  });

  it('returns no collision when projectile is outside terrain bounds (left)', () => {
    const pos = { x: -10, y: 500 };
    const result = checkTerrainCollision(pos, flatTerrain, canvasHeight);
    expect(result.hit).toBe(false);
  });

  it('returns no collision when projectile is outside terrain bounds (right)', () => {
    const pos = { x: 850, y: 500 };
    const result = checkTerrainCollision(pos, flatTerrain, canvasHeight);
    expect(result.hit).toBe(false);
  });
});

describe('weapon-based projectile behavior', () => {
  it('defaults to standard weapon type when not specified', () => {
    const tank = createMockTank();
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH);

    expect(state.weaponType).toBe('standard');
    expect(state.speedMultiplier).toBe(1.0);
  });

  it('accepts weapon type parameter', () => {
    const tank = createMockTank();
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'heavy_artillery');

    expect(state.weaponType).toBe('heavy_artillery');
    expect(state.speedMultiplier).toBe(0.8);
  });

  it('stores correct speed multiplier for precision weapon', () => {
    const tank = createMockTank();
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'precision');

    expect(state.weaponType).toBe('precision');
    expect(state.speedMultiplier).toBe(1.3);
  });

  it('precision weapon travels faster than standard', () => {
    const tank = createMockTank({ angle: -45, power: 50 });
    const standardState = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'standard');
    const precisionState = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'precision');

    // After same elapsed time, precision should have traveled further
    const time = 500;
    const standardPos = getProjectilePosition(standardState, time);
    const precisionPos = getProjectilePosition(precisionState, time);

    // Precision has 1.3x speed, so should be further along trajectory
    // Check horizontal distance traveled (both start at same x position)
    const startX = standardState.launchConfig.position.x;
    const standardDist = Math.abs(standardPos.x - startX);
    const precisionDist = Math.abs(precisionPos.x - startX);

    expect(precisionDist).toBeGreaterThan(standardDist);
  });

  it('heavy artillery travels slower than standard', () => {
    const tank = createMockTank({ angle: -45, power: 50 });
    const standardState = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'standard');
    const heavyState = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'heavy_artillery');

    // After same elapsed time, heavy should have traveled less
    const time = 500;
    const standardPos = getProjectilePosition(standardState, time);
    const heavyPos = getProjectilePosition(heavyState, time);

    // Heavy has 0.8x speed, so should be closer to start
    const startX = standardState.launchConfig.position.x;
    const standardDist = Math.abs(standardPos.x - startX);
    const heavyDist = Math.abs(heavyPos.x - startX);

    expect(heavyDist).toBeLessThan(standardDist);
  });

  it('all weapon types create valid projectile states', () => {
    const tank = createMockTank();
    const weaponTypes = ['standard', 'heavy_artillery', 'precision', 'cluster_bomb', 'napalm'] as const;

    for (const weaponType of weaponTypes) {
      const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, weaponType);

      expect(state.isActive).toBe(true);
      expect(state.weaponType).toBe(weaponType);
      expect(state.speedMultiplier).toBeGreaterThan(0);
      expect(state.tankId).toBe(tank.id);
      expect(state.tankColor).toBe(tank.color);
    }
  });
});

describe('getProjectileVisual', () => {
  it('returns distinct visual config for each weapon type', () => {
    const weaponTypes = ['standard', 'heavy_artillery', 'precision', 'cluster_bomb', 'napalm'] as const;
    const visuals = weaponTypes.map(type => getProjectileVisual(type));

    // Each weapon should have unique color
    const colors = visuals.map(v => v.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(weaponTypes.length);
  });

  it('standard shell has yellow color with white glow', () => {
    const visual = getProjectileVisual('standard');
    expect(visual.color).toBe('#ffff00');
    expect(visual.glowColor).toBe('#ffffff');
    expect(visual.radius).toBe(5);
  });

  it('heavy artillery is larger with dark color and red glow', () => {
    const visual = getProjectileVisual('heavy_artillery');
    expect(visual.color).toBe('#2a2a2a');
    expect(visual.glowColor).toBe('#ff3300');
    expect(visual.radius).toBe(8);
    expect(visual.radius).toBeGreaterThan(getProjectileVisual('standard').radius);
  });

  it('precision shot is smaller with cyan color', () => {
    const visual = getProjectileVisual('precision');
    expect(visual.color).toBe('#00ddff');
    expect(visual.glowColor).toBe('#66ffff');
    expect(visual.radius).toBe(4);
    expect(visual.radius).toBeLessThan(getProjectileVisual('standard').radius);
    expect(visual.trailColor).toBe('#00aacc');
  });

  it('cluster bomb has brown/orange color', () => {
    const visual = getProjectileVisual('cluster_bomb');
    expect(visual.color).toBe('#cc6600');
    expect(visual.glowColor).toBe('#ff9933');
    expect(visual.radius).toBe(6);
  });

  it('napalm has orange/red color with glow', () => {
    const visual = getProjectileVisual('napalm');
    expect(visual.color).toBe('#ff4400');
    expect(visual.glowColor).toBe('#ffaa00');
    expect(visual.radius).toBe(6);
  });

  it('all visuals have positive radius', () => {
    const weaponTypes = ['standard', 'heavy_artillery', 'precision', 'cluster_bomb', 'napalm'] as const;
    for (const weaponType of weaponTypes) {
      const visual = getProjectileVisual(weaponType);
      expect(visual.radius).toBeGreaterThan(0);
    }
  });
});

describe('renderProjectile weapon-specific rendering', () => {
  // Mock canvas context for testing
  const createMockContext = (): CanvasRenderingContext2D => {
    const methods: Record<string, () => void> = {};
    const handler = {
      get(_target: object, prop: string) {
        if (prop === 'canvas') {
          return { width: 800, height: 600 };
        }
        if (!(prop in methods)) {
          methods[prop] = () => undefined;
        }
        return methods[prop];
      },
      set() {
        return true;
      },
    };
    return new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
  };

  it('renders standard shell without throwing', () => {
    const ctx = createMockContext();
    const tank = createMockTank();
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'standard');

    expect(() => renderProjectile(ctx, state, 100)).not.toThrow();
  });

  it('renders heavy artillery without throwing', () => {
    const ctx = createMockContext();
    const tank = createMockTank();
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'heavy_artillery');

    expect(() => renderProjectile(ctx, state, 100)).not.toThrow();
  });

  it('renders precision shot without throwing', () => {
    const ctx = createMockContext();
    const tank = createMockTank();
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'precision');

    expect(() => renderProjectile(ctx, state, 100)).not.toThrow();
  });

  it('renders cluster bomb without throwing', () => {
    const ctx = createMockContext();
    const tank = createMockTank();
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'cluster_bomb');

    expect(() => renderProjectile(ctx, state, 100)).not.toThrow();
  });

  it('renders napalm without throwing', () => {
    const ctx = createMockContext();
    const tank = createMockTank();
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'napalm');

    expect(() => renderProjectile(ctx, state, 100)).not.toThrow();
  });

  it('renders all weapon types at various angles', () => {
    const ctx = createMockContext();
    const weaponTypes = ['standard', 'heavy_artillery', 'precision', 'cluster_bomb', 'napalm'] as const;
    const angles = [-90, -45, 0, 45, 90];

    for (const weaponType of weaponTypes) {
      for (const angle of angles) {
        const tank = createMockTank({ angle });
        const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, weaponType);
        expect(() => renderProjectile(ctx, state, 100)).not.toThrow();
      }
    }
  });

  it('renders cluster bomb wobble animation at different times', () => {
    const ctx = createMockContext();
    const tank = createMockTank();
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'cluster_bomb');

    // Render at different times to test wobble animation
    for (let time = 0; time < 1000; time += 100) {
      expect(() => renderProjectile(ctx, state, time)).not.toThrow();
    }
  });

  it('renders napalm flame animation at different times', () => {
    const ctx = createMockContext();
    const tank = createMockTank();
    const state = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'napalm');

    // Render at different times to test flame animation
    for (let time = 0; time < 1000; time += 100) {
      expect(() => renderProjectile(ctx, state, time)).not.toThrow();
    }
  });
});

describe('handleProjectileBounce', () => {
  it('returns null for non-bouncing weapons', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'standard');
    const collisionPoint = { x: 100, y: 300 };

    const result = handleProjectileBounce(projectile, collisionPoint, 1000);
    expect(result).toBeNull();
  });

  it('returns null when all bounces are used', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'bouncing_betty');
    // Use up all bounces
    const maxedProjectile = { ...projectile, bounceCount: projectile.maxBounces };
    const collisionPoint = { x: 100, y: 300 };

    const result = handleProjectileBounce(maxedProjectile, collisionPoint, 1000);
    expect(result).toBeNull();
  });

  it('returns new projectile state with incremented bounce count', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'bouncing_betty');
    const collisionPoint = { x: 100, y: 300 };

    const result = handleProjectileBounce(projectile, collisionPoint, 1000);
    expect(result).not.toBeNull();
    expect(result!.bounceCount).toBe(1);
  });

  it('updates start time and position after bounce', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'bouncing_betty');
    const collisionPoint = { x: 150, y: 350 };

    const result = handleProjectileBounce(projectile, collisionPoint, 2000);
    expect(result).not.toBeNull();
    expect(result!.startTime).toBe(2000);
    expect(result!.launchConfig.position).toEqual(collisionPoint);
  });

  it('adds collision point to trace', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'bouncing_betty');
    const collisionPoint = { x: 150, y: 350 };

    const result = handleProjectileBounce(projectile, collisionPoint, 2000);
    expect(result).not.toBeNull();
    expect(result!.tracePoints).toContainEqual(collisionPoint);
  });

  it('allows multiple bounces up to max', () => {
    const tank = createMockTank();
    let projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'bouncing_betty');
    const collisionPoint = { x: 150, y: 350 };
    let time = 1000;

    // First bounce
    projectile = handleProjectileBounce(projectile, collisionPoint, time)!;
    expect(projectile.bounceCount).toBe(1);

    // Second bounce
    time += 500;
    projectile = handleProjectileBounce(projectile, collisionPoint, time)!;
    expect(projectile.bounceCount).toBe(2);

    // Third bounce should fail (max bounces = 2)
    time += 500;
    const result = handleProjectileBounce(projectile, collisionPoint, time);
    expect(result).toBeNull();
  });
});

describe('findNearestTarget', () => {
  const createMockTanks = (): TankState[] => [
    createMockTank({ id: 'player', position: { x: 100, y: 200 }, health: 100 }),
    createMockTank({ id: 'enemy1', position: { x: 300, y: 200 }, health: 100 }),
    createMockTank({ id: 'enemy2', position: { x: 500, y: 200 }, health: 100 }),
  ];

  it('returns null when all enemies are destroyed', () => {
    const tanks = createMockTanks().map(t =>
      t.id === 'player' ? t : { ...t, health: 0 }
    );
    const projectilePos = { x: 200, y: 400 }; // Screen coords

    const result = findNearestTarget(projectilePos, tanks, 'player', CANVAS_HEIGHT);
    expect(result).toBeNull();
  });

  it('excludes the firing tank from targets', () => {
    const tanks = createMockTanks();
    const projectilePos = { x: 100, y: 400 }; // Very close to player in screen coords

    const result = findNearestTarget(projectilePos, tanks, 'player', CANVAS_HEIGHT);
    expect(result).not.toBeNull();
    // Should not return player position
    expect(result!.x).not.toBe(100);
  });

  it('returns nearest enemy tank position', () => {
    const tanks = createMockTanks();
    // Projectile at x=250 (closer to enemy1 at x=300 than enemy2 at x=500)
    const projectilePos = { x: 250, y: 400 };

    const result = findNearestTarget(projectilePos, tanks, 'player', CANVAS_HEIGHT);
    expect(result).not.toBeNull();
    expect(result!.x).toBe(300); // enemy1's x position
  });

  it('skips destroyed tanks when finding nearest', () => {
    const tanks = createMockTanks();
    // Destroy enemy1 (the closest)
    tanks[1] = { ...tanks[1]!, health: 0 };
    const projectilePos = { x: 250, y: 400 };

    const result = findNearestTarget(projectilePos, tanks, 'player', CANVAS_HEIGHT);
    expect(result).not.toBeNull();
    expect(result!.x).toBe(500); // enemy2's x position (since enemy1 is destroyed)
  });
});

describe('updateHomingTracking', () => {
  it('returns unchanged projectile for non-homing weapons', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'standard');
    const targetPos = { x: 500, y: 300 };

    const result = updateHomingTracking(projectile, targetPos, 1000);
    expect(result).toEqual(projectile);
  });

  it('returns unchanged projectile when no target', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'homing_missile');

    const result = updateHomingTracking(projectile, null, 1000);
    expect(result.launchConfig.angle).toBe(projectile.launchConfig.angle);
  });

  it('adjusts angle toward target', () => {
    const tank = createMockTank({ angle: 0 }); // Pointing up
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'homing_missile');
    // Target to the right of projectile path
    const targetPos = { x: 300, y: 300 };

    const result = updateHomingTracking(projectile, targetPos, 100);
    // Angle should have changed
    expect(result.currentAngle).toBeDefined();
  });

  it('preserves tracking strength property', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'homing_missile');
    const targetPos = { x: 500, y: 300 };

    const result = updateHomingTracking(projectile, targetPos, 1000);
    expect(result.trackingStrength).toBe(projectile.trackingStrength);
  });

  it('updates target position', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'homing_missile');
    const targetPos = { x: 500, y: 300 };

    const result = updateHomingTracking(projectile, targetPos, 1000);
    expect(result.targetPosition).toEqual(targetPos);
  });

  it('creates new projectile state with updated time', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'homing_missile');
    const targetPos = { x: 500, y: 300 };
    const newTime = 2000;

    const result = updateHomingTracking(projectile, targetPos, newTime);
    expect(result.startTime).toBe(newTime);
  });

  it('tracks previous distance to target', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'homing_missile');
    const targetPos = { x: 500, y: 300 };

    const result = updateHomingTracking(projectile, targetPos, 1000);
    expect(result.previousDistanceToTarget).toBeDefined();
    expect(result.previousDistanceToTarget).toBeGreaterThan(0);
  });

  it('triggers proximity explosion when missile passes closest approach', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'homing_missile');
    // Simulate missile that has been tracking and got very close (within 50px)
    const projectileWithHistory = {
      ...projectile,
      previousDistanceToTarget: 30, // Was very close
    };
    // Target is now further away (missile has passed)
    const targetPos = { x: 500, y: 300 }; // Distance will be greater than 30

    const result = updateHomingTracking(projectileWithHistory, targetPos, 1000);
    expect(result.shouldProximityExplode).toBe(true);
  });

  it('does not trigger proximity explosion when missile is still approaching', () => {
    const tank = createMockTank();
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'homing_missile');
    // Simulate missile that was far away
    const projectileWithHistory = {
      ...projectile,
      previousDistanceToTarget: 500,
    };
    const targetPos = { x: 300, y: 300 }; // Distance should be less than 500

    const result = updateHomingTracking(projectileWithHistory, targetPos, 1000);
    expect(result.shouldProximityExplode).toBeFalsy();
  });
});

describe('handleProjectileBounce minimum bounce velocity', () => {
  it('ensures bounce has minimum upward velocity', () => {
    const tank = createMockTank({ power: 10 }); // Very low power
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'bouncing_betty');
    const collisionPoint = { x: 150, y: 350 };

    // Simulate a very short elapsed time to get minimal velocity at impact
    const result = handleProjectileBounce(projectile, collisionPoint, 100);
    expect(result).not.toBeNull();
    // The power should be at least the minimum (15)
    expect(result!.launchConfig.power).toBeGreaterThanOrEqual(15);
  });

  it('maintains higher power for strong bounces', () => {
    const tank = createMockTank({ power: 80 }); // High power
    const projectile = createProjectileState(tank, 0, CANVAS_HEIGHT, CANVAS_WIDTH, 'bouncing_betty');
    const collisionPoint = { x: 150, y: 350 };

    const result = handleProjectileBounce(projectile, collisionPoint, 500);
    expect(result).not.toBeNull();
    // Should still have decent power after bounce
    expect(result!.launchConfig.power).toBeGreaterThan(15);
  });
});
