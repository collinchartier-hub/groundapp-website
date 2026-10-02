// GET  /api/unsubscribe?e=&t=  shows a one-click confirm page (link scanners can't unsubscribe people by prefetching)
// POST /api/unsubscribe?e=&t=  unsubscribes. Also handles RFC 8058 one-click POSTs from mail apps.
// Writes to newsletter_unsubscribed, the same table the weekly newsletter already filters on.
import { html, escapeHtml, supabase, verifyUnsubscribe, SITE } from '../../lib/util.js';

function page(title, bodyHtml) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title} | GroundApp</title><link rel="icon" href="/lung-logo.svg">
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1A110E;color:#E8DDD0;
    font:17px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;padding:24px;box-sizing:border-box}
  main{max-width:440px;text-align:center}
  h1{font:400 32px/1.25 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif;margin:0 0 12px}
  p{color:#A89585;margin:0 0 20px}
  button,a.btn{display:inline-block;min-height:48px;padding:12px 28px;border-radius:999px;border:0;background:#C4935A;color:#1A110E;
    font:600 16px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;cursor:pointer;text-decoration:none}
  a{color:#C4935A}
</style></head><body><main>${bodyHtml}</main></body></html>`;
}

async function getEmail(request, env) {
  const url = new URL(request.url);
  return verifyUnsubscribe(env, url.searchParams.get('e'), url.searchParams.get('t'));
}

const broken = () =>
  html(page('Link not recognized', `<h1>That link didn't work</h1><p>Email <a href="mailto:collin@groundapp.live?subject=unsubscribe">collin@groundapp.live</a> and you'll be taken off the list by hand.</p>`), 400);

export async function onRequestGet({ request, env }) {
  const email = await getEmail(request, env);
  if (!email) return broken();
  const action = new URL(request.url).search;
  return html(page('Unsubscribe', `<h1>Unsubscribe?</h1><p>${escapeHtml(email)} will stop getting emails from GroundApp.</p>
<form method="post" action="/api/unsubscribe${escapeHtml(action)}"><button type="submit">Unsubscribe</button></form>`));
}

export async function onRequestPost({ request, env }) {
  const email = await getEmail(request, env);
  if (!email) return broken();
  try {
    const q = encodeURIComponent(email);
    const [a, b] = await Promise.all([
      supabase(env, 'newsletter_unsubscribed?on_conflict=email', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: { email, source: 'groundapp_site' },
      }),
      supabase(env, `newsletter_subscribers?email=eq.${q}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'unsubscribed' } }),
    ]);
    if (!a.ok || !b.ok) throw new Error(`unsubscribe failed ${a.status}/${b.status}`);
  } catch (err) {
    console.error('unsubscribe error', err?.message || err);
    return html(page('Something went wrong', `<h1>Something went wrong</h1><p>Please try again, or email <a href="mailto:collin@groundapp.live?subject=unsubscribe">collin@groundapp.live</a>.</p>`), 500);
  }
  return html(page("You're unsubscribed", `<h1>You're unsubscribed</h1><p>No more emails from GroundApp. If you ever want back in, you can sign up again on the site.</p><a class="btn" href="${SITE}">Back to GroundApp</a>`));
}
