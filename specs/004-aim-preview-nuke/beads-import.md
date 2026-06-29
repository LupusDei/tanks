# Aim Trajectory Preview + Nuke Weapon - Beads

**Feature**: 004-aim-preview-nuke
**Generated**: 2026-06-29
**Source**: specs/004-aim-preview-nuke/tasks.md

## Root Epic
- **ID**: tanks-303
- **Title**: Aim Trajectory Preview + Nuke Weapon (ported from auto-tank)
- **Type**: epic — **Priority**: 1
- **Description**: Port two auto-tank features into tanks — a live wind-accurate
  dotted aim trajectory preview, and a Nuke superweapon (big blast + crater +
  nuclear explosion). Reuses tanks' own physics + weapon system.

## Epics
### Phase 1 — US1: Aim Trajectory Preview (MVP)
- **ID**: tanks-303.1 — Type: epic — Priority: 1 — MVP: true — Tasks: 2
### Phase 2 — US2: Nuke Weapon
- **ID**: tanks-303.2 — Type: epic — Priority: 1 — Tasks: 2
### Phase 3 — Polish: verification
- **ID**: tanks-303.3 — Type: epic — Priority: 2 — Depends: US1, US2 — Tasks: 1

## Tasks
### Phase 1 — US1
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T001 | Engine: wind-aware aim trajectory + terrain truncation | src/engine/aimPreview.ts | tanks-303.1.1 |
| T002 | Render: fading dotted preview during player aim | src/renderer/aimPreviewRenderer.ts, src/App.tsx | tanks-303.1.2 |

### Phase 2 — US2
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T003 | Config: WeaponType + WEAPON_NUKE + switches + shop balance | src/engine/weapons.ts, projectile.ts, ai.ts | tanks-303.2.1 |
| T004 | Explosion FX: nuclear explosion + white detonation flash | src/engine/explosion.ts, src/App.tsx | tanks-303.2.2 |

### Phase 3 — Polish
| T-ID | Title | Path | Bead |
|------|-------|------|------|
| T005 | Gates + runtime verification + regression checklist | specs/004-aim-preview-nuke/ | tanks-303.3.1 |

## Summary
| Phase | Tasks | Priority | Bead |
|-------|-------|----------|------|
| 1: US1 Aim Preview (MVP) | 2 | 1 | tanks-303.1 |
| 2: US2 Nuke | 2 | 1 | tanks-303.2 |
| 3: Polish | 1 | 2 | tanks-303.3 |
| **Total** | **5 tasks + 3 sub-epics + 1 root = 9 beads** | | |

## Dependency Graph
```
tanks-303.1 (US1)  ── .1.1 → .1.2 ─┐
                                    ├─→ tanks-303.3 (Polish)
tanks-303.2 (US2)  ── .2.1 → .2.2 ─┘
(US1 ∥ US2 — independent)
```
