// GET and POST /<partner>/r/<token>: GET on desktop never opens a code.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestPost } from '../functions/arsenal/r/[token].js';
import { onRequestGet as getAion } from '../functions/aion/r/[token].js';
import { onRequestGet as getTraverse } from '../functions/traverse/r/[token].js';
import { onRequestGet as getRecon } from '../functions/recon/r/[token].js';

const env = { SUPABASE_URL: 'https://sb.example.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_service' };
const TOKEN = 'abcdefghijklmnopqrstuv';
const APPLE = 'https://apps.apple.com/redeem?ctx=offercodes&id=6760352779&code=ABC123XYZ';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
let calls, state, realFetch;
beforeEach(() => {
  calls = [];
  state = { tap: { found: true, partner: 'arsenal', status: 'assigned', redeem_url: APPLE }, reveal: { found: true, code: 'ABC123XYZ' } };
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const call = { url: String(url), method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null };
    calls.push(call);
    if (call.url.endsWith('/rpc/partner_tap')) return Response.json(state.tap);
    if (call.url.endsWith('/rpc/partner_reveal_code')) return Response.json(state.reveal);
    throw new Error(`unexpected request: ${url}`);
  };
});
afterEach(() => { globalThis.fetch = realFetch; });
const get = (ua, token = TOKEN) => onRequestGet({
  params: { token }, env, request: new Request(`https://groundapp.live/arsenal/r/${token}`, { headers: { 'user-agent': ua } }),
});
const post = (origin = 'https://groundapp.live', token = TOKEN) => onRequestPost({
  params: { token }, env, request: new Request(`https://groundapp.live/arsenal/r/${token}`, { method: 'POST', headers: { origin } }),
});

test('iPhone GET marks code opened through tap RPC and redirects to Apple', async () => {
  const res = await get(IPHONE);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), APPLE);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: true, p_partner: 'arsenal' });
  assert.equal(calls.length, 1);
});

test('non-iOS GET neither marks opened nor prints the code', async () => {
  const res = await get(MAC);
  assert.equal(res.status, 200);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_ios: false, p_partner: 'arsenal' });
  assert.equal(calls.length, 1);
  const markup = await res.text();
  assert.ok(!markup.includes('ABC123XYZ'));
  assert.ok(markup.includes(`data-qr="https://groundapp.live/arsenal/r/${TOKEN}"`));
  assert.ok(markup.includes('Show my code'));
  assert.equal(res.headers.get('x-robots-tag'), 'noindex');
});

test('desktop page can report a network failure without opening the code', async () => {
  const markup = await (await get(MAC)).text();
  assert.ok(markup.includes("We couldn't show your code. Try again in a minute."));
  const script = await (await import('node:fs/promises')).readFile(new URL('../site/assets/js/partner-reveal-v1.js', import.meta.url), 'utf8');
  assert.match(script, /fetch\(form\.action/);
  assert.equal(calls.length, 1);
});

test('same-origin button POST reveals a code and records the opening', async () => {
  const res = await post();
  assert.equal(res.status, 200);
  assert.deepEqual(calls[0].body, { p_token: TOKEN, p_partner: 'arsenal' });
  assert.ok(calls[0].url.endsWith('/rpc/partner_reveal_code'));
  assert.match(await res.text(), /Your code\. It's yours alone and works once\.[\s\S]*ABC123XYZ/);
});

test('cross-site and missing-origin POST cannot reveal a code', async () => {
  assert.equal((await post('https://evil.example')).status, 403);
  assert.equal((await post('')).status, 403);
  assert.equal(calls.length, 0);
});

test('a second POST uses the same idempotent reveal RPC', async () => {
  await post();
  await post();
  assert.equal(calls.length, 2);
  assert.ok(calls.every((x) => x.url.endsWith('/rpc/partner_reveal_code')));
  const fs = await import('node:fs/promises');
  const sql = await fs.readFile(new URL('../db/2026-11-19_partner_followups.sql', import.meta.url), 'utf8');
  assert.match(sql, /code_opened_at\s*=\s*coalesce\(code_opened_at,\s*now\(\)\)/);
});

test('all partner routes scope the token, brand and QR independently', async () => {
  for (const [slug, handler, lockup] of [
    ['aion', getAion, 'AION'],
    ['traverse', getTraverse, 'TRAVERSE'],
    ['recon', getRecon, 'RECON WELLNESS'],
  ]) {
    state.tap.partner = slug;
    const res = await handler({ params: { token: TOKEN }, env,
      request: new Request(`https://groundapp.live/${slug}/r/${TOKEN}`, { headers: { 'user-agent': MAC } }) });
    const markup = await res.text();
    assert.equal(res.status, 200);
    assert.ok(markup.includes(`${lockup} × GroundApp`));
    assert.ok(markup.includes(`data-qr="https://groundapp.live/${slug}/r/${TOKEN}"`));
    assert.ok(!markup.includes('ABC123XYZ'));
    assert.deepEqual(calls.at(-1).body, { p_token: TOKEN, p_ios: false, p_partner: slug });
  }
});

test('another partner token and malformed token never reveal a code', async () => {
  state.tap.partner = 'recon';
  assert.equal((await get(IPHONE)).status, 404);
  assert.equal((await get(MAC, 'nope')).status, 404);
  assert.equal(calls.length, 1);
});

test('waitlist claim has no code and never reveals one', async () => {
  state.tap.status = 'waitlist';
  assert.match(await (await get(IPHONE)).text(), /on the list/);
  state.reveal.found = false;
  assert.equal((await post()).status, 404);
});
