# Implementation Plan: Aim Trajectory Preview + Nuke Weapon

**Branch**: `004-aim-preview-nuke` | **Date**: 2026-06-29
**Epic**: `tanks-303` | **Priority**: P1
**Source**: ported from auto-tank.

## Summary

Two independent, parallelizable features ported from auto-tank:
1. A pure wind-aware trajectory-preview function (reusing tanks' own
   `calculatePosition`) rendered as a fading dotted arc during the player's aim.
2. A Nuke superweapon added to the existing weapon system (config + dramatic
   nuclear explosion + big crater), auto-listed in the shop.

## Bead Map

- `tanks-303` — Root: Aim preview + Nuke (ported from auto-tank)
  - `tanks-303.1` — US1: Aim Trajectory Preview (MVP)
    - `tanks-303.1.1` — Engine: wind-aware aim trajectory + terrain truncation
    - `tanks-303.1.2` — Render: fading dotted preview during player aim
  - `tanks-303.2` — US2: Nuke Weapon
    - `tanks-303.2.1` — Config: WeaponType + WEAPON_NUKE + switches + shop balance
    - `tanks-303.2.2` — Explosion FX: nuclear explosion + white detonation flash
  - `tanks-303.3` — Polish: gates + runtime verification + regression checklist

## Technical Context

**Stack**: React 18, TS strict, Vite, Canvas 2D, Vitest.
**Reused**: `calculatePosition`/`createLaunchConfig` (physics), `checkTerrainCollision`/
`getInterpolatedHeightAt` (truncation), `WEAPONS`/`getPurchasableWeapons`/
`getDestructionCategory`/`getProjectileVisual`, the explosion config switch.
**Constraints**: engine React-free (lint guard); behavior-preserving for existing
weapons; runtime verification required.

## Architecture Decisions

- **Preview accuracy via shared physics**: auto-tank uses its own Euler step; we
  instead reuse tanks' `calculatePosition(config, t, wind)` so the preview is
  identical to the real shell (no drift). New pure module
  `src/engine/aimPreview.ts` → `computeAimPreview(config, wind, terrain, opts)`
  returning points truncated at terrain or maxTime.
- **Preview render in the existing pure render path**: a draw-only helper
  `src/renderer/aimPreviewRenderer.ts` called from App's RENDER section during the
  player's turn (state already exposes the player tank's live angle/power), so it
  updates every frame with no extra wiring.
- **Nuke via the existing weapon system**: adding `'nuke'` to the `WeaponType`
  union makes TypeScript flag every non-exhaustive switch — we fix each
  (explosion config, destruction category, projectile visual, AI selection). The
  shop auto-lists it (cost > 0). This is the lowest-risk way to add a weapon.
- **Economy scaling**: auto-tank's 5000cr doesn't fit tanks' 500-start economy;
  Nuke = ~750cr (premium, save-up). Damage 100 / blastRadius ~70 / craterRadius
  ~80 / projectileSpeedMultiplier ~0.75.

## Files Changed

| File | Change |
|------|--------|
| `src/engine/aimPreview.ts` | New: pure wind-aware trajectory preview + truncation |
| `src/engine/index.ts` | Export aim-preview API + WEAPON_NUKE |
| `src/renderer/aimPreviewRenderer.ts` | New: fading dotted preview draw |
| `src/App.tsx` | Render preview during player's turn (RENDER section) |
| `src/engine/weapons.ts` | `'nuke'` in WeaponType, WEAPON_NUKE, WEAPONS, getDestructionCategory |
| `src/engine/projectile.ts` | `getProjectileVisual` case for nuke |
| `src/engine/explosion.ts` | nuke explosion config (nuclear colors/particles) |
| `src/engine/ai.ts` | tolerate `'nuke'` in weapon selection (no crash) |
| `src/components/*` (if needed) | white detonation flash overlay hook |

## Phase 1: US1 — Aim Trajectory Preview (MVP)
`.1.1` engine function (TDD), then `.1.2` render + App integration. `.1.2` depends
on `.1.1`.

## Phase 2: US2 — Nuke Weapon
`.2.1` config + exhaustive switches + shop balance (TDD), then `.2.2` explosion FX +
flash. `.2.2` depends on `.2.1`. Phase 2 is independent of Phase 1 (parallel-safe).

## Phase 3: Polish
Full gate (build/lint/test), runtime browser verification (preview matches a fired
shot; nuke fires → big boom + crater + flash), regression checklist + verification.md.

## Parallel Execution
- US1 (`.1.x`) and US2 (`.2.x`) touch mostly disjoint files → can run in parallel.
- Within each, tasks are sequential (`.1.1`→`.1.2`, `.2.1`→`.2.2`).
- Both `.1.2` and (the flash in) `.2.2` touch `App.tsx`/components → serialize those
  two integration edits to avoid contention.

## Verification Steps
- [ ] `npm run build && npm run lint && npm test` green.
- [ ] Unit: preview endpoint ≈ real `calculatePosition` endpoint (same physics);
      truncation at terrain; nuke config values; destruction category = explosive.
- [ ] Runtime (Playwright): preview arc renders + tracks angle/power; fired shot
      follows it; buy + fire nuke → large explosion, kill, crater, white flash.
