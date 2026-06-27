# Feature Specification: Tank Battle Core Game

**Feature Branch**: `001-tank-battle-core`
**Created**: 2026-03-01
**Status**: Draft
**Input**: One-shot specification for a simplified but fully playable turn-based artillery tank game. Includes battle configuration, basic weapons (standard shell, sniper shot, heavy artillery), physics-based combat, AI opponents, and a complete game loop. Excludes campaign mode, sound effects, and animated loading screen.

---

## Overview

A browser-based, turn-based artillery game where a human player battles 1-10 AI tanks on destructible procedurally-generated terrain. Players take turns adjusting barrel angle and shot power, accounting for wind, to destroy opponents. The game features a pre-battle weapon shop, configurable difficulty, and simultaneous turn resolution.

### Technology Stack

- **Framework**: React 18 with TypeScript (strict mode)
- **Build Tool**: Vite
- **Rendering**: HTML5 Canvas (2D context)
- **Testing**: Vitest with React Testing Library
- **Styling**: CSS (no UI framework required)
- **State Management**: React Context API
- **Persistence**: Browser LocalStorage

---

## User Scenarios & Testing

### User Story 1 - Play a Complete Battle (Priority: P1)

A player opens the game, enters their name, configures a battle (terrain size, enemy count, difficulty, tank color), optionally buys weapons, then plays turn-based artillery combat against AI tanks until one side wins. The player sees a game-over screen showing the winner and can start a new game.

**Why this priority**: This is the entire core game loop. Without this, there is no game.

**Independent Test**: Can be fully tested by launching the app, clicking through configuration, and playing a battle to completion. Delivers a complete playable game experience.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** the player enters their name and clicks "Start", **Then** they see the battle configuration screen.
2. **Given** the config screen is shown, **When** the player selects terrain size, enemy count, difficulty, and color, **Then** they can proceed to the weapon shop.
3. **Given** the weapon shop is shown, **When** the player buys weapons (or skips), **Then** the battle begins with all tanks placed on terrain.
4. **Given** it is the player's turn, **When** they adjust angle and power and press Fire, **Then** a projectile launches following physics (gravity + wind), and the turn resolves for all tanks simultaneously.
5. **Given** a projectile hits a tank, **When** damage is applied, **Then** the tank's health decreases and the health bar updates visually.
6. **Given** a tank's health reaches 0, **When** destruction occurs, **Then** the tank is visually destroyed and removed from play.
7. **Given** only one tank remains alive, **When** the battle ends, **Then** a game-over screen shows the winner and offers "Play Again".

---

### User Story 2 - Configure Battle Settings (Priority: P1)

The player customizes their battle experience by choosing terrain size, number of enemies, AI difficulty level, and their tank color before entering combat.

**Why this priority**: Configuration is integral to the core game loop and determines the battle parameters.

**Independent Test**: Can be tested by verifying each configuration option renders, accepts input, and correctly initializes the game state.

**Acceptance Scenarios**:

1. **Given** the config screen, **When** the player selects a terrain size (Small/Medium/Large/Huge/Epic), **Then** the terrain generates at that resolution.
2. **Given** the config screen, **When** the player selects enemy count (1-10), **Then** exactly that many AI tanks spawn.
3. **Given** the config screen, **When** the player selects difficulty (Blind Fool/Private/Veteran/Centurion/Primus), **Then** AI accuracy and behavior match that level.
4. **Given** the config screen, **When** the player picks a tank color, **Then** their tank renders in that color and AI tanks use different colors.

---

### User Story 3 - Purchase Weapons Before Battle (Priority: P2)

The player visits a weapon shop before each battle where they can spend credits to buy sniper shots and heavy artillery rounds, or proceed with only the free standard shell.

**Why this priority**: The weapon shop adds strategic depth but the game is playable with just the standard shell.

**Independent Test**: Can be tested by entering the shop, buying weapons, verifying balance deduction, then confirming weapons appear in the in-game weapon selector.

**Acceptance Scenarios**:

