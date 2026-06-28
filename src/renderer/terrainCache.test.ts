import { describe, it, expect, vi } from 'vitest';
import {
  isTerrainCacheValid,
  getTerrainCache,
  type TerrainCacheEntry,
} from './terrainCache';
import { generateTerrain } from '../engine';
import type { TerrainData } from '../types/game';

const terrainA: TerrainData = generateTerrain({ width: 800, height: 600, seed: 1 });
const terrainB: TerrainData = generateTerrain({ width: 800, height: 600, seed: 2 });

/** Minimal fake canvas; getContext returns null so drawing is skipped in jsdom. */
function fakeCanvasFactory() {
  const created: Array<{ width: number; height: number }> = [];
  const make = (): HTMLCanvasElement => {
    const c = { width: 0, height: 0, getContext: () => null } as unknown as HTMLCanvasElement;
    created.push(c as unknown as { width: number; height: number });
    return c;
  };
  return { make, created };
}

describe('isTerrainCacheValid', () => {
  it('should be false for a null entry (initial state)', () => {
    expect(isTerrainCacheValid(null, terrainA, 800, 600)).toBe(false);
  });

  it('should be true when terrain reference and dimensions match (happy path)', () => {
    const entry: TerrainCacheEntry = {
      canvas: {} as HTMLCanvasElement,
      terrain: terrainA,
      width: 800,
      height: 600,
    };
    expect(isTerrainCacheValid(entry, terrainA, 800, 600)).toBe(true);
  });

  it('should be false when the terrain object changed (e.g. crater) (edge)', () => {
    const entry: TerrainCacheEntry = {
      canvas: {} as HTMLCanvasElement,
      terrain: terrainA,
      width: 800,
      height: 600,
    };
    expect(isTerrainCacheValid(entry, terrainB, 800, 600)).toBe(false);
  });

  it('should be false when dimensions changed (resize / terrain-size)', () => {
    const entry: TerrainCacheEntry = {
      canvas: {} as HTMLCanvasElement,
      terrain: terrainA,
      width: 800,
      height: 600,
    };
    expect(isTerrainCacheValid(entry, terrainA, 1024, 768)).toBe(false);
  });
});

describe('getTerrainCache', () => {
  it('should create a canvas on a cache miss and size it correctly (happy path)', () => {
    const { make } = fakeCanvasFactory();
    const spy = vi.fn(make);
    const entry = getTerrainCache(null, terrainA, 800, 600, spy);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(entry.canvas.width).toBe(800);
    expect(entry.canvas.height).toBe(600);
    expect(entry.terrain).toBe(terrainA);
  });

  it('should REUSE the entry (no new canvas) when still valid (the perf win)', () => {
    const { make } = fakeCanvasFactory();
    const spy = vi.fn(make);
    const first = getTerrainCache(null, terrainA, 800, 600, spy);
    const second = getTerrainCache(first, terrainA, 800, 600, spy);

    expect(second).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1); // not called again
  });

  it('should re-render when terrain changes (crater) (edge)', () => {
    const { make } = fakeCanvasFactory();
    const spy = vi.fn(make);
    const first = getTerrainCache(null, terrainA, 800, 600, spy);
    const second = getTerrainCache(first, terrainB, 800, 600, spy);

    expect(second).not.toBe(first);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should re-render when dimensions change (resize) (edge)', () => {
    const { make } = fakeCanvasFactory();
    const spy = vi.fn(make);
    const first = getTerrainCache(null, terrainA, 800, 600, spy);
    const second = getTerrainCache(first, terrainA, 1024, 768, spy);

    expect(second).not.toBe(first);
    expect(second.width).toBe(1024);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
