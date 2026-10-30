// test/subscribe.test.mjs: who gets the welcome email from POST /api/subscribe.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/subscribe.js';

const SB = 'https://sb.example.co';
const env = {
  SUPABASE_URL: SB,
  SUPABASE_SERVICE_ROLE_KEY: 'sb_service',
  UNSUBSCRIBE_SECRET: 'test-secret',
  RESEND_API_KEY: 're_test',
  MAILING_ADDRESS: '123 Test St, Denver, CO 80202',
};

let calls;
let state;
let realFetch;
let realConsoleError;

beforeEach(() => {
  calls = [];
  state = { subscriber: null };
  realFetch = globalThis.fetch;
  realConsoleError = console.error;
  console.error = () => {};
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const method = init.method || 'GET';
    calls.push({ url: u, method, body: init.body ? JSON.parse(init.body) : null });
    if (u.startsWith('https://api.resend.com/')) return new Response(JSON.stringify({ id: 'email_1' }), { status: 200 });
    if (method === 'GET' && u.includes('newsletter_subscribers')) {
      return new Response(JSON.stringify(state.subscriber ? [state.subscriber] : []), { status: 200 });
    }
    if (method === 'GET') return new Response('[]', { status: 200 });
    return new Response(null, { status: method === 'POST' ? 201 : 204 });
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.error = realConsoleError;
});

const post = () =>
  onRequestPost({
    request: new Request('https://groundapp.live/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://groundapp.live' },
      body: JSON.stringify({ email: 'sam@example.com', name: 'Sam', source: 'popup', t: 6000 }),
    }),
    env,
  });
const welcomes = () => calls.filter((c) => c.url === 'https://api.resend.com/emails');

test('new signup: saved and welcomed', async () => {
  const res = await post();
  assert.deepEqual(await res.json(), { ok: true, status: 'subscribed' });
  assert.equal(welcomes().length, 1);
});

test('already active (imported or signed up before): still welcomed and stamped', async () => {
  state.subscriber = { id: 'u1', status: 'active', first_name: null, last_emailed_at: null };
  const res = await post();
  assert.deepEqual(await res.json(), { ok: true, status: 'subscribed' });
  assert.equal(welcomes().length, 1);
  assert.equal(calls.filter((c) => c.method === 'POST' && c.url.includes('newsletter_subscribers')).length, 0);
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.body?.last_emailed_at));
});

test('already active and emailed in the last day: no second email', async () => {
  state.subscriber = { id: 'u1', status: 'active', last_emailed_at: new Date(Date.now() - 3600e3).toISOString() };
  const res = await post();
  assert.deepEqual(await res.json(), { ok: true, status: 'already' });
  assert.equal(welcomes().length, 0);
});
