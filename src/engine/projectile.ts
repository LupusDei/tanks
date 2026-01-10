import type { Position, TankState, TerrainData } from '../types/game';
import { calculatePosition, calculateVelocity, degreesToRadians, findTimeAtY, powerToVelocity, type LaunchConfig } from './physics';
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
  canvasWidth: number;
  /** ID of the tank that fired this projectile */
  tankId: string;
  /** Color of the tank that fired this projectile (for trail rendering) */
  tankColor: string;
  /** Weapon type used for this shot (determines damage and blast radius) */
  weaponType: WeaponType;
  /** Animation speed multiplier from weapon config */
  speedMultiplier: number;
  /** Sub-projectiles for cluster bomb (spawned at 85% of trajectory) */
  subProjectiles?: ProjectileState[];
  /** Whether the cluster bomb has already split */
  hasSplit?: boolean;
  /** Estimated time when projectile will land (for trajectory progress calculation) */
  estimatedLandingTime?: number;
  /** Whether this is a sub-projectile (smaller, no further splitting) */
  isSubProjectile?: boolean;
  /** Number of bounces completed (for bouncing weapons) */
  bounceCount?: number;
  /** Maximum bounces before exploding (for bouncing weapons) */
  maxBounces?: number;
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
 * @param tank - Tank state with position, angle, and power
 * @param canvasHeight - Canvas height for coordinate conversion
 * @param canvasWidth - Canvas width (terrain width) for power scaling
 */
export function createLaunchConfig(tank: TankState, canvasHeight: number, canvasWidth: number): LaunchConfig {
  const barrelTipWorld = getBarrelTipPosition(tank);
  const barrelTipScreen = worldToScreen(barrelTipWorld, canvasHeight);
  return {
    position: barrelTipScreen,
    angle: uiAngleToPhysicsAngle(tank.angle), // Convert to physics angle
    power: tank.power,
    terrainWidth: canvasWidth,
  };
}

/**
 * Create initial projectile state when firing.
 * @param tank - Tank that fired the projectile
 * @param startTime - Animation start time
 * @param canvasHeight - Canvas height for coordinate conversion
 * @param canvasWidth - Canvas width (terrain width) for power scaling
 * @param weaponType - Type of weapon used (defaults to 'standard')
 */
export function createProjectileState(
  tank: TankState,
  startTime: number,
  canvasHeight: number,
  canvasWidth: number,
  weaponType: WeaponType = 'standard'
): ProjectileState {
  const launchConfig = createLaunchConfig(tank, canvasHeight, canvasWidth);
  const weaponConfig = getWeaponConfig(weaponType);

  // For cluster bombs, estimate landing time to calculate split point
  const estimatedLandingTime = weaponType === 'cluster_bomb'
    ? estimateLandingTimeFromLaunch(launchConfig, canvasHeight)
    : undefined;

  // For bouncing weapons, initialize bounce tracking
  const bounceCount = weaponConfig.maxBounces ? 0 : undefined;
  const maxBounces = weaponConfig.maxBounces;

  return {
    isActive: true,
    launchConfig,
    startTime,
    tracePoints: [{ ...launchConfig.position }],
    canvasHeight,
    canvasWidth,
    tankId: tank.id,
    tankColor: tank.color,
    weaponType,
    speedMultiplier: weaponConfig.projectileSpeedMultiplier,
    estimatedLandingTime,
    bounceCount,
    maxBounces,
  };
}

