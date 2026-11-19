-- Per-partner code buckets and App Store offer redemption counts.
-- Reapply-safe; preset caps only fill unset values, including Arsenal's dedicated offer.
alter table public.partner_programs add column if not exists code_cap integer;
alter table public.partner_programs add column if not exists apple_offer_id text;

update public.partner_programs p
   set code_cap = coalesce(p.code_cap, cfg.cap),
       apple_offer_id = coalesce(cfg.offer_id, p.apple_offer_id)
  from (values
    ('arsenal', 300, '7b16340e-59e9-4359-b1ad-3b9fbe0c76d2'),
    ('aion', 200, '7af2e744-bd1d-40e9-bb19-20cfbe8a392f'),
    ('recon', 200, '4af33ffd-b9e2-4bf1-b9ba-d5f7835ec7ef'),
    ('traverse', 500, 'd75897eb-c792-4dc7-858a-07ea255f9e81')
  ) as cfg(slug, cap, offer_id)
 where p.slug = cfg.slug;

-- All functions keep their existing security-invoker behavior and service_role-only EXECUTE grants.
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
    'codes_left', (select case when p.code_cap is null then s.available
                               else least(s.available, greatest(0, p.code_cap - s.assigned)) end
                     from partner_programs p
                     cross join lateral (
                       select count(*) filter (where claim_id is not null) as assigned,
                              count(*) filter (where claim_id is null and expires_on > current_date) as available
                         from partner_codes where partner = p_claim.partner
                     ) s
                    where p.slug = p_claim.partner)
  );
$$;

-- A transaction-scoped partner lock serializes the cap check and assignment, including waitlist releases.
-- The network lock, rate limit, duplicate behavior, and code-row SKIP LOCKED all remain unchanged.
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
  if p_ip_hash is not null then perform pg_advisory_xact_lock(hashtextextended('partner_ip:' || p_ip_hash, 0)); end if;
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
      perform pg_advisory_xact_lock(hashtextextended('partner_codes:' || p_partner, 0));
      -- Refresh the cap after obtaining the lock. At READ COMMITTED the count sees prior committed assignments.
      select code_cap into v_program.code_cap from partner_programs where slug = p_partner;
      if v_program.code_cap is not null and (
        select count(*) from partner_codes where partner = p_partner and claim_id is not null
      ) >= v_program.code_cap then
        v_status := 'waitlist';
      else
        select id into v_code_id from partner_codes
         where partner = p_partner and claim_id is null and expires_on > current_date
         order by expires_on desc, seq
         for update skip locked
         limit 1;
        v_status := case when v_code_id is null then 'waitlist' else 'assigned' end;
      end if;
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

create or replace function public.partner_release_waitlist(p_partner text, p_limit integer default 10)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_claim partner_claims%rowtype;
  v_code_id bigint;
  v_remaining bigint;
  v_out jsonb := '[]'::jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('partner_codes:' || p_partner, 0));
  select case when code_cap is null then null
              else greatest(0, code_cap - (select count(*) from partner_codes
                                             where partner = p_partner and claim_id is not null)) end
    into v_remaining from partner_programs where slug = p_partner;

  for v_claim in
    select * from partner_claims
     where partner = p_partner and status = 'waitlist' and device = 'iphone'
     order by created_at
     for update skip locked
     limit greatest(1, least(coalesce(p_limit, 10), 10))
  loop
    exit when v_remaining is not null and v_remaining <= 0;
    select id into v_code_id from partner_codes
     where partner = p_partner and claim_id is null and expires_on > current_date
     order by expires_on desc, seq for update skip locked limit 1;
    exit when v_code_id is null;
    update partner_claims set status = 'assigned', emailed_at = null where id = v_claim.id returning * into v_claim;
    update partner_codes set claim_id = v_claim.id where id = v_code_id;
    v_remaining := v_remaining - 1;
    v_out := v_out || jsonb_build_array(partner_claim_result('assigned', v_claim));
  end loop;
  return v_out;
end;
$$;

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
    -- The Standard subscription report zero-fills trial totals for each reported date.
    select max(date) as last_date from groundapp_asc_daily
     where metric = 'trial_starts' and dim = 'total'
  )
  select jsonb_build_object(
    'program', (select to_jsonb(p) from partner_programs p where slug = p_partner),
    'codes', jsonb_build_object(
      'total', s.total,
      'cap', p.code_cap,
      'assigned', s.assigned,
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
  ) from stock s cross join apple_date a left join program p on true;
$$;

revoke execute on function public.partner_claim_result(text, public.partner_claims) from public, anon, authenticated;
revoke execute on function public.partner_claim(text, text, text, text, text, text, text, text, boolean, text, text) from public, anon, authenticated;
revoke execute on function public.partner_release_waitlist(text, integer) from public, anon, authenticated;
revoke execute on function public.partner_admin_summary(text) from public, anon, authenticated;
grant execute on function public.partner_claim_result(text, public.partner_claims) to service_role;
grant execute on function public.partner_claim(text, text, text, text, text, text, text, text, boolean, text, text) to service_role;
grant execute on function public.partner_release_waitlist(text, integer) to service_role;
grant execute on function public.partner_admin_summary(text) to service_role;
