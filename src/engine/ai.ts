import type { TankState, TerrainData, Position, AIDifficulty } from '../types/game';
import { AI_DIFFICULTY_ORDER } from '../types/game';
import { GRAVITY, degreesToRadians, powerToVelocity } from './physics';
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
  angle: number;  // UI angle: 0 = up, positive = left, negative = right, range -120 to +120
  power: number;
}

/**
 * UI angle limits.
 */
const MIN_UI_ANGLE = -120;
const MAX_UI_ANGLE = 120;

/**
 * Convert physics angle to UI angle.
 * Physics: 0 = right, 90 = up, 180 = left
 * UI: 0 = up, positive = left, negative = right
 */
function physicsAngleToUIAngle(physicsAngle: number): number {
  return physicsAngle - 90;
}

/**
 * Clamp UI angle to valid range.
 */
function clampUIAngle(angle: number): number {
  return Math.max(MIN_UI_ANGLE, Math.min(MAX_UI_ANGLE, angle));
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

  // Convert physics angle to UI angle and clamp to valid range
  const uiAngle = clampUIAngle(physicsAngleToUIAngle(bestAngle));

  return {
    angle: uiAngle,
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
  const velocity = powerToVelocity(power);
  const vx = velocity * Math.cos(angleRad);
  const vy = velocity * Math.sin(angleRad);

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
  const adjustedAngle = clampUIAngle(decision.angle + angleError);
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
 * Returns 1-3 chevrons for blind_fool, private, veteran.
 * Returns 0 for centurion and primus (they use stars instead).
 */
export function getChevronCount(difficulty: AIDifficulty): number {
  const chevronMap: Record<AIDifficulty, number> = {
    blind_fool: 1,
    private: 2,
    veteran: 3,
    centurion: 0,
    primus: 0,
  };
  return chevronMap[difficulty] ?? 1;
}

/**
 * Get the number of stars to display for a difficulty level.
 * Returns 0 for blind_fool, private, veteran.
 * Returns 1 for centurion, 2 for primus.
 */
export function getStarCount(difficulty: AIDifficulty): number {
  const starMap: Record<AIDifficulty, number> = {
    blind_fool: 0,
    private: 0,
    veteran: 0,
    centurion: 1,
    primus: 2,
  };
  return starMap[difficulty] ?? 0;
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

/**
 * Select a target for an AI tank in free-for-all mode.
 * Picks a random alive tank that isn't itself.
 * Weights selection towards closer tanks and lower health tanks.
 */
export function selectTarget(
  shooter: TankState,
  aliveTanks: TankState[]
): TankState | null {
  // Filter out self
  const potentialTargets = aliveTanks.filter((t) => t.id !== shooter.id);

  if (potentialTargets.length === 0) {
    return null;
  }

  // Calculate weights for each target based on distance and health
  const weights = potentialTargets.map((target) => {
    const distance = Math.abs(target.position.x - shooter.position.x);
    // Closer targets get higher weight (inverse distance)
    const distanceWeight = 1 / (1 + distance / 100);
    // Lower health targets get higher weight
    const healthWeight = 1 / (1 + target.health / 25);
    // Combined weight
    return distanceWeight + healthWeight;
  });

  // Normalize weights to probabilities
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const probabilities = weights.map((w) => w / totalWeight);

  // Random selection based on probabilities
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < potentialTargets.length; i++) {
    cumulative += probabilities[i]!;
    if (random <= cumulative) {
      return potentialTargets[i]!;
    }
  }

  // Fallback to first target
  return potentialTargets[0]!;
}
