# GroundApp website design (site v3, 2026-10-30)

Studio stage 2 for `site-v3`. Spec: `docs/superpowers/specs/2026-10-30-site-v3-redesign-design.md` (its last section,
"Changes after Collin's review", wins). Copy: `docs/site-v3/copy.md`. Media: `docs/site-v3/media.md`.
Studio defaults to question: `DESIGN-BANS.md`.

## Direction
**Breathe with Bodie.** Collin picked this direction on 2026-10-30 ("Love it"). Bodie, the companion who sits in the
middle of the app's Home screen, is the guide: the visitor meets him breathing on his terracotta disc, presses and
holds him to breathe, and he walks them through the app section by section. Every picture is the shipped app
(GroundApp v2, App Store 1.2.1): real screen recordings in a phone, real Apple Watch screens, Collin's own two photos
and his intro film. One scrolling page; `/play` stays the game's own page.

World (stage 1 nouns): the disc, the belly that fills and glows, the breath marks (inhale, hold, exhale), the wheel of
techniques, the check-in feelings, a CO2 table's rounds and rests, a heart-rate strap, the watch on a wrist, a finish
tape, a country road, Sage's Great Tree, Kip's espresso.

Signature: press and hold Bodie to breathe in, let go to breathe out (the app's own gesture). Between sections he
travels beside the page and reacts: waves at Collin, leans toward the check-in phone, breathes the technique you tap
in the Library, sits with the cast at the game, cheers at Download.

## Type
Font reason: the kit fixes the faces (Ground Brand Kit v5, the system the v2 app ships with). The moves are ours.
| Role | Face | Setting | License |
|---|---|---|---|
| Headlines (h1, h2), Collin's quotes | Source Serif 4, Regular 400, opsz 60, sentence case | h1 clamp(2.75rem, 1.5rem + 5.4vw, 6.5rem), h2 clamp(2rem, 1.4rem + 2.4vw, 3.25rem), line height 1.04-1.1 | SIL Open Font License 1.1 (Adobe), `site/assets/fonts/OFL-Source-Serif-4.txt` |
| Everything else: body, buttons, nav, prices, counts, breath marks | Ground Font Type (Commissioner by Kostas Bartsokas, flare 40 built in) | 400 reading, 500 titles, 600 buttons; tabular figures for counts, times, prices | SIL Open Font License 1.1, `site/assets/fonts/OFL-Ground-Font-Type.txt` |

- Breath marks U+E010 (inhale), U+E011 (hold), U+E012 (exhale) exist only in Ground Font Type; they sit before each
  count in the Library readout and the CO2 table.
- No italic, no coloured word in a headline, no caps labels. Emphasis comes from size. Source Code Pro is retired and
  not loaded on this page.
- Body 18px desktop, 17px phone, line height 1.6, held to 62ch.

## Colour
Night theme from `site/assets/css/ground-tokens-v1.css`, flat fills only (no gradients, no shadows at rest).
| Token | Hex | Job |
|---|---|---|
| `--bg` Obsidian | #1A110E | page |
| `--bg-2` | #231916 | section bands (play, pricing, download) |
| `--card` | #2D1E17 | plans, reviews, technique rows, phone bezels |
| `--text` Bone | #E8DDD0 | headlines, titles, quotes |
| `--text-2` Driftwood | #A89585 | reading text (the kit's reading ink) |
| `--gold` Golden Hour | #C4935A | App Store buttons, tick dots, the CO2 hold fills, the breath readout |
| `--gold-2` Amber | #D4A574 | hover on gold, the inhale mark |
| `--sage` | #7A8B6F | the safety lines' dot (calm), "Free" markers |
Gold is Collin's and Ground's: fills and data, never a headline word.

## Layout
- Container 1200px (kit 1100 plus room for Bodie's column), measure 62ch, section padding clamp(88px, 10vw, 144px).
- Each section is composed from its own content, not one template: phone recordings sit in a 9:19.5 bezel
  (`data-ui`), Bodie's slot is a 2.5:3.1 box in the layout so he is never over text.
- Header: lung + GroundApp left; App, Story, Pricing, a distinct Play link (/play) and the App Store button right.
  Phone: logo, Play, Menu (labelled), plus one floating "Get the app" pill under the thumb after the hero.

## Motion
Signature: Bodie breathes at Resonance pace (6 s in, 6 s out, the app default); press and hold takes over the breath.
Tokens: studio `motion-tokens.css` (copied into `site/assets/css/site-v3.css`). Own curves: none.
| Moment | Trigger | Elements | Duration, easing | Reduced motion |
|---|---|---|---|---|
| Signature | always, press and hold | Bodie canvas (`/js/bodie-v3.js`) | breath clock, sine in-out | `setStill(true, { glow: false })`: one still frame, press still answers |
| Hero entrance | load | Bodie `react('wake')`; lede, hint, actions (stagger 70ms) | wake 1.3 s; --t-reveal, --ease-expo, 24px rise | Bodie awake and still, copy in place |
| Bodie travels (desktop) | a section with a Bodie slot crosses the middle of the screen | the one canvas moves to that slot, then reacts (wave, lean, cheer) | --t-reveal + 100ms, --ease-in-out | moves with no travel, fade only |
| Bodie appears (phone) | same | canvas moves into the section's own beat | --t-panel opacity fade | instant |
| Library pattern | tap Box, 4-7-8, Physiological sigh, Resonance | Bodie's breath, readout with breath marks | the real pattern | readout shows the pattern, no live count |
| CO2 rounds fill (scroll moment) | table scrolls through view | 6 holds, 5 rests, recovery | scroll-linked, linear | filled |
| Cast peeks in (scroll moment) | play band enters view, once | Kip, Sage, Ember rise into their tiles (stagger 90ms) | --t-reveal, --ease-expo | in place |
| App recordings (moving picture) | 30% in view; pause off screen | check-in, advanced, health clips | loop, muted | poster still, never plays |
Sound is off everywhere. The intro film plays with sound only on tap. Low Power Mode (a clip's `play()` is refused):
Bodie goes still, clips stay on their poster stills.

## Phone
Phone cut: one 9:16 story. Bodie moves into each of his sections as its own beat above or below the copy (never
behind it), the recordings play full width in the bezel, side-by-side pictures become swipe rails.
| Section | Desktop | Phone | Footage on phone | Copy | Thumb / motion | Low Power Mode |
|---|---|---|---|---|---|---|
| Hero | h1 over a large centred Bodie, actions under him | h1 in two lines, Bodie 300px tall in the middle of the screen, App Store button and Play under him | live canvas | above and below Bodie, never on him | touch and hold Bodie; entrance as desktop | Bodie still (canvas still frame) |
| Collin | photo pair left, bio, accolades and press right, intro film card with Bodie waving beside it | IRONMAN photo full bleed, bio, Running Home photo, then film card and Bodie side by side | both photos, film poster, tap to play with sound | own beats between photos | Bodie waves as the slot arrives; film button 56px | poster; film still plays on tap |
| Check-in | text left, phone recording centre, Bodie right leaning in | recording full width in the bezel, Bodie small beside the steps | ch06-check-in, same 9:16 file | above the phone | lean toward the phone | poster still |
| Library | technique list left, Bodie and his readout right, four tabs and the Library screenshot below | Bodie and readout first, the tappable list under him (48px rows), tabs as a swipe rail with the screenshot | live canvas, 06-library shot | readout under Bodie | tap a row, Bodie breathes it | Bodie still, readout shows the pattern |
| Advanced | recording left, copy, safety line and CO2 table right | recording, then the table full width, safety line set apart | ch05-advanced | own beat | rounds fill on scroll | poster still, table filled |
| Play | band: pitch and modes left, cast tiles with Bodie right | cast rail first (Bodie, Kip, Sage, Ember), then pitch, modes, Play button | live canvas, three cast stills | own beat | cast peeks in; Play 56px | Bodie still |
| Aura | copy left, plan screenshot right | screenshot after the copy | 05-check-in-plan | own beat | none | same |
| Connections | four blocks, health recording, health shot, five watch screens | recording and health shot as a swipe rail, blocks, watch rail | ch07-health, 10-health, 5 watch shots | own beats | swipe rails | poster still |
| Progress | shot left, copy right | shot after the copy | 09-progress | own beat | none | same |
| Story | six parts down a centre column, the two photos beside parts 1 and 5 | one column, photos full width at their parts | both photos | between photos | none | same |
| Pricing | Free and Premium side by side | stacked, Premium second | none | in the plans | buttons 52px | same |
| Reviews | one large quote, two beside it | stacked quotes | none | quotes | Leave a review 52px | same |
| Download | App Store block with Bodie cheering, newsletter, connect | Bodie, App Store button, form, links | live canvas | own beats | cheer; form fields 52px | Bodie still |
| FAQ | two columns of questions | one column | none | accordions | 56px summaries | same |

## Choices
Defaults used on purpose, one line why each (check-tells reads the `- <rule-id>: <reason>` lines).
- stock-copy: okh78's App Store review says "game changer"; customer quotes stay word for word (hard rule exemption for verbatim quotes), so the HTML writes it `game&nbsp;changer` and the visitor reads the exact words.
- phone-no-portrait-cut: every app clip is already a portrait screen recording (588x1280) and the intro film is 720x1280, so the phone and desktop play the same 9:16 files; nothing is cropped.
- fake-sequence: the check-in steps 1 to 3 and the story's six parts are real sequences (the app's order, Collin's life in order).
- eyebrow-labels: only on `/play` (the game's instrument panel, see the /play section below) and the 404 page (restyled in Task 7).
- middot-meta: inside the game's in-play readout (`js/bodie-run-v1.js`) and the admin dashboard, which is not public.
- phone-touch-none: the game canvas on `/play` takes every touch as a breath; the page around it scrolls.
- italic-accent-word: legal pages (terms, privacy, delete-account) keep their old markup until Task 7 restyles them with words unchanged.
- heading-em-css: same legal and support pages, Task 7.
- glassmorphism: same legacy pages (support, terms, privacy, delete-account), Task 7; the landing page has none.
- phone-100vh: atlas pages and delete-account, not part of this page; Task 7 swaps their chrome.
- phone-hover-only: legacy stylesheets still used by the masterclass waiting room (`home-v4.css`) and the blog; every hover on the landing page sits inside `(hover: hover) and (pointer: fine)`.
- grey-body: running text is Driftwood (#A89585, 6.3:1 on Obsidian) because the kit makes it the reading ink; headlines, titles and quotes are Bone.
- character: Bodie is the app's own companion with a job (the breath pacer), drawn from the shipped app, kept away from prices and reviews.
- headline-on-load: "Breathe with Bodie." is in the first paint (it is the LCP); Bodie's wake carries the entrance instead of the headline arriving on the exhale.

## Checker notes
Run before every review round: `python3 ~/.claude/skills/studio-site-design/check-tells.py site --design-md DESIGN.md`
(0 FAIL), `inspect.mjs` at 1440/768/390, `motion-frames.mjs`, `phone-parity.mjs` (0 FAIL), `./scripts/check-site.sh`.

## /play: Bodie's Breath Run (game page, Collin's request 2026-10-30)
A free browser game, built from `game/src/` by `python3 game/build.py` into `site/play.html`, `js/bodie-run-v1.js`
and `assets/css/bodie-run-v1.css`. Edit the source, never the built files. Three.js 0.186.1 from jsDelivr.
The landing page loads no game JS: its Play section links to `/play`. The cast stills on the landing page
(`img/play/cast-{kip,sage,ember}-v1.webp`) are the game's own portraits, rendered by `/play` and saved as files.

The cast: Bodie (hero), Kip the Caffeine Crow (rival), Sage the Owl (coach) and Ember the Fox (shopkeeper). "Meet the
cast" on the title screen walks the camera to each one while they say hello; the cast cards under the game have a
"Hear" button each (browser speech, a pitch and speed per character).

Ban exceptions, for /play only:
- Caps, mono and short "·" readouts inside the game screen: the in-play readout and the breath cue band are an
  instrument panel, read at a glance mid-run. Menus, cards and the page around the game follow the site rules.
- Gold fills on game buttons, inside the game screen only.
- The cue band ("HOLD YOUR BREATH!") is the one place that shouts; it has its own band so it never sits on other text.

Copy: technique names and timings match the app. No health or outcome claims. The Big Hold keeps its safety note on
the start card. Records live in the visitor's browser; no leaderboard this round.
