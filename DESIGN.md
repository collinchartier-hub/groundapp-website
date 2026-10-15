# GroundApp website design (design-v2, 2026-10-14)

Status: PREVIEW. Recommended direction, not chosen. Nothing ships until Collin approves a preview.
Rules that override everything here: `DESIGN-BANS.md` (copy of the studio ban list) and the `studio-site-design` skill.

## Art direction
The page is a breathing instrument first and a brochure second. The first thing a visitor can do is breathe with
the same gold rings the app uses; everything after that explains the app with real screens, real reviews and real numbers.
On this page, GroundApp's own breath rings become the hero you can use. Name the one live thing: the pacer.

World study (the nouns): breath rings, box count (4-4-4-4), the exhale that runs longer than the inhale,
resonance pace (about 5.5 breaths a minute), the lung mark, the 102-feeling wheel, Apple Watch haptic taps,
Oura ring, mindful minutes, streak heatmap, Seedling to Master, BOLT seconds, Collin's voice, Golden Hour light,
brown-black earth. Reference notes (from memory, no fresh crawl): Calm (borrow: one calm subject; avoid: email gate
on entry), Headspace (borrow: plain words; avoid: mascots), Breathwrk (borrow: the pacer as product demo; avoid:
neon fitness gradients), Othership (borrow: warm dark ground with real people; avoid: membership chrome),
Waking Up (borrow: founder voice and restraint). Outside the field: hardware product pages that put one working
object at real size, and metronome apps where tempo is the interface.

## Directions dealt (draw.mjs, --keep palette,type)
- A `quiet-instrument`: one narrow column, the pacer as a small exact tool. `design-options/hero-a.html`
- B `split-stage`: Collin's real photo holds the left half, pacer and a giant wordmark on the right. `design-options/hero-b.html`
- C `product-performs` (recommended, built in full): the headline splits around the working pacer. `site/index.html`

## Type (font reason)
- **Fraunces** (OFL 1.1, Undercase Type, via Google Fonts files in the Ground kit), headings, the pacer count, prices.
  Why this font: it is the Ground brand kit face Collin chose on 2026-10-14, shared with the 8-week course PDFs and
  GROUNDED, so the app, the course and the program read as one practice. Its soft, slightly irregular old-style
  shapes fit the warm earth-and-breath world better than a tech grotesk. Used at 300 to 400, never italic,
  never with an accent-colored or italic word inside a headline. One face per headline.
- **Hanken Grotesk** (OFL 1.1), body, buttons, labels. Kit face; calm at small sizes, real tabular figures.
- Both self-hosted as woff2 under `site/assets/fonts/` (latin subset, variable weight), preloaded, `font-display: swap`.
  This replaces Iowan Old Style, which only exists on Apple devices (Android and Windows fell back to Georgia).
- Licensed upgrade worth a look: Signifier or Tiempos Headline (Klim) for headings, roughly USD 150 to 400 for a
  small-site web license depending on traffic tier. Check current pricing before buying.
- Scale: 15 small, 17 body, 19 lede, 22 h3, 30 sub-display, h2 clamp(30 to 46), display clamp(39 to 74).

## Palette (Ground kit `night` theme, from the app itself)
Obsidian #1A110E ground, #231916 second ground, #2D1E17 card, Bone #E8DDD0 text (full ink for running copy),
Driftwood #A89585 for notes only (6.2:1 on the ground), Golden Hour #C4935A for the action and the rings,
Amber #D4A574 on dark text accents. Text on gold is Obsidian, never white. Gold is Collin's own color: allowed here
because GroundApp is his practice (ban list: gold only for Collin).

## Signature interaction
The breath pacer (`site/js/pacer-v2.js`), used twice with one timeline engine:
- Hero: the rings are drawn by the web-3d `breath` shader (`site/shaders/breath-v1.frag`, the page's ONE shader
  moment, Ground only). The pacer stays the source of truth and passes its fill to the shader, so rings, words and
  count never disagree. Idle runs at resonance pace (4.5 s in, 6.5 s out). Begin, the pattern buttons, the sound
  button, the headline and the App Store button are HTML above the canvas. Poster webp under the canvas (18 KB
  desktop, 17 KB phone) for no-WebGL; `stillTime: 4.5` under reduced motion. Colors come from CSS tokens.
