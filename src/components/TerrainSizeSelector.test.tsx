import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TerrainSizeSelector } from './TerrainSizeSelector'

describe('TerrainSizeSelector', () => {
  it('renders the terrain size selector', () => {
    render(<TerrainSizeSelector onSizeSelect={vi.fn()} />)
    expect(screen.getByTestId('terrain-size-selector')).toBeInTheDocument()
  })

  it('renders the title', () => {
    render(<TerrainSizeSelector onSizeSelect={vi.fn()} />)
    expect(screen.getByText('Select Terrain Size')).toBeInTheDocument()
  })

  it('renders all five size buttons', () => {
    render(<TerrainSizeSelector onSizeSelect={vi.fn()} />)

    expect(screen.getByTestId('terrain-size-small')).toBeInTheDocument()
    expect(screen.getByTestId('terrain-size-medium')).toBeInTheDocument()
    expect(screen.getByTestId('terrain-size-large')).toBeInTheDocument()
    expect(screen.getByTestId('terrain-size-huge')).toBeInTheDocument()
    expect(screen.getByTestId('terrain-size-epic')).toBeInTheDocument()
  })

  it('renders size labels', () => {
    render(<TerrainSizeSelector onSizeSelect={vi.fn()} />)

    expect(screen.getByText('Small')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Large')).toBeInTheDocument()
    expect(screen.getByText('Huge')).toBeInTheDocument()
    expect(screen.getByText('Epic')).toBeInTheDocument()
  })

  it('renders dimension labels', () => {
    render(<TerrainSizeSelector onSizeSelect={vi.fn()} />)

    expect(screen.getByText('800 x 600')).toBeInTheDocument()
    expect(screen.getByText('1024 x 768')).toBeInTheDocument()
    expect(screen.getByText('1280 x 960')).toBeInTheDocument()
    expect(screen.getByText('1600 x 1200')).toBeInTheDocument()
    expect(screen.getByText('2100 x 2800')).toBeInTheDocument()
  })

  it('calls onSizeSelect with small when small button is clicked', () => {
    const handleSizeSelect = vi.fn()
    render(<TerrainSizeSelector onSizeSelect={handleSizeSelect} />)

    fireEvent.click(screen.getByTestId('terrain-size-small'))

    expect(handleSizeSelect).toHaveBeenCalledTimes(1)
    expect(handleSizeSelect).toHaveBeenCalledWith('small')
  })

  it('calls onSizeSelect with medium when medium button is clicked', () => {
    const handleSizeSelect = vi.fn()
    render(<TerrainSizeSelector onSizeSelect={handleSizeSelect} />)

    fireEvent.click(screen.getByTestId('terrain-size-medium'))

    expect(handleSizeSelect).toHaveBeenCalledTimes(1)
    expect(handleSizeSelect).toHaveBeenCalledWith('medium')
  })

  it('calls onSizeSelect with large when large button is clicked', () => {
    const handleSizeSelect = vi.fn()
    render(<TerrainSizeSelector onSizeSelect={handleSizeSelect} />)

    fireEvent.click(screen.getByTestId('terrain-size-large'))

    expect(handleSizeSelect).toHaveBeenCalledTimes(1)
    expect(handleSizeSelect).toHaveBeenCalledWith('large')
  })

  it('calls onSizeSelect with huge when huge button is clicked', () => {
    const handleSizeSelect = vi.fn()
    render(<TerrainSizeSelector onSizeSelect={handleSizeSelect} />)

    fireEvent.click(screen.getByTestId('terrain-size-huge'))

    expect(handleSizeSelect).toHaveBeenCalledTimes(1)
    expect(handleSizeSelect).toHaveBeenCalledWith('huge')
  })

  it('calls onSizeSelect with epic when epic button is clicked', () => {
    const handleSizeSelect = vi.fn()
    render(<TerrainSizeSelector onSizeSelect={handleSizeSelect} />)

    fireEvent.click(screen.getByTestId('terrain-size-epic'))

    expect(handleSizeSelect).toHaveBeenCalledTimes(1)
    expect(handleSizeSelect).toHaveBeenCalledWith('epic')
  })

  it('has accessible labels for each button', () => {
    render(<TerrainSizeSelector onSizeSelect={vi.fn()} />)

    expect(screen.getByLabelText('Select Small terrain')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Medium terrain')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Large terrain')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Huge terrain')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Epic terrain')).toBeInTheDocument()
  })
})
