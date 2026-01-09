import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TurnIndicator } from './TurnIndicator'

describe('TurnIndicator', () => {
  it('renders the turn indicator', () => {
    render(<TurnIndicator turnNumber={0} isPlayerTurn={true} />)
    expect(screen.getByTestId('turn-indicator')).toBeInTheDocument()
  })

  it('displays the correct turn number (1-indexed)', () => {
    render(<TurnIndicator turnNumber={0} isPlayerTurn={true} />)
    expect(screen.getByText('Turn 1')).toBeInTheDocument()
  })

  it('displays turn 5 when turnNumber is 4', () => {
    render(<TurnIndicator turnNumber={4} isPlayerTurn={true} />)
    expect(screen.getByText('Turn 5')).toBeInTheDocument()
  })

  it('displays "Your Turn" when it is player turn', () => {
    render(<TurnIndicator turnNumber={0} isPlayerTurn={true} />)
    expect(screen.getByTestId('turn-player')).toHaveTextContent('Your Turn')
  })

  it('displays "Opponent\'s Turn" when it is not player turn', () => {
    render(<TurnIndicator turnNumber={1} isPlayerTurn={false} />)
    expect(screen.getByTestId('turn-player')).toHaveTextContent("Opponent's Turn")
  })

  it('has correct class for player turn', () => {
    render(<TurnIndicator turnNumber={0} isPlayerTurn={true} />)
    expect(screen.getByTestId('turn-player')).toHaveClass('turn-indicator__player--you')
  })

  it('has correct class for opponent turn', () => {
    render(<TurnIndicator turnNumber={1} isPlayerTurn={false} />)
    expect(screen.getByTestId('turn-player')).toHaveClass('turn-indicator__player--opponent')
  })

  it('updates when props change', () => {
    const { rerender } = render(<TurnIndicator turnNumber={0} isPlayerTurn={true} />)
    expect(screen.getByText('Turn 1')).toBeInTheDocument()
    expect(screen.getByTestId('turn-player')).toHaveTextContent('Your Turn')

    rerender(<TurnIndicator turnNumber={1} isPlayerTurn={false} />)
    expect(screen.getByText('Turn 2')).toBeInTheDocument()
    expect(screen.getByTestId('turn-player')).toHaveTextContent("Opponent's Turn")
  })
})
