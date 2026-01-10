import { useState } from 'react';
import { useUser } from '../context/UserContext';
import {
  type WeaponType,
  WEAPON_TYPES,
  WEAPONS,
  canAffordWeapon,
} from '../engine/weapons';

interface WeaponShopProps {
  onConfirm: (weapon: WeaponType) => void;
  onCancel?: () => void;
}

export function WeaponShop({ onConfirm, onCancel }: WeaponShopProps) {
  const { balance, spend } = useUser();
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('standard');

  const handleSelectWeapon = (weaponType: WeaponType) => {
    setSelectedWeapon(weaponType);
  };

  const handleConfirm = () => {
    const weapon = WEAPONS[selectedWeapon];
    if (weapon.cost > 0) {
      const success = spend(weapon.cost);
      if (!success) {
        return; // Couldn't afford it
      }
    }
    onConfirm(selectedWeapon);
  };

  const canAfford = (weaponType: WeaponType) => canAffordWeapon(balance, weaponType);

  return (
    <div className="weapon-shop" data-testid="weapon-shop">
      <h2 className="weapon-shop__title">Weapon Shop</h2>

      <div className="weapon-shop__balance" data-testid="weapon-shop-balance">
        <span className="weapon-shop__balance-label">Balance:</span>
        <span className="weapon-shop__balance-amount">${balance}</span>
      </div>

      <div className="weapon-shop__weapons">
        {WEAPON_TYPES.map((weaponType) => {
          const weapon = WEAPONS[weaponType];
          const isSelected = selectedWeapon === weaponType;
          const affordable = canAfford(weaponType);
          const isFree = weapon.cost === 0;

          return (
            <button
              key={weaponType}
              className={`weapon-shop__weapon ${isSelected ? 'weapon-shop__weapon--selected' : ''} ${!affordable && !isFree ? 'weapon-shop__weapon--disabled' : ''}`}
              onClick={() => handleSelectWeapon(weaponType)}
              disabled={!affordable && !isFree}
              data-testid={`weapon-${weaponType}`}
              aria-pressed={isSelected}
              aria-label={`Select ${weapon.name}`}
            >
              <div className="weapon-shop__weapon-header">
                <span className="weapon-shop__weapon-name">{weapon.name}</span>
                <span className={`weapon-shop__weapon-cost ${isFree ? 'weapon-shop__weapon-cost--free' : ''}`}>
                  {isFree ? 'FREE' : `$${weapon.cost}`}
                </span>
              </div>
              <p className="weapon-shop__weapon-description">{weapon.description}</p>
              <div className="weapon-shop__weapon-stats">
                <WeaponStat label="Damage" value={weapon.damage} unit="%" />
                <WeaponStat label="Blast" value={weapon.blastRadius} unit="px" />
                <WeaponStat label="Speed" value={weapon.projectileSpeedMultiplier} unit="x" isMultiplier />
              </div>
            </button>
          );
        })}
      </div>

      <div className="weapon-shop__actions">
        {onCancel && (
          <button
            className="weapon-shop__button weapon-shop__button--cancel"
            onClick={onCancel}
            data-testid="weapon-shop-cancel"
          >
            Cancel
          </button>
        )}
        <button
          className="weapon-shop__button weapon-shop__button--confirm"
          onClick={handleConfirm}
          data-testid="weapon-shop-confirm"
        >
          Confirm {selectedWeapon !== 'standard' && WEAPONS[selectedWeapon].cost > 0 && `($${WEAPONS[selectedWeapon].cost})`}
        </button>
      </div>
    </div>
  );
}

interface WeaponStatProps {
  label: string;
  value: number;
  unit: string;
  isMultiplier?: boolean;
}

function WeaponStat({ label, value, unit, isMultiplier }: WeaponStatProps) {
  const displayValue = isMultiplier ? value.toFixed(1) : value;

  return (
    <div className="weapon-shop__stat">
      <span className="weapon-shop__stat-label">{label}</span>
      <span className="weapon-shop__stat-value">
        {displayValue}{unit}
      </span>
    </div>
  );
}
