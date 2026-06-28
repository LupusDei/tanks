import { useCallback, useRef } from 'react';
import {
  stepSimulation,
  type SimEvent,
  type SimulationState,
  type TickContext,
} from '../engine/simulation';

/**
 * Signature of a simulation stepper. The real one is {@link stepSimulation};
 * tests inject a mock.
 */
export type SimStepper = (
  state: SimulationState,
  dtMs: number,
  ctx: TickContext
) => { state: SimulationState; events: SimEvent[] };

export interface UseGameTickOptions {
  /**
   * Drain callback invoked once per advance with all events produced this tick.
   * The host applies them to React state via existing actions (damage, crater,
   * move-complete, scoring, sound, …). Not called when there are no events.
   */
  applyEvents: (events: SimEvent[]) => void;
  /** Injectable stepper (defaults to the real composed simulation step). */
  step?: SimStepper;
}

export interface GameTick {
  /**
   * Advance the simulation by one rendered frame and drain its events.
   *
   * One step per frame using the real frame delta is intentional: this game's
   * projectile/explosion physics is absolute-time based (computed from elapsed
   * time, not integrated per frame), so it is already frame-rate independent.
   * Re-timing it into fixed sub-steps would alter explosion/particle feel, which
   * this behavior-preserving refactor must not do.
   *
   * @returns the next simulation state (assign it back to your store/ref).
   */
  advance: (state: SimulationState, dtMs: number, ctx: TickContext) => SimulationState;
}

/**
 * React hook that wires the pure simulation into a frame loop driven by the
 * host's render callback. It owns no rAF loop of its own (the Canvas component
 * already drives frames); it provides a stable `advance` that steps the
 * simulation and forwards events to `applyEvents`.
 */
export function useGameTick({ applyEvents, step = stepSimulation }: UseGameTickOptions): GameTick {
  // Keep the latest callback without forcing `advance` to change identity.
  const applyEventsRef = useRef(applyEvents);
  applyEventsRef.current = applyEvents;

  const stepRef = useRef(step);
  stepRef.current = step;

  const advance = useCallback(
    (state: SimulationState, dtMs: number, ctx: TickContext): SimulationState => {
      const result = stepRef.current(state, dtMs, ctx);
      if (result.events.length > 0) {
        applyEventsRef.current(result.events);
      }
      return result.state;
    },
    []
  );

  return { advance };
}
