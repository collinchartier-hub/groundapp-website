# Arsenal Partner Codes, Part 1: Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A member submits name and email, the database locks one unique App Store code to them, and they are emailed that code with their own redeem link, with an admin API to see and manage claims.

**Architecture:** Cloudflare Pages Functions in this repo call Postgres functions in the site's Supabase project through PostgREST with the service role. One Postgres function assigns a code inside a single transaction (`for update skip locked`), so a code can never go to two people. Email goes through Resend, including a reminder scheduled with `scheduled_at` and cancelled when the link is tapped on an iPhone.

**Tech Stack:** Cloudflare Pages Functions (ES modules, no dependencies), Supabase Postgres + PostgREST, Resend HTTP API, Cloudflare Turnstile, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-13-arsenal-partner-page-design.md`. Part 2 (page, design, copy, admin panel, launch) is `docs/superpowers/plans/2026-11-13-arsenal-2-page-and-launch.md` and depends on this part.

**Rules that apply to every task (from `AGENTS.md`):**

- Work only in the worktree `~/dev/groundapp-website-arsenal`, branch `arsenal`. Never push, never deploy, never touch `main`. Commit locally after each task.
- This repo is public. Never commit codes, emails, the code CSV, or `.dev.vars`.
- Copy in emails: no em dashes, casual and direct, spell it GroundApp, no free-trial claim, Premium is $39.99 a year.
- Tasks 1 to 8 are code and run without credentials. Task 9 touches Supabase and Cloudflare and is done by the orchestrator on Collin's Mac, not by a subagent.
- Run tests with `npm test` (it runs `node --test test/`). Node 20 or later.

## File map

| File | Responsibility |
|---|---|
| `lib/partner.js` (create) | Pure rules: input validation, `email_key`, tokens, user-agent check, constants |
| `lib/partner-email.js` (create) | Renders the member and alert emails, sends through Resend |
| `lib/list.js` (create) | Add or reactivate a newsletter subscriber. Extracted from `functions/api/subscribe.js` |
| `functions/api/subscribe.js` (modify) | Uses `lib/list.js` instead of its inline copy |
| `lib/partner-delivery.js` (create) | Sends the right email for a claim's status and schedules the reminder; alerts Collin. Shared by the claim endpoint and the admin API |
| `functions/api/partner/claim.js` (create) | `POST /api/partner/claim` |
| `functions/arsenal/r/[token].js` (create) | `GET /arsenal/r/<token>`: redirect to Apple on iPhone, "open on your iPhone" page elsewhere |
| `functions/api/admin/partner.js` (create) | `GET` summary and `POST` actions for the admin panel |
| `db/2026-11-13_partner_codes.sql` (create) | Tables and Postgres functions (the record; applied in Task 9) |
| `scripts/load-partner-codes.mjs` (create) | Loads a code CSV from outside the repo into `partner_codes` |
| `scripts/partner-concurrency.mjs` (create) | Proves 20 parallel claims on 5 codes give 5 codes, no duplicates |
| `site/_headers`, `wrangler.toml` (modify) | noindex for `/arsenal`, note the new secret |
| `test/partner*.test.mjs`, `test/load-codes.test.mjs` (create) | Tests |

## Contracts (used across tasks; do not rename)

Postgres `partner_claim(...)` returns jsonb:

```json
{ "outcome": "assigned | existing | waitlist | android_waitlist | rate_limited | unknown_partner | bad_location",
  "claim": { "id": "uuid", "status": "assigned | waitlist | android_waitlist", "first_name": "Sam",
             "email": "sam@example.com", "token": "22 chars", "emailed_at": "iso or null" },
  "code": "ABC or null", "redeem_url": "https://apps.apple.com/redeem?... or null", "codes_left": 449 }
```

`claim`, `code`, `redeem_url`, `codes_left` are absent for `rate_limited`, `unknown_partner`, `bad_location`.

`POST /api/partner/claim` responds `{ ok: true, status }` with `status` one of `assigned`, `existing`, `waitlist`, `android`, or `{ ok: false, error, field? }` with `error` one of `invalid` (400), `forbidden` (403), `bot_check` (403), `rate_limited` (429), `email` (502), `not_configured` (503), `server` (500). It never returns the code, the token or the link.

---

### Task 1: Claim rules (`lib/partner.js`)

**Files:**
- Create: `lib/partner.js`
- Test: `test/partner.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `test/partner.test.mjs`:

```js
// test/partner.test.mjs: input rules for partner code claims.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPersonName, emailKey, validateClaim, newToken, isToken, isIosUA, redeemLink } from '../lib/partner.js';

const good = { partner: 'arsenal', first_name: ' Sam ', last_name: 'Lee', email: 'Sam.Lee+gym@Gmail.com', device: 'iphone', location: 'Arvada', member: true, newsletter: true, src: 'ig' };

test('cleanPersonName trims, collapses spaces and strips markup characters', () => {
  assert.equal(cleanPersonName('  Mary   Ann '), 'Mary Ann');
  assert.equal(cleanPersonName('<b>Sam</b>'), 'bSam/b');
  assert.equal(cleanPersonName(''), null);
  assert.equal(cleanPersonName('x'.repeat(61)), null);
  assert.equal(cleanPersonName('sam@example.com'), null);
  assert.equal(cleanPersonName('https://spam.example'), null);
});

test('emailKey treats gmail dots, plus tags and googlemail as one address', () => {
  assert.equal(emailKey('Sam.Lee+gym@Gmail.com'), 'samlee@gmail.com');
  assert.equal(emailKey('samlee@googlemail.com'), 'samlee@gmail.com');
  assert.equal(emailKey('sam.lee+x@arsenalhealth.com'), 'sam.lee@arsenalhealth.com');
});

test('validateClaim returns a clean value for good input', () => {
  assert.deepEqual(validateClaim(good), {
    value: { partner: 'arsenal', firstName: 'Sam', lastName: 'Lee', email: 'sam.lee+gym@gmail.com', emailKey: 'samlee@gmail.com',
      device: 'iphone', location: 'Arvada', newsletter: true, src: 'ig' },
  });
});

test('validateClaim names the first bad field', () => {
  assert.deepEqual(validateClaim({ ...good, first_name: '' }), { error: 'first_name' });
  assert.deepEqual(validateClaim({ ...good, last_name: '@' }), { error: 'last_name' });
  assert.deepEqual(validateClaim({ ...good, email: 'nope' }), { error: 'email' });
  assert.deepEqual(validateClaim({ ...good, device: 'windows' }), { error: 'device' });
  assert.deepEqual(validateClaim({ ...good, location: '' }), { error: 'location' });
  assert.deepEqual(validateClaim({ ...good, member: 'yes' }), { error: 'member' });
  assert.deepEqual(validateClaim({ ...good, partner: '../x' }), { error: 'partner' });
  assert.deepEqual(validateClaim(null), { error: 'partner' });
});

test('validateClaim drops an unsafe src and defaults newsletter to false', () => {
  const v = validateClaim({ ...good, src: '<script>', newsletter: 'true' }).value;
  assert.equal(v.src, null);
  assert.equal(v.newsletter, false);
});

test('tokens are 22 url-safe characters and unique', () => {
  const a = newToken();
  assert.ok(isToken(a));
  assert.notEqual(a, newToken());
  assert.equal(isToken('short'), false);
  assert.equal(isToken('a'.repeat(21) + '/'), false);
});

test('isIosUA is true for iPhone and iPad only', () => {
  assert.equal(isIosUA('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15'), true);
  assert.equal(isIosUA('Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X)'), true);
  assert.equal(isIosUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), false);
  assert.equal(isIosUA('Mozilla/5.0 (Linux; Android 15; Pixel 9)'), false);
  assert.equal(isIosUA(null), false);
});

test('redeemLink builds the member link', () => {
  assert.equal(redeemLink('arsenal', 'abc'), 'https://groundapp.live/arsenal/r/abc');
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npm test 2>&1 | tail -15`
Expected: failure mentioning `Cannot find module` for `lib/partner.js`.

- [ ] **Step 3: Write the implementation**

Create `lib/partner.js`:

```js
// Rules for partner code claims (groundapp.live/<partner>). Pure functions, no network.
import { SITE } from './util.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

// Email Collin when the bank reaches exactly these counts.
export const LOW_STOCK = [75, 25, 0];
// A repeat submit resends the member's email at most this often.
export const RESEND_WINDOW_MS = 15 * 60 * 1000;
// The one reminder goes out this long after the claim, unless the link was tapped on an iPhone.
export const NUDGE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

export function cleanPersonName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').replace(/[<>"\u0000-\u001f\u007f]/g, '').trim();
  if (!name || name.length > 60 || /@|https?:/i.test(name)) return null;
  return name;
}

// One key per real inbox: lower case, plus-tag removed, gmail dots removed, googlemail folded into gmail.
export function emailKey(email) {
  const e = String(email).trim().toLowerCase();
  const at = e.lastIndexOf('@');
  let domain = e.slice(at + 1);
  let local = e.slice(0, at).split('+')[0] || e.slice(0, at);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '') || local;
  return `${local}@${domain}`;
}

// Returns { value } or { error: <field name> } for the first bad field.
export function validateClaim(body) {
  const b = body && typeof body === 'object' ? body : {};
  const partner = String(b.partner || '').toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(partner)) return { error: 'partner' };
  const firstName = cleanPersonName(b.first_name);
  if (!firstName) return { error: 'first_name' };
  const lastName = cleanPersonName(b.last_name);
  if (!lastName) return { error: 'last_name' };
  const email = String(b.email || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { error: 'email' };
  if (b.device !== 'iphone' && b.device !== 'android') return { error: 'device' };
  const location = String(b.location || '').trim().slice(0, 60);
  if (!location) return { error: 'location' };
  if (b.member !== true) return { error: 'member' };
  const src = /^[a-z0-9_-]{1,24}$/.test(String(b.src || '')) ? String(b.src) : null;
  return {
    value: { partner, firstName, lastName, email, emailKey: emailKey(email), device: b.device, location, newsletter: b.newsletter === true, src },
  };
}

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = '';
  for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const isToken = (s) => TOKEN_RE.test(String(s || ''));
export const isIosUA = (ua) => /\b(iPhone|iPad|iPod)\b/.test(String(ua || ''));
export const redeemLink = (partner, token) => `${SITE}/${partner}/r/${token}`;
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm test 2>&1 | tail -8`
Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/partner.js test/partner.test.mjs
git commit -m "Partner claims: input rules, email key, tokens"
```

---

### Task 2: Database record (`db/2026-11-13_partner_codes.sql`)

No test runs in this task: the SQL is exercised in Task 9 by `scripts/partner-concurrency.mjs`. The file is the record of what gets applied.

**Files:**
- Create: `db/2026-11-13_partner_codes.sql`

- [ ] **Step 1: Write the SQL**

Create `db/2026-11-13_partner_codes.sql`:

```sql
-- Partner code bank and claims for groundapp.live/<partner> (first partner: arsenal).
-- Applied to Supabase project jlgmhpdggjxxfgfauobd as migration "partner_codes". Kept here as the record.
-- All tables: RLS on, no policies, so only the service role (Pages Functions, local scripts) can read or write.
-- The codes themselves are loaded from a CSV outside this repo by scripts/load-partner-codes.mjs.

