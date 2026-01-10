import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from './useIsMobile'

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1024)
  })

  afterEach(() => {
    vi.stubGlobal('innerWidth', originalInnerWidth)
  })

  it('returns false for desktop width (>= 768px)', () => {
    vi.stubGlobal('innerWidth', 1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true for mobile width (< 768px)', () => {
    vi.stubGlobal('innerWidth', 500)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('updates when window is resized', () => {
    vi.stubGlobal('innerWidth', 1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      vi.stubGlobal('innerWidth', 500)
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current).toBe(true)
  })

  it('returns false at exactly 768px (boundary)', () => {
    vi.stubGlobal('innerWidth', 768)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true at 767px (just below boundary)', () => {
    vi.stubGlobal('innerWidth', 767)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })
})
