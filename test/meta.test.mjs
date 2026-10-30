// test/meta.test.mjs  (node --test test/)
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildAppStoreClick, eventId, pixelSnippet, sendAppStoreClick, shouldInjectPixel, trackingAllowed } from '../lib/meta.js';

const PIXEL = '1617764016511042';
const env = { META_PIXEL_ID: PIXEL, META_CAPI_TOKEN: 'capi_test', SITE_HOST: 'groundapp.live' };
const EID = 'tap_0123456789abcdef';

function req({ country = 'US', gpc, cookie, url = 'https://groundapp.live/' } = {}) {
  const headers = { 'cf-connecting-ip': '203.0.113.5', 'user-agent': 'Mozilla/5.0 Test' };
  if (gpc) headers['sec-gpc'] = gpc;
  if (cookie) headers.cookie = cookie;
  const r = new Request(url, { method: 'POST', headers, body: '{}' });
  if (country) Object.defineProperty(r, 'cf', { value: { country } });
  return r;
}
const html = (type = 'text/html; charset=utf-8') => new Response('<html><head></head></html>', { headers: { 'content-type': type } });

test('trackingAllowed: US yes; EU, UK, Swiss and GPC no', () => {
  assert.equal(trackingAllowed(req({ country: 'US' })), true);
  assert.equal(trackingAllowed(req({ country: 'CA' })), true);
  for (const c of ['DE', 'FR', 'IE', 'GB', 'CH', 'NO', 'is']) assert.equal(trackingAllowed(req({ country: c })), false, c);
  assert.equal(trackingAllowed(req({ country: 'US', gpc: '1' })), false);
});

test('shouldInjectPixel: only real HTML pages on groundapp.live', () => {
  const go = (path, over = {}) => shouldInjectPixel({
    env: over.env || env, url: new URL(`https://${over.host || 'groundapp.live'}${path}`),
    request: over.request || req(), response: over.response || html(),
  });
  assert.equal(go('/'), true);
  assert.equal(go('/blog/box-breathing/'), true);
  assert.equal(go('/admin'), false);
  assert.equal(go('/admin/'), false);
  assert.equal(go('/api/tap'), false);
  assert.equal(go('/', { host: 'abc123.groundapp.pages.dev' }), false);
  assert.equal(go('/og-image.jpg', { response: html('image/jpeg') }), false);
  assert.equal(go('/', { request: req({ country: 'DE' }) }), false);
  assert.equal(go('/', { request: req({ gpc: '1' }) }), false);
  assert.equal(go('/', { env: { ...env, META_PIXEL_ID: '' } }), false);
  assert.equal(go('/', { env: { ...env, META_PIXEL_ID: "1');alert(1)//" } }), false);
});

test('pixelSnippet: init + PageView for the pixel, no noscript image', () => {
  const s = pixelSnippet(PIXEL);
  assert.match(s, /^<script>.*<\/script>$/);
  assert.ok(s.includes(`fbq('init','${PIXEL}')`));
  assert.ok(s.includes("fbq('track','PageView')"));
  assert.ok(!s.includes('noscript'));
});

test('buildAppStoreClick: tap, button and Meta cookies only', () => {
  const ev = buildAppStoreClick({ request: req({ cookie: '_fbp=fb.1.1.2; _fbc=fb.1.3.CLICK; x=1' }), eid: EID, ct: 'ad-hero', path: '/blog/x/', nowMs: 1700000000000 });
  assert.deepEqual(ev, {
    event_name: 'AppStoreClick', event_time: 1700000000, event_id: EID, action_source: 'website',
    event_source_url: 'https://groundapp.live/blog/x/',
    user_data: { client_ip_address: '203.0.113.5', client_user_agent: 'Mozilla/5.0 Test', fbp: 'fb.1.1.2', fbc: 'fb.1.3.CLICK' },
    custom_data: { ct: 'ad-hero' },
  });
  assert.equal(buildAppStoreClick({ request: req(), eid: EID, ct: 'site-hero', path: 'javascript:x' }).event_source_url, 'https://groundapp.live/');
});

test('eventId keeps a sane id and replaces anything else', () => {
  assert.equal(eventId(EID), EID);
  assert.match(eventId('<x>'), /^[0-9a-f-]{36}$/);
});

let realFetch, realErr, realLog, calls, impl;
beforeEach(() => {
  realFetch = globalThis.fetch; realErr = console.error; realLog = console.log;
  console.error = () => {}; console.log = () => {};
  calls = [];
  impl = async () => new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init, body: JSON.parse(init.body) }); return impl(url, init); };
});
afterEach(() => { globalThis.fetch = realFetch; console.error = realErr; console.log = realLog; });

test('sendAppStoreClick: posts to the pixel with the browser event id', async () => {
  assert.deepEqual(await sendAppStoreClick(env, req(), { eid: EID, ct: 'site-hero', path: '/' }), { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://graph.facebook.com/v24.0/${PIXEL}/events`);
  assert.equal(calls[0].init.headers.authorization, 'Bearer capi_test');
  assert.equal(calls[0].body.data[0].event_id, EID);
  assert.equal(calls[0].body.test_event_code, undefined);
});

test('sendAppStoreClick: skips EU, GPC and an unconfigured site; never throws', async () => {
  assert.deepEqual(await sendAppStoreClick(env, req({ country: 'FR' }), { eid: EID, ct: 'site-hero' }), { skipped: 'country' });
  assert.deepEqual(await sendAppStoreClick(env, req({ gpc: '1' }), { eid: EID, ct: 'site-hero' }), { skipped: 'country' });
  assert.deepEqual(await sendAppStoreClick({ ...env, META_CAPI_TOKEN: '' }, req(), { eid: EID, ct: 'site-hero' }), { skipped: 'not_configured' });
  assert.equal(calls.length, 0);
  impl = async () => { throw new Error('down'); };
  assert.deepEqual(await sendAppStoreClick(env, req(), { eid: EID, ct: 'site-hero' }), { ok: false });
  impl = async () => new Response('{"error":{"message":"bad"}}', { status: 400 });
  assert.deepEqual(await sendAppStoreClick(env, req(), { eid: EID, ct: 'site-hero' }), { ok: false, status: 400 });
});
