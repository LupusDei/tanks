import type {
  UserData,
  UserStats,
  GameRecord,
  EnemyCount,
  TerrainSize,
  AIDifficulty,
  TankColor,
  WeaponInventory,
} from '../types/game';
import { STARTING_MONEY, calculateGameEarnings, type WeaponType } from '../engine/weapons';

// Storage keys
const PLAYERS_DB_KEY = 'tanks_players_db';
const CURRENT_PLAYER_KEY = 'tanks_current_player';
const LEGACY_STORAGE_KEY = 'tanks_user_data';

const MAX_RECENT_GAMES = 50;

// Type for the multi-player database
type PlayersDatabase = Record<string, UserData>;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function createDefaultStats(): UserStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalKills: 0,
    winRate: 0,
    balance: STARTING_MONEY,
  };
}

function createDefaultWeaponInventory(): WeaponInventory {
  return {
    standard: Infinity,
  };
}

function createDefaultUserData(username: string): UserData {
  return {
    profile: {
      id: generateId(),
      username,
      createdAt: Date.now(),
    },
    stats: createDefaultStats(),
    recentGames: [],
    weaponInventory: createDefaultWeaponInventory(),
  };
}

function calculateWinRate(won: number, played: number): number {
  if (played === 0) return 0;
  return Math.round((won / played) * 100);
}

// ============================================================================
// DATABASE ACCESS FUNCTIONS
// ============================================================================

/**
 * Load the entire players database.
 */
function loadPlayersDb(): PlayersDatabase {
  try {
    const stored = localStorage.getItem(PLAYERS_DB_KEY);
    if (!stored) return {};
    const db = JSON.parse(stored) as PlayersDatabase;

    // Restore Infinity for standard weapon in all players
    for (const playerData of Object.values(db)) {
      if (playerData.weaponInventory?.standard === null) {
        playerData.weaponInventory.standard = Infinity;
      }
    }

    return db;
  } catch {
    return {};
  }
}

/**
 * Save the entire players database.
 */
function savePlayersDb(db: PlayersDatabase): void {
  try {
    localStorage.setItem(PLAYERS_DB_KEY, JSON.stringify(db));
  } catch {
    console.error('Failed to save players database to localStorage');
  }
}

/**
 * Get the current player's name.
 */
export function getCurrentPlayerName(): string | null {
  try {
    return localStorage.getItem(CURRENT_PLAYER_KEY);
  } catch {
    return null;
  }
}

/**
 * Set the current player's name.
 */
export function setCurrentPlayer(name: string): void {
  try {
    localStorage.setItem(CURRENT_PLAYER_KEY, name);
  } catch {
    console.error('Failed to set current player');
  }
}

// ============================================================================
// MIGRATION
// ============================================================================

/**
 * Migrate legacy single-user data to the new multi-player format.
 * Called automatically on first load.
 */
function migrateLegacyData(): void {
  try {
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyData) return;

    const oldUserData = JSON.parse(legacyData) as UserData;
    const playerName = oldUserData.profile.username;

    // Restore Infinity for standard weapon
    if (oldUserData.weaponInventory?.standard === null) {
      oldUserData.weaponInventory.standard = Infinity;
    }

    // Load existing db (might be empty)
    const db = loadPlayersDb();

    // Only migrate if this player doesn't already exist
    if (!db[playerName]) {
      db[playerName] = oldUserData;
      savePlayersDb(db);
    }

    // Set as current player if no current player is set
    if (!getCurrentPlayerName()) {
      setCurrentPlayer(playerName);
    }

    // Remove legacy data
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore migration errors
  }
}

// Run migration on module load
migrateLegacyData();

// ============================================================================
// USER DATA FUNCTIONS
// ============================================================================

/**
 * Load user data for the current player.
 * Returns null if no current player is set or player doesn't exist.
 */
export function loadUserData(): UserData | null {
  const playerName = getCurrentPlayerName();
  if (!playerName) return null;
  return loadUserDataByName(playerName);
}

/**
 * Load user data for a specific player by name.
 */
