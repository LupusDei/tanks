export type GamePhase = 'loading' | 'playing' | 'gameover';

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
}
