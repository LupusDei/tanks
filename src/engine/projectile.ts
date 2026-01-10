import type { Position, TankState, TerrainData } from '../types/game';
import { calculatePosition, degreesToRadians, type LaunchConfig } from './physics';
import { getInterpolatedHeightAt } from './terrain';
import { type WeaponType, getWeaponConfig } from './weapons';

/**
 * Tank turret dimensions for calculating barrel tip position.
 * These must match the values in tank.ts for correct alignment.
 */
const TURRET_LENGTH = 25;
const BODY_HEIGHT = 20;
const DOME_OFFSET = BODY_HEIGHT / 4; // Dome center is above tank center

/**
 * Animation speed multiplier for projectiles.
 * Higher values make projectiles traverse their trajectory faster
 * without changing the physics (same power = same distance).
 */
const ANIMATION_SPEED_MULTIPLIER = 5;

/**
 * State of an active projectile animation.
 * All positions are stored in screen coordinates (y increases downward).
 */
export interface ProjectileState {
  isActive: boolean;
  launchConfig: LaunchConfig;
  startTime: number;
  tracePoints: Position[];
  canvasHeight: number;
  /** ID of the tank that fired this projectile */
  tankId: string;
  /** Color of the tank that fired this projectile (for trail rendering) */
  tankColor: string;
  /** Weapon type used for this shot (determines damage and blast radius) */
  weaponType: WeaponType;
  /** Animation speed multiplier from weapon config */
  speedMultiplier: number;
}

/**
 * Convert world coordinates to screen coordinates.
 * In world coords: y=0 at bottom, increases upward.
 * In screen coords: y=0 at top, increases downward.
 */
export function worldToScreen(worldPos: Position, canvasHeight: number): Position {
  return {
    x: worldPos.x,
    y: canvasHeight - worldPos.y,
  };
}

/**
 * Convert UI angle to physics angle.
 * UI angle: 0 = up, positive = left, negative = right, range -120 to +120
 * Physics angle: 0 = right, 90 = up, standard mathematical convention
 */
export function uiAngleToPhysicsAngle(uiAngle: number): number {
  return 90 + uiAngle;
}

/**
 * Calculate the barrel tip position for a tank in world coordinates.
 * This is where projectiles should spawn from.
 * The barrel extends from the turret dome, which is offset above the tank center.
 */
export function getBarrelTipPosition(tank: TankState): Position {
  // Convert UI angle to physics angle for position calculation
  const physicsAngle = uiAngleToPhysicsAngle(tank.angle);
  const angleRad = degreesToRadians(physicsAngle);

  // Dome center is above tank center in world coordinates
  const domeCenterY = tank.position.y + DOME_OFFSET;

  return {
    x: tank.position.x + TURRET_LENGTH * Math.cos(angleRad),
    y: domeCenterY + TURRET_LENGTH * Math.sin(angleRad),
  };
}

/**
 * Create a launch configuration from tank state.
 * Converts tank position from world to screen coordinates for physics engine.
 * Converts UI angle to physics angle for trajectory calculation.
 */
export function createLaunchConfig(tank: TankState, canvasHeight: number): LaunchConfig {
  const barrelTipWorld = getBarrelTipPosition(tank);
  const barrelTipScreen = worldToScreen(barrelTipWorld, canvasHeight);
  return {
    position: barrelTipScreen,
    angle: uiAngleToPhysicsAngle(tank.angle), // Convert to physics angle
    power: tank.power,
  };
}

/**
 * Create initial projectile state when firing.
 * @param tank - Tank that fired the projectile
 * @param startTime - Animation start time
 * @param canvasHeight - Canvas height for coordinate conversion
 * @param weaponType - Type of weapon used (defaults to 'standard')
 */
