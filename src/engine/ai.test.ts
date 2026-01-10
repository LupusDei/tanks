import { describe, it, expect } from 'vitest';
import {
  calculateOptimalShot,
  applyDifficultyVariance,
  calculateAIShot,
  getAvailableDifficulties,
  getChevronCount,
  getStarCount,
  getNextDifficulty,
  selectAIWeapon,
  getAIWeaponChoice,
  selectTarget,
  AI_DIFFICULTY_CONFIGS,
  AI_AVAILABLE_WEAPONS,
} from './ai';
import type { TankState, TerrainData } from '../types/game';
import { WEAPON_TYPES } from './weapons';

// Helper to create a mock tank
function createMockTank(overrides: Partial<TankState> = {}): TankState {
  return {
    id: 'test',
    position: { x: 100, y: 100 },
    health: 100,
    angle: 45,
    power: 50,
    color: 'red',
    isActive: true,
    queuedShot: null,
    isReady: false,
    killedByWeapon: null,
    ...overrides,
  };
}

// Helper to create mock terrain
function createMockTerrain(width = 800, height = 600): TerrainData {
  const points: number[] = [];
  for (let i = 0; i < width; i++) {
    // Flat terrain at height 100
    points.push(100);
  }
  return { points, width, height };
}

describe('AI_DIFFICULTY_CONFIGS', () => {
  it('should have all difficulty levels defined', () => {
    expect(AI_DIFFICULTY_CONFIGS.blind_fool).toBeDefined();
    expect(AI_DIFFICULTY_CONFIGS.private).toBeDefined();
    expect(AI_DIFFICULTY_CONFIGS.veteran).toBeDefined();
    expect(AI_DIFFICULTY_CONFIGS.centurion).toBeDefined();
    expect(AI_DIFFICULTY_CONFIGS.primus).toBeDefined();
  });

  it('should have decreasing variance from blind_fool to primus', () => {
    const blindFool = AI_DIFFICULTY_CONFIGS.blind_fool;
    const private_ = AI_DIFFICULTY_CONFIGS.private;
    const veteran = AI_DIFFICULTY_CONFIGS.veteran;
    const centurion = AI_DIFFICULTY_CONFIGS.centurion;
    const primus = AI_DIFFICULTY_CONFIGS.primus;

    // Angle variance should decrease
    expect(blindFool.angleVariance).toBeGreaterThan(private_.angleVariance);
    expect(private_.angleVariance).toBeGreaterThan(veteran.angleVariance);
    expect(veteran.angleVariance).toBeGreaterThan(centurion.angleVariance);
    expect(centurion.angleVariance).toBeGreaterThan(primus.angleVariance);

    // Power variance should decrease
    expect(blindFool.powerVariance).toBeGreaterThan(private_.powerVariance);
    expect(private_.powerVariance).toBeGreaterThan(veteran.powerVariance);
    expect(veteran.powerVariance).toBeGreaterThan(centurion.powerVariance);
    expect(centurion.powerVariance).toBeGreaterThan(primus.powerVariance);
  });

  it('should have increasing thinking time from blind_fool to primus', () => {
    const blindFool = AI_DIFFICULTY_CONFIGS.blind_fool;
    const primus = AI_DIFFICULTY_CONFIGS.primus;

    expect(primus.thinkingTimeMs).toBeGreaterThan(blindFool.thinkingTimeMs);
  });

  it('should have name and description for each difficulty', () => {
    for (const key of Object.keys(AI_DIFFICULTY_CONFIGS)) {
      const config = AI_DIFFICULTY_CONFIGS[key as keyof typeof AI_DIFFICULTY_CONFIGS];
      expect(config.name).toBeTruthy();
      expect(config.description).toBeTruthy();
    }
  });
});

describe('getAvailableDifficulties', () => {
  it('should return all difficulty levels', () => {
    const difficulties = getAvailableDifficulties();

    expect(difficulties).toHaveLength(5);
    expect(difficulties.map(d => d.id)).toContain('blind_fool');
    expect(difficulties.map(d => d.id)).toContain('private');
    expect(difficulties.map(d => d.id)).toContain('veteran');
    expect(difficulties.map(d => d.id)).toContain('centurion');
    expect(difficulties.map(d => d.id)).toContain('primus');
  });

  it('should include name and description for each', () => {
    const difficulties = getAvailableDifficulties();

    for (const diff of difficulties) {
      expect(diff.name).toBeTruthy();
      expect(diff.description).toBeTruthy();
    }
  });
});

