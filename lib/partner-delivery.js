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
