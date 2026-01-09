interface TurnIndicatorProps {
  turnNumber: number
  isPlayerTurn: boolean
}

export function TurnIndicator({
  turnNumber,
  isPlayerTurn,
}: TurnIndicatorProps) {
  const playerClass = isPlayerTurn
    ? 'turn-indicator__player--you'
    : 'turn-indicator__player--opponent'

  const playerLabel = isPlayerTurn ? 'Your Turn' : "Opponent's Turn"

  return (
    <div className="turn-indicator" data-testid="turn-indicator">
      <div className="turn-indicator__turn-number">Turn {turnNumber + 1}</div>
      <div className={`turn-indicator__player ${playerClass}`} data-testid="turn-player">
        {playerLabel}
      </div>
    </div>
  )
}
