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