/**
 * Estimate landing time from launch config.
 * Uses the launch Y position as the target, assuming the projectile will land
 * at approximately the same height it was fired from (typical for tanks on terrain).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function estimateLandingTimeFromLaunch(launchConfig: LaunchConfig, _canvasHeight: number): number {
  // Use the launch position Y as the target (projectile lands at similar height)
  // This is more accurate than using canvas bottom since terrain is usually
  // at similar heights across the map
  const targetY = launchConfig.position.y;

  // Binary search for when projectile returns to launch height (after apex)
  const landingTime = findTimeAtY(launchConfig, targetY, true);

  if (landingTime === null) {
    // Fallback: estimate using 2x apex time (symmetric arc)
    const angleRad = degreesToRadians(launchConfig.angle);
    const velocity = powerToVelocity(launchConfig.power, launchConfig.terrainWidth);
    const vy = velocity * Math.sin(angleRad);
    const apexTime = vy / 10; // GRAVITY = 10
    return Math.max(apexTime * 2, 0.5);
  }

  return landingTime;
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
    case 'emp':
      return { color: '#0066ff', glowColor: '#00ccff', radius: 6, trailColor: '#0088ff' };
    case 'bouncing_betty':
      return { color: '#888888', glowColor: '#ffcc00', radius: 5, trailColor: '#666666' };
    case 'bunker_buster':
      return { color: '#333333', glowColor: '#ff6600', radius: 6, trailColor: '#555555' };
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
 * Render EMP pulse - electric blue orb with lightning arcs.
 */
