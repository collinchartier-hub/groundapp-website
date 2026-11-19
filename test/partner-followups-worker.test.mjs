import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/partner-followups/src/index.js';

test('hourly Worker posts the shared secret to the Pages endpoint', async () => {
  const original = globalThis.fetch;
  const log = console.log;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ ok: true, claimed: 0, sent: 0, failed: 0, bookkeeping_failed: 0 });
  };
  console.log = () => {};
  try {
    await worker.scheduled({}, { PARTNER_FOLLOWUPS_URL: 'https://groundapp.live/api/partner/followups', PARTNER_CRON_SECRET: 'secret' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers['x-partner-cron-secret'], 'secret');
  } finally { globalThis.fetch = original; console.log = log; }
});

test('Worker never calls Pages without a configured secret', async () => {
  await assert.rejects(worker.scheduled({}, { PARTNER_FOLLOWUPS_URL: 'https://groundapp.live/api/partner/followups' }), /not configured/);
});

test('hourly Worker reports failed deliveries and bookkeeping as failed runs', async () => {
  const original = globalThis.fetch;
  const log = console.log;
  console.log = () => {};
  try {
    for (const counts of [{ failed: 1, bookkeeping_failed: 0 }, { failed: 0, bookkeeping_failed: 1 }]) {
      globalThis.fetch = async () => Response.json({ ok: true, claimed: 1, sent: 0, ...counts });
      await assert.rejects(
        worker.scheduled({}, { PARTNER_FOLLOWUPS_URL: 'https://groundapp.live/api/partner/followups', PARTNER_CRON_SECRET: 'secret' }),
        /failed/i,
      );
    }
  } finally { globalThis.fetch = original; console.log = log; }
});
