-- Apply after 2026-11-17_partner_buckets.sql (already live on partner-buckets).
-- Existing claims remain handled until scripts/partner-followups-cutover.mjs cancels and
-- releases genuinely future scheduled reminders. Do not run the cron before cutover.
alter table public.partner_claims add column if not exists code_opened_at timestamptz;
alter table public.partner_claims add column if not exists followup_sent_at timestamptz;
alter table public.partner_claims add column if not exists followup_email_id text;
alter table public.partner_claims add column if not exists followup_error text;

-- Only the first installation marks already-emailed claims legacy. Reapplying
-- this migration must not re-mark claims released by the cutover script.
do $$
begin
  if not exists (
    select 1 from pg_attribute
     where attrelid = 'public.partner_claims'::regclass
       and attname = 'followup_kind' and not attisdropped
  ) then
    alter table public.partner_claims add column followup_kind text;
    update public.partner_claims
       set followup_kind = 'legacy', followup_sent_at = now()
     where followup_sent_at is null and followup_kind is null
       and status = 'assigned' and emailed_at is not null;
  end if;
end;
$$;

alter table public.partner_claims drop constraint if exists partner_claims_followup_kind_check;
alter table public.partner_claims add constraint partner_claims_followup_kind_check
  check (followup_kind in ('welcome', 'reminder', 'legacy', 'skipped_unsubscribed'));

-- Historical iOS taps already indicated that the member opened the code.
update public.partner_claims
   set code_opened_at = redeem_tapped_at
 where redeem_tapped_at is not null and code_opened_at is null;


create index if not exists partner_claims_followup_due_idx
  on public.partner_claims (emailed_at, id)
  where status = 'assigned' and device = 'iphone' and followup_sent_at is null;
create index if not exists newsletter_unsubscribed_email_lower_idx
  on public.newsletter_unsubscribed (lower(email));


