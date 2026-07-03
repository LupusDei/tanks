import { describe, it, expect } from 'vitest';
import { getFallPosition, getTankSettleTargetY, FALL_GRAVITY } from './fall';
import { generateTerrain } from './terrain';
import { calculateTankPosition } from './tank';
import type { TankState } from '../types/game';

const settleTerrain = generateTerrain({ width: 800, height: 600, seed: 9 });
function tankAt(x: number, y: number): TankState {
  return {
    id: 'p', position: { x, y }, health: 100, maxHealth: 100, shieldHp: 0, maxShieldHp: 0,
    armorType: null, angle: 45, power: 50, color: 'red', isActive: true, queuedShot: null,
    isReady: false, killedByWeapon: null, stunTurnsRemaining: 0, fuel: 100, maxFuel: 100,
    isMoving: false, moveTargetX: null, moveStartTime: null, moveStartX: null,
  };
}

describe('getFallPosition (tanks-311)', () => {
  it('should hold at the floating start during the pre-fall delay (happy path)', () => {
    // startTime in the future (delay not elapsed): tank stays put, not complete.
    const r = getFallPosition(200, 120, 1000, 900); // now < startTime
    expect(r.y).toBe(200);
    expect(r.complete).toBe(false);
  });

  it('should accelerate downward (y decreases) once the delay passes (behavior)', () => {
    const start = getFallPosition(200, 120, 1000, 1000); // exactly at startTime
    const mid = getFallPosition(200, 120, 1000, 1200); // 0.2s in
    expect(start.y).toBe(200);
    expect(mid.y).toBeLessThan(200);
    expect(mid.y).toBeGreaterThan(120);
    expect(mid.complete).toBe(false);
  });

  it('should land exactly at the target and report complete (edge)', () => {
    // Enough time for a 80px drop at FALL_GRAVITY: t = sqrt(2*80/g).
    const t = Math.sqrt((2 * 80) / FALL_GRAVITY);
    const r = getFallPosition(200, 120, 1000, 1000 + t * 1000 + 50);
    expect(r.y).toBe(120);
    expect(r.complete).toBe(true);
  });

  it('should be immediately complete when there is nothing to fall to (target >= start)', () => {
    expect(getFallPosition(120, 120, 0, 5000)).toEqual({ y: 120, complete: true });
    expect(getFallPosition(120, 150, 0, 5000)).toEqual({ y: 150, complete: true });
  });

  it('should fall faster with higher gravity (behavior)', () => {
    const slow = getFallPosition(300, 0, 0, 300, 200); // 0.3s
    const fast = getFallPosition(300, 0, 0, 300, 800); // 0.3s
    expect(fast.y).toBeLessThan(slow.y);
  });
});

describe('getTankSettleTargetY (tanks-311)', () => {
  it('should return the surface Y when the tank is floating above destroyed ground', () => {
    const grounded = calculateTankPosition(settleTerrain, 400);
    // Place the tank well above the surface (ground was blown out beneath it).
    const floating = tankAt(400, grounded.y + 60);
    const target = getTankSettleTargetY(floating, settleTerrain);
    expect(target).toBe(grounded.y);
  });

  it('should return null when the tank is already resting on the surface (edge)', () => {
    const grounded = calculateTankPosition(settleTerrain, 250);
    const resting = tankAt(250, grounded.y);
    expect(getTankSettleTargetY(resting, settleTerrain)).toBeNull();
  });

  it('should return null for a sub-threshold gap (avoids jitter)', () => {
    const grounded = calculateTankPosition(settleTerrain, 300);
    const barelyAbove = tankAt(300, grounded.y + 2); // < FALL_THRESHOLD
    expect(getTankSettleTargetY(barelyAbove, settleTerrain)).toBeNull();
  });
});
