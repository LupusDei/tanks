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
  orange: '#ff8844',
  purple: '#aa44ff',
  cyan: '#44ffff',
  pink: '#ff66aa',
  white: '#dddddd',
  brown: '#8b5a2b',
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
  const { position, angle, color, health, stunTurnsRemaining } = tank;
  const isStunned = stunTurnsRemaining > 0;
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

  // Track assembly - positioned BELOW the hull
  const trackYOffset = bodyHeight / 2 + wheelRadius * 0.5; // Tracks sit below hull
  const trackGradient = ctx.createLinearGradient(
    -bodyWidth / 2, trackYOffset - wheelRadius,
    -bodyWidth / 2, trackYOffset + wheelRadius
  );
  trackGradient.addColorStop(0, '#1a1a1a');
  trackGradient.addColorStop(0.5, '#2a2a2a');
  trackGradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = trackGradient;

  // Track base (single rounded rectangle for tracks)
  ctx.beginPath();
  ctx.roundRect(
    -bodyWidth / 2 - 2,
    trackYOffset - wheelRadius * 0.7,
    bodyWidth + 4,
    wheelRadius * 1.4,
    3
  );
  ctx.fill();

  // Draw track link segments
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1;
  for (let i = -bodyWidth / 2; i < bodyWidth / 2; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, trackYOffset - wheelRadius * 0.6);
    ctx.lineTo(i, trackYOffset + wheelRadius * 0.6);
    ctx.stroke();
  }

  // Draw road wheels (6 wheels evenly spaced)
  const wheelColor = '#555';
  const numWheels = 6;
  const wheelSpacing = (bodyWidth - wheelRadius * 2) / (numWheels - 1);
  const startX = -bodyWidth / 2 + wheelRadius;

  for (let i = 0; i < numWheels; i++) {
    const wheelX = startX + i * wheelSpacing;
    const wheelY = trackYOffset;

    // Wheel body
    const wheelGradient = createDomeGradient(ctx, wheelX, wheelY, wheelRadius * 0.85, wheelColor);
    ctx.fillStyle = wheelGradient;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Hub cap
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Panther-style tank body with angled front glacis
  const bodyGradient = createMetallicGradient(
    ctx,
    -bodyWidth / 2, -bodyHeight / 2,
    bodyWidth, bodyHeight,
    tankColor
  );
  ctx.fillStyle = bodyGradient;

  // Panther hull dimensions
  const frontExtension = 6;    // How far front extends past tracks
  const lowerPlateHeight = 6;  // Vertical section at bottom front
  const glacisLength = 10;     // Horizontal length of the angled glacis

  // Hull shape - Panther-style with vertical lower plate + angled upper glacis
  ctx.beginPath();
  // Start at front bottom (extends past tracks)
  ctx.moveTo(-bodyWidth / 2 - frontExtension, bodyHeight / 2);
  // Vertical lower front plate
  ctx.lineTo(-bodyWidth / 2 - frontExtension, bodyHeight / 2 - lowerPlateHeight);
  // Angled upper glacis (rises to top deck)
  ctx.lineTo(-bodyWidth / 2 - frontExtension + glacisLength, -bodyHeight / 2);
  // Flat top deck
  ctx.lineTo(bodyWidth / 2, -bodyHeight / 2);
  // Rear (vertical)
  ctx.lineTo(bodyWidth / 2, bodyHeight / 2);
  // Bottom
  ctx.closePath();
  ctx.fill();

  // Front glacis highlight (angled armor face)
  ctx.strokeStyle = lightenColor(tankColor, 0.4);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 - frontExtension + 1, bodyHeight / 2 - lowerPlateHeight);
  ctx.lineTo(-bodyWidth / 2 - frontExtension + glacisLength - 1, -bodyHeight / 2 + 2);
  ctx.stroke();

  // Vertical lower plate edge highlight
  ctx.strokeStyle = lightenColor(tankColor, 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 - frontExtension + 1, bodyHeight / 2 - 1);
  ctx.lineTo(-bodyWidth / 2 - frontExtension + 1, bodyHeight / 2 - lowerPlateHeight + 1);
  ctx.stroke();

  // Body edge highlight (top edge)
  ctx.strokeStyle = lightenColor(tankColor, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 - frontExtension + glacisLength + 2, -bodyHeight / 2 + 1);
  ctx.lineTo(bodyWidth / 2 - 2, -bodyHeight / 2 + 1);
  ctx.stroke();

  // Body bottom edge shadow
  ctx.strokeStyle = darkenColor(tankColor, 0.5);
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2, bodyHeight / 2 - 1);
  ctx.lineTo(bodyWidth / 2 - 4, bodyHeight / 2 - 1);
  ctx.stroke();

  // Panel line details
  ctx.strokeStyle = darkenColor(tankColor, 0.4);
  ctx.lineWidth = 0.5;
  // Horizontal panel line
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 + 2, 0);
  ctx.lineTo(bodyWidth / 2, 0);
  ctx.stroke();
  // Vertical panel lines
  ctx.beginPath();
  ctx.moveTo(0, -bodyHeight / 2 + 2);
  ctx.lineTo(0, bodyHeight / 2 - 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bodyWidth / 4, -bodyHeight / 2 + 2);
  ctx.lineTo(bodyWidth / 4, bodyHeight / 2 - 2);
  ctx.stroke();

  // Rivet details along armor plates
  ctx.fillStyle = darkenColor(tankColor, 0.3);
  const rivetPositions: Array<[number, number]> = [
    [-bodyWidth / 2 - frontExtension + glacisLength + 2, -bodyHeight / 2 + 3],
    [bodyWidth / 2 - 4, -bodyHeight / 2 + 3],
    [-bodyWidth / 2 + 4, bodyHeight / 2 - 3],
    [bodyWidth / 2 - 4, bodyHeight / 2 - 3],
  ];
  for (const [rx, ry] of rivetPositions) {
    ctx.beginPath();
    ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw rank insignia on tank body (centered)
  if (chevronCount > 0) {
    renderChevrons(ctx, chevronCount);
  }
  if (starCount > 0) {
    renderStars(ctx, starCount);
  }

  // Turret - CENTERED on tank
  const turretY = -bodyHeight / 4;

  // Draw turret barrel FIRST (behind dome)
  ctx.save();
  ctx.translate(0, turretY); // Centered
  // Angle is measured from vertical: 0 = straight up, positive = left, negative = right
  const turretAngle = -(90 + angle) * (Math.PI / 180);
  ctx.rotate(turretAngle);

  // Draw cannon
  renderCannon(ctx, turretLength, turretWidth, darkerColor);

  ctx.restore();

  // Draw turret dome - CENTERED
  const domeRadius = bodyWidth / 4;
  const domeGradient = createDomeGradient(ctx, 0, turretY, domeRadius, darkerColor);
  ctx.fillStyle = domeGradient;
  ctx.beginPath();
  ctx.arc(0, turretY, domeRadius, Math.PI, 0);
  ctx.fill();

  // Dome rim highlight
  ctx.strokeStyle = lightenColor(darkerColor, 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, turretY, domeRadius - 1, Math.PI + 0.2, -0.2);
  ctx.stroke();

  // Commander's cupola (small dome on top, centered)
  const cupolaRadius = 3;
  const cupolaY = turretY - domeRadius + 2;
  const cupolaGradient = createDomeGradient(ctx, 0, cupolaY, cupolaRadius, darkerColor);
  ctx.fillStyle = cupolaGradient;
  ctx.beginPath();
  ctx.arc(0, cupolaY, cupolaRadius, Math.PI, 0);
  ctx.fill();

  // Draw health bar if not at full health (positioned above tank)
  if (health < 100) {
    const healthBarWidth = bodyWidth;
    const healthBarHeight = 4;
    // Position above the dome
    const healthBarY = turretY - domeRadius - 8;

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(-healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);

    // Health fill
    const healthPercent = Math.max(0, health) / 100;
    const healthColor = health > 50 ? '#44ff44' : health > 25 ? '#ffff44' : '#ff4444';
    ctx.fillStyle = healthColor;
    ctx.fillRect(-healthBarWidth / 2, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
  }

  // Draw stun effect if tank is stunned
  if (isStunned) {
    renderStunEffect(ctx, bodyWidth, bodyHeight, wheelRadius, domeRadius, turretY);
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
    killedByWeapon: null,
    stunTurnsRemaining: 0,
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
      killedByWeapon: null,
      stunTurnsRemaining: 0,
    });
  }

  return tanks;
}