1. **Given** the weapon shop, **When** the player views weapons, **Then** they see Standard Shell (free, unlimited), Sniper Shot (200 credits), and Heavy Artillery (250 credits) with descriptions.
2. **Given** the player has sufficient credits, **When** they purchase a weapon, **Then** the ammo count increases by 1 and their balance decreases.
3. **Given** the player has insufficient credits, **When** they try to purchase, **Then** the buy button is disabled or shows an error.
4. **Given** weapons are purchased, **When** battle begins, **Then** the weapon selector shows all owned weapons with ammo counts.
5. **Given** a weapon has 0 ammo remaining during battle, **When** viewing the weapon selector, **Then** that weapon is grayed out and unselectable.

---

### User Story 4 - Control Tank During Battle (Priority: P1)

During the player's turn, they can adjust barrel angle (-120 to +120 degrees), set shot power (0-100%), select a weapon, optionally move their tank left/right, and fire. Controls work via keyboard and on-screen UI.

**Why this priority**: Without player controls, there is no interactivity.

**Independent Test**: Can be tested by verifying angle/power sliders respond to input, weapon selector changes active weapon, movement uses fuel, and fire button launches projectile.

**Acceptance Scenarios**:

1. **Given** it is the player's turn, **When** they press W/S or Up/Down arrows, **Then** the barrel angle adjusts by 1 degree (5 degrees with Shift held).
2. **Given** it is the player's turn, **When** they press A/D or Left/Right arrows, **Then** shot power adjusts by 1% (5% with Shift held).
3. **Given** it is the player's turn, **When** they press Q or E, **Then** the tank moves left or right on the terrain, consuming fuel.
4. **Given** it is the player's turn, **When** they press Space or Enter, **Then** the shot fires with current angle, power, and selected weapon.
5. **Given** the player has multiple weapons, **When** they click a weapon in the selector panel, **Then** that weapon becomes active for the next shot.
6. **Given** it is NOT the player's turn, **When** they try to input controls, **Then** nothing happens (controls are locked).

---

### User Story 5 - AI Takes Its Turn (Priority: P1)

AI tanks calculate and execute their shots with accuracy determined by difficulty level. All tanks (player + AI) fire simultaneously after the player confirms their shot, then projectiles animate and resolve.

**Why this priority**: AI opponents are required for single-player gameplay.

**Independent Test**: Can be tested by starting a battle and observing AI tanks fire shots that travel toward targets with difficulty-appropriate accuracy.

**Acceptance Scenarios**:

1. **Given** the player fires, **When** AI tanks calculate shots, **Then** each AI picks a target and calculates angle/power with difficulty-appropriate random variance.
2. **Given** AI difficulty is "Blind Fool", **When** it fires, **Then** angle varies by up to ±30 degrees and power by ±40 from ideal.
3. **Given** AI difficulty is "Primus", **When** it fires, **Then** angle varies by only ±2 degrees and power by ±4 from ideal.
4. **Given** all shots are queued, **When** simultaneous fire resolves, **Then** all projectiles animate across the screen at the same time.
5. **Given** an AI tank is destroyed, **When** turns cycle, **Then** destroyed AI tanks are skipped.

---

### User Story 6 - Physics-Based Projectile Motion (Priority: P1)

Projectiles follow realistic ballistic trajectories affected by gravity and wind. Wind changes each turn and is displayed to the player. Projectiles collide with terrain and tanks.

**Why this priority**: Physics is the core mechanic that makes gameplay skill-based and satisfying.

**Independent Test**: Can be tested by firing shots at various angles/powers and verifying trajectories match expected parabolic curves adjusted for wind.

**Acceptance Scenarios**:

1. **Given** a shot is fired, **When** the projectile travels, **Then** it follows a parabolic arc affected by gravity (constant downward acceleration).
2. **Given** wind is blowing, **When** a projectile is in flight, **Then** it curves horizontally in the wind direction proportional to wind speed.
3. **Given** a projectile hits terrain, **When** collision is detected, **Then** an explosion occurs at the impact point.
4. **Given** a projectile hits a tank, **When** collision is detected, **Then** the tank takes damage based on the weapon type.
5. **Given** a projectile leaves the canvas bounds, **When** out-of-bounds is detected, **Then** the projectile is removed with no damage dealt.
6. **Given** a new turn starts, **When** wind updates, **Then** the wind indicator shows the new wind speed and direction.

