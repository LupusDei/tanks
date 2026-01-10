import type { Position, TankState, DestructionCategory } from '../types/game';
import { getDestructionCategory } from './weapons';
import { getTankColorHex } from './tank';

/**
 * Duration of tank destruction animation in milliseconds.
 */
export const DESTRUCTION_DURATION_MS = 2000;

/**
 * Types of debris pieces from a destroyed tank.
 */
export type DebrisType = 'hull_front' | 'hull_rear' | 'hull_side' | 'turret' | 'barrel' | 'track' | 'wheel';

/**
 * Individual debris piece from a destroyed tank.
 */
export interface TankDebris {
  type: DebrisType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  life: number; // 0 to 1, decreases over time
}

/**
 * Smoke/fire particle for destruction effects.
 */
export interface DestructionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
}

/**
 * State of a tank destruction animation.
 */
export interface TankDestructionState {
  tankId: string;
  position: Position;
  canvasY: number; // Pre-computed canvas Y coordinate
  startTime: number;
  debris: TankDebris[];
  particles: DestructionParticle[];
  isActive: boolean;
  category: DestructionCategory;
  tankColor: string;
}

/**
 * Tank dimensions used for debris generation.
 */
const TANK_DIMS = {
  bodyWidth: 50,
  bodyHeight: 16,
  turretLength: 30,
  turretWidth: 6,
  wheelRadius: 5,
  domeRadius: 12.5, // bodyWidth / 4
};

/**
 * Create debris pieces for explosive destruction.
 * The tank explodes outward with parts flying in all directions.
 */
function createExplosiveDebris(
  centerX: number,
  centerY: number,
  tankColor: string
): TankDebris[] {
  const debris: TankDebris[] = [];
  const baseForce = 150; // Base explosion force

  // Hull front piece - flies forward/up
  debris.push({
    type: 'hull_front',
    x: centerX - TANK_DIMS.bodyWidth / 4,
    y: centerY,
    vx: -80 - Math.random() * 40,
    vy: -120 - Math.random() * 60,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 10,
    width: TANK_DIMS.bodyWidth / 2,
    height: TANK_DIMS.bodyHeight,
    color: tankColor,
    life: 1,
  });

  // Hull rear piece - flies backward/up
  debris.push({
    type: 'hull_rear',
    x: centerX + TANK_DIMS.bodyWidth / 4,
    y: centerY,
    vx: 60 + Math.random() * 40,
    vy: -100 - Math.random() * 50,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 8,
    width: TANK_DIMS.bodyWidth / 2,
    height: TANK_DIMS.bodyHeight,
    color: tankColor,
    life: 1,
  });

  // Turret dome - launches high into the air
  debris.push({
    type: 'turret',
    x: centerX,
    y: centerY - TANK_DIMS.bodyHeight / 2,
    vx: (Math.random() - 0.5) * 60,
    vy: -200 - Math.random() * 100, // High upward velocity
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 15,
    width: TANK_DIMS.domeRadius * 2,
    height: TANK_DIMS.domeRadius,
    color: darkenColor(tankColor, 0.3),
    life: 1,
  });

  // Barrel - spins off
  debris.push({
    type: 'barrel',
    x: centerX,
    y: centerY - TANK_DIMS.bodyHeight / 2,
    vx: 100 + Math.random() * 50,
    vy: -150 - Math.random() * 50,
    rotation: Math.random() * Math.PI,
    rotationSpeed: 12 + Math.random() * 8,
    width: TANK_DIMS.turretLength,
    height: TANK_DIMS.turretWidth,
    color: darkenColor(tankColor, 0.4),
    life: 1,
  });

  // Left track segment
  debris.push({
    type: 'track',
    x: centerX - TANK_DIMS.bodyWidth / 3,
    y: centerY + TANK_DIMS.bodyHeight / 2,
    vx: -100 - Math.random() * 40,
    vy: -60 - Math.random() * 40,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 6,
    width: TANK_DIMS.bodyWidth / 2,
    height: TANK_DIMS.wheelRadius * 2,
    color: '#2a2a2a',
    life: 1,
  });

  // Right track segment
  debris.push({
    type: 'track',
    x: centerX + TANK_DIMS.bodyWidth / 3,
    y: centerY + TANK_DIMS.bodyHeight / 2,
    vx: 100 + Math.random() * 40,
    vy: -50 - Math.random() * 30,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 6,
    width: TANK_DIMS.bodyWidth / 2,
    height: TANK_DIMS.wheelRadius * 2,
    color: '#2a2a2a',
    life: 1,
  });

  // Scatter some wheels
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
    const speed = baseForce * 0.6 + Math.random() * 40;
    debris.push({
      type: 'wheel',
      x: centerX + (Math.random() - 0.5) * TANK_DIMS.bodyWidth,
      y: centerY + TANK_DIMS.bodyHeight / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      rotation: 0,
      rotationSpeed: 15 + Math.random() * 10,
      width: TANK_DIMS.wheelRadius * 2,
      height: TANK_DIMS.wheelRadius * 2,
      color: '#555555',
      life: 1,
    });
  }

  return debris;
}

