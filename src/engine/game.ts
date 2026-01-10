import type { TankColor, TankState, TerrainData, EnemyCount } from '../types/game';
import { generateTerrain } from './terrain';
import { createInitialTanks } from './tank';

export interface GameInitConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerColor: TankColor;
  enemyCount: EnemyCount;
  terrainSeed?: number;
}

export interface GameInitResult {
  terrain: TerrainData;
  tanks: TankState[];
}

/**
 * Initialize the game with terrain and tanks.
 * This is the main entry point for starting a new game after color selection.
 */
export function initializeGame(config: GameInitConfig): GameInitResult {
  const { canvasWidth, canvasHeight, playerColor, enemyCount, terrainSeed } = config;

  // Generate random terrain
  const terrain = generateTerrain({
    width: canvasWidth,
    height: canvasHeight,
    roughness: 0.5,
    seed: terrainSeed,
  });

  // Create tanks distributed across the terrain
  const tanks = createInitialTanks(terrain, playerColor, enemyCount);

  return { terrain, tanks };
}
