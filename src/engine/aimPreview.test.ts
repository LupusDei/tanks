import { describe, it, expect } from 'vitest';
import { computeAimPreview } from './aimPreview';
import { calculatePosition, type LaunchConfig } from './physics';
import { generateTerrain } from './terrain';
import type { TerrainData } from '../types/game';

const CANVAS_H = 600;
// Flat-ish low terrain so high shots stay airborne for a while.
const terrain: TerrainData = generateTerrain({ width: 800, height: 600, seed: 3 });

function cfg(overrides: Partial<LaunchConfig> = {}): LaunchConfig {
  return {
    position: { x: 100, y: 200 }, // barrel tip in screen coords (well above ground)
    angle: 60, // physics angle (0=right, 90=up)
    power: 70,
    terrainWidth: terrain.width,
    ...overrides,
  };
}

describe('computeAimPreview', () => {
  it('should produce points matching the real shell physics (happy path)', () => {
    const config = cfg();
    const wind = 0;
    const pts = computeAimPreview(config, wind, terrain, CANVAS_H, { dt: 0.1 });

    expect(pts.length).toBeGreaterThan(2);
    // Each sampled point must equal calculatePosition at the same time (same math).
    for (let i = 0; i < Math.min(pts.length, 5); i++) {
      const expected = calculatePosition(config, i * 0.1, wind);
      expect(pts[i]!.x).toBeCloseTo(expected.x, 6);
      expect(pts[i]!.y).toBeCloseTo(expected.y, 6);
    }
    // First point is the barrel tip.
    expect(pts[0]).toEqual(config.position);
  });

  it('should curve with wind (rightward wind pushes the path right) (behavior)', () => {
    const config = cfg();
    const noWind = computeAimPreview(config, 0, terrain, CANVAS_H, { dt: 0.1, maxPoints: 8 });
    const rightWind = computeAimPreview(config, 25, terrain, CANVAS_H, { dt: 0.1, maxPoints: 8 });
    const i = Math.min(noWind.length, rightWind.length) - 1;
    expect(rightWind[i]!.x).toBeGreaterThan(noWind[i]!.x);
  });

  it('should truncate at terrain impact (does not draw through ground) (edge)', () => {
    // Low, weak shot → comes down and hits terrain quickly. Full trajectory
    // (stopAtApex disabled) so we exercise the terrain-impact truncation.
    const config = cfg({ angle: 30, power: 30 });
    const pts = computeAimPreview(config, 0, terrain, CANVAS_H, { dt: 0.05, stopAtApex: false });
    expect(pts.length).toBeLessThan(240); // truncated, not max length
    // The last point is at/below the terrain surface at its x (impact).
    const last = pts[pts.length - 1]!;
    const surfaceScreenY = CANVAS_H - (terrain.points[Math.floor(last.x)] ?? 0);
    expect(last.y).toBeGreaterThanOrEqual(surfaceScreenY - 5);
  });

  it('should respect the maxPoints cap (edge)', () => {
    const config = cfg({ angle: 90, power: 100 }); // straight up, stays airborne
    const pts = computeAimPreview(config, 0, terrain, CANVAS_H, { dt: 0.05, maxPoints: 10 });
    expect(pts.length).toBeLessThanOrEqual(10);
  });

  it('should stop when the shell leaves the horizontal bounds (edge)', () => {
    // Fire from near the right edge, rightward, high power → exits right quickly.
    const config = cfg({ position: { x: 790, y: 100 }, angle: 10, power: 100 });
    const pts = computeAimPreview(config, 0, terrain, CANVAS_H, { dt: 0.1, stopAtApex: false });
    const last = pts[pts.length - 1]!;
    expect(last.x).toBeGreaterThan(terrain.width - 60);
    expect(pts.length).toBeLessThan(240);
  });

  it('should end at roughly the apex by default (shorter than the full arc) (tanks-308)', () => {
    // A clear upward arc (barrel well above ground) that stays airborne past apex.
    const config = cfg({ position: { x: 100, y: 150 }, angle: 70, power: 80 });
    const full = computeAimPreview(config, 0, terrain, CANVAS_H, { dt: 0.05, stopAtApex: false });
    const apex = computeAimPreview(config, 0, terrain, CANVAS_H, { dt: 0.05 }); // default: stop at apex

    // The apex preview is a strict prefix-length subset of the full arc.
    expect(apex.length).toBeGreaterThan(2);
    expect(apex.length).toBeLessThan(full.length);

    // Its last point is at (roughly) the highest point of the arc — in screen
    // coords the apex has the SMALLEST y. It should match the full arc's min y.
    const minYFull = Math.min(...full.map((p) => p.y));
    const lastApexY = apex[apex.length - 1]!.y;
    expect(Math.abs(lastApexY - minYFull)).toBeLessThan(8);
  });

  it('should throw on a non-positive dt (error path)', () => {
    expect(() => computeAimPreview(cfg(), 0, terrain, CANVAS_H, { dt: 0 })).toThrow(RangeError);
    expect(() => computeAimPreview(cfg(), 0, terrain, CANVAS_H, { dt: -0.1 })).toThrow(RangeError);
  });
});
