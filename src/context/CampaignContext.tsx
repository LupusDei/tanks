import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  CampaignState,
  CampaignParticipant,
  CampaignLength,
  CampaignConfig,
  AIDifficulty,
  WeaponType,
  ArmorType,
} from '../types/game';
import {
  loadActiveCampaign,
  clearActiveCampaign,
  createNewCampaign,
  recordCampaignKill,
  recordCampaignDeath,
  recordCampaignGameEnd,
  advanceCampaignGame,
  purchaseCampaignWeapon,
  consumeCampaignWeapon,
  updateCampaignParticipantBalance,
  purchaseCampaignArmor,
  hasCampaignArmor,
  clearAllCampaignArmor,
} from '../services/userDatabase';
import { getRandomGeneralNames } from '../data/legendaryGenerals';
import { WEAPONS, ARMORS } from '../engine/weapons';

interface CampaignContextValue {
  /** The current campaign state, or null if not in campaign mode */
  campaign: CampaignState | null;
  /** Whether the game is in campaign mode */
  isCampaignMode: boolean;
  /** Get the player participant from the campaign */
  getPlayer: () => CampaignParticipant | null;
  /** Get a participant by ID */
  getParticipant: (id: string) => CampaignParticipant | null;
  /** Get all AI participants */
  getAIParticipants: () => CampaignParticipant[];

  // Campaign lifecycle actions
  /** Start a new campaign with the given parameters */
  startNewCampaign: (length: CampaignLength, config: CampaignConfig, playerName: string) => CampaignState;
  /** Resume an existing campaign from localStorage */
  resumeCampaign: () => boolean;
  /** Abandon the current campaign */
  abandonCampaign: () => void;
  /** Check if a campaign exists in localStorage */
  hasExistingCampaign: () => boolean;

  // Game result actions
  /** Record a kill and handle skill progression. Returns new difficulty if leveled up */
  recordKill: (killerId: string) => AIDifficulty | null;
  /** Record a death for a participant */
  recordDeath: (victimId: string) => void;
  /** Record the end of a game and update wins/games played */
  recordGameEnd: (winnerId: string) => void;
  /** Advance to the next game. Returns false if campaign is complete */
  advanceToNextGame: () => boolean;

  // Economy actions
  /** Update a participant's balance */
  updateBalance: (participantId: string, delta: number) => void;
  /** Purchase a weapon for a participant. Returns true if successful */
  purchaseWeapon: (participantId: string, weaponType: WeaponType) => boolean;
  /** Use a weapon from a participant's inventory. Returns true if successful */
  useWeapon: (participantId: string, weaponType: WeaponType) => boolean;

  // Armor actions
  /** Purchase armor for a participant. Returns true if successful */
  purchaseArmor: (participantId: string, armorType: ArmorType) => boolean;
  /** Check if a participant owns specific armor */
  hasArmor: (participantId: string, armorType: ArmorType) => boolean;
  /** Clear all armor from all participants (called after each game) */
  clearAllArmor: () => void;

