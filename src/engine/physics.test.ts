import { describe, it, expect } from 'vitest';
import {
  GRAVITY,
  POWER_SCALE,
  BASE_TERRAIN_WIDTH,
  WIND_SCALE,
  getTerrainPowerScale,
  powerToVelocity,
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
  it('equals 10 pixels per second squared', () => {
    expect(GRAVITY).toBe(10);
  });
});

describe('POWER_SCALE constant', () => {
  it('equals 1.12 (calibrated for 800px canvas)', () => {
    expect(POWER_SCALE).toBe(1.12);
  });
});

describe('BASE_TERRAIN_WIDTH constant', () => {
  it('equals 800 (the calibration baseline)', () => {
    expect(BASE_TERRAIN_WIDTH).toBe(800);
  });
});

describe('getTerrainPowerScale', () => {
  it('returns base POWER_SCALE for base terrain width (800)', () => {
    expect(getTerrainPowerScale(800)).toBeCloseTo(POWER_SCALE, 5);
  });

  it('scales by sqrt(2) for double terrain width', () => {
    const scale1600 = getTerrainPowerScale(1600);
    expect(scale1600).toBeCloseTo(POWER_SCALE * Math.sqrt(2), 5);
  });

  it('scales correctly for all terrain sizes', () => {
    // Small: 800px - base scale
    expect(getTerrainPowerScale(800)).toBeCloseTo(1.12, 2);
    // Medium: 1024px
    expect(getTerrainPowerScale(1024)).toBeCloseTo(1.12 * Math.sqrt(1024 / 800), 2);
    // Large: 1280px
    expect(getTerrainPowerScale(1280)).toBeCloseTo(1.12 * Math.sqrt(1280 / 800), 2);
    // Huge: 1600px
    expect(getTerrainPowerScale(1600)).toBeCloseTo(1.12 * Math.sqrt(2), 2);
  });
});

describe('powerToVelocity', () => {
  it('converts power to velocity using scale factor', () => {
    expect(powerToVelocity(100)).toBeCloseTo(112, 5);
    expect(powerToVelocity(50)).toBeCloseTo(56, 5);
    expect(powerToVelocity(10)).toBeCloseTo(11.2, 5);
  });

  it('scales linearly with power', () => {
    const v1 = powerToVelocity(50);
    const v2 = powerToVelocity(100);
    expect(v2).toBeCloseTo(v1 * 2, 5);
  });

  it('uses base scale when terrain width not provided', () => {
    expect(powerToVelocity(100)).toBeCloseTo(powerToVelocity(100, 800), 5);
  });

  it('scales velocity with terrain width', () => {
    const v800 = powerToVelocity(100, 800);
    const v1600 = powerToVelocity(100, 1600);
    // Double terrain width should give sqrt(2) times velocity
    expect(v1600 / v800).toBeCloseTo(Math.sqrt(2), 5);
  });

  it('produces correct velocity for each terrain size', () => {
    // Power 100 should give different velocities for each terrain
    expect(powerToVelocity(100, 800)).toBeCloseTo(112, 1);
    expect(powerToVelocity(100, 1024)).toBeCloseTo(112 * Math.sqrt(1024 / 800), 1);
    expect(powerToVelocity(100, 1280)).toBeCloseTo(112 * Math.sqrt(1280 / 800), 1);
    expect(powerToVelocity(100, 1600)).toBeCloseTo(112 * Math.sqrt(2), 1);
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

    // velocity = 50 * 1.12 = 56
    // x = 56 * 1 = 56
    expect(position.x).toBeCloseTo(56, 5);
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
    // velocity = 50 * 1.12 = 56
    // y = 200 - 56*1 + 0.5*10*1 = 200 - 56 + 5 = 149
    expect(position.y).toBeCloseTo(149, 5);
  });

  it('calculates correct position for 45-degree launch', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: Math.sqrt(200) / POWER_SCALE, // Adjusted so velocity = ~14.14, vx = vy = 10
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

    // velocity = 20 * 1.12 = 22.4
    // x = 100 + 22.4 = 122.4
    expect(position.x).toBeCloseTo(122.4, 5);
    expect(position.y).toBeCloseTo(55, 5); // 50 + 0.5*10*1
  });

  it('handles downward launch (negative angle)', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: -45,
      power: Math.sqrt(200) / POWER_SCALE, // Adjusted so velocity = ~14.14, vx = vy = 10
    };
    const position = calculatePosition(config, 1);

    // vx = 10, vy = -10 (downward)
    // x = 10
    // y = 0 - (-10)*1 + 0.5*10*1 = 10 + 5 = 15
    expect(position.x).toBeCloseTo(10, 5);
    expect(position.y).toBeCloseTo(15, 5);
  });

  it('scales projectile distance with terrain width', () => {
    // Same power/angle, different terrain widths
    const config800: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 0,
      power: 100,
      terrainWidth: 800,
    };
    const config1600: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 0,
      power: 100,
      terrainWidth: 1600,
    };

    const pos800 = calculatePosition(config800, 1);
    const pos1600 = calculatePosition(config1600, 1);

    // With double terrain width, velocity is sqrt(2) times higher
    // so horizontal distance should be sqrt(2) times farther
    expect(pos1600.x / pos800.x).toBeCloseTo(Math.sqrt(2), 5);
  });

  it('maintains relative coverage across terrain sizes', () => {
    // The key property: full power should cover approximately
    // the same relative distance on all terrain sizes
    // Range is proportional to v^2, and v scales with sqrt(width)
    // So range scales linearly with terrain width

    // For a 45 degree angle horizontal shot at power 100
    const makeConfig = (terrainWidth: number): LaunchConfig => ({
      position: { x: 0, y: 0 },
      angle: 45,
      power: 100,
      terrainWidth,
    });

    // Calculate horizontal range (approximate by checking position at landing time)
    const config800 = makeConfig(800);
    const config1600 = makeConfig(1600);

    // After 1 second, check relative horizontal distance
    const pos800 = calculatePosition(config800, 1);
    const pos1600 = calculatePosition(config1600, 1);

    // Horizontal velocities scale with sqrt(terrainWidth)
    // So relative positions (position/terrainWidth) should scale accordingly
    const relPos800 = pos800.x / 800;
    const relPos1600 = pos1600.x / 1600;

    // Both should achieve similar relative coverage
    // (not exact because we're not at the full trajectory, but proportional)
    expect(relPos800).toBeCloseTo(relPos1600, 1);
  });
});

