/**
 * Fixed-timestep accumulator.
 *
 * Decouples simulation advancement from render frame time so physics is
 * deterministic regardless of frame rate. Each frame you feed the real elapsed
 * time to {@link Accumulator.update}; it returns how many fixed-size simulation
 * steps to run, retaining the sub-step remainder for render interpolation.
 *
 * A `maxSteps` cap prevents the "spiral of death": if the tab was backgrounded
 * and a huge delta arrives, we run at most `maxSteps` steps and drop the backlog
 * rather than trying to catch up unbounded (which would stall the main thread).
 */
export interface Accumulator {
  /**
   * Accumulate `deltaMs` of real time and return the number of fixed steps to
   * run this frame (0..maxSteps). Non-finite or non-positive deltas yield 0.
   */
  update(deltaMs: number): number;
  /** Leftover accumulated time (< stepMs unless backlog was dropped). */
  readonly remainder: number;
  /** Interpolation factor in [0, 1): remainder / stepMs. */
  alpha(): number;
  /** Clear accumulated time. */
  reset(): void;
}

/**
 * Create a fixed-timestep accumulator.
 *
 * @param stepMs Fixed simulation step size in milliseconds (must be > 0).
 * @param maxSteps Maximum steps to run in a single frame (must be >= 1).
 * @throws RangeError if stepMs <= 0 or maxSteps < 1.
 */
export function createAccumulator(stepMs: number, maxSteps = 5): Accumulator {
  if (!(stepMs > 0) || !Number.isFinite(stepMs)) {
    throw new RangeError(`stepMs must be a positive finite number, got ${stepMs}`);
  }
  if (!Number.isFinite(maxSteps) || maxSteps < 1) {
    throw new RangeError(`maxSteps must be >= 1, got ${maxSteps}`);
  }

  let accumulated = 0;
  const cap = Math.floor(maxSteps);

  return {
    update(deltaMs: number): number {
      // Ignore non-finite or non-positive deltas (paused tab, first frame, clock skew).
      if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
        return 0;
      }
      accumulated += deltaMs;

      let steps = 0;
      while (accumulated >= stepMs && steps < cap) {
        accumulated -= stepMs;
        steps += 1;
      }

      // Spiral-of-death guard: if we hit the cap and there is still a large
      // backlog, drop it so we never try to catch up across many frames.
      if (steps === cap && accumulated >= stepMs) {
        accumulated = accumulated % stepMs;
      }

      return steps;
    },
    get remainder(): number {
      return accumulated;
    },
    alpha(): number {
      return accumulated / stepMs;
    },
    reset(): void {
      accumulated = 0;
    },
  };
}
