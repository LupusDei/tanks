import type { TankColor, TankState, TerrainData } from '../types/game';
import { generateTerrain } from './terrain';
import { createInitialTanks, getOpponentColor } from './tank';

export interface GameInitConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerColor: TankColor;
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
  const { canvasWidth, canvasHeight, playerColor, terrainSeed } = config;

  // Generate random terrain
  const terrain = generateTerrain({
    width: canvasWidth,
    height: canvasHeight,
    roughness: 0.5,
    seed: terrainSeed,
  });

  // Get contrasting color for opponent
  const opponentColor = getOpponentColor(playerColor);

  // Create tanks at left and right positions
  const tanks = createInitialTanks(terrain, playerColor, opponentColor);

  return { terrain, tanks };
}
