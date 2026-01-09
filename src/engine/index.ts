export {
  generateTerrain,
  getTerrainHeightAt,
  getInterpolatedHeightAt,
  smoothTerrain,
  createSeededRandom,
  type TerrainConfig,
} from './terrain';

export {
  GRAVITY,
  degreesToRadians,
  calculatePosition,
  calculateVelocity,
  calculateApexTime,
  calculateMaxHeight,
  calculateTrajectory,
  calculateTrajectoryUntilY,
  findTimeAtY,
  type LaunchConfig,
  type TrajectoryPoint,
} from './physics';

export {
  renderTank,
  calculateTankPosition,
  createInitialTanks,
  getOpponentColor,
  getTankColorHex,
  type TankDimensions,
  type RenderTankOptions,
} from './tank';

export { initializeGame, type GameInitConfig, type GameInitResult } from './game';

export {
  getBarrelTipPosition,
  createLaunchConfig,
  createProjectileState,
  getProjectilePosition,
  renderProjectile,
  updateProjectileTrace,
  isProjectileOutOfBounds,
  worldToScreen,
  type ProjectileState,
} from './projectile';

export {
  calculateAIShot,
  calculateOptimalShot,
  applyDifficultyVariance,
  getAvailableDifficulties,
  AI_DIFFICULTY_CONFIGS,
  type AIDecision,
  type AIDifficultyConfig,
} from './ai';