describe('calculateOptimalShot', () => {
  it('should return angle and power values', () => {
    const shooter = createMockTank({
      id: 'opponent',
      position: { x: 680, y: 120 },
      angle: 135,
    });
    const target = createMockTank({
      id: 'player',
      position: { x: 120, y: 120 },
    });
    const terrain = createMockTerrain();

    const result = calculateOptimalShot(shooter, target, terrain);

    expect(result.angle).toBeDefined();
    expect(result.power).toBeDefined();
    expect(typeof result.angle).toBe('number');
    expect(typeof result.power).toBe('number');
  });

  it('should calculate positive UI angle when shooting left (opponent)', () => {
    const shooter = createMockTank({
      id: 'opponent',
      position: { x: 680, y: 120 },
    });
    const target = createMockTank({
      id: 'player',
      position: { x: 120, y: 120 },
    });
    const terrain = createMockTerrain();

    const result = calculateOptimalShot(shooter, target, terrain);

    // When shooting left, UI angle should be positive (0 to 120)
    expect(result.angle).toBeGreaterThan(0);
    expect(result.angle).toBeLessThanOrEqual(120);
  });

  it('should calculate negative UI angle when shooting right (player)', () => {
    const shooter = createMockTank({
      id: 'player',
      position: { x: 120, y: 120 },
    });
    const target = createMockTank({
      id: 'opponent',
      position: { x: 680, y: 120 },
    });
    const terrain = createMockTerrain();

    const result = calculateOptimalShot(shooter, target, terrain);

    // When shooting right, UI angle should be negative (-120 to 0)
    expect(result.angle).toBeGreaterThanOrEqual(-120);
    expect(result.angle).toBeLessThan(0);
  });

  it('should return valid power range (10-100)', () => {
    const shooter = createMockTank({
      id: 'opponent',
      position: { x: 680, y: 120 },
    });
    const target = createMockTank({
      id: 'player',
      position: { x: 120, y: 120 },
    });
    const terrain = createMockTerrain();

    const result = calculateOptimalShot(shooter, target, terrain);

    expect(result.power).toBeGreaterThanOrEqual(10);
    expect(result.power).toBeLessThanOrEqual(100);
  });

  it('should handle null terrain', () => {
    const shooter = createMockTank({
      id: 'opponent',
      position: { x: 680, y: 120 },
    });
    const target = createMockTank({
      id: 'player',
      position: { x: 120, y: 120 },
    });

    const result = calculateOptimalShot(shooter, target, null);

    expect(result.angle).toBeDefined();
    expect(result.power).toBeDefined();
  });
});

describe('applyDifficultyVariance', () => {
  it('should return modified angle and power', () => {
    const decision = { angle: 45, power: 50 };

    const result = applyDifficultyVariance(decision, 'veteran');

    expect(result.angle).toBeDefined();
    expect(result.power).toBeDefined();
  });

  it('should keep power within valid range (10-100)', () => {
    const decision = { angle: 45, power: 50 };

    // Run multiple times to test random variance
    for (let i = 0; i < 100; i++) {
      const result = applyDifficultyVariance(decision, 'blind_fool');
      expect(result.power).toBeGreaterThanOrEqual(10);
      expect(result.power).toBeLessThanOrEqual(100);
    }
  });

  it('should produce less variance for primus than blind_fool', () => {
    const decision = { angle: 45, power: 50 };
    const primusResults: number[] = [];
    const blindFoolResults: number[] = [];

    // Collect multiple samples
    for (let i = 0; i < 100; i++) {
      primusResults.push(applyDifficultyVariance(decision, 'primus').angle);
      blindFoolResults.push(applyDifficultyVariance(decision, 'blind_fool').angle);
    }

    // Calculate standard deviation
    const primusStdDev = standardDeviation(primusResults);
    const blindFoolStdDev = standardDeviation(blindFoolResults);

    // Emperor should have much less variance
    expect(primusStdDev).toBeLessThan(blindFoolStdDev);
  });

  it('should not modify original decision object', () => {
    const decision = { angle: 45, power: 50 };

    applyDifficultyVariance(decision, 'veteran');

    expect(decision.angle).toBe(45);
    expect(decision.power).toBe(50);
  });
});

