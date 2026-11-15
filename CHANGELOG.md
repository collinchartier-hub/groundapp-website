## SEO and AEO metadata pass: November 15, 2026

- Updated unique titles, descriptions and social previews across indexable pages without changing their visible wording or design.
- Connected the homepage app, organization, Collin Chartier and visible FAQ through JSON-LD IDs. Published US Premium prices in the app graph match the pricing section; no universal trial or rating is asserted.
- Linked Atlas pages, policies, blog articles and the browser game back to those site entities. Article publication and modification dates come from post front matter.
- Updated the sitemap for the pages changed on November 15 and refreshed `llms.txt`. Partner pages and the waiting room retain noindex.
- Regenerate `site/blog/` with `python3 scripts/build_blog.py` and `site/play.html` with `python3 game/build.py` before review. Both commands also touch other generated assets; the publishing owner handles regeneration and verification.

# Private brand alignment preview: November 14, 2026

Owner authorized a complete updated local preview, not publication. Sole worktree: `/Users/collinchartier/dev/brand-preview-groundapp-20261114`. Static root: `site/`; parent serves port 4193 and injects `/__preview/guard.js`. No commits, pushes, deployment, live signup, redemption, payment, account deletion or external service tests ran.

## Resumed review pass

- Removed the vehicle-use testimonial without altering the two retained published quotes.
- Replaced the prescribed CO2 hold/rest chart with a plain product explanation and removed its obsolete animation styles.
- Changed Atlas headings from Unlock to Open and the Premium CTA to See Premium in the App Store.
- Removed comeback framing, unsupported native-store names and a reader-facing internal claims-ledger sentence.
- Matched llms.txt accessibility wording to the current statement: a design aim, not certified conformance.
- Existing audio, product footage, consent mechanisms, terms and prices remain unchanged. Blog source changes require regeneration before review.
- Waiting-room safety and controls no longer fade during entrance; both phone heading spans are centred.
- Atlas optional-notes controls now have a native 24px checkbox and at least a 44px label row.
- Parent runtime proof covers native audio, optional rhythm start/stop and the finger-control game. Isolated iPhone 17 Pro Safari screenshots visibly confirm Bodie in Library, Play and Download; earlier shared-simulator and DOM-only records are superseded, not treated as pixel proof.

## Build handoff

Run from this worktree, in this order:

```sh
cd /Users/collinchartier/dev/brand-preview-groundapp-20261114
python3 scripts/build_blog.py
python3 game/build.py
```

The blog requires the existing `markdown` Python package (repo deploy dependency: `markdown==3.9`). The game build requires Node for its built-in syntax checks. Parent owns both builds and all tests/browser checks. Neither build was run by this worker. No demo build is needed: `demo/` and its owned app/watch bundles were preserved unchanged.

The blog build updates the index and five article HTML files plus generated redirects. The game build updates `site/play.html`, `site/js/bodie-run-v3.js`, and `site/assets/css/bodie-run-v3.css`, removing the obsolete public v2 bundles. Do not serve stale generated blog/game outputs as the completed preview before these commands run.

## Exact assigned route map

IDs follow the order of `groundapp-page-plan.json`. Each URL below is rooted at `https://groundapp.live`; the private preview uses the same paths on port 4193.

