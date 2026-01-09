# Scorched Earth Tanks

A modern remake of the classic turn-based artillery game **Scorched Earth**, built as a single-page web application using React and TypeScript.

## Game Overview

Scorched Earth Tanks is a two-player turn-based strategy game where players control tanks positioned on opposite sides of a randomly generated terrain. Players take turns adjusting their tank's cannon angle and power settings to fire projectiles at their opponent. The first player to destroy the enemy tank wins.

### Core Gameplay Mechanics

1. **Loading Screen**: The game starts with delightful animations that play for a few seconds before revealing a Start button
2. **Terrain Generation**: Random procedural terrain is generated at the start of each match
3. **Tank Placement**: Two tanks are placed on opposite sides (left/right) of the terrain, each with a distinct color
4. **Turn-Based Combat**: Players alternate turns to fire at each other
5. **Aiming System**: Players select:
   - **Angle**: 0-90 degrees for cannon direction
   - **Power**: 0-100% for shot velocity
6. **Physics Simulation**: Projectiles follow realistic ballistic trajectories using gravity (10 m/s²)
7. **Projectile Tracing**: A dotted line shows the path of the projectile as it flies
8. **Collision Detection**:
   - Projectile impacts create small explosion animations
   - If explosion overlaps any part of enemy tank, that tank is destroyed
   - Player who made the hit wins
9. **Win Condition**: Game ends when one tank is destroyed

### Physics Calibration

- Gravitational constant: **10 m/s²**
- Screen calibration: Full power (100%) at 70° angle sends projectile from far left to far right of screen
- Physics scale dynamically to canvas dimensions

## Technology Stack

### Core Technologies
- **Runtime**: Node.js
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.7.2
- **Build Tool**: Vite 6.0.3
- **Package Manager**: npm

### Development Tools
- **Linting**: ESLint 9.15.0 with TypeScript and React plugins
- **TypeScript Config**: Strict mode enabled, ES2020 target
- **Issue Tracking**: Beads (bd CLI)

### Key Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@vitejs/plugin-react": "^4.3.4"
}
```

## Project Structure

```
tanks/
├── src/
│   ├── components/          # React UI components
│   ├── engine/             # Game logic and physics
│   ├── utils/              # Helper functions and utilities
│   ├── App.tsx             # Main application component
│   ├── App.css             # Application styles
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles
├── index.html              # HTML entry point
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── .beads/                 # Issue tracking database (beads)
├── AGENTS.md               # Agent workflow instructions
└── README.md               # This file
```

### Folder Organization

- **`src/components/`**: React components for UI elements (buttons, controls, canvas, screens)
- **`src/engine/`**: Core game logic, physics calculations, collision detection, game state
- **`src/utils/`**: Shared utilities, constants, helper functions, type definitions

## Development Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- Git

### Installation

```bash
# Clone the repository
git clone git@github.com:LupusDei/tanks.git
cd tanks

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173/`

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production (TypeScript compile + Vite build)
npm run preview  # Preview production build locally
npm run lint     # Run ESLint to check code quality
npm test         # Run test suite
npm test -- --watch    # Run tests in watch mode
npm test -- --coverage # Run tests with coverage report
```

## Testing Strategy

**Tests are MANDATORY** - Every feature must have corresponding tests.

### Testing Framework
- **Vitest**: Fast unit testing framework (Vite-native)
- **React Testing Library**: Component testing
- **Coverage Target**: >80% for critical code paths

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm test -- --watch

# Coverage report
npm test -- --coverage

# Run specific test file
npm test physics.test.ts
```

### Test Organization

Tests live alongside the code they test:

```
src/
├── engine/
│   ├── physics.ts
│   ├── physics.test.ts        # Unit tests for physics
│   ├── collision.ts
│   └── collision.test.ts
├── components/
│   ├── Canvas.tsx
│   └── Canvas.test.tsx        # Component tests
└── utils/
    ├── math.ts
    └── math.test.ts
```

### Testing Requirements

- ✅ Write tests BEFORE or ALONGSIDE implementation
- ✅ Test edge cases and error conditions
- ✅ Keep tests fast and independent
- ✅ Use descriptive test names
- ✅ Mock external dependencies
- ❌ Never commit code without tests
- ❌ Never skip failing tests

### Example Test Structure

```typescript
// physics.test.ts
import { describe, it, expect } from 'vitest'
import { calculateTrajectory } from './physics'

describe('calculateTrajectory', () => {
  it('should calculate correct position at t=0', () => {
    const result = calculateTrajectory(45, 100, 0)
    expect(result).toEqual({ x: 0, y: 0 })
  })

  it('should account for gravity over time', () => {
    const result = calculateTrajectory(45, 100, 1)
    expect(result.y).toBeLessThan(0) // Falling due to gravity
  })
})
```

## Code Quality & Modularity

### Modularity Principles

This project is designed for **parallel development**. Multiple agents must be able to work simultaneously without conflicts.

**Key Principles:**
- ✅ **One responsibility per module**: Each file has a single, clear purpose
- ✅ **Clear interfaces**: Modules communicate through well-defined APIs
- ✅ **Minimal coupling**: Changes in one module shouldn't break others
- ✅ **Independent testing**: Each module can be tested in isolation
- ✅ **No circular dependencies**: Keep dependency graph acyclic

### Module Boundaries

```
src/engine/          → Pure game logic (no React dependencies)
src/components/      → React UI (no direct game logic)
src/utils/           → Shared utilities (no dependencies on engine or components)
```

**Example of Good Modularity:**
```typescript
// ✅ GOOD: Clear interface, no coupling
// engine/physics.ts
export function calculateTrajectory(angle: number, power: number, time: number): Position {
  // Pure calculation, no side effects
}

