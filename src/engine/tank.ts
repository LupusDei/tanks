import type { TankState, TerrainData, Position, TankColor, EnemyCount } from '../types/game';
import { getTerrainHeightAt } from './terrain';

export interface TankDimensions {
  bodyWidth: number;
  bodyHeight: number;
  turretLength: number;
  turretWidth: number;
  wheelRadius: number;
}

const DEFAULT_DIMENSIONS: TankDimensions = {
  bodyWidth: 50,      // Longer hull like Panther
  bodyHeight: 16,     // Lower profile
  turretLength: 30,   // Longer 75mm gun
  turretWidth: 6,
  wheelRadius: 5,     // Smaller interleaved wheels
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
  chevronCount?: number; // Number of chevrons to display (1-3 for lower ranks)
  starCount?: number; // Number of stars to display (1-2 for higher ranks)
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
  const { dimensions = DEFAULT_DIMENSIONS, isCurrentTurn = false, chevronCount = 0, starCount = 0 } = options;
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

  // Draw layered shadow under tank for depth
  // Outer soft shadow (larger, lighter)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(0, bodyHeight / 2 + wheelRadius + 2, bodyWidth / 2 + 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Middle shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, bodyHeight / 2 + wheelRadius + 1, bodyWidth / 2 + 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner shadow (darker, sharper)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, bodyHeight / 2 + wheelRadius, bodyWidth / 2 + 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ambient occlusion - darker area where tank contacts ground
  const aoGradient = ctx.createRadialGradient(
    0, bodyHeight / 2 + wheelRadius, 0,
    0, bodyHeight / 2 + wheelRadius, bodyWidth / 2 + 4
  );
  aoGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
  aoGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
  aoGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aoGradient;
  ctx.beginPath();
  ctx.ellipse(0, bodyHeight / 2 + wheelRadius, bodyWidth / 2 + 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw dust/dirt particles around tracks
  renderGroundDust(ctx, bodyWidth, bodyHeight, wheelRadius);

  // Draw Panther-style track assembly (extends beyond hull to sprocket and idler)
  const trackExtension = wheelRadius * 1.5; // Track extends past hull to wheels
  const trackGradient = ctx.createLinearGradient(
    -bodyWidth / 2 - trackExtension, bodyHeight / 2 - wheelRadius,
    -bodyWidth / 2 - trackExtension, bodyHeight / 2 + wheelRadius * 0.6
  );
  trackGradient.addColorStop(0, '#1a1a1a');
  trackGradient.addColorStop(0.5, '#2a2a2a');
  trackGradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = trackGradient;

  // Upper track run (visible above wheels)
  ctx.beginPath();
  ctx.roundRect(
    -bodyWidth / 2 - trackExtension,
    bodyHeight / 2 - wheelRadius * 1.1,
    bodyWidth + trackExtension * 2,
    wheelRadius * 0.35,
    2
  );
  ctx.fill();

  // Lower track run (below wheels)
  ctx.beginPath();
  ctx.roundRect(
    -bodyWidth / 2 - trackExtension,
    bodyHeight / 2 + wheelRadius * 0.55,
    bodyWidth + trackExtension * 2,
    wheelRadius * 0.35,
    2
  );
  ctx.fill();

  // Draw track link segments on lower track
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1;
  const trackStart = -bodyWidth / 2 - trackExtension;
  const trackEnd = bodyWidth / 2 + trackExtension;
  for (let i = trackStart; i < trackEnd; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, bodyHeight / 2 + wheelRadius * 0.55);
    ctx.lineTo(i, bodyHeight / 2 + wheelRadius * 0.9);
    ctx.stroke();
  }

  // Track guide teeth (center guides)
  ctx.fillStyle = '#222';
  for (let i = trackStart + 2; i < trackEnd; i += 6) {
    ctx.fillRect(i, bodyHeight / 2 + wheelRadius * 0.6, 2, wheelRadius * 0.15);
  }

  // Draw Panther-style interleaved road wheels (8 wheels total)
  const wheelColor = '#555';
  const numWheels = 8;
  const wheelSpacing = (bodyWidth - wheelRadius * 2) / (numWheels - 1);
  const startX = -bodyWidth / 2 + wheelRadius;

  // Draw wheels in two rows (interleaved pattern)
  // Back row first (slightly higher, partially hidden)
  for (let i = 0; i < numWheels; i += 2) {
    const wheelX = startX + i * wheelSpacing;
    const wheelY = bodyHeight / 2 - wheelRadius * 0.15; // Slightly higher

    // Wheel rubber tire
    const wheelGradient = createDomeGradient(ctx, wheelX, wheelY, wheelRadius * 0.85, '#3a3a3a');
    ctx.fillStyle = wheelGradient;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Wheel rim
    const rimGradient = createDomeGradient(ctx, wheelX, wheelY, wheelRadius * 0.6, wheelColor);
    ctx.fillStyle = rimGradient;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Hub cap
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Front row (slightly lower, overlapping)
  for (let i = 1; i < numWheels; i += 2) {
    const wheelX = startX + i * wheelSpacing;
    const wheelY = bodyHeight / 2 + wheelRadius * 0.1; // Slightly lower

    // Wheel rubber tire
    const wheelGradient = createDomeGradient(ctx, wheelX, wheelY, wheelRadius * 0.85, '#3a3a3a');
    ctx.fillStyle = wheelGradient;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Wheel rim
    const rimGradient = createDomeGradient(ctx, wheelX, wheelY, wheelRadius * 0.6, wheelColor);
    ctx.fillStyle = rimGradient;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Hub cap
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Drive sprocket (front) - larger toothed wheel
  const sprocketX = -bodyWidth / 2 - wheelRadius * 0.3;
  const sprocketRadius = wheelRadius * 0.9;
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(sprocketX, bodyHeight / 2, sprocketRadius, 0, Math.PI * 2);
  ctx.fill();
  // Sprocket teeth
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const toothAngle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(
      sprocketX + Math.cos(toothAngle) * sprocketRadius * 0.7,
      bodyHeight / 2 + Math.sin(toothAngle) * sprocketRadius * 0.7
    );
    ctx.lineTo(
      sprocketX + Math.cos(toothAngle) * sprocketRadius * 1.1,
      bodyHeight / 2 + Math.sin(toothAngle) * sprocketRadius * 1.1
    );
    ctx.stroke();
  }

  // Idler wheel (rear) - guides track
  const idlerX = bodyWidth / 2 + wheelRadius * 0.3;
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(idlerX, bodyHeight / 2, wheelRadius * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(idlerX, bodyHeight / 2, wheelRadius * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Draw Panther-style tank body with sloped armor
  const bodyGradient = createMetallicGradient(
    ctx,
    -bodyWidth / 2, -bodyHeight / 2,
    bodyWidth, bodyHeight,
    tankColor
  );
  ctx.fillStyle = bodyGradient;

  // Panther-style hull with sloped front and rear armor
  const slopeAngle = 8; // How much the front/rear slopes inward
  ctx.beginPath();
  // Start at front bottom
  ctx.moveTo(-bodyWidth / 2, bodyHeight / 2);
  // Sloped front armor (angled upward)
  ctx.lineTo(-bodyWidth / 2 + slopeAngle, -bodyHeight / 2);
  // Flat top deck
  ctx.lineTo(bodyWidth / 2 - slopeAngle, -bodyHeight / 2);
  // Sloped rear armor
  ctx.lineTo(bodyWidth / 2, bodyHeight / 2);
  // Bottom
  ctx.closePath();
  ctx.fill();

  // Upper hull superstructure (fighting compartment)
  const superstructureHeight = bodyHeight * 0.35;
  const superstructureWidth = bodyWidth * 0.6;
  const superstructureX = -bodyWidth * 0.1; // Offset toward rear
  const superGradient = createMetallicGradient(
    ctx,
    superstructureX - superstructureWidth / 2, -bodyHeight / 2 - superstructureHeight,
    superstructureWidth, superstructureHeight,
    tankColor
  );
  ctx.fillStyle = superGradient;
  ctx.beginPath();
  // Sloped front of superstructure
  ctx.moveTo(superstructureX - superstructureWidth / 2, -bodyHeight / 2);
  ctx.lineTo(superstructureX - superstructureWidth / 2 + 4, -bodyHeight / 2 - superstructureHeight);
  ctx.lineTo(superstructureX + superstructureWidth / 2 - 2, -bodyHeight / 2 - superstructureHeight);
  ctx.lineTo(superstructureX + superstructureWidth / 2, -bodyHeight / 2);
  ctx.closePath();
  ctx.fill();

  // Body edge highlight (top edge gleam) - follows slope
  ctx.strokeStyle = lightenColor(tankColor, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 + slopeAngle + 2, -bodyHeight / 2 + 1);
  ctx.lineTo(bodyWidth / 2 - slopeAngle - 2, -bodyHeight / 2 + 1);
  ctx.stroke();

  // Superstructure top highlight
  ctx.beginPath();
  ctx.moveTo(superstructureX - superstructureWidth / 2 + 6, -bodyHeight / 2 - superstructureHeight + 1);
  ctx.lineTo(superstructureX + superstructureWidth / 2 - 4, -bodyHeight / 2 - superstructureHeight + 1);
  ctx.stroke();

  // Body bottom edge shadow
  ctx.strokeStyle = darkenColor(tankColor, 0.5);
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 + 4, bodyHeight / 2 - 1);
  ctx.lineTo(bodyWidth / 2 - 4, bodyHeight / 2 - 1);
  ctx.stroke();

  // Panther-style armor panel lines (horizontal weld lines)
  ctx.strokeStyle = darkenColor(tankColor, 0.4);
  ctx.lineWidth = 0.5;
  // Horizontal panel line on hull side
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 + slopeAngle - 2, 0);
  ctx.lineTo(bodyWidth / 2 - slopeAngle + 2, 0);
  ctx.stroke();

  // Vertical seam lines
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 4, -bodyHeight / 2 + 2);
  ctx.lineTo(-bodyWidth / 4, bodyHeight / 2 - 2);
  ctx.stroke();

  // Exhaust pipes on rear (Panther had twin exhausts)
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.roundRect(bodyWidth / 2 - 3, -bodyHeight / 4, 4, 3, 1);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(bodyWidth / 2 - 3, bodyHeight / 4 - 3, 4, 3, 1);
  ctx.fill();

  // Rivet/bolt details along armor seams
  ctx.fillStyle = darkenColor(tankColor, 0.3);
  const rivetPositions: Array<[number, number]> = [
    [-bodyWidth / 2 + slopeAngle, -bodyHeight / 2 + 3],
    [bodyWidth / 2 - slopeAngle, -bodyHeight / 2 + 3],
    [-bodyWidth / 2 + 3, bodyHeight / 2 - 3],
    [bodyWidth / 2 - 3, bodyHeight / 2 - 3],
    [superstructureX - superstructureWidth / 2 + 6, -bodyHeight / 2 - superstructureHeight + 3],
    [superstructureX + superstructureWidth / 2 - 4, -bodyHeight / 2 - superstructureHeight + 3],
  ];
  for (const [rx, ry] of rivetPositions) {
    ctx.beginPath();
    ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw rank insignia on tank body (centered)
  if (chevronCount > 0) {
    renderChevrons(ctx, chevronCount);
  }
  if (starCount > 0) {
    renderStars(ctx, starCount);
  }

  // Panther turret position - offset toward rear of hull
  const turretOffsetX = bodyWidth * 0.08; // Slight offset towards rear (positive X is rear)
  const turretY = -bodyHeight / 2 - superstructureHeight;

  // Draw turret barrel FIRST (behind turret body)
  ctx.save();
  // Move to turret center before rotating
  ctx.translate(turretOffsetX, turretY);
  // Angle is measured from vertical: 0 = straight up, positive = left, negative = right
  // Range: -120 to +120 degrees
  // Convert to canvas rotation: add 90° to shift from vertical to horizontal reference
  const turretAngle = -(90 + angle) * (Math.PI / 180);
  ctx.rotate(turretAngle);

  // Draw impressive cannon with detailed barrel
  renderCannon(ctx, turretLength, turretWidth, darkerColor);

  ctx.restore();

  // Draw Panther-style angular turret (hexagonal shape)
  const turretWidth2 = bodyWidth * 0.32;
  const turretHeight = bodyHeight * 0.45;
  const turretGradient = createMetallicGradient(
    ctx,
    turretOffsetX - turretWidth2 / 2, turretY - turretHeight / 2,
    turretWidth2, turretHeight,
    darkerColor
  );
  ctx.fillStyle = turretGradient;

  // Panther turret - angular hexagonal shape with sloped front
  ctx.beginPath();
  // Start at front-bottom of turret
  ctx.moveTo(turretOffsetX - turretWidth2 / 2, turretY);
  // Sloped front face
  ctx.lineTo(turretOffsetX - turretWidth2 / 2 + 3, turretY - turretHeight);
  // Top face
  ctx.lineTo(turretOffsetX + turretWidth2 / 2 - 2, turretY - turretHeight);
  // Sloped rear face
  ctx.lineTo(turretOffsetX + turretWidth2 / 2, turretY);
  ctx.closePath();
  ctx.fill();

  // Turret top highlight
  ctx.strokeStyle = lightenColor(darkerColor, 0.4);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(turretOffsetX - turretWidth2 / 2 + 4, turretY - turretHeight + 1);
  ctx.lineTo(turretOffsetX + turretWidth2 / 2 - 3, turretY - turretHeight + 1);
  ctx.stroke();

  // Commander's cupola (small dome on top)
  const cupolaRadius = 4;
  const cupolaX = turretOffsetX + turretWidth2 * 0.2;
  const cupolaY = turretY - turretHeight;
  const cupolaGradient = createDomeGradient(ctx, cupolaX, cupolaY, cupolaRadius, darkerColor);
  ctx.fillStyle = cupolaGradient;
  ctx.beginPath();
  ctx.arc(cupolaX, cupolaY, cupolaRadius, Math.PI, 0);
  ctx.fill();

  // Draw health bar if not at full health (positioned above cupola)
  if (health < 100) {
    const healthBarWidth = bodyWidth;
    const healthBarHeight = 4;
    // Position above the cupola (turret + cupola + padding)
    const healthBarY = turretY - turretHeight - cupolaRadius - 8;

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
 * Get enemy colors that contrast with the player color.
 * Returns an array of colors for multiple enemies.
 */
function getEnemyColors(playerColor: TankColor, count: EnemyCount): TankColor[] {
  const allColors: TankColor[] = ['red', 'blue', 'green', 'yellow'];
  // Remove player's color and return remaining colors (cycling if needed)
  const availableColors = allColors.filter(c => c !== playerColor);
  const colors: TankColor[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(availableColors[i % availableColors.length]!);
  }
  return colors;
}

/**
 * Create initial tank states for player and enemies.
 * Places player at left, enemies distributed across the right portion of terrain.
 */
export function createInitialTanks(
  terrain: TerrainData,
  playerColor: TankColor,
  enemyCount: EnemyCount
): TankState[] {
  const tanks: TankState[] = [];

  // Place player at the left side (15% from left edge)
  const playerX = Math.floor(terrain.width * 0.15);
  const playerPosition = calculateTankPosition(terrain, playerX);

  tanks.push({
    id: 'player',
    position: playerPosition,
    health: 100,
    angle: -45, // Aiming right (toward enemies)
    power: 50,
    color: playerColor,
    isActive: true,
    queuedShot: null,
    isReady: false,
  });

  // Get colors for enemies
  const enemyColors = getEnemyColors(playerColor, enemyCount);

  // Distribute enemies across the right portion of the terrain (35% to 90%)
  const enemyStartX = 0.35;
  const enemyEndX = 0.90;
  const enemySpread = enemyEndX - enemyStartX;

  for (let i = 0; i < enemyCount; i++) {
    // Calculate position for this enemy
    // For 1 enemy: place at 85% (middle-right)
    // For multiple: distribute evenly across the range
    let xPercent: number;
    if (enemyCount === 1) {
      xPercent = 0.85;
    } else {
      xPercent = enemyStartX + (enemySpread * i) / (enemyCount - 1);
    }

    const enemyX = Math.floor(terrain.width * xPercent);
    const enemyPosition = calculateTankPosition(terrain, enemyX);

    tanks.push({
      id: `enemy-${i + 1}`,
      position: enemyPosition,
      health: 100,
      angle: 45, // Aiming left (toward player)
      power: 50,
      color: enemyColors[i]!,
      isActive: false,
      queuedShot: null,
      isReady: false,
    });
  }

  return tanks;
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
  const chevronWidth = 5.6;
  const chevronHeight = 2.4;
  const chevronSpacing = 0.94;
  const verticalOffset = 2; // Lower on tank body
  const totalHeight = count * (chevronHeight + chevronSpacing) - chevronSpacing;
  const startY = -totalHeight / 2 + verticalOffset;

  ctx.save();
  ctx.strokeStyle = '#ffd700'; // Gold color for chevrons
  ctx.lineWidth = 0.94;
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

/**
 * Render rank stars on tank body.
 * Stars indicate higher AI difficulty ranks (centurion, primus).
 */
function renderStars(
  ctx: CanvasRenderingContext2D,
  count: number
): void {
  const starSize = 5;
  const starSpacing = 7.5;
  const verticalOffset = 2; // Lower on tank body
  const totalWidth = count * starSpacing - (starSpacing - starSize);
  const startX = -totalWidth / 2 + starSize / 2;

  ctx.save();
  ctx.fillStyle = '#ffd700'; // Gold color for stars

  // Add subtle glow effect
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 2;

  for (let i = 0; i < count; i++) {
    const x = startX + i * starSpacing;
    drawStar(ctx, x, verticalOffset, starSize, 5);
  }

  ctx.restore();
}

/**
 * Draw a 5-pointed star at the given position.
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  points: number
): void {
  const outerRadius = size / 2;
  const innerRadius = outerRadius * 0.4;
  const angleStep = Math.PI / points;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Render dust/dirt particles around the tank tracks.
 * Creates a subtle grounding effect with small debris particles.
 */
function renderGroundDust(
  ctx: CanvasRenderingContext2D,
  bodyWidth: number,
  bodyHeight: number,
  wheelRadius: number
): void {
  ctx.save();

  // Use a seeded pattern for consistent dust placement
  const dustPositions = [
    { x: -bodyWidth / 2 - 6, y: bodyHeight / 2 + wheelRadius - 1, size: 1.5 },
    { x: -bodyWidth / 2 - 3, y: bodyHeight / 2 + wheelRadius + 1, size: 1 },
    { x: -bodyWidth / 2 + 2, y: bodyHeight / 2 + wheelRadius + 2, size: 0.8 },
    { x: bodyWidth / 2 + 6, y: bodyHeight / 2 + wheelRadius - 1, size: 1.5 },
    { x: bodyWidth / 2 + 3, y: bodyHeight / 2 + wheelRadius + 1, size: 1 },
    { x: bodyWidth / 2 - 2, y: bodyHeight / 2 + wheelRadius + 2, size: 0.8 },
    { x: -bodyWidth / 4, y: bodyHeight / 2 + wheelRadius + 3, size: 0.6 },
    { x: bodyWidth / 4, y: bodyHeight / 2 + wheelRadius + 3, size: 0.6 },
    { x: 0, y: bodyHeight / 2 + wheelRadius + 2, size: 0.7 },
  ];

  // Draw dust particles with varying opacity
  for (const dust of dustPositions) {
    const opacity = 0.2 + dust.size * 0.15;
    ctx.fillStyle = `rgba(101, 67, 33, ${opacity})`; // Brown dirt color
    ctx.beginPath();
    ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add small dirt streaks near track edges
  ctx.strokeStyle = 'rgba(101, 67, 33, 0.15)';
  ctx.lineWidth = 0.5;

  // Left track dirt
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 - 4, bodyHeight / 2 + wheelRadius);
  ctx.lineTo(-bodyWidth / 2 - 8, bodyHeight / 2 + wheelRadius + 3);
  ctx.stroke();

  // Right track dirt
  ctx.beginPath();
  ctx.moveTo(bodyWidth / 2 + 4, bodyHeight / 2 + wheelRadius);
  ctx.lineTo(bodyWidth / 2 + 8, bodyHeight / 2 + wheelRadius + 3);
  ctx.stroke();

  ctx.restore();
}

/**
 * Render an impressive cannon with detailed barrel, muzzle brake, and heat glow.
 * Creates a powerful, dangerous-looking weapon with metallic sheen.
 */
function renderCannon(
  ctx: CanvasRenderingContext2D,
  turretLength: number,
  turretWidth: number,
  baseColor: string
): void {
  ctx.save();

  // Cannon dimensions - tapered design
  const baseWidth = turretWidth * 1.3;  // Thicker at base
  const midWidth = turretWidth * 1.1;   // Slightly thinner in middle
  const tipWidth = turretWidth * 0.85;  // Thinner at tip before muzzle brake
  const muzzleBrakeLength = 6;
  const muzzleBrakeWidth = turretWidth * 1.5;
  const barrelLength = turretLength - muzzleBrakeLength;

  // Heat glow effect at muzzle (draw first, behind everything)
  const glowGradient = ctx.createRadialGradient(
    turretLength, 0, 0,
    turretLength, 0, turretWidth * 2
  );
  glowGradient.addColorStop(0, 'rgba(255, 100, 50, 0.4)');
  glowGradient.addColorStop(0.3, 'rgba(255, 60, 20, 0.2)');
  glowGradient.addColorStop(0.6, 'rgba(255, 30, 0, 0.1)');
  glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(turretLength, 0, turretWidth * 2, 0, Math.PI * 2);
  ctx.fill();

  // Main barrel - tapered shape using path
  const barrelGradient = ctx.createLinearGradient(0, -baseWidth / 2, 0, baseWidth / 2);
  const highlight = lightenColor(baseColor, 0.5);
  const midLight = lightenColor(baseColor, 0.2);
  const shadow = darkenColor(baseColor, 0.4);
  barrelGradient.addColorStop(0, highlight);
  barrelGradient.addColorStop(0.2, midLight);
  barrelGradient.addColorStop(0.5, baseColor);
  barrelGradient.addColorStop(0.8, darkenColor(baseColor, 0.2));
  barrelGradient.addColorStop(1, shadow);

  ctx.fillStyle = barrelGradient;
  ctx.beginPath();
  // Start at base (thick end)
  ctx.moveTo(0, -baseWidth / 2);
  // Curve to middle section
  ctx.quadraticCurveTo(barrelLength * 0.3, -midWidth / 2, barrelLength * 0.5, -midWidth / 2);
  // Taper to tip
  ctx.lineTo(barrelLength, -tipWidth / 2);
  // Bottom edge (mirror)
  ctx.lineTo(barrelLength, tipWidth / 2);
  ctx.lineTo(barrelLength * 0.5, midWidth / 2);
  ctx.quadraticCurveTo(barrelLength * 0.3, midWidth / 2, 0, baseWidth / 2);
  ctx.closePath();
  ctx.fill();

  // Barrel top highlight (specular reflection)
  ctx.strokeStyle = lightenColor(baseColor, 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, -baseWidth / 2 + 1);
  ctx.quadraticCurveTo(barrelLength * 0.3, -midWidth / 2 + 1, barrelLength * 0.7, -tipWidth / 2 + 1);
  ctx.stroke();

  // Reinforcing rings along barrel
  const ringPositions = [0.15, 0.4, 0.7];
  for (const pos of ringPositions) {
    const ringX = barrelLength * pos;
    const ringWidth = baseWidth - (baseWidth - tipWidth) * pos;

    // Ring shadow
    ctx.strokeStyle = darkenColor(baseColor, 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ringX, -ringWidth / 2 - 0.5);
    ctx.lineTo(ringX, ringWidth / 2 + 0.5);
    ctx.stroke();

    // Ring highlight
    ctx.strokeStyle = lightenColor(baseColor, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ringX + 1, -ringWidth / 2);
    ctx.lineTo(ringX + 1, ringWidth / 2);
    ctx.stroke();
  }

  // Muzzle brake - wider section at end with slots
  const muzzleX = barrelLength;
  const muzzleGradient = ctx.createLinearGradient(0, -muzzleBrakeWidth / 2, 0, muzzleBrakeWidth / 2);
  muzzleGradient.addColorStop(0, '#4a4a4a');
  muzzleGradient.addColorStop(0.3, '#3a3a3a');
  muzzleGradient.addColorStop(0.5, '#333');
  muzzleGradient.addColorStop(0.7, '#2a2a2a');
  muzzleGradient.addColorStop(1, '#1a1a1a');

  ctx.fillStyle = muzzleGradient;
  ctx.beginPath();
  ctx.roundRect(muzzleX, -muzzleBrakeWidth / 2, muzzleBrakeLength, muzzleBrakeWidth, 1);
  ctx.fill();

  // Muzzle brake slots (vents)
  ctx.fillStyle = '#111';
  const slotWidth = 1.5;
  const slotHeight = muzzleBrakeWidth * 0.3;
  const slotSpacing = 2;
  for (let i = 0; i < 2; i++) {
    const slotX = muzzleX + 1.5 + i * slotSpacing;
    // Top slot
    ctx.fillRect(slotX, -muzzleBrakeWidth / 2 + 1, slotWidth, slotHeight);
    // Bottom slot
    ctx.fillRect(slotX, muzzleBrakeWidth / 2 - slotHeight - 1, slotWidth, slotHeight);
  }

  // Muzzle brake edge highlight
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(muzzleX, -muzzleBrakeWidth / 2 + 1);
  ctx.lineTo(muzzleX + muzzleBrakeLength - 1, -muzzleBrakeWidth / 2 + 1);
  ctx.stroke();

  // Muzzle opening with depth effect
  const muzzleOpeningRadius = tipWidth / 2.5;
  const muzzleEndX = turretLength;

  // Outer ring (bore)
  const boreGradient = ctx.createRadialGradient(
    muzzleEndX, 0, 0,
    muzzleEndX, 0, muzzleOpeningRadius * 1.5
  );
  boreGradient.addColorStop(0, '#000');
  boreGradient.addColorStop(0.5, '#111');
  boreGradient.addColorStop(1, '#222');
  ctx.fillStyle = boreGradient;
  ctx.beginPath();
  ctx.arc(muzzleEndX, 0, muzzleOpeningRadius * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Inner bore (deep black)
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(muzzleEndX, 0, muzzleOpeningRadius * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Inner heat glow in bore
  const innerGlow = ctx.createRadialGradient(
    muzzleEndX, 0, 0,
    muzzleEndX, 0, muzzleOpeningRadius * 0.6
  );
  innerGlow.addColorStop(0, 'rgba(255, 80, 30, 0.5)');
  innerGlow.addColorStop(0.5, 'rgba(255, 40, 10, 0.2)');
  innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = innerGlow;
  ctx.beginPath();
  ctx.arc(muzzleEndX, 0, muzzleOpeningRadius * 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
