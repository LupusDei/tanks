import { createContext, ReactNode, useState, useCallback } from 'react';
import { GameState, GameActions, GamePhase, TankState, TerrainData, TankColor, AIDifficulty, TerrainSize, EnemyCount, WeaponType } from '../types/game';

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
  enemyCount: 1,
  selectedWeapon: 'standard',
  weaponAmmo: { standard: Infinity },
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

  // Just increment turn counter without changing current player (for simultaneous mode)
  const incrementTurn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentTurn: prev.currentTurn + 1,
    }));
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

  const damageTank = useCallback((tankId: string, damage: number, weaponType?: WeaponType) => {
    setState((prev) => {
      const updatedTanks = prev.tanks.map((tank) => {
        if (tank.id !== tankId) return tank;

        const newHealth = Math.max(0, tank.health - damage);
        const wasAlive = tank.health > 0;
        const nowDead = newHealth <= 0;

        return {
          ...tank,
          health: newHealth,
          // Track the killing weapon if this damage killed the tank
          killedByWeapon: wasAlive && nowDead && weaponType ? weaponType : tank.killedByWeapon,
        };
      });

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

  // Reset game state but go directly to config screen (for Play Again)
  const resetToConfig = useCallback(() => {
    setState({
      ...initialState,
      phase: 'config',
    });
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

  const setEnemyCount = useCallback((count: EnemyCount) => {
    setState((prev) => ({ ...prev, enemyCount: count }));
  }, []);

  const setSelectedWeapon = useCallback((weapon: WeaponType) => {
    setState((prev) => ({ ...prev, selectedWeapon: weapon }));
  }, []);

  const setWeaponAmmo = useCallback((ammo: Partial<Record<WeaponType, number>>) => {
    setState((prev) => ({ ...prev, weaponAmmo: ammo }));
  }, []);

  const decrementAmmo = useCallback((weapon: WeaponType) => {
    setState((prev) => {
      const currentAmmo = prev.weaponAmmo[weapon];
      // Standard weapon is infinite, don't decrement
      if (weapon === 'standard' || currentAmmo === Infinity) {
        return prev;
      }
      if (currentAmmo === undefined || currentAmmo <= 0) {
        return prev;
      }
      return {
        ...prev,
        weaponAmmo: {
          ...prev.weaponAmmo,
          [weapon]: currentAmmo - 1,
        },
      };
    });
  }, []);

  const actions: GameActions = {
    setPhase,
    initializeTanks,
    nextTurn,
    incrementTurn,
    updateTank,
    setTerrain,
    damageTank,
    setWinner,
    resetGame,
    resetToConfig,
    setPlayerColor,
    setAIDifficulty,
    setTerrainSize,
    setEnemyCount,
    setSelectedWeapon,
    setWeaponAmmo,
    decrementAmmo,
  };

  return (
    <GameContext.Provider value={{ state, actions }}>
      {children}
    </GameContext.Provider>
  );
}

// Note: useGame hook moved to useGame.ts for fast refresh compatibility
