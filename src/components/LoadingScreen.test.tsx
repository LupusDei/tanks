import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { LoadingScreen } from './LoadingScreen'

describe('LoadingScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()

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
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the loading screen', () => {
    render(<LoadingScreen />)
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument()
  })

  it('renders the loading text', () => {
    render(<LoadingScreen />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders particle canvas', () => {
    const { container } = render(<LoadingScreen />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('starts fade out after duration', async () => {
    render(<LoadingScreen duration={3000} />)

    expect(screen.getByTestId('loading-screen')).not.toHaveClass('loading-screen--fade-out')

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByTestId('loading-screen')).toHaveClass('loading-screen--fade-out')
  })

  it('calls onComplete callback after transition', async () => {
    const handleComplete = vi.fn()
    render(<LoadingScreen duration={3000} onComplete={handleComplete} />)

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    const loadingScreen = screen.getByTestId('loading-screen')
    fireEvent.transitionEnd(loadingScreen)

    expect(handleComplete).toHaveBeenCalledTimes(1)
  })

  it('does not call onComplete if not transitioning', () => {
    const handleComplete = vi.fn()
    render(<LoadingScreen duration={3000} onComplete={handleComplete} />)

    const loadingScreen = screen.getByTestId('loading-screen')
    fireEvent.transitionEnd(loadingScreen)

    expect(handleComplete).not.toHaveBeenCalled()
  })

  it('uses default duration of 6000ms', async () => {
    render(<LoadingScreen />)

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByTestId('loading-screen')).not.toHaveClass('loading-screen--fade-out')

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByTestId('loading-screen')).toHaveClass('loading-screen--fade-out')
  })
})
