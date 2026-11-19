// test/partner-email.test.mjs: what the partner emails contain and how they are sent.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderClaimEmail, renderReminderEmail, renderWelcomeEmail, renderAndroidEmail, renderWaitlistEmail, renderAlertEmail, sendEmail } from '../lib/partner-email.js';
import { partnerConfig } from '../lib/partners.js';

const base = { partner: partnerConfig('arsenal'), firstName: 'Sam', mailingAddress: '123 Test St, Denver, CO 80202' };
const link = 'https://groundapp.live/arsenal/r/abcdefghijklmnopqrstuv';

test('claim email contains only the tracked link, never a plain code', () => {
  const m = renderClaimEmail({ ...base, link, code: 'ABC123XYZ' });
  for (const part of [m.html, m.text]) {
    assert.ok(!part.includes('ABC123XYZ'));
    assert.ok(part.includes(link));
    assert.ok(part.includes('$39.99 a year unless you cancel'));
    assert.ok(part.includes('123 Test St, Denver, CO 80202'));
    assert.ok(part.includes('On a computer? The button opens a page with a QR code for your iPhone.'));
  }
  assert.ok(m.subject.includes('GroundApp'));
});

test('Arsenal code email keeps its existing subject, cold-plunge copy and HTML', () => {
  const m = renderClaimEmail({ ...base, code: 'ABC123XYZ', link });
  assert.equal(m.subject, 'Your free year of GroundApp, from Arsenal and Collin');
  assert.ok(m.text.includes('Arsenal Health already gives you the cold plunge and the sauna.'));
  assert.ok(m.html.includes('text-transform:uppercase;\">Arsenal Health</span>'));
  assert.ok(m.text.includes('You check in with Bodie, name how you feel, and GroundApp matches breathwork to it.'));
});

