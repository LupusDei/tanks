import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeaponShop } from './WeaponShop';
import { UserProvider } from '../context/UserContext';
import { WEAPONS, WEAPON_TYPES, STARTING_MONEY } from '../engine/weapons';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Helper to render with UserProvider
function renderWithUser(ui: React.ReactElement, initialBalance = STARTING_MONEY) {
  // Set up user data in localStorage using new multi-player format
  const userData = {
    profile: { id: 'test-id', username: 'TestUser', createdAt: Date.now() },
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalKills: 0,
      winRate: 0,
      balance: initialBalance,
    },
    recentGames: [],
    weaponInventory: { standard: null }, // null becomes Infinity after JSON parse
  };
  // Store in multi-player database format
  const playersDb = { 'TestUser': userData };
  localStorageMock.setItem('tanks_players_db', JSON.stringify(playersDb));
  localStorageMock.setItem('tanks_current_player', 'TestUser');

  return render(<UserProvider>{ui}</UserProvider>);
}

describe('WeaponShop', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the weapon shop with title and balance', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      expect(screen.getByTestId('weapon-shop')).toBeInTheDocument();
      expect(screen.getByText('Weapon Shop')).toBeInTheDocument();
      expect(screen.getByTestId('weapon-shop-balance')).toBeInTheDocument();
      // Balance appears in both balance display and "balance after" summary
      const balanceElements = screen.getAllByText(`$${STARTING_MONEY}`);
      expect(balanceElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays all weapon types', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      for (const weaponType of WEAPON_TYPES) {
        expect(screen.getByTestId(`weapon-${weaponType}`)).toBeInTheDocument();
        expect(screen.getByText(WEAPONS[weaponType].name)).toBeInTheDocument();
      }
    });

    it('shows weapon stats for each weapon', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      const damageLabels = screen.getAllByText('Damage');
      expect(damageLabels.length).toBe(WEAPON_TYPES.length);
    });

    it('shows FREE for standard weapon and costs for others', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      expect(screen.getByText('FREE')).toBeInTheDocument();
      // Use getAllByText since some weapons may have the same price
      expect(screen.getAllByText(`$${WEAPONS.heavy_artillery.cost}`).length).toBeGreaterThan(0);
      expect(screen.getAllByText(`$${WEAPONS.precision.cost}`).length).toBeGreaterThan(0);
    });

    it('shows owned count for each weapon', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      // Standard shows infinity symbol
      expect(screen.getByTestId('owned-standard')).toHaveTextContent('Owned: ∞');

      // Other weapons show 0
      expect(screen.getByTestId('owned-heavy_artillery')).toHaveTextContent('Owned: 0');
    });

    it('shows summary section with totals', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      expect(screen.getByTestId('weapon-shop-summary')).toBeInTheDocument();
      expect(screen.getByTestId('total-cost')).toHaveTextContent('$0');
      expect(screen.getByTestId('balance-after')).toHaveTextContent(`$${STARTING_MONEY}`);
    });
  });

  describe('Quantity Controls', () => {
    it('shows quantity controls for non-free weapons', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      // Heavy artillery should have +/- buttons
      expect(screen.getByTestId('qty-plus-heavy_artillery')).toBeInTheDocument();
      expect(screen.getByTestId('qty-minus-heavy_artillery')).toBeInTheDocument();
      expect(screen.getByTestId('qty-heavy_artillery')).toHaveTextContent('0');

      // Standard should NOT have quantity controls (it's free)
      expect(screen.queryByTestId('qty-plus-standard')).not.toBeInTheDocument();
    });

    it('increments quantity when + is clicked', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      const plusBtn = screen.getByTestId('qty-plus-heavy_artillery');
      fireEvent.click(plusBtn);

      expect(screen.getByTestId('qty-heavy_artillery')).toHaveTextContent('1');
    });

    it('decrements quantity when - is clicked', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      // First increment
      fireEvent.click(screen.getByTestId('qty-plus-heavy_artillery'));
      expect(screen.getByTestId('qty-heavy_artillery')).toHaveTextContent('1');

      // Then decrement
      fireEvent.click(screen.getByTestId('qty-minus-heavy_artillery'));
      expect(screen.getByTestId('qty-heavy_artillery')).toHaveTextContent('0');
    });

    it('disables minus button when quantity is 0', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      const minusBtn = screen.getByTestId('qty-minus-heavy_artillery');
      expect(minusBtn).toBeDisabled();
    });

    it('disables plus button when insufficient funds', () => {
      const onConfirm = vi.fn();
      // Set balance to 100, less than heavy artillery cost (200)
      renderWithUser(<WeaponShop onConfirm={onConfirm} />, 100);

      const plusBtn = screen.getByTestId('qty-plus-heavy_artillery');
      expect(plusBtn).toBeDisabled();
    });

    it('enables minus button after incrementing', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      const plusBtn = screen.getByTestId('qty-plus-heavy_artillery');
      const minusBtn = screen.getByTestId('qty-minus-heavy_artillery');

      expect(minusBtn).toBeDisabled();
      fireEvent.click(plusBtn);
      expect(minusBtn).not.toBeDisabled();
    });
  });

  describe('Cost Calculation', () => {
    it('updates total cost when quantity changes', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);
      const heavyCost = WEAPONS.heavy_artillery.cost;

      expect(screen.getByTestId('total-cost')).toHaveTextContent('$0');

      // Add 1 heavy artillery
      fireEvent.click(screen.getByTestId('qty-plus-heavy_artillery'));
      expect(screen.getByTestId('total-cost')).toHaveTextContent(`$${heavyCost}`);

      // Add another (2x cost total)
      fireEvent.click(screen.getByTestId('qty-plus-heavy_artillery'));
      expect(screen.getByTestId('total-cost')).toHaveTextContent(`$${heavyCost * 2}`);
    });

    it('updates balance after when quantity changes', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);
      const heavyCost = WEAPONS.heavy_artillery.cost;

      expect(screen.getByTestId('balance-after')).toHaveTextContent(`$${STARTING_MONEY}`);

      // Add 1 heavy artillery
      fireEvent.click(screen.getByTestId('qty-plus-heavy_artillery'));
      expect(screen.getByTestId('balance-after')).toHaveTextContent(`$${STARTING_MONEY - heavyCost}`);
    });

    it('calculates cost correctly for multiple weapon types', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />, 1000);
      const heavyCost = WEAPONS.heavy_artillery.cost;
      const precisionCost = WEAPONS.precision.cost;
      const totalCost = heavyCost + precisionCost;

      // Add 1 heavy artillery
      fireEvent.click(screen.getByTestId('qty-plus-heavy_artillery'));
      // Add 1 precision
      fireEvent.click(screen.getByTestId('qty-plus-precision'));

      expect(screen.getByTestId('total-cost')).toHaveTextContent(`$${totalCost}`);
      expect(screen.getByTestId('balance-after')).toHaveTextContent(`$${1000 - totalCost}`);
    });
  });

  describe('Insufficient Funds', () => {
    it('disables plus when pending purchases exhaust funds', () => {
      const onConfirm = vi.fn();
      // Balance is 500, heavy artillery is 200 each
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      const plusBtn = screen.getByTestId('qty-plus-heavy_artillery');

      // Can add 2 (400 total, 100 remaining)
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      expect(screen.getByTestId('qty-heavy_artillery')).toHaveTextContent('2');

      // Now can't afford another (would need 200, only have 100)
      expect(plusBtn).toBeDisabled();
    });

    it('marks weapons as unaffordable when balance is too low', () => {
      const onConfirm = vi.fn();
      // Set balance to 100, less than any non-free weapon
      renderWithUser(<WeaponShop onConfirm={onConfirm} />, 100);

      const heavyWeapon = screen.getByTestId('weapon-heavy_artillery');
      expect(heavyWeapon).toHaveClass('weapon-shop__weapon--unaffordable');

      const standardWeapon = screen.getByTestId('weapon-standard');
      expect(standardWeapon).not.toHaveClass('weapon-shop__weapon--unaffordable');
    });
  });

  describe('Confirm and Cancel', () => {
    it('calls onConfirm with standard weapon when continuing without purchases', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      const confirmButton = screen.getByTestId('weapon-shop-confirm');
      expect(confirmButton).toHaveTextContent('Continue');

      fireEvent.click(confirmButton);
      expect(onConfirm).toHaveBeenCalledWith('standard');
    });

    it('shows purchase total in confirm button when items selected', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);
      const heavyCost = WEAPONS.heavy_artillery.cost;

      // Add 1 heavy artillery
      fireEvent.click(screen.getByTestId('qty-plus-heavy_artillery'));

      const confirmButton = screen.getByTestId('weapon-shop-confirm');
      expect(confirmButton).toHaveTextContent(`Buy ($${heavyCost})`);
    });

    it('calls onConfirm after purchasing weapons', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      // Add 1 precision
      fireEvent.click(screen.getByTestId('qty-plus-precision'));
      fireEvent.click(screen.getByTestId('weapon-shop-confirm'));

      expect(onConfirm).toHaveBeenCalledWith('standard');
    });

    it('shows cancel button when onCancel is provided', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} onCancel={onCancel} />);

      const cancelButton = screen.getByTestId('weapon-shop-cancel');
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(onCancel).toHaveBeenCalled();
    });

    it('does not show cancel button when onCancel is not provided', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      expect(screen.queryByTestId('weapon-shop-cancel')).not.toBeInTheDocument();
    });
  });

  describe('Standard Weapon', () => {
    it('standard weapon is always available and free', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />, 0); // Zero balance

      const standardWeapon = screen.getByTestId('weapon-standard');
      expect(standardWeapon).not.toHaveClass('weapon-shop__weapon--unaffordable');
      expect(screen.getByText('FREE')).toBeInTheDocument();
    });

    it('standard weapon shows infinite owned', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      expect(screen.getByTestId('owned-standard')).toHaveTextContent('Owned: ∞');
    });

    it('standard weapon has no quantity controls', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      expect(screen.queryByTestId('qty-plus-standard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('qty-minus-standard')).not.toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('highlights weapons being purchased', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      const heavyWeapon = screen.getByTestId('weapon-heavy_artillery');
      expect(heavyWeapon).not.toHaveClass('weapon-shop__weapon--purchasing');

      fireEvent.click(screen.getByTestId('qty-plus-heavy_artillery'));
      expect(heavyWeapon).toHaveClass('weapon-shop__weapon--purchasing');
    });

    it('removes highlight when quantity goes back to 0', () => {
      const onConfirm = vi.fn();
      renderWithUser(<WeaponShop onConfirm={onConfirm} />);

      const heavyWeapon = screen.getByTestId('weapon-heavy_artillery');

      // Add and remove
      fireEvent.click(screen.getByTestId('qty-plus-heavy_artillery'));
      expect(heavyWeapon).toHaveClass('weapon-shop__weapon--purchasing');

      fireEvent.click(screen.getByTestId('qty-minus-heavy_artillery'));
      expect(heavyWeapon).not.toHaveClass('weapon-shop__weapon--purchasing');
    });
  });
});
