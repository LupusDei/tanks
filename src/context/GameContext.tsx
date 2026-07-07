import { createContext, ReactNode, useState, useCallback } from 'react';
import { GameState, GameActions, GamePhase, TankState, TerrainData, TankColor, AIDifficulty, TerrainSize, EnemyCount, WeaponType, PowerUp, PowerUpType } from '../types/game';
import { POWERUP_SHIELD_HP, POWERUP_FUEL_AMOUNT, POWERUP_BOUNCY_SHOTS } from '../engine';

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
  wind: 0,
  easyMode: false,
  powerUps: [],
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

  const damageTank = useCallback((tankId: string, damage: number, weaponType?: WeaponType, isDirectHit?: boolean) => {
    setState((prev) => {
      const updatedTanks = prev.tanks.map((tank) => {
        if (tank.id !== tankId) return tank;

        let remainingDamage = damage;
        let newShieldHp = tank.shieldHp;
        let newHealth = tank.health;

        // EMP completely destroys shields (in addition to its normal damage and stun)
        if (weaponType === 'emp') {
          newShieldHp = 0;
        }

        // Shield only absorbs splash/explosion damage, not direct hits
        // Shield also doesn't apply to EMP (EMP destroys shield and damages through it)
        const shieldApplies = !isDirectHit && weaponType !== 'emp' && newShieldHp > 0;

        if (shieldApplies) {
          // Shield absorbs damage first
          const shieldAbsorption = Math.min(newShieldHp, remainingDamage);
          newShieldHp -= shieldAbsorption;
          remainingDamage -= shieldAbsorption;
        }

        // Apply remaining damage to health
        newHealth = Math.max(0, tank.health - remainingDamage);

        const wasAlive = tank.health > 0;
        const nowDead = newHealth <= 0;

        return {
          ...tank,
          health: newHealth,
          shieldHp: newShieldHp,
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

  const stunTank = useCallback((tankId: string, turns: number) => {
    setState((prev) => ({
      ...prev,
      tanks: prev.tanks.map((tank) =>
        tank.id === tankId
          ? { ...tank, stunTurnsRemaining: Math.max(tank.stunTurnsRemaining, turns) }
          : tank
      ),
    }));
  }, []);

  const decrementStuns = useCallback(() => {
    setState((prev) => ({
      ...prev,
      tanks: prev.tanks.map((tank) => ({
        ...tank,
        stunTurnsRemaining: Math.max(0, tank.stunTurnsRemaining - 1),
      })),
    }));
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

  // Reset game state but go to weapon shop (for campaign mode - keeps locked config)
  const resetToCampaignWeaponShop = useCallback(() => {
    setState((prev) => ({
      ...initialState,
      phase: 'weaponShop',
      // Preserve campaign-locked configuration
      terrainSize: prev.terrainSize,
      enemyCount: prev.enemyCount,
      playerColor: prev.playerColor,
      aiDifficulty: prev.aiDifficulty,
    }));
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

  const setWind = useCallback((wind: number) => {
    setState((prev) => ({ ...prev, wind }));
  }, []);

  const setEasyMode = useCallback((easyMode: boolean) => {
    setState((prev) => ({ ...prev, easyMode }));
  }, []);

  const startTankFall = useCallback((tankId: string, startY: number, targetY: number, startTime: number) => {
    setState((prev) => ({
      ...prev,
      tanks: prev.tanks.map((tank) =>
        tank.id === tankId
          ? { ...tank, isFalling: true, fallStartY: startY, fallTargetY: targetY, fallStartTime: startTime }
          : tank
      ),
    }));
  }, []);

  const setPowerUps = useCallback((powerUps: PowerUp[]) => {
    setState((prev) => ({ ...prev, powerUps }));
  }, []);

  // Collect a crate: remove it and apply its effect to the collecting tank (atomic).
  const collectPowerUp = useCallback((powerUpId: string, tankId: string, type: PowerUpType) => {
    setState((prev) => ({
      ...prev,
      powerUps: prev.powerUps.filter((p) => p.id !== powerUpId),
      tanks: prev.tanks.map((tank) => {
        if (tank.id !== tankId) return tank;
        switch (type) {
          case 'shield': {
            const shieldHp = tank.shieldHp + POWERUP_SHIELD_HP;
            return { ...tank, shieldHp, maxShieldHp: Math.max(tank.maxShieldHp, shieldHp) };
          }
          case 'fuel':
            return { ...tank, fuel: Math.min(tank.maxFuel, tank.fuel + POWERUP_FUEL_AMOUNT) };
          case 'bouncy':
            return {
              ...tank,
              bouncyShotsRemaining: (tank.bouncyShotsRemaining ?? 0) + POWERUP_BOUNCY_SHOTS,
            };
          default:
            return tank;
        }
      }),
    }));
  }, []);

  const consumeBouncyShot = useCallback((tankId: string) => {
    setState((prev) => ({
      ...prev,
      tanks: prev.tanks.map((tank) =>
        tank.id === tankId && (tank.bouncyShotsRemaining ?? 0) > 0
          ? { ...tank, bouncyShotsRemaining: (tank.bouncyShotsRemaining ?? 0) - 1 }
          : tank
      ),
    }));
  }, []);

  const completeTankFall = useCallback((tankId: string, finalY: number) => {
    setState((prev) => ({
      ...prev,
      tanks: prev.tanks.map((tank) =>
        tank.id === tankId
          ? {
              ...tank,
              isFalling: false,
              fallStartY: null,
              fallTargetY: null,
              fallStartTime: null,
              position: { ...tank.position, y: finalY },
            }
          : tank
      ),
    }));
  }, []);

  // Start tank movement animation
  const startTankMove = useCallback((tankId: string, targetX: number, fuelCost: number) => {
    setState((prev) => ({
      ...prev,
      tanks: prev.tanks.map((tank) =>
        tank.id === tankId
          ? {
              ...tank,
              isMoving: true,
              moveTargetX: targetX,
              moveStartTime: performance.now(),
              moveStartX: tank.position.x,
              fuel: Math.max(0, tank.fuel - fuelCost),
            }
          : tank
      ),
    }));
  }, []);

  // Complete tank movement and update final position
  const completeTankMove = useCallback((tankId: string, finalX: number, finalY: number) => {
    setState((prev) => ({
      ...prev,
      tanks: prev.tanks.map((tank) =>
        tank.id === tankId
          ? {
              ...tank,
              isMoving: false,
              moveTargetX: null,
              moveStartTime: null,
              moveStartX: null,
              position: { x: finalX, y: finalY },
            }
          : tank
      ),
    }));
  }, []);

  const actions: GameActions = {
    setPhase,
    initializeTanks,
    nextTurn,
    incrementTurn,
    updateTank,
    setTerrain,
    damageTank,
    stunTank,
    decrementStuns,
    setWinner,
    resetGame,
    resetToConfig,
    resetToCampaignWeaponShop,
    setPlayerColor,
    setAIDifficulty,
    setTerrainSize,
    setEnemyCount,
    setSelectedWeapon,
    setWeaponAmmo,
    decrementAmmo,
    setWind,
    setEasyMode,
    setPowerUps,
    collectPowerUp,
    consumeBouncyShot,
    startTankFall,
    completeTankFall,
    startTankMove,
    completeTankMove,
  };

  return (
    <GameContext.Provider value={{ state, actions }}>
      {children}
    </GameContext.Provider>
  );
}

// Note: useGame hook moved to useGame.ts for fast refresh compatibility
