import { MAX_WIND } from '../engine/wind'

interface TurnIndicatorProps {
  turnNumber: number
  playerAlive: boolean
  isFiring: boolean
  windSpeed: number
}

export function TurnIndicator({
  turnNumber,
  playerAlive,
  isFiring,
  windSpeed,
}: TurnIndicatorProps) {
  let playerLabel: string
  let playerClass: string

  if (!playerAlive) {
    playerLabel = 'For Aiur!'
    playerClass = 'turn-indicator__player--dead'
  } else if (isFiring) {
    playerLabel = 'Good Luck!'
    playerClass = 'turn-indicator__player--firing'
  } else {
    playerLabel = 'Get Ready!'
    playerClass = 'turn-indicator__player--ready'
  }

  // Calculate arrow width as percentage of max wind
  const absWind = Math.abs(windSpeed)
  const arrowWidthPercent = (absWind / MAX_WIND) * 100
  const windDirection = windSpeed < 0 ? 'left' : windSpeed > 0 ? 'right' : 'none'

  return (
    <div className="turn-indicator" data-testid="turn-indicator">
      <div className="turn-indicator__turn-number">Round {turnNumber + 1}</div>
      <div className="wind-indicator" data-testid="wind-indicator">
        <div className="wind-indicator__display">
          {windDirection === 'left' && (
            <div className="wind-indicator__arrow wind-indicator__arrow--left">
              <span className="wind-indicator__arrow-head">{'<'}</span>
              <div
                className="wind-indicator__arrow-body"
                style={{ width: `${arrowWidthPercent}%` }}
              />
            </div>
          )}
          <div className="wind-indicator__center">o</div>
          {windDirection === 'right' && (
            <div className="wind-indicator__arrow wind-indicator__arrow--right">
              <div
                className="wind-indicator__arrow-body"
                style={{ width: `${arrowWidthPercent}%` }}
              />
              <span className="wind-indicator__arrow-head">{'>'}</span>
            </div>
          )}
          {windDirection === 'none' && (
            <span className="wind-indicator__calm">--</span>
          )}
        </div>
        <div className="wind-indicator__speed">
          {absWind} m/s {windDirection === 'left' ? 'W' : windDirection === 'right' ? 'E' : ''}
        </div>
      </div>
      <div className={`turn-indicator__player ${playerClass}`} data-testid="turn-player">
        {playerLabel}
      </div>
    </div>
  )
}
