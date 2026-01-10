/**
 * Weapon types and economy constants for the in-game money system.
 *
 * Weapons have varying stats that affect gameplay:
 * - damage: Base damage percentage (100 = full tank health)
 * - blastRadius: Explosion radius in pixels (affects hit detection)
 * - projectileSpeedMultiplier: Affects projectile travel speed
 *
 * Economy values are tuned for a progression where:
 * - Players start with enough for 1-2 basic upgrades
 * - Kills provide steady income
 * - Wins provide meaningful bonus
 * - Premium weapons require saving across multiple games
 */

/**
 * Weapon type identifier.
 * Used throughout the game to reference specific weapons.
 */
export type WeaponType =
  | 'standard'
  | 'heavy_artillery'
  | 'precision'
  | 'cluster_bomb'
  | 'napalm'
  | 'emp'
  | 'bouncing_betty';

/**
 * Destruction animation category.
 * Determines which type of tank destruction animation plays.
 */
export type DestructionCategory = 'explosive' | 'ballistic' | 'fire' | 'electric';

/**
 * Map weapon types to their destruction animation category.
 * - explosive: Tank explodes outward with debris (missiles, nukes, cluster bombs)
 * - ballistic: Tank falls apart mechanically (standard shot, precision)
 * - fire: Tank burns and chars (napalm, fire weapons)
 * - electric: Tank is fried with electric sparks (EMP)
 */
export function getDestructionCategory(weaponType: WeaponType): DestructionCategory {
  switch (weaponType) {
    case 'napalm':
      return 'fire';
    case 'heavy_artillery':
    case 'cluster_bomb':
    case 'bouncing_betty':
      return 'explosive';
    case 'emp':
      return 'electric';
    case 'standard':
    case 'precision':
    default:
      return 'ballistic';
  }
}

/**
 * Configuration for a weapon type.
 */
export interface WeaponConfig {
  /** Unique identifier for the weapon */
  id: WeaponType;
  /** Display name shown in UI */
  name: string;
  /** Description of the weapon's effects */
  description: string;
  /** Cost to purchase (0 = free/default) */
  cost: number;
  /** Base damage as percentage of tank health (100 = instant kill) */
  damage: number;
  /** Explosion radius in pixels (default game value is 20) */
  blastRadius: number;
  /** Multiplier for projectile speed (1.0 = normal) */
  projectileSpeedMultiplier: number;
  /** Number of turns to stun hit targets (0 = no stun, EMP weapons) */
  stunTurns?: number;
  /** Number of times projectile bounces off terrain before exploding (Bouncing Betty) */
  maxBounces?: number;
}

// ============================================================================
// ECONOMY CONSTANTS
// ============================================================================

/**
 * Starting money for new players.
 * Enough for 1-2 basic weapon purchases to encourage experimentation.
 */
export const STARTING_MONEY = 500;

/**
 * Money earned per enemy kill.
 * Primary source of income during gameplay.
 */
export const KILL_REWARD = 100;

/**
 * Bonus money for winning a game.
 * Significant reward to incentivize winning.
 */
export const WIN_BONUS = 250;

/**
 * Consolation money for losing a game.
 * Small amount so players don't feel stuck, but winning is clearly better.
 */
export const LOSS_CONSOLATION = 50;

/**
 * Difficulty multiplier for rewards.
 * Higher difficulties give bonus money to compensate for increased challenge.
 */
export const DIFFICULTY_REWARD_MULTIPLIERS: Record<string, number> = {
  blind_fool: 0.5,
  private: 0.75,
  veteran: 1.0,
  centurion: 1.25,
  primus: 1.5,
};

// ============================================================================
// WEAPON CONFIGURATIONS
// ============================================================================

/**
 * Standard shell - the default weapon.
 * Balanced stats, no cost. This is what players start with.
 * Low damage (35%) - requires multiple hits to kill.
 */
export const WEAPON_STANDARD: WeaponConfig = {
  id: 'standard',
  name: 'Standard Shell',
  description: 'Basic ammunition. Reliable and free. ~3 hits to kill.',
  cost: 0,
  damage: 35,
  blastRadius: 20,
  projectileSpeedMultiplier: 1.0,
};

/**
 * Heavy Artillery - bigger explosions, more damage area.
 * Slower projectile, high damage (60%) but not one-shot.
 */
export const WEAPON_HEAVY_ARTILLERY: WeaponConfig = {
  id: 'heavy_artillery',
  name: 'Heavy Artillery',
  description: 'Massive blast radius. Slower but devastating. ~2 hits to kill.',
  cost: 250,
  damage: 60,
  blastRadius: 35,
  projectileSpeedMultiplier: 0.8,
};

/**
 * Precision Shot (Sniper) - smaller blast, faster projectile.
 * THE ONLY ONE-SHOT WEAPON. For skilled players who can aim accurately.
 * Premium price reflects its instant-kill capability.
 */