test('all AION member emails use only AION branding', () => {
  const aion = { ...base, partner: partnerConfig('aion') };
  const aionLink = link.replace('/arsenal/', '/aion/');
  const messages = [
    renderClaimEmail({ ...aion, code: 'ABC123XYZ', link: aionLink }),
    renderReminderEmail({ ...aion, link: aionLink, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' }),
    renderWelcomeEmail({ ...aion, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' }),
    renderAndroidEmail(aion),
    renderWaitlistEmail(aion),
  ];
  assert.equal(messages[0].subject, 'Your free year of GroundApp, from AION and Collin');
  assert.match(messages[0].html, /AION<\/span> <span[^>]*>&times;<\/span> GroundApp/);
  assert.ok(messages[0].text.includes('AION builds your strength and your engine.'));
  for (const message of messages) {
    for (const part of [message.subject, message.html, message.text]) {
      assert.ok(!part.includes('Arsenal'), 'AION mail never mentions Arsenal');
    }
  }
});

test('Traverse member emails use its own lockup and never name other gyms', () => {
  const traverse = { ...base, partner: partnerConfig('traverse') };
  const traverseLink = link.replace('/arsenal/', '/traverse/');
  const messages = [
    renderClaimEmail({ ...traverse, code: 'ABC123XYZ', link: traverseLink }),
    renderReminderEmail({ ...traverse, link: traverseLink, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' }),
    renderWelcomeEmail({ ...traverse, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' }),
    renderAndroidEmail(traverse),
    renderWaitlistEmail(traverse),
  ];
  assert.equal(messages[0].subject, 'Your free year of GroundApp, from Traverse and Collin');
  assert.match(messages[0].html, /TRAVERSE<\/span> <span[^>]*>&times;<\/span> GroundApp/);
  assert.ok(messages[0].html.includes('Traverse already puts breathwork into the sauna and the cold plunge.'));
  for (const message of messages) {
    for (const part of [message.subject, message.html, message.text]) {
      assert.ok(!part.includes('Arsenal') && !part.includes('AION'), 'Traverse mail never names another gym');
    }
  }
});

test('RECON Wellness emails use its own brand and member link in both formats', () => {
  const recon = { ...base, partner: partnerConfig('recon') };
  const reconLink = 'https://groundapp.live/recon/r/abcdefghijklmnopqrstuv';
  const messages = [
    renderClaimEmail({ ...recon, code: 'RECONCODE123', link: reconLink }),
    renderReminderEmail({ ...recon, link: reconLink, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' }),
    renderWelcomeEmail({ ...recon, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' }),
    renderAndroidEmail(recon),
    renderWaitlistEmail(recon),
  ];
  assert.equal(messages[0].subject, 'Your free year of GroundApp, from RECON and Collin');
  assert.match(messages[0].html, /RECON Wellness<\/span> <span[^>]*>&times;<\/span> GroundApp/);
  for (const part of [messages[0].html, messages[0].text]) {
    assert.ok(part.includes('RECON helps you build recovery into your training week.'));
    assert.ok(!part.includes('RECONCODE123'));
    assert.ok(part.includes(reconLink));
    assert.ok(part.includes('$39.99 a year unless you cancel'));
  }
  for (const part of [messages[1].html, messages[1].text]) {
    assert.ok(part.includes(reconLink));
    assert.ok(!part.includes('RECONCODE123'));
  }
  for (const message of messages) {
    for (const part of [message.subject, message.html, message.text]) {
      assert.ok(!/Arsenal|AION|Traverse/.test(part), 'RECON mail never names another partner');
      assert.ok(message.html.includes('RECON Wellness') && message.text.includes('RECON Wellness'));
    }
  }
});

test('member emails follow the copy rules', () => {
  const all = [
    renderClaimEmail({ ...base, code: 'ABC', link }),
    renderReminderEmail({ ...base, link, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' }),
    renderWelcomeEmail({ ...base, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' }),
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

test('reminder and welcome include unsubscribe and never expose a code', () => {
  const options = { ...base, link, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' };
  for (const m of [renderReminderEmail(options), renderWelcomeEmail(options)]) {
    assert.ok(m.html.includes('GroundApp'));
    assert.ok(m.text.includes('https://groundapp.live/api/unsubscribe?e=x&t=y'));
    assert.ok(!m.text.includes('ABC123XYZ'));
  }
  assert.match(renderReminderEmail(options).text, /Already in\?/);
  assert.match(renderWelcomeEmail(options).text, /Dry land only\. Never in or near water\./);
  assert.match(renderWelcomeEmail(options).text, /no fast, deep or forced breathing, no extra gulps/);
  assert.match(renderWelcomeEmail(options).text, /Talk with a clinician who knows breath-hold activity first/);
  assert.match(renderWelcomeEmail(options).text, /Readings inform suggestions\. They are not a medical assessment\./);
});

test('welcome renders the approved protocol and safety copy in both parts', () => {
  const message = renderWelcomeEmail({ ...base, unsubUrl: 'https://groundapp.live/api/unsubscribe?e=x&t=y' });
  for (const part of [message.text, message.html]) {
    assert.match(part, /In the Library, open Advanced, then O2 tables\./);
    assert.match(part, /Pick Full lungs, then Enter a recent time: a comfortable hold you already know/);
    assert.match(part, /Tap Begin\. GroundApp asks a few readiness questions first\./);
    assert.match(part, /Dry land only\. Never in or near water\./);
    assert.match(part, /Seated or lying down, with an attentive person nearby/);
    assert.match(part, /Talk with a clinician who knows breath-hold activity first/);
  }
  assert.match(message.text, /ct=partner-welcome/);
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

test('sendEmail posts to Resend with sender, idempotency key and tag without scheduling', async () => {
  const out = await sendEmail({ RESEND_API_KEY: 're_test' }, {
    to: 'sam@example.com', subject: 'S', html: '<p>h</p>', text: 't',
    idempotencyKey: 'k1', tag: 'partner_claim', headers: { 'X-A': 'b' },
  });
  assert.deepEqual(out, { ok: true, id: 'email_9', error: null });
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].headers.authorization, 'Bearer re_test');
  assert.equal(calls[0].headers['idempotency-key'], 'k1');
  assert.equal(calls[0].body.from, 'Collin Chartier <collin@groundapp.live>');
  assert.deepEqual(calls[0].body.to, ['sam@example.com']);
  assert.equal(calls[0].body.scheduled_at, undefined);
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

