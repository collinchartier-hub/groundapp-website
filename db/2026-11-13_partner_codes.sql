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
