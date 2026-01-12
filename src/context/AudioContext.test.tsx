import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AudioProvider, useAudio, useAudioOptional } from './AudioContext';
import { audioManager } from '../services/audioManager';

// Mock the audio manager
vi.mock('../services/audioManager', () => ({
  audioManager: {
    initialize: vi.fn(async () => {}),
    isReady: vi.fn(() => true),
    isMuted: vi.fn(() => false),
    isMusicMuted: vi.fn(() => false),
    isSfxMuted: vi.fn(() => false),
    getPreferences: vi.fn(() => ({
      masterVolume: 0.7,
      musicVolume: 0.5,
      sfxVolume: 0.8,
      uiVolume: 0.6,
      muted: false,
      musicMuted: false,
      sfxMuted: false,
    })),
    playMusic: vi.fn(),
    stopMusic: vi.fn(),
    crossfadeMusic: vi.fn(),
    getCurrentMusicTrack: vi.fn(() => null),
    playSfx: vi.fn(),
    playWeaponFire: vi.fn(),
    playExplosion: vi.fn(),
    playTankDestruction: vi.fn(),
    playTankHit: vi.fn(),
    playMoneyEarned: vi.fn(),
    playUi: vi.fn(),
    playHover: vi.fn(),
    playClick: vi.fn(),
    playPurchase: vi.fn(),
    playError: vi.fn(),
    setMasterVolume: vi.fn(),
    setMusicVolume: vi.fn(),
    setSfxVolume: vi.fn(),
    setUiVolume: vi.fn(),
    toggleMute: vi.fn(() => true),
    setMuted: vi.fn(),
    toggleMusicMute: vi.fn(() => true),
    setMusicMuted: vi.fn(),
    toggleSfxMute: vi.fn(() => true),
    setSfxMuted: vi.fn(),
  },
}));

// Test component that uses the audio hook
function TestConsumer() {
  const audio = useAudio();
  return (
    <div>
      <span data-testid="is-ready">{audio.isReady.toString()}</span>
      <span data-testid="is-muted">{audio.isMuted.toString()}</span>
      <button data-testid="play-music" onClick={() => audio.playMusic('menu')}>
        Play Music
      </button>
      <button data-testid="stop-music" onClick={() => audio.stopMusic()}>
        Stop Music
      </button>
      <button data-testid="play-click" onClick={() => audio.playClick()}>
        Click Sound
      </button>
      <button data-testid="toggle-mute" onClick={() => audio.toggleMute()}>
        Toggle Mute
      </button>
      <button data-testid="set-volume" onClick={() => audio.setMasterVolume(0.5)}>
        Set Volume
      </button>
      <button data-testid="play-weapon" onClick={() => audio.playWeaponFire('standard')}>
        Fire Weapon
      </button>
      <button data-testid="play-explosion" onClick={() => audio.playExplosion(20)}>
        Explosion
      </button>
    </div>
  );
}

// Test component for optional hook
function OptionalTestConsumer() {
  const audio = useAudioOptional();
  return (
    <div>
      <span data-testid="has-audio">{(audio !== null).toString()}</span>
    </div>
  );
}

describe('AudioContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AudioProvider', () => {
    it('should provide audio context to children', () => {
      render(
        <AudioProvider>
          <TestConsumer />
        </AudioProvider>
      );

      expect(screen.getByTestId('is-ready')).toBeInTheDocument();
      expect(screen.getByTestId('is-muted')).toBeInTheDocument();
    });

    it('should initialize audio on user interaction', async () => {
      render(
        <AudioProvider>
          <TestConsumer />
        </AudioProvider>
      );

      // Simulate user click to trigger initialization
      await act(async () => {
        fireEvent.click(document.body);
      });

      expect(audioManager.initialize).toHaveBeenCalled();
    });
  });

  describe('useAudio', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useAudio must be used within an AudioProvider');

      consoleSpy.mockRestore();
    });

    it('should call playMusic on audio manager', async () => {
      render(
        <AudioProvider>
          <TestConsumer />
        </AudioProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('play-music'));
      });

      expect(audioManager.playMusic).toHaveBeenCalledWith('menu');
    });

    it('should call stopMusic on audio manager', async () => {
      render(
        <AudioProvider>
          <TestConsumer />
        </AudioProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('stop-music'));
      });

      expect(audioManager.stopMusic).toHaveBeenCalled();
    });

    it('should call playClick on audio manager', async () => {
      render(
        <AudioProvider>
          <TestConsumer />
        </AudioProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('play-click'));
      });

      expect(audioManager.playClick).toHaveBeenCalled();
    });

    it('should call toggleMute on audio manager', async () => {
      render(
        <AudioProvider>
          <TestConsumer />
        </AudioProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-mute'));
      });

      expect(audioManager.toggleMute).toHaveBeenCalled();
    });

    it('should call setMasterVolume on audio manager', async () => {
      render(
        <AudioProvider>
          <TestConsumer />
        </AudioProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('set-volume'));
      });

      expect(audioManager.setMasterVolume).toHaveBeenCalledWith(0.5);
    });

    it('should call playWeaponFire on audio manager', async () => {
      render(
        <AudioProvider>
          <TestConsumer />
        </AudioProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('play-weapon'));
      });

      expect(audioManager.playWeaponFire).toHaveBeenCalledWith('standard');
    });

    it('should call playExplosion on audio manager', async () => {
      render(
        <AudioProvider>
          <TestConsumer />
        </AudioProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('play-explosion'));
      });

      expect(audioManager.playExplosion).toHaveBeenCalledWith(20, undefined);
    });
  });

  describe('useAudioOptional', () => {
    it('should return null when used outside provider', () => {
      render(<OptionalTestConsumer />);

      expect(screen.getByTestId('has-audio')).toHaveTextContent('false');
    });

    it('should return context when used inside provider', () => {
      render(
        <AudioProvider>
          <OptionalTestConsumer />
        </AudioProvider>
      );

      expect(screen.getByTestId('has-audio')).toHaveTextContent('true');
    });
  });
});