describe('calculateVelocity', () => {
  it('returns initial velocity components at time 0', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: Math.sqrt(200) / POWER_SCALE, // Adjusted so velocity = ~14.14, vx = vy = 10
    };
    const velocity = calculateVelocity(config, 0);

    expect(velocity.vx).toBeCloseTo(10, 5);
    expect(velocity.vy).toBeCloseTo(10, 5);
  });

  it('horizontal velocity remains constant', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: Math.sqrt(200) / POWER_SCALE,
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

    // velocity = 50 * 1.12 = 56
    expect(v0.vy).toBeCloseTo(56, 5);
    expect(v1.vy).toBeCloseTo(46, 5); // 56 - 10*1
    expect(v2.vy).toBeCloseTo(36, 5); // 56 - 10*2
  });

  it('vertical velocity becomes negative after apex', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 90,
      power: 30 / POWER_SCALE, // Adjusted so velocity = 30
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

    // velocity = 50 * 1.12 = 56
    // t = vy/g = 56/10 = 5.6
    expect(calculateApexTime(config)).toBeCloseTo(5.6, 5);
  });

  it('calculates correct apex time for 45-degree launch', () => {
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: Math.sqrt(200) / POWER_SCALE, // Adjusted so velocity = ~14.14, vy = 10
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
      power: 20 / POWER_SCALE, // Adjusted so velocity = 20
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
      power: 50 / POWER_SCALE, // Adjusted so velocity = 50
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
      power: 20 / POWER_SCALE, // Adjusted so velocity = 20
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

describe('physics calibration', () => {
  it('full power at 70° covers approximately 800 pixels horizontally', () => {
    // This test verifies the POWER_SCALE calibration is correct
    // A shot at 70° with power 100 should cover ~800px (full canvas width)
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 70,
      power: 100,
    };

    // Find when projectile returns to starting height (y=0)
    const time = findTimeAtY(config, 0, true, 0.001);
    expect(time).not.toBeNull();

    if (time !== null) {
      const position = calculatePosition(config, time);
      // Should travel approximately 800 pixels (+/- 50 pixels tolerance)
      expect(position.x).toBeGreaterThan(750);
      expect(position.x).toBeLessThan(850);
    }
  });

  it('max range at 45° is greater than canvas width', () => {
    // At 45° with full power, range should exceed 800px (more than canvas width)
    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: 100,
    };

    const time = findTimeAtY(config, 0, true, 0.001);
    expect(time).not.toBeNull();

    if (time !== null) {
      const position = calculatePosition(config, time);
      // At 45° should travel more than at 70°
      expect(position.x).toBeGreaterThan(1000);
    }
  });
});