export const WEAPON_PRECISION: WeaponConfig = {
  id: 'precision',
  name: 'Sniper Shot',
  description: 'One-shot kill. Fast and accurate. Small blast radius.',
  cost: 400,
  damage: 100,
  blastRadius: 12,
  projectileSpeedMultiplier: 1.3,
};

/**
 * Cluster Bomb - splits into multiple smaller explosions.
 * Good for area denial. Each cluster does partial damage.
 * 25% per hit × 5 = 125% total potential damage.
 */
export const WEAPON_CLUSTER_BOMB: WeaponConfig = {
  id: 'cluster_bomb',
  name: 'Cluster Bomb',
  description: 'Splits into 5 explosions. 125% total potential damage.',
  cost: 350,
  damage: 25, // Per cluster, 5 clusters = 125 potential if all hit
  blastRadius: 10,
  projectileSpeedMultiplier: 0.9,
};

/**
 * Napalm - fire damage over time.
 * Creates a burning area that damages tanks passing through.
 * Lower initial damage but great for area denial.
 */
export const WEAPON_NAPALM: WeaponConfig = {
  id: 'napalm',
  name: 'Napalm',
  description: 'Creates a burning area. 20% initial + burn damage.',
  cost: 275,
  damage: 20, // Initial hit damage, plus DoT
  blastRadius: 30,
  projectileSpeedMultiplier: 0.85,
};

/**
 * EMP Pulse - disables enemy tanks.
 * Low damage but stuns hit tanks for 1 turn.
 * Great for setting up follow-up attacks.
 */
export const WEAPON_EMP: WeaponConfig = {
  id: 'emp',
  name: 'EMP Pulse',
  description: 'Stuns target for 1 turn. Low damage but disables enemies.',
  cost: 200,
  damage: 15,
  blastRadius: 25,
  projectileSpeedMultiplier: 1.1,
  stunTurns: 1,
};

/**
 * Bouncing Betty - bounces off terrain before exploding.
 * Unpredictable trajectory makes it great for hitting behind cover.
 * Moderate damage with tricky bounce mechanics.
 */
export const WEAPON_BOUNCING_BETTY: WeaponConfig = {
  id: 'bouncing_betty',
  name: 'Bouncing Betty',
  description: 'Bounces 2x off terrain before exploding. Great for tricky shots.',
  cost: 175,
  damage: 45,
  blastRadius: 18,
  projectileSpeedMultiplier: 1.0,
  maxBounces: 2,
};

// ============================================================================
// WEAPON REGISTRY
// ============================================================================

/**
 * All available weapons indexed by their type.
 * Use this to look up weapon stats by ID.
 */
export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  standard: WEAPON_STANDARD,
  heavy_artillery: WEAPON_HEAVY_ARTILLERY,
  precision: WEAPON_PRECISION,
  cluster_bomb: WEAPON_CLUSTER_BOMB,
  napalm: WEAPON_NAPALM,
  emp: WEAPON_EMP,
  bouncing_betty: WEAPON_BOUNCING_BETTY,
};

/**
 * Ordered list of all weapon types.
 * Useful for iterating through weapons in UI.
 */
export const WEAPON_TYPES: WeaponType[] = [
  'standard',
  'heavy_artillery',
  'precision',
  'cluster_bomb',
  'napalm',
  'emp',
  'bouncing_betty',
];

/**
 * Get weapon configuration by type.
 * Returns the standard weapon if type is invalid.
 */
export function getWeaponConfig(weaponType: WeaponType): WeaponConfig {
  return WEAPONS[weaponType] ?? WEAPON_STANDARD;
}

/**
 * Get all purchasable weapons (cost > 0).
 */
export function getPurchasableWeapons(): WeaponConfig[] {
  return WEAPON_TYPES.map((type) => WEAPONS[type]).filter(
    (weapon) => weapon.cost > 0
  );
}

/**
 * Check if a player can afford a weapon.
 */
export function canAffordWeapon(balance: number, weaponType: WeaponType): boolean {
  const weapon = getWeaponConfig(weaponType);
  return balance >= weapon.cost;
}

/**
 * Calculate reward for a kill based on difficulty.
 */
export function calculateKillReward(aiDifficulty: string): number {
  const multiplier = DIFFICULTY_REWARD_MULTIPLIERS[aiDifficulty] ?? 1.0;
  return Math.round(KILL_REWARD * multiplier);
}

/**
 * Calculate bonus for winning based on difficulty.
 */
export function calculateWinBonus(aiDifficulty: string): number {
  const multiplier = DIFFICULTY_REWARD_MULTIPLIERS[aiDifficulty] ?? 1.0;
  return Math.round(WIN_BONUS * multiplier);
}

/**
 * Calculate total game earnings.
 */
export function calculateGameEarnings(
  isVictory: boolean,
  killCount: number,
  aiDifficulty: string
): number {
  const killReward = calculateKillReward(aiDifficulty) * killCount;
  const endBonus = isVictory
    ? calculateWinBonus(aiDifficulty)
    : LOSS_CONSOLATION;
  return killReward + endBonus;
}
