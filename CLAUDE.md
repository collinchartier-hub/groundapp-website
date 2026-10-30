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
- JS and CSS filenames are versioned: bump the number when editing (7-day edge cache). Landing page (site v3): `site-v3.css` (shared header, footer, buttons, type), `home-v5.css`, `home-v5.js`, `bodie-v3.js`, `app-links-v3.js`, `ground-tokens-v1.css`. Game: `bodie-run-v1.js`, `bodie-run-v1.css`. Masterclass waiting room only: `home-v4.css`, `pacer-v8.js`, `breath-figure-v1.js`, `figure-v1.js`.
