// POST /api/subscribe
// Saves a signup to the shared Supabase list (newsletter_subscribers) and sends the
// GroundApp welcome email through Resend, once per new or re-activated subscriber.
import { json, supabase, unsubscribeUrl, sha256Hex } from '../../lib/util.js';
import { renderWelcome } from '../../lib/welcome.js';

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
    const q = encodeURIComponent(email);
    const [existing, unsub] = await Promise.all([
      supabase(env, `newsletter_subscribers?email=eq.${q}&select=id,status,first_name`),
      supabase(env, `newsletter_unsubscribed?email=eq.${q}&select=email`),
    ]);
    if (!existing.ok || !unsub.ok) throw new Error(`lookup failed ${existing.status}/${unsub.status}`);

    const row = existing.data[0];
    const wasUnsubscribed = unsub.data.length > 0;
    let shouldWelcome = false;

    if (!row) {
      const ins = await supabase(env, 'newsletter_subscribers', {
        method: 'POST',
        prefer: 'return=minimal',
        body: { email, first_name: firstName, source, status: 'active' },
      });
      if (ins.status === 409) return json({ ok: true, status: 'already' }); // lost a race with a double submit
      if (!ins.ok) throw new Error(`insert failed ${ins.status} ${JSON.stringify(ins.data)}`);
      shouldWelcome = true;
    } else if (row.status !== 'active' || wasUnsubscribed) {
      // Imported, bounced or unsubscribed earlier, and now opting in on purpose.
      const patch = { status: 'active' };
      if (!row.first_name && firstName) patch.first_name = firstName;
      const upd = await supabase(env, `newsletter_subscribers?id=eq.${row.id}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
      if (!upd.ok) throw new Error(`reactivate failed ${upd.status}`);
      shouldWelcome = true;
    }

    if (wasUnsubscribed) await supabase(env, `newsletter_unsubscribed?email=eq.${q}`, { method: 'DELETE' });
    if (!shouldWelcome) return json({ ok: true, status: 'already' });

    const sent = await sendWelcome(env, email, firstName || row?.first_name || null);
    if (sent) {
      await supabase(env, `newsletter_subscribers?email=eq.${q}`, { method: 'PATCH', prefer: 'return=minimal', body: { last_emailed_at: new Date().toISOString() } });
    }
    return json({ ok: true, status: 'subscribed' });
  } catch (err) {
    console.error('subscribe error', err?.message || err);
    return json({ ok: false, error: 'server' }, 500);
  }
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
