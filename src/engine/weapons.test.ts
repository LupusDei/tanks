import { describe, it, expect } from 'vitest';
import {
  // Economy constants
  STARTING_MONEY,
  KILL_REWARD,
  WIN_BONUS,
  LOSS_CONSOLATION,
  DIFFICULTY_REWARD_MULTIPLIERS,
  // Weapon configurations
  WEAPON_STANDARD,
  WEAPON_HEAVY_ARTILLERY,
  WEAPON_PRECISION,
  WEAPON_CLUSTER_BOMB,
  WEAPON_NAPALM,
  WEAPONS,
  WEAPON_TYPES,
  // Utility functions
  getWeaponConfig,
  getPurchasableWeapons,
  canAffordWeapon,
  calculateKillReward,
  calculateWinBonus,
  calculateGameEarnings,
  getDestructionCategory,
} from './weapons';

describe('Economy constants', () => {
  it('STARTING_MONEY is a positive number', () => {
    expect(STARTING_MONEY).toBeGreaterThan(0);
    expect(STARTING_MONEY).toBe(500);
  });

  it('KILL_REWARD is a positive number', () => {
    expect(KILL_REWARD).toBeGreaterThan(0);
    expect(KILL_REWARD).toBe(100);
  });

  it('WIN_BONUS is greater than LOSS_CONSOLATION', () => {
    expect(WIN_BONUS).toBeGreaterThan(LOSS_CONSOLATION);
    expect(WIN_BONUS).toBe(250);
    expect(LOSS_CONSOLATION).toBe(50);
  });

  it('DIFFICULTY_REWARD_MULTIPLIERS covers all difficulties', () => {
    expect(DIFFICULTY_REWARD_MULTIPLIERS).toHaveProperty('blind_fool');
    expect(DIFFICULTY_REWARD_MULTIPLIERS).toHaveProperty('private');
    expect(DIFFICULTY_REWARD_MULTIPLIERS).toHaveProperty('veteran');
    expect(DIFFICULTY_REWARD_MULTIPLIERS).toHaveProperty('centurion');
    expect(DIFFICULTY_REWARD_MULTIPLIERS).toHaveProperty('primus');
  });

  it('DIFFICULTY_REWARD_MULTIPLIERS scale from easiest to hardest', () => {
    expect(DIFFICULTY_REWARD_MULTIPLIERS['blind_fool']).toBeLessThan(
      DIFFICULTY_REWARD_MULTIPLIERS['private']!
    );
    expect(DIFFICULTY_REWARD_MULTIPLIERS['private']).toBeLessThan(
      DIFFICULTY_REWARD_MULTIPLIERS['veteran']!
    );
    expect(DIFFICULTY_REWARD_MULTIPLIERS['veteran']).toBeLessThan(
      DIFFICULTY_REWARD_MULTIPLIERS['centurion']!
    );
    expect(DIFFICULTY_REWARD_MULTIPLIERS['centurion']).toBeLessThan(
      DIFFICULTY_REWARD_MULTIPLIERS['primus']!
    );
  });
});

describe('Weapon configurations', () => {
  it('WEAPON_STANDARD is the default free weapon', () => {
    expect(WEAPON_STANDARD.id).toBe('standard');
    expect(WEAPON_STANDARD.cost).toBe(0);
    expect(WEAPON_STANDARD.damage).toBe(100);
    expect(WEAPON_STANDARD.blastRadius).toBe(20);
    expect(WEAPON_STANDARD.projectileSpeedMultiplier).toBe(1.0);
  });

  it('WEAPON_HEAVY_ARTILLERY has larger blast radius', () => {
    expect(WEAPON_HEAVY_ARTILLERY.blastRadius).toBeGreaterThan(
      WEAPON_STANDARD.blastRadius
    );
    expect(WEAPON_HEAVY_ARTILLERY.cost).toBeGreaterThan(0);
  });

  it('WEAPON_PRECISION has smaller blast radius and faster projectile', () => {
    expect(WEAPON_PRECISION.blastRadius).toBeLessThan(WEAPON_STANDARD.blastRadius);
    expect(WEAPON_PRECISION.projectileSpeedMultiplier).toBeGreaterThan(1.0);
    expect(WEAPON_PRECISION.cost).toBeGreaterThan(0);
  });

  it('WEAPON_CLUSTER_BOMB has reduced per-hit damage', () => {
    expect(WEAPON_CLUSTER_BOMB.damage).toBeLessThan(100);
    expect(WEAPON_CLUSTER_BOMB.cost).toBeGreaterThan(0);
  });

  it('WEAPON_NAPALM has reduced initial damage', () => {
    expect(WEAPON_NAPALM.damage).toBeLessThan(100);
    expect(WEAPON_NAPALM.cost).toBeGreaterThan(0);
  });

  it('all weapons have required properties', () => {
    const allWeapons = [
      WEAPON_STANDARD,
      WEAPON_HEAVY_ARTILLERY,
      WEAPON_PRECISION,
      WEAPON_CLUSTER_BOMB,
      WEAPON_NAPALM,
    ];

    for (const weapon of allWeapons) {
      expect(weapon).toHaveProperty('id');
      expect(weapon).toHaveProperty('name');
      expect(weapon).toHaveProperty('description');
      expect(weapon).toHaveProperty('cost');
      expect(weapon).toHaveProperty('damage');
      expect(weapon).toHaveProperty('blastRadius');
      expect(weapon).toHaveProperty('projectileSpeedMultiplier');
      expect(weapon.damage).toBeGreaterThan(0);
      expect(weapon.blastRadius).toBeGreaterThan(0);
      expect(weapon.projectileSpeedMultiplier).toBeGreaterThan(0);
    }
  });
});

