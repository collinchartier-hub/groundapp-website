# groundapp.live/aion: second partner page, design note

Date: 2026-11-13. Owner: Collin Chartier. Branch `aion`. This builds on `2026-11-13-arsenal-partner-page-design.md`; everything not said here is as in that spec.

This repo is public. No codes, member data or contact details here.

## Request

Collin, 2026-11-13, after the Arsenal page went live: "please do the same for AION and pull a fresh 500 codes for 1 year free." AION is aiontraining.co (Instagram @aiontraining__), a hybrid training club in Greenwood Village, Colorado.

## What "the same" means here

| Topic | Decision |
|---|---|
| Page | `groundapp.live/aion`, same structure as `/arsenal`: hero with Bodie, form directly under it with the steps and fine print, Collin's letter, the partner's section, What you get, Reviews, closing band. Not indexed |
| Look | AION's ground wears AION's look, measured from aiontraining.co: black `#000` and off-white `#F8F7F5`, no accent colour, Helvetica Neue 700 to 800 uppercase headlines, Inter body, Courier New mono labels in brackets (`[ 01 / CLAIM ]`), square outlined buttons, black and white photography, a ticker band. GroundApp's parts are unchanged |
| Photos | AION's own, from aiontraining.co, listed in `docs/aion/photo-sources.md`. Collin clears their use with AION as he did with Arsenal |
| Form | Same fields, except AION has one location, so there is no location choice (the form sends "Greenwood Village"). The member box reads "I'm an AION member" |
| Rules | Same: one email, one code; code by email only; one reminder after 3 days; Android list; newsletter opt-in; nothing shared with the partner automatically |
| Codes | A fresh batch of 500 one-time codes in a new App Store offer for AION, so Apple's reports split redemptions by partner |
| Tracking | The Partners panel on `/admin` gets a switch between partners |

## The AION codes

- New offer in App Store Connect on the yearly Premium plan: "AION free year (one-time codes)". Free for one year, then renews at the standard yearly price. Eligible: new, existing and expired subscribers. It replaces the introductory offer. Same 12 territories as the first partner offer.
- One batch of 500 one-time codes, created 2026-11-13, batch 653224, expiring 2027-05-12 (180 days, Apple's limit for one-time codes).
- The CSV is on Collin's Mac, outside this repo, and is loaded with `scripts/load-partner-codes.mjs <csv> --partner aion --batch 653224 --expires 2027-05-12`.

Reading the first partner offer for this also settled an open item from the Arsenal launch: that offer is open to new, existing and expired subscribers, so members who already tried Premium can redeem.

## Code changes that make a second partner possible

- `lib/partners.js`: each partner's name, short name, lockup, stylesheet and its one sentence in the code email.
- Emails take a partner config; nothing says "Arsenal" in an AION email.
- `lib/partner-redeem.js`: one member-link handler; `functions/arsenal/r/[token].js` and `functions/aion/r/[token].js` are two-line routes. A token only works on its own partner's path.
- Shared front-end scripts renamed `partner-claim-v1.js`, `partner-bodie-v1.js`, `partner-qr-v1.js`; the form names its partner with `data-partner`.
- Admin: `GET /api/admin/partner` lists partners; the panel switches between them.
- Database: one new row in `partner_programs` (`db/2026-11-13c_partner_aion.sql`). The tables and functions were built per partner from the start.

## Copy that differs from Arsenal's

- Letter, last paragraph: "AION builds your strength and your engine, and the people around you hold the standard. Your breath is the part you steer yourself. This is the tool you carry out the door. Your first year of Premium is on me."
- Partner section: "Strength. Engine. Now your breath." with three captions: before a heavy set, between efforts, on the run.
- Code email, third paragraph: "AION builds your strength and your engine. Your breath is the part you steer yourself, and this is the tool you carry out the door. Your first year of GroundApp Premium is on me."

These are drafts in Collin's voice for him to edit.

## Launch

Same checks as Arsenal: tests, local end to end against the real database and Resend with a test inbox, a review by a different model family, a pull request with a preview, and live only on Collin's word. The Arsenal page is re-checked after the script rename, since it is live.
