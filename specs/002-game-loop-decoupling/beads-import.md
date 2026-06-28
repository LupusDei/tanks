# Decouple Game Loop from React - Beads

**Feature**: 002-game-loop-decoupling
**Generated**: 2026-06-28
**Source**: specs/002-game-loop-decoupling/tasks.md

## Root Epic

- **ID**: tanks-301
- **Title**: Decouple Game Loop from React
- **Type**: epic
- **Priority**: 1
- **Description**: Extract per-frame game logic from App.tsx's Canvas onRender into
  a pure, fixed-timestep simulation step (src/engine/simulation/) driven by a
  useGameTick hook; rendering becomes a pure consumer. Behavior preserved.

## Epics

### Phase 1 — Foundational: simulation model + fixed-timestep
- **ID**: tanks-301.1 — Type: epic — Priority: 1 — Blocks: US1 — Tasks: 2

### Phase 2 — US1 (MVP): pure simulation step extraction
- **ID**: tanks-301.2 — Type: epic — Priority: 1 — MVP: true — Tasks: 5

### Phase 3 — US2: useGameTick hook + integration
- **ID**: tanks-301.3 — Type: epic — Priority: 1 — Tasks: 3

### Phase 4 — Polish: verification + cleanup
- **ID**: tanks-301.4 — Type: epic — Priority: 2 — Depends: US2 — Tasks: 2

## Tasks

### Phase 1 — Foundational
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T001 | SimulationState/SimEvent/TickContext types | src/engine/simulation/types.ts | tanks-301.1.1 |
| T002 | Fixed-timestep accumulator | src/engine/simulation/timestep.ts | tanks-301.1.2 |

### Phase 2 — US1 (MVP)
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T003 | stepProjectiles (motion + collision → events) | src/engine/simulation/stepProjectiles.ts | tanks-301.2.1 |
| T004 | stepEffects (explosion + destruction lifecycle) | src/engine/simulation/stepEffects.ts | tanks-301.2.2 |
| T005 | stepMovement (tank move easing) | src/engine/simulation/stepMovement.ts | tanks-301.2.3 |
| T006 | stepAmbient (wind particles + money) | src/engine/simulation/stepAmbient.ts | tanks-301.2.4 |
| T007 | compose stepSimulation → {state, events} | src/engine/simulation/stepSimulation.ts | tanks-301.2.5 |

### Phase 3 — US2
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T008 | useGameTick hook (rAF + accumulator + drain) | src/hooks/useGameTick.ts | tanks-301.3.1 |
| T009 | Refactor App.tsx to drive sim via hook | src/App.tsx | tanks-301.3.2 |
| T010 | Canvas render becomes pure consumer | src/components/Canvas.tsx | tanks-301.3.3 |

### Phase 4 — Polish
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T011 | Remove dead sim code + no-React-in-engine guard | src/App.tsx, lint | tanks-301.4.1 |
| T012 | Perf + determinism verification + regression checklist | specs/ | tanks-301.4.2 |

## Summary
| Phase | Tasks | Priority | Bead |
|-------|-------|----------|------|
| 1: Foundational | 2 | 1 | tanks-301.1 |
| 2: US1 (MVP) | 5 | 1 | tanks-301.2 |
| 3: US2 | 3 | 1 | tanks-301.3 |
| 4: Polish | 2 | 2 | tanks-301.4 |
| **Total** | **12 tasks + 4 sub-epics + 1 root = 17 beads** | | |

## Dependency Graph

```
tanks-301.1 (Foundational)
    | blocks
tanks-301.2 (US1, MVP) ── compose .2.5 needs .2.1–.2.4
    | blocks
tanks-301.3 (US2) ── .3.1 → .3.2 → .3.3 (sequential, shared files)
    | blocks
tanks-301.4 (Polish)
```
