import { useState, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import {
  type WeaponType,
  WEAPON_TYPES,
  WEAPONS,
} from '../engine/weapons';

interface WeaponShopProps {
  onConfirm: (weapon: WeaponType) => void;
  onCancel?: () => void;
}

export function WeaponShop({ onConfirm, onCancel }: WeaponShopProps) {
  const { balance, purchaseWeapon, getWeaponCount } = useUser();

  // Track quantities to purchase for each weapon type
  const [purchaseQtys, setPurchaseQtys] = useState<Partial<Record<WeaponType, number>>>({});

  // Calculate total cost of all pending purchases
  const totalCost = useMemo(() => {
    return Object.entries(purchaseQtys).reduce((sum, [weaponType, qty]) => {
      if (!qty || qty <= 0) return sum;
      const weapon = WEAPONS[weaponType as WeaponType];
      return sum + weapon.cost * qty;
    }, 0);
  }, [purchaseQtys]);

  // Calculate balance after purchase
  const balanceAfter = balance - totalCost;

  // Check if player has at least one weapon in inventory (or will have after purchase)
  const hasWeaponInInventory = useMemo(() => {
    // Standard is always infinite
    if (getWeaponCount('standard') === Infinity) return true;

    // Check if any weapon is owned or being purchased
    for (const weaponType of WEAPON_TYPES) {
      const owned = getWeaponCount(weaponType);
      const purchasing = purchaseQtys[weaponType] ?? 0;
      if (owned > 0 || owned === Infinity || purchasing > 0) return true;
    }
    return false;
  }, [purchaseQtys, getWeaponCount]);

  const getPurchaseQty = (weaponType: WeaponType): number => {
    return purchaseQtys[weaponType] ?? 0;
  };

  const canAffordOne = (weaponType: WeaponType): boolean => {
    const weapon = WEAPONS[weaponType];
    if (weapon.cost === 0) return true;
    // Check if we can afford one more given current pending purchases
    return balanceAfter >= weapon.cost;
  };

  const handleIncrement = (weaponType: WeaponType) => {
    const weapon = WEAPONS[weaponType];
    if (weapon.cost === 0) return; // Can't buy standard
    if (!canAffordOne(weaponType)) return;

    setPurchaseQtys(prev => ({
      ...prev,
      [weaponType]: (prev[weaponType] ?? 0) + 1,
    }));
  };

  const handleDecrement = (weaponType: WeaponType) => {
    const currentQty = getPurchaseQty(weaponType);
    if (currentQty <= 0) return;

    setPurchaseQtys(prev => ({
      ...prev,
      [weaponType]: currentQty - 1,
    }));
  };

  const handleConfirm = () => {
    // Purchase all selected weapons
    for (const [weaponType, qty] of Object.entries(purchaseQtys)) {
      if (qty && qty > 0) {
        const success = purchaseWeapon(weaponType as WeaponType, qty);
        if (!success) {
          // This shouldn't happen if UI is correct, but handle gracefully
          console.error(`Failed to purchase ${qty}x ${weaponType}`);
          return;
        }
      }
    }

    // Proceed with standard weapon as default selection
    onConfirm('standard');
  };

  const hasPendingPurchases = totalCost > 0;

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
          const isFree = weapon.cost === 0;
          const ownedCount = getWeaponCount(weaponType);
          const purchaseQty = getPurchaseQty(weaponType);
          const canIncrease = canAffordOne(weaponType) && !isFree;
          const canDecrease = purchaseQty > 0;
          const isBeingPurchased = purchaseQty > 0;
          const cantAffordAny = !isFree && balance < weapon.cost && purchaseQty === 0;

          return (
            <div
              key={weaponType}
              className={`weapon-shop__weapon ${isBeingPurchased ? 'weapon-shop__weapon--purchasing' : ''} ${cantAffordAny ? 'weapon-shop__weapon--unaffordable' : ''}`}
              data-testid={`weapon-${weaponType}`}
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

              <div className="weapon-shop__weapon-inventory">
                <span className="weapon-shop__owned" data-testid={`owned-${weaponType}`}>
                  Owned: {ownedCount === Infinity ? '∞' : ownedCount}
                </span>

                {!isFree && (
                  <div className="weapon-shop__quantity-controls">
                    <button
                      className="weapon-shop__qty-btn weapon-shop__qty-btn--minus"
                      onClick={() => handleDecrement(weaponType)}
                      disabled={!canDecrease}
                      data-testid={`qty-minus-${weaponType}`}
                      aria-label={`Decrease ${weapon.name} quantity`}
                    >
                      −
                    </button>
                    <span className="weapon-shop__qty-value" data-testid={`qty-${weaponType}`}>
                      {purchaseQty}
                    </span>
                    <button
                      className="weapon-shop__qty-btn weapon-shop__qty-btn--plus"
                      onClick={() => handleIncrement(weaponType)}
                      disabled={!canIncrease}
                      data-testid={`qty-plus-${weaponType}`}
                      aria-label={`Increase ${weapon.name} quantity`}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Section */}
      <div className="weapon-shop__summary" data-testid="weapon-shop-summary">
        <div className="weapon-shop__summary-row">
          <span>Total Cost:</span>
          <span className="weapon-shop__summary-cost" data-testid="total-cost">
            ${totalCost}
          </span>
        </div>
        <div className="weapon-shop__summary-row">
          <span>Balance After:</span>
          <span
            className={`weapon-shop__summary-after ${balanceAfter < 0 ? 'weapon-shop__summary-after--negative' : ''}`}
            data-testid="balance-after"
          >
            ${balanceAfter}
          </span>
        </div>
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
          disabled={!hasWeaponInInventory}
          data-testid="weapon-shop-confirm"
        >
          {hasPendingPurchases ? `Confirm Purchases ($${totalCost})` : 'Continue'}
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
