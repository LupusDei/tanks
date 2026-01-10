export type GamePhase = 'loading' | 'terrain_select' | 'color_select' | 'playing' | 'gameover';

export type TankColor = 'red' | 'blue' | 'green' | 'yellow';

export type TerrainSize = 'small' | 'medium' | 'large' | 'huge';

export interface TerrainSizeConfig {
  width: number;
  height: number;
  label: string;
}

export const TERRAIN_SIZES: Record<TerrainSize, TerrainSizeConfig> = {
  small: { width: 640, height: 480, label: 'Small' },
  medium: { width: 800, height: 600, label: 'Medium' },
  large: { width: 1024, height: 768, label: 'Large' },
  huge: { width: 1280, height: 960, label: 'Huge' },
};

export type AIDifficulty =
  | 'blind_fool'
  | 'private'
  | 'veteran'
  | 'centurion'
  | 'primus';

// Order of difficulties from easiest to hardest (for cycling)
export const AI_DIFFICULTY_ORDER: AIDifficulty[] = [
  'blind_fool',
  'private',
  'veteran',
  'centurion',
  'primus',
];

export interface Position {
  x: number;
  y: number;
}

export interface TankState {
  id: string;
  position: Position;
  health: number;
  angle: number;
  power: number;
  color: string;
  isActive: boolean;
}

export interface TerrainData {
  points: number[];
  width: number;
  height: number;
}

export interface GameState {
  phase: GamePhase;
  currentTurn: number;
  currentPlayerId: string | null;
  tanks: TankState[];
  terrain: TerrainData | null;
  winner: string | null;
  playerColor: TankColor | null;
  aiDifficulty: AIDifficulty;
  terrainSize: TerrainSize;
}

export interface GameActions {
  setPhase: (phase: GamePhase) => void;
  initializeTanks: (tanks: TankState[]) => void;
  nextTurn: () => void;
  updateTank: (tankId: string, updates: Partial<TankState>) => void;
  setTerrain: (terrain: TerrainData) => void;
  damageTank: (tankId: string, damage: number) => void;
  setWinner: (tankId: string) => void;
  resetGame: () => void;
  setPlayerColor: (color: TankColor) => void;
  setAIDifficulty: (difficulty: AIDifficulty) => void;
  setTerrainSize: (size: TerrainSize) => void;
}
