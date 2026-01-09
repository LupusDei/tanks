import { useCallback } from 'react'
import { useKeyboard } from '../hooks'

interface AngleControlProps {
  angle: number
  onAngleChange: (angle: number) => void
  minAngle?: number
  maxAngle?: number
  step?: number
  enabled?: boolean
}

const ANGLE_STEP = 1
const ANGLE_STEP_FAST = 5
const MIN_ANGLE = -120
const MAX_ANGLE = 120

export function AngleControl({
  angle,
  onAngleChange,
  minAngle = MIN_ANGLE,
  maxAngle = MAX_ANGLE,
  step = ANGLE_STEP,
  enabled = true,
}: AngleControlProps) {
  const clampAngle = useCallback(
    (newAngle: number) => Math.max(minAngle, Math.min(maxAngle, newAngle)),
    [minAngle, maxAngle]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const stepAmount = event.shiftKey ? ANGLE_STEP_FAST : step

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault()
          onAngleChange(clampAngle(angle + stepAmount))
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault()
          onAngleChange(clampAngle(angle - stepAmount))
          break
      }
    },
    [angle, onAngleChange, clampAngle, step]
  )

  useKeyboard({
    onKeyDown: handleKeyDown,
    enabled,
  })

  const anglePercentage = ((angle - minAngle) / (maxAngle - minAngle)) * 100

  return (
    <div className="angle-control" data-testid="angle-control">
      <div className="angle-control__label">Angle</div>
      <div className="angle-control__display">
        <div className="angle-control__value" data-testid="angle-value">
          {angle}°
        </div>
        <div className="angle-control__bar">
          <div
            className="angle-control__bar-fill"
            style={{ width: `${anglePercentage}%` }}
          />
        </div>
      </div>
      <div className="angle-control__hint">
        <kbd>↑</kbd>/<kbd>↓</kbd> or <kbd>W</kbd>/<kbd>S</kbd> to adjust
        <span className="angle-control__hint-secondary">
          Hold <kbd>Shift</kbd> for faster
        </span>
      </div>
    </div>
  )
}
