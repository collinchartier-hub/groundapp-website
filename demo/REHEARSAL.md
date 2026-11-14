# The demos: rehearsal record (2026-11-13)

Built with the `stageshow` skill (v1.1.1) under `studio-site-design`. Status: preview, not approved.
Two demos share one build: the check-in phone (`src/checkin`) and the Apple Watch (`src/watch`).

# 1. The check-in phone

## What it is
A phone playing GroundApp 1.4.2's check-in as one loop of about 21 seconds: Check in on Home, Anxious, Worried,
Nervous, strength 6 and medium energy, Continue, "Bodie is coming up with your plan", the 4-minute plan, Begin session,
one Physiological sigh with Bodie, then the player's X back to Home. Bodie is the site's own live figure
(`/js/bodie-v3.js`), one canvas that moves between his places.

## Gold copied
`examples/phone-touch`: the stage, the kit's `Phone`, the touch dot, a flow told as one object, a loop put back by the
app's own control. Changed: the look (Ground Brand Kit v5 night tokens), the content (the app's own screens and words),
a live 3D figure in place of the card that opens, and the whole phone in view instead of a cropped one (`unframed`,
see DESIGN.md `demo-whole-phone`).

## Where the words come from
Every string is in `data.ts` with the app source file it was read from (`release/1.4.2`). Two things were corrected
against the site's older recording while building: 1.4.2 says Continue and goes straight to the plan (the recording's
"Save check-in" and "Build my guided session" screen now shows only for a crisis check-in), and the sigh is 2 in, 1 more
in, 3 out, which makes its part 48s (the recording says 1m 12s).

Left out on purpose (simplified, not invented): the technique ratio on Home's wheel, the count beside "Breathe in" on
Home, the title pill in the player, the session's spoken intro.

## How it was checked
From a copy of the skill with its dev dependencies (`/tmp/...`, see the studio skill), Chrome through the studio wrapper:

```bash
# a bare page holding only the demo in a 358px column, so the film reads one stage
# (the kit's film.mjs cannot crop the long landing page)
node scripts/film.mjs "http://127.0.0.1:<port>/" --width 1440 --every 1050 --count 20 --gate
node scripts/film.mjs "http://127.0.0.1:<port>/" --width 390 --every 1050 --count 20 --gate
```

- `film.mjs` runs Chrome without a GPU, so in its frames Bodie is his still image. The live figure was checked with
  separate screenshots of the real landing page at 1440 and 390 on the GPU (WebGL reported live).
- Fixed from the film: icons on half pixels, text hopping after a press, "Back" touching its chevron, the cloud's puffs
  too close, the line in Bodie's cloud cut while it changed, the phone 3px off centre, a blank beat while Bodie travelled.

## Gate lines left, and why
The gate does not end "rehearsal passed". What it still prints:

| Line | Why it stays |
|---|---|
| `kit override` (6, all on `.ss-phone...`) | False alarm. They are the kit's own phone rules: the build puts the kit's CSS and ours in one file, and the check tells them apart by file path. Our CSS does not restyle the kit's phone. |
| `uneven padding: div.gad-tabs` | The app's tab bar: icon over label in a pill. Drawn as the app draws it. |
| `uneven padding: span.gad-en` | The app's Low, Medium, High tiles: icon over label, wider than tall. Same. |
| `empty pane` (the first question, the wait) | The app's first question really is six answers over an empty lower half, and the wait is one line over Bodie. Each is on screen for under two seconds. Filling them would be inventing UI. |
| `film: inconclusive` | Sampling gaps in headless Chrome. The skill's own `hero-demo` reports the same. |

## Not checked
- On a real iPhone, in Safari, in Low Power Mode. Only desktop Chrome and Chrome at 390 wide.
- `ios-sim.sh`, `phone-parity.mjs`, `motion-frames.mjs` and the `site-critic` (studio stage 6). Not run this round.
- Playback watched live by a person. Judged from stills and the film's motion report only.
- The guided player's exact look in 1.4.2 (read from code, not seen on a device).
- A fresh-eye review (the skill's `references/review.md`).

# 2. The Apple Watch

## What it is
One Apple Watch in place of the row of five watch screenshots. It runs a whole Box breathing session as the watch
app does: Bodie, live, breathes 4 in, 4 hold with his eyes closed, 4 out, 4 hold; the word and the count change
with him; "Cycle 1 of 4" counts up; the ring fills. After cycle 4 the screen dips and a new session starts. 64 seconds.

## Gold copied
`examples/payout-flow` for a story the system tells by itself: no cursor, nothing pressed. The kit has no watch, so the
case, crown, button and band are drawn here (DESIGN.md `watch-case`).

## Where the words come from
The head of `src/watch/index.tsx` lists the watch app's source files (`release/1.4.2`). Sizes, positions and colours
of the screen were measured on the app's own screenshot (`site/media/v3/watch/02-...-416.webp`), which is also the
still shown before the live watch arrives.

Left out on purpose: the screen the app shows before a session (Start) and after it (Complete, with Done). Neither
could be checked against a screenshot, so the loop joins one session to the next with a dip of the screen instead.

## How it was checked
The same way as the phone (a bare page, `film.mjs --gate` with `--every 3300 --count 20` to cover the 64 seconds),
plus the real page on the GPU: stills through a cycle, reduced motion, the hero's pause button, and the join between
one session and the next.

## Gate lines left, and why
| Line | Why it stays |
|---|---|
| `kit override` (6, all on `.ss-phone...`) | The same false alarm as on the phone: the kit's own phone rules sit in the shared built file. The watch uses no kit phone. |
| `shrunk, not laid out for the phone` (at 390) | On a phone the watch is drawn at 300 wide, the same watch at 0.83. Its smallest words are still 13px. A second layout would be the same picture. |
| `film: inconclusive` | Sampling gaps in headless Chrome, as on the phone. |

## Not checked
- On a real iPhone or in Safari. A third live Bodie on one page (hero, phone, watch) was only run on this laptop.
- Against a real watch. The session screen matches the app's screenshot; the case is a plain drawing, not a product photo.
- Playback watched live by a person.

# 3. Independent review (2026-11-13)

Three reviewers who did not build the demos: two design jurors following the studio's site-critic method (one on this
branch, one on `origin/main` as the baseline, neither told about the other) and a code review by a different model family.