describe('calculateAIShot', () => {
  it('should return angle, power, and thinkingTimeMs', () => {
    const shooter = createMockTank({
      id: 'opponent',
      position: { x: 680, y: 120 },
    });
    const target = createMockTank({
      id: 'player',
      position: { x: 120, y: 120 },
    });
    const terrain = createMockTerrain();

    const result = calculateAIShot(shooter, target, terrain, 'veteran');

    expect(result.angle).toBeDefined();
    expect(result.power).toBeDefined();
    expect(result.thinkingTimeMs).toBeDefined();
    expect(result.thinkingTimeMs).toBe(AI_DIFFICULTY_CONFIGS.veteran.thinkingTimeMs);
  });

  it('should use difficulty-specific thinking time', () => {
    const shooter = createMockTank({
      id: 'opponent',
      position: { x: 680, y: 120 },
    });
    const target = createMockTank({
      id: 'player',
      position: { x: 120, y: 120 },
    });
    const terrain = createMockTerrain();

    const blindFoolResult = calculateAIShot(shooter, target, terrain, 'blind_fool');
    const primusResult = calculateAIShot(shooter, target, terrain, 'primus');

    expect(blindFoolResult.thinkingTimeMs).toBe(AI_DIFFICULTY_CONFIGS.blind_fool.thinkingTimeMs);
    expect(primusResult.thinkingTimeMs).toBe(AI_DIFFICULTY_CONFIGS.primus.thinkingTimeMs);
  });

  it('should apply variance based on difficulty', () => {
    const shooter = createMockTank({
      id: 'opponent',
      position: { x: 680, y: 120 },
    });
    const target = createMockTank({
      id: 'player',
      position: { x: 120, y: 120 },
    });
    const terrain = createMockTerrain();

    // Get optimal shot for comparison
    const optimal = calculateOptimalShot(shooter, target, terrain);

    // Emperor should be very close to optimal
    let primusCloseCount = 0;
    for (let i = 0; i < 50; i++) {
      const result = calculateAIShot(shooter, target, terrain, 'primus');
      if (Math.abs(result.angle - optimal.angle) < 3) {
        primusCloseCount++;
      }
    }

    // Most primus shots should be close to optimal
    expect(primusCloseCount).toBeGreaterThan(40);
  });
});

describe('getChevronCount', () => {
  it('should return 1 for blind_fool', () => {
    expect(getChevronCount('blind_fool')).toBe(1);
  });

  it('should return 2 for private', () => {
    expect(getChevronCount('private')).toBe(2);
  });

  it('should return 3 for veteran', () => {
    expect(getChevronCount('veteran')).toBe(3);
  });

  it('should return 0 for centurion (uses stars)', () => {
    expect(getChevronCount('centurion')).toBe(0);
  });

  it('should return 0 for primus (uses stars)', () => {
    expect(getChevronCount('primus')).toBe(0);
  });
});

describe('getStarCount', () => {
  it('should return 0 for blind_fool', () => {
    expect(getStarCount('blind_fool')).toBe(0);
  });

  it('should return 0 for private', () => {
    expect(getStarCount('private')).toBe(0);
  });

  it('should return 0 for veteran', () => {
    expect(getStarCount('veteran')).toBe(0);
  });

  it('should return 1 for centurion', () => {
    expect(getStarCount('centurion')).toBe(1);
  });

  it('should return 2 for primus', () => {
    expect(getStarCount('primus')).toBe(2);
  });
});

describe('getNextDifficulty', () => {
  it('should cycle from blind_fool to private', () => {
    expect(getNextDifficulty('blind_fool')).toBe('private');
  });

  it('should cycle from private to veteran', () => {
    expect(getNextDifficulty('private')).toBe('veteran');
  });

  it('should cycle from veteran to centurion', () => {
    expect(getNextDifficulty('veteran')).toBe('centurion');
  });

  it('should cycle from centurion to primus', () => {
    expect(getNextDifficulty('centurion')).toBe('primus');
  });

  it('should cycle from primus back to blind_fool', () => {
    expect(getNextDifficulty('primus')).toBe('blind_fool');
  });

  it('should complete a full cycle through all difficulties', () => {
    let current = getNextDifficulty('blind_fool');
    expect(current).toBe('private');

    current = getNextDifficulty(current);
    expect(current).toBe('veteran');

    current = getNextDifficulty(current);
    expect(current).toBe('centurion');

    current = getNextDifficulty(current);
    expect(current).toBe('primus');

    current = getNextDifficulty(current);
    expect(current).toBe('blind_fool');
  });
});

// Helper function to calculate standard deviation
function standardDeviation(values: number[]): number {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(avgSquaredDiff);
}

