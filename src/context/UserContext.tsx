import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { UserData, UserStats, WeaponInventory, WeaponType } from '../types/game';
import {
  loadUserData,
  createUser,
  updateUsername,
  recordGameEnd,
  clearUserData,
  spendMoney,
  addWeapon,
  removeWeapon,
  type GameEndParams,
} from '../services/userDatabase';
import { getWeaponConfig } from '../engine/weapons';

interface UserContextValue {
  userData: UserData | null;
  isNewUser: boolean;
  stats: UserStats | null;
  username: string | null;
  balance: number;
  weaponInventory: WeaponInventory;
  createNewUser: (username: string) => void;
  changeUsername: (newUsername: string) => void;
  recordGame: (params: GameEndParams) => void;
  resetUserData: () => void;
  spend: (amount: number) => boolean;
  purchaseWeapon: (weaponType: WeaponType, quantity: number) => boolean;
  consumeWeapon: (weaponType: WeaponType) => boolean;
  getWeaponCount: (weaponType: WeaponType) => number;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);

  // Load user data on mount
  useEffect(() => {
    const existing = loadUserData();
    if (existing) {
      setUserData(existing);
    }
  }, []);

  const createNewUser = useCallback((username: string) => {
    const newUserData = createUser(username);
    setUserData(newUserData);
  }, []);

  const changeUsername = useCallback((newUsername: string) => {
    const updated = updateUsername(newUsername);
    if (updated) {
      setUserData(updated);
    }
  }, []);

  const recordGame = useCallback((params: GameEndParams) => {
    const updated = recordGameEnd(params);
    if (updated) {
      setUserData(updated);
    }
  }, []);

  const resetUserData = useCallback(() => {
    clearUserData();
    setUserData(null);
  }, []);

  const spend = useCallback((amount: number): boolean => {
    const newBalance = spendMoney(amount);
    if (newBalance !== null) {
      // Reload user data to get updated balance
      const updated = loadUserData();
      if (updated) {
        setUserData(updated);
      }
      return true;
    }
    return false;
  }, []);

  const purchaseWeapon = useCallback((weaponType: WeaponType, quantity: number): boolean => {
    const weapon = getWeaponConfig(weaponType);
    const totalCost = weapon.cost * quantity;

    // Check if user can afford it
    const newBalance = spendMoney(totalCost);
    if (newBalance === null) {
      return false; // Insufficient funds or no user
    }

    // Add weapon to inventory
    const newCount = addWeapon(weaponType, quantity);
    if (newCount === null) {
      return false; // Failed to add weapon
    }

    // Reload user data to get updated state
    const updated = loadUserData();
    if (updated) {
      setUserData(updated);
    }
    return true;
  }, []);

  const consumeWeapon = useCallback((weaponType: WeaponType): boolean => {
    // Standard weapon cannot be consumed (infinite)
    if (weaponType === 'standard') {
      return true;
    }

    const result = removeWeapon(weaponType, 1);
    if (result === null) {
      return false; // Insufficient quantity or no user
    }

    // Reload user data to get updated inventory
    const updated = loadUserData();
    if (updated) {
      setUserData(updated);
    }
    return true;
  }, []);

  const getWeaponCountFn = useCallback((weaponType: WeaponType): number => {
    if (weaponType === 'standard') return Infinity;
    return userData?.weaponInventory?.[weaponType] ?? 0;
  }, [userData]);

  // Get weapon inventory with fallback
  const currentInventory: WeaponInventory = userData?.weaponInventory ?? { standard: Infinity };

  const value: UserContextValue = {
    userData,
    isNewUser: !userData,
    stats: userData?.stats ?? null,
    username: userData?.profile.username ?? null,
    balance: userData?.stats.balance ?? 0,
    weaponInventory: currentInventory,
    createNewUser,
    changeUsername,
    recordGame,
    resetUserData,
    spend,
    purchaseWeapon,
    consumeWeapon,
    getWeaponCount: getWeaponCountFn,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
