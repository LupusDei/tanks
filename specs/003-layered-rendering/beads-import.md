# Layered + Offscreen Canvas Rendering - Beads

**Feature**: 003-layered-rendering
**Generated**: 2026-06-28
**Source**: specs/003-layered-rendering/tasks.md

## Root Epic

- **ID**: tanks-302
- **Title**: Layered + Offscreen Canvas Rendering
- **Type**: epic
- **Priority**: 1
- **Depends on**: tanks-301
- **Description**: Replace full-canvas-redraw with a layered pipeline; sky+terrain
  and the metal frame cache to offscreen buffers (re-rendered only on invalidation),
  only the dynamic entity layer repaints per frame, all composited through a shared
  Camera. Visual parity preserved.

## Epics

### Phase 1 — Foundational: pipeline + camera + offscreen manager
- **ID**: tanks-302.1 — Type: epic — Priority: 1 — Blocks: US1, US2 — Tasks: 2

### Phase 2 — US1 (MVP): static terrain + sky offscreen cache
- **ID**: tanks-302.2 — Type: epic — Priority: 1 — MVP: true — Tasks: 2

### Phase 3 — US2: metal frame cache + dynamic layer split
- **ID**: tanks-302.3 — Type: epic — Priority: 1 — Tasks: 2

### Phase 4 — Polish: correctness + perf measurement
- **ID**: tanks-302.4 — Type: epic — Priority: 2 — Depends: US2 — Tasks: 2

## Tasks

### Phase 1 — Foundational
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T001 | RenderLayer + RenderPipeline + offscreen/fallback | src/renderer/RenderPipeline.ts | tanks-302.1.1 |
| T002 | Camera world↔screen transform | src/renderer/Camera.ts | tanks-302.1.2 |

### Phase 2 — US1 (MVP)
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T003 | StaticTerrainLayer (sky+terrain offscreen, invalidation) | src/renderer/layers/StaticTerrainLayer.ts | tanks-302.2.1 |
| T004 | Integrate static blit; remove per-frame terrain polyline | src/components/Canvas.tsx, src/App.tsx | tanks-302.2.2 |

### Phase 3 — US2
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T005 | Cache MetalBackground to offscreen (resize-only redraw) | src/components/MetalBackground.tsx | tanks-302.3.1 |
| T006 | DynamicLayer repaint-only + compositor wiring | src/renderer/layers/DynamicLayer.ts, src/components/Canvas.tsx | tanks-302.3.2 |

### Phase 4 — Polish
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T007 | Correctness pass (resize, mobile scale, terrain-size) | tests + fixes | tanks-302.4.1 |
| T008 | Perf before/after measurement + docs | specs/003-layered-rendering/ | tanks-302.4.2 |

## Summary
| Phase | Tasks | Priority | Bead |
|-------|-------|----------|------|
| 1: Foundational | 2 | 1 | tanks-302.1 |
| 2: US1 (MVP) | 2 | 1 | tanks-302.2 |
| 3: US2 | 2 | 1 | tanks-302.3 |
| 4: Polish | 2 | 2 | tanks-302.4 |
| **Total** | **8 tasks + 4 sub-epics + 1 root = 13 beads** | | |

## Dependency Graph

```
tanks-301 (whole epic)  ── blocks ──>  tanks-302
tanks-302.1 (Foundational)
    | blocks
tanks-302.2 (US1, MVP)  ── .2.1 → .2.2
    | blocks
tanks-302.3 (US2)  ── .3.1 ∥ via .2.1; .3.2 needs .2.2 + .3.1
    | blocks
tanks-302.4 (Polish)
```