---

### User Story 7 - Earn Credits and Track Progress (Priority: P2)

The player earns credits for kills and wins. Their balance persists across games via LocalStorage. Stats (games played, wins, kills) are tracked and visible.

**Why this priority**: Economy and persistence add replayability but aren't required for a single playable battle.

**Independent Test**: Can be tested by completing a game, verifying credit earnings match expectations, then reloading the app and confirming balance persists.

**Acceptance Scenarios**:

1. **Given** the player destroys an enemy tank, **When** credits are awarded, **Then** they earn 200 credits per kill (modified by difficulty multiplier).
2. **Given** the player wins a battle, **When** the game ends, **Then** they earn a 250-credit win bonus.
3. **Given** the player loses, **When** the game ends, **Then** they earn a 50-credit consolation.
4. **Given** credits are earned, **When** the game-over screen shows, **Then** the earnings breakdown is displayed.
5. **Given** the player closes and reopens the browser, **When** they return, **Then** their balance and stats are preserved.

---

### Edge Cases

- What happens when all AI tanks are destroyed in a single simultaneous volley? The player wins immediately.
- What happens when the player and last AI tank destroy each other simultaneously? The game declares a draw or the player wins (player favored).
- What happens when a projectile lands between two tanks? Only tanks within the blast radius take damage.
- What happens when a tank is positioned at the edge of the terrain? The tank cannot move further in that direction.
- What happens when the player has 0 credits in the weapon shop? They proceed with only the free standard shell.
- What happens when wind is at maximum (30 m/s)? Projectiles curve dramatically; the wind indicator shows strong wind visually.
- What happens when terrain is very hilly and a tank is in a valley? Shots may hit terrain before reaching the target; the player must adjust arc.

---

## Requirements

### Functional Requirements

#### Game Flow

- **FR-001**: The game MUST progress through phases in this order: Player Name Entry → Battle Configuration → Weapon Shop → Battle → Game Over, then loop back to Configuration.
- **FR-002**: The Player Name Entry screen MUST accept a text input for the player's name (1-20 characters) with a "Start" button.
- **FR-003**: The Game Over screen MUST display the winner's name, an earnings summary, and a "Play Again" button that returns to Battle Configuration.

#### Battle Configuration

- **FR-010**: The configuration screen MUST allow selection of terrain size from: Small (800x600), Medium (1024x768), Large (1280x960), Huge (1600x1200), Epic (2100x2800).
- **FR-011**: The configuration screen MUST allow selection of enemy count from 1 to 10 via a slider or selector.
- **FR-012**: The configuration screen MUST allow selection of AI difficulty from: Blind Fool, Private, Veteran, Centurion, Primus.
- **FR-013**: The configuration screen MUST allow selection of player tank color from at least 8 distinct colors.
- **FR-014**: The configuration screen MUST have a "Start Battle" button that initializes the game with selected parameters.
- **FR-015**: Default configuration values MUST be: Medium terrain, 3 enemies, Veteran difficulty.

#### Terrain

- **FR-020**: Terrain MUST be procedurally generated using a midpoint displacement algorithm with random seed.
- **FR-021**: Terrain MUST be rendered as a filled polygon on the canvas with a ground color.
- **FR-022**: Terrain height MUST support linear interpolation for sub-pixel accuracy in collision detection.
- **FR-023**: Each terrain size MUST define canvas dimensions: width and height in pixels.

#### Tanks

- **FR-030**: Tanks MUST be placed on top of the terrain at evenly spaced horizontal positions, with Y position matching terrain height.
- **FR-031**: Each tank MUST have: a body (rectangular, ~50px wide, ~16px tall), a rotating turret/barrel, interleaved wheels, and a color.
- **FR-032**: Each tank MUST display a floating name label above it.
- **FR-033**: Each tank MUST display a health bar above the name showing current HP as a percentage.
- **FR-034**: The current-turn tank MUST be visually indicated (e.g., arrow or highlight).
- **FR-035**: Tanks MUST start with 100 HP.
- **FR-036**: AI tanks MUST be assigned distinct colors that differ from the player's chosen color.
- **FR-037**: AI tanks MUST be assigned randomized names (from a pool of military-themed names).

