import { describe, it, expect } from 'vitest';
import {
  WEAPONS,
  WEAPON_NUKE,
  getDestructionCategory,
  getPurchasableWeapons,
} from './weapons';
import { getFireSoundForWeapon } from '../services/audioManager';

describe('Nuke weapon config (tanks-303.2.1)', () => {
  it('should register the nuke in WEAPONS with superweapon stats (happy path)', () => {
    expect(WEAPONS.nuke).toBe(WEAPON_NUKE);
    expect(WEAPON_NUKE.id).toBe('nuke');
    expect(WEAPON_NUKE.damage).toBe(100); // lethal within radius
    expect(WEAPON_NUKE.blastRadius).toBeGreaterThanOrEqual(60); // massive AoE
    expect(WEAPON_NUKE.craterRadius).toBeGreaterThanOrEqual(70); // big crater
    expect(WEAPON_NUKE.cost).toBeGreaterThan(0); // purchasable, premium
    expect(WEAPON_NUKE.projectileSpeedMultiplier).toBeLessThan(1); // slow/heavy
  });

  it('should classify the nuke as an explosive destruction (behavior)', () => {
    expect(getDestructionCategory('nuke')).toBe('explosive');
  });

  it('should list the nuke as a purchasable shop weapon (shop integration)', () => {
    const purchasable = getPurchasableWeapons();
    expect(purchasable.some((w) => w.id === 'nuke')).toBe(true);
  });

  it('should map the nuke to a fire sound (no missing-sfx crash) (edge)', () => {
    expect(getFireSoundForWeapon('nuke')).toBeTruthy();
  });
});
