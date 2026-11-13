# groundapp.live/traverse: third partner page, design note

Date: 2026-11-13. Owner: Collin Chartier. Branch `traverse`. This builds on `2026-11-13-arsenal-partner-page-design.md` and `2026-11-13-aion-partner-page-design.md`; everything not said here is as in those.

This repo is public. No codes, member data or contact details here.

## Request

Collin, 2026-11-13: "now make one with Traverse Fitness too". Traverse Fitness is traversefitness.com (Instagram @traversefitness), a Denver training and wellness club with two clubs, South Broadway and Highlands.

## Decisions

| Topic | Decision |
|---|---|
| Page | `groundapp.live/traverse`, same structure as `/arsenal` and `/aion`. Not indexed |
| Look | Traverse's ground wears Traverse's look, measured from traversefitness.com: near-black `#121212` and cream `#FFF1DF`, one tan gold accent `#947C53`, Anton display caps, Montserrat 800 caps headlines, Montserrat body, square buttons. Dark text on tan gold fills, since light text there is about 4:1. GroundApp's parts are unchanged |
| Hero | Their actual gym with Bodie in it, following Collin's instruction on the Arsenal page ("the actual gym") |
| Photos | Traverse's own, from traversefitness.com and their public Instagram, listed in `docs/traverse/photo-sources.md`. Collin clears their use with Traverse |
| Form | Same fields. Two clubs, so the form asks which: South Broadway or Highlands |
| Rules | Same: one email, one code; code by email only; one reminder after 3 days; Android list; newsletter opt-in |
| Codes | A fresh batch of 500 one-time codes in a new App Store offer for Traverse |

## The Traverse codes

- New offer on the yearly Premium plan: "Traverse Fitness free year (one-time codes)". Free for one year, then the standard yearly price. New, existing and expired subscribers. Replaces the introductory offer. Same 12 territories as the other partner offers.
- One batch of 500, created 2026-11-13, batch 653250, expiring 2027-05-12.
- Loaded with `scripts/load-partner-codes.mjs <csv> --partner traverse --batch 653250 --expires 2027-05-12`. The CSV stays on Collin's Mac.

## Why Traverse fits

Traverse already teaches breathwork: its Thermotherapy classes are coach-led sauna and cold plunge sessions that guide members through breathwork. It also has an Altitude studio. So the partner section is about taking that practice out the door.

## Copy that differs

- Letter, last paragraph: "Traverse says everyone has a mountain. Your breath is how you stay steady on the way up and how you come back down after. You already practice it in Thermotherapy. This is the tool you carry out the door. Your first year of Premium is on me."
- Partner section: "Recovery is part of the work. So is your breath." (the first sentence is Traverse's own line), with three captions: at altitude, in the heat, in the cold.
- Code email, third paragraph: "Traverse already puts breathwork into the sauna and the cold plunge. GroundApp is how you take it out the door. Your first year of GroundApp Premium is on me."

Drafts in Collin's voice for him to edit.

## Code changes

One entry in `lib/partners.js`, one route `functions/traverse/r/[token].js`, noindex headers, one row in `partner_programs` (`db/2026-11-13e_partner_traverse.sql`, created paused), the page, its stylesheet and images, tests. No change to shared behaviour.

## Launch

Same checks as before, and live only on Collin's word: tests, local end to end with the test inbox, a review by a different model family, a pull request. The program is resumed at launch.
