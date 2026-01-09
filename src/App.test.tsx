import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import App from './App'
import { GameProvider } from './context/GameContext'

function renderWithProvider(ui: React.ReactElement) {
  return render(<GameProvider>{ui}</GameProvider>)
}

describe('App', () => {
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

  it('renders the title', () => {
    renderWithProvider(<App />)
    expect(screen.getByText('Scorched Earth Tanks')).toBeInTheDocument()
  })

  it('renders the canvas component', () => {
    const { container } = renderWithProvider(<App />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('shows loading screen initially', () => {
    renderWithProvider(<App />)
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument()
  })

  it('hides loading screen after duration', async () => {
    renderWithProvider(<App />)

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(6000)
    })

    const loadingScreen = screen.getByTestId('loading-screen')
    expect(loadingScreen).toHaveClass('loading-screen--fade-out')
  })
})
