import { useCallback, useMemo } from 'react'
import { useKeyboard } from '../hooks'
import { WEAPONS, WEAPON_TYPES, type WeaponType } from '../engine/weapons'

interface WeaponSelectionPanelProps {
  selectedWeapon: WeaponType
  weaponAmmo: Partial<Record<WeaponType, number>>
  onWeaponSelect: (weapon: WeaponType) => void
  enabled?: boolean
}

/** Projectile icon component - renders SVG representation of each weapon's projectile */
function ProjectileIcon({ weaponType }: { weaponType: WeaponType }) {
  const size = 24
  const cx = size / 2
  const cy = size / 2

  switch (weaponType) {
    case 'standard':
      // Yellow circle with white glow
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="glow-std" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={6} fill="#ffff00" filter="url(#glow-std)" />
          <circle cx={cx} cy={cy} r={3} fill="#ffffff" />
        </svg>
      )

    case 'heavy_artillery':
      // Large dark oval with red glow
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="glow-hvy" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#ff3300" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <ellipse cx={cx} cy={cy} rx={5} ry={8} fill="#2a2a2a" filter="url(#glow-hvy)" />
          <ellipse cx={cx - 1} cy={cy - 2} rx={2} ry={3} fill="#444444" />
        </svg>
      )

    case 'precision':
      // Cyan pointed projectile
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="glow-prc" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#66ffff" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <polygon points={`${cx},${cy - 8} ${cx + 4},${cy + 5} ${cx - 4},${cy + 5}`} fill="#00ddff" filter="url(#glow-prc)" />
          <circle cx={cx} cy={cy} r={2} fill="#ffffff" />
        </svg>
      )

    case 'cluster_bomb':
      // Orange sphere with smaller spheres
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="glow-clu" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feFlood floodColor="#ff9933" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={5} fill="#cc6600" filter="url(#glow-clu)" />
          <circle cx={cx - 3} cy={cy - 3} r={2} fill="#553300" />
          <circle cx={cx + 3} cy={cy - 2} r={2} fill="#553300" />
          <circle cx={cx} cy={cy + 3} r={2} fill="#553300" />
        </svg>
      )

    case 'napalm':
      // Orange/red flame-like
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="glow-nap" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#ffaa00" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <ellipse cx={cx} cy={cy} rx={5} ry={6} fill="#ff4400" filter="url(#glow-nap)" />
          <ellipse cx={cx - 2} cy={cy - 4} rx={2} ry={3} fill="#ffcc00" />
          <ellipse cx={cx + 2} cy={cy - 3} rx={2} ry={3} fill="#ff8800" />
          <ellipse cx={cx} cy={cy + 2} rx={2} ry={2} fill="#ff6600" />
        </svg>
      )

    default:
      return null
  }
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
              <span className="weapon-selection-panel__slot-ammo-badge">
                {ammoDisplay}
              </span>
              <span className="weapon-selection-panel__slot-icon">
                <ProjectileIcon weaponType={slot.weapon} />
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
