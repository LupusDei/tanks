import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUiSounds } from './useUiSounds';

// Mock the AudioContext
vi.mock('../context/AudioContext', () => ({
  useAudioOptional: vi.fn(() => ({
    playHover: vi.fn(),
    playClick: vi.fn(),
  })),
}));

import { useAudioOptional } from '../context/AudioContext';

describe('useUiSounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return hover handlers', () => {
    const { result } = renderHook(() => useUiSounds());

    expect(result.current.hoverHandlers).toBeDefined();
    expect(result.current.hoverHandlers.onMouseEnter).toBeInstanceOf(Function);
  });

  it('should return click handlers', () => {
    const { result } = renderHook(() => useUiSounds());

    expect(result.current.clickHandlers).toBeDefined();
    expect(result.current.clickHandlers.onClick).toBeInstanceOf(Function);
  });

  it('should return button handlers with both hover and click', () => {
    const { result } = renderHook(() => useUiSounds());

    expect(result.current.buttonHandlers).toBeDefined();
    expect(result.current.buttonHandlers.onMouseEnter).toBeInstanceOf(Function);
    expect(result.current.buttonHandlers.onClick).toBeInstanceOf(Function);
  });

  it('should call playHover when hover handler is triggered', () => {
    const mockPlayHover = vi.fn();
    vi.mocked(useAudioOptional).mockReturnValue({
      playHover: mockPlayHover,
      playClick: vi.fn(),
    } as never);

    const { result } = renderHook(() => useUiSounds());

    act(() => {
      result.current.playHover();
    });

    expect(mockPlayHover).toHaveBeenCalled();
  });

  it('should call playClick when click handler is triggered', () => {
    const mockPlayClick = vi.fn();
    vi.mocked(useAudioOptional).mockReturnValue({
      playHover: vi.fn(),
      playClick: mockPlayClick,
    } as never);

    const { result } = renderHook(() => useUiSounds());

    act(() => {
      result.current.playClick();
    });

    expect(mockPlayClick).toHaveBeenCalled();
  });

  it('should handle missing audio context gracefully', () => {
    vi.mocked(useAudioOptional).mockReturnValue(null);

    const { result } = renderHook(() => useUiSounds());

    // Should not throw when audio context is not available
    expect(() => {
      act(() => {
        result.current.playHover();
        result.current.playClick();
      });
    }).not.toThrow();
  });
});
