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

  it('displays Defeat! when enemy-1 wins', () => {
    render(<GameOverScreen winner="enemy-1" onPlayAgain={vi.fn()} />)
    expect(screen.getByTestId('game-over-title')).toHaveTextContent('Defeat!')
    expect(screen.getByText('Tank 1 won the battle!')).toBeInTheDocument()
  })

  it('displays Defeat! when enemy-2 wins', () => {
    render(<GameOverScreen winner="enemy-2" onPlayAgain={vi.fn()} />)
    expect(screen.getByTestId('game-over-title')).toHaveTextContent('Defeat!')
    expect(screen.getByText('Tank 2 won the battle!')).toBeInTheDocument()
  })

  it('displays Defeat! when enemy-5 wins', () => {
    render(<GameOverScreen winner="enemy-5" onPlayAgain={vi.fn()} />)
    expect(screen.getByTestId('game-over-title')).toHaveTextContent('Defeat!')
    expect(screen.getByText('Tank 5 won the battle!')).toBeInTheDocument()
  })

  it('applies victory class when player wins', () => {
    render(<GameOverScreen winner="player" onPlayAgain={vi.fn()} />)
    expect(screen.getByTestId('game-over-screen')).toHaveClass('game-over-screen--victory')
  })

  it('applies defeat class when enemy wins', () => {
    render(<GameOverScreen winner="enemy-1" onPlayAgain={vi.fn()} />)
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
    // When winner is null, show a generic game over message
    expect(screen.getByTestId('game-over-title')).toHaveTextContent('Game Over')
    expect(screen.getByText('No winner determined')).toBeInTheDocument()
  })
})
