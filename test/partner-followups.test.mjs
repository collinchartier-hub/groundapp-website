import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/partner/followups.js';

const env = { PARTNER_CRON_SECRET: 'correct-secret', SUPABASE_URL: 'https://sb.example.co', SUPABASE_SERVICE_ROLE_KEY: 'service', RESEND_API_KEY: 'resend', UNSUBSCRIBE_SECRET: 'unsub', MAILING_ADDRESS: '123 Test St' };
const due = new Date(Date.now() - 3 * 86400000).toISOString();
const claim = (id, opened = null) => ({ id, partner: 'arsenal', first_name: 'Sam', email: `${id}@example.com`, token: 'abcdefghijklmnopqrstuv', code_opened_at: opened, emailed_at: due, followup_kind: opened ? 'welcome' : 'reminder' });
let calls, queued, realFetch;
beforeEach(() => {
  calls = [];
  queued = [];
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), method, body, headers: init.headers });
    if (String(url).endsWith('/rpc/partner_claim_followups')) return Response.json(queued.splice(0));
    if (String(url) === 'https://api.resend.com/emails') return Response.json({ id: `sent-${calls.length}` });
    if (method === 'PATCH') return new Response(null, { status: 204 });
    throw new Error(`unexpected fetch ${url}`);
  };
});
afterEach(() => { globalThis.fetch = realFetch; });
const run = (secret = 'correct-secret') => onRequestPost({ request: new Request('https://groundapp.live/api/partner/followups', { method: 'POST', headers: { 'x-partner-cron-secret': secret } }), env });

test('bad or missing secret is rejected before touching database', async () => {
  assert.equal((await run('bad-secret')).status, 401);
  assert.equal((await run('')).status, 401);
  assert.equal(calls.length, 0);
});

test('opened claim gets welcome, unopened claim gets reminder; repeated run sends nothing', async () => {
  queued = [claim('opened', due), claim('unopened')];
  const first = await run();
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { ok: true, claimed: 2, sent: 2, failed: 0, bookkeeping_failed: 0 });
  const sends = calls.filter((x) => x.url === 'https://api.resend.com/emails');
  assert.equal(sends.length, 2);
  assert.match(sends[0].body.subject, /GroundApp/);
  assert.notEqual(sends[0].body.subject, sends[1].body.subject);
  assert.equal(sends[0].headers['idempotency-key'], 'partner-followup/opened');
  assert.equal(sends[1].headers['idempotency-key'], 'partner-followup/unopened');
  assert.ok(sends.every((s) => !s.body.html.includes('ABC123XYZ') && s.body.headers['List-Unsubscribe']));
  assert.equal(calls.filter((x) => x.method === 'PATCH').length, 2);
  assert.deepEqual(await (await run()).json(), { ok: true, claimed: 0, sent: 0, failed: 0, bookkeeping_failed: 0 });
  assert.equal(calls.filter((x) => x.url === 'https://api.resend.com/emails').length, 2);
});

test('an unsubscribed eligible row is marked skipped in the RPC, not emailed', async () => {
  // The RPC claims skipped_unsubscribed rows without returning them to Pages.
  assert.deepEqual(await (await run()).json(), { ok: true, claimed: 0, sent: 0, failed: 0, bookkeeping_failed: 0 });
  assert.equal(calls.filter((x) => x.url === 'https://api.resend.com/emails').length, 0);
  const fs = await import('node:fs/promises');
  const sql = await fs.readFile(new URL('../db/2026-11-19_partner_followups.sql', import.meta.url), 'utf8');
  assert.match(sql, /if exists \(select 1 from newsletter_unsubscribed u where lower\(u.email\) = lower\(v_claim.email\)\) then[\s\S]*followup_kind = 'skipped_unsubscribed'/i);
});