#### Controls

- **FR-040**: The control panel MUST display: current angle (degrees), current power (%), weapon selector, and a Fire button.
- **FR-041**: Angle MUST be adjustable from -120 to +120 degrees, where 0 is straight up, positive is left, negative is right.
- **FR-042**: Power MUST be adjustable from 0% to 100%.
- **FR-043**: Keyboard controls MUST be supported: W/S or Up/Down for angle, A/D or Left/Right for power, Space/Enter to fire, Q/E to move tank.
- **FR-044**: Holding Shift with angle/power keys MUST increase adjustment speed by 5x.
- **FR-045**: Controls MUST be disabled when it is not the player's turn.
- **FR-046**: Tank movement MUST consume fuel. Each tank starts with a fuel budget per game. Movement distance scales with terrain size.

#### Weapons

- **FR-050**: Three weapons MUST be available:
  - **Standard Shell**: Free, unlimited ammo, 35% damage, 20px blast radius.
  - **Sniper Shot**: 200 credits, purchased ammo, 100% damage (instant kill), 12px blast radius, narrow precision shot.
  - **Heavy Artillery**: 250 credits, purchased ammo, 65% damage, 35px blast radius, large area explosion.
- **FR-051**: The weapon selector panel MUST show all owned weapons with remaining ammo counts.
- **FR-052**: Selecting a weapon MUST change the active weapon for the next shot.
- **FR-053**: Firing a non-standard weapon MUST decrement its ammo by 1.
- **FR-054**: When ammo reaches 0 for a weapon, it MUST be unselectable until more is purchased.
- **FR-055**: Standard Shell MUST always be available with infinite ammo.

#### Weapon Shop

- **FR-060**: The weapon shop MUST display before each battle, showing all purchasable weapons.
- **FR-061**: Each weapon listing MUST show: name, description, damage, blast radius, cost per unit, and a buy button.
- **FR-062**: The player's current balance MUST be displayed prominently.
- **FR-063**: Purchasing a weapon MUST deduct the cost from the player's balance and add 1 ammo.
- **FR-064**: The buy button MUST be disabled if the player cannot afford the weapon.
- **FR-065**: A "Ready for Battle" / "Skip" button MUST allow proceeding without purchasing.

#### Physics & Projectiles

- **FR-070**: Projectile motion MUST use standard ballistic equations: horizontal velocity = v*cos(angle), vertical velocity = v*sin(angle), with constant gravitational acceleration downward.
- **FR-071**: Wind MUST apply a horizontal acceleration to projectiles proportional to wind speed.
- **FR-072**: Power (0-100%) MUST map to projectile velocity using a calibrated scale such that 100% power at ~70 degrees covers approximately the terrain width.
- **FR-073**: Projectiles MUST animate visually across the canvas, showing a trail (dotted line) of their path.
- **FR-074**: Projectile collision with terrain MUST be detected by checking if the projectile Y position is at or below the terrain height at its X position.
- **FR-075**: Projectile collision with a tank MUST be detected by checking proximity to tank center within the blast radius.
- **FR-076**: Projectiles that leave the canvas bounds MUST be removed without effect.
- **FR-077**: Gravity constant MUST be approximately 10 px/s squared (tunable for game feel).

#### Wind System

- **FR-080**: Wind speed MUST be displayed as a numeric value with direction indicator (arrow or text showing left/right).
- **FR-081**: Wind MUST change each turn, using a regression-to-mean model: new wind = (old wind * decay) + random variation.
- **FR-082**: Wind speed MUST be bounded within -30 to +30 m/s.
- **FR-083**: Initial wind MUST be generated from a normal distribution centered on 0.

#### Turn System