  // Campaign status
  /** Check if the campaign is complete */
  isCampaignComplete: () => boolean;
  /** Get the current game number */
  getCurrentGame: () => number;
  /** Get the total number of games in the campaign */
  getTotalGames: () => number;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaign, setCampaign] = useState<CampaignState | null>(null);

  // Load existing campaign on mount
  useEffect(() => {
    const existing = loadActiveCampaign();
    if (existing) {
      setCampaign(existing);
    }
  }, []);

  const isCampaignMode = campaign !== null;

  const getPlayer = useCallback((): CampaignParticipant | null => {
    if (!campaign) return null;
    return campaign.participants.find(p => p.isPlayer) ?? null;
  }, [campaign]);

  const getParticipant = useCallback((id: string): CampaignParticipant | null => {
    if (!campaign) return null;
    return campaign.participants.find(p => p.id === id) ?? null;
  }, [campaign]);

  const getAIParticipants = useCallback((): CampaignParticipant[] => {
    if (!campaign) return [];
    return campaign.participants.filter(p => !p.isPlayer);
  }, [campaign]);

  const startNewCampaign = useCallback((
    length: CampaignLength,
    config: CampaignConfig,
    playerName: string
  ): CampaignState => {
    // Get random general names for AI tanks
    const aiNames = getRandomGeneralNames(config.enemyCount);
    const newCampaign = createNewCampaign(length, config, playerName, aiNames);
    setCampaign(newCampaign);
    return newCampaign;
  }, []);

  const resumeCampaign = useCallback((): boolean => {
    const existing = loadActiveCampaign();
    if (existing) {
      setCampaign(existing);
      return true;
    }
    return false;
  }, []);

  const abandonCampaign = useCallback(() => {
    clearActiveCampaign();
    setCampaign(null);
  }, []);

  const hasExistingCampaign = useCallback((): boolean => {
    return loadActiveCampaign() !== null;
  }, []);

  const recordKill = useCallback((killerId: string): AIDifficulty | null => {
    const newLevel = recordCampaignKill(killerId);
    // Reload campaign state to reflect changes
    const updated = loadActiveCampaign();
    if (updated) {
      setCampaign(updated);
    }
    return newLevel;
  }, []);

  const recordDeath = useCallback((victimId: string) => {
    recordCampaignDeath(victimId);
    // Reload campaign state to reflect changes
    const updated = loadActiveCampaign();
    if (updated) {
      setCampaign(updated);
    }
  }, []);

  const recordGameEndCallback = useCallback((winnerId: string) => {
    recordCampaignGameEnd(winnerId);
    // Reload campaign state to reflect changes
    const updated = loadActiveCampaign();
    if (updated) {
      setCampaign(updated);
    }
  }, []);

  const advanceToNextGame = useCallback((): boolean => {
    const success = advanceCampaignGame();
    // Reload campaign state to reflect changes
    const updated = loadActiveCampaign();
    if (updated) {
      setCampaign(updated);
    }
    return success;
  }, []);

  const updateBalance = useCallback((participantId: string, delta: number) => {
    updateCampaignParticipantBalance(participantId, delta);
    // Reload campaign state to reflect changes
    const updated = loadActiveCampaign();
    if (updated) {
      setCampaign(updated);
    }
  }, []);

  const purchaseWeaponCallback = useCallback((participantId: string, weaponType: WeaponType): boolean => {
    const weapon = WEAPONS[weaponType];
    const success = purchaseCampaignWeapon(participantId, weaponType, weapon.cost);
    if (success) {
      // Reload campaign state to reflect changes
      const updated = loadActiveCampaign();
      if (updated) {
        setCampaign(updated);
      }
    }
    return success;
  }, []);

  const useWeaponCallback = useCallback((participantId: string, weaponType: WeaponType): boolean => {
    const success = consumeCampaignWeapon(participantId, weaponType);
    if (success) {
      // Reload campaign state to reflect changes
      const updated = loadActiveCampaign();
      if (updated) {
        setCampaign(updated);
      }
    }
    return success;
  }, []);

  const purchaseArmorCallback = useCallback((participantId: string, armorType: ArmorType): boolean => {
    const armor = ARMORS[armorType];
    const success = purchaseCampaignArmor(participantId, armorType, armor.cost);
    if (success) {
      // Reload campaign state to reflect changes
      const updated = loadActiveCampaign();
      if (updated) {
        setCampaign(updated);
      }
    }
    return success;
  }, []);

  const hasArmorCallback = useCallback((participantId: string, armorType: ArmorType): boolean => {
    return hasCampaignArmor(participantId, armorType);
  }, []);

  const clearAllArmorCallback = useCallback(() => {
    clearAllCampaignArmor();
    // Reload campaign state to reflect changes
    const updated = loadActiveCampaign();
    if (updated) {
      setCampaign(updated);
    }
  }, []);

  const isCampaignCompleteCallback = useCallback((): boolean => {
    if (!campaign) return false;
    return campaign.currentGame > campaign.length;
  }, [campaign]);

  const getCurrentGame = useCallback((): number => {
    return campaign?.currentGame ?? 0;
  }, [campaign]);

  const getTotalGames = useCallback((): number => {
    return campaign?.length ?? 0;
  }, [campaign]);

  const value: CampaignContextValue = {
    campaign,
    isCampaignMode,
    getPlayer,
    getParticipant,
    getAIParticipants,
    startNewCampaign,
    resumeCampaign,
    abandonCampaign,
    hasExistingCampaign,
    recordKill,
    recordDeath,
    recordGameEnd: recordGameEndCallback,
    advanceToNextGame,
    updateBalance,
    purchaseWeapon: purchaseWeaponCallback,
    useWeapon: useWeaponCallback,
    purchaseArmor: purchaseArmorCallback,
    hasArmor: hasArmorCallback,
    clearAllArmor: clearAllArmorCallback,
    isCampaignComplete: isCampaignCompleteCallback,
    getCurrentGame,
    getTotalGames,
  };

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
}

export function useCampaign(): CampaignContextValue {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}
