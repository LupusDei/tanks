import { describe, it, expect } from 'vitest';
import {
  generateTerrain,
  getTerrainHeightAt,
  getInterpolatedHeightAt,
  smoothTerrain,
  createSeededRandom,
  type TerrainConfig,
} from './terrain';

describe('createSeededRandom', () => {
  it('produces deterministic sequence for same seed', () => {
    const random1 = createSeededRandom(12345);
    const random2 = createSeededRandom(12345);

    const seq1 = [random1(), random1(), random1()];
    const seq2 = [random2(), random2(), random2()];

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const random1 = createSeededRandom(12345);
    const random2 = createSeededRandom(54321);

    const seq1 = [random1(), random1(), random1()];
    const seq2 = [random2(), random2(), random2()];

    expect(seq1).not.toEqual(seq2);
  });

  it('produces values between 0 and 1', () => {
    const random = createSeededRandom(42);

    for (let i = 0; i < 100; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('generateTerrain', () => {
  const defaultConfig: TerrainConfig = {
    width: 800,
    height: 600,
  };

  it('generates terrain with correct dimensions', () => {
    const terrain = generateTerrain(defaultConfig);

    expect(terrain.width).toBe(800);
    expect(terrain.height).toBe(600);
    expect(terrain.points).toHaveLength(800);
  });

  it('generates all height values within default bounds', () => {
    const terrain = generateTerrain(defaultConfig);
    const minHeight = defaultConfig.height * 0.2;
    const maxHeight = defaultConfig.height * 0.7;

    for (const height of terrain.points) {
      expect(height).toBeGreaterThanOrEqual(minHeight);
      expect(height).toBeLessThanOrEqual(maxHeight);
    }
  });

  it('generates height values within custom bounds', () => {
    const config: TerrainConfig = {
      width: 100,
      height: 500,
      minHeight: 100,
      maxHeight: 300,
    };
    const terrain = generateTerrain(config);

    for (const height of terrain.points) {
      expect(height).toBeGreaterThanOrEqual(100);
      expect(height).toBeLessThanOrEqual(300);
    }
  });

  it('produces deterministic terrain with seed', () => {
    const config: TerrainConfig = {
      width: 100,
      height: 400,
      seed: 42,
    };

    const terrain1 = generateTerrain(config);
    const terrain2 = generateTerrain(config);

    expect(terrain1.points).toEqual(terrain2.points);
  });

  it('produces different terrain with different seeds', () => {
    const terrain1 = generateTerrain({ ...defaultConfig, seed: 1 });
    const terrain2 = generateTerrain({ ...defaultConfig, seed: 2 });

    expect(terrain1.points).not.toEqual(terrain2.points);
  });

  it('respects roughness parameter', () => {
    const smoothConfig: TerrainConfig = { width: 100, height: 400, roughness: 0.1, seed: 42 };
    const roughConfig: TerrainConfig = { width: 100, height: 400, roughness: 0.9, seed: 42 };

    const smoothTerrain = generateTerrain(smoothConfig);
    const roughTerrain = generateTerrain(roughConfig);

    // Calculate variance as a measure of roughness
    const calcVariance = (points: number[]) => {
      let totalDiff = 0;
      for (let i = 1; i < points.length; i++) {
        totalDiff += Math.abs(points[i]! - points[i - 1]!);
      }
      return totalDiff / points.length;
    };

    const smoothVariance = calcVariance(smoothTerrain.points);
    const roughVariance = calcVariance(roughTerrain.points);

    // Rough terrain should have more variation between adjacent points
    expect(roughVariance).toBeGreaterThan(smoothVariance);
  });

  it('throws error for non-positive width', () => {
    expect(() => generateTerrain({ width: 0, height: 400 })).toThrow('Width and height must be positive');
    expect(() => generateTerrain({ width: -10, height: 400 })).toThrow('Width and height must be positive');
  });

  it('throws error for non-positive height', () => {
    expect(() => generateTerrain({ width: 800, height: 0 })).toThrow('Width and height must be positive');
    expect(() => generateTerrain({ width: 800, height: -10 })).toThrow('Width and height must be positive');
  });

  it('throws error for invalid roughness', () => {
    expect(() => generateTerrain({ width: 100, height: 400, roughness: -0.1 })).toThrow(
      'Roughness must be between 0 and 1'
    );
    expect(() => generateTerrain({ width: 100, height: 400, roughness: 1.5 })).toThrow(
      'Roughness must be between 0 and 1'
    );
  });

  it('throws error when minHeight exceeds maxHeight', () => {
    expect(() => generateTerrain({ width: 100, height: 400, minHeight: 300, maxHeight: 100 })).toThrow(
      'minHeight cannot be greater than maxHeight'
    );
  });

  it('handles small terrain widths', () => {
    const terrain = generateTerrain({ width: 2, height: 400, seed: 42 });
    expect(terrain.points).toHaveLength(2);
  });

  it('handles width of 1', () => {
    const terrain = generateTerrain({ width: 1, height: 400, seed: 42 });
    expect(terrain.points).toHaveLength(1);
  });
});

describe('getTerrainHeightAt', () => {
  const terrain = generateTerrain({ width: 100, height: 400, seed: 42 });

  it('returns height at valid integer index', () => {
    const height = getTerrainHeightAt(terrain, 50);
    expect(height).toBe(terrain.points[50]);
  });

  it('floors floating point x values', () => {
    const height = getTerrainHeightAt(terrain, 50.7);
    expect(height).toBe(terrain.points[50]);
  });

  it('returns undefined for negative x', () => {
    expect(getTerrainHeightAt(terrain, -1)).toBeUndefined();
  });

  it('returns undefined for x beyond terrain width', () => {
    expect(getTerrainHeightAt(terrain, 100)).toBeUndefined();
    expect(getTerrainHeightAt(terrain, 150)).toBeUndefined();
  });

  it('returns first point at x=0', () => {
    expect(getTerrainHeightAt(terrain, 0)).toBe(terrain.points[0]);
  });

  it('returns last point at x=width-1', () => {
    expect(getTerrainHeightAt(terrain, 99)).toBe(terrain.points[99]);
  });
});

describe('getInterpolatedHeightAt', () => {
  const terrain = generateTerrain({ width: 100, height: 400, seed: 42 });

  it('returns exact height at integer positions', () => {
    expect(getInterpolatedHeightAt(terrain, 50)).toBe(terrain.points[50]);
    expect(getInterpolatedHeightAt(terrain, 0)).toBe(terrain.points[0]);
  });

  it('interpolates between adjacent points', () => {
    const h1 = terrain.points[50]!;
    const h2 = terrain.points[51]!;
    const interpolated = getInterpolatedHeightAt(terrain, 50.5);

    expect(interpolated).toBe((h1 + h2) / 2);
  });

  it('interpolates correctly at fractional positions', () => {
    const h1 = terrain.points[25]!;
    const h2 = terrain.points[26]!;
    const interpolated = getInterpolatedHeightAt(terrain, 25.25);

    expect(interpolated).toBeCloseTo(h1 + 0.25 * (h2 - h1), 10);
  });

  it('returns undefined for negative x', () => {
    expect(getInterpolatedHeightAt(terrain, -1)).toBeUndefined();
  });

  it('returns undefined for x at or beyond terrain width', () => {
    expect(getInterpolatedHeightAt(terrain, 100)).toBeUndefined();
    expect(getInterpolatedHeightAt(terrain, 150)).toBeUndefined();
  });

  it('returns last point height at last valid index', () => {
    expect(getInterpolatedHeightAt(terrain, 99)).toBe(terrain.points[99]);
  });
});

describe('smoothTerrain', () => {
  const baseTerrain = generateTerrain({ width: 100, height: 400, roughness: 0.9, seed: 42 });

  it('returns new terrain data without modifying original', () => {
    const originalPoints = [...baseTerrain.points];
    smoothTerrain(baseTerrain, 3);
    expect(baseTerrain.points).toEqual(originalPoints);
  });

  it('preserves terrain dimensions', () => {
    const smoothed = smoothTerrain(baseTerrain, 2);
    expect(smoothed.width).toBe(baseTerrain.width);
    expect(smoothed.height).toBe(baseTerrain.height);
    expect(smoothed.points).toHaveLength(baseTerrain.points.length);
  });

  it('preserves endpoint heights', () => {
    const smoothed = smoothTerrain(baseTerrain, 5);
    expect(smoothed.points[0]).toBe(baseTerrain.points[0]);
    expect(smoothed.points[smoothed.points.length - 1]).toBe(baseTerrain.points[baseTerrain.points.length - 1]);
  });

  it('reduces variation with more iterations', () => {
    const calcVariance = (points: number[]) => {
      let totalDiff = 0;
      for (let i = 1; i < points.length; i++) {
        totalDiff += Math.abs(points[i]! - points[i - 1]!);
      }
      return totalDiff / points.length;
    };

    const smoothed1 = smoothTerrain(baseTerrain, 1);
    const smoothed5 = smoothTerrain(baseTerrain, 5);

    expect(calcVariance(smoothed5.points)).toBeLessThan(calcVariance(smoothed1.points));
  });

  it('returns identical terrain with 0 iterations', () => {
    const smoothed = smoothTerrain(baseTerrain, 0);
    expect(smoothed.points).toEqual(baseTerrain.points);
  });

  it('throws error for negative iterations', () => {
    expect(() => smoothTerrain(baseTerrain, -1)).toThrow('Iterations must be non-negative');
  });
});
