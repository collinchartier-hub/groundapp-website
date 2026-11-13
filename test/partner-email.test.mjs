// test/partner-email.test.mjs: what the partner emails contain and how they are sent.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderClaimEmail, renderNudgeEmail, renderAndroidEmail, renderWaitlistEmail, renderAlertEmail, sendEmail, cancelEmail } from '../lib/partner-email.js';

const base = { partnerName: 'Arsenal Health', firstName: 'Sam', mailingAddress: '123 Test St, Denver, CO 80202' };
const link = 'https://groundapp.live/arsenal/r/abcdefghijklmnopqrstuv';

test('claim email: code, link, renewal line and address in both parts', () => {
  const m = renderClaimEmail({ ...base, code: 'ABC123XYZ', link });
  for (const part of [m.html, m.text]) {
    assert.ok(part.includes('ABC123XYZ'));
    assert.ok(part.includes(link));
    assert.ok(part.includes('$39.99 a year unless you cancel'));
    assert.ok(part.includes('123 Test St, Denver, CO 80202'));
    assert.ok(part.includes('Sam'));
  }
  assert.ok(m.subject.includes('GroundApp'));
});

test('member emails follow the copy rules', () => {
  const all = [
    renderClaimEmail({ ...base, code: 'ABC', link }),
    renderNudgeEmail({ ...base, link, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' }),
    renderAndroidEmail(base),
    renderWaitlistEmail(base),
  ];
  for (const m of all) {
    for (const part of [m.subject, m.html, m.text]) {
      assert.ok(!part.includes('\u2014'), 'no em dashes');
      assert.ok(!/free trial/i.test(part), 'no free-trial claim');
      assert.ok(!/Ground App\b/.test(part), 'spelled GroundApp');
    }
  }
});

test('names are escaped in html', () => {
  const m = renderClaimEmail({ ...base, firstName: 'A&B', code: 'ABC', link });
  assert.ok(m.html.includes('A&amp;B'));
  assert.ok(!m.html.includes('A&B,'));
});

test('nudge email carries the link and an unsubscribe link, not the code', () => {
  const m = renderNudgeEmail({ ...base, link, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' });
  assert.ok(m.html.includes(link));
  assert.ok(m.text.includes('https://groundapp.live/api/unsubscribe?e=x&t=y'));
});

test('alert email states the partner and the event', () => {
  const m = renderAlertEmail({ partner: 'arsenal', event: 'low_stock', detail: '25 codes left' });
  assert.ok(m.subject.includes('arsenal'));
  assert.ok(m.text.includes('25 codes left'));
});

let calls;
let realFetch;
beforeEach(() => {
  calls = [];
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ id: 'email_9' }), { status: 200 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

test('sendEmail posts to Resend with sender, idempotency key, tag and schedule', async () => {
  const out = await sendEmail({ RESEND_API_KEY: 're_test' }, {
    to: 'sam@example.com', subject: 'S', html: '<p>h</p>', text: 't',
    idempotencyKey: 'k1', tag: 'partner_claim', scheduledAt: '2026-11-16T12:00:00.000Z', headers: { 'X-A': 'b' },
  });
  assert.deepEqual(out, { ok: true, id: 'email_9', error: null });
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].headers.authorization, 'Bearer re_test');
  assert.equal(calls[0].headers['idempotency-key'], 'k1');
  assert.equal(calls[0].body.from, 'Collin Chartier <collin@groundapp.live>');
  assert.deepEqual(calls[0].body.to, ['sam@example.com']);
  assert.equal(calls[0].body.scheduled_at, '2026-11-16T12:00:00.000Z');
  assert.deepEqual(calls[0].body.tags, [{ name: 'type', value: 'partner_claim' }]);
  assert.deepEqual(calls[0].body.headers, { 'X-A': 'b' });
});

test('sendEmail reports a failed send without throwing', async () => {
  globalThis.fetch = async () => new Response('{"message":"bad"}', { status: 422 });
  const realError = console.error;
  console.error = () => {};
  const out = await sendEmail({ RESEND_API_KEY: 're_test' }, { to: 'a@b.co', subject: 'S', html: 'h', text: 't', tag: 'x' });
  console.error = realError;
  assert.equal(out.ok, false);
  assert.equal(out.id, null);
  assert.ok(out.error.startsWith('422'));
});

test('sendEmail returns a failure when the network throws', async () => {
  globalThis.fetch = async () => { throw new Error('connection lost'); };
  const realError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await sendEmail({ RESEND_API_KEY: 're_test' }, { to: 'a@b.co', subject: 'S', html: 'h', text: 't', tag: 'x' }),
      { ok: false, id: null, error: 'network connection lost' });
  } finally {
    console.error = realError;
  }
});

test('cancelEmail returns false when the network throws', async () => {
  globalThis.fetch = async () => { throw new Error('connection lost'); };
  const realError = console.error;
  console.error = () => {};
  try {
    assert.equal(await cancelEmail({ RESEND_API_KEY: 're_test' }, 'email_9'), false);
  } finally {
    console.error = realError;
  }
});
