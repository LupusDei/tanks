/**
 * Pure simulation step: detect when a falling tank has finished settling onto the
 * destroyed ground (tanks-311).
 *
 * Like stepMovement, the mid-fall interpolation is a RENDER concern; this step only
 * DETECTS completion and emits a {@link FallCompleteEvent} so the host can commit the
 * tank's final world-y. No React, DOM, or mutation.
 */
import type { TankState } from '../../types/game';
import { getFallPosition } from '../fall';
import type { TickContext, FallCompleteEvent } from './types';

export function stepFalling(
  tanks: readonly TankState[],
  ctx: TickContext
): { events: FallCompleteEvent[] } {
  const events: FallCompleteEvent[] = [];

  for (const tank of tanks) {
    if (
      !tank.isFalling ||
      tank.fallStartY === null ||
      tank.fallStartY === undefined ||
      tank.fallTargetY === null ||
      tank.fallTargetY === undefined ||
      tank.fallStartTime === null ||
      tank.fallStartTime === undefined
    ) {
      continue;
    }

    const { complete } = getFallPosition(
      tank.fallStartY,
      tank.fallTargetY,
      tank.fallStartTime,
      ctx.now
    );

    if (complete) {
      events.push({ type: 'FallComplete', tankId: tank.id, finalY: tank.fallTargetY });
    }
  }

  return { events };
}
