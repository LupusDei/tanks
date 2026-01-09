import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderTank,
  calculateTankPosition,
  createInitialTanks,
  getOpponentColor,
  getTankColorHex,
} from './tank';
import type { TankState, TerrainData } from '../types/game';

describe('tank', () => {
  describe('getTankColorHex', () => {
    it('converts red to hex', () => {
      expect(getTankColorHex('red')).toBe('#ff4444');
    });

    it('converts blue to hex', () => {
      expect(getTankColorHex('blue')).toBe('#4488ff');
    });

    it('converts green to hex', () => {
      expect(getTankColorHex('green')).toBe('#44ff44');
    });

    it('converts yellow to hex', () => {
      expect(getTankColorHex('yellow')).toBe('#ffff44');
    });

    it('returns hex colors as-is', () => {
      expect(getTankColorHex('#123456')).toBe('#123456');
    });
  });

  describe('getOpponentColor', () => {
    it('returns blue for red', () => {
      expect(getOpponentColor('red')).toBe('blue');
    });

    it('returns red for blue', () => {
      expect(getOpponentColor('blue')).toBe('red');
    });

    it('returns yellow for green', () => {
      expect(getOpponentColor('green')).toBe('yellow');
    });

    it('returns green for yellow', () => {
      expect(getOpponentColor('yellow')).toBe('green');
    });
  });

  describe('calculateTankPosition', () => {
    const terrain: TerrainData = {
      points: [100, 120, 150, 140, 130, 110, 100, 90, 80, 70],
      width: 10,
      height: 200,
    };

    it('calculates position at left edge', () => {
      const position = calculateTankPosition(terrain, 0);
      // terrain height at x=0 is 100, canvas height is 200
      // tank y = canvasHeight - terrainHeight + bodyHeight/2 + wheelRadius
      // = 200 - 100 + 10 + 6 = 116
      expect(position.x).toBe(0);
      expect(position.y).toBe(116);
    });

    it('calculates position in the middle', () => {
      const position = calculateTankPosition(terrain, 5);
      // terrain height at x=5 is 110
      // tank y = 200 - 110 + 10 + 6 = 106
      expect(position.x).toBe(5);
      expect(position.y).toBe(106);
    });

    it('calculates position at a peak', () => {
      const position = calculateTankPosition(terrain, 2);
      // terrain height at x=2 is 150
      // tank y = 200 - 150 + 10 + 6 = 66
      expect(position.x).toBe(2);
      expect(position.y).toBe(66);
    });

    it('throws error for x outside terrain bounds', () => {
      expect(() => calculateTankPosition(terrain, -1)).toThrow('Invalid x coordinate');
      expect(() => calculateTankPosition(terrain, 10)).toThrow('Invalid x coordinate');
    });
  });

  describe('createInitialTanks', () => {
    const terrain: TerrainData = {
      points: new Array(100).fill(50),
      width: 100,
      height: 200,
    };

    it('creates two tanks', () => {
      const tanks = createInitialTanks(terrain, 'red', 'blue');
      expect(tanks).toHaveLength(2);
    });

    it('creates player tank with correct properties', () => {
      const tanks = createInitialTanks(terrain, 'red', 'blue');
      const player = tanks[0];

      expect(player?.id).toBe('player');
      expect(player?.color).toBe('red');
      expect(player?.health).toBe(100);
      expect(player?.angle).toBe(45);
      expect(player?.power).toBe(50);
      expect(player?.isActive).toBe(true);
    });

    it('creates opponent tank with correct properties', () => {
      const tanks = createInitialTanks(terrain, 'red', 'blue');
      const opponent = tanks[1];

      expect(opponent?.id).toBe('opponent');
      expect(opponent?.color).toBe('blue');
      expect(opponent?.health).toBe(100);
      expect(opponent?.angle).toBe(135);
      expect(opponent?.power).toBe(50);
      expect(opponent?.isActive).toBe(false);
    });

    it('places player tank on left side', () => {
      const tanks = createInitialTanks(terrain, 'red', 'blue');
      const player = tanks[0];
      // Should be at 15% of width
      expect(player?.position.x).toBe(15);
    });

    it('places opponent tank on right side', () => {
      const tanks = createInitialTanks(terrain, 'red', 'blue');
      const opponent = tanks[1];
      // Should be at 85% of width
      expect(opponent?.position.x).toBe(85);
    });

    it('calculates correct y positions on terrain', () => {
      const tanks = createInitialTanks(terrain, 'green', 'yellow');
      // terrain height is 50 everywhere, canvas height is 200
      // tank y = 200 - 50 + 10 + 6 = 166
      expect(tanks[0]?.position.y).toBe(166);
      expect(tanks[1]?.position.y).toBe(166);
    });
  });

  describe('renderTank', () => {
    let ctx: CanvasRenderingContext2D;
    let tank: TankState;

    beforeEach(() => {
      ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        fillStyle: '',
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        roundRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      tank = {
        id: 'test',
        position: { x: 100, y: 150 },
        health: 100,
        angle: 45,
        power: 50,
        color: 'red',
        isActive: true,
      };
    });

    it('renders without throwing', () => {
      expect(() => renderTank(ctx, tank, 600)).not.toThrow();
    });

    it('calls save and restore', () => {
      renderTank(ctx, tank, 600);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('translates to tank position', () => {
      renderTank(ctx, tank, 600);
      // Canvas y is inverted: canvasY = canvasHeight - position.y = 600 - 150 = 450
      expect(ctx.translate).toHaveBeenCalledWith(100, 450);
    });

    it('draws health bar when health is below 100', () => {
      tank.health = 75;
      renderTank(ctx, tank, 600);
      // Should call fillRect for health bar background and fill
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('handles zero health', () => {
      tank.health = 0;
      expect(() => renderTank(ctx, tank, 600)).not.toThrow();
    });

    it('handles various angles', () => {
      tank.angle = 0;
      expect(() => renderTank(ctx, tank, 600)).not.toThrow();

      tank.angle = 90;
      expect(() => renderTank(ctx, tank, 600)).not.toThrow();

      tank.angle = 180;
      expect(() => renderTank(ctx, tank, 600)).not.toThrow();
    });

    it('handles different colors', () => {
      tank.color = 'blue';
      expect(() => renderTank(ctx, tank, 600)).not.toThrow();

      tank.color = 'green';
      expect(() => renderTank(ctx, tank, 600)).not.toThrow();

      tank.color = '#ff00ff';
      expect(() => renderTank(ctx, tank, 600)).not.toThrow();
    });
  });
});
