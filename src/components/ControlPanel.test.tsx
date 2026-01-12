import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ControlPanel } from './ControlPanel'
import * as hooks from '../hooks'

// Mock useIsMobile hook
vi.mock('../hooks', async () => {
  const actual = await vi.importActual('../hooks')
  return {
    ...actual,
    useIsMobile: vi.fn(() => false),
  }
})

describe('ControlPanel', () => {
  const defaultProps = {
    angle: 45,
    power: 50,
    onAngleChange: vi.fn(),
    onPowerChange: vi.fn(),
    onFire: vi.fn(),
  }

  it('renders the control panel', () => {
    render(<ControlPanel {...defaultProps} />)
    expect(screen.getByTestId('control-panel')).toBeInTheDocument()
  })

  it('displays the current angle value', () => {
    render(<ControlPanel {...defaultProps} />)
    expect(screen.getByTestId('angle-value')).toHaveTextContent('45°')
  })

  it('displays the current power value', () => {
    render(<ControlPanel {...defaultProps} />)
    expect(screen.getByTestId('power-value')).toHaveTextContent('50%')
  })

  it('displays both labels', () => {
    render(<ControlPanel {...defaultProps} />)
    expect(screen.getByText('Angle')).toBeInTheDocument()
    expect(screen.getByText('Power')).toBeInTheDocument()
  })

  it('calls onAngleChange when ArrowLeft is pressed', () => {
    const onAngleChange = vi.fn()
    render(<ControlPanel {...defaultProps} onAngleChange={onAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))

    expect(onAngleChange).toHaveBeenCalledWith(46)
  })

  it('calls onAngleChange when ArrowRight is pressed', () => {
    const onAngleChange = vi.fn()
    render(<ControlPanel {...defaultProps} onAngleChange={onAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))

    expect(onAngleChange).toHaveBeenCalledWith(44)
  })

  it('calls onPowerChange when ArrowUp is pressed', () => {
    const onPowerChange = vi.fn()
    render(<ControlPanel {...defaultProps} onPowerChange={onPowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))

    expect(onPowerChange).toHaveBeenCalledWith(51)
  })

  it('calls onPowerChange when ArrowDown is pressed', () => {
    const onPowerChange = vi.fn()
    render(<ControlPanel {...defaultProps} onPowerChange={onPowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))

    expect(onPowerChange).toHaveBeenCalledWith(49)
  })

  it('uses fast step for angle when Shift is held', () => {
    const onAngleChange = vi.fn()
    render(<ControlPanel {...defaultProps} onAngleChange={onAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }))

    expect(onAngleChange).toHaveBeenCalledWith(50)
  })

  it('uses fast step for power when Shift is held', () => {
    const onPowerChange = vi.fn()
    render(<ControlPanel {...defaultProps} onPowerChange={onPowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true }))

    expect(onPowerChange).toHaveBeenCalledWith(60)
  })

  it('clamps angle to max value', () => {
    const onAngleChange = vi.fn()
    render(<ControlPanel {...defaultProps} angle={118} onAngleChange={onAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }))

    expect(onAngleChange).toHaveBeenCalledWith(120)
  })

  it('clamps angle to min value', () => {
    const onAngleChange = vi.fn()
    render(<ControlPanel {...defaultProps} angle={-118} onAngleChange={onAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }))

    expect(onAngleChange).toHaveBeenCalledWith(-120)
  })

  it('clamps power to max value', () => {
    const onPowerChange = vi.fn()
    render(<ControlPanel {...defaultProps} power={95} onPowerChange={onPowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true }))

    expect(onPowerChange).toHaveBeenCalledWith(100)
  })

  it('clamps power to min value', () => {
    const onPowerChange = vi.fn()
    render(<ControlPanel {...defaultProps} power={5} onPowerChange={onPowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true }))

    expect(onPowerChange).toHaveBeenCalledWith(0)
  })

  it('responds to AD keys for angle', () => {
    const onAngleChange = vi.fn()
    render(<ControlPanel {...defaultProps} onAngleChange={onAngleChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(onAngleChange).toHaveBeenCalledWith(46)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }))
    expect(onAngleChange).toHaveBeenCalledWith(44)
  })

  it('responds to WS keys for power', () => {
    const onPowerChange = vi.fn()
    render(<ControlPanel {...defaultProps} onPowerChange={onPowerChange} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }))
    expect(onPowerChange).toHaveBeenCalledWith(51)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))
    expect(onPowerChange).toHaveBeenCalledWith(49)
  })

  it('does not respond to keyboard when disabled', () => {
    const onAngleChange = vi.fn()
    const onPowerChange = vi.fn()
    const onFire = vi.fn()
    render(
      <ControlPanel
        {...defaultProps}
        onAngleChange={onAngleChange}
        onPowerChange={onPowerChange}
        onFire={onFire}
        enabled={false}
      />
    )

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))

    expect(onAngleChange).not.toHaveBeenCalled()
    expect(onPowerChange).not.toHaveBeenCalled()
    expect(onFire).not.toHaveBeenCalled()
  })

  it('renders the fire button', () => {
    render(<ControlPanel {...defaultProps} />)
    expect(screen.getByTestId('fire-button')).toBeInTheDocument()
  })

  it('calls onFire when Space is pressed', () => {
    const onFire = vi.fn()
    render(<ControlPanel {...defaultProps} onFire={onFire} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))

    expect(onFire).toHaveBeenCalledTimes(1)
  })

  it('calls onFire when Enter is pressed', () => {
    const onFire = vi.fn()
    render(<ControlPanel {...defaultProps} onFire={onFire} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(onFire).toHaveBeenCalledTimes(1)
  })

  it('calls onFire when fire button is clicked', () => {
    const onFire = vi.fn()
    render(<ControlPanel {...defaultProps} onFire={onFire} />)

    screen.getByTestId('fire-button').click()

    expect(onFire).toHaveBeenCalledTimes(1)
  })

  describe('fit screen button', () => {
    beforeEach(() => {
      vi.mocked(hooks.useIsMobile).mockReturnValue(false)
    })

    it('does not render fit button on desktop', () => {
      vi.mocked(hooks.useIsMobile).mockReturnValue(false)

      const onFitScreen = vi.fn()
      render(<ControlPanel {...defaultProps} onFitScreen={onFitScreen} />)

      expect(screen.queryByTestId('fit-screen-btn')).not.toBeInTheDocument()
    })

    it('renders fit button on mobile when onFitScreen is provided', () => {
      vi.mocked(hooks.useIsMobile).mockReturnValue(true)

      const onFitScreen = vi.fn()
      render(<ControlPanel {...defaultProps} onFitScreen={onFitScreen} />)

      expect(screen.getByTestId('fit-screen-btn')).toBeInTheDocument()
    })

    it('does not render fit button on mobile when onFitScreen is not provided', () => {
      vi.mocked(hooks.useIsMobile).mockReturnValue(true)

      render(<ControlPanel {...defaultProps} />)

      expect(screen.queryByTestId('fit-screen-btn')).not.toBeInTheDocument()
    })

    it('calls onFitScreen when fit button is clicked', () => {
      vi.mocked(hooks.useIsMobile).mockReturnValue(true)

      const onFitScreen = vi.fn()
      render(<ControlPanel {...defaultProps} onFitScreen={onFitScreen} />)

      screen.getByTestId('fit-screen-btn').click()

      expect(onFitScreen).toHaveBeenCalledTimes(1)
    })

    it('shows zoom out icon when not fitted', () => {
      vi.mocked(hooks.useIsMobile).mockReturnValue(true)

      render(<ControlPanel {...defaultProps} onFitScreen={vi.fn()} isFittedToScreen={false} />)

      const btn = screen.getByTestId('fit-screen-btn')
      expect(btn).toHaveTextContent('⊖')
      expect(btn).not.toHaveClass('control-panel__fit-btn--active')
    })

    it('shows zoom in icon and active style when fitted', () => {
      vi.mocked(hooks.useIsMobile).mockReturnValue(true)

      render(<ControlPanel {...defaultProps} onFitScreen={vi.fn()} isFittedToScreen={true} />)

      const btn = screen.getByTestId('fit-screen-btn')
      expect(btn).toHaveTextContent('⊕')
      expect(btn).toHaveClass('control-panel__fit-btn--active')
    })
  })
})
