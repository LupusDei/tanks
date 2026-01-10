import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadUserData,
  saveUserData,
  createUser,
  updateUsername,
  recordGameEnd,
  clearUserData,
  hasExistingUser,
  getUserBalance,
  spendMoney,
  addMoney,
} from './userDatabase';
import type { UserData } from '../types/game';
import { STARTING_MONEY, calculateGameEarnings } from '../engine/weapons';

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
        stats: { gamesPlayed: 5, gamesWon: 3, gamesLost: 2, totalKills: 10, winRate: 60, balance: 1000 },
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
        stats: { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, totalKills: 0, winRate: 0, balance: STARTING_MONEY },
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
    it('creates a new user with default stats and starting money', () => {
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
        balance: STARTING_MONEY,
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

    it('records a victory correctly and updates balance', () => {
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

      const expectedEarnings = calculateGameEarnings(true, 2, 'centurion');

      expect(result?.stats.gamesPlayed).toBe(1);
      expect(result?.stats.gamesWon).toBe(1);
      expect(result?.stats.gamesLost).toBe(0);
      expect(result?.stats.totalKills).toBe(2);
      expect(result?.stats.winRate).toBe(100);
      expect(result?.stats.balance).toBe(STARTING_MONEY + expectedEarnings);
      expect(result?.recentGames).toHaveLength(1);
      expect(result?.recentGames[0]?.result).toBe('victory');
      expect(result?.recentGames[0]?.moneyEarned).toBe(expectedEarnings);
    });

    it('records a defeat correctly and updates balance', () => {
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

      const expectedEarnings = calculateGameEarnings(false, 1, 'private');

      expect(result?.stats.gamesPlayed).toBe(1);
      expect(result?.stats.gamesWon).toBe(0);
      expect(result?.stats.gamesLost).toBe(1);
      expect(result?.stats.totalKills).toBe(1);
      expect(result?.stats.winRate).toBe(0);
      expect(result?.stats.balance).toBe(STARTING_MONEY + expectedEarnings);
      expect(result?.recentGames[0]?.result).toBe('defeat');
      expect(result?.recentGames[0]?.moneyEarned).toBe(expectedEarnings);
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

  describe('getUserBalance', () => {
    it('returns 0 when no user exists', () => {
      expect(getUserBalance()).toBe(0);
    });

    it('returns starting money for new user', () => {
      createUser('Player');
      expect(getUserBalance()).toBe(STARTING_MONEY);
    });

    it('returns updated balance after games', () => {
      createUser('Player');
      recordGameEnd({
        isVictory: true,
        enemyCount: 2,
        enemiesKilled: 2,
        terrainSize: 'medium',
        aiDifficulty: 'veteran',
        turnsPlayed: 10,
        playerColor: 'red',
      });

      const expectedEarnings = calculateGameEarnings(true, 2, 'veteran');
      expect(getUserBalance()).toBe(STARTING_MONEY + expectedEarnings);
    });

    it('migrates balance for existing user without balance field', () => {
      // Simulate old user data without balance
      const oldUserData = {
        profile: { id: 'test-id', username: 'OldUser', createdAt: 1000 },
        stats: { gamesPlayed: 5, gamesWon: 3, gamesLost: 2, totalKills: 10, winRate: 60 },
        recentGames: [],
      };
      localStorageMock.setItem('tanks_user_data', JSON.stringify(oldUserData));

      // getUserBalance should migrate and return starting money
      expect(getUserBalance()).toBe(STARTING_MONEY);

      // Verify migration was persisted
      const updated = loadUserData();
      expect(updated?.stats.balance).toBe(STARTING_MONEY);
    });
  });

  describe('spendMoney', () => {
    it('returns null when no user exists', () => {
      expect(spendMoney(100)).toBeNull();
    });

    it('returns null when insufficient funds', () => {
      createUser('Player');
      expect(spendMoney(STARTING_MONEY + 1)).toBeNull();
    });

    it('deducts money and returns new balance', () => {
      createUser('Player');
      const newBalance = spendMoney(100);

      expect(newBalance).toBe(STARTING_MONEY - 100);
      expect(getUserBalance()).toBe(STARTING_MONEY - 100);
    });

    it('allows spending exact balance', () => {
      createUser('Player');
      const newBalance = spendMoney(STARTING_MONEY);

      expect(newBalance).toBe(0);
      expect(getUserBalance()).toBe(0);
    });
  });

  describe('addMoney', () => {
    it('returns null when no user exists', () => {
      expect(addMoney(100)).toBeNull();
    });

    it('adds money and returns new balance', () => {
      createUser('Player');
      const newBalance = addMoney(250);

      expect(newBalance).toBe(STARTING_MONEY + 250);
      expect(getUserBalance()).toBe(STARTING_MONEY + 250);
    });
  });
});
