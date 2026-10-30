# groundapp.live v3 redesign: design spec

Date: 2026-10-30. Owner: Collin Chartier. Process owner: `studio-site-design` skill. Branch `site-v3`, worktree `~/dev/groundapp-website-v3`.

## Goal

Rebuild groundapp.live around GroundApp v2 (App Store version 1.2.1, released 2026-10-29): every screenshot, video, technique, price and feature matches the shipped app. Make it modern, sleek and fun, led by Bodie, with a personal introduction from Collin, the playable Bodie's Breath Run, and clear ways to download, review and connect.

## Decisions (Collin, 2026-10-30)

| Topic | Decision |
|---|---|
| Direction | Breathe with Bodie: character-led, Bodie in 3D carries the visitor through the app |
| Brand | Ground Brand Kit v5 (`~/Desktop/Desktop-Archive/Ground Brand Kit/`), the same system the v2 app uses: night theme (Obsidian #1A110E, Golden Hour #C4935A), Source Serif 4 headlines in sentence case, Ground Font Type for everything else. Source Code Pro retired |
| Game | Bodie's Breath Run from `~/Desktop/bodie-breath-run.zip` (`play-branch.patch`) |
| Team | Collin only. No team section |
| Story | The full arc, same as collinchartier.com, ban included |
| "Connections" | Wearables and devices |
| Pages | Home, About, Play redesigned; blog, support, privacy, terms, delete-account restyled with no content changes |
| Motion | Approved as below ("Love it") |
| Review | Screenshots in chat, desktop and phone side by side. No visual companion |
| Shipping | While GitHub is suspended: Cloudflare direct upload for previews (`--branch site-v3`, behind Access) and for go-live, only after Collin says go. Push everything to GitHub once the account is back |

## Sources of truth

- App facts: the live App Store listing (`https://itunes.apple.com/lookup?id=6760352779`), the v2 store record `~/Desktop/GroundApp v2 Store Assets/APP-STORE-CONNECT-1.2.1.md`, and the app's technique data in the newest app checkout. Exact technique list and count come from the app data, not from this spec.
- Media: `~/dev/groundapp-website-assets-v3/` (README lists every file and what was left out: v1 videos, v1 screenshots, AI images of Collin).
- Bio and press: `~/dev/collinchartier.com` (`components/home/About.tsx`, `Hero.tsx`, `lib/home/content.ts`). Reuse Collin's existing wording.

## Homepage, in order

| # | Section | Content | Media and interaction |
|---|---|---|---|
| 1 | Opening | Headline, one line, App Store button, Play the game | 3D Bodie breathing; press and hold to breathe in, release to breathe out |
| 2 | Meet Collin | Studio headshot. "Creator and developer of GroundApp. Performance breathwork coach." IRONMAN champion, PTO US Open winner, Team USA, 2,000 miles for the Herren Project. As seen on: NBC Washington, FOX 5 DC, ABC7, The Washington Times, Colorado's CW2, Triathlete, The New York Times. Link to About | Intro film (3:04, portrait, captions) plays on tap; Bodie waves |
| 3 | Check in with Bodie | Feeling, strength, energy, matched plan | `ch06-check-in` recording; Bodie leans into the phone |
| 4 | Library | 40+ techniques with practice guides; the 4 free ones marked (Box, Deep Slow, 2-to-1, Triangle); Guided sessions in Collin's voice; Sleep sounds | Tap Box, 4-7-8, Physiological Sigh or Resonance: Bodie breathes the real pattern with the font's inhale/hold/exhale marks (U+E010-E012) counting |
| 5 | Advanced | O2 and CO2 tables, from a ready table or your own reference hold; BOLT test. Safety line: dry land only, never in or near water | `ch05-advanced`; CO2 rounds fill in on scroll |
| 6 | Aura (Premium) | Collin's AI expert builds a plan of 2-3 techniques, about 10 minutes, and asks before anything leaves the phone | Screenshot `05-check-in-plan` |
| 7 | Connections | Apple Health, Apple Watch, live heart rate and HRV (RMSSD) from a Bluetooth monitor or Whoop/Garmin broadcast; Whoop, Garmin, Oura, COROS through Apple Health. Readings inform suggestions, not a medical assessment | Watch screenshots, `10-health`, `ch07-health` |
| 8 | Progress | Streaks, history, BOLT score over time | `09-progress` |
| 9 | Bodie's Breath Run | What it is, the cast (Sage, Kip, Ember) | Cast peeks in; Play loads the game on tap only; full game at /play |
| 10 | Pricing | Free: 4 core techniques, timer, streaks, basic stats, check-ins, live heart rate. Premium $39.99/year (US): all techniques, Advanced tables, guided sessions, Aura. 3-day free trial for eligible new subscribers | |
| 11 | Reviews | App Store 5.0 with the live rating count; real reviews only, quoted exactly with their source. Leave a review button: `https://apps.apple.com/app/id6760352779?action=write-review` | |
| 12 | Download and connect | App Store button (with `ct=` campaign token), newsletter signup (existing `/api` function), Instagram, coaching at collinchartier.com | Bodie cheers |
| 13 | FAQ | Existing FAQ, updated for v2 | |

Phone: every section gets its own phone version from the DESIGN.md Phone table (portrait recordings, copy off key frames, thumb-reachable actions). Bodie appears per section on phones instead of following the scroll.

## About (/about)

Story in order, each part with a real photo from `portraits/`: then (IRONMAN Mont-Tremblant 2022 finish; IRONMAN win, PTO US Open, Team USA), the 2023 EPO ban in one honest paragraph in Collin's existing words, the rebuild through breath, why GroundApp, Running Home (2,000 miles, Boulder to the Lincoln Memorial, Herren Project), coaching today with links to collinchartier.com, press names, the full intro film.

## Play (/play)

Apply `play-branch.patch` (two commits). Keep the game as built, inside the new header and footer. Records stay in the visitor's browser. No leaderboard in this round. Keep its DESIGN.md ban exceptions and the Big Hold safety note.

## Restyled pages

Blog (index, posts and `scripts/build_blog.py` template, which must keep producing byte-identical output to the committed pages), support, privacy, terms, delete-account, 404: new header, footer, fonts and palette. Words unchanged.

## Motion

- Signature: Bodie breathes at Resonance pace (5.5 s in, 5.5 s out); press and hold takes over the breath.
- Opening: Bodie wakes on his disc and takes a first breath; the headline arrives on the exhale.
- Desktop: Bodie travels beside the sections and reacts (waves at Meet Collin, leans in at Check in, cheers at Download). Phone: one Bodie moment per section, never over text.
- Scroll moments: Library pattern breathing, CO2 rounds filling, cast peeking in at the game.
- Sound off by default. Reduced motion and Low Power Mode: Bodie still, videos show their poster, all content readable.
- Budget: one 3D canvas on the homepage (Bodie, from `site/js/figure-v1.js`). Game JS and three.js load only after Play.

## Must keep working

Signup, unsubscribe and admin functions (`functions/`, `lib/`), App Store links with `ct=` tokens and tap tracking, Meta pixel, `_redirects`, `sitemap.xml`, `llms.txt`, blog build, `scripts/check-site.sh` rules (nothing private in `site/`), versioned JS/CSS filenames (7-day cache).

## Also fixed

- `AGENTS.md` copy rules: 40+ techniques, $39.99/year, the 3-day free trial for eligible new subscribers may be stated.
- `lib/welcome.js`: $29.99 becomes $39.99.

## Review rounds and checks

Before each round: `check-tells.py` (0 FAIL), `inspect.mjs` at 1440/768/390, `motion-frames.mjs` and `phone-parity.mjs` (0 FAIL), `ios-sim.sh`, then the `site-critic` agent. Collin sees desktop and phone screenshots side by side, plus a phone preview at `site-v3.groundapp.pages.dev`.

1. Round 1: the Bodie opening only.
2. Round 2: the full homepage.
3. Round 3: About, Play and the restyled pages.

Then a Codex `cross-reviewer` pass, then go-live by direct upload after Collin says go.

## Needs Collin before go-live

- Headline and every new line of copy (flagged in each round's report).
- Headshot choice (default: `collin-portrait-studio.jpg`).
- Accolade wording, and whether any other credentials belong in the row.
- Which reviews to quote (only real App Store or verified reviews).
- Socials beyond Instagram (`instagram.com/collinchartier` is the only one found).
