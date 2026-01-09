import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorSelectionScreen } from './ColorSelectionScreen'

describe('ColorSelectionScreen', () => {
  it('renders the color selection screen', () => {
    render(<ColorSelectionScreen onColorSelect={vi.fn()} />)
    expect(screen.getByTestId('color-selection-screen')).toBeInTheDocument()
  })

  it('renders the title', () => {
    render(<ColorSelectionScreen onColorSelect={vi.fn()} />)
    expect(screen.getByText('Choose Your Tank')).toBeInTheDocument()
  })

  it('renders all four color buttons', () => {
    render(<ColorSelectionScreen onColorSelect={vi.fn()} />)

    expect(screen.getByTestId('color-button-red')).toBeInTheDocument()
    expect(screen.getByTestId('color-button-blue')).toBeInTheDocument()
    expect(screen.getByTestId('color-button-green')).toBeInTheDocument()
    expect(screen.getByTestId('color-button-yellow')).toBeInTheDocument()
  })

  it('renders color labels', () => {
    render(<ColorSelectionScreen onColorSelect={vi.fn()} />)

    expect(screen.getByText('Red')).toBeInTheDocument()
    expect(screen.getByText('Blue')).toBeInTheDocument()
    expect(screen.getByText('Green')).toBeInTheDocument()
    expect(screen.getByText('Yellow')).toBeInTheDocument()
  })

  it('calls onColorSelect with red when red button is clicked', () => {
    const handleColorSelect = vi.fn()
    render(<ColorSelectionScreen onColorSelect={handleColorSelect} />)

    fireEvent.click(screen.getByTestId('color-button-red'))

    expect(handleColorSelect).toHaveBeenCalledTimes(1)
    expect(handleColorSelect).toHaveBeenCalledWith('red')
  })

  it('calls onColorSelect with blue when blue button is clicked', () => {
    const handleColorSelect = vi.fn()
    render(<ColorSelectionScreen onColorSelect={handleColorSelect} />)

    fireEvent.click(screen.getByTestId('color-button-blue'))

    expect(handleColorSelect).toHaveBeenCalledTimes(1)
    expect(handleColorSelect).toHaveBeenCalledWith('blue')
  })

  it('calls onColorSelect with green when green button is clicked', () => {
    const handleColorSelect = vi.fn()
    render(<ColorSelectionScreen onColorSelect={handleColorSelect} />)

    fireEvent.click(screen.getByTestId('color-button-green'))

    expect(handleColorSelect).toHaveBeenCalledTimes(1)
    expect(handleColorSelect).toHaveBeenCalledWith('green')
  })

  it('calls onColorSelect with yellow when yellow button is clicked', () => {
    const handleColorSelect = vi.fn()
    render(<ColorSelectionScreen onColorSelect={handleColorSelect} />)

    fireEvent.click(screen.getByTestId('color-button-yellow'))

    expect(handleColorSelect).toHaveBeenCalledTimes(1)
    expect(handleColorSelect).toHaveBeenCalledWith('yellow')
  })

  it('has accessible labels for each button', () => {
    render(<ColorSelectionScreen onColorSelect={vi.fn()} />)

    expect(screen.getByLabelText('Select Red tank')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Blue tank')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Green tank')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Yellow tank')).toBeInTheDocument()
  })
})
