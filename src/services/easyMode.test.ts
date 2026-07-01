import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  saveUserData,
  loadUserData,
  createNewCampaign,
  applyEasyModeStartBonus,
} from './userDatabase';
import { EASY_MODE_STARTING_MONEY } from '../engine/weapons';
import { CAMPAIGN_STARTING_BALANCE, type CampaignConfig } from '../types/game';

function config(easyMode: boolean): CampaignConfig {
  return { terrainSize: 'medium', enemyCount: 2, playerColor: 'red', aiDifficulty: 'veteran', easyMode };
}

describe('Easy Mode — campaign starting money (tanks-304.2)', () => {
  beforeEach(() => localStorage.clear());

  it('should give the PLAYER extra starting money in easy mode, AI stays normal (happy path)', () => {
    const c = createNewCampaign(3, config(true), 'P', ['Napoleon', 'Caesar']);
    const player = c.participants.find((p) => p.isPlayer)!;
    const ai = c.participants.filter((p) => !p.isPlayer);
    expect(player.balance).toBe(EASY_MODE_STARTING_MONEY);
    expect(ai.every((a) => a.balance === CAMPAIGN_STARTING_BALANCE)).toBe(true);
  });

  it('should use the normal starting balance when easy mode is off (edge)', () => {
    const c = createNewCampaign(3, config(false), 'P', ['Napoleon', 'Caesar']);
    expect(c.participants.find((p) => p.isPlayer)!.balance).toBe(CAMPAIGN_STARTING_BALANCE);
  });

  it('should default to normal balance when easyMode is undefined (back-compat)', () => {
    const legacy: CampaignConfig = { terrainSize: 'medium', enemyCount: 1, playerColor: 'blue', aiDifficulty: 'veteran' };
    const c = createNewCampaign(3, legacy, 'P', ['Napoleon']);
    expect(c.participants.find((p) => p.isPlayer)!.balance).toBe(CAMPAIGN_STARTING_BALANCE);
  });
});

describe('Easy Mode — free-play starting bonus (tanks-304.2)', () => {
  beforeEach(() => localStorage.clear());

  it('should raise a brand-new player up to the easy-mode floor (happy path)', () => {
    createUser('Newbie'); // starts with STARTING_MONEY, gamesPlayed 0
    const balance = applyEasyModeStartBonus();
    expect(balance).toBe(EASY_MODE_STARTING_MONEY);
    expect(loadUserData()!.stats.balance).toBe(EASY_MODE_STARTING_MONEY);
  });

  it('should be a no-op for a player who has already played (not exploitable)', () => {
    const u = createUser('Veteran');
    u.stats.gamesPlayed = 3;
    u.stats.balance = 300;
    saveUserData(u);
    expect(applyEasyModeStartBonus()).toBe(300);
    expect(loadUserData()!.stats.balance).toBe(300);
  });

  it('should never lower a rich new player below their balance (edge: floor only)', () => {
    const u = createUser('Rich');
    u.stats.balance = 5000; // above the floor, gamesPlayed still 0
    saveUserData(u);
    expect(applyEasyModeStartBonus()).toBe(5000);
  });

  it('should return null when there is no current player (error path)', () => {
    localStorage.clear();
    expect(applyEasyModeStartBonus()).toBeNull();
  });
});
