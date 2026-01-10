interface TurnIndicatorProps {
  turnNumber: number
  isPlayerTurn: boolean
}

export function TurnIndicator({
  turnNumber,
  isPlayerTurn,
}: TurnIndicatorProps) {
  // In simultaneous mode, isPlayerTurn means player is alive
  const playerClass = isPlayerTurn
    ? 'turn-indicator__player--you'
    : 'turn-indicator__player--opponent'

  const playerLabel = isPlayerTurn ? 'Get Ready!' : 'Spectating'

  return (
    <div className="turn-indicator" data-testid="turn-indicator">
      <div className="turn-indicator__turn-number">Round {turnNumber + 1}</div>
      <div className={`turn-indicator__player ${playerClass}`} data-testid="turn-player">
        {playerLabel}
      </div>
    </div>
  )
}