create table if not exists public.partner_programs (
  slug text primary key,
  name text not null,
  status text not null default 'live' check (status in ('live', 'paused')),
  locations text[] not null,
  created_at timestamptz not null default now()
);
alter table public.partner_programs enable row level security;

create table if not exists public.partner_claims (
  id uuid primary key default gen_random_uuid(),
  partner text not null references public.partner_programs (slug),
  first_name text not null,
  last_name text not null,
  email text not null,
  email_key text not null,             -- lib/partner.js emailKey(): one per real inbox
  device text not null check (device in ('iphone', 'android')),
  location text not null,
  src text,                            -- ?src= on the page: email, ig, ...
  newsletter_opt_in boolean not null default false,
  status text not null check (status in ('assigned', 'waitlist', 'android_waitlist')),
  token text not null unique,          -- the member's link: /<partner>/r/<token>
  ip_hash text,
  created_at timestamptz not null default now(),
  emailed_at timestamptz,
  email_error text,
  nudge_email_id text,                 -- Resend id of the scheduled reminder, cleared on first iPhone tap
  redeem_tapped_at timestamptz,
  tap_count integer not null default 0,
  unique (partner, email_key)
);
create index if not exists partner_claims_ip_idx on public.partner_claims (ip_hash, created_at);
alter table public.partner_claims enable row level security;

create table if not exists public.partner_codes (
  id bigint generated always as identity primary key,
  partner text not null references public.partner_programs (slug),
  seq integer not null,                -- the code's number in Apple's batch file; codes go out in this order
  code text not null unique,
  redeem_url text not null,
  batch text,
  expires_on date not null,
  claim_id uuid unique references public.partner_claims (id),
  created_at timestamptz not null default now()
);
create index if not exists partner_codes_free_idx on public.partner_codes (partner, seq) where claim_id is null;
alter table public.partner_codes enable row level security;

insert into public.partner_programs (slug, name, locations)
values ('arsenal', 'Arsenal Health', array['Arvada', 'DTC'])
on conflict (slug) do nothing;

-- What the Pages Function gets back for one claim.
create or replace function public.partner_claim_result(p_outcome text, p_claim public.partner_claims)
returns jsonb
language sql
set search_path = public
as $$
  select jsonb_build_object(
    'outcome', p_outcome,
    'claim', jsonb_build_object('id', p_claim.id, 'status', p_claim.status, 'first_name', p_claim.first_name,
                                'email', p_claim.email, 'token', p_claim.token, 'emailed_at', p_claim.emailed_at),
    'code', (select code from partner_codes where claim_id = p_claim.id),
    'redeem_url', (select redeem_url from partner_codes where claim_id = p_claim.id),
    'codes_left', (select count(*) from partner_codes
                    where partner = p_claim.partner and claim_id is null and expires_on > current_date)
  );
$$;

-- One claim, one transaction. "for update skip locked" means two people submitting at the same moment each lock a
-- different code; the unique constraints mean one email can never hold two claims and one code never two owners.
create or replace function public.partner_claim(
  p_partner text, p_first text, p_last text, p_email text, p_email_key text, p_device text,
  p_location text, p_src text, p_newsletter boolean, p_token text, p_ip_hash text
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_program partner_programs%rowtype;
  v_claim partner_claims%rowtype;
  v_code_id bigint;
  v_status text;
begin
  select * into v_program from partner_programs where slug = p_partner;
  if not found then return jsonb_build_object('outcome', 'unknown_partner'); end if;
  if not (p_location = any (v_program.locations)) then return jsonb_build_object('outcome', 'bad_location'); end if;

  select * into v_claim from partner_claims where partner = p_partner and email_key = p_email_key;
  if found then return partner_claim_result('existing', v_claim); end if;

  -- 30 new claims an hour per network: room for a gym's shared wifi, a wall for a script.
  if p_ip_hash is not null and (
    select count(*) from partner_claims where ip_hash = p_ip_hash and created_at > now() - interval '1 hour'
  ) >= 30 then
    return jsonb_build_object('outcome', 'rate_limited');
  end if;

  begin
    if p_device = 'android' then
      v_status := 'android_waitlist';
    elsif v_program.status <> 'live' then
      v_status := 'waitlist';
    else
      select id into v_code_id from partner_codes
       where partner = p_partner and claim_id is null and expires_on > current_date
       order by seq
       for update skip locked
       limit 1;
      v_status := case when v_code_id is null then 'waitlist' else 'assigned' end;
    end if;

    insert into partner_claims (partner, first_name, last_name, email, email_key, device, location, src,
                                newsletter_opt_in, status, token, ip_hash)
    values (p_partner, p_first, p_last, p_email, p_email_key, p_device, p_location, p_src,
            coalesce(p_newsletter, false), v_status, p_token, p_ip_hash)
    returning * into v_claim;

    if v_status = 'assigned' then
      update partner_codes set claim_id = v_claim.id where id = v_code_id;
    end if;
  exception when unique_violation then
    -- The same person submitted twice at once. The other request won; hand back its claim.
    select * into v_claim from partner_claims where partner = p_partner and email_key = p_email_key;
    if not found then raise; end if;
    return partner_claim_result('existing', v_claim);
  end;

  return partner_claim_result(v_status, v_claim);
end;
$$;

-- A tap on the member's link. Counts only iPhone/iPad taps on an assigned claim, so mail scanners don't look like members.
create or replace function public.partner_tap(p_token text, p_ios boolean)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_claim partner_claims%rowtype;
  v_first boolean := false;
begin
  select * into v_claim from partner_claims where token = p_token;
  if not found then return jsonb_build_object('found', false); end if;
  if p_ios and v_claim.status = 'assigned' then
    v_first := v_claim.redeem_tapped_at is null;
    update partner_claims
       set tap_count = tap_count + 1, redeem_tapped_at = coalesce(redeem_tapped_at, now()), nudge_email_id = null
     where id = v_claim.id;
  end if;
  return jsonb_build_object(
    'found', true, 'partner', v_claim.partner, 'status', v_claim.status, 'first_tap', v_first,
    'nudge_email_id', v_claim.nudge_email_id,
    'code', (select code from partner_codes where claim_id = v_claim.id),
    'redeem_url', (select redeem_url from partner_codes where claim_id = v_claim.id)
  );
end;
$$;

-- Give waiting iPhone claims a code, oldest first, at most p_limit per call. Returns one partner_claim_result per claim.
create or replace function public.partner_release_waitlist(p_partner text, p_limit integer default 10)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_claim partner_claims%rowtype;
  v_code_id bigint;
  v_out jsonb := '[]'::jsonb;
begin
  for v_claim in
    select * from partner_claims
     where partner = p_partner and status = 'waitlist' and device = 'iphone'
     order by created_at
     for update skip locked
     limit greatest(1, least(coalesce(p_limit, 10), 10))
  loop
    select id into v_code_id from partner_codes
     where partner = p_partner and claim_id is null and expires_on > current_date
     order by seq for update skip locked limit 1;
    exit when v_code_id is null;
    update partner_claims set status = 'assigned', emailed_at = null where id = v_claim.id returning * into v_claim;
    update partner_codes set claim_id = v_claim.id where id = v_code_id;
    v_out := v_out || jsonb_build_array(partner_claim_result('assigned', v_claim));
  end loop;
  return v_out;
end;
$$;

-- Everything the admin panel shows for one partner, in one call.
create or replace function public.partner_admin_summary(p_partner text)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'program', (select to_jsonb(p) from partner_programs p where slug = p_partner),
    'codes', jsonb_build_object(
      'total', (select count(*) from partner_codes where partner = p_partner),
      'left', (select count(*) from partner_codes where partner = p_partner and claim_id is null and expires_on > current_date),
      'expires_on', (select min(expires_on) from partner_codes where partner = p_partner and claim_id is null and expires_on > current_date)
    ),
    'claims', jsonb_build_object(
      'assigned', (select count(*) from partner_claims where partner = p_partner and status = 'assigned'),
      'waitlist', (select count(*) from partner_claims where partner = p_partner and status = 'waitlist'),
      'android_waitlist', (select count(*) from partner_claims where partner = p_partner and status = 'android_waitlist'),
      'tapped', (select count(*) from partner_claims where partner = p_partner and redeem_tapped_at is not null),
      'email_failed', (select count(*) from partner_claims where partner = p_partner and email_error is not null),
      'newsletter', (select count(*) from partner_claims where partner = p_partner and newsletter_opt_in)
    ),
    'by_location', coalesce((select jsonb_object_agg(location, n) from (
        select location, count(*) n from partner_claims where partner = p_partner group by location) t), '{}'::jsonb),
    'by_src', coalesce((select jsonb_object_agg(coalesce(src, 'direct'), n) from (
        select src, count(*) n from partner_claims where partner = p_partner group by src) t), '{}'::jsonb),
    'rows', coalesce((select jsonb_agg(r order by r.created_at desc) from (
        select c.id, c.first_name, c.last_name, c.email, c.device, c.location, c.src, c.status, c.newsletter_opt_in,
               c.created_at, c.emailed_at, c.email_error, c.redeem_tapped_at, c.tap_count,
               (select seq from partner_codes where claim_id = c.id) as code_seq
          from partner_claims c where c.partner = p_partner order by c.created_at desc limit 2000) r), '[]'::jsonb)
  );
$$;

-- These run with the caller's rights, and RLS already hides the tables from anon. Close the functions too.
revoke execute on function public.partner_claim_result(text, public.partner_claims) from public, anon, authenticated;
revoke execute on function public.partner_claim(text, text, text, text, text, text, text, text, boolean, text, text) from public, anon, authenticated;
revoke execute on function public.partner_tap(text, boolean) from public, anon, authenticated;
revoke execute on function public.partner_release_waitlist(text, integer) from public, anon, authenticated;
revoke execute on function public.partner_admin_summary(text) from public, anon, authenticated;
grant execute on function public.partner_claim_result(text, public.partner_claims) to service_role;
grant execute on function public.partner_claim(text, text, text, text, text, text, text, text, boolean, text, text) to service_role;
grant execute on function public.partner_tap(text, boolean) to service_role;
grant execute on function public.partner_release_waitlist(text, integer) to service_role;
grant execute on function public.partner_admin_summary(text) to service_role;
```

- [ ] **Step 2: Check the file holds no code or member data**

Run: `rg -n 'apps\.apple\.com/redeem\?|@[a-z]+\.(com|live)' db/2026-11-13_partner_codes.sql; echo "exit $?"`
Expected: `exit 1` (no matches).

- [ ] **Step 3: Commit**

```bash
git add db/2026-11-13_partner_codes.sql
git commit -m "Partner claims: tables and claim, tap, release, summary functions"
```

---

### Task 3: Emails (`lib/partner-email.js`)

The words here are the working draft. Part 2 replaces them with Collin's approved copy and restyles the frame; the function names, arguments and return shapes stay.

**Files:**
- Create: `lib/partner-email.js`
- Test: `test/partner-email.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `test/partner-email.test.mjs`:

