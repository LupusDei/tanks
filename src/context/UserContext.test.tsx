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

  it('creates a new user', () => {
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
    // Pre-populate localStorage with existing user
    const existingUser = {
      profile: { id: 'existing-id', username: 'ExistingPlayer', createdAt: 1000 },
      stats: { gamesPlayed: 10, gamesWon: 7, gamesLost: 3, totalKills: 25, winRate: 70 },
      recentGames: [],
    };
    localStorageMock.setItem('tanks_user_data', JSON.stringify(existingUser));

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    expect(result.current.username).toBe('ExistingPlayer');
    expect(result.current.stats?.gamesPlayed).toBe(10);
    expect(result.current.isNewUser).toBe(false);
  });
});
