import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { UserProvider, useUser } from './UserContext';

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

describe('UserContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('provides null userData for new users', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    expect(result.current.userData).toBeNull();
    expect(result.current.isNewUser).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.username).toBeNull();
  });

  it('throws error when useUser is used outside UserProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useUser());
    }).toThrow('useUser must be used within a UserProvider');

    consoleSpy.mockRestore();
  });

  it('creates a new user with starting balance', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('TestPlayer');
    });

    expect(result.current.userData).not.toBeNull();
    expect(result.current.username).toBe('TestPlayer');
    expect(result.current.isNewUser).toBe(false);
    expect(result.current.stats).toEqual({
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalKills: 0,
      winRate: 0,
      balance: 500, // STARTING_MONEY
    });
  });

  it('changes username', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('OldName');
    });

    act(() => {
      result.current.changeUsername('NewName');
    });

    expect(result.current.username).toBe('NewName');
  });

  it('records game stats', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('Player');
    });

    act(() => {
      result.current.recordGame({
        isVictory: true,
        enemyCount: 2,
        enemiesKilled: 2,
        terrainSize: 'medium',
        aiDifficulty: 'veteran',
        turnsPlayed: 15,
        playerColor: 'red',
      });
    });

    expect(result.current.stats?.gamesPlayed).toBe(1);
    expect(result.current.stats?.gamesWon).toBe(1);
    expect(result.current.stats?.totalKills).toBe(2);
    expect(result.current.stats?.winRate).toBe(100);
  });

  it('resets user data', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('Player');
    });

    expect(result.current.userData).not.toBeNull();

    act(() => {
      result.current.resetUserData();
    });

    expect(result.current.userData).toBeNull();
    expect(result.current.isNewUser).toBe(true);
  });

  it('loads existing user data on mount', () => {
    // Pre-populate localStorage with existing user using new multi-player format
    const existingUser = {
      profile: { id: 'existing-id', username: 'ExistingPlayer', createdAt: 1000 },
      stats: { gamesPlayed: 10, gamesWon: 7, gamesLost: 3, totalKills: 25, winRate: 70, balance: 500 },
      recentGames: [],
      weaponInventory: { standard: Infinity },
    };
    // Store in the new multi-player database format
    const playersDb = { 'ExistingPlayer': existingUser };
    localStorageMock.setItem('tanks_players_db', JSON.stringify(playersDb));
    localStorageMock.setItem('tanks_current_player', 'ExistingPlayer');

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    expect(result.current.username).toBe('ExistingPlayer');
    expect(result.current.stats?.gamesPlayed).toBe(10);
    expect(result.current.isNewUser).toBe(false);
  });

  // ============================================================================
  // WEAPON INVENTORY CONTEXT TESTS
  // ============================================================================

  it('provides weapon inventory for new users', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('TestPlayer');
    });

    expect(result.current.weaponInventory).toBeDefined();
    expect(result.current.weaponInventory.standard).toBe(Infinity);
  });

  it('purchaseWeapon deducts money and adds to inventory', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('TestPlayer');
    });

    const initialBalance = result.current.balance;

    act(() => {
      const success = result.current.purchaseWeapon('heavy_artillery', 2);
      expect(success).toBe(true);
    });

    // Heavy artillery costs 200 each, so 2 costs 400
    expect(result.current.balance).toBe(initialBalance - 400);
    expect(result.current.getWeaponCount('heavy_artillery')).toBe(2);
  });

  it('purchaseWeapon fails with insufficient funds', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('TestPlayer');
    });

    // Try to buy more than we can afford (starting money is 500, napalm costs 350)
    act(() => {
      const success = result.current.purchaseWeapon('napalm', 2); // 700 total
      expect(success).toBe(false);
    });

    // Balance should be unchanged
    expect(result.current.balance).toBe(500);
    expect(result.current.getWeaponCount('napalm')).toBe(0);
  });

  it('consumeWeapon decrements inventory count', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('TestPlayer');
    });

    // First purchase some weapons
    act(() => {
      result.current.purchaseWeapon('precision', 3);
    });

    expect(result.current.getWeaponCount('precision')).toBe(3);

    // Consume one
    act(() => {
      const success = result.current.consumeWeapon('precision');
      expect(success).toBe(true);
    });

    expect(result.current.getWeaponCount('precision')).toBe(2);
  });

  it('consumeWeapon always succeeds for standard weapon', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('TestPlayer');
    });

    // Standard should always succeed
    act(() => {
      const success = result.current.consumeWeapon('standard');
      expect(success).toBe(true);
    });

    // Standard should still be infinite
    expect(result.current.getWeaponCount('standard')).toBe(Infinity);
  });

  it('consumeWeapon fails when weapon count is zero', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('TestPlayer');
    });

    // Try to consume a weapon we don't have
    act(() => {
      const success = result.current.consumeWeapon('cluster_bomb');
      expect(success).toBe(false);
    });
  });

  it('getWeaponCount returns correct count', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    act(() => {
      result.current.createNewUser('TestPlayer');
    });

    expect(result.current.getWeaponCount('standard')).toBe(Infinity);
    expect(result.current.getWeaponCount('heavy_artillery')).toBe(0);

    // Heavy artillery costs 200 each, and starting money is 500, so we can buy 2
    act(() => {
      const success = result.current.purchaseWeapon('heavy_artillery', 2);
      expect(success).toBe(true);
    });

    expect(result.current.getWeaponCount('heavy_artillery')).toBe(2);
  });
});
