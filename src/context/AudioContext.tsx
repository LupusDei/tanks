import { createContext, ReactNode, useContext, useCallback, useEffect, useState, useRef } from 'react';
import { audioManager, AudioPreferences, MusicTrack, SfxType, UiSoundType } from '../services/audioManager';
import type { WeaponType } from '../engine/weapons';

export interface AudioContextValue {
  // State
  isReady: boolean;
  isMuted: boolean;
  isMusicMuted: boolean;
  isSfxMuted: boolean;
  preferences: AudioPreferences;

  // Music controls
  playMusic: (track: MusicTrack) => void;
  stopMusic: () => void;
  crossfadeMusic: (track: MusicTrack, duration?: number) => void;
  getCurrentMusicTrack: () => MusicTrack | null;

  // Sound effects
  playSfx: (sfx: SfxType) => void;
  playWeaponFire: (weaponType: WeaponType) => void;
  playExplosion: (blastRadius: number, weaponType?: WeaponType) => void;
  playTankDestruction: () => void;
  playTankHit: () => void;
  playMoneyEarned: () => void;

  // UI sounds
  playUi: (sound: UiSoundType) => void;
  playHover: () => void;
  playClick: () => void;
  playPurchase: () => void;
  playError: () => void;

  // Volume controls
  setMasterVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setUiVolume: (volume: number) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  toggleMusicMute: () => void;
  setMusicMuted: (muted: boolean) => void;
  toggleSfxMute: () => void;
  setSfxMuted: (muted: boolean) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMutedState] = useState(audioManager.isMuted());
  const [isMusicMuted, setIsMusicMutedState] = useState(audioManager.isMusicMuted());
  const [isSfxMuted, setIsSfxMutedState] = useState(audioManager.isSfxMuted());
  const [preferences, setPreferences] = useState<AudioPreferences>(audioManager.getPreferences());
  const initAttempted = useRef(false);

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleInteraction = async () => {
      if (initAttempted.current) return;
      initAttempted.current = true;

      await audioManager.initialize();
      setIsReady(audioManager.isReady());
      setPreferences(audioManager.getPreferences());
      setIsMutedState(audioManager.isMuted());
      setIsMusicMutedState(audioManager.isMusicMuted());
      setIsSfxMutedState(audioManager.isSfxMuted());

      // Remove listeners after initialization
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Music controls
  const playMusic = useCallback((track: MusicTrack) => {
    audioManager.playMusic(track);
  }, []);

  const stopMusic = useCallback(() => {
    audioManager.stopMusic();
  }, []);

  const crossfadeMusic = useCallback((track: MusicTrack, duration = 1000) => {
    audioManager.crossfadeMusic(track, duration);
  }, []);

  const getCurrentMusicTrack = useCallback(() => {
    return audioManager.getCurrentMusicTrack();
  }, []);

  // Sound effects
  const playSfx = useCallback((sfx: SfxType) => {
    audioManager.playSfx(sfx);
  }, []);

  const playWeaponFire = useCallback((weaponType: WeaponType) => {
    audioManager.playWeaponFire(weaponType);
  }, []);

  const playExplosion = useCallback((blastRadius: number, weaponType?: WeaponType) => {
    audioManager.playExplosion(blastRadius, weaponType);
  }, []);

  const playTankDestruction = useCallback(() => {
    audioManager.playTankDestruction();
  }, []);

  const playTankHit = useCallback(() => {
    audioManager.playTankHit();
  }, []);

  const playMoneyEarned = useCallback(() => {
    audioManager.playMoneyEarned();
  }, []);

  // UI sounds
  const playUi = useCallback((sound: UiSoundType) => {
    audioManager.playUi(sound);
  }, []);

  const playHover = useCallback(() => {
    audioManager.playHover();
  }, []);

  const playClick = useCallback(() => {
    audioManager.playClick();
  }, []);

  const playPurchase = useCallback(() => {
    audioManager.playPurchase();
  }, []);

  const playError = useCallback(() => {
    audioManager.playError();
  }, []);

  // Volume controls
  const setMasterVolume = useCallback((volume: number) => {
    audioManager.setMasterVolume(volume);
    setPreferences(audioManager.getPreferences());
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    audioManager.setMusicVolume(volume);
    setPreferences(audioManager.getPreferences());
  }, []);

  const setSfxVolume = useCallback((volume: number) => {
    audioManager.setSfxVolume(volume);
    setPreferences(audioManager.getPreferences());
  }, []);

  const setUiVolume = useCallback((volume: number) => {
    audioManager.setUiVolume(volume);
    setPreferences(audioManager.getPreferences());
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = audioManager.toggleMute();
    setIsMutedState(newMuted);
    setPreferences(audioManager.getPreferences());
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    audioManager.setMuted(muted);
    setIsMutedState(muted);
    setPreferences(audioManager.getPreferences());
  }, []);

  const toggleMusicMute = useCallback(() => {
    const newMuted = audioManager.toggleMusicMute();
    setIsMusicMutedState(newMuted);
    setPreferences(audioManager.getPreferences());
  }, []);

  const setMusicMuted = useCallback((muted: boolean) => {
    audioManager.setMusicMuted(muted);
    setIsMusicMutedState(muted);
    setPreferences(audioManager.getPreferences());
  }, []);

  const toggleSfxMute = useCallback(() => {
    const newMuted = audioManager.toggleSfxMute();
    setIsSfxMutedState(newMuted);
    setPreferences(audioManager.getPreferences());
  }, []);

  const setSfxMuted = useCallback((muted: boolean) => {
    audioManager.setSfxMuted(muted);
    setIsSfxMutedState(muted);
    setPreferences(audioManager.getPreferences());
  }, []);

  const value: AudioContextValue = {
    isReady,
    isMuted,
    isMusicMuted,
    isSfxMuted,
    preferences,
    playMusic,
    stopMusic,
    crossfadeMusic,
    getCurrentMusicTrack,
    playSfx,
    playWeaponFire,
    playExplosion,
    playTankDestruction,
    playTankHit,
    playMoneyEarned,
    playUi,
    playHover,
    playClick,
    playPurchase,
    playError,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    setUiVolume,
    toggleMute,
    setMuted,
    toggleMusicMute,
    setMusicMuted,
    toggleSfxMute,
    setSfxMuted,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

/**
 * Hook to access audio context.
 * Must be used within an AudioProvider.
 */
export function useAudio(): AudioContextValue {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

/**
 * Hook to access audio context with optional fallback.
 * Returns null if not within AudioProvider (useful for optional audio).
 */
export function useAudioOptional(): AudioContextValue | null {
  return useContext(AudioContext);
}