/**
 * Create debris pieces for ballistic destruction.
 * The tank crumbles apart with parts falling due to gravity.
 * More subdued than explosive - minimal horizontal velocity.
 */
function createBallisticDebris(
  centerX: number,
  centerY: number,
  tankColor: string
): TankDebris[] {
  const debris: TankDebris[] = [];

  // Hull front piece - tips forward slightly and falls
  debris.push({
    type: 'hull_front',
    x: centerX - TANK_DIMS.bodyWidth / 4,
    y: centerY,
    vx: -15 - Math.random() * 10,
    vy: -20 - Math.random() * 15,
    rotation: 0,
    rotationSpeed: 1 + Math.random() * 2,
    width: TANK_DIMS.bodyWidth / 2,
    height: TANK_DIMS.bodyHeight,
    color: tankColor,
    life: 1,
  });

  // Hull rear piece - tips backward and falls
  debris.push({
    type: 'hull_rear',
    x: centerX + TANK_DIMS.bodyWidth / 4,
    y: centerY,
    vx: 10 + Math.random() * 10,
    vy: -15 - Math.random() * 10,
    rotation: 0,
    rotationSpeed: -(1 + Math.random() * 2),
    width: TANK_DIMS.bodyWidth / 2,
    height: TANK_DIMS.bodyHeight,
    color: tankColor,
    life: 1,
  });

  // Turret dome - tips over and falls to one side
  const turretDirection = Math.random() > 0.5 ? 1 : -1;
  debris.push({
    type: 'turret',
    x: centerX,
    y: centerY - TANK_DIMS.bodyHeight / 2,
    vx: turretDirection * (20 + Math.random() * 15),
    vy: -30 - Math.random() * 20,
    rotation: 0,
    rotationSpeed: turretDirection * (3 + Math.random() * 2),
    width: TANK_DIMS.domeRadius * 2,
    height: TANK_DIMS.domeRadius,
    color: darkenColor(tankColor, 0.3),
    life: 1,
  });

  // Barrel - detaches and falls
  debris.push({
    type: 'barrel',
    x: centerX + 10,
    y: centerY - TANK_DIMS.bodyHeight / 2,
    vx: 15 + Math.random() * 10,
    vy: -10 - Math.random() * 10,
    rotation: Math.random() * 0.3 - 0.15,
    rotationSpeed: 2 + Math.random() * 3,
    width: TANK_DIMS.turretLength,
    height: TANK_DIMS.turretWidth,
    color: darkenColor(tankColor, 0.4),
    life: 1,
  });

  // Left track - slides off to the left
  debris.push({
    type: 'track',
    x: centerX - TANK_DIMS.bodyWidth / 3,
    y: centerY + TANK_DIMS.bodyHeight / 2,
    vx: -25 - Math.random() * 10,
    vy: -5 - Math.random() * 5,
    rotation: 0,
    rotationSpeed: 0.5 + Math.random() * 0.5,
    width: TANK_DIMS.bodyWidth / 2,
    height: TANK_DIMS.wheelRadius * 2,
    color: '#2a2a2a',
    life: 1,
  });

  // Right track - slides off to the right
  debris.push({
    type: 'track',
    x: centerX + TANK_DIMS.bodyWidth / 3,
    y: centerY + TANK_DIMS.bodyHeight / 2,
    vx: 25 + Math.random() * 10,
    vy: -5 - Math.random() * 5,
    rotation: 0,
    rotationSpeed: -(0.5 + Math.random() * 0.5),
    width: TANK_DIMS.bodyWidth / 2,
    height: TANK_DIMS.wheelRadius * 2,
    color: '#2a2a2a',
    life: 1,
  });

  // A few wheels fall off and roll
  for (let i = 0; i < 3; i++) {
    const side = i === 0 ? -1 : i === 1 ? 1 : (Math.random() - 0.5) * 2;
    debris.push({
      type: 'wheel',
      x: centerX + side * (TANK_DIMS.bodyWidth / 3) + (Math.random() - 0.5) * 10,
      y: centerY + TANK_DIMS.bodyHeight / 2,
      vx: side * (10 + Math.random() * 15),
      vy: -10 - Math.random() * 15,
      rotation: 0,
      rotationSpeed: side * (4 + Math.random() * 4),
      width: TANK_DIMS.wheelRadius * 2,
      height: TANK_DIMS.wheelRadius * 2,
      color: '#555555',
      life: 1,
    });
  }

  return debris;
}