```js
// test/partner-email.test.mjs: what the partner emails contain and how they are sent.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderClaimEmail, renderNudgeEmail, renderAndroidEmail, renderWaitlistEmail, renderAlertEmail, sendEmail } from '../lib/partner-email.js';

const base = { partnerName: 'Arsenal Health', firstName: 'Sam', mailingAddress: '123 Test St, Denver, CO 80202' };
const link = 'https://groundapp.live/arsenal/r/abcdefghijklmnopqrstuv';

test('claim email: code, link, renewal line and address in both parts', () => {
  const m = renderClaimEmail({ ...base, code: 'ABC123XYZ', link });
  for (const part of [m.html, m.text]) {
    assert.ok(part.includes('ABC123XYZ'));
    assert.ok(part.includes(link));
    assert.ok(part.includes('$39.99 a year unless you cancel'));
    assert.ok(part.includes('123 Test St, Denver, CO 80202'));
    assert.ok(part.includes('Sam'));
  }
  assert.ok(m.subject.includes('GroundApp'));
});

test('member emails follow the copy rules', () => {
  const all = [
    renderClaimEmail({ ...base, code: 'ABC', link }),
    renderNudgeEmail({ ...base, link, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' }),
    renderAndroidEmail(base),
    renderWaitlistEmail(base),
  ];
  for (const m of all) {
    for (const part of [m.subject, m.html, m.text]) {
      assert.ok(!part.includes('\u2014'), 'no em dashes');
      assert.ok(!/free trial/i.test(part), 'no free-trial claim');
      assert.ok(!/Ground App\b/.test(part), 'spelled GroundApp');
    }
  }
});

test('names are escaped in html', () => {
  const m = renderClaimEmail({ ...base, firstName: 'A&B', code: 'ABC', link });
  assert.ok(m.html.includes('A&amp;B'));
  assert.ok(!m.html.includes('A&B,'));
});

test('nudge email carries the link and an unsubscribe link, not the code', () => {
  const m = renderNudgeEmail({ ...base, link, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' });
  assert.ok(m.html.includes(link));
  assert.ok(m.text.includes('https://groundapp.live/api/unsubscribe?e=x&t=y'));
});

test('alert email states the partner and the event', () => {
  const m = renderAlertEmail({ partner: 'arsenal', event: 'low_stock', detail: '25 codes left' });
  assert.ok(m.subject.includes('arsenal'));
  assert.ok(m.text.includes('25 codes left'));
});

let calls;
let realFetch;
beforeEach(() => {
  calls = [];
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ id: 'email_9' }), { status: 200 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

test('sendEmail posts to Resend with sender, idempotency key, tag and schedule', async () => {
  const out = await sendEmail({ RESEND_API_KEY: 're_test' }, {
    to: 'sam@example.com', subject: 'S', html: '<p>h</p>', text: 't',
    idempotencyKey: 'k1', tag: 'partner_claim', scheduledAt: '2026-11-16T12:00:00.000Z', headers: { 'X-A': 'b' },
  });
  assert.deepEqual(out, { ok: true, id: 'email_9', error: null });
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].headers.authorization, 'Bearer re_test');
  assert.equal(calls[0].headers['idempotency-key'], 'k1');
  assert.equal(calls[0].body.from, 'Collin Chartier <collin@groundapp.live>');
  assert.deepEqual(calls[0].body.to, ['sam@example.com']);
  assert.equal(calls[0].body.scheduled_at, '2026-11-16T12:00:00.000Z');
  assert.deepEqual(calls[0].body.tags, [{ name: 'type', value: 'partner_claim' }]);
  assert.deepEqual(calls[0].body.headers, { 'X-A': 'b' });
});

test('sendEmail reports a failed send without throwing', async () => {
  globalThis.fetch = async () => new Response('{"message":"bad"}', { status: 422 });
  const realError = console.error;
  console.error = () => {};
  const out = await sendEmail({ RESEND_API_KEY: 're_test' }, { to: 'a@b.co', subject: 'S', html: 'h', text: 't', tag: 'x' });
  console.error = realError;
  assert.equal(out.ok, false);
  assert.equal(out.id, null);
  assert.ok(out.error.startsWith('422'));
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npm test 2>&1 | tail -15`
Expected: failure mentioning `Cannot find module` for `lib/partner-email.js`.

- [ ] **Step 3: Write the implementation**

Create `lib/partner-email.js`:

```js
// Emails for partner code claims: the member's code, one reminder, the two waitlist notes, and alerts to Collin.
// Copy is held as data so the HTML and plain-text parts always say the same thing.
// Frame: the partner page's black, with the letter on GroundApp's warm card (brand kit v5 night tokens).
import { SITE, escapeHtml as esc } from './util.js';

const FROM = 'Collin Chartier <collin@groundapp.live>';
const REPLY_TO = 'collin@groundapp.live';

const C = { page: '#000000', card: '#2d1e17', text: '#e8ddd0', text2: '#a89585', gold: '#c4935a', onGold: '#1a110e', line: '#3d2e26', frameText: '#9ca3af' };
const SERIF = "'Source Serif 4',Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const RENEWAL = 'Free for 12 months, then $39.99 a year unless you cancel. Cancel any time in Settings > your name > Subscriptions. iPhone only.';

function shell({ title, preheader, inner, footer }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="background:${C.card};border-radius:16px;padding:32px 28px;">${inner}</td></tr>
<tr><td style="padding:20px 8px 0;font:400 12px/1.6 ${SANS};color:${C.frameText};">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (s) => `<p style="margin:0 0 16px;font:400 17px/1.6 ${SANS};color:${C.text};">${s}</p>`;
const small = (s) => `<p style="margin:0 0 12px;font:400 14px/1.6 ${SANS};color:${C.text2};">${s}</p>`;
const h1 = (s) => `<h1 style="margin:0 0 20px;font:400 28px/1.15 ${SERIF};color:${C.text};">${s}</h1>`;
const button = (label, href) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="background:${C.gold};border-radius:14px;"><a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font:600 17px/1 ${SANS};color:${C.onGold};text-decoration:none;">${esc(label)}</a></td></tr></table>`;
const footerFor = (reason, mailingAddress, unsubUrl) =>
  `${esc(reason)}${unsubUrl ? ` <a href="${esc(unsubUrl)}" style="color:${C.frameText};">Unsubscribe</a>.` : ''}<br>GroundApp, by Collin Chartier${mailingAddress ? `<br>${esc(mailingAddress)}` : ''}`;
const footerText = (reason, mailingAddress, unsubUrl) =>
  `---\n${reason}${unsubUrl ? `\nUnsubscribe: ${unsubUrl}` : ''}\nGroundApp, by Collin Chartier${mailingAddress ? `\n${mailingAddress}` : ''}\n`;

export function renderClaimEmail({ partnerName, firstName, code, link, mailingAddress }) {
  const subject = `Your free year of GroundApp, from ${partnerName.split(' ')[0]} and Collin`;
  const body = [
    "I'm Collin. I coach breathwork for performance. I'm an IRONMAN champion, I won the PTO US Open and I raced for Team USA.",
    'I built GroundApp because your breath is the one part of your nervous system you can steer on purpose. It helps you perform under pressure and come back down after.',
    `${partnerName} already gives you the cold plunge and the sauna. Breathwork is the tool you carry out the door. Your first year of GroundApp Premium is on me.`,
  ];
  const steps = [
    'Tap the button on your iPhone.',
    "Confirm in the App Store. If you don't have GroundApp yet, it installs first.",
    'Open GroundApp and check in with Bodie.',
  ];
  const cta = 'Get my free year';
  const reason = `You're getting this because you asked for your ${partnerName} member code at groundapp.live.`;
  const inner = [
    h1(`Hey ${esc(firstName)}, your year is ready.`),
    ...body.map((s) => p(esc(s))),
    button(cta, link),
    small('Tap it on your iPhone. The App Store opens with your code filled in.'),
    `<p style="margin:16px 0 4px;font:400 14px/1.4 ${SANS};color:${C.text2};">Your code, yours alone, works once</p>`,
    `<p style="margin:0 0 20px;font:600 20px/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:1px;color:${C.text};">${esc(code)}</p>`,
    `<ol style="margin:0 0 20px;padding-left:22px;font:400 16px/1.6 ${SANS};color:${C.text};">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`,
    small(esc(RENEWAL)),
    p('Breathe easy,<br>Collin'),
  ].join('\n');
  const html = shell({ title: subject, preheader: 'Your own code and link are inside. Tap it on your iPhone.', inner, footer: footerFor(reason, mailingAddress) });
  const text = `Hey ${firstName}, your year is ready.

${body.join('\n\n')}

${cta}: ${link}
Tap it on your iPhone. The App Store opens with your code filled in.

Your code (yours alone, works once): ${code}

${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${RENEWAL}

Breathe easy,
Collin

${footerText(reason, mailingAddress)}`;
  return { subject, html, text };
}

export function renderNudgeEmail({ partnerName, firstName, link, unsubUrl, mailingAddress }) {
  const subject = 'Your free year of GroundApp is still waiting';
  const body = [
    `Your ${partnerName} member code hasn't been used yet.`,
    'Tap the button on your iPhone and your year of GroundApp Premium starts. It takes about a minute.',
  ];
  const cta = 'Get my free year';
  const reason = `You're getting this one reminder because you asked for your ${partnerName} member code at groundapp.live.`;
  const inner = [h1(`Hey ${esc(firstName)}, one tap left.`), ...body.map((s) => p(esc(s))), button(cta, link), small(esc(RENEWAL)), p('Collin')].join('\n');
  const html = shell({ title: subject, preheader: 'One tap on your iPhone starts it.', inner, footer: footerFor(reason, mailingAddress, unsubUrl) });
  const text = `Hey ${firstName}, one tap left.\n\n${body.join('\n\n')}\n\n${cta}: ${link}\n\n${RENEWAL}\n\nCollin\n\n${footerText(reason, mailingAddress, unsubUrl)}`;
  return { subject, html, text };
}

export function renderAndroidEmail({ partnerName, firstName, mailingAddress }) {
  const subject = "GroundApp on Android: you're on the list";
  const body = [
    'GroundApp is iPhone only right now, so I can\'t send you a code yet.',
    `You're on the list as a ${partnerName} member. I'll email you when the Android app is ready.`,
  ];
  const reason = `You're getting this because you signed up as a ${partnerName} member at groundapp.live.`;
  const inner = [h1(`Hey ${esc(firstName)}, thanks for raising your hand.`), ...body.map((s) => p(esc(s))), p('Collin')].join('\n');
  const html = shell({ title: subject, preheader: "I'll email you when Android is ready.", inner, footer: footerFor(reason, mailingAddress) });
  const text = `Hey ${firstName}, thanks for raising your hand.\n\n${body.join('\n\n')}\n\nCollin\n\n${footerText(reason, mailingAddress)}`;
  return { subject, html, text };
}