- Feelings demo (right after the hero): the wheel's last tier opens a second pacer loaded with the breath the app
  starts with for that feeling, plus one plain line naming it. Mapping from GroundApp 1.1.1's rule-based check-in
  plan (`CheckInViewModel.buildFallbackPrescription` + `FeelingWheel.polyvagalState`): Anxious and Angry start with
  Physiological Sigh (2 in, 1 more in, 6 out), Sad and Numb with Deep Slow Breathing (6 in, 6 out), Calm and
  Energized with Resonance Breathing (5.5 in, 5.5 out). If Aura (AI check-in) is switched on it may pick differently.
Sound: nothing plays until the visitor taps "Sound off" to turn it on; the binaural tone swells with the inhale.

## Motion budget (motion.md)
1. Signature: the pacer (hero shader rings + the feelings pacer, one engine).
2. One hero entrance: the headline halves part outward like an exhale while the rings open (950 ms, expo-out).
3. Scroll moment: "How it works" pins the phone while three short steps pass (shortened in round 2).
4. Scroll moment: the closing rings open once as the last section arrives (CSS scroll-driven, static fallback).
Everything else is still. Zero reveal classes. Reduced motion: no entrance, no idle loops, shader still frame,
closing rings static; count and words still run. Verified 0 running animations at rest.

## Signup card (replaces the popup)
Phones and tablets never see it: the inline form at the close is the ask. On desktop it opens at most once per
visitor (`ga-nl-seen`), only once the FAQ is behind you (the close section's top has passed 60% of the screen), sits
over the empty right half of the close and its decorative rings, and closes itself when the inline form is a quarter
into view. Not modal, no focus steal, Close / "No thanks" / Esc dismiss it. Posts to `/api/subscribe` exactly as
before (`source: "popup"`). Both newsletter buttons are secondary (Bone on #2D1E17 / #3A281F): the App Store button
is the only gold fill on the closing screen.

## Imagery
- App screens (3), device shots (3) already in the repo.
- Collin teaching a class, hand on chest: frame at 1.3 s of `~/Documents/Traverse breathwork/edit/gym_30.mp4`
  (Collin's own footage), cropped 560x700, `site/img/photos/collin-class-breath-*.webp`. Replaces the effort photo.
  A short muted loop of the same moment is possible (not added: keeps the motion budget and page weight down).

## Project-specific bans
- No italic or gold word inside any headline. No tracked caps labels above headings. No icon-card grids.
- No mono labels (the kit's JetBrains Mono kickers conflict with the ban list; dropped on this site).
- Breath-paced motion belongs to Ground only; never copy the pacer to collinchartier.com or client sites.
- App facts only from the fact sheet in memory (`project_groundapp_website_audit_2026-10-02`). No Aura, no trial,
  no WHOOP, no programs. Rating text must match the live App Store (5.0 from 11 ratings on 2026-10-14).

## Checker WARN/FAIL left on purpose (check-tells.py)
- italic-accent-word + heading-em-css: `terms.html`, `privacy.html` only. Those pages are on the do-not-touch list for
  this preview; fix them in a follow-up once Collin approves (their privacy copy is legal text).
- stock-copy ("game changer"): two verbatim customer quotes (App Store review by okh78, class testimonial by Tyler B.).
  Verbatim quotes are exempt.
- default-display-font: Fraunces, reason above.
- glassmorphism: blog, terms and privacy pages (untouched here). middot-meta: admin dashboard (untouched).
- Inspector `few-pictures`: 7 real raster images plus the shader; the inspector skips lazy images and data-ui phones.
  `no-footage`: owned Traverse footage exists; a loop is Collin's call (see Imagery). The shader is the moving picture.
- web-3d: `verify-webgl.mjs check` PASS at 1440 and 390 (served without the analytics beacon), `check-3d-budget.py` PASS.
