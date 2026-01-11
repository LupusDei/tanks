import type { Position } from '../types/game';

/**
 * Duration of money animation in milliseconds.
 */
export const MONEY_ANIMATION_DURATION_MS = 1500;

/**
 * State of a money earned animation.
 * Shows floating text like "+$200" rising from destroyed tank.
 */
export interface MoneyAnimationState {
  /** Unique identifier for this animation */
  id: string;
  /** Amount of money earned */
  amount: number;
  /** Starting position (where the tank was destroyed) */
  position: Position;
  /** Canvas Y coordinate (pre-computed) */
  canvasY: number;
  /** Animation start time */
  startTime: number;
  /** Whether animation is still active */
  isActive: boolean;
}

/**
 * Create a money animation at the specified position.
 */
export function createMoneyAnimation(
  position: Position,
  canvasHeight: number,
  amount: number,
  startTime: number = performance.now()
): MoneyAnimationState {
  return {
    id: `money-${startTime}-${Math.random().toString(36).slice(2, 9)}`,
    amount,
    position: { ...position },
    canvasY: canvasHeight - position.y,
    startTime,
    isActive: true,
  };
}

/**
 * Get the progress of a money animation (0 to 1).
 */
export function getMoneyAnimationProgress(
  animation: MoneyAnimationState,
  currentTime: number
): number {
  const elapsed = currentTime - animation.startTime;
  return Math.min(1, elapsed / MONEY_ANIMATION_DURATION_MS);
}

/**
 * Check if a money animation is complete.
 */
export function isMoneyAnimationComplete(
  animation: MoneyAnimationState,
  currentTime: number
): boolean {
  return getMoneyAnimationProgress(animation, currentTime) >= 1;
}

/**
 * Update money animation state.
 */
export function updateMoneyAnimation(
  animation: MoneyAnimationState,
  currentTime: number
): MoneyAnimationState {
  if (!animation.isActive) return animation;

  const progress = getMoneyAnimationProgress(animation, currentTime);

  if (progress >= 1) {
    return { ...animation, isActive: false };
  }

  return animation;
}

/**
 * Render the money animation.
 * Shows "+$X" floating upward and fading out.
 */
export function renderMoneyAnimation(
  ctx: CanvasRenderingContext2D,
  animation: MoneyAnimationState,
  currentTime: number
): void {
  if (!animation.isActive) return;

  const progress = getMoneyAnimationProgress(animation, currentTime);

  // Animation parameters
  const floatDistance = 80; // How far the text rises
  const currentY = animation.canvasY - progress * floatDistance;

  // Fade out in the last 40% of the animation
  const fadeStart = 0.6;
  const alpha = progress > fadeStart
    ? 1 - ((progress - fadeStart) / (1 - fadeStart))
    : 1;

  // Scale effect: starts slightly larger and settles
  const scaleProgress = Math.min(1, progress * 4); // Quick settle in first 25%
  const scale = 1 + (1 - scaleProgress) * 0.3; // Starts at 1.3x, settles to 1x

  const text = `+$${animation.amount}`;

  ctx.save();

  // Position and scale
  ctx.translate(animation.position.x, currentY);
  ctx.scale(scale, scale);

  // Text styling
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw outline/shadow for better visibility
  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeText(text, 0, 0);

  // Draw main text in bright green (money color)
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#00ff00';
  ctx.fillText(text, 0, 0);

  // Add a subtle glow effect
  ctx.shadowColor = '#00ff00';
  ctx.shadowBlur = 10;
  ctx.fillText(text, 0, 0);

  ctx.restore();
}