/**
 * Get a contrasting color for the opponent based on player's color choice.
 */
export function getOpponentColor(playerColor: TankColor): TankColor {
  const contrastMap: Record<TankColor, TankColor> = {
    red: 'cyan',
    blue: 'orange',
    green: 'purple',
    yellow: 'brown',
    orange: 'blue',
    purple: 'green',
    cyan: 'red',
    pink: 'green',
    white: 'brown',
    brown: 'white',
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
 * Render electric stun effect around a tank.
 * Creates animated-looking electric arcs and a blue glow.
 */
function renderStunEffect(
  ctx: CanvasRenderingContext2D,
  bodyWidth: number,
  bodyHeight: number,
  wheelRadius: number,
  domeRadius: number,
  turretY: number
): void {
  ctx.save();

  // Use time-based variation for animation effect
  const time = Date.now() * 0.01;

  // Blue electric glow around tank
  const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyWidth);
  glowGradient.addColorStop(0, 'rgba(0, 150, 255, 0.3)');
  glowGradient.addColorStop(0.5, 'rgba(0, 100, 255, 0.15)');
  glowGradient.addColorStop(1, 'rgba(0, 50, 255, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.ellipse(0, bodyHeight / 4, bodyWidth * 0.8, bodyHeight + wheelRadius, 0, 0, Math.PI * 2);
  ctx.fill();

  // Electric arcs (lightning bolts)
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 8;

  // Draw several electric arcs at varying positions
  const arcCount = 4;
  for (let i = 0; i < arcCount; i++) {
    const arcAngle = (i / arcCount) * Math.PI * 2 + time * 0.3;
    const startX = Math.cos(arcAngle) * (bodyWidth / 2 - 5);
    const startY = Math.sin(arcAngle) * (bodyHeight / 2) + turretY / 2;
    const endX = Math.cos(arcAngle + 0.5) * (bodyWidth / 2 + 10);
    const endY = Math.sin(arcAngle + 0.5) * (bodyHeight / 2 + wheelRadius);

    // Draw zigzag lightning
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    const segments = 3;
    for (let j = 1; j <= segments; j++) {
      const t = j / segments;
      const midX = startX + (endX - startX) * t;
      const midY = startY + (endY - startY) * t;
      const offsetX = (Math.sin(time * 5 + i + j) * 4);
      const offsetY = (Math.cos(time * 5 + i + j) * 3);
      ctx.lineTo(midX + offsetX, midY + offsetY);
    }
    ctx.stroke();
  }

  // Spark particles
  ctx.fillStyle = '#00ffff';
  ctx.shadowBlur = 4;
  const sparkCount = 6;
  for (let i = 0; i < sparkCount; i++) {
    const sparkAngle = (i / sparkCount) * Math.PI * 2 + time * 0.5;
    const sparkDist = bodyWidth / 2 + Math.sin(time * 3 + i) * 8;
    const sparkX = Math.cos(sparkAngle) * sparkDist;
    const sparkY = Math.sin(sparkAngle) * (bodyHeight / 2 + wheelRadius / 2);
    const sparkSize = 1.5 + Math.sin(time * 7 + i) * 0.5;

    ctx.beginPath();
    ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stun indicator text/icon above tank
  const indicatorY = turretY - domeRadius - 16;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = '#00ffff';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 6;
  ctx.fillText('STUNNED', 0, indicatorY);

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