describe('AI_AVAILABLE_WEAPONS', () => {
  it('should only allow standard for blind_fool', () => {
    expect(AI_AVAILABLE_WEAPONS.blind_fool).toEqual(['standard']);
  });

  it('should only allow standard for private', () => {
    expect(AI_AVAILABLE_WEAPONS.private).toEqual(['standard']);
  });

  it('should allow more weapons for veteran', () => {
    expect(AI_AVAILABLE_WEAPONS.veteran).toContain('standard');
    expect(AI_AVAILABLE_WEAPONS.veteran).toContain('heavy_artillery');
    expect(AI_AVAILABLE_WEAPONS.veteran).toContain('precision');
    expect(AI_AVAILABLE_WEAPONS.veteran.length).toBe(3);
  });

  it('should allow cluster_bomb for centurion', () => {
    expect(AI_AVAILABLE_WEAPONS.centurion).toContain('cluster_bomb');
  });

  it('should allow all weapons for primus', () => {
    expect(AI_AVAILABLE_WEAPONS.primus).toEqual(WEAPON_TYPES);
  });
});

describe('selectAIWeapon', () => {
  const shooter = createMockTank({ position: { x: 100, y: 100 } });
  const farTarget = createMockTank({ position: { x: 600, y: 100 } });
  const closeTarget = createMockTank({ position: { x: 200, y: 100 } });
  const mediumTarget = createMockTank({ position: { x: 350, y: 100 } });

  it('should always return standard for blind_fool', () => {
    // Test with various random seeds
    for (let seed = 0; seed <= 1; seed += 0.1) {
      expect(selectAIWeapon('blind_fool', shooter, farTarget, seed)).toBe('standard');
      expect(selectAIWeapon('blind_fool', shooter, closeTarget, seed)).toBe('standard');
    }
  });

  it('should always return standard for private', () => {
    for (let seed = 0; seed <= 1; seed += 0.1) {
      expect(selectAIWeapon('private', shooter, farTarget, seed)).toBe('standard');
    }
  });

  it('should sometimes use advanced weapons for veteran', () => {
    const weapons = new Set<string>();
    // Use random seeds to get different results
    for (let seed = 0; seed <= 1; seed += 0.05) {
      weapons.add(selectAIWeapon('veteran', shooter, mediumTarget, seed));
    }
    // Veteran has access to standard, heavy_artillery, precision
    expect(weapons.size).toBeGreaterThan(1);
  });

  it('should prefer precision for close targets (veteran+)', () => {
    // At close range with low random seed, should pick precision
    const weapon = selectAIWeapon('veteran', shooter, closeTarget, 0.3);
    expect(weapon).toBe('precision');
  });

  it('should prefer heavy_artillery for medium range (veteran+)', () => {
    // At medium range with low random seed, should pick heavy_artillery
    const weapon = selectAIWeapon('veteran', shooter, mediumTarget, 0.3);
    expect(weapon).toBe('heavy_artillery');
  });

  it('should use cluster_bomb for centurion', () => {
    // Centurion has cluster_bomb access
    const weapon = selectAIWeapon('centurion', shooter, mediumTarget, 0.85);
    expect(weapon).toBe('cluster_bomb');
  });

  it('should use napalm for primus', () => {
    // Primus has napalm access
    const weapon = selectAIWeapon('primus', shooter, farTarget, 0.5);
    expect(weapon).toBe('napalm');
  });

  it('should only return weapons available to the difficulty', () => {
    // Run many iterations with different seeds
    for (let seed = 0; seed <= 1; seed += 0.05) {
      const veteranWeapon = selectAIWeapon('veteran', shooter, farTarget, seed);
      expect(AI_AVAILABLE_WEAPONS.veteran).toContain(veteranWeapon);

      const centurionWeapon = selectAIWeapon('centurion', shooter, farTarget, seed);
      expect(AI_AVAILABLE_WEAPONS.centurion).toContain(centurionWeapon);

      const primusWeapon = selectAIWeapon('primus', shooter, farTarget, seed);
      expect(AI_AVAILABLE_WEAPONS.primus).toContain(primusWeapon);
    }
  });

  it('should return valid weapon types for all difficulties', () => {
    const difficulties = ['blind_fool', 'private', 'veteran', 'centurion', 'primus'] as const;
    for (const difficulty of difficulties) {
      const weapon = selectAIWeapon(difficulty, shooter, farTarget);
      expect(WEAPON_TYPES).toContain(weapon);
    }
  });
});

