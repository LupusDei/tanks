import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import App from './App'
import { GameProvider } from './context/GameContext'
import { UserProvider } from './context/UserContext'
import { CampaignProvider } from './context/CampaignContext'
import { AudioProvider } from './context/AudioContext'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <AudioProvider>
      <UserProvider>
        <CampaignProvider>
          <GameProvider>{ui}</GameProvider>
        </CampaignProvider>
      </UserProvider>
    </AudioProvider>
  )
}

describe('App', () => {
  beforeEach(() => {
    localStorageMock.clear()

    // Create a mock gradient object
    const mockGradient = {
      addColorStop: vi.fn(),
    }

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      writable: true,
      value: vi.fn(() => ({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
        createLinearGradient: vi.fn(() => mockGradient),
        createRadialGradient: vi.fn(() => mockGradient),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(800 * 600 * 4),
        })),
        canvas: { width: 800, height: 600 },
        globalCompositeOperation: 'source-over',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
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

  it('transitions to player name entry screen when Free Play is clicked (new user)', async () => {
    vi.useFakeTimers()
    renderWithProvider(<App />)

    // Click Start -> Free Play
    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.click(screen.getByTestId('free-play-button'))

    await act(async () => {
      vi.advanceTimersByTime(800) // Wait for setTimeout
    })

    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument()
    expect(screen.getByTestId('player-name-entry')).toBeInTheDocument()
    expect(screen.getByText('Enter Your Name')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('skips name entry and goes directly to config screen for existing user', async () => {
    vi.useFakeTimers()
    // Set up existing user in localStorage
    const existingUser = {
      profile: { id: 'test-id', username: 'ExistingPlayer', createdAt: Date.now() },
      stats: { gamesPlayed: 5, gamesWon: 3, gamesLost: 2, totalKills: 10, winRate: 60, balance: 1000 },
      recentGames: [],
      weaponInventory: { standard: null }, // null represents Infinity in serialized JSON
    }
    localStorageMock.setItem('tanks_players_db', JSON.stringify({ ExistingPlayer: existingUser }))
    localStorageMock.setItem('tanks_current_player', 'ExistingPlayer')

    renderWithProvider(<App />)

    // Click Start -> Free Play
    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.click(screen.getByTestId('free-play-button'))

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    // Should skip name entry and go directly to config screen
    expect(screen.queryByTestId('player-name-entry')).not.toBeInTheDocument()
    expect(screen.getByTestId('game-config-screen')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('transitions to configuration screen after entering player name', async () => {
    vi.useFakeTimers()
    renderWithProvider(<App />)

    // Go through loading screen
    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.click(screen.getByTestId('free-play-button'))

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    // Enter player name
    const input = screen.getByTestId('player-name-input')
    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    fireEvent.click(screen.getByTestId('player-name-submit'))
    fireEvent.transitionEnd(screen.getByTestId('player-name-entry'))

    expect(screen.queryByTestId('player-name-entry')).not.toBeInTheDocument()
    expect(screen.getByTestId('game-config-screen')).toBeInTheDocument()
    expect(screen.getByText('Battle Configuration')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('shows all configuration sections on config screen', async () => {
    vi.useFakeTimers()
    renderWithProvider(<App />)

    // Go through loading screen
    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.click(screen.getByTestId('free-play-button'))

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    // Go through player name entry
    const input = screen.getByTestId('player-name-input')
    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    fireEvent.click(screen.getByTestId('player-name-submit'))
    fireEvent.transitionEnd(screen.getByTestId('player-name-entry'))

    // Check all sections are present
    expect(screen.getByText('Terrain Size')).toBeInTheDocument()
    expect(screen.getByText('Enemy Count')).toBeInTheDocument()
    expect(screen.getByText('Your Tank')).toBeInTheDocument()

    // Check Engage button is present and enabled (default selections are pre-selected)
    const engageButton = screen.getByTestId('config-engage-button')
    expect(engageButton).toBeInTheDocument()
    expect(engageButton).not.toBeDisabled()
    vi.useRealTimers()
  })

  it('has default selections pre-selected and Engage button enabled', async () => {
    vi.useFakeTimers()
    renderWithProvider(<App />)

    // Go through loading screen
    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.click(screen.getByTestId('free-play-button'))

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    // Go through player name entry
    const input = screen.getByTestId('player-name-input')
    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    fireEvent.click(screen.getByTestId('player-name-submit'))
    fireEvent.transitionEnd(screen.getByTestId('player-name-entry'))

    const engageButton = screen.getByTestId('config-engage-button')

    // Button should be enabled immediately with default selections
    expect(engageButton).not.toBeDisabled()

    // Default selections should be pre-selected (middle options)
    // Terrain: 'large' (middle of 5)
    expect(screen.getByTestId('config-terrain-large')).toHaveAttribute('aria-pressed', 'true')
    // Enemy count: 5 (middle of 10)
    expect(screen.getByTestId('config-enemy-5')).toHaveAttribute('aria-pressed', 'true')
    // Difficulty: 'veteran' (middle of 5)
    expect(screen.getByTestId('config-difficulty-veteran')).toHaveAttribute('aria-pressed', 'true')
    // Color: 'orange' (middle of 10)
    expect(screen.getByTestId('config-color-orange')).toHaveAttribute('aria-pressed', 'true')
    vi.useRealTimers()
  })

  it('transitions to weapon shop when Engage button is clicked with all selections', async () => {
    vi.useFakeTimers()
    renderWithProvider(<App />)

    // Go through loading screen
    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.click(screen.getByTestId('free-play-button'))

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    // Go through player name entry
    const input = screen.getByTestId('player-name-input')
    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    fireEvent.click(screen.getByTestId('player-name-submit'))
    fireEvent.transitionEnd(screen.getByTestId('player-name-entry'))

    // Make all selections
    fireEvent.click(screen.getByTestId('config-terrain-medium'))
    fireEvent.click(screen.getByTestId('config-enemy-1'))
    fireEvent.click(screen.getByTestId('config-difficulty-veteran'))
    fireEvent.click(screen.getByTestId('config-color-red'))

    // Click Engage
    fireEvent.click(screen.getByTestId('config-engage-button'))

    // Should show weapon shop
    expect(screen.queryByTestId('game-config-screen')).not.toBeInTheDocument()
    expect(screen.getByTestId('weapon-shop')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('transitions to game after weapon selection', async () => {
    vi.useFakeTimers()
    renderWithProvider(<App />)

    // Go through loading screen
    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.click(screen.getByTestId('free-play-button'))

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    // Go through player name entry
    const input = screen.getByTestId('player-name-input')
    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    fireEvent.click(screen.getByTestId('player-name-submit'))
    fireEvent.transitionEnd(screen.getByTestId('player-name-entry'))

    // Make all selections
    fireEvent.click(screen.getByTestId('config-terrain-medium'))
    fireEvent.click(screen.getByTestId('config-enemy-1'))
    fireEvent.click(screen.getByTestId('config-difficulty-veteran'))
    fireEvent.click(screen.getByTestId('config-color-red'))

    // Click Engage
    fireEvent.click(screen.getByTestId('config-engage-button'))

    // Confirm weapon selection (default is standard which is free)
    fireEvent.click(screen.getByTestId('weapon-shop-confirm'))

    expect(screen.queryByTestId('weapon-shop')).not.toBeInTheDocument()
    expect(screen.getByTestId('turn-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('fire-button')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('renders the canvas component after completing weapon selection', async () => {
    vi.useFakeTimers()
    const { container } = renderWithProvider(<App />)

    // Go through loading screen
    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.click(screen.getByTestId('free-play-button'))

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    // Go through player name entry
    const input = screen.getByTestId('player-name-input')
    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    fireEvent.click(screen.getByTestId('player-name-submit'))
    fireEvent.transitionEnd(screen.getByTestId('player-name-entry'))

    // Make all selections
    fireEvent.click(screen.getByTestId('config-terrain-medium'))
    fireEvent.click(screen.getByTestId('config-enemy-1'))
    fireEvent.click(screen.getByTestId('config-difficulty-veteran'))
    fireEvent.click(screen.getByTestId('config-color-blue'))

    // Click Engage
    fireEvent.click(screen.getByTestId('config-engage-button'))

    // Confirm weapon selection
    fireEvent.click(screen.getByTestId('weapon-shop-confirm'))

    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
    vi.useRealTimers()
  })

})
