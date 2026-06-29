import { describe, it, expect, vi } from 'vitest';
import { nukeFlashAlpha, renderNukeFlash, NUKE_FLASH_DURATION_MS, NUKE_FLASH_PEAK } from './nukeFlash';

describe('nukeFlashAlpha', () => {
  it('should be at peak at detonation and fade to 0 over the duration (happy path)', () => {
    expect(nukeFlashAlpha(0)).toBeCloseTo(NUKE_FLASH_PEAK, 6);
    expect(nukeFlashAlpha(NUKE_FLASH_DURATION_MS / 2)).toBeCloseTo(NUKE_FLASH_PEAK / 2, 6);
    expect(nukeFlashAlpha(NUKE_FLASH_DURATION_MS)).toBe(0);
  });

  it('should return 0 outside the active window (edge)', () => {
    expect(nukeFlashAlpha(-10)).toBe(0);
    expect(nukeFlashAlpha(NUKE_FLASH_DURATION_MS + 100)).toBe(0);
  });

  it('should return 0 for a non-positive duration (error path)', () => {
    expect(nukeFlashAlpha(10, 0)).toBe(0);
  });
});

describe('renderNukeFlash', () => {
  function fakeCtx() {
    return {
      save: vi.fn(), restore: vi.fn(), fillRect: vi.fn(),
      fillStyle: '', globalAlpha: 1,
      canvas: { width: 800, height: 600 },
    } as unknown as CanvasRenderingContext2D & { fillRect: ReturnType<typeof vi.fn> };
  }

  it('should fill the canvas while the flash is active (happy path)', () => {
    const ctx = fakeCtx();
    renderNukeFlash(ctx, 0);
    expect((ctx.fillRect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('should be a no-op once faded (edge)', () => {
    const ctx = fakeCtx();
    renderNukeFlash(ctx, NUKE_FLASH_DURATION_MS + 1);
    expect((ctx.fillRect as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});
