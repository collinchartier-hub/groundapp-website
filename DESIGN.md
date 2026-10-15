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
The breath pacer in the hero (`site/js/pacer-v1.js`). Five gold rings, outer rings travel further than inner ones and
each trails the one inside it, so the set fills like lungs. Tap the center to begin; the phase word and seconds sit
in the center. Patterns: Box 4-4-4-4, 4-7-8, Resonance 5.5-5.5. Before anyone taps, an idle loop runs at resonance
pace (4.5 s in, 6.5 s out) and pauses off-screen. Sound: nothing plays until the visitor taps "Sound off" to turn it
on (that tap creates the AudioContext); the binaural tone swells with the inhale. The feelings wheel stays tappable.

## Motion budget (motion.md)
1. Signature: the pacer (above).
2. One hero entrance: the two halves of the headline part outward like an exhale while the rings open
   (950 ms, cubic-bezier(.16,1,.3,1)), controls fade in after.
3. Scroll moment: "How it works" pins the phone while the three steps pass; the screen crossfades per step.
4. Scroll moment: the closing rings open once as the last section arrives (CSS scroll-driven, static fallback).
Everything else is still. Zero reveal classes (the old page had about 60 fade-ups, About had 85).
`prefers-reduced-motion`: no entrance, no idle loop, rings never scale (the count and words still run and the
glow brightens and dims), closing rings static. Verified: 0 running animations at rest.

## Signup card (replaces the popup)
Never over the first screen. Opens at most once per visitor (`ga-nl-seen` in localStorage) and only after real
engagement: scrolled past 60% of the page, or finished a full pacer cycle and then left the hero. Not modal, no focus
steal (announced politely to screen readers), Close, "No thanks" and Esc dismiss it, hidden while the inline form is
on screen. Posts to `/api/subscribe` exactly as before (`source: "popup"`).

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
- Inspector `few-pictures`: 7 real raster images (3 app screens, 3 devices, 1 photo of Collin); the inspector skips
  lazy images and the data-ui phone. `no-footage`: owned breathwork footage exists (Traverse sauna/gym clips) and is
  Collin's call; not added, the pacer is the page's moving picture.
