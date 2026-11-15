# Bodie's Breath Run (groundapp.live/play)

A free 3D finger-control game with Bodie, the figure from the home page. Keep breathing normally. One source builds two copies:

- `site/play.html`, `site/js/bodie-run-v3.js`, `site/assets/css/bodie-run-v3.css`: the page on groundapp.live.
- `game/out/bodie-breath-run.html`: the single-file Claude artifact version (gitignored).

Edit `game/src/`, never the built files in `site/`. Then:

```
python3 game/build.py
```

The script syntax-checks both builds. When the JS or CSS changes, bump `VER` in `build.py` (v2, v3...) because
`/assets` and `/js` are cached for 7 days, and point `play.html` at the new names (the script does this).

Source parts, in the order they are joined:

1. `1-page.html`: markup and CSS (the stage, menus, cards, cast and finger-control notes).
2. `2-core.js`: profile and records (localStorage), courses, sound (chiptune music, effects, voice), renderer and the three screen bands.
3. `3-models.js`: Bodie (ported from `site/js/figure-v1.js`), Kip, Sage, Ember, particles and the course pieces.
4. `4-race.js`: Race Kip, Daily Dash and duel: screen shields, jumps, gusts, ghosts and game-point challenges. Lake generation is off; no dive incentives.
5. `5-modes.js`: a bounded noncompetitive Ribbon ride. No breath matching, score, record or rewards.
6. `6-app.js`: menus, shop, Trail board (artifact only), keyboard/touch input, pause, main loop and boot.

The maximal-hold mode and physiological records are not migrated. New browser keys start at `bodie-controls-v1` and `bodie-controls-ghost-*`; the old stored records are left untouched but never loaded. A production artifact may still use its database for game points; explicit preview detection prevents connecting, reading or writing it. The website keeps records in the browser. The v3 build removes the obsolete public v2 game bundles.