export function renderWaitlistEmail({ partnerName, firstName, mailingAddress }) {
  const subject = "You're on the list for your GroundApp code";
  const body = [
    `The ${partnerName} member codes are being restocked.`,
    'Your spot is saved. Your own code and link will land in this inbox as soon as the next batch is in.',
  ];
  const reason = `You're getting this because you asked for your ${partnerName} member code at groundapp.live.`;
  const inner = [h1(`Hey ${esc(firstName)}, your spot is saved.`), ...body.map((s) => p(esc(s))), p('Collin')].join('\n');
  const html = shell({ title: subject, preheader: 'Your code is coming as soon as the next batch is in.', inner, footer: footerFor(reason, mailingAddress) });
  const text = `Hey ${firstName}, your spot is saved.\n\n${body.join('\n\n')}\n\nCollin\n\n${footerText(reason, mailingAddress)}`;
  return { subject, html, text };
}

// To Collin. event: 'low_stock' | 'email_failed'.
export function renderAlertEmail({ partner, event, detail }) {
  const subject = `[GroundApp partners] ${partner}: ${event === 'low_stock' ? detail : 'an email failed to send'}`;
  const text = `Partner: ${partner}\nEvent: ${event}\n${detail}\n\nAdmin: ${SITE}/admin\n`;
  return { subject, html: `<pre style="font:14px/1.5 ui-monospace,Menlo,monospace;">${esc(text)}</pre>`, text };
}

// Returns { ok, id, error }. Never throws for a refused send, so callers can record the failure.
export async function sendEmail(env, { to, subject, html, text, idempotencyKey, tag, scheduledAt, headers }) {
  const reqHeaders = { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' };
  if (idempotencyKey) reqHeaders['idempotency-key'] = idempotencyKey;
  const payload = { from: env.WELCOME_FROM || FROM, to: [to], reply_to: REPLY_TO, subject, html, text, tags: [{ name: 'type', value: tag }] };
  if (scheduledAt) payload.scheduled_at = scheduledAt;
  if (headers) payload.headers = headers;
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload) });
  if (!res.ok) {
    const error = `${res.status} ${(await res.text()).slice(0, 200)}`;
    console.error('partner email failed', tag, error);
    return { ok: false, id: null, error };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, id: data.id || null, error: null };
}

// Cancels a scheduled reminder. Best effort.
export async function cancelEmail(env, id) {
  const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}` },
  });
  if (!res.ok) console.error('partner nudge cancel failed', res.status);
  return res.ok;
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm test 2>&1 | tail -8`
Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/partner-email.js test/partner-email.test.mjs
git commit -m "Partner claims: code, reminder, waitlist and alert emails"
```

---

### Task 4: Shared list code (`lib/list.js`)

`functions/api/subscribe.js` holds the only copy of "add or reactivate a subscriber". The claim endpoint needs the same thing for the newsletter tick box, so it moves to `lib/list.js`. Behaviour of `/api/subscribe` must not change; `test/subscribe.test.mjs` is the proof.

**Files:**
- Create: `lib/list.js`
- Modify: `functions/api/subscribe.js` (the `try` block inside `onRequestPost`, and the imports)
- Test: `test/subscribe.test.mjs` (existing, unchanged)

- [ ] **Step 1: Confirm the existing tests pass before the change**

Run: `node --test test/subscribe.test.mjs 2>&1 | tail -6`
Expected: `# fail 0`.

- [ ] **Step 2: Create `lib/list.js`**

```js
// Adds or reactivates someone on the shared newsletter list (newsletter_subscribers).
// Used by POST /api/subscribe and by partner claims that tick the newsletter box.
import { supabase } from './util.js';

// Returns { state, row }:
//   'new'          inserted
//   'reactivated'  was imported, bounced or unsubscribed and is opting in on purpose
//   'active'       already on the list (row holds last_emailed_at)
//   'race'         lost a race with a double submit; the other request handled it
// Throws when Supabase refuses a call.
export async function upsertSubscriber(env, { email, firstName, source }) {
  const q = encodeURIComponent(email);
  const [existing, unsub] = await Promise.all([
    supabase(env, `newsletter_subscribers?email=eq.${q}&select=id,status,first_name,last_emailed_at`),
    supabase(env, `newsletter_unsubscribed?email=eq.${q}&select=email`),
  ]);
  if (!existing.ok || !unsub.ok) throw new Error(`lookup failed ${existing.status}/${unsub.status}`);

  const row = existing.data[0] || null;
  const wasUnsubscribed = unsub.data.length > 0;
  let state;

  if (!row) {
    const ins = await supabase(env, 'newsletter_subscribers', {
      method: 'POST',
      prefer: 'return=minimal',
      body: { email, first_name: firstName, source, status: 'active' },
    });
    if (ins.status === 409) return { state: 'race', row: null };
    if (!ins.ok) throw new Error(`insert failed ${ins.status} ${JSON.stringify(ins.data)}`);
    state = 'new';
  } else if (row.status !== 'active' || wasUnsubscribed) {
    const patch = { status: 'active' };
    if (!row.first_name && firstName) patch.first_name = firstName;
    const upd = await supabase(env, `newsletter_subscribers?id=eq.${row.id}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
    if (!upd.ok) throw new Error(`reactivate failed ${upd.status}`);
    state = 'reactivated';
  } else {
    state = 'active';
  }

  if (wasUnsubscribed) await supabase(env, `newsletter_unsubscribed?email=eq.${q}`, { method: 'DELETE' });
  return { state, row };
}

export async function stampEmailed(env, email) {
  return supabase(env, `newsletter_subscribers?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { last_emailed_at: new Date().toISOString() },
  });
}
```

- [ ] **Step 3: Use it in `functions/api/subscribe.js`**

Change the import block at the top to:

```js
import { json, unsubscribeUrl, sha256Hex } from '../../lib/util.js';
import { renderWelcome } from '../../lib/welcome.js';
import { upsertSubscriber, stampEmailed } from '../../lib/list.js';
```

Replace the whole `try { ... } catch (err) { ... }` block inside `onRequestPost` with:

```js
  try {
    const { state, row } = await upsertSubscriber(env, { email, firstName, source });
    if (state === 'race') return json({ ok: true, status: 'already' });
    if (state === 'active' && emailedWithinADay(row.last_emailed_at)) return json({ ok: true, status: 'already' });

    const sent = await sendWelcome(env, email, firstName || row?.first_name || null);
    if (sent) await stampEmailed(env, email);
    return json({ ok: true, status: 'subscribed' });
  } catch (err) {
    console.error('subscribe error', err?.message || err);
    return json({ ok: false, error: 'server' }, 500);
  }
```

Leave `cleanName`, the origin and honeypot checks, `emailedWithinADay`, `sendWelcome` and `onRequest` as they are.

- [ ] **Step 4: Run the whole suite**

Run: `npm test 2>&1 | tail -8`
Expected: `# fail 0`. If a subscribe test fails, the refactor changed behaviour: fix `lib/list.js`, not the test.

- [ ] **Step 5: Commit**

```bash
git add lib/list.js functions/api/subscribe.js
git commit -m "Move add-or-reactivate subscriber into lib/list.js"
```

---

### Task 5: Claim endpoint (`functions/api/partner/claim.js`)

**Files:**
- Create: `lib/partner-delivery.js`, `functions/api/partner/claim.js`
- Test: `test/partner-claim.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `test/partner-claim.test.mjs`:

```js
// test/partner-claim.test.mjs: POST /api/partner/claim, with Turnstile, Supabase and Resend stubbed.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/partner/claim.js';

const SB = 'https://sb.example.co';
const env = {
  SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: 'sb_service', UNSUBSCRIBE_SECRET: 'test-secret', RESEND_API_KEY: 're_test',
  TURNSTILE_SECRET: 'ts_secret', MAILING_ADDRESS: '123 Test St, Denver, CO 80202', ADMIN_EMAILS: 'collin@example.com',
};
const CODE = 'ABC123XYZ';
const TOKEN = 'abcdefghijklmnopqrstuv';
const claimRow = (over = {}) => ({ id: 'c1', status: 'assigned', first_name: 'Sam', email: 'sam@example.com', token: TOKEN, emailed_at: null, ...over });
const rpcResult = (over = {}) => ({ outcome: 'assigned', claim: claimRow(), code: CODE, redeem_url: `https://apps.apple.com/redeem?ctx=offercodes&id=6760352779&code=${CODE}`, codes_left: 400, ...over });

let calls;
let state;
let realFetch;
let realConsoleError;

beforeEach(() => {
  calls = [];
  state = { rpc: rpcResult(), turnstile: true, resendStatus: 200 };
  realFetch = globalThis.fetch;
  realConsoleError = console.error;
  console.error = () => {};
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const method = init.method || 'GET';
    let body = null;
    try { body = init.body ? JSON.parse(init.body) : null; } catch { body = String(init.body); }
    calls.push({ url: u, method, body });
    if (u.includes('challenges.cloudflare.com')) return new Response(JSON.stringify({ success: state.turnstile }), { status: 200 });
    if (u.endsWith('/rpc/partner_claim')) return new Response(JSON.stringify(state.rpc), { status: 200 });
    if (u === 'https://api.resend.com/emails') {
      return new Response(JSON.stringify({ id: `email_${calls.filter((c) => c.url === u).length}` }), { status: state.resendStatus });
    }
    if (method === 'GET') return new Response('[]', { status: 200 });
    return new Response(null, { status: method === 'POST' ? 201 : 204 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; console.error = realConsoleError; });

const good = { partner: 'arsenal', first_name: 'Sam', last_name: 'Lee', email: 'sam@example.com', device: 'iphone', location: 'Arvada', member: true, newsletter: false, src: 'ig', turnstile: 'tok', t: 6000 };
const post = (over = {}, headers = {}) =>
  onRequestPost({
    request: new Request('https://groundapp.live/api/partner/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://groundapp.live', 'cf-connecting-ip': '203.0.113.9', ...headers },
      body: JSON.stringify({ ...good, ...over }),
    }),
    env,
  });
const sends = () => calls.filter((c) => c.url === 'https://api.resend.com/emails');
const rpcs = () => calls.filter((c) => c.url.endsWith('/rpc/partner_claim'));
const patches = () => calls.filter((c) => c.method === 'PATCH' && c.url.includes('partner_claims'));

test('new iPhone claim: code emailed, reminder scheduled, claim stamped', async () => {
  const res = await post();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, status: 'assigned' });

  const [mail, nudge] = sends();
  assert.equal(sends().length, 2);
  assert.deepEqual(mail.body.to, ['sam@example.com']);
  assert.ok(mail.body.html.includes(CODE));
  assert.ok(mail.body.html.includes(`https://groundapp.live/arsenal/r/${TOKEN}`));
  assert.equal(mail.body.scheduled_at, undefined);
  const due = Date.parse(nudge.body.scheduled_at) - Date.now();
  assert.ok(due > 2.9 * 86400e3 && due < 3.1 * 86400e3);
  assert.ok(nudge.body.headers['List-Unsubscribe']);

  assert.equal(patches().length, 1);
  assert.ok(patches()[0].url.includes('id=eq.c1'));
  assert.ok(patches()[0].body.emailed_at);
  assert.equal(patches()[0].body.nudge_email_id, 'email_2');
});

