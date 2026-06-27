# Implementation Tasks: Tank Battle Core Game

**Spec**: [spec.md](./spec.md)
**Created**: 2026-03-01
**Parallel Tracks**: 4 (A, B, C, D)
**Checkpoints**: 4 (user testing gates between phases)

---

## Track Legend

| Track | Focus Area | Color |
|-------|-----------|-------|
| **A** | Foundation, State Management, Economy | Red |
| **B** | Terrain, Tanks, Visual Effects | Blue |
| **C** | Physics, AI, Turn Resolution | Green |
| **D** | Weapons, UI Components, Controls | Yellow |

## Dependency Notation

- `[A]` = Track assignment
- `[P]` = Can run in parallel with other tasks in same phase
- `[US1]` = Maps to User Story 1
- `→ T###` = Depends on task completing first
- `[GATE]` = Checkpoint — all prior tasks must complete before proceeding

---

## Phase 1: Project Foundation

> **Goal**: Scaffold project, define all types, build core engine modules with tests.
> All 4 tracks work independently after T001-T002 complete.

- [ ] T001 [A] [US1] Initialize Vite + React + TypeScript project, configure Vitest, ESLint, tsconfig strict mode `in project root`
- [ ] T002 [A] [US1] Define all TypeScript interfaces and type enums (GamePhase, TankState, TerrainData, Projectile, WeaponType, WeaponConfig, Wind, AIDifficulty, GameState, StoredPlayerProfile) `in src/types/game.ts` → T001

**After T002, all tracks begin in parallel:**

- [ ] T003 [B] [P] [US6] Implement terrain generation (midpoint displacement algorithm, seeded RNG, height interpolation, terrain size configs). Write tests for: generation produces valid heights, interpolation accuracy, all 5 terrain sizes. `in src/engine/terrain.ts + terrain.test.ts` → T002
- [ ] T004 [C] [P] [US6] Implement physics engine (velocity from power/angle, projectile position at time t, coordinate conversion world↔screen, gravity constant, power scale calibration, angle conversion UI↔physics). Write tests for: trajectory symmetry, known angle/power outcomes, coordinate conversion round-trips. `in src/engine/physics.ts + physics.test.ts` → T002
- [ ] T005 [D] [P] [US3] Implement weapon configurations (3 weapon definitions with damage/blast/cost/speed/colors, damage calculation function, economy constants and difficulty multipliers). Write tests for: correct damage values, blast radius checks, economy math. `in src/engine/weapons.ts + weapons.test.ts` → T002

---

## Phase 2: Engine Completion

> **Goal**: Complete all pure engine modules. Every module has tests.
> Tracks have some cross-dependencies but maximize parallelism.

- [ ] T006 [C] [P] [US6] Implement wind system (initial wind from normal distribution, per-turn regression-to-mean update, ±30 m/s clamping). Write tests for: wind stays in bounds, regression toward zero over many turns. `in src/engine/wind.ts + wind.test.ts` → T004
- [ ] T007 [B] [P] [US1] Implement tank engine (tank placement on terrain at even spacing, tank dimensions/rendering constants, name pool for AI tanks, color assignment avoiding player color). Write tests for: tanks placed at correct terrain heights, even spacing, no duplicate colors. `in src/engine/tank.ts + tank.test.ts` → T003
- [ ] T008 [C] [P] [US5] Implement AI system (ideal shot calculation accounting for gravity+wind, difficulty variance tables, target selection with persistence, angle/power clamping). Write tests for: ideal shot hits target in zero wind, variance increases with lower difficulty, target persistence works. `in src/engine/ai.ts + ai.test.ts` → T004, T003
- [ ] T009 [D] [P] [US6] Implement projectile system (projectile creation from tank+angle+power+weapon, animation step function, terrain collision detection, tank collision detection, out-of-bounds check). Write tests for: collision with terrain at correct height, blast radius proximity check, OOB detection. `in src/engine/projectile.ts + projectile.test.ts` → T004, T003, T005
- [ ] T010 [A] [P] [US1] Implement explosion system (state machine: growing → peak → fading → done, particle generation with physics, weapon-specific colors, destruction animation state with debris pieces). Write tests for: state transitions, duration timing, particle count within bounds. `in src/engine/explosion.ts + explosion.test.ts` → T005

---