describe('WEAPONS registry', () => {
  it('contains all weapon types', () => {
    expect(Object.keys(WEAPONS)).toHaveLength(5);
    expect(WEAPONS).toHaveProperty('standard');
    expect(WEAPONS).toHaveProperty('heavy_artillery');
    expect(WEAPONS).toHaveProperty('precision');
    expect(WEAPONS).toHaveProperty('cluster_bomb');
    expect(WEAPONS).toHaveProperty('napalm');
  });

  it('maps to correct weapon configs', () => {
    expect(WEAPONS['standard']).toBe(WEAPON_STANDARD);
    expect(WEAPONS['heavy_artillery']).toBe(WEAPON_HEAVY_ARTILLERY);
    expect(WEAPONS['precision']).toBe(WEAPON_PRECISION);
    expect(WEAPONS['cluster_bomb']).toBe(WEAPON_CLUSTER_BOMB);
    expect(WEAPONS['napalm']).toBe(WEAPON_NAPALM);
  });
});

describe('WEAPON_TYPES array', () => {
  it('contains all weapon types in order', () => {
    expect(WEAPON_TYPES).toHaveLength(5);
    expect(WEAPON_TYPES[0]).toBe('standard');
    expect(WEAPON_TYPES).toContain('heavy_artillery');
    expect(WEAPON_TYPES).toContain('precision');
    expect(WEAPON_TYPES).toContain('cluster_bomb');
    expect(WEAPON_TYPES).toContain('napalm');
  });
});

describe('getWeaponConfig', () => {
  it('returns correct config for valid weapon type', () => {
    expect(getWeaponConfig('standard')).toBe(WEAPON_STANDARD);
    expect(getWeaponConfig('heavy_artillery')).toBe(WEAPON_HEAVY_ARTILLERY);
    expect(getWeaponConfig('precision')).toBe(WEAPON_PRECISION);
    expect(getWeaponConfig('cluster_bomb')).toBe(WEAPON_CLUSTER_BOMB);
    expect(getWeaponConfig('napalm')).toBe(WEAPON_NAPALM);
  });
});

describe('getPurchasableWeapons', () => {
  it('returns only weapons with cost > 0', () => {
    const purchasable = getPurchasableWeapons();

    expect(purchasable).toHaveLength(4);
    expect(purchasable).not.toContain(WEAPON_STANDARD);
    expect(purchasable).toContain(WEAPON_HEAVY_ARTILLERY);
    expect(purchasable).toContain(WEAPON_PRECISION);
    expect(purchasable).toContain(WEAPON_CLUSTER_BOMB);
    expect(purchasable).toContain(WEAPON_NAPALM);

    for (const weapon of purchasable) {
      expect(weapon.cost).toBeGreaterThan(0);
    }
  });
});

describe('canAffordWeapon', () => {
  it('returns true for free standard weapon regardless of balance', () => {
    expect(canAffordWeapon(0, 'standard')).toBe(true);
    expect(canAffordWeapon(100, 'standard')).toBe(true);
  });

  it('returns true when balance equals weapon cost', () => {
    expect(canAffordWeapon(WEAPON_HEAVY_ARTILLERY.cost, 'heavy_artillery')).toBe(
      true
    );
  });

  it('returns true when balance exceeds weapon cost', () => {
    expect(
      canAffordWeapon(WEAPON_HEAVY_ARTILLERY.cost + 100, 'heavy_artillery')
    ).toBe(true);
  });

  it('returns false when balance is below weapon cost', () => {
    expect(
      canAffordWeapon(WEAPON_HEAVY_ARTILLERY.cost - 1, 'heavy_artillery')
    ).toBe(false);
    expect(canAffordWeapon(0, 'heavy_artillery')).toBe(false);
  });
});

