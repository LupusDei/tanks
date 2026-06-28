/**
 * Pure movement-completion simulation step (tanks-301.2.3).
 *
 * Detects when in-progress tank movement animations have finished and emits a
 * `MoveComplete` event for each. This is the headless port of the completion
 * detection that previously lived inline in App.tsx's render loop.
 *
 * PURITY GUARANTEES:
 * - No React, DOM, canvas, window, performance.now, or console.
 * - Does NOT mutate the input `tanks` array or any tank object.
 * - Does NOT render. The interpolated mid-animation position is a RENDER
 *   concern handled elsewhere; this step only DETECTS completion.
 * - Deterministic: output depends solely on `tanks` and `ctx`.
 */

import type { TankState } from '../../types/game';
import { getAnimatedPosition, getFinalPosition } from '../movement';
import type { TickContext, MoveCompleteEvent } from './types';

/**
 * Inspect all tanks and emit a `MoveComplete` event for each tank whose
 * movement animation has elapsed past its duration at `ctx.now`.
 *
 * A tank is considered "moving" only when it has a complete, well-formed
 * animation descriptor: `isMoving === true` and none of `moveTargetX`,
 * `moveStartTime`, or `moveStartX` are null. This mirrors the guard used by
 * the original render-loop logic.
 *
 * @param tanks - Current tanks (read-only; never mutated).
 * @param ctx - Per-tick context providing `now` and `terrain`.
 * @returns The set of `MoveComplete` events for this tick (possibly empty).
 */
export function stepMovement(
  tanks: readonly TankState[],
  ctx: TickContext
): { events: MoveCompleteEvent[] } {
  const events: MoveCompleteEvent[] = [];

  for (const tank of tanks) {
    // Skip tanks that are not in a valid, in-progress movement animation.
    if (
      !tank.isMoving ||
      tank.moveTargetX === null ||
      tank.moveStartTime === null ||
      tank.moveStartX === null
    ) {
      continue;
    }

    const animResult = getAnimatedPosition(
      tank.moveStartX,
      tank.moveTargetX,
      ctx.terrain,
      tank.moveStartTime,
      ctx.now
    );

    if (animResult.complete) {
      const finalPos = getFinalPosition(tank.moveTargetX, ctx.terrain);
      events.push({
        type: 'MoveComplete',
        tankId: tank.id,
        finalX: finalPos.x,
      });
    }
  }

  return { events };
}
