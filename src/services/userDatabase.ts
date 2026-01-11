import type {
  UserData,
  UserStats,
  GameRecord,
  EnemyCount,
  TerrainSize,
  AIDifficulty,
  TankColor,
  WeaponInventory,
  CampaignState,
  CampaignParticipant,
  CampaignLength,
  CampaignConfig,
} from '../types/game';
import { CAMPAIGN_STARTING_BALANCE } from '../types/game';
import { STARTING_MONEY, calculateGameEarnings, type WeaponType } from '../engine/weapons';

// Storage keys
const PLAYERS_DB_KEY = 'tanks_players_db';
const CURRENT_PLAYER_KEY = 'tanks_current_player';
const LEGACY_STORAGE_KEY = 'tanks_user_data';
const GAME_CONFIG_KEY = 'tanks_game_config';
const CAMPAIGN_KEY = 'tanks_active_campaign';

// Game config interface for persisting selections between sessions
export interface GameConfig {
  terrainSize: TerrainSize;
  enemyCount: EnemyCount;
  playerColor: TankColor;
  aiDifficulty?: AIDifficulty;
}

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

// ============================================================================
// GAME CONFIG PERSISTENCE
// ============================================================================

/**
 * Save game configuration for the current player.
 * Persists terrain size, enemy count, and player color selections.
 */
export function saveGameConfig(config: GameConfig): void {
  try {
    localStorage.setItem(GAME_CONFIG_KEY, JSON.stringify(config));
  } catch {
    console.error('Failed to save game config to localStorage');
  }
}

/**
 * Load saved game configuration.
 * Returns null if no config saved.
 */