describe('calculateKillReward', () => {
  it('applies difficulty multiplier to base kill reward', () => {
    const blindFoolReward = calculateKillReward('blind_fool');
    const veteranReward = calculateKillReward('veteran');
    const primusReward = calculateKillReward('primus');

    expect(blindFoolReward).toBe(
      Math.round(KILL_REWARD * DIFFICULTY_REWARD_MULTIPLIERS['blind_fool']!)
    );
    expect(veteranReward).toBe(KILL_REWARD); // veteran has 1.0 multiplier
    expect(primusReward).toBe(
      Math.round(KILL_REWARD * DIFFICULTY_REWARD_MULTIPLIERS['primus']!)
    );
  });

  it('harder difficulties give more reward', () => {
    expect(calculateKillReward('primus')).toBeGreaterThan(
      calculateKillReward('centurion')
    );
    expect(calculateKillReward('centurion')).toBeGreaterThan(
      calculateKillReward('veteran')
    );
    expect(calculateKillReward('veteran')).toBeGreaterThan(
      calculateKillReward('private')
    );
    expect(calculateKillReward('private')).toBeGreaterThan(
      calculateKillReward('blind_fool')
    );
  });

  it('defaults to 1.0 multiplier for unknown difficulty', () => {
    expect(calculateKillReward('unknown_difficulty')).toBe(KILL_REWARD);
  });
});

describe('calculateWinBonus', () => {
  it('applies difficulty multiplier to base win bonus', () => {
    const blindFoolBonus = calculateWinBonus('blind_fool');
    const veteranBonus = calculateWinBonus('veteran');
    const primusBonus = calculateWinBonus('primus');

    expect(blindFoolBonus).toBe(
      Math.round(WIN_BONUS * DIFFICULTY_REWARD_MULTIPLIERS['blind_fool']!)
    );
    expect(veteranBonus).toBe(WIN_BONUS); // veteran has 1.0 multiplier
    expect(primusBonus).toBe(
      Math.round(WIN_BONUS * DIFFICULTY_REWARD_MULTIPLIERS['primus']!)
    );
  });

  it('defaults to 1.0 multiplier for unknown difficulty', () => {
    expect(calculateWinBonus('unknown_difficulty')).toBe(WIN_BONUS);
  });
});

describe('calculateGameEarnings', () => {
  it('calculates total earnings for a victory', () => {
    const earnings = calculateGameEarnings(true, 3, 'veteran');
    const expectedKillReward = KILL_REWARD * 3;
    const expectedWinBonus = WIN_BONUS;

    expect(earnings).toBe(expectedKillReward + expectedWinBonus);
  });

  it('calculates total earnings for a defeat', () => {
    const earnings = calculateGameEarnings(false, 2, 'veteran');
    const expectedKillReward = KILL_REWARD * 2;

    expect(earnings).toBe(expectedKillReward + LOSS_CONSOLATION);
  });

  it('applies difficulty multiplier to both kills and win bonus', () => {
    const earningsVeteran = calculateGameEarnings(true, 2, 'veteran');
    const earningsPrimus = calculateGameEarnings(true, 2, 'primus');

    expect(earningsPrimus).toBeGreaterThan(earningsVeteran);
  });

  it('returns only consolation for defeat with no kills', () => {
    const earnings = calculateGameEarnings(false, 0, 'veteran');
    expect(earnings).toBe(LOSS_CONSOLATION);
  });

  it('returns only win bonus for victory with no kills', () => {
    const earnings = calculateGameEarnings(true, 0, 'veteran');
    expect(earnings).toBe(WIN_BONUS);
  });
});

describe('Economy balance', () => {
  it('starting money allows purchasing at least one weapon', () => {
    const cheapestPurchasable = getPurchasableWeapons().sort(
      (a, b) => a.cost - b.cost
    )[0];
    expect(STARTING_MONEY).toBeGreaterThanOrEqual(cheapestPurchasable!.cost);
  });

  it('winning a game with kills provides meaningful progression', () => {
    // Winning against 3 enemies should give enough for at least one upgrade
    const earnings = calculateGameEarnings(true, 3, 'veteran');
    const cheapestPurchasable = getPurchasableWeapons().sort(
      (a, b) => a.cost - b.cost
    )[0];

    expect(earnings).toBeGreaterThanOrEqual(cheapestPurchasable!.cost);
  });

  it('most expensive weapon costs more than a modest game earning', () => {
    // Most expensive weapon should require a good performance or saving
    const mostExpensive = getPurchasableWeapons().sort(
      (a, b) => b.cost - a.cost
    )[0];
    // A modest game: 1 kill, loss
    const modestGameEarnings = calculateGameEarnings(false, 1, 'veteran');

    // Should take more than a modest game to afford the most expensive weapon
    expect(mostExpensive!.cost).toBeGreaterThan(modestGameEarnings);
  });
});

describe('getDestructionCategory', () => {
  it('returns ballistic for standard and precision weapons', () => {
    expect(getDestructionCategory('standard')).toBe('ballistic');
    expect(getDestructionCategory('precision')).toBe('ballistic');
  });

  it('returns explosive for heavy artillery and cluster bomb', () => {
    expect(getDestructionCategory('heavy_artillery')).toBe('explosive');
    expect(getDestructionCategory('cluster_bomb')).toBe('explosive');
  });

  it('returns fire for napalm', () => {
    expect(getDestructionCategory('napalm')).toBe('fire');
  });

  it('covers all weapon types', () => {
    // Ensure every weapon type has a valid destruction category
    for (const weaponType of WEAPON_TYPES) {
      const category = getDestructionCategory(weaponType);
      expect(['explosive', 'ballistic', 'fire']).toContain(category);
    }
  });
});
