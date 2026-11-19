import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFutureScheduledReminder } from '../scripts/partner-followups-cutover.mjs';

const now = Date.parse('2026-11-19T12:00:00Z');
test('only still scheduled future Resend reminders are released', () => {
  assert.equal(isFutureScheduledReminder({ last_event: 'scheduled', scheduled_at: '2026-11-20T12:00:00Z' }, now), true);
  assert.equal(isFutureScheduledReminder({ last_event: 'scheduled', scheduled_at: '2026-11-19T12:00:00Z' }, now), false);
  assert.equal(isFutureScheduledReminder({ last_event: 'sent', scheduled_at: '2026-11-20T12:00:00Z' }, now), false);
  assert.equal(isFutureScheduledReminder({ last_event: 'canceled', scheduled_at: '2026-11-20T12:00:00Z' }, now), false);
  assert.equal(isFutureScheduledReminder({ last_event: 'scheduled', scheduled_at: null }, now), false);
});
