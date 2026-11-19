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
  state = { claimRows: [{ id: 'c1', partner: 'arsenal', status: 'assigned', first_name: 'Sam', email: 'c1@example.com', token: 'abcdefghijklmnopqrstuv', emailed_at: null }], codeRows: [{ code: 'CODEc1', redeem_url: 'https://apps.apple.com/redeem?code=CODEc1' }], released: [result('w1'), result('w2')], throwOnPatchFor: null, programsStatus: 200, summary: null };
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const method = init.method || 'GET';
    calls.push({ url: u, method, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    if (state.throwOnPatchFor && method === 'PATCH' && u.includes(`partner_claims?id=eq.${state.throwOnPatchFor}`)) throw new Error('connection lost');
    if (method === 'PATCH' && u.includes('partner_programs?') && u.includes('low_stock_alerted')) return new Response('[]', { status: 200 });
    if (method === 'GET' && u.includes('partner_programs?select=slug,name,status&order=created_at.asc')) return new Response(JSON.stringify([{ slug: 'arsenal', name: 'Arsenal Health', status: 'live' }, { slug: 'aion', name: 'AION', status: 'paused' }, { slug: 'recon', name: 'RECON Wellness', status: 'paused' }]), { status: state.programsStatus });
    if (u.endsWith('/rpc/partner_admin_summary')) return new Response(JSON.stringify(state.summary || { program: { slug: init.body ? JSON.parse(init.body).p_partner : 'arsenal', status: 'live' }, codes: { left: 440 }, rows: [] }), { status: 200 });
    if (u.endsWith('/rpc/partner_release_waitlist')) return new Response(JSON.stringify(state.released), { status: 200 });
    if (method === 'GET' && u.includes('partner_claims')) return new Response(JSON.stringify(state.claimRows), { status: 200 });
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

test('GET retains per-gym bucket counts and App Store redemption date from the summary', async () => {
  state.summary = {
    program: { slug: 'aion', code_cap: 200, apple_offer_id: 'offer-a' },
    codes: { total: 500, cap: 200, assigned: 3, left: 197 },
    apple: { offer_id: 'offer-a', redemptions: 2, last_date: '2026-11-16' },
    claims: { assigned: 3, tapped: 1 },
    rows: [],
  };
  const res = await get('?slug=aion');
  const payload = await res.json();
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.codes, state.summary.codes);
  assert.deepEqual(payload.apple, state.summary.apple);
  assert.deepEqual(payload.program, state.summary.program);
});

test('GET without a slug lists available partner programs', async () => {
  const res = await get('');
  assert.deepEqual(await res.json(), {
    ok: true,
    programs: [
      { slug: 'arsenal', name: 'Arsenal Health', status: 'live' },
      { slug: 'aion', name: 'AION', status: 'paused' },
      { slug: 'recon', name: 'RECON Wellness', status: 'paused' },
    ],
  });
  assert.equal(calls[0].method, 'GET');
  assert.ok(calls[0].url.endsWith('/partner_programs?select=slug,name,status&order=created_at.asc'));
});

test('GET with AION slug returns only its own summary', async () => {
  const res = await get('?slug=aion');
  assert.equal((await res.json()).program.slug, 'aion');
  assert.deepEqual(calls[0].body, { p_partner: 'aion' });
});

test('RECON admin summary is scoped to its own partner', async () => {
  const res = await get('?slug=recon');
  assert.equal((await res.json()).program.slug, 'recon');
  assert.deepEqual(calls[0].body, { p_partner: 'recon' });
});

test('GET program list reports a backend failure', async () => {
  state.programsStatus = 500;
  const realError = console.error;
  console.error = () => {};
  try {
    assert.equal((await get('')).status, 500);
  } finally {
    console.error = realError;
  }
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

test('resend sends the claim link without code or scheduling and stamps it', async () => {
  const res = await post({ action: 'resend', slug: 'arsenal', claim_id: 'c1' });
  assert.deepEqual(await res.json(), { ok: true, sent: 1 });
  assert.equal(sends().length, 1);
  assert.ok(!sends()[0].body.html.includes('CODEc1'));
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.url.includes('partner_claims?id=eq.c1') && c.body.emailed_at));
  assert.match(sends()[0].headers['idempotency-key'], /^partner-claim\/c1\/\d+\/\d+$/);
  assert.equal(sends()[0].body.scheduled_at, undefined);
  assert.ok(!calls.some((c) => c.url.includes('partner_codes?')), 'resend does not fetch codes');
});

test('RECON admin resend looks up only its claim and sends its own branded link', async () => {
  state.claimRows = [{ ...state.claimRows[0], partner: 'recon' }];
  // The code is intentionally never read for an admin resend.
  const res = await post({ action: 'resend', slug: 'recon', claim_id: 'c1' });
  assert.deepEqual(await res.json(), { ok: true, sent: 1 });
  assert.ok(calls.some((c) => c.url.includes('partner_claims?id=eq.c1&partner=eq.recon')));
  assert.ok(sends()[0].body.html.includes('https://groundapp.live/recon/r/abcdefghijklmnopqrstuv'));
  assert.ok(sends()[0].body.html.includes('RECON Wellness'));
  assert.ok(!/Arsenal|AION|Traverse/.test(sends()[0].body.html));
});

test('resend for an unknown claim: 404', async () => {
  state.claimRows = [];
  assert.equal((await post({ action: 'resend', slug: 'arsenal', claim_id: 'c2' })).status, 404);
});

test('release_waitlist emails each released claim without scheduling a reminder', async () => {
  const res = await post({ action: 'release_waitlist', slug: 'arsenal' });
  assert.deepEqual(await res.json(), { ok: true, sent: 2, failed: 0 });
  assert.deepEqual(calls[0].body, { p_partner: 'arsenal', p_limit: 10 });
  assert.equal(sends().length, 2);
  assert.ok(sends().every((c) => !c.body.scheduled_at && !c.body.html.includes('CODE')));
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

test('admin distinguishes a claimed follow-up with unconfirmed bookkeeping from a sent one', async () => {
  const { readFile } = await import('node:fs/promises');
  const page = await readFile(new URL('../site/admin/index.html', import.meta.url), 'utf8');
  assert.match(page, /followup_kind\s*===\s*'welcome'.*followup_kind\s*===\s*'reminder'/);
  assert.match(page, /!r\.followup_email_id\s*&&\s*!r\.followup_error/);
  assert.match(page, /not confirmed/);
});
