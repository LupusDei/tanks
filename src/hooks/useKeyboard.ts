import { useEffect, useCallback } from 'react'

type KeyHandler = (event: KeyboardEvent) => void

interface UseKeyboardOptions {
  onKeyDown?: KeyHandler
  onKeyUp?: KeyHandler
  enabled?: boolean
}

export function useKeyboard({
  onKeyDown,
  onKeyUp,
  enabled = true,
}: UseKeyboardOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (enabled && onKeyDown) {
        onKeyDown(event)
      }
    },
    [enabled, onKeyDown]
  )

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (enabled && onKeyUp) {
        onKeyUp(event)
      }
    },
    [enabled, onKeyUp]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [enabled, handleKeyDown, handleKeyUp])
}
