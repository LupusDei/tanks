/**
 * Composed, pure, fixed-timestep simulation step — the single entry point the
 * host (useGameTick) calls to advance the whole simulation by one tick.
 *
 * Composition order mirrors the legacy App.tsx render loop:
 *   1. Projectiles advance + collide → spawn explosions, emit hit/crater/resolve.
 *   2. Newly spawned explosions are merged, then explosion + destruction visual
 *      lifecycles advance and finished effects are culled.
 *   3. Tank-movement completion is detected (→ MoveComplete).
 *   4. Ambient effects (wind particles, money popups) advance.
 *
 * PURE: no React, DOM, canvas, window, performance.now, console, or sound.
 * Inputs are never mutated; a fresh {@link SimulationState} is returned.
 *
 * Damage application, death/destruction-animation creation, scoring and audio
 * are the host's responsibility — it drains the returned {@link SimEvent}s and
 * applies them to React state via existing actions.
 */
import { stepProjectiles } from './stepProjectiles';
import { stepEffects } from './stepEffects';
import { stepMovement } from './stepMovement';
import { stepAmbient } from './stepAmbient';
import type { SimEvent, SimulationState, StepResult, TickContext } from './types';

/**
 * Advance the simulation by one fixed step.
 *
 * @param state - Current simulation state (not mutated).
 * @param dtMs - Fixed step size in milliseconds (used by time-delta effects such
 *   as wind particles; time-based effects use `ctx.now`).
 * @param ctx - Read-only tick inputs (now, wind, terrain, tanks, canvas size).
 * @returns The next simulation state plus aggregated events for the host.
 */
export function stepSimulation(
  state: SimulationState,
  dtMs: number,
  ctx: TickContext
): StepResult {
  const events: SimEvent[] = [];

  // 1. Projectiles: motion + collision. Spawns explosions, emits events.
  const proj = stepProjectiles(state.projectiles, ctx);
  events.push(...proj.events);

  // 2. Effects: merge freshly spawned explosions, then advance/cull lifecycles.
  const mergedExplosions = proj.newExplosions.length
    ? [...state.explosions, ...proj.newExplosions]
    : state.explosions;
  const fx = stepEffects(mergedExplosions, state.destructions, ctx.now, dtMs);
  events.push(...fx.events);

  // 3. Movement completion detection.
  const move = stepMovement(ctx.tanks, ctx);
  events.push(...move.events);

  // 4. Ambient effects (wind particles + money popups).
  const amb = stepAmbient(state.windParticles, state.moneyAnimations, dtMs, ctx);
  events.push(...amb.events);

  return {
    state: {
      projectiles: proj.projectiles,
      explosions: fx.explosions,
      destructions: fx.destructions,
      windParticles: amb.windParticles,
      moneyAnimations: amb.moneyAnimations,
    },
    events,
  };
}
