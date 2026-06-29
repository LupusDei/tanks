# Verification — Aim Trajectory Preview + Nuke Weapon (tanks-303)

**Date**: 2026-06-29
**Branch**: `agent/swann`
**Source**: features ported from auto-tank.

## What shipped

**US1 — Aim trajectory preview**
- `engine/aimPreview.ts`: `computeAimPreview(config, wind, terrain, canvasHeight, opts)`
  reuses the real shell physics (`calculatePosition` + wind) so the preview matches
  the actual shot; truncated at terrain impact / off-screen / max-time. Pure.
- `renderer/aimPreviewRenderer.ts`: fading dotted arc (pure opacity helper).
- `App.tsx`: drawn during the player's aim (alive, their turn, nothing in flight),
  rebuilt every frame from the live launch config → updates live.

**US2 — Nuke weapon**
- `weapons.ts`: `'nuke'` type + `WEAPON_NUKE` (damage 100, blastRadius 70,
  craterRadius 80, speed 0.75, cost 750) + registry + `WEAPON_TYPES` +
  `getDestructionCategory → 'explosive'`. Auto-listed in the shop.
- `audioManager.ts`: nuke fire-sound mapping. `explosion.ts`: nuclear explosion
  config (white→orange, 2.2× particles, 1.8× duration). `renderer/nukeFlash.ts`:
  brief full-screen white detonation flash, triggered on nuke `ExplosionSpawned`.
- Adding `'nuke'` to the union forced (and the compiler verified) exhaustive
  handling across every weapon-type switch.

## Automated verification (all green)
- `npm run build` — TS strict + Vite: pass.
- `npm run lint` — 0 errors (6 pre-existing react-refresh warnings, unrelated).
- `npm test` — full suite pass (1218 tests; +25 for these features).
- New unit tests: `aimPreview.test.ts` (6 — incl. "matches calculatePosition",
  wind curvature, terrain truncation), `aimPreviewRenderer.test.ts` (6),
  `weaponsNuke.test.ts` (4 — config, explosive category, shop listing, fire sfx),
  `nukeFlash.test.ts` (5 — alpha curve, fill, no-op when faded). Registry tests
  updated (9→10 weapons, 8→9 purchasable).

## Runtime verification (headless Chromium / Playwright)

**Aim preview — fully confirmed.** In battle, a fading dotted arc renders from the
player's barrel. Adjusting aim (angle 45°→60°, power 50%→62%) moved the arc live;
it rose, reached further, and **truncated at the terrain** (dots stop at the hill).
Zero console errors. Screenshots captured.

**Nuke — confirmed.** The nuke is listed in the shop (with stats + balance) and
appears as an in-battle weapon slot. Selecting it and firing decremented its ammo
(5→4) and produced a large explosion; zero console errors. The 350ms white
detonation flash is unit-tested and wired to the nuke impact (it falls between
frame samples in headless polling — confirm visually on-device).

## Manual checklist
- [ ] Preview matches where the shell lands across angles/powers and wind values.
- [ ] Preview hidden while a shot is in flight and when it's not the player's turn.
- [ ] Buy the Nuke in the shop (need ≥750 credits); ammo shows in the selector.
- [ ] Fire the Nuke → large nuclear (white→orange) explosion + brief white flash +
      large crater; any tank in the big radius is destroyed.
- [ ] Nuke on Small terrain: crater clamped, no rendering/hit issues.
