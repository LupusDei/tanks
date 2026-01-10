import { useState, useEffect, useCallback } from 'react'

const LAST_PLAYER_NAME_KEY = 'tanks_last_player_name'

interface PlayerNameEntryProps {
  onSubmit: (name: string) => void
}

export function PlayerNameEntry({ onSubmit }: PlayerNameEntryProps) {
  const [name, setName] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Load last used name on mount
  useEffect(() => {
    const lastUsedName = localStorage.getItem(LAST_PLAYER_NAME_KEY)
    if (lastUsedName) {
      setName(lastUsedName)
    }
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim()
    if (trimmedName.length === 0) return

    // Save the name for next time
    localStorage.setItem(LAST_PLAYER_NAME_KEY, trimmedName)
    setIsTransitioning(true)
  }, [name])

  const handleTransitionEnd = useCallback(() => {
    if (isTransitioning) {
      onSubmit(name.trim())
    }
  }, [isTransitioning, name, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }, [handleSubmit])

  const isValid = name.trim().length > 0

  return (
    <div
      className={`player-name-entry ${isTransitioning ? 'player-name-entry--fade-out' : ''}`}
      onTransitionEnd={handleTransitionEnd}
      data-testid="player-name-entry"
    >
      <div className="player-name-entry__container">
        <h1 className="player-name-entry__title">Enter Your Name</h1>
        <p className="player-name-entry__subtitle">Your stats will be saved under this name</p>

        <input
          type="text"
          className="player-name-entry__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Commander"
          maxLength={20}
          autoFocus
          data-testid="player-name-input"
        />

        <button
          className={`player-name-entry__button ${isValid ? 'player-name-entry__button--active' : ''}`}
          onClick={handleSubmit}
          disabled={!isValid}
          data-testid="player-name-submit"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
