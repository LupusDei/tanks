import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { Canvas } from './Canvas'

describe('Canvas', () => {
  let mockRequestAnimationFrame: ReturnType<typeof vi.fn>
  let mockCancelAnimationFrame: ReturnType<typeof vi.fn>
  let rafCallbacks: FrameRequestCallback[] = []
  let rafId = 0

  beforeEach(() => {
    rafCallbacks = []
    rafId = 0

    mockRequestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback)
      return ++rafId
    })

    mockCancelAnimationFrame = vi.fn((id: number) => {
      const index = rafCallbacks.findIndex((_, i) => i + 1 === id)
      if (index !== -1) {
        rafCallbacks.splice(index, 1)
      }
    })

    globalThis.requestAnimationFrame = mockRequestAnimationFrame
    globalThis.cancelAnimationFrame = mockCancelAnimationFrame

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      writable: true,
      value: vi.fn(() => ({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a canvas element', () => {
    const { container } = render(<Canvas />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
    expect(canvas?.tagName).toBe('CANVAS')
  })

  it('sets canvas dimensions correctly', () => {
    const { container } = render(<Canvas width={800} height={600} />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
    expect(canvas?.width).toBe(800)
    expect(canvas?.height).toBe(600)
  })

  it('uses default dimensions when not provided', () => {
    const { container } = render(<Canvas />)
    const canvas = container.querySelector('canvas')
    expect(canvas?.width).toBe(800)
    expect(canvas?.height).toBe(600)
  })

  it('calls onRender callback in animation frame', () => {
    const mockOnRender = vi.fn()
    render(<Canvas onRender={mockOnRender} />)

    expect(mockRequestAnimationFrame).toHaveBeenCalled()

    if (rafCallbacks.length > 0 && rafCallbacks[0]) {
      rafCallbacks[0](performance.now())
    }

    expect(mockOnRender).toHaveBeenCalled()
  })

  it('provides context and deltaTime to onRender', () => {
    const mockOnRender = vi.fn()
    render(<Canvas onRender={mockOnRender} />)

    if (rafCallbacks.length > 0 && rafCallbacks[0]) {
      const timestamp = performance.now()
      rafCallbacks[0](timestamp)
    }

    expect(mockOnRender).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Number)
    )
  })

  it('cancels animation frame on unmount', () => {
    const { unmount } = render(<Canvas />)
    unmount()

    expect(mockCancelAnimationFrame).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const { container } = render(<Canvas className="custom-canvas" />)
    const canvas = container.querySelector('canvas')
    expect(canvas?.className).toBe('custom-canvas')
  })

  it('handles window resize', () => {
    const { container } = render(<Canvas width={800} height={600} />)
    const canvas = container.querySelector('canvas')

    expect(canvas).toBeTruthy()

    window.dispatchEvent(new Event('resize'))

    expect(canvas?.width).toBe(800)
    expect(canvas?.height).toBe(600)
  })
})
