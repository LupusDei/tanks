import { describe, it, expect } from 'vitest';
import {
  generateInitialWind,
  generateNextWind,
  EASY_MODE_WIND_SCALE,
  MAX_WIND,
} from './wind';
import { STARTING_MONEY, EASY_MODE_STARTING_MONEY } from './weapons';

describe('Easy Mode wind scaling (tanks-304.1)', () => {
  it('should keep easy-mode initial wind within the reduced max clamp (happy path)', () => {
    const easyMax = MAX_WIND * EASY_MODE_WIND_SCALE; // 7.5
    for (let i = 0; i < 500; i++) {
      const w = generateInitialWind(EASY_MODE_WIND_SCALE);
      expect(Math.abs(w)).toBeLessThanOrEqual(easyMax);
    }
  });

  it('should produce much calmer easy-mode wind than normal on average (behavior)', () => {
    const N = 800;
    let normalMag = 0;
    let easyMag = 0;
    for (let i = 0; i < N; i++) {
      normalMag += Math.abs(generateInitialWind());
      easyMag += Math.abs(generateInitialWind(EASY_MODE_WIND_SCALE));
    }
    // Easy-mode average magnitude should be well below normal (scale 0.25).
    expect(easyMag / N).toBeLessThan(normalMag / N * 0.6);
  });

  it('should keep easy-mode per-turn wind within the reduced max clamp (edge)', () => {
    const easyMax = MAX_WIND * EASY_MODE_WIND_SCALE;
    let wind = 5;
    for (let i = 0; i < 500; i++) {
      wind = generateNextWind(wind, EASY_MODE_WIND_SCALE);
      expect(Math.abs(wind)).toBeLessThanOrEqual(easyMax);
    }
  });

  it('should default to normal wind behavior when no scale is passed (backward compat)', () => {
    // Normal wind can exceed the easy-mode cap; verify the full range is reachable.
    let maxSeen = 0;
    for (let i = 0; i < 2000; i++) {
      maxSeen = Math.max(maxSeen, Math.abs(generateInitialWind()));
    }
    expect(maxSeen).toBeGreaterThan(MAX_WIND * EASY_MODE_WIND_SCALE);
  });
});

describe('Easy Mode starting money (tanks-304.1)', () => {
  it('should define a higher easy-mode starting balance than normal', () => {
    expect(EASY_MODE_STARTING_MONEY).toBeGreaterThan(STARTING_MONEY);
    expect(EASY_MODE_STARTING_MONEY).toBe(2000);
  });
});
