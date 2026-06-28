# Feature Specification: Decouple Game Loop from React

**Feature Branch**: `002-game-loop-decoupling`
**Created**: 2026-06-28
**Status**: Draft
**Epic**: `tanks-301`

## Problem

All per-frame game logic — projectile physics, terrain/tank collision, damage
application, explosion + destruction lifecycles, tank-movement animation, wind
particles, and money popups — currently runs **inside the Canvas `onRender`
callback** in `src/App.tsx` (~lines 908–1345). Simulation is therefore welded to
React's render cadence: any React re-render hiccup stalls physics, the timestep is
whatever rAF hands us (no fixed-step determinism), and simulation is impossible to
unit-test in isolation because it is entangled with React state mutations
(`actions.completeTankMove`, damage dispatch, `gameKillsRef`, etc.).

The sibling project **auto-tank** (`/Users/Reason/code/ai/auto-tank`) already
solves this cleanly with a standalone engine loop
(`src/engine/GameLoop.ts`, `TickLoop.ts`, `GameManager.ts`). We adopt the same
separation here.

## Goal

Extract a **pure, fixed-timestep simulation step** into `src/engine/simulation/`
and drive it from a `useGameTick` hook that owns the rAF loop and advances
ref-based simulation state independently of React. The Canvas render becomes a
**pure consumer** that only draws current state. Behavior must be preserved
exactly — this is a refactor, not a gameplay change.

## User Scenarios & Testing

### User Story 1 - Pure, testable simulation step (Priority: P1, MVP)

The per-frame simulation is a set of pure functions: `step(state, dt, context) ->
{ state, events }`. No React, no canvas, no globals. Each is unit-tested for
ballistic motion, collision, explosion/destruction lifecycle progression,
movement easing, and particle updates.

**Why this priority**: This is the core of the refactor and the only part that
delivers lasting value (testability + determinism). Everything else is wiring.

**Independent Test**: Call `stepSimulation` with a known state and `dt`; assert
projectile positions, emitted hit/destroy events, and effect timers match
expected values. Runs headless in Vitest, no DOM.

**Acceptance Scenarios**:

1. **Given** an in-flight projectile and a fixed `dt`, **When** `stepSimulation`
   runs, **Then** the projectile advances by the analytically-expected amount and
   no React/canvas API is touched.
2. **Given** a projectile overlapping a tank, **When** the step runs, **Then** a
   `TankHit` event is emitted with the correct tank id and damage; state is not
   mutated in place (pure return).
3. **Given** an active explosion past its duration, **When** the step runs,
   **Then** it is removed and (if it killed a tank) a `TankDestroyed` event is
   emitted.
4. **Given** a tank mid-move with a target X, **When** repeated steps run, **Then**
   its position eases to the target and a `MoveComplete` event fires once on
   arrival.

### User Story 2 - Fixed-timestep loop driving React (Priority: P1)

A `useGameTick` hook runs an rAF loop with a fixed-timestep accumulator, calls
`stepSimulation` zero-or-more times per frame, stores results in refs, and drains
emitted `SimEvent`s into React state via existing actions at frame boundaries.
`App.tsx` no longer performs simulation inside render.

**Why this priority**: Without integration the extraction is dead code; this makes
the decoupling real while preserving the existing game.

**Independent Test**: Play a full battle; projectiles, explosions, movement,
damage, and game-over all behave as before. Hook unit-tested for accumulator math
and event draining with a mocked stepper.

**Acceptance Scenarios**:

1. **Given** a low/variable frame rate, **When** the loop runs, **Then**
   simulation advances by fixed steps (deterministic) and rendering interpolates or
   draws the latest state without affecting physics.
2. **Given** the simulation emits a `TankDestroyed` event, **When** the frame ends,
   **Then** React state/score/earnings update exactly once via existing actions.
3. **Given** the player pauses/leaves the playing phase, **When** the loop checks
   phase, **Then** simulation halts and resumes correctly.

### Edge Cases

- Tab backgrounded → large `dt` spike: clamp accumulated time (max steps per frame)
  to avoid a spiral-of-death; never run unbounded catch-up.
- Phase change mid-flight (e.g., game over while a projectile is airborne):
  simulation drains safely; no orphaned refs.
- Simultaneous fire with up to 11 projectiles: all advance in one step pass.
- Engine must remain import-free of React (enforced by lint/architecture check).

## Requirements

### Functional Requirements

- **FR-001**: All per-frame simulation MUST live in pure functions under
  `src/engine/simulation/` with zero React/DOM/canvas imports.
- **FR-002**: `stepSimulation(state, dt, context)` MUST return a new state plus a
  list of `SimEvent`s; it MUST NOT mutate React state or call actions directly.
- **FR-003**: A fixed-timestep accumulator MUST decouple simulation `dt` from
  render frame time, with a clamped max catch-up.
- **FR-004**: `useGameTick` MUST own the rAF loop, advance simulation into refs,
  and drain `SimEvent`s into React actions at frame boundaries.
- **FR-005**: Canvas rendering MUST become a pure consumer of simulation state (no
  simulation side effects in the render path).
- **FR-006**: Existing gameplay behavior MUST be preserved (no observable change to
  physics, damage, animations, or outcomes).
- **FR-007**: New simulation functions MUST meet the constitution test minimums
  (≥3 tests per public function: happy/error/edge).

### Key Entities

- **SimulationState**: projectiles, explosions, destructions, wind particles,
  money animations, and per-tank transient motion — the mutable per-frame data
  currently held in refs.
- **SimEvent**: discriminated union — `TankHit`, `TankDestroyed`, `MoveComplete`,
  `ProjectileResolved`, `CraterCreated`, etc. — consumed by App to mutate React
  state.
- **TickContext**: read-only inputs the step needs (terrain, wind, tanks config,
  weapon configs, canvas dims).

## Success Criteria

- **SC-001**: `stepSimulation` and sub-steps have ≥80% line / ≥70% branch coverage.
- **SC-002**: Engine has no React imports (verified by lint rule / grep gate).
- **SC-003**: A full 3-enemy battle plays identically to pre-refactor (manual
  regression checklist passes).
- **SC-004**: Simulation is deterministic for a fixed seed + fixed `dt` sequence
  (snapshot test).
- **SC-005**: 60fps preserved with 11 simultaneous projectiles (no regression).
- **SC-006**: `npm run build && npm run lint && npm test` all green.
