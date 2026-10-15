# GroundApp website design (design-v2, 2026-10-14)

Status: PREVIEW. Recommended direction, not chosen. Nothing ships until Collin approves a preview.
Rules that override everything here: `DESIGN-BANS.md` (copy of the studio ban list) and the `studio-site-design` skill.

## Art direction
The page is a breathing instrument first and a brochure second. The first thing a visitor can do is breathe with
the same gold rings the app uses; everything after that explains the app with real screens, real reviews and real numbers.
On this page, the hero is "Breathe with me": a round figure breathes the pacer with you, its belly filling on the
inhale and drawing in on the exhale. Name the one live thing: the pacer.

World study (the nouns): breath rings, box count (4-4-4-4), the exhale that runs longer than the inhale,
resonance pace (about 5.5 breaths a minute), the lung mark, the 102-feeling wheel, Apple Watch haptic taps,
Oura ring, mindful minutes, streak heatmap, Seedling to Master, BOLT seconds, Collin's voice, Golden Hour light,
brown-black earth. Reference notes (from memory, no fresh crawl): Calm (borrow: one calm subject; avoid: email gate
on entry), Headspace (borrow: plain words; avoid: mascots. Collin's call 2026-10-15: ONE original figure in the hero, because a
belly that breathes teaches diaphragm breathing better than rings. No other characters anywhere), Breathwrk (borrow: the pacer as product demo; avoid:
neon fitness gradients), Othership (borrow: warm dark ground with real people; avoid: membership chrome),
Waking Up (borrow: founder voice and restraint). Outside the field: hardware product pages that put one working
object at real size, and metronome apps where tempo is the interface.

## Directions dealt (draw.mjs, --keep palette,type)
- A `quiet-instrument`: one narrow column, the pacer as a small exact tool. `design-options/hero-a.html`
- B `split-stage`: Collin's real photo holds the left half, pacer and a giant wordmark on the right. `design-options/hero-b.html`
- C `product-performs` (recommended, built in full): the headline splits around the working pacer. `site/index.html`

## Type (font reason): "G1", Collin's choice 2026-10-15
Why: Collin's choice 2026-10-15: one Adobe family speaks for the whole practice; light caps display is the closest free
cousin of Icebreak's Louize; plain f. (Fraunces was dropped the same day: "the weird F that's squiggly... generic".)
Both faces are Adobe Originals, SIL OFL 1.1, served by Google Fonts. Licence texts sit next to the files.
- **Display** (h1, h2, the split hero line "From the mind" / "into the body", closing line, about/blog/404/atlas titles):
  Source Serif 4 Light 300, `font-variation-settings: "opsz" 60`, UPPERCASE via CSS, tracking +0.01em, leading 1.04 to 1.08.
  Source text stays in sentence case (screen readers and copy-paste get "GroundApp", not "GROUNDAPP").
- **Body** (paragraphs, h3, buttons, nav, captions, FAQ, wheel labels): Source Serif 4 at text size, `font-optical-sizing: auto`,
  400; 600 for filled buttons and inline bold. Sentence case.
- **Data** (breath counts in the pacer, the pattern timings "4 in, 4 hold, 4 out, 4 hold", the cycle count, the feelings plan
  timing, prices on the pricing cards, practice durations on atlas pages): Source Code Pro 400 (500 on atlas durations),
  via `.data` spans or the element's own rule. Nothing else is mono: no mono kickers or labels.
- No italic anywhere: no italic files are shipped and `font-synthesis: none` keeps browsers from faking one (blog `em`
  renders upright in Bone). Terms and privacy only swapped their font stacks; their old italic heading stays for now.
- Files: `site/assets/fonts/source-serif-4-v1.woff2` (variable, wght 200 to 900, opsz 8 to 60, latin, 122 KB, preloaded on
  every page) and `source-code-pro-v1.woff2` (variable wght, latin, 22 KB, preloaded on the home page where the pacer
  timing is on the first screen). Both are Google Fonts' own latin files, unmodified (no re-instancing, so the Reserved
  Font Name "Source" question never comes up). `font-display: swap`.
