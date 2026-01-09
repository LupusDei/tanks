# Engine

Core game logic and physics calculations.

## Purpose

This directory contains pure game logic, physics simulation, and game state management. Code here should be framework-agnostic (no React dependencies) and highly testable.

## Module Boundaries

- ✅ **Can import from:** `../utils`
- ❌ **Cannot import from:** `../components` (engine should be UI-agnostic)
- ❌ **Should NOT contain:** React components, DOM manipulation, UI concerns

## Structure

Organize by game system:

```
engine/
├── physics.ts          # Projectile trajectory calculations
├── physics.test.ts
├── collision.ts        # Collision detection algorithms
├── collision.test.ts
├── terrain.ts          # Terrain generation
├── terrain.test.ts
├── gameState.ts        # Game state management
├── gameState.test.ts
├── tank.ts             # Tank entity logic
└── tank.test.ts
```

## Design Principles

### Pure Functions
Prefer pure functions for calculations:

```typescript
// ✅ GOOD: Pure function, easily testable
export function calculateTrajectory(
  angle: number,
  power: number,
  time: number
): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180
  const velocity = power * POWER_MULTIPLIER
  const vx = velocity * Math.cos(radians)
  const vy = velocity * Math.sin(radians)

  return {
    x: vx * time,
    y: vy * time - 0.5 * GRAVITY * time * time
  }
}

// ❌ BAD: Side effects, hard to test
let currentX = 0
let currentY = 0
export function updatePosition(dt: number) {
  currentX += velocityX * dt
  currentY += velocityY * dt
}
```

### Type Safety

Always define clear types:

```typescript
export interface Tank {
  id: string
  position: { x: number; y: number }
  color: string
  health: number
  angle: number
  power: number
}

export interface TerrainData {
  heights: number[]
  width: number
  maxHeight: number
}
```

## Testing

Engine code MUST have >90% test coverage. Test:
- Mathematical correctness
- Edge cases (zero values, negative numbers, extremes)
- Performance with large inputs
- Deterministic behavior (same inputs = same outputs)

## Example

```typescript
// physics.ts
export const GRAVITY = 10 // m/s²
export const POWER_MULTIPLIER = 2

export function calculateTrajectory(
  angle: number,
  power: number,
  time: number
): { x: number; y: number } {
  // Implementation
}

// physics.test.ts
import { describe, it, expect } from 'vitest'
import { calculateTrajectory, GRAVITY } from './physics'

describe('calculateTrajectory', () => {
  it('returns origin at t=0', () => {
    const result = calculateTrajectory(45, 100, 0)
    expect(result).toEqual({ x: 0, y: 0 })
  })

  it('applies gravity over time', () => {
    const result = calculateTrajectory(90, 100, 1)
    expect(result.y).toBeLessThan(0) // Falling
  })
})
```