// components/Canvas.tsx
import { calculateTrajectory } from '../engine/physics'
// Uses physics as a dependency, but physics doesn't know about Canvas
```

**Example of Poor Modularity:**
```typescript
// ❌ BAD: Tight coupling
// engine/physics.ts
import { Canvas } from '../components/Canvas'  // Engine shouldn't import components!
```

### Clean Code Standards

- **TypeScript Strict Mode**: No `any` types, proper type definitions
- **Descriptive Names**: `calculateProjectileVelocity()` not `calc()`
- **Small Functions**: <50 lines, single responsibility
- **DRY Principle**: Extract common logic into utilities
- **Error Handling**: Handle edge cases gracefully
- **Comments**: Only when necessary - prefer self-documenting code

### Quality Gates

Before committing, ALL of these must pass:

```bash
npm run build     # TypeScript compilation
npm run lint      # Code style and quality
npm test          # Test suite
```

If any fail, fix them before committing.

## Issue Tracking with Beads

This project uses **beads** (`bd` CLI) for issue tracking. All work items are tracked as issues with dependencies.

### Key Commands

```bash
bd ready              # Show issues ready to work (no blockers)
bd list               # List all issues
bd show <id>          # View detailed issue information
bd update <id> --status=in_progress   # Claim a task
bd close <id>         # Mark task complete
bd stats              # Project statistics
```

### Branching Workflow

**ALL work MUST be done on feature branches**. Each issue gets its own branch named after the issue ID.

#### Standard Workflow

```bash
# 1. Find and claim work
bd ready
bd update <issue-id> --status=in_progress

# 2. Create feature branch from master
git checkout master && git pull
git checkout -b <issue-id>

# 3. Implement the feature
# ... make changes, write tests ...

# 4. Verify ALL quality gates pass
npm run build && npm run lint && npm test

# 5. Commit to feature branch
git add <files>
git commit -m "Description

Closes <issue-id>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 6. Push feature branch to remote
git push -u origin <issue-id>

# 7. Merge to master
git checkout master
git pull
git merge <issue-id>
git push

# 8. Clean up
git branch -d <issue-id>
git push origin --delete <issue-id>
bd close <issue-id>
bd sync
```

### Critical Workflow Rules

⚠️ **NEVER work directly on master** - Always use feature branches
⚠️ **NEVER commit without tests** - Add/update tests for every change
⚠️ **NEVER skip quality gates** - Build, lint, and test must ALL pass
⚠️ **Work is NOT complete until pushed to master** - Push branch, merge, push master
⚠️ **Clean up branches** - Delete both local and remote branches after merging

See `AGENTS.md` for complete detailed workflow instructions with examples.

## Current Status

### Completed
- ✅ Project initialization (Node.js/React/TypeScript)
- ✅ Vite build tooling setup
- ✅ Basic project structure
- ✅ TypeScript strict mode configuration
- ✅ Development environment verified

### Next Priority Tasks (P0)
- Set up organized folder structure (components, engine, utils)
- Establish canvas rendering infrastructure
- Implement terrain generation algorithm
- Create tank entity system
- Set up game state management

### Upcoming Features (P1)
- Loading screen with animations
- Start button and game initialization
- Physics engine for projectile motion
- UI controls for angle and power selection
- Turn management system
- Projectile animation and rendering

### Future Features (P2)
- Collision detection (terrain and tank)
- Explosion animations
- Win conditions and game over state
- Physics calibration and tuning

View all tracked issues: `bd list --status=open`

## Architecture Vision

### Game State Management
The game will use React state management (Context API or similar) to track:
- Current game phase (loading, menu, playing, game over)
- Active player turn
- Tank states (position, health, angle, power)
- Terrain data
- Projectile state during flight

### Canvas Rendering
- HTML5 Canvas for all game rendering
- React component wrapper for canvas management
- Requestanimationframe for smooth 60fps animation
- Responsive canvas sizing based on viewport

### Physics Engine
- Custom physics calculations for projectile motion
- Frame-independent physics using delta time
- Realistic ballistic trajectories with gravity
- Collision detection with pixel-perfect accuracy for explosions

### Component Structure (Planned)
```
App
├── LoadingScreen (with animations)
├── MenuScreen (with Start button)
└── GameScreen
    ├── Canvas (terrain, tanks, projectiles)
    ├── ControlPanel
    │   ├── AngleSelector
    │   ├── PowerSelector
    │   └── FireButton
    └── GameOverScreen (winner announcement)
```

## Future Expansion

The initial version focuses on core gameplay. Future enhancements may include:
- Multiple terrain generation algorithms
- Wind effects on projectile trajectory
- Destructible terrain (explosions create craters)
- Multiple weapon types
- Power-up items
- Sound effects and music
- Multiplayer networking
- AI opponents
- Campaign mode
- Custom tank skins and colors

## Contributing

When working on this project:
1. Check `bd ready` for available tasks
2. Read task descriptions carefully in `bd show <id>`
3. Follow the established project structure
4. Write TypeScript with strict typing
5. Test changes before committing
6. Follow the workflow in `AGENTS.md`
7. Update this README when adding major features or changing architecture

## License

This is a personal project - license TBD.

## Contact

Repository: https://github.com/LupusDei/tanks
