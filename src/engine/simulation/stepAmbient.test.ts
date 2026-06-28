import { describe, it, expect } from 'vitest';
import { stepAmbient } from './stepAmbient';
import {
  createWindParticleSystem,
  createMoneyAnimation,
  MAX_WIND,
  type WindParticleSystemState,
  type MoneyAnimationState,
} from '../index';
import type { TickContext } from './types';
import type { TerrainData } from '../../types/game';

/** A minimal, valid TickContext. terrain/tanks are unused by stepAmbient. */
function makeContext(overrides: Partial<TickContext> = {}): TickContext {
  const terrain: TerrainData = { points: [], width: 800, height: 600 };
  return {
    terrain,
    tanks: [],
    wind: 0,
    canvasWidth: 800,
    canvasHeight: 600,
    now: 1000,
    ...overrides,
  };
}

describe('stepAmbient', () => {
  describe('wind particle system', () => {
    it('should create a system sized to ctx when windParticles is null (happy path)', () => {
      const ctx = makeContext({ canvasWidth: 1024, canvasHeight: 768, wind: 0 });

      const result = stepAmbient(null, [], 16, ctx);

      expect(result.windParticles).not.toBeNull();
      expect(result.windParticles.canvasWidth).toBe(1024);
      expect(result.windParticles.canvasHeight).toBe(768);
    });

    it('should recreate the system when canvas dimensions change (edge)', () => {
      // Existing system sized 800x600 with a stale particle in it.
      const existing = createWindParticleSystem(800, 600);
      const stale: WindParticleSystemState = {
        ...existing,
        particles: [
          {
            x: 1,
            y: 1,
            vx: 1,
            vy: 0,
            spawnTime: 0,
            lifetime: 5000,
            baseOpacity: 0.5,
            opacity: 0.5,
            size: 1,
            trace: [],
          },
        ],
      };

      const ctx = makeContext({ canvasWidth: 1920, canvasHeight: 1080, wind: 0 });
      const result = stepAmbient(stale, [], 16, ctx);

      // Resized to the new canvas, and the stale particle is gone (fresh system).
      expect(result.windParticles.canvasWidth).toBe(1920);
      expect(result.windParticles.canvasHeight).toBe(1080);
      expect(result.windParticles.particles).toHaveLength(0);
    });

    it('should advance the system via updateWindParticles (spawns under strong wind)', () => {
      // Matching dimensions so the system is NOT recreated, only updated.
      const system = createWindParticleSystem(800, 600);
      const ctx = makeContext({
        canvasWidth: 800,
        canvasHeight: 600,
        wind: MAX_WIND, // well above the spawn threshold
        now: 5000,
      });

      // A large delta guarantees the spawn accumulator crosses the interval.
      const result = stepAmbient(system, [], 1000, ctx);

      expect(result.windParticles.particles.length).toBeGreaterThan(0);
      // Dimensions preserved from the (non-recreated) input system.
      expect(result.windParticles.canvasWidth).toBe(800);
      expect(result.windParticles.canvasHeight).toBe(600);
    });

    it('should clear particles when wind is below the visible threshold (update applied)', () => {
      const seeded: WindParticleSystemState = {
        ...createWindParticleSystem(800, 600),
        particles: [
          {
            x: 10,
            y: 10,
            vx: 5,
            vy: 0,
            spawnTime: 0,
            lifetime: 5000,
            baseOpacity: 0.5,
            opacity: 0.5,
            size: 1,
            trace: [],
          },
        ],
      };
      const ctx = makeContext({ wind: 0 }); // below MIN_WIND_FOR_PARTICLES

      const result = stepAmbient(seeded, [], 16, ctx);

      expect(result.windParticles.particles).toHaveLength(0);
    });
  });

  describe('money animations', () => {
    it('should retain unfinished animations and drop finished ones', () => {
      const ctx = makeContext({ now: 10000, canvasHeight: 600 });

      // Started "now" -> 0% progress -> not finished -> retained.
      const fresh = createMoneyAnimation({ x: 100, y: 50 }, 600, 200, ctx.now);
      // Started long ago (> MONEY_ANIMATION_DURATION_MS=1500) -> finished -> dropped.
      const old = createMoneyAnimation({ x: 300, y: 80 }, 600, 500, ctx.now - 5000);

      const result = stepAmbient(null, [fresh, old], 16, ctx);

      expect(result.moneyAnimations).toHaveLength(1);
      expect(result.moneyAnimations[0]!.id).toBe(fresh.id);
    });

    it('should return an empty list when given an empty money list (edge)', () => {
      const ctx = makeContext();

      const result = stepAmbient(null, [], 16, ctx);

      expect(result.moneyAnimations).toEqual([]);
    });

    it('should not mutate the input money array (purity)', () => {
      const ctx = makeContext({ now: 10000, canvasHeight: 600 });
      const old = createMoneyAnimation({ x: 1, y: 1 }, 600, 100, ctx.now - 5000);
      const fresh = createMoneyAnimation({ x: 2, y: 2 }, 600, 100, ctx.now);
      const input: MoneyAnimationState[] = [old, fresh];

      const result = stepAmbient(null, input, 16, ctx);

      // Input array untouched.
      expect(input).toHaveLength(2);
      expect(input[0]).toBe(old);
      expect(input[1]).toBe(fresh);
      // A new array is returned, not the input reference.
      expect(result.moneyAnimations).not.toBe(input);
    });
  });

  it('should emit no events (events is always empty)', () => {
    const ctx = makeContext({ wind: MAX_WIND });
    const result = stepAmbient(null, [], 16, ctx);
    expect(result.events).toEqual([]);
  });
});
