import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CampaignProvider, useCampaign } from './CampaignContext';
import type { CampaignConfig } from '../types/game';

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

describe('CampaignContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CampaignProvider>{children}</CampaignProvider>
  );

  const defaultConfig: CampaignConfig = {
    terrainSize: 'medium',
    enemyCount: 3,
    playerColor: 'red',
    aiDifficulty: 'veteran',
  };

  describe('initial state', () => {
    it('should start with no campaign', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });
      expect(result.current.campaign).toBeNull();
      expect(result.current.isCampaignMode).toBe(false);
    });

    it('should not have existing campaign initially', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });
      expect(result.current.hasExistingCampaign()).toBe(false);
    });
  });

  describe('startNewCampaign', () => {
    it('should create a new campaign with correct length', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(5, defaultConfig, 'TestPlayer');
      });

      expect(result.current.campaign).not.toBeNull();
      expect(result.current.campaign?.length).toBe(5);
      expect(result.current.isCampaignMode).toBe(true);
    });

    it('should create player participant with correct name', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'PlayerOne');
      });

      const player = result.current.getPlayer();
      expect(player).not.toBeNull();
      expect(player?.name).toBe('PlayerOne');
      expect(player?.isPlayer).toBe(true);
    });

    it('should create correct number of AI participants', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });
      const config = { ...defaultConfig, enemyCount: 5 as const };

      act(() => {
        result.current.startNewCampaign(3, config, 'TestPlayer');
      });

      const aiParticipants = result.current.getAIParticipants();
      expect(aiParticipants).toHaveLength(5);
      aiParticipants.forEach(ai => {
        expect(ai.isPlayer).toBe(false);
        expect(ai.name).toBeTruthy(); // Should have a general name
      });
    });

    it('should start all participants with $500', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      result.current.campaign?.participants.forEach(p => {
        expect(p.balance).toBe(500);
      });
    });

    it('should persist campaign to localStorage', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      expect(result.current.hasExistingCampaign()).toBe(true);
    });
  });

  describe('resumeCampaign', () => {
    it('should resume existing campaign', () => {
      const { result: result1 } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result1.current.startNewCampaign(5, defaultConfig, 'TestPlayer');
      });

      const campaignId = result1.current.campaign?.campaignId;

      // Create new hook instance (simulating page reload)
      const { result: result2 } = renderHook(() => useCampaign(), { wrapper });

      let success = false;
      act(() => {
        success = result2.current.resumeCampaign();
      });

      expect(success).toBe(true);
      expect(result2.current.campaign?.campaignId).toBe(campaignId);
    });

    it('should return false if no campaign exists', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      let success = true;
      act(() => {
        success = result.current.resumeCampaign();
      });

      expect(success).toBe(false);
    });
  });

  describe('abandonCampaign', () => {
    it('should clear campaign state', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      expect(result.current.isCampaignMode).toBe(true);

      act(() => {
        result.current.abandonCampaign();
      });

      expect(result.current.campaign).toBeNull();
      expect(result.current.isCampaignMode).toBe(false);
      expect(result.current.hasExistingCampaign()).toBe(false);
    });
  });

  describe('recordKill', () => {
    it('should increment kill count', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const player = result.current.getPlayer();
      expect(player?.kills).toBe(0);

      act(() => {
        result.current.recordKill(player!.id);
      });

      const updatedPlayer = result.current.getPlayer();
      expect(updatedPlayer?.kills).toBe(1);
    });

    it('should trigger level up after 3 kills', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });
      const config = { ...defaultConfig, aiDifficulty: 'private' as const };

      act(() => {
        result.current.startNewCampaign(3, config, 'TestPlayer');
      });

      const player = result.current.getPlayer();

      // Record 2 kills - no level up
      let newLevel: string | null = null;
      act(() => {
        result.current.recordKill(player!.id);
        newLevel = result.current.recordKill(player!.id);
      });
      expect(newLevel).toBeNull();

      // 3rd kill should trigger level up
      act(() => {
        newLevel = result.current.recordKill(player!.id);
      });
      expect(newLevel).toBe('veteran'); // private -> veteran

      const updatedPlayer = result.current.getPlayer();
      expect(updatedPlayer?.currentLevel).toBe('veteran');
    });
  });

  describe('recordDeath', () => {
    it('should increment death count', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const player = result.current.getPlayer();

      act(() => {
        result.current.recordDeath(player!.id);
      });

      const updatedPlayer = result.current.getPlayer();
      expect(updatedPlayer?.deaths).toBe(1);
    });
  });

  describe('recordGameEnd', () => {
    it('should increment wins for winner', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const player = result.current.getPlayer();

      act(() => {
        result.current.recordGameEnd(player!.id);
      });

      const updatedPlayer = result.current.getPlayer();
      expect(updatedPlayer?.wins).toBe(1);
      expect(updatedPlayer?.gamesPlayed).toBe(1);
    });

    it('should increment gamesPlayed for all participants', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const ai = result.current.getAIParticipants()[0]!;

      act(() => {
        result.current.recordGameEnd(ai.id);
      });

      // All participants should have 1 game played
      result.current.campaign?.participants.forEach(p => {
        expect(p.gamesPlayed).toBe(1);
      });

      // Only the winner should have a win
      const player = result.current.getPlayer();
      expect(player?.wins).toBe(0);
    });
  });

  describe('advanceToNextGame', () => {
    it('should increment current game', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      expect(result.current.getCurrentGame()).toBe(1);

      act(() => {
        result.current.advanceToNextGame();
      });

      expect(result.current.getCurrentGame()).toBe(2);
    });

    it('should return false when campaign is complete', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      // Advance through all games
      let canAdvance = true;
      act(() => {
        result.current.advanceToNextGame(); // 1 -> 2
        result.current.advanceToNextGame(); // 2 -> 3
        canAdvance = result.current.advanceToNextGame(); // 3 -> should fail
      });

      expect(canAdvance).toBe(false);
    });
  });

  describe('updateBalance', () => {
    it('should update participant balance', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const player = result.current.getPlayer();

      act(() => {
        result.current.updateBalance(player!.id, 100);
      });

      const updatedPlayer = result.current.getPlayer();
      expect(updatedPlayer?.balance).toBe(600); // 500 + 100
    });

    it('should not go below 0', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const player = result.current.getPlayer();

      act(() => {
        result.current.updateBalance(player!.id, -1000);
      });

      const updatedPlayer = result.current.getPlayer();
      expect(updatedPlayer?.balance).toBe(0);
    });
  });

  describe('purchaseWeapon', () => {
    it('should purchase weapon and deduct cost', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const player = result.current.getPlayer();

      let success = false;
      act(() => {
        success = result.current.purchaseWeapon(player!.id, 'heavy_artillery');
      });

      expect(success).toBe(true);
      const updatedPlayer = result.current.getPlayer();
      expect(updatedPlayer!.balance).toBeLessThan(500);
      expect(updatedPlayer!.weaponInventory.heavy_artillery).toBe(1);
    });

    it('should fail if insufficient funds', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const player = result.current.getPlayer();

      // Drain the balance first
      act(() => {
        result.current.updateBalance(player!.id, -500);
      });

      let success = true;
      act(() => {
        success = result.current.purchaseWeapon(player!.id, 'heavy_artillery');
      });

      expect(success).toBe(false);
    });
  });

  describe('useWeapon', () => {
    it('should consume weapon from inventory', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const player = result.current.getPlayer();

      // First purchase a weapon
      act(() => {
        result.current.purchaseWeapon(player!.id, 'heavy_artillery');
      });

      let success = false;
      act(() => {
        success = result.current.useWeapon(player!.id, 'heavy_artillery');
      });

      expect(success).toBe(true);
      const updatedPlayer = result.current.getPlayer();
      expect(updatedPlayer!.weaponInventory.heavy_artillery).toBe(0);
    });

    it('should always succeed for standard weapon', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const player = result.current.getPlayer();

      let success = false;
      act(() => {
        success = result.current.useWeapon(player!.id, 'standard');
      });

      expect(success).toBe(true);
    });

    it('should fail if weapon not in inventory', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      const player = result.current.getPlayer();

      let success = true;
      act(() => {
        success = result.current.useWeapon(player!.id, 'heavy_artillery');
      });

      expect(success).toBe(false);
    });
  });

  describe('campaign status helpers', () => {
    it('should report correct game numbers', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(5, defaultConfig, 'TestPlayer');
      });

      expect(result.current.getCurrentGame()).toBe(1);
      expect(result.current.getTotalGames()).toBe(5);
    });

    it('should correctly identify campaign completion', () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      act(() => {
        result.current.startNewCampaign(3, defaultConfig, 'TestPlayer');
      });

      expect(result.current.isCampaignComplete()).toBe(false);

      // Advance through all games
      act(() => {
        result.current.advanceToNextGame(); // 1 -> 2
        result.current.advanceToNextGame(); // 2 -> 3
      });

      // Still on game 3, not complete
      expect(result.current.isCampaignComplete()).toBe(false);
    });
  });
});
