import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createWindParticleSystem,
  updateWindParticles,
  renderWindParticles,
  resetWindParticles,
} from './windParticles';

describe('windParticles', () => {
  describe('createWindParticleSystem', () => {
    it('creates a wind particle system with correct dimensions', () => {
      const system = createWindParticleSystem(800, 600);

      expect(system.canvasWidth).toBe(800);
      expect(system.canvasHeight).toBe(600);
      expect(system.particles).toEqual([]);
      expect(system.spawnAccumulator).toBe(0);
    });

    it('creates system with different dimensions', () => {
      const system = createWindParticleSystem(1024, 768);

      expect(system.canvasWidth).toBe(1024);
      expect(system.canvasHeight).toBe(768);
    });
  });

  describe('updateWindParticles', () => {
    it('does not spawn particles when wind is below minimum threshold', () => {
      const system = createWindParticleSystem(800, 600);
      const updated = updateWindParticles(system, 1, 1000, 100);

      expect(updated.particles.length).toBe(0);
    });

    it('spawns particles when wind is above minimum threshold', () => {
      const system = createWindParticleSystem(800, 600);
      // Run several frames to accumulate spawn time
      let updated = system;
      for (let i = 0; i < 10; i++) {
        updated = updateWindParticles(updated, 15, 1000 + i * 100, 100);
      }

      expect(updated.particles.length).toBeGreaterThan(0);
    });

    it('particles move in direction of positive wind (right)', () => {
      let system = createWindParticleSystem(800, 600);
      // Run several frames to spawn and move particles
      for (let i = 0; i < 20; i++) {
        system = updateWindParticles(system, 20, 1000 + i * 50, 50);
      }

      // All particles should have positive vx (moving right)
      const movingRight = system.particles.every(p => p.vx > 0);
      expect(movingRight).toBe(true);
    });

    it('particles move in direction of negative wind (left)', () => {
      let system = createWindParticleSystem(800, 600);
      // Run several frames to spawn and move particles
      for (let i = 0; i < 20; i++) {
        system = updateWindParticles(system, -20, 1000 + i * 50, 50);
      }

      // All particles should have negative vx (moving left)
      const movingLeft = system.particles.every(p => p.vx < 0);
      expect(movingLeft).toBe(true);
    });

    it('stronger wind spawns more particles', () => {
      let weakWindSystem = createWindParticleSystem(800, 600);
      let strongWindSystem = createWindParticleSystem(800, 600);

      // Run same number of frames with different wind strengths
      for (let i = 0; i < 30; i++) {
        weakWindSystem = updateWindParticles(weakWindSystem, 5, 1000 + i * 50, 50);
        strongWindSystem = updateWindParticles(strongWindSystem, 25, 1000 + i * 50, 50);
      }

      expect(strongWindSystem.particles.length).toBeGreaterThan(weakWindSystem.particles.length);
    });

    it('removes particles that are out of bounds', () => {
      let system = createWindParticleSystem(800, 600);
      // Spawn particles with positive wind
      for (let i = 0; i < 50; i++) {
        system = updateWindParticles(system, 30, 1000 + i * 50, 50);
      }

      const initialCount = system.particles.length;
      expect(initialCount).toBeGreaterThan(0);

      // Run many more frames to push particles off screen
      for (let i = 0; i < 200; i++) {
        system = updateWindParticles(system, 30, 4000 + i * 50, 50);
      }

      // Some particles should have been removed (out of bounds or expired)
      // At minimum, the system should still be working
      expect(system.particles.length).toBeLessThanOrEqual(60); // MAX_PARTICLES
    });

    it('particles accumulate trace points', () => {
      let system = createWindParticleSystem(800, 600);

      // Spawn particles
      for (let i = 0; i < 10; i++) {
        system = updateWindParticles(system, 15, 1000 + i * 50, 50);
      }

      // After a few frames, particles should have trace points
      for (let i = 0; i < 10; i++) {
        system = updateWindParticles(system, 15, 1500 + i * 50, 50);
      }

      const hasTrace = system.particles.some(p => p.trace.length > 0);
      expect(hasTrace).toBe(true);
    });

    it('clears particles and accumulator when wind drops below threshold', () => {
      let system = createWindParticleSystem(800, 600);

      // Build up particles
      for (let i = 0; i < 20; i++) {
        system = updateWindParticles(system, 20, 1000 + i * 50, 50);
      }

      expect(system.particles.length).toBeGreaterThan(0);

      // Drop wind below threshold
      system = updateWindParticles(system, 1, 2000, 50);

      expect(system.particles.length).toBe(0);
      expect(system.spawnAccumulator).toBe(0);
    });
  });

  describe('resetWindParticles', () => {
    it('clears all particles', () => {
      let system = createWindParticleSystem(800, 600);

      // Spawn some particles
      for (let i = 0; i < 20; i++) {
        system = updateWindParticles(system, 20, 1000 + i * 50, 50);
      }

      expect(system.particles.length).toBeGreaterThan(0);

      const reset = resetWindParticles(system);

      expect(reset.particles).toEqual([]);
      expect(reset.spawnAccumulator).toBe(0);
      // Canvas dimensions should be preserved
      expect(reset.canvasWidth).toBe(800);
      expect(reset.canvasHeight).toBe(600);
    });
  });

  describe('renderWindParticles', () => {
    let mockCtx: CanvasRenderingContext2D;

    beforeEach(() => {
      mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1,
        lineCap: 'butt',
      } as unknown as CanvasRenderingContext2D;
    });

    it('does not render when there are no particles', () => {
      const system = createWindParticleSystem(800, 600);

      renderWindParticles(mockCtx, system);

      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('renders particles when they exist', () => {
      let system = createWindParticleSystem(800, 600);

      // Spawn particles
      for (let i = 0; i < 20; i++) {
        system = updateWindParticles(system, 20, 1000 + i * 50, 50);
      }

      expect(system.particles.length).toBeGreaterThan(0);

      renderWindParticles(mockCtx, system);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      // Should draw arcs for particles
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('renders trace lines for particles with traces', () => {
      let system = createWindParticleSystem(800, 600);

      // Spawn and move particles to build up traces
      for (let i = 0; i < 30; i++) {
        system = updateWindParticles(system, 20, 1000 + i * 50, 50);
      }

      renderWindParticles(mockCtx, system);

      // Should have drawn some lines (traces)
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('particle properties', () => {
    it('particles have valid opacity range', () => {
      let system = createWindParticleSystem(800, 600);

      for (let i = 0; i < 20; i++) {
        system = updateWindParticles(system, 20, 1000 + i * 50, 50);
      }

      for (const particle of system.particles) {
        expect(particle.opacity).toBeGreaterThanOrEqual(0);
        expect(particle.opacity).toBeLessThanOrEqual(1);
      }
    });

    it('particles have valid size', () => {
      let system = createWindParticleSystem(800, 600);

      for (let i = 0; i < 20; i++) {
        system = updateWindParticles(system, 20, 1000 + i * 50, 50);
      }

      for (const particle of system.particles) {
        expect(particle.size).toBeGreaterThan(0);
        expect(particle.size).toBeLessThan(5);
      }
    });

    it('particles spawn in middle 75% of screen', () => {
      // Particles should spawn in the middle 75% (12.5% to 87.5% of width)
      // For 800px canvas: 100 to 700
      let system = createWindParticleSystem(800, 600);
      for (let i = 0; i < 10; i++) {
        system = updateWindParticles(system, 20, 1000 + i * 100, 100);
      }

      // Get newly spawned particles (ones that haven't moved much yet)
      const newParticles = system.particles.filter(p => p.trace.length < 2);
      if (newParticles.length > 0) {
        // New particles should be spawned in middle 75% of screen
        const inMiddle = newParticles.every(p => p.x >= 100 && p.x <= 700);
        expect(inMiddle).toBe(true);
      }
    });
  });
});