- **FR-090**: The game MUST use a simultaneous-fire turn system: the player sets their shot, then all alive tanks (player + AI) fire at the same time.
- **FR-091**: After all projectiles resolve, the turn advances and the player takes their next shot.
- **FR-092**: Destroyed tanks MUST be skipped in the turn order.
- **FR-093**: The game MUST display whose turn it is (always the player in this simplified model, since fire is simultaneous).
- **FR-094**: A turn indicator MUST show the current turn number.

#### Explosions & Damage

- **FR-100**: When a projectile impacts, an explosion animation MUST play at the impact point.
- **FR-101**: Explosion MUST render as an expanding circle with particles, colored by weapon type.
- **FR-102**: Explosion duration MUST be approximately 1-2 seconds.
- **FR-103**: Damage MUST be applied to any tank within the weapon's blast radius of the impact point.
- **FR-104**: Damage amount MUST match the weapon's damage percentage of the tank's max HP.
- **FR-105**: When a tank's HP reaches 0, a destruction animation MUST play (tank breaking apart with debris and particles).
- **FR-106**: Destruction animation MUST last approximately 2 seconds.

#### AI System

- **FR-110**: AI tanks MUST calculate shots by determining the ideal angle and power to hit a target, then adding random variance based on difficulty.
- **FR-111**: AI difficulty MUST control accuracy variance:
  - Blind Fool: angle ±30 degrees, power ±40
  - Private: angle ±15 degrees, power ±25
  - Veteran: angle ±8 degrees, power ±15
  - Centurion: angle ±4 degrees, power ±8
  - Primus: angle ±2 degrees, power ±4
- **FR-112**: AI MUST select a target from alive enemy tanks (preferring consistent targeting of the same opponent).
- **FR-113**: AI MUST fire using the standard shell (AI does not use the shop or special weapons in this simplified version).
- **FR-114**: AI shot calculation MUST account for wind in its ideal trajectory computation.

#### Economy

- **FR-120**: The player MUST start with a balance of 500 credits.
- **FR-121**: Kill reward MUST be 200 credits per enemy destroyed.
- **FR-122**: Win bonus MUST be 250 credits.
- **FR-123**: Loss consolation MUST be 50 credits.
- **FR-124**: Difficulty multiplier MUST apply to all earnings: Blind Fool 0.5x, Private 0.75x, Veteran 1.0x, Centurion 1.25x, Primus 1.5x.
- **FR-125**: Balance MUST persist across games via LocalStorage.

#### Canvas Rendering

- **FR-130**: The entire game MUST render on an HTML5 Canvas element.
- **FR-131**: The canvas MUST support scrolling/panning when terrain is larger than the viewport.
- **FR-132**: The canvas MUST auto-center on the current player's tank at the start of their turn.
- **FR-133**: Rendering MUST use requestAnimationFrame for 60fps animation.
- **FR-134**: The coordinate system MUST use world coordinates (Y=0 at bottom, up is positive) internally, converted to screen coordinates (Y=0 at top) for canvas rendering.

#### Persistence

- **FR-140**: Player profile (name, balance, stats) MUST be stored in LocalStorage.
- **FR-141**: Stats tracked MUST include: games played, games won, total kills, and win rate.
- **FR-142**: The game MUST load the player's existing profile on return visits.

### Non-Functional Requirements

- **NFR-001**: The game MUST run in modern browsers (Chrome, Firefox, Safari, Edge) without plugins.
- **NFR-002**: The game MUST maintain 60fps during projectile animation on standard hardware.
- **NFR-003**: The game MUST be playable on desktop screens (minimum 1024x768 viewport).
- **NFR-004**: All game logic (physics, AI, damage) MUST be in pure functions separated from React components (engine/ vs components/ architecture).
- **NFR-005**: The codebase MUST use TypeScript strict mode with no `any` types.
- **NFR-006**: Critical game engine functions (physics, terrain, AI, damage) MUST have unit tests.

### Key Entities

