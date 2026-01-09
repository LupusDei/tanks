import { TankColor } from '../types/game'

interface ColorSelectionScreenProps {
  onColorSelect: (color: TankColor) => void
}

const TANK_COLORS: { color: TankColor; hex: string; label: string }[] = [
  { color: 'red', hex: '#ff4444', label: 'Red' },
  { color: 'blue', hex: '#4488ff', label: 'Blue' },
  { color: 'green', hex: '#44ff44', label: 'Green' },
  { color: 'yellow', hex: '#ffff44', label: 'Yellow' },
]

export function ColorSelectionScreen({ onColorSelect }: ColorSelectionScreenProps) {
  return (
    <div className="color-selection-screen" data-testid="color-selection-screen">
      <h1 className="color-selection-screen__title">Choose Your Tank</h1>
      <div className="color-selection-screen__colors">
        {TANK_COLORS.map(({ color, hex, label }) => (
          <button
            key={color}
            className="color-selection-screen__color-button"
            style={{ '--tank-color': hex } as React.CSSProperties}
            onClick={() => onColorSelect(color)}
            data-testid={`color-button-${color}`}
            aria-label={`Select ${label} tank`}
          >
            <div className="color-selection-screen__tank-preview" />
            <span className="color-selection-screen__color-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