function renderEMPPulse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  visual: ProjectileVisual,
  currentTime: number
): void {
  ctx.save();

  // Electric blue glow
  ctx.shadowColor = visual.glowColor;
  ctx.shadowBlur = 15;

  // Main orb - pulsing size
  const pulse = 1 + Math.sin(currentTime * 0.03) * 0.15;
  ctx.fillStyle = visual.color;
  ctx.beginPath();
  ctx.arc(x, y, visual.radius * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Inner white core
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, visual.radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Electric arcs around the orb
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 1.5;
  const arcCount = 4;
  for (let i = 0; i < arcCount; i++) {
    const angle = (i / arcCount) * Math.PI * 2 + currentTime * 0.02;
    const startDist = visual.radius * pulse;
    const endDist = visual.radius * pulse * 1.8;
    const startX = x + Math.cos(angle) * startDist;
    const startY = y + Math.sin(angle) * startDist;
    const endX = x + Math.cos(angle + 0.3) * endDist;
    const endY = y + Math.sin(angle + 0.3) * endDist;

    // Zigzag lightning
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    const midX = (startX + endX) / 2 + Math.sin(currentTime * 0.1 + i) * 3;
    const midY = (startY + endY) / 2 + Math.cos(currentTime * 0.1 + i) * 3;
    ctx.lineTo(midX, midY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Render Bouncing Betty - metallic ball with spring-like bounce indicator.
 */
function renderBouncingBetty(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  visual: ProjectileVisual,
  currentTime: number,
  bounceCount: number = 0
): void {
  ctx.save();

  // Yellow/orange glow - gets more intense with each bounce
  const glowIntensity = 8 + bounceCount * 4;
  ctx.shadowColor = visual.glowColor;
  ctx.shadowBlur = glowIntensity;

  // Metallic ball with gradient
  const gradient = ctx.createRadialGradient(
    x - 2, y - 2, 0,
    x, y, visual.radius
  );
  gradient.addColorStop(0, '#cccccc');
  gradient.addColorStop(0.5, visual.color);
  gradient.addColorStop(1, '#444444');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, visual.radius, 0, Math.PI * 2);
  ctx.fill();

  // Spring coil visual (wobbles when bouncing)
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 1.5;
  const wobble = Math.sin(currentTime * 0.05) * 2;
  const coilY = y + visual.radius + 2;
  ctx.beginPath();
  ctx.moveTo(x - 3, coilY);
  ctx.quadraticCurveTo(x - 1, coilY + wobble, x, coilY);
  ctx.quadraticCurveTo(x + 1, coilY - wobble, x + 3, coilY);
  ctx.stroke();

  // Bounce count indicator (small dots below)
  if (bounceCount > 0) {
    ctx.fillStyle = '#ffcc00';
    for (let i = 0; i < bounceCount; i++) {
      ctx.beginPath();
      ctx.arc(x - 3 + i * 6, y + visual.radius + 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Render Bunker Buster - pointed drill/missile shape.
 */
function renderBunkerBuster(
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
  ctx.shadowBlur = 10;

  // Main body - dark elongated shape
  ctx.fillStyle = visual.color;
  ctx.beginPath();
  ctx.moveTo(0, -visual.radius * 2); // Tip
  ctx.lineTo(visual.radius * 0.8, visual.radius);
  ctx.lineTo(visual.radius * 0.5, visual.radius * 1.2);
  ctx.lineTo(-visual.radius * 0.5, visual.radius * 1.2);
  ctx.lineTo(-visual.radius * 0.8, visual.radius);
  ctx.closePath();
  ctx.fill();

  // Drill tip highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#666666';
  ctx.beginPath();
  ctx.moveTo(0, -visual.radius * 2);
  ctx.lineTo(visual.radius * 0.3, -visual.radius * 0.5);
  ctx.lineTo(-visual.radius * 0.3, -visual.radius * 0.5);
  ctx.closePath();
  ctx.fill();

  // Spinning drill lines (animated)
  ctx.strokeStyle = '#ff6600';
  ctx.lineWidth = 1;
  const spinOffset = (currentTime * 0.02) % (Math.PI * 2);
  for (let i = 0; i < 3; i++) {
    const lineAngle = spinOffset + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(0, -visual.radius * 1.5);
    ctx.lineTo(
      Math.cos(lineAngle) * visual.radius * 0.4,
      -visual.radius * 0.5
    );
    ctx.stroke();
  }

  // Fins at back
  ctx.fillStyle = '#555555';
  ctx.beginPath();
  ctx.moveTo(visual.radius * 0.5, visual.radius);
  ctx.lineTo(visual.radius * 1.2, visual.radius * 1.5);
  ctx.lineTo(visual.radius * 0.5, visual.radius * 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-visual.radius * 0.5, visual.radius);
  ctx.lineTo(-visual.radius * 1.2, visual.radius * 1.5);
  ctx.lineTo(-visual.radius * 0.5, visual.radius * 1.2);
  ctx.closePath();
  ctx.fill();

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
    case 'emp':
      renderEMPPulse(ctx, canvasX, canvasY, visual, currentTime);
      break;
    case 'bouncing_betty':
      renderBouncingBetty(ctx, canvasX, canvasY, visual, currentTime, projectile.bounceCount ?? 0);
      break;
    case 'bunker_buster':
      renderBunkerBuster(ctx, canvasX, canvasY, visual, projectile.launchConfig.angle, currentTime);
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

/**
 * Energy retained after a bounce (0.7 = 70% of velocity preserved).
 */
const BOUNCE_ENERGY_RETENTION = 0.7;

/**
 * Check if a projectile can bounce and handle the bounce if so.
 * Returns a new projectile state if bounced, or null if should explode.
 *
 * @param projectile - Current projectile state
 * @param collisionPoint - Where the collision occurred (screen coords)
 * @param currentTime - Current animation time
 * @returns New projectile state if bounced, null if should explode
 */
export function handleProjectileBounce(
  projectile: ProjectileState,
  collisionPoint: Position,
  currentTime: number
): ProjectileState | null {
  // Only bounce if this is a bouncing weapon with bounces remaining
  if (
    projectile.maxBounces === undefined ||
    projectile.bounceCount === undefined ||
    projectile.bounceCount >= projectile.maxBounces
  ) {
    return null; // Should explode
  }

  // Calculate current velocity at time of impact
  const elapsedMs = currentTime - projectile.startTime;
  const elapsedPhysicsTime = (elapsedMs / 1000) * ANIMATION_SPEED_MULTIPLIER * projectile.speedMultiplier;
  const { vx, vy } = calculateVelocity(projectile.launchConfig, elapsedPhysicsTime);

  // Simple reflection: reverse vertical velocity, keep horizontal
  // Apply energy loss to make bounces more realistic
  const newVx = vx * BOUNCE_ENERGY_RETENTION;
  const newVy = -vy * BOUNCE_ENERGY_RETENTION; // Negative because screen coords are inverted

  // Calculate new angle from reflected velocity
  const newAngle = Math.atan2(-newVy, newVx) * (180 / Math.PI); // Convert to degrees

  // Calculate equivalent power from velocity magnitude
  const velocityMagnitude = Math.sqrt(newVx * newVx + newVy * newVy);
  // Reverse the power-to-velocity calculation to get power percentage
  // velocity = power * terrainWidth * 0.005 (from physics.ts)
  const newPower = (velocityMagnitude / (projectile.canvasWidth * 0.005)) * 100;

  // Create new launch config from bounce point
  const newLaunchConfig: LaunchConfig = {
    position: { ...collisionPoint },
    angle: newAngle,
    power: Math.min(100, Math.max(10, newPower)), // Clamp power to valid range
    terrainWidth: projectile.launchConfig.terrainWidth,
  };

  // Return new projectile state with bounce applied
  return {
    ...projectile,
    launchConfig: newLaunchConfig,
    startTime: currentTime,
    tracePoints: [...projectile.tracePoints, { ...collisionPoint }],
    bounceCount: projectile.bounceCount + 1,
  };
}

/**
 * Number of sub-projectiles created when cluster bomb splits.
 */
const CLUSTER_SUB_COUNT = 5;

/**
 * Percentage of trajectory at which cluster bomb splits (0.85 = 85%).
 */
const CLUSTER_SPLIT_THRESHOLD = 0.85;

/**
 * Estimate the landing time for a projectile based on its launch config.
 * Uses the launch Y position as target (assumes landing at similar height).
 * Returns the physics time (before animation speed multiplier).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function estimateLandingTime(launchConfig: LaunchConfig, _canvasHeight: number): number {
  // Use launch position Y as target - projectile lands at similar height
  const targetY = launchConfig.position.y;

  // Binary search for when projectile returns to launch height
  const landingTime = findTimeAtY(launchConfig, targetY, true);

  // If we can't find it, estimate based on total flight time
  if (landingTime === null) {
    // Fallback: estimate using 2x apex time (symmetric arc approximation)
    const angleRad = degreesToRadians(launchConfig.angle);
    const velocity = powerToVelocity(launchConfig.power, launchConfig.terrainWidth);
    const vy = velocity * Math.sin(angleRad);
    const apexTime = vy / 10; // GRAVITY = 10
    return Math.max(apexTime * 2, 0.5);
  }

  return landingTime;
}

/**
 * Get the trajectory progress as a value from 0 to 1.
 * 0 = just launched, 1 = at estimated landing position.
 */
export function getTrajectoryProgress(projectile: ProjectileState, currentTime: number): number {
  if (!projectile.estimatedLandingTime) {
    return 0;
  }

  const elapsedMs = currentTime - projectile.startTime;
  const elapsedPhysicsTime = (elapsedMs / 1000) * ANIMATION_SPEED_MULTIPLIER * projectile.speedMultiplier;

  return Math.min(1, elapsedPhysicsTime / projectile.estimatedLandingTime);
}

/**
 * Create sub-projectiles for cluster bomb split.
 * Each sub-projectile gets a slightly different angle to spread out.
 */
function createClusterSubProjectiles(
  parentProjectile: ProjectileState,
  currentTime: number
): ProjectileState[] {
  const subProjectiles: ProjectileState[] = [];
  const currentPos = getProjectilePosition(parentProjectile, currentTime);

  // Calculate current velocity to inherit momentum
  const elapsedMs = currentTime - parentProjectile.startTime;
  const elapsedPhysicsTime = (elapsedMs / 1000) * ANIMATION_SPEED_MULTIPLIER * parentProjectile.speedMultiplier;
  const { vx, vy } = calculateVelocity(parentProjectile.launchConfig, elapsedPhysicsTime);

  // Calculate current velocity angle for spread calculations
  const currentAngle = Math.atan2(-vy, vx) * (180 / Math.PI); // Convert to degrees, negate vy for screen coords

  // Create sub-projectiles with spread angles
  const spreadAngle = 10; // degrees spread from center (tighter cluster)

  for (let i = 0; i < CLUSTER_SUB_COUNT; i++) {
    // Spread evenly from -spreadAngle to +spreadAngle
    const angleOffset = spreadAngle * ((i / (CLUSTER_SUB_COUNT - 1)) * 2 - 1);
    const subAngle = currentAngle + angleOffset;

    // Reduce power for sub-projectiles (they don't travel as far)
    const subPower = parentProjectile.launchConfig.power * 0.3;

    const subLaunchConfig: LaunchConfig = {
      position: { ...currentPos },
      angle: subAngle,
      power: subPower,
      terrainWidth: parentProjectile.launchConfig.terrainWidth,
    };

    // Estimate landing time for sub-projectile
    const subLandingTime = estimateLandingTime(subLaunchConfig, parentProjectile.canvasHeight);

    subProjectiles.push({
      isActive: true,
      launchConfig: subLaunchConfig,
      startTime: currentTime,
      tracePoints: [{ ...currentPos }],
      canvasHeight: parentProjectile.canvasHeight,
      canvasWidth: parentProjectile.canvasWidth,
      tankId: parentProjectile.tankId,
      tankColor: parentProjectile.tankColor,
      weaponType: 'cluster_bomb',
      speedMultiplier: parentProjectile.speedMultiplier * 1.2, // Slightly faster animation
      isSubProjectile: true,
      estimatedLandingTime: subLandingTime,
    });
  }

  return subProjectiles;
}

/**
 * Check if cluster bomb should split and create sub-projectiles.
 * Returns updated projectile state with sub-projectiles if split occurs.
 */
export function updateClusterBombSplit(
  projectile: ProjectileState,
  currentTime: number
): ProjectileState {
  // Only process cluster bombs that haven't split yet
  if (projectile.weaponType !== 'cluster_bomb' || projectile.hasSplit || projectile.isSubProjectile) {
    return projectile;
  }

  // Check trajectory progress
  const progress = getTrajectoryProgress(projectile, currentTime);

  if (progress >= CLUSTER_SPLIT_THRESHOLD) {
    // Time to split!
    const subProjectiles = createClusterSubProjectiles(projectile, currentTime);

    return {
      ...projectile,
      hasSplit: true,
      isActive: false, // Main projectile becomes inactive after split
      subProjectiles,
    };
  }

  return projectile;
}

/**
 * Render a cluster bomb sub-projectile (smaller than main projectile).
 */
function renderClusterSubProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  currentTime: number
): void {
  // Slight wobble animation
  const wobble = Math.sin(currentTime * 0.03) * 1;
  const drawX = x + wobble;

  ctx.save();

  // Orange glow
  ctx.shadowColor = '#ff9933';
  ctx.shadowBlur = 6;

  // Smaller sphere
  ctx.fillStyle = '#cc6600';
  ctx.beginPath();
  ctx.arc(drawX, y, 4, 0, Math.PI * 2);
  ctx.fill();

  // Single dot in center
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#553300';
  ctx.beginPath();
  ctx.arc(drawX, y, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Render cluster bomb sub-projectiles.
 */
export function renderClusterSubProjectiles(
  ctx: CanvasRenderingContext2D,
  projectile: ProjectileState,
  currentTime: number
): void {
  if (!projectile.subProjectiles) return;

  for (const sub of projectile.subProjectiles) {
    if (!sub.isActive) continue;

    const position = getProjectilePosition(sub, currentTime);

    // Draw trail
    if (sub.tracePoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = sub.tankColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();

      const firstPoint = sub.tracePoints[0]!;
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < sub.tracePoints.length; i++) {
        const point = sub.tracePoints[i]!;
        ctx.lineTo(point.x, point.y);
      }

      ctx.lineTo(position.x, position.y);
      ctx.stroke();
      ctx.restore();
    }

    // Draw sub-projectile
    renderClusterSubProjectile(ctx, position.x, position.y, currentTime);
  }
}
