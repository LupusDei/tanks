import { describe, it, expect } from 'vitest';
import {
  LEGENDARY_GENERALS,
  selectRandomGenerals,
  getRandomGeneralNames,
  getGeneralCount,
  findGeneralByName,
  getGeneralsByEra,
} from './legendaryGenerals';

describe('legendaryGenerals', () => {
  describe('LEGENDARY_GENERALS constant', () => {
    it('should have at least 30 generals', () => {
      expect(LEGENDARY_GENERALS.length).toBeGreaterThanOrEqual(30);
    });

    it('should have unique names', () => {
      const names = LEGENDARY_GENERALS.map(g => g.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have valid structure for all generals', () => {
      for (const general of LEGENDARY_GENERALS) {
        expect(general.name).toBeTruthy();
        expect(general.era).toBeTruthy();
        expect(general.origin).toBeTruthy();
      }
    });

    it('should include iconic historical figures', () => {
      const names = LEGENDARY_GENERALS.map(g => g.name);
      expect(names).toContain('Alexander the Great');
      expect(names).toContain('Napoleon Bonaparte');
      expect(names).toContain('Genghis Khan');
      expect(names).toContain('Julius Caesar');
      expect(names).toContain('Sun Tzu');
    });
  });

  describe('selectRandomGenerals', () => {
    it('should return empty array for count <= 0', () => {
      expect(selectRandomGenerals(0)).toEqual([]);
      expect(selectRandomGenerals(-1)).toEqual([]);
    });

    it('should return requested number of generals', () => {
      const result = selectRandomGenerals(5);
      expect(result).toHaveLength(5);
    });

    it('should return unique generals', () => {
      const result = selectRandomGenerals(10);
      const names = result.map(g => g.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should not exceed available generals', () => {
      const result = selectRandomGenerals(1000);
      expect(result.length).toBe(LEGENDARY_GENERALS.length);
    });

    it('should return different results on multiple calls (statistical)', () => {
      // Run multiple times and check that we get different results
      const results = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const generals = selectRandomGenerals(3);
        const key = generals.map(g => g.name).sort().join(',');
        results.add(key);
      }
      // With 60+ generals choosing 3, we should get different combinations
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('getRandomGeneralNames', () => {
    it('should return array of strings', () => {
      const names = getRandomGeneralNames(5);
      expect(names).toHaveLength(5);
      names.forEach(name => {
        expect(typeof name).toBe('string');
      });
    });

    it('should return unique names', () => {
      const names = getRandomGeneralNames(10);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('getGeneralCount', () => {
    it('should return the count of all generals', () => {
      expect(getGeneralCount()).toBe(LEGENDARY_GENERALS.length);
    });

    it('should return at least 30', () => {
      expect(getGeneralCount()).toBeGreaterThanOrEqual(30);
    });
  });

  describe('findGeneralByName', () => {
    it('should find general by exact name', () => {
      const general = findGeneralByName('Napoleon Bonaparte');
      expect(general).toBeDefined();
      expect(general?.name).toBe('Napoleon Bonaparte');
      expect(general?.era).toBe('Early Modern');
      expect(general?.origin).toBe('France');
    });

    it('should find general case-insensitively', () => {
      const general = findGeneralByName('napoleon bonaparte');
      expect(general).toBeDefined();
      expect(general?.name).toBe('Napoleon Bonaparte');
    });

    it('should return undefined for non-existent general', () => {
      const general = findGeneralByName('John Doe');
      expect(general).toBeUndefined();
    });
  });

  describe('getGeneralsByEra', () => {
    it('should return generals from specified era', () => {
      const ancientGenerals = getGeneralsByEra('Ancient');
      expect(ancientGenerals.length).toBeGreaterThan(0);
      ancientGenerals.forEach(g => {
        expect(g.era).toBe('Ancient');
      });
    });

    it('should include expected generals in Ancient era', () => {
      const ancientGenerals = getGeneralsByEra('Ancient');
      const names = ancientGenerals.map(g => g.name);
      expect(names).toContain('Alexander the Great');
      expect(names).toContain('Julius Caesar');
    });

    it('should return empty array for invalid era', () => {
      // @ts-expect-error Testing invalid input
      const result = getGeneralsByEra('Invalid Era');
      expect(result).toEqual([]);
    });
  });
});
