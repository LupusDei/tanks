import { useCallback } from 'react'
import { useKeyboard } from '../hooks'

interface FireButtonProps {
  onFire: () => void
  enabled?: boolean
}

export function FireButton({ onFire, enabled = true }: FireButtonProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        onFire()
      }
    },
    [onFire]
  )

  useKeyboard({
    onKeyDown: handleKeyDown,
    enabled,
  })

  return (
    <button
      className="fire-button"
      data-testid="fire-button"
      onClick={onFire}
      disabled={!enabled}
    >
      <div className="fire-button__label">Fire!</div>
      <div className="fire-button__hint">
        Press <kbd>Space</kbd> or <kbd>Enter</kbd>
      </div>
    </button>
  )
}
