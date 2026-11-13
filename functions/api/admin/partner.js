// /api/admin/partner (behind Cloudflare Access, see lib/access.js)
// GET  ?slug=arsenal                          everything the Partners panel shows
// POST { action: 'pause' | 'resume', slug }   turn the form into a waitlist, or back
// POST { action: 'resend', slug, claim_id }   send one member their email again
// POST { action: 'release_waitlist', slug }   give up to 10 waiting iPhone claims a code and email them
import { json, supabase } from '../../../lib/util.js';
import { requireAdmin } from '../../../lib/access.js';
import { sendForClaim, maybeAlertLowStock } from '../../../lib/partner-delivery.js';

const SLUG_RE = /^[a-z0-9-]{2,40}$/;
const UUID_RE = /^[0-9a-f-]{2,36}$/i;

export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const slug = new URL(request.url).searchParams.get('slug') || '';
  if (!SLUG_RE.test(slug)) return json({ ok: false, error: 'invalid' }, 400);
  const rpc = await supabase(env, 'rpc/partner_admin_summary', { method: 'POST', body: { p_partner: slug } });
  if (!rpc.ok) { console.error('partner summary failed', rpc.status); return json({ ok: false, error: 'server' }, 500); }
  return json({ ok: true, generated_at: new Date().toISOString(), ...rpc.data });
}

export async function onRequestPost({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid' }, 400); }
  const slug = String(body.slug || '');
  if (!SLUG_RE.test(slug)) return json({ ok: false, error: 'invalid' }, 400);

  try {
    if (body.action === 'pause' || body.action === 'resume') {
      const upd = await supabase(env, `partner_programs?slug=eq.${slug}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: body.action === 'pause' ? 'paused' : 'live' } });
      if (!upd.ok) throw new Error(`status ${upd.status}`);
      return json({ ok: true });
    }

    if (body.action === 'resend') {
      const id = String(body.claim_id || '');
      if (!UUID_RE.test(id)) return json({ ok: false, error: 'invalid' }, 400);
      const [claims, codes] = await Promise.all([
        supabase(env, `partner_claims?id=eq.${id}&partner=eq.${slug}&select=id,status,first_name,email,token,emailed_at`),
        supabase(env, `partner_codes?claim_id=eq.${id}&select=code,redeem_url`),
      ]);
      if (!claims.ok || !codes.ok) throw new Error(`lookup ${claims.status}/${codes.status}`);
      const claim = claims.data[0];
      if (!claim) return json({ ok: false, error: 'not_found' }, 404);
      const sent = await deliver(env, slug, { claim, code: codes.data[0]?.code || null, redeem_url: codes.data[0]?.redeem_url || null }, false, true);
      return sent ? json({ ok: true, sent: 1 }) : json({ ok: false, error: 'email' }, 502);
    }

    if (body.action === 'release_waitlist') {
      const rpc = await supabase(env, 'rpc/partner_release_waitlist', { method: 'POST', body: { p_partner: slug, p_limit: 10 } });
      if (!rpc.ok) throw new Error(`release ${rpc.status}`);
      let sent = 0;
      let failed = 0;
      for (const r of rpc.data) {
        try {
          (await deliver(env, slug, r, true)) ? sent++ : failed++;
        } catch (err) {
          console.error('partner release delivery failed', r.claim.id, err?.message || err);
          failed++;
        }
      }
      if (rpc.data.length) await maybeAlertLowStock(env, slug, Math.min(...rpc.data.map((r) => r.codes_left)));
      return json({ ok: true, sent, failed });
    }

    return json({ ok: false, error: 'invalid' }, 400);
  } catch (err) {
    console.error('partner admin error', err?.message || err);
    return json({ ok: false, error: 'server' }, 500);
  }
}

async function deliver(env, slug, r, withNudge, fresh = false) {
  const sent = await sendForClaim(env, slug, r, { withNudge, fresh });
  const patch = sent.ok
    ? { emailed_at: new Date().toISOString(), email_error: null, ...(sent.nudgeId ? { nudge_email_id: sent.nudgeId } : {}) }
    : { email_error: sent.error };
  const stamped = await supabase(env, `partner_claims?id=eq.${r.claim.id}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
  if (!stamped.ok) console.error('partner admin bookkeeping failed', r.claim.id, stamped.status);
  return sent.ok;
}
