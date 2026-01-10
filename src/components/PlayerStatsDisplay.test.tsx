import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlayerStatsDisplay } from './PlayerStatsDisplay'
import { UserProvider } from '../context/UserContext'

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

// Helper to set up user data
function setupUserData(userData: {
  username: string
  balance: number
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  totalKills: number
  winRate: number
}) {
  const fullUserData = {
    profile: { id: 'test-id', username: userData.username, createdAt: Date.now() },
    stats: {
      gamesPlayed: userData.gamesPlayed,
      gamesWon: userData.gamesWon,
      gamesLost: userData.gamesLost,
      totalKills: userData.totalKills,
      winRate: userData.winRate,
      balance: userData.balance,
    },
    recentGames: [],
    weaponInventory: { standard: null },
  }
  const playersDb = { [userData.username]: fullUserData }
  localStorageMock.setItem('tanks_players_db', JSON.stringify(playersDb))
  localStorageMock.setItem('tanks_current_player', userData.username)
}

function renderWithUser(ui: React.ReactElement) {
  return render(<UserProvider>{ui}</UserProvider>)
}

describe('PlayerStatsDisplay', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('renders nothing when no user is logged in', () => {
    const { container } = renderWithUser(<PlayerStatsDisplay />)
    expect(container.querySelector('.player-stats-display')).toBeNull()
  })

  it('renders player name', () => {
    setupUserData({
      username: 'TestPlayer',
      balance: 500,
      gamesPlayed: 10,
      gamesWon: 7,
      gamesLost: 3,
      totalKills: 25,
      winRate: 70,
    })

    renderWithUser(<PlayerStatsDisplay />)

    expect(screen.getByTestId('player-stats-display')).toBeInTheDocument()
    expect(screen.getByTestId('player-stats-name')).toHaveTextContent('TestPlayer')
  })

  it('displays balance with dollar sign', () => {
    setupUserData({
      username: 'RichPlayer',
      balance: 1500,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalKills: 0,
      winRate: 0,
    })

    renderWithUser(<PlayerStatsDisplay />)

    expect(screen.getByTestId('player-stats-balance')).toHaveTextContent('$1500')
  })

  it('displays games played count', () => {
    setupUserData({
      username: 'VeteranPlayer',
      balance: 500,
      gamesPlayed: 42,
      gamesWon: 30,
      gamesLost: 12,
      totalKills: 100,
      winRate: 71,
    })

    renderWithUser(<PlayerStatsDisplay />)

    expect(screen.getByTestId('player-stats-games')).toHaveTextContent('42')
  })

  it('displays wins count', () => {
    setupUserData({
      username: 'WinnerPlayer',
      balance: 500,
      gamesPlayed: 20,
      gamesWon: 15,
      gamesLost: 5,
      totalKills: 50,
      winRate: 75,
    })

    renderWithUser(<PlayerStatsDisplay />)

    expect(screen.getByTestId('player-stats-wins')).toHaveTextContent('15')
  })

  it('displays win rate with percentage', () => {
    setupUserData({
      username: 'ConsistentPlayer',
      balance: 500,
      gamesPlayed: 100,
      gamesWon: 65,
      gamesLost: 35,
      totalKills: 200,
      winRate: 65,
    })

    renderWithUser(<PlayerStatsDisplay />)

    expect(screen.getByTestId('player-stats-winrate')).toHaveTextContent('65%')
  })

  it('displays total kills', () => {
    setupUserData({
      username: 'KillerPlayer',
      balance: 500,
      gamesPlayed: 50,
      gamesWon: 40,
      gamesLost: 10,
      totalKills: 150,
      winRate: 80,
    })

    renderWithUser(<PlayerStatsDisplay />)

    expect(screen.getByTestId('player-stats-kills')).toHaveTextContent('150')
  })

  it('displays all stats for a new player', () => {
    setupUserData({
      username: 'NewPlayer',
      balance: 500,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalKills: 0,
      winRate: 0,
    })

    renderWithUser(<PlayerStatsDisplay />)

    expect(screen.getByTestId('player-stats-name')).toHaveTextContent('NewPlayer')
    expect(screen.getByTestId('player-stats-balance')).toHaveTextContent('$500')
    expect(screen.getByTestId('player-stats-games')).toHaveTextContent('0')
    expect(screen.getByTestId('player-stats-wins')).toHaveTextContent('0')
    expect(screen.getByTestId('player-stats-winrate')).toHaveTextContent('0%')
    expect(screen.getByTestId('player-stats-kills')).toHaveTextContent('0')
  })

  it('has stat labels', () => {
    setupUserData({
      username: 'LabelTestPlayer',
      balance: 500,
      gamesPlayed: 1,
      gamesWon: 1,
      gamesLost: 0,
      totalKills: 1,
      winRate: 100,
    })

    renderWithUser(<PlayerStatsDisplay />)

    expect(screen.getByText('Balance')).toBeInTheDocument()
    expect(screen.getByText('Games')).toBeInTheDocument()
    expect(screen.getByText('Wins')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
    expect(screen.getByText('Kills')).toBeInTheDocument()
  })
})
