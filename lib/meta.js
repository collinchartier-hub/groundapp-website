// Meta (Facebook + Instagram) ad measurement for groundapp.live.
// - The pixel is added to HTML pages by functions/_middleware.js.
// - Each App Store tap also goes to Meta from the server as a custom event "AppStoreClick"
//   (Conversions API), with the same event_id as the browser's, so Meta counts it once.
// Sends only the tap, which button (ct), IP, user agent and Meta's own _fbp/_fbc cookies.
// Nothing from the App ever goes to Meta.
// Visitors in the EU/EEA, UK and Switzerland get no pixel and no server event (GDPR/ePrivacy
// would need consent first, and the site has no consent banner). Same for browsers sending
// Global Privacy Control. privacy.html Section 7 + the California section describe this.
//
// env: META_PIXEL_ID (var), META_CAPI_TOKEN (secret), META_TEST_EVENT_CODE (optional secret).

const GRAPH_VERSION = 'v24.0';
const EVENT_ID = /^[A-Za-z0-9_-]{8,64}$/;

export const NO_TRACK_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
]);

// Unknown country (local dev) counts as allowed; in production Cloudflare always sets it.
// A Global Privacy Control signal (Sec-GPC: 1) is an opt-out of sharing: no pixel, no server event.
export function trackingAllowed(request) {
  if (request.headers.get('sec-gpc') === '1') return false;
  const country = request.cf?.country;
  return !country || !NO_TRACK_COUNTRIES.has(String(country).toUpperCase());
}

// Should the middleware add the pixel to this response?
export function shouldInjectPixel({ env, url, request, response }) {
  if (!env.META_PIXEL_ID || !/^\d{6,20}$/.test(String(env.META_PIXEL_ID))) return false;
  if (env.SITE_HOST && url.hostname !== env.SITE_HOST) return false; // previews and pages.dev stay clean
  if (/^\/(admin|api)(\/|$)/.test(url.pathname)) return false;
  if (!/text\/html/i.test(response.headers.get('content-type') || '')) return false;
  return trackingAllowed(request);
}

export function pixelSnippet(pixelId) {
  return `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
    `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;` +
    `n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];` +
    `s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
    `fbq('init','${pixelId}');fbq('track','PageView');</script>`;
}

export function eventId(raw) {
  const s = String(raw ?? '');
  return EVENT_ID.test(s) ? s : crypto.randomUUID();
}

function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim() || undefined;
  }
  return undefined;
}

export function buildAppStoreClick({ request, eid, ct, path, nowMs = Date.now() }) {
  const cookies = request.headers.get('cookie');
  const user_data = {
    client_ip_address: request.headers.get('cf-connecting-ip') || undefined,
    client_user_agent: request.headers.get('user-agent') || undefined,
    fbp: readCookie(cookies, '_fbp'),
    fbc: readCookie(cookies, '_fbc'),
  };
  for (const k of Object.keys(user_data)) if (user_data[k] === undefined) delete user_data[k];
  return {
    event_name: 'AppStoreClick',
    event_time: Math.floor(nowMs / 1000),
    event_id: eid,
    action_source: 'website',
    event_source_url: `https://groundapp.live${/^\/[A-Za-z0-9/._-]{0,200}$/.test(path || '') ? path : '/'}`,
    user_data,
    custom_data: { ct },
  };
}

// Never throws: Meta being down must never affect the tap counter.
export async function sendAppStoreClick(env, request, { eid, ct, path }) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return { skipped: 'not_configured' };
  if (!trackingAllowed(request)) return { skipped: 'country' };
  try {
    const body = { data: [buildAppStoreClick({ request, eid: eventId(eid), ct, path })] };
    if (env.META_TEST_EVENT_CODE) body.test_event_code = env.META_TEST_EVENT_CODE;
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${env.META_PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.META_CAPI_TOKEN}` },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('tap: meta capi failed', res.status, out?.error?.message || '');
      return { ok: false, status: res.status };
    }
    console.log('tap: meta appstoreclick sent', out.events_received ?? '?');
    return { ok: true };
  } catch (err) {
    console.error('tap: meta capi error', err?.message || err);
    return { ok: false };
  }
}