test('the database gets clean values, a 22 character token and a hashed ip', async () => {
  await post({ first_name: '  Sam ', email: 'Sam.Lee+gym@Gmail.com' });
  const b = rpcs()[0].body;
  assert.equal(b.p_partner, 'arsenal');
  assert.equal(b.p_first, 'Sam');
  assert.equal(b.p_email, 'sam.lee+gym@gmail.com');
  assert.equal(b.p_email_key, 'samlee@gmail.com');
  assert.equal(b.p_src, 'ig');
  assert.match(b.p_token, /^[A-Za-z0-9_-]{22}$/);
  assert.match(b.p_ip_hash, /^[0-9a-f]{32}$/);
  assert.ok(!JSON.stringify(b).includes('203.0.113.9'));
});

test('the response never carries the code, the token or the link', async () => {
  const text = await (await post()).text();
  assert.ok(!text.includes(CODE));
  assert.ok(!text.includes(TOKEN));
});

test('repeat within 15 minutes: no email, status existing', async () => {
  state.rpc = rpcResult({ outcome: 'existing', claim: claimRow({ emailed_at: new Date(Date.now() - 5 * 60e3).toISOString() }) });
  assert.deepEqual(await (await post()).json(), { ok: true, status: 'existing' });
  assert.equal(sends().length, 0);
  assert.equal(patches().length, 0);
});

test('repeat after 15 minutes: the same code is sent again, no second reminder', async () => {
  state.rpc = rpcResult({ outcome: 'existing', claim: claimRow({ emailed_at: new Date(Date.now() - 20 * 60e3).toISOString() }) });
  assert.deepEqual(await (await post()).json(), { ok: true, status: 'existing' });
  assert.equal(sends().length, 1);
  assert.ok(sends()[0].body.html.includes(CODE));
  assert.equal(patches()[0].body.nudge_email_id, undefined);
});

test('android: on the list, one email without a code', async () => {
  state.rpc = rpcResult({ outcome: 'android_waitlist', claim: claimRow({ status: 'android_waitlist' }), code: null, redeem_url: null });
  assert.deepEqual(await (await post({ device: 'android' })).json(), { ok: true, status: 'android' });
  assert.equal(rpcs()[0].body.p_device, 'android');
  assert.equal(sends().length, 1);
  assert.match(sends()[0].body.subject, /Android/);
});

test('bank empty: waitlist email, status waitlist', async () => {
  state.rpc = rpcResult({ outcome: 'waitlist', claim: claimRow({ status: 'waitlist' }), code: null, redeem_url: null, codes_left: 0 });
  assert.deepEqual(await (await post()).json(), { ok: true, status: 'waitlist' });
  assert.equal(sends().length, 1);
  assert.match(sends()[0].body.subject, /on the list/);
});

test('a repeat from someone on the waitlist stays waitlist', async () => {
  state.rpc = rpcResult({ outcome: 'existing', claim: claimRow({ status: 'waitlist' }), code: null, redeem_url: null });
  assert.deepEqual(await (await post()).json(), { ok: true, status: 'waitlist' });
});

test('crossing 75 codes left emails Collin', async () => {
  state.rpc = rpcResult({ codes_left: 75 });
  await post();
  const alert = sends().find((c) => c.body.to[0] === 'collin@example.com');
  assert.ok(alert);
  assert.match(alert.body.subject, /75 codes left/);
});

test('74 codes left does not alert', async () => {
  state.rpc = rpcResult({ codes_left: 74 });
  await post();
  assert.equal(sends().filter((c) => c.body.to[0] === 'collin@example.com').length, 0);
});

test('email refused: 502, the error is stored on the claim', async () => {
  state.resendStatus = 500;
  const res = await post();
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { ok: false, error: 'email' });
  assert.ok(patches()[0].body.email_error);
  assert.equal(patches()[0].body.emailed_at, undefined);
});

test('newsletter box ticked: added to the list as arsenal', async () => {
  await post({ newsletter: true });
  const ins = calls.find((c) => c.method === 'POST' && c.url.endsWith('/newsletter_subscribers'));
  assert.equal(ins.body.email, 'sam@example.com');
  assert.equal(ins.body.source, 'groundapp_site:arsenal');
});

test('newsletter box not ticked: the list is not touched', async () => {
  await post();
  assert.equal(calls.filter((c) => c.url.includes('newsletter_')).length, 0);
});

test('missing member tick: 400 and nothing is called', async () => {
  const res = await post({ member: false });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { ok: false, error: 'invalid', field: 'member' });
  assert.equal(calls.length, 0);
});

test('honeypot filled: pretend success, nothing is called', async () => {
  assert.deepEqual(await (await post({ website: 'http://spam' })).json(), { ok: true, status: 'assigned' });
  assert.equal(calls.length, 0);
});

test('bot check fails: 403 and the database is not called', async () => {
  state.turnstile = false;
  const res = await post();
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { ok: false, error: 'bot_check' });
  assert.equal(rpcs().length, 0);
});

test('database outcomes map to errors', async () => {
  state.rpc = { outcome: 'rate_limited' };
  assert.equal((await post()).status, 429);
  state.rpc = { outcome: 'bad_location' };
  assert.deepEqual(await (await post()).json(), { ok: false, error: 'invalid', field: 'location' });
  state.rpc = { outcome: 'unknown_partner' };
  assert.deepEqual(await (await post()).json(), { ok: false, error: 'invalid', field: 'partner' });
});

test('foreign origin: 403', async () => {
  assert.equal((await post({}, { origin: 'https://evil.example' })).status, 403);
});

test('no Turnstile secret (previews): 503', async () => {
  const res = await onRequestPost({
    request: new Request('https://groundapp.live/api/partner/claim', { method: 'POST', headers: { origin: 'https://groundapp.live' }, body: JSON.stringify(good) }),
    env: { ...env, TURNSTILE_SECRET: undefined },
  });
  assert.equal(res.status, 503);
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `node --test test/partner-claim.test.mjs 2>&1 | tail -12`
Expected: failure mentioning `Cannot find module` for `functions/api/partner/claim.js`.

- [ ] **Step 3: Write the implementation**

Create `lib/partner-delivery.js`:

```js
// Delivery for partner claims: the email that matches a claim's status, the scheduled reminder, and alerts to Collin.
// Shared by POST /api/partner/claim and the admin API (resend, waitlist release).
import { unsubscribeUrl } from './util.js';
import { redeemLink, RESEND_WINDOW_MS, NUDGE_AFTER_MS } from './partner.js';
import { renderClaimEmail, renderNudgeEmail, renderAndroidEmail, renderWaitlistEmail, renderAlertEmail, sendEmail } from './partner-email.js';

const PARTNER_NAMES = { arsenal: 'Arsenal Health' };

// r is a partner_claim result: { claim: { id, status, first_name, email, token }, code }.
// Returns { ok, id, error, nudgeId }.
export async function sendForClaim(env, partner, r, { withNudge }) {
  const claim = r.claim;
  const common = { partnerName: PARTNER_NAMES[partner] || partner, firstName: claim.first_name, mailingAddress: env.MAILING_ADDRESS };
  // One send per claim per 15 minute slot, even if two requests race.
  const slot = Math.floor(Date.now() / RESEND_WINDOW_MS);

  if (claim.status === 'android_waitlist') {
    const m = renderAndroidEmail(common);
    return { ...(await sendEmail(env, { to: claim.email, ...m, idempotencyKey: `partner-android/${claim.id}/${slot}`, tag: 'partner_android' })), nudgeId: null };
  }
  if (claim.status === 'waitlist') {
    const m = renderWaitlistEmail(common);
    return { ...(await sendEmail(env, { to: claim.email, ...m, idempotencyKey: `partner-waitlist/${claim.id}/${slot}`, tag: 'partner_waitlist' })), nudgeId: null };
  }

  const link = redeemLink(partner, claim.token);
  const sent = await sendEmail(env, { to: claim.email, ...renderClaimEmail({ ...common, code: r.code, link }), idempotencyKey: `partner-claim/${claim.id}/${slot}`, tag: 'partner_claim' });
  if (!sent.ok || !withNudge) return { ...sent, nudgeId: null };

  const unsubUrl = await unsubscribeUrl(env, claim.email);
  const nudge = await sendEmail(env, {
    to: claim.email,
    ...renderNudgeEmail({ ...common, link, unsubUrl }),
    idempotencyKey: `partner-nudge/${claim.id}`,
    tag: 'partner_nudge',
    scheduledAt: new Date(Date.now() + NUDGE_AFTER_MS).toISOString(),
    headers: { 'List-Unsubscribe': `<${unsubUrl}>, <mailto:collin@groundapp.live?subject=unsubscribe>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
  return { ...sent, nudgeId: nudge.id };
}

// event: 'low_stock' | 'email_failed'. Goes to the first address in ADMIN_EMAILS.
export async function alertAdmin(env, partner, event, detail) {
  const to = String(env.ADMIN_EMAILS || '').split(',')[0].trim();
  if (!to) return;
  await sendEmail(env, { to, ...renderAlertEmail({ partner, event, detail }), tag: 'partner_alert' });
}
```

Create `functions/api/partner/claim.js`:

```js
// POST /api/partner/claim
// A partner's member asks for their free-year code. The database locks one unique code to them (db/2026-11-13_partner_codes.sql,
// partner_claim) and the code goes out by email only: the response never carries it, so every code needs a working inbox.
import { json, supabase, sha256Hex } from '../../../lib/util.js';
import { validateClaim, newToken, LOW_STOCK, RESEND_WINDOW_MS } from '../../../lib/partner.js';
import { sendForClaim, alertAdmin } from '../../../lib/partner-delivery.js';
import { upsertSubscriber, stampEmailed } from '../../../lib/list.js';

const ALLOWED_ORIGIN = /^https:\/\/((www\.)?groundapp\.live|([a-z0-9-]+\.)?groundapp\.pages\.dev)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGIN.test(origin)) return json({ ok: false, error: 'forbidden' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid', field: 'body' }, 400); }

  // Bots: filled the hidden field or submitted faster than a person can type. Pretend it worked.
  if (body.website || (typeof body.t === 'number' && body.t < 1500)) return json({ ok: true, status: 'assigned' });

  const v = validateClaim(body);
  if (v.error) return json({ ok: false, error: 'invalid', field: v.error }, 400);
  const c = v.value;

  if (!env.TURNSTILE_SECRET) return json({ ok: false, error: 'not_configured' }, 503);
  const ip = request.headers.get('cf-connecting-ip') || '';
  if (!(await turnstileOk(env, body.turnstile, ip))) return json({ ok: false, error: 'bot_check' }, 403);

  try {
    const rpc = await supabase(env, 'rpc/partner_claim', {
      method: 'POST',
      body: {
        p_partner: c.partner, p_first: c.firstName, p_last: c.lastName, p_email: c.email, p_email_key: c.emailKey,
        p_device: c.device, p_location: c.location, p_src: c.src, p_newsletter: c.newsletter, p_token: newToken(),
        p_ip_hash: ip ? (await sha256Hex(`${env.UNSUBSCRIBE_SECRET}:ip:${ip}`)).slice(0, 32) : null,
      },
    });
    if (!rpc.ok) throw new Error(`partner_claim ${rpc.status} ${JSON.stringify(rpc.data).slice(0, 200)}`);
    const r = rpc.data;
    if (r.outcome === 'unknown_partner') return json({ ok: false, error: 'invalid', field: 'partner' }, 400);
    if (r.outcome === 'bad_location') return json({ ok: false, error: 'invalid', field: 'location' }, 400);
    if (r.outcome === 'rate_limited') return json({ ok: false, error: 'rate_limited' }, 429);

    const claim = r.claim;
    const isNew = r.outcome !== 'existing';
    const status = claim.status === 'android_waitlist' ? 'android' : claim.status === 'waitlist' ? 'waitlist' : isNew ? 'assigned' : 'existing';

    const emailedRecently = claim.emailed_at && Date.now() - Date.parse(claim.emailed_at) < RESEND_WINDOW_MS;
    if (!emailedRecently) {
      const sent = await sendForClaim(env, c.partner, r, { withNudge: isNew });
      const patch = sent.ok
        ? { emailed_at: new Date().toISOString(), email_error: null, ...(sent.nudgeId ? { nudge_email_id: sent.nudgeId } : {}) }
        : { email_error: sent.error };
      await supabase(env, `partner_claims?id=eq.${claim.id}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
      if (!sent.ok) {
        await alertAdmin(env, c.partner, 'email_failed', `${claim.email}: ${sent.error}`);
        return json({ ok: false, error: 'email' }, 502);
      }
    }

    if (isNew) {
      if (c.newsletter) await joinList(env, c);
      if (r.outcome === 'assigned' && LOW_STOCK.includes(r.codes_left)) {
        await alertAdmin(env, c.partner, 'low_stock', `${r.codes_left} codes left`);
      }
    }
    return json({ ok: true, status });
  } catch (err) {
    console.error('partner claim error', err?.message || err);
    return json({ ok: false, error: 'server' }, 500);
  }
}

async function turnstileOk(env, token, ip) {
  if (!token || typeof token !== 'string') return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip || undefined }),
    });
    return (await res.json()).success === true;
  } catch (err) {
    console.error('turnstile error', err?.message || err);
    return false;
  }
}

// The newsletter tick box. The code email is their welcome, so stamp last_emailed_at instead of sending the site welcome.
async function joinList(env, c) {
  try {
    const { state } = await upsertSubscriber(env, { email: c.email, firstName: c.firstName, source: `groundapp_site:${c.partner}` });
    if (state === 'new' || state === 'reactivated') await stampEmailed(env, c.email);
  } catch (err) {
    console.error('partner list join failed', err?.message || err);
  }
}

export function onRequest() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm test 2>&1 | tail -8`
Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/partner-delivery.js functions/api/partner/claim.js test/partner-claim.test.mjs
git commit -m "POST /api/partner/claim: lock a code, email it, schedule the reminder"
```

---

### Task 6: The member's link (`functions/arsenal/r/[token].js`)

The non-iPhone page links `/assets/css/arsenal-v1.css` and `/assets/js/arsenal-qr-v1.js`. Both are created in Part 2; the page works without them (the code and steps are plain text) and gains its look and the QR code when they exist.

**Files:**
- Create: `functions/arsenal/r/[token].js`
- Test: `test/partner-redeem.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `test/partner-redeem.test.mjs`:

```js
// test/partner-redeem.test.mjs: GET /arsenal/r/<token>.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/arsenal/r/[token].js';

const env = { SUPABASE_URL: 'https://sb.example.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_service', RESEND_API_KEY: 're_test' };
const TOKEN = 'abcdefghijklmnopqrstuv';
const APPLE = 'https://apps.apple.com/redeem?ctx=offercodes&id=6760352779&code=ABC123XYZ';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

let calls;
let state;
let realFetch;
let waited;

beforeEach(() => {
  calls = [];
  waited = [];
  state = { tap: { found: true, partner: 'arsenal', status: 'assigned', first_tap: true, nudge_email_id: 'email_2', code: 'ABC123XYZ', redeem_url: APPLE } };
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
    if (String(url).endsWith('/rpc/partner_tap')) return new Response(JSON.stringify(state.tap), { status: 200 });
    return new Response('{}', { status: 200 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const get = (token, ua) =>
  onRequestGet({
    params: { token },
    request: new Request(`https://groundapp.live/arsenal/r/${token}`, { headers: { 'user-agent': ua } }),
    env,
    waitUntil: (p) => waited.push(p),
  });

test('iPhone: counted, reminder cancelled, redirected to Apple', async () => {
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), APPLE);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: true });
  await Promise.all(waited);
  assert.ok(calls.some((c) => c.url === 'https://api.resend.com/emails/email_2/cancel' && c.method === 'POST'));
});