describe('WIND_SCALE constant', () => {
  it('equals 0.15 (converts m/s to px/s² acceleration)', () => {
    expect(WIND_SCALE).toBe(0.15);
  });
});

describe('wind physics in calculatePosition', () => {
  const baseConfig: LaunchConfig = {
    position: { x: 0, y: 0 },
    angle: 45,
    power: 100,
  };

  it('wind=0 produces same result as no wind parameter', () => {
    const posNoWind = calculatePosition(baseConfig, 2);
    const posZeroWind = calculatePosition(baseConfig, 2, 0);

    expect(posZeroWind.x).toBeCloseTo(posNoWind.x, 10);
    expect(posZeroWind.y).toBeCloseTo(posNoWind.y, 10);
  });

  it('positive wind increases horizontal distance', () => {
    const posNoWind = calculatePosition(baseConfig, 2, 0);
    const posWithWind = calculatePosition(baseConfig, 2, 10);

    // Wind of 10 m/s should push projectile further right
    expect(posWithWind.x).toBeGreaterThan(posNoWind.x);
  });

  it('negative wind decreases horizontal distance', () => {
    const posNoWind = calculatePosition(baseConfig, 2, 0);
    const posWithWind = calculatePosition(baseConfig, 2, -10);

    // Wind of -10 m/s should push projectile left
    expect(posWithWind.x).toBeLessThan(posNoWind.x);
  });

  it('wind displacement grows with time squared', () => {
    // At time t, wind displacement = 0.5 * windAccel * t²
    const wind = 10;
    const windAccel = wind * WIND_SCALE; // 1.5 px/s²

    const pos1 = calculatePosition(baseConfig, 1, wind);
    const pos0 = calculatePosition(baseConfig, 1, 0);
    const displacement1 = pos1.x - pos0.x;

    const pos2 = calculatePosition(baseConfig, 2, wind);
    const pos02 = calculatePosition(baseConfig, 2, 0);
    const displacement2 = pos2.x - pos02.x;

    // At t=1: displacement = 0.5 * 1.5 * 1 = 0.75
    expect(displacement1).toBeCloseTo(0.5 * windAccel * 1, 5);

    // At t=2: displacement = 0.5 * 1.5 * 4 = 3
    expect(displacement2).toBeCloseTo(0.5 * windAccel * 4, 5);

    // Ratio should be 4:1 (t² growth)
    expect(displacement2 / displacement1).toBeCloseTo(4, 5);
  });

  it('wind does not affect vertical position', () => {
    const posNoWind = calculatePosition(baseConfig, 2, 0);
    const posWithWind = calculatePosition(baseConfig, 2, 20);

    // Y position should be identical regardless of wind
    expect(posWithWind.y).toBeCloseTo(posNoWind.y, 10);
  });

  it('calculates correct wind displacement at max wind', () => {
    const maxWind = 30; // MAX_WIND
    const windAccel = maxWind * WIND_SCALE; // 4.5 px/s²

    const pos = calculatePosition(baseConfig, 4, maxWind);
    const posNoWind = calculatePosition(baseConfig, 4, 0);

    // At t=4: displacement = 0.5 * 4.5 * 16 = 36 px
    const expectedDisplacement = 0.5 * windAccel * 16;
    const actualDisplacement = pos.x - posNoWind.x;

    expect(actualDisplacement).toBeCloseTo(expectedDisplacement, 5);
  });
});