- Retired 2026-10-15: Fraunces, Hanken Grotesk (files deleted), JetBrains Mono (never shipped on this site).
- Licensed upgrade worth a look: Louize Display (205TF), the face Icebreak uses, for the caps display only. Web licences
  are sold per family and traffic tier; check current pricing on 205tf.com before buying.
- Scale: 15 small, 17 body, 19 lede, 22 h3, 30 sub-display and prices, h2 caps clamp(26 to 40), display caps clamp(37 to 64)
  on desktop and clamp(34 to 58) for the stacked hero on phones.
- Caps run about 17% wider than the old mixed-case display, so: display and h2 sizes came down, the phone pattern row
  tightens under 400 px so it stays one line, and phones shorter than 720 px get a smaller dial so Begin and the App
  Store button both sit on the first screen (checked at 375x667 and 390x844, no overflow from 360 to 1440).

## Palette (Ground kit `night` theme, from the app itself)
Obsidian #1A110E ground, #231916 second ground, #2D1E17 card, Bone #E8DDD0 text (full ink for running copy),
Driftwood #A89585 for notes only (6.2:1 on the ground), Golden Hour #C4935A for the action and the rings,
Amber #D4A574 on dark text accents. Text on gold is Obsidian, never white. Gold is Collin's own color: allowed here
because GroundApp is his practice (ban list: gold only for Collin).

## Signature interaction
The breath pacer (`site/js/pacer-v3.js`), one timing engine used twice:
- Hero, "Breathe with me" (2026-10-15): the page's ONE 3D moment is a round figure on a cushion (`site/js/figure-v1.js`,
  mounted by `breath-figure-v1.js`, three.js 0.186.1 from the pinned import map; it replaced the web-3d `breath`
  shader rings, whose files are kept unused). The pacer's fill drives the belly (forward and warm on the inhale, drawn
  in past rest on the exhale), a round orb glows from inside the belly as it fills (emissive light plus a soft halo,
  Amber), fades back to bone on the way out and darkens a little when empty, one hand on the chest stays nearly still
  while the hand on the belly rides it, and the eyes close softly on a hold. Eyes follow the pointer; a tap on the figure starts the pacer. Patterns: Resonance
  (5.5 in, 5.5 out, the default; the app's name for 5.5/5.5, since the app's "Coherent Breathing" is 6/6) and Box
  (4 in, 4 hold, 4 out, 4 hold). The cue pill under the cushion shows the phase word and whole seconds; the step
  track under it lists every step with the current one filling. All of it is HTML except the figure. Posters
  `assets/posters/hero-figure-{1440,390}.webp` (12 KB / 11 KB). Reduced motion: one still frame (mid-inhale), words,
  count and track still run. Kit: `~/.claude/skills/studio-site-design/kits/breath-figure/`.
- Feelings wheel: after the third tap the segments fold away and the wheel becomes a pacer in place (Begin and the
  count in its center), loaded with the breath the app starts with for that feeling; the plan line sits beside it
  on desktop and right under it on phones. Mapping from GroundApp 1.1.1's rule-based check-in plan
  (`CheckInViewModel.buildFallbackPrescription` + `FeelingWheel.polyvagalState`): Anxious and Angry start with
  Physiological Sigh (2 in, 1 more in, 6 out), Sad and Numb with Deep Slow Breathing (6/6), Calm and Energized with
  Resonance Breathing (5.5/5.5). Aura (AI check-in), when on, may pick differently.
Sound: nothing plays until the visitor turns it on; the binaural tone swells with the inhale.