| ID | Route | Source and action |
|---|---|---|
| GA01 | `/` | `site/index.html`, `site/js/home-v8.js`: conservative metadata/JSON-LD/pricing/FAQ, product before creator, distinct service exit, sample-data labels, AI voice disclosure, retained Bodie/app/watch/media, edited founder playback, finger-only game promotion, preview-aware newsletter |
| GA02 | `/blog/` | `scripts/build_blog.py`: regenerate matching cards/summaries from article front matter, education scope, count-free product CTA, preview-aware newsletter and analytics |
| GA03 | `/blog/why-i-built-groundapp/` | `content/posts/01-why-i-built-groundapp.md`: first-person between-session context, no claimed client outcomes/competitor dismissal, local versus optional AI distinction, no unverified Instant Calm/offline promise |
| GA04 | `/blog/nervous-system-regulation-explained/` | `content/posts/02-nervous-system-regulation-explained.md`: no diagnosis from feelings, gas/brake described as metaphor, modest sourced stress wording, no fast-breath/hold protocol, near-context stopping guidance |
| GA05 | `/blog/science-of-breathwork/` | `content/posts/03-science-of-breathwork.md`: study-specific findings/limits, no manual override/switch, no HRV resilience score or CO2/panic treatment, technique comparison without promised outcomes |
| GA06 | `/blog/future-of-breathwork-tech/` | `content/posts/04-future-of-breathwork-tech.md`: respectful tool comparisons, present product versus opinion separated, AI voice/privacy explained, no unsupported store/capability claims |
| GA07 | `/blog/breathing-techniques-for-anxiety/` | `content/posts/05-breathing-techniques-for-anxiety.md`: calibrated title, five pattern descriptions not prescriptions, no fastest reset/panic promise or required dose, comfort/stop scope adjacent |
| GA08 | `/atlas/coherence/` | `site/atlas/coherence/index.html`, `site/js/atlas-access-v1.js`: removed unverified cadence/duration/HRV metadata promises, explicit transcript arithmetic/claims limitation, existing audio/transcript preserved, separately optional notes and review-only preview playback |
| GA09 | `/atlas/three-part-breath/` | `site/atlas/three-part-breath/index.html`, shared Atlas script: comfortable description, no required baseline claim, no unverified page duration, existing recording/transcript with limits, same optional consent and keyboard/native playback |
| GA10 | `/atlas/alternate-nostril/` | `site/atlas/alternate-nostril/index.html`, shared Atlas script: comfortable practice framing, no forced airflow, no unverified duration, existing recording/transcript, consistent optional consent and controls |
| GA11 | `/privacy` | `site/privacy.html`: substantive data/retention/platform disclosures preserved, Android not treated as launch evidence, website marketing versus health separated, actual proposed Atlas consent flow and preview limits described |
| GA12 | `/terms` | `site/terms.html`: existing legal structure/effective date preserved, published prices presented consistently, store confirms inclusions and eligible trial, no universal trial or compliance certification |
| GA13 | `/delete-account` | `site/delete-account.html`: iPhone/Apple Watch product scope, applicable Android disclosures retained without launch claim, published paths/timelines identified as existing commitments, email fallback and separate subscription cancellation retained |
| GA14 | `/support` | `site/support.html`: no unapproved two-day SLA, restore/offer guidance with fallback and store terms, correct platform/sync distinctions, live contact exit preserved for parent review guard |
| GA15 | `/accessibility` | `site/accessibility.html`: no every-page/axe pass claim, website/game/native-app scope separated, exact unperformed keyboard/AT/zoom/current-route review limits, motion/audio/transcript limitations and contact route |
| GA16 | `/legal-notice` | `site/legal-notice.html`: existing public provider/address/contact/jurisdiction content retained, explicit owner/legal confirmation limit, no private configuration exposed |
| GA17 | `/play` | `game/src/1-page.html`, `2-core.js`, `4-race.js`, `5-modes.js`, `6-app.js`, `game/build.py`: preserve actual cast/courses/market/looks, replace breath controls/cues/speech with finger shield/gust/glide, remove maximal-hold mode and underwater generation, noncompetitive ribbon ride, new game-record namespace, Ground typography, pause/touch/keyboard and preview database gating |
| GA18 | `/masterclass-waiting-room/` | `site/masterclass-waiting-room/index.html`, `site/js/event-status-v1.js`: accurate unscheduled default, owner-maintained waiting/live/ended record, no daily 6pm guess or indefinite starts-soon, no automatic hold/count, optional user-started no-hold rhythm, sound off, pause and skip; existing noindex/nofollow retained |
| Extra | `/404.html` and missing routes | `site/404.html`: retained Ground circle and pause, decorative rather than breath instruction, clear home/blog/support exits, noindex retained |

Cross-surface source: `site/js/preview-mode-v1.js`, `site/js/site-analytics-v1.js`, `site/llms.txt`, `DESIGN.md`, `CLAUDE.md`, `AGENTS.md`, and `game/README.md`.

## Preview isolation and real controls

Explicit detection is an injected `/__preview/guard.js` script, `window.__BRAND_PREVIEW__` true/1, or `<meta name="brand-preview" content="1">`. Mode is never guessed from an ordinary customer hostname. The source skips the production beacon, newsletter/Atlas POSTs and artifact database initialization/writes while detected. Parent guard also blocks live methods, tracking and outgoing handoffs. No production backend or partner/admin implementation was removed or exposed.

Newsletter forms locally validate then state that nothing was sent; they do not hide into a fabricated success. Atlas has a separately named review-playback button that opens existing local media without sending or saving access/subscription state. Outside preview, the existing local browser access gate remains; an unchecked optional-notes choice opens it without a mailing-list request, while opting in uses the real subscription endpoint. Copy explicitly says this is not email verification, an app account or a paid entitlement.

Game buttons remain real native buttons. Pointer cancellation and keyboard release clear inputs; P/Pause, blur and hidden tabs pause a run. Sound and voice start off. Maximal-hold history is neither imported nor displayed: new keys are `bodie-controls-v1` and `bodie-controls-ghost-*`. Old physical records are untouched in browser storage but no longer loaded. Production artifact game-point database behavior remains behind its own non-preview path.

## Claims ledger

