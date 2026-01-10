import type { Position, TankState } from '../types/game';
import type { WeaponType } from './weapons';

/**
 * Explosion radius in pixels.
 * Set to 50% of tank body width (40px) = 20px.
 * This constant is used for both rendering AND hit detection.
 */
export const EXPLOSION_RADIUS = 20;

/**
 * Duration of explosion animation in milliseconds.
 */
export const EXPLOSION_DURATION_MS = 1500;

/**
 * Individual particle in the explosion effect.
 */
export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number; // 0 to 1, decreases over time
}

/**
 * State of an active explosion animation.
 */
export interface ExplosionState {
  position: Position;
  startTime: number;
  particles: ExplosionParticle[];
  isActive: boolean;
  /** Explosion radius in pixels (for rendering and hit detection) */
  radius: number;
  /** Weapon type that created this explosion */
  weaponType: WeaponType;
  /** Sub-explosions for cluster bomb */
  subExplosions?: ExplosionState[];
  /** Duration multiplier for this explosion type */
  durationMultiplier: number;
}

/**
 * Visual configuration for weapon-specific explosions.
 */
interface ExplosionConfig {
  /** Particle color palette */
  colors: string[];
  /** Duration multiplier (1.0 = standard) */
  durationMultiplier: number;
  /** Particle count multiplier */
  particleMultiplier: number;
  /** Particle speed multiplier */
  speedMultiplier: number;
  /** Flash color (center) */
  flashColorInner: string;
  /** Flash color (outer) */
  flashColorOuter: string;
  /** Fireball color (center) */
  fireColorInner: string;
  /** Fireball color (outer) */
  fireColorOuter: string;
}

/**
 * Get explosion configuration for a weapon type.
 */
function getExplosionConfig(weaponType: WeaponType): ExplosionConfig {
  switch (weaponType) {
    case 'heavy_artillery':
      return {
        colors: ['#ff3300', '#cc2200', '#aa4400', '#884400', '#663300', '#442200'],
        durationMultiplier: 1.4,
        particleMultiplier: 1.8,
        speedMultiplier: 0.7,
        flashColorInner: 'rgba(255, 200, 150, 1)',
        flashColorOuter: 'rgba(255, 100, 50, 0)',
        fireColorInner: 'rgba(255, 150, 80, 1)',
        fireColorOuter: 'rgba(150, 50, 0, 0)',
      };
    case 'precision':
      return {
        colors: ['#ffffff', '#aaddff', '#66ccff', '#44aaff'],
        durationMultiplier: 0.6,
        particleMultiplier: 0.6,
        speedMultiplier: 1.8,
        flashColorInner: 'rgba(255, 255, 255, 1)',
        flashColorOuter: 'rgba(150, 200, 255, 0)',
        fireColorInner: 'rgba(200, 230, 255, 1)',
        fireColorOuter: 'rgba(100, 150, 255, 0)',
      };
    case 'cluster_bomb':
      return {
        colors: ['#ff6600', '#ff4400', '#ffaa00', '#ff8800'],
        durationMultiplier: 0.8,
        particleMultiplier: 0.7,
        speedMultiplier: 1.2,
        flashColorInner: 'rgba(255, 255, 200, 1)',
        flashColorOuter: 'rgba(255, 150, 50, 0)',
        fireColorInner: 'rgba(255, 200, 100, 1)',
        fireColorOuter: 'rgba(200, 80, 0, 0)',
      };
    case 'napalm':
      return {
        colors: ['#ff4400', '#ff6600', '#ff2200', '#ff8800', '#ffaa00'],
        durationMultiplier: 2.0,
        particleMultiplier: 1.3,
        speedMultiplier: 0.5,
        flashColorInner: 'rgba(255, 200, 100, 1)',
        flashColorOuter: 'rgba(255, 100, 0, 0)',
        fireColorInner: 'rgba(255, 150, 50, 1)',
        fireColorOuter: 'rgba(200, 50, 0, 0)',
      };
    case 'standard':
    default:
      return {
        colors: ['#ff4400', '#ff6600', '#ffaa00', '#ffcc00', '#ff2200', '#ffff44'],
        durationMultiplier: 1.0,
        particleMultiplier: 1.0,
        speedMultiplier: 1.0,
        flashColorInner: 'rgba(255, 255, 255, 1)',
        flashColorOuter: 'rgba(255, 200, 50, 0)',
        fireColorInner: 'rgba(255, 220, 100, 1)',
        fireColorOuter: 'rgba(200, 50, 0, 0)',
      };
  }
}

