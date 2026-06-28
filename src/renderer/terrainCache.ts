/**
 * Offscreen terrain cache (tanks-302).
 *
 * The terrain is a filled polygon of up to ~2100 points (Epic map). Re-stroking
 * it every frame is the dominant per-frame canvas cost. Since terrain only
 * changes on crater creation, resize, or terrain-size change, we render it once
 * to an offscreen canvas and blit that each frame instead.
 *
 * Invalidation is reference-based and automatic: crater creation produces a NEW
 * terrain object (via actions.setTerrain → createCrater), and resize/terrain-size
 * changes the dimensions — both miss the cache and trigger a single re-render. No
 * explicit event wiring required.
 *
 * Pure rendering helper: no React. Drawing requires a real 2D context (browser);
 * the cache-decision logic is independently testable.
 */
import type { TerrainData } from '../types/game';

export interface TerrainCacheEntry {
  canvas: HTMLCanvasElement;
  terrain: TerrainData;
  width: number;
  height: number;
}

/** Terrain fill color (matches the legacy inline render in App.tsx). */
export const TERRAIN_COLOR = '#8B4513';

/**
 * True when the cached entry still matches the requested terrain + dimensions
 * (same terrain object reference and identical canvas size).
 */
export function isTerrainCacheValid(
  entry: TerrainCacheEntry | null,
  terrain: TerrainData,
  width: number,
  height: number
): entry is TerrainCacheEntry {
  return (
    entry !== null &&
    entry.terrain === terrain &&
    entry.width === width &&
    entry.height === height
  );
}

/**
 * Draw the terrain polygon onto a context, clearing first so the background stays
 * transparent (the sky/wind-particle layer shows through above the terrain).
 */
export function drawTerrain(
  ctx: CanvasRenderingContext2D,
  terrain: TerrainData,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = TERRAIN_COLOR;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x < terrain.points.length; x++) {
    ctx.lineTo(x, height - terrain.points[x]!);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
}

/**
 * Return a terrain canvas for the given terrain + size, reusing the previous
 * entry when still valid and otherwise rendering a fresh offscreen canvas.
 *
 * @param createCanvas Factory for the backing canvas (injectable for testing).
 */
export function getTerrainCache(
  prev: TerrainCacheEntry | null,
  terrain: TerrainData,
  width: number,
  height: number,
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')
): TerrainCacheEntry {
  if (isTerrainCacheValid(prev, terrain, width, height)) {
    return prev;
  }
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawTerrain(ctx, terrain, width, height);
  }
  return { canvas, terrain, width, height };
}
