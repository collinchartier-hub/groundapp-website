// test/partner-redeem.test.mjs: GET /arsenal/r/<token>.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/arsenal/r/[token].js';
import { onRequestGet as onAionRequestGet } from '../functions/aion/r/[token].js';
import { onRequestGet as onTraverseRequestGet } from '../functions/traverse/r/[token].js';
import { onRequestGet as onReconRequestGet } from '../functions/recon/r/[token].js';

const env = { SUPABASE_URL: 'https://sb.example.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_service', RESEND_API_KEY: 're_test' };
const TOKEN = 'abcdefghijklmnopqrstuv';
const APPLE = 'https://apps.apple.com/redeem?ctx=offercodes&id=6760352779&code=ABC123XYZ';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

let calls;
let state;
let realFetch;
let waited;

beforeEach(() => {
  calls = [];
  waited = [];
  state = { tap: { found: true, partner: 'arsenal', status: 'assigned', claim_id: 'c1', first_tap: true, nudge_email_id: 'email_2', code: 'ABC123XYZ', redeem_url: APPLE }, cancelStatus: 200 };
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
    if (String(url).endsWith('/rpc/partner_tap')) return new Response(JSON.stringify(state.tap), { status: 200 });
    if (String(url).endsWith('/cancel')) return new Response('{}', { status: state.cancelStatus });
    return new Response('{}', { status: 200 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const get = (token, ua) =>
  onRequestGet({
    params: { token },
    request: new Request(`https://groundapp.live/arsenal/r/${token}`, { headers: { 'user-agent': ua } }),
    env,
    waitUntil: (p) => waited.push(p),
  });
const getAion = (token, ua) =>
  onAionRequestGet({
    params: { token },
    request: new Request(`https://groundapp.live/aion/r/${token}`, { headers: { 'user-agent': ua } }),
    env,
    waitUntil: (p) => waited.push(p),
  });
const getTraverse = (token, ua) =>
  onTraverseRequestGet({
    params: { token },
    request: new Request(`https://groundapp.live/traverse/r/${token}`, { headers: { 'user-agent': ua } }),
    env,
    waitUntil: (p) => waited.push(p),
  });
const getRecon = (token, ua) =>
  onReconRequestGet({
    params: { token },
    request: new Request(`https://groundapp.live/recon/r/${token}`, { headers: { 'user-agent': ua } }),
    env,
    waitUntil: (p) => waited.push(p),
  });

test('RECON iPhone link counts only its claim and redirects to its App Store offer', async () => {
  state.tap.partner = 'recon';
  state.tap.redeem_url = 'https://apps.apple.com/redeem?ctx=offercodes&id=6761865560&code=RECONCODE123';
  const res = await getRecon(TOKEN, IPHONE);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), state.tap.redeem_url);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: true, p_partner: 'recon' });
  await Promise.all(waited);
  assert.ok(calls.some((c) => c.url.endsWith('/cancel')));
});

test('RECON desktop link shows only its own brand, code, QR and return link', async () => {
  state.tap.partner = 'recon';
  state.tap.code = 'RECONCODE123';
  const res = await getRecon(TOKEN, MAC);
  assert.equal(res.status, 200);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: false, p_partner: 'recon' });
  const markup = await res.text();
  assert.ok(markup.includes('RECON WELLNESS × GroundApp'));
  assert.ok(markup.includes('/assets/css/recon-v1.css'));
  assert.ok(markup.includes(`data-qr="https://groundapp.live/recon/r/${TOKEN}"`));
  assert.ok(markup.includes('RECONCODE123'));
  assert.ok(markup.includes('Back to the RECON Wellness page'));
  assert.ok(!/Arsenal|AION|Traverse/.test(markup));
  assert.equal(res.headers.get('x-robots-tag'), 'noindex');
});

test('RECON rejects another partner token before cancellation or redirect', async () => {
  for (const other of ['arsenal', 'aion', 'traverse']) {
    state.tap.partner = other;
    const res = await getRecon(TOKEN, IPHONE);
    assert.equal(res.status, 404);
    assert.deepEqual(calls.at(-1).body, { p_token: TOKEN, p_ios: true, p_partner: 'recon' });
    assert.ok((await res.text()).includes('href="/recon"'));
  }
  assert.equal(waited.length, 0);
  assert.equal(calls.filter((c) => c.url.endsWith('/cancel')).length, 0);
});

test('RECON token on another partner route cannot redeem', async () => {
  state.tap.partner = 'recon';
  assert.equal((await get(TOKEN, IPHONE)).status, 404);
  assert.equal((await getAion(TOKEN, IPHONE)).status, 404);
  assert.equal((await getTraverse(TOKEN, IPHONE)).status, 404);
  assert.deepEqual(calls.map((c) => c.body.p_partner), ['arsenal', 'aion', 'traverse']);
  assert.equal(waited.length, 0);
});

test('Traverse iPhone link asks for its own claim and redirects to Apple', async () => {
  state.tap.partner = 'traverse';
  const res = await getTraverse(TOKEN, IPHONE);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), APPLE);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: true, p_partner: 'traverse' });
  await Promise.all(waited);
});

