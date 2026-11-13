# Check-in demo: rehearsal record (round 1, 2026-11-13)

Built with the `stageshow` skill (v1.1.1) under `studio-site-design`. Status: preview, not approved.

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
