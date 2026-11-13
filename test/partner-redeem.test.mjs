// test/partner-redeem.test.mjs: GET /arsenal/r/<token>.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/arsenal/r/[token].js';

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
  state = { tap: { found: true, partner: 'arsenal', status: 'assigned', first_tap: true, nudge_email_id: 'email_2', code: 'ABC123XYZ', redeem_url: APPLE } };
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
    if (String(url).endsWith('/rpc/partner_tap')) return new Response(JSON.stringify(state.tap), { status: 200 });
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

test('iPhone: counted, reminder cancelled, redirected to Apple', async () => {
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), APPLE);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: true });
  await Promise.all(waited);
  assert.ok(calls.some((c) => c.url === 'https://api.resend.com/emails/email_2/cancel' && c.method === 'POST'));
});

test('iPhone, second tap: redirected, nothing to cancel', async () => {
  state.tap = { ...state.tap, first_tap: false, nudge_email_id: null };
  const res = await get(TOKEN, IPHONE);
  assert.equal(res.status, 302);
  await Promise.all(waited);
  assert.equal(calls.filter((c) => c.url.includes('resend.com')).length, 0);
});

test('laptop: a page with the code and the link, not counted', async () => {
  const res = await get(TOKEN, MAC);
  assert.equal(res.status, 200);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: false });
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

test("another partner's token does not work here", async () => {
  state.tap = { ...state.tap, partner: 'othergym' };
  assert.equal((await get(TOKEN, IPHONE)).status, 404);
});
