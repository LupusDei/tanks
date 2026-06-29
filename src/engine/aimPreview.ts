/**
 * Aim trajectory preview (tanks-303, ported from auto-tank).
 *
 * Produces the predicted flight path for the CURRENT aim so the UI can draw a
 * dotted guide. Critically, it reuses the SAME physics as a real shell
 * ({@link calculatePosition} with wind) and the same {@link LaunchConfig} the real
 * shot is built from (via createLaunchConfig) — so the preview matches where the
 * projectile actually goes, with no drift.
 *
 * Points are in screen coordinates (y down), ready to render directly. The path
 * is truncated at terrain impact (so it doesn't draw through the ground) and
 * bounded by max time / max points as a fallback for shots that fly off-screen.
 *
 * Pure function — no React, DOM, or canvas.
 */
import type { Position, TerrainData } from '../types/game';
import { calculatePosition, type LaunchConfig } from './physics';
import { checkTerrainCollision } from './projectile';

export interface AimPreviewOptions {
  /** Seconds between sampled points (smaller = smoother). Default 0.05. */
  dt?: number;
  /** Hard cap on simulated seconds. Default 12. */
  maxTime?: number;
  /** Hard cap on number of points. Default 240. */
  maxPoints?: number;
}

const DEFAULTS: Required<AimPreviewOptions> = {
  dt: 0.05,
  maxTime: 12,
  maxPoints: 240,
};

/**
 * Compute the predicted trajectory points for the current aim.
 *
 * @param config       The launch config (build via createLaunchConfig for an
 *                     exact match to the real shot).
 * @param wind         Current wind (signed); applied identically to real shells.
 * @param terrain      Terrain, for impact truncation.
 * @param canvasHeight Canvas height, for world↔screen in collision tests.
 * @returns Screen-space points from the barrel tip to the impact/cutoff point.
 * @throws RangeError if dt <= 0.
 */
export function computeAimPreview(
  config: LaunchConfig,
  wind: number,
  terrain: TerrainData,
  canvasHeight: number,
  opts: AimPreviewOptions = {}
): Position[] {
  const { dt, maxTime, maxPoints } = { ...DEFAULTS, ...opts };
  if (!(dt > 0) || !Number.isFinite(dt)) {
    throw new RangeError(`dt must be a positive finite number, got ${dt}`);
  }

  const points: Position[] = [];
  for (let time = 0; time <= maxTime && points.length < maxPoints; time += dt) {
    const pos = calculatePosition(config, time, wind);
    points.push(pos);

    // Stop once the shell flies off either horizontal edge.
    if (pos.x < 0 || pos.x > terrain.width) {
      break;
    }
    // Stop at terrain impact (don't draw through the ground). Skip the very first
    // sample so a barrel tip flush with the surface doesn't abort immediately.
    if (time > 0 && checkTerrainCollision(pos, terrain, canvasHeight).hit) {
      break;
    }
    // Stop if it has fallen below the canvas.
    if (pos.y > canvasHeight) {
      break;
    }
  }

  return points;
}
