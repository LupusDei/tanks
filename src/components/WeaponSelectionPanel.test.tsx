import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeaponSelectionPanel } from './WeaponSelectionPanel'

describe('WeaponSelectionPanel', () => {
  const defaultProps = {
    selectedWeapon: 'standard' as const,
    weaponAmmo: { standard: Infinity },
    onWeaponSelect: vi.fn(),
  }

  it('renders the weapon selection panel', () => {
    render(<WeaponSelectionPanel {...defaultProps} />)
    expect(screen.getByTestId('weapon-selection-panel')).toBeInTheDocument()
  })

  it('always shows standard weapon slot', () => {
    render(<WeaponSelectionPanel {...defaultProps} />)
    expect(screen.getByTestId('weapon-slot-standard')).toBeInTheDocument()
  })

  it('displays infinity symbol for standard ammo', () => {
    render(<WeaponSelectionPanel {...defaultProps} />)
    const standardSlot = screen.getByTestId('weapon-slot-standard')
    expect(standardSlot).toHaveTextContent('∞')
  })

  it('highlights the selected weapon', () => {
    render(<WeaponSelectionPanel {...defaultProps} selectedWeapon="standard" />)
    const standardSlot = screen.getByTestId('weapon-slot-standard')
    expect(standardSlot).toHaveClass('weapon-selection-panel__slot--selected')
  })

  it('shows additional weapons when they have ammo', () => {
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        weaponAmmo={{ standard: Infinity, heavy_artillery: 3, precision: 2 }}
      />
    )
    expect(screen.getByTestId('weapon-slot-standard')).toBeInTheDocument()
    expect(screen.getByTestId('weapon-slot-heavy_artillery')).toBeInTheDocument()
    expect(screen.getByTestId('weapon-slot-precision')).toBeInTheDocument()
  })

  it('displays correct ammo count for non-standard weapons', () => {
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        weaponAmmo={{ standard: Infinity, heavy_artillery: 5 }}
      />
    )
    const heavySlot = screen.getByTestId('weapon-slot-heavy_artillery')
    expect(heavySlot).toHaveTextContent('5')
  })

  it('does not show weapons with zero ammo', () => {
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        weaponAmmo={{ standard: Infinity, heavy_artillery: 0 }}
      />
    )
    expect(screen.queryByTestId('weapon-slot-heavy_artillery')).not.toBeInTheDocument()
  })

  it('does not show weapons without ammo entry', () => {
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        weaponAmmo={{ standard: Infinity }}
      />
    )
    expect(screen.queryByTestId('weapon-slot-heavy_artillery')).not.toBeInTheDocument()
  })

  it('calls onWeaponSelect when clicking a weapon slot', () => {
    const onWeaponSelect = vi.fn()
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        onWeaponSelect={onWeaponSelect}
        weaponAmmo={{ standard: Infinity, heavy_artillery: 3 }}
      />
    )

    screen.getByTestId('weapon-slot-heavy_artillery').click()
    expect(onWeaponSelect).toHaveBeenCalledWith('heavy_artillery')
  })

  it('calls onWeaponSelect when pressing number key 1', () => {
    const onWeaponSelect = vi.fn()
    render(<WeaponSelectionPanel {...defaultProps} onWeaponSelect={onWeaponSelect} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    expect(onWeaponSelect).toHaveBeenCalledWith('standard')
  })

  it('calls onWeaponSelect when pressing number key for additional weapon', () => {
    const onWeaponSelect = vi.fn()
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        onWeaponSelect={onWeaponSelect}
        weaponAmmo={{ standard: Infinity, heavy_artillery: 3 }}
      />
    )

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
    expect(onWeaponSelect).toHaveBeenCalledWith('heavy_artillery')
  })

  it('does not respond to keyboard when disabled', () => {
    const onWeaponSelect = vi.fn()
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        onWeaponSelect={onWeaponSelect}
        enabled={false}
      />
    )

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    expect(onWeaponSelect).not.toHaveBeenCalled()
  })

  it('disables click on slots when panel is disabled', () => {
    const onWeaponSelect = vi.fn()
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        onWeaponSelect={onWeaponSelect}
        enabled={false}
      />
    )

    const standardSlot = screen.getByTestId('weapon-slot-standard')
    expect(standardSlot).toBeDisabled()
  })

  it('assigns correct slot numbers to weapons', () => {
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        weaponAmmo={{
          standard: Infinity,
          heavy_artillery: 2,
          precision: 1,
          cluster_bomb: 3,
        }}
      />
    )

    // Standard is always slot 1
    expect(screen.getByTestId('weapon-slot-standard')).toHaveTextContent('1')
    // Other weapons get slots 2, 3, 4 in order
    expect(screen.getByTestId('weapon-slot-heavy_artillery')).toHaveTextContent('2')
    expect(screen.getByTestId('weapon-slot-precision')).toHaveTextContent('3')
    expect(screen.getByTestId('weapon-slot-cluster_bomb')).toHaveTextContent('4')
  })

  it('displays weapon abbreviations', () => {
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        weaponAmmo={{ standard: Infinity, napalm: 2 }}
      />
    )

    expect(screen.getByTestId('weapon-slot-standard')).toHaveTextContent('STD')
    expect(screen.getByTestId('weapon-slot-napalm')).toHaveTextContent('NAP')
  })

  it('ignores number keys for non-existent slots', () => {
    const onWeaponSelect = vi.fn()
    render(
      <WeaponSelectionPanel
        {...defaultProps}
        onWeaponSelect={onWeaponSelect}
        weaponAmmo={{ standard: Infinity }}
      />
    )

    // Press 5 when only slot 1 exists
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }))
    expect(onWeaponSelect).not.toHaveBeenCalled()
  })
})
