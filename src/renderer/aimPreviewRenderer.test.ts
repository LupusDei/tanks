import { describe, it, expect, vi } from 'vitest';
import { aimPreviewDotOpacity, renderAimPreview } from './aimPreviewRenderer';
import type { Position } from '../types/game';

describe('aimPreviewDotOpacity', () => {
  it('should fade from maxOpacity at the start toward 0 at the end (happy path)', () => {
    expect(aimPreviewDotOpacity(0, 10, 0.5)).toBeCloseTo(0.5, 6);
    expect(aimPreviewDotOpacity(5, 10, 0.5)).toBeCloseTo(0.25, 6);
    expect(aimPreviewDotOpacity(9, 10, 0.5)).toBeLessThan(0.1);
  });

  it('should return maxOpacity for a single-point path (edge)', () => {
    expect(aimPreviewDotOpacity(0, 1, 0.5)).toBe(0.5);
  });

  it('should never return a negative opacity (edge)', () => {
    expect(aimPreviewDotOpacity(20, 10, 0.5)).toBe(0);
  });
});

describe('renderAimPreview', () => {
  function fakeCtx() {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D & { arc: ReturnType<typeof vi.fn>; fill: ReturnType<typeof vi.fn> };
  }
  const path: Position[] = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: 100 - i }));

  it('should draw one dot per Nth point and balance save/restore (happy path)', () => {
    const ctx = fakeCtx();
    renderAimPreview(ctx, path, { everyNth: 2 });
    // 10 points, every 2nd → indices 0,2,4,6,8 = 5 dots
    expect((ctx.arc as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(5);
    expect((ctx.fill as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(5);
    expect((ctx.save as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect((ctx.restore as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('should be a no-op for paths shorter than 2 points (edge)', () => {
    const ctx = fakeCtx();
    renderAimPreview(ctx, [{ x: 1, y: 1 }]);
    expect((ctx.arc as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect((ctx.save as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('should respect a custom spacing (error/robustness: everyNth larger than path)', () => {
    const ctx = fakeCtx();
    renderAimPreview(ctx, path, { everyNth: 100 });
    expect((ctx.arc as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1); // only index 0
  });
});
