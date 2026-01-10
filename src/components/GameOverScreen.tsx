interface GameOverScreenProps {
  winner: string | null
  onPlayAgain: () => void
}

function getWinnerDisplayName(winnerId: string): string {
  if (winnerId === 'player') {
    return 'You'
  }
  // Convert enemy-1, enemy-2, etc. to "Tank 1", "Tank 2", etc.
  const match = winnerId.match(/enemy-(\d+)/)
  if (match) {
    return `Tank ${match[1]}`
  }
  return winnerId
}

export function GameOverScreen({ winner, onPlayAgain }: GameOverScreenProps) {
  const isPlayerWinner = winner === 'player'

  let title: string
  let message: string

  if (isPlayerWinner) {
    title = 'Victory!'
    message = 'You destroyed all enemies!'
  } else if (winner) {
    title = 'Defeat!'
    const winnerName = getWinnerDisplayName(winner)
    message = `${winnerName} won the battle!`
  } else {
    title = 'Game Over'
    message = 'No winner determined'
  }

  return (
    <div
      className={`game-over-screen ${isPlayerWinner ? 'game-over-screen--victory' : 'game-over-screen--defeat'}`}
      data-testid="game-over-screen"
    >
      <h1 className="game-over-screen__title" data-testid="game-over-title">
        {title}
      </h1>
      <p className="game-over-screen__message">{message}</p>
      <button
        className="game-over-screen__button"
        onClick={onPlayAgain}
        data-testid="play-again-button"
      >
        Play Again
      </button>
    </div>
  )
}
