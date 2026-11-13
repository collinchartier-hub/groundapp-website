// Delivery for partner claims: the email that matches a claim's status, the scheduled reminder, and alerts to Collin.
// Shared by POST /api/partner/claim and the admin API (resend, waitlist release).
import { supabase, unsubscribeUrl } from './util.js';
import { redeemLink, RESEND_WINDOW_MS, NUDGE_AFTER_MS, LOW_STOCK } from './partner.js';
import { renderClaimEmail, renderNudgeEmail, renderAndroidEmail, renderWaitlistEmail, renderAlertEmail, sendEmail } from './partner-email.js';
import { partnerConfig } from './partners.js';

// r is a partner_claim result: { claim: { id, status, first_name, email, token }, code }.
// Returns { ok, id, error, nudgeId }.
export async function sendForClaim(env, partner, r, { withNudge, fresh = false }) {
  const claim = r.claim;
  const config = partnerConfig(partner);
  if (!config) return { ok: false, id: null, error: 'unknown partner', nudgeId: null };
  const common = { partner: config, firstName: claim.first_name, mailingAddress: env.MAILING_ADDRESS };
  // One send per claim per 15 minute slot, except when an admin explicitly asks to resend it.
  const slot = Math.floor(Date.now() / RESEND_WINDOW_MS);
  const freshSuffix = fresh ? `/${Date.now()}` : '';

  if (claim.status === 'android_waitlist') {
    const m = renderAndroidEmail(common);
    return { ...(await sendEmail(env, { to: claim.email, ...m, idempotencyKey: `partner-android/${claim.id}/${slot}${freshSuffix}`, tag: 'partner_android' })), nudgeId: null };
  }
  if (claim.status === 'waitlist') {
    const m = renderWaitlistEmail(common);
    return { ...(await sendEmail(env, { to: claim.email, ...m, idempotencyKey: `partner-waitlist/${claim.id}/${slot}${freshSuffix}`, tag: 'partner_waitlist' })), nudgeId: null };
  }

  const link = redeemLink(partner, claim.token);
  const sent = await sendEmail(env, { to: claim.email, ...renderClaimEmail({ ...common, code: r.code, link }), idempotencyKey: `partner-claim/${claim.id}/${slot}${freshSuffix}`, tag: 'partner_claim' });
  if (!sent.ok || !withNudge || fresh) return { ...sent, nudgeId: null };

  const unsubUrl = await unsubscribeUrl(env, claim.email);
  const nudge = await sendEmail(env, {
    to: claim.email,
    ...renderNudgeEmail({ ...common, link, unsubUrl }),
    idempotencyKey: `partner-nudge/${claim.id}`,
    tag: 'partner_nudge',
    scheduledAt: new Date(Date.now() + NUDGE_AFTER_MS).toISOString(),
    headers: { 'List-Unsubscribe': `<${unsubUrl}>, <mailto:collin@groundapp.live?subject=unsubscribe>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
  if (!nudge.ok) console.error('partner nudge not scheduled', claim.id, nudge.error);
  return { ...sent, nudgeId: nudge.id };
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
