import { useRef, useEffect, useCallback } from 'react';

/**
 * Industrial metal background component with animated machinery effects.
 * Renders a metal frame around the game canvas with:
 * - Brushed steel texture
 * - Sliding metal plates with hydraulic pistons
 * - Rivets, dents, bullet holes
 * - Rust patches, burn marks, mud splatters
 * - Steam/smoke effects
 * - Pulsing warning lights
 */

interface MetalBackgroundProps {
  /** Total width including frame */
  width: number;
  /** Total height including frame */
  height: number;
  /** Width of the inner game area */
  innerWidth: number;
  /** Height of the inner game area */
  innerHeight: number;
  /** Frame border width (pixels) */
  borderWidth?: number;
}

// Color palette
const COLORS = {
  baseMetal: '#4a4a50',
  metalLight: '#6a6a70',
  metalDark: '#3a3a40',
  rivetBase: '#3a3a40',
  rivetHighlight: '#7a7a80',
  dent: '#2a2a30',
  rust: '#8b4513',
  rustLight: '#a0522d',
  burnCenter: '#1a1a1a',
  burnEdge: '#3a3020',
  mud: '#5c4033',
  mudDark: '#3a2a1a',
  warning: '#ff3300',
  warningDim: '#661400',
  steam: 'rgba(200, 200, 200, 0.3)',
  pistonBody: '#555555',
  pistonShaft: '#888888',
};

// Animation configuration
const ANIMATION = {
  plateCycleDuration: 5000, // 5 seconds per cycle
  steamInterval: 3000, // Steam burst every 3 seconds
  warningPulseRate: 1000, // 1 second pulse
};

interface Rivet {
  x: number;
  y: number;
  size: number;
}

interface Plate {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'horizontal' | 'vertical';
  phaseOffset: number; // 0-1 for staggered animation
  maxSlide: number;
}

interface Dent {
  x: number;
  y: number;
  size: number;
  rotation: number;
}

interface BulletHole {
  x: number;
  y: number;
  size: number;
}

interface RustPatch {
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
}

interface BurnMark {
  x: number;
  y: number;
  size: number;
}

interface MudSplatter {
  x: number;
  y: number;
  size: number;
  rotation: number;
}

interface SteamVent {
  x: number;
  y: number;
  particles: SteamParticle[];
  lastBurst: number;
}

interface SteamParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  life: number;
}

interface WarningLight {
  x: number;
  y: number;
  size: number;
}

interface Piston {
  x: number;
  y: number;
  length: number;
  direction: 'horizontal' | 'vertical';
  plateIndex: number;
}

