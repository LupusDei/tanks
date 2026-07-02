import { describe, it, expect } from 'vitest';
import { computeMobileFillScale } from './mobileFit';

describe('computeMobileFillScale (tanks-306)', () => {
  it('should FILL the play area on a narrow phone (height-bound), not shrink to width (happy path)', () => {
    // 390-wide phone, 634 available height, Large container 1400x1080.
    const scale = computeMobileFillScale(390, 634, 1400, 1080);
    // Cover picks the larger ratio (height): 634/1080 ≈ 0.587, not 390/1400 ≈ 0.279.
    expect(scale).toBeCloseTo(634 / 1080, 5);
    // The scaled canvas fills the height exactly and overflows the width (pannable).
    expect(1080 * scale).toBeCloseTo(634, 3);
    expect(1400 * scale).toBeGreaterThan(390);
  });

  it('should fill the width when width needs the larger scale (landscape-ish, edge)', () => {
    // Wide, short available area → width ratio wins.
    const scale = computeMobileFillScale(1200, 300, 1400, 1080);
    expect(scale).toBeCloseTo(1200 / 1400, 5);
  });

  it('should never scale up past 1 (edge)', () => {
    // Container smaller than the viewport → would-be ratio > 1, clamp to 1.
    expect(computeMobileFillScale(2000, 2000, 800, 600)).toBe(1);
  });

  it('should be safe for zero/negative container dimensions (error path)', () => {
    expect(computeMobileFillScale(390, 634, 0, 1080)).toBe(1);
    expect(computeMobileFillScale(390, 634, 1400, 0)).toBe(1);
  });
});