-- GET iOS counts a tap and opens the code. Desktop GET is read-only; only its
-- same-origin button calls the reveal RPC to mark the code opened.
create or replace function public.partner_tap(p_token text, p_ios boolean, p_partner text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_claim partner_claims%rowtype;
begin
  select * into v_claim from partner_claims where token = p_token and partner = p_partner;
  if not found then return jsonb_build_object('found', false); end if;
  if p_ios and v_claim.status = 'assigned' then
    update partner_claims
       set tap_count = tap_count + 1,
           redeem_tapped_at = coalesce(redeem_tapped_at, now()),
           code_opened_at = coalesce(code_opened_at, now())
     where id = v_claim.id;
  end if;
  return jsonb_build_object(
    'found', true, 'partner', v_claim.partner, 'status', v_claim.status,
    -- Temporary compatibility for the currently deployed desktop page until
    -- the new Pages site is live; remove 'code' in the next migration.
    'code', (select code from partner_codes where claim_id = v_claim.id),
    'redeem_url', (select redeem_url from partner_codes where claim_id = v_claim.id)
  );
end;
$$;

create or replace function public.partner_reveal_code(p_token text, p_partner text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_claim partner_claims%rowtype;
begin
  update partner_claims set code_opened_at = coalesce(code_opened_at, now())
   where token = p_token and partner = p_partner and status = 'assigned'
   returning * into v_claim;
  if not found then return jsonb_build_object('found', false); end if;
  return jsonb_build_object('found', true,
    'code', (select code from partner_codes where claim_id = v_claim.id));
end;
$$;

-- One transaction claims up to 15 due rows; SKIP LOCKED and a conditional
-- update prevent concurrent runners from sending twice. A failed send is still
-- claimed and visible in admin; only an explicit human action can resend.
create or replace function public.partner_claim_followups(p_limit integer default 15)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_claim partner_claims%rowtype;
  v_out jsonb := '[]'::jsonb;
  v_kind text;
begin
  for v_claim in
    select * from partner_claims
     where status = 'assigned' and device = 'iphone'
       and emailed_at <= now() - interval '3 days'
       and followup_sent_at is null and followup_kind is null
       and nudge_email_id is null
     order by emailed_at, id
     limit greatest(1, least(coalesce(p_limit, 15), 15))
     for update skip locked
  loop
    if exists (select 1 from newsletter_unsubscribed u where lower(u.email) = lower(v_claim.email)) then
      update partner_claims set followup_kind = 'skipped_unsubscribed', followup_sent_at = now()
       where id = v_claim.id and followup_sent_at is null;
    else
      v_kind := case when v_claim.code_opened_at is null then 'reminder' else 'welcome' end;
      update partner_claims set followup_kind = v_kind, followup_sent_at = now()
       where id = v_claim.id and followup_sent_at is null
       returning * into v_claim;
      if found then
        v_out := v_out || jsonb_build_array(jsonb_build_object(
          'id', v_claim.id, 'partner', v_claim.partner, 'first_name', v_claim.first_name,
          'email', v_claim.email, 'token', v_claim.token, 'emailed_at', v_claim.emailed_at,
          'code_opened_at', v_claim.code_opened_at, 'followup_kind', v_kind));
      end if;
    end if;
  end loop;
  return v_out;
end;
$$;

-- The currently live summary is from partner-buckets; preserve its caps,
-- redemption counts and ordering, adding only follow-up metrics and columns.
create or replace function public.partner_admin_summary(p_partner text)
returns jsonb
language sql
stable
set search_path = public
as $$
  with stock as (
    select count(*) as total,
           count(*) filter (where claim_id is not null) as assigned,
           count(*) filter (where claim_id is null and expires_on > current_date) as available,
           min(expires_on) filter (where claim_id is null and expires_on > current_date) as expires_on
      from partner_codes where partner = p_partner
  ), program as (
    select code_cap, apple_offer_id from partner_programs where slug = p_partner
  ), apple_date as (
    select max(date) as last_date from groundapp_asc_daily
     where metric = 'trial_starts' and dim = 'total'
  )
  select jsonb_build_object(
    'program', (select to_jsonb(p) from partner_programs p where slug = p_partner),
    'codes', jsonb_build_object(
      'total', s.total, 'cap', p.code_cap, 'assigned', s.assigned,
      'left', case when p.code_cap is null then s.available
                   else least(s.available, greatest(0, p.code_cap - s.assigned)) end,
      'expires_on', s.expires_on
    ),
    'apple', jsonb_build_object(
      'offer_id', p.apple_offer_id,
      'redemptions', case when p.apple_offer_id is null or a.last_date is null then null
                          else coalesce((select sum(value) from groundapp_asc_daily
                                          where metric = 'offer_code_redemptions'
                                            and dim = 'offer:' || p.apple_offer_id), 0) end,
      'last_date', case when p.apple_offer_id is null then null else a.last_date end
    ),
    'claims', jsonb_build_object(
      'assigned', (select count(*) from partner_claims where partner = p_partner and status = 'assigned'),
      'waitlist', (select count(*) from partner_claims where partner = p_partner and status = 'waitlist'),
      'android_waitlist', (select count(*) from partner_claims where partner = p_partner and status = 'android_waitlist'),
      'tapped', (select count(*) from partner_claims where partner = p_partner and redeem_tapped_at is not null),
      'opened', (select count(*) from partner_claims where partner = p_partner and code_opened_at is not null),
      'welcome_sent', (select count(*) from partner_claims where partner = p_partner and followup_kind = 'welcome' and followup_email_id is not null),
      'reminder_sent', (select count(*) from partner_claims where partner = p_partner and followup_kind = 'reminder' and followup_email_id is not null),
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
               c.code_opened_at, c.followup_kind, c.followup_sent_at, c.followup_email_id, c.followup_error,
               (select seq from partner_codes where claim_id = c.id) as code_seq
          from partner_claims c where c.partner = p_partner order by c.created_at desc limit 2000) r), '[]'::jsonb)
  ) from stock s cross join apple_date a left join program p on true;
$$;

-- The scoped route has been deployed since 2026-11-13; remove its obsolete
-- unscoped two-argument predecessor.
drop function if exists public.partner_tap(text, boolean);

revoke execute on function public.partner_tap(text, boolean, text) from public, anon, authenticated;
revoke execute on function public.partner_reveal_code(text, text) from public, anon, authenticated;
revoke execute on function public.partner_claim_followups(integer) from public, anon, authenticated;
revoke execute on function public.partner_admin_summary(text) from public, anon, authenticated;
grant execute on function public.partner_tap(text, boolean, text) to service_role;
grant execute on function public.partner_reveal_code(text, text) to service_role;
grant execute on function public.partner_claim_followups(integer) to service_role;
grant execute on function public.partner_admin_summary(text) to service_role;
