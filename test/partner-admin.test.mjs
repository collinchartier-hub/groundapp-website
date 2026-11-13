// test/partner-admin.test.mjs: /api/admin/partner. Uses the local-dev admin bypass from lib/access.js.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestPost } from '../functions/api/admin/partner.js';

const env = { SUPABASE_URL: 'https://sb.example.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_service', RESEND_API_KEY: 're_test', UNSUBSCRIBE_SECRET: 's', DEV_ADMIN_BYPASS: '1', MAILING_ADDRESS: '123 Test St' };
const result = (id, status = 'assigned') => ({
  outcome: 'assigned',
  claim: { id, status, first_name: 'Sam', email: `${id}@example.com`, token: 'abcdefghijklmnopqrstuv', emailed_at: null },
  code: status === 'assigned' ? `CODE${id}` : null, redeem_url: status === 'assigned' ? `https://apps.apple.com/redeem?code=CODE${id}` : null, codes_left: 10,
});

let calls;
let state;
let realFetch;
beforeEach(() => {
  calls = [];
  state = { claimRows: [{ id: 'c1', partner: 'arsenal', status: 'assigned', first_name: 'Sam', email: 'c1@example.com', token: 'abcdefghijklmnopqrstuv', emailed_at: null }], codeRows: [{ code: 'CODEc1', redeem_url: 'https://apps.apple.com/redeem?code=CODEc1' }], released: [result('w1'), result('w2')], throwOnPatchFor: null };
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const method = init.method || 'GET';
    calls.push({ url: u, method, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    if (state.throwOnPatchFor && method === 'PATCH' && u.includes(`partner_claims?id=eq.${state.throwOnPatchFor}`)) throw new Error('connection lost');
    if (method === 'PATCH' && u.includes('partner_programs?') && u.includes('low_stock_alerted')) return new Response('[]', { status: 200 });
    if (u.endsWith('/rpc/partner_admin_summary')) return new Response(JSON.stringify({ program: { slug: 'arsenal', status: 'live' }, codes: { left: 440 }, rows: [] }), { status: 200 });
    if (u.endsWith('/rpc/partner_release_waitlist')) return new Response(JSON.stringify(state.released), { status: 200 });
    if (method === 'GET' && u.includes('partner_claims')) return new Response(JSON.stringify(state.claimRows), { status: 200 });
    if (method === 'GET' && u.includes('partner_codes')) return new Response(JSON.stringify(state.codeRows), { status: 200 });
    if (u === 'https://api.resend.com/emails') return new Response(JSON.stringify({ id: 'email_1' }), { status: 200 });
    return new Response(null, { status: 204 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const get = (qs, e = env) => onRequestGet({ request: new Request(`http://localhost:8788/api/admin/partner${qs}`), env: e });
const post = (body, e = env) =>
  onRequestPost({ request: new Request('http://localhost:8788/api/admin/partner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: e });
const sends = () => calls.filter((c) => c.url === 'https://api.resend.com/emails');

test('not signed in: refused', async () => {
  const res = await get('?slug=arsenal', { ...env, DEV_ADMIN_BYPASS: undefined });
  assert.ok(res.status === 401 || res.status === 503);
  assert.equal(calls.length, 0);
});

test('GET returns the summary for the partner', async () => {
  const res = await get('?slug=arsenal');
  const j = await res.json();
  assert.equal(j.ok, true);
  assert.equal(j.codes.left, 440);
  assert.deepEqual(calls[0].body, { p_partner: 'arsenal' });
});

test('GET rejects a bad slug', async () => {
  assert.equal((await get('?slug=../x')).status, 400);
});

test('pause and resume set the partner status', async () => {
  await post({ action: 'pause', slug: 'arsenal' });
  assert.ok(calls[0].url.includes('partner_programs?slug=eq.arsenal'));
  assert.deepEqual(calls[0].body, { status: 'paused' });
  await post({ action: 'resume', slug: 'arsenal' });
  assert.deepEqual(calls[1].body, { status: 'live' });
});

test('resend sends the claim its code again and stamps it', async () => {
  const res = await post({ action: 'resend', slug: 'arsenal', claim_id: 'c1' });
  assert.deepEqual(await res.json(), { ok: true, sent: 1 });
  assert.equal(sends().length, 1);
  assert.ok(sends()[0].body.html.includes('CODEc1'));
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.url.includes('partner_claims?id=eq.c1') && c.body.emailed_at));
  assert.match(sends()[0].headers['idempotency-key'], /^partner-claim\/c1\/\d+\/\d+$/);
});

test('resend for an unknown claim: 404', async () => {
  state.claimRows = [];
  assert.equal((await post({ action: 'resend', slug: 'arsenal', claim_id: 'c2' })).status, 404);
});

test('release_waitlist emails each released claim with a reminder', async () => {
  const res = await post({ action: 'release_waitlist', slug: 'arsenal' });
  assert.deepEqual(await res.json(), { ok: true, sent: 2, failed: 0 });
  assert.deepEqual(calls[0].body, { p_partner: 'arsenal', p_limit: 10 });
  assert.equal(sends().filter((c) => !c.body.scheduled_at).length, 2);
  assert.equal(sends().filter((c) => c.body.scheduled_at).length, 2);
  assert.ok(calls.some((c) => c.url.includes('partner_programs?slug=eq.arsenal') && c.body.low_stock_alerted === 25));
});

test('release_waitlist keeps delivering after one claim throws', async () => {
  state.throwOnPatchFor = 'w1';
  const realError = console.error;
  console.error = () => {};
  try {
    const res = await post({ action: 'release_waitlist', slug: 'arsenal' });
    assert.deepEqual(await res.json(), { ok: true, sent: 1, failed: 1 });
    assert.ok(sends().some((c) => c.body.to[0] === 'w2@example.com'));
  } finally {
    console.error = realError;
  }
});

test('unknown action: 400', async () => {
  assert.equal((await post({ action: 'drop_tables', slug: 'arsenal' })).status, 400);
});
