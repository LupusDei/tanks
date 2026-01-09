import type { TerrainData } from '../types/game';

export interface TerrainConfig {
  width: number;
  height: number;
  roughness?: number;
  minHeight?: number;
  maxHeight?: number;
  seed?: number;
}

const DEFAULT_ROUGHNESS = 0.5;
const DEFAULT_MIN_HEIGHT_RATIO = 0.2;
const DEFAULT_MAX_HEIGHT_RATIO = 0.7;

/**
 * Simple seeded random number generator for deterministic terrain.
 * Uses a linear congruential generator (LCG).
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/**
 * Generate terrain using midpoint displacement algorithm.
 * Creates natural-looking hills and valleys.
 */
export function generateTerrain(config: TerrainConfig): TerrainData {
  const {
    width,
    height,
    roughness = DEFAULT_ROUGHNESS,
    minHeight = height * DEFAULT_MIN_HEIGHT_RATIO,
    maxHeight = height * DEFAULT_MAX_HEIGHT_RATIO,
    seed,
  } = config;

  if (width <= 0 || height <= 0) {
    throw new Error('Width and height must be positive');
  }

  if (roughness < 0 || roughness > 1) {
    throw new Error('Roughness must be between 0 and 1');
  }

  if (minHeight > maxHeight) {
    throw new Error('minHeight cannot be greater than maxHeight');
  }

  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;

  // Initialize points array - one height value per pixel
  const points = new Array<number>(width);

  // Set initial endpoints at random heights within bounds
  const startHeight = minHeight + random() * (maxHeight - minHeight);
  const endHeight = minHeight + random() * (maxHeight - minHeight);

  points[0] = startHeight;
  points[width - 1] = endHeight;

  // Midpoint displacement
  midpointDisplacement(points, 0, width - 1, maxHeight - minHeight, roughness, minHeight, maxHeight, random);

  return {
    points,
    width,
    height,
  };
}

/**
 * Recursive midpoint displacement algorithm.
 * Subdivides the terrain and adds random displacement at each midpoint.
 */
function midpointDisplacement(
  points: number[],
  left: number,
  right: number,
  displacement: number,
  roughness: number,
  minHeight: number,
  maxHeight: number,
  random: () => number
): void {
  if (right - left <= 1) {
    return;
  }

  const mid = Math.floor((left + right) / 2);
  const leftHeight = points[left]!;
  const rightHeight = points[right]!;
  const average = (leftHeight + rightHeight) / 2;

  // Add random displacement (-displacement/2 to +displacement/2)
  const offset = (random() - 0.5) * displacement;
  let newHeight = average + offset;

  // Clamp to bounds
  newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

  points[mid] = newHeight;

  // Reduce displacement for next iteration based on roughness
  const newDisplacement = displacement * roughness;

  // Recursively process left and right halves
  midpointDisplacement(points, left, mid, newDisplacement, roughness, minHeight, maxHeight, random);
  midpointDisplacement(points, mid, right, newDisplacement, roughness, minHeight, maxHeight, random);
}

/**
 * Get terrain height at a specific x coordinate.
 * Returns the height value, or undefined if x is out of bounds.
 */
export function getTerrainHeightAt(terrain: TerrainData, x: number): number | undefined {
  const index = Math.floor(x);
  if (index < 0 || index >= terrain.points.length) {
    return undefined;
  }
  return terrain.points[index];
}

/**
 * Get interpolated terrain height at a specific x coordinate.
 * Uses linear interpolation between adjacent points for smoother results.
 */
export function getInterpolatedHeightAt(terrain: TerrainData, x: number): number | undefined {
  if (x < 0 || x >= terrain.width) {
    return undefined;
  }

  const index = Math.floor(x);
  const fraction = x - index;

  // If we're at an exact index or at the last point, return that height
  if (fraction === 0 || index >= terrain.points.length - 1) {
    return terrain.points[index];
  }

  // Linear interpolation between adjacent points
  const h1 = terrain.points[index]!;
  const h2 = terrain.points[index + 1]!;
  return h1 + fraction * (h2 - h1);
}

/**
 * Smooth terrain by averaging neighboring points.
 * Useful for creating gentler slopes after generation.
 */
export function smoothTerrain(terrain: TerrainData, iterations: number = 1): TerrainData {
  if (iterations < 0) {
    throw new Error('Iterations must be non-negative');
  }

  let points = [...terrain.points];

  for (let i = 0; i < iterations; i++) {
    const smoothed = new Array<number>(points.length);
    smoothed[0] = points[0]!;
    smoothed[points.length - 1] = points[points.length - 1]!;

    for (let j = 1; j < points.length - 1; j++) {
      smoothed[j] = (points[j - 1]! + points[j]! + points[j + 1]!) / 3;
    }

    points = smoothed;
  }

  return {
    ...terrain,
    points,
  };
}
