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
})
