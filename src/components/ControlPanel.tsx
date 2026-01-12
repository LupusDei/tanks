import { useCallback } from 'react'
import { useKeyboard, useIsMobile, usePressAndHold } from '../hooks'

interface ControlPanelProps {
  angle: number
  power: number
  onAngleChange: (angle: number) => void
  onPowerChange: (power: number) => void
  onFire: () => void
  enabled?: boolean
  /** Whether the player's shot is queued and waiting for others */
  isQueued?: boolean
  /** Current fuel level (0-100) */
  fuel?: number
  /** Maximum fuel capacity (always 100) */
  maxFuel?: number
  /** Handler for moving tank left */
  onMoveLeft?: () => void
  /** Handler for moving tank right */
  onMoveRight?: () => void
  /** Whether movement is currently allowed (not queued, has fuel, not moving) */
  canMove?: boolean
  /** Callback to fit game to screen (mobile) */
  onFitScreen?: () => void
  /** Whether the game is currently fitted to screen */
  isFittedToScreen?: boolean
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
  isQueued = false,
  fuel = 0,
  maxFuel = 100,
  onMoveLeft,
  onMoveRight,
  canMove = false,
  onFitScreen,
  isFittedToScreen = false,
}: ControlPanelProps) {
  const isMobile = useIsMobile()

  const clampAngle = useCallback(
    (newAngle: number) => Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, newAngle)),
    []
  )

  const clampPower = useCallback(
    (newPower: number) => Math.max(MIN_POWER, Math.min(MAX_POWER, newPower)),
    []
  )

  // Press-and-hold handlers for all buttons (works on both desktop and mobile)
  const angleIncreaseHandlers = usePressAndHold({
    onPress: useCallback(() => {
      onAngleChange(clampAngle(angle + ANGLE_STEP))
    }, [angle, onAngleChange, clampAngle]),
    enabled: enabled && angle < MAX_ANGLE,
  })

  const angleDecreaseHandlers = usePressAndHold({
    onPress: useCallback(() => {
      onAngleChange(clampAngle(angle - ANGLE_STEP))
    }, [angle, onAngleChange, clampAngle]),
    enabled: enabled && angle > MIN_ANGLE,
  })

  const powerIncreaseHandlers = usePressAndHold({
    onPress: useCallback(() => {
      onPowerChange(clampPower(power + POWER_STEP))
    }, [power, onPowerChange, clampPower]),
    enabled: enabled && power < MAX_POWER,
  })

  const powerDecreaseHandlers = usePressAndHold({
    onPress: useCallback(() => {
      onPowerChange(clampPower(power - POWER_STEP))
    }, [power, onPowerChange, clampPower]),
    enabled: enabled && power > MIN_POWER,
  })

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
        case 'q':
        case 'Q':
          event.preventDefault()
          if (canMove && onMoveLeft) {
            onMoveLeft()
          }
          break
        case 'e':
        case 'E':
          event.preventDefault()
          if (canMove && onMoveRight) {
            onMoveRight()
          }
          break
      }
    },
    [angle, power, onAngleChange, onPowerChange, onFire, clampAngle, clampPower, canMove, onMoveLeft, onMoveRight]
  )

  useKeyboard({
    onKeyDown: handleKeyDown,
    enabled,
  })

  // Angle bar shows distance from center (0), filling from center outward
  const anglePercentage = (Math.abs(angle) / MAX_ANGLE) * 100
  const angleDirection = angle >= 0 ? 'left' : 'right'
  const powerPercentage = ((power - MIN_POWER) / (MAX_POWER - MIN_POWER)) * 100
  const fuelPercentage = maxFuel > 0 ? (fuel / maxFuel) * 100 : 0
  const hasFuel = fuel > 0

  return (
    <div className={`control-panel ${isMobile ? 'control-panel--mobile' : ''}`} data-testid="control-panel">
      <div className="control-panel__controls">
        <div className="control-panel__control control-panel__control--angle">
          <div className="control-panel__label">Angle</div>
          <div className="control-panel__display">
            <button
              className="control-panel__touch-btn control-panel__touch-btn--angle"
              disabled={!enabled || angle >= MAX_ANGLE}
              aria-label="Increase angle left"
              data-testid="angle-increase-btn"
              {...angleIncreaseHandlers}
            >
              ◀
            </button>
            <div className="control-panel__value-container">
              <div className="control-panel__value" data-testid="angle-value">
                {Math.abs(angle)}° {angle !== 0 && (angle > 0 ? 'L' : 'R')}
              </div>
              {!isMobile && (
                <div className="control-panel__bar control-panel__bar--angle">
                  <div className="control-panel__bar-center" />
                  <div
                    className={`control-panel__bar-fill control-panel__bar-fill--angle control-panel__bar-fill--${angleDirection}`}
                    style={{ width: `${anglePercentage / 2}%` }}
                  />
                </div>
              )}
            </div>
            <button
              className="control-panel__touch-btn control-panel__touch-btn--angle"
              disabled={!enabled || angle <= MIN_ANGLE}
              aria-label="Increase angle right"
              data-testid="angle-decrease-btn"
              {...angleDecreaseHandlers}
            >
              ▶
            </button>
          </div>
          {!isMobile && (
            <div className="control-panel__keys">
              <kbd>←</kbd><kbd>→</kbd> <kbd>A</kbd><kbd>D</kbd>
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="control-panel__hint">
            <kbd>Shift</kbd>
            <span>for faster</span>
          </div>
        )}

        {onFitScreen && (
          <button
            className={`control-panel__fit-btn${isFittedToScreen ? ' control-panel__fit-btn--active' : ''}`}
            onClick={onFitScreen}
            aria-label={isFittedToScreen ? 'Reset zoom' : 'Fit to screen'}
            data-testid="fit-screen-btn"
          >
            {isFittedToScreen ? '⊕' : '⊖'}
          </button>
        )}

        <div className="control-panel__control control-panel__control--power">
          <div className="control-panel__label control-panel__label--power">Power</div>
          <div className="control-panel__display">
            <button
              className="control-panel__touch-btn control-panel__touch-btn--power"
              disabled={!enabled || power <= MIN_POWER}
              aria-label="Decrease power"
              data-testid="power-decrease-btn"
              {...powerDecreaseHandlers}
            >
              −
            </button>
            <div className="control-panel__value-container">
              <div className="control-panel__value" data-testid="power-value">
                {power}%
              </div>
              {!isMobile && (
                <div className="control-panel__bar">
                  <div
                    className="control-panel__bar-fill control-panel__bar-fill--power"
                    style={{ width: `${powerPercentage}%` }}
                  />
                </div>
              )}
            </div>
            <button
              className="control-panel__touch-btn control-panel__touch-btn--power"
              disabled={!enabled || power >= MAX_POWER}
              aria-label="Increase power"
              data-testid="power-increase-btn"
              {...powerIncreaseHandlers}
            >
              +
            </button>
          </div>
          {!isMobile && (
            <div className="control-panel__keys">
              <kbd>↑</kbd><kbd>↓</kbd> <kbd>W</kbd><kbd>S</kbd>
            </div>
          )}
        </div>

        {/* Fuel Control - only shown if maxFuel > 0 */}
        {maxFuel > 0 && (
          <div className={`control-panel__control control-panel__control--fuel ${!hasFuel ? 'control-panel__control--empty' : ''}`}>
            <div className="control-panel__label control-panel__label--fuel">Fuel</div>
            <div className="control-panel__display">
              {isMobile && (
                <button
                  className="control-panel__touch-btn control-panel__touch-btn--fuel"
                  onClick={onMoveLeft}
                  disabled={!canMove}
                  aria-label="Move tank left"
                  data-testid="move-left-btn"
                >
                  ◀
                </button>
              )}
              <div className="control-panel__value" data-testid="fuel-value">
                {fuel}%
              </div>
              {!isMobile && (
                <div className="control-panel__bar">
                  <div
                    className="control-panel__bar-fill control-panel__bar-fill--fuel"
                    style={{ width: `${fuelPercentage}%` }}
                  />
                </div>
              )}
              {isMobile && (
                <button
                  className="control-panel__touch-btn control-panel__touch-btn--fuel"
                  onClick={onMoveRight}
                  disabled={!canMove}
                  aria-label="Move tank right"
                  data-testid="move-right-btn"
                >
                  ▶
                </button>
              )}
            </div>
            {!isMobile && (
              <div className="control-panel__keys">
                <kbd>Q</kbd> <kbd>E</kbd>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        className={`control-panel__fire-button${isQueued ? ' control-panel__fire-button--ready' : ''}`}
        data-testid="fire-button"
        onClick={onFire}
        disabled={!enabled || isQueued}
      >
        {isQueued ? 'Ready!' : 'Fire!'}
        {!isQueued && !isMobile && (
          <span className="control-panel__fire-keys">
            <kbd>Space</kbd> / <kbd>Enter</kbd>
          </span>
        )}
        {isQueued && (
          <span className="control-panel__fire-keys">
            Waiting for others...
          </span>
        )}
      </button>
    </div>
  )
}