/**
 * Create dust and debris particles for ballistic destruction.
 * No fire - just dust and small metal fragments.
 */
function createBallisticParticles(
  centerX: number,
  centerY: number
): DestructionParticle[] {
  const particles: DestructionParticle[] = [];
  // Dust colors - browns, tans, grays
  const colors = ['#8b7355', '#a0926c', '#6b5b45', '#777777', '#999999', '#5c4a3a', '#4a4a4a'];
  const particleCount = 20;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 40; // Much slower than explosive
    const isLargeDust = i < particleCount * 0.3;

    particles.push({
      x: centerX + (Math.random() - 0.5) * 30,
      y: centerY + (Math.random() - 0.5) * 15,
      vx: Math.cos(angle) * speed * 0.6,
      vy: Math.sin(angle) * speed - 15, // Slight upward bias for dust cloud
      radius: isLargeDust ? 6 + Math.random() * 8 : 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      life: 1,
    });
  }

  return particles;
}

/**
 * Create smoke and fire particles for explosive destruction.
 */
function createExplosiveParticles(
  centerX: number,
  centerY: number
): DestructionParticle[] {
  const particles: DestructionParticle[] = [];
  const colors = ['#ff4400', '#ff6600', '#ffaa00', '#ffcc00', '#ff2200', '#333333', '#555555'];
  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    const isSmoke = i > particleCount * 0.6;

    particles.push({
      x: centerX + (Math.random() - 0.5) * 20,
      y: centerY + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30, // Slight upward bias
      radius: isSmoke ? 8 + Math.random() * 12 : 3 + Math.random() * 6,
      color: isSmoke ? colors[5 + Math.floor(Math.random() * 2)]! : colors[Math.floor(Math.random() * 5)]!,
      life: 1,
    });
  }

  return particles;
}

/**
 * Create a tank destruction animation.
 * Supports explosive and ballistic destruction categories.
 */
export function createTankDestruction(
  tank: TankState,
  canvasHeight: number,
  startTime: number = performance.now()
): TankDestructionState | null {
  if (!tank.killedByWeapon) {
    return null;
  }

  const category = getDestructionCategory(tank.killedByWeapon);

  // Fire category will be implemented in a separate task
  if (category === 'fire') {
    return null;
  }

  const canvasY = canvasHeight - tank.position.y;
  const tankColor = getTankColorHex(tank.color);

  let debris: TankDebris[];
  let particles: DestructionParticle[];

  if (category === 'explosive') {
    debris = createExplosiveDebris(tank.position.x, canvasY, tankColor);
    particles = createExplosiveParticles(tank.position.x, canvasY);
  } else {
    // ballistic
    debris = createBallisticDebris(tank.position.x, canvasY, tankColor);
    particles = createBallisticParticles(tank.position.x, canvasY);
  }

  return {
    tankId: tank.id,
    position: { ...tank.position },
    canvasY,
    startTime,
    debris,
    particles,
    isActive: true,
    category,
    tankColor,
  };
}

/**
 * Get the progress of a destruction animation (0 to 1).
 */
export function getDestructionProgress(destruction: TankDestructionState, currentTime: number): number {
  const elapsed = currentTime - destruction.startTime;
  return Math.min(1, elapsed / DESTRUCTION_DURATION_MS);
}

/**
 * Check if a destruction animation is complete.
 */
export function isDestructionComplete(destruction: TankDestructionState, currentTime: number): boolean {
  return getDestructionProgress(destruction, currentTime) >= 1;
}

/**
 * Update destruction animation state for the current frame.
 */
