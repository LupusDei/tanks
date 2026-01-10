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
    it('returns cyan for red', () => {
      expect(getOpponentColor('red')).toBe('cyan');
    });

    it('returns orange for blue', () => {
      expect(getOpponentColor('blue')).toBe('orange');
    });

    it('returns purple for green', () => {
      expect(getOpponentColor('green')).toBe('purple');
    });

    it('returns brown for yellow', () => {
      expect(getOpponentColor('yellow')).toBe('brown');
    });

    it('returns contrasting colors for all 10 colors', () => {
      expect(getOpponentColor('orange')).toBe('blue');
      expect(getOpponentColor('purple')).toBe('green');
      expect(getOpponentColor('cyan')).toBe('red');
      expect(getOpponentColor('pink')).toBe('green');
      expect(getOpponentColor('white')).toBe('brown');
      expect(getOpponentColor('brown')).toBe('white');
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
      // terrain height at x=0 is 100
      // tank y = terrainHeight + wheelRadius + bodyHeight/2 = 100 + 5 + 8 = 113
      expect(position.x).toBe(0);
      expect(position.y).toBe(113);
    });

    it('calculates position in the middle', () => {
      const position = calculateTankPosition(terrain, 5);
      // terrain height at x=5 is 110
      // tank y = terrainHeight + wheelRadius + bodyHeight/2 = 110 + 5 + 8 = 123
      expect(position.x).toBe(5);
      expect(position.y).toBe(123);
    });

    it('calculates position at a peak', () => {
      const position = calculateTankPosition(terrain, 2);
      // terrain height at x=2 is 150
      // tank y = terrainHeight + wheelRadius + bodyHeight/2 = 150 + 5 + 8 = 163
      expect(position.x).toBe(2);
      expect(position.y).toBe(163);
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

    it('creates correct number of tanks for single enemy', () => {
      const tanks = createInitialTanks(terrain, 'red', 1);
      expect(tanks).toHaveLength(2);
    });

    it('creates correct number of tanks for multiple enemies', () => {
      const tanks = createInitialTanks(terrain, 'red', 3);
      expect(tanks).toHaveLength(4);
    });

    it('creates player tank with correct properties', () => {
      const tanks = createInitialTanks(terrain, 'red', 1);
      const player = tanks[0];

      expect(player?.id).toBe('player');
      expect(player?.color).toBe('red');
      expect(player?.health).toBe(100);
      expect(player?.angle).toBe(-45); // Aiming right toward enemies
      expect(player?.power).toBe(50);
      expect(player?.isActive).toBe(true);
    });

    it('creates enemy tank with correct properties', () => {
      const tanks = createInitialTanks(terrain, 'red', 1);
      const enemy = tanks[1];

      expect(enemy?.id).toBe('enemy-1');
      expect(enemy?.color).not.toBe('red'); // Different from player
      expect(enemy?.health).toBe(100);
      expect(enemy?.angle).toBe(45); // Aiming left toward player
      expect(enemy?.power).toBe(50);
      expect(enemy?.isActive).toBe(false);
    });

    it('places player tank on left side', () => {
      const tanks = createInitialTanks(terrain, 'red', 1);
      const player = tanks[0];
      // Should be at 15% of width
      expect(player?.position.x).toBe(15);
    });

    it('places single enemy tank on right side', () => {
      const tanks = createInitialTanks(terrain, 'red', 1);
      const enemy = tanks[1];
      // Should be at 85% of width
      expect(enemy?.position.x).toBe(85);
    });

    it('calculates correct y positions on terrain', () => {
      const tanks = createInitialTanks(terrain, 'green', 1);
      // terrain height is 50 everywhere
      // tank y = terrainHeight + wheelRadius + bodyHeight/2 = 50 + 5 + 8 = 63
      expect(tanks[0]?.position.y).toBe(63);
      expect(tanks[1]?.position.y).toBe(63);
    });

    it('assigns different colors to enemies', () => {
      const tanks = createInitialTanks(terrain, 'red', 3);
      const enemies = tanks.filter((t) => t.id !== 'player');

      // All enemies should have colors different from player
      for (const enemy of enemies) {
        expect(enemy.color).not.toBe('red');
      }
    });

    it('enemy IDs are sequential', () => {
      const tanks = createInitialTanks(terrain, 'red', 5);
      const enemies = tanks.filter((t) => t.id !== 'player');

      expect(enemies.map((e) => e.id)).toEqual([
        'enemy-1',
        'enemy-2',
        'enemy-3',
        'enemy-4',
        'enemy-5',
      ]);
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
        strokeStyle: '',
        lineWidth: 0,
        shadowColor: '',
        shadowBlur: 0,
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        roundRect: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
      } as unknown as CanvasRenderingContext2D;

      tank = {
        id: 'test',
        position: { x: 100, y: 150 },
        health: 100,
        angle: 45,
        power: 50,
        color: 'red',
        isActive: true,
        queuedShot: null,
        isReady: false,
        killedByWeapon: null,
        stunTurnsRemaining: 0,
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

    it('renders highlight when isCurrentTurn is true', () => {
      renderTank(ctx, tank, 600, { isCurrentTurn: true });
      // Should call stroke for the highlight outline
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders without highlight when isCurrentTurn is false', () => {
      renderTank(ctx, tank, 600, { isCurrentTurn: false });
      expect(() => renderTank(ctx, tank, 600, { isCurrentTurn: false })).not.toThrow();
    });

    it('accepts options parameter', () => {
      expect(() => renderTank(ctx, tank, 600, {})).not.toThrow();
      expect(() => renderTank(ctx, tank, 600, { isCurrentTurn: true })).not.toThrow();
      expect(() => renderTank(ctx, tank, 600, { isCurrentTurn: false })).not.toThrow();
    });
  });
});
