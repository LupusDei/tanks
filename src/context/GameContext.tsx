import { createContext, ReactNode, useState, useCallback } from 'react';
import { GameState, GameActions, GamePhase, TankState, TerrainData, TankColor, AIDifficulty, TerrainSize } from '../types/game';

export interface GameContextValue {
  state: GameState;
  actions: GameActions;
}

export const GameContext = createContext<GameContextValue | null>(null);

const initialState: GameState = {
  phase: 'loading',
  currentTurn: 0,
  currentPlayerId: null,
  tanks: [],
  terrain: null,
  winner: null,
  playerColor: null,
  aiDifficulty: 'veteran',
  terrainSize: 'medium',
};

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, setState] = useState<GameState>(initialState);

  const setPhase = useCallback((phase: GamePhase) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  const initializeTanks = useCallback((tanks: TankState[]) => {
    setState((prev) => ({
      ...prev,
      tanks,
      currentPlayerId: tanks.length > 0 ? tanks[0]?.id ?? null : null,
    }));
  }, []);

  const nextTurn = useCallback(() => {
    setState((prev) => {
      const aliveTanks = prev.tanks.filter((tank) => tank.health > 0);
      if (aliveTanks.length === 0) return prev;

      const currentIndex = aliveTanks.findIndex((tank) => tank.id === prev.currentPlayerId);
      const nextIndex = (currentIndex + 1) % aliveTanks.length;
      const nextPlayerId = aliveTanks[nextIndex]?.id ?? null;

      return {
        ...prev,
        currentTurn: prev.currentTurn + 1,
        currentPlayerId: nextPlayerId,
      };
    });
  }, []);

  const updateTank = useCallback((tankId: string, updates: Partial<TankState>) => {
    setState((prev) => ({
      ...prev,
      tanks: prev.tanks.map((tank) =>
        tank.id === tankId ? { ...tank, ...updates } : tank
      ),
    }));
  }, []);

  const setTerrain = useCallback((terrain: TerrainData) => {
    setState((prev) => ({ ...prev, terrain }));
  }, []);

  const damageTank = useCallback((tankId: string, damage: number) => {
    setState((prev) => {
      const updatedTanks = prev.tanks.map((tank) =>
        tank.id === tankId
          ? { ...tank, health: Math.max(0, tank.health - damage) }
          : tank
      );

      const aliveTanks = updatedTanks.filter((tank) => tank.health > 0);

      if (aliveTanks.length === 1) {
        return {
          ...prev,
          tanks: updatedTanks,
          phase: 'gameover',
          winner: aliveTanks[0]?.id ?? null,
        };
      }

      return {
        ...prev,
        tanks: updatedTanks,
      };
    });
  }, []);

  const setWinner = useCallback((tankId: string) => {
    setState((prev) => ({
      ...prev,
      phase: 'gameover',
      winner: tankId,
    }));
  }, []);

  const resetGame = useCallback(() => {
    setState(initialState);
  }, []);

  const setPlayerColor = useCallback((color: TankColor) => {
    setState((prev) => ({ ...prev, playerColor: color }));
  }, []);

  const setAIDifficulty = useCallback((difficulty: AIDifficulty) => {
    setState((prev) => ({ ...prev, aiDifficulty: difficulty }));
  }, []);

  const setTerrainSize = useCallback((size: TerrainSize) => {
    setState((prev) => ({ ...prev, terrainSize: size }));
  }, []);

  const actions: GameActions = {
    setPhase,
    initializeTanks,
    nextTurn,
    updateTank,
    setTerrain,
    damageTank,
    setWinner,
    resetGame,
    setPlayerColor,
    setAIDifficulty,
    setTerrainSize,
  };

  return (
    <GameContext.Provider value={{ state, actions }}>
      {children}
    </GameContext.Provider>
  );
}

// Note: useGame hook moved to useGame.ts for fast refresh compatibility
