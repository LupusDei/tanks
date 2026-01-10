import { TerrainSize, TERRAIN_SIZES } from '../types/game'

interface TerrainSizeSelectorProps {
  onSizeSelect: (size: TerrainSize) => void
}

const TERRAIN_SIZE_ORDER: TerrainSize[] = ['small', 'medium', 'large', 'huge', 'epic']

export function TerrainSizeSelector({ onSizeSelect }: TerrainSizeSelectorProps) {
  return (
    <div className="terrain-size-selector" data-testid="terrain-size-selector">
      <h1 className="terrain-size-selector__title">Select Terrain Size</h1>
      <div className="terrain-size-selector__options">
        {TERRAIN_SIZE_ORDER.map((size) => {
          const config = TERRAIN_SIZES[size]
          return (
            <button
              key={size}
              className="terrain-size-selector__option"
              onClick={() => onSizeSelect(size)}
              data-testid={`terrain-size-${size}`}
              aria-label={`Select ${config.label} terrain`}
            >
              <div className="terrain-size-selector__preview">
                <div
                  className="terrain-size-selector__preview-inner"
                  style={{
                    width: `${(config.width / 2100) * 100}%`,
                    height: `${(config.height / 2800) * 100}%`,
                  }}
                />
              </div>
              <span className="terrain-size-selector__label">{config.label}</span>
              <span className="terrain-size-selector__dimensions">
                {config.width} x {config.height}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
