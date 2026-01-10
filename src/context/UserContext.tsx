import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { UserData, UserStats } from '../types/game';
import {
  loadUserData,
  createUser,
  updateUsername,
  recordGameEnd,
  clearUserData,
  type GameEndParams,
} from '../services/userDatabase';

interface UserContextValue {
  userData: UserData | null;
  isNewUser: boolean;
  stats: UserStats | null;
  username: string | null;
  createNewUser: (username: string) => void;
  changeUsername: (newUsername: string) => void;
  recordGame: (params: GameEndParams) => void;
  resetUserData: () => void;
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

  const value: UserContextValue = {
    userData,
    isNewUser: !userData,
    stats: userData?.stats ?? null,
    username: userData?.profile.username ?? null,
    createNewUser,
    changeUsername,
    recordGame,
    resetUserData,
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
