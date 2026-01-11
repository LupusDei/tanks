import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoadingScreen } from './LoadingScreen'

// Mock userDatabase module
vi.mock('../services/userDatabase', () => ({
  hasActiveCampaign: vi.fn(() => false),
}))

import { hasActiveCampaign } from '../services/userDatabase'

describe('LoadingScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    vi.mocked(hasActiveCampaign).mockReturnValue(false)

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

  it('renders the start button initially', () => {
    render(<LoadingScreen />)
    expect(screen.getByTestId('start-button')).toBeInTheDocument()
    expect(screen.getByText('Start Game')).toBeInTheDocument()
  })

  it('renders particle canvas', () => {
    const { container } = render(<LoadingScreen />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('shows mode selection when start button is clicked', () => {
    render(<LoadingScreen />)

    fireEvent.click(screen.getByTestId('start-button'))

    expect(screen.getByTestId('mode-select')).toBeInTheDocument()
    expect(screen.getByTestId('free-play-button')).toBeInTheDocument()
    expect(screen.getByTestId('campaign-button')).toBeInTheDocument()
  })

  it('calls onFreePlay when Free Play is clicked', async () => {
    const handleFreePlay = vi.fn()
    render(<LoadingScreen onFreePlay={handleFreePlay} />)

    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.click(screen.getByTestId('free-play-button'))

    // Wait for timeout
    vi.advanceTimersByTime(800)

    expect(handleFreePlay).toHaveBeenCalledTimes(1)
  })

  it('falls back to onStart for backward compatibility', async () => {
    const handleStart = vi.fn()
    render(<LoadingScreen onStart={handleStart} />)

    fireEvent.click(screen.getByTestId('start-button'))
    fireEvent.click(screen.getByTestId('free-play-button'))

    vi.advanceTimersByTime(800)

    expect(handleStart).toHaveBeenCalledTimes(1)
  })

  describe('Campaign flow - no existing campaign', () => {
    it('shows campaign length selection when no active campaign', () => {
      vi.mocked(hasActiveCampaign).mockReturnValue(false)
      render(<LoadingScreen />)

      fireEvent.click(screen.getByTestId('start-button'))
      fireEvent.click(screen.getByTestId('campaign-button'))

      expect(screen.getByTestId('campaign-length')).toBeInTheDocument()
      expect(screen.getByText('Select Campaign Length')).toBeInTheDocument()
      expect(screen.getByTestId('campaign-length-3')).toBeInTheDocument()
      expect(screen.getByTestId('campaign-length-5')).toBeInTheDocument()
      expect(screen.getByTestId('campaign-length-8')).toBeInTheDocument()
      expect(screen.getByTestId('campaign-length-13')).toBeInTheDocument()
    })

    it('calls onNewCampaign with selected length', async () => {
      const handleNewCampaign = vi.fn()
      render(<LoadingScreen onNewCampaign={handleNewCampaign} />)

      fireEvent.click(screen.getByTestId('start-button'))
      fireEvent.click(screen.getByTestId('campaign-button'))
      fireEvent.click(screen.getByTestId('campaign-length-5'))

      vi.advanceTimersByTime(800)

      expect(handleNewCampaign).toHaveBeenCalledWith(5)
    })
  })

  describe('Campaign flow - existing campaign', () => {
    beforeEach(() => {
      vi.mocked(hasActiveCampaign).mockReturnValue(true)
    })

    it('shows campaign options when active campaign exists', () => {
      render(<LoadingScreen />)

      fireEvent.click(screen.getByTestId('start-button'))
      fireEvent.click(screen.getByTestId('campaign-button'))

      expect(screen.getByTestId('campaign-options')).toBeInTheDocument()
      expect(screen.getByTestId('resume-campaign-button')).toBeInTheDocument()
      expect(screen.getByTestId('new-campaign-button')).toBeInTheDocument()
    })

    it('calls onResumeCampaign when Resume is clicked', async () => {
      const handleResume = vi.fn()
      render(<LoadingScreen onResumeCampaign={handleResume} />)

      fireEvent.click(screen.getByTestId('start-button'))
      fireEvent.click(screen.getByTestId('campaign-button'))
      fireEvent.click(screen.getByTestId('resume-campaign-button'))

      vi.advanceTimersByTime(800)

      expect(handleResume).toHaveBeenCalledTimes(1)
    })

    it('shows length selection when New Campaign is clicked', () => {
      render(<LoadingScreen />)

      fireEvent.click(screen.getByTestId('start-button'))
      fireEvent.click(screen.getByTestId('campaign-button'))
      fireEvent.click(screen.getByTestId('new-campaign-button'))

      expect(screen.getByTestId('campaign-length')).toBeInTheDocument()
    })
  })

  describe('Back button navigation', () => {
    it('goes back from campaign length to mode select', () => {
      render(<LoadingScreen />)

      fireEvent.click(screen.getByTestId('start-button'))
      fireEvent.click(screen.getByTestId('campaign-button'))

      expect(screen.getByTestId('campaign-length')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('back-button'))

      expect(screen.getByTestId('mode-select')).toBeInTheDocument()
    })

    it('goes back from campaign options to mode select', () => {
      vi.mocked(hasActiveCampaign).mockReturnValue(true)
      render(<LoadingScreen />)

      fireEvent.click(screen.getByTestId('start-button'))
      fireEvent.click(screen.getByTestId('campaign-button'))

      expect(screen.getByTestId('campaign-options')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('back-button'))

      expect(screen.getByTestId('mode-select')).toBeInTheDocument()
    })

    it('goes back from campaign length to campaign options when campaign exists', () => {
      vi.mocked(hasActiveCampaign).mockReturnValue(true)
      render(<LoadingScreen />)

      fireEvent.click(screen.getByTestId('start-button'))
      fireEvent.click(screen.getByTestId('campaign-button'))
      fireEvent.click(screen.getByTestId('new-campaign-button'))

      expect(screen.getByTestId('campaign-length')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('back-button'))

      expect(screen.getByTestId('campaign-options')).toBeInTheDocument()
    })
  })
})
