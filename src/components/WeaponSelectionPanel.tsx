import { useCallback, useMemo } from 'react'
import { useKeyboard } from '../hooks'
import { WEAPONS, WEAPON_TYPES, type WeaponType } from '../engine/weapons'

interface WeaponSelectionPanelProps {
  selectedWeapon: WeaponType
  weaponAmmo: Partial<Record<WeaponType, number>>
  onWeaponSelect: (weapon: WeaponType) => void
  enabled?: boolean
}

/** Short abbreviations for weapon names */
const WEAPON_ABBREVS: Record<WeaponType, string> = {
  standard: 'STD',
  heavy_artillery: 'HVY',
  precision: 'PRC',
  cluster_bomb: 'CLU',
  napalm: 'NAP',
}

export function WeaponSelectionPanel({
  selectedWeapon,
  weaponAmmo,
  onWeaponSelect,
  enabled = true,
}: WeaponSelectionPanelProps) {
  // Build slots array: slot 1 is always standard, slots 2-9 are other weapons with ammo
  const slots = useMemo(() => {
    const result: { weapon: WeaponType; ammo: number; slotNumber: number }[] = []

    // Slot 1: Standard (always available, infinite ammo)
    result.push({
      weapon: 'standard',
      ammo: Infinity,
      slotNumber: 1,
    })

    // Slots 2-9: Other weapons in WEAPON_TYPES order, only if player has ammo
    let slotNumber = 2
    for (const weaponType of WEAPON_TYPES) {
      if (weaponType === 'standard') continue
      const ammo = weaponAmmo[weaponType]
      if (ammo !== undefined && ammo > 0) {
        result.push({
          weapon: weaponType,
          ammo,
          slotNumber,
        })
        slotNumber++
        if (slotNumber > 9) break
      }
    }

    return result
  }, [weaponAmmo])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Number keys 1-9
      const key = event.key
      if (key >= '1' && key <= '9') {
        event.preventDefault()
        const slotIndex = parseInt(key, 10)
        const slot = slots.find((s) => s.slotNumber === slotIndex)
        if (slot && slot.ammo > 0) {
          onWeaponSelect(slot.weapon)
        }
      }
    },
    [slots, onWeaponSelect]
  )

  useKeyboard({
    onKeyDown: handleKeyDown,
    enabled,
  })

  const handleSlotClick = (slot: { weapon: WeaponType; ammo: number }) => {
    if (slot.ammo > 0 && enabled) {
      onWeaponSelect(slot.weapon)
    }
  }

  return (
    <div className="weapon-selection-panel" data-testid="weapon-selection-panel">
      <div className="weapon-selection-panel__slots">
        {slots.map((slot) => {
          const weapon = WEAPONS[slot.weapon]
          const isSelected = selectedWeapon === slot.weapon
          const isEmpty = slot.ammo <= 0
          const ammoDisplay = slot.ammo === Infinity ? '∞' : slot.ammo

          return (
            <button
              key={slot.weapon}
              className={`weapon-selection-panel__slot${isSelected ? ' weapon-selection-panel__slot--selected' : ''}${isEmpty ? ' weapon-selection-panel__slot--empty' : ''}`}
              data-testid={`weapon-slot-${slot.weapon}`}
              onClick={() => handleSlotClick(slot)}
              disabled={isEmpty || !enabled}
            >
              <span className="weapon-selection-panel__slot-number">
                {slot.slotNumber}
              </span>
              <span className="weapon-selection-panel__slot-abbrev">
                {WEAPON_ABBREVS[slot.weapon]}
              </span>
              <span className="weapon-selection-panel__slot-ammo">
                {ammoDisplay}
              </span>
              <span className="weapon-selection-panel__slot-name">
                {weapon.name}
              </span>
            </button>
          )
        })}
      </div>
      <div className="weapon-selection-panel__hint">
        <kbd>1</kbd>-<kbd>{Math.min(slots.length, 9)}</kbd>
        <span>select weapon</span>
      </div>
    </div>
  )
}
