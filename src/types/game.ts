import type { WeaponType, DestructionCategory } from '../engine/weapons';

// Re-export WeaponType and DestructionCategory for convenience
export type { WeaponType, DestructionCategory };

// ============================================================================
// Armor Types
// ============================================================================

/**
 * Available armor types that can be purchased in the Armory.
 * Armor provides HP bonuses for the next game and is consumed after each game.
 */
export type ArmorType = 'light_plating' | 'heavy_plating' | 'energy_shield';

/** All available armor types for iteration */
export const ARMOR_TYPES: ArmorType[] = ['light_plating', 'heavy_plating', 'energy_shield'];

/**
 * Armor inventory tracking purchased armor.
 * Each armor type can only be purchased once per game.
 */
export type ArmorInventory = Partial<Record<ArmorType, boolean>>;

export type GamePhase = 'loading' | 'playerName' | 'config' | 'weaponShop' | 'playing' | 'gameover' | 'campaignLeaderboard';

export type TankColor = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'cyan' | 'pink' | 'white' | 'brown';

export type TerrainSize = 'small' | 'medium' | 'large' | 'huge' | 'epic';

export interface TerrainSizeConfig {
  width: number;
  height: number;
  label: string;
}

export const TERRAIN_SIZES: Record<TerrainSize, TerrainSizeConfig> = {
  small: { width: 800, height: 600, label: 'Small' },
  medium: { width: 1024, height: 768, label: 'Medium' },
  large: { width: 1280, height: 960, label: 'Large' },
  huge: { width: 1600, height: 1200, label: 'Huge' },
  epic: { width: 2100, height: 2800, label: 'Epic' },
};

export type AIDifficulty =
  | 'blind_fool'
  | 'private'
  | 'veteran'
  | 'centurion'
  | 'primus';

// Order of difficulties from easiest to hardest (for cycling)
export const AI_DIFFICULTY_ORDER: AIDifficulty[] = [
  'blind_fool',
  'private',
  'veteran',
  'centurion',
  'primus',
];

