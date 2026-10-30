// Runs before every request.
// 1. One canonical host: send www.groundapp.live and groundapp.pages.dev to groundapp.live.
//    Preview deployments (<hash>.groundapp.pages.dev) are left alone.
// 2. Refuse paths of private files that leaked in 2026 (drafts, send logs, scripts, notes).
//    Cloudflare Pages keeps serving stale copies of files a deploy dropped, so a 404 here
//    is the only reliable way to keep them gone.
// 3. Add the Meta pixel to HTML pages (not /admin, /api, previews, or EU/UK/CH visitors).
//    See lib/meta.js.
import { pixelSnippet, shouldInjectPixel } from '../lib/meta.js';

const REDIRECT_HOSTS = new Set(['www.groundapp.live', 'groundapp.pages.dev']);
const BLOCKED = /^\/(substack|marketing)(\/|$)|^\/Screenshot\s|^\/CLAUDE\.md|send-log|\.(py|log)$/i;

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  if (REDIRECT_HOSTS.has(url.hostname)) {
    return Response.redirect(`https://groundapp.live${url.pathname}${url.search}`, 301);
  }
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { /* keep raw */ }
  if (BLOCKED.test(path)) {
    return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  }
  const response = await next();
  if (!shouldInjectPixel({ env, url, request, response })) return response;
  const snippet = pixelSnippet(env.META_PIXEL_ID);
  return new HTMLRewriter()
    .on('head', { element(el) { el.append(snippet, { html: true }); } })
    .transform(response);
}
