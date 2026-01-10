import { describe, it, expect } from 'vitest';
import { initializeGame } from './game';

describe('game', () => {
  describe('initializeGame', () => {
    it('returns terrain with correct dimensions', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        enemyCount: 1,
      });

      expect(result.terrain.width).toBe(800);
      expect(result.terrain.height).toBe(600);
      expect(result.terrain.points).toHaveLength(800);
    });

    it('returns correct number of tanks for single enemy', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'blue',
        enemyCount: 1,
      });

      expect(result.tanks).toHaveLength(2);
    });

    it('returns correct number of tanks for multiple enemies', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'blue',
        enemyCount: 3,
      });

      expect(result.tanks).toHaveLength(4); // 1 player + 3 enemies
    });

    it('creates player tank with selected color', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'green',
        enemyCount: 1,
      });

      const player = result.tanks.find((t) => t.id === 'player');
      expect(player?.color).toBe('green');
    });

    it('creates enemy tank with contrasting color', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'green',
        enemyCount: 1,
      });

      const enemy = result.tanks.find((t) => t.id === 'enemy-1');
      expect(enemy?.color).not.toBe('green');
    });

    it('places player tank on the left side', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        enemyCount: 1,
      });

      const player = result.tanks.find((t) => t.id === 'player');
      // Should be at 15% of width = 120
      expect(player?.position.x).toBe(120);
    });

    it('places single enemy tank on the right side', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        enemyCount: 1,
      });

      const enemy = result.tanks.find((t) => t.id === 'enemy-1');
      // Should be at 85% of width = 680
      expect(enemy?.position.x).toBe(680);
    });

    it('distributes multiple enemies across terrain', () => {
      const result = initializeGame({
        canvasWidth: 1000,
        canvasHeight: 600,
        playerColor: 'red',
        enemyCount: 3,
      });

      const enemies = result.tanks.filter((t) => t.id !== 'player');
      expect(enemies).toHaveLength(3);

      // Check that enemies are spread out (35% to 90% of width)
      for (const enemy of enemies) {
        expect(enemy.position.x).toBeGreaterThanOrEqual(350);
        expect(enemy.position.x).toBeLessThanOrEqual(900);
      }

      // Check that enemies are in ascending x order
      for (let i = 1; i < enemies.length; i++) {
        expect(enemies[i]!.position.x).toBeGreaterThan(enemies[i - 1]!.position.x);
      }
    });

    it('player tank starts as active', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        enemyCount: 1,
      });

      const player = result.tanks.find((t) => t.id === 'player');
      expect(player?.isActive).toBe(true);
    });

    it('enemy tanks start as inactive', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        enemyCount: 3,
      });

      const enemies = result.tanks.filter((t) => t.id !== 'player');
      for (const enemy of enemies) {
        expect(enemy.isActive).toBe(false);
      }
    });

    it('generates deterministic terrain with seed', () => {
      const result1 = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        enemyCount: 1,
        terrainSeed: 12345,
      });

      const result2 = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        enemyCount: 1,
        terrainSeed: 12345,
      });

      expect(result1.terrain.points).toEqual(result2.terrain.points);
    });

    it('generates different terrain with different seeds', () => {
      const result1 = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        enemyCount: 1,
        terrainSeed: 12345,
      });

      const result2 = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'red',
        enemyCount: 1,
        terrainSeed: 54321,
      });

      expect(result1.terrain.points).not.toEqual(result2.terrain.points);
    });

    it('all color choices produce valid enemy colors', () => {
      const colors = ['red', 'blue', 'green', 'yellow'] as const;

      for (const color of colors) {
        const result = initializeGame({
          canvasWidth: 800,
          canvasHeight: 600,
          playerColor: color,
          enemyCount: 1,
        });

        const enemy = result.tanks.find((t) => t.id === 'enemy-1');
        expect(enemy?.color).toBeDefined();
        expect(enemy?.color).not.toBe(color);
      }
    });

    it('tanks have full health', () => {
      const result = initializeGame({
        canvasWidth: 800,
        canvasHeight: 600,
        playerColor: 'blue',
        enemyCount: 1,
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
        enemyCount: 1,
      });

      for (const tank of result.tanks) {
        expect(tank.power).toBe(50);
      }
    });

    it('creates correct number of enemies for each count option', () => {
      for (const enemyCount of [1, 2, 3, 4, 5] as const) {
        const result = initializeGame({
          canvasWidth: 800,
          canvasHeight: 600,
          playerColor: 'red',
          enemyCount,
        });

        expect(result.tanks).toHaveLength(enemyCount + 1);
        const enemies = result.tanks.filter((t) => t.id !== 'player');
        expect(enemies).toHaveLength(enemyCount);
      }
    });
  });
});
