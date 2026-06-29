# Feature Specification: Aim Trajectory Preview + Nuke Weapon (ported from auto-tank)

**Feature Branch**: `004-aim-preview-nuke`
**Created**: 2026-06-29
**Status**: Draft
**Epic**: `tanks-303`
**Source**: Features ported from the sibling project auto-tank (`/Users/Reason/code/ai/auto-tank`).

## Overview

Bring two auto-tank features into the tanks game:
1. An **aiming trajectory preview** — a dotted arc showing where the current shot
   will go, based on the player's angle + power + wind, updating live as they aim.
2. A **Nuke** — a premium superweapon with a massive blast, big crater, and a
   dramatic nuclear explosion, modeled on auto-tank's nuke.

## User Scenarios & Testing

### User Story 1 - Aim Trajectory Preview (Priority: P1, MVP)

While it is the player's turn (and no shot is in flight), the player sees a faint
dotted arc projecting from their barrel along the predicted flight path. As they
change angle or power, the arc updates immediately. It accounts for wind, so the
preview matches where the shell actually lands.

**Why this priority**: Highest player-value of the two — turns blind trial-and-error
into skillful aiming. Independent of the nuke.

**Independent Test**: In a battle, adjust angle/power and confirm the dotted arc
moves accordingly and that a fired shot follows the previewed path closely.

**Acceptance Scenarios**:

1. **Given** it is the player's turn, **When** the battle renders, **Then** a
   dotted trajectory arc is drawn from the player's barrel.
2. **Given** the preview is shown, **When** the player changes angle or power,
   **Then** the arc updates on the next frame to the new path.
3. **Given** wind is non-zero, **When** the preview is computed, **Then** the arc
   curves with the wind and matches the actual projectile path (same physics).
4. **Given** the arc would intersect terrain, **When** it is computed, **Then** it
   is truncated at the terrain impact point (it does not draw through the ground).
5. **Given** a shot is in flight or it is not the player's turn, **When** rendering,
   **Then** the preview is hidden.

### User Story 2 - Nuke Weapon (Priority: P1)

The player can buy a **Nuke** in the weapon shop. It is expensive (a save-up
superweapon). When fired, it produces a huge nuclear explosion that destroys any
tank in a large radius, leaves a large crater, and shows a dramatic white flash.

**Why this priority**: A marquee weapon that adds strategic depth and spectacle.

**Independent Test**: Buy the Nuke, fire it near a tank, confirm a large explosion,
instant kill within radius, a big crater, and the white flash.

**Acceptance Scenarios**:

1. **Given** the weapon shop, **When** the player has enough credits, **Then** the
   Nuke is listed (name, description, damage, blast radius, cost) and purchasable.
2. **Given** the player owns a Nuke, **When** they select it and fire, **Then** the
   projectile launches and ammo decrements by 1.
3. **Given** a Nuke lands, **When** it detonates, **Then** every tank within its
   large blast radius takes lethal damage and the terrain forms a large crater.
4. **Given** a Nuke detonates, **When** the explosion renders, **Then** it is
   visibly larger and more dramatic than other weapons (nuclear white/orange,
   dense particles, a brief white screen flash).
5. **Given** the Nuke is added, **When** the project builds, **Then** all
   weapon-type switches (explosion config, destruction category, projectile visual,
   AI handling) handle `'nuke'` (TypeScript exhaustiveness enforced).

### Edge Cases

- Preview when the player tank is dead / spectating → hidden.
- Preview at extreme angle/power → arc still renders (bounded by max length).
- Nuke on a tiny (Small 800px) terrain → large radius shouldn't break rendering or
  hit detection; crater clamped to terrain bounds.
- Nuke fired by the player near themselves → self-damage applies (consistent with
  existing splash rules).
- AI must not crash on the new weapon type (selection lists handle it gracefully).

## Requirements

### Functional Requirements

#### Trajectory Preview
- **FR-001**: The preview MUST be computed with the SAME physics as real
  projectiles (reuse `calculatePosition` with wind) so it matches actual flight.
- **FR-002**: The preview MUST update live as the player's angle/power change.
- **FR-003**: The preview MUST be truncated at terrain impact (no drawing through
  the ground) and bounded by a max length/time as a fallback.
- **FR-004**: The preview MUST render as a faint, fading dotted line and only
  during the player's turn when no shot is in flight.
- **FR-005**: Preview computation MUST be a pure function in `src/engine/`
  (testable, no React/DOM).

#### Nuke Weapon
- **FR-010**: Add `'nuke'` to the `WeaponType` union and a `WEAPON_NUKE` config to
  `WEAPONS`.
- **FR-011**: Nuke config: large blast radius (~70px), 100 damage (lethal in
  radius), large `craterRadius` (~80px), slow heavy projectile, premium cost scaled
  to tanks' economy (~750), `'explosive'` destruction category.
- **FR-012**: The Nuke MUST be purchasable in the shop (auto via
  `getPurchasableWeapons`) and consumable like other bought weapons.
- **FR-013**: The Nuke MUST have a distinct, dramatic explosion (nuclear
  white/orange, dense particles, larger/longer) plus a brief white detonation flash.
- **FR-014**: Adding `'nuke'` MUST keep all weapon-type switches exhaustive
  (explosion config, destruction category, projectile visual, AI selection).

### Non-Functional Requirements
- **NFR-001**: TypeScript strict, no `any`. Engine stays React-free (lint guard).
- **NFR-002**: New pure functions meet test minimums (≥3 tests: happy/error/edge).
- **NFR-003**: No regression to existing weapons or the (recently decoupled) loop.
- **NFR-004**: Behavior verified at runtime in a real browser (jsdom has no canvas).

### Out of Scope (documented; not built)
- Screen shake and slow-motion on nuke (tanks has no such infra — would be
  premature). Captured as possible future polish.
- Nuke wind-immunity (auto-tank's nuke ignores wind) — deferred to keep the core
  physics path simple; nuke is wind-affected like other weapons in v1.
- AI buying/using the Nuke — v1 is player-exclusive premium; AI just tolerates the
  new type.

## Success Criteria
- **SC-001**: Fired shots land within a small margin of the previewed arc's
  endpoint in zero and non-zero wind.
- **SC-002**: Preview updates within one frame of an angle/power change.
- **SC-003**: Nuke kills all tanks within its radius in one shot and leaves a
  visibly large crater.
- **SC-004**: Nuke explosion is visually distinct from all other weapons.
- **SC-005**: `npm run build && npm run lint && npm test` green; runtime browser
  check passes (preview shows + matches; nuke fires + big boom + crater).
