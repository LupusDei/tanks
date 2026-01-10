interface TurnIndicatorProps {
  turnNumber: number
  playerAlive: boolean
  isFiring: boolean
}

export function TurnIndicator({
  turnNumber,
  playerAlive,
  isFiring,
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

  return (
    <div className="turn-indicator" data-testid="turn-indicator">
      <div className="turn-indicator__turn-number">Round {turnNumber + 1}</div>
      <div className={`turn-indicator__player ${playerClass}`} data-testid="turn-player">
        {playerLabel}
      </div>
    </div>
  )
}
