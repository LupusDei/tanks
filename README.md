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
```

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

### Workflow for Agents

1. **Find work**: `bd ready` to see available tasks
2. **Claim task**: `bd update <id> --status=in_progress`
3. **Do the work**: Implement the feature/fix
4. **Verify**: Test that changes work as expected
5. **Commit**: Add files and commit with descriptive message
6. **Push**: `git push` to remote origin
7. **Close task**: `bd close <id>` only after push succeeds
8. **Sync**: `bd sync` to update beads tracking

### Critical Workflow Rules

⚠️ **Work is NOT complete until code is pushed to remote origin**
- Always verify changes work before committing
- Always push commits before closing issues
- Never leave work stranded locally

See `AGENTS.md` for detailed agent workflow instructions.

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
