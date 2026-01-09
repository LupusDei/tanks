# Components

React UI components for the game interface.

## Purpose

This directory contains all React components responsible for rendering the user interface. Components here should be focused on presentation and user interaction, with minimal game logic.

## Module Boundaries

- ✅ **Can import from:** `../utils`, `../engine` (for types and game state)
- ❌ **Should NOT contain:** Game logic, physics calculations, direct state mutations

## Structure

Components should be organized by feature or screen:

```
components/
├── Canvas/           # Canvas wrapper component
├── LoadingScreen/    # Loading animations
├── MenuScreen/       # Start button and menu
├── GameScreen/       # Main game view
├── Controls/         # Angle, power, fire button
└── GameOverScreen/   # Winner announcement
```

## Testing

Each component must have a corresponding `.test.tsx` file testing:
- Renders correctly
- User interactions work as expected
- Props are handled properly
- Edge cases (missing data, errors)

## Example Component

```typescript
// Button.tsx
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}

// Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button label="Test" onClick={handleClick} />)
    fireEvent.click(screen.getByText('Test'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```
