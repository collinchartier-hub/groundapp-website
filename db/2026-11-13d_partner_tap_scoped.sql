-- Scope taps to the route's partner before any claim is updated. Keep the two-argument
-- function for the currently deployed site until the new site is live.
create or replace function public.partner_tap(p_token text, p_ios boolean, p_partner text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_claim partner_claims%rowtype;
  v_first boolean := false;
begin
  select * into v_claim from partner_claims where token = p_token and partner = p_partner;
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

revoke execute on function public.partner_tap(text, boolean, text) from public, anon, authenticated;
grant execute on function public.partner_tap(text, boolean, text) to service_role;

-- Run after the new site is live:
-- drop function public.partner_tap(text, boolean);