describe('wind physics in calculateVelocity', () => {
  const baseConfig: LaunchConfig = {
    position: { x: 0, y: 0 },
    angle: 45,
    power: 100,
  };

  it('wind=0 produces same result as no wind parameter', () => {
    const velNoWind = calculateVelocity(baseConfig, 2);
    const velZeroWind = calculateVelocity(baseConfig, 2, 0);

    expect(velZeroWind.vx).toBeCloseTo(velNoWind.vx, 10);
    expect(velZeroWind.vy).toBeCloseTo(velNoWind.vy, 10);
  });

  it('positive wind increases horizontal velocity over time', () => {
    const vel0 = calculateVelocity(baseConfig, 0, 10);
    const vel2 = calculateVelocity(baseConfig, 2, 10);

    // vx should increase due to wind acceleration
    expect(vel2.vx).toBeGreaterThan(vel0.vx);
  });

  it('negative wind decreases horizontal velocity over time', () => {
    const vel0 = calculateVelocity(baseConfig, 0, -10);
    const vel2 = calculateVelocity(baseConfig, 2, -10);

    // vx should decrease due to negative wind acceleration
    expect(vel2.vx).toBeLessThan(vel0.vx);
  });

  it('wind velocity change is linear with time', () => {
    const wind = 10;
    const windAccel = wind * WIND_SCALE; // 1.5 px/s²

    const vel0 = calculateVelocity(baseConfig, 0, wind);
    const vel1 = calculateVelocity(baseConfig, 1, wind);
    const vel2 = calculateVelocity(baseConfig, 2, wind);

    // vx change should be windAccel per second
    expect(vel1.vx - vel0.vx).toBeCloseTo(windAccel * 1, 5);
    expect(vel2.vx - vel0.vx).toBeCloseTo(windAccel * 2, 5);
  });

  it('wind does not affect vertical velocity', () => {
    const velNoWind = calculateVelocity(baseConfig, 2, 0);
    const velWithWind = calculateVelocity(baseConfig, 2, 20);

    // vy should be identical regardless of wind
    expect(velWithWind.vy).toBeCloseTo(velNoWind.vy, 10);
  });
});

describe('wind effect on different projectile speeds', () => {
  it('wind displacement grows quadratically with flight time', () => {
    // The key physics principle: wind displacement = 0.5 * windAccel * t²
    // Projectiles with longer flight times accumulate more wind displacement

    const config: LaunchConfig = {
      position: { x: 0, y: 0 },
      angle: 45,
      power: 100,
    };

    const wind = 10;
    const windAccel = wind * WIND_SCALE;

    // Compare displacement at different times
    const t1 = 2;
    const t2 = 4;

    const pos1NoWind = calculatePosition(config, t1, 0);
    const pos1Wind = calculatePosition(config, t1, wind);
    const displacement1 = pos1Wind.x - pos1NoWind.x;

    const pos2NoWind = calculatePosition(config, t2, 0);
    const pos2Wind = calculatePosition(config, t2, wind);
    const displacement2 = pos2Wind.x - pos2NoWind.x;

    // Verify quadratic relationship: at 2x time, 4x displacement
    expect(displacement1).toBeCloseTo(0.5 * windAccel * t1 * t1, 5);
    expect(displacement2).toBeCloseTo(0.5 * windAccel * t2 * t2, 5);
    expect(displacement2 / displacement1).toBeCloseTo(4, 5);
  });

  it('demonstrates slower animations have more wind effect (same target distance)', () => {
    // When hitting the same target, a slower projectile takes more time
    // and thus accumulates more wind displacement

    // Fast projectile: reaches target in 2 seconds
    // Slow projectile: reaches target in 4 seconds (due to animation speed modifier)
    const wind = 10;
    const windAccel = wind * WIND_SCALE;

    const fastFlightTime = 2;
    const slowFlightTime = 4; // 0.5x animation speed means 2x flight time

    // Wind displacement at each flight time
    const fastDisplacement = 0.5 * windAccel * fastFlightTime * fastFlightTime;
    const slowDisplacement = 0.5 * windAccel * slowFlightTime * slowFlightTime;

    // Slow projectile has 4x more wind displacement due to t² relationship
    expect(slowDisplacement / fastDisplacement).toBeCloseTo(4, 5);
  });
});
