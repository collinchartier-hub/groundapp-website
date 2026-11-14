# Ground rematch prototypes implementation plan

> For agentic workers: use subagent-driven-development with independent file ownership. Orchestrator alone runs consolidated checks after edits land.

**Goal:** deliver a complete competitive Seed Wind match and solo The Deep outing at /play-next, preserving /play.

**Architecture:** two independent pure model/view modules, one shared Three.js world and DOM shell. Existing Python builder copies versioned source modules and page/CSS to site. No backend, install, health-data writes or analytics scripts.

**Tech stack:** plain JavaScript ES modules, existing pinned Three.js 0.186.1, Python builder, Node's built-in test runner, browser runtime verification.

## Contract

Source of truth: ../specs/2026-11-13-play-rematch-design.md. It defines every game export, input coordinates, result state and safety boundary. Module models have no browser or Three import; view factories receive it. World coordinates 1000 by 1600 map exactly to fitted canvas. Parent owns pause, time and input cancellation. New source under game/src/next; generated site files never edited directly.

## Tasks

- [x] Seed Wind owner creates seed-wind.js: model factory, aim/fire, step, description, disposable view. First to five or 90-second leader/draw; serve; bank-shot collision; cooldown; equal power. No hold-duration parameter. No tests/builds by owner.
- [x] The Deep owner creates explore.js: three rooms, path choice, steering, discoveries, checkpoint recovery, final display and disposable view. No respiratory pacing or input-duration rewards. No tests/builds by owner.
- [x] Parent creates world.js: pinned Three import, orthographic renderer, palette from existing Ground tokens, resize and exact disposal.
- [x] Parent creates index.html/play.css/app.js: accessible menu, short rules, per-seat aim/Gust controls, simultaneous pointer ownership, keyboard controls, route buttons, result/rematch/swap, pause/quit, visibility interruption, sound/reduced-motion settings, WebGL/loading failure states. No fake breath sensing.
- [x] Extend game/build.py to copy complete prototype source into site/js/ground-play-next-v1 and CSS into site/assets/css/ground-play-next-v1.css, replacing only declared page placeholders. Build checks JS syntax and fails nonzero for new-module errors. Existing /play sources remain unchanged.
- [x] Add narrow deterministic tests for uncertain match goal/cooldown/reset and whole-outing completion. Tests operate actual model state, never source text or fabricated UI.
- [x] After edits land, run `python3 game/build.py`, `node --test test/play-next.test.mjs`, then browser scenarios on actual served page. Use native input to exercise both seats, real score/result/rematch, cancellation, pause/resume, all three solo rooms and display, phone/landscape/desktop layout, reduced motion and mute. Programmatic deterministic checks are not evidence of human fun.
- [x] Record controls and observed verification in game/README.md. Human adult/child pair playtests remain explicitly unperformed; do not claim voluntary rematch preference or clinical/child-safety clearance.

## Delivery boundary

No merge/live deployment. Worktree: /Users/collinchartier/dev/groundapp-website-rematch, branch play-rematch. Keep original play-v3 and old breathhold behavior unchanged so user can compare. Review and fixes precede any branch preview publication.

## Observed verification

- Builder: existing artifact/web and all four new modules pass syntax checks.
- Eight deterministic model tests pass; public-site file guard passes.
- Chromium: phone portrait 390×844 and 375×667, landscape 844×390,
  desktop 1440×900. No horizontal overflow in the checked surfaces.
- Actual native input produced Gold and Sage wins, result focus, rematch,
  swap, two simultaneous touch gusts, cancelled canvas gestures and pause/resume.
  Focusing Sage's Gust then pressing Space correctly fires Gold, not Sage.
- Landscape duel arena now measures about 483×302px, with no page overflow.
  Solo remains upright; focused-slider Left moves the target 700→659.
- Three-room outings completed through both route directions and mixed paths.
  Final home controls leave the clearing visible; selecting Echo stone shows
  its bone core against the dark backing. Console error list empty.
- Cross-family read-only reviews covered duel and exploration. Corrections
  include truthful equal impulse, both seat clocks, route/keyboard focus,
  visible display, readable live messages and a guarded choice transition.
- No physical-device, Safari, screen-reader, child or two-human fun test.
  No user respiratory sensing, no clinical claims, no production merge.
