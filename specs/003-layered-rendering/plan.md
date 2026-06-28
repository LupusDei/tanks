# Implementation Plan: Layered + Offscreen Canvas Rendering

**Branch**: `003-layered-rendering` | **Date**: 2026-06-28
**Epic**: `tanks-302` | **Priority**: P1
**Depends on**: `tanks-301` (decoupled render-as-pure-consumer makes the layer split clean)

## Summary

Replace the full-canvas-redraw-every-frame strategy with a layered render pipeline:
static sky+terrain and the metal frame cache to offscreen buffers (re-rendered only
on invalidation), and only the dynamic entity layer repaints per frame. All layers
composite through one shared Camera transform. Visuals stay identical; big win on
mobile/Epic maps. Reference: auto-tank `src/renderer/{RenderPipeline,Camera}.ts`.

## Bead Map

- `tanks-302` — Root: Layered + Offscreen Canvas Rendering
  - `tanks-302.1` — Foundational: pipeline + camera + offscreen manager
    - `tanks-302.1.1` — RenderLayer + RenderPipeline + offscreen/fallback manager
    - `tanks-302.1.2` — Camera/viewport transform (pan, mobile scale, terrain-size)
  - `tanks-302.2` — US1 (MVP): static terrain + sky offscreen cache
    - `tanks-302.2.1` — StaticTerrainLayer (sky+terrain to offscreen, invalidation)
    - `tanks-302.2.2` — Integrate static blit; remove per-frame terrain polyline
  - `tanks-302.3` — US2: metal frame cache + dynamic layer split
    - `tanks-302.3.1` — Cache MetalBackground to offscreen (redraw on resize only)
    - `tanks-302.3.2` — DynamicLayer (entities) repaint-only + compositor wiring
  - `tanks-302.4` — Polish: correctness + perf measurement
    - `tanks-302.4.1` — Correctness pass (resize, mobile scale, terrain-size)
    - `tanks-302.4.2` — Perf before/after measurement + documentation

## Technical Context

**Stack**: React 18, TypeScript strict, Vite, Canvas 2D (+ OffscreenCanvas where
available), Vitest.
**Constraints**: Visual parity. OffscreenCanvas fallback for older Safari. No
`any`. Memory bounds on Epic (2100×2800) full-world static buffer.

## Architecture Decision

Layers own their own buffer + dirty flag. The pipeline composites in order:
`static-metal → static-terrain(sky) → dynamic → HUD`. Static layers re-render only
when `invalidate()` is called — driven by `CraterCreated` events (from tanks-301),
resize, and terrain-size change. The shared `Camera` is the single source of truth
for world→screen, so terrain and entities never drift. This depends on tanks-301
because the render path must already be a pure consumer of sim state (no simulation
side-effects mid-render) for the static/dynamic split to be safe.

## Files Changed

| File | Change |
|------|--------|
| `src/renderer/RenderPipeline.ts` | New: layer mgmt + composite + offscreen/fallback |
| `src/renderer/Camera.ts` | New: world↔screen transform |
| `src/renderer/layers/StaticTerrainLayer.ts` | New: sky+terrain offscreen + invalidation |
| `src/renderer/layers/DynamicLayer.ts` | New: per-frame entity layer |
| `src/components/MetalBackground.tsx` | Cache to offscreen; redraw on resize only |
| `src/components/Canvas.tsx` | Drive pipeline instead of direct full redraw |
| `src/App.tsx` | Wire CraterCreated/resize/terrain-size → layer invalidation |

## Phase 1: Foundational

Pipeline + Camera + offscreen manager (with fallback). New files, parallel-safe.

## Phase 2: US1 - Static terrain + sky (MVP)

Move sky+terrain draw into a StaticTerrainLayer backed by an offscreen buffer;
invalidate on crater/resize/terrain-size. Integrate the blit and delete the
per-frame polyline path. `.2.2` edits Canvas/App (sequential after `.2.1`).

## Phase 3: US2 - Metal cache + dynamic split

Cache MetalBackground; formalize the dynamic entity layer and compositor order.

## Phase 4: Polish

Correctness across resize/mobile/terrain-size; measure and document perf gains.

## Parallel Execution

- `tanks-302.1.1` ∥ `tanks-302.1.2` (different new files).
- `tanks-302.2.1` and `tanks-302.3.1` (new files) can progress in parallel; their
  integration tasks (`.2.2`, `.3.2`) edit `Canvas.tsx`/`App.tsx` and MUST be
  serialized (single-writer).

## Verification Steps

- [ ] `npm run build && npm run lint && npm test` green.
- [ ] Spy test: terrain layer renders once per change, not per frame.
- [ ] Visual parity on fixed scenarios (terrain, tanks, mid-explosion).
- [ ] Resize / mobile-scale / terrain-size: no terrain↔entity misalignment.
- [ ] DevTools: documented frame-time reduction on Epic map + throttled mobile.
