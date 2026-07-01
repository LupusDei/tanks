# Verification — Easy Mode (tanks-304)

**Date**: 2026-07-01 | **Branch**: agent/swann

## Automated (all green)
- build ✓, lint 0 errors, full suite 1233 tests ✓ (+15 new).
- New tests: wind scaling (5 — reduced magnitude + reduced max clamp + backward-compat
  default), campaign+free-play money (7), config toggle UI (3).
- Backward compat: default `windScale=1` → all 19 existing wind tests unchanged.

## Runtime (headless Chromium / Playwright)
- Easy Mode toggle present on the config screen, styled, `aria-pressed` flips on click.
- Free Play, brand-new player:
  - Easy Mode ON  → shop BALANCE = **$2000**, first-turn wind = **1 m/s**.
  - Easy Mode OFF → shop BALANCE = **$500**,  first-turn wind = **6 m/s**.
- Zero console errors. Screenshots captured (config toggle, shop).

## Notes
- Player-only money: in campaigns the AI keeps the normal starting balance (giving the
  AI more money would make it harder — opposite of "easy").
- Free-play bonus is a one-time floor for new players (gamesPlayed === 0); it never
  lowers a balance and doesn't stack (not exploitable). Routed through UserContext so the
  shop balance refreshes immediately.
- Out of scope: easy mode does not change AI accuracy (that's the separate difficulty
  setting) — it only calms wind + boosts money, per the request.