- **Player**: Name, balance, stats (games played, wins, kills), weapon inventory.
- **Tank**: ID, name, position (x, y), barrel angle, HP, max HP, color, isPlayer flag, isAlive, fuel, queued shot.
- **Terrain**: Array of height values across the terrain width, canvas dimensions.
- **Projectile**: Position (x, y), velocity (vx, vy), weapon type, owner tank ID, active flag.
- **Weapon**: Type enum, damage percentage, blast radius, speed multiplier, cost, ammo count.
- **Wind**: Current speed (positive = right, negative = left), bounded ±30 m/s.
- **Game State**: Current phase, turn number, array of tanks, terrain data, wind, selected weapon, winner.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A player can complete a full game (config → shop → battle → game over) in under 10 minutes against 3 AI opponents.
- **SC-002**: Projectile trajectories visually match expected ballistic curves — a 45-degree shot at 50% power in zero wind lands roughly at the midpoint of expected range.
- **SC-003**: AI difficulty is perceptibly different — Primus AI hits targets noticeably more often than Blind Fool AI over 10 turns.
- **SC-004**: The game runs at 60fps with no visible stutter during projectile animation with up to 11 simultaneous projectiles (1 player + 10 AI).
- **SC-005**: Player balance and stats persist correctly across browser sessions (close tab, reopen, data intact).
- **SC-006**: All 3 weapons (Standard Shell, Sniper Shot, Heavy Artillery) produce visually distinct explosions and deal correct damage.
- **SC-007**: Wind visibly affects projectile trajectory — a strong wind (20+ m/s) causes a noticeable horizontal drift in projectile path.
- **SC-008**: The game correctly ends when only one tank remains, declaring the correct winner every time.
- **SC-009**: All unit tests pass with >80% coverage on engine modules (physics, terrain, AI, damage calculation).
- **SC-010**: The player can play 5 consecutive games without encountering errors, crashes, or stuck states.

---

## Assumptions

- The game is single-player only (1 human vs AI opponents). No multiplayer networking.
- AI tanks use only the standard shell. Only the human player accesses the weapon shop.
- No armor system in this simplified version. Tanks have flat 100 HP.
- No tank movement fuel display is needed in the UI beyond the movement responding to Q/E keys.
- Mobile responsiveness is not required for this simplified version (desktop-first).
- No tutorial or help screen is needed.
- The player name entry is a simple text input, not a full account system.
- Terrain is not destructible in this simplified version.
- No homing, cluster, bouncing, EMP, napalm, or bunker buster weapons.

---

## Architecture Reference

### Directory Structure

```
src/
├── main.tsx                 # React entry point
├── App.tsx                  # Root component, phase routing
├── App.css                  # Global styles
├── index.css                # Base styles
├── types/
│   └── game.ts              # All TypeScript interfaces and types
├── engine/                  # Pure game logic (no React imports)
│   ├── physics.ts           # Trajectory calculation, velocity, gravity
│   ├── physics.test.ts      # Physics unit tests
│   ├── terrain.ts           # Midpoint displacement generation, height lookup
│   ├── terrain.test.ts      # Terrain unit tests
│   ├── ai.ts                # AI targeting, shot calculation, difficulty
│   ├── ai.test.ts           # AI unit tests
│   ├── weapons.ts           # Weapon configs, damage calculation
│   ├── weapons.test.ts      # Weapon unit tests
│   ├── projectile.ts        # Projectile creation, collision detection
│   ├── projectile.test.ts   # Projectile unit tests
│   ├── explosion.ts         # Explosion state machine, particle physics
│   ├── explosion.test.ts    # Explosion unit tests
│   ├── tank.ts              # Tank placement, rendering helpers
│   ├── tank.test.ts         # Tank unit tests
│   └── wind.ts              # Wind generation, per-turn updates
├── context/
│   ├── GameContext.tsx       # Game state provider (phase, tanks, terrain, turns)
│   └── UserContext.tsx       # Player profile provider (balance, stats)
├── components/
│   ├── Canvas.tsx            # Main game canvas (rendering loop)
│   ├── ControlPanel.tsx      # Angle, power, fire button, weapon selector
│   ├── WeaponSelectionPanel.tsx  # In-battle weapon chooser
│   ├── PlayerNameEntry.tsx   # Name input screen
│   ├── GameConfigScreen.tsx  # Battle configuration screen
│   ├── WeaponShop.tsx        # Pre-battle weapon purchase screen
│   ├── GameOverScreen.tsx    # Winner display + play again
│   ├── TurnIndicator.tsx     # Current turn/player display
│   ├── WindIndicator.tsx     # Wind speed + direction display
│   ├── TerrainSizeSelector.tsx   # Terrain size picker
│   ├── EnemyCountSelector.tsx    # Enemy count picker
│   └── ColorSelectionScreen.tsx  # Tank color picker
├── services/
│   └── storage.ts           # LocalStorage read/write for player profile
└── hooks/
    └── useKeyboard.ts        # Keyboard event handler for game controls
```

