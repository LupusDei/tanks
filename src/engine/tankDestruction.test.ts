import { describe, it, expect } from 'vitest';
import {
  createTankDestruction,
  getDestructionProgress,
  isDestructionComplete,
  updateTankDestruction,
  DESTRUCTION_DURATION_MS,
} from './tankDestruction';
import type { TankState } from '../types/game';

// Helper to create a mock tank
function createMockTank(overrides: Partial<TankState> = {}): TankState {
  return {
    id: 'test-tank',
    position: { x: 400, y: 100 },
    health: 0, // Dead tank
    angle: 45,
    power: 50,
    color: 'red',
    isActive: false,
    queuedShot: null,
    isReady: false,
    killedByWeapon: 'heavy_artillery', // Explosive weapon by default
    ...overrides,
  };
}

const CANVAS_HEIGHT = 600;

describe('createTankDestruction', () => {
  it('creates destruction state for explosive weapon kills', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT);

    expect(destruction).not.toBeNull();
    expect(destruction!.tankId).toBe('test-tank');
    expect(destruction!.category).toBe('explosive');
    expect(destruction!.isActive).toBe(true);
    expect(destruction!.debris.length).toBeGreaterThan(0);
    expect(destruction!.particles.length).toBeGreaterThan(0);
  });

  it('creates destruction state for cluster_bomb kills', () => {
    const tank = createMockTank({ killedByWeapon: 'cluster_bomb' });
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT);

    expect(destruction).not.toBeNull();
    expect(destruction!.category).toBe('explosive');
  });

  it('returns null for non-explosive weapon kills (ballistic)', () => {
    const tank = createMockTank({ killedByWeapon: 'standard' });
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT);

    // Currently only explosive is implemented
    expect(destruction).toBeNull();
  });

  it('returns null for non-explosive weapon kills (fire)', () => {
    const tank = createMockTank({ killedByWeapon: 'napalm' });
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT);

    // Currently only explosive is implemented
    expect(destruction).toBeNull();
  });

  it('returns null when killedByWeapon is null', () => {
    const tank = createMockTank({ killedByWeapon: null });
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT);

    expect(destruction).toBeNull();
  });

  it('converts tank position to canvas coordinates', () => {
    const tank = createMockTank({
      position: { x: 400, y: 100 }, // World coordinates
    });
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT);

    expect(destruction!.position.x).toBe(400);
    expect(destruction!.position.y).toBe(100);
    // Canvas Y should be flipped: canvasHeight - worldY
    expect(destruction!.canvasY).toBe(CANVAS_HEIGHT - 100);
  });

  it('creates debris pieces with various types', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT);

    const debrisTypes = destruction!.debris.map((d) => d.type);

    expect(debrisTypes).toContain('hull_front');
    expect(debrisTypes).toContain('hull_rear');
    expect(debrisTypes).toContain('turret');
    expect(debrisTypes).toContain('barrel');
    expect(debrisTypes).toContain('track');
    expect(debrisTypes).toContain('wheel');
  });

  it('creates debris with initial velocities', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT);

    // All debris should have some velocity
    for (const piece of destruction!.debris) {
      const speed = Math.sqrt(piece.vx * piece.vx + piece.vy * piece.vy);
      expect(speed).toBeGreaterThan(0);
    }
  });

  it('creates particles for smoke and fire effects', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT);

    expect(destruction!.particles.length).toBeGreaterThan(10);

    // All particles should have initial life of 1
    for (const particle of destruction!.particles) {
      expect(particle.life).toBe(1);
    }
  });
});

describe('getDestructionProgress', () => {
  it('returns 0 at start time', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    const progress = getDestructionProgress(destruction, startTime);
    expect(progress).toBe(0);
  });

  it('returns 0.5 at half duration', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    const progress = getDestructionProgress(destruction, startTime + DESTRUCTION_DURATION_MS / 2);
    expect(progress).toBeCloseTo(0.5, 2);
  });

  it('returns 1 at full duration', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    const progress = getDestructionProgress(destruction, startTime + DESTRUCTION_DURATION_MS);
    expect(progress).toBe(1);
  });

  it('caps at 1 after full duration', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    const progress = getDestructionProgress(destruction, startTime + DESTRUCTION_DURATION_MS * 2);
    expect(progress).toBe(1);
  });
});

