import { useCallback, useRef, useEffect } from 'react'

interface UsePressAndHoldOptions {
  /** Callback to fire on press and while holding */
  onPress: () => void
  /** Delay before rapid fire starts (ms) */
  initialDelay?: number
  /** Interval between rapid fires (ms) */
  repeatInterval?: number
  /** Whether the control is enabled */
  enabled?: boolean
}

interface PressAndHoldHandlers {
  onMouseDown: () => void
  onMouseUp: () => void
  onMouseLeave: () => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

/**
 * Hook for press-and-hold button behavior.
 * Fires callback immediately on press, then repeatedly while held.
 */
export function usePressAndHold({
  onPress,
  initialDelay = 400,
  repeatInterval = 50,
  enabled = true,
}: UsePressAndHoldOptions): PressAndHoldHandlers {
  const isPressingRef = useRef(false)
  const initialTimeoutRef = useRef<number | null>(null)
  const repeatIntervalRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (initialTimeoutRef.current !== null) {
      window.clearTimeout(initialTimeoutRef.current)
      initialTimeoutRef.current = null
    }
    if (repeatIntervalRef.current !== null) {
      window.clearInterval(repeatIntervalRef.current)
      repeatIntervalRef.current = null
    }
  }, [])

  const startPress = useCallback(() => {
    if (!enabled || isPressingRef.current) return

    isPressingRef.current = true

    // Fire immediately
    onPress()

    // Start rapid fire after initial delay
    initialTimeoutRef.current = window.setTimeout(() => {
      repeatIntervalRef.current = window.setInterval(() => {
        if (isPressingRef.current) {
          onPress()
        }
      }, repeatInterval)
    }, initialDelay)
  }, [enabled, onPress, initialDelay, repeatInterval])

  const stopPress = useCallback(() => {
    isPressingRef.current = false
    clearTimers()
  }, [clearTimers])

  // Cleanup on unmount or when disabled
  useEffect(() => {
    if (!enabled) {
      stopPress()
    }
    return () => {
      clearTimers()
    }
  }, [enabled, stopPress, clearTimers])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Prevent default to avoid mouse events also firing
      e.preventDefault()
      startPress()
    },
    [startPress]
  )

  return {
    onMouseDown: startPress,
    onMouseUp: stopPress,
    onMouseLeave: stopPress,
    onTouchStart: handleTouchStart,
    onTouchEnd: stopPress,
  }
}