| | origin/main | this branch |
|---|---|---|
| Verdict | FIX | FIX |
| Overall | 6.6 (usability capped at 5) | 6.0 (7.2 before the cap for inspector FAILs) |
| Check-in section | 7.0 | 6.5 |
| Connections section | 6.5 | 5.5 |

The two jurors did not apply the caps the same way (the baseline was capped for the phone's pause button, which both
pages have), so the overall numbers are not a clean before and after. The section scores are the fairer comparison.

What the branch juror said about the demos: the check-in demo is "the best product shot on the page", but its section
now has two live Bodies, two phone styles and copy that describes the old flow; the watch stands alone beside a
two-line caption with an empty half screen.

Fixed after the review (commit after `0fb09a9`):
- The four inspector FAILs that caused the cap: the demo slots now carry `data-ui`, the demo phone's shadow is gone,
  the gradients have their Choices line.
- Code review: the demos keep their description for screen readers once live; the page's pause can no longer be
  undone by a change of the system's reduced-motion setting; the watch's count and Bodie start together again after
  the stage leaves the screen or the pause is lifted; a pause during mounting is no longer missed; the built CSS is
  written out flat and the demos load only where the kit's CSS works; the bundled licences ship beside the script.

Open, for Collin:
- Check-in: one Bodie or two, one phone style or two, and the copy and screenshot that still describe 1.2.1.
- Connections: the watch needs company or a smaller place (the juror suggests setting it beside the health screens).
- Low Power Mode: the page learns about it from the first recording that refuses to play. That used to be the check-in
  recording; it is now the Advanced one, so the check-in demo can play before the page goes still. Not tested on a phone.
- The deploy check does not notice a demo that was edited without being rebuilt.
- Not from these changes, found by both jurors: on a 390px phone the hero's pause button hangs off the right edge and
  widens the page by 10px.

# 4. Round 2 (2026-11-13)

The open items above, worked through from the two jurors' FIX lines. Nothing here is live.

- Check-in: one phone and one Bodie. The page's Bodie has no slot in this section, the 1.2.1 session screenshot (05)
  is gone, and the words follow the 1.4.2 release notes (Continue, Bodie shows the plan first, Begin session).
- Connections: one row of three, each with its words under it: the health recording, the progress screen, the watch.
  The watch is no longer alone on a row. The health recording is recut to 14 s (`ch07-health-v2`): it starts on Health
  and devices and stops before the screen that names Aura. Screenshot 10, which named Aura, is gone.
- Phone hero: the pause button sits inside Bodie's corner. The page is 390px wide on a 390px screen (it was 400).
- Collin: the IRONMAN photo and the film are one band at one height; the bio and the film's words sit under them.
- FAQ: heading on top, two stacks. The half-empty screen beside a pinned heading is gone.
- Facts, from the live 1.4.2 listing: 12 ratings, Premium yearly or monthly, Bodie's AI plans and Meditations in the
  Premium list. "Three reviews, word for word." became "From three App Store reviews." (two quotes are excerpts).
- Smaller: the Advanced phone is 340px (was 300), the CO2 rounds are filled by mid-screen, "O2 and CO2 tables." stays
  on one line, the footer links fit one line, and DESIGN.md has its line for the fourth moving picture.

Left as it is, on purpose: the newsletter row under Download (minor in both reports).

Open, for Collin:
- Every new line of copy above needs his read (`docs/site-v3/copy.md`, last section).
- The intro film's transcript still says "less anxious and have less panic attacks". Both jurors call it an outcome
  promise. It is his own spoken line, so it is his to approve or recut.
- Low Power Mode, the deploy check and a real iPhone: unchanged from part 3.
