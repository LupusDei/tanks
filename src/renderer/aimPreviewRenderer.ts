/**
 * Aim trajectory preview renderer (tanks-303).
 *
 * Draws the predicted shot path (from computeAimPreview) as a faint, fading
 * dotted line — brightest near the barrel, fading along the arc — mirroring
 * auto-tank's guide. Draw-only: no state mutation, no game logic.
 */
import type { Position } from '../types/game';

export interface AimPreviewStyle {
  /** Dot color. Default white. */
  color?: string;
  /** Dot radius in px. Default 2.5. */
  dotRadius?: number;
  /** Render every Nth point (spacing). Default 2. */
  everyNth?: number;
  /** Opacity of the first (brightest) dot. Default 0.55. */
  maxOpacity?: number;
}

const DEFAULTS: Required<AimPreviewStyle> = {
  color: '#ffffff',
  dotRadius: 2.5,
  everyNth: 2,
  maxOpacity: 0.55,
};

/**
 * Opacity for the dot at `index` of `total`, fading linearly from `maxOpacity`
 * (start) toward 0 (end). Pure/testable.
 */
export function aimPreviewDotOpacity(index: number, total: number, maxOpacity: number): number {
  if (total <= 1) return maxOpacity;
  const fade = 1 - index / total;
  return Math.max(0, fade) * maxOpacity;
}

/** Draw the fading dotted aim preview. No-op for empty/too-short paths. */
export function renderAimPreview(
  ctx: CanvasRenderingContext2D,
  points: readonly Position[],
  style: AimPreviewStyle = {}
): void {
  if (points.length < 2) return;
  const { color, dotRadius, everyNth, maxOpacity } = { ...DEFAULTS, ...style };

  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < points.length; i += everyNth) {
    const p = points[i]!;
    ctx.globalAlpha = aimPreviewDotOpacity(i, points.length, maxOpacity);
    ctx.beginPath();
    ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
