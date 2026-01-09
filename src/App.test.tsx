import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'
import { GameProvider } from './context/GameContext'

function renderWithProvider(ui: React.ReactElement) {
  return render(<GameProvider>{ui}</GameProvider>)
}

describe('App', () => {
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

  it('shows loading screen initially', () => {
    renderWithProvider(<App />)
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument()
    expect(screen.getByTestId('start-button')).toBeInTheDocument()
  })

  it('does not show game content during loading phase', () => {
    renderWithProvider(<App />)
    expect(screen.queryByTestId('turn-indicator')).not.toBeInTheDocument()
  })

  it('transitions to color selection when start button clicked', () => {
    renderWithProvider(<App />)

    fireEvent.click(screen.getByTestId('start-button'))

    const loadingScreen = screen.getByTestId('loading-screen')
    fireEvent.transitionEnd(loadingScreen)

    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument()
    expect(screen.getByTestId('color-selection-screen')).toBeInTheDocument()
    expect(screen.getByText('Choose Your Tank')).toBeInTheDocument()
  })

  it('transitions to game when color is selected', () => {
    renderWithProvider(<App />)

    // Go through loading screen
    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.transitionEnd(screen.getByTestId('loading-screen'))

    // Select a color
    fireEvent.click(screen.getByTestId('color-button-red'))

    expect(screen.queryByTestId('color-selection-screen')).not.toBeInTheDocument()
    expect(screen.getByTestId('turn-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('fire-button')).toBeInTheDocument()
  })

  it('renders the canvas component after selecting color', () => {
    const { container } = renderWithProvider(<App />)

    // Go through loading screen
    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.transitionEnd(screen.getByTestId('loading-screen'))

    // Select a color
    fireEvent.click(screen.getByTestId('color-button-blue'))

    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })
})
