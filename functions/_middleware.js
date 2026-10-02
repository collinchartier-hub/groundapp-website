// Runs before every request.
// 1. One canonical host: send www.groundapp.live and groundapp.pages.dev to groundapp.live.
//    Preview deployments (<hash>.groundapp.pages.dev) are left alone.
// 2. Refuse paths of private files that leaked in 2026 (drafts, send logs, scripts, notes).
//    Cloudflare Pages keeps serving stale copies of files a deploy dropped, so a 404 here
//    is the only reliable way to keep them gone.
const REDIRECT_HOSTS = new Set(['www.groundapp.live', 'groundapp.pages.dev']);
const BLOCKED = /^\/(substack|marketing)(\/|$)|^\/Screenshot\s|^\/CLAUDE\.md|send-log|\.(py|log)$/i;

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (REDIRECT_HOSTS.has(url.hostname)) {
    return Response.redirect(`https://groundapp.live${url.pathname}${url.search}`, 301);
  }
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { /* keep raw */ }
  if (BLOCKED.test(path)) {
    return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  }
  return next();
}
