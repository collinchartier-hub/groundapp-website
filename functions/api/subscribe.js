// POST /api/subscribe
// Saves a signup to the shared Supabase list (newsletter_subscribers) and sends the
// GroundApp welcome email through Resend the moment someone signs up. People already on the list
// (imports, earlier signups) get it too, at most once a day so the form can't flood an inbox.
import { json, unsubscribeUrl, sha256Hex } from '../../lib/util.js';
import { renderWelcome } from '../../lib/welcome.js';
import { upsertSubscriber, stampEmailed } from '../../lib/list.js';

const SOURCES = new Set(['popup', 'inline', 'atlas-coherence', 'atlas-three-part-breath', 'atlas-alternate-nostril', 'blog', '404']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALLOWED_ORIGIN = /^https:\/\/((www\.)?groundapp\.live|([a-z0-9-]+\.)?groundapp\.pages\.dev)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function cleanName(raw) {
  const name = String(raw || '').replace(/[<>"\r\n\t]/g, '').trim().slice(0, 60);
  if (!name || /newsletter/i.test(name) || /@|https?:/i.test(name)) return null;
  return name.split(/\s+/)[0];
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGIN.test(origin)) return json({ ok: false, error: 'forbidden' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid_email' }, 400); }

  // Bots: filled the hidden honeypot field or submitted faster than a person can type.
  // Pretend it worked so they don't adapt.
  if (body.website || (typeof body.t === 'number' && body.t < 1500)) return json({ ok: true, status: 'subscribed' });

  const email = String(body.email || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return json({ ok: false, error: 'invalid_email' }, 400);
  const firstName = cleanName(body.name);
  const source = `groundapp_site:${SOURCES.has(body.source) ? body.source : 'other'}`;

  try {
    const { state, row } = await upsertSubscriber(env, { email, firstName, source });
    if (state === 'race') return json({ ok: true, status: 'already' });
    if (state === 'active' && emailedWithinADay(row.last_emailed_at)) return json({ ok: true, status: 'already' });

    const sent = await sendWelcome(env, email, firstName || row?.first_name || null);
    if (sent) await stampEmailed(env, email);
    return json({ ok: true, status: 'subscribed' });
  } catch (err) {
    console.error('subscribe error', err?.message || err);
    return json({ ok: false, error: 'server' }, 500);
  }
}

function emailedWithinADay(at) {
  const t = Date.parse(at || '');
  return Number.isFinite(t) && Date.now() - t < 24 * 60 * 60 * 1000;
}

async function sendWelcome(env, email, firstName) {
  const unsubUrl = await unsubscribeUrl(env, email);
  const { subject, html, text } = renderWelcome({ firstName, unsubUrl, mailingAddress: env.MAILING_ADDRESS });
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
      'idempotency-key': `groundapp-welcome/${await sha256Hex(email)}`,
    },
    body: JSON.stringify({
      from: env.WELCOME_FROM || 'Collin Chartier <collin@groundapp.live>',
      to: [email],
      reply_to: 'collin@groundapp.live',
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>, <mailto:collin@groundapp.live?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [{ name: 'type', value: 'groundapp_welcome' }],
    }),
  });
  if (!res.ok) console.error('welcome send failed', res.status, await res.text());
  return res.ok;
}

export function onRequest() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