## ===== CHECKPOINT 1: Engine Verification =====

> **All engine modules complete with passing tests.**
>
> ### What to test:
> ```bash
> npm test
> ```
> - All tests green across: terrain, physics, wind, weapons, tank, ai, projectile, explosion
> - Coverage >80% on engine modules
> - `npm run build` compiles without errors
> - `npm run lint` passes
>
> ### What you'll see:
> - No UI yet — this is pure logic verification
> - Confirm physics feel right by inspecting test outputs (trajectory distances, damage values)
> - Review AI accuracy spread at each difficulty level in test output
>
> ### Go/No-Go:
> - [ ] All engine tests pass
> - [ ] Build succeeds
> - [ ] Lint passes
> - [ ] Physics constants feel calibrated (review test assertions)

---

## Phase 3: State Management & UI Screens

> **Goal**: Build React contexts, persistence, and all non-canvas screens.
> After this phase, the full menu flow is clickable end-to-end.

- [ ] T011 [A] [P] [US7] Implement LocalStorage service (save/load/clear player profile, JSON serialization, handle missing/corrupted data gracefully). Write tests for: save/load round-trip, default values on missing data. `in src/services/storage.ts` → T002
- [ ] T012 [B] [P] [US7] Implement UserContext (player name, balance, stats, weapon inventory; loads from storage on mount, saves on change; provides earnings calculation with difficulty multiplier). `in src/context/UserContext.tsx` → T011, T005
- [ ] T013 [C] [P] [US1] Implement GameContext (game phase state machine, terrain/tank/wind state, turn management, selected weapon tracking, winner detection; provides phase transition functions: startConfig, startShop, startBattle, endGame, playAgain). `in src/context/GameContext.tsx` → T002, T003, T007, T006
- [ ] T014 [D] [P] [US1] Implement PlayerNameEntry component (text input 1-20 chars, "Start" button, clean minimal styling, calls phase transition on submit). `in src/components/PlayerNameEntry.tsx` → T002

**After contexts exist (T012, T013):**

- [ ] T015 [A] [P] [US2] Implement GameConfigScreen (TerrainSizeSelector with 5 options, EnemyCountSelector 1-10, difficulty dropdown with 5 levels, ColorSelectionScreen with 8+ color swatches, "Start Battle" button; defaults: Medium/3/Veteran). Can inline sub-components or split into separate files. `in src/components/GameConfigScreen.tsx` → T013
- [ ] T016 [B] [P] [US3] Implement WeaponShop (display 3 weapons with name/description/damage/blast/cost, buy buttons with balance check, ammo count display, player balance prominently shown, "Ready for Battle" skip button). `in src/components/WeaponShop.tsx` → T012, T005
- [ ] T017 [C] [P] [US1] Implement GameOverScreen (winner name display, "Play Again" button that returns to config phase). Earnings breakdown will be added in Phase 5. `in src/components/GameOverScreen.tsx` → T013
- [ ] T018 [D] [P] [US1] Implement App.tsx phase router (render correct component based on GameContext phase, wrap app in UserContext + GameContext providers). `in src/App.tsx` → T013, T012, T014, T015, T016, T017

---

## ===== CHECKPOINT 2: Menu Flow Verification =====

> **Full menu flow is clickable. No gameplay yet.**
>
> ### What to test:
> ```bash
> npm run dev
> ```
> 1. App loads → see PlayerNameEntry screen
> 2. Type name, click Start → see GameConfigScreen
> 3. Change terrain size, enemy count, difficulty, color → all selectors respond
> 4. Click "Start Battle" → see WeaponShop
> 5. Buy sniper/heavy (balance deducts), or click "Ready for Battle"
> 6. Screen transitions to "Playing" phase (will be blank/placeholder canvas)
> 7. Manually trigger game over (or add temp button) → see GameOverScreen
> 8. Click "Play Again" → returns to GameConfigScreen
> 9. Refresh browser → name and balance persist from LocalStorage
>
> ### Go/No-Go:
> - [ ] All 5 phases transition correctly
> - [ ] Config defaults are correct (Medium/3/Veteran)
> - [ ] Weapon shop balance math is accurate
> - [ ] LocalStorage persistence works across refresh
> - [ ] No console errors

---

## Phase 4: Canvas Rendering & Combat

