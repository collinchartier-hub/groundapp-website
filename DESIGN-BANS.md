# Studio defaults to question (formerly the ban list)

Copy this file into every site repo as `DESIGN-BANS.md` and point the repo's CLAUDE.md at it. The file name stays
for older repos; the rule changed on 2026-10-15 (Collin: "We don't want to ban everything. Apply each scenario
appropriately when it comes up.").

## How this works now
- **Nothing in the taste sections below is forbidden.** Each item is a move that shows up on generic, templated
  sites. Using it out of habit is the problem, not the move itself. When the scenario calls for it, use it.
- **Write one line why** in the site's DESIGN.md under `## Choices` ("- gradient-text: the gradient is the
  titanium finish of the product"). The older heading `## Ban exceptions` still works. `check-tells.py` lists each
  item it finds as a WARN, and as OK once a reason is written.
- **A good reason names the scenario**: the client's world, the product, the audience, the job the page does.
  "It looks premium" or "the tool suggested it" is not a reason.
- The `site-critic` judges whether the reason holds. Stacking many of these on one page is still the fastest way
  to look like every other site, so pick the ones the scenario needs.

## Hard rules (always, no reason can lift them)
These are about being right, not about taste.
- **Copy:** no em dashes (Collin's rule). No buzzwords: "transform your", "unlock", "elevate", "seamless",
  "supercharge", "next level". Every fact traces to the client's site or the client. No invented stats, outcome or
  health claims, testimonials, names or coverage. Verbatim customer quotes are exempt.
- **Collin's sites:** GroundApp, Running Home, "the Herren Project" (lowercase "the"), 79 days, never the Phoenix.
- **Licenses:** fonts only with a confirmed license (Google Fonts, OFL, Fontshare free, or bought); never trial
  files. Images: CC0 / public domain first, CC BY with credit; no BY-SA or NC on client or commercial sites.
  Never another company's code, copy, photos, footage, 3D models or fonts (studies take the method only).
- **Real people and places stay real:** stock or AI images never pose as the business, its place, its people
  or its results. Open-collection and AI art are fine as texture, atmosphere or artwork with the credit recorded.
- **Accessibility:** `prefers-reduced-motion` shows the finished page (`motion.md` §5); content is never hidden
  until a script runs without a fallback; text contrast meets WCAG AA.
- **Collin's own calls:** Fraunces is out ("the weird F that's squiggly"), on every site including the Ground kit,
  until Collin brings it back. Only Collin can lift this one.

## Defaults to question: our own house tells (all 5 audited sites, 2026-10-14)
- Serif headline with one word in italic or accent colour ("Find your *calm.*"). Fits when the stressed word is
  genuinely the point and the brand's voice stresses words that way; not as a formula on every heading.
- Short rule plus tracked caps label above every heading. Fits on dense reference pages where labels navigate.
- One fade-up snippet copied onto every section. Fits on long product pages of many short lockups, where the
  reveal paces reading (Apple's StaggeredFadeIn, see `studies/apple-iphone-pro.md`); keep it short and quiet.
- Gold as the accent for anyone who is not Collin. Fits when gold is the client's own material or brand colour;
  a client whose logo is gold keeps it in its real colours.
- Fixed section order: hero, proof, story, cards, reviews, FAQ, form. Fits when that really is the order a buyer
  needs; usually the content suggests a better one.
- Filled + outline pill button pair under the hero. Fits when there are two real, equal next steps.
- Three-number stats row. Fits when the numbers are real, measured and the reason to buy (product specs, before
  and after, a comparison), as on Apple's product pages.
- The same newsletter popup opening over the hero. Fits almost never on first view; a timed or exit prompt can.

## Defaults to question: second wave (Anthropic frontend-design, Sept 2026)
- Warm cream background (#F4F1EA family) + high-contrast serif + terracotta/clay accent (#D97757 family). Fits
  when the client's world is that palette (a clay studio, a terracotta tile maker), never as a default "warm".
- Near-black with one acid-green or vermilion accent ("dark signal"). Fits dev tools, sport and night brands
  whose product or kit carries that colour.
- Broadsheet cosplay: hairline rules, zero radius, dense newspaper columns. Fits publishers, reports, archives.
- SaaS card kit: identical rounded cards with the same soft shadow. Fits app UI and dashboards.
- Template chrome: caps eyebrows, A · B · C meta strings, "WORD / fragment" labels, mono labels for non-data,
  arrows appended to links. Fits when the label carries real information.
- 01 / 02 / 03 numbering. Fits a real sequence (steps, chapters, a program's weeks).

## Defaults to question: first wave (still common)
- Inter, Roboto, Arial or system fonts as the brand face. Fits UI-heavy products and when the client's brand
  already uses them.
- Purple or indigo gradients, gradient text, glassmorphism. Gradient text fits when the gradient comes from the
  product's own finish or light (Apple's titanium headlines); glass fits when there is real content behind it.
- Centered hero + pill badge + two buttons + logo row + 3 icon cards + pricing. Fits a SaaS launch page whose
  buyers expect exactly that scan.
- Emoji or generic line icons standing in for real imagery. Fits playful consumer brands and UI hints.
- Count-up stat counters, bounce easing. Count-ups fit live or changing numbers; bounce fits playful brands and
  physical gestures (a drag released, a toy).

## Motion
`motion.md` §4 lists the motion defaults to question (same rule: use when the scenario fits, write why).
Values still come from `motion-tokens.css`, plus up to two named curves of a site's own.

## Fonts that usually need a reason
Cormorant, Playfair Display, Instrument Serif, DM Serif, Space Grotesk, Inter, Satoshi, General Sans,
Cabinet Grotesk, Geist. Added 2026-10-15 from the type research: JetBrains Mono, Fira Code, Crimson Pro, IBM Plex,
Source Sans 3, Bricolage Grotesque, Newsreader, Plus Jakarta Sans, Hanken Grotesk, Switzer, Clash Display,
Manrope, DM Sans, Sora, Montserrat, Poppins; the AI labs' own faces (Anthropic Sans/Serif/Mono, Tiempos, Styrene,
Söhne, Signifier, OpenAI Sans); soft or ball-ended serifs (Recoleta, Ogg, Gambarino, Young Serif, Gloock, Gilda
Display). These are what every AI-built site reaches for now. Collin's taste (2026-10-15): authentic, minimal type
from real foundries, no quirky signature glyphs; check f, g, a, y, R, G at display size before choosing.

## Build
- three.js from `https://cdn.jsdelivr.net/npm/three@<pinned>/+esm` (190 KB gz), never `build/three.module.min.js`,
  which pulls the unminified core (378 KB gz). Details in the `web-3d` skill.
