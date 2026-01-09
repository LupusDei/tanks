import type { TankState, TerrainData, Position, TankColor } from '../types/game';
import { getTerrainHeightAt } from './terrain';

export interface TankDimensions {
  bodyWidth: number;
  bodyHeight: number;
  turretLength: number;
  turretWidth: number;
  wheelRadius: number;
}

const DEFAULT_DIMENSIONS: TankDimensions = {
  bodyWidth: 40,
  bodyHeight: 20,
  turretLength: 25,
  turretWidth: 6,
  wheelRadius: 6,
};

const TANK_COLOR_MAP: Record<TankColor, string> = {
  red: '#ff4444',
  blue: '#4488ff',
  green: '#44ff44',
  yellow: '#ffff44',
};

/**
 * Convert TankColor type to hex color string
 */
export function getTankColorHex(color: TankColor | string): string {
  if (color in TANK_COLOR_MAP) {
    return TANK_COLOR_MAP[color as TankColor];
  }
  return color; // Return as-is if already a hex color
}

/**
 * Render a tank on the canvas.
 * The tank is drawn at the given position with the turret pointing at the specified angle.
 * Note: Canvas y-axis is inverted (0 at top), so we need to handle that.
 */
export function renderTank(
  ctx: CanvasRenderingContext2D,
  tank: TankState,
  canvasHeight: number,
  dimensions: TankDimensions = DEFAULT_DIMENSIONS
): void {
  const { position, angle, color, health } = tank;
  const { bodyWidth, bodyHeight, turretLength, turretWidth, wheelRadius } = dimensions;

  // Convert to canvas coordinates (flip y-axis)
  const canvasX = position.x;
  const canvasY = canvasHeight - position.y;

  const tankColor = getTankColorHex(color);
  const darkerColor = darkenColor(tankColor, 0.3);

  ctx.save();
  ctx.translate(canvasX, canvasY);

  // Draw wheels/treads
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(-bodyWidth / 3, bodyHeight / 2, wheelRadius, wheelRadius * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bodyWidth / 3, bodyHeight / 2, wheelRadius, wheelRadius * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw track between wheels
  ctx.fillStyle = '#222';
  ctx.fillRect(-bodyWidth / 2, bodyHeight / 2 - wheelRadius * 0.5, bodyWidth, wheelRadius);

  // Draw tank body
  ctx.fillStyle = tankColor;
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, 4);
  ctx.fill();

  // Draw body highlight
  ctx.fillStyle = lightenColor(tankColor, 0.2);
  ctx.fillRect(-bodyWidth / 2 + 4, -bodyHeight / 2 + 2, bodyWidth - 8, 4);

  // Draw turret base (dome)
  ctx.fillStyle = darkerColor;
  ctx.beginPath();
  ctx.arc(0, -bodyHeight / 4, bodyWidth / 4, Math.PI, 0);
  ctx.fill();

  // Draw turret barrel
  ctx.save();
  // Angle is measured from horizontal, with 0 = right, 90 = up
  // Convert to canvas rotation (negative because canvas y is inverted)
  const turretAngle = -angle * (Math.PI / 180);
  ctx.rotate(turretAngle);

  ctx.fillStyle = darkerColor;
  ctx.fillRect(0, -turretWidth / 2, turretLength, turretWidth);

  // Barrel tip
  ctx.fillStyle = '#222';
  ctx.fillRect(turretLength - 4, -turretWidth / 2 - 1, 4, turretWidth + 2);

  ctx.restore();

  // Draw health bar if not at full health
  if (health < 100) {
    const healthBarWidth = bodyWidth;
    const healthBarHeight = 4;
    const healthBarY = -bodyHeight - 10;

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(-healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);

    // Health fill
    const healthPercent = Math.max(0, health) / 100;
    const healthColor = health > 50 ? '#44ff44' : health > 25 ? '#ffff44' : '#ff4444';
    ctx.fillStyle = healthColor;
    ctx.fillRect(-healthBarWidth / 2, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
  }

  ctx.restore();
}

/**
 * Calculate the position for a tank placed on terrain at a given x coordinate.
 * Returns the position where the tank should be placed (on top of terrain).
 */
export function calculateTankPosition(
  terrain: TerrainData,
  x: number,
  dimensions: TankDimensions = DEFAULT_DIMENSIONS
): Position {
  const terrainHeight = getTerrainHeightAt(terrain, x);
  if (terrainHeight === undefined) {
    throw new Error(`Invalid x coordinate: ${x} is outside terrain bounds`);
  }

  // Position tank on top of terrain
  // The tank's position.y is at the bottom of the tank body
  return {
    x,
    y: terrain.height - terrainHeight + dimensions.bodyHeight / 2 + dimensions.wheelRadius,
  };
}

/**
 * Create initial tank states for two players.
 * Places tanks at left and right sides of the terrain.
 */
export function createInitialTanks(
  terrain: TerrainData,
  playerColor: TankColor,
  opponentColor: TankColor
): TankState[] {
  const leftX = Math.floor(terrain.width * 0.15);
  const rightX = Math.floor(terrain.width * 0.85);

  const leftPosition = calculateTankPosition(terrain, leftX);
  const rightPosition = calculateTankPosition(terrain, rightX);

  return [
    {
      id: 'player',
      position: leftPosition,
      health: 100,
      angle: 45,
      power: 50,
      color: playerColor,
      isActive: true,
    },
    {
      id: 'opponent',
      position: rightPosition,
      health: 100,
      angle: 135,
      power: 50,
      color: opponentColor,
      isActive: false,
    },
  ];
}

/**
 * Get a contrasting color for the opponent based on player's color choice.
 */
export function getOpponentColor(playerColor: TankColor): TankColor {
  const contrastMap: Record<TankColor, TankColor> = {
    red: 'blue',
    blue: 'red',
    green: 'yellow',
    yellow: 'green',
  };
  return contrastMap[playerColor];
}

/**
 * Darken a hex color by a given factor (0-1).
 */
function darkenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.floor(rgb.r * (1 - factor));
  const g = Math.floor(rgb.g * (1 - factor));
  const b = Math.floor(rgb.b * (1 - factor));

  return rgbToHex(r, g, b);
}

/**
 * Lighten a hex color by a given factor (0-1).
 */
function lightenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor));
  const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor));
  const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor));

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