export function createProjectileState(
  tank: TankState,
  startTime: number,
  canvasHeight: number,
  weaponType: WeaponType = 'standard'
): ProjectileState {
  const launchConfig = createLaunchConfig(tank, canvasHeight);
  const weaponConfig = getWeaponConfig(weaponType);
  return {
    isActive: true,
    launchConfig,
    startTime,
    tracePoints: [{ ...launchConfig.position }],
    canvasHeight,
    tankId: tank.id,
    tankColor: tank.color,
    weaponType,
    speedMultiplier: weaponConfig.projectileSpeedMultiplier,
  };
}

/**
 * Get current projectile position based on elapsed time.
 * Applies ANIMATION_SPEED_MULTIPLIER and weapon speedMultiplier to make projectiles
 * animate faster or slower based on weapon type while maintaining trajectory shape.
 */
export function getProjectilePosition(projectile: ProjectileState, currentTime: number): Position {
  const weaponSpeedMultiplier = projectile.speedMultiplier;
  const elapsedSeconds = ((currentTime - projectile.startTime) / 1000) * ANIMATION_SPEED_MULTIPLIER * weaponSpeedMultiplier;
  return calculatePosition(projectile.launchConfig, elapsedSeconds);
}

/**
 * Projectile visual configuration for each weapon type.
 */
export interface ProjectileVisual {
  /** Primary fill color */
  color: string;
  /** Glow/shadow color */
  glowColor: string;
  /** Base radius of the projectile */
  radius: number;
  /** Trail color (defaults to tankColor if not specified) */
  trailColor?: string;
}

/**
 * Get visual configuration for a weapon type.
 */
export function getProjectileVisual(weaponType: WeaponType): ProjectileVisual {
  switch (weaponType) {
    case 'heavy_artillery':
      return { color: '#2a2a2a', glowColor: '#ff3300', radius: 8 };
    case 'precision':
      return { color: '#00ddff', glowColor: '#66ffff', radius: 4, trailColor: '#00aacc' };
    case 'cluster_bomb':
      return { color: '#cc6600', glowColor: '#ff9933', radius: 6 };
    case 'napalm':
      return { color: '#ff4400', glowColor: '#ffaa00', radius: 6 };
    case 'standard':
    default:
      return { color: '#ffff00', glowColor: '#ffffff', radius: 5 };
  }
}

/**
 * Render standard shell - yellow circle with white glow.
 */
