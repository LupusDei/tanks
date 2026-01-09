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
 * Render options for tank rendering.
 */
export interface RenderTankOptions {
  dimensions?: TankDimensions;
  isCurrentTurn?: boolean;
  chevronCount?: number; // Number of chevrons to display (0-4 for AI rank)
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
  options: RenderTankOptions = {}
): void {
  const { dimensions = DEFAULT_DIMENSIONS, isCurrentTurn = false, chevronCount = 0 } = options;
  const { position, angle, color, health } = tank;
  const { bodyWidth, bodyHeight, turretLength, turretWidth, wheelRadius } = dimensions;

  // Convert to canvas coordinates (flip y-axis)
  const canvasX = position.x;
  const canvasY = canvasHeight - position.y;

  const tankColor = getTankColorHex(color);
  const darkerColor = darkenColor(tankColor, 0.3);

  ctx.save();
  ctx.translate(canvasX, canvasY);

  // Draw yellow arrow indicator for current turn (below tank)
  if (isCurrentTurn) {
    ctx.save();
    const arrowY = bodyHeight / 2 + wheelRadius + 12;
    const arrowHeight = 12;
    const arrowWidth = 10;

    // Glow effect
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 8;

    // Draw arrow pointing up
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(0, arrowY); // Top point
    ctx.lineTo(-arrowWidth / 2, arrowY + arrowHeight); // Bottom left
    ctx.lineTo(arrowWidth / 2, arrowY + arrowHeight); // Bottom right
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Draw shadow under tank
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, bodyHeight / 2 + wheelRadius, bodyWidth / 2 + 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw track base
  const trackGradient = ctx.createLinearGradient(
    -bodyWidth / 2, bodyHeight / 2 - wheelRadius,
    -bodyWidth / 2, bodyHeight / 2 + wheelRadius * 0.5
  );
  trackGradient.addColorStop(0, '#1a1a1a');
  trackGradient.addColorStop(0.5, '#333');
  trackGradient.addColorStop(1, '#222');
  ctx.fillStyle = trackGradient;
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2 - 2, bodyHeight / 2 - wheelRadius * 0.6, bodyWidth + 4, wheelRadius * 1.2, 3);
  ctx.fill();

  // Draw track segments
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  for (let i = -bodyWidth / 2; i < bodyWidth / 2; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, bodyHeight / 2 - wheelRadius * 0.5);
    ctx.lineTo(i, bodyHeight / 2 + wheelRadius * 0.5);
    ctx.stroke();
  }

  // Draw wheels with metallic gradient
  const wheelColor = '#555';
  const wheelPositions = [-bodyWidth / 3, 0, bodyWidth / 3];
  for (const wheelX of wheelPositions) {
    const wheelGradient = createDomeGradient(ctx, wheelX, bodyHeight / 2, wheelRadius * 0.8, wheelColor);
    ctx.fillStyle = wheelGradient;
    ctx.beginPath();
    ctx.arc(wheelX, bodyHeight / 2, wheelRadius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Wheel hub
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(wheelX, bodyHeight / 2, wheelRadius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw tank body with metallic gradient
  const bodyGradient = createMetallicGradient(
    ctx,
    -bodyWidth / 2, -bodyHeight / 2,
    bodyWidth, bodyHeight,
    tankColor
  );
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, 4);
  ctx.fill();

  // Body edge highlight (top edge gleam)
  ctx.strokeStyle = lightenColor(tankColor, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 + 4, -bodyHeight / 2 + 1);
  ctx.lineTo(bodyWidth / 2 - 4, -bodyHeight / 2 + 1);
  ctx.stroke();

  // Body bottom edge shadow
  ctx.strokeStyle = darkenColor(tankColor, 0.5);
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 + 4, bodyHeight / 2 - 1);
  ctx.lineTo(bodyWidth / 2 - 4, bodyHeight / 2 - 1);
  ctx.stroke();

  // Panel line details
  ctx.strokeStyle = darkenColor(tankColor, 0.4);
  ctx.lineWidth = 0.5;
  // Vertical panel lines
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 4, -bodyHeight / 2 + 3);
  ctx.lineTo(-bodyWidth / 4, bodyHeight / 2 - 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bodyWidth / 4, -bodyHeight / 2 + 3);
  ctx.lineTo(bodyWidth / 4, bodyHeight / 2 - 3);
  ctx.stroke();

  // Rivet details
  ctx.fillStyle = darkenColor(tankColor, 0.3);
  const rivetPositions: Array<[number, number]> = [
    [-bodyWidth / 2 + 4, -bodyHeight / 2 + 4],
    [bodyWidth / 2 - 4, -bodyHeight / 2 + 4],
    [-bodyWidth / 2 + 4, bodyHeight / 2 - 4],
    [bodyWidth / 2 - 4, bodyHeight / 2 - 4],
  ];
  for (const [rx, ry] of rivetPositions) {
    ctx.beginPath();
    ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw rank chevrons on tank body (centered)
  if (chevronCount > 0) {
    renderChevrons(ctx, chevronCount);
  }

  // Draw turret barrel FIRST (behind dome)
  ctx.save();
  // Move to dome center before rotating
  ctx.translate(0, -bodyHeight / 4);
  // Angle is measured from vertical: 0 = straight up, positive = left, negative = right
  // Range: -120 to +120 degrees
  // Convert to canvas rotation: add 90° to shift from vertical to horizontal reference
  const turretAngle = -(90 + angle) * (Math.PI / 180);
  ctx.rotate(turretAngle);

  // Barrel with gradient
  const barrelGradient = createMetallicGradient(
    ctx,
    0, -turretWidth / 2,
    turretLength, turretWidth,
    darkerColor,
    'vertical'
  );
  ctx.fillStyle = barrelGradient;
  ctx.beginPath();
  ctx.roundRect(0, -turretWidth / 2, turretLength, turretWidth, 2);
  ctx.fill();

  // Barrel tip / muzzle brake
  ctx.fillStyle = '#222';
  ctx.fillRect(turretLength - 4, -turretWidth / 2 - 1, 4, turretWidth + 2);

  // Muzzle opening
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(turretLength, 0, turretWidth / 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Draw turret base (dome) SECOND (in front of barrel)
  const domeRadius = bodyWidth / 4;
  const domeGradient = createDomeGradient(ctx, 0, -bodyHeight / 4, domeRadius, darkerColor);
  ctx.fillStyle = domeGradient;
  ctx.beginPath();
  ctx.arc(0, -bodyHeight / 4, domeRadius, Math.PI, 0);
  ctx.fill();

  // Dome rim highlight
  ctx.strokeStyle = lightenColor(darkerColor, 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -bodyHeight / 4, domeRadius - 1, Math.PI + 0.2, -0.2);
  ctx.stroke();

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
  // The tank's position.y is in world coordinates (0 at bottom, increases upward)
  // Tank center should be at: terrainHeight + wheelRadius + bodyHeight/2
  return {
    x,
    y: terrainHeight + dimensions.wheelRadius + dimensions.bodyHeight / 2,
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
      angle: -45, // Aiming right (toward opponent)
      power: 50,
      color: playerColor,
      isActive: true,
    },
    {
      id: 'opponent',
      position: rightPosition,
      health: 100,
      angle: 45, // Aiming left (toward player)
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

/**
 * Create a metallic gradient for tank surfaces.
 * Simulates light reflecting off curved metal.
 */
function createMetallicGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  baseColor: string,
  direction: 'vertical' | 'horizontal' = 'vertical'
): CanvasGradient {
  const gradient = direction === 'vertical'
    ? ctx.createLinearGradient(x, y, x, y + height)
    : ctx.createLinearGradient(x, y, x + width, y);

  const highlight = lightenColor(baseColor, 0.4);
  const midHighlight = lightenColor(baseColor, 0.15);
  const midDark = darkenColor(baseColor, 0.1);
  const shadow = darkenColor(baseColor, 0.35);

  gradient.addColorStop(0, highlight);
  gradient.addColorStop(0.15, midHighlight);
  gradient.addColorStop(0.5, baseColor);
  gradient.addColorStop(0.85, midDark);
  gradient.addColorStop(1, shadow);

  return gradient;
}

/**
 * Create a radial metallic gradient for domes/curved surfaces.
 */
function createDomeGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  baseColor: string
): CanvasGradient {
  // Offset highlight to top-left for 3D effect
  const gradient = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, 0,
    x, y, radius
  );

  const highlight = lightenColor(baseColor, 0.5);
  const shadow = darkenColor(baseColor, 0.4);

  gradient.addColorStop(0, highlight);
  gradient.addColorStop(0.4, baseColor);
  gradient.addColorStop(1, shadow);

  return gradient;
}

/**
 * Render rank chevrons on tank body.
 * Chevrons are V-shaped stripes indicating AI difficulty rank.
 */
function renderChevrons(
  ctx: CanvasRenderingContext2D,
  count: number
): void {
  const chevronWidth = 4.5;
  const chevronHeight = 1.9;
  const chevronSpacing = 0.75;
  const totalHeight = count * (chevronHeight + chevronSpacing) - chevronSpacing;
  const startY = -totalHeight / 2;

  ctx.save();
  ctx.strokeStyle = '#ffd700'; // Gold color for chevrons
  ctx.lineWidth = 0.75;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Add subtle glow effect
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 1;

  for (let i = 0; i < count; i++) {
    const y = startY + i * (chevronHeight + chevronSpacing);

    ctx.beginPath();
    // Draw V-shape (chevron pointing up)
    ctx.moveTo(-chevronWidth / 2, y + chevronHeight);
    ctx.lineTo(0, y);
    ctx.lineTo(chevronWidth / 2, y + chevronHeight);
    ctx.stroke();
  }

  ctx.restore();
}
