interface GameOverScreenProps {
  winner: string | null
  onPlayAgain: () => void
}

export function GameOverScreen({ winner, onPlayAgain }: GameOverScreenProps) {
  const isPlayerWinner = winner === 'player'
  const title = isPlayerWinner ? 'Victory!' : 'Defeat!'
  const message = isPlayerWinner
    ? 'You destroyed all enemies!'
    : 'Your tank was destroyed!'

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
