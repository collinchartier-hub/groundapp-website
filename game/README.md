# Bodie's Breath Run (groundapp.live/play)

A free 3D breathwork game with Bodie, the figure from the home page. One source builds two copies:

- `site/play.html`, `site/js/bodie-run-v3.js`, `site/assets/css/bodie-run-v3.css`: the page on groundapp.live.
- `game/out/bodie-breath-run.html`: the single-file Claude artifact version (gitignored).

Edit `game/src/`, never the built files in `site/`. Then:

```
python3 game/build.py
```

The script syntax-checks both builds. When the JS or CSS changes, bump `VER` in `build.py` (v2, v3...) because
`/assets` and `/js` are cached for 7 days, and point `play.html` at the new names (the script does this).

Source parts, in the order they are joined:

1. `1-page.html`: markup and CSS (the stage, menus, cards, the cast and the technique notes).
2. `2-core.js`: profile and records (localStorage), courses, the day streak, daily quests and badges, sound (chiptune music, effects, voice), renderer and the three screen bands.
3. `3-models.js`: Bodie (ported from `site/js/figure-v1.js`), Kip, Sage, Ember, particles and the course pieces.
4. `4-race.js`: Race Kip, Daily Dash and the duel: course generation, breath cues, ghosts, star challenges.
5. `5-modes.js`: The Big Hold (max breath hold, timed on the real clock) and Breath Surf (guided techniques).
6. `6-app.js`: menus, Bodie's first-visit intro, the Today strip, quests and badges screens, shop, Hall of Breath (artifact only), input, main loop, boot.

The Hall of Breath leaderboard runs on the Claude artifact database. On groundapp.live it is hidden and every
record stays in the visitor's browser. A site leaderboard would need a Supabase table and a Pages Function.

## Rematch playtest: `/play-next`

An isolated, minimal-art prototype. The existing `/play` breath game is unchanged.
Source: `game/src/next/`. `python3 game/build.py` copies the page and versioned
modules/styles into `site/`. Increase `NEXT_VER` before changing published assets.

- **Seed Wind:** two players on one phone, opposite ends; aim and release a gust
  to score in the other goal. First to five, or leader at 90 seconds; ties draw.
  Recharge is 1.7 seconds. Holding longer adds no power. Drag off canvas to cancel.
  Optional aim help is per player and never increases impulse. Portrait: Gold
  bottom, Sage top. Landscape: Gold left, Sage right.
  Keyboard: Gold A/D + Space; Sage Left/Right + Enter. Sliders and Gust buttons
  are alternatives to canvas gestures. Results offer rematch and swapping seats.
- **The Deep:** choose a route in each of three rooms, guide a lantern, discover
  objects, recover from a shadow at a nearby ledge, and bring a find home.
  Use route buttons, canvas steering or Left/Right; the focused steering slider
  also has useful arrow-key increments. Select a discovery in the visible home
  clearing. Displays and match records last only for this visit.
- Both games pause on blur/hidden; offer sound off by default, reduced motion,
  and return-to-games controls. Neither asks for breath holding, blowing,
  microphone access, sign-in or personal data.

Verification: `node --test test/play-next.test.mjs` (8 model tests), builder
syntax checks and `scripts/check-site.sh`. Chromium phone-size playthroughs
covered real wins, rematch, seat swap, simultaneous two-touch gusts, cancellation,
keyboard ownership, pause/resume and a full three-room outing with display
selection. These are not evidence that the game is fun or universally accessible.
Physical-device/Safari, two-human rematch demand, child usability and assistive
technology playtests are still required before treating this as a release.
