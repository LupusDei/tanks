# Implementation Plan: Decouple Game Loop from React

**Branch**: `002-game-loop-decoupling` | **Date**: 2026-06-28
**Epic**: `tanks-301` | **Priority**: P1

## Summary

Extract per-frame game logic out of `App.tsx`'s Canvas `onRender` callback into a
pure, fixed-timestep simulation step under `src/engine/simulation/`, driven by a
new `useGameTick` hook. Rendering becomes a pure consumer of simulation state.
Behavior preserved exactly; the win is determinism + testability + render/sim
decoupling. Reference: auto-tank `src/engine/{GameLoop,TickLoop,GameManager}.ts`.

## Bead Map

- `tanks-301` — Root: Decouple Game Loop from React
  - `tanks-301.1` — Foundational: simulation model + fixed-timestep
    - `tanks-301.1.1` — SimulationState + SimEvent + TickContext types
    - `tanks-301.1.2` — Fixed-timestep accumulator utility
  - `tanks-301.2` — US1 (MVP): pure simulation step extraction
    - `tanks-301.2.1` — stepProjectiles (motion + terrain/tank collision → events)
    - `tanks-301.2.2` — stepEffects (explosion + destruction lifecycles)
    - `tanks-301.2.3` — stepMovement (tank move easing → MoveComplete)
    - `tanks-301.2.4` — stepAmbient (wind particles + money animations)
    - `tanks-301.2.5` — compose stepSimulation → { state, events }
  - `tanks-301.3` — US2: useGameTick hook + App/Canvas integration
    - `tanks-301.3.1` — useGameTick hook (owns rAF + accumulator, updates refs)
    - `tanks-301.3.2` — Refactor App.tsx to drive sim via hook; drain events→actions
    - `tanks-301.3.3` — Canvas render becomes pure consumer (renderScene)
  - `tanks-301.4` — Polish: verification + cleanup
    - `tanks-301.4.1` — Remove dead sim code from handleRender; enforce no-React-in-engine
    - `tanks-301.4.2` — Perf + determinism verification; manual regression checklist

## Technical Context

**Stack**: React 18, TypeScript strict, Vite, Canvas 2D, Vitest.
**Storage**: N/A (refactor).
**Testing**: Vitest (unit). Engine functions pure → headless tests.
**Constraints**: No React/DOM in `src/engine/`. Preserve 60fps. No `any`.

## Architecture Decision

The current ref-based pattern (projectilesRef, explosionsRef, …) already keeps
per-frame mutable data out of React state — good. The problem is that the *update
logic* lives in the render callback and calls React actions mid-frame. We:

1. Lift the mutable refs' shape into an explicit `SimulationState` type.
2. Move all update logic into pure `step*` functions returning `{state, events}`.
3. Have `useGameTick` own a fixed-timestep accumulator (auto-tank `TickLoop`
   pattern): accumulate real `dt`, run N fixed steps (clamped), store the result in
   refs, then drain `events` into React via existing actions once per frame.
4. Rendering reads the latest sim state and draws — no mutation.

Events (not direct action calls) are the seam that keeps the step pure and the
React coupling at the boundary. This mirrors auto-tank's GameManager dispatching
results to the UI layer.

## Files Changed

| File | Change |
|------|--------|
| `src/engine/simulation/types.ts` | New: SimulationState, SimEvent union, TickContext |
| `src/engine/simulation/timestep.ts` | New: fixed-timestep accumulator |
| `src/engine/simulation/stepProjectiles.ts` | New: projectile motion + collision |
| `src/engine/simulation/stepEffects.ts` | New: explosion + destruction lifecycle |
| `src/engine/simulation/stepMovement.ts` | New: tank move animation |
| `src/engine/simulation/stepAmbient.ts` | New: wind particles + money popups |
| `src/engine/simulation/stepSimulation.ts` | New: composition + event aggregation |
| `src/engine/index.ts` | Export simulation API |
| `src/hooks/useGameTick.ts` | New: rAF loop + accumulator + event drain |
| `src/App.tsx` | Remove sim from handleRender; wire useGameTick; map events→actions |
| `src/components/Canvas.tsx` | Render becomes pure consumer of sim state |

## Phase 1: Foundational

Define the data contract first (types) and the loop primitive (accumulator) so the
step functions and hook build against a stable interface. Both new files, fully
parallel-safe.

## Phase 2: US1 - Pure simulation step (MVP)

Port each block of `handleRender` into its own pure step with tests. Order:
projectiles → effects → movement → ambient, then compose. `.2.1`–`.2.4` are
largely independent (separate files); `.2.5` depends on all four.

## Phase 3: US2 - Hook + integration

Build `useGameTick` against the composed step, then refactor `App.tsx` and
`Canvas.tsx`. These touch the same big files and MUST be sequential (`.3.1` →
`.3.2` → `.3.3`).

## Phase 4: Polish

Delete dead code, add the no-React-in-engine guard, verify perf/determinism and run
the manual regression checklist.

## Parallel Execution

- `tanks-301.1.1` ∥ `tanks-301.1.2` (different new files).
- `tanks-301.2.1` ∥ `.2.2` ∥ `.2.3` ∥ `.2.4` (different new files) after Phase 1.
- `tanks-301.2.5`, all of Phase 3, and Phase 4 are sequential (shared files /
  composition). Phase 3 in particular edits `App.tsx`/`Canvas.tsx` — single-writer.

## Verification Steps

- [ ] `npm run build && npm run lint && npm test` green.
- [ ] No `import ... react` under `src/engine/` (grep gate).
- [ ] Determinism snapshot test passes for fixed seed + dt sequence.
- [ ] Manual: full battle (3 enemies) — fire all weapons, kill, move, win/lose —
      matches pre-refactor behavior.
- [ ] DevTools perf: 11 simultaneous projectiles hold ~60fps.