/**
 * Create a new explosion at the given position.
 * @param position - Center position of the explosion
 * @param startTime - Start time for animation (defaults to now)
 * @param radius - Explosion radius in pixels (defaults to EXPLOSION_RADIUS)
 * @param weaponType - Weapon type for visual styling (defaults to 'standard')
 */
export function createExplosion(
  position: Position,
  startTime: number = performance.now(),
  radius: number = EXPLOSION_RADIUS,
  weaponType: WeaponType = 'standard'
): ExplosionState {
  const config = getExplosionConfig(weaponType);
  const explosion: ExplosionState = {
    position: { ...position },
    startTime,
    particles: generateParticles(position, radius, config),
    isActive: true,
    radius,
    weaponType,
    durationMultiplier: config.durationMultiplier,
  };

  // Create sub-explosions for cluster bomb
  if (weaponType === 'cluster_bomb') {
    explosion.subExplosions = createClusterSubExplosions(position, startTime, radius);
  }

  return explosion;
}

/**
 * Create sub-explosions for cluster bomb.
 * Creates 4 smaller explosions around the main impact point with staggered timing.
 */
function createClusterSubExplosions(
  center: Position,
  startTime: number,
  mainRadius: number
): ExplosionState[] {
  const subExplosions: ExplosionState[] = [];
  const subCount = 4;
  const spreadRadius = mainRadius * 1.5;

  for (let i = 0; i < subCount; i++) {
    const angle = (i / subCount) * Math.PI * 2 + Math.random() * 0.5;
    const distance = spreadRadius * (0.6 + Math.random() * 0.4);
    const delay = 80 + Math.random() * 120; // 80-200ms delay

    const subPosition: Position = {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
    };

    const config = getExplosionConfig('cluster_bomb');
    subExplosions.push({
      position: subPosition,
      startTime: startTime + delay,
      particles: generateParticles(subPosition, mainRadius * 0.5, config),
      isActive: true,
      radius: mainRadius * 0.5,
      weaponType: 'cluster_bomb',
      durationMultiplier: config.durationMultiplier,
    });
  }

  return subExplosions;
}

/**
 * Generate random particles for the explosion effect.
 * Particle count and speed scale with explosion radius and weapon config.
 */
function generateParticles(
  center: Position,
  explosionRadius: number,
  config: ExplosionConfig
): ExplosionParticle[] {
  const particles: ExplosionParticle[] = [];
  const radiusScale = explosionRadius / EXPLOSION_RADIUS;
  const baseCount = Math.floor(Math.min(40, Math.max(15, 20 * radiusScale)));
  const particleCount = Math.floor(baseCount * config.particleMultiplier);

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const baseSpeed = 30 + Math.random() * 60;
    const speed = baseSpeed * Math.sqrt(radiusScale) * config.speedMultiplier;

    particles.push({
      x: center.x,
      y: center.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20 * radiusScale,
      radius: (2 + Math.random() * 4) * Math.sqrt(radiusScale),
      color: config.colors[Math.floor(Math.random() * config.colors.length)]!,
      life: 1,
    });
  }

  return particles;
}

/**
 * Get the current progress of the explosion (0 to 1).
 */
export function getExplosionProgress(explosion: ExplosionState, currentTime: number): number {
  const elapsed = currentTime - explosion.startTime;
  const duration = EXPLOSION_DURATION_MS * explosion.durationMultiplier;
  return Math.min(1, elapsed / duration);
}

