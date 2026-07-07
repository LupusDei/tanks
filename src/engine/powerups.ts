/**
 * Battlefield power-ups (tanks-317).
 *
 * Glowing crates spawn on the terrain surface. When a tank's explosion overlaps a
 * crate, the SHOOTER collects it and gains a temporary boost. Three types, each
 * reusing an existing game system:
 *   - shield: energy shield HP (absorbs incoming damage)
 *   - fuel:   refuels the tank (more repositioning)
 *   - bouncy: the tank's next shots ricochet off terrain (weapon bounce logic)
 *
 * This module is PURE (no React/DOM). Rendering + effect application live in the host.
 */
import type { Position, TerrainData, PowerUp, PowerUpType } from '../types/game';
import { getTerrainHeightAt } from './terrain';

export type { PowerUp, PowerUpType };

/** All power-up types, in a stable order (used as the default spawn pool). */
export const POWERUP_TYPES: PowerUpType[] = ['shield', 'fuel', 'bouncy'];

// --- Effect magnitudes ---------------------------------------------------------
/** Energy shield HP granted by a shield crate. */
export const POWERUP_SHIELD_HP = 50;
/** Fuel granted by a fuel crate (a full tank is 100). */
export const POWERUP_FUEL_AMOUNT = 100;
/** Number of subsequent shots made bouncy by a bouncy crate. */
export const POWERUP_BOUNCY_SHOTS = 3;
/** Bounces per shot while bouncy is active. */
export const POWERUP_BOUNCY_BOUNCES = 3;

/** Visual + label config per power-up type (host uses this to render + toast). */
export const POWERUP_CONFIGS: Record<
  PowerUpType,
  { label: string; short: string; color: string; glow: string }
> = {
  shield: { label: 'Shield!', short: 'SHIELD', color: '#3399ff', glow: '#66ccff' },
  fuel: { label: 'Fuel Boost!', short: 'FUEL', color: '#33cc55', glow: '#88ff99' },
  bouncy: { label: 'Bouncy Shots!', short: 'BOUNCY', color: '#ff9933', glow: '#ffcc66' },
};

/** How high (world px) the crate floats above the terrain surface. */
export const POWERUP_FLOAT_HEIGHT = 26;
/** Collision radius (world px) of a crate for blast-overlap collection. */
export const POWERUP_RADIUS = 16;

export interface SpawnPowerUpsOptions {
  terrain: TerrainData;
  /** Existing tanks (crates are kept clear of them). */
  tanks: readonly { position: Position }[];
  /** How many crates to place. */
  count: number;
  /** Deterministic RNG in [0,1). Defaults to Math.random. */
  rng?: () => number;
  /** Prefix for generated crate ids (must be unique per spawn batch). */
  idPrefix?: string;
  /** Types to draw from (defaults to all). */
  types?: PowerUpType[];
  /** Min horizontal gap (px) from any tank and from other crates. */
  minGap?: number;
  /** World px the crate floats above the surface. */
  floatHeight?: number;
}

/**
 * Place `count` power-up crates on the terrain surface, spaced out and clear of
 * tanks. Returns fewer than `count` only if it can't find room after many tries.
 */
export function spawnPowerUps(opts: SpawnPowerUpsOptions): PowerUp[] {
  const {
    terrain,
    tanks,
    count,
    rng = Math.random,
    idPrefix = 'pu',
    types = POWERUP_TYPES,
    minGap = 70,
    floatHeight = POWERUP_FLOAT_HEIGHT,
  } = opts;

  if (count <= 0 || types.length === 0) return [];

  const margin = 40;
  const minX = margin;
  const maxX = Math.max(margin, terrain.width - margin);
  const placed: PowerUp[] = [];
  const takenX: number[] = tanks.map((t) => t.position.x);

  const maxAttempts = count * 30;
  let attempts = 0;
  while (placed.length < count && attempts < maxAttempts) {
    attempts++;
    const x = Math.round(minX + rng() * (maxX - minX));
    if (takenX.some((tx) => Math.abs(tx - x) < minGap)) continue;

    const surface = getTerrainHeightAt(terrain, x);
    if (surface === undefined) continue;

    const type = types[Math.floor(rng() * types.length) % types.length]!;
    placed.push({ id: `${idPrefix}-${placed.length}`, type, x, y: surface + floatHeight });
    takenX.push(x);
  }

  return placed;
}

