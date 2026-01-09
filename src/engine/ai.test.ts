import { describe, it, expect } from 'vitest';
import {
  calculateOptimalShot,
  applyDifficultyVariance,
  calculateAIShot,
  getAvailableDifficulties,
  AI_DIFFICULTY_CONFIGS,
} from './ai';
import type { TankState, TerrainData } from '../types/game';

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
    expect(AI_DIFFICULTY_CONFIGS.emperor).toBeDefined();
  });

  it('should have decreasing variance from blind_fool to emperor', () => {
    const blindFool = AI_DIFFICULTY_CONFIGS.blind_fool;
    const private_ = AI_DIFFICULTY_CONFIGS.private;
    const veteran = AI_DIFFICULTY_CONFIGS.veteran;
    const centurion = AI_DIFFICULTY_CONFIGS.centurion;
    const emperor = AI_DIFFICULTY_CONFIGS.emperor;

    // Angle variance should decrease
    expect(blindFool.angleVariance).toBeGreaterThan(private_.angleVariance);
    expect(private_.angleVariance).toBeGreaterThan(veteran.angleVariance);
    expect(veteran.angleVariance).toBeGreaterThan(centurion.angleVariance);
    expect(centurion.angleVariance).toBeGreaterThan(emperor.angleVariance);

    // Power variance should decrease
    expect(blindFool.powerVariance).toBeGreaterThan(private_.powerVariance);
    expect(private_.powerVariance).toBeGreaterThan(veteran.powerVariance);
    expect(veteran.powerVariance).toBeGreaterThan(centurion.powerVariance);
    expect(centurion.powerVariance).toBeGreaterThan(emperor.powerVariance);
  });

  it('should have increasing thinking time from blind_fool to emperor', () => {
    const blindFool = AI_DIFFICULTY_CONFIGS.blind_fool;
    const emperor = AI_DIFFICULTY_CONFIGS.emperor;

    expect(emperor.thinkingTimeMs).toBeGreaterThan(blindFool.thinkingTimeMs);
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
    expect(difficulties.map(d => d.id)).toContain('emperor');
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

  it('should calculate angle > 90 when shooting left (opponent)', () => {
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

    // When shooting left, angle should be > 90 (firing leftward)
    expect(result.angle).toBeGreaterThan(90);
    expect(result.angle).toBeLessThanOrEqual(180);
  });

  it('should calculate angle <= 90 when shooting right (player)', () => {
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

    // When shooting right, angle should be <= 90
    expect(result.angle).toBeGreaterThanOrEqual(0);
    expect(result.angle).toBeLessThanOrEqual(90);
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

  it('should produce less variance for emperor than blind_fool', () => {
    const decision = { angle: 45, power: 50 };
    const emperorResults: number[] = [];
    const blindFoolResults: number[] = [];

    // Collect multiple samples
    for (let i = 0; i < 100; i++) {
      emperorResults.push(applyDifficultyVariance(decision, 'emperor').angle);
      blindFoolResults.push(applyDifficultyVariance(decision, 'blind_fool').angle);
    }

    // Calculate standard deviation
    const emperorStdDev = standardDeviation(emperorResults);
    const blindFoolStdDev = standardDeviation(blindFoolResults);

    // Emperor should have much less variance
    expect(emperorStdDev).toBeLessThan(blindFoolStdDev);
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
    const emperorResult = calculateAIShot(shooter, target, terrain, 'emperor');

    expect(blindFoolResult.thinkingTimeMs).toBe(AI_DIFFICULTY_CONFIGS.blind_fool.thinkingTimeMs);
    expect(emperorResult.thinkingTimeMs).toBe(AI_DIFFICULTY_CONFIGS.emperor.thinkingTimeMs);
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
    let emperorCloseCount = 0;
    for (let i = 0; i < 50; i++) {
      const result = calculateAIShot(shooter, target, terrain, 'emperor');
      if (Math.abs(result.angle - optimal.angle) < 3) {
        emperorCloseCount++;
      }
    }

    // Most emperor shots should be close to optimal
    expect(emperorCloseCount).toBeGreaterThan(40);
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