export function loadUserDataByName(playerName: string): UserData | null {
  const db = loadPlayersDb();
  return db[playerName] ?? null;
}

/**
 * Save user data (updates the current player's data).
 */
export function saveUserData(userData: UserData): void {
  const playerName = userData.profile.username;
  const db = loadPlayersDb();
  db[playerName] = userData;
  savePlayersDb(db);
}

/**
 * Create a new user or load existing user by name.
 * Sets this user as the current player.
 */
export function createUser(username: string): UserData {
  const db = loadPlayersDb();

  // Check if player already exists
  let userData = db[username];
  if (!userData) {
    // Create new player
    userData = createDefaultUserData(username);
    db[username] = userData;
    savePlayersDb(db);
  }

  // Set as current player
  setCurrentPlayer(username);

  return userData;
}

/**
 * @deprecated Use createUser with a new name instead.
 * Changing username is not supported in name-based identity system.
 */
export function updateUsername(newUsername: string): UserData | null {
  // In the name-based system, changing username effectively creates a new user
  // This function is kept for backward compatibility but is deprecated
  const currentData = loadUserData();
  if (!currentData) return null;

  // If the name is the same, just return current data
  if (currentData.profile.username === newUsername) {
    return currentData;
  }

  // Create a new user with the new name (or load existing)
  return createUser(newUsername);
}

export interface GameEndParams {
  isVictory: boolean;
  enemyCount: EnemyCount;
  enemiesKilled: number;
  terrainSize: TerrainSize;
  aiDifficulty: AIDifficulty;
  turnsPlayed: number;
  playerColor: TankColor;
}

export function recordGameEnd(params: GameEndParams): UserData | null {
  const userData = loadUserData();
  if (!userData) return null;

  // Migrate balance if missing (for existing users)
  if (userData.stats.balance === undefined) {
    userData.stats.balance = STARTING_MONEY;
  }

  // Calculate money earned from this game
  const moneyEarned = calculateGameEarnings(
    params.isVictory,
    params.enemiesKilled,
    params.aiDifficulty
  );

  const gameRecord: GameRecord = {
    id: generateId(),
    playedAt: Date.now(),
    result: params.isVictory ? 'victory' : 'defeat',
    enemyCount: params.enemyCount,
    enemiesKilled: params.enemiesKilled,
    terrainSize: params.terrainSize,
    aiDifficulty: params.aiDifficulty,
    turnsPlayed: params.turnsPlayed,
    playerColor: params.playerColor,
    moneyEarned,
  };

  // Update stats
  userData.stats.gamesPlayed += 1;
  if (params.isVictory) {
    userData.stats.gamesWon += 1;
  } else {
    userData.stats.gamesLost += 1;
  }
  userData.stats.totalKills += params.enemiesKilled;
  userData.stats.winRate = calculateWinRate(
    userData.stats.gamesWon,
    userData.stats.gamesPlayed
  );
  userData.stats.balance += moneyEarned;

  // Add to recent games (keep last N games)
  userData.recentGames.unshift(gameRecord);
  if (userData.recentGames.length > MAX_RECENT_GAMES) {
    userData.recentGames = userData.recentGames.slice(0, MAX_RECENT_GAMES);
  }

  saveUserData(userData);
  return userData;
}

/**
 * Clear data for the current player.
 * Does not remove other players' data.
 */
