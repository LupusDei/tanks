import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameProvider } from './GameContext';
import { useGame } from './useGame';

describe('GameContext', () => {
  it('provides initial game state', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    expect(result.current.state.phase).toBe('loading');
    expect(result.current.state.currentTurn).toBe(0);
    expect(result.current.state.tanks).toEqual([]);
    expect(result.current.state.terrain).toBeNull();
    expect(result.current.state.winner).toBeNull();
  });

  it('throws error when useGame is used outside GameProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useGame());
    }).toThrow('useGame must be used within a GameProvider');

    consoleSpy.mockRestore();
  });

  it('updates game phase', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    act(() => {
      result.current.actions.setPhase('playing');
    });

    expect(result.current.state.phase).toBe('playing');
  });

  it('updates tank state', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    const mockTank = {
      id: 'tank1',
      position: { x: 100, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#ff0000',
      isActive: true,
      queuedShot: null,
      isReady: false,
      killedByWeapon: null,
    };

    // Initially there are no tanks
    expect(result.current.state.tanks).toEqual([]);

    // Note: This test demonstrates the API, but in reality tanks would be
    // added through game initialization, not via updateTank
    act(() => {
      result.current.actions.updateTank(mockTank.id, { angle: 60 });
    });

    // Since tank doesn't exist, nothing changes
    expect(result.current.state.tanks).toEqual([]);
  });

  it('damages tank and checks for game over', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    const tank1 = {
      id: 'tank1',
      position: { x: 100, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#ff0000',
      isActive: true,
      queuedShot: null,
      isReady: false,
      killedByWeapon: null,
    };

    const tank2 = {
      id: 'tank2',
      position: { x: 300, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#0000ff',
      isActive: true,
      queuedShot: null,
      isReady: false,
      killedByWeapon: null,
    };

    act(() => {
      result.current.actions.initializeTanks([tank1, tank2]);
    });

    act(() => {
      result.current.actions.damageTank('tank1', 100);
    });

    expect(result.current.state.phase).toBe('gameover');
    expect(result.current.state.winner).toBe('tank2');
  });

  it('tracks killedByWeapon when tank is destroyed', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    const tank1 = {
      id: 'tank1',
      position: { x: 100, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#ff0000',
      isActive: true,
      queuedShot: null,
      isReady: false,
      killedByWeapon: null,
    };

    const tank2 = {
      id: 'tank2',
      position: { x: 300, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#0000ff',
      isActive: true,
      queuedShot: null,
      isReady: false,
      killedByWeapon: null,
    };

    act(() => {
      result.current.actions.initializeTanks([tank1, tank2]);
    });

    // Damage with napalm weapon (should track killing weapon)
    act(() => {
      result.current.actions.damageTank('tank1', 100, 'napalm');
    });

    const killedTank = result.current.state.tanks.find((t) => t.id === 'tank1');
    expect(killedTank?.killedByWeapon).toBe('napalm');
  });

  it('does not set killedByWeapon for non-lethal damage', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    const tank1 = {
      id: 'tank1',
      position: { x: 100, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#ff0000',
      isActive: true,
      queuedShot: null,
      isReady: false,
      killedByWeapon: null,
    };

    const tank2 = {
      id: 'tank2',
      position: { x: 300, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#0000ff',
      isActive: true,
      queuedShot: null,
      isReady: false,
      killedByWeapon: null,
    };

    act(() => {
      result.current.actions.initializeTanks([tank1, tank2]);
    });

    // Non-lethal damage with heavy artillery
    act(() => {
      result.current.actions.damageTank('tank1', 50, 'heavy_artillery');
    });

    const damagedTank = result.current.state.tanks.find((t) => t.id === 'tank1');
    expect(damagedTank?.health).toBe(50);
    expect(damagedTank?.killedByWeapon).toBeNull();
  });

  it('advances to next turn', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    const tank1 = {
      id: 'tank1',
      position: { x: 100, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#ff0000',
      isActive: true,
      queuedShot: null,
      isReady: false,
      killedByWeapon: null,
    };

    const tank2 = {
      id: 'tank2',
      position: { x: 300, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#0000ff',
      isActive: true,
      queuedShot: null,
      isReady: false,
      killedByWeapon: null,
    };

    act(() => {
      result.current.actions.initializeTanks([tank1, tank2]);
    });

    expect(result.current.state.currentPlayerId).toBe('tank1');

    act(() => {
      result.current.actions.nextTurn();
    });

    expect(result.current.state.currentTurn).toBe(1);
    expect(result.current.state.currentPlayerId).toBe('tank2');
  });

  it('sets terrain data', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    const mockTerrain = {
      points: [100, 150, 200, 175, 300],
      width: 800,
      height: 600,
    };

    act(() => {
      result.current.actions.setTerrain(mockTerrain);
    });

    expect(result.current.state.terrain).toEqual(mockTerrain);
  });

  it('resets game state', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    act(() => {
      result.current.actions.setPhase('playing');
      result.current.actions.setTerrain({
        points: [100, 150, 200],
        width: 800,
        height: 600,
      });
    });

    act(() => {
      result.current.actions.resetGame();
    });

    expect(result.current.state.phase).toBe('loading');
    expect(result.current.state.currentTurn).toBe(0);
    expect(result.current.state.tanks).toEqual([]);
    expect(result.current.state.terrain).toBeNull();
  });

  it('resets game state to config phase (for Play Again)', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    act(() => {
      result.current.actions.setPhase('gameover');
      result.current.actions.setTerrain({
        points: [100, 150, 200],
        width: 800,
        height: 600,
      });
    });

    act(() => {
      result.current.actions.resetToConfig();
    });

    // Should go directly to config phase instead of loading
    expect(result.current.state.phase).toBe('config');
    // Other state should still be reset
    expect(result.current.state.currentTurn).toBe(0);
    expect(result.current.state.tanks).toEqual([]);
    expect(result.current.state.terrain).toBeNull();
  });

  it('has default terrain size of medium', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    expect(result.current.state.terrainSize).toBe('medium');
  });

  it('sets terrain size', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    act(() => {
      result.current.actions.setTerrainSize('large');
    });

    expect(result.current.state.terrainSize).toBe('large');
  });

  it('sets terrain size to all valid sizes', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    act(() => {
      result.current.actions.setTerrainSize('small');
    });
    expect(result.current.state.terrainSize).toBe('small');

    act(() => {
      result.current.actions.setTerrainSize('medium');
    });
    expect(result.current.state.terrainSize).toBe('medium');

    act(() => {
      result.current.actions.setTerrainSize('large');
    });
    expect(result.current.state.terrainSize).toBe('large');

    act(() => {
      result.current.actions.setTerrainSize('huge');
    });
    expect(result.current.state.terrainSize).toBe('huge');
  });

  describe('weapon ammo management', () => {
    it('sets weapon ammo', () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: GameProvider,
      });

      act(() => {
        result.current.actions.setWeaponAmmo({
          standard: Infinity,
          heavy_artillery: 3,
          precision: 2,
        });
      });

      expect(result.current.state.weaponAmmo).toEqual({
        standard: Infinity,
        heavy_artillery: 3,
        precision: 2,
      });
    });

    it('decrements ammo for non-standard weapon', () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: GameProvider,
      });

      act(() => {
        result.current.actions.setWeaponAmmo({
          standard: Infinity,
          heavy_artillery: 3,
        });
      });

      act(() => {
        result.current.actions.decrementAmmo('heavy_artillery');
      });

      expect(result.current.state.weaponAmmo.heavy_artillery).toBe(2);
    });

    it('does not decrement standard weapon (infinite ammo)', () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: GameProvider,
      });

      act(() => {
        result.current.actions.setWeaponAmmo({
          standard: Infinity,
        });
      });

      act(() => {
        result.current.actions.decrementAmmo('standard');
      });

      expect(result.current.state.weaponAmmo.standard).toBe(Infinity);
    });

    it('does not decrement when ammo is already zero', () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: GameProvider,
      });

      act(() => {
        result.current.actions.setWeaponAmmo({
          standard: Infinity,
          heavy_artillery: 0,
        });
      });

      act(() => {
        result.current.actions.decrementAmmo('heavy_artillery');
      });

      expect(result.current.state.weaponAmmo.heavy_artillery).toBe(0);
    });

    it('does not decrement when ammo is undefined', () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: GameProvider,
      });

      act(() => {
        result.current.actions.setWeaponAmmo({
          standard: Infinity,
        });
      });

      act(() => {
        result.current.actions.decrementAmmo('heavy_artillery');
      });

      expect(result.current.state.weaponAmmo.heavy_artillery).toBeUndefined();
    });

    it('decrements ammo to zero', () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: GameProvider,
      });

      act(() => {
        result.current.actions.setWeaponAmmo({
          standard: Infinity,
          precision: 1,
        });
      });

      act(() => {
        result.current.actions.decrementAmmo('precision');
      });

      expect(result.current.state.weaponAmmo.precision).toBe(0);
    });
  });
});
