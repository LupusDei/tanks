# Tasks: Decouple Game Loop from React

**Input**: Design documents from `/specs/002-game-loop-decoupling/`
**Epic**: `tanks-301`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no deps)
- **[Story]**: US label

## Phase 1: Foundational (`tanks-301.1`)

**Purpose**: Stable data contract + loop primitive before any extraction.

- [ ] T001 [P] Define `SimulationState`, `SimEvent` (discriminated union:
      `TankHit`, `TankDestroyed`, `MoveComplete`, `ProjectileResolved`,
      `CraterCreated`), and `TickContext` in `src/engine/simulation/types.ts`.
      Mirror the current ref shapes in `App.tsx`. + tests.
- [ ] T002 [P] Implement fixed-timestep accumulator
      `createAccumulator(stepMs, maxSteps)` returning the number of steps to run for
      a given real `dt`, with spiral-of-death clamp, in
      `src/engine/simulation/timestep.ts`. + tests (happy/clamp/edge).

**Checkpoint**: Interfaces frozen — step functions can be built in parallel.

---

## Phase 2: US1 - Pure simulation step (Priority: P1, MVP) (`tanks-301.2`)

**Goal**: All per-frame logic as pure, tested functions returning `{state,events}`.
**Independent Test**: headless Vitest assertions on positions/events/timers.

- [ ] T003 [P] [US1] `stepProjectiles(state, dt, ctx) -> {projectiles, events}`:
      advance projectile physics (reuse `engine/physics`, `engine/projectile`),
      handle bounce/cluster/homing updates, detect terrain + tank collision, emit
      `TankHit`/`ProjectileResolved`/`CraterCreated`. File
      `src/engine/simulation/stepProjectiles.ts`. + tests.
- [ ] T004 [P] [US1] `stepEffects(state, dt) -> {explosions, destructions, events}`:
      advance explosion + tank-destruction lifecycles (reuse `engine/explosion`,
      `engine/tankDestruction`), remove expired, emit `TankDestroyed` on death.
      File `src/engine/simulation/stepEffects.ts`. + tests.
- [ ] T005 [P] [US1] `stepMovement(tanks, dt) -> {tanks, events}`: ease moving
      tanks toward target X (reuse `engine/movement`), follow terrain height, emit
      `MoveComplete` once on arrival. File `src/engine/simulation/stepMovement.ts`.
      + tests.
- [ ] T006 [P] [US1] `stepAmbient(state, dt, ctx) -> {windParticles,
      moneyAnimations}`: advance wind particles (reuse `engine/windParticles`) and
      money popups (reuse `engine/moneyAnimation`), spawn/cull. File
      `src/engine/simulation/stepAmbient.ts`. + tests.
- [ ] T007 [US1] `stepSimulation(state, dt, ctx) -> {state, events}`: compose
      T003–T006, aggregate events, single entry point. File
      `src/engine/simulation/stepSimulation.ts`; export from `src/engine/index.ts`.
      + composition + determinism snapshot tests.

**Checkpoint**: Simulation runs headless, fully tested, no React.

---

## Phase 3: US2 - Hook + integration (Priority: P1) (`tanks-301.3`)

**Goal**: Drive the real game from the decoupled loop; render is pure consumer.

- [ ] T008 [US2] `useGameTick({ getContext, onEvents, stateRefs })` in
      `src/hooks/useGameTick.ts`: own rAF loop + accumulator (T002), call
      `stepSimulation` N fixed steps/frame, write results to refs, drain events via
      `onEvents` once per frame, start/stop on phase. + tests with mocked stepper.
- [ ] T009 [US2] Refactor `src/App.tsx`: remove simulation from `handleRender`;
      mount `useGameTick`; implement `onEvents` mapping (`TankHit`→damage,
      `TankDestroyed`→kill/earnings/`gameKillsRef`, `MoveComplete`→
      `completeTankMove`, `CraterCreated`→terrain update). Depends on T007, T008.
- [ ] T010 [US2] Make rendering a pure consumer: extract `renderScene(ctx,
      simState, viewState)` (draw-only) and have `Canvas.tsx` call it; no simulation
      in the render path. Files `src/components/Canvas.tsx`, `src/App.tsx`. Depends
      on T009.

**Checkpoint**: Full game plays identically on the decoupled loop.

---

## Phase 4: Polish & Cross-Cutting (`tanks-301.4`)

- [ ] T011 [P] Remove dead simulation code paths from `handleRender`; add a
      no-React-in-engine guard (lint rule or test that greps `src/engine` for
      `from 'react'`). Files `src/App.tsx`, lint config / test.
- [ ] T012 Perf + determinism verification: DevTools frame-time check with 11
      projectiles, determinism snapshot, and a written manual regression checklist
      in `specs/002-game-loop-decoupling/`. Depends on T010.

---

## Dependencies

- Phase 1 (T001, T002) → blocks Phase 2.
- T003–T006 parallel; T007 depends on T003–T006.
- T008 depends on T002 (accumulator) + T007 (stepper signature).
- T009 depends on T007 + T008; T010 depends on T009.
- Phase 4 depends on T010.

## Parallel Opportunities

- T001 ∥ T002.
- T003 ∥ T004 ∥ T005 ∥ T006 (separate new files).
- Everything from T007 onward is effectively sequential (composition + shared
  `App.tsx`/`Canvas.tsx` single-writer).