/**
 * Check if the explosion animation is complete.
 */
export function isExplosionComplete(explosion: ExplosionState, currentTime: number): boolean {
  return getExplosionProgress(explosion, currentTime) >= 1;
}

/**
 * Update explosion state for the current frame.
 * Returns a new explosion state with updated particles.
 */
export function updateExplosion(
  explosion: ExplosionState,
  currentTime: number,
  deltaTimeMs: number
): ExplosionState {
  if (!explosion.isActive) return explosion;

  const progress = getExplosionProgress(explosion, currentTime);
  const deltaSeconds = deltaTimeMs / 1000;

  // Adjust particle decay based on weapon type
  const decayRate = explosion.weaponType === 'napalm' ? 0.4 : 0.8;
  const gravityMultiplier = explosion.weaponType === 'napalm' ? 20 : 50;

  // Update particles
  const updatedParticles = explosion.particles.map((particle) => ({
    ...particle,
    x: particle.x + particle.vx * deltaSeconds,
    y: particle.y + particle.vy * deltaSeconds,
    vy: particle.vy + gravityMultiplier * deltaSeconds,
    life: Math.max(0, particle.life - deltaSeconds * decayRate),
  }));

  // Update sub-explosions for cluster bomb
  let updatedSubExplosions = explosion.subExplosions;
  if (updatedSubExplosions) {
    updatedSubExplosions = updatedSubExplosions.map((sub) =>
      updateExplosion(sub, currentTime, deltaTimeMs)
    );
  }

  // Check if main explosion and all sub-explosions are complete
  const mainComplete = progress >= 1;
  const subsComplete = !updatedSubExplosions || updatedSubExplosions.every((sub) => !sub.isActive);

  if (mainComplete && subsComplete) {
    return { ...explosion, isActive: false, particles: updatedParticles, subExplosions: updatedSubExplosions };
  }

  return {
    ...explosion,
    particles: updatedParticles,
    subExplosions: updatedSubExplosions,
  };
}

/**
 * Render the explosion effect on the canvas.
 * All coordinates are in screen space.
 */
