import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TurnIndicator } from './TurnIndicator'

describe('TurnIndicator', () => {
  it('renders the turn indicator', () => {
    render(<TurnIndicator turnNumber={0} playerAlive={true} isFiring={false} />)
    expect(screen.getByTestId('turn-indicator')).toBeInTheDocument()
  })

  it('displays the correct round number (1-indexed)', () => {
    render(<TurnIndicator turnNumber={0} playerAlive={true} isFiring={false} />)
    expect(screen.getByText('Round 1')).toBeInTheDocument()
  })

  it('displays round 5 when turnNumber is 4', () => {
    render(<TurnIndicator turnNumber={4} playerAlive={true} isFiring={false} />)
    expect(screen.getByText('Round 5')).toBeInTheDocument()
  })

  it('displays "Get Ready!" when player is alive and not firing', () => {
    render(<TurnIndicator turnNumber={0} playerAlive={true} isFiring={false} />)
    expect(screen.getByTestId('turn-player')).toHaveTextContent('Get Ready!')
  })

  it('displays "Good Luck!" when player is alive and firing', () => {
    render(<TurnIndicator turnNumber={0} playerAlive={true} isFiring={true} />)
    expect(screen.getByTestId('turn-player')).toHaveTextContent('Good Luck!')
  })

  it('displays "For Aiur!" when player is dead', () => {
    render(<TurnIndicator turnNumber={1} playerAlive={false} isFiring={false} />)
    expect(screen.getByTestId('turn-player')).toHaveTextContent('For Aiur!')
  })

  it('displays "For Aiur!" when player is dead even if firing', () => {
    render(<TurnIndicator turnNumber={1} playerAlive={false} isFiring={true} />)
    expect(screen.getByTestId('turn-player')).toHaveTextContent('For Aiur!')
  })

  it('has correct class for ready state', () => {
    render(<TurnIndicator turnNumber={0} playerAlive={true} isFiring={false} />)
    expect(screen.getByTestId('turn-player')).toHaveClass('turn-indicator__player--ready')
  })

  it('has correct class for firing state', () => {
    render(<TurnIndicator turnNumber={0} playerAlive={true} isFiring={true} />)
    expect(screen.getByTestId('turn-player')).toHaveClass('turn-indicator__player--firing')
  })

  it('has correct class for dead state', () => {
    render(<TurnIndicator turnNumber={1} playerAlive={false} isFiring={false} />)
    expect(screen.getByTestId('turn-player')).toHaveClass('turn-indicator__player--dead')
  })

  it('updates when props change', () => {
    const { rerender } = render(<TurnIndicator turnNumber={0} playerAlive={true} isFiring={false} />)
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    expect(screen.getByTestId('turn-player')).toHaveTextContent('Get Ready!')

    rerender(<TurnIndicator turnNumber={0} playerAlive={true} isFiring={true} />)
    expect(screen.getByTestId('turn-player')).toHaveTextContent('Good Luck!')

    rerender(<TurnIndicator turnNumber={1} playerAlive={false} isFiring={false} />)
    expect(screen.getByText('Round 2')).toBeInTheDocument()
    expect(screen.getByTestId('turn-player')).toHaveTextContent('For Aiur!')
  })
})
