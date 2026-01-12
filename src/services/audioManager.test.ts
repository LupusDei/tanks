import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager, getFireSoundForWeapon, getExplosionSound } from './audioManager';
import type { WeaponType } from '../engine/weapons';

// Mock Web Audio API
const mockGainNode = {
  gain: { value: 1, linearRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
};

const mockBufferSource = {
  buffer: null as AudioBuffer | null,
  loop: false,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null as (() => void) | null,
};

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  destination: {},
  createGain: vi.fn(() => ({ ...mockGainNode })),
  createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
  decodeAudioData: vi.fn(async () => ({ duration: 1 } as AudioBuffer)),
  resume: vi.fn(async () => {}),
};

const MockAudioContextClass = vi.fn(() => mockAudioContext);

// Mock fetch for audio loading
vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(8),
})));

// Mock AudioContext constructor
vi.stubGlobal('AudioContext', MockAudioContextClass);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

describe('AudioManager', () => {
  let audioManager: AudioManager;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    audioManager = new AudioManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create audio context on initialize', async () => {
      await audioManager.initialize();

      expect(MockAudioContextClass).toHaveBeenCalled();
      expect(audioManager.isReady()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await audioManager.initialize();
      await audioManager.initialize();

      expect(MockAudioContextClass).toHaveBeenCalledTimes(1);
    });

    it('should create gain nodes for volume control', async () => {
      await audioManager.initialize();

      // Should create 4 gain nodes: master, music, sfx, ui
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(4);
    });
  });

  describe('preferences', () => {
    it('should use default preferences on fresh start', () => {
      const prefs = audioManager.getPreferences();

      expect(prefs.masterVolume).toBe(0.7);
      expect(prefs.musicVolume).toBe(0.5);
      expect(prefs.sfxVolume).toBe(0.8);
      expect(prefs.uiVolume).toBe(0.6);
      expect(prefs.muted).toBe(false);
      expect(prefs.musicMuted).toBe(false);
      expect(prefs.sfxMuted).toBe(false);
    });

    it('should load preferences from localStorage', () => {
      const savedPrefs = {
        masterVolume: 0.5,
        musicVolume: 0.3,
        sfxVolume: 0.9,
        uiVolume: 0.4,
        muted: true,
      };
      localStorageMock.setItem('tanks_audio_prefs', JSON.stringify(savedPrefs));

      const newManager = new AudioManager();
      const prefs = newManager.getPreferences();

      expect(prefs.masterVolume).toBe(0.5);
      expect(prefs.muted).toBe(true);
    });

    it('should save preferences when volume is changed', async () => {
      await audioManager.initialize();
      audioManager.setMasterVolume(0.3);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tanks_audio_prefs',
        expect.stringContaining('"masterVolume":0.3')
      );
    });

    it('should clamp volume values to 0-1 range', async () => {
      await audioManager.initialize();

      audioManager.setMasterVolume(1.5);
      expect(audioManager.getPreferences().masterVolume).toBe(1);

      audioManager.setMasterVolume(-0.5);
      expect(audioManager.getPreferences().masterVolume).toBe(0);
    });
  });

  describe('mute', () => {
    it('should toggle mute state', async () => {
      await audioManager.initialize();

      expect(audioManager.isMuted()).toBe(false);

      audioManager.toggleMute();
      expect(audioManager.isMuted()).toBe(true);

      audioManager.toggleMute();
      expect(audioManager.isMuted()).toBe(false);
    });

    it('should set mute state directly', async () => {
      await audioManager.initialize();

      audioManager.setMuted(true);
      expect(audioManager.isMuted()).toBe(true);

      audioManager.setMuted(false);
      expect(audioManager.isMuted()).toBe(false);
    });

    it('should toggle music mute state', async () => {
      await audioManager.initialize();

      expect(audioManager.isMusicMuted()).toBe(false);

      audioManager.toggleMusicMute();
      expect(audioManager.isMusicMuted()).toBe(true);

      audioManager.toggleMusicMute();
      expect(audioManager.isMusicMuted()).toBe(false);
    });

    it('should set music mute state directly', async () => {
      await audioManager.initialize();

      audioManager.setMusicMuted(true);
      expect(audioManager.isMusicMuted()).toBe(true);

      audioManager.setMusicMuted(false);
      expect(audioManager.isMusicMuted()).toBe(false);
    });

    it('should toggle sfx mute state', async () => {
      await audioManager.initialize();

      expect(audioManager.isSfxMuted()).toBe(false);

      audioManager.toggleSfxMute();
      expect(audioManager.isSfxMuted()).toBe(true);

      audioManager.toggleSfxMute();
      expect(audioManager.isSfxMuted()).toBe(false);
    });

    it('should set sfx mute state directly', async () => {
      await audioManager.initialize();

      audioManager.setSfxMuted(true);
      expect(audioManager.isSfxMuted()).toBe(true);

      audioManager.setSfxMuted(false);
      expect(audioManager.isSfxMuted()).toBe(false);
    });

    it('should persist music and sfx mute state', async () => {
      await audioManager.initialize();

      audioManager.setMusicMuted(true);
      audioManager.setSfxMuted(true);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tanks_audio_prefs',
        expect.stringContaining('"musicMuted":true')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tanks_audio_prefs',
        expect.stringContaining('"sfxMuted":true')
      );
    });
  });

  describe('volume controls', () => {
    it('should set music volume', async () => {
      await audioManager.initialize();
      audioManager.setMusicVolume(0.8);

      expect(audioManager.getPreferences().musicVolume).toBe(0.8);
    });

    it('should set sfx volume', async () => {
      await audioManager.initialize();
      audioManager.setSfxVolume(0.9);

      expect(audioManager.getPreferences().sfxVolume).toBe(0.9);
    });

    it('should set ui volume', async () => {
      await audioManager.initialize();
      audioManager.setUiVolume(0.4);

      expect(audioManager.getPreferences().uiVolume).toBe(0.4);
    });
  });

  describe('music', () => {
    it('should track current music track', async () => {
      await audioManager.initialize();

      expect(audioManager.getCurrentMusicTrack()).toBeNull();

      await audioManager.playMusic('menu');
      expect(audioManager.getCurrentMusicTrack()).toBe('menu');
    });

    it('should stop music', async () => {
      await audioManager.initialize();
      await audioManager.playMusic('menu');

      audioManager.stopMusic();
      expect(audioManager.getCurrentMusicTrack()).toBeNull();
    });

    it('should not restart same track', async () => {
      await audioManager.initialize();
      await audioManager.playMusic('menu');

      const firstCallCount = mockAudioContext.createBufferSource.mock.calls.length;
      await audioManager.playMusic('menu');
      const secondCallCount = mockAudioContext.createBufferSource.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });
  });
});