> **Goal**: Build the playable game. Canvas renders terrain/tanks, controls work,
> projectiles fly, explosions happen, AI fights back, someone wins.
> This is the largest phase — 4 tracks work on different canvas layers + controls.

**Canvas foundation (parallel):**

- [ ] T019 [A] [P] [US1] Implement Canvas component foundation (requestAnimationFrame loop, sky gradient background, terrain rendering as filled polygon, world-to-screen coordinate conversion, canvas sizing from terrain config). `in src/components/Canvas.tsx` → T013, T003
- [ ] T020 [B] [P] [US1] Implement tank rendering in Canvas (tank body, wheels, turret with rotation, barrel at current angle, player color + AI colors, floating name labels, health bars with percentage fill, current-turn arrow indicator). `in src/components/Canvas.tsx` → T019, T007
- [ ] T021 [C] [P] [US4] Implement useKeyboard hook (W/S or Up/Down for angle ±1°, A/D or Left/Right for power ±1%, Shift modifier for 5x speed, Space/Enter to fire, Q/E for movement, disable when not player's turn). `in src/hooks/useKeyboard.ts` → T013
- [ ] T022 [D] [P] [US4] Implement ControlPanel component (angle display + slider, power display + slider, Fire button, disable state when not player's turn, visually show current values). `in src/components/ControlPanel.tsx` → T013

**After canvas foundation + controls exist:**

- [ ] T023 [A] [P] [US6] Implement projectile rendering in Canvas (animate projectile circle along trajectory, draw dotted trail behind projectile, handle multiple simultaneous projectiles, remove projectile on collision/OOB). `in src/components/Canvas.tsx` → T020, T009
- [ ] T024 [B] [P] [US1] Implement explosion + destruction rendering in Canvas (expanding circle explosion with weapon-colored particles, tank destruction animation with debris/hull pieces, timed state machine driving visual progression). `in src/components/Canvas.tsx` → T020, T010
- [ ] T025 [C] [P] [US1] [US5] Implement turn resolution logic in GameContext (player fires → queue AI shots via ai.ts → create all projectiles → animate simultaneously → detect collisions → apply damage → check for deaths → trigger explosions/destructions → check win condition → advance turn or end game). `in src/context/GameContext.tsx` → T013, T008, T009, T010
- [ ] T026 [D] [P] [US3] Implement WeaponSelectionPanel (in-battle weapon chooser showing owned weapons with ammo counts, highlight selected weapon, gray out empty weapons, click to switch active weapon, integrate with GameContext selectedWeapon). `in src/components/WeaponSelectionPanel.tsx` → T013, T005

---

## ===== CHECKPOINT 3: Playable Game =====

> **The game is fully playable end-to-end. This is the critical milestone.**
>
> ### What to test:
> ```bash
> npm run dev
> ```
> 1. Full flow: Name → Config → Shop → Battle canvas appears
> 2. **Terrain**: Procedural hills render correctly, vary by terrain size
> 3. **Tanks**: Player + AI tanks sit on terrain, correct colors, name labels, health bars
> 4. **Controls**: Adjust angle (W/S), power (A/D), see values update in control panel
> 5. **Firing**: Press Space → projectile launches with visible trail, follows arc
> 6. **Wind**: Projectile curves in wind direction (check wind indicator)
> 7. **Simultaneous fire**: AI tanks fire at the same time, multiple projectiles visible
> 8. **Collision**: Projectile hits terrain → explosion. Hits tank → damage + explosion.
> 9. **Damage**: Health bars decrease. Sniper shot = instant kill. Heavy = big blast.
> 10. **Destruction**: Tank at 0 HP plays destruction animation, removed from play
> 11. **AI targeting**: AI shots aim toward player/other tanks (accuracy varies by difficulty)
> 12. **Win condition**: Last tank standing → GameOverScreen with winner name
> 13. **Weapons**: Weapon selector works, ammo decrements, empty weapons grayed out
> 14. **Loop**: "Play Again" returns to config, can play another game
>
> ### Stress tests:
> - Play with 10 enemies on Epic terrain — performance holds at 60fps
> - Play on Blind Fool vs Primus — accuracy difference is obvious
> - Use only sniper shots — one-hit kills work
> - Use only heavy artillery — splash damage hits multiple nearby tanks
>
> ### Go/No-Go:
> - [ ] Full game loop completes without crashes
> - [ ] Physics feel right (arcs, wind effect, range)
> - [ ] AI provides appropriate challenge at each difficulty
> - [ ] All 3 weapons work correctly with distinct behavior
> - [ ] Win detection works every time
> - [ ] Can play 3 consecutive games without issues

---

## Phase 5: Polish, Economy & Edge Cases

> **Goal**: Add economy system, viewport management, movement, indicators,
> and handle all edge cases. Final quality pass.

- [ ] T027 [A] [P] [US7] Implement economy system in game flow (calculate earnings on game end: kills * 200 * difficultyMult + win/loss bonus, update UserContext balance, pass earnings data to GameOverScreen). `in src/context/GameContext.tsx + UserContext.tsx` → T025, T012
- [ ] T028 [B] [P] [US6] Implement WindIndicator component (numeric wind speed, directional arrow, color intensity by wind strength) and TurnIndicator component (current turn number, "Your Turn" label). `in src/components/WindIndicator.tsx + TurnIndicator.tsx` → T013
- [ ] T029 [C] [P] [US7] Update GameOverScreen with earnings breakdown (kills count, kill earnings, win/loss bonus, difficulty multiplier, total earned, new balance). `in src/components/GameOverScreen.tsx` → T027
- [ ] T030 [D] [P] [US1] Implement canvas viewport system (scrolling/panning for large terrains, auto-center on player tank at turn start, smooth camera transitions, clamp to terrain bounds). `in src/components/Canvas.tsx` → T023

**After economy + viewport:**

- [ ] T031 [A] [P] [US4] Implement tank movement system (Q/E moves tank left/right along terrain, fuel consumption, fuel budget per game scaling with terrain size, terrain height tracking during movement, prevent moving off terrain edges). `in src/context/GameContext.tsx + Canvas.tsx` → T025
- [ ] T032 [B] [P] [US1] Implement wind particle effects on canvas (subtle particles flowing in wind direction, speed proportional to wind, adds visual feedback for wind strength). `in src/components/Canvas.tsx` → T028
- [ ] T033 [C] [P] [US1] Handle edge cases (simultaneous player+AI death → player favored, all AI destroyed in one volley → immediate win, damage to multiple tanks in blast radius, tank at terrain edge can't move further, 0-credit shop experience). `in src/context/GameContext.tsx` → T025
- [ ] T034 [D] [P] [US1] Full integration test pass — build, lint, all unit tests, manual play-through of 5 consecutive games verifying: no stuck states, correct winner every time, economy accumulates properly, stats increment correctly. `in all test files` → T027, T029, T031, T033

---

## ===== CHECKPOINT 4: Complete Game — Final Verification =====

> **Everything works. All features, all edge cases, all tests.**
>
> ### What to test:
> ```bash
> npm run build && npm run lint && npm test
> ```
> All three must pass clean.
>
> ### Manual test protocol:
>
> **Game 1 — Basic flow (Veteran, 3 enemies, Medium terrain)**
> - [ ] Config → Shop → Battle flows smoothly
> - [ ] Win the game, verify earnings breakdown on GameOverScreen
> - [ ] Balance increases correctly
> - [ ] Stats update (games played, wins, kills)
>
> **Game 2 — Economy check (buy weapons, verify balance)**
> - [ ] Starting balance = previous balance
> - [ ] Buy 2 sniper shots (−400), 1 heavy (−250)
> - [ ] Use sniper → one-hit kill, ammo decrements
> - [ ] Use heavy → big explosion, damages tanks in radius
> - [ ] Run out of ammo → weapon grayed out, auto-switch to standard
>
> **Game 3 — Difficulty spread**
> - [ ] Play Blind Fool with 1 enemy → AI misses constantly
> - [ ] Play Primus with 1 enemy → AI is deadly accurate
> - [ ] Earnings differ by difficulty multiplier
>
> **Game 4 — Large terrain (Epic, 10 enemies)**
> - [ ] Canvas scrolls/pans to show full terrain
> - [ ] Camera centers on player tank each turn
> - [ ] 11 simultaneous projectiles animate at 60fps
> - [ ] Game completes without performance issues
>
> **Game 5 — Edge cases**
> - [ ] Tank at terrain edge can't move further
> - [ ] Win with 0 credits → shop shows only standard shell
> - [ ] Refresh mid-game → stats from previous games still in LocalStorage
> - [ ] Movement (Q/E) works, fuel depletes, tank follows terrain
> - [ ] Wind changes each turn, wind indicator updates
>
> ### Final Go/No-Go:
> - [ ] `npm run build` — clean
> - [ ] `npm run lint` — clean
> - [ ] `npm test` — all green, >80% engine coverage
> - [ ] 5 consecutive games played without errors
> - [ ] Economy accumulates correctly across all 5 games
> - [ ] LocalStorage persists after browser restart
> - [ ] All 3 weapons behave distinctly
> - [ ] AI difficulty is perceptibly different
> - [ ] Large terrain viewport works smoothly

---

## Task Dependency Graph

```
Phase 1: Foundation
  T001 → T002 → ┬─ T003 (terrain)     [B]
                 ├─ T004 (physics)     [C]
                 └─ T005 (weapons)     [D]

Phase 2: Engine Completion
  T003 ──┬─ T007 (tank)        [B]
  T004 ──┤
  T003 ──┼─ T008 (ai)          [C]
  T004 ──┤
  T004 ──┤
  T003 ──┼─ T009 (projectile)   [D]
  T005 ──┘
  T004 ──── T006 (wind)         [C]
  T005 ──── T010 (explosion)    [A]

  ════════ CHECKPOINT 1 ════════

Phase 3: State & Screens
  T002 ──── T011 (storage)      [A]
  T011 ──┬─ T012 (UserCtx)      [B]
  T005 ──┘
  T002,T003,T006,T007 → T013 (GameCtx) [C]
  T002 ──── T014 (NameEntry)    [D]
  T013 ──── T015 (ConfigScreen) [A]
  T012 ──┬─ T016 (WeaponShop)   [B]
  T005 ──┘
  T013 ──── T017 (GameOver)     [C]
  T013,T012,T014-T017 → T018 (App.tsx) [D]

  ════════ CHECKPOINT 2 ════════

Phase 4: Canvas & Combat
  T013,T003 → T019 (Canvas base)     [A]
  T019,T007 → T020 (tank render)     [B]
  T013 ──── T021 (keyboard)          [C]
  T013 ──── T022 (ControlPanel)      [D]
  T020,T009 → T023 (projectile anim) [A]
  T020,T010 → T024 (explosion anim)  [B]
  T013,T008,T009,T010 → T025 (turns) [C]
  T013,T005 → T026 (WeaponSelect)    [D]

  ════════ CHECKPOINT 3 ════════

Phase 5: Polish & Edge Cases
  T025,T012 → T027 (economy)         [A]
  T013 ──── T028 (indicators)        [B]
  T027 ──── T029 (GameOver+earnings)  [C]
  T023 ──── T030 (viewport)          [D]
  T025 ──── T031 (movement)          [A]
  T028 ──── T032 (wind particles)    [B]
  T025 ──── T033 (edge cases)        [C]
  T027-T033 → T034 (integration)     [D]

  ════════ CHECKPOINT 4 ════════
```

---

## Estimated Track Utilization

| Phase | Track A | Track B | Track C | Track D |
|-------|---------|---------|---------|---------|
| 1 | T001, T002 | T003 | T004 | T005 |
| 2 | T010 | T007 | T006, T008 | T009 |
| 3 | T011, T015 | T012, T016 | T013, T017 | T014, T018 |
| 4 | T019, T023 | T020, T024 | T021, T025 | T022, T026 |
| 5 | T027, T031 | T028, T032 | T029, T033 | T030, T034 |

Each track handles **8-9 tasks** across the project. No track is idle during any phase.

---

## Quick Reference: Task Count by User Story

| User Story | Tasks | IDs |
|-----------|-------|-----|
| US1 - Complete Battle | 18 | T001-T002, T007, T010, T013-T014, T017-T020, T024-T025, T028, T030-T034 |
| US2 - Configure Battle | 1 | T015 |
| US3 - Weapon Shop | 3 | T005, T016, T026 |
| US4 - Tank Controls | 3 | T021-T022, T031 |
| US5 - AI Turns | 2 | T008, T025 |
| US6 - Physics/Projectiles | 6 | T003-T004, T006, T009, T023, T028 |
| US7 - Economy/Progress | 4 | T011-T012, T027, T029 |
