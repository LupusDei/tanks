import { useState } from 'react'
import { TankColor, TerrainSize, TERRAIN_SIZES, EnemyCount, ENEMY_COUNT_OPTIONS } from '../types/game'
import { PlayerStatsDisplay } from './PlayerStatsDisplay'

interface GameConfigScreenProps {
  onStartGame: (config: { terrainSize: TerrainSize; enemyCount: EnemyCount; playerColor: TankColor }) => void
}

const TERRAIN_SIZE_ORDER: TerrainSize[] = ['small', 'medium', 'large', 'huge', 'epic']

const TANK_COLORS: { color: TankColor; hex: string; label: string }[] = [
  { color: 'red', hex: '#ff4444', label: 'Red' },
  { color: 'blue', hex: '#4488ff', label: 'Blue' },
  { color: 'green', hex: '#44ff44', label: 'Green' },
  { color: 'yellow', hex: '#ffff44', label: 'Yellow' },
  { color: 'orange', hex: '#ff8844', label: 'Orange' },
  { color: 'purple', hex: '#aa44ff', label: 'Purple' },
  { color: 'cyan', hex: '#44ffff', label: 'Cyan' },
  { color: 'pink', hex: '#ff66aa', label: 'Pink' },
  { color: 'white', hex: '#dddddd', label: 'White' },
  { color: 'brown', hex: '#8b5a2b', label: 'Brown' },
]

export function GameConfigScreen({ onStartGame }: GameConfigScreenProps) {
  const [terrainSize, setTerrainSize] = useState<TerrainSize | null>(null)
  const [enemyCount, setEnemyCount] = useState<EnemyCount | null>(null)
  const [playerColor, setPlayerColor] = useState<TankColor | null>(null)

  const allSelected = terrainSize !== null && enemyCount !== null && playerColor !== null

  const handleEngage = () => {
    if (allSelected) {
      onStartGame({ terrainSize, enemyCount, playerColor })
    }
  }

  return (
    <div className="game-config-screen" data-testid="game-config-screen">
      <h1 className="game-config-screen__title">Battle Configuration</h1>

      <PlayerStatsDisplay />

      <div className="game-config-screen__sections">
        {/* Terrain Size Section */}
        <div className="game-config-screen__section">
          <h2 className="game-config-screen__section-title">Terrain Size</h2>
          <div className="game-config-screen__terrain-options">
            {TERRAIN_SIZE_ORDER.map((size) => {
              const config = TERRAIN_SIZES[size]
              return (
                <button
                  key={size}
                  className={`game-config-screen__terrain-option ${terrainSize === size ? 'game-config-screen__terrain-option--selected' : ''}`}
                  onClick={() => setTerrainSize(size)}
                  data-testid={`config-terrain-${size}`}
                  aria-label={`Select ${config.label} terrain`}
                  aria-pressed={terrainSize === size}
                >
                  <div className="game-config-screen__terrain-preview">
                    <div
                      className="game-config-screen__terrain-preview-inner"
                      style={{
                        width: `${(config.width / 2100) * 100}%`,
                        height: `${(config.height / 2800) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="game-config-screen__terrain-label">{config.label}</span>
                  <span className="game-config-screen__terrain-dimensions">
                    {config.width} x {config.height}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Enemy Count Section */}
        <div className="game-config-screen__section">
          <h2 className="game-config-screen__section-title">Enemy Count</h2>
          <div className="game-config-screen__enemy-options">
            {ENEMY_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                className={`game-config-screen__enemy-option ${enemyCount === count ? 'game-config-screen__enemy-option--selected' : ''}`}
                onClick={() => setEnemyCount(count)}
                data-testid={`config-enemy-${count}`}
                aria-label={`Select ${count} ${count === 1 ? 'enemy' : 'enemies'}`}
                aria-pressed={enemyCount === count}
              >
                <div className="game-config-screen__enemy-preview">
                  {Array.from({ length: count }, (_, i) => (
                    <div key={i} className="game-config-screen__enemy-tank-icon" />
                  ))}
                </div>
                <span className="game-config-screen__enemy-label">
                  {count} {count === 1 ? 'Enemy' : 'Enemies'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tank Color Section */}
        <div className="game-config-screen__section">
          <h2 className="game-config-screen__section-title">Your Tank</h2>
          <div className="game-config-screen__color-options">
            {TANK_COLORS.map(({ color, hex, label }) => (
              <button
                key={color}
                className={`game-config-screen__color-option ${playerColor === color ? 'game-config-screen__color-option--selected' : ''}`}
                style={{ '--tank-color': hex } as React.CSSProperties}
                onClick={() => setPlayerColor(color)}
                data-testid={`config-color-${color}`}
                aria-label={`Select ${label} tank`}
                aria-pressed={playerColor === color}
              >
                <div className="game-config-screen__tank-preview" />
                <span className="game-config-screen__color-label">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Engage Button */}
      <button
        className={`game-config-screen__engage-button ${allSelected ? 'game-config-screen__engage-button--active' : ''}`}
        onClick={handleEngage}
        disabled={!allSelected}
        data-testid="config-engage-button"
        aria-label="Start battle"
      >
        Engage
      </button>
    </div>
  )
}