### Game Phase State Machine

```
[PlayerNameEntry] → [GameConfig] → [WeaponShop] → [Playing] → [GameOver]
                         ↑                                         │
                         └─────────────── "Play Again" ────────────┘
```

### Canvas Rendering Pipeline (per frame)

```
1. Clear canvas
2. Draw sky gradient background
3. Draw terrain (filled polygon)
4. Draw all alive tanks (body, wheels, turret, barrel)
5. Draw tank labels (name, health bar)
6. Draw current-turn indicator (arrow above active tank)
7. Draw active projectiles (circle + dotted trail)
8. Draw active explosions (expanding circle + particles)
9. Draw destruction animations (debris + particles)
```

### Physics Model

```
Coordinate System:
  - World: Y=0 at bottom, Y increases upward (math convention)
  - Screen: Y=0 at top, Y increases downward (canvas convention)
  - Conversion: screenY = canvasHeight - worldY

Projectile Motion:
  - vx = power * POWER_SCALE * cos(physicsAngle)
  - vy = power * POWER_SCALE * sin(physicsAngle)
  - x(t) = x0 + vx*t + 0.5*windAccel*t^2
  - y(t) = y0 + vy*t - 0.5*gravity*t^2

  Where:
  - POWER_SCALE ≈ 1.12 (calibrated so 100% power at 70° ≈ terrain width)
  - gravity = 10 px/s²
  - windAccel = wind * 0.15 px/s² per m/s of wind

Angle Conversion:
  - UI angle: 0=up, positive=left, negative=right, range ±120°
  - Physics angle: 0=right, 90=up (standard math)
  - physicsAngle = 90 - uiAngle (in degrees, then convert to radians)

Animation:
  - Visual speed multiplier: 5x (makes projectiles visually faster without changing physics)
  - dt per frame: (1/60) * speedMultiplier
```

### Wind Model

```
Initial wind: normalRandom(mean=0, stdDev=10), clamped to ±30
Per-turn update:
  newWind = oldWind * 0.7 + normalRandom(mean=0, stdDev=5)
  Clamp to ±30 m/s
```

### AI Shot Calculation

```
1. Select target (prefer same target as last turn if still alive)
2. Calculate ideal angle and power to hit target:
   - Use iterative/analytical solution accounting for gravity and wind
   - Binary search or direct formula for angle given distance and height difference
3. Add random variance based on difficulty:
   - actualAngle = idealAngle + random(±angleVariance)
   - actualPower = idealPower + random(±powerVariance)
4. Clamp to valid ranges (angle: ±120°, power: 0-100%)
```

### Damage Model

```
For each explosion at position (ex, ey) with weapon W:
  For each alive tank at position (tx, ty):
    distance = sqrt((ex-tx)^2 + (ey-ty)^2)
    if distance <= W.blastRadius:
      tank.hp -= W.damagePercent  (percentage of maxHP)
      if tank.hp <= 0:
        trigger destruction animation
        mark tank as dead
```

### Economy Model

```
Starting balance: 500 credits
Per kill: 200 * difficultyMultiplier
Win bonus: 250 * difficultyMultiplier
Loss consolation: 50 * difficultyMultiplier

Difficulty multipliers:
  Blind Fool: 0.5x
  Private: 0.75x
  Veteran: 1.0x
  Centurion: 1.25x
  Primus: 1.5x
```

### Weapon Configurations

