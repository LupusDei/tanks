import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PowerControl } from './PowerControl'

describe('PowerControl', () => {
  it('renders the power control', () => {
    render(<PowerControl power={50} onPowerChange={vi.fn()} />)
    expect(screen.getByTestId('power-control')).toBeInTheDocument()
  })

  it('displays the current power value', () => {
    render(<PowerControl power={50} onPowerChange={vi.fn()} />)
    expect(screen.getByTestId('power-value')).toHaveTextContent('50%')
  })

  it('displays the power label', () => {
    render(<PowerControl power={50} onPowerChange={vi.fn()} />)
    expect(screen.getByText('Power')).toBeInTheDocument()
  })

  it('displays keyboard hint', () => {
    render(<PowerControl power={50} onPowerChange={vi.fn()} />)
    expect(screen.getByText(/to adjust/)).toBeInTheDocument()
  })

  it('updates displayed power when prop changes', () => {
    const { rerender } = render(<PowerControl power={50} onPowerChange={vi.fn()} />)
    expect(screen.getByTestId('power-value')).toHaveTextContent('50%')

    rerender(<PowerControl power={75} onPowerChange={vi.fn()} />)
    expect(screen.getByTestId('power-value')).toHaveTextContent('75%')
  })

  it('calls onPowerChange when ArrowRight is pressed', () => {
    const handlePowerChange = vi.fn()
    render(<PowerControl power={50} onPowerChange={handlePowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))

    expect(handlePowerChange).toHaveBeenCalledWith(51)
  })

  it('calls onPowerChange when ArrowLeft is pressed', () => {
    const handlePowerChange = vi.fn()
    render(<PowerControl power={50} onPowerChange={handlePowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))

    expect(handlePowerChange).toHaveBeenCalledWith(49)
  })

  it('calls onPowerChange when D is pressed', () => {
    const handlePowerChange = vi.fn()
    render(<PowerControl power={50} onPowerChange={handlePowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }))

    expect(handlePowerChange).toHaveBeenCalledWith(51)
  })

  it('calls onPowerChange when A is pressed', () => {
    const handlePowerChange = vi.fn()
    render(<PowerControl power={50} onPowerChange={handlePowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))

    expect(handlePowerChange).toHaveBeenCalledWith(49)
  })

  it('uses fast step when Shift is held', () => {
    const handlePowerChange = vi.fn()
    render(<PowerControl power={50} onPowerChange={handlePowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }))

    expect(handlePowerChange).toHaveBeenCalledWith(60)
  })

  it('clamps power to max value', () => {
    const handlePowerChange = vi.fn()
    render(<PowerControl power={95} onPowerChange={handlePowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }))

    expect(handlePowerChange).toHaveBeenCalledWith(100)
  })

  it('clamps power to min value', () => {
    const handlePowerChange = vi.fn()
    render(<PowerControl power={5} onPowerChange={handlePowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }))

    expect(handlePowerChange).toHaveBeenCalledWith(0)
  })

  it('respects custom min/max power', () => {
    const handlePowerChange = vi.fn()
    render(
      <PowerControl
        power={30}
        onPowerChange={handlePowerChange}
        minPower={30}
        maxPower={80}
      />
    )

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))

    expect(handlePowerChange).toHaveBeenCalledWith(30)
  })

  it('does not respond to keyboard when disabled', () => {
    const handlePowerChange = vi.fn()
    render(<PowerControl power={50} onPowerChange={handlePowerChange} enabled={false} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))

    expect(handlePowerChange).not.toHaveBeenCalled()
  })

  it('ignores unrelated keys', () => {
    const handlePowerChange = vi.fn()
    render(<PowerControl power={50} onPowerChange={handlePowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))

    expect(handlePowerChange).not.toHaveBeenCalled()
  })
})
