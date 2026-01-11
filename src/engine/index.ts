export {
  generateTerrain,
  getTerrainHeightAt,
  getInterpolatedHeightAt,
  smoothTerrain,
  createSeededRandom,
  createCrater,
  type TerrainConfig,
} from './terrain';

export {
  GRAVITY,
  POWER_SCALE,
  BASE_TERRAIN_WIDTH,
  WIND_SCALE,
  getTerrainPowerScale,
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

export {
  initializeGame,
  applyArmorToTank,
  applyArmorToTanks,
  type GameInitConfig,
  type GameInitResult,
} from './game';

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
  handleProjectileBounce,
  updateClusterBombSplit,
  renderClusterSubProjectiles,
  getTrajectoryProgress,
  findNearestTarget,
  updateHomingTracking,
  getProjectileVisual,
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
  selectTargetWithPersistence,
  resetAIState,
  recordShot,
  getConsecutiveShots,
  wouldShotHitSelf,
  AI_DIFFICULTY_CONFIGS,
  AI_DIFFICULTY_ORDER,
  AI_AVAILABLE_WEAPONS,
  AI_WIND_COMPENSATION,
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
  checkProjectileTankCollision,
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
  WEAPON_EMP,
  WEAPON_BOUNCING_BETTY,
  WEAPON_BUNKER_BUSTER,
  WEAPON_HOMING_MISSILE,
  WEAPONS,
  WEAPON_TYPES,
  // Utility functions
  getWeaponConfig,
  getPurchasableWeapons,
  canAffordWeapon,
  calculateKillReward,
  calculateWinBonus,
  calculateGameEarnings,
  getDestructionCategory,
  // Types
  type WeaponType,
  type WeaponConfig,
  type DestructionCategory,
} from './weapons';

export {
  DESTRUCTION_DURATION_MS,
  createTankDestruction,
  getDestructionProgress,
  isDestructionComplete,
  updateTankDestruction,
  renderTankDestruction,
  type TankDestructionState,
  type TankDebris,
  type DestructionParticle,
  type DebrisType,
} from './tankDestruction';

export {
  WIND_STD_DEV,
  WIND_CHANGE_STD_DEV,
  MAX_WIND,
  WIND_REGRESSION,
  gaussianRandom,
  generateInitialWind,
  generateNextWind,
} from './wind';

export {
  MONEY_ANIMATION_DURATION_MS,
  createMoneyAnimation,
  getMoneyAnimationProgress,
  isMoneyAnimationComplete,
  updateMoneyAnimation,
  renderMoneyAnimation,
  type MoneyAnimationState,
} from './moneyAnimation';
