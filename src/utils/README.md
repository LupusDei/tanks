# Utils

Shared utilities, constants, and helper functions.

## Purpose

This directory contains code that's used across multiple parts of the application. Utilities should be small, focused, and highly reusable.

## Module Boundaries

- ✅ **Can import from:** Nothing (utils should have no dependencies)
- ❌ **Cannot import from:** `../components`, `../engine`
- ✅ **Can be imported by:** Everything (components, engine, other utils)

## Structure

Organize by functionality:

```
utils/
├── constants.ts       # Game constants
├── math.ts           # Math utilities
├── math.test.ts
├── types.ts          # Shared TypeScript types
├── validation.ts     # Input validation
└── validation.test.ts
```

## What Belongs Here

### Constants
```typescript
// constants.ts
export const SCREEN_WIDTH = 1200
export const SCREEN_HEIGHT = 600
export const MAX_ANGLE = 90
export const MIN_ANGLE = 0
export const MAX_POWER = 100
export const MIN_POWER = 0
```

### Math Utilities
```typescript
// math.ts
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}
```

### Shared Types
```typescript
// types.ts
export interface Position {
  x: number
  y: number
}

export interface Color {
  r: number
  g: number
  b: number
  a: number
}

export type GamePhase = 'loading' | 'menu' | 'playing' | 'gameOver'
```

### Validation
```typescript
// validation.ts
export function isValidAngle(angle: number): boolean {
  return angle >= 0 && angle <= 90
}

export function isValidPower(power: number): boolean {
  return power >= 0 && power <= 100
}
```

## What Does NOT Belong Here

- ❌ React components (goes in `components/`)
- ❌ Game logic (goes in `engine/`)
- ❌ Complex algorithms (probably belongs in `engine/`)
- ❌ Component-specific helpers (keep with the component)

## Testing

All utilities must be thoroughly tested:

```typescript
// math.test.ts
import { describe, it, expect } from 'vitest'
import { clamp, lerp } from './math'

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns min when value is too low', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('returns max when value is too high', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})
```

## Keep It Simple

Utils should be:
- **Small**: Single responsibility, <50 lines
- **Pure**: No side effects when possible
- **Tested**: 100% coverage is the goal
- **Documented**: JSDoc comments for public functions
- **Typed**: Proper TypeScript types, no `any`
