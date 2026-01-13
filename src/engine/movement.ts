/**
 * Tank movement system with fuel mechanics.
 *
 * Fuel consumption is based on the Large terrain (1280px) as reference:
 * - 25 fuel = 25% of Large terrain = 320px movement
 * - Scaled proportionally for other terrain sizes
 */

import type { TankState, TerrainData, Position } from '../types/game';
import { getInterpolatedHeightAt } from './terrain';

// ============================================================================
// MOVEMENT CONSTANTS
// ============================================================================

/** Tank movement speed as percentage of terrain width per second */
export const MOVEMENT_SPEED_PERCENT_PER_SECOND = 2;

/** Fuel consumed per movement increment (1 fuel = 1% of terrain) */
export const MOVEMENT_FUEL_PER_INCREMENT = 1;

/** Reference terrain width for fuel calculations (Large terrain) */
export const LARGE_TERRAIN_WIDTH = 1280;

/** Tank body width for collision detection */
export const TANK_BODY_WIDTH = 50;

/** Tank wheel radius for position calculation */
export const TANK_WHEEL_RADIUS = 5;

/** Tank body height for position calculation */
export const TANK_BODY_HEIGHT = 16;

// ============================================================================
// FUEL CALCULATIONS
// ============================================================================

/**
 * Calculate maximum movement distance based on available fuel.
 *
 * Formula: 25 fuel allows movement of 25% of Large terrain (320px).
 * Distance is scaled based on actual terrain width.
 *
 * @param fuel - Current fuel level (0-100)
 * @param terrainWidth - Width of the current terrain in pixels
 * @returns Maximum distance in pixels the tank can move
 */
export function getMaxMovementDistance(fuel: number, terrainWidth: number): number {
  if (fuel <= 0) return 0;

  // Base: 25 fuel = 320px on Large terrain (1280px)
  // So 1 fuel = 12.8px, and 100 fuel = 1280px (full terrain width)
  const fuelMultiplier = fuel / 25;
  const referenceDistance = LARGE_TERRAIN_WIDTH * 0.25; // 320px

  // Scale by terrain size ratio
  return referenceDistance * fuelMultiplier * (terrainWidth / LARGE_TERRAIN_WIDTH);
}

/**
 * Calculate fuel cost for a given movement distance.
 *
 * @param distance - Distance traveled in pixels (absolute value)
 * @param terrainWidth - Width of the current terrain in pixels
 * @returns Fuel cost (0-100)
 */
export function calculateFuelCost(distance: number, terrainWidth: number): number {
  if (distance <= 0) return 0;

  // Normalize distance to Large terrain scale
  const normalizedDistance = distance * (LARGE_TERRAIN_WIDTH / terrainWidth);

  // 320px = 25 fuel on Large terrain
  const referenceDistance = LARGE_TERRAIN_WIDTH * 0.25;
  const cost = (normalizedDistance / referenceDistance) * 25;

  return Math.ceil(cost); // Round up to prevent free movement
}

// ============================================================================
// COLLISION DETECTION
// ============================================================================

/**
 * Check if movement would collide with another tank.
 * Tanks collide when their centers are within TANK_BODY_WIDTH of each other.
 *
 * @param movingTank - The tank that is moving
 * @param allTanks - All tanks in the game
 * @param targetX - Target X position for the moving tank
 * @returns Collision info with point where tank should stop, or null if no collision
 */
export function checkTankCollision(
  movingTank: TankState,
  allTanks: TankState[],
  targetX: number
): { collidesAt: number; collidedTankId: string } | null {
  const startX = movingTank.position.x;
  const direction = targetX > startX ? 1 : -1;
  const minSeparation = TANK_BODY_WIDTH; // Tanks can't overlap

  let nearestCollision: { collidesAt: number; collidedTankId: string } | null = null;

  for (const otherTank of allTanks) {
    // Skip self and dead tanks
    if (otherTank.id === movingTank.id || otherTank.health <= 0) continue;

    const otherX = otherTank.position.x;

    if (direction > 0) {
      // Moving right: check if other tank is to our right and we'd hit it
      if (otherX > startX) {
        const collisionPoint = otherX - minSeparation;
        if (targetX >= collisionPoint) {
          // We would collide - check if this is the nearest collision
          if (!nearestCollision || collisionPoint < nearestCollision.collidesAt) {
            nearestCollision = { collidesAt: collisionPoint, collidedTankId: otherTank.id };
          }
        }
      }
    } else {
      // Moving left: check if other tank is to our left and we'd hit it
      if (otherX < startX) {
        const collisionPoint = otherX + minSeparation;
        if (targetX <= collisionPoint) {
          // We would collide - check if this is the nearest collision
          if (!nearestCollision || collisionPoint > nearestCollision.collidesAt) {
            nearestCollision = { collidesAt: collisionPoint, collidedTankId: otherTank.id };
          }
        }
      }
    }
  }

  return nearestCollision;
}

// ============================================================================
// MOVEMENT TARGET CALCULATION
// ============================================================================

