import { describe, it, expect } from 'vitest';
import {
  calculateKillReward,
  calculateGameEarnings,
  calculateWinBonus,
  EASY_MODE_KILL_MULTIPLIER,
  LOSS_CONSOLATION,
} from './weapons';
import { calculateAIGameEarnings } from './ai';

describe('Easy Mode earn-more-per-kill (tanks-307)', () => {
  it('should multiply the per-kill reward by the easy-mode multiplier (happy path)', () => {
    const normal = calculateKillReward('veteran', false);
    const easy = calculateKillReward('veteran', true);
    expect(easy).toBe(normal * EASY_MODE_KILL_MULTIPLIER);
  });

  it('should default to normal reward when easyMode is omitted (back-compat)', () => {
    expect(calculateKillReward('veteran')).toBe(calculateKillReward('veteran', false));
  });

  it('should boost only the KILL portion of game earnings, not the win bonus (behavior)', () => {
    const kills = 3;
    const normal = calculateGameEarnings(true, kills, 'veteran', false);
    const easy = calculateGameEarnings(true, kills, 'veteran', true);
    const winBonus = calculateWinBonus('veteran');
    // Easy adds only the extra kill reward; the win bonus is identical.
    const extraKillMoney = calculateKillReward('veteran', false) * kills * (EASY_MODE_KILL_MULTIPLIER - 1);
    expect(easy - normal).toBe(extraKillMoney);
    // Win bonus component unchanged (both include the same winBonus).
    expect(easy).toBe(calculateKillReward('veteran', true) * kills + winBonus);
  });

  it('should keep the loss consolation unchanged in easy mode (edge)', () => {
    const easyLoss = calculateGameEarnings(false, 0, 'veteran', true);
    expect(easyLoss).toBe(LOSS_CONSOLATION);
  });

  it('should apply the same multiplier in campaign earnings (calculateAIGameEarnings) for the player', () => {
    const kills = 2;
    const normal = calculateAIGameEarnings(true, kills, 'veteran', false);
    const easy = calculateAIGameEarnings(true, kills, 'veteran', true);
    // The kill portion doubles; the win bonus is unchanged.
    const killPortionNormal = Math.round(200 * 1.0) * kills;
    expect(easy - normal).toBe(killPortionNormal * (EASY_MODE_KILL_MULTIPLIER - 1));
  });

  it('should leave AI campaign earnings unchanged (easyMode defaults false)', () => {
    expect(calculateAIGameEarnings(true, 2, 'primus')).toBe(
      calculateAIGameEarnings(true, 2, 'primus', false)
    );
  });
});
