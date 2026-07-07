import { describe, it, expect } from 'vitest';
import {
  spawnPowerUps,
  findCollectedPowerUp,
  POWERUP_TYPES,
  POWERUP_FLOAT_HEIGHT,
  POWERUP_RADIUS,
  type PowerUp,
} from './powerups';
import { generateTerrain, getTerrainHeightAt } from './terrain';
import type { TerrainData } from '../types/game';

const terrain: TerrainData = generateTerrain({ width: 800, height: 600, seed: 7 });

describe('spawnPowerUps (tanks-317)', () => {
  const tanks = [{ position: { x: 100, y: 200 } }, { position: { x: 700, y: 200 } }];

  it('should place the requested number of crates on the surface (happy path)', () => {
    const crates = spawnPowerUps({ terrain, tanks, count: 3, rng: Math.random, idPrefix: 't' });
    expect(crates).toHaveLength(3);
    for (const c of crates) {
      const surface = getTerrainHeightAt(terrain, c.x)!;
      expect(c.y).toBeCloseTo(surface + POWERUP_FLOAT_HEIGHT, 5); // floats above the ground
      expect(POWERUP_TYPES).toContain(c.type);
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(terrain.width);
    }
  });

  it('should keep crates clear of tanks and each other (behavior)', () => {
    const crates = spawnPowerUps({ terrain, tanks, count: 3, minGap: 70 });
    for (const c of crates) {
      for (const t of tanks) expect(Math.abs(c.x - t.position.x)).toBeGreaterThanOrEqual(70);
      for (const o of crates) if (o !== c) expect(Math.abs(c.x - o.x)).toBeGreaterThanOrEqual(70);
    }
  });

  it('should give every crate a unique id', () => {
    const crates = spawnPowerUps({ terrain, tanks, count: 3, idPrefix: 'round1' });
    expect(new Set(crates.map((c) => c.id)).size).toBe(crates.length);
  });

  it('should return an empty array for count <= 0 (edge)', () => {
    expect(spawnPowerUps({ terrain, tanks, count: 0 })).toEqual([]);
  });

  it('should pick types only from the provided pool', () => {
    const crates = spawnPowerUps({ terrain, tanks: [], count: 4, types: ['shield'] });
    expect(crates.every((c) => c.type === 'shield')).toBe(true);
  });
});

describe('findCollectedPowerUp (tanks-317)', () => {
  // A crate whose world y is 300 sits at screen y = canvasHeight(600) - 300 = 300.
  const crates: PowerUp[] = [{ id: 'a', type: 'shield', x: 400, y: 300 }];
  const CANVAS_H = 600;

  it('should collect a crate when the blast overlaps it (happy path)', () => {
    // Blast at the crate's screen position (400, 300).
    const hit = findCollectedPowerUp(crates, { x: 400, y: 300 }, CANVAS_H, 20);
    expect(hit?.id).toBe('a');
  });

  it('should collect on a near-miss within blast + crate radius (kid-friendly)', () => {
    // Blast center 20+POWERUP_RADIUS-1 px away still overlaps.
    const dist = 20 + POWERUP_RADIUS - 1;
    const hit = findCollectedPowerUp(crates, { x: 400 + dist, y: 300 }, CANVAS_H, 20);
    expect(hit?.id).toBe('a');
  });

  it('should NOT collect when the blast is out of reach (edge)', () => {
    const dist = 20 + POWERUP_RADIUS + 5;
    const hit = findCollectedPowerUp(crates, { x: 400 + dist, y: 300 }, CANVAS_H, 20);
    expect(hit).toBeNull();
  });

  it('should return null when there are no crates', () => {
    expect(findCollectedPowerUp([], { x: 400, y: 300 }, CANVAS_H, 50)).toBeNull();
  });
});