test('a failed send records its error without a retry', async () => {
  queued = [claim('failed')];
  globalThis.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    calls.push({ url: String(url), method, body: init.body ? JSON.parse(init.body) : null });
    if (String(url).endsWith('/rpc/partner_claim_followups')) return Response.json(queued.splice(0));
    if (String(url) === 'https://api.resend.com/emails') return new Response('refused', { status: 422 });
    if (method === 'PATCH') return new Response(null, { status: 204 });
    throw new Error('unexpected fetch');
  };
  const log = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await (await run()).json(), { ok: true, claimed: 1, sent: 0, failed: 1, bookkeeping_failed: 0 });
    assert.match(calls.find((x) => x.method === 'PATCH').body.followup_error, /422/);
    assert.deepEqual(await (await run()).json(), { ok: true, claimed: 0, sent: 0, failed: 0, bookkeeping_failed: 0 });
  } finally { console.error = log; }
});

test('a successful Resend response without an id is recorded as an error', async () => {
  queued = [claim('missing-id')];
  globalThis.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    calls.push({ url: String(url), method, body: init.body ? JSON.parse(init.body) : null });
    if (String(url).endsWith('/rpc/partner_claim_followups')) return Response.json(queued.splice(0));
    if (String(url) === 'https://api.resend.com/emails') return Response.json({});
    if (method === 'PATCH') return new Response(null, { status: 204 });
    throw new Error('unexpected fetch');
  };
  assert.deepEqual(await (await run()).json(), { ok: true, claimed: 1, sent: 0, failed: 1, bookkeeping_failed: 0 });
  assert.match(calls.find((x) => x.method === 'PATCH').body.followup_error, /missing Resend email id/);
});

test('a failed bookkeeping update is counted without dropping later claims', async () => {
  queued = [claim('first'), claim('second')];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === 'PATCH' && String(url).includes('id=eq.first')) return new Response('refused', { status: 503 });
    return original(url, init);
  };
  const log = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await (await run()).json(), { ok: true, claimed: 2, sent: 2, failed: 0, bookkeeping_failed: 1 });
  } finally { console.error = log; }
  assert.equal(calls.filter((x) => x.url === 'https://api.resend.com/emails').length, 2);
  assert.ok(calls.some((x) => x.method === 'PATCH' && x.url.includes('id=eq.second')));
});

test('a network error stamping one claim does not prevent sending the next', async () => {
  queued = [claim('first'), claim('second')];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === 'PATCH' && String(url).includes('id=eq.first')) throw new Error('connection lost');
    return original(url, init);
  };
  const log = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await (await run()).json(), { ok: true, claimed: 2, sent: 2, failed: 0, bookkeeping_failed: 1 });
  } finally { console.error = log; }
  assert.equal(calls.filter((x) => x.url === 'https://api.resend.com/emails').length, 2);
});

test('SQL job applies three-day sent-email boundary, unsubscribe exclusion and single-claim guard', async () => {
  const fs = await import('node:fs/promises');
  const sql = await fs.readFile(new URL('../db/2026-11-19_partner_followups.sql', import.meta.url), 'utf8');
  assert.match(sql, /emailed_at\s*<=\s*now\(\)\s*-\s*interval\s*'3 days'/i);
  assert.match(sql, /newsletter_unsubscribed/i);
  assert.match(sql, /skipped_unsubscribed/i);
  assert.match(sql, /followup_sent_at\s+is\s+null/i);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /set code_opened_at = redeem_tapped_at/i);
  assert.match(sql, /where followup_sent_at is null and followup_kind is null\s+and status = 'assigned' and emailed_at is not null/i);
  assert.match(sql, /'code', \(select code from partner_codes where claim_id = v_claim.id\)/i);
  assert.match(sql, /drop constraint if exists partner_claims_followup_kind_check/i);
});

test('migration only marks legacy on the initial schema installation', async () => {
  const { readFile } = await import('node:fs/promises');
  const sql = await readFile(new URL('../db/2026-11-19_partner_followups.sql', import.meta.url), 'utf8');
  assert.match(sql, /if not exists \([\s\S]*attname = 'followup_kind'[\s\S]*\) then[\s\S]*update public\.partner_claims[\s\S]*set followup_kind = 'legacy'/i);
});