## Motion budget (motion.md)
1. Signature: the pacer (the hero figure + the feelings pacer, one engine).
2. One hero entrance: the headline halves part outward like an exhale while the figure arrives (950 ms, expo-out).
3. Scroll moment: "How it works" pins the phone while three short steps pass (shortened in round 2).
4. Scroll moment: the closing rings open once as the last section arrives (CSS scroll-driven, static fallback).
Everything else is still. Zero reveal classes. Reduced motion: no entrance, no idle loops, figure still frame,
closing rings static; count and words still run. Verified 0 running animations at rest.

## Signup card (replaces the popup)
Dropped in round 3. Every placement either covered content or flashed open and shut between the FAQ and the
inline form. The ask is the inline form at the close ("Keep Me Updated", source "inline", posting to
`/api/subscribe` exactly as before). Its button is secondary (Bone on #2D1E17): the App Store button is the only
gold fill on the closing screen. On phones the "Get the app" bar hides while the feelings demo is on screen, and the
header "Download" pill hides while the bar shows.

## Imagery
- Order: breathe (hero) > name it (feelings demo) > meet the coach (class band) > how it works > inside > wearables > reviews > pricing > FAQ > close.
- Class band: a 6.65 s muted loop (`site/img/class/class-breath-loop-v1.mp4/.webm`, 579 / 363 KB, poster 42 KB) from
  `ga_breathe_15.mp4` 2.95 to 9.6 s (client breathing with hands on chest and belly, Collin over the group), plays only
  in view, paused under reduced motion. Five stills picked by sharpness (Laplacian variance) from gym_30, ga_breathe_15,
  sauna_30 and gym_15, 1080 px wide (the renders' native width; 1200+ needs the raw Fuji clips on the Seagate).
- Device photos: Oura cropped to its object so all three products show at the same height. Source and license of the
  three device photos are not recorded anywhere (open question for Collin).
- App screens (3), device shots (3) already in the repo.

## Ban exceptions
- None for type. Source Serif 4 is not on the AI-default list; the mono face is limited to data (see Type).

## Grid
Three edges at 1440: 56 (page margin), 156 (content column) and 732 (second column, col 7 of 12). Section heads sit
on 156, their reading text or lists on 732. Gold is only for the rings, Begin and the App Store buttons.

## Project-specific bans
- No italic or gold word inside any headline. No tracked caps labels above headings. No icon-card grids.
- No mono labels or kickers. Source Code Pro is for data only (counts, timings, prices, durations).
- Breath-paced motion belongs to Ground only; never copy the pacer to collinchartier.com or client sites.
- App facts only from the fact sheet in memory (`project_groundapp_website_audit_2026-10-02`). No Aura, no trial,
  no WHOOP, no programs. Rating text must match the live App Store (5.0 from 11 ratings on 2026-10-14).

## Checker WARN/FAIL left on purpose (check-tells.py)
- italic-accent-word + heading-em-css: `terms.html`, `privacy.html` only. Those pages are on the do-not-touch list for
  this preview; fix them in a follow-up once Collin approves (their privacy copy is legal text).
- stock-copy ("game changer"): two verbatim customer quotes (App Store review by okh78, class testimonial by Tyler B.).
  Verbatim quotes are exempt.
- Inspector `mono` on atlas pages: practice durations in the "other practices" list are data (see Type). The atlas pages
  were not redesigned; their other inspector findings predate this preview.
- glassmorphism: blog, terms and privacy pages (untouched here). middot-meta: admin dashboard (untouched).
- Inspector `few-pictures`: 7 real raster images plus the figure; the inspector skips lazy images and data-ui phones.
  `no-footage`: owned Traverse footage exists; a loop is Collin's call (see Imagery). The figure is the moving picture.
- web-3d: `verify-webgl.mjs check` (served without the analytics beacon) PASS at 390; at 1440 one FAIL on purpose,
  "canvas covers h1": the h1 box spans the row and its centre sample lands in the empty gap between the two halves,
  where the figure stands. The words themselves never touch the canvas (measured 2026-10-15 at 1000 to 1920 px wide,
  closest 7 px at 1024). The old rings passed only because the Begin circle sat on that point. `check-3d-budget.py` PASS.
