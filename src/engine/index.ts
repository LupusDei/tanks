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
  selectAIWeapon,
  getAIWeaponChoice,
  selectTarget,
  AI_DIFFICULTY_CONFIGS,
  AI_DIFFICULTY_ORDER,
  AI_AVAILABLE_WEAPONS,
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

export {
  // Economy constants
  STARTING_MONEY,
  KILL_REWARD,
  WIN_BONUS,
  LOSS_CONSOLATION,
  DIFFICULTY_REWARD_MULTIPLIERS,
  // Weapon configurations
  WEAPON_STANDARD,
  WEAPON_HEAVY_ARTILLERY,
  WEAPON_PRECISION,
  WEAPON_CLUSTER_BOMB,
  WEAPON_NAPALM,
  WEAPONS,
  WEAPON_TYPES,
  // Utility functions
  getWeaponConfig,
  getPurchasableWeapons,
  canAffordWeapon,
  calculateKillReward,
  calculateWinBonus,
  calculateGameEarnings,
  // Types
  type WeaponType,
  type WeaponConfig,
} from './weapons';
