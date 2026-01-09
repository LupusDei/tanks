import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';

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
    };

    const tank2 = {
      id: 'tank2',
      position: { x: 300, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#0000ff',
      isActive: true,
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
    };

    const tank2 = {
      id: 'tank2',
      position: { x: 300, y: 200 },
      health: 100,
      angle: 45,
      power: 50,
      color: '#0000ff',
      isActive: true,
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
});
