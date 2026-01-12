import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePressAndHold } from './usePressAndHold'

describe('usePressAndHold', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls onPress immediately on mouse down', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onPress }))

    act(() => {
      result.current.onMouseDown()
    })

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('starts rapid fire after initial delay', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() =>
      usePressAndHold({
        onPress,
        initialDelay: 400,
        repeatInterval: 50,
      })
    )

    act(() => {
      result.current.onMouseDown()
    })

    expect(onPress).toHaveBeenCalledTimes(1)

    // Advance past initial delay
    act(() => {
      vi.advanceTimersByTime(400)
    })

    // Advance a few repeat intervals
    act(() => {
      vi.advanceTimersByTime(150)
    })

    // Should have fired: 1 initial + 3 repeats (at 0, 50, 100 ms after delay)
    expect(onPress).toHaveBeenCalledTimes(4)
  })

  it('stops rapid fire on mouse up', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() =>
      usePressAndHold({
        onPress,
        initialDelay: 400,
        repeatInterval: 50,
      })
    )

    act(() => {
      result.current.onMouseDown()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    const callCountBeforeRelease = onPress.mock.calls.length

    act(() => {
      result.current.onMouseUp()
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // No more calls after release
    expect(onPress).toHaveBeenCalledTimes(callCountBeforeRelease)
  })

  it('stops rapid fire on mouse leave', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() =>
      usePressAndHold({
        onPress,
        initialDelay: 400,
        repeatInterval: 50,
      })
    )

    act(() => {
      result.current.onMouseDown()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    const callCountBeforeLeave = onPress.mock.calls.length

    act(() => {
      result.current.onMouseLeave()
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // No more calls after leave
    expect(onPress).toHaveBeenCalledTimes(callCountBeforeLeave)
  })

  it('handles touch events', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onPress }))

    const mockTouchEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.TouchEvent

    act(() => {
      result.current.onTouchStart(mockTouchEvent)
    })

    expect(onPress).toHaveBeenCalledTimes(1)
    expect(mockTouchEvent.preventDefault).toHaveBeenCalled()

    act(() => {
      result.current.onTouchEnd()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // No more calls after touch end
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not fire when disabled', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() =>
      usePressAndHold({ onPress, enabled: false })
    )

    act(() => {
      result.current.onMouseDown()
    })

    expect(onPress).not.toHaveBeenCalled()
  })

  it('stops when disabled changes to false', () => {
    const onPress = vi.fn()
    const { result, rerender } = renderHook(
      ({ enabled }) => usePressAndHold({ onPress, enabled }),
      { initialProps: { enabled: true } }
    )

    act(() => {
      result.current.onMouseDown()
    })

    expect(onPress).toHaveBeenCalledTimes(1)

    // Disable while pressing
    rerender({ enabled: false })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should only have the initial call, not rapid fire
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('cleans up timers on unmount', () => {
    const onPress = vi.fn()
    const { result, unmount } = renderHook(() =>
      usePressAndHold({
        onPress,
        initialDelay: 400,
        repeatInterval: 50,
      })
    )

    act(() => {
      result.current.onMouseDown()
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Only the initial press should have been called
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not double-fire if already pressing', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onPress }))

    act(() => {
      result.current.onMouseDown()
      result.current.onMouseDown()
      result.current.onMouseDown()
    })

    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