/**
 * Return the first crate collected by an explosion — its center lies within the
 * blast (plus the crate radius). Null if none.
 *
 * Mirrors checkTankHit's convention: crates are stored in WORLD space (y up), the
 * explosion is in SCREEN space (y down), so the crate's y is converted via
 * `canvasHeight - y` before comparing.
 */
export function findCollectedPowerUp(
  powerUps: readonly PowerUp[],
  explosionScreenPos: Position,
  canvasHeight: number,
  blastRadius: number
): PowerUp | null {
  const reach = blastRadius + POWERUP_RADIUS;
  for (const pu of powerUps) {
    const dx = pu.x - explosionScreenPos.x;
    const dy = canvasHeight - pu.y - explosionScreenPos.y;
    if (dx * dx + dy * dy <= reach * reach) return pu;
  }
  return null;
}

/** Single-letter badge drawn on each crate (icons kept simple for reliable canvas text). */
const POWERUP_BADGE: Record<PowerUpType, string> = { shield: 'S', fuel: 'F', bouncy: 'B' };

/** How long the collect toast ("Shield!") rises and fades. */
export const POWERUP_TOAST_DURATION_MS = 1300;

/** A rising/fading "collected!" label anchored at a crate's world position. */
export interface PowerUpToast {
  text: string;
  color: string;
  x: number;
  y: number;
  startTime: number;
}

/** Draw a rising, fading collect toast. Returns false once it has expired. */
export function renderPowerUpToast(
  ctx: CanvasRenderingContext2D,
  toast: PowerUpToast,
  canvasHeight: number,
  now: number
): boolean {
  const t = (now - toast.startTime) / POWERUP_TOAST_DURATION_MS;
  if (t >= 1) return false;
  const x = toast.x;
  const y = canvasHeight - toast.y - 28 - t * 44;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t);
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(toast.text, x, y);
  ctx.fillStyle = toast.color;
  ctx.fillText(toast.text, x, y);
  ctx.restore();
  return true;
}

/**
 * Draw a glowing, gently-bobbing power-up crate on the canvas at its world position.
 * `now` drives the float + pulse animation. Pure drawing (no state).
 */
export function renderPowerUp(
  ctx: CanvasRenderingContext2D,
  powerUp: PowerUp,
  canvasHeight: number,
  now: number
): void {
  const cfg = POWERUP_CONFIGS[powerUp.type];
  const size = POWERUP_RADIUS * 2;
  const half = size / 2;
  // Gentle bob + glow pulse, phase-offset per crate so they don't move in lockstep.
  const phase = now * 0.004 + powerUp.x * 0.05;
  const bob = Math.sin(phase) * 4;
  const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(phase * 1.6));
  const x = powerUp.x;
  const y = canvasHeight - powerUp.y + bob;

  ctx.save();
  ctx.translate(x, y);

  // Glow halo.
  ctx.shadowColor = cfg.glow;
  ctx.shadowBlur = 18 * pulse;

  // Crate body (rounded square).
  ctx.beginPath();
  const r = 6;
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(-half, -half, size, size, r);
  } else {
    ctx.rect(-half, -half, size, size);
  }
  ctx.fillStyle = cfg.color;
  ctx.fill();

  // Bright border.
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = cfg.glow;
  ctx.stroke();

  // Letter badge.
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(size * 0.62)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(POWERUP_BADGE[powerUp.type], 0, 1);

  ctx.restore();
}
