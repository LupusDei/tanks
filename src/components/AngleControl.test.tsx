import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AngleControl } from './AngleControl'

describe('AngleControl', () => {
  it('renders the angle control', () => {
    render(<AngleControl angle={45} onAngleChange={vi.fn()} />)
    expect(screen.getByTestId('angle-control')).toBeInTheDocument()
  })

  it('displays the current angle value', () => {
    render(<AngleControl angle={45} onAngleChange={vi.fn()} />)
    expect(screen.getByTestId('angle-value')).toHaveTextContent('45°')
  })

  it('displays the angle label', () => {
    render(<AngleControl angle={45} onAngleChange={vi.fn()} />)
    expect(screen.getByText('Angle')).toBeInTheDocument()
  })

  it('displays keyboard hint', () => {
    render(<AngleControl angle={45} onAngleChange={vi.fn()} />)
    expect(screen.getByText(/to adjust/)).toBeInTheDocument()
  })

  it('updates displayed angle when prop changes', () => {
    const { rerender } = render(<AngleControl angle={45} onAngleChange={vi.fn()} />)
    expect(screen.getByTestId('angle-value')).toHaveTextContent('45°')

    rerender(<AngleControl angle={60} onAngleChange={vi.fn()} />)
    expect(screen.getByTestId('angle-value')).toHaveTextContent('60°')
  })

  it('calls onAngleChange when ArrowUp is pressed', () => {
    const handleAngleChange = vi.fn()
    render(<AngleControl angle={45} onAngleChange={handleAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))

    expect(handleAngleChange).toHaveBeenCalledWith(46)
  })

  it('calls onAngleChange when ArrowDown is pressed', () => {
    const handleAngleChange = vi.fn()
    render(<AngleControl angle={45} onAngleChange={handleAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))

    expect(handleAngleChange).toHaveBeenCalledWith(44)
  })

  it('calls onAngleChange when W is pressed', () => {
    const handleAngleChange = vi.fn()
    render(<AngleControl angle={45} onAngleChange={handleAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }))

    expect(handleAngleChange).toHaveBeenCalledWith(46)
  })

  it('calls onAngleChange when S is pressed', () => {
    const handleAngleChange = vi.fn()
    render(<AngleControl angle={45} onAngleChange={handleAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))

    expect(handleAngleChange).toHaveBeenCalledWith(44)
  })

  it('uses fast step when Shift is held', () => {
    const handleAngleChange = vi.fn()
    render(<AngleControl angle={45} onAngleChange={handleAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true }))

    expect(handleAngleChange).toHaveBeenCalledWith(50)
  })

  it('clamps angle to max value', () => {
    const handleAngleChange = vi.fn()
    render(<AngleControl angle={118} onAngleChange={handleAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true }))

    expect(handleAngleChange).toHaveBeenCalledWith(120)
  })

  it('clamps angle to min value', () => {
    const handleAngleChange = vi.fn()
    render(<AngleControl angle={-118} onAngleChange={handleAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true }))

    expect(handleAngleChange).toHaveBeenCalledWith(-120)
  })

  it('respects custom min/max angles', () => {
    const handleAngleChange = vi.fn()
    render(
      <AngleControl
        angle={30}
        onAngleChange={handleAngleChange}
        minAngle={30}
        maxAngle={60}
      />
    )

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))

    expect(handleAngleChange).toHaveBeenCalledWith(30)
  })

  it('does not respond to keyboard when disabled', () => {
    const handleAngleChange = vi.fn()
    render(<AngleControl angle={45} onAngleChange={handleAngleChange} enabled={false} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))

    expect(handleAngleChange).not.toHaveBeenCalled()
  })

  it('ignores unrelated keys', () => {
    const handleAngleChange = vi.fn()
    render(<AngleControl angle={45} onAngleChange={handleAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))

    expect(handleAngleChange).not.toHaveBeenCalled()
  })
})