describe('getAIWeaponChoice', () => {
  const shooter = createMockTank({ position: { x: 100, y: 100 } });
  const target = createMockTank({ position: { x: 400, y: 100 } });

  it('should return weaponType and weaponName', () => {
    const choice = getAIWeaponChoice('veteran', shooter, target);

    expect(choice.weaponType).toBeDefined();
    expect(choice.weaponName).toBeDefined();
    expect(typeof choice.weaponType).toBe('string');
    expect(typeof choice.weaponName).toBe('string');
  });

  it('should return matching weapon name for type', () => {
    // For blind_fool, always returns standard
    const choice = getAIWeaponChoice('blind_fool', shooter, target);

    expect(choice.weaponType).toBe('standard');
    expect(choice.weaponName).toBe('Standard Shell');
  });
});

describe('selectTarget', () => {
  it('should return null when no potential targets exist', () => {
    const shooter = createMockTank({ id: 'enemy-1' });
    const aliveTanks = [shooter]; // Only the shooter is alive

    const target = selectTarget(shooter, aliveTanks);

    expect(target).toBeNull();
  });

  it('should never select itself as a target', () => {
    const shooter = createMockTank({ id: 'enemy-1', position: { x: 100, y: 100 } });
    const otherTank = createMockTank({ id: 'enemy-2', position: { x: 200, y: 100 } });
    const aliveTanks = [shooter, otherTank];

    // Run multiple times to ensure randomness doesn't break this
    for (let i = 0; i < 50; i++) {
      const target = selectTarget(shooter, aliveTanks);
      expect(target).not.toBeNull();
      expect(target!.id).not.toBe(shooter.id);
    }
  });

  it('should select from available targets', () => {
    const shooter = createMockTank({ id: 'enemy-1', position: { x: 100, y: 100 } });
    const player = createMockTank({ id: 'player', position: { x: 200, y: 100 } });
    const enemy2 = createMockTank({ id: 'enemy-2', position: { x: 300, y: 100 } });
    const enemy3 = createMockTank({ id: 'enemy-3', position: { x: 400, y: 100 } });
    const aliveTanks = [shooter, player, enemy2, enemy3];

    const selectedTargets = new Set<string>();
    // Run multiple times to see distribution
    for (let i = 0; i < 100; i++) {
      const target = selectTarget(shooter, aliveTanks);
      expect(target).not.toBeNull();
      selectedTargets.add(target!.id);
    }

    // Should select from player, enemy-2, and enemy-3 (not self)
    expect(selectedTargets.has('enemy-1')).toBe(false);
    expect(selectedTargets.size).toBeGreaterThanOrEqual(1);
  });

  it('should weight selection towards closer tanks', () => {
    const shooter = createMockTank({ id: 'enemy-1', position: { x: 100, y: 100 } });
    const closeTank = createMockTank({ id: 'close', position: { x: 150, y: 100 } }); // 50 pixels away
    const farTank = createMockTank({ id: 'far', position: { x: 700, y: 100 } }); // 600 pixels away
    const aliveTanks = [shooter, closeTank, farTank];

    let closeCount = 0;
    let farCount = 0;

    // Run many times to see distribution
    for (let i = 0; i < 200; i++) {
      const target = selectTarget(shooter, aliveTanks);
      if (target!.id === 'close') closeCount++;
      if (target!.id === 'far') farCount++;
    }

    // Close tank should be selected more often
    expect(closeCount).toBeGreaterThan(farCount);
  });

  it('should weight selection towards lower health tanks', () => {
    const shooter = createMockTank({ id: 'enemy-1', position: { x: 100, y: 100 } });
    // Same distance but different health
    const weakTank = createMockTank({ id: 'weak', position: { x: 300, y: 100 }, health: 25 });
    const strongTank = createMockTank({ id: 'strong', position: { x: 300, y: 100 }, health: 100 });
    const aliveTanks = [shooter, weakTank, strongTank];

    let weakCount = 0;
    let strongCount = 0;

    // Run many times to see distribution
    for (let i = 0; i < 200; i++) {
      const target = selectTarget(shooter, aliveTanks);
      if (target!.id === 'weak') weakCount++;
      if (target!.id === 'strong') strongCount++;
    }

    // Weak tank should be selected more often (easier to finish off)
    expect(weakCount).toBeGreaterThan(strongCount);
  });

  it('should work with only two tanks (1v1)', () => {
    const shooter = createMockTank({ id: 'enemy-1', position: { x: 100, y: 100 } });
    const opponent = createMockTank({ id: 'player', position: { x: 500, y: 100 } });
    const aliveTanks = [shooter, opponent];

    const target = selectTarget(shooter, aliveTanks);

    expect(target).not.toBeNull();
    expect(target!.id).toBe('player');
  });
});
