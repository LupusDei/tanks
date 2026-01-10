import { useCallback } from 'react'
import { useKeyboard } from '../hooks'

interface ControlPanelProps {
  angle: number
  power: number
  onAngleChange: (angle: number) => void
  onPowerChange: (power: number) => void
  onFire: () => void
  enabled?: boolean
}

const ANGLE_STEP = 1
const ANGLE_STEP_FAST = 5
const POWER_STEP = 1
const POWER_STEP_FAST = 10
const MIN_ANGLE = -120
const MAX_ANGLE = 120
const MIN_POWER = 0
const MAX_POWER = 100

export function ControlPanel({
  angle,
  power,
  onAngleChange,
  onPowerChange,
  onFire,
  enabled = true,
}: ControlPanelProps) {
  const clampAngle = useCallback(
    (newAngle: number) => Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, newAngle)),
    []
  )

  const clampPower = useCallback(
    (newPower: number) => Math.max(MIN_POWER, Math.min(MAX_POWER, newPower)),
    []
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const shiftHeld = event.shiftKey

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault()
          onPowerChange(clampPower(power + (shiftHeld ? POWER_STEP_FAST : POWER_STEP)))
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault()
          onPowerChange(clampPower(power - (shiftHeld ? POWER_STEP_FAST : POWER_STEP)))
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault()
          onAngleChange(clampAngle(angle - (shiftHeld ? ANGLE_STEP_FAST : ANGLE_STEP)))
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault()
          onAngleChange(clampAngle(angle + (shiftHeld ? ANGLE_STEP_FAST : ANGLE_STEP)))
          break
        case ' ':
        case 'Enter':
          event.preventDefault()
          onFire()
          break
      }
    },
    [angle, power, onAngleChange, onPowerChange, onFire, clampAngle, clampPower]
  )

  useKeyboard({
    onKeyDown: handleKeyDown,
    enabled,
  })

  // Angle bar shows distance from center (0), filling from center outward
  const anglePercentage = (Math.abs(angle) / MAX_ANGLE) * 100
  const angleDirection = angle >= 0 ? 'left' : 'right'
  const powerPercentage = ((power - MIN_POWER) / (MAX_POWER - MIN_POWER)) * 100

  return (
    <div className="control-panel" data-testid="control-panel">
      <div className="control-panel__control control-panel__control--angle">
        <div className="control-panel__label">Angle</div>
        <div className="control-panel__display">
          <div className="control-panel__value" data-testid="angle-value">
            {Math.abs(angle)}° {angle !== 0 && (angle > 0 ? 'L' : 'R')}
          </div>
          <div className="control-panel__bar control-panel__bar--angle">
            <div className="control-panel__bar-center" />
            <div
              className={`control-panel__bar-fill control-panel__bar-fill--angle control-panel__bar-fill--${angleDirection}`}
              style={{ width: `${anglePercentage / 2}%` }}
            />
          </div>
        </div>
        <div className="control-panel__keys">
          <kbd>←</kbd><kbd>→</kbd> <kbd>A</kbd><kbd>D</kbd>
        </div>
      </div>

      <div className="control-panel__control control-panel__control--power">
        <div className="control-panel__label control-panel__label--power">Power</div>
        <div className="control-panel__display">
          <div className="control-panel__value" data-testid="power-value">
            {power}%
          </div>
          <div className="control-panel__bar">
            <div
              className="control-panel__bar-fill control-panel__bar-fill--power"
              style={{ width: `${powerPercentage}%` }}
            />
          </div>
        </div>
        <div className="control-panel__keys">
          <kbd>↑</kbd><kbd>↓</kbd> <kbd>W</kbd><kbd>S</kbd>
        </div>
      </div>

      <div className="control-panel__hint">
        <kbd>Shift</kbd> for faster
      </div>

      <button
        className="control-panel__fire-button"
        data-testid="fire-button"
        onClick={onFire}
        disabled={!enabled}
      >
        Fire!
        <span className="control-panel__fire-keys">
          <kbd>Space</kbd> / <kbd>Enter</kbd>
        </span>
      </button>
    </div>
  )
}
