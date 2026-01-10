import { EnemyCount, ENEMY_COUNT_OPTIONS } from '../types/game'

interface EnemyCountSelectorProps {
  onCountSelect: (count: EnemyCount) => void
}

export function EnemyCountSelector({ onCountSelect }: EnemyCountSelectorProps) {
  return (
    <div className="enemy-count-selector" data-testid="enemy-count-selector">
      <h1 className="enemy-count-selector__title">Select Enemy Count</h1>
      <div className="enemy-count-selector__options">
        {ENEMY_COUNT_OPTIONS.map((count) => (
          <button
            key={count}
            className="enemy-count-selector__option"
            onClick={() => onCountSelect(count)}
            data-testid={`enemy-count-${count}`}
            aria-label={`Select ${count} ${count === 1 ? 'enemy' : 'enemies'}`}
          >
            <div className="enemy-count-selector__preview">
              {Array.from({ length: count }, (_, i) => (
                <div key={i} className="enemy-count-selector__tank-icon" />
              ))}
            </div>
            <span className="enemy-count-selector__label">
              {count} {count === 1 ? 'Enemy' : 'Enemies'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
