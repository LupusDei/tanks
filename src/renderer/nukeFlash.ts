/**
 * Nuke detonation screen flash (tanks-303).
 *
 * A brief full-canvas white flash when a nuke goes off — the closest stand-in for
 * auto-tank's flash/shake/slow-mo that fits tanks' current (canvas-only) renderer.
 * Draw-only; the alpha curve is a pure, testable function.
 */

/** Duration of the flash in milliseconds. */
export const NUKE_FLASH_DURATION_MS = 350;

/** Peak opacity at detonation. */
export const NUKE_FLASH_PEAK = 0.7;

/**
 * Flash opacity for a given elapsed time since detonation, fading linearly from
 * `peak` at t=0 to 0 at `durationMs`. Returns 0 outside the active window.
 */
export function nukeFlashAlpha(
  elapsedMs: number,
  durationMs: number = NUKE_FLASH_DURATION_MS,
  peak: number = NUKE_FLASH_PEAK
): number {
  if (!(durationMs > 0)) return 0;
  if (elapsedMs < 0 || elapsedMs >= durationMs) return 0;
  return peak * (1 - elapsedMs / durationMs);
}

/** Draw the full-canvas white flash for the current elapsed time. No-op when faded. */
export function renderNukeFlash(
  ctx: CanvasRenderingContext2D,
  elapsedMs: number,
  durationMs: number = NUKE_FLASH_DURATION_MS,
  peak: number = NUKE_FLASH_PEAK
): void {
  const alpha = nukeFlashAlpha(elapsedMs, durationMs, peak);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
