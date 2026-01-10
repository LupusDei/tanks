/**
 * Wind generation system using probabilistic distribution.
 * Wind affects projectile trajectories based on real physics.
 */

/** Standard deviation for initial wind generation (m/s) */
export const WIND_STD_DEV = 10;

/** Standard deviation for per-turn wind changes (m/s) */
export const WIND_CHANGE_STD_DEV = 5;

/** Maximum wind speed in either direction (m/s) */
export const MAX_WIND = 30;

/** Regression to mean factor - extreme winds decay toward 0 */
export const WIND_REGRESSION = 0.7;

/**
 * Generate a random number from a standard normal distribution (mean=0, stdDev=1)
 * using the Box-Muller transform.
 */
function boxMullerRandom(): number {
  let u1 = 0;
  let u2 = 0;

  // Ensure u1 is not zero to avoid log(0)
  while (u1 === 0) {
    u1 = Math.random();
  }
  u2 = Math.random();

  // Box-Muller transform
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Generate a random number from a normal (Gaussian) distribution.
 *
 * @param mean - The mean of the distribution
 * @param stdDev - The standard deviation of the distribution
 * @returns A random number from the specified normal distribution
 */
export function gaussianRandom(mean: number = 0, stdDev: number = 1): number {
  return mean + boxMullerRandom() * stdDev;
}

/**
 * Clamp a value to the valid wind range.
 */
function clampWind(wind: number): number {
  return Math.max(-MAX_WIND, Math.min(MAX_WIND, wind));
}

/**
 * Generate initial wind for the start of a game.
 * Uses normal distribution with mean=0 and stdDev=WIND_STD_DEV.
 *
 * @returns Wind speed in m/s (negative = left, positive = right)
 */
export function generateInitialWind(): number {
  const wind = gaussianRandom(0, WIND_STD_DEV);
  return clampWind(Math.round(wind));
}

/**
 * Generate the next turn's wind based on the current wind.
 *
 * Uses regression to mean: extreme winds are more likely to move toward 0.
 * The algorithm:
 * 1. Apply regression factor to current wind (pulls toward 0)
 * 2. Add a random change from normal distribution
 * 3. Clamp to valid range
 *
 * This creates realistic wind behavior where:
 * - Wind changes gradually between turns
 * - Extreme winds (25+ m/s) naturally decay toward calmer conditions
 * - Calm conditions can become windy, but extreme winds are rare
 *
 * @param currentWind - The current wind speed in m/s
 * @returns The new wind speed for the next turn
 */
export function generateNextWind(currentWind: number): number {
  // Apply regression to mean - extreme winds decay toward 0
  const regressed = currentWind * WIND_REGRESSION;

  // Add random change
  const change = gaussianRandom(0, WIND_CHANGE_STD_DEV);

  // Calculate new wind and clamp
  const newWind = regressed + change;
  return clampWind(Math.round(newWind));
}