describe('getFireSoundForWeapon', () => {
  const weaponSoundPairs: [WeaponType, string][] = [
    ['standard', 'fire_standard'],
    ['heavy_artillery', 'fire_heavy'],
    ['precision', 'fire_precision'],
    ['cluster_bomb', 'fire_cluster'],
    ['napalm', 'fire_napalm'],
    ['emp', 'fire_emp'],
    ['bouncing_betty', 'fire_bouncing'],
    ['bunker_buster', 'fire_bunker'],
    ['homing_missile', 'fire_homing'],
  ];

  it.each(weaponSoundPairs)('should return %s for %s weapon', (weaponType, expectedSound) => {
    expect(getFireSoundForWeapon(weaponType)).toBe(expectedSound);
  });
});

describe('getExplosionSound', () => {
  it('should return explosion_small for small blasts', () => {
    expect(getExplosionSound(10)).toBe('explosion_small');
    expect(getExplosionSound(15)).toBe('explosion_small');
  });

  it('should return explosion_medium for medium blasts', () => {
    expect(getExplosionSound(20)).toBe('explosion_medium');
    expect(getExplosionSound(25)).toBe('explosion_medium');
  });

  it('should return explosion_large for large blasts', () => {
    expect(getExplosionSound(30)).toBe('explosion_large');
    expect(getExplosionSound(40)).toBe('explosion_large');
  });

  it('should return explosion_fire for fire type', () => {
    expect(getExplosionSound(20, true, false)).toBe('explosion_fire');
  });

  it('should return explosion_electric for electric type', () => {
    expect(getExplosionSound(20, false, true)).toBe('explosion_electric');
  });

  it('should prioritize electric type over fire type', () => {
    expect(getExplosionSound(20, true, true)).toBe('explosion_electric');
  });
});