/**
 * Calculate the final movement target position with all constraints applied.
 * Accounts for:
 * - Available fuel (limited by optional fuelBudget for incremental movement)
 * - Terrain boundaries
 * - Tank collisions
 * - Click-to-move vs key movement
 *
 * @param tank - The tank to move
 * @param direction - Movement direction ('left' or 'right')
 * @param allTanks - All tanks for collision detection
 * @param terrain - Current terrain data
 * @param clickTargetX - Optional: click position for click-to-move
 * @param fuelBudget - Optional: limit fuel usage per increment (for Q/E key movement)
 * @returns Target X position and fuel cost
 */
export function calculateMovementTarget(
  tank: TankState,
  direction: 'left' | 'right',
  allTanks: TankState[],
  terrain: TerrainData,
  clickTargetX?: number,
  fuelBudget?: number
): { targetX: number; fuelCost: number } {
  if (tank.fuel <= 0) {
    return { targetX: tank.position.x, fuelCost: 0 };
  }

  // Use the smaller of fuelBudget or available fuel
  const effectiveFuel = fuelBudget !== undefined ? Math.min(fuelBudget, tank.fuel) : tank.fuel;
  const maxDistance = getMaxMovementDistance(effectiveFuel, terrain.width);
  const directionMultiplier = direction === 'left' ? -1 : 1;

  let targetX: number;

  if (clickTargetX !== undefined) {
    // Click-to-move: move toward click position, limited by effective fuel
    const clickDistance = Math.abs(clickTargetX - tank.position.x);
    const limitedDistance = Math.min(clickDistance, maxDistance);
    targetX = tank.position.x + directionMultiplier * limitedDistance;
  } else {
    // Q/E key movement: move by fuel budget distance in direction
    targetX = tank.position.x + directionMultiplier * maxDistance;
  }

  // Clamp to terrain bounds (with margin for tank width)
  const margin = TANK_BODY_WIDTH / 2;
  targetX = Math.max(margin, Math.min(terrain.width - margin, targetX));

  // Check for collisions with other tanks
  const collision = checkTankCollision(tank, allTanks, targetX);
  if (collision !== null) {
    targetX = collision.collidesAt;
  }

  // Calculate actual fuel cost for distance traveled
  const actualDistance = Math.abs(targetX - tank.position.x);
  const fuelCost = calculateFuelCost(actualDistance, terrain.width);

  return { targetX, fuelCost };
}

// ============================================================================
// ANIMATION
// ============================================================================

/**
 * Easing function for smooth movement animation.
 * Uses ease-in-out quadratic for natural acceleration/deceleration.
 *
 * @param t - Progress from 0 to 1
 * @returns Eased progress from 0 to 1
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Calculate animation duration based on distance and terrain width.
 * Speed is defined as percentage of terrain per second.
 *
 * @param distance - Distance to travel in pixels
 * @param terrainWidth - Width of terrain in pixels
 * @returns Duration in milliseconds
 */
export function calculateAnimationDuration(distance: number, terrainWidth: number): number {
  // Speed = MOVEMENT_SPEED_PERCENT_PER_SECOND% of terrain per second
  // Duration = distance / speed
  const speedPixelsPerSecond = (MOVEMENT_SPEED_PERCENT_PER_SECOND / 100) * terrainWidth;
  const durationSeconds = Math.abs(distance) / speedPixelsPerSecond;
  return durationSeconds * 1000;
}

/**
 * Get the interpolated position during movement animation.
 * Tank follows terrain height as it moves.
 * Speed is ~2% of terrain width per second.
 *
 * @param startX - Starting X position
 * @param targetX - Target X position
 * @param terrain - Terrain data for height lookup
 * @param startTime - Animation start timestamp (ms)
 * @param currentTime - Current timestamp (ms)
 * @returns Current position and whether animation is complete
 */
export function getAnimatedPosition(
  startX: number,
  targetX: number,
  terrain: TerrainData,
  startTime: number,
  currentTime: number
): { position: Position; complete: boolean } {
  const distance = targetX - startX;
  const duration = calculateAnimationDuration(distance, terrain.width);
  const elapsed = currentTime - startTime;
  const progress = Math.min(1, elapsed / duration);
  const easedProgress = easeInOutQuad(progress);

  // Interpolate X position
  const x = startX + (targetX - startX) * easedProgress;

  // Get terrain height at interpolated X
  const terrainHeight = getInterpolatedHeightAt(terrain, Math.floor(x)) ?? 0;

  // Calculate tank Y position (same formula as calculateTankPosition)
  const y = terrainHeight + TANK_WHEEL_RADIUS + TANK_BODY_HEIGHT / 2;

  return {
    position: { x, y },
    complete: progress >= 1,
  };
}

/**
 * Calculate the final position when movement completes.
 *
 * @param targetX - Final X position
 * @param terrain - Terrain data for height lookup
 * @returns Final position with correct Y for terrain
 */
export function getFinalPosition(targetX: number, terrain: TerrainData): Position {
  const terrainHeight = getInterpolatedHeightAt(terrain, Math.floor(targetX)) ?? 0;
  return {
    x: targetX,
    y: terrainHeight + TANK_WHEEL_RADIUS + TANK_BODY_HEIGHT / 2,
  };
}
