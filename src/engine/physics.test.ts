import { describe, it, expect } from 'vitest';
import {
  GRAVITY,
  degreesToRadians,
  calculatePosition,
  calculateVelocity,
  calculateApexTime,
  calculateMaxHeight,
  calculateTrajectory,
  calculateTrajectoryUntilY,
  findTimeAtY,
  type LaunchConfig,
} from './physics';

describe('GRAVITY constant', () => {
  it('equals 10 meters per second squared', () => {
    expect(GRAVITY).toBe(10);
  });
});

describe('degreesToRadians', () => {
  it('converts 0 degrees to 0 radians', () => {
    expect(degreesToRadians(0)).toBe(0);
  });

  it('converts 90 degrees to PI/2 radians', () => {
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('converts 180 degrees to PI radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
  });

  it('converts 360 degrees to 2*PI radians', () => {
    expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI, 10);
  });

  it('converts 45 degrees to PI/4 radians', () => {
    expect(degreesToRadians(45)).toBeCloseTo(Math.PI / 4, 10);
  });

  it('handles negative degrees', () => {
    expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2, 10);
  });
});

describe('calculatePosition', () => {
  const baseConfig: LaunchConfig = {
    position: { x: 0, y: 0 },
    angle: 45,
    power: 100,
  };

  it('returns starting position at time 0', () => {
    const position = calculatePosition(baseConfig, 0);
    expect(position.x).toBe(0);
    expect(position.y).toBe(0);
  });

  it('moves horizontally for horizontal launch (angle 0)', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 0,
      power: 50,
    };
    const position = calculatePosition(config, 1);

    // x = 50 * 1 = 50
    expect(position.x).toBeCloseTo(50, 5);
    // y = 0 - 0 + 0.5 * 10 * 1 = 5 (gravity pulls down)
    expect(position.y).toBeCloseTo(5, 5);
  });

  it('moves purely upward for vertical launch (angle 90)', () => {
    const config: LaunchConfig = {
      position: { x: 100, y: 200 },
      angle: 90,
      power: 50,
    };
    const position = calculatePosition(config, 1);

    // x should remain at starting position (no horizontal velocity)
    expect(position.x).toBeCloseTo(100, 5);
    // y = 200 - 50*1 + 0.5*10*1 = 200 - 50 + 5 = 155
    expect(position.y).toBeCloseTo(155, 5);
  });

  it('calculates correct position for 45-degree launch', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: Math.sqrt(200), // ~14.14, so vx = vy = 10
    };
    const position = calculatePosition(config, 2);

    // vx = vy = 10
    // x = 10 * 2 = 20
    // y = 0 - 10*2 + 0.5*10*4 = -20 + 20 = 0
    expect(position.x).toBeCloseTo(20, 5);
    expect(position.y).toBeCloseTo(0, 5);
  });

  it('respects initial position offset', () => {
    const config: LaunchConfig = {
      position: { x: 100, y: 50 },
      angle: 0,
      power: 20,
    };
    const position = calculatePosition(config, 1);

    expect(position.x).toBeCloseTo(120, 5);
    expect(position.y).toBeCloseTo(55, 5); // 50 + 0.5*10*1
  });

  it('handles downward launch (negative angle)', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: -45,
      power: Math.sqrt(200),
    };
    const position = calculatePosition(config, 1);

    // vx = 10, vy = -10 (downward)
    // x = 10
    // y = 0 - (-10)*1 + 0.5*10*1 = 10 + 5 = 15
    expect(position.x).toBeCloseTo(10, 5);
    expect(position.y).toBeCloseTo(15, 5);
  });
});

