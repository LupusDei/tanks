import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioControls } from './AudioControls';

// Mock the audio context
const mockToggleMusicMute = vi.fn();
const mockToggleSfxMute = vi.fn();
let mockIsMusicMuted = false;
let mockIsSfxMuted = false;

vi.mock('../context/AudioContext', () => ({
  useAudio: () => ({
    isMusicMuted: mockIsMusicMuted,
    isSfxMuted: mockIsSfxMuted,
    toggleMusicMute: mockToggleMusicMute,
    toggleSfxMute: mockToggleSfxMute,
  }),
}));

describe('AudioControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMusicMuted = false;
    mockIsSfxMuted = false;
  });

  it('should render two buttons for music and sfx', () => {
    render(<AudioControls />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('should have correct aria labels when not muted', () => {
    render(<AudioControls />);

    expect(screen.getByLabelText('Mute music')).toBeInTheDocument();
    expect(screen.getByLabelText('Mute sound effects')).toBeInTheDocument();
  });

  it('should have correct aria labels when muted', () => {
    mockIsMusicMuted = true;
    mockIsSfxMuted = true;

    render(<AudioControls />);

    expect(screen.getByLabelText('Unmute music')).toBeInTheDocument();
    expect(screen.getByLabelText('Unmute sound effects')).toBeInTheDocument();
  });

  it('should call toggleMusicMute when music button is clicked', () => {
    render(<AudioControls />);

    const musicButton = screen.getByLabelText('Mute music');
    fireEvent.click(musicButton);

    expect(mockToggleMusicMute).toHaveBeenCalledTimes(1);
  });

  it('should call toggleSfxMute when sfx button is clicked', () => {
    render(<AudioControls />);

    const sfxButton = screen.getByLabelText('Mute sound effects');
    fireEvent.click(sfxButton);

    expect(mockToggleSfxMute).toHaveBeenCalledTimes(1);
  });

  it('should apply muted class when music is muted', () => {
    mockIsMusicMuted = true;

    render(<AudioControls />);

    const musicButton = screen.getByLabelText('Unmute music');
    expect(musicButton).toHaveClass('audio-controls__button--muted');
  });

  it('should apply muted class when sfx is muted', () => {
    mockIsSfxMuted = true;

    render(<AudioControls />);

    const sfxButton = screen.getByLabelText('Unmute sound effects');
    expect(sfxButton).toHaveClass('audio-controls__button--muted');
  });

  it('should use default position top-right', () => {
    const { container } = render(<AudioControls />);

    const controlsDiv = container.querySelector('.audio-controls');
    expect(controlsDiv).toHaveClass('audio-controls--top-right');
  });

  it('should apply custom position class', () => {
    const { container } = render(<AudioControls position="bottom-left" />);

    const controlsDiv = container.querySelector('.audio-controls');
    expect(controlsDiv).toHaveClass('audio-controls--bottom-left');
  });
});
