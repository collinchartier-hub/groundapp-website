-- Second partner code migration, "partner_codes_fixes": serialize per-network claims so the hourly limit
-- holds under concurrency, persist low-stock alert state, and keep scheduled reminder ids until cancellation succeeds.

-- Lowest stock threshold Collin has already been emailed about. Null means none; the code loader resets it.
alter table public.partner_programs add column if not exists low_stock_alerted integer;

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
       set tap_count = tap_count + 1, redeem_tapped_at = coalesce(redeem_tapped_at, now())
     where id = v_claim.id;
  end if;
  return jsonb_build_object(
    'found', true, 'partner', v_claim.partner, 'status', v_claim.status, 'first_tap', v_first,
    'claim_id', v_claim.id, 'nudge_email_id', v_claim.nudge_email_id,
    'code', (select code from partner_codes where claim_id = v_claim.id),
    'redeem_url', (select redeem_url from partner_codes where claim_id = v_claim.id)
  );
end;
$$;

revoke execute on function public.partner_claim(text, text, text, text, text, text, text, text, boolean, text, text) from public, anon, authenticated;
revoke execute on function public.partner_tap(text, boolean) from public, anon, authenticated;
grant execute on function public.partner_claim(text, text, text, text, text, text, text, text, boolean, text, text) to service_role;
grant execute on function public.partner_tap(text, boolean) to service_role;