describe('calculateVelocity', () => {
  it('returns initial velocity components at time 0', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: Math.sqrt(200), // vx = vy = 10
    };
    const velocity = calculateVelocity(config, 0);

    expect(velocity.vx).toBeCloseTo(10, 5);
    expect(velocity.vy).toBeCloseTo(10, 5);
  });

  it('horizontal velocity remains constant', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: Math.sqrt(200),
    };

    const v0 = calculateVelocity(config, 0);
    const v1 = calculateVelocity(config, 1);
    const v2 = calculateVelocity(config, 2);

    expect(v0.vx).toBeCloseTo(v1.vx, 5);
    expect(v1.vx).toBeCloseTo(v2.vx, 5);
  });

  it('vertical velocity decreases by gravity per second', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 90,
      power: 50,
    };

    const v0 = calculateVelocity(config, 0);
    const v1 = calculateVelocity(config, 1);
    const v2 = calculateVelocity(config, 2);

    expect(v0.vy).toBeCloseTo(50, 5);
    expect(v1.vy).toBeCloseTo(40, 5); // 50 - 10*1
    expect(v2.vy).toBeCloseTo(30, 5); // 50 - 10*2
  });

  it('vertical velocity becomes negative after apex', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 90,
      power: 30,
    };

    // Apex at t = 30/10 = 3 seconds
    const vAtApex = calculateVelocity(config, 3);
    const vAfterApex = calculateVelocity(config, 4);

    expect(vAtApex.vy).toBeCloseTo(0, 5);
    expect(vAfterApex.vy).toBeCloseTo(-10, 5);
  });
});

describe('calculateApexTime', () => {
  it('calculates correct apex time for vertical launch', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 90,
      power: 50,
    };

    // t = vy/g = 50/10 = 5
    expect(calculateApexTime(config)).toBeCloseTo(5, 5);
  });

  it('calculates correct apex time for 45-degree launch', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: Math.sqrt(200), // vy = 10
    };

    // t = 10/10 = 1
    expect(calculateApexTime(config)).toBeCloseTo(1, 5);
  });

  it('returns 0 for horizontal launch', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 0,
      power: 50,
    };

    expect(calculateApexTime(config)).toBe(0);
  });

  it('returns 0 for downward launch', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: -30,
      power: 50,
    };

    expect(calculateApexTime(config)).toBe(0);
  });
});

describe('calculateMaxHeight', () => {
  it('calculates maximum height for vertical launch', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 100 },
      angle: 90,
      power: 20,
    };

    // Apex time = 20/10 = 2
    // y = 100 - 20*2 + 0.5*10*4 = 100 - 40 + 20 = 80
    expect(calculateMaxHeight(config)).toBeCloseTo(80, 5);
  });

  it('returns starting y for horizontal launch', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 100 },
      angle: 0,
      power: 50,
    };

    // No upward velocity, so max height is starting height
    expect(calculateMaxHeight(config)).toBe(100);
  });
});

describe('calculateTrajectory', () => {
  const config: LaunchConfig = {
    position: { x: 0, y: 0 },
    angle: 45,
    power: 100,
  };

  it('generates points at specified time intervals', () => {
    const trajectory = calculateTrajectory(config, 0.1, 1);

    expect(trajectory.length).toBe(11); // 0, 0.1, 0.2, ..., 1.0
    expect(trajectory[0]!.time).toBe(0);
    expect(trajectory[1]!.time).toBeCloseTo(0.1, 5);
    expect(trajectory[10]!.time).toBeCloseTo(1, 5);
  });

  it('first point is at starting position', () => {
    const trajectory = calculateTrajectory(config, 0.5, 2);

    expect(trajectory[0]!.x).toBe(0);
    expect(trajectory[0]!.y).toBe(0);
  });

  it('subsequent points follow projectile physics', () => {
    const trajectory = calculateTrajectory(config, 1, 2);

    for (const point of trajectory) {
      const expected = calculatePosition(config, point.time);
      expect(point.x).toBeCloseTo(expected.x, 5);
      expect(point.y).toBeCloseTo(expected.y, 5);
    }
  });

  it('throws error for non-positive timeStep', () => {
    expect(() => calculateTrajectory(config, 0, 1)).toThrow('timeStep must be positive');
    expect(() => calculateTrajectory(config, -0.1, 1)).toThrow('timeStep must be positive');
  });

  it('throws error for negative maxTime', () => {
    expect(() => calculateTrajectory(config, 0.1, -1)).toThrow('maxTime must be non-negative');
  });

  it('returns single point for maxTime of 0', () => {
    const trajectory = calculateTrajectory(config, 0.1, 0);
    expect(trajectory.length).toBe(1);
    expect(trajectory[0]!.time).toBe(0);
  });
});

