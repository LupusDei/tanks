import type {
  UserData,
  UserStats,
  GameRecord,
  EnemyCount,
  TerrainSize,
  AIDifficulty,
  TankColor,
} from '../types/game';

const STORAGE_KEY = 'tanks_user_data';
const MAX_RECENT_GAMES = 50;

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
  };
}

function calculateWinRate(won: number, played: number): number {
  if (played === 0) return 0;
  return Math.round((won / played) * 100);
}

export function loadUserData(): UserData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserData;
  } catch {
    return null;
  }
}

export function saveUserData(userData: UserData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  } catch {
    console.error('Failed to save user data to localStorage');
  }
}

export function createUser(username: string): UserData {
  const userData = createDefaultUserData(username);
  saveUserData(userData);
  return userData;
}

export function updateUsername(newUsername: string): UserData | null {
  const userData = loadUserData();
  if (!userData) return null;

  userData.profile.username = newUsername;
  saveUserData(userData);
  return userData;
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

  // Add to recent games (keep last N games)
  userData.recentGames.unshift(gameRecord);
  if (userData.recentGames.length > MAX_RECENT_GAMES) {
    userData.recentGames = userData.recentGames.slice(0, MAX_RECENT_GAMES);
  }

  saveUserData(userData);
  return userData;
}

export function clearUserData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.error('Failed to clear user data from localStorage');
  }
}

export function hasExistingUser(): boolean {
  return loadUserData() !== null;
}
