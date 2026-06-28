import { describe, it, expect } from 'vitest';
import { createAccumulator } from './timestep';

describe('createAccumulator', () => {
  it('should run one step when a single step worth of time elapses', () => {
    const acc = createAccumulator(16);
    expect(acc.update(16)).toBe(1);
    expect(acc.remainder).toBeCloseTo(0, 5);
  });

  it('should accumulate multiple steps and retain the remainder (happy path)', () => {
    const acc = createAccumulator(16);
    // 40ms => 2 full steps (32ms), 8ms left over
    expect(acc.update(40)).toBe(2);
    expect(acc.remainder).toBeCloseTo(8, 5);
    expect(acc.alpha()).toBeCloseTo(0.5, 5);
  });

  it('should carry remainder across frames until a step fires', () => {
    const acc = createAccumulator(16);
    expect(acc.update(10)).toBe(0); // 10 < 16
    expect(acc.update(10)).toBe(1); // 20 total => 1 step, 4 left
    expect(acc.remainder).toBeCloseTo(4, 5);
  });

  it('should clamp to maxSteps and drop the backlog (spiral-of-death guard)', () => {
    const acc = createAccumulator(16, 5);
    // A huge delta (backgrounded tab) must not produce hundreds of steps.
    expect(acc.update(10_000)).toBe(5);
    // Backlog dropped: remainder must be a sub-step amount, not thousands of ms.
    expect(acc.remainder).toBeLessThan(16);
  });

  it('should return 0 steps for zero, negative, NaN, or Infinity deltas (edge)', () => {
    const acc = createAccumulator(16);
    expect(acc.update(0)).toBe(0);
    expect(acc.update(-50)).toBe(0);
    expect(acc.update(Number.NaN)).toBe(0);
    expect(acc.update(Number.POSITIVE_INFINITY)).toBe(0);
    expect(acc.remainder).toBe(0);
  });

  it('should reset accumulated time', () => {
    const acc = createAccumulator(16);
    acc.update(10);
    expect(acc.remainder).toBeCloseTo(10, 5);
    acc.reset();
    expect(acc.remainder).toBe(0);
    expect(acc.alpha()).toBe(0);
  });

  it('should throw on invalid stepMs (error path)', () => {
    expect(() => createAccumulator(0)).toThrow(RangeError);
    expect(() => createAccumulator(-16)).toThrow(RangeError);
    expect(() => createAccumulator(Number.NaN)).toThrow(RangeError);
  });

  it('should throw on invalid maxSteps (error path)', () => {
    expect(() => createAccumulator(16, 0)).toThrow(RangeError);
    expect(() => createAccumulator(16, -1)).toThrow(RangeError);
  });
});
