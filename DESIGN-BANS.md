# Studio ban list

Copy this file into every site repo as `DESIGN-BANS.md` and point the repo's CLAUDE.md at it.
`check-tells.py` catches most of these mechanically. The rest need eyes on a screenshot.

A ban can be lifted for one project only with a written reason in that project's DESIGN.md
("We use Fraunces because..."). "It looks premium" is not a reason. A reason names the client's world.

## Our own house tells (found on all 5 audited sites, 2026-10-14)

- Serif headline with one word in italic or accent color ("Find your *calm.*"). Zero allowed.
- Short rule plus tracked-out caps label above every heading.
- One fade-up snippet copied onto every section. Motion must have a reason per element.
- Gold as the accent for anyone who is not Collin.
- Fixed section order: hero, proof, story, cards, reviews, FAQ, form. Order comes from the content.
- Filled + outline pill button pair under every hero.
- Three-number stats row ("2,000 / 27 / 5.0").
- The same newsletter popup on every site, opening over the hero.

## Second wave (Anthropic frontend-design, Sept 2026)

- Warm cream background (#F4F1EA family) + high-contrast serif + terracotta/clay accent (#D97757 family).
- Near-black with one acid-green or vermilion accent ("dark signal").
- Broadsheet cosplay: hairline rules, zero radius, dense newspaper columns, for a business that is not a newspaper.
- SaaS card kit: identical rounded cards with the same soft shadow.
- Template chrome: caps eyebrows, A · B · C meta strings, "WORD / fragment" labels, mono labels for non-data, arrows appended to links.
- 01 / 02 / 03 numbering on things that are not a sequence.

## First wave (still common)

- Inter, Roboto, Arial or system fonts as the brand face.
- Purple or indigo gradients, gradient text, glassmorphism with no reason.
- Centered hero + pill badge + two buttons + logo row + 3 icon cards + pricing.
- Emoji or generic line icons standing in for real imagery.
- Count-up stat counters, bounce easing.

## Imagery

- Stock or placeholder photos (picsum.photos, generic Unsplash) never ship. People and proof stay real.
- Open-collection art (CC0 / public domain via `assets.mjs`) is allowed as texture or artwork with the credit
  recorded, never posing as the business, its place or its people.
- AI-generated imagery: texture, atmosphere, abstract art only. Never fake people, places or results.
- Breath-paced motion belongs to Ground, GROUNDED and GroundApp only (see `motion.md`).

## Copy

- No em dashes (Collin's rule, all copy).
- No "transform your", "unlock", "elevate", "seamless", "supercharge", "next level", made-up metrics.
- Every fact traces to the client's site or the client. No outcome or health claims. Verbatim customer quotes are exempt.
- Collin's sites: GroundApp, Running Home, "the Herren Project" (lowercase "the"), 79 days, never the Phoenix.

## Fonts that need a written reason

Fraunces, Cormorant, Playfair Display, Instrument Serif, DM Serif, Space Grotesk, Inter, Satoshi, General Sans,
Cabinet Grotesk, Geist. These are what every AI-built site reaches for now, including the taste skills' defaults.
