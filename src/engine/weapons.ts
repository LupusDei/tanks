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
  | 'bouncing_betty'
  | 'bunker_buster'
  | 'homing_missile';

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
    case 'bunker_buster':
    case 'homing_missile':
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
  /** Radius of terrain destruction crater (Bunker Buster) */
  craterRadius?: number;
  /** Tracking strength for homing weapons (0.0 to 1.0, higher = stronger tracking) */
  trackingStrength?: number;
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
export const KILL_REWARD = 200;

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
 * Slower projectile, high damage (65%) but not one-shot.
 */
export const WEAPON_HEAVY_ARTILLERY: WeaponConfig = {
  id: 'heavy_artillery',
  name: 'Heavy Artillery',
  description: 'Massive blast radius. Slower but devastating. ~2 hits to kill.',
  cost: 250,
  damage: 65,
  blastRadius: 35,
  projectileSpeedMultiplier: 0.8,
};

/**
 * Precision Shot (Sniper) - smaller blast, faster projectile.
 * THE ONLY ONE-SHOT WEAPON. For skilled players who can aim accurately.
 */
export const WEAPON_PRECISION: WeaponConfig = {
  id: 'precision',
  name: 'Sniper Shot',
  description: 'One-shot kill. Fast and accurate. Small blast radius.',
  cost: 200,
  damage: 100,
  blastRadius: 12,
  projectileSpeedMultiplier: 1.3,
};

/**
 * Cluster Bomb - splits into multiple smaller explosions.
 * Good for area denial. Each cluster does partial damage.
 * 35% per hit × 5 = 175% total potential damage.
 */