function renderStandardShell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  visual: ProjectileVisual
): void {
  ctx.fillStyle = visual.color;
  ctx.beginPath();
  ctx.arc(x, y, visual.radius, 0, Math.PI * 2);
  ctx.fill();

  // Inner white glow
  ctx.shadowColor = visual.glowColor;
  ctx.shadowBlur = 10;
  ctx.fillStyle = visual.glowColor;
  ctx.beginPath();
  ctx.arc(x, y, visual.radius * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Render heavy artillery - larger dark oval shell with red glow.
 */
function renderHeavyArtillery(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  visual: ProjectileVisual,
  angle: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(degreesToRadians(angle - 90)); // Align with trajectory

  // Red outer glow
  ctx.shadowColor = visual.glowColor;
  ctx.shadowBlur = 15;

  // Elongated shell shape
  ctx.fillStyle = visual.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, visual.radius * 0.7, visual.radius * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#444444';
  ctx.beginPath();
  ctx.ellipse(-2, -3, visual.radius * 0.3, visual.radius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Render precision shot - small cyan streamlined projectile.
 */
function renderPrecisionShot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  visual: ProjectileVisual,
  angle: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(degreesToRadians(angle - 90));

  // Bright glow
  ctx.shadowColor = visual.glowColor;
  ctx.shadowBlur = 12;

  // Pointed projectile shape
  ctx.fillStyle = visual.color;
  ctx.beginPath();
  ctx.moveTo(0, -visual.radius * 1.5); // Tip
  ctx.lineTo(visual.radius * 0.6, visual.radius);
  ctx.lineTo(-visual.radius * 0.6, visual.radius);
  ctx.closePath();
  ctx.fill();

  // Core highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, visual.radius * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Render cluster bomb - brown/orange sphere with submunition dots.
 */
function renderClusterBomb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  visual: ProjectileVisual,
  currentTime: number
): void {
  // Slight wobble animation
  const wobble = Math.sin(currentTime * 0.02) * 1.5;
  const drawX = x + wobble;

  ctx.save();

  // Orange glow
  ctx.shadowColor = visual.glowColor;
  ctx.shadowBlur = 8;

  // Main sphere
  ctx.fillStyle = visual.color;
  ctx.beginPath();
  ctx.arc(drawX, y, visual.radius, 0, Math.PI * 2);
  ctx.fill();

  // Submunition dots inside
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#553300';
  const dotPositions = [
    { dx: 0, dy: 0 },
    { dx: -2, dy: -2 },
    { dx: 2, dy: -2 },
    { dx: -2, dy: 2 },
    { dx: 2, dy: 2 },
  ];
  for (const dot of dotPositions) {
    ctx.beginPath();
    ctx.arc(drawX + dot.dx, y + dot.dy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Render napalm canister - orange/red with flame trail.
 */
function renderNapalm(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  visual: ProjectileVisual,
  angle: number,
  currentTime: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(degreesToRadians(angle - 90));

  // Orange glow
  ctx.shadowColor = visual.glowColor;
  ctx.shadowBlur = 12;

  // Canister body
  ctx.fillStyle = visual.color;
  ctx.beginPath();
  ctx.roundRect(-visual.radius * 0.6, -visual.radius, visual.radius * 1.2, visual.radius * 2, 2);
  ctx.fill();

  // Flame particles trailing behind
  ctx.shadowBlur = 0;
  const flameColors = ['#ffcc00', '#ff6600', '#ff3300'];
  for (let i = 0; i < 3; i++) {
    const offset = (currentTime * 0.1 + i * 50) % 15;
    const size = 3 - i * 0.5;
    ctx.fillStyle = flameColors[i]!;
    ctx.beginPath();
    ctx.arc(0, visual.radius + 3 + offset, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Render the projectile and its dotted trace line on canvas.
 * All positions in projectile state are already in screen coordinates.
 * The trail color matches the tank that fired the projectile.
 */
export function renderProjectile(
  ctx: CanvasRenderingContext2D,
  projectile: ProjectileState,
  currentTime: number
): void {
  const position = getProjectilePosition(projectile, currentTime);
  const visual = getProjectileVisual(projectile.weaponType);

  // Positions are already in screen coordinates
  const canvasX = position.x;
  const canvasY = position.y;

  // Draw dotted trace line
  if (projectile.tracePoints.length > 0) {
    ctx.save();
    ctx.strokeStyle = visual.trailColor ?? projectile.tankColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();

    const firstPoint = projectile.tracePoints[0]!;
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < projectile.tracePoints.length; i++) {
      const point = projectile.tracePoints[i]!;
      ctx.lineTo(point.x, point.y);
    }

    // Draw to current position
    ctx.lineTo(canvasX, canvasY);
    ctx.stroke();
    ctx.restore();
  }

  // Draw weapon-specific projectile
  ctx.save();
  switch (projectile.weaponType) {
    case 'heavy_artillery':
      renderHeavyArtillery(ctx, canvasX, canvasY, visual, projectile.launchConfig.angle);
      break;
    case 'precision':
      renderPrecisionShot(ctx, canvasX, canvasY, visual, projectile.launchConfig.angle);
      break;
    case 'cluster_bomb':
      renderClusterBomb(ctx, canvasX, canvasY, visual, currentTime);
      break;
    case 'napalm':
      renderNapalm(ctx, canvasX, canvasY, visual, projectile.launchConfig.angle, currentTime);
      break;
    case 'standard':
    default:
      renderStandardShell(ctx, canvasX, canvasY, visual);
      break;
  }
  ctx.restore();
}

/**
 * Update projectile trace by adding the current position.
 * Call this periodically to build up the trace line.
 */
export function updateProjectileTrace(
  projectile: ProjectileState,
  currentTime: number
): ProjectileState {
  const position = getProjectilePosition(projectile, currentTime);

  // Add point if enough time has passed since last point
  const lastPoint = projectile.tracePoints[projectile.tracePoints.length - 1];
  if (lastPoint) {
    const dx = position.x - lastPoint.x;
    const dy = position.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Add a trace point every ~15 pixels of travel
    if (distance >= 15) {
      return {
        ...projectile,
        tracePoints: [...projectile.tracePoints, { ...position }],
      };
    }
  }

  return projectile;
}

/**
 * Check if projectile is out of bounds (below ground or off-screen).
 * All coordinates are in screen coordinates (y increases downward).
 *
 * @param position - Projectile position in screen coordinates
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @param terrainHeightWorld - Terrain height in world coordinates
 */
export function isProjectileOutOfBounds(
  position: Position,
  canvasWidth: number,
  canvasHeight: number,
  terrainHeightWorld: number
): boolean {
  // Off-screen horizontally
  if (position.x < -50 || position.x > canvasWidth + 50) {
    return true;
  }

  // Convert terrain height from world to screen coordinates
  const terrainHeightScreen = canvasHeight - terrainHeightWorld;

  // Below terrain in screen coords means y > terrainHeightScreen
  if (position.y > terrainHeightScreen) {
    return true;
  }

  // Way above screen (safety check) - in screen coords, negative y is above
  if (position.y < -500) {
    return true;
  }

  return false;
}

/**
 * Result of a terrain collision check.
 */
export interface TerrainCollisionResult {
  /** Whether a collision occurred */
  hit: boolean;
  /** Collision point in screen coordinates (only set if hit is true) */
  point: Position | null;
  /** Collision point in world coordinates (only set if hit is true) */
  worldPoint: Position | null;
}

/**
 * Convert screen coordinates to world coordinates.
 * In screen coords: y=0 at top, increases downward.
 * In world coords: y=0 at bottom, increases upward.
 */
export function screenToWorld(screenPos: Position, canvasHeight: number): Position {
  return {
    x: screenPos.x,
    y: canvasHeight - screenPos.y,
  };
}

/**
 * Check if projectile has collided with terrain.
 * Returns collision information including the exact collision point.
 *
 * @param position - Projectile position in screen coordinates
 * @param terrain - Terrain data with height array
 * @param canvasHeight - Canvas height for coordinate conversion
 * @returns Collision result with hit status and collision point
 */
export function checkTerrainCollision(
  position: Position,
  terrain: TerrainData,
  canvasHeight: number
): TerrainCollisionResult {
  // Convert projectile position to world coordinates
  const worldPos = screenToWorld(position, canvasHeight);

  // Check if projectile is outside terrain bounds horizontally
  if (worldPos.x < 0 || worldPos.x >= terrain.width) {
    return { hit: false, point: null, worldPoint: null };
  }

  // Get terrain height at projectile's x position
  const terrainHeight = getInterpolatedHeightAt(terrain, worldPos.x);
  if (terrainHeight === undefined) {
    return { hit: false, point: null, worldPoint: null };
  }

  // Check if projectile is at or below terrain surface
  // In world coords, lower y = closer to ground
  if (worldPos.y <= terrainHeight) {
    // Collision! Return the collision point at terrain surface
    const collisionWorldPoint: Position = {
      x: worldPos.x,
      y: terrainHeight,
    };
    const collisionScreenPoint = worldToScreen(collisionWorldPoint, canvasHeight);

    return {
      hit: true,
      point: collisionScreenPoint,
      worldPoint: collisionWorldPoint,
    };
  }

  return { hit: false, point: null, worldPoint: null };
}