export function clearUserData(): void {
  const playerName = getCurrentPlayerName();
  if (!playerName) return;

  const db = loadPlayersDb();
  delete db[playerName];
  savePlayersDb(db);

  // Clear current player
  try {
    localStorage.removeItem(CURRENT_PLAYER_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Clear all player data (complete reset).
 */
export function clearAllPlayerData(): void {
  try {
    localStorage.removeItem(PLAYERS_DB_KEY);
    localStorage.removeItem(CURRENT_PLAYER_KEY);
  } catch {
    console.error('Failed to clear all player data');
  }
}

export function hasExistingUser(): boolean {
  return loadUserData() !== null;
}

/**
 * Check if a specific player exists by name.
 */
export function playerExists(playerName: string): boolean {
  const db = loadPlayersDb();
  return playerName in db;
}

/**
 * Get list of all player names.
 */
export function getAllPlayerNames(): string[] {
  const db = loadPlayersDb();
  return Object.keys(db);
}

/**
 * Get the current user balance, with migration for existing users.
 */
export function getUserBalance(): number {
  const userData = loadUserData();
  if (!userData) return 0;

  // Migrate balance if missing (for existing users)
  if (userData.stats.balance === undefined) {
    userData.stats.balance = STARTING_MONEY;
    saveUserData(userData);
  }

  return userData.stats.balance;
}

/**
 * Spend money from the user's balance.
 * Returns the new balance, or null if insufficient funds or no user.
 */
export function spendMoney(amount: number): number | null {
  const userData = loadUserData();
  if (!userData) return null;

  // Migrate balance if missing (for existing users)
  if (userData.stats.balance === undefined) {
    userData.stats.balance = STARTING_MONEY;
  }

  if (userData.stats.balance < amount) {
    return null; // Insufficient funds
  }

  userData.stats.balance -= amount;
  saveUserData(userData);
  return userData.stats.balance;
}

/**
 * Add money to the user's balance (e.g., for bonuses or refunds).
 * Returns the new balance, or null if no user.
 */
export function addMoney(amount: number): number | null {
  const userData = loadUserData();
  if (!userData) return null;

  // Migrate balance if missing (for existing users)
  if (userData.stats.balance === undefined) {
    userData.stats.balance = STARTING_MONEY;
  }

  userData.stats.balance += amount;
  saveUserData(userData);
  return userData.stats.balance;
}

// ============================================================================
// WEAPON INVENTORY FUNCTIONS
// ============================================================================

/**
 * Migrate weapon inventory for existing users.
 * Ensures standard weapon is always available.
 */
function migrateWeaponInventory(userData: UserData): void {
  if (!userData.weaponInventory) {
    userData.weaponInventory = { standard: Infinity };
  } else if (userData.weaponInventory.standard !== Infinity) {
    userData.weaponInventory.standard = Infinity;
  }
}

/**
 * Get the count of a specific weapon in the user's inventory.
 * Returns 0 if weapon not owned, Infinity for standard weapon.
 */
export function getWeaponCount(weaponType: WeaponType): number {
  const userData = loadUserData();
  if (!userData) return 0;

  migrateWeaponInventory(userData);
  return userData.weaponInventory[weaponType] ?? 0;
}

/**
 * Add weapons to the user's inventory.
 * Returns the new count, or null if no user.
 */
export function addWeapon(weaponType: WeaponType, quantity: number): number | null {
  if (quantity <= 0) return null;
  if (weaponType === 'standard') return Infinity; // Standard always infinite

  const userData = loadUserData();
  if (!userData) return null;

  migrateWeaponInventory(userData);

  const currentCount = userData.weaponInventory[weaponType] ?? 0;
  const newCount = currentCount + quantity;
  userData.weaponInventory[weaponType] = newCount;

  saveUserData(userData);
  return newCount;
}

/**
 * Remove weapons from the user's inventory.
 * Returns the new count, or null if no user or insufficient quantity.
 * Standard weapon cannot be removed (returns Infinity).
 */
export function removeWeapon(weaponType: WeaponType, quantity: number): number | null {
  if (quantity <= 0) return null;
  if (weaponType === 'standard') return Infinity; // Standard cannot be consumed

  const userData = loadUserData();
  if (!userData) return null;

  migrateWeaponInventory(userData);

  const currentCount = userData.weaponInventory[weaponType] ?? 0;
  if (currentCount < quantity) return null; // Insufficient quantity

  const newCount = currentCount - quantity;
  userData.weaponInventory[weaponType] = newCount;

  saveUserData(userData);
  return newCount;
}

/**
 * Get the full weapon inventory.
 * Returns null if no user.
 */
export function getWeaponInventory(): WeaponInventory | null {
  const userData = loadUserData();
  if (!userData) return null;

  migrateWeaponInventory(userData);
  saveUserData(userData); // Persist migration if it occurred
  return userData.weaponInventory;
}