test('Traverse laptop link shows its own branding, QR and return page', async () => {
  state.tap.partner = 'traverse';
  const res = await getTraverse(TOKEN, MAC);
  assert.equal(res.status, 200);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: false, p_partner: 'traverse' });
  const markup = await res.text();
  assert.ok(markup.includes('TRAVERSE × GroundApp'));
  assert.ok(markup.includes('/assets/css/traverse-v1.css'));
  assert.ok(markup.includes(`data-qr="https://groundapp.live/traverse/r/${TOKEN}"`));
  assert.ok(markup.includes('Back to the Traverse Fitness page'));
});

test('Traverse rejects AION and Arsenal member tokens', async () => {
  for (const other of ['aion', 'arsenal']) {
    state.tap = { found: false, partner: other };
    const res = await getTraverse(TOKEN, IPHONE);
    assert.equal(res.status, 404);
    assert.deepEqual(calls.at(-1).body, { p_token: TOKEN, p_ios: true, p_partner: 'traverse' });
  }
});

test('AION iPhone link redirects to Apple and counts its tap', async () => {
  state.tap.partner = 'aion';
  const res = await getAion(TOKEN, IPHONE);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), APPLE);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: true, p_partner: 'aion' });
  await Promise.all(waited);
  assert.ok(calls.some((c) => c.url.endsWith('/cancel')));
});

test('AION desktop page uses AION lockup, stylesheet, back link and QR link', async () => {
  state.tap.partner = 'aion';
  const res = await getAion(TOKEN, MAC);
  assert.equal(res.status, 200);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: false, p_partner: 'aion' });
  const markup = await res.text();
  assert.ok(markup.includes('AION × GroundApp'));
  assert.ok(markup.includes('/assets/css/aion-v1.css'));
  assert.ok(markup.includes('data-qr="https://groundapp.live/aion/r/abcdefghijklmnopqrstuv"'));
  assert.ok(markup.includes('href="/aion"'));
  assert.ok(markup.includes('/assets/js/partner-qr-v1.js'));
});

test('a token from the other partner is not found on either route', async () => {
  state.tap = { found: false };
  assert.equal((await getAion(TOKEN, IPHONE)).status, 404);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: true, p_partner: 'aion' });
  assert.equal((await get(TOKEN, IPHONE)).status, 404);
  assert.deepEqual(calls[1].body, { p_token: TOKEN, p_ios: true, p_partner: 'arsenal' });
});

test('iPhone: counted, reminder cancelled, redirected to Apple', async () => {
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), APPLE);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: true, p_partner: 'arsenal' });
  await Promise.all(waited);
  assert.ok(calls.some((c) => c.url === 'https://api.resend.com/emails/email_2/cancel' && c.method === 'POST'));
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.url.includes('partner_claims?id=eq.c1') && c.body.nudge_email_id === null));
});

test('iPhone, second tap: redirected, nothing to cancel', async () => {
  state.tap = { ...state.tap, first_tap: false, nudge_email_id: null };
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 302);
  await Promise.all(waited);
  assert.equal(calls.filter((c) => c.url.includes('resend.com')).length, 0);
});

test('failed cancellation leaves the reminder id to retry later', async () => {
  state.cancelStatus = 500;
  const realError = console.error;
  console.error = () => {};
  try {
    const res = await get(TOKEN, IPHONE);
    assert.equal(res.status, 302);
    await Promise.all(waited);
    assert.ok(calls.some((c) => c.url.endsWith('/cancel')));
    assert.equal(calls.filter((c) => c.method === 'PATCH').length, 0);
  } finally {
    console.error = realError;
  }
});

test('a second tap retries a reminder that still has an id', async () => {
  state.tap = { ...state.tap, first_tap: false };
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 302);
  await Promise.all(waited);
  assert.ok(calls.some((c) => c.url.endsWith('/cancel')));
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.body.nudge_email_id === null));
});

test('laptop: a page with the code and the link, not counted', async () => {
  const res = await get(TOKEN, MAC);
  assert.equal(res.status, 200);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: false, p_partner: 'arsenal' });
  const html = await res.text();
  assert.ok(html.includes('ABC123XYZ'));
  assert.ok(html.includes(`data-qr="https://groundapp.live/arsenal/r/${TOKEN}"`));
  assert.ok(html.includes('Open this on your iPhone'));
  assert.equal(res.headers.get('x-robots-tag'), 'noindex');
});

test('a waitlist claim has no code yet: says so', async () => {
  state.tap = { found: true, partner: 'arsenal', status: 'waitlist', first_tap: false, nudge_email_id: null, code: null, redeem_url: null };
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes('on the list'));
});

test('unknown token: 404 with a way back', async () => {
  state.tap = { found: false };
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 404);
  assert.ok((await res.text()).includes('href="/arsenal"'));
});

test('malformed token: 404 without calling the database', async () => {
  const res = await get('nope', IPHONE);
  assert.equal(res.status, 404);
  assert.equal(calls.length, 0);
});

test("another partner's token is not found here", async () => {
  state.tap = { found: false };
  assert.equal((await get(TOKEN, IPHONE)).status, 404);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: true, p_partner: 'arsenal' });
});

test('a mismatched RPC response is rejected as a second guard', async () => {
  state.tap.partner = 'aion';
  assert.equal((await get(TOKEN, IPHONE)).status, 404);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: true, p_partner: 'arsenal' });
  assert.equal(calls.filter((c) => c.url.endsWith('/cancel')).length, 0);
});