test('iPhone, second tap: redirected, nothing to cancel', async () => {
  state.tap = { ...state.tap, first_tap: false, nudge_email_id: null };
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 302);
  await Promise.all(waited);
  assert.equal(calls.filter((c) => c.url.includes('resend.com')).length, 0);
});

test('laptop: a page with the code and the link, not counted', async () => {
  const res = await get(TOKEN, MAC);
  assert.equal(res.status, 200);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: false });
  const html = await res.text();
  assert.ok(html.includes('ABC123XYZ'));
  assert.ok(html.includes(`data-qr="https://groundapp.live/arsenal/r/${TOKEN}"`));
  assert.ok(html.includes('Open this on your iPhone'));
  assert.equal(res.headers.get('x-robots-tag'), 'noindex');
});

test('a waitlist claim has no code yet: says so', async () => {
  state.tap = { found: true, partner: 'arsenal', status: 'waitlist', first_tap: false, nudge_email_id: null, code: null, redeem_url: null };
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes('on the list'));
});

test('unknown token: 404 with a way back', async () => {
  state.tap = { found: false };
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 404);
  assert.ok((await res.text()).includes('href="/arsenal"'));
});

test('malformed token: 404 without calling the database', async () => {
  const res = await get('nope', IPHONE);
  assert.equal(res.status, 404);
  assert.equal(calls.length, 0);
});