export type EnemyCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const ENEMY_COUNT_OPTIONS: EnemyCount[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface Position {
  x: number;
  y: number;
}

/**
 * A queued shot configuration for simultaneous firing.
 * Stores the angle and power that will be used when all tanks are ready.
 */
export interface QueuedShot {
  angle: number;
  power: number;
}

export interface TankState {
  id: string;
  position: Position;
  health: number;
  /** Maximum health (100 base, increased by armor) */
  maxHealth: number;
  /** Energy shield HP (absorbs explosion/fire damage only) */
  shieldHp: number;
  /** Maximum shield HP */
  maxShieldHp: number;
  /** Active armor type for visual rendering (null if no armor) */
  armorType: ArmorType | null;
  angle: number;
  power: number;
  color: string;
  isActive: boolean;
  /** Shot configuration queued for simultaneous firing */
  queuedShot: QueuedShot | null;
  /** Whether this tank has locked in their shot and is ready to fire */
  isReady: boolean;
  /** Weapon type that killed this tank (set when health reaches 0) */
  killedByWeapon: WeaponType | null;
  /** Number of turns remaining that this tank is stunned (0 = not stunned) */
  stunTurnsRemaining: number;
}

export interface TerrainData {
  points: number[];
  width: number;
  height: number;
}

export interface GameState {
  phase: GamePhase;
  currentTurn: number;
  currentPlayerId: string | null;
  tanks: TankState[];
  terrain: TerrainData | null;
  winner: string | null;
  playerColor: TankColor | null;
  aiDifficulty: AIDifficulty;
  terrainSize: TerrainSize;
  enemyCount: EnemyCount;
  /** Player's selected weapon for the current game */
  selectedWeapon: WeaponType;
  /** Remaining shots per weapon type for current game */
  weaponAmmo: Partial<Record<WeaponType, number>>;
  /** Current wind speed in m/s (negative = left, positive = right) */
  wind: number;
}

export interface GameActions {
  setPhase: (phase: GamePhase) => void;
  initializeTanks: (tanks: TankState[]) => void;
  nextTurn: () => void;
  incrementTurn: () => void;
  updateTank: (tankId: string, updates: Partial<TankState>) => void;
  setTerrain: (terrain: TerrainData) => void;
  /**
   * Apply damage to a tank.
   * @param isDirectHit - If true, damage bypasses energy shield. If false (splash), shield absorbs first.
   */
  damageTank: (tankId: string, damage: number, weaponType?: WeaponType, isDirectHit?: boolean) => void;
  stunTank: (tankId: string, turns: number) => void;
  decrementStuns: () => void;
  setWinner: (tankId: string) => void;
  resetGame: () => void;
  resetToConfig: () => void;
  resetToCampaignWeaponShop: () => void;
  setPlayerColor: (color: TankColor) => void;
  setAIDifficulty: (difficulty: AIDifficulty) => void;
  setTerrainSize: (size: TerrainSize) => void;
  setEnemyCount: (count: EnemyCount) => void;
  setSelectedWeapon: (weapon: WeaponType) => void;
  setWeaponAmmo: (ammo: Partial<Record<WeaponType, number>>) => void;
  decrementAmmo: (weapon: WeaponType) => void;
  setWind: (wind: number) => void;
}

// User and Statistics Types

export interface UserProfile {
  id: string;
  username: string;
  createdAt: number; // Unix timestamp
}

export interface GameRecord {
  id: string;
  playedAt: number; // Unix timestamp
  result: 'victory' | 'defeat';
  enemyCount: EnemyCount;
  enemiesKilled: number;
  terrainSize: TerrainSize;
  aiDifficulty: AIDifficulty;
  turnsPlayed: number;
  playerColor: TankColor;
  moneyEarned: number; // Money earned from this game
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalKills: number;
  winRate: number; // 0-100 percentage
  balance: number; // Current money balance
}

/**
 * Weapon inventory tracking owned quantities of each weapon type.
 * Standard weapon has Infinity (always available).
 */
export type WeaponInventory = Partial<Record<WeaponType, number>>;

export interface UserData {
  profile: UserProfile;
  stats: UserStats;
  recentGames: GameRecord[];
  /** Owned weapons and their quantities. Standard is always Infinity. */
  weaponInventory: WeaponInventory;
  /** Owned armor for next game. Cleared after each game. */
  armorInventory: ArmorInventory;
}

// ============================================================================
// Campaign Mode Types
// ============================================================================

/** Available campaign lengths (number of games) */
export type CampaignLength = 3 | 5 | 8 | 13;

/** All available campaign lengths for UI selection */
export const CAMPAIGN_LENGTH_OPTIONS: CampaignLength[] = [3, 5, 8, 13];

/** Starting balance for all participants in a campaign */
export const CAMPAIGN_STARTING_BALANCE = 500;

/**
 * A participant in a campaign (player or AI tank).
 * Tracks their individual stats, balance, and progression.
 */
export interface CampaignParticipant {
  /** Unique identifier for this participant */
  id: string;
  /** Display name (player name or legendary general name) */
  name: string;
  /** Whether this is the human player */
  isPlayer: boolean;
  /** Current money balance (starts at 500) */
  balance: number;
  /** Total kills across all campaign games */
  kills: number;
  /** Total deaths across all campaign games */
  deaths: number;
  /** Number of games played in this campaign */
  gamesPlayed: number;
  /** Number of game wins in this campaign */
  wins: number;
  /** Current skill level (starts at selected difficulty, can increase) */
  currentLevel: AIDifficulty;
  /** Weapon inventory for this participant */
  weaponInventory: WeaponInventory;
  /** Armor inventory for this participant. Cleared after each game. */
  armorInventory: ArmorInventory;
  /** Tank color assigned for this campaign */
  color: TankColor;
}

/**
 * Configuration locked for the entire campaign.
 * Set at campaign start and cannot be changed mid-campaign.
 */
export interface CampaignConfig {
  terrainSize: TerrainSize;
  enemyCount: EnemyCount;
  playerColor: TankColor;
  aiDifficulty: AIDifficulty;
}

/**
 * Full campaign state persisted to localStorage.
 */
export interface CampaignState {
  /** Unique campaign identifier */
  campaignId: string;
  /** Total number of games in this campaign */
  length: CampaignLength;
  /** Current game number (1-indexed) */
  currentGame: number;
  /** Timestamp when campaign started */
  startedAt: number;
  /** Locked configuration for the entire campaign */
  config: CampaignConfig;
  /** All campaign participants (player + AI tanks) */
  participants: CampaignParticipant[];
}
