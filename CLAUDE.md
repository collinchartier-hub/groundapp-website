# GroundApp website (groundapp.live)

- `site/` is exactly what gets deployed. Never put notes, scripts, send logs or subscriber data in it.
- `functions/` holds Cloudflare Pages Functions (signup API, unsubscribe, host redirects).
- `lib/` holds shared code for the functions, including the welcome email (`lib/welcome.js`). Local secrets go in `.dev.vars` (gitignored).
- Deploy: commit + push to main, then `./scripts/deploy.sh` (Cloudflare Pages project `groundapp`, direct upload, no git integration).
- Writing rules: no em dashes, casual and direct. The product is spelled GroundApp.
- Brand: Obsidian #1A110E, Bone #E8DDD0, Golden Hour #C4935A, Amber #D4A574, Driftwood #A89585. Type "G1" (2026-10-15): Source Serif 4 for display (Light, opsz 60, caps) and body, Source Code Pro for data only, self-hosted in `site/assets/fonts/` with OFL texts. No Fraunces, no italic.

## Design rules
- Read `DESIGN.md` (art direction, type reasons, palette, motion budget, the pacer) and `DESIGN-BANS.md` (studio ban list) before changing any page.
- Any visual work runs through the `studio-site-design` skill: deal directions, build, then `python3 ~/.claude/skills/studio-site-design/check-tells.py site --design-md DESIGN.md` and screenshots at 1440 and 390.
- `design-options/` holds hero option files for review only. It is outside `site/`, so it never deploys.
- JS and CSS filenames are versioned (`pacer-v3.js`, `home-v2.js`, `home-v3.css`, `breath-figure-v1.js`, `figure-v1.js`; unused since the hero figure: `hero-shader-v1.js`, `shader-hero-v1.js`, `shaders/breath-v1.frag`): bump the number when editing (7-day edge cache).
