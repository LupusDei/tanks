import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createNewCampaign,
  loadActiveCampaign,
  clearActiveCampaign,
  hasActiveCampaign,
  recordCampaignKill,
  recordCampaignDeath,
  recordCampaignGameEnd,
  advanceCampaignGame,
  purchaseCampaignWeapon,
  consumeCampaignWeapon,
  updateCampaignParticipantBalance,
} from '../services/userDatabase';
import { CAMPAIGN_STARTING_BALANCE } from '../types/game';
import type { CampaignConfig, CampaignLength, CampaignParticipant } from '../types/game';

// Helper to get player participant
function getPlayer(participants: CampaignParticipant[]): CampaignParticipant | undefined {
  return participants.find(p => p.isPlayer);
}

// Helper to get AI participants
function getAIs(participants: CampaignParticipant[]): CampaignParticipant[] {
  return participants.filter(p => !p.isPlayer);
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('Campaign Integration', () => {
  const defaultConfig: CampaignConfig = {
    terrainSize: 'medium',
    enemyCount: 3,
    playerColor: 'blue',
    aiDifficulty: 'veteran',
  };

  const aiNames = ['General Patton', 'Field Marshal Rommel', 'General Zhukov'];

  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Campaign Creation', () => {
    it('creates a new 3-game campaign with correct initial state', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);

      expect(campaign.length).toBe(3);
      expect(campaign.currentGame).toBe(1);
      expect(campaign.config).toEqual(defaultConfig);
      expect(campaign.participants).toHaveLength(4); // 1 player + 3 enemies
    });

    it('initializes all participants with starting balance', () => {
      const campaign = createNewCampaign(5, defaultConfig, 'TestPlayer', aiNames);

      for (const participant of campaign.participants) {
        expect(participant.balance).toBe(CAMPAIGN_STARTING_BALANCE);
        expect(participant.kills).toBe(0);
        expect(participant.deaths).toBe(0);
        expect(participant.gamesPlayed).toBe(0);
        expect(participant.wins).toBe(0);
      }
    });

    it('assigns general names to AI tanks', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);

      const aiParticipants = getAIs(campaign.participants);
      expect(aiParticipants.map(p => p.name)).toEqual(aiNames);
    });

    it('correctly identifies player participant', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);

      const player = getPlayer(campaign.participants);
      expect(player).toBeDefined();
      expect(player?.name).toBe('TestPlayer');
      expect(player?.isPlayer).toBe(true);
    });

    it('supports different campaign lengths', () => {
      const lengths: CampaignLength[] = [3, 5, 8, 13];

      for (const length of lengths) {
        localStorageMock.clear();
        const campaign = createNewCampaign(length, defaultConfig, 'TestPlayer', aiNames);
        expect(campaign.length).toBe(length);
      }
    });

    it('assigns predictable IDs matching game tank IDs', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);

      // Player ID must match game tank ID
      const player = getPlayer(campaign.participants);
      expect(player?.id).toBe('player');

      // AI IDs must match game tank IDs
      const ais = getAIs(campaign.participants);
      expect(ais[0]?.id).toBe('enemy-1');
      expect(ais[1]?.id).toBe('enemy-2');
      expect(ais[2]?.id).toBe('enemy-3');
    });
  });

  describe('Campaign Persistence', () => {
    it('saves campaign to localStorage when created', () => {
      createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);

      expect(hasActiveCampaign()).toBe(true);
      expect(loadActiveCampaign()).not.toBeNull();
    });

    it('restores campaign state after reload', () => {
      const original = createNewCampaign(5, defaultConfig, 'TestPlayer', aiNames);

      // Simulate browser reload by loading from localStorage
      const restored = loadActiveCampaign();

      expect(restored).not.toBeNull();
      expect(restored?.campaignId).toBe(original.campaignId);
      expect(restored?.length).toBe(original.length);
      expect(restored?.participants).toHaveLength(original.participants.length);
    });

    it('persists stat changes across reload', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;
      const firstAI = getAIs(campaign.participants)[0]!;

      // Make some changes
      recordCampaignKill(player.id);
      recordCampaignDeath(firstAI.id);

      // Reload
      const restored = loadActiveCampaign();
      const restoredPlayer = getPlayer(restored!.participants);
      const restoredAI = restored!.participants.find(p => p.id === firstAI.id);

      expect(restoredPlayer?.kills).toBe(1);
      expect(restoredAI?.deaths).toBe(1);
    });

    it('clears campaign when abandoned', () => {
      createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      expect(hasActiveCampaign()).toBe(true);

      clearActiveCampaign();
      expect(hasActiveCampaign()).toBe(false);
      expect(loadActiveCampaign()).toBeNull();
    });
  });

  describe('Single Active Campaign', () => {
    it('only allows one active campaign at a time', () => {
      const first = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);

      // Creating another should replace the first
      const second = createNewCampaign(5, defaultConfig, 'TestPlayer', aiNames);

      const active = loadActiveCampaign();
      expect(active?.campaignId).toBe(second.campaignId);
      expect(active?.campaignId).not.toBe(first.campaignId);
      expect(active?.length).toBe(5);
    });

    it('allows starting new campaign after abandoning old', () => {
      const first = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      clearActiveCampaign();

      const second = createNewCampaign(8, defaultConfig, 'TestPlayer', aiNames);

      expect(hasActiveCampaign()).toBe(true);
      expect(loadActiveCampaign()?.campaignId).toBe(second.campaignId);
      expect(loadActiveCampaign()?.campaignId).not.toBe(first.campaignId);
    });
  });

  describe('Economy', () => {
    it('updates balance when earning money from kills', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      updateCampaignParticipantBalance(player.id, 100);

      const restored = loadActiveCampaign();
      const restoredPlayer = getPlayer(restored!.participants);
      expect(restoredPlayer?.balance).toBe(CAMPAIGN_STARTING_BALANCE + 100);
    });

    it('allows weapon purchases that deduct from balance', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      const success = purchaseCampaignWeapon(player.id, 'cluster_bomb', 100);
      expect(success).toBe(true);

      const restored = loadActiveCampaign();
      const restoredPlayer = getPlayer(restored!.participants);
      expect(restoredPlayer?.balance).toBe(CAMPAIGN_STARTING_BALANCE - 100);
      expect(restoredPlayer?.weaponInventory.cluster_bomb).toBe(1);
    });

    it('prevents purchases when insufficient funds', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      // Try to buy something too expensive
      const success = purchaseCampaignWeapon(player.id, 'homing_missile', 10000);
      expect(success).toBe(false);

      const restored = loadActiveCampaign();
      const restoredPlayer = getPlayer(restored!.participants);
      expect(restoredPlayer?.balance).toBe(CAMPAIGN_STARTING_BALANCE); // Unchanged
    });

    it('tracks purchased weapons in inventory', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      purchaseCampaignWeapon(player.id, 'cluster_bomb', 100);
      purchaseCampaignWeapon(player.id, 'cluster_bomb', 100);
      purchaseCampaignWeapon(player.id, 'homing_missile', 150);

      const restored = loadActiveCampaign();
      const restoredPlayer = getPlayer(restored!.participants);
      expect(restoredPlayer?.weaponInventory.cluster_bomb).toBe(2);
      expect(restoredPlayer?.weaponInventory.homing_missile).toBe(1);
    });

    it('consumes weapons from inventory when used', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      purchaseCampaignWeapon(player.id, 'cluster_bomb', 100);
      purchaseCampaignWeapon(player.id, 'cluster_bomb', 100);

      const success = consumeCampaignWeapon(player.id, 'cluster_bomb');
      expect(success).toBe(true);

      const restored = loadActiveCampaign();
      const restoredPlayer = getPlayer(restored!.participants);
      expect(restoredPlayer?.weaponInventory.cluster_bomb).toBe(1);
    });

    it('prevents consuming weapons not in inventory', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      const success = consumeCampaignWeapon(player.id, 'cluster_bomb');
      expect(success).toBe(false);
    });
  });

  describe('Skill Progression', () => {
    it('levels up participant after 3 kills', () => {
      const campaign = createNewCampaign(3, { ...defaultConfig, aiDifficulty: 'blind_fool' }, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      // Record 3 kills
      let newLevel = recordCampaignKill(player.id);
      expect(newLevel).toBeNull(); // No level up yet

      newLevel = recordCampaignKill(player.id);
      expect(newLevel).toBeNull(); // Still no level up

      newLevel = recordCampaignKill(player.id);
      expect(newLevel).toBe('private'); // Level up!

      const restored = loadActiveCampaign();
      const restoredPlayer = getPlayer(restored!.participants);
      expect(restoredPlayer?.kills).toBe(3);
      expect(restoredPlayer?.currentLevel).toBe('private');
    });

    it('continues leveling up with more kills', () => {
      const campaign = createNewCampaign(3, { ...defaultConfig, aiDifficulty: 'blind_fool' }, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      // Get 6 kills for two level ups
      for (let i = 0; i < 6; i++) {
        recordCampaignKill(player.id);
      }

      const restored = loadActiveCampaign();
      const restoredPlayer = getPlayer(restored!.participants);
      expect(restoredPlayer?.kills).toBe(6);
      expect(restoredPlayer?.currentLevel).toBe('veteran'); // blind_fool -> private -> veteran
    });

    it('caps at maximum difficulty level', () => {
      const campaign = createNewCampaign(3, { ...defaultConfig, aiDifficulty: 'centurion' }, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      // Get 6 kills - should only level up once (centurion -> primus)
      for (let i = 0; i < 6; i++) {
        recordCampaignKill(player.id);
      }

      const restored = loadActiveCampaign();
      const restoredPlayer = getPlayer(restored!.participants);
      expect(restoredPlayer?.currentLevel).toBe('primus'); // Max level
    });
  });

  describe('Game End and Leaderboard', () => {
    it('records game end for winner', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      recordCampaignGameEnd(player.id);

      const restored = loadActiveCampaign();
      const restoredPlayer = getPlayer(restored!.participants);
      expect(restoredPlayer?.wins).toBe(1);
      expect(restoredPlayer?.gamesPlayed).toBe(1);
    });

    it('increments games played for all participants on game end', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      recordCampaignGameEnd(player.id);

      const restored = loadActiveCampaign();
      for (const participant of restored?.participants ?? []) {
        expect(participant.gamesPlayed).toBe(1);
      }
    });

    it('only gives win to the winner', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const firstAI = getAIs(campaign.participants)[0]!;

      recordCampaignGameEnd(firstAI.id);

      const restored = loadActiveCampaign();
      const restoredWinner = restored!.participants.find(p => p.id === firstAI.id);
      const restoredLoser = getPlayer(restored!.participants);

      expect(restoredWinner?.wins).toBe(1);
      expect(restoredLoser?.wins).toBe(0);
    });
  });

  describe('Game Flow', () => {
    it('advances to next game correctly via recordCampaignGameEnd', () => {
      const campaign = createNewCampaign(5, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      expect(loadActiveCampaign()?.currentGame).toBe(1);

      // recordCampaignGameEnd increments currentGame
      recordCampaignGameEnd(player.id);
      expect(loadActiveCampaign()?.currentGame).toBe(2);

      recordCampaignGameEnd(player.id);
      expect(loadActiveCampaign()?.currentGame).toBe(3);
    });

    it('tracks correct game count for 3-game campaign', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      expect(loadActiveCampaign()?.currentGame).toBe(1);

      // Game 1 ends
      recordCampaignGameEnd(player.id);
      expect(loadActiveCampaign()?.currentGame).toBe(2);
      expect(advanceCampaignGame()).toBe(true); // Can continue to game 2

      // Game 2 ends
      recordCampaignGameEnd(player.id);
      expect(loadActiveCampaign()?.currentGame).toBe(3);
      expect(advanceCampaignGame()).toBe(true); // Can continue to game 3

      // Game 3 ends (final game)
      recordCampaignGameEnd(player.id);
      expect(loadActiveCampaign()?.currentGame).toBe(4); // Past the end
      expect(advanceCampaignGame()).toBe(false); // Cannot continue
    });

    it('returns false when trying to advance past final game', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;

      // Play all 3 games
      recordCampaignGameEnd(player.id); // Game 1 ends
      recordCampaignGameEnd(player.id); // Game 2 ends
      recordCampaignGameEnd(player.id); // Game 3 ends

      // After final game, currentGame > length
      expect(loadActiveCampaign()?.currentGame).toBe(4);
      expect(advanceCampaignGame()).toBe(false);
    });
  });

  describe('Kill and Death Tracking', () => {
    it('accurately tracks kills for all participants', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;
      const firstAI = getAIs(campaign.participants)[0]!;

      recordCampaignKill(player.id);
      recordCampaignKill(player.id);
      recordCampaignKill(firstAI.id);

      const restored = loadActiveCampaign();
      expect(getPlayer(restored!.participants)?.kills).toBe(2);
      expect(restored!.participants.find(p => p.id === firstAI.id)?.kills).toBe(1);
    });

    it('accurately tracks deaths for all participants', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;
      const firstAI = getAIs(campaign.participants)[0]!;

      recordCampaignDeath(player.id);
      recordCampaignDeath(firstAI.id);
      recordCampaignDeath(firstAI.id);

      const restored = loadActiveCampaign();
      expect(getPlayer(restored!.participants)?.deaths).toBe(1);
      expect(restored!.participants.find(p => p.id === firstAI.id)?.deaths).toBe(2);
    });

    it('maintains correct kill/death counts across multiple games', () => {
      const campaign = createNewCampaign(3, defaultConfig, 'TestPlayer', aiNames);
      const player = getPlayer(campaign.participants)!;
      const firstAI = getAIs(campaign.participants)[0]!;
      const secondAI = getAIs(campaign.participants)[1]!;

      // Game 1
      recordCampaignKill(player.id);
      recordCampaignDeath(firstAI.id);
      recordCampaignGameEnd(player.id); // Also advances currentGame

      // Game 2
      recordCampaignKill(secondAI.id);
      recordCampaignDeath(player.id);
      recordCampaignGameEnd(secondAI.id); // Also advances currentGame

      const restored = loadActiveCampaign();
      expect(getPlayer(restored!.participants)?.kills).toBe(1);
      expect(getPlayer(restored!.participants)?.deaths).toBe(1);
      expect(restored!.participants.find(p => p.id === firstAI.id)?.deaths).toBe(1);
      expect(restored!.participants.find(p => p.id === secondAI.id)?.kills).toBe(1);
    });
  });
});
