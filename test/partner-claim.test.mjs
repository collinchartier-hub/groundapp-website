// test/partner-claim.test.mjs: POST /api/partner/claim, with Turnstile, Supabase and Resend stubbed.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/partner/claim.js';

const SB = 'https://sb.example.co';
const env = {
  SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: 'sb_service', UNSUBSCRIBE_SECRET: 'test-secret', RESEND_API_KEY: 're_test',
  TURNSTILE_SECRET: 'ts_secret', MAILING_ADDRESS: '123 Test St, Denver, CO 80202', ADMIN_EMAILS: 'collin@example.com',
};
const CODE = 'ABC123XYZ';
const TOKEN = 'abcdefghijklmnopqrstuv';
const claimRow = (over = {}) => ({ id: 'c1', status: 'assigned', first_name: 'Sam', email: 'sam@example.com', token: TOKEN, emailed_at: null, ...over });
const rpcResult = (over = {}) => ({ outcome: 'assigned', claim: claimRow(), code: CODE, redeem_url: `https://apps.apple.com/redeem?ctx=offercodes&id=6760352779&code=${CODE}`, codes_left: 400, ...over });

let calls;
let state;
let realFetch;
let realConsoleError;

beforeEach(() => {
  calls = [];
  state = { rpc: rpcResult(), turnstile: true, resendStatus: 200, alertRow: false, nudgeAttached: true };
  realFetch = globalThis.fetch;
  realConsoleError = console.error;
  console.error = () => {};
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const method = init.method || 'GET';
    let body = null;
    try { body = init.body ? JSON.parse(init.body) : null; } catch { body = String(init.body); }
    calls.push({ url: u, method, body });
    if (u.includes('challenges.cloudflare.com')) return new Response(JSON.stringify({ success: state.turnstile }), { status: 200 });
    if (u.endsWith('/rpc/partner_claim')) return new Response(JSON.stringify(state.rpc), { status: 200 });
    if (u === 'https://api.resend.com/emails') {
      return new Response(JSON.stringify({ id: `email_${calls.filter((c) => c.url === u).length}` }), { status: state.resendStatus });
    }
    if (method === 'GET') return new Response('[]', { status: 200 });
    if (u.includes('partner_claims?') && method === 'PATCH' && u.includes('redeem_tapped_at=is.null')) {
      return new Response(JSON.stringify(state.nudgeAttached ? [{ id: 'c1' }] : []), { status: 200 });
    }
    if (u.includes('partner_programs?') && method === 'PATCH') {
      return new Response(JSON.stringify(state.alertRow ? [{ slug: 'arsenal' }] : []), { status: 200 });
    }
    if (u.endsWith('/cancel') && method === 'POST') return new Response('{}', { status: 200 });
    return new Response(null, { status: method === 'POST' ? 201 : 204 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; console.error = realConsoleError; });

const good = { partner: 'arsenal', first_name: 'Sam', last_name: 'Lee', email: 'sam@example.com', device: 'iphone', location: 'Arvada', member: true, newsletter: false, src: 'ig', turnstile: 'tok', t: 6000 };
const post = (over = {}, headers = {}) =>
  onRequestPost({
    request: new Request('https://groundapp.live/api/partner/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://groundapp.live', 'cf-connecting-ip': '203.0.113.9', ...headers },
      body: JSON.stringify({ ...good, ...over }),
    }),
    env,
  });
const sends = () => calls.filter((c) => c.url === 'https://api.resend.com/emails');
const rpcs = () => calls.filter((c) => c.url.endsWith('/rpc/partner_claim'));
const patches = () => calls.filter((c) => c.method === 'PATCH' && c.url.includes('partner_claims'));