export function renderExplosion(
  ctx: CanvasRenderingContext2D,
  explosion: ExplosionState,
  currentTime: number
): void {
  if (!explosion.isActive) return;

  const progress = getExplosionProgress(explosion, currentTime);
  const { position, radius, weaponType } = explosion;
  const config = getExplosionConfig(weaponType);

  ctx.save();

  // Render sub-explosions first (for cluster bomb)
  if (explosion.subExplosions) {
    for (const sub of explosion.subExplosions) {
      renderExplosion(ctx, sub, currentTime);
    }
  }

  // Phase 1: Initial flash (0-15%, shorter for precision)
  const flashEnd = weaponType === 'precision' ? 0.1 : 0.15;
  const flashScale = weaponType === 'heavy_artillery' ? 2.0 : 1.0;
  if (progress < flashEnd) {
    const flashProgress = progress / flashEnd;
    const flashRadius = radius * (0.5 + flashProgress * 1.5) * flashScale;
    const flashAlpha = 1 - flashProgress * 0.5;

    const flashGradient = ctx.createRadialGradient(
      position.x, position.y, 0,
      position.x, position.y, flashRadius
    );

    // Use weapon-specific flash colors
    const innerColor = config.flashColorInner.replace('1)', `${flashAlpha})`);
    const outerColor = config.flashColorOuter;
    flashGradient.addColorStop(0, innerColor);
    flashGradient.addColorStop(0.4, innerColor.replace(`${flashAlpha})`, `${flashAlpha * 0.6})`));
    flashGradient.addColorStop(1, outerColor);

    ctx.fillStyle = flashGradient;
    ctx.beginPath();
    ctx.arc(position.x, position.y, flashRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Phase 2: Fireball (5-60%, extended for napalm)
  const fireEnd = weaponType === 'napalm' ? 0.8 : (weaponType === 'precision' ? 0.4 : 0.6);
  if (progress >= 0.05 && progress < fireEnd) {
    const fireProgress = (progress - 0.05) / (fireEnd - 0.05);
    const fireRadius = radius * (0.3 + fireProgress * 0.9);
    const fireAlpha = 1 - fireProgress * 0.7;

    // Glow color based on weapon type
    const glowColor = config.colors[0] ?? '#ff4400';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20 * (1 - fireProgress) * (radius / EXPLOSION_RADIUS);

    const fireGradient = ctx.createRadialGradient(
      position.x, position.y, 0,
      position.x, position.y, fireRadius
    );

    const innerFire = config.fireColorInner.replace('1)', `${fireAlpha})`);
    const outerFire = config.fireColorOuter;
    fireGradient.addColorStop(0, innerFire);
    fireGradient.addColorStop(0.3, innerFire.replace(`${fireAlpha})`, `${fireAlpha * 0.9})`));
    fireGradient.addColorStop(0.6, innerFire.replace(`${fireAlpha})`, `${fireAlpha * 0.5})`));
    fireGradient.addColorStop(1, outerFire);

    ctx.fillStyle = fireGradient;
    ctx.beginPath();
    ctx.arc(position.x, position.y, fireRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  // Phase 3: Particles (throughout)
  for (const particle of explosion.particles) {
    if (particle.life <= 0) continue;

    const particleAlpha = particle.life * (1 - progress * 0.5);
    ctx.globalAlpha = particleAlpha;
    ctx.fillStyle = particle.color;

    ctx.shadowColor = particle.color;
    ctx.shadowBlur = weaponType === 'precision' ? 6 : 4;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * particle.life, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // Phase 4: Smoke ring (40-100%) - less smoke for precision, more for heavy
  // Skip smoke entirely for napalm (replaced by lingering flames)
  if (weaponType !== 'napalm' && progress >= 0.4) {
    const smokeProgress = (progress - 0.4) / 0.6;
    const smokeScale = weaponType === 'heavy_artillery' ? 1.3 : (weaponType === 'precision' ? 0.5 : 1.0);
    const smokeRadius = radius * (0.8 + smokeProgress * 0.8) * smokeScale;
    const smokeAlpha = (weaponType === 'precision' ? 0.2 : 0.4) * (1 - smokeProgress);

    const smokeGradient = ctx.createRadialGradient(
      position.x, position.y, smokeRadius * 0.5,
      position.x, position.y, smokeRadius
    );
    smokeGradient.addColorStop(0, `rgba(80, 80, 80, 0)`);
    smokeGradient.addColorStop(0.5, `rgba(60, 60, 60, ${smokeAlpha * 0.5})`);
    smokeGradient.addColorStop(1, `rgba(40, 40, 40, 0)`);

    ctx.fillStyle = smokeGradient;
    ctx.beginPath();
    ctx.arc(position.x, position.y, smokeRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Napalm special effect: lingering ground flames
  if (weaponType === 'napalm' && progress >= 0.2) {
    renderNapalmFlames(ctx, position, radius, progress, currentTime);
  }

  ctx.restore();
}

/**
 * Render lingering flame effect for napalm explosions.
 */
function renderNapalmFlames(
  ctx: CanvasRenderingContext2D,
  position: Position,
  radius: number,
  progress: number,
  currentTime: number
): void {
  const flameAlpha = Math.max(0, 1 - progress * 0.8);
  const flameCount = 5;

  for (let i = 0; i < flameCount; i++) {
    // Deterministic positions based on index, with slight time-based flicker
    const baseAngle = (i / flameCount) * Math.PI * 2;
    const flicker = Math.sin(currentTime * 0.01 + i * 2) * 0.1;
    const dist = radius * (0.3 + (i % 3) * 0.2);

    const flameX = position.x + Math.cos(baseAngle) * dist;
    const flameY = position.y + Math.sin(baseAngle) * dist * 0.5; // Flatten vertically

    // Flame height varies with time
    const flameHeight = (8 + Math.sin(currentTime * 0.015 + i) * 4) * flameAlpha;
    const flameWidth = 4 + Math.sin(currentTime * 0.02 + i * 1.5) * 2;

    ctx.globalAlpha = flameAlpha * (0.6 + flicker);

    // Draw flame shape
    const gradient = ctx.createLinearGradient(
      flameX, flameY,
      flameX, flameY - flameHeight
    );
    gradient.addColorStop(0, '#ff6600');
    gradient.addColorStop(0.3, '#ff4400');
    gradient.addColorStop(0.7, '#ff2200');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(flameX - flameWidth, flameY);
    ctx.quadraticCurveTo(flameX - flameWidth * 0.5, flameY - flameHeight * 0.7, flameX, flameY - flameHeight);
    ctx.quadraticCurveTo(flameX + flameWidth * 0.5, flameY - flameHeight * 0.7, flameX + flameWidth, flameY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/**
 * Check if a point is within the explosion radius.
 * Uses the explosion's stored radius for hit detection.
 */
export function isPointInExplosion(explosion: ExplosionState, point: Position): boolean {
  const dx = point.x - explosion.position.x;
  const dy = point.y - explosion.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= explosion.radius;
}

/**
 * Get the distance from a point to the explosion center.
 */
export function getDistanceToExplosion(explosion: ExplosionState, point: Position): number {
  const dx = point.x - explosion.position.x;
  const dy = point.y - explosion.position.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Tank dimensions for hit detection (must match tank.ts).
 */
const TANK_BODY_WIDTH = 40;
const TANK_BODY_HEIGHT = 20;
const TANK_WHEEL_RADIUS = 6;

/**
 * Check if an explosion hits a tank using circle-rectangle collision.
 * Explosion position is in screen coordinates, tank position is in world coordinates.
 *
 * @param explosionScreenPos - Explosion position in screen coordinates
 * @param tank - Tank state with position in world coordinates
 * @param canvasHeight - Canvas height for coordinate conversion
 * @param explosionRadius - Explosion radius in pixels (defaults to EXPLOSION_RADIUS)
 * @returns true if the explosion overlaps with the tank hitbox
 */
export function checkTankHit(
  explosionScreenPos: Position,
  tank: TankState,
  canvasHeight: number,
  explosionRadius: number = EXPLOSION_RADIUS
): boolean {
  // Convert tank position from world to screen coordinates
  const tankScreenX = tank.position.x;
  const tankScreenY = canvasHeight - tank.position.y;

  // Tank hitbox rectangle bounds (in screen coordinates)
  // The tank extends from body center down to wheels
  const halfWidth = TANK_BODY_WIDTH / 2;
  const topOffset = TANK_BODY_HEIGHT / 2; // Body extends up from center
  const bottomOffset = TANK_BODY_HEIGHT / 2 + TANK_WHEEL_RADIUS; // Body + wheels extend down

  const rectLeft = tankScreenX - halfWidth;
  const rectRight = tankScreenX + halfWidth;
  const rectTop = tankScreenY - topOffset;
  const rectBottom = tankScreenY + bottomOffset;

  // Circle-rectangle collision detection
  // Find the closest point on the rectangle to the circle center
  const closestX = Math.max(rectLeft, Math.min(explosionScreenPos.x, rectRight));
  const closestY = Math.max(rectTop, Math.min(explosionScreenPos.y, rectBottom));

  // Calculate distance from circle center to closest point
  const dx = explosionScreenPos.x - closestX;
  const dy = explosionScreenPos.y - closestY;
  const distanceSquared = dx * dx + dy * dy;

  // Check if distance is less than or equal to explosion radius
  return distanceSquared <= explosionRadius * explosionRadius;
}
