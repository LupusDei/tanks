import type { TankState, TerrainData, Position, AIDifficulty } from '../types/game';
import { AI_DIFFICULTY_ORDER } from '../types/game';
import { GRAVITY, degreesToRadians } from './physics';
import { getInterpolatedHeightAt } from './terrain';

export type { AIDifficulty } from '../types/game';
export { AI_DIFFICULTY_ORDER } from '../types/game';

export interface AIDifficultyConfig {
  name: string;
  description: string;
  angleVariance: number;  // Max random deviation in degrees
  powerVariance: number;  // Max random deviation in power units
  thinkingTimeMs: number; // Delay before firing (for UX)
}

export const AI_DIFFICULTY_CONFIGS: Record<AIDifficulty, AIDifficultyConfig> = {
  blind_fool: {
    name: 'Blind Fool',
    description: 'Wildly inaccurate - seems to be firing randomly',
    angleVariance: 30,
    powerVariance: 40,
    thinkingTimeMs: 500,
  },
  private: {
    name: 'Private',
    description: 'Poor accuracy - still learning the basics',
    angleVariance: 15,
    powerVariance: 25,
    thinkingTimeMs: 800,
  },
  veteran: {
    name: 'Veteran',
    description: 'Decent accuracy - a competent opponent',
    angleVariance: 8,
    powerVariance: 15,
    thinkingTimeMs: 1200,
  },
  centurion: {
    name: 'Centurion',
    description: 'Good accuracy - a formidable foe',
    angleVariance: 4,
    powerVariance: 8,
    thinkingTimeMs: 1500,
  },
  primus: {
    name: 'Primus',
    description: 'Deadly accurate - nearly perfect calculations',
    angleVariance: 1,
    powerVariance: 3,
    thinkingTimeMs: 2000,
  },
};

export interface AIDecision {
  angle: number;
  power: number;
}

/**
 * Calculate the optimal angle and power to hit a target.
 * Uses projectile motion equations solved for the required parameters.
 *
 * For a projectile to hit target at (dx, dy) from launch point:
 * - dx = v * cos(θ) * t
 * - dy = v * sin(θ) * t - 0.5 * g * t²
 *
 * Solving these equations for angle given a power, or finding
 * the optimal power for a given angle trajectory.
 */
export function calculateOptimalShot(
  shooter: TankState,
  target: TankState,
  terrain: TerrainData | null
): AIDecision {
  const dx = target.position.x - shooter.position.x;

  // Determine firing direction (left or right)
  const firingLeft = dx < 0;

  // Try to find a good angle/power combination
  // Start with 45 degrees (optimal for max range) and adjust
  let bestAngle = 45;
  let bestPower = 50;
  let bestError = Infinity;

  // Search for optimal parameters
  // Test various angle/power combinations
  for (let testAngle = 20; testAngle <= 70; testAngle += 2) {
    for (let testPower = 30; testPower <= 100; testPower += 5) {
      // Calculate where this shot would land
      const actualAngle = firingLeft ? 180 - testAngle : testAngle;
      const landingX = simulateShotLanding(
        shooter.position,
        actualAngle,
        testPower,
        terrain
      );

      if (landingX !== null) {
        const error = Math.abs(landingX - target.position.x);
        if (error < bestError) {
          bestError = error;
          bestAngle = actualAngle;
          bestPower = testPower;
        }
      }
    }
  }

  // Refine the search around the best found values
  const angleBase = firingLeft ? 180 - bestAngle : bestAngle;
  for (let testAngle = angleBase - 5; testAngle <= angleBase + 5; testAngle += 1) {
    for (let testPower = bestPower - 10; testPower <= bestPower + 10; testPower += 2) {
      if (testPower < 10 || testPower > 100) continue;

      const actualAngle = firingLeft ? 180 - testAngle : testAngle;
      const landingX = simulateShotLanding(
        shooter.position,
        actualAngle,
        testPower,
        terrain
      );

      if (landingX !== null) {
        const error = Math.abs(landingX - target.position.x);
        if (error < bestError) {
          bestError = error;
          bestAngle = actualAngle;
          bestPower = testPower;
        }
      }
    }
  }

  return {
    angle: bestAngle,
    power: bestPower,
  };
}

