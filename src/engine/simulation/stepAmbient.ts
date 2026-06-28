/**
 * Pure simulation step for ambient visual effects.
 *
 * Advances the two purely cosmetic systems that the renderer previously drove
 * directly from App.tsx's `handleRender`:
 *  - the wind particle system (background drifting particles), and
 *  - floating "+$" money animations.
 *
 * This step is PURE: it contains no React, DOM, canvas, `window`,
 * `performance.now`, or `console` usage, and it never renders. It does not
 * mutate its inputs; it returns fresh objects/arrays. (The reused engine
 * helpers `createWindParticleSystem` / `updateWindParticles` may read
 * `Math.random` / `performance.now` internally — that is pre-existing behavior
 * of those functions, not a new side effect introduced here.)
 *
 * All time-based logic is driven by `ctx.now` (an absolute timestamp supplied
 * by the host) and the per-step delta `dtMs`, so the step is deterministic for
 * a given set of inputs apart from the reused helpers' internal randomness.
 */
import {
  createWindParticleSystem,
  updateWindParticles,
  updateMoneyAnimation,
  isMoneyAnimationComplete,
  type WindParticleSystemState,
  type MoneyAnimationState,
} from '../index';
import type { TickContext, SimEvent } from './types';

/** Result of advancing the ambient effects for a single step. */
export interface StepAmbientResult {
  /** The (possibly recreated) and advanced wind particle system. Never null. */
  windParticles: WindParticleSystemState;
  /** Surviving money animations after advancing; finished ones are dropped. */
  moneyAnimations: MoneyAnimationState[];
  /** Ambient effects emit no domain events; always empty. */
  events: SimEvent[];
}

/**
 * Advance ambient effects (wind particles + money animations) by one step.
 *
 * Wind particles: if `windParticles` is null, or its stored canvas dimensions
 * differ from `ctx.canvasWidth` / `ctx.canvasHeight`, a fresh system sized to
 * `ctx` is created first. The system is then advanced via `updateWindParticles`
 * using the current wind (`ctx.wind`), the absolute time (`ctx.now`), and the
 * step delta (`dtMs`).
 *
 * Money animations: each active animation is advanced via `updateMoneyAnimation`
 * against `ctx.now`; finished animations (and any already-inactive ones) are
 * dropped. The input array is never mutated — a new array is returned.
 *
 * @param windParticles Existing wind particle system, or null to create one.
 * @param moneyAnimations Current floating money animations.
 * @param dtMs Elapsed time since the previous step, in milliseconds.
 * @param ctx Read-only per-step context (canvas size, wind, current time).
 */
export function stepAmbient(
  windParticles: WindParticleSystemState | null,
  moneyAnimations: MoneyAnimationState[],
  dtMs: number,
  ctx: TickContext
): StepAmbientResult {
  // (Re)create the wind particle system when missing or when the canvas size
  // changed since it was created. createWindParticleSystem returns a new object,
  // so the caller's input is never mutated.
  let system = windParticles;
  if (
    !system ||
    system.canvasWidth !== ctx.canvasWidth ||
    system.canvasHeight !== ctx.canvasHeight
  ) {
    system = createWindParticleSystem(ctx.canvasWidth, ctx.canvasHeight);
  }

  // updateWindParticles returns a fresh system (spreads its input), so this does
  // not mutate `windParticles`.
  const updatedWindParticles = updateWindParticles(
    system,
    ctx.wind,
    ctx.now,
    dtMs
  );

  // Advance money animations into a brand-new array; never mutate the input.
  const updatedMoneyAnimations: MoneyAnimationState[] = [];
  for (const anim of moneyAnimations) {
    // Skip animations the host already marked inactive.
    if (!anim.isActive) continue;

    const updated = updateMoneyAnimation(anim, ctx.now);

    // Drop finished animations; keep the rest.
    if (isMoneyAnimationComplete(updated, ctx.now)) continue;

    updatedMoneyAnimations.push(updated);
  }

  return {
    windParticles: updatedWindParticles,
    moneyAnimations: updatedMoneyAnimations,
    events: [],
  };
}
