# Verification — Decouple Game Loop from React (tanks-301)

**Date**: 2026-06-28
**Branch**: `agent/swann`

## What changed (architecture)

All per-frame game logic was extracted from `App.tsx`'s `handleRender` (~440 lines
that interleaved physics, collision, damage, scoring, audio, and drawing) into a
pure simulation layer under `src/engine/simulation/`:

- `stepProjectiles` / `stepEffects` / `stepMovement` / `stepAmbient` → composed by
  `stepSimulation(state, dtMs, ctx) → { state, events }` (pure, headless, tested).
- `useGameTick` drives one `stepSimulation` per rendered frame and drains the
  emitted `SimEvent`s.
- `App.tsx` now: **ADVANCE** (run the step, write refs) → drain events via
  `applyEvents` (damage / crater / audio / move-complete / scoring) → **RENDER**
  (pure, side-effect-free drawing of the resulting state).

## Why one step per frame (not fixed multi-stepping)

This engine's projectile/explosion physics is **absolute-time based**
(`position = f(now - startTime)`), so trajectories are already frame-rate
independent. Re-timing into fixed sub-steps would change explosion/particle feel,
which a behavior-preserving refactor must not do. The fixed-timestep accumulator
(`timestep.ts`) ships as infrastructure but is intentionally not used to
multi-step this time-based engine.

## Automated verification (all green)

- `npm run build` — TypeScript strict compile + Vite build: **pass**
- `npm run lint` — **0 errors** (6 pre-existing react-refresh warnings, unrelated)
- `npm test` — full suite **pass** (1189+ tests)
- Simulation unit tests: 62+ (incl. a determinism snapshot in
  `stepSimulation.test.ts` — identical inputs → identical events/state).
- Engine purity guard (`engine/enginePurity.test.ts`): no React/DOM imports
  anywhere under `src/engine/`.

## Runtime verification (headless Chromium via Playwright)

Full flow exercised against `npm run dev`: loading → Free Play → name → config
(Small / 1 foe / Primus) → weapon shop → battle → fire.

Confirmed:

- ✅ Battle renders: terrain, both tanks (+ names/turn arrow), wind indicator,
  control panel, weapon selector. (render path works as a pure consumer)
- ✅ Firing animates a projectile **with its dotted trajectory trace** across the
  canvas. (stepProjectiles + updateProjectileTrace + render)
- ✅ **Round advanced 1 → 2** after the volley settled — this requires the full
  cycle: fire → `ExplosionSpawned` → `stepEffects` advance/cull → settle →
  `incrementTurn` + `setWind`. (event drain + settle logic)
- ✅ **Zero console errors / page exceptions** throughout the entire flow.

## Manual regression checklist (for future changes to the loop)

- [ ] Fire each weapon type (standard, heavy, precision, cluster, napalm, EMP,
      bouncing betty, bunker buster, homing) — projectile animates, explodes,
      visuals match weapon.
- [ ] Cluster bomb splits near apex; sub-projectiles each explode.
- [ ] Bouncing Betty bounces the configured number of times.
- [ ] Homing missile tracks near end of flight.
- [ ] Bunker buster deforms terrain (crater) at impact.
- [ ] A hit reduces target HP; a lethal hit plays the destruction animation and
      removes the tank.
- [ ] Player kill awards money (floating "+$" animation) and updates balance.
- [ ] Campaign mode records kills/deaths; leaderboard updates.
- [ ] Tank movement (Q/E or touch) animates and consumes fuel; ends at target.
- [ ] Wind indicator changes between turns; wind visibly curves trajectories.
- [ ] Turn/round counter increments only after ALL projectiles + explosions +
      destructions have settled.
- [ ] Game ends correctly when one side remains; game-over screen shows winner.
- [ ] No console errors during a full 5-game session.
- [ ] Mobile layout: controls usable; canvas scales; shot fires via touch.
