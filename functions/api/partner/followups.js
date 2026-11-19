// Hourly Worker trigger; claim selection and unsubscribe decisions are atomic in the DB.
import { json, supabase, unsubscribeUrl } from '../../../lib/util.js';
import { redeemLink } from '../../../lib/partner.js';
import { partnerConfig } from '../../../lib/partners.js';
import { renderWelcomeEmail, renderReminderEmail, sendEmail } from '../../../lib/partner-email.js';

async function equalSecret(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string' || !received || !expected) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(received)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  if (!(await equalSecret(request.headers.get('x-partner-cron-secret'), env.PARTNER_CRON_SECRET))) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  try {
    const due = await supabase(env, 'rpc/partner_claim_followups', { method: 'POST', body: { p_limit: 15 } });
    if (!due.ok || !Array.isArray(due.data)) throw new Error(`follow-up claim failed ${due.status}`);
    let sent = 0, failed = 0, bookkeepingFailed = 0;
    for (const claim of due.data) {
      let emailId = null, error = null;
      try {
        const partner = partnerConfig(claim.partner);
        if (!partner) throw new Error('unknown partner');
        const unsubUrl = await unsubscribeUrl(env, claim.email);
        const args = { partner, firstName: claim.first_name, unsubUrl, mailingAddress: env.MAILING_ADDRESS };
        const mail = claim.followup_kind === 'welcome'
          ? renderWelcomeEmail(args)
          : renderReminderEmail({ ...args, link: redeemLink(claim.partner, claim.token) });
        const delivered = await sendEmail(env, {
          to: claim.email, ...mail, idempotencyKey: `partner-followup/${claim.id}`,
          tag: `partner_${claim.followup_kind}`,
          headers: { 'List-Unsubscribe': `<${unsubUrl}>, <mailto:collin@groundapp.live?subject=unsubscribe>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        });
        if (!delivered.ok) throw new Error(delivered.error);
        if (!delivered.id) throw new Error('missing Resend email id');
        emailId = delivered.id;
      } catch (err) {
        error = String(err?.message || err).slice(0, 200);
      }
      try {
        const stamped = await supabase(env, `partner_claims?id=eq.${encodeURIComponent(claim.id)}`, {
          method: 'PATCH', prefer: 'return=minimal', body: { followup_email_id: emailId, followup_error: error },
        });
        if (!stamped.ok) {
          bookkeepingFailed++;
          console.error('partner follow-up bookkeeping failed', claim.id, stamped.status);
        }
      } catch {
        bookkeepingFailed++;
        console.error('partner follow-up bookkeeping failed', claim.id, 'network');
      }
      if (error) failed++; else sent++;
    }
    return json({ ok: true, claimed: due.data.length, sent, failed, bookkeeping_failed: bookkeepingFailed });
  } catch (err) {
    console.error('partner follow-ups failed', err?.message || err);
    return json({ ok: false, error: 'server' }, 500);
  }
}

export function onRequest() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
