import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EXPLOSION_RADIUS,
  EXPLOSION_DURATION_MS,
  createExplosion,
  getExplosionProgress,
  isExplosionComplete,
  updateExplosion,
  renderExplosion,
  isPointInExplosion,
  getDistanceToExplosion,
  checkTankHit,
  type ExplosionState,
} from './explosion';
import type { TankState } from '../types/game';

describe('EXPLOSION_RADIUS constant', () => {
  it('equals 20 pixels (50% of tank width)', () => {
    expect(EXPLOSION_RADIUS).toBe(20);
  });
});

describe('EXPLOSION_DURATION_MS constant', () => {
  it('equals 800 milliseconds', () => {
    expect(EXPLOSION_DURATION_MS).toBe(800);
  });
});

describe('createExplosion', () => {
  it('creates an explosion at the given position', () => {
    const position = { x: 100, y: 200 };
    const explosion = createExplosion(position, 1000);

    expect(explosion.position).toEqual(position);
    expect(explosion.startTime).toBe(1000);
    expect(explosion.isActive).toBe(true);
  });

  it('creates particles for the explosion', () => {
    const position = { x: 100, y: 200 };
    const explosion = createExplosion(position);

    expect(explosion.particles.length).toBeGreaterThan(0);
    expect(explosion.particles.length).toBe(20);
  });

  it('copies the position to prevent mutation', () => {
    const position = { x: 100, y: 200 };
    const explosion = createExplosion(position);

    position.x = 500;
    expect(explosion.position.x).toBe(100);
  });

  it('initializes particles at explosion center', () => {
    const position = { x: 100, y: 200 };
    const explosion = createExplosion(position);

    for (const particle of explosion.particles) {
      expect(particle.x).toBe(position.x);
      expect(particle.y).toBe(position.y);
      expect(particle.life).toBe(1);
    }
  });

  it('gives particles random velocities', () => {
    const explosion = createExplosion({ x: 100, y: 100 });

    // Not all particles should have the same velocity
    const vxValues = explosion.particles.map((p) => p.vx);
    const uniqueVx = new Set(vxValues);
    expect(uniqueVx.size).toBeGreaterThan(1);
  });
});

describe('getExplosionProgress', () => {
  it('returns 0 at start time', () => {
    const explosion = createExplosion({ x: 0, y: 0 }, 1000);
    expect(getExplosionProgress(explosion, 1000)).toBe(0);
  });

  it('returns 0.5 at half duration', () => {
    const explosion = createExplosion({ x: 0, y: 0 }, 1000);
    const halfTime = 1000 + EXPLOSION_DURATION_MS / 2;
    expect(getExplosionProgress(explosion, halfTime)).toBeCloseTo(0.5, 5);
  });

  it('returns 1 at full duration', () => {
    const explosion = createExplosion({ x: 0, y: 0 }, 1000);
    const endTime = 1000 + EXPLOSION_DURATION_MS;
    expect(getExplosionProgress(explosion, endTime)).toBe(1);
  });

  it('caps at 1 after duration', () => {
    const explosion = createExplosion({ x: 0, y: 0 }, 1000);
    const afterEnd = 1000 + EXPLOSION_DURATION_MS * 2;
    expect(getExplosionProgress(explosion, afterEnd)).toBe(1);
  });
});

describe('isExplosionComplete', () => {
  it('returns false during animation', () => {
    const explosion = createExplosion({ x: 0, y: 0 }, 1000);
    expect(isExplosionComplete(explosion, 1000)).toBe(false);
    expect(isExplosionComplete(explosion, 1000 + EXPLOSION_DURATION_MS / 2)).toBe(false);
  });

  it('returns true when animation is complete', () => {
    const explosion = createExplosion({ x: 0, y: 0 }, 1000);
    expect(isExplosionComplete(explosion, 1000 + EXPLOSION_DURATION_MS)).toBe(true);
    expect(isExplosionComplete(explosion, 1000 + EXPLOSION_DURATION_MS + 100)).toBe(true);
  });
});

