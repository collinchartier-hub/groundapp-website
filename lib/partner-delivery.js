// Delivery for partner claims and low-stock alerts; follow-ups run separately.
// Shared by POST /api/partner/claim and the admin API (resend, waitlist release).
import { supabase } from './util.js';
import { redeemLink, RESEND_WINDOW_MS, LOW_STOCK } from './partner.js';
import { renderClaimEmail, renderAndroidEmail, renderWaitlistEmail, renderAlertEmail, sendEmail } from './partner-email.js';
import { partnerConfig } from './partners.js';

// r is a partner_claim result with claim: { id, status, first_name, email, token }.
// Returns { ok, id, error }.
export async function sendForClaim(env, partner, r, { fresh = false } = {}) {
  const claim = r.claim;
  const config = partnerConfig(partner);
  if (!config) return { ok: false, id: null, error: 'unknown partner' };
  const common = { partner: config, firstName: claim.first_name, mailingAddress: env.MAILING_ADDRESS };
  // One send per claim per 15 minute slot, except when an admin explicitly asks to resend it.
  const slot = Math.floor(Date.now() / RESEND_WINDOW_MS);
  const freshSuffix = fresh ? `/${Date.now()}` : '';

  if (claim.status === 'android_waitlist') {
    const m = renderAndroidEmail(common);
    return sendEmail(env, { to: claim.email, ...m, idempotencyKey: `partner-android/${claim.id}/${slot}${freshSuffix}`, tag: 'partner_android' });
  }
  if (claim.status === 'waitlist') {
    const m = renderWaitlistEmail(common);
    return sendEmail(env, { to: claim.email, ...m, idempotencyKey: `partner-waitlist/${claim.id}/${slot}${freshSuffix}`, tag: 'partner_waitlist' });
  }

  const link = redeemLink(partner, claim.token);
  return sendEmail(env, { to: claim.email, ...renderClaimEmail({ ...common, link }), idempotencyKey: `partner-claim/${claim.id}/${slot}${freshSuffix}`, tag: 'partner_claim' });
}

// event: 'low_stock' | 'email_failed'. Goes to the first address in ADMIN_EMAILS.
export async function alertAdmin(env, partner, event, detail) {
  const to = String(env.ADMIN_EMAILS || '').split(',')[0].trim();
  if (!to) return;
  await sendEmail(env, { to, ...renderAlertEmail({ partner, event, detail }), tag: 'partner_alert' });
}

// Atomically claim each crossed threshold, even when several people take the last codes at once.
export async function maybeAlertLowStock(env, partner, codesLeft) {
  const threshold = LOW_STOCK.findLast((n) => n >= codesLeft);
  if (threshold === undefined) return;
  const claimed = await supabase(env, `partner_programs?slug=eq.${encodeURIComponent(partner)}&or=(low_stock_alerted.is.null,low_stock_alerted.gt.${threshold})`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { low_stock_alerted: threshold },
  });
  if (claimed.ok && claimed.data?.length) await alertAdmin(env, partner, 'low_stock', `${codesLeft} codes left`);
}
