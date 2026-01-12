import { useCallback } from 'react';
import { useAudioOptional } from '../context/AudioContext';

/**
 * Hook that provides UI sound event handlers.
 * Returns handlers for hover and click sounds that can be spread onto elements.
 *
 * Uses useAudioOptional so it works even without AudioProvider (returns no-op handlers).
 *
 * @example
 * const { hoverHandlers, clickHandlers, buttonHandlers } = useUiSounds();
 *
 * // Just hover sound
 * <div {...hoverHandlers}>Hover me</div>
 *
 * // Just click sound
 * <button {...clickHandlers}>Click me</button>
 *
 * // Both hover and click sounds (most buttons)
 * <button {...buttonHandlers}>Button</button>
 */
export function useUiSounds() {
  const audio = useAudioOptional();

  const handleHover = useCallback(() => {
    audio?.playHover();
  }, [audio]);

  const handleClick = useCallback(() => {
    audio?.playClick();
  }, [audio]);

  // Event handlers for hover-only
  const hoverHandlers = {
    onMouseEnter: handleHover,
  };

  // Event handlers for click-only
  const clickHandlers = {
    onClick: handleClick,
  };

  // Combined handlers for typical buttons (both hover and click)
  const buttonHandlers = {
    onMouseEnter: handleHover,
    onClick: handleClick,
  };

  return {
    hoverHandlers,
    clickHandlers,
    buttonHandlers,
    // Also expose individual handlers for custom use
    playHover: handleHover,
    playClick: handleClick,
  };
}

export default useUiSounds;
