/**
 * Tank-fall physics (tanks-311).
 *
 * When the ground beneath a tank is destroyed, the tank settles down onto the new
 * (lower) surface. The fall is deliberately gentle and delayed: it waits a beat so
 * the explosion animation finishes, then eases the tank down under a light gravity.
 *
 * Coordinates are WORLD units (y increases upward), matching TankState.position.
 * Falling therefore DECREASES y from the floating start toward the lower target.
 */
import type { TankState, TerrainData } from '../types/game';
import { calculateTankPosition } from './tank';

/** Delay (ms) after impact before a tank begins to fall — lets the blast finish. */
export const FALL_DELAY_MS = 700;

/** Gravity for the fall animation (world px/s²). Gentle, for a slow visible settle. */
export const FALL_GRAVITY = 380;

/**
 * A tank counts as "floating" (and should fall) only if its center is at least this
 * many world px above the new surface — avoids jitter on tiny terrain changes.
 */
export const FALL_THRESHOLD = 4;

/**
 * Compute a falling tank's current world-y and whether it has landed.
 *
 * Before `startTime` the tank holds at `startY` (the pre-fall delay). After that it
 * accelerates down under `gravity` until it reaches `targetY`.
 *
 * @param startY     World-y where the fall begins (the floating position).
 * @param targetY    World-y of the new surface (lower than startY).
 * @param startTime  Absolute ms when the fall should begin (impact time + delay).
 * @param currentTime Absolute ms now.
 * @param gravity    Fall gravity in world px/s². Defaults to {@link FALL_GRAVITY}.
 */
export function getFallPosition(
  startY: number,
  targetY: number,
  startTime: number,
  currentTime: number,
  gravity: number = FALL_GRAVITY
): { y: number; complete: boolean } {
  // Nothing to fall to (already at or below the target).
  if (targetY >= startY) {
    return { y: targetY, complete: true };
  }
  const elapsed = currentTime - startTime;
  // Still in the pre-fall delay: hold at the floating position.
  if (elapsed <= 0) {
    return { y: startY, complete: false };
  }
  const t = elapsed / 1000;
  const dropped = 0.5 * gravity * t * t;
  const y = startY - dropped;
  if (y <= targetY) {
    return { y: targetY, complete: true };
  }
  return { y, complete: false };
}

/**
 * If the tank is now floating above the terrain surface (its ground was destroyed),
 * return the world-y it should settle onto; otherwise null (it's still grounded).
 */
export function getTankSettleTargetY(tank: TankState, terrain: TerrainData): number | null {
  const surface = calculateTankPosition(terrain, Math.round(tank.position.x));
  return tank.position.y > surface.y + FALL_THRESHOLD ? surface.y : null;
}
