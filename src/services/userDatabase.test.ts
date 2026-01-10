import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadUserData,
  saveUserData,
  createUser,
  updateUsername,
  recordGameEnd,
  clearUserData,
  hasExistingUser,
} from './userDatabase';
import type { UserData } from '../types/game';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('userDatabase', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('loadUserData', () => {
    it('returns null when no user data exists', () => {
      expect(loadUserData()).toBeNull();
    });

    it('returns parsed user data when it exists', () => {
      const mockData: UserData = {
        profile: { id: 'test-id', username: 'TestUser', createdAt: 1000 },
        stats: { gamesPlayed: 5, gamesWon: 3, gamesLost: 2, totalKills: 10, winRate: 60 },
        recentGames: [],
      };
      localStorageMock.setItem('tanks_user_data', JSON.stringify(mockData));

      const result = loadUserData();
      expect(result).toEqual(mockData);
    });

    it('returns null when localStorage contains invalid JSON', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json');
      expect(loadUserData()).toBeNull();
    });
  });

  describe('saveUserData', () => {
    it('saves user data to localStorage', () => {
      const mockData: UserData = {
        profile: { id: 'test-id', username: 'TestUser', createdAt: 1000 },
        stats: { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, totalKills: 0, winRate: 0 },
        recentGames: [],
      };

      saveUserData(mockData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tanks_user_data',
        JSON.stringify(mockData)
      );
    });
  });

  describe('createUser', () => {
    it('creates a new user with default stats', () => {
      const result = createUser('NewPlayer');

      expect(result.profile.username).toBe('NewPlayer');
      expect(result.profile.id).toBeDefined();
      expect(result.profile.createdAt).toBeGreaterThan(0);
      expect(result.stats).toEqual({
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalKills: 0,
        winRate: 0,
      });
      expect(result.recentGames).toEqual([]);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('updateUsername', () => {
    it('returns null when no user exists', () => {
      expect(updateUsername('NewName')).toBeNull();
    });

    it('updates username for existing user', () => {
      createUser('OldName');
      const result = updateUsername('NewName');

      expect(result?.profile.username).toBe('NewName');
    });
  });

  describe('recordGameEnd', () => {
    it('returns null when no user exists', () => {
      const result = recordGameEnd({
        isVictory: true,
        enemyCount: 1,
        enemiesKilled: 1,
        terrainSize: 'medium',
        aiDifficulty: 'veteran',
        turnsPlayed: 10,
        playerColor: 'red',
      });

      expect(result).toBeNull();
    });

    it('records a victory correctly', () => {
      createUser('Player');
      const result = recordGameEnd({
        isVictory: true,
        enemyCount: 2,
        enemiesKilled: 2,
        terrainSize: 'large',
        aiDifficulty: 'centurion',
        turnsPlayed: 15,
        playerColor: 'blue',
      });

      expect(result?.stats.gamesPlayed).toBe(1);
      expect(result?.stats.gamesWon).toBe(1);
      expect(result?.stats.gamesLost).toBe(0);
      expect(result?.stats.totalKills).toBe(2);
      expect(result?.stats.winRate).toBe(100);
      expect(result?.recentGames).toHaveLength(1);
      expect(result?.recentGames[0]?.result).toBe('victory');
    });

    it('records a defeat correctly', () => {
      createUser('Player');
      const result = recordGameEnd({
        isVictory: false,
        enemyCount: 3,
        enemiesKilled: 1,
        terrainSize: 'small',
        aiDifficulty: 'private',
        turnsPlayed: 8,
        playerColor: 'green',
      });

      expect(result?.stats.gamesPlayed).toBe(1);
      expect(result?.stats.gamesWon).toBe(0);
      expect(result?.stats.gamesLost).toBe(1);
      expect(result?.stats.totalKills).toBe(1);
      expect(result?.stats.winRate).toBe(0);
      expect(result?.recentGames[0]?.result).toBe('defeat');
    });

    it('calculates win rate correctly after multiple games', () => {
      createUser('Player');

      recordGameEnd({
        isVictory: true,
        enemyCount: 1,
        enemiesKilled: 1,
        terrainSize: 'medium',
        aiDifficulty: 'veteran',
        turnsPlayed: 10,
        playerColor: 'red',
      });

      recordGameEnd({
        isVictory: true,
        enemyCount: 1,
        enemiesKilled: 1,
        terrainSize: 'medium',
        aiDifficulty: 'veteran',
        turnsPlayed: 10,
        playerColor: 'red',
      });

      const result = recordGameEnd({
        isVictory: false,
        enemyCount: 1,
        enemiesKilled: 0,
        terrainSize: 'medium',
        aiDifficulty: 'veteran',
        turnsPlayed: 10,
        playerColor: 'red',
      });

      expect(result?.stats.gamesPlayed).toBe(3);
      expect(result?.stats.gamesWon).toBe(2);
      expect(result?.stats.gamesLost).toBe(1);
      expect(result?.stats.winRate).toBe(67); // 2/3 rounded
    });

    it('limits recent games to 50', () => {
      createUser('Player');

      for (let i = 0; i < 55; i++) {
        recordGameEnd({
          isVictory: true,
          enemyCount: 1,
          enemiesKilled: 1,
          terrainSize: 'medium',
          aiDifficulty: 'veteran',
          turnsPlayed: 10,
          playerColor: 'red',
        });
      }

      const result = loadUserData();
      expect(result?.recentGames).toHaveLength(50);
    });
  });

  describe('clearUserData', () => {
    it('removes user data from localStorage', () => {
      createUser('Player');
      clearUserData();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tanks_user_data');
    });
  });

  describe('hasExistingUser', () => {
    it('returns false when no user exists', () => {
      expect(hasExistingUser()).toBe(false);
    });

    it('returns true when user exists', () => {
      createUser('Player');
      expect(hasExistingUser()).toBe(true);
    });
  });
});
