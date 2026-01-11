import { useState, useMemo, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useCampaign } from '../context/CampaignContext';
import {
  type WeaponType,
  WEAPON_TYPES,
  WEAPONS,
  ARMORS,
} from '../engine/weapons';
import { ARMOR_TYPES, type ArmorType } from '../types/game';

interface WeaponShopProps {
  onConfirm: (weapon: WeaponType) => void;
  onCancel?: () => void;
  /** Whether this is a campaign mode shop (uses campaign balance) */
  campaignMode?: boolean;
}

export function WeaponShop({ onConfirm, onCancel, campaignMode = false }: WeaponShopProps) {
  const {
    balance: userBalance,
    purchaseWeapon: userPurchaseWeapon,
    getWeaponCount: userGetWeaponCount,
    purchaseArmor: userPurchaseArmor,
    hasArmor: userHasArmor,
  } = useUser();
  const {
    getPlayer,
    purchaseWeapon: campaignPurchaseWeapon,
    purchaseArmor: campaignPurchaseArmor,
    hasArmor: campaignHasArmor,
  } = useCampaign();

  // Get balance and weapon functions based on mode
  const player = campaignMode ? getPlayer() : null;
  const balance = campaignMode ? (player?.balance ?? 0) : userBalance;

  // In campaign mode, use campaign weapon inventory; otherwise use user inventory
  const getWeaponCount = useCallback((weaponType: WeaponType): number => {
    if (campaignMode && player) {
      return player.weaponInventory[weaponType] ?? 0;
    }
    return userGetWeaponCount(weaponType);
  }, [campaignMode, player, userGetWeaponCount]);

  // Purchase weapon using appropriate method
  const purchaseWeapon = useCallback((weaponType: WeaponType, qty: number): boolean => {
    if (campaignMode && player) {
      // Campaign mode: purchase for campaign participant
      let success = true;
      for (let i = 0; i < qty; i++) {
        if (!campaignPurchaseWeapon(player.id, weaponType)) {
          success = false;
          break;
        }
      }
      return success;
    }
    return userPurchaseWeapon(weaponType, qty);
  }, [campaignMode, player, campaignPurchaseWeapon, userPurchaseWeapon]);

  // Check if armor is already owned
  const hasArmor = useCallback((armorType: ArmorType): boolean => {
    if (campaignMode && player) {
      return campaignHasArmor(player.id, armorType);
    }
    return userHasArmor(armorType);
  }, [campaignMode, player, campaignHasArmor, userHasArmor]);

  // Purchase armor using appropriate method
  const purchaseArmor = useCallback((armorType: ArmorType): boolean => {
    if (campaignMode && player) {
      return campaignPurchaseArmor(player.id, armorType);
    }
    return userPurchaseArmor(armorType);
  }, [campaignMode, player, campaignPurchaseArmor, userPurchaseArmor]);

  // Track quantities to purchase for each weapon type
  const [purchaseQtys, setPurchaseQtys] = useState<Partial<Record<WeaponType, number>>>({});

  // Track armor selections (true = selected for purchase)
  const [armorSelections, setArmorSelections] = useState<Partial<Record<ArmorType, boolean>>>({});

  // Calculate total cost of all pending purchases (weapons + armor)
  const totalCost = useMemo(() => {
    // Sum weapon costs
    const weaponCost = Object.entries(purchaseQtys).reduce((sum, [weaponType, qty]) => {
      if (!qty || qty <= 0) return sum;
      const weapon = WEAPONS[weaponType as WeaponType];
      return sum + weapon.cost * qty;
    }, 0);

    // Sum armor costs
    const armorCost = Object.entries(armorSelections).reduce((sum, [armorType, selected]) => {
      if (!selected) return sum;
      const armor = ARMORS[armorType as ArmorType];
      return sum + armor.cost;
    }, 0);

    return weaponCost + armorCost;
  }, [purchaseQtys, armorSelections]);

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

  // Check if armor can be afforded
  const canAffordArmor = (armorType: ArmorType): boolean => {
    const armor = ARMORS[armorType];
    return balanceAfter >= armor.cost;
  };

  // Toggle armor selection
  const handleArmorToggle = (armorType: ArmorType) => {
    const isCurrentlySelected = armorSelections[armorType] ?? false;
    const isOwned = hasArmor(armorType);

    // Can't toggle if already owned
    if (isOwned) return;

    // Can't select if can't afford (unless deselecting)
    if (!isCurrentlySelected && !canAffordArmor(armorType)) return;

    setArmorSelections(prev => ({
      ...prev,
      [armorType]: !isCurrentlySelected,
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

    // Purchase all selected armor
    for (const [armorType, selected] of Object.entries(armorSelections)) {
      if (selected) {
        const success = purchaseArmor(armorType as ArmorType);
        if (!success) {
          console.error(`Failed to purchase armor ${armorType}`);
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
      {/* Main content area with title and scrollable items */}
      <div className="weapon-shop__main">
        <h2 className="weapon-shop__title">Armory</h2>

        {/* Weapons Section */}
        <h3 className="weapon-shop__section-title">Weapons</h3>
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

        {/* Armor Section */}
        <h3 className="weapon-shop__section-title">Armor</h3>
        <div className="weapon-shop__armor">
          {ARMOR_TYPES.map((armorType) => {
            const armor = ARMORS[armorType];
            const isOwned = hasArmor(armorType);
            const isSelected = armorSelections[armorType] ?? false;
            const cantAfford = !isOwned && !isSelected && balance < armor.cost;

            return (
              <div
                key={armorType}
                className={`weapon-shop__armor-item ${isSelected ? 'weapon-shop__armor-item--selected' : ''} ${isOwned ? 'weapon-shop__armor-item--owned' : ''} ${cantAfford ? 'weapon-shop__armor-item--unaffordable' : ''}`}
                data-testid={`armor-${armorType}`}
              >
                <div className="weapon-shop__armor-header">
                  <span className="weapon-shop__armor-name">{armor.name}</span>
                  <span className="weapon-shop__armor-cost">${armor.cost}</span>
                </div>
                <p className="weapon-shop__armor-description">{armor.description}</p>
                <div className="weapon-shop__armor-actions">
                  {isOwned ? (
                    <span className="weapon-shop__armor-owned-badge">Owned</span>
                  ) : (
                    <button
                      className={`weapon-shop__armor-btn ${isSelected ? 'weapon-shop__armor-btn--selected' : ''}`}
                      onClick={() => handleArmorToggle(armorType)}
                      disabled={cantAfford && !isSelected}
                      data-testid={`armor-btn-${armorType}`}
                    >
                      {isSelected ? 'Remove' : 'Add'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart sidebar - fixed position with balance, summary, and actions */}
      <div className="weapon-shop__cart" data-testid="weapon-shop-cart">
        <div className="weapon-shop__balance" data-testid="weapon-shop-balance">
          <span className="weapon-shop__balance-label">Balance:</span>
          <span className="weapon-shop__balance-amount">${balance}</span>
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
            <span>After:</span>
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
            {hasPendingPurchases ? `Buy ($${totalCost})` : 'Continue'}
          </button>
        </div>
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
