import type { TankState, TerrainData, Position, AIDifficulty, WeaponInventory } from '../types/game';
import { AI_DIFFICULTY_ORDER } from '../types/game';
import { GRAVITY, degreesToRadians, powerToVelocity, WIND_SCALE } from './physics';
import { getInterpolatedHeightAt } from './terrain';
import { type WeaponType, WEAPON_TYPES, WEAPONS, getPurchasableWeapons } from './weapons';

export type { AIDifficulty } from '../types/game';
export { AI_DIFFICULTY_ORDER } from '../types/game';

// ==========================================
// AI State Management (Target Persistence & Shot History)
// ==========================================

/** Tracks each AI's current target for target persistence */
const aiCurrentTargets: Map<string, string> = new Map();

/** Tracks consecutive shots at the same target for bracketing/zeroing */
const aiShotHistory: Map<string, number> = new Map();

/** Health threshold below which a target is considered "nearly destroyed" */
const CRITICAL_HEALTH_THRESHOLD = 20;

/** Maximum variance reduction from shot history (prevents perfect accuracy) */
const MAX_BRACKETING_REDUCTION = 0.6;

/** Variance reduction per consecutive shot at same target */
const BRACKETING_REDUCTION_PER_SHOT = 0.15;

/**
 * Clear all AI state. Call this when starting a new game.
 */
export function resetAIState(): void {
  aiCurrentTargets.clear();
  aiShotHistory.clear();
}

/**
 * Get the shot history key for a shooter-target pair.
 */
function getShotHistoryKey(shooterId: string, targetId: string): string {
  return `${shooterId}->${targetId}`;
}

/**
 * Get the number of consecutive shots an AI has taken at a target.
 */
export function getConsecutiveShots(shooterId: string, targetId: string): number {
  return aiShotHistory.get(getShotHistoryKey(shooterId, targetId)) ?? 0;
}

/**
 * Record a shot taken by an AI at a target.
 */
export function recordShot(shooterId: string, targetId: string): void {
  const key = getShotHistoryKey(shooterId, targetId);
  const currentCount = aiShotHistory.get(key) ?? 0;
  aiShotHistory.set(key, currentCount + 1);
}

/**
 * Clear shot history for a shooter when they switch targets.
 */
function clearShotHistoryForShooter(shooterId: string): void {
  for (const key of aiShotHistory.keys()) {
    if (key.startsWith(`${shooterId}->`)) {
      aiShotHistory.delete(key);
    }
  }
}

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

/**
 * Wind compensation factor for each AI difficulty level.
 * Higher values mean the AI better accounts for wind in its calculations.
 * - primus: Perfect wind compensation (100%)
 * - centurion: Very good wind compensation (90%)
 * - veteran: Good wind compensation (70%)
 * - private: Poor wind compensation (40%)
 * - blind_fool: Ignores wind entirely (0%)
 */
