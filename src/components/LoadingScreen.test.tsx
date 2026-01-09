import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoadingScreen } from './LoadingScreen'

describe('LoadingScreen', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      writable: true,
      value: vi.fn(() => ({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(800 * 600 * 4),
        })),
        canvas: { width: 800, height: 600 },
      })),
    })

    Object.defineProperty(HTMLCanvasElement.prototype, 'offsetWidth', {
      writable: true,
      value: 800,
    })

    Object.defineProperty(HTMLCanvasElement.prototype, 'offsetHeight', {
      writable: true,
      value: 600,
    })

    globalThis.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 16)
      return 0
    })

    globalThis.cancelAnimationFrame = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the loading screen', () => {
    render(<LoadingScreen />)
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument()
  })

  it('renders the start button', () => {
    render(<LoadingScreen />)
    expect(screen.getByTestId('start-button')).toBeInTheDocument()
    expect(screen.getByText('Start Game')).toBeInTheDocument()
  })

  it('renders particle canvas', () => {
    const { container } = render(<LoadingScreen />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('starts fade out when start button is clicked', () => {
    render(<LoadingScreen />)

    expect(screen.getByTestId('loading-screen')).not.toHaveClass('loading-screen--fade-out')

    fireEvent.click(screen.getByTestId('start-button'))

    expect(screen.getByTestId('loading-screen')).toHaveClass('loading-screen--fade-out')
  })

  it('calls onStart callback after transition', () => {
    const handleStart = vi.fn()
    render(<LoadingScreen onStart={handleStart} />)

    fireEvent.click(screen.getByTestId('start-button'))

    const loadingScreen = screen.getByTestId('loading-screen')
    fireEvent.transitionEnd(loadingScreen)

    expect(handleStart).toHaveBeenCalledTimes(1)
  })

  it('does not call onStart if not transitioning', () => {
    const handleStart = vi.fn()
    render(<LoadingScreen onStart={handleStart} />)

    const loadingScreen = screen.getByTestId('loading-screen')
    fireEvent.transitionEnd(loadingScreen)

    expect(handleStart).not.toHaveBeenCalled()
  })
})
