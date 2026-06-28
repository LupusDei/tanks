# Tasks: Layered + Offscreen Canvas Rendering

**Input**: Design documents from `/specs/003-layered-rendering/`
**Epic**: `tanks-302` (depends on `tanks-301`)

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational (`tanks-302.1`)

**Purpose**: Pipeline + camera + offscreen abstraction before any layer work.

- [ ] T001 [P] `RenderLayer` interface + `RenderPipeline` (ordered layers,
      `composite(targetCtx, camera)`) + offscreen buffer manager with detached
      `<canvas>` fallback when `OffscreenCanvas` is unavailable, in
      `src/renderer/RenderPipeline.ts`. + tests.
- [ ] T002 [P] `Camera` world↔screen transform (offset, scale) covering pan, mobile
      scale, and terrain-size, in `src/renderer/Camera.ts`. + tests (transform
      round-trip, scale, bounds).

**Checkpoint**: Pipeline + camera available; layers can be built in parallel.

---

## Phase 2: US1 - Static terrain + sky offscreen cache (Priority: P1, MVP) (`tanks-302.2`)

**Goal**: Terrain + sky drawn once, blitted each frame, invalidated on change.
**Independent Test**: spy asserts terrain draw runs once across N static frames.

- [ ] T003 [P] [US1] `StaticTerrainLayer`: render sky gradient + terrain polygon to
      an offscreen buffer; `invalidate()` on crater/resize/terrain-size; expose
      `canvas` for compositing. File `src/renderer/layers/StaticTerrainLayer.ts`.
      + tests (renders once, re-renders on invalidate, reallocates on resize).
- [ ] T004 [US1] Integrate the static layer into the render path: blit the buffer,
      remove the per-frame terrain polyline + sky redraw from the existing renderer;
      wire `CraterCreated`/resize/terrain-size → `invalidate()`. Files
      `src/components/Canvas.tsx`, `src/App.tsx`. Depends on T003.

**Checkpoint**: Terrain/sky no longer redrawn per frame; output identical.

---

## Phase 3: US2 - Metal frame cache + dynamic layer split (Priority: P1) (`tanks-302.3`)

**Goal**: Cache metal decoration; entities on a per-frame dynamic layer.

- [ ] T005 [P] [US2] Cache `MetalBackground` to an offscreen buffer; redraw only on
      resize (keep any subtle animation behind a flag, default off on mobile). File
      `src/components/MetalBackground.tsx`. + tests.
- [ ] T006 [US2] `DynamicLayer`: render tanks/projectiles/explosions/particles each
      frame; finalize compositor order (metal → terrain → dynamic → HUD) through the
      shared Camera. Files `src/renderer/layers/DynamicLayer.ts`,
      `src/components/Canvas.tsx`. Depends on T004, T005.

**Checkpoint**: Full layer stack composites; only dynamic layer repaints per frame.

---

## Phase 4: Polish & Cross-Cutting (`tanks-302.4`)

- [ ] T007 [P] Correctness pass: resize, mobile scale, terrain-size change — assert
      no terrain↔entity misalignment; debounce resize buffer reallocation. Tests +
      fixes. Depends on T006.
- [ ] T008 Perf measurement: DevTools frame-time before/after on Epic map +
      throttled mobile; document gains in `specs/003-layered-rendering/`. Depends on
      T006.

---

## Dependencies

- Whole epic blocked by `tanks-301` (render must be a pure consumer first).
- Phase 1 (T001, T002) → blocks Phase 2.
- T003 ∥ T005; T004 depends on T003; T006 depends on T004 + T005.
- Phase 4 depends on T006.

## Parallel Opportunities

- T001 ∥ T002; T003 ∥ T005 (new files).
- Integration tasks T004, T006 edit `Canvas.tsx`/`App.tsx` → serialize (single-writer).