export const AI_WIND_COMPENSATION: Record<AIDifficulty, number> = {
  primus: 1.0,
  centurion: 0.9,
  veteran: 0.7,
  private: 0.4,
  blind_fool: 0,
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
 * - dx = v * cos(θ) * t + 0.5 * a_wind * t² (with wind)
 * - dy = v * sin(θ) * t - 0.5 * g * t²
 *
 * Solving these equations for angle given a power, or finding
 * the optimal power for a given angle trajectory.
 *
 * @param shooter - The AI tank that is shooting
 * @param target - The target tank to hit
 * @param terrain - Terrain data for collision detection
 * @param wind - Wind speed in m/s (positive = right, negative = left). Default 0.
 */
export function calculateOptimalShot(
  shooter: TankState,
  target: TankState,
  terrain: TerrainData | null,
  wind: number = 0
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
        terrain,
        wind
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
        terrain,
        wind
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
 *
 * @param startPosition - Starting position of the shot
 * @param angle - Launch angle in degrees (physics convention: 0 = right, 90 = up)
 * @param power - Power value (10-100)
 * @param terrain - Terrain data for collision detection
 * @param wind - Wind speed in m/s (positive = right, negative = left). Default 0.
 */
function simulateShotLanding(
  startPosition: Position,
  angle: number,
  power: number,
  terrain: TerrainData | null,
  wind: number = 0
): number | null {
  const timeStep = 0.05;
  const maxTime = 20;

  // Use terrain width for power scaling, default to 800 if no terrain
  const terrainWidth = terrain?.width ?? 800;

  const angleRad = degreesToRadians(angle);
  const velocity = powerToVelocity(power, terrainWidth);
  const vx = velocity * Math.cos(angleRad);
  const vy = velocity * Math.sin(angleRad);

  // Wind adds horizontal acceleration
  const windAccel = wind * WIND_SCALE;

  let prevY = startPosition.y;

  for (let t = timeStep; t <= maxTime; t += timeStep) {
    // Wind affects horizontal position: x += 0.5 * windAccel * t²
    const x = startPosition.x + vx * t + 0.5 * windAccel * t * t;
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
 * Optionally reduces variance based on consecutive shots (bracketing/zeroing).
 *
 * @param decision - The optimal shot decision
 * @param difficulty - AI difficulty level
 * @param consecutiveShots - Number of consecutive shots at the same target (for bracketing)
 */
export function applyDifficultyVariance(
  decision: AIDecision,
  difficulty: AIDifficulty,
  consecutiveShots: number = 0
): AIDecision {
  const config = AI_DIFFICULTY_CONFIGS[difficulty];

  // Calculate bracketing reduction: each consecutive shot reduces variance
  // Cap at MAX_BRACKETING_REDUCTION to prevent perfect accuracy
  const bracketingReduction = Math.min(
    consecutiveShots * BRACKETING_REDUCTION_PER_SHOT,
    MAX_BRACKETING_REDUCTION
  );
  const varianceMultiplier = 1 - bracketingReduction;

  // Generate random variance within the difficulty's bounds, reduced by bracketing
  const angleError = (Math.random() - 0.5) * 2 * config.angleVariance * varianceMultiplier;
  const powerError = (Math.random() - 0.5) * 2 * config.powerVariance * varianceMultiplier;

  // Apply variance and clamp to valid ranges
  const adjustedAngle = clampUIAngle(decision.angle + angleError);
  const adjustedPower = Math.max(10, Math.min(100, decision.power + powerError));

  return {
    angle: adjustedAngle,
    power: adjustedPower,
  };
}

// ==========================================
// Self-Preservation Logic
// ==========================================

/** Difficulties that are "too dumb" to check for self-harm */
const SELF_HARM_IGNORANT_DIFFICULTIES: AIDifficulty[] = ['blind_fool', 'private'];

/** Blast radius margin to check for self-harm (extra safety buffer) */
const SELF_HARM_SAFETY_MARGIN = 10;

/** Default blast radius to use if weapon config unavailable */
const DEFAULT_BLAST_RADIUS = 30;

/**
 * Check if a shot would land dangerously close to the shooter.
 * Returns true if the shot would likely harm the shooter.
 */
export function wouldShotHitSelf(
  shooter: TankState,
  decision: AIDecision,
  terrain: TerrainData | null,
  blastRadius: number = DEFAULT_BLAST_RADIUS
): boolean {
  // Convert UI angle to physics angle
  const physicsAngle = decision.angle + 90;

  // Simulate where the shot would land
  const landingX = simulateShotLanding(
    shooter.position,
    physicsAngle,
    decision.power,
    terrain
  );

  if (landingX === null) {
    // Shot goes off screen - not a self-harm risk
    return false;
  }

  // Check if landing is dangerously close to shooter
  const distance = Math.abs(landingX - shooter.position.x);
  return distance < (blastRadius + SELF_HARM_SAFETY_MARGIN);
}

/**
 * Find a safe alternative shot that won't harm the shooter.
 * Tries variations of angle and power to find a safe shot.
 * Returns null if no safe shot can be found.
 */
function findSafeShot(
  shooter: TankState,
  originalDecision: AIDecision,
  terrain: TerrainData | null,
  blastRadius: number = DEFAULT_BLAST_RADIUS
): AIDecision | null {
  // Try adjusting angle in both directions
  const angleAdjustments = [5, 10, 15, -5, -10, -15, 20, -20];
  // Try reducing power (safer, lands shorter)
  const powerAdjustments = [0, -10, -20, 10, 20];

  for (const powerAdj of powerAdjustments) {
    for (const angleAdj of angleAdjustments) {
      const testDecision: AIDecision = {
        angle: clampUIAngle(originalDecision.angle + angleAdj),
        power: Math.max(10, Math.min(100, originalDecision.power + powerAdj)),
      };

      if (!wouldShotHitSelf(shooter, testDecision, terrain, blastRadius)) {
        return testDecision;
      }
    }
  }

  return null;
}

/**
 * Main AI function: calculate the shot for an AI-controlled tank.
 * Returns the angle, power, and recommended thinking time.
 *
 * This version incorporates:
 * - Shot bracketing/zeroing (reduced variance with consecutive shots)
 * - Self-preservation (avoids self-harm except for lowest difficulties)
 * - Wind compensation (higher difficulty = better wind awareness)
 */
export function calculateAIShot(
  aiTank: TankState,
  targetTank: TankState,
  terrain: TerrainData | null,
  difficulty: AIDifficulty,
  options: {
    consecutiveShots?: number;
    blastRadius?: number;
    wind?: number;
  } = {}
): AIDecision & { thinkingTimeMs: number; targetId: string } {
  const { consecutiveShots = 0, blastRadius = DEFAULT_BLAST_RADIUS, wind = 0 } = options;

  // Apply difficulty-based wind compensation
  // Higher difficulty AIs better account for wind in their calculations
  const windCompensation = AI_WIND_COMPENSATION[difficulty];
  const effectiveWind = wind * windCompensation;

  // Calculate the optimal shot (with wind compensation)
  const optimalShot = calculateOptimalShot(aiTank, targetTank, terrain, effectiveWind);

  // Apply difficulty variance with bracketing
  let finalShot = applyDifficultyVariance(optimalShot, difficulty, consecutiveShots);

  // Self-preservation check (skip for blind_fool and private - they're too dumb)
  if (!SELF_HARM_IGNORANT_DIFFICULTIES.includes(difficulty)) {
    if (wouldShotHitSelf(aiTank, finalShot, terrain, blastRadius)) {
      // Try to find a safe alternative
      const safeShot = findSafeShot(aiTank, finalShot, terrain, blastRadius);
      if (safeShot) {
        finalShot = safeShot;
      }
      // If no safe shot found, still fire (better than doing nothing)
      // Higher difficulty AIs will at least try to avoid self-harm
    }
  }

  // Get thinking time from difficulty config
  const config = AI_DIFFICULTY_CONFIGS[difficulty];

  return {
    ...finalShot,
    thinkingTimeMs: config.thinkingTimeMs,
    targetId: targetTank.id,
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
 * Weapons available to each AI difficulty level.
 * Lower difficulties only use standard weapons.
 * Higher difficulties have access to more advanced weapons.
 */
export const AI_AVAILABLE_WEAPONS: Record<AIDifficulty, WeaponType[]> = {
  blind_fool: ['standard'],
  private: ['standard'],
  veteran: ['standard', 'heavy_artillery', 'precision'],
  centurion: ['standard', 'heavy_artillery', 'precision', 'cluster_bomb', 'homing_missile'],
  primus: WEAPON_TYPES, // All weapons
};

/**
 * Select a weapon for an AI tank based on difficulty and tactical situation.
 *
 * Strategy:
 * - Lower difficulties always use standard
 * - Higher difficulties make tactical choices based on target distance
 * - Very close: precision (fast, accurate)
 * - Medium range: heavy_artillery (big blast radius for margin of error)
 * - Long range: standard or cluster_bomb (good all-around)
 *
 * @param difficulty - AI difficulty level
 * @param shooter - The AI tank
 * @param target - The target tank
 * @param randomSeed - Optional random value 0-1 for deterministic testing
 */
export function selectAIWeapon(
  difficulty: AIDifficulty,
  shooter: TankState,
  target: TankState,
  randomSeed?: number
): WeaponType {
  const availableWeapons = AI_AVAILABLE_WEAPONS[difficulty];

  // If only standard is available, return it immediately
  if (availableWeapons.length === 1) {
    return 'standard';
  }

  // Calculate distance to target
  const dx = Math.abs(target.position.x - shooter.position.x);
  const dy = Math.abs(target.position.y - shooter.position.y);
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Use provided seed or generate random
  const random = randomSeed ?? Math.random();

  // Tactical weapon selection based on distance
  // Close range (< 150px): Prefer precision for fast, accurate shots
  // Medium range (150-350px): Prefer heavy_artillery for blast radius
  // Long range (> 350px): Mix of weapons, cluster for area denial

  if (distance < 150 && availableWeapons.includes('precision')) {
    // Close range: 60% precision, 30% standard, 10% heavy
    if (random < 0.6) return 'precision';
    if (random < 0.9) return 'standard';
    if (availableWeapons.includes('heavy_artillery')) return 'heavy_artillery';
    return 'standard';
  }

  if (distance >= 150 && distance < 350 && availableWeapons.includes('heavy_artillery')) {
    // Medium range: 50% heavy_artillery, 30% standard, 20% other
    if (random < 0.5) return 'heavy_artillery';
    if (random < 0.8) return 'standard';
    if (availableWeapons.includes('cluster_bomb') && random < 0.9) return 'cluster_bomb';
    if (availableWeapons.includes('precision')) return 'precision';
    return 'standard';
  }

  // Long range or no special weapons: varied selection
  if (availableWeapons.includes('cluster_bomb') && random < 0.25) {
    return 'cluster_bomb';
  }
  if (availableWeapons.includes('heavy_artillery') && random < 0.45) {
    return 'heavy_artillery';
  }
  if (availableWeapons.includes('napalm') && random < 0.55) {
    return 'napalm';
  }
  if (availableWeapons.includes('precision') && random < 0.7) {
    return 'precision';
  }

  return 'standard';
}

/**
 * Get weapon configuration for display in AI opponent info.
 */
export function getAIWeaponChoice(
  difficulty: AIDifficulty,
  shooter: TankState,
  target: TankState
): { weaponType: WeaponType; weaponName: string } {
  const weaponType = selectAIWeapon(difficulty, shooter, target);
  const weapon = WEAPONS[weaponType];
  return {
    weaponType,
    weaponName: weapon.name,
  };
}

/**
 * Select a target for an AI tank in free-for-all mode.
 * Picks a random alive tank that isn't itself.
 * Weights selection towards closer tanks and lower health tanks.
 *
 * This is the basic selection without persistence - used for testing
 * and when persistence is not needed.
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

/**
 * Select a target for an AI tank with persistence.
 * Will stick with the current target unless:
 * - Target is dead
 * - Another target is critically low health (easier kill opportunity)
 *
 * This function updates the internal AI state to track targets and shot history.
 */
export function selectTargetWithPersistence(
  shooter: TankState,
  aliveTanks: TankState[]
): TankState | null {
  // Filter out self
  const potentialTargets = aliveTanks.filter((t) => t.id !== shooter.id);

  if (potentialTargets.length === 0) {
    aiCurrentTargets.delete(shooter.id);
    return null;
  }

  // Check if we have a current target
  const currentTargetId = aiCurrentTargets.get(shooter.id);
  const currentTarget = currentTargetId
    ? potentialTargets.find((t) => t.id === currentTargetId)
    : null;

  // Check for critically low health targets (opportunity to finish off)
  const criticalTargets = potentialTargets.filter(
    (t) => t.health > 0 && t.health <= CRITICAL_HEALTH_THRESHOLD && t.id !== currentTargetId
  );

  // If there's a critically wounded target that's NOT our current target,
  // consider switching to finish them off
  if (criticalTargets.length > 0) {
    // Find the lowest health critical target
    const easiestKill = criticalTargets.reduce((lowest, current) =>
      current.health < lowest.health ? current : lowest
    );

    // Switch targets - clear shot history since we're changing targets
    if (currentTargetId !== easiestKill.id) {
      clearShotHistoryForShooter(shooter.id);
      aiCurrentTargets.set(shooter.id, easiestKill.id);
    }
    return easiestKill;
  }

  // If current target is still alive and valid, stick with it
  if (currentTarget && currentTarget.health > 0) {
    return currentTarget;
  }

  // Need to select a new target - use weighted random selection
  const newTarget = selectTarget(shooter, aliveTanks);

  if (newTarget) {
    // Clear shot history since we're changing targets
    if (currentTargetId !== newTarget.id) {
      clearShotHistoryForShooter(shooter.id);
    }
    aiCurrentTargets.set(shooter.id, newTarget.id);
  } else {
    aiCurrentTargets.delete(shooter.id);
  }

  return newTarget;
}

// ==========================================
// AI Economy System - Weapon Purchasing
// ==========================================

/**
 * Weapon purchase priority for each difficulty level.
 * Higher difficulties make smarter, more tactical purchases.
 * Lower difficulties buy more randomly or not at all.
 */
interface WeaponPurchasePreference {
  /** Weapons this difficulty prefers, in order of preference */
  preferredWeapons: WeaponType[];
  /** Chance (0-1) that AI will make a purchase when it can afford one */
  purchaseChance: number;
  /** Minimum balance AI will keep (won't spend below this) */
  reserveBalance: number;
}

const AI_PURCHASE_PREFERENCES: Record<AIDifficulty, WeaponPurchasePreference> = {
  blind_fool: {
    // Blind fools rarely buy and make random choices
    preferredWeapons: ['heavy_artillery', 'bouncing_betty'],
    purchaseChance: 0.2,
    reserveBalance: 300,
  },
  private: {
    // Privates occasionally buy, prefer simple weapons
    preferredWeapons: ['heavy_artillery', 'precision', 'bouncing_betty'],
    purchaseChance: 0.4,
    reserveBalance: 200,
  },
  veteran: {
    // Veterans make decent tactical choices
    preferredWeapons: ['precision', 'heavy_artillery', 'cluster_bomb', 'napalm'],
    purchaseChance: 0.6,
    reserveBalance: 150,
  },
  centurion: {
    // Centurions make good tactical purchases
    preferredWeapons: ['precision', 'homing_missile', 'heavy_artillery', 'cluster_bomb', 'bunker_buster'],
    purchaseChance: 0.8,
    reserveBalance: 100,
  },
  primus: {
    // Primus makes optimal purchases
    preferredWeapons: ['precision', 'homing_missile', 'bunker_buster', 'heavy_artillery', 'cluster_bomb', 'napalm'],
    purchaseChance: 0.95,
    reserveBalance: 50,
  },
};

/**
 * Represents a purchase decision made by the AI.
 */
export interface AIPurchaseDecision {
  weaponType: WeaponType;
  cost: number;
}

/**
 * Decide which weapons an AI should purchase between games.
 * Returns a list of purchases to make, respecting the AI's balance and preferences.
 *
 * @param difficulty - AI difficulty level
 * @param balance - Current balance available
 * @param existingInventory - Current weapon inventory
 * @returns Array of weapon purchases to make
 */
export function decideAIPurchases(
  difficulty: AIDifficulty,
  balance: number,
  existingInventory: WeaponInventory = {}
): AIPurchaseDecision[] {
  const prefs = AI_PURCHASE_PREFERENCES[difficulty];
  const purchases: AIPurchaseDecision[] = [];

  // Check if AI decides to make any purchases this round
  if (Math.random() > prefs.purchaseChance) {
    return []; // AI decided not to shop
  }

  let remainingBalance = balance;
  const purchasableWeapons = getPurchasableWeapons();

  // Calculate how many of each preferred weapon the AI should try to have
  const targetInventory = calculateTargetInventory(difficulty, prefs.preferredWeapons);

  // Try to buy preferred weapons up to target amounts
  for (const weaponType of prefs.preferredWeapons) {
    const weapon = WEAPONS[weaponType];
    const currentCount = existingInventory[weaponType] ?? 0;
    const targetCount = targetInventory[weaponType] ?? 1;

    // Buy up to target count, respecting balance constraints
    while (
      currentCount + purchases.filter(p => p.weaponType === weaponType).length < targetCount &&
      remainingBalance - weapon.cost >= prefs.reserveBalance
    ) {
      purchases.push({ weaponType, cost: weapon.cost });
      remainingBalance -= weapon.cost;
    }
  }

  // Higher difficulty AIs may opportunistically buy cheap weapons with spare cash
  if (difficulty === 'centurion' || difficulty === 'primus') {
    const cheapWeapons = purchasableWeapons
      .filter(w => w.cost <= 200 && !prefs.preferredWeapons.includes(w.id))
      .sort((a, b) => a.cost - b.cost);

    for (const weapon of cheapWeapons) {
      if (remainingBalance - weapon.cost >= prefs.reserveBalance && Math.random() > 0.5) {
        purchases.push({ weaponType: weapon.id, cost: weapon.cost });
        remainingBalance -= weapon.cost;
        break; // Just one opportunistic purchase
      }
    }
  }

  return purchases;
}

/**
 * Calculate target inventory counts based on difficulty.
 * Higher difficulties aim for more diverse and larger inventories.
 */
function calculateTargetInventory(
  difficulty: AIDifficulty,
  preferredWeapons: WeaponType[]
): Partial<Record<WeaponType, number>> {
  const target: Partial<Record<WeaponType, number>> = {};

  switch (difficulty) {
    case 'blind_fool':
    case 'private':
      // Low difficulties just want 1 of their top preferred weapon
      if (preferredWeapons[0]) target[preferredWeapons[0]] = 1;
      break;

    case 'veteran':
      // Veterans want 1-2 of top weapons
      preferredWeapons.slice(0, 2).forEach((w, i) => {
        target[w] = 2 - i; // First weapon: 2, second: 1
      });
      break;

    case 'centurion':
      // Centurions want a good arsenal
      preferredWeapons.slice(0, 3).forEach((w, i) => {
        target[w] = 3 - i; // First: 3, second: 2, third: 1
      });
      break;

    case 'primus':
      // Primus wants a full arsenal
      preferredWeapons.slice(0, 4).forEach((w, i) => {
        target[w] = 3 - Math.min(i, 2); // First three: 3,2,1, rest: 1
      });
      break;
  }

  return target;
}

/**
 * Select a weapon for an AI tank from its inventory.
 * Uses tactical decision-making based on difficulty and situation.
 *
 * @param difficulty - AI difficulty level
 * @param shooter - The AI tank
 * @param target - The target tank
 * @param inventory - The AI's weapon inventory
 * @returns The weapon to use (always returns at least 'standard')
 */
export function selectAIWeaponFromInventory(
  difficulty: AIDifficulty,
  shooter: TankState,
  target: TankState,
  inventory: WeaponInventory
): WeaponType {
  // Get base weapon selection (what AI would ideally use)
  const idealWeapon = selectAIWeapon(difficulty, shooter, target);

  // Check if AI has this weapon in inventory
  const inventoryCount = inventory[idealWeapon] ?? 0;
  if (idealWeapon === 'standard' || inventoryCount > 0) {
    return idealWeapon;
  }

  // If ideal weapon not available, check preferred weapons in order
  const prefs = AI_PURCHASE_PREFERENCES[difficulty];
  for (const weaponType of prefs.preferredWeapons) {
    const count = inventory[weaponType] ?? 0;
    if (count > 0) {
      return weaponType;
    }
  }

  // Fall back to any available weapon
  for (const weaponType of WEAPON_TYPES) {
    if (weaponType === 'standard') continue;
    const count = inventory[weaponType] ?? 0;
    if (count > 0) {
      return weaponType;
    }
  }

  // Default to standard (always available)
  return 'standard';
}

/**
 * Calculate money earned by an AI tank from a game result.
 * Uses the same formula as players.
 */
export function calculateAIGameEarnings(
  isVictory: boolean,
  killCount: number,
  aiDifficulty: AIDifficulty
): number {
  // Import constants directly to avoid circular dependency
  const KILL_REWARD = 200;
  const WIN_BONUS = 250;
  const LOSS_CONSOLATION = 50;
  const DIFFICULTY_MULTIPLIERS: Record<AIDifficulty, number> = {
    blind_fool: 0.5,
    private: 0.75,
    veteran: 1.0,
    centurion: 1.25,
    primus: 1.5,
  };

  const multiplier = DIFFICULTY_MULTIPLIERS[aiDifficulty];
  const killReward = Math.round(KILL_REWARD * multiplier) * killCount;
  const endBonus = isVictory
    ? Math.round(WIN_BONUS * multiplier)
    : LOSS_CONSOLATION;

  return killReward + endBonus;
}
