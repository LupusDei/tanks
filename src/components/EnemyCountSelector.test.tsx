import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EnemyCountSelector } from './EnemyCountSelector'

describe('EnemyCountSelector', () => {
  it('renders the title', () => {
    render(<EnemyCountSelector onCountSelect={vi.fn()} />)
    expect(screen.getByText('Select Enemy Count')).toBeInTheDocument()
  })

  it('renders all enemy count options', () => {
    render(<EnemyCountSelector onCountSelect={vi.fn()} />)

    expect(screen.getByText('1 Enemy')).toBeInTheDocument()
    expect(screen.getByText('2 Enemies')).toBeInTheDocument()
    expect(screen.getByText('3 Enemies')).toBeInTheDocument()
    expect(screen.getByText('4 Enemies')).toBeInTheDocument()
    expect(screen.getByText('5 Enemies')).toBeInTheDocument()
    expect(screen.getByText('6 Enemies')).toBeInTheDocument()
    expect(screen.getByText('7 Enemies')).toBeInTheDocument()
    expect(screen.getByText('8 Enemies')).toBeInTheDocument()
    expect(screen.getByText('9 Enemies')).toBeInTheDocument()
    expect(screen.getByText('10 Enemies')).toBeInTheDocument()
  })

  it('calls onCountSelect when a count is clicked', () => {
    const onCountSelect = vi.fn()
    render(<EnemyCountSelector onCountSelect={onCountSelect} />)

    fireEvent.click(screen.getByTestId('enemy-count-3'))
    expect(onCountSelect).toHaveBeenCalledWith(3)
  })

  it('calls onCountSelect with correct value for each option', () => {
    const onCountSelect = vi.fn()
    render(<EnemyCountSelector onCountSelect={onCountSelect} />)

    fireEvent.click(screen.getByTestId('enemy-count-1'))
    expect(onCountSelect).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByTestId('enemy-count-5'))
    expect(onCountSelect).toHaveBeenCalledWith(5)

    fireEvent.click(screen.getByTestId('enemy-count-10'))
    expect(onCountSelect).toHaveBeenCalledWith(10)
  })

  it('has correct aria labels', () => {
    render(<EnemyCountSelector onCountSelect={vi.fn()} />)

    expect(screen.getByLabelText('Select 1 enemy')).toBeInTheDocument()
    expect(screen.getByLabelText('Select 2 enemies')).toBeInTheDocument()
  })

  it('has a testid for the container', () => {
    render(<EnemyCountSelector onCountSelect={vi.fn()} />)
    expect(screen.getByTestId('enemy-count-selector')).toBeInTheDocument()
  })
})
