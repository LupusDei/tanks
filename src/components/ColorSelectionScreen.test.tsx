import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorSelectionScreen } from './ColorSelectionScreen'

const ALL_COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'cyan', 'pink', 'white', 'brown'] as const

describe('ColorSelectionScreen', () => {
  it('renders the color selection screen', () => {
    render(<ColorSelectionScreen onColorSelect={vi.fn()} />)
    expect(screen.getByTestId('color-selection-screen')).toBeInTheDocument()
  })

  it('renders the title', () => {
    render(<ColorSelectionScreen onColorSelect={vi.fn()} />)
    expect(screen.getByText('Choose Your Tank')).toBeInTheDocument()
  })

  it('renders all ten color buttons', () => {
    render(<ColorSelectionScreen onColorSelect={vi.fn()} />)

    for (const color of ALL_COLORS) {
      expect(screen.getByTestId(`color-button-${color}`)).toBeInTheDocument()
    }
  })

  it('renders color labels', () => {
    render(<ColorSelectionScreen onColorSelect={vi.fn()} />)

    expect(screen.getByText('Red')).toBeInTheDocument()
    expect(screen.getByText('Blue')).toBeInTheDocument()
    expect(screen.getByText('Green')).toBeInTheDocument()
    expect(screen.getByText('Yellow')).toBeInTheDocument()
    expect(screen.getByText('Orange')).toBeInTheDocument()
    expect(screen.getByText('Purple')).toBeInTheDocument()
    expect(screen.getByText('Cyan')).toBeInTheDocument()
    expect(screen.getByText('Pink')).toBeInTheDocument()
    expect(screen.getByText('White')).toBeInTheDocument()
    expect(screen.getByText('Brown')).toBeInTheDocument()
  })

  it.each(ALL_COLORS)('calls onColorSelect with %s when %s button is clicked', (color) => {
    const handleColorSelect = vi.fn()
    render(<ColorSelectionScreen onColorSelect={handleColorSelect} />)

    fireEvent.click(screen.getByTestId(`color-button-${color}`))

    expect(handleColorSelect).toHaveBeenCalledTimes(1)
    expect(handleColorSelect).toHaveBeenCalledWith(color)
  })

  it('has accessible labels for each button', () => {
    render(<ColorSelectionScreen onColorSelect={vi.fn()} />)

    for (const color of ALL_COLORS) {
      const label = color.charAt(0).toUpperCase() + color.slice(1)
      expect(screen.getByLabelText(`Select ${label} tank`)).toBeInTheDocument()
    }
  })
})
