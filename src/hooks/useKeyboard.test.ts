import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboard } from './useKeyboard'

describe('useKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls onKeyDown when a key is pressed', () => {
    const onKeyDown = vi.fn()
    renderHook(() => useKeyboard({ onKeyDown }))

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
    window.dispatchEvent(event)

    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'ArrowUp' }))
  })

  it('calls onKeyUp when a key is released', () => {
    const onKeyUp = vi.fn()
    renderHook(() => useKeyboard({ onKeyUp }))

    const event = new KeyboardEvent('keyup', { key: 'ArrowDown' })
    window.dispatchEvent(event)

    expect(onKeyUp).toHaveBeenCalledTimes(1)
    expect(onKeyUp).toHaveBeenCalledWith(expect.objectContaining({ key: 'ArrowDown' }))
  })

  it('does not call handlers when disabled', () => {
    const onKeyDown = vi.fn()
    const onKeyUp = vi.fn()
    renderHook(() => useKeyboard({ onKeyDown, onKeyUp, enabled: false }))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }))

    expect(onKeyDown).not.toHaveBeenCalled()
    expect(onKeyUp).not.toHaveBeenCalled()
  })

  it('removes event listeners on unmount', () => {
    const onKeyDown = vi.fn()
    const { unmount } = renderHook(() => useKeyboard({ onKeyDown }))

    unmount()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))

    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('responds to multiple key presses', () => {
    const onKeyDown = vi.fn()
    renderHook(() => useKeyboard({ onKeyDown }))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }))

    expect(onKeyDown).toHaveBeenCalledTimes(3)
  })
})
