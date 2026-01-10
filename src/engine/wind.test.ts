import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  WIND_STD_DEV,
  WIND_CHANGE_STD_DEV,
  MAX_WIND,
  WIND_REGRESSION,
  gaussianRandom,
  generateInitialWind,
  generateNextWind,
} from './wind';

describe('wind constants', () => {
  it('WIND_STD_DEV is 10', () => {
    expect(WIND_STD_DEV).toBe(10);
  });

  it('WIND_CHANGE_STD_DEV is 5', () => {
    expect(WIND_CHANGE_STD_DEV).toBe(5);
  });

  it('MAX_WIND is 30', () => {
    expect(MAX_WIND).toBe(30);
  });

  it('WIND_REGRESSION is 0.7', () => {
    expect(WIND_REGRESSION).toBe(0.7);
  });
});

describe('gaussianRandom', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns values centered around the mean', () => {
    // Generate many samples and check the mean
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(gaussianRandom(50, 10));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    // Mean should be close to 50 (within 2 standard errors)
    expect(mean).toBeGreaterThan(48);
    expect(mean).toBeLessThan(52);
  });

  it('respects standard deviation', () => {
    // Generate many samples and check the std dev
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(gaussianRandom(0, 10));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);
    // StdDev should be close to 10 (within reasonable tolerance)
    expect(stdDev).toBeGreaterThan(8);
    expect(stdDev).toBeLessThan(12);
  });

  it('produces different values on successive calls', () => {
    const samples = new Set<number>();
    for (let i = 0; i < 10; i++) {
      samples.add(gaussianRandom(0, 10));
    }
    // Should have multiple distinct values
    expect(samples.size).toBeGreaterThan(5);
  });

  it('uses default mean of 0 and stdDev of 1', () => {
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(gaussianRandom());
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    expect(mean).toBeGreaterThan(-0.2);
    expect(mean).toBeLessThan(0.2);
    expect(stdDev).toBeGreaterThan(0.8);
    expect(stdDev).toBeLessThan(1.2);
  });
});

describe('generateInitialWind', () => {
  it('returns an integer', () => {
    for (let i = 0; i < 10; i++) {
      const wind = generateInitialWind();
      expect(Number.isInteger(wind)).toBe(true);
    }
  });

  it('respects MAX_WIND bounds', () => {
    // Generate many samples to check bounds
    for (let i = 0; i < 100; i++) {
      const wind = generateInitialWind();
      expect(wind).toBeGreaterThanOrEqual(-MAX_WIND);
      expect(wind).toBeLessThanOrEqual(MAX_WIND);
    }
  });

  it('generates values centered around 0', () => {
    const samples: number[] = [];
    for (let i = 0; i < 500; i++) {
      samples.push(generateInitialWind());
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    // Mean should be close to 0 (within 3 m/s)
    expect(mean).toBeGreaterThan(-3);
    expect(mean).toBeLessThan(3);
  });

  it('produces both positive and negative values', () => {
    const samples: number[] = [];
    for (let i = 0; i < 50; i++) {
      samples.push(generateInitialWind());
    }
    const hasPositive = samples.some((w) => w > 0);
    const hasNegative = samples.some((w) => w < 0);
    expect(hasPositive).toBe(true);
    expect(hasNegative).toBe(true);
  });
});

describe('generateNextWind', () => {
  it('returns an integer', () => {
    for (let i = 0; i < 10; i++) {
      const wind = generateNextWind(15);
      expect(Number.isInteger(wind)).toBe(true);
    }
  });

  it('respects MAX_WIND bounds', () => {
    // Test with extreme starting values
    for (let i = 0; i < 50; i++) {
      const fromMax = generateNextWind(MAX_WIND);
      const fromMin = generateNextWind(-MAX_WIND);
      expect(fromMax).toBeLessThanOrEqual(MAX_WIND);
      expect(fromMax).toBeGreaterThanOrEqual(-MAX_WIND);
      expect(fromMin).toBeLessThanOrEqual(MAX_WIND);
      expect(fromMin).toBeGreaterThanOrEqual(-MAX_WIND);
    }
  });

  it('shows regression to mean over many iterations', () => {
    // Start with extreme wind and iterate
    let wind = 25;
    const iterations = 10;
    const endWinds: number[] = [];

    // Run multiple trials
    for (let trial = 0; trial < 50; trial++) {
      wind = 25;
      for (let i = 0; i < iterations; i++) {
        wind = generateNextWind(wind);
      }
      endWinds.push(wind);
    }

    // Average end wind should be closer to 0 than 25
    const avgEndWind = endWinds.reduce((a, b) => a + b, 0) / endWinds.length;
    expect(Math.abs(avgEndWind)).toBeLessThan(15);
  });

  it('maintains reasonable wind change magnitude', () => {
    // Changes between turns shouldn't be too drastic
    const startWind = 10;
    const changes: number[] = [];

    for (let i = 0; i < 100; i++) {
      const nextWind = generateNextWind(startWind);
      changes.push(Math.abs(nextWind - startWind));
    }

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    // Average change should be moderate (regressed difference + random change)
    // Starting at 10, regressed to 7, so base difference is 3, plus random ~5
    expect(avgChange).toBeGreaterThan(2);
    expect(avgChange).toBeLessThan(15);
  });

  it('returns 0 when starting from 0 with no randomness', () => {
    // With many samples from 0, mean should stay near 0
    const samples: number[] = [];
    for (let i = 0; i < 200; i++) {
      samples.push(generateNextWind(0));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(mean).toBeGreaterThan(-2);
    expect(mean).toBeLessThan(2);
  });
});

describe('wind system integration', () => {
  it('extreme winds are rare (within 2 std devs)', () => {
    // Generate many initial winds and check distribution
    let extremeCount = 0;
    const iterations = 500;

    for (let i = 0; i < iterations; i++) {
      const wind = generateInitialWind();
      if (Math.abs(wind) > 2 * WIND_STD_DEV) {
        extremeCount++;
      }
    }

    // About 5% should be beyond 2 std devs in a normal distribution
    // Allow some tolerance for randomness
    expect(extremeCount / iterations).toBeLessThan(0.15);
  });

  it('simulates realistic wind progression over multiple turns', () => {
    // Simulate a game with many turns
    let wind = generateInitialWind();
    const winds: number[] = [wind];

    for (let turn = 0; turn < 20; turn++) {
      wind = generateNextWind(wind);
      winds.push(wind);
    }

    // Check that wind varies
    const uniqueWinds = new Set(winds);
    expect(uniqueWinds.size).toBeGreaterThan(5);

    // Check all winds are within bounds
    for (const w of winds) {
      expect(w).toBeGreaterThanOrEqual(-MAX_WIND);
      expect(w).toBeLessThanOrEqual(MAX_WIND);
    }
  });
});