test('new iPhone claim: code emailed, reminder scheduled, claim stamped', async () => {
  const res = await post();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, status: 'assigned' });

  const [mail, nudge] = sends();
  assert.equal(sends().length, 2);
  assert.deepEqual(mail.body.to, ['sam@example.com']);
  assert.ok(mail.body.html.includes(CODE));
  assert.ok(mail.body.html.includes(`https://groundapp.live/arsenal/r/${TOKEN}`));
  assert.equal(mail.body.scheduled_at, undefined);
  const due = Date.parse(nudge.body.scheduled_at) - Date.now();
  assert.ok(due > 2.9 * 86400e3 && due < 3.1 * 86400e3);
  assert.ok(nudge.body.headers['List-Unsubscribe']);

  assert.equal(patches().length, 2);
  assert.ok(patches()[0].url.includes('id=eq.c1'));
  assert.ok(patches()[0].body.emailed_at);
  assert.equal(patches()[0].body.nudge_email_id, undefined);
  assert.ok(patches()[1].url.includes('redeem_tapped_at=is.null'));
  assert.equal(patches()[1].body.nudge_email_id, 'email_2');
});

test('the database gets clean values, a 22 character token and a hashed ip', async () => {
  await post({ first_name: '  Sam ', email: 'Sam.Lee+gym@Gmail.com' });
  const b = rpcs()[0].body;
  assert.equal(b.p_partner, 'arsenal');
  assert.equal(b.p_first, 'Sam');
  assert.equal(b.p_email, 'sam.lee+gym@gmail.com');
  assert.equal(b.p_email_key, 'samlee@gmail.com');
  assert.equal(b.p_src, 'ig');
  assert.match(b.p_token, /^[A-Za-z0-9_-]{22}$/);
  assert.match(b.p_ip_hash, /^[0-9a-f]{32}$/);
  assert.ok(!JSON.stringify(b).includes('203.0.113.9'));
});

test('the response never carries the code, the token or the link', async () => {
  const text = await (await post()).text();
  assert.ok(!text.includes(CODE));
  assert.ok(!text.includes(TOKEN));
});

test('repeat within 15 minutes: no email, status existing', async () => {
  state.rpc = rpcResult({ outcome: 'existing', claim: claimRow({ emailed_at: new Date(Date.now() - 5 * 60e3).toISOString() }) });
  assert.deepEqual(await (await post()).json(), { ok: true, status: 'existing' });
  assert.equal(sends().length, 0);
  assert.equal(patches().length, 0);
});

test('repeat after 15 minutes: the same code is sent again, no second reminder', async () => {
  state.rpc = rpcResult({ outcome: 'existing', claim: claimRow({ emailed_at: new Date(Date.now() - 20 * 60e3).toISOString() }) });
  assert.deepEqual(await (await post()).json(), { ok: true, status: 'existing' });
  assert.equal(sends().length, 1);
  assert.ok(sends()[0].body.html.includes(CODE));
  assert.equal(patches()[0].body.nudge_email_id, undefined);
});

test('a repeat after a failed first send gets its code and reminder', async () => {
  state.rpc = rpcResult({ outcome: 'existing', claim: claimRow({ emailed_at: null }) });
  assert.deepEqual(await (await post()).json(), { ok: true, status: 'existing' });
  assert.equal(sends().length, 2);
  assert.ok(sends()[0].body.html.includes(CODE));
  assert.ok(sends()[1].body.scheduled_at);
  assert.equal(patches()[1].body.nudge_email_id, 'email_2');
});

test('a reminder is cancelled when the member tapped before it was attached', async () => {
  state.nudgeAttached = false;
  assert.deepEqual(await (await post()).json(), { ok: true, status: 'assigned' });
  assert.ok(patches()[1].url.includes('redeem_tapped_at=is.null'));
  assert.ok(calls.some((c) => c.url === 'https://api.resend.com/emails/email_2/cancel' && c.method === 'POST'));
});

test('android: on the list, one email without a code', async () => {
  state.rpc = rpcResult({ outcome: 'android_waitlist', claim: claimRow({ status: 'android_waitlist' }), code: null, redeem_url: null });
  assert.deepEqual(await (await post({ device: 'android' })).json(), { ok: true, status: 'android' });
  assert.equal(rpcs()[0].body.p_device, 'android');
  assert.equal(sends().length, 1);
  assert.match(sends()[0].body.subject, /Android/);
});

test('bank empty: waitlist email, status waitlist', async () => {
  state.rpc = rpcResult({ outcome: 'waitlist', claim: claimRow({ status: 'waitlist' }), code: null, redeem_url: null, codes_left: 0 });
  assert.deepEqual(await (await post()).json(), { ok: true, status: 'waitlist' });
  assert.equal(sends().length, 1);
  assert.match(sends()[0].body.subject, /on the list/);
});

