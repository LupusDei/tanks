import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MagnetizeButton } from './MagnetizeButton'

describe('MagnetizeButton', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame for floating animation
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return setTimeout(() => cb(performance.now()), 16) as unknown as number
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      clearTimeout(id)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('renders the button with children', () => {
    render(<MagnetizeButton>Click Me</MagnetizeButton>)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('renders with data-testid', () => {
    render(<MagnetizeButton data-testid="test-button">Click</MagnetizeButton>)
    expect(screen.getByTestId('test-button')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<MagnetizeButton onClick={handleClick}>Click</MagnetizeButton>)

    fireEvent.click(screen.getByText('Click'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders particles based on particleCount', () => {
    const { container } = render(
      <MagnetizeButton particleCount={5}>Click</MagnetizeButton>
    )

    const particles = container.querySelectorAll('.magnetize-button__particle')
    expect(particles.length).toBe(5)
  })

  it('renders default 56 particles when particleCount not specified', () => {
    const { container } = render(<MagnetizeButton>Click</MagnetizeButton>)

    const particles = container.querySelectorAll('.magnetize-button__particle')
    expect(particles.length).toBe(56)
  })

  it('applies attracting class on mouse enter', () => {
    const { container } = render(<MagnetizeButton>Hover Me</MagnetizeButton>)
    const button = container.querySelector('.magnetize-button')!

    expect(button).not.toHaveClass('magnetize-button--attracting')

    fireEvent.mouseEnter(button)

    expect(button).toHaveClass('magnetize-button--attracting')
  })

  it('removes attracting class on mouse leave', () => {
    const { container } = render(<MagnetizeButton>Hover Me</MagnetizeButton>)
    const button = container.querySelector('.magnetize-button')!

    fireEvent.mouseEnter(button)
    expect(button).toHaveClass('magnetize-button--attracting')

    fireEvent.mouseLeave(button)
    expect(button).not.toHaveClass('magnetize-button--attracting')
  })

  it('applies attracting class to particles on hover', () => {
    const { container } = render(
      <MagnetizeButton particleCount={3}>Hover</MagnetizeButton>
    )
    const button = container.querySelector('.magnetize-button')!

    fireEvent.mouseEnter(button)

    const particles = container.querySelectorAll('.magnetize-button__particle--attracting')
    expect(particles.length).toBe(3)
  })

  it('does not trigger interaction when disabled', () => {
    const { container } = render(
      <MagnetizeButton disabled>Disabled</MagnetizeButton>
    )
    const button = container.querySelector('.magnetize-button')!

    fireEvent.mouseEnter(button)

    expect(button).not.toHaveClass('magnetize-button--attracting')
  })

  it('applies custom className', () => {
    const { container } = render(
      <MagnetizeButton className="custom-class">Click</MagnetizeButton>
    )
    const button = container.querySelector('.magnetize-button')

    expect(button).toHaveClass('custom-class')
  })

  it('handles touch events', () => {
    const { container } = render(<MagnetizeButton>Touch Me</MagnetizeButton>)
    const button = container.querySelector('.magnetize-button')!

    fireEvent.touchStart(button)
    expect(button).toHaveClass('magnetize-button--attracting')

    fireEvent.touchEnd(button)
    expect(button).not.toHaveClass('magnetize-button--attracting')
  })

  it('starts floating animation on mount', () => {
    render(<MagnetizeButton>Float</MagnetizeButton>)

    // requestAnimationFrame should be called for floating animation
    expect(window.requestAnimationFrame).toHaveBeenCalled()
  })

  it('cleans up animation on unmount', () => {
    const { unmount } = render(<MagnetizeButton>Float</MagnetizeButton>)

    unmount()

    // cancelAnimationFrame should be called on unmount
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })
})