/**
 * Simulate where a shot would land given initial parameters.
 * Returns the x coordinate of landing, or null if shot goes off screen.
 */
function simulateShotLanding(
  startPosition: Position,
  angle: number,
  power: number,
  terrain: TerrainData | null
): number | null {
  const timeStep = 0.05;
  const maxTime = 20;

  const angleRad = degreesToRadians(angle);
  const vx = power * Math.cos(angleRad);
  const vy = power * Math.sin(angleRad);

  let prevY = startPosition.y;

  for (let t = timeStep; t <= maxTime; t += timeStep) {
    const x = startPosition.x + vx * t;
    const y = startPosition.y + vy * t - 0.5 * GRAVITY * t * t;

    // Check if projectile is descending and below terrain
    if (terrain && y < prevY) {
      const terrainHeight = getInterpolatedHeightAt(terrain, x);
      if (terrainHeight !== undefined && y <= terrainHeight) {
        // Interpolate to find more precise landing point
        return x;
      }
    }

    // Check if off screen
    if (x < 0 || x > (terrain?.width ?? 800) || y < 0) {
      return null;
    }

    prevY = y;
  }

  return null;
}

/**
 * Apply difficulty-based variance to a shot decision.
 * Adds random error based on difficulty level.
 */
export function applyDifficultyVariance(
  decision: AIDecision,
  difficulty: AIDifficulty
): AIDecision {
  const config = AI_DIFFICULTY_CONFIGS[difficulty];

  // Generate random variance within the difficulty's bounds
  const angleError = (Math.random() - 0.5) * 2 * config.angleVariance;
  const powerError = (Math.random() - 0.5) * 2 * config.powerVariance;

  // Apply variance and clamp to valid ranges
  const adjustedAngle = decision.angle + angleError;
  const adjustedPower = Math.max(10, Math.min(100, decision.power + powerError));

  return {
    angle: adjustedAngle,
    power: adjustedPower,
  };
}

/**
 * Main AI function: calculate the shot for an AI-controlled tank.
 * Returns the angle, power, and recommended thinking time.
 */
export function calculateAIShot(
  aiTank: TankState,
  targetTank: TankState,
  terrain: TerrainData | null,
  difficulty: AIDifficulty
): AIDecision & { thinkingTimeMs: number } {
  // Calculate the optimal shot
  const optimalShot = calculateOptimalShot(aiTank, targetTank, terrain);

  // Apply difficulty variance
  const finalShot = applyDifficultyVariance(optimalShot, difficulty);

  // Get thinking time from difficulty config
  const config = AI_DIFFICULTY_CONFIGS[difficulty];

  return {
    ...finalShot,
    thinkingTimeMs: config.thinkingTimeMs,
  };
}

/**
 * Get all available difficulty levels for UI display.
 */
export function getAvailableDifficulties(): Array<{
  id: AIDifficulty;
  name: string;
  description: string;
}> {
  return (Object.keys(AI_DIFFICULTY_CONFIGS) as AIDifficulty[]).map((id) => ({
    id,
    name: AI_DIFFICULTY_CONFIGS[id].name,
    description: AI_DIFFICULTY_CONFIGS[id].description,
  }));
}

/**
 * Get the number of chevrons to display for a difficulty level.
 * Returns 0-4 chevrons based on rank.
 */
export function getChevronCount(difficulty: AIDifficulty): number {
  const index = AI_DIFFICULTY_ORDER.indexOf(difficulty);
  return index >= 0 ? index : 0;
}

/**
 * Get the next difficulty in the cycle.
 * Wraps around from primus back to blind_fool.
 */
export function getNextDifficulty(current: AIDifficulty): AIDifficulty {
  const currentIndex = AI_DIFFICULTY_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % AI_DIFFICULTY_ORDER.length;
  return AI_DIFFICULTY_ORDER[nextIndex]!;
}
