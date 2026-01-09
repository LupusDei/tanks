import type { Position } from '../types/game';

/**
 * Gravity constant in pixels per second squared.
 * Set to 10 for easy calculations.
 */
export const GRAVITY = 10;

/**
 * Power scaling factor to convert UI power (10-100) to velocity.
 * Calibrated so that full power (100) at 70° covers approximately
 * the full canvas width (800px).
 *
 * Calculation:
 * - Range = v² × sin(2θ) / g
 * - For 800px at 70°: v = sqrt(800 × 10 / sin(140°)) ≈ 112
 * - POWER_SCALE = 112 / 100 = 1.12
 */
export const POWER_SCALE = 1.12;

/**
 * Convert UI power value to actual velocity for physics calculations.
 */
export function powerToVelocity(power: number): number {
  return power * POWER_SCALE;
}

/**
 * Configuration for projectile launch.
 */
export interface LaunchConfig {
  position: Position;
  angle: number; // Angle in degrees (0 = right, 90 = up)
  power: number; // Initial velocity in m/s
}

/**
 * A point in the projectile trajectory with time information.
 */
export interface TrajectoryPoint extends Position {
  time: number;
}

/**
 * Convert degrees to radians.
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate projectile position at a given time.
 *
 * Uses standard projectile motion equations:
 * - x(t) = x₀ + v₀ * cos(θ) * t
 * - y(t) = y₀ + v₀ * sin(θ) * t - 0.5 * g * t²
 *
 * Note: In screen coordinates, y increases downward, so gravity adds to y.
 */
export function calculatePosition(config: LaunchConfig, time: number): Position {
  const { position, angle, power } = config;
  const angleRad = degreesToRadians(angle);
  const velocity = powerToVelocity(power);

  const vx = velocity * Math.cos(angleRad);
  const vy = velocity * Math.sin(angleRad);

  // In screen coordinates, positive y is down, so gravity adds to y
  const x = position.x + vx * time;
  const y = position.y - vy * time + 0.5 * GRAVITY * time * time;

  return { x, y };
}

/**
 * Calculate the velocity components at a given time.
 */
export function calculateVelocity(
  config: LaunchConfig,
  time: number
): { vx: number; vy: number } {
  const { angle, power } = config;
  const angleRad = degreesToRadians(angle);
  const velocity = powerToVelocity(power);

  const vx = velocity * Math.cos(angleRad);
  // In screen coordinates, gravity pulls down (increases y), so vy decreases
  const vy = velocity * Math.sin(angleRad) - GRAVITY * time;

  return { vx, vy };
}

/**
 * Calculate the time when the projectile reaches maximum height.
 * Returns 0 if the projectile is launched downward.
 */
export function calculateApexTime(config: LaunchConfig): number {
  const { angle, power } = config;
  const angleRad = degreesToRadians(angle);
  const velocity = powerToVelocity(power);
  const vy = velocity * Math.sin(angleRad);

  // Apex occurs when vertical velocity = 0
  // vy - g*t = 0, so t = vy/g
  if (vy <= 0) {
    return 0;
  }

  return vy / GRAVITY;
}

/**
 * Calculate the maximum height reached by the projectile.
 * Returns the initial y position if launched downward.
 */
export function calculateMaxHeight(config: LaunchConfig): number {
  const apexTime = calculateApexTime(config);
  const apexPosition = calculatePosition(config, apexTime);
  return apexPosition.y;
}

/**
 * Generate trajectory points at regular time intervals.
 *
 * @param config - Launch configuration
 * @param timeStep - Time interval between points (seconds)
 * @param maxTime - Maximum time to simulate (seconds)
 * @returns Array of trajectory points with time information
 */
export function calculateTrajectory(
  config: LaunchConfig,
  timeStep: number,
  maxTime: number
): TrajectoryPoint[] {
  if (timeStep <= 0) {
    throw new Error('timeStep must be positive');
  }

  if (maxTime < 0) {
    throw new Error('maxTime must be non-negative');
  }

  const points: TrajectoryPoint[] = [];

  for (let time = 0; time <= maxTime; time += timeStep) {
    const position = calculatePosition(config, time);
    points.push({
      ...position,
      time,
    });
  }

  return points;
}

/**
 * Calculate trajectory until the projectile reaches a target y coordinate.
 * Useful for finding where a projectile lands on terrain.
 *
 * @param config - Launch configuration
 * @param targetY - The y coordinate to stop at
 * @param timeStep - Time interval between points (seconds)
 * @param maxTime - Maximum time to simulate (seconds)
 * @returns Array of trajectory points, ending when targetY is reached or exceeded
 */
export function calculateTrajectoryUntilY(
  config: LaunchConfig,
  targetY: number,
  timeStep: number,
  maxTime: number
): TrajectoryPoint[] {
  if (timeStep <= 0) {
    throw new Error('timeStep must be positive');
  }

  if (maxTime < 0) {
    throw new Error('maxTime must be non-negative');
  }

  const points: TrajectoryPoint[] = [];
  let hasPassedApex = false;

  for (let time = 0; time <= maxTime; time += timeStep) {
    const position = calculatePosition(config, time);
    points.push({
      ...position,
      time,
    });

    // Check if we've passed the apex (projectile is now descending)
    if (time > 0 && points.length >= 2) {
      const prevY = points[points.length - 2]!.y;
      if (position.y > prevY) {
        hasPassedApex = true;
      }
    }

    // Stop if projectile has descended past target y
    if (hasPassedApex && position.y >= targetY) {
      break;
    }
  }

  return points;
}

/**
 * Find the approximate time when the projectile crosses a given y coordinate.
 * Uses binary search for precision.
 *
 * @param config - Launch configuration
 * @param targetY - The y coordinate to find
 * @param searchAfterApex - If true, find the crossing after apex (descent)
 * @param precision - Desired precision in seconds
 * @returns Time when projectile crosses targetY, or null if it doesn't
 */
export function findTimeAtY(
  config: LaunchConfig,
  targetY: number,
  searchAfterApex: boolean = true,
  precision: number = 0.001
): number | null {
  const apexTime = calculateApexTime(config);
  const apexPosition = calculatePosition(config, apexTime);

  // If searching after apex and target is above apex, impossible
  if (searchAfterApex && targetY < apexPosition.y) {
    return null;
  }

  // Binary search bounds
  let low: number;
  let high: number;

  if (searchAfterApex) {
    low = apexTime;
    // Estimate max time using quadratic formula for y
    high = apexTime + Math.sqrt((2 * (targetY - apexPosition.y)) / GRAVITY) * 2;
  } else {
    low = 0;
    high = apexTime;
  }

  // Binary search
  while (high - low > precision) {
    const mid = (low + high) / 2;
    const pos = calculatePosition(config, mid);

    if (searchAfterApex) {
      if (pos.y < targetY) {
        low = mid;
      } else {
        high = mid;
      }
    } else {
      if (pos.y > targetY) {
        low = mid;
      } else {
        high = mid;
      }
    }
  }

  return (low + high) / 2;
}
