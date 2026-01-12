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
  checkProjectileTankCollision,
  type ExplosionState,
} from './explosion';
import type { TankState } from '../types/game';

describe('EXPLOSION_RADIUS constant', () => {
  it('equals 20 pixels (50% of tank width)', () => {
    expect(EXPLOSION_RADIUS).toBe(20);
  });
});

describe('EXPLOSION_DURATION_MS constant', () => {
  it('equals 1500 milliseconds', () => {
    expect(EXPLOSION_DURATION_MS).toBe(1500);
  });
});

describe('createExplosion', () => {
  it('creates an explosion at the given position', () => {
    const position = { x: 100, y: 200 };
    const explosion = createExplosion(position, 1000);

    expect(explosion.position).toEqual(position);
    expect(explosion.startTime).toBe(1000);
    expect(explosion.isActive).toBe(true);
    expect(explosion.radius).toBe(EXPLOSION_RADIUS);
  });

  it('creates particles for the explosion', () => {
    const position = { x: 100, y: 200 };
    const explosion = createExplosion(position);

    expect(explosion.particles.length).toBeGreaterThan(0);
    expect(explosion.particles.length).toBe(20);
  });

  it('accepts custom radius parameter', () => {
    const position = { x: 100, y: 200 };
    const customRadius = 35;
    const explosion = createExplosion(position, 1000, customRadius);

    expect(explosion.radius).toBe(customRadius);
  });

  it('scales particle count with larger radius', () => {
    const position = { x: 100, y: 200 };
    const largeRadius = 40; // 2x default
    const explosion = createExplosion(position, 1000, largeRadius);

    // Larger radius should have more particles (up to max of 40)
    expect(explosion.particles.length).toBeGreaterThan(20);
    expect(explosion.particles.length).toBeLessThanOrEqual(40);
  });

  it('has fewer particles for smaller radius', () => {
    const position = { x: 100, y: 200 };
    const smallRadius = 10; // 0.5x default
    const explosion = createExplosion(position, 1000, smallRadius);

    // Smaller radius should have fewer particles (min of 15)
    expect(explosion.particles.length).toBeLessThan(20);
    expect(explosion.particles.length).toBeGreaterThanOrEqual(15);
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
      radius: EXPLOSION_RADIUS,
      weaponType: 'standard',
      durationMultiplier: 1.0,
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
      radius: EXPLOSION_RADIUS,
      weaponType: 'standard',
      durationMultiplier: 1.0,
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

  it('uses dynamic radius for hit detection', () => {
    // Large radius explosion
    const largeExplosion = createExplosion({ x: 100, y: 100 }, 0, 35);

    // Point 30 pixels away - outside default radius (20) but inside custom radius (35)
    expect(isPointInExplosion(largeExplosion, { x: 130, y: 100 })).toBe(true);

    // Small radius explosion
    const smallExplosion = createExplosion({ x: 100, y: 100 }, 0, 10);

    // Point 15 pixels away - inside default radius (20) but outside custom radius (10)
    expect(isPointInExplosion(smallExplosion, { x: 115, y: 100 })).toBe(false);
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
      maxHealth: 100,
      shieldHp: 0,
      maxShieldHp: 0,
      armorType: null,
      angle: 0,
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

  it('accepts custom explosion radius parameter', () => {
    const tank = createTank(400, 100);
    // Tank right edge at 420 (400 + 20)
    // Explosion at 460 is 40 pixels from tank edge

    // With default radius (20), should miss
    expect(checkTankHit({ x: 460, y: 500 }, tank, CANVAS_HEIGHT)).toBe(false);

    // With custom radius (45), should hit
    expect(checkTankHit({ x: 460, y: 500 }, tank, CANVAS_HEIGHT, 45)).toBe(true);
  });

  it('detects hit with larger radius', () => {
    const tank = createTank(400, 100);
    const largeRadius = 35;
    // Explosion at 455 is 35 pixels from tank edge - exactly at radius
    const explosionScreenPos = { x: 455, y: 500 };

    expect(checkTankHit(explosionScreenPos, tank, CANVAS_HEIGHT, largeRadius)).toBe(true);
  });

  it('misses with smaller radius', () => {
    const tank = createTank(400, 100);
    const smallRadius = 10;
    // Explosion at 435 is 15 pixels from tank edge - outside small radius
    const explosionScreenPos = { x: 435, y: 500 };

    expect(checkTankHit(explosionScreenPos, tank, CANVAS_HEIGHT, smallRadius)).toBe(false);
  });
});

describe('checkProjectileTankCollision', () => {
  const CANVAS_HEIGHT = 600;

  // Helper to create a tank at a specific world position
  function createTank(worldX: number, worldY: number, health: number = 100): TankState {
    return {
      id: 'test-tank',
      position: { x: worldX, y: worldY },
      health,
      maxHealth: 100,
      shieldHp: 0,
      maxShieldHp: 0,
      armorType: null,
      angle: 0,
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
    };
  }

  it('returns true when projectile is at tank center', () => {
    const tank = createTank(400, 100);
    // Tank screen Y = 600 - 100 = 500
    const projectilePos = { x: 400, y: 500 };

    expect(checkProjectileTankCollision(projectilePos, tank, CANVAS_HEIGHT)).toBe(true);
  });

  it('returns true when projectile touches tank edge', () => {
    const tank = createTank(400, 100);
    // Tank right edge at 420 (400 + 20), projectile radius 5
    // Projectile at 425 should just touch the edge
    const projectilePos = { x: 425, y: 500 };

    expect(checkProjectileTankCollision(projectilePos, tank, CANVAS_HEIGHT)).toBe(true);
  });

  it('returns false when projectile misses tank', () => {
    const tank = createTank(400, 100);
    // Projectile far to the right
    const projectilePos = { x: 500, y: 500 };

    expect(checkProjectileTankCollision(projectilePos, tank, CANVAS_HEIGHT)).toBe(false);
  });

  it('returns false when projectile is just outside tank hitbox', () => {
    const tank = createTank(400, 100);
    // Tank right edge at 420, with projectile radius 5
    // Projectile at 426 is just outside (420 + 5 = 425 is the boundary)
    const projectilePos = { x: 426, y: 500 };

    expect(checkProjectileTankCollision(projectilePos, tank, CANVAS_HEIGHT)).toBe(false);
  });

  it('returns false for dead tanks', () => {
    const deadTank = createTank(400, 100, 0);
    const projectilePos = { x: 400, y: 500 };

    expect(checkProjectileTankCollision(projectilePos, deadTank, CANVAS_HEIGHT)).toBe(false);
  });

  it('detects hit on tank top', () => {
    const tank = createTank(400, 100);
    // Tank screen Y = 500
    // Tank top at screenY - bodyHeight/2 = 500 - 10 = 490
    // Projectile at y=485 with radius 5 should hit (490 - 5 = 485)
    const projectilePos = { x: 400, y: 485 };

    expect(checkProjectileTankCollision(projectilePos, tank, CANVAS_HEIGHT)).toBe(true);
  });

  it('detects hit on tank bottom with wheels', () => {
    const tank = createTank(400, 100);
    // Tank screen Y = 500
    // Tank bottom at screenY + bodyHeight/2 + wheelRadius = 500 + 10 + 6 = 516
    // Projectile at y=521 with radius 5 should hit (516 + 5 = 521)
    const projectilePos = { x: 400, y: 521 };

    expect(checkProjectileTankCollision(projectilePos, tank, CANVAS_HEIGHT)).toBe(true);
  });

  it('handles diagonal hit detection correctly', () => {
    const tank = createTank(400, 100);
    // Tank corner at (420, 516) in screen coords
    // Projectile diagonally from corner
    const projectilePos = { x: 423, y: 519 }; // ~4.24 from corner, within radius 5

    expect(checkProjectileTankCollision(projectilePos, tank, CANVAS_HEIGHT)).toBe(true);
  });

  it('handles diagonal miss correctly', () => {
    const tank = createTank(400, 100);
    // Tank corner at (420, 516) in screen coords
    // Projectile too far diagonally
    const projectilePos = { x: 428, y: 524 }; // ~11.3 from corner, outside radius 5

    expect(checkProjectileTankCollision(projectilePos, tank, CANVAS_HEIGHT)).toBe(false);
  });

  it('accepts custom projectile radius', () => {
    const tank = createTank(400, 100);
    // Tank right edge at 420
    // Projectile at 430 is 10 pixels from edge

    // With default radius (5), should miss
    expect(checkProjectileTankCollision({ x: 430, y: 500 }, tank, CANVAS_HEIGHT)).toBe(false);

    // With larger radius (12), should hit
    expect(checkProjectileTankCollision({ x: 430, y: 500 }, tank, CANVAS_HEIGHT, 12)).toBe(true);
  });

  it('detects hit with larger projectile radius', () => {
    const tank = createTank(400, 100);
    const largeRadius = 8;
    // Projectile at 428 is 8 pixels from tank edge - exactly at radius
    const projectilePos = { x: 428, y: 500 };

    expect(checkProjectileTankCollision(projectilePos, tank, CANVAS_HEIGHT, largeRadius)).toBe(true);
  });

  it('correctly converts world to screen coordinates for tank position', () => {
    // Tank at different world positions
    const tankHighUp = createTank(400, 300);
    // Tank screen Y = 600 - 300 = 300
    const projectileHigh = { x: 400, y: 300 };

    expect(checkProjectileTankCollision(projectileHigh, tankHighUp, CANVAS_HEIGHT)).toBe(true);

    const tankLow = createTank(400, 50);
    // Tank screen Y = 600 - 50 = 550
    const projectileLow = { x: 400, y: 550 };

    expect(checkProjectileTankCollision(projectileLow, tankLow, CANVAS_HEIGHT)).toBe(true);
  });
});

describe('weapon-specific explosions', () => {
  const weaponTypes = ['standard', 'heavy_artillery', 'precision', 'cluster_bomb', 'napalm'] as const;

  describe('createExplosion with weapon types', () => {
    it('defaults to standard weapon type', () => {
      const explosion = createExplosion({ x: 100, y: 100 }, 0);
      expect(explosion.weaponType).toBe('standard');
      expect(explosion.durationMultiplier).toBe(1.0);
    });

    it('creates explosions for all weapon types', () => {
      for (const weaponType of weaponTypes) {
        const explosion = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, weaponType);
        expect(explosion.weaponType).toBe(weaponType);
        expect(explosion.durationMultiplier).toBeGreaterThan(0);
        expect(explosion.particles.length).toBeGreaterThan(0);
        expect(explosion.isActive).toBe(true);
      }
    });

    it('heavy artillery has longer duration', () => {
      const standard = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'standard');
      const heavy = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'heavy_artillery');
      expect(heavy.durationMultiplier).toBeGreaterThan(standard.durationMultiplier);
    });

    it('precision has shorter duration', () => {
      const standard = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'standard');
      const precision = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'precision');
      expect(precision.durationMultiplier).toBeLessThan(standard.durationMultiplier);
    });

    it('napalm has longest duration', () => {
      const napalm = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'napalm');
      expect(napalm.durationMultiplier).toBe(2.0);
    });

    it('heavy artillery has more particles', () => {
      const standard = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'standard');
      const heavy = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'heavy_artillery');
      expect(heavy.particles.length).toBeGreaterThan(standard.particles.length);
    });

    it('precision has fewer particles', () => {
      const standard = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'standard');
      const precision = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'precision');
      expect(precision.particles.length).toBeLessThan(standard.particles.length);
    });
  });

  describe('cluster bomb sub-explosions', () => {
    it('creates sub-explosions for cluster bomb', () => {
      const explosion = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'cluster_bomb');
      expect(explosion.subExplosions).toBeDefined();
      expect(explosion.subExplosions!.length).toBe(4);
    });

    it('sub-explosions have delayed start times', () => {
      const startTime = 1000;
      const explosion = createExplosion({ x: 100, y: 100 }, startTime, EXPLOSION_RADIUS, 'cluster_bomb');

      for (const sub of explosion.subExplosions!) {
        expect(sub.startTime).toBeGreaterThan(startTime);
        expect(sub.startTime).toBeLessThanOrEqual(startTime + 200);
      }
    });

    it('sub-explosions are positioned around main explosion', () => {
      const center = { x: 100, y: 100 };
      const explosion = createExplosion(center, 0, EXPLOSION_RADIUS, 'cluster_bomb');

      for (const sub of explosion.subExplosions!) {
        const dx = sub.position.x - center.x;
        const dy = sub.position.y - center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        expect(distance).toBeGreaterThan(0);
        expect(distance).toBeLessThan(EXPLOSION_RADIUS * 3);
      }
    });

    it('sub-explosions have smaller radius', () => {
      const explosion = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'cluster_bomb');

      for (const sub of explosion.subExplosions!) {
        expect(sub.radius).toBeLessThan(explosion.radius);
      }
    });

    it('non-cluster weapons do not have sub-explosions', () => {
      for (const weaponType of weaponTypes) {
        if (weaponType === 'cluster_bomb') continue;
        const explosion = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, weaponType);
        expect(explosion.subExplosions).toBeUndefined();
      }
    });
  });

  describe('explosion progress with duration multiplier', () => {
    it('respects duration multiplier in progress calculation', () => {
      const napalm = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'napalm');
      const standard = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'standard');

      // At half the standard duration, napalm should be at 25% progress (since 2x duration)
      const halfStandardDuration = EXPLOSION_DURATION_MS / 2;
      const napalmProgress = getExplosionProgress(napalm, halfStandardDuration);
      const standardProgress = getExplosionProgress(standard, halfStandardDuration);

      expect(standardProgress).toBeCloseTo(0.5, 1);
      expect(napalmProgress).toBeCloseTo(0.25, 1);
    });
  });

  describe('updateExplosion with weapon types', () => {
    it('updates sub-explosions for cluster bomb', () => {
      const explosion = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'cluster_bomb');
      const updated = updateExplosion(explosion, 100, 100);

      expect(updated.subExplosions).toBeDefined();
      expect(updated.subExplosions!.length).toBe(4);
    });

    it('napalm particles decay slower', () => {
      const napalm = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'napalm');
      const standard = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'standard');

      const napalmUpdated = updateExplosion(napalm, 500, 500);
      const standardUpdated = updateExplosion(standard, 500, 500);

      // Napalm particles should have more life remaining
      const napalmAvgLife = napalmUpdated.particles.reduce((sum, p) => sum + p.life, 0) / napalmUpdated.particles.length;
      const standardAvgLife = standardUpdated.particles.reduce((sum, p) => sum + p.life, 0) / standardUpdated.particles.length;

      expect(napalmAvgLife).toBeGreaterThan(standardAvgLife);
    });

    it('cluster bomb stays active while sub-explosions are active', () => {
      const explosion = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'cluster_bomb');

      // Update past main explosion duration but before sub-explosions complete
      const duration = EXPLOSION_DURATION_MS * explosion.durationMultiplier;
      const updated = updateExplosion(explosion, duration + 50, 16);

      // Should still be active if any sub-explosion is active
      const anySubActive = updated.subExplosions?.some(sub => sub.isActive);
      if (anySubActive) {
        expect(updated.isActive).toBe(true);
      }
    });
  });

  describe('renderExplosion with weapon types', () => {
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
        moveTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
      } as unknown as CanvasRenderingContext2D;
    });

    it('renders all weapon types without throwing', () => {
      for (const weaponType of weaponTypes) {
        const explosion = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, weaponType);
        expect(() => renderExplosion(ctx, explosion, 100)).not.toThrow();
      }
    });

    it('renders at various progress points', () => {
      for (const weaponType of weaponTypes) {
        const explosion = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, weaponType);
        const duration = EXPLOSION_DURATION_MS * explosion.durationMultiplier;

        // Test at various progress points
        expect(() => renderExplosion(ctx, explosion, 0)).not.toThrow();
        expect(() => renderExplosion(ctx, explosion, duration * 0.1)).not.toThrow();
        expect(() => renderExplosion(ctx, explosion, duration * 0.5)).not.toThrow();
        expect(() => renderExplosion(ctx, explosion, duration * 0.9)).not.toThrow();
      }
    });

    it('renders cluster bomb sub-explosions', () => {
      const explosion = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'cluster_bomb');

      // Render at a time when sub-explosions should be active
      expect(() => renderExplosion(ctx, explosion, 150)).not.toThrow();

      // save should be called multiple times (once for main + once per sub-explosion)
      expect(ctx.save).toHaveBeenCalled();
    });

    it('renders napalm flames effect', () => {
      const explosion = createExplosion({ x: 100, y: 100 }, 0, EXPLOSION_RADIUS, 'napalm');
      const duration = EXPLOSION_DURATION_MS * explosion.durationMultiplier;

      // Render at a time when flames should be visible (progress >= 0.2)
      expect(() => renderExplosion(ctx, explosion, duration * 0.5)).not.toThrow();

      // createLinearGradient should be called for flame effects
      expect(ctx.createLinearGradient).toHaveBeenCalled();
    });
  });
});
