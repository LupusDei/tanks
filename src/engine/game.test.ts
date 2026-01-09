import { describe, it, expect } from 'vitest';
import { initializeGame } from './game';

describe('game', () => {
  describe('initializeGame', () => {
    it('returns terrain with correct dimensions', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
      });

      expect(result.terrain.width).toBe(800);
      expect(result.terrain.height).toBe(600);
      expect(result.terrain.points).toHaveLength(800);
    });

    it('returns two tanks', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'blue',
      });

      expect(result.tanks).toHaveLength(2);
    });

    it('creates player tank with selected color', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'green',
      });

      const player = result.tanks.find((t) => t.id === 'player');
      expect(player?.color).toBe('green');
    });

    it('creates opponent tank with contrasting color', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'green',
      });

      const opponent = result.tanks.find((t) => t.id === 'opponent');
      expect(opponent?.color).toBe('yellow'); // green contrasts with yellow
    });

    it('places player tank on the left side', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
      });

      const player = result.tanks.find((t) => t.id === 'player');
      // Should be at 15% of width = 120
      expect(player?.position.x).toBe(120);
    });

    it('places opponent tank on the right side', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
      });

      const opponent = result.tanks.find((t) => t.id === 'opponent');
      // Should be at 85% of width = 680
      expect(opponent?.position.x).toBe(680);
    });

    it('player tank starts as active', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
      });

      const player = result.tanks.find((t) => t.id === 'player');
      expect(player?.isActive).toBe(true);
    });

    it('opponent tank starts as inactive', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
      });

      const opponent = result.tanks.find((t) => t.id === 'opponent');
      expect(opponent?.isActive).toBe(false);
    });

    it('generates deterministic terrain with seed', () => {
      const result1 = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        terrainSeed: 12345,
      });

      const result2 = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        terrainSeed: 12345,
      });

      expect(result1.terrain.points).toEqual(result2.terrain.points);
    });

    it('generates different terrain with different seeds', () => {
      const result1 = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        terrainSeed: 12345,
      });

      const result2 = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        terrainSeed: 54321,
      });

      expect(result1.terrain.points).not.toEqual(result2.terrain.points);
    });

    it('all color choices produce valid opponent colors', () => {
      const colors = ['red', 'blue', 'green', 'yellow'] as const;

      for (const color of colors) {
        const result = initializeGame({
          canvasWidth: 800,
          canvasHeight: 600,
          playerColor: color,
        });

        const opponent = result.tanks.find((t) => t.id === 'opponent');
        expect(opponent?.color).toBeDefined();
        expect(opponent?.color).not.toBe(color);
      }
    });

    it('tanks have full health', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'blue',
      });

      for (const tank of result.tanks) {
        expect(tank.health).toBe(100);
      }
    });

    it('tanks have default power', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'blue',
      });

      for (const tank of result.tanks) {
        expect(tank.power).toBe(50);
      }
    });
  });
});
