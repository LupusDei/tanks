# Tasks: Aim Trajectory Preview + Nuke Weapon

**Input**: Design documents from `/specs/004-aim-preview-nuke/`
**Epic**: `tanks-303`

## Format: `[ID] [P?] [Story] Description`

## Phase 1: US1 — Aim Trajectory Preview (Priority: P1, MVP) (`tanks-303.1`)

**Goal**: A live, wind-accurate dotted aim arc.
**Independent Test**: adjust angle/power → arc moves; fired shot follows it.

- [ ] T001 [US1] `computeAimPreview(config, wind, terrain, opts)` in
      `src/engine/aimPreview.ts` — generate trajectory points via
      `calculatePosition(config, t, wind)` (the real shell physics), truncated at
      terrain impact (`getInterpolatedHeightAt`/`checkTerrainCollision`) or a max
      time/length fallback. Pure, no React. Export from `src/engine/index.ts`.
      + tests (happy: matches calculatePosition; wind curves it; edge: truncation,
      max-length, zero power).
- [ ] T002 [US1] `renderAimPreview(ctx, points, opts)` in
      `src/renderer/aimPreviewRenderer.ts` — fading dotted line (every Nth point,
      small radius, opacity fade). Wire into `src/App.tsx` RENDER section: when it's
      the player's turn, player alive, and no shot in flight, build the player's
      launch config and draw the preview. Depends on T001. + tests for the
      pure dot-selection/opacity helper.

**Checkpoint**: Preview visible and live during aim.

---

## Phase 2: US2 — Nuke Weapon (Priority: P1) (`tanks-303.2`)

**Goal**: A purchasable, dramatic superweapon.
**Independent Test**: buy + fire nuke → large explosion, kill, crater.

- [ ] T003 [US2] Add `'nuke'` to the `WeaponType` union; define `WEAPON_NUKE`
      (damage 100, blastRadius ~70, craterRadius ~80, projectileSpeedMultiplier
      ~0.75, cost ~750, name/description) and add to `WEAPONS`; add the `'nuke'`
      case to `getDestructionCategory` (→ `'explosive'`) and `getProjectileVisual`;
      ensure `src/engine/ai.ts` weapon selection tolerates the new type (no crash).
      Files: `src/engine/weapons.ts`, `src/engine/projectile.ts`, `src/engine/ai.ts`,
      `src/engine/index.ts`. + tests (config values, destruction category, shop
      lists nuke via getPurchasableWeapons, AI handles type).
- [ ] T004 [US2] Nuke explosion FX: add the `'nuke'` case to the explosion config
      in `src/engine/explosion.ts` (nuclear white/orange, high particle multiplier,
      longer duration) and a brief white detonation flash on nuke impact (overlay
      hook in `src/App.tsx` / a small flash module). Depends on T003. + tests for
      the explosion-config selection.

**Checkpoint**: Nuke buyable, fires, big nuclear boom + crater + flash.

---

## Phase 3: Polish & Verification (`tanks-303.3`)

- [ ] T005 Full gate (`npm run build && npm run lint && npm test`) + runtime
      browser verification via Playwright (preview arc tracks angle/power and a
      fired shot follows it; buy + fire nuke → large explosion, lethal radius,
      crater, white flash; zero console errors). Write
      `specs/004-aim-preview-nuke/verification.md` with results + a manual
      regression checklist. Depends on T002 + T004.

---

## Dependencies
- T002 depends on T001 (US1 internal).
- T004 depends on T003 (US2 internal).
- US1 (T001-T002) ∥ US2 (T003-T004) — independent, parallel-safe.
- T005 depends on T002 + T004.

## Parallel Opportunities
- The two user stories run in parallel (disjoint files).
- Serialize the two `App.tsx` edits (preview render in T002, flash overlay in T004).