```typescript
const WEAPONS = {
  standard: {
    name: "Standard Shell",
    damage: 35,       // percentage of max HP
    blastRadius: 20,  // pixels
    cost: 0,
    ammo: Infinity,
    speedMultiplier: 1.0,
    description: "Basic explosive shell. Reliable and free.",
    explosionColor: { center: "#FF4400", outer: "#FF8800" }
  },
  sniper: {
    name: "Sniper Shot",
    damage: 100,      // instant kill
    blastRadius: 12,  // very small - must be precise
    cost: 200,
    ammo: 0,          // must purchase
    speedMultiplier: 1.3,  // faster projectile
    description: "Precision round. One-shot kill but tiny blast radius.",
    explosionColor: { center: "#FFFFFF", outer: "#4488FF" }
  },
  heavy: {
    name: "Heavy Artillery",
    damage: 65,
    blastRadius: 35,  // large area
    cost: 250,
    ammo: 0,          // must purchase
    speedMultiplier: 0.8,  // slower, heavier
    description: "Massive blast radius. Doesn't need to be accurate.",
    explosionColor: { center: "#FF2200", outer: "#FF6600" }
  }
}
```

### LocalStorage Schema

```typescript
interface StoredPlayerProfile {
  name: string
  balance: number
  stats: {
    gamesPlayed: number
    gamesWon: number
    totalKills: number
  }
  weaponInventory: {
    sniper: number   // ammo count owned
    heavy: number    // ammo count owned
  }
}

// Storage key: "tank-battle-player"
// Serialization: JSON.stringify / JSON.parse
```

---

## Implementation Notes for One-Shot Build

### Build Order (Recommended)

1. **Project Setup**: Initialize Vite + React + TypeScript project, configure Vitest.
2. **Types**: Define all interfaces in `types/game.ts`.
3. **Engine - Terrain**: Implement midpoint displacement, height interpolation. Write tests.
4. **Engine - Physics**: Implement projectile motion equations, coordinate conversion. Write tests.
5. **Engine - Wind**: Implement wind generation and per-turn update. Write tests.
6. **Engine - Weapons**: Define weapon configs, damage calculation. Write tests.
7. **Engine - Tanks**: Tank placement on terrain, rendering dimensions. Write tests.
8. **Engine - AI**: Shot calculation with difficulty variance. Write tests.
9. **Engine - Projectile**: Creation, animation step, collision detection. Write tests.
10. **Engine - Explosion**: State machine (growing → fading), particle system. Write tests.
11. **Context - GameContext**: State management for all game phases and turn logic.
12. **Context - UserContext**: Player profile with LocalStorage persistence.
13. **Services - Storage**: LocalStorage CRUD for player profile.
14. **Components - PlayerNameEntry**: Simple name input form.
15. **Components - GameConfigScreen**: Terrain/enemy/difficulty/color selectors.
16. **Components - WeaponShop**: Purchase UI with balance display.
17. **Components - Canvas**: Main rendering loop (terrain, tanks, projectiles, explosions).
18. **Components - ControlPanel**: Angle/power/weapon/fire controls.
19. **Components - GameOverScreen**: Winner display + replay button.
20. **App.tsx**: Phase router connecting all screens.
21. **Integration Testing**: Play through full game loop manually.
22. **Polish**: Turn indicator, wind display, visual feedback.

### Critical Implementation Details

- **Separation of concerns**: Engine files MUST NOT import React. Components import from engine.
- **Pure functions**: All physics, AI, and damage calculations must be pure functions (input → output, no side effects) so they are easily testable.
- **Refs for animation**: Use React refs (not state) for values that change every frame (projectile position, explosion state) to avoid excessive re-renders.
- **Game loop**: The Canvas component runs a `requestAnimationFrame` loop. Game logic updates happen in the animation callback, not in React state updates.
- **Simultaneous fire**: When the player fires, immediately queue AI shots too. Then animate all projectiles together. After all resolve, apply damage, check for deaths, advance turn.
- **Coordinate conversion**: Be meticulous about world-to-screen coordinate conversion. Off-by-one errors here cause tanks to float or sink into terrain.
