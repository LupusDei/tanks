# Feature Specification: Layered + Offscreen Canvas Rendering

**Feature Branch**: `003-layered-rendering`
**Created**: 2026-06-28
**Status**: Draft
**Epic**: `tanks-302`
**Depends on**: `tanks-301` (game-loop decoupling)

## Problem

The game does a full `clearRect` + full repaint of **everything** every frame —
including content that is static between frames. The terrain is redrawn as a
polyline of up to ~2100 `lineTo` calls (Epic map) every frame even when no crater
changed, the sky gradient is recomputed, and the decorative `MetalBackground`
(`src/components/MetalBackground.tsx`) runs a heavy animated repaint at 60fps. On
mobile/low-end GPUs this decoration + terrain polyline is the dominant frame cost.

## Goal

Introduce a **layered render pipeline** with **offscreen canvases** for static
content. Terrain + sky render once to an offscreen buffer and are only invalidated
when something actually changes them (crater created, canvas resize, terrain-size
change). The metal frame caches to its own buffer, redrawn only on resize. Each
frame, only the **dynamic layer** (tanks, projectiles, explosions, particles,
HUD overlays) is repainted, then static buffers are blitted. Reference: auto-tank
`src/renderer/RenderPipeline.ts` + `Camera.ts` + layered renderers. Visuals must
stay pixel-identical.

## User Scenarios & Testing

### User Story 1 - Static terrain + sky offscreen cache (Priority: P1, MVP)

Terrain and sky are rendered to an offscreen canvas once and blitted each frame.
The buffer is invalidated and re-rendered only on crater creation, canvas resize,
or terrain-size change.

**Why this priority**: Terrain polyline is the single biggest per-frame cost; this
delivers the largest measurable win on its own.

**Independent Test**: Render two consecutive frames with no crater/resize; assert
the terrain layer's draw routine is invoked once (cached), not per frame, and the
composited output is unchanged.

**Acceptance Scenarios**:

1. **Given** a generated terrain and no changes, **When** N frames render, **Then**
   the terrain/sky layer is drawn to its offscreen buffer exactly once and blitted N
   times.
2. **Given** a crater is created (`CraterCreated` event), **When** the next frame
   renders, **Then** the static buffer is invalidated and re-rendered once,
   reflecting the new terrain.
3. **Given** the canvas is resized or terrain size changes, **When** the next frame
   renders, **Then** offscreen buffers are reallocated at the new dimensions and
   re-rendered.

### User Story 2 - Metal frame cache + dynamic layer split (Priority: P1)

The `MetalBackground` decoration caches to an offscreen buffer redrawn only on
resize; gameplay entities render to a dynamic layer repainted each frame. The
compositor stacks: static-bg → static-terrain → dynamic → HUD.

**Why this priority**: Removes the second-biggest per-frame cost (animated metal)
and formalizes the layer stack so future effects slot in cleanly.

**Independent Test**: With the game idle (no projectiles), assert the dynamic
layer's per-frame work is minimal and the metal buffer is not re-rendered between
resizes.

**Acceptance Scenarios**:

1. **Given** no resize, **When** frames render, **Then** the metal-frame buffer is
   reused (drawn once), not recomputed per frame.
2. **Given** active projectiles/explosions, **When** frames render, **Then** only
   the dynamic layer repaints; static buffers are blitted unchanged.
3. **Given** mobile scale or pan/zoom, **When** the camera transform changes,
   **Then** all layers composite through a shared `Camera` transform and stay
   aligned (no drift between terrain and tanks).

### Edge Cases

- Rapid successive craters: coalesce invalidation to a single re-render per frame.
- Resize storm (mobile orientation change): debounce buffer reallocation; never
  allocate per frame.
- `OffscreenCanvas` unsupported (older Safari): fall back to a detached `<canvas>`
  element buffer; same API surface.
- Terrain larger than viewport (panning): static buffer is full world size, blitted
  with camera offset; verify memory bounds on Epic (2100×2800).
- Mobile scale factor must apply via the shared Camera, not per-layer ad hoc math.

## Requirements

### Functional Requirements

- **FR-001**: A `RenderPipeline` MUST manage ordered layers and composite them to
  the visible canvas each frame.
- **FR-002**: Static content (sky + terrain) MUST render to an offscreen buffer,
  re-rendered ONLY on invalidation (crater, resize, terrain-size change).
- **FR-003**: The `MetalBackground` decoration MUST cache to an offscreen buffer,
  re-rendered only on resize.
- **FR-004**: Only the dynamic layer (tanks, projectiles, explosions, particles)
  MUST repaint per frame.
- **FR-005**: All layers MUST composite through a single shared `Camera`/viewport
  transform (handles pan, mobile scale, terrain-size).
- **FR-006**: A graceful fallback MUST exist where `OffscreenCanvas` is
  unavailable (detached canvas element with identical interface).
- **FR-007**: Output MUST be visually identical to the pre-change renderer.
- **FR-008**: New pipeline/layer/camera modules MUST meet constitution test
  minimums (≥3 tests per public function).

### Key Entities

- **RenderLayer**: `{ render(ctx, camera), invalidate(), readonly canvas }` — a
  buffer + its draw routine + dirty flag.
- **RenderPipeline**: ordered list of layers + `composite(targetCtx, camera)`.
- **Camera**: world↔screen transform (offset, scale) shared by all layers.

## Success Criteria

- **SC-001**: Terrain/sky layer draw routine runs once per change, not per frame
  (asserted by spy in tests).
- **SC-002**: Measured frame time on Epic terrain (2100×2800) drops materially vs
  baseline (documented before/after; target ≥40% reduction in render time on a
  static frame).
- **SC-003**: Mobile (throttled CPU) holds ~60fps idle and during projectile
  flight; no metal-frame recompute between resizes.
- **SC-004**: Visual regression: composited output matches baseline on a set of
  fixed scenarios (terrain, tanks placed, mid-explosion).
- **SC-005**: Correct on resize, mobile scale, and terrain-size change (no
  misalignment between terrain and entities).
- **SC-006**: `npm run build && npm run lint && npm test` all green.
