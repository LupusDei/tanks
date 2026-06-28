/**
 * Pure simulation step for purely-visual effect lifecycles: weapon explosions
 * and tank-destruction animations.
 *
 * Both effect types are TIME-BASED: each carries a `startTime` and a duration
 * (see {@link isExplosionComplete} / {@link isDestructionComplete}). An effect
 * is "finished" once `now` passes `startTime + duration`. This step therefore
 * does not advance per-particle visual state (that is a render-layer concern
 * requiring a frame delta) — it advances the LIFECYCLE: it computes, at `now`,
 * which effects are still alive and returns new arrays containing only those.
 *
 * This mirrors the "remove finished" behaviour previously inlined in App.tsx's
 * render loop (`explosionsRef` / `destructionsRef` filtering), but as a pure
 * function: no React, DOM, canvas, `window`, `performance.now`, `console`, or
 * sound, and no mutation of the inputs.
 *
 * Events: this step emits none. The host owns gameplay events such as
 * `TankDestroyed` (fired when a tank's health hits 0, not when its animation
 * ends). The visual completion of an explosion/destruction has no downstream
 * simulation consequence, so `events` is always empty — but it is returned for
 * signature symmetry with other simulation steps.
 */
import {
  isExplosionComplete,
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
 */
export function stepEffects(
  explosions: ExplosionState[],
  destructions: TankDestructionState[],
  now: number
): StepEffectsResult {
  const liveExplosions = explosions.filter(
    (explosion) => explosion.isActive && !isExplosionComplete(explosion, now)
  );

  const liveDestructions = destructions.filter(
    (destruction) => destruction.isActive && !isDestructionComplete(destruction, now)
  );

  return {
    explosions: liveExplosions,
    destructions: liveDestructions,
    events: [],
  };
}
