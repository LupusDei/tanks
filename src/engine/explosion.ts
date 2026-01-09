import type { Position } from '../types/game';

/**
 * Explosion radius in pixels.
 * Set to 50% of tank body width (40px) = 20px.
 * This constant is used for both rendering AND hit detection.
 */
export const EXPLOSION_RADIUS = 20;

/**
 * Duration of explosion animation in milliseconds.
 */
export const EXPLOSION_DURATION_MS = 800;

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
}

/**
 * Create a new explosion at the given position.
 */
export function createExplosion(
  position: Position,
  startTime: number = performance.now()
): ExplosionState {
  return {
    position: { ...position },
    startTime,
    particles: generateParticles(position),
    isActive: true,
  };
}

/**
 * Generate random particles for the explosion effect.
 */
function generateParticles(center: Position): ExplosionParticle[] {
  const particles: ExplosionParticle[] = [];
  const particleCount = 20;

  for (let i = 0; i < particleCount; i++) {
    // Random angle and speed
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60; // 30-90 pixels per second

    particles.push({
      x: center.x,
      y: center.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20, // Slight upward bias
      radius: 2 + Math.random() * 4,
      color: getParticleColor(),
      life: 1,
    });
  }

  return particles;
}

/**
 * Get a random warm color for explosion particles.
 */
function getParticleColor(): string {
  const colors = [
    '#ff4400', // Orange-red
    '#ff6600', // Orange
    '#ffaa00', // Yellow-orange
    '#ffcc00', // Golden yellow
    '#ff2200', // Red
    '#ffff44', // Bright yellow
  ];
  return colors[Math.floor(Math.random() * colors.length)]!;
}

/**
 * Get the current progress of the explosion (0 to 1).
 */
export function getExplosionProgress(explosion: ExplosionState, currentTime: number): number {
  const elapsed = currentTime - explosion.startTime;
  return Math.min(1, elapsed / EXPLOSION_DURATION_MS);
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

  if (progress >= 1) {
    return { ...explosion, isActive: false };
  }

  const deltaSeconds = deltaTimeMs / 1000;

  // Update particles
  const updatedParticles = explosion.particles.map((particle) => ({
    ...particle,
    x: particle.x + particle.vx * deltaSeconds,
    y: particle.y + particle.vy * deltaSeconds,
    vy: particle.vy + 50 * deltaSeconds, // Gravity effect
    life: Math.max(0, particle.life - deltaSeconds * 1.5),
  }));

  return {
    ...explosion,
    particles: updatedParticles,
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
  const { position } = explosion;

  ctx.save();

  // Phase 1: Initial flash (0-15%)
  if (progress < 0.15) {
    const flashProgress = progress / 0.15;
    const flashRadius = EXPLOSION_RADIUS * (0.5 + flashProgress * 1.5);
    const flashAlpha = 1 - flashProgress * 0.5;

    // Bright white/yellow flash
    const flashGradient = ctx.createRadialGradient(
      position.x, position.y, 0,
      position.x, position.y, flashRadius
    );
    flashGradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
    flashGradient.addColorStop(0.3, `rgba(255, 255, 100, ${flashAlpha * 0.8})`);
    flashGradient.addColorStop(1, `rgba(255, 200, 50, 0)`);

    ctx.fillStyle = flashGradient;
    ctx.beginPath();
    ctx.arc(position.x, position.y, flashRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Phase 2: Fireball (5-60%)
  if (progress >= 0.05 && progress < 0.6) {
    const fireProgress = (progress - 0.05) / 0.55;
    const fireRadius = EXPLOSION_RADIUS * (0.3 + fireProgress * 0.9);
    const fireAlpha = 1 - fireProgress * 0.7;

    // Outer glow
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 20 * (1 - fireProgress);

    // Fireball gradient (orange/red)
    const fireGradient = ctx.createRadialGradient(
      position.x, position.y, 0,
      position.x, position.y, fireRadius
    );
    fireGradient.addColorStop(0, `rgba(255, 220, 100, ${fireAlpha})`);
    fireGradient.addColorStop(0.3, `rgba(255, 150, 50, ${fireAlpha * 0.9})`);
    fireGradient.addColorStop(0.6, `rgba(255, 80, 20, ${fireAlpha * 0.7})`);
    fireGradient.addColorStop(1, `rgba(200, 50, 0, 0)`);

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

    // Add glow to particles
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * particle.life, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // Phase 4: Smoke ring (40-100%)
  if (progress >= 0.4) {
    const smokeProgress = (progress - 0.4) / 0.6;
    const smokeRadius = EXPLOSION_RADIUS * (0.8 + smokeProgress * 0.8);
    const smokeAlpha = 0.4 * (1 - smokeProgress);

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

  ctx.restore();
}

/**
 * Check if a point is within the explosion radius.
 * Used for hit detection.
 */
export function isPointInExplosion(explosion: ExplosionState, point: Position): boolean {
  const dx = point.x - explosion.position.x;
  const dy = point.y - explosion.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= EXPLOSION_RADIUS;
}

/**
 * Get the distance from a point to the explosion center.
 */
export function getDistanceToExplosion(explosion: ExplosionState, point: Position): number {
  const dx = point.x - explosion.position.x;
  const dy = point.y - explosion.position.y;
  return Math.sqrt(dx * dx + dy * dy);
}
