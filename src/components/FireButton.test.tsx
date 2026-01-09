import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FireButton } from './FireButton'

describe('FireButton', () => {
  it('renders the fire button', () => {
    render(<FireButton onFire={vi.fn()} />)
    expect(screen.getByTestId('fire-button')).toBeInTheDocument()
  })

  it('displays the Fire label', () => {
    render(<FireButton onFire={vi.fn()} />)
    expect(screen.getByText('Fire!')).toBeInTheDocument()
  })

  it('displays keyboard hint', () => {
    render(<FireButton onFire={vi.fn()} />)
    expect(screen.getByText(/Space/)).toBeInTheDocument()
    expect(screen.getByText(/Enter/)).toBeInTheDocument()
  })

  it('calls onFire when clicked', () => {
    const handleFire = vi.fn()
    render(<FireButton onFire={handleFire} />)

    fireEvent.click(screen.getByTestId('fire-button'))

    expect(handleFire).toHaveBeenCalledTimes(1)
  })

  it('calls onFire when Space is pressed', () => {
    const handleFire = vi.fn()
    render(<FireButton onFire={handleFire} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))

    expect(handleFire).toHaveBeenCalledTimes(1)
  })

  it('calls onFire when Enter is pressed', () => {
    const handleFire = vi.fn()
    render(<FireButton onFire={handleFire} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(handleFire).toHaveBeenCalledTimes(1)
  })

  it('does not respond to keyboard when disabled', () => {
    const handleFire = vi.fn()
    render(<FireButton onFire={handleFire} enabled={false} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(handleFire).not.toHaveBeenCalled()
  })

  it('button is disabled when enabled prop is false', () => {
    render(<FireButton onFire={vi.fn()} enabled={false} />)

    expect(screen.getByTestId('fire-button')).toBeDisabled()
  })

  it('button is enabled by default', () => {
    render(<FireButton onFire={vi.fn()} />)

    expect(screen.getByTestId('fire-button')).not.toBeDisabled()
  })

  it('ignores unrelated keys', () => {
    const handleFire = vi.fn()
    render(<FireButton onFire={handleFire} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(handleFire).not.toHaveBeenCalled()
  })
})