describe('calculateTrajectoryUntilY', () => {
  const config: LaunchConfig = {
    position: { x: 0, y: 100 },
    angle: 45,
    power: 50,
  };

  it('stops when projectile reaches target y after descending', () => {
    const trajectory = calculateTrajectoryUntilY(config, 150, 0.1, 20);

    const lastPoint = trajectory[trajectory.length - 1]!;
    expect(lastPoint.y).toBeGreaterThanOrEqual(150);
  });

  it('continues until maxTime if target y not reached', () => {
    const trajectory = calculateTrajectoryUntilY(config, 1000, 0.1, 2);

    const lastPoint = trajectory[trajectory.length - 1]!;
    // Last point should be at or near maxTime (allowing for floating-point step accumulation)
    expect(lastPoint.time).toBeGreaterThanOrEqual(1.9);
    expect(lastPoint.time).toBeLessThanOrEqual(2.0);
  });

  it('throws error for non-positive timeStep', () => {
    expect(() => calculateTrajectoryUntilY(config, 100, 0, 10)).toThrow('timeStep must be positive');
  });

  it('throws error for negative maxTime', () => {
    expect(() => calculateTrajectoryUntilY(config, 100, 0.1, -1)).toThrow('maxTime must be non-negative');
  });
});

describe('findTimeAtY', () => {
  it('finds time when projectile crosses target y on descent', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 100 },
      angle: 90,
      power: 50,
    };

    // Projectile goes up, then comes back down
    // Starting at y=100, should cross y=100 again at t=10 (2*vy/g)
    const time = findTimeAtY(config, 100, true);

    expect(time).not.toBeNull();
    expect(time).toBeCloseTo(10, 1);
  });

  it('returns null if target y is above apex', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 100 },
      angle: 90,
      power: 20,
    };

    // Apex at y = 100 - 20 + 20 = 80 (remember screen coords)
    // Target y=50 is above apex in screen coordinates
    const time = findTimeAtY(config, 50, true);

    expect(time).toBeNull();
  });

  it('finds crossing point with reasonable precision', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: 100,
    };

    const targetY = 50;
    const time = findTimeAtY(config, targetY, true, 0.001);

    if (time !== null) {
      const position = calculatePosition(config, time);
      expect(Math.abs(position.y - targetY)).toBeLessThan(1);
    }
  });
});

describe('physics integration', () => {
  it('projectile returns to starting height at symmetric time (no air resistance)', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 100 },
      angle: 60,
      power: 40,
    };

    const apexTime = calculateApexTime(config);
    const returnTime = apexTime * 2;
    const returnPosition = calculatePosition(config, returnTime);

    // Should return to starting height (y=100)
    expect(returnPosition.y).toBeCloseTo(100, 1);
  });

  it('trajectory is parabolic', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 200 },
      angle: 45,
      power: 100,
    };

    const trajectory = calculateTrajectory(config, 0.5, 10);

    // Check that the trajectory has a turning point (goes up then down)
    const yValues = trajectory.map((p) => p.y);
    const minY = Math.min(...yValues);
    const minIndex = yValues.indexOf(minY);

    // Min y should not be at the start or end
    expect(minIndex).toBeGreaterThan(0);
    expect(minIndex).toBeLessThan(yValues.length - 1);
  });
});
