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
  POWER_SCALE,
  powerToVelocity,
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
  screenToWorld,
  checkTerrainCollision,
  type ProjectileState,
  type TerrainCollisionResult,
} from './projectile';

export {
  calculateAIShot,
  calculateOptimalShot,
  applyDifficultyVariance,
  getAvailableDifficulties,
  getChevronCount,
  getStarCount,
  getNextDifficulty,
  AI_DIFFICULTY_CONFIGS,
  AI_DIFFICULTY_ORDER,
  type AIDecision,
  type AIDifficultyConfig,
} from './ai';

export {
  EXPLOSION_RADIUS,
  EXPLOSION_DURATION_MS,
  createExplosion,
  getExplosionProgress,
  isExplosionComplete,
  updateExplosion,
  renderExplosion,
  isPointInExplosion,
  getDistanceToExplosion,
  checkTankHit,
  type ExplosionState,
  type ExplosionParticle,
} from './explosion';