describe('updateExplosion', () => {
  it('returns same state if not active', () => {
    const explosion: ExplosionState = {
      position: { x: 100, y: 100 },
      startTime: 0,
      particles: [],
      isActive: false,
    };

    const updated = updateExplosion(explosion, 1000, 16);
    expect(updated).toBe(explosion);
  });

  it('updates particle positions based on velocity', () => {
    const explosion = createExplosion({ x: 100, y: 100 }, 0);
    const initialX = explosion.particles[0]!.x;
    const vx = explosion.particles[0]!.vx;

    const updated = updateExplosion(explosion, 500, 1000); // 1 second delta

    // Particle should have moved by vx * 1 second
    expect(updated.particles[0]!.x).toBeCloseTo(initialX + vx, 1);
  });

  it('applies gravity to particles', () => {
    const explosion = createExplosion({ x: 100, y: 100 }, 0);
    const initialVy = explosion.particles[0]!.vy;

    const updated = updateExplosion(explosion, 500, 1000); // 1 second delta

    // Velocity should increase by gravity (50 pixels/sec²)
    expect(updated.particles[0]!.vy).toBeCloseTo(initialVy + 50, 1);
  });

  it('decreases particle life over time', () => {
    const explosion = createExplosion({ x: 100, y: 100 }, 0);
    expect(explosion.particles[0]!.life).toBe(1);

    const updated = updateExplosion(explosion, 500, 500); // 0.5 second delta

    expect(updated.particles[0]!.life).toBeLessThan(1);
    expect(updated.particles[0]!.life).toBeGreaterThanOrEqual(0);
  });

  it('sets isActive to false when complete', () => {
    const explosion = createExplosion({ x: 100, y: 100 }, 0);

    const updated = updateExplosion(explosion, EXPLOSION_DURATION_MS, 16);

    expect(updated.isActive).toBe(false);
  });
});

describe('renderExplosion', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      globalAlpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
    } as unknown as CanvasRenderingContext2D;
  });

  it('does not render if explosion is inactive', () => {
    const explosion: ExplosionState = {
      position: { x: 100, y: 100 },
      startTime: 0,
      particles: [],
      isActive: false,
    };

    renderExplosion(ctx, explosion, 500);

    expect(ctx.save).not.toHaveBeenCalled();
  });

  it('renders without throwing for active explosion', () => {
    const explosion = createExplosion({ x: 100, y: 100 }, 0);

    expect(() => renderExplosion(ctx, explosion, 100)).not.toThrow();
  });

  it('calls save and restore', () => {
    const explosion = createExplosion({ x: 100, y: 100 }, 0);

    renderExplosion(ctx, explosion, 100);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('creates radial gradients for effects', () => {
    const explosion = createExplosion({ x: 100, y: 100 }, 0);

    renderExplosion(ctx, explosion, 50); // Early in animation

    expect(ctx.createRadialGradient).toHaveBeenCalled();
  });

  it('draws arcs for explosion and particles', () => {
    const explosion = createExplosion({ x: 100, y: 100 }, 0);

    renderExplosion(ctx, explosion, 100);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });
});

describe('isPointInExplosion', () => {
  it('returns true for point at explosion center', () => {
    const explosion = createExplosion({ x: 100, y: 100 });

    expect(isPointInExplosion(explosion, { x: 100, y: 100 })).toBe(true);
  });

  it('returns true for point within radius', () => {
    const explosion = createExplosion({ x: 100, y: 100 });

    // Point 10 pixels away (within EXPLOSION_RADIUS of 20)
    expect(isPointInExplosion(explosion, { x: 110, y: 100 })).toBe(true);
    expect(isPointInExplosion(explosion, { x: 100, y: 115 })).toBe(true);
  });

  it('returns true for point exactly at radius', () => {
    const explosion = createExplosion({ x: 100, y: 100 });

    expect(isPointInExplosion(explosion, { x: 100 + EXPLOSION_RADIUS, y: 100 })).toBe(true);
  });

  it('returns false for point outside radius', () => {
    const explosion = createExplosion({ x: 100, y: 100 });

    // Point 25 pixels away (outside EXPLOSION_RADIUS of 20)
    expect(isPointInExplosion(explosion, { x: 125, y: 100 })).toBe(false);
    expect(isPointInExplosion(explosion, { x: 100, y: 125 })).toBe(false);
  });

  it('handles diagonal distances correctly', () => {
    const explosion = createExplosion({ x: 100, y: 100 });

    // Point at 45 degrees, ~14.14 pixels away (within radius)
    expect(isPointInExplosion(explosion, { x: 110, y: 110 })).toBe(true);

    // Point at 45 degrees, ~28.28 pixels away (outside radius)
    expect(isPointInExplosion(explosion, { x: 120, y: 120 })).toBe(false);
  });
});