export function loadGameConfig(): GameConfig | null {
  try {
    const stored = localStorage.getItem(GAME_CONFIG_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as GameConfig;
  } catch {
    return null;
  }
}

// ============================================================================
// CAMPAIGN STORAGE FUNCTIONS
// ============================================================================

/**
 * Generate a unique campaign ID.
 */
function generateCampaignId(): string {
  return `campaign-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a default weapon inventory for a campaign participant.
 * Everyone starts with only the standard weapon.
 */
function createCampaignWeaponInventory(): WeaponInventory {
  return { standard: Infinity };
}

/**
 * Create a new campaign participant.
 * @param id - The participant ID (must match game tank ID: 'player', 'enemy-1', etc.)
 * @param name - Display name for the participant
 * @param isPlayer - Whether this is the human player
 * @param startingLevel - Initial difficulty level
 * @param color - Tank color
 */
export function createCampaignParticipant(
  id: string,
  name: string,
  isPlayer: boolean,
  startingLevel: AIDifficulty,
  color: TankColor
): CampaignParticipant {
  return {
    id,
    name,
    isPlayer,
    balance: CAMPAIGN_STARTING_BALANCE,
    kills: 0,
    deaths: 0,
    gamesPlayed: 0,
    wins: 0,
    currentLevel: startingLevel,
    weaponInventory: createCampaignWeaponInventory(),
    color,
  };
}

/**
 * Load the active campaign from localStorage.
 * Returns null if no active campaign exists.
 */
export function loadActiveCampaign(): CampaignState | null {
  try {
    const stored = localStorage.getItem(CAMPAIGN_KEY);
    if (!stored) return null;
    const campaign = JSON.parse(stored) as CampaignState;

    // Restore Infinity for standard weapon in all participants
    for (const participant of campaign.participants) {
      if (participant.weaponInventory?.standard === null) {
        participant.weaponInventory.standard = Infinity;
      }
    }

    return campaign;
  } catch {
    return null;
  }
}

/**
 * Save the active campaign to localStorage.
 */
export function saveActiveCampaign(campaign: CampaignState): void {
  try {
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
  } catch {
    console.error('Failed to save campaign to localStorage');
  }
}

/**
 * Clear the active campaign from localStorage.
 */
export function clearActiveCampaign(): void {
  try {
    localStorage.removeItem(CAMPAIGN_KEY);
  } catch {
    console.error('Failed to clear campaign from localStorage');
  }
}

/**
 * Check if there's an active campaign.
 */
export function hasActiveCampaign(): boolean {
  return loadActiveCampaign() !== null;
}

/**
 * Create a new campaign with the given parameters.
 * Campaign participant IDs match game tank IDs ('player', 'enemy-1', 'enemy-2', etc.)
 * @param length - Number of games in the campaign (3, 5, 8, or 13)
 * @param config - Locked configuration for the campaign
 * @param playerName - Name of the human player
 * @param aiNames - Names for AI tanks (from legendary generals)
 */
export function createNewCampaign(
  length: CampaignLength,
  config: CampaignConfig,
  playerName: string,
  aiNames: string[]
): CampaignState {
  // Create all AI tank colors (excluding player color)
  const allColors: TankColor[] = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'cyan', 'pink', 'white', 'brown'];
  const availableColors = allColors.filter(c => c !== config.playerColor);

  // Create player participant with ID matching game tank ID
  const player = createCampaignParticipant(
    'player', // ID must match game tank ID
    playerName,
    true,
    config.aiDifficulty,
    config.playerColor
  );

  // Create AI participants with IDs matching game tank IDs ('enemy-1', 'enemy-2', etc.)
  const aiParticipants: CampaignParticipant[] = aiNames.slice(0, config.enemyCount).map((name, index) => {
    const color = availableColors[index % availableColors.length]!;
    const tankId = `enemy-${index + 1}`; // Must match game tank ID
    return createCampaignParticipant(tankId, name, false, config.aiDifficulty, color);
  });

  const campaign: CampaignState = {
    campaignId: generateCampaignId(),
    length,
    currentGame: 1,
    startedAt: Date.now(),
    config,
    participants: [player, ...aiParticipants],
  };

  saveActiveCampaign(campaign);
  return campaign;
}

/**
 * Get a participant by ID from the active campaign.
 */
export function getCampaignParticipant(participantId: string): CampaignParticipant | null {
  const campaign = loadActiveCampaign();
  if (!campaign) return null;
  return campaign.participants.find(p => p.id === participantId) ?? null;
}

/**
 * Get the player participant from the active campaign.
 */
export function getCampaignPlayer(): CampaignParticipant | null {
  const campaign = loadActiveCampaign();
  if (!campaign) return null;
  return campaign.participants.find(p => p.isPlayer) ?? null;
}

/**
 * Update a participant's balance in the active campaign.
 */
export function updateCampaignParticipantBalance(participantId: string, delta: number): void {
  const campaign = loadActiveCampaign();
  if (!campaign) return;

  const participant = campaign.participants.find(p => p.id === participantId);
  if (participant) {
    participant.balance = Math.max(0, participant.balance + delta);
    saveActiveCampaign(campaign);
  }
}

/**
 * Record a kill for a participant in the active campaign.
 * Also handles skill progression (level up every 3 kills).
 */
export function recordCampaignKill(killerId: string): AIDifficulty | null {
  const campaign = loadActiveCampaign();
  if (!campaign) return null;

  const killer = campaign.participants.find(p => p.id === killerId);
  if (!killer) return null;

  const previousKills = killer.kills;
  killer.kills += 1;

  // Check for level up (every 3 kills)
  const previousLevel = Math.floor(previousKills / 3);
  const newLevel = Math.floor(killer.kills / 3);

  let leveledUp: AIDifficulty | null = null;
  if (newLevel > previousLevel) {
    // Level up! Get next difficulty
    const difficulties: AIDifficulty[] = ['blind_fool', 'private', 'veteran', 'centurion', 'primus'];
    const currentIndex = difficulties.indexOf(killer.currentLevel);
    if (currentIndex < difficulties.length - 1) {
      killer.currentLevel = difficulties[currentIndex + 1]!;
      leveledUp = killer.currentLevel;
    }
  }

  saveActiveCampaign(campaign);
  return leveledUp;
}

/**
 * Record a death for a participant in the active campaign.
 */
export function recordCampaignDeath(victimId: string): void {
  const campaign = loadActiveCampaign();
  if (!campaign) return;

  const victim = campaign.participants.find(p => p.id === victimId);
  if (victim) {
    victim.deaths += 1;
    saveActiveCampaign(campaign);
  }
}

/**
 * Record the end of a campaign game.
 * Updates wins, games played, and advances to next game.
 */
export function recordCampaignGameEnd(winnerId: string): void {
  const campaign = loadActiveCampaign();
  if (!campaign) return;

  // Increment games played for all participants
  for (const participant of campaign.participants) {
    participant.gamesPlayed += 1;
  }

  // Record win for the winner
  const winner = campaign.participants.find(p => p.id === winnerId);
  if (winner) {
    winner.wins += 1;
  }

  saveActiveCampaign(campaign);
}

/**
 * Advance to the next game in the campaign.
 * Returns false if campaign is complete.
 */
export function advanceCampaignGame(): boolean {
  const campaign = loadActiveCampaign();
  if (!campaign) return false;

  if (campaign.currentGame >= campaign.length) {
    return false; // Campaign complete
  }

  campaign.currentGame += 1;
  saveActiveCampaign(campaign);
  return true;
}

/**
 * Check if the campaign is complete (all games played).
 */
export function isCampaignComplete(): boolean {
  const campaign = loadActiveCampaign();
  if (!campaign) return false;
  return campaign.currentGame > campaign.length;
}

/**
 * Purchase a weapon for a campaign participant.
 * Returns true if purchase was successful.
 */
export function purchaseCampaignWeapon(
  participantId: string,
  weaponType: WeaponType,
  cost: number
): boolean {
  const campaign = loadActiveCampaign();
  if (!campaign) return false;

  const participant = campaign.participants.find(p => p.id === participantId);
  if (!participant) return false;

  if (participant.balance < cost) return false;

  participant.balance -= cost;
  const currentCount = participant.weaponInventory[weaponType] ?? 0;
  participant.weaponInventory[weaponType] = currentCount + 1;

  saveActiveCampaign(campaign);
  return true;
}

/**
 * Use a weapon from a campaign participant's inventory.
 * Returns true if weapon was available and consumed.
 */
export function consumeCampaignWeapon(
  participantId: string,
  weaponType: WeaponType
): boolean {
  if (weaponType === 'standard') return true; // Standard is infinite

  const campaign = loadActiveCampaign();
  if (!campaign) return false;

  const participant = campaign.participants.find(p => p.id === participantId);
  if (!participant) return false;

  const currentCount = participant.weaponInventory[weaponType] ?? 0;
  if (currentCount <= 0) return false;

  participant.weaponInventory[weaponType] = currentCount - 1;
  saveActiveCampaign(campaign);
  return true;
}
