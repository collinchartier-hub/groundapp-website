# GroundApp website (groundapp.live)

@AGENTS.md

- `site/` is exactly what gets deployed. Never put notes, scripts, send logs or subscriber data in it.
- `functions/` holds Cloudflare Pages Functions (signup API, unsubscribe, host redirects).
- `lib/` holds shared code for the functions, including the welcome email (`lib/welcome.js`). Local secrets go in `.dev.vars` (gitignored).
- Deploy: GitHub Actions on every push (`.github/workflows/deploy.yml`). Branch = preview, `main` = live. While GitHub is unavailable, direct upload from Collin's laptop only, as described in AGENTS.md. `scripts/deploy.sh` is retired. Full rules in AGENTS.md.
- Writing rules: no em dashes, casual and direct. The product is spelled GroundApp; the companion is Bodie.
- Brand: Ground Brand Kit v5 (`site/assets/css/ground-tokens-v1.css`, from `~/Desktop/Desktop-Archive/Ground Brand Kit/`). Night palette: Obsidian #1A110E, Bone #E8DDD0, Golden Hour #C4935A, Amber #D4A574, Driftwood #A89585. Type: Source Serif 4 headlines in sentence case (opsz 60, Regular), Ground Font Type for everything else, both self-hosted in `site/assets/fonts/` with their OFL texts. Source Code Pro is retired. No Fraunces, no italic, no coloured accent word, no caps eyebrow above a heading.

## Design rules
- Read `DESIGN.md` (direction, type and licenses, colour, layout, motion and phone tables, choices) and `DESIGN-BANS.md` (studio defaults to question) before changing any page.
- Any visual work runs through the `studio-site-design` skill: deal directions, build, then `python3 ~/.claude/skills/studio-site-design/check-tells.py site --design-md DESIGN.md` and screenshots at 1440 and 390.
- `design-options/` holds hero option files for review only. It is outside `site/`, so it never deploys.
- JS and CSS filenames are versioned: bump the number when editing a file that is already live (7-day edge cache). Landing page: `site-v4.css`, `home-v9.css`, `home-v8.js`, `bodie-v3.js`, `app-links-v3.js`, `ground-tokens-v1.css`. Reading pages and 404: `page-v2.css`. Game source builds `bodie-run-v3.js` and `bodie-run-v3.css`. Waiting room: `home-v4.css`, `pacer-v9.js`, `breath-figure-v2.js`, `figure-v1.js`, and owner-maintained `event-status-v1.js`.
- The two demos on the landing page (the check-in phone and the Apple Watch) are built, not hand-written: source in `demo/` (React and the Stageshow kit, outside `site/`), output `site/js/app-demo-v1.min.js` and `site/assets/css/app-demo-v1.min.css`. Edit the source, run `npm install` then `npm run build` in `demo/`, and commit the built files. Never edit the built files. Their strings are the shipped app's (`demo/src/checkin/data.ts`, the head of `demo/src/watch/index.tsx`); how they were checked is in `demo/REHEARSAL.md`. `home-v8.js` loads them when the first one is a screen away and tells them when motion is paused.

## Review mode
`preview-mode-v1.js` turns on a no-send review mode only when a local review server injects `/__preview/guard.js`, sets `window.__BRAND_PREVIEW__` to true or 1, or adds a `brand-preview=1` meta tag. It never infers the mode from a hostname, so production keeps its integrations. In review mode forms validate locally but do not submit or claim success, Atlas offers a labelled review-playback control, `site-analytics-v1.js` skips the production beacon, and the game's database writes are gated. `DESIGN.md` records the November 2026 alignment decisions and owner approvals; `CHANGELOG.md` maps the pages changed.
