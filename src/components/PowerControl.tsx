import { useCallback } from 'react'
import { useKeyboard } from '../hooks'

interface PowerControlProps {
  power: number
  onPowerChange: (power: number) => void
  minPower?: number
  maxPower?: number
  step?: number
  enabled?: boolean
}

const POWER_STEP = 1
const POWER_STEP_FAST = 10
const MIN_POWER = 0
const MAX_POWER = 100

export function PowerControl({
  power,
  onPowerChange,
  minPower = MIN_POWER,
  maxPower = MAX_POWER,
  step = POWER_STEP,
  enabled = true,
}: PowerControlProps) {
  const clampPower = useCallback(
    (newPower: number) => Math.max(minPower, Math.min(maxPower, newPower)),
    [minPower, maxPower]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const stepAmount = event.shiftKey ? POWER_STEP_FAST : step

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault()
          onPowerChange(clampPower(power + stepAmount))
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault()
          onPowerChange(clampPower(power - stepAmount))
          break
      }
    },
    [power, onPowerChange, clampPower, step]
  )

  useKeyboard({
    onKeyDown: handleKeyDown,
    enabled,
  })

  const powerPercentage = ((power - minPower) / (maxPower - minPower)) * 100

  return (
    <div className="power-control" data-testid="power-control">
      <div className="power-control__label">Power</div>
      <div className="power-control__display">
        <div className="power-control__value" data-testid="power-value">
          {power}%
        </div>
        <div className="power-control__bar">
          <div
            className="power-control__bar-fill"
            style={{ width: `${powerPercentage}%` }}
          />
        </div>
      </div>
      <div className="power-control__hint">
        <kbd>↑</kbd>/<kbd>↓</kbd> or <kbd>W</kbd>/<kbd>S</kbd> to adjust
        <span className="power-control__hint-secondary">
          Hold <kbd>Shift</kbd> for faster
        </span>
      </div>
    </div>
  )
}
