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
  // Set up user data in localStorage
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
  };
  localStorageMock.setItem('tanks_user_data', JSON.stringify(userData));

  return render(<UserProvider>{ui}</UserProvider>);
}

describe('WeaponShop', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('renders the weapon shop with title and balance', () => {
    const onConfirm = vi.fn();
    renderWithUser(<WeaponShop onConfirm={onConfirm} />);

    expect(screen.getByTestId('weapon-shop')).toBeInTheDocument();
    expect(screen.getByText('Weapon Shop')).toBeInTheDocument();
    expect(screen.getByTestId('weapon-shop-balance')).toBeInTheDocument();
    expect(screen.getByText(`$${STARTING_MONEY}`)).toBeInTheDocument();
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

    // Check that damage stat labels exist
    const damageLabels = screen.getAllByText('Damage');
    expect(damageLabels.length).toBe(WEAPON_TYPES.length);
  });

  it('shows FREE for standard weapon and costs for others', () => {
    const onConfirm = vi.fn();
    renderWithUser(<WeaponShop onConfirm={onConfirm} />);

    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText(`$${WEAPONS.heavy_artillery.cost}`)).toBeInTheDocument();
    expect(screen.getByText(`$${WEAPONS.precision.cost}`)).toBeInTheDocument();
  });

  it('starts with standard weapon selected', () => {
    const onConfirm = vi.fn();
    renderWithUser(<WeaponShop onConfirm={onConfirm} />);

    const standardButton = screen.getByTestId('weapon-standard');
    expect(standardButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('allows selecting a different weapon', () => {
    const onConfirm = vi.fn();
    renderWithUser(<WeaponShop onConfirm={onConfirm} />);

    const heavyButton = screen.getByTestId('weapon-heavy_artillery');
    fireEvent.click(heavyButton);

    expect(heavyButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('weapon-standard')).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables weapons the player cannot afford', () => {
    const onConfirm = vi.fn();
    // Set balance to 100, less than heavy artillery cost (200)
    renderWithUser(<WeaponShop onConfirm={onConfirm} />, 100);

    // Heavy artillery costs 200, should be disabled
    const heavyButton = screen.getByTestId('weapon-heavy_artillery');
    expect(heavyButton).toBeDisabled();

    // Standard is free, should not be disabled
    const standardButton = screen.getByTestId('weapon-standard');
    expect(standardButton).not.toBeDisabled();
  });

  it('calls onConfirm with standard weapon without deducting balance', () => {
    const onConfirm = vi.fn();
    renderWithUser(<WeaponShop onConfirm={onConfirm} />);

    const confirmButton = screen.getByTestId('weapon-shop-confirm');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith('standard');
    // Balance should remain the same (no cost for standard)
    expect(screen.getByText(`$${STARTING_MONEY}`)).toBeInTheDocument();
  });

  it('calls onConfirm with selected weapon and deducts cost', () => {
    const onConfirm = vi.fn();
    renderWithUser(<WeaponShop onConfirm={onConfirm} />);

    // Select precision weapon
    fireEvent.click(screen.getByTestId('weapon-precision'));
    fireEvent.click(screen.getByTestId('weapon-shop-confirm'));

    expect(onConfirm).toHaveBeenCalledWith('precision');
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

  it('shows cost in confirm button when non-free weapon is selected', () => {
    const onConfirm = vi.fn();
    renderWithUser(<WeaponShop onConfirm={onConfirm} />);

    // Select heavy artillery
    fireEvent.click(screen.getByTestId('weapon-heavy_artillery'));

    const confirmButton = screen.getByTestId('weapon-shop-confirm');
    expect(confirmButton).toHaveTextContent(`($${WEAPONS.heavy_artillery.cost})`);
  });

  it('does not show cost in confirm button for free weapon', () => {
    const onConfirm = vi.fn();
    renderWithUser(<WeaponShop onConfirm={onConfirm} />);

    const confirmButton = screen.getByTestId('weapon-shop-confirm');
    expect(confirmButton).toHaveTextContent('Confirm');
    expect(confirmButton).not.toHaveTextContent('$');
  });
});
