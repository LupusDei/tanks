# Feature Specification: Easy Mode

**Feature Branch**: `005-easy-mode` | **Created**: 2026-07-01 | **Epic**: `tanks-304`

## Goal
An **Easy Mode** toggle (config screen, for both Free Play and Campaign) that:
1. **Significantly reduces wind** (calmer, more forgiving aiming).
2. **Gives more starting money** (buy weapons/armor sooner).

## Design
- **Wind**: add `EASY_MODE_WIND_SCALE = 0.25` and an optional `windScale = 1` param to
  `generateInitialWind` / `generateNextWind` (scales the gaussian std-dev AND the max
  clamp). Default 1 = current behavior (backward compatible). Easy mode passes 0.25 →
  wind std-dev 10→2.5, max ±30→±7.5.
- **Money**: add `EASY_MODE_STARTING_MONEY = 2000` (vs 500).
  - Campaign: new-campaign participant starting balance uses it when easy mode is on
    (threaded via `CampaignConfig.easyMode` → `createNewCampaign`).
  - Free play: on a NEW player's first game (gamesPlayed === 0) in easy mode, top the
    balance up to `EASY_MODE_STARTING_MONEY` (one-time floor; not exploitable, doesn't
    stack, returning players keep earned money).
- **State/config**: `easyMode: boolean` on `GameState` (+ `setEasyMode` action) and
  `CampaignConfig`; the config screen's config object; App's local `GameConfig`.
- **UI**: an EASY MODE toggle on `GameConfigScreen` (default off) with a hint; persisted
  in saved game config.
- **Wiring (App)**: `handleConfigComplete` sets `easyMode` + campaign balance + free-play
  bonus; initial wind (`handleWeaponConfirm`) and turn-end wind (render loop) pass the
  scale from `state.easyMode`.

## Acceptance
- Toggling Easy Mode on → visibly calmer wind all game + higher starting balance.
- Off (default) → identical to today (all existing wind/economy tests pass).
- Works in both Free Play and Campaign.

## Success Criteria
- New tests: wind scaling reduces magnitude; easy starting-money constant; campaign
  participant balance uses it; free-play first-game top-up; setEasyMode reducer.
- build + lint(0 err) + full suite green; runtime: toggle present, wind calmer, balance higher.
