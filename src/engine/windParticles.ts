import { MAX_WIND } from './wind';

/**
 * Wind particle system for subtle ambient wind visualization.
 * Particles are ephemeral with trace lines, moving in the direction of wind.
 */

/** Maximum number of active particles */
const MAX_PARTICLES = 60;

/** Particle lifetime in milliseconds */
const PARTICLE_LIFETIME_MS = 4000;

/** Base particle speed multiplier (pixels per second per m/s of wind) */
const SPEED_MULTIPLIER = 3.5;

/** Minimum wind speed to show particles (m/s) */
const MIN_WIND_FOR_PARTICLES = 2;

/** Trace line length as multiple of speed */
const TRACE_LENGTH_FACTOR = 0.12;

/** Spawn rate: particles per second at max wind */
const MAX_SPAWN_RATE = 25;

/**
 * A single wind particle with position, velocity, and trace.
 */
export interface WindParticle {
  /** Current x position (screen coordinates) */
  x: number;
  /** Current y position (screen coordinates) */
  y: number;
  /** Horizontal velocity (pixels per second) */
  vx: number;
  /** Vertical velocity (pixels per second, slight drift) */
  vy: number;
  /** Time when particle was created */
  spawnTime: number;
  /** Particle opacity (0-1) */
  opacity: number;
  /** Particle size (radius in pixels) */
  size: number;
  /** Previous positions for trace line */
  trace: { x: number; y: number }[];
}

/**
 * State of the wind particle system.
 */
export interface WindParticleSystemState {
  /** Active particles */
  particles: WindParticle[];
  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;
  /** Time of last spawn */
  lastSpawnTime: number;
  /** Accumulated spawn time for sub-frame spawning */
  spawnAccumulator: number;
}

/**
 * Create a new wind particle system state.
 */
export function createWindParticleSystem(
  canvasWidth: number,
  canvasHeight: number
): WindParticleSystemState {
  return {
    particles: [],
    canvasWidth,
    canvasHeight,
    lastSpawnTime: performance.now(),
    spawnAccumulator: 0,
  };
}

/**
 * Spawn a new particle at a random position.
 * Particles spawn in the middle 50% of the screen horizontally.
 */
function spawnParticle(
  state: WindParticleSystemState,
  wind: number,
  currentTime: number
): WindParticle {
  const { canvasWidth, canvasHeight } = state;
  const windStrength = Math.abs(wind) / MAX_WIND;

  // Spawn in the middle 50% of the screen (25% to 75% of width)
  const spawnRangeStart = canvasWidth * 0.25;
  const spawnRangeWidth = canvasWidth * 0.5;
  const x = spawnRangeStart + Math.random() * spawnRangeWidth;

  // Random y position across the upper portion of the screen (sky area)
  const y = Math.random() * canvasHeight * 0.7;

  // Velocity based on wind speed with some variance
  const baseSpeed = Math.abs(wind) * SPEED_MULTIPLIER;
  const speedVariance = 0.7 + Math.random() * 0.6;
  const vx = Math.sign(wind) * baseSpeed * speedVariance;

  // Slight vertical drift (can be up or down)
  const vy = (Math.random() - 0.4) * 15;

  // Subtle opacity with variance, stronger wind = slightly more visible
  const baseOpacity = 0.08 + windStrength * 0.12;
  const opacity = baseOpacity * (0.6 + Math.random() * 0.8);

  // Small size with variance
  const size = 0.8 + Math.random() * 1.2;

  return {
    x,
    y,
    vx,
    vy,
    spawnTime: currentTime,
    opacity,
    size,
    trace: [],
  };
}

/**
 * Update the wind particle system for the current frame.
 */
export function updateWindParticles(
  state: WindParticleSystemState,
  wind: number,
  currentTime: number,
  deltaTimeMs: number
): WindParticleSystemState {
  const absWind = Math.abs(wind);

  // Don't show particles for very light wind
  if (absWind < MIN_WIND_FOR_PARTICLES) {
    return {
      ...state,
      particles: [],
      spawnAccumulator: 0,
    };
  }

  const deltaSeconds = deltaTimeMs / 1000;
  const windStrength = absWind / MAX_WIND;

  // Calculate spawn rate based on wind strength
  const spawnRate = MAX_SPAWN_RATE * windStrength;
  const spawnInterval = 1000 / spawnRate;

  // Accumulate spawn time
  let spawnAccumulator = state.spawnAccumulator + deltaTimeMs;
  const newParticles: WindParticle[] = [];

  // Spawn new particles based on accumulated time
  while (spawnAccumulator >= spawnInterval && state.particles.length + newParticles.length < MAX_PARTICLES) {
    newParticles.push(spawnParticle(state, wind, currentTime));
    spawnAccumulator -= spawnInterval;
  }

  // Update existing particles
  const updatedParticles: WindParticle[] = [];

  for (const particle of [...state.particles, ...newParticles]) {
    const age = currentTime - particle.spawnTime;

    // Remove expired particles
    if (age >= PARTICLE_LIFETIME_MS) {
      continue;
    }

    // Remove particles that have left the screen (with margin)
    const margin = 50;
    if (
      particle.x < -margin ||
      particle.x > state.canvasWidth + margin ||
      particle.y < -margin ||
      particle.y > state.canvasHeight + margin
    ) {
      continue;
    }

    // Add current position to trace before moving
    const maxTraceLength = Math.max(3, Math.floor(Math.abs(particle.vx) * TRACE_LENGTH_FACTOR));
    const newTrace = [
      { x: particle.x, y: particle.y },
      ...particle.trace.slice(0, maxTraceLength - 1),
    ];

    // Update position
    const newX = particle.x + particle.vx * deltaSeconds;
    const newY = particle.y + particle.vy * deltaSeconds;

    // Fade out near end of life
    const lifeProgress = age / PARTICLE_LIFETIME_MS;
    const fadeStart = 0.6;
    const fadeFactor = lifeProgress > fadeStart
      ? 1 - (lifeProgress - fadeStart) / (1 - fadeStart)
      : 1;

    updatedParticles.push({
      ...particle,
      x: newX,
      y: newY,
      opacity: particle.opacity * fadeFactor,
      trace: newTrace,
    });
  }

  return {
    ...state,
    particles: updatedParticles,
    lastSpawnTime: currentTime,
    spawnAccumulator,
  };
}

/**
 * Render wind particles on the canvas.
 * Draws subtle particles with trace lines.
 */
export function renderWindParticles(
  ctx: CanvasRenderingContext2D,
  state: WindParticleSystemState
): void {
  if (state.particles.length === 0) return;

  ctx.save();

  for (const particle of state.particles) {
    // Skip nearly invisible particles
    if (particle.opacity < 0.01) continue;

    // Draw trace line
    if (particle.trace.length > 0) {
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);

      for (let i = 0; i < particle.trace.length; i++) {
        const tracePoint = particle.trace[i]!;
        ctx.lineTo(tracePoint.x, tracePoint.y);
      }

      // Gradient stroke for trace (fades out)
      const traceOpacity = particle.opacity * 0.4;
      ctx.strokeStyle = `rgba(200, 200, 200, ${traceOpacity})`;
      ctx.lineWidth = particle.size * 0.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Draw particle
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 220, 220, ${particle.opacity})`;
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Reset the wind particle system (e.g., when terrain changes).
 */
export function resetWindParticles(
  state: WindParticleSystemState
): WindParticleSystemState {
  return {
    ...state,
    particles: [],
    spawnAccumulator: 0,
  };
}