test('a repeat from someone on the waitlist stays waitlist', async () => {
  state.rpc = rpcResult({ outcome: 'existing', claim: claimRow({ status: 'waitlist' }), code: null, redeem_url: null });
  assert.deepEqual(await (await post()).json(), { ok: true, status: 'waitlist' });
});

test('crossing 75 codes left emails Collin', async () => {
  state.rpc = rpcResult({ codes_left: 75 });
  state.alertRow = true;
  await post();
  const alert = sends().find((c) => c.body.to[0] === 'collin@example.com');
  assert.ok(alert);
  assert.match(alert.body.subject, /75 codes left/);
});

test('74 codes left does not alert', async () => {
  state.rpc = rpcResult({ codes_left: 74 });
  await post();
  assert.equal(sends().filter((c) => c.body.to[0] === 'collin@example.com').length, 0);
  assert.ok(calls.some((c) => c.url.includes('partner_programs?slug=eq.arsenal') && c.body.low_stock_alerted === 75));
});

test('email refused: 502, the error is stored on the claim', async () => {
  state.resendStatus = 500;
  const res = await post();
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { ok: false, error: 'email' });
  assert.ok(patches()[0].body.email_error);
  assert.equal(patches()[0].body.emailed_at, undefined);
});

test('newsletter opt-in still joins the list when delivery fails', async () => {
  state.resendStatus = 500;
  await post({ newsletter: true });
  assert.ok(calls.some((c) => c.method === 'POST' && c.url.endsWith('/newsletter_subscribers')));
});

test('newsletter opt-in on a repeat still joins the list', async () => {
  state.rpc = rpcResult({ outcome: 'existing', claim: claimRow({ emailed_at: new Date().toISOString() }) });
  assert.deepEqual(await (await post({ newsletter: true })).json(), { ok: true, status: 'existing' });
  assert.ok(calls.some((c) => c.method === 'POST' && c.url.endsWith('/newsletter_subscribers')));
  assert.equal(sends().length, 0);
});

test('newsletter box ticked: added to the list as arsenal', async () => {
  await post({ newsletter: true });
  const ins = calls.find((c) => c.method === 'POST' && c.url.endsWith('/newsletter_subscribers'));
  assert.equal(ins.body.email, 'sam@example.com');
  assert.equal(ins.body.source, 'groundapp_site:arsenal');
});

test('newsletter box not ticked: the list is not touched', async () => {
  await post();
  assert.equal(calls.filter((c) => c.url.includes('newsletter_')).length, 0);
});

test('missing member tick: 400 and nothing is called', async () => {
  const res = await post({ member: false });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { ok: false, error: 'invalid', field: 'member' });
  assert.equal(calls.length, 0);
});

test('honeypot filled: pretend success, nothing is called', async () => {
  assert.deepEqual(await (await post({ website: 'http://spam' })).json(), { ok: true, status: 'assigned' });
  assert.equal(calls.length, 0);
});

test('bot check fails: 403 and the database is not called', async () => {
  state.turnstile = false;
  const res = await post();
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { ok: false, error: 'bot_check' });
  assert.equal(rpcs().length, 0);
});

test('database outcomes map to errors', async () => {
  state.rpc = { outcome: 'rate_limited' };
  assert.equal((await post()).status, 429);
  state.rpc = { outcome: 'bad_location' };
  assert.deepEqual(await (await post()).json(), { ok: false, error: 'invalid', field: 'location' });
  state.rpc = { outcome: 'unknown_partner' };
  assert.deepEqual(await (await post()).json(), { ok: false, error: 'invalid', field: 'partner' });
});

test('foreign origin: 403', async () => {
  assert.equal((await post({}, { origin: 'https://evil.example' })).status, 403);
});

test('no Turnstile secret (previews): 503', async () => {
  const res = await onRequestPost({
    request: new Request('https://groundapp.live/api/partner/claim', { method: 'POST', headers: { origin: 'https://groundapp.live' }, body: JSON.stringify(good) }),
    env: { ...env, TURNSTILE_SECRET: undefined },
  });
  assert.equal(res.status, 503);
});
