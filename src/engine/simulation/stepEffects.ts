/**
 * Pure simulation step for purely-visual effect lifecycles: weapon explosions
 * and tank-destruction animations.
 *
 * Each effect is advanced one frame ({@link updateExplosion} /
 * {@link updateTankDestruction}, which integrate per-particle motion using the
 * frame delta) and then culled if it has finished (its time-based animation has
 * passed `startTime + duration`). This is the pure, headless port of the
 * update-then-remove-finished loop previously inlined in App.tsx's render loop
 * (`explosionsRef` / `destructionsRef`): no React, DOM, canvas, `window`,
 * `performance.now`, `console`, or sound, and no mutation of the inputs.
 *
 * Events: this step emits none. The host owns gameplay events such as
 * `TankDestroyed` (fired when a tank's health hits 0, not when its animation
 * ends). The visual completion of an explosion/destruction has no downstream
 * simulation consequence, so `events` is always empty — but it is returned for
 * signature symmetry with other simulation steps.
 */
import {
  updateExplosion,
  isExplosionComplete,
  updateTankDestruction,
  isDestructionComplete,
  type ExplosionState,
  type TankDestructionState,
} from '../index';
import type { SimEvent } from './types';

/** Result of advancing the visual-effect lifecycles by one step. */
export interface StepEffectsResult {
  /** Explosions still active at `now` (finished ones removed). */
  explosions: ExplosionState[];
  /** Tank-destruction animations still active at `now` (finished ones removed). */
  destructions: TankDestructionState[];
  /** Always empty — visual completion produces no simulation events. */
  events: SimEvent[];
}

/**
 * Advance the explosion and tank-destruction lifecycles to `now`, dropping any
 * that have finished.
 *
 * An effect is dropped when it is no longer active — either because its
 * `isActive` flag is already `false`, or because its time-based animation has
 * completed at `now`. Surviving effects are returned by reference inside fresh
 * arrays; neither the input arrays nor their elements are mutated.
 *
 * @param explosions   Current explosion animations.
 * @param destructions Current tank-destruction animations.
 * @param now          Absolute timestamp (ms), same clock as each effect's
 *                     `startTime`.
 * @param dtMs         Frame delta in milliseconds, for per-particle integration.
 */
export function stepEffects(
  explosions: ExplosionState[],
  destructions: TankDestructionState[],
  now: number,
  dtMs: number
): StepEffectsResult {
  const liveExplosions: ExplosionState[] = [];
  for (const explosion of explosions) {
    if (!explosion.isActive) continue;
    const updated = updateExplosion(explosion, now, dtMs);
    if (isExplosionComplete(updated, now)) continue;
    liveExplosions.push(updated);
  }

  const liveDestructions: TankDestructionState[] = [];
  for (const destruction of destructions) {
    if (!destruction.isActive) continue;
    const updated = updateTankDestruction(destruction, now, dtMs);
    if (isDestructionComplete(updated, now)) continue;
    liveDestructions.push(updated);
  }

  return {
    explosions: liveExplosions,
    destructions: liveDestructions,
    events: [],
  };
}
