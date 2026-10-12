// POST /api/tap  {ct, path, eid}
// Counts App Store button taps (sent with navigator.sendBeacon from js/app-links-v3.js).
// Apple hides campaign rows under 5 users; this shows every tap right away.
// Also reports the tap to Meta as AppStoreClick (lib/meta.js), deduped with the browser by eid.
import { supabase } from '../../lib/util.js';
import { sendAppStoreClick } from '../../lib/meta.js';

const CT_RE = /^(site|ig|ad|email)-[a-z0-9-]{1,24}$/;
const ALLOWED_ORIGIN = /^https:\/\/((www\.)?groundapp\.live|([a-z0-9-]+\.)?groundapp\.pages\.dev)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const noContent = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export async function onRequestPost({ request, env, waitUntil }) {
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGIN.test(origin)) return noContent();

  let body;
  try { body = JSON.parse(await request.text()); } catch { return noContent(); }
  const ct = String(body.ct || '');
  const path = String(body.path || '').slice(0, 200);
  if (!CT_RE.test(ct) || (path && !path.startsWith('/'))) return noContent();

  // Don't make the visitor wait on the database; they're already leaving for the App Store.
  waitUntil(
    supabase(env, 'groundapp_taps', { method: 'POST', prefer: 'return=minimal', body: { ct, path: path || null } })
      .then((r) => { if (!r.ok) console.error('tap insert failed', r.status); })
  );
  waitUntil(sendAppStoreClick(env, request, { eid: body.eid, ct, path: path || '/' }));
  return noContent();
}

export function onRequest() {
  return new Response(null, { status: 405 });
}