export function updateTankDestruction(
  destruction: TankDestructionState,
  currentTime: number,
  deltaTimeMs: number
): TankDestructionState {
  if (!destruction.isActive) return destruction;

  const progress = getDestructionProgress(destruction, currentTime);
  const deltaSeconds = deltaTimeMs / 1000;
  const gravity = 400; // Pixels per second squared

  // Update debris
  const updatedDebris = destruction.debris.map((piece) => {
    const newX = piece.x + piece.vx * deltaSeconds;
    const newY = piece.y + piece.vy * deltaSeconds;
    const newVy = piece.vy + gravity * deltaSeconds;
    const newRotation = piece.rotation + piece.rotationSpeed * deltaSeconds;

    // Slow down horizontal velocity due to air resistance
    const newVx = piece.vx * 0.995;

    // Fade out over time
    const newLife = Math.max(0, piece.life - deltaSeconds * 0.4);

    return {
      ...piece,
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
      rotation: newRotation,
      life: newLife,
    };
  });

  // Update particles
  const updatedParticles = destruction.particles.map((particle) => ({
    ...particle,
    x: particle.x + particle.vx * deltaSeconds,
    y: particle.y + particle.vy * deltaSeconds,
    vy: particle.vy + gravity * 0.3 * deltaSeconds, // Particles fall slower
    life: Math.max(0, particle.life - deltaSeconds * 0.8),
  }));

  if (progress >= 1) {
    return { ...destruction, isActive: false, debris: updatedDebris, particles: updatedParticles };
  }

  return {
    ...destruction,
    debris: updatedDebris,
    particles: updatedParticles,
  };
}

/**
 * Render a single debris piece.
 */
