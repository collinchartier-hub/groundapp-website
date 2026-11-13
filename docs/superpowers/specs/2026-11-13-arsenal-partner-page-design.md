# groundapp.live/arsenal: partner page and code delivery, design spec

Date: 2026-11-13. Owner: Collin Chartier. Branch `arsenal`, worktree `~/dev/groundapp-website-arsenal`.

This repo is public. This spec holds no codes, no member data and no contact details. The code CSV stays on Collin's Mac.

## Goal

Arsenal Health members get a free year of GroundApp Premium. A member opens `groundapp.live/arsenal`, enters first name, last name and email, and within seconds receives an email with a code that is theirs alone and a link that redeems it on their iPhone. Collin sees who claimed. Arsenal promotes the page by email and on social media.

The page looks and feels like arsenalhealth.com and presents the partnership as half Arsenal, half GroundApp.

## Decisions (Collin, 2026-11-13)

| Topic | Decision |
|---|---|
| Who can claim | Honor system: a required "I'm an Arsenal member" tick box plus location |
| One person, one code | Collin, 2026-11-13: "Only one person, one email, can get one code." One email address holds one code, for good. A second submit with the same address never draws a new code; it resends the one they have |
| Codes | Use the existing reserve of 450 one-time App Store offer codes (numbers 51 to 500 of the batch made 2026-11-04, expiring 2027-05-03). No new batch now |
| Layout | Option A, "split down the middle", with the letter card from option C. Mockups: `docs/arsenal/layout-options-2026-11-13.html` |
| Intro photo | A training still pulled from Collin's Arsenal video footage. Collin names the clips that show him |
| Newsletter | Opt-in tick box, unticked by default. Everyone else gets the code email and one reminder only |
| What Arsenal sees | Nothing automatic. Collin shares numbers himself |
| Android members | The form asks iPhone or Android. Android gets no code and joins an "email me when Android is ready" list |
| Build approach | Inside this site: Pages Function + Supabase + Resend. No new service |
| Code delivery | By email only. The code is never shown on the page |
| Reminder | One, 3 days after the claim, only if the link was not tapped on an iPhone |

## Facts this design rests on

- The site is a Cloudflare Pages project (`groundapp`): static files in `site/`, Pages Functions in `functions/`, shared code in `lib/`. `functions/api/subscribe.js` already validates a form, writes to Supabase with the service role and sends through Resend from `collin@groundapp.live`.
- Each reserve code already has an Apple redemption URL of the form `https://apps.apple.com/redeem?ctx=offercodes&id=6760352779&code=<CODE>`. Apple's page installs the app first if it is missing.
- Apple, "Set up subscription offer codes" (read 2026-11-13): one-time codes expire at most six months after creation; a customer can redeem one code per offer; an offer's customer eligibility (new, active, expired subscribers) cannot be edited after the offer is created; up to 1,000,000 codes per app per quarter.
- After the free year, Premium renews at $39.99 a year unless the member cancels.
- GroundApp is iPhone only today.
- Not yet verified: the eligibility setting of this offer (see Launch checklist), and whether Apple exposes redemption per code. This design assumes Apple reports redemptions per offer only.

## The page

Files: `site/arsenal/index.html`, `site/assets/css/arsenal-v1.css`, `site/assets/js/arsenal-v1.js`, images in `site/img/arsenal/`, share image `site/img/arsenal/og.jpg` (1200x630, the split design).

Sections, top to bottom:

1. Lockup: ARSENAL HEALTH × GroundApp.
2. Split hero. One sentence crossing the seam: "Arsenal members get" on Arsenal's half (black, Manrope, the word "members" in cyan), "a free year of GroundApp Premium." on GroundApp's half (Obsidian, Source Serif 4, gold button "Claim your free year" that scrolls to the form). The two marks and the × sit on the seam. Under 720px wide the halves stack as two bands, Arsenal on top.
3. Letter from Collin on a warm card (`--card` #2D1E17, Source Serif 4), beside the training still. First person: who he is, what he stands for, why he built the app for performance and nervous system regulation.
4. What you get: a year of Premium, five lines of what that includes, one real app screen recording or screenshot in a phone bezel.
5. How it works: fill in the form, open the email, tap your link on your iPhone.
6. The form (below).
7. Fine print: "iPhone only. Free for 12 months, then $39.99 a year unless you cancel. Cancel any time in Settings > your name > Subscriptions." Link to `/privacy`.
8. Footer with both names.

Look:

- Arsenal's side and everything below the hero: black page, white text, cyan accent `#1FCAF4`, Manrope 400 to 800, pill buttons, small cyan letter-spaced caps eyebrows, 24px rounded cards with a 1px `#262626` border. Values were measured from the rendered arsenalhealth.com on 2026-11-13 (`docs/arsenal/arsenal-tokens.md`); nothing is hotlinked from their site.
- GroundApp's side and the letter card: Ground Brand Kit v5 night theme from `site/assets/css/ground-tokens-v1.css`. Flat fills, no italic, no coloured word in a serif headline, no caps labels. Gold only on the hero button.
- Cyan is the action colour at the form, since that part of the page is Arsenal's.
- `DESIGN-BANS.md` applies to the GroundApp parts.

The page is not indexed: `X-Robots-Tag: noindex` for `/arsenal/*` in `site/_headers`, and it is left out of `sitemap.xml` and `llms.txt`. The site-wide Meta pixel page view loads here as on every page. No claim data is sent to Meta.

## The form

Fields: first name, last name, email, phone type (iPhone / Android), location (Arvada / DTC), "I'm an Arsenal member" (required), "Send me Collin's breathwork emails" (optional, unticked). Hidden: honeypot `website`, time-on-form `t`, Cloudflare Turnstile token, `src` copied from the page's `?src=` query (for example `email`, `ig`).

States after submit:

| Result | What the member sees |
|---|---|
| Code assigned | "Check your inbox. Your code and link are on the way to <email>. Open it on your iPhone." |
| Already claimed | "You already claimed your year. We just sent your code again to <email>." |
| Android | "GroundApp is iPhone only for now. You're on the list, and we'll email you when Android is ready." |
| Bank empty or partner paused | "Codes are being restocked. You're on the list and yours will arrive by email." |
| Invalid input | Message on the field |
| Server or email failure | "Something went wrong on our side. Your spot is saved. Try again in a minute." |

## Server

### `POST /api/partner/claim` (`functions/api/partner/claim.js`)

Request JSON: `partner` ("arsenal"), `first_name`, `last_name`, `email`, `device` ("iphone" | "android"), `location`, `member` (must be true), `newsletter` (bool), `src`, `turnstile`, `website`, `t`.

Steps:

1. Origin check with the same allow-list as `subscribe.js`. Honeypot and `t < 1500` return a fake success.
2. Verify the Turnstile token with Cloudflare (`TURNSTILE_SECRET`).
3. Validate: names 1 to 60 characters with `<>"` and control characters stripped; email by the existing regex, max 254; `location` must be one of the partner's locations; `member` true.
4. Build `email_key`: lower case, plus-tag removed, dots removed from the local part for gmail.com and googlemail.com.
5. Call the database function `partner_claim` (below). It returns the claim and what happened: `assigned`, `existing`, `waitlist`, `android_waitlist`, or a refusal: `rate_limited` (429), `bad_location` or `unknown_partner` (400).
6. Network limit, enforced inside `partner_claim`: at most 30 new claims per hour per hashed IP (a gym's shared wifi must fit under it).
7. Send the email that matches the claim's status through Resend (`lib/partner-delivery.js`, templates in `lib/partner-email.js`). For `existing`, resend that same email (code, waitlist or Android) at most once per 15 minutes; inside that window nothing is sent. Store `emailed_at` or `email_error`. The response status for a repeat is `existing` when they hold a code, otherwise their waitlist status.
8. For a new `assigned` claim, schedule the reminder with Resend `scheduled_at` = now + 3 days and store its id in `nudge_email_id`.
9. If `newsletter` is true, add the person to `newsletter_subscribers` with source `groundapp_site:arsenal` using the shared list code (`lib/list.js`, extracted from `subscribe.js` so both endpoints use one implementation). No separate welcome email: the code email is the welcome, so `last_emailed_at` is set.
10. If the bank just crossed 75, 25 or 0 codes left, or a send failed, email Collin (`ADMIN_EMAILS`).

Response: `{ ok, status }` with `status` one of `assigned`, `existing`, `waitlist`, `android`. The response never contains the code or the link.

### `GET /arsenal/r/<token>` (`functions/arsenal/r/[token].js`)

Looks up the claim by `token` (16 random bytes, base64url).

- iPhone or iPad user agent: record `redeem_tapped_at` (first time) and `tap_count`, cancel the scheduled reminder (`POST https://api.resend.com/emails/<nudge_email_id>/cancel`), then 302 to Apple's redemption URL with the member's code.
- Any other device: a small page in the same look, "Open this on your iPhone", with a QR code of this same link, the code in text, and the manual path (App Store > your picture > Redeem Gift Card or Code). Not counted as a tap, so mail scanners that prefetch links do not look like members.
- Unknown token: 404 page with a link to `/arsenal`.
- Responses are `no-store` and `noindex`.

### Admin (`/admin`, already behind Cloudflare Access)

`GET /api/admin/partner?slug=arsenal` returns: codes left, claims total, by location, by `src`, tapped count, waitlist counts, failed sends, and the claim rows. `POST /api/admin/partner` with an action: `resend` (one claim), `pause` / `resume` (the partner), `release_waitlist` (assign codes to up to 10 waiting iPhone claims per press, oldest first, and email them; 10 keeps one request inside Cloudflare's outgoing-request limit). The admin page gets a "Partners" panel showing these, with CSV export built in the browser from the rows.

## Database (Supabase project used by the site; SQL recorded in `db/2026-11-13_partner_codes.sql`)

All tables: RLS on, no policies, service role only, like the existing `groundapp_*` tables.

`partner_programs`: `slug` text primary key, `name`, `status` ('live' | 'paused'), `locations` text[], `created_at`.

`partner_codes`: `id` bigint identity, `partner` references `partner_programs`, `seq` int, `code` text unique, `redeem_url` text, `batch` text, `expires_on` date, `claim_id` uuid unique null, `created_at`.

`partner_claims`: `id` uuid primary key, `partner`, `first_name`, `last_name`, `email`, `email_key`, `device`, `location`, `src`, `newsletter_opt_in` bool, `status` ('assigned' | 'waitlist' | 'android_waitlist'), `token` text unique, `ip_hash` text, `created_at`, `emailed_at`, `email_error`, `nudge_email_id`, `redeem_tapped_at`, `tap_count` int default 0. Unique on (`partner`, `email_key`). A claim's code is the `partner_codes` row whose `claim_id` points at it.

`partner_claim(p_partner, p_first, p_last, p_email, p_email_key, p_device, p_location, p_src, p_newsletter, p_token, p_ip_hash)` returns jsonb, one transaction:

1. Unknown partner or a location the partner doesn't have: refuse. If a claim exists for (`partner`, `email_key`): return it with outcome `existing`. Over the network limit: refuse with `rate_limited`.
2. If `device` is android: insert with `android_waitlist`, return.
3. If the partner is paused: insert with `waitlist`, return.
4. `select ... from partner_codes where partner = p_partner and claim_id is null and expires_on > current_date order by seq for update skip locked limit 1`. None: insert with `waitlist`. One: insert the claim with `assigned` and set the code's `claim_id`.
5. Return the claim, the code, its redeem URL and the count of codes left.

`for update skip locked` plus the two unique constraints mean two simultaneous submissions can never receive the same code, and one email can never hold two.

`partner_tap(p_token, p_ios)` records an iPhone tap on a member's link and returns their code and redeem URL. `partner_release_waitlist(p_partner, p_limit)` gives waiting iPhone claims a code, oldest first. `partner_admin_summary(p_partner)` returns the admin JSON in one call. All five functions are executable by the service role only.

Loading codes: `scripts/load-partner-codes.mjs <csv> --partner arsenal --batch <id> --expires 2027-05-03`, run on Collin's Mac with `.dev.vars`. It reads the CSV from outside the repo and upserts by `code`. Supabase changes, Pages secrets and code loading are laptop steps per `AGENTS.md`.

## Emails (`lib/partner-email.js`; sender "Collin Chartier <collin@groundapp.live>", reply-to the same)

1. Code email. Subject: "Your free year of GroundApp, from Arsenal and Collin". A short form of the letter, one button "Get my free year" pointing at the member's `/arsenal/r/<token>` link, the code in text, the three steps, and the renewal line. Framed like the page: Arsenal's black and cyan around a warm letter card. Plain-text part included. Resend idempotency key per claim and send count.
2. Reminder, 3 days later if not tapped: two lines and the same button. Carries the existing unsubscribe link and headers.
3. Android confirmation.
4. Waitlist confirmation, and later the code email when codes are released.
5. To Collin: 75 left, 25 left, 0 left, failed sends.

Every member email carries the mailing address footer (`MAILING_ADDRESS`).

## Abuse protection

One person, one code is held by four things together:

1. The database allows one claim per `email_key` per partner (unique constraint), and one owner per code (unique constraint). `email_key` folds gmail dots, plus-tags and googlemail into one address, so `sam.lee+2@gmail.com` is the same person as `samlee@gmail.com`.
2. A repeat submit returns the existing claim and resends the same code. It cannot draw a second one, even when two requests arrive at the same instant.
3. The code is delivered by email only, so each code needs a working inbox.
4. Apple lets one Apple ID redeem one code from this offer, so a second code is useless to the same person.

What this cannot stop: one person using two different real email addresses. They would hold two codes and could redeem only one themselves. The admin list shows every claim with name, email and location so Collin can spot it.

Also: Turnstile; honeypot and time-on-form; per-network hourly limit; low-stock alerts; the pause switch.

## For Arsenal to promote it

Written by `writer`, checked by Collin, sent to Arsenal by Collin: the announcement email for Arsenal's member list, two social captions, and the share image. Links use `groundapp.live/arsenal?src=email` and `?src=ig`.

## Copy

Collin's letter, the page lines, the emails and the kit are drafted from the Ground Brand Kit and voice docs, then edited by Collin. Site copy rules apply: no em dashes, casual and direct, "GroundApp", claims match the shipped app, no free-trial claim. The renewal line appears on the page and in the code email.

`site/privacy.html` gets one paragraph: what a partner claim collects (name, email, phone type, gym location), why (to send the code and one reminder), and that it is not shared with the partner.

## Testing

- `node --test` unit tests next to `scripts/asc.test.mjs`: validation, `email_key` rules, each outcome of the claim handler with Supabase and Resend stubbed, the redirect's device branching, the admin actions.
- Concurrency, against the real database with a throwaway partner `test` and 5 dummy codes: 20 parallel claims give exactly 5 `assigned`, 15 `waitlist`, no code held twice. The `test` rows are deleted afterwards.
- Local end to end with `wrangler pages dev` and `.dev.vars`: a claim for partner `test` sends a real email to Collin; the link redirects on an iPhone user agent and shows the QR page on desktop; the reminder is scheduled and then cancelled by the tap.
- Page checked at 390, 768 and 1440 wide, plus the email in Apple Mail and Gmail on an iPhone.
- Code review by a different model family before merge. Preview link to Collin. Live only on his go.
- After going live: the first real claim is made by someone who has never had Premium, on their iPhone, to prove the Apple redemption end to end.

## Launch checklist

1. Collin names the clips that show him; the still is cut and graded.
2. Arsenal agrees in writing to its name, logo and look being used on groundapp.live, and sends logo files.
3. The offer's eligibility is read in App Store Connect. If it is new subscribers only, Collin decides whether that is acceptable or a new offer is created for the unclaimed remainder.
4. Turnstile widget created; `TURNSTILE_SECRET` set as a Pages secret, site key in the page.
5. Migration applied; codes 51 to 500 loaded; count checked (450).
6. Collin approves the letter, the emails and the kit.
7. Preview approved, pull request merged, live page and one real claim checked.

## Not in this build

- Other gyms. The tables are keyed by partner so a second gym is a new row, a new batch and a new page, but only Arsenal is built.
- Creating code batches through Apple's API. Batches are made in App Store Connect and loaded with the script.
- Android codes.
- Sharing claim data with Arsenal.
- Verifying membership against a list.
- The 50 codes already given to Arsenal's team. They are separate from the bank.