The dated product-facts record is in `DESIGN.md`. It governs the hero, body, pricing, FAQ, metadata, blog CTA, Atlas CTA and machine-readable `llms.txt`; no fixed technique/free-access count remains in proposed copy.

| Claim used | Evidence and boundary |
|---|---|
| Breathwork associated with lower self-reported stress versus controls | Fincham et al. 2023, https://www.nature.com/articles/s41598-022-27247-y . Most stress studies had moderate risk of bias; not a treatment or app outcome claim. |
| Daily five-minute study over one month; cyclic sighing associated with greater positive-affect improvement and respiratory-rate reduction versus mindfulness | Balban et al. 2023, https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947/ . Groups did not differ in state-anxiety change; no significant trait-anxiety change. Not a one-breath reset or GroundApp trial. |
| Slow breathing and HRV are research topics, not universal diagnostic or resilience scores | Study-specific limits; no numerical efficacy claim introduced. Laborde DOI 10.1016/j.neubiorev.2022.104711 resolved only metadata, so no new efficacy statement was derived from it. |
| Patterns differ in shape | Descriptive only: no best-for ranking, guaranteed result, optimal dose, required hold or CO2/panic treatment. |
| Health/app outcome claims | No claim that GroundApp diagnoses, treats, cures or prevents a condition, or that a sample progress chart is a participant result. |

## Recording and publication facts needing confirmation

- Coherence's existing transcript says six seconds in/six out, five breaths per minute, but calls 30 cycles ten minutes. At that stated cadence 30 cycles would be six minutes. It also contains unsupported synchronization, HRV-peak and baseline language. New page/metadata does not assert a verified cadence, length or those outcomes; recording/transcript are retained with an explicit adjacent limitation. Full recording review is still needed before publication. The other two Atlas recordings likewise retain their original transcripts without pretending a new audio review occurred; unverified page-length badges were removed.
- Founder film playback omits 117–149.76 seconds using existing VTT source timestamps. The transcript marks that omission. The owned original file remains intact. Final exported media/captions and playback need parent verification; there is no claim a new source recording was made.
- Exact store release, OS requirements, free/Premium inclusions, native watch-store status and trial eligibility require product-owner/store reconciliation before publication. Conservative omissions are deliberate, not fabricated facts.
- Existing deletion paths, thirty-day commitments, processors/retention, legal provider details and tax/jurisdiction wording remain existing published disclosures, not newly verified legal facts. No live or disposable staging account was used.
- Waiting-room state defaults to unscheduled because there is no confirmed event date. Owner can maintain `event-status-v1.js` with a state or valid ISO start/end timestamps. No date, live state or new cohort was invented.
- No clinical, mode-specific qualified safety approval, accessibility conformance, current-route pass score, visual jury verdict or owner approval of the finished artifact is claimed.

## Source and identity preservation

Base supplied by parent: 347f13a, the newer Stageshow source rather than a stale main checkout. Demos, films, app screenshots, Bodie/cast models and licensed Ground fonts remain. The main source discrepancy is treated conservatively: app-source demos show a particular recorded interface, not proof of the shipping release. No partner codes, subscriber data, admin data, secrets, account details or configuration were opened or copied into public output.

Worker model family: OpenAI Codex (GPT-6.1). Builds/tests/lints/formatters/screenshots/browser checks intentionally not run; parent verifies once after all source edits land.

## Athlete-led alignment (2026-11-15)

- Reordered the GroundApp homepage so pricing follows connections and the creator follows pricing. Header and menu show App, Pricing, Creator (`/#story`), then Play where present.
- Merged the Collin and Story bands into one short "Created by Collin Chartier." section. Removed the finish photograph, credentials and press list, Running Home photo and long personal narrative from the homepage. Kept the user-played intro film, its edited playback/captions and its full walkthrough transcript, with two exits to the creator article and Collin's personal story.
- Moved Bodie's creator slot into `#story` as `data-slot="story"`. The existing single-canvas flight follows the new hero, library, play, story, download DOM order; flight safety, reduced motion and fallback are preserved.
- Replaced the retired coaching link in Download with the breathwork sessions page on collinchartier.com and updated `site/llms.txt` to describe the new homepage without a credentials list. No `content/` files changed, so this slice does not itself require regenerating the blog.
- Retained prices, feature copy, customer quotes, device and safety wording, metadata, form behavior, playback source and outgoing App Store destinations. No builds, tests, browser checks or publication were run by this worker. The parent verifies the private preview.
- Visual review: removed the internal edit note beneath the film, keeping its cut record in `DESIGN.md`, its playback skip and the bracketed transcript disclosure. Grouped film, Bodie, caption and sound note on the right at desktop; placed the Watch my intro button and collapsed transcript below the two links on the left. Phone keeps creator note, film beside Bodie, control and transcript in that order.
