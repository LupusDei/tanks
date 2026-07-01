import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from './useIsMobile'

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 768)
  })

  afterEach(() => {
    vi.stubGlobal('innerWidth', originalInnerWidth)
    vi.stubGlobal('innerHeight', originalInnerHeight)
  })

  it('returns false for desktop dimensions (>= 768px width, >= 500px height)', () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 768)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true for mobile width (< 768px)', () => {
    vi.stubGlobal('innerWidth', 500)
    vi.stubGlobal('innerHeight', 800)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('updates when window is resized', () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 768)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      vi.stubGlobal('innerWidth', 500)
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current).toBe(true)
  })

  it('returns false at exactly 768px width (boundary)', () => {
    vi.stubGlobal('innerWidth', 768)
    vi.stubGlobal('innerHeight', 600)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true at 767px width (just below boundary)', () => {
    vi.stubGlobal('innerWidth', 767)
    vi.stubGlobal('innerHeight', 600)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  describe('tablet / iPad detection (tanks-305)', () => {
    /** Simulate a coarse-pointer touch device (iPad/tablet) or a fine-pointer laptop. */
    function stubTouchDevice(coarse: boolean, touch: boolean) {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        configurable: true,
        value: touch ? 5 : 0,
      })
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: coarse && query.includes('coarse'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
        onchange: null,
      }))
    }

    afterEach(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 })
      vi.unstubAllGlobals()
    })

    it('detects an iPad in portrait (width >= 768, coarse pointer + touch) as mobile', () => {
      vi.stubGlobal('innerWidth', 834)
      vi.stubGlobal('innerHeight', 1112)
      stubTouchDevice(true, true)
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(true)
    })

    it('detects an iPad in landscape (wide + tall, coarse pointer + touch) as mobile', () => {
      vi.stubGlobal('innerWidth', 1112)
      vi.stubGlobal('innerHeight', 834)
      stubTouchDevice(true, true)
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(true)
    })

    it('does NOT treat a large touch laptop (fine primary pointer) as mobile', () => {
      vi.stubGlobal('innerWidth', 1440)
      vi.stubGlobal('innerHeight', 900)
      stubTouchDevice(false, true) // has touch, but fine primary pointer
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(false)
    })
  })
})
