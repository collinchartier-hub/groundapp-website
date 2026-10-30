# Bodie's Breath Run (groundapp.live/play)

A free 3D breathwork game with Bodie, the figure from the home page. One source builds two copies:

- `site/play.html`, `site/js/bodie-run-v1.js`, `site/assets/css/bodie-run-v1.css`: the page on groundapp.live.
- `game/out/bodie-breath-run.html`: the single-file Claude artifact version (gitignored).

Edit `game/src/`, never the built files in `site/`. Then:

```
python3 game/build.py
```

The script syntax-checks both builds. When the JS or CSS changes, bump `VER` in `build.py` (v2, v3...) because
`/assets` and `/js` are cached for 7 days, and point `play.html` at the new names (the script does this).

Source parts, in the order they are joined:

1. `1-page.html`: markup and CSS (the stage, menus, cards, the cast and the technique notes).
2. `2-core.js`: profile and records (localStorage), courses, sound (chiptune music, effects, voice), renderer and the three screen bands.
3. `3-models.js`: Bodie (ported from `site/js/figure-v1.js`), Kip, Sage, Ember, particles and the course pieces.
4. `4-race.js`: Race Kip, Daily Dash and the duel: course generation, breath cues, ghosts, star challenges.
5. `5-modes.js`: The Big Hold (max breath hold, timed on the real clock) and Breath Surf (guided techniques).
6. `6-app.js`: menus, shop, Hall of Breath (artifact only), input, main loop, boot.

The Hall of Breath leaderboard runs on the Claude artifact database. On groundapp.live it is hidden and every
record stays in the visitor's browser. A site leaderboard would need a Supabase table and a Pages Function.
