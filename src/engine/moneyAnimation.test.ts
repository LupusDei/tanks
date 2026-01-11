import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MONEY_ANIMATION_DURATION_MS,
  createMoneyAnimation,
  getMoneyAnimationProgress,
  isMoneyAnimationComplete,
  updateMoneyAnimation,
  renderMoneyAnimation,
} from './moneyAnimation';

describe('moneyAnimation', () => {
  describe('createMoneyAnimation', () => {
    it('creates a money animation with correct properties', () => {
      const position = { x: 100, y: 200 };
      const canvasHeight = 600;
      const amount = 200;
      const startTime = 1000;

      const animation = createMoneyAnimation(position, canvasHeight, amount, startTime);

      expect(animation.amount).toBe(200);
      expect(animation.position).toEqual({ x: 100, y: 200 });
      expect(animation.canvasY).toBe(400); // canvasHeight - position.y
      expect(animation.startTime).toBe(1000);
      expect(animation.isActive).toBe(true);
      expect(animation.id).toContain('money-');
    });

    it('creates unique IDs for each animation', () => {
      const position = { x: 100, y: 200 };
      const anim1 = createMoneyAnimation(position, 600, 100, 1000);
      const anim2 = createMoneyAnimation(position, 600, 100, 1001);

      expect(anim1.id).not.toBe(anim2.id);
    });

    it('uses current time when startTime not provided', () => {
      const position = { x: 100, y: 200 };
      const before = performance.now();
      const animation = createMoneyAnimation(position, 600, 100);
      const after = performance.now();

      expect(animation.startTime).toBeGreaterThanOrEqual(before);
      expect(animation.startTime).toBeLessThanOrEqual(after);
    });
  });

  describe('getMoneyAnimationProgress', () => {
    it('returns 0 at start time', () => {
      const animation = createMoneyAnimation({ x: 0, y: 0 }, 600, 100, 1000);
      const progress = getMoneyAnimationProgress(animation, 1000);
      expect(progress).toBe(0);
    });

    it('returns 0.5 at halfway point', () => {
      const animation = createMoneyAnimation({ x: 0, y: 0 }, 600, 100, 1000);
      const halfwayTime = 1000 + MONEY_ANIMATION_DURATION_MS / 2;
      const progress = getMoneyAnimationProgress(animation, halfwayTime);
      expect(progress).toBe(0.5);
    });

    it('returns 1 at end time', () => {
      const animation = createMoneyAnimation({ x: 0, y: 0 }, 600, 100, 1000);
      const endTime = 1000 + MONEY_ANIMATION_DURATION_MS;
      const progress = getMoneyAnimationProgress(animation, endTime);
      expect(progress).toBe(1);
    });

    it('caps progress at 1 after end time', () => {
      const animation = createMoneyAnimation({ x: 0, y: 0 }, 600, 100, 1000);
      const afterEndTime = 1000 + MONEY_ANIMATION_DURATION_MS * 2;
      const progress = getMoneyAnimationProgress(animation, afterEndTime);
      expect(progress).toBe(1);
    });
  });

  describe('isMoneyAnimationComplete', () => {
    it('returns false before animation ends', () => {
      const animation = createMoneyAnimation({ x: 0, y: 0 }, 600, 100, 1000);
      const halfway = 1000 + MONEY_ANIMATION_DURATION_MS / 2;
      expect(isMoneyAnimationComplete(animation, halfway)).toBe(false);
    });

    it('returns true when animation ends', () => {
      const animation = createMoneyAnimation({ x: 0, y: 0 }, 600, 100, 1000);
      const endTime = 1000 + MONEY_ANIMATION_DURATION_MS;
      expect(isMoneyAnimationComplete(animation, endTime)).toBe(true);
    });

    it('returns true after animation ends', () => {
      const animation = createMoneyAnimation({ x: 0, y: 0 }, 600, 100, 1000);
      const afterEnd = 1000 + MONEY_ANIMATION_DURATION_MS + 1000;
      expect(isMoneyAnimationComplete(animation, afterEnd)).toBe(true);
    });
  });

  describe('updateMoneyAnimation', () => {
    it('returns unchanged animation if not active', () => {
      const animation = createMoneyAnimation({ x: 0, y: 0 }, 600, 100, 1000);
      const inactiveAnimation = { ...animation, isActive: false };

      const updated = updateMoneyAnimation(inactiveAnimation, 1500);

      expect(updated).toBe(inactiveAnimation);
    });

    it('returns active animation if not complete', () => {
      const animation = createMoneyAnimation({ x: 0, y: 0 }, 600, 100, 1000);
      const halfway = 1000 + MONEY_ANIMATION_DURATION_MS / 2;

      const updated = updateMoneyAnimation(animation, halfway);

      expect(updated.isActive).toBe(true);
    });

    it('marks animation as inactive when complete', () => {
      const animation = createMoneyAnimation({ x: 0, y: 0 }, 600, 100, 1000);
      const endTime = 1000 + MONEY_ANIMATION_DURATION_MS;

      const updated = updateMoneyAnimation(animation, endTime);

      expect(updated.isActive).toBe(false);
    });
  });

  describe('renderMoneyAnimation', () => {
    let mockCtx: CanvasRenderingContext2D;

    beforeEach(() => {
      mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        font: '',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        shadowColor: '',
        shadowBlur: 0,
      } as unknown as CanvasRenderingContext2D;
    });

    it('does not render inactive animation', () => {
      const animation = createMoneyAnimation({ x: 100, y: 200 }, 600, 100, 1000);
      const inactiveAnimation = { ...animation, isActive: false };

      renderMoneyAnimation(mockCtx, inactiveAnimation, 1500);

      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('renders active animation', () => {
      const animation = createMoneyAnimation({ x: 100, y: 200 }, 600, 100, 1000);

      renderMoneyAnimation(mockCtx, animation, 1500);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith('+$100', 0, 0);
    });

    it('renders correct amount text', () => {
      const animation = createMoneyAnimation({ x: 100, y: 200 }, 600, 250, 1000);

      renderMoneyAnimation(mockCtx, animation, 1500);

      expect(mockCtx.fillText).toHaveBeenCalledWith('+$250', 0, 0);
    });

    it('sets up text styling correctly', () => {
      const animation = createMoneyAnimation({ x: 100, y: 200 }, 600, 100, 1000);

      renderMoneyAnimation(mockCtx, animation, 1500);

      expect(mockCtx.font).toBe('bold 24px Arial, sans-serif');
      expect(mockCtx.textAlign).toBe('center');
      expect(mockCtx.textBaseline).toBe('middle');
    });
  });

  describe('MONEY_ANIMATION_DURATION_MS', () => {
    it('is a reasonable duration', () => {
      expect(MONEY_ANIMATION_DURATION_MS).toBeGreaterThan(500);
      expect(MONEY_ANIMATION_DURATION_MS).toBeLessThan(5000);
    });
  });
});
