# GroundApp website (groundapp.live)

- `site/` is exactly what gets deployed. Never put notes, scripts, send logs or subscriber data in it.
- `functions/` holds Cloudflare Pages Functions (signup API, unsubscribe, host redirects).
- `lib/` holds shared code for the functions, including the welcome email (`lib/welcome.js`). Local secrets go in `.dev.vars` (gitignored).
- Deploy: commit + push to main, then `./scripts/deploy.sh` (Cloudflare Pages project `groundapp`, direct upload, no git integration).
- Writing rules: no em dashes, casual and direct. The product is spelled GroundApp.
- Brand: Obsidian #1A110E, Bone #E8DDD0, Golden Hour #C4935A, Amber #D4A574, Driftwood #A89585. Serif headings (Iowan Old Style), system sans body.