function renderDebrisPiece(
  ctx: CanvasRenderingContext2D,
  debris: TankDebris
): void {
  if (debris.life <= 0) return;

  ctx.save();
  ctx.translate(debris.x, debris.y);
  ctx.rotate(debris.rotation);
  ctx.globalAlpha = debris.life;

  switch (debris.type) {
    case 'hull_front':
    case 'hull_rear':
    case 'hull_side':
      // Draw hull chunk as irregular polygon
      ctx.fillStyle = debris.color;
      ctx.beginPath();
      ctx.moveTo(-debris.width / 2, -debris.height / 2);
      ctx.lineTo(debris.width / 2 - 4, -debris.height / 2 + 2);
      ctx.lineTo(debris.width / 2, debris.height / 2 - 2);
      ctx.lineTo(-debris.width / 2 + 3, debris.height / 2);
      ctx.closePath();
      ctx.fill();

      // Add edge highlight
      ctx.strokeStyle = lightenColor(debris.color, 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
      break;

    case 'turret':
      // Draw turret dome as half circle
      ctx.fillStyle = debris.color;
      ctx.beginPath();
      ctx.arc(0, 0, debris.width / 2, Math.PI, 0);
      ctx.fill();

      // Dome highlight
      ctx.strokeStyle = lightenColor(debris.color, 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, debris.width / 2 - 2, Math.PI + 0.3, -0.3);
      ctx.stroke();
      break;

    case 'barrel':
      // Draw barrel as elongated rectangle
      ctx.fillStyle = debris.color;
      ctx.beginPath();
      ctx.roundRect(-debris.width / 2, -debris.height / 2, debris.width, debris.height, 2);
      ctx.fill();
      break;

    case 'track':
      // Draw track segment
      ctx.fillStyle = debris.color;
      ctx.beginPath();
      ctx.roundRect(-debris.width / 2, -debris.height / 2, debris.width, debris.height, 3);
      ctx.fill();

      // Track links
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      for (let i = -debris.width / 2; i < debris.width / 2; i += 5) {
        ctx.beginPath();
        ctx.moveTo(i, -debris.height / 2);
        ctx.lineTo(i, debris.height / 2);
        ctx.stroke();
      }
      break;

    case 'wheel':
      // Draw wheel as circle
      ctx.fillStyle = debris.color;
      ctx.beginPath();
      ctx.arc(0, 0, debris.width / 2, 0, Math.PI * 2);
      ctx.fill();

      // Hub
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(0, 0, debris.width / 4, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

/**
 * Render a destruction particle.
 */
function renderDestructionParticle(
  ctx: CanvasRenderingContext2D,
  particle: DestructionParticle
): void {
  if (particle.life <= 0) return;

  ctx.save();
  ctx.globalAlpha = particle.life * 0.8;
  ctx.fillStyle = particle.color;

  // Add glow for fire particles
  if (particle.color.startsWith('#ff')) {
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 8;
  }

  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius * particle.life, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Render the tank destruction animation.
 */
export function renderTankDestruction(
  ctx: CanvasRenderingContext2D,
  destruction: TankDestructionState,
  currentTime: number
): void {
  if (!destruction.isActive) return;

  const progress = getDestructionProgress(destruction, currentTime);

  // Category-specific initial effects
  if (destruction.category === 'explosive') {
    // Draw initial flash for explosive destruction (first 10%)
    if (progress < 0.1) {
      const flashProgress = progress / 0.1;
      const flashRadius = 40 + flashProgress * 30;
      const flashAlpha = 1 - flashProgress;

      ctx.save();
      const gradient = ctx.createRadialGradient(
        destruction.position.x, destruction.canvasY, 0,
        destruction.position.x, destruction.canvasY, flashRadius
      );
      gradient.addColorStop(0, `rgba(255, 255, 200, ${flashAlpha})`);
      gradient.addColorStop(0.3, `rgba(255, 200, 100, ${flashAlpha * 0.8})`);
      gradient.addColorStop(0.6, `rgba(255, 100, 50, ${flashAlpha * 0.4})`);
      gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(destruction.position.x, destruction.canvasY, flashRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (destruction.category === 'ballistic') {
    // Draw impact spark for ballistic destruction (first 5%)
    if (progress < 0.05) {
      const sparkProgress = progress / 0.05;
      const sparkAlpha = 1 - sparkProgress;

      ctx.save();
      ctx.globalAlpha = sparkAlpha * 0.6;
      ctx.fillStyle = '#ffff99';
      ctx.beginPath();
      ctx.arc(destruction.position.x, destruction.canvasY, 8 + sparkProgress * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Render particles (behind debris)
  for (const particle of destruction.particles) {
    renderDestructionParticle(ctx, particle);
  }

  // Render debris pieces
  for (const piece of destruction.debris) {
    renderDebrisPiece(ctx, piece);
  }

  // Category-specific trailing effects
  if (destruction.category === 'explosive') {
    // Draw smoke trail rising from explosion center
    if (progress > 0.1 && progress < 0.8) {
      const smokeAlpha = (1 - (progress - 0.1) / 0.7) * 0.4;
      ctx.save();
      ctx.globalAlpha = smokeAlpha;

      const smokeGradient = ctx.createRadialGradient(
        destruction.position.x, destruction.canvasY - progress * 60, 10,
        destruction.position.x, destruction.canvasY - progress * 60, 30 + progress * 20
      );
      smokeGradient.addColorStop(0, 'rgba(80, 80, 80, 0.6)');
      smokeGradient.addColorStop(0.5, 'rgba(60, 60, 60, 0.3)');
      smokeGradient.addColorStop(1, 'rgba(40, 40, 40, 0)');

      ctx.fillStyle = smokeGradient;
      ctx.beginPath();
      ctx.arc(destruction.position.x, destruction.canvasY - progress * 60, 30 + progress * 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (destruction.category === 'ballistic') {
    // Draw dust cloud settling for ballistic destruction
    if (progress < 0.6) {
      const dustAlpha = (1 - progress / 0.6) * 0.3;
      ctx.save();
      ctx.globalAlpha = dustAlpha;

      const dustGradient = ctx.createRadialGradient(
        destruction.position.x, destruction.canvasY, 5,
        destruction.position.x, destruction.canvasY, 25 + progress * 15
      );
      dustGradient.addColorStop(0, 'rgba(139, 115, 85, 0.5)');
      dustGradient.addColorStop(0.6, 'rgba(107, 91, 69, 0.2)');
      dustGradient.addColorStop(1, 'rgba(90, 74, 58, 0)');

      ctx.fillStyle = dustGradient;
      ctx.beginPath();
      ctx.arc(destruction.position.x, destruction.canvasY, 25 + progress * 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/**
 * Darken a hex color by a factor (0-1).
 */
function darkenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.floor(rgb.r * (1 - factor));
  const g = Math.floor(rgb.g * (1 - factor));
  const b = Math.floor(rgb.b * (1 - factor));

  return rgbToHex(r, g, b);
}

/**
 * Lighten a hex color by a factor (0-1).
 */
function lightenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor));
  const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor));
  const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor));

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
