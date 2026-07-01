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
 * Wind scale for Easy Mode. Scales both the random spread and the max clamp, so
 * easy-mode wind is much calmer (std-dev 10→2.5, max ±30→±7.5). Default scale is
 * 1 (normal wind).
 */
export const EASY_MODE_WIND_SCALE = 0.25;

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
 * Clamp a value to the valid wind range, scaled by `windScale`
 * (Easy Mode uses a smaller scale for a tighter max).
 */
function clampWind(wind: number, windScale: number = 1): number {
  const max = MAX_WIND * windScale;
  return Math.max(-max, Math.min(max, wind));
}

/**
 * Generate initial wind for the start of a game.
 * Uses normal distribution with mean=0 and stdDev=WIND_STD_DEV.
 *
 * @param windScale - Multiplier for spread + max (1 = normal, <1 = calmer, e.g.
 *   {@link EASY_MODE_WIND_SCALE} for Easy Mode). Default 1.
 * @returns Wind speed in m/s (negative = left, positive = right)
 */
export function generateInitialWind(windScale: number = 1): number {
  const wind = gaussianRandom(0, WIND_STD_DEV * windScale);
  return clampWind(Math.round(wind), windScale);
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
 * @param windScale - Multiplier for spread + max (1 = normal, <1 = calmer, e.g.
 *   {@link EASY_MODE_WIND_SCALE} for Easy Mode). Default 1.
 * @returns The new wind speed for the next turn
 */
export function generateNextWind(currentWind: number, windScale: number = 1): number {
  // Apply regression to mean - extreme winds decay toward 0
  const regressed = currentWind * WIND_REGRESSION;

  // Add random change (spread scaled for Easy Mode)
  const change = gaussianRandom(0, WIND_CHANGE_STD_DEV * windScale);

  // Calculate new wind and clamp
  const newWind = regressed + change;
  return clampWind(Math.round(newWind), windScale);
}