test("another partner's token does not work here", async () => {
  state.tap = { ...state.tap, partner: 'othergym' };
  assert.equal((await get(TOKEN, IPHONE)).status, 404);
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `node --test test/partner-redeem.test.mjs 2>&1 | tail -12`
Expected: failure mentioning `Cannot find module`.

- [ ] **Step 3: Write the implementation**

Create `functions/arsenal/r/[token].js`:

```js
// GET /arsenal/r/<token>: an Arsenal member's own link from their email.
// iPhone or iPad: count the tap, cancel the reminder, go to Apple's redemption page with their code.
// Anything else: a page that says to open it on the iPhone, with a QR code of this link and the code typed out.
// Only iPhone taps count, so mail scanners that prefetch links don't look like members.
import { html, supabase, escapeHtml as esc } from '../../../lib/util.js';
import { isToken, isIosUA, redeemLink } from '../../../lib/partner.js';
import { cancelEmail } from '../../../lib/partner-email.js';

const PARTNER = 'arsenal';
const PARTNER_NAME = 'Arsenal Health';

function page({ title, heading, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<link rel="stylesheet" href="/assets/css/arsenal-v1.css"></head>
<body class="ax-redeem"><main class="ax-redeem-card">
<p class="ax-lockup">ARSENAL HEALTH × GroundApp</p>
<h1>${esc(heading)}</h1>
${body}
<p><a href="/${PARTNER}">Back to the ${esc(PARTNER_NAME)} page</a></p>
</main><script src="/assets/js/arsenal-qr-v1.js" defer></script></body></html>`;
}

const notFound = () =>
  html(page({ title: 'Link not found', heading: "This link didn't match a code.", body: `<p>Check the link in your email, or ask for your code again.</p>` }), 404);

export async function onRequestGet({ params, request, env, waitUntil }) {
  const token = String(params.token || '');
  if (!isToken(token)) return notFound();

  const ios = isIosUA(request.headers.get('user-agent'));
  const rpc = await supabase(env, 'rpc/partner_tap', { method: 'POST', body: { p_token: token, p_ios: ios } });
  if (!rpc.ok) {
    console.error('partner_tap failed', rpc.status);
    return html(page({ title: 'Try again', heading: 'Something went wrong on our side.', body: '<p>Give it a minute and tap your link again.</p>' }), 500);
  }
  const t = rpc.data;
  if (!t.found || t.partner !== PARTNER) return notFound();

  if (t.status !== 'assigned' || !t.redeem_url) {
    return html(page({
      title: "You're on the list",
      heading: "You're on the list.",
      body: '<p>Your code is not ready yet. It will arrive by email as soon as it is.</p>',
    }));
  }

  if (ios) {
    if (t.first_tap && t.nudge_email_id) waitUntil(cancelEmail(env, t.nudge_email_id));
    return new Response(null, { status: 302, headers: { location: t.redeem_url, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  }

  const link = redeemLink(PARTNER, token);
  return html(page({
    title: 'Open this on your iPhone',
    heading: 'Open this on your iPhone',
    body: `<p>Your free year of GroundApp Premium is redeemed in the App Store on your iPhone. Point your iPhone camera at this code, or open the email on your iPhone and tap the button.</p>
<div class="ax-qr" data-qr="${esc(link)}" role="img" aria-label="QR code for your link"></div>
<p>Or enter it by hand: App Store &gt; your picture &gt; Redeem Gift Card or Code.</p>
<p class="ax-code">${esc(t.code)}</p>`,
  }));
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm test 2>&1 | tail -8`
Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add "functions/arsenal/r/[token].js" test/partner-redeem.test.mjs
git commit -m "GET /arsenal/r/<token>: redirect to Apple on iPhone, QR page elsewhere"
```

---

### Task 7: Admin API (`functions/api/admin/partner.js`)

**Files:**
- Create: `functions/api/admin/partner.js`
- Test: `test/partner-admin.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `test/partner-admin.test.mjs`:

```js
// test/partner-admin.test.mjs: /api/admin/partner. Uses the local-dev admin bypass from lib/access.js.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestPost } from '../functions/api/admin/partner.js';

const env = { SUPABASE_URL: 'https://sb.example.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_service', RESEND_API_KEY: 're_test', UNSUBSCRIBE_SECRET: 's', DEV_ADMIN_BYPASS: '1', MAILING_ADDRESS: '123 Test St' };
const result = (id, status = 'assigned') => ({
  outcome: 'assigned',
  claim: { id, status, first_name: 'Sam', email: `${id}@example.com`, token: 'abcdefghijklmnopqrstuv', emailed_at: null },
  code: status === 'assigned' ? `CODE${id}` : null, redeem_url: status === 'assigned' ? `https://apps.apple.com/redeem?code=CODE${id}` : null, codes_left: 10,
});

let calls;
let state;
let realFetch;
beforeEach(() => {
  calls = [];
  state = { claimRows: [{ id: 'c1', partner: 'arsenal', status: 'assigned', first_name: 'Sam', email: 'c1@example.com', token: 'abcdefghijklmnopqrstuv', emailed_at: null }], codeRows: [{ code: 'CODEc1', redeem_url: 'https://apps.apple.com/redeem?code=CODEc1' }], released: [result('w1'), result('w2')] };
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const method = init.method || 'GET';
    calls.push({ url: u, method, body: init.body ? JSON.parse(init.body) : null });
    if (u.endsWith('/rpc/partner_admin_summary')) return new Response(JSON.stringify({ program: { slug: 'arsenal', status: 'live' }, codes: { left: 440 }, rows: [] }), { status: 200 });
    if (u.endsWith('/rpc/partner_release_waitlist')) return new Response(JSON.stringify(state.released), { status: 200 });
    if (method === 'GET' && u.includes('partner_claims')) return new Response(JSON.stringify(state.claimRows), { status: 200 });
    if (method === 'GET' && u.includes('partner_codes')) return new Response(JSON.stringify(state.codeRows), { status: 200 });
    if (u === 'https://api.resend.com/emails') return new Response(JSON.stringify({ id: 'email_1' }), { status: 200 });
    return new Response(null, { status: 204 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const get = (qs, e = env) => onRequestGet({ request: new Request(`http://localhost:8788/api/admin/partner${qs}`), env: e });
const post = (body, e = env) =>
  onRequestPost({ request: new Request('http://localhost:8788/api/admin/partner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: e });
const sends = () => calls.filter((c) => c.url === 'https://api.resend.com/emails');

test('not signed in: refused', async () => {
  const res = await get('?slug=arsenal', { ...env, DEV_ADMIN_BYPASS: undefined });
  assert.ok(res.status === 401 || res.status === 503);
  assert.equal(calls.length, 0);
});

test('GET returns the summary for the partner', async () => {
  const res = await get('?slug=arsenal');
  const j = await res.json();
  assert.equal(j.ok, true);
  assert.equal(j.codes.left, 440);
  assert.deepEqual(calls[0].body, { p_partner: 'arsenal' });
});

test('GET rejects a bad slug', async () => {
  assert.equal((await get('?slug=../x')).status, 400);
});

test('pause and resume set the partner status', async () => {
  await post({ action: 'pause', slug: 'arsenal' });
  assert.ok(calls[0].url.includes('partner_programs?slug=eq.arsenal'));
  assert.deepEqual(calls[0].body, { status: 'paused' });
  await post({ action: 'resume', slug: 'arsenal' });
  assert.deepEqual(calls[1].body, { status: 'live' });
});

test('resend sends the claim its code again and stamps it', async () => {
  const res = await post({ action: 'resend', slug: 'arsenal', claim_id: 'c1' });
  assert.deepEqual(await res.json(), { ok: true, sent: 1 });
  assert.equal(sends().length, 1);
  assert.ok(sends()[0].body.html.includes('CODEc1'));
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.url.includes('partner_claims?id=eq.c1') && c.body.emailed_at));
});

test('resend for an unknown claim: 404', async () => {
  state.claimRows = [];
  assert.equal((await post({ action: 'resend', slug: 'arsenal', claim_id: 'c2' })).status, 404);
});

test('release_waitlist emails each released claim with a reminder', async () => {
  const res = await post({ action: 'release_waitlist', slug: 'arsenal' });
  assert.deepEqual(await res.json(), { ok: true, sent: 2, failed: 0 });
  assert.deepEqual(calls[0].body, { p_partner: 'arsenal', p_limit: 10 });
  assert.equal(sends().filter((c) => !c.body.scheduled_at).length, 2);
  assert.equal(sends().filter((c) => c.body.scheduled_at).length, 2);
});

test('unknown action: 400', async () => {
  assert.equal((await post({ action: 'drop_tables', slug: 'arsenal' })).status, 400);
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `node --test test/partner-admin.test.mjs 2>&1 | tail -12`
Expected: failure mentioning `Cannot find module`.

- [ ] **Step 3: Write the implementation**

Create `functions/api/admin/partner.js`:

```js
// /api/admin/partner (behind Cloudflare Access, see lib/access.js)
// GET  ?slug=arsenal                          everything the Partners panel shows
// POST { action: 'pause' | 'resume', slug }   turn the form into a waitlist, or back
// POST { action: 'resend', slug, claim_id }   send one member their email again
// POST { action: 'release_waitlist', slug }   give up to 10 waiting iPhone claims a code and email them
import { json, supabase } from '../../../lib/util.js';
import { requireAdmin } from '../../../lib/access.js';
import { sendForClaim } from '../../../lib/partner-delivery.js';

const SLUG_RE = /^[a-z0-9-]{2,40}$/;
const UUID_RE = /^[0-9a-f-]{2,36}$/i;

export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const slug = new URL(request.url).searchParams.get('slug') || '';
  if (!SLUG_RE.test(slug)) return json({ ok: false, error: 'invalid' }, 400);
  const rpc = await supabase(env, 'rpc/partner_admin_summary', { method: 'POST', body: { p_partner: slug } });
  if (!rpc.ok) { console.error('partner summary failed', rpc.status); return json({ ok: false, error: 'server' }, 500); }
  return json({ ok: true, generated_at: new Date().toISOString(), ...rpc.data });
}

export async function onRequestPost({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid' }, 400); }
  const slug = String(body.slug || '');
  if (!SLUG_RE.test(slug)) return json({ ok: false, error: 'invalid' }, 400);

  try {
    if (body.action === 'pause' || body.action === 'resume') {
      const upd = await supabase(env, `partner_programs?slug=eq.${slug}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: body.action === 'pause' ? 'paused' : 'live' } });
      if (!upd.ok) throw new Error(`status ${upd.status}`);
      return json({ ok: true });
    }

    if (body.action === 'resend') {
      const id = String(body.claim_id || '');
      if (!UUID_RE.test(id)) return json({ ok: false, error: 'invalid' }, 400);
      const [claims, codes] = await Promise.all([
        supabase(env, `partner_claims?id=eq.${id}&partner=eq.${slug}&select=id,status,first_name,email,token,emailed_at`),
        supabase(env, `partner_codes?claim_id=eq.${id}&select=code,redeem_url`),
      ]);
      if (!claims.ok || !codes.ok) throw new Error(`lookup ${claims.status}/${codes.status}`);
      const claim = claims.data[0];
      if (!claim) return json({ ok: false, error: 'not_found' }, 404);
      const sent = await deliver(env, slug, { claim, code: codes.data[0]?.code || null, redeem_url: codes.data[0]?.redeem_url || null }, false);
      return sent ? json({ ok: true, sent: 1 }) : json({ ok: false, error: 'email' }, 502);
    }

    if (body.action === 'release_waitlist') {
      const rpc = await supabase(env, 'rpc/partner_release_waitlist', { method: 'POST', body: { p_partner: slug, p_limit: 10 } });
      if (!rpc.ok) throw new Error(`release ${rpc.status}`);
      let sent = 0;
      let failed = 0;
      for (const r of rpc.data) (await deliver(env, slug, r, true)) ? sent++ : failed++;
      return json({ ok: true, sent, failed });
    }

    return json({ ok: false, error: 'invalid' }, 400);
  } catch (err) {
    console.error('partner admin error', err?.message || err);
    return json({ ok: false, error: 'server' }, 500);
  }
}

async function deliver(env, slug, r, withNudge) {
  const sent = await sendForClaim(env, slug, r, { withNudge });
  const patch = sent.ok
    ? { emailed_at: new Date().toISOString(), email_error: null, ...(sent.nudgeId ? { nudge_email_id: sent.nudgeId } : {}) }
    : { email_error: sent.error };
  await supabase(env, `partner_claims?id=eq.${r.claim.id}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
  return sent.ok;
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm test 2>&1 | tail -8`
Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add functions/api/admin/partner.js test/partner-admin.test.mjs
git commit -m "Admin API for partner claims: summary, pause, resend, release waitlist"
```

---

### Task 8: Code loader, concurrency check, headers

**Files:**
- Create: `scripts/load-partner-codes.mjs`, `scripts/partner-concurrency.mjs`
- Modify: `site/_headers` (append), `wrangler.toml` (the secrets comment at the top)
- Test: `test/load-codes.test.mjs`

- [ ] **Step 1: Write the failing test for the CSV parser**

Create `test/load-codes.test.mjs`:

```js
// test/load-codes.test.mjs: reading Apple's one-time code sheet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCodesCsv } from '../scripts/load-partner-codes.mjs';

const head = '#,Code,Redeem link,Given to,Date given,Notes';
const url = (c) => `https://apps.apple.com/redeem?ctx=offercodes&id=6760352779&code=${c}`;

test('reads number, code and link from each row', () => {
  const rows = parseCodesCsv(`${head}\n51,AAAABBBBCCCCDDDD11,${url('AAAABBBBCCCCDDDD11')},,,\r\n52,AAAABBBBCCCCDDDD22,${url('AAAABBBBCCCCDDDD22')},,,\n`);
  assert.deepEqual(rows, [
    { seq: 51, code: 'AAAABBBBCCCCDDDD11', redeem_url: url('AAAABBBBCCCCDDDD11') },
    { seq: 52, code: 'AAAABBBBCCCCDDDD22', redeem_url: url('AAAABBBBCCCCDDDD22') },
  ]);
});

test('refuses a row whose link does not carry its code', () => {
  assert.throws(() => parseCodesCsv(`${head}\n51,AAAABBBBCCCCDDDD11,${url('SOMETHINGELSE00000')},,,\n`), /row 2/);
});

test('refuses a duplicate code', () => {
  const row = `51,AAAABBBBCCCCDDDD11,${url('AAAABBBBCCCCDDDD11')},,,`;
  assert.throws(() => parseCodesCsv(`${head}\n${row}\n${row}\n`), /duplicate/);
});

test('refuses a sheet with the wrong header', () => {
  assert.throws(() => parseCodesCsv('code\nAAAA\n'), /header/);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `node --test test/load-codes.test.mjs 2>&1 | tail -8`
Expected: failure mentioning `Cannot find module`.

- [ ] **Step 3: Write the loader**

Create `scripts/load-partner-codes.mjs`:

```js
#!/usr/bin/env node
// Loads one-time App Store offer codes into partner_codes. Run on Collin's Mac only.
//
//   node scripts/load-partner-codes.mjs <codes.csv> --partner arsenal --batch 639153 --expires 2027-05-03 [--dry-run]
//
// The CSV lives OUTSIDE this repo (it is the codes). Columns: #,Code,Redeem link,... as exported on 2026-11-04.
// Supabase URL and service role key come from .dev.vars at the repo root. Codes already loaded are skipped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseCodesCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!/^#,Code,Redeem link/i.test(lines[0] || '')) throw new Error('unexpected header: want "#,Code,Redeem link,..."');
  const seen = new Set();
  return lines.slice(1).map((line, i) => {
    const [n, code, redeem_url] = line.split(',');
    const seq = Number(n);
    if (!Number.isInteger(seq) || !/^[A-Z0-9]{10,24}$/.test(code || '') || !String(redeem_url).startsWith('https://apps.apple.com/redeem?') || !redeem_url.endsWith(`code=${code}`)) {
      throw new Error(`row ${i + 2} is not a number, a code and its Apple link`);
    }
    if (seen.has(code)) throw new Error(`duplicate code at row ${i + 2}`);
    seen.add(code);
    return { seq, code, redeem_url };
  });
}

function devVars() {
  const out = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
  const partner = opt('partner');
  const batch = opt('batch');
  const expires = opt('expires');
  if (!file || !partner || !batch || !/^\d{4}-\d{2}-\d{2}$/.test(expires || '')) {
    console.error('usage: node scripts/load-partner-codes.mjs <codes.csv> --partner <slug> --batch <id> --expires YYYY-MM-DD [--dry-run]');
    process.exit(1);
  }
  if (path.resolve(file).startsWith(ROOT + path.sep)) {
    console.error('error: the code CSV must stay outside this repo (the repo is public).');
    process.exit(1);
  }
  const rows = parseCodesCsv(fs.readFileSync(file, 'utf8')).map((r) => ({ ...r, partner, batch, expires_on: expires }));
  console.log(`${rows.length} codes read, numbers ${rows[0].seq} to ${rows[rows.length - 1].seq}.`);
  if (args.includes('--dry-run')) return;

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = devVars();
  const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/partner_codes?on_conflict=code`, {
    method: 'POST',
    headers: { ...headers, prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) { console.error(`error: insert failed ${res.status} ${await res.text()}`); process.exit(1); }

  const count = await fetch(`${SUPABASE_URL}/rest/v1/partner_codes?partner=eq.${partner}&select=id`, { headers: { ...headers, prefer: 'count=exact', range: '0-0' } });
  console.log(`partner_codes now holds ${count.headers.get('content-range')?.split('/')[1]} codes for ${partner}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
```

- [ ] **Step 4: Run the test and see it pass**

Run: `npm test 2>&1 | tail -8`
Expected: `# fail 0`.

- [ ] **Step 5: Write the concurrency check**

Create `scripts/partner-concurrency.mjs`:

```js
#!/usr/bin/env node
// Proves the claim function under load, against the real database, with throwaway rows:
// 20 people claim at the same moment and only 5 codes exist. Expect 5 assigned, 15 waitlist, no code given twice,
// and a repeat by the same person returning the same claim. Removes everything it created.
//
//   node scripts/partner-concurrency.mjs        (run after db/2026-11-13_partner_codes.sql is applied)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vars = {};
for (const line of fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) vars[m[1]] = m[2].replace(/^"|"$/g, '');
}
const headers = { apikey: vars.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${vars.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' };
const rest = async (p, init = {}) => {
  const res = await fetch(`${vars.SUPABASE_URL}/rest/v1/${p}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${p}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
};

const slug = `zz-test-${Date.now()}`;
const claim = (i) =>
  rest('rpc/partner_claim', {
    method: 'POST',
    body: JSON.stringify({
      p_partner: slug, p_first: 'Test', p_last: `Person${i}`, p_email: `t${i}@example.com`, p_email_key: `t${i}@example.com`,
      p_device: 'iphone', p_location: 'Gym', p_src: null, p_newsletter: false, p_token: `${slug}-${i}`.padEnd(22, 'x').slice(-22), p_ip_hash: null,
    }),
  });

let failed = false;
const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failed = true; };

try {
  await rest('partner_programs', { method: 'POST', body: JSON.stringify({ slug, name: 'Concurrency test', locations: ['Gym'] }) });
  await rest('partner_codes', {
    method: 'POST',
    body: JSON.stringify([1, 2, 3, 4, 5].map((n) => ({ partner: slug, seq: n, code: `ZZTEST${Date.now()}${n}`, redeem_url: 'https://example.com/test', batch: 'test', expires_on: '2099-01-01' }))),
  });

  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => claim(i)));
  const assigned = results.filter((r) => r.outcome === 'assigned');
  const waitlist = results.filter((r) => r.outcome === 'waitlist');
  check(assigned.length === 5, `5 assigned (got ${assigned.length})`);
  check(waitlist.length === 15, `15 waitlist (got ${waitlist.length})`);
  check(new Set(assigned.map((r) => r.code)).size === 5, 'no code given twice');
  check(Math.min(...results.map((r) => r.codes_left)) === 0, 'bank reads 0 at the end');

  const again = await Promise.all([claim(0), claim(0), claim(0)]);
  check(again.every((r) => r.outcome === 'existing' && r.claim.id === results[0].claim.id), 'a repeat returns the same claim');

  const rows = await rest(`partner_codes?partner=eq.${slug}&select=claim_id`);
  check(rows.filter((r) => r.claim_id).length === 5 && new Set(rows.map((r) => r.claim_id)).size === 5, 'each code has exactly one owner');
} finally {
  await rest(`partner_codes?partner=eq.${slug}`, { method: 'DELETE' }).catch((e) => console.error('cleanup codes:', e.message));
  await rest(`partner_claims?partner=eq.${slug}`, { method: 'DELETE' }).catch((e) => console.error('cleanup claims:', e.message));
  await rest(`partner_programs?slug=eq.${slug}`, { method: 'DELETE' }).catch((e) => console.error('cleanup program:', e.message));
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 6: Keep `/arsenal` out of search and note the secret**

Append to `site/_headers`:

```
# Partner page and member links: shared by link only
/arsenal
  X-Robots-Tag: noindex

/arsenal/*
  X-Robots-Tag: noindex
```

In `wrangler.toml`, change the secrets comment (lines 3 and 4) to:

```toml
# Secrets (SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, UNSUBSCRIBE_SECRET, TURNSTILE_SECRET) are set with
#   npx wrangler pages secret put NAME --project-name groundapp
```

- [ ] **Step 7: Run everything and commit**

Run: `npm test 2>&1 | tail -8 && ./scripts/check-site.sh`
Expected: `# fail 0` and `site/ looks clean.`

```bash
git add scripts/load-partner-codes.mjs scripts/partner-concurrency.mjs test/load-codes.test.mjs site/_headers wrangler.toml
git commit -m "Partner codes: loader, concurrency check, noindex for /arsenal"
```

---

### Task 9: Database and secrets (orchestrator, on Collin's Mac, with Collin's go)

These change live systems. Do them only after Tasks 1 to 8 are reviewed, and tell Collin before each one.

- [ ] **Step 1: Apply the migration**

Apply `db/2026-11-13_partner_codes.sql` to Supabase project `jlgmhpdggjxxfgfauobd` with the Supabase MCP tool `apply_migration`, name `partner_codes`. Then run `get_advisors` (security) and fix anything it reports about the five new functions or three new tables.

Verify with `execute_sql`:

```sql
select (select count(*) from partner_programs where slug = 'arsenal') as programs,
       (select count(*) from partner_codes) as codes,
       (select relrowsecurity from pg_class where relname = 'partner_claims') as rls;
```

Expected: `programs = 1`, `codes = 0`, `rls = true`.

- [ ] **Step 2: Run the concurrency check**

Run: `node scripts/partner-concurrency.mjs`
Expected: six lines starting `ok`, exit code 0. Then confirm cleanup with `execute_sql`: `select count(*) from partner_programs where slug like 'zz-test-%';` returns 0.

- [ ] **Step 3: Load the codes**

```bash
node scripts/load-partner-codes.mjs ~/Desktop/GroundApp-Beau-Team-Reserve-Codes-2026-11-04.csv --partner arsenal --batch 639153 --expires 2027-05-03 --dry-run
```

Expected: `450 codes read, numbers 51 to 500.` Then run it again without `--dry-run`. Expected last line: `partner_codes now holds 450 codes for arsenal.`

- [ ] **Step 4: Turnstile**

Create a Turnstile widget (Cloudflare dashboard > Turnstile > Add widget; name "GroundApp partner claim"; hostnames `groundapp.live`, `localhost`; mode Managed). Give the site key to Part 2. Set the secret:

```bash
npx wrangler pages secret put TURNSTILE_SECRET --project-name groundapp
```

Add `TURNSTILE_SECRET=<secret>` to `.dev.vars` for local runs.

- [ ] **Step 5: Local end to end with a throwaway partner**

With `execute_sql`, create a test partner and one dummy code:

```sql
insert into partner_programs (slug, name, locations) values ('zz-e2e', 'E2E Test', array['Arvada']);
insert into partner_codes (partner, seq, code, redeem_url, batch, expires_on)
values ('zz-e2e', 1, 'ZZE2ECODE0001', 'https://apps.apple.com/redeem?ctx=offercodes&id=6760352779&code=ZZE2ECODE0001', 'test', '2099-01-01');
```

Run `npx wrangler pages dev site --port 8788`, then (Turnstile's always-pass test secret `1x0000000000000000000000000000000AA` in `.dev.vars` for this step only):

```bash
curl -s -X POST http://localhost:8788/api/partner/claim -H 'content-type: application/json' -H 'origin: http://localhost:8788' \
  -d '{"partner":"zz-e2e","first_name":"Collin","last_name":"Test","email":"collinchartier@gmail.com","device":"iphone","location":"Arvada","member":true,"turnstile":"x","t":6000}'
```

Expected: `{"ok":true,"status":"assigned"}`, the code email in Collin's inbox within a minute, and one scheduled email in the Resend dashboard for 3 days out.

The emailed link points at `/zz-e2e/r/<token>`, which has no route. Test the link handler with the token from `select token from partner_claims where partner = 'zz-e2e'`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -A 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)' http://localhost:8788/arsenal/r/<token>
```

Expected: `404` (the token belongs to another partner). Then prove the Arsenal path with one real Arsenal claim made by Collin through the page in Part 2's verification, not here.

Clean up: cancel the scheduled email in the Resend dashboard, then

```sql
delete from partner_codes where partner = 'zz-e2e';
delete from partner_claims where partner = 'zz-e2e';
delete from partner_programs where slug = 'zz-e2e';
```

Restore the real `TURNSTILE_SECRET` in `.dev.vars`.

- [ ] **Step 6: Record what was applied**

Add the date applied to the first comment line of `db/2026-11-13_partner_codes.sql` and commit:

```bash
git add db/2026-11-13_partner_codes.sql
git commit -m "Record partner_codes migration as applied"
```

---

## Review before Part 2

Tasks 1 to 8 are written by `logic-dev` (Codex). They go to a Claude `reviewer` before Task 9 and before Part 2 starts. The reviewer checks, in this order: a code can never reach two people, the response and logs never contain a code, input can't reach SQL or HTML unescaped, and the tests assert behaviour a member or Collin would notice.