export function MetalBackground({
  width,
  height,
  innerWidth,
  innerHeight,
  borderWidth = 60,
}: MetalBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const elementsRef = useRef<{
    rivets: Rivet[];
    plates: Plate[];
    dents: Dent[];
    bulletHoles: BulletHole[];
    rustPatches: RustPatch[];
    burnMarks: BurnMark[];
    mudSplatters: MudSplatter[];
    steamVents: SteamVent[];
    warningLights: WarningLight[];
    pistons: Piston[];
  } | null>(null);

  // Calculate inner area position
  const innerX = (width - innerWidth) / 2;
  const innerY = (height - innerHeight) / 2;

  // Generate static elements once
  const generateElements = useCallback(() => {
    const rivets: Rivet[] = [];
    const plates: Plate[] = [];
    const dents: Dent[] = [];
    const bulletHoles: BulletHole[] = [];
    const rustPatches: RustPatch[] = [];
    const burnMarks: BurnMark[] = [];
    const mudSplatters: MudSplatter[] = [];
    const steamVents: SteamVent[] = [];
    const warningLights: WarningLight[] = [];
    const pistons: Piston[] = [];

    // Corner rivets (large)
    const cornerOffset = 20;
    const rivetSize = 12;
    rivets.push({ x: cornerOffset, y: cornerOffset, size: rivetSize });
    rivets.push({ x: width - cornerOffset, y: cornerOffset, size: rivetSize });
    rivets.push({ x: cornerOffset, y: height - cornerOffset, size: rivetSize });
    rivets.push({ x: width - cornerOffset, y: height - cornerOffset, size: rivetSize });

    // Edge rivets (smaller, along the frame)
    const smallRivetSize = 6;
    const rivetSpacing = 50;

    // Top and bottom edges
    for (let x = cornerOffset + rivetSpacing; x < width - cornerOffset; x += rivetSpacing) {
      rivets.push({ x, y: borderWidth / 2, size: smallRivetSize });
      rivets.push({ x, y: height - borderWidth / 2, size: smallRivetSize });
    }

    // Left and right edges
    for (let y = cornerOffset + rivetSpacing; y < height - cornerOffset; y += rivetSpacing) {
      rivets.push({ x: borderWidth / 2, y, size: smallRivetSize });
      rivets.push({ x: width - borderWidth / 2, y, size: smallRivetSize });
    }

    // Metal plates (horizontal, top and bottom)
    const plateWidth = 100;
    const plateHeight = 25;
    let plateIndex = 0;

    for (let x = borderWidth; x < width - borderWidth - plateWidth; x += plateWidth + 20) {
      plates.push({
        x,
        y: 15,
        width: plateWidth,
        height: plateHeight,
        direction: 'horizontal',
        phaseOffset: (plateIndex * 0.2) % 1,
        maxSlide: 15,
      });
      plates.push({
        x,
        y: height - 15 - plateHeight,
        width: plateWidth,
        height: plateHeight,
        direction: 'horizontal',
        phaseOffset: ((plateIndex + 3) * 0.2) % 1,
        maxSlide: 15,
      });
      plateIndex++;
    }

    // Metal plates (vertical, left and right)
    for (let y = borderWidth; y < height - borderWidth - plateWidth; y += plateWidth + 20) {
      plates.push({
        x: 10,
        y,
        width: plateHeight,
        height: plateWidth,
        direction: 'vertical',
        phaseOffset: (plateIndex * 0.2) % 1,
        maxSlide: 12,
      });
      plates.push({
        x: width - 10 - plateHeight,
        y,
        width: plateHeight,
        height: plateWidth,
        direction: 'vertical',
        phaseOffset: ((plateIndex + 2) * 0.2) % 1,
        maxSlide: 12,
      });
      plateIndex++;
    }

    // Pistons at corners
    pistons.push({ x: borderWidth - 10, y: borderWidth - 10, length: 30, direction: 'vertical', plateIndex: 0 });
    pistons.push({ x: width - borderWidth + 10, y: borderWidth - 10, length: 30, direction: 'vertical', plateIndex: 1 });
    pistons.push({ x: borderWidth - 10, y: height - borderWidth + 10, length: 30, direction: 'vertical', plateIndex: 2 });
    pistons.push({ x: width - borderWidth + 10, y: height - borderWidth + 10, length: 30, direction: 'vertical', plateIndex: 3 });

    // Random dents
    for (let i = 0; i < 8; i++) {
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;

      switch (side) {
        case 0: // Top
          x = borderWidth + Math.random() * (width - 2 * borderWidth);
          y = Math.random() * borderWidth;
          break;
        case 1: // Bottom
          x = borderWidth + Math.random() * (width - 2 * borderWidth);
          y = height - Math.random() * borderWidth;
          break;
        case 2: // Left
          x = Math.random() * borderWidth;
          y = borderWidth + Math.random() * (height - 2 * borderWidth);
          break;
        default: // Right
          x = width - Math.random() * borderWidth;
          y = borderWidth + Math.random() * (height - 2 * borderWidth);
      }

      dents.push({
        x,
        y,
        size: 8 + Math.random() * 12,
        rotation: Math.random() * Math.PI * 2,
      });
    }

    // Bullet holes
    for (let i = 0; i < 5; i++) {
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;

      switch (side) {
        case 0:
          x = borderWidth + Math.random() * (width - 2 * borderWidth);
          y = 10 + Math.random() * (borderWidth - 20);
          break;
        case 1:
          x = borderWidth + Math.random() * (width - 2 * borderWidth);
          y = height - borderWidth + 10 + Math.random() * (borderWidth - 20);
          break;
        case 2:
          x = 10 + Math.random() * (borderWidth - 20);
          y = borderWidth + Math.random() * (height - 2 * borderWidth);
          break;
        default:
          x = width - borderWidth + 10 + Math.random() * (borderWidth - 20);
          y = borderWidth + Math.random() * (height - 2 * borderWidth);
      }

      bulletHoles.push({ x, y, size: 4 + Math.random() * 6 });
    }

    // Rust patches
    for (let i = 0; i < 6; i++) {
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;

      switch (side) {
        case 0:
          x = Math.random() * width;
          y = Math.random() * borderWidth;
          break;
        case 1:
          x = Math.random() * width;
          y = height - borderWidth + Math.random() * borderWidth;
          break;
        case 2:
          x = Math.random() * borderWidth;
          y = Math.random() * height;
          break;
        default:
          x = width - borderWidth + Math.random() * borderWidth;
          y = Math.random() * height;
      }

      rustPatches.push({
        x,
        y,
        width: 20 + Math.random() * 40,
        height: 15 + Math.random() * 25,
        intensity: 0.3 + Math.random() * 0.5,
      });
    }

    // Burn marks
    for (let i = 0; i < 4; i++) {
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;

      switch (side) {
        case 0:
          x = borderWidth + Math.random() * (width - 2 * borderWidth);
          y = Math.random() * borderWidth;
          break;
        case 1:
          x = borderWidth + Math.random() * (width - 2 * borderWidth);
          y = height - Math.random() * borderWidth;
          break;
        case 2:
          x = Math.random() * borderWidth;
          y = borderWidth + Math.random() * (height - 2 * borderWidth);
          break;
        default:
          x = width - Math.random() * borderWidth;
          y = borderWidth + Math.random() * (height - 2 * borderWidth);
      }

      burnMarks.push({ x, y, size: 15 + Math.random() * 25 });
    }

    // Mud splatters
    for (let i = 0; i < 5; i++) {
      const x = borderWidth / 2 + Math.random() * (width - borderWidth);
      const y = height - borderWidth + Math.random() * (borderWidth - 10);
      mudSplatters.push({
        x,
        y,
        size: 10 + Math.random() * 20,
        rotation: Math.random() * Math.PI * 2,
      });
    }

    // Steam vents (at bullet holes)
    bulletHoles.forEach((hole, i) => {
      if (i < 3) { // Only first 3 holes have steam
        steamVents.push({
          x: hole.x,
          y: hole.y,
          particles: [],
          lastBurst: 0,
        });
      }
    });

    // Warning lights
    warningLights.push({ x: cornerOffset + 5, y: cornerOffset + 35, size: 6 });
    warningLights.push({ x: width - cornerOffset - 5, y: cornerOffset + 35, size: 6 });

    return {
      rivets,
      plates,
      dents,
      bulletHoles,
      rustPatches,
      burnMarks,
      mudSplatters,
      steamVents,
      warningLights,
      pistons,
    };
  }, [width, height, borderWidth]);

  // Render static elements to offscreen canvas
  const renderStaticElements = useCallback((ctx: CanvasRenderingContext2D) => {
    const elements = elementsRef.current;
    if (!elements) return;

    // Brushed steel base
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, COLORS.baseMetal);
    gradient.addColorStop(0.3, COLORS.metalLight);
    gradient.addColorStop(0.5, COLORS.baseMetal);
    gradient.addColorStop(0.7, COLORS.metalLight);
    gradient.addColorStop(1, COLORS.baseMetal);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Brushed texture lines
    ctx.strokeStyle = 'rgba(100, 100, 110, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width + height; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(0, i);
      ctx.stroke();
    }

    // Cut out inner area (game canvas window)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'black';
    ctx.fillRect(innerX, innerY, innerWidth, innerHeight);
    ctx.restore();

    // Inner edge bevel (around game window)
    ctx.strokeStyle = COLORS.metalDark;
    ctx.lineWidth = 3;
    ctx.strokeRect(innerX - 2, innerY - 2, innerWidth + 4, innerHeight + 4);

    ctx.strokeStyle = COLORS.metalLight;
    ctx.lineWidth = 1;
    ctx.strokeRect(innerX - 4, innerY - 4, innerWidth + 8, innerHeight + 8);

    // Rust patches
    for (const rust of elements.rustPatches) {
      const rustGradient = ctx.createRadialGradient(
        rust.x, rust.y, 0,
        rust.x, rust.y, rust.width / 2
      );
      rustGradient.addColorStop(0, `rgba(139, 69, 19, ${rust.intensity})`);
      rustGradient.addColorStop(0.5, `rgba(160, 82, 45, ${rust.intensity * 0.7})`);
      rustGradient.addColorStop(1, 'rgba(139, 69, 19, 0)');
      ctx.fillStyle = rustGradient;
      ctx.beginPath();
      ctx.ellipse(rust.x, rust.y, rust.width / 2, rust.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Burn marks
    for (const burn of elements.burnMarks) {
      const burnGradient = ctx.createRadialGradient(
        burn.x, burn.y, 0,
        burn.x, burn.y, burn.size
      );
      burnGradient.addColorStop(0, COLORS.burnCenter);
      burnGradient.addColorStop(0.4, COLORS.burnEdge);
      burnGradient.addColorStop(1, 'rgba(58, 48, 32, 0)');
      ctx.fillStyle = burnGradient;
      ctx.beginPath();
      ctx.arc(burn.x, burn.y, burn.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dents
    for (const dent of elements.dents) {
      ctx.save();
      ctx.translate(dent.x, dent.y);
      ctx.rotate(dent.rotation);

      // Shadow
      const dentGradient = ctx.createRadialGradient(
        -dent.size * 0.2, -dent.size * 0.2, 0,
        0, 0, dent.size
      );
      dentGradient.addColorStop(0, 'rgba(42, 42, 48, 0.8)');
      dentGradient.addColorStop(0.6, 'rgba(42, 42, 48, 0.4)');
      dentGradient.addColorStop(1, 'rgba(42, 42, 48, 0)');
      ctx.fillStyle = dentGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, dent.size, dent.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlight edge
      ctx.strokeStyle = 'rgba(122, 122, 128, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(dent.size * 0.3, dent.size * 0.3, dent.size * 0.6, Math.PI * 0.8, Math.PI * 1.5);
      ctx.stroke();

      ctx.restore();
    }

    // Bullet holes
    for (const hole of elements.bulletHoles) {
      // Torn metal edge
      ctx.fillStyle = COLORS.metalDark;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const tearSize = hole.size * 0.4 + Math.random() * hole.size * 0.3;
        ctx.beginPath();
        ctx.moveTo(hole.x, hole.y);
        ctx.lineTo(
          hole.x + Math.cos(angle) * (hole.size + tearSize),
          hole.y + Math.sin(angle) * (hole.size + tearSize)
        );
        ctx.lineTo(
          hole.x + Math.cos(angle + 0.3) * hole.size,
          hole.y + Math.sin(angle + 0.3) * hole.size
        );
        ctx.fill();
      }

      // Dark hole center
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.size * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Highlight ring
      ctx.strokeStyle = 'rgba(100, 100, 110, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hole.x - 1, hole.y - 1, hole.size * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Mud splatters
    for (const mud of elements.mudSplatters) {
      ctx.save();
      ctx.translate(mud.x, mud.y);
      ctx.rotate(mud.rotation);

      // Main splatter
      ctx.fillStyle = COLORS.mud;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const dist = mud.size * (0.5 + Math.random() * 0.5);
        if (i === 0) {
          ctx.moveTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        } else {
          ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        }
      }
      ctx.closePath();
      ctx.fill();

      // Darker center
      ctx.fillStyle = COLORS.mudDark;
      ctx.beginPath();
      ctx.arc(0, 0, mud.size * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Rivets
    for (const rivet of elements.rivets) {
      // Rivet shadow
      ctx.fillStyle = COLORS.rivetBase;
      ctx.beginPath();
      ctx.arc(rivet.x + 1, rivet.y + 1, rivet.size, 0, Math.PI * 2);
      ctx.fill();

      // Rivet body with gradient
      const rivetGradient = ctx.createRadialGradient(
        rivet.x - rivet.size * 0.3, rivet.y - rivet.size * 0.3, 0,
        rivet.x, rivet.y, rivet.size
      );
      rivetGradient.addColorStop(0, COLORS.rivetHighlight);
      rivetGradient.addColorStop(0.5, COLORS.metalDark);
      rivetGradient.addColorStop(1, COLORS.rivetBase);
      ctx.fillStyle = rivetGradient;
      ctx.beginPath();
      ctx.arc(rivet.x, rivet.y, rivet.size, 0, Math.PI * 2);
      ctx.fill();

      // Rivet edge highlight
      ctx.strokeStyle = 'rgba(122, 122, 128, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rivet.x, rivet.y, rivet.size - 1, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
    }
  }, [width, height, innerX, innerY, innerWidth, innerHeight]);

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    const staticCanvas = staticCanvasRef.current;
    if (!canvas || !staticCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const elements = elementsRef.current;
    if (!elements) return;

    // Clear and draw static background
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(staticCanvas, 0, 0);

    // Animated plates
    for (const plate of elements.plates) {
      const cyclePosition = ((currentTime / ANIMATION.plateCycleDuration) + plate.phaseOffset) % 1;
      const slideAmount = Math.sin(cyclePosition * Math.PI * 2) * plate.maxSlide;

      const offsetX = plate.direction === 'horizontal' ? slideAmount : 0;
      const offsetY = plate.direction === 'vertical' ? slideAmount : 0;

      // Plate shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(plate.x + offsetX + 2, plate.y + offsetY + 2, plate.width, plate.height);

      // Plate body
      const plateGradient = ctx.createLinearGradient(
        plate.x + offsetX, plate.y + offsetY,
        plate.x + offsetX + plate.width, plate.y + offsetY + plate.height
      );
      plateGradient.addColorStop(0, COLORS.metalLight);
      plateGradient.addColorStop(0.3, COLORS.baseMetal);
      plateGradient.addColorStop(0.7, COLORS.metalLight);
      plateGradient.addColorStop(1, COLORS.metalDark);
      ctx.fillStyle = plateGradient;
      ctx.fillRect(plate.x + offsetX, plate.y + offsetY, plate.width, plate.height);

      // Plate edges
      ctx.strokeStyle = COLORS.metalDark;
      ctx.lineWidth = 2;
      ctx.strokeRect(plate.x + offsetX, plate.y + offsetY, plate.width, plate.height);

      // Top/left highlight
      ctx.strokeStyle = 'rgba(150, 150, 160, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plate.x + offsetX + 1, plate.y + offsetY + plate.height - 1);
      ctx.lineTo(plate.x + offsetX + 1, plate.y + offsetY + 1);
      ctx.lineTo(plate.x + offsetX + plate.width - 1, plate.y + offsetY + 1);
      ctx.stroke();
    }

    // Pistons
    for (const piston of elements.pistons) {
      const plate = elements.plates[piston.plateIndex % elements.plates.length];
      if (!plate) continue;

      const cyclePosition = ((currentTime / ANIMATION.plateCycleDuration) + plate.phaseOffset) % 1;
      const extension = Math.sin(cyclePosition * Math.PI * 2) * 0.5 + 0.5; // 0 to 1
      const pistonLength = piston.length * (0.5 + extension * 0.5);

      ctx.fillStyle = COLORS.pistonBody;
      ctx.fillRect(piston.x - 4, piston.y - 4, 8, 8);

      ctx.fillStyle = COLORS.pistonShaft;
      if (piston.direction === 'vertical') {
        ctx.fillRect(piston.x - 2, piston.y, 4, pistonLength);
      } else {
        ctx.fillRect(piston.x, piston.y - 2, pistonLength, 4);
      }
    }

    // Steam particles
    for (const vent of elements.steamVents) {
      // Spawn new particles
      if (currentTime - vent.lastBurst > ANIMATION.steamInterval + Math.random() * 2000) {
        vent.lastBurst = currentTime;
        for (let i = 0; i < 5; i++) {
          vent.particles.push({
            x: vent.x,
            y: vent.y,
            size: 3 + Math.random() * 5,
            opacity: 0.6 + Math.random() * 0.3,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.5 - Math.random() * 1,
            life: 60 + Math.random() * 40,
          });
        }
      }

      // Update and render particles
      vent.particles = vent.particles.filter(p => p.life > 0);
      for (const p of vent.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.size += 0.05;
        p.opacity -= 0.01;
        p.life--;

        if (p.opacity > 0) {
          ctx.fillStyle = `rgba(200, 200, 200, ${p.opacity * 0.3})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Warning lights
    const warningIntensity = (Math.sin(currentTime / ANIMATION.warningPulseRate * Math.PI * 2) + 1) / 2;
    for (const light of elements.warningLights) {
      // Glow
      const glowGradient = ctx.createRadialGradient(
        light.x, light.y, 0,
        light.x, light.y, light.size * 3
      );
      const glowAlpha = 0.3 * warningIntensity;
      glowGradient.addColorStop(0, `rgba(255, 51, 0, ${glowAlpha})`);
      glowGradient.addColorStop(1, 'rgba(255, 51, 0, 0)');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.size * 3, 0, Math.PI * 2);
      ctx.fill();

      // Light body
      const lightColor = warningIntensity > 0.5 ? COLORS.warning : COLORS.warningDim;
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.size, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = `rgba(255, 255, 255, ${warningIntensity * 0.5})`;
      ctx.beginPath();
      ctx.arc(light.x - light.size * 0.3, light.y - light.size * 0.3, light.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Metallic sheen animation
    const sheenPosition = (currentTime / 4000) % 1;
    const sheenX = sheenPosition * (width + 200) - 100;
    const sheenGradient = ctx.createLinearGradient(sheenX - 50, 0, sheenX + 50, height);
    sheenGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sheenGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.03)');
    sheenGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
    sheenGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.03)');
    sheenGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheenGradient;
    ctx.fillRect(0, 0, width, height);

    // Cut out inner area again (for sheen)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'black';
    ctx.fillRect(innerX, innerY, innerWidth, innerHeight);
    ctx.restore();

    animationRef.current = requestAnimationFrame(animate);
  }, [width, height, innerX, innerY, innerWidth, innerHeight]);

  // Initialize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create offscreen canvas for static elements
    const staticCanvas = document.createElement('canvas');
    staticCanvas.width = width;
    staticCanvas.height = height;
    staticCanvasRef.current = staticCanvas;

    // Generate and render static elements
    elementsRef.current = generateElements();
    const staticCtx = staticCanvas.getContext('2d');
    if (staticCtx) {
      renderStaticElements(staticCtx);
    }

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, generateElements, renderStaticElements, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="metal-background"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
