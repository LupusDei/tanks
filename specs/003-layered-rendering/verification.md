# Verification — Layered/Offscreen Rendering (tanks-302)

**Date**: 2026-06-28
**Branch**: `agent/swann`

## Re-scope (measurement-first)

The original plan proposed a full layered RenderPipeline + Camera + per-layer
split. Inspecting the actual render path changed the plan:

| Planned task | Outcome | Why |
|---|---|---|
| Camera world↔screen (302.1.2) | **Dropped** | Game draws 1:1 in canvas coords; all scaling/pan is CSS (`transform: scale(var(--fit-scale))`). No transform to model — building a Camera would be premature complexity. |
| MetalBackground offscreen (302.3.1) | **Dropped** | Already done — `MetalBackground` renders static elements to an offscreen canvas (`staticCanvasRef`) and only `drawImage`s it + a light overlay. |
| DynamicLayer split (302.3.2) | **Dropped** | Entities (tanks/projectiles/explosions) must repaint per frame regardless; a separate compositing canvas adds cost without benefit at this scale. |
| Offscreen terrain cache (302.1.1 / 302.2) | **Done** | The one measured hotspot. |

This is the constitution's Simplicity principle in action: optimize the measured
cost, don't add speculative abstractions.

## The change

`src/renderer/terrainCache.ts` renders the terrain polygon to an offscreen canvas
once and returns it for blitting. Invalidation is reference/dimension based:

- **Crater**: `actions.setTerrain(createCrater(...))` creates a NEW terrain object
  → cache miss → single re-render.
- **Resize / terrain-size**: canvas dimensions change → cache miss → re-render.
- Otherwise: the same cached canvas is reused and blitted.

`App.tsx` replaced the inline per-frame polyline loop with
`getTerrainCache(...)` + `ctx.drawImage(...)`.

## Perf (before → after)

Per-frame terrain rendering on the main canvas:

- **Before**: `moveTo` + up to ~2100 `lineTo` (one per terrain column on an Epic
  2100-wide map) + `closePath` + `fill` — i.e. ~2103 path operations **every
  frame**, even when the terrain hadn't changed.
- **After**: **1 `drawImage`** per frame; the polygon is rebuilt only on a cache
  miss (crater or resize), which is rare.

On the Epic map this removes the single largest per-frame canvas cost; the smaller
maps benefit proportionally. (Decorative `MetalBackground` was already offscreen,
so the remaining per-frame game cost is the genuinely-dynamic entities.)

## Correctness verification

- Unit tests (`terrainCache.test.ts`, 8): cache reused when valid (no new
  canvas); re-rendered on terrain-object change (crater); re-rendered on
  dimension change (resize / terrain-size). Mobile scale is CSS-only and does not
  affect canvas pixels, so the cache is unaffected by it.
- Automated gate: build ✓, lint 0 errors, full suite (1197) ✓.
- Runtime (Playwright, headless Chromium): terrain renders pixel-correct via the
  cached blit — both tanks seated on the surface, full UI, **zero console
  errors**. Screenshot captured.

## Manual checklist

- [ ] Terrain renders identically to before on each terrain size (Small→Epic).
- [ ] Firing a bunker buster deforms the terrain (crater) and the cache updates
      on the next frame (visible new crater).
- [ ] Resizing the window / rotating mobile keeps terrain aligned with tanks.