describe('isDestructionComplete', () => {
  it('returns false before duration is complete', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    expect(isDestructionComplete(destruction, startTime)).toBe(false);
    expect(isDestructionComplete(destruction, startTime + DESTRUCTION_DURATION_MS / 2)).toBe(false);
    expect(isDestructionComplete(destruction, startTime + DESTRUCTION_DURATION_MS - 1)).toBe(false);
  });

  it('returns true when duration is complete', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    expect(isDestructionComplete(destruction, startTime + DESTRUCTION_DURATION_MS)).toBe(true);
  });
});

describe('updateTankDestruction', () => {
  it('updates debris positions based on velocity', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    const initialX = destruction.debris[0]!.x;
    const initialY = destruction.debris[0]!.y;
    const vx = destruction.debris[0]!.vx;

    const deltaTimeMs = 100; // 100ms
    const updated = updateTankDestruction(destruction, startTime + deltaTimeMs, deltaTimeMs);

    // Position should change based on velocity
    // Note: exact values depend on gravity and air resistance
    expect(updated.debris[0]!.x).not.toBe(initialX);
    expect(updated.debris[0]!.y).not.toBe(initialY);

    // X should move in direction of velocity
    if (vx > 0) {
      expect(updated.debris[0]!.x).toBeGreaterThan(initialX);
    } else if (vx < 0) {
      expect(updated.debris[0]!.x).toBeLessThan(initialX);
    }
  });

  it('applies gravity to debris', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    const initialVy = destruction.debris[0]!.vy;
    const deltaTimeMs = 100;

    const updated = updateTankDestruction(destruction, startTime + deltaTimeMs, deltaTimeMs);

    // Vertical velocity should increase due to gravity (positive = down in screen coords)
    expect(updated.debris[0]!.vy).toBeGreaterThan(initialVy);
  });

  it('updates debris rotation', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    // Find a piece with rotation speed
    const rotatingPiece = destruction.debris.find((d) => d.rotationSpeed !== 0);
    if (!rotatingPiece) return;

    const initialRotation = rotatingPiece.rotation;
    const deltaTimeMs = 100;

    const updated = updateTankDestruction(destruction, startTime + deltaTimeMs, deltaTimeMs);
    const updatedPiece = updated.debris.find((d) => d.type === rotatingPiece.type);

    expect(updatedPiece!.rotation).not.toBe(initialRotation);
  });

  it('decreases debris life over time', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    const deltaTimeMs = 500;
    const updated = updateTankDestruction(destruction, startTime + deltaTimeMs, deltaTimeMs);

    // All debris should have reduced life
    for (const piece of updated.debris) {
      expect(piece.life).toBeLessThan(1);
      expect(piece.life).toBeGreaterThanOrEqual(0);
    }
  });

  it('decreases particle life over time', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    const deltaTimeMs = 500;
    const updated = updateTankDestruction(destruction, startTime + deltaTimeMs, deltaTimeMs);

    // All particles should have reduced life
    for (const particle of updated.particles) {
      expect(particle.life).toBeLessThan(1);
      expect(particle.life).toBeGreaterThanOrEqual(0);
    }
  });

  it('sets isActive to false when complete', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    // Update past the duration
    const updated = updateTankDestruction(
      destruction,
      startTime + DESTRUCTION_DURATION_MS + 100,
      DESTRUCTION_DURATION_MS + 100
    );

    expect(updated.isActive).toBe(false);
  });

  it('does not update inactive destruction', () => {
    const tank = createMockTank({ killedByWeapon: 'heavy_artillery' });
    const startTime = 1000;
    const destruction = createTankDestruction(tank, CANVAS_HEIGHT, startTime)!;

    // Make it inactive
    const inactiveDestruction = { ...destruction, isActive: false };

    const updated = updateTankDestruction(inactiveDestruction, startTime + 1000, 1000);

    // Should return unchanged
    expect(updated).toBe(inactiveDestruction);
  });
});

describe('DESTRUCTION_DURATION_MS', () => {
  it('is a reasonable duration', () => {
    expect(DESTRUCTION_DURATION_MS).toBeGreaterThan(1000);
    expect(DESTRUCTION_DURATION_MS).toBeLessThan(5000);
  });
});
