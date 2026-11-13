// test/partner-delivery.test.mjs: member resend keys, reminder failures and low-stock alerts.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sendForClaim, maybeAlertLowStock } from '../lib/partner-delivery.js';

const env = {
  SUPABASE_URL: 'https://sb.example.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_service', RESEND_API_KEY: 're_test',
  UNSUBSCRIBE_SECRET: 'test-secret', ADMIN_EMAILS: 'admin@example.com', MAILING_ADDRESS: '123 Test St',
};
const claim = { claim: { id: 'c1', status: 'assigned', first_name: 'Sam', email: 'sam@example.com', token: 'abcdefghijklmnopqrstuv' }, code: 'TESTCODE123' };
let calls;
let realFetch;
let programRows;
let nudgeStatus;
let realError;

beforeEach(() => {
  calls = [];
  programRows = [{ slug: 'arsenal' }];
  nudgeStatus = 200;
  realFetch = globalThis.fetch;
  realError = console.error;
  console.error = () => {};
  globalThis.fetch = async (url, init = {}) => {
    const call = { url: String(url), method: init.method || 'GET', headers: init.headers, body: init.body ? JSON.parse(init.body) : null };
    calls.push(call);
    if (call.url.includes('/partner_programs?')) return new Response(JSON.stringify(programRows), { status: 200 });
    if (call.url === 'https://api.resend.com/emails') {
      return new Response(JSON.stringify({ id: 'email_1' }), { status: call.body.scheduled_at ? nudgeStatus : 200 });
    }
    throw new Error(`unexpected request: ${call.url}`);
  };
});
afterEach(() => { globalThis.fetch = realFetch; console.error = realError; });

const sends = () => calls.filter((c) => c.url === 'https://api.resend.com/emails');

test('an admin resend gets a fresh idempotency key and no reminder', async () => {
  const regular = await sendForClaim(env, 'arsenal', claim, { withNudge: false });
  assert.equal(regular.ok, true);
  const originalKey = sends()[0].headers['idempotency-key'];
  const fresh = await sendForClaim(env, 'arsenal', claim, { withNudge: true, fresh: true });
  assert.equal(fresh.ok, true);
  assert.equal(fresh.nudgeId, null);
  assert.equal(sends().length, 2);
  assert.match(sends()[1].headers['idempotency-key'], /^partner-claim\/c1\/\d+\/\d+$/);
  assert.notEqual(sends()[1].headers['idempotency-key'], originalKey);
});

test('a failed reminder is logged while the member email still succeeds', async () => {
  nudgeStatus = 500;
  const sent = await sendForClaim(env, 'arsenal', claim, { withNudge: true });
  assert.equal(sent.ok, true);
  assert.equal(sent.nudgeId, null);
  assert.equal(sends().length, 2);
});

test('more than 75 codes left does not ask the database or email an alert', async () => {
  await maybeAlertLowStock(env, 'arsenal', 80);
  assert.equal(calls.length, 0);
});

test('74 codes left claims threshold 75 and emails only if a row was updated', async () => {
  await maybeAlertLowStock(env, 'arsenal', 74);
  assert.equal(calls[0].method, 'PATCH');
  assert.equal(calls[0].body.low_stock_alerted, 75);
  assert.ok(calls[0].url.includes('partner_programs?slug=eq.arsenal&or=(low_stock_alerted.is.null,low_stock_alerted.gt.75)'));
  assert.equal(calls[0].headers.prefer, 'return=representation');
  assert.equal(sends().length, 1);
  assert.ok(sends()[0].body.subject.includes('74 codes left'));

  calls = [];
  programRows = [];
  await maybeAlertLowStock(env, 'arsenal', 74);
  assert.equal(sends().length, 0);
});

test('zero codes left claims threshold zero', async () => {
  await maybeAlertLowStock(env, 'arsenal', 0);
  assert.equal(calls[0].body.low_stock_alerted, 0);
  assert.ok(calls[0].url.includes('low_stock_alerted.gt.0'));
});
