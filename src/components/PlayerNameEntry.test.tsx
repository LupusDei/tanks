import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlayerNameEntry } from './PlayerNameEntry'

describe('PlayerNameEntry', () => {
  const mockLocalStorage: Record<string, string> = {}

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key]
        }),
        clear: vi.fn(() => {
          Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key])
        }),
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key])
  })

  it('renders the player name entry screen', () => {
    render(<PlayerNameEntry onSubmit={vi.fn()} />)
    expect(screen.getByTestId('player-name-entry')).toBeInTheDocument()
  })

  it('renders the title and subtitle', () => {
    render(<PlayerNameEntry onSubmit={vi.fn()} />)
    expect(screen.getByText('Enter Your Name')).toBeInTheDocument()
    expect(screen.getByText('Your stats will be saved under this name')).toBeInTheDocument()
  })

  it('renders the input field', () => {
    render(<PlayerNameEntry onSubmit={vi.fn()} />)
    expect(screen.getByTestId('player-name-input')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    render(<PlayerNameEntry onSubmit={vi.fn()} />)
    expect(screen.getByTestId('player-name-submit')).toBeInTheDocument()
  })

  it('submit button is disabled when input is empty', () => {
    render(<PlayerNameEntry onSubmit={vi.fn()} />)
    const button = screen.getByTestId('player-name-submit')
    expect(button).toBeDisabled()
  })

  it('submit button is enabled when input has text', () => {
    render(<PlayerNameEntry onSubmit={vi.fn()} />)
    const input = screen.getByTestId('player-name-input')
    const button = screen.getByTestId('player-name-submit')

    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    expect(button).not.toBeDisabled()
  })

  it('submit button is disabled when input has only whitespace', () => {
    render(<PlayerNameEntry onSubmit={vi.fn()} />)
    const input = screen.getByTestId('player-name-input')
    const button = screen.getByTestId('player-name-submit')

    fireEvent.change(input, { target: { value: '   ' } })
    expect(button).toBeDisabled()
  })

  it('starts fade out when submit button is clicked', () => {
    render(<PlayerNameEntry onSubmit={vi.fn()} />)
    const input = screen.getByTestId('player-name-input')
    const button = screen.getByTestId('player-name-submit')

    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    fireEvent.click(button)

    expect(screen.getByTestId('player-name-entry')).toHaveClass('player-name-entry--fade-out')
  })

  it('calls onSubmit with trimmed name after transition', () => {
    const handleSubmit = vi.fn()
    render(<PlayerNameEntry onSubmit={handleSubmit} />)
    const input = screen.getByTestId('player-name-input')
    const button = screen.getByTestId('player-name-submit')

    fireEvent.change(input, { target: { value: '  TestPlayer  ' } })
    fireEvent.click(button)

    const container = screen.getByTestId('player-name-entry')
    fireEvent.transitionEnd(container)

    expect(handleSubmit).toHaveBeenCalledTimes(1)
    expect(handleSubmit).toHaveBeenCalledWith('TestPlayer')
  })

  it('saves name to localStorage when submitted', () => {
    const handleSubmit = vi.fn()
    render(<PlayerNameEntry onSubmit={handleSubmit} />)
    const input = screen.getByTestId('player-name-input')
    const button = screen.getByTestId('player-name-submit')

    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    fireEvent.click(button)

    expect(localStorage.setItem).toHaveBeenCalledWith('tanks_last_player_name', 'TestPlayer')
  })

  it('loads last used name from localStorage on mount', () => {
    mockLocalStorage['tanks_last_player_name'] = 'LastPlayer'
    render(<PlayerNameEntry onSubmit={vi.fn()} />)

    const input = screen.getByTestId('player-name-input') as HTMLInputElement
    expect(input.value).toBe('LastPlayer')
  })

  it('submits on Enter key press', () => {
    const handleSubmit = vi.fn()
    render(<PlayerNameEntry onSubmit={handleSubmit} />)
    const input = screen.getByTestId('player-name-input')

    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByTestId('player-name-entry')).toHaveClass('player-name-entry--fade-out')
  })

  it('does not submit on other key presses', () => {
    render(<PlayerNameEntry onSubmit={vi.fn()} />)
    const input = screen.getByTestId('player-name-input')

    fireEvent.change(input, { target: { value: 'TestPlayer' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.getByTestId('player-name-entry')).not.toHaveClass('player-name-entry--fade-out')
  })

  it('does not call onSubmit if not transitioning', () => {
    const handleSubmit = vi.fn()
    render(<PlayerNameEntry onSubmit={handleSubmit} />)

    const container = screen.getByTestId('player-name-entry')
    fireEvent.transitionEnd(container)

    expect(handleSubmit).not.toHaveBeenCalled()
  })
})