export const WEAPON_CLUSTER_BOMB: WeaponConfig = {
  id: 'cluster_bomb',
  name: 'Cluster Bomb',
  description: 'Splits into 5 explosions. 175% total potential damage.',
  cost: 300,
  damage: 35, // Per cluster, 5 clusters = 175 potential if all hit
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
  cost: 250,
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

/**
 * Bunker Buster - terrain penetrating weapon.
 * Creates a crater in the terrain, damaging tanks behind cover.
 * Lower blast radius but destroys defensive positions.
 */
export const WEAPON_BUNKER_BUSTER: WeaponConfig = {
  id: 'bunker_buster',
  name: 'Bunker Buster',
  description: 'Creates a 40px crater in terrain. Destroys cover and bunkers.',
  cost: 300,
  damage: 55,
  blastRadius: 15,
  projectileSpeedMultiplier: 0.9,
  craterRadius: 40,
};

/**
 * Homing Missile - tracks nearest enemy tank.
 * Mild homing capability makes it easier to hit moving targets.
 * Moderate damage with exhaust trail visual.
 */
export const WEAPON_HOMING_MISSILE: WeaponConfig = {
  id: 'homing_missile',
  name: 'Homing Missile',
  description: 'Mild tracking toward nearest enemy. Easier to hit targets.',
  cost: 225,
  damage: 50,
  blastRadius: 20,
  projectileSpeedMultiplier: 0.85,
  trackingStrength: 0.3,
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
  bunker_buster: WEAPON_BUNKER_BUSTER,
  homing_missile: WEAPON_HOMING_MISSILE,
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
  'bunker_buster',
  'homing_missile',
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

// ============================================================================
// ARMOR CONFIGURATIONS
// ============================================================================

import type { ArmorType } from '../types/game';

/**
 * Configuration for an armor type.
 */
export interface ArmorConfig {
  /** Unique identifier for the armor */
  id: ArmorType;
  /** Display name shown in UI */
  name: string;
  /** Description of the armor's effects */
  description: string;
  /** Cost to purchase */
  cost: number;
  /** HP bonus multiplier (0.5 = 50% more HP, 1.0 = 100% more HP) */
  hpBonus: number;
  /** Whether this armor provides shield HP instead of regular HP */
  isShield: boolean;
  /** Visual layer count for rendering (1 or 2 for plating) */
  visualLayers: number;
}

/**
 * Light Plating - provides 50% more HP.
 * Shows 1 extra armor layer on tank.
 */
export const ARMOR_LIGHT_PLATING: ArmorConfig = {
  id: 'light_plating',
  name: 'Light Plating',
  description: 'Adds 50% more HP. Shows an extra armor layer on your tank.',
  cost: 200,
  hpBonus: 0.5,
  isShield: false,
  visualLayers: 1,
};

/**
 * Heavy Plating - provides 100% more HP.
 * Shows 2 extra armor layers on tank.
 */
export const ARMOR_HEAVY_PLATING: ArmorConfig = {
  id: 'heavy_plating',
  name: 'Heavy Plating',
  description: 'Adds 100% more HP. Shows 2 extra armor layers on your tank.',
  cost: 350,
  hpBonus: 1.0,
  isShield: false,
  visualLayers: 2,
};

/**
 * Energy Shield - provides 100 shield HP that only absorbs explosion/fire damage.
 * Direct hits bypass the shield. EMP completely destroys shields.
 * Shows as blue glow around tank with separate blue health bar.
 */
export const ARMOR_ENERGY_SHIELD: ArmorConfig = {
  id: 'energy_shield',
  name: 'Energy Shield',
  description: 'Adds 100 shield HP (absorbs explosions/fire only). Direct hits bypass. EMP destroys all shields.',
  cost: 300,
  hpBonus: 1.0, // 100 shield HP
  isShield: true,
  visualLayers: 0,
};

/**
 * All available armors indexed by their type.
 */
export const ARMORS: Record<ArmorType, ArmorConfig> = {
  light_plating: ARMOR_LIGHT_PLATING,
  heavy_plating: ARMOR_HEAVY_PLATING,
  energy_shield: ARMOR_ENERGY_SHIELD,
};

/**
 * Get armor configuration by type.
 */
export function getArmorConfig(armorType: ArmorType): ArmorConfig {
  return ARMORS[armorType];
}

/**
 * Check if a player can afford an armor.
 */
export function canAffordArmor(balance: number, armorType: ArmorType): boolean {
  const armor = getArmorConfig(armorType);
  return balance >= armor.cost;
}

// ============================================================================
// CONSUMABLE CONFIGURATIONS (Gas Cans)
// ============================================================================

import type { ConsumableType } from '../types/game';

/**
 * Configuration for a consumable type.
 */
export interface ConsumableConfig {
  /** Unique identifier for the consumable */
  id: ConsumableType;
  /** Display name shown in UI */
  name: string;
  /** Description of the consumable's effects */
  description: string;
  /** Cost to purchase one unit */
  cost: number;
  /** Maximum number that can be purchased per game */
  maxOwned: number;
  /** Fuel value provided by one gas can (0-100) */
  fuelValue: number;
}

/** Cost per gas can */
export const GAS_CAN_COST = 50;

/** Maximum gas cans purchasable (4 = 100% fuel) */
export const GAS_CAN_MAX = 4;

/** Fuel provided per gas can (25% of max) */
export const GAS_CAN_FUEL_VALUE = 25;

/**
 * Gas Can - provides fuel for tank movement.
 * Each can provides 25% fuel, allowing movement of 25% of Large terrain.
 */
export const CONSUMABLE_GAS_CAN: ConsumableConfig = {
  id: 'gas_can',
  name: 'Gas Can',
  description: 'Adds 25% fuel for tank movement. Press Q/E to move. Max 4.',
  cost: GAS_CAN_COST,
  maxOwned: GAS_CAN_MAX,
  fuelValue: GAS_CAN_FUEL_VALUE,
};

/**
 * All available consumables indexed by their type.
 */
export const CONSUMABLES: Record<ConsumableType, ConsumableConfig> = {
  gas_can: CONSUMABLE_GAS_CAN,
};

/**
 * Get consumable configuration by type.
 */
export function getConsumableConfig(consumableType: ConsumableType): ConsumableConfig {
  return CONSUMABLES[consumableType];
}

/**
 * Check if a player can afford a consumable.
 */
export function canAffordConsumable(balance: number, consumableType: ConsumableType): boolean {
  const consumable = getConsumableConfig(consumableType);
  return balance >= consumable.cost;
}
