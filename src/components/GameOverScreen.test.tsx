import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameOverScreen } from './GameOverScreen'

describe('GameOverScreen', () => {
  it('renders the game over screen', () => {
    render(<GameOverScreen winner="player" onPlayAgain={vi.fn()} />)
    expect(screen.getByTestId('game-over-screen')).toBeInTheDocument()
  })

  it('displays Victory! when player wins', () => {
    render(<GameOverScreen winner="player" onPlayAgain={vi.fn()} />)
    expect(screen.getByTestId('game-over-title')).toHaveTextContent('Victory!')
    expect(screen.getByText('You destroyed all enemies!')).toBeInTheDocument()
  })

  it('displays Defeat! when opponent wins', () => {
    render(<GameOverScreen winner="opponent" onPlayAgain={vi.fn()} />)
    expect(screen.getByTestId('game-over-title')).toHaveTextContent('Defeat!')
    expect(screen.getByText('Your tank was destroyed!')).toBeInTheDocument()
  })

  it('applies victory class when player wins', () => {
    render(<GameOverScreen winner="player" onPlayAgain={vi.fn()} />)
    expect(screen.getByTestId('game-over-screen')).toHaveClass('game-over-screen--victory')
  })

  it('applies defeat class when opponent wins', () => {
    render(<GameOverScreen winner="opponent" onPlayAgain={vi.fn()} />)
    expect(screen.getByTestId('game-over-screen')).toHaveClass('game-over-screen--defeat')
  })

  it('renders the play again button', () => {
    render(<GameOverScreen winner="player" onPlayAgain={vi.fn()} />)
    expect(screen.getByTestId('play-again-button')).toBeInTheDocument()
    expect(screen.getByText('Play Again')).toBeInTheDocument()
  })

  it('calls onPlayAgain when button is clicked', () => {
    const handlePlayAgain = vi.fn()
    render(<GameOverScreen winner="player" onPlayAgain={handlePlayAgain} />)

    fireEvent.click(screen.getByTestId('play-again-button'))

    expect(handlePlayAgain).toHaveBeenCalledTimes(1)
  })

  it('handles null winner gracefully', () => {
    render(<GameOverScreen winner={null} onPlayAgain={vi.fn()} />)
    // When winner is null, it's treated as not being the player
    expect(screen.getByTestId('game-over-title')).toHaveTextContent('Defeat!')
  })
})