describe('getDistanceToExplosion', () => {
  it('returns 0 for point at explosion center', () => {
    const explosion = createExplosion({ x: 100, y: 100 });

    expect(getDistanceToExplosion(explosion, { x: 100, y: 100 })).toBe(0);
  });

  it('returns correct horizontal distance', () => {
    const explosion = createExplosion({ x: 100, y: 100 });

    expect(getDistanceToExplosion(explosion, { x: 150, y: 100 })).toBe(50);
    expect(getDistanceToExplosion(explosion, { x: 50, y: 100 })).toBe(50);
  });

  it('returns correct vertical distance', () => {
    const explosion = createExplosion({ x: 100, y: 100 });

    expect(getDistanceToExplosion(explosion, { x: 100, y: 130 })).toBe(30);
    expect(getDistanceToExplosion(explosion, { x: 100, y: 70 })).toBe(30);
  });

  it('returns correct diagonal distance', () => {
    const explosion = createExplosion({ x: 100, y: 100 });

    // 3-4-5 triangle: distance should be 5
    expect(getDistanceToExplosion(explosion, { x: 103, y: 104 })).toBe(5);
  });
});

describe('checkTankHit', () => {
  // Canvas height for coordinate conversion
  const CANVAS_HEIGHT = 600;

  // Helper to create a tank at a specific world position
  function createTank(worldX: number, worldY: number): TankState {
    return {
      id: 'test-tank',
      position: { x: worldX, y: worldY },
      health: 100,
      angle: 0,
      power: 50,
      color: 'red',
      isActive: true,
      queuedShot: null,
      isReady: false,
    };
  }

  it('returns true when explosion is at tank center', () => {
    // Tank at world position (400, 100)
    const tank = createTank(400, 100);
    // Tank screen Y = 600 - 100 = 500
    // Explosion at same screen position
    const explosionScreenPos = { x: 400, y: 500 };

    expect(checkTankHit(explosionScreenPos, tank, CANVAS_HEIGHT)).toBe(true);
  });

  it('returns true when explosion touches tank edge', () => {
    const tank = createTank(400, 100);
    // Tank screen Y = 500, extends from 490 (top) to 516 (bottom)
    // Tank extends from 380 (left) to 420 (right)
    // Explosion just touching right edge (radius 20)
    const explosionScreenPos = { x: 440, y: 500 }; // 20 pixels right of tank edge

    expect(checkTankHit(explosionScreenPos, tank, CANVAS_HEIGHT)).toBe(true);
  });

  it('returns false when explosion is far from tank', () => {
    const tank = createTank(400, 100);
    // Explosion far away
    const explosionScreenPos = { x: 100, y: 100 };

    expect(checkTankHit(explosionScreenPos, tank, CANVAS_HEIGHT)).toBe(false);
  });

  it('returns false when explosion is just outside tank hitbox', () => {
    const tank = createTank(400, 100);
    // Tank right edge at 420 (400 + 20)
    // Explosion at 441 is 21 pixels from tank edge, just outside radius 20
    const explosionScreenPos = { x: 441, y: 500 };

    expect(checkTankHit(explosionScreenPos, tank, CANVAS_HEIGHT)).toBe(false);
  });

  it('detects hit on tank top (screen coordinates)', () => {
    const tank = createTank(400, 100);
    // Tank screen Y = 500
    // Tank top at screenY - bodyHeight/2 = 500 - 10 = 490
    // Explosion at y=470 is 20 pixels above tank top (exactly at radius)
    const explosionScreenPos = { x: 400, y: 470 };

    expect(checkTankHit(explosionScreenPos, tank, CANVAS_HEIGHT)).toBe(true);
  });

  it('detects hit on tank bottom with wheels', () => {
    const tank = createTank(400, 100);
    // Tank screen Y = 500
    // Tank bottom at screenY + bodyHeight/2 + wheelRadius = 500 + 10 + 6 = 516
    // Explosion at y=536 is 20 pixels below tank bottom (exactly at radius)
    const explosionScreenPos = { x: 400, y: 536 };

    expect(checkTankHit(explosionScreenPos, tank, CANVAS_HEIGHT)).toBe(true);
  });

  it('handles diagonal hit detection correctly', () => {
    const tank = createTank(400, 100);
    // Tank corner at (420, 516) in screen coords
    // Diagonal from corner at distance ~14.14 should hit (within radius 20)
    const explosionScreenPos = { x: 430, y: 526 }; // ~14.14 from corner

    expect(checkTankHit(explosionScreenPos, tank, CANVAS_HEIGHT)).toBe(true);
  });

  it('handles diagonal miss correctly', () => {
    const tank = createTank(400, 100);
    // Diagonal from corner at distance > 20 should miss
    const explosionScreenPos = { x: 445, y: 541 }; // ~35.36 from corner

    expect(checkTankHit(explosionScreenPos, tank, CANVAS_HEIGHT)).toBe(false);
  });
});
