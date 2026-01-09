import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      writable: true,
      value: vi.fn(() => ({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        canvas: { width: 800, height: 600 },
      })),
    })

    globalThis.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 0)
      return 0
    })
  })

  it('renders the title', () => {
    render(<App />)
    expect(screen.getByText('Scorched Earth Tanks')).toBeInTheDocument()
  })

  it('renders the canvas component', () => {
    const { container } = render(<App />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas?.width).toBe(800)
    expect(canvas?.height).toBe(600)
  })
})
