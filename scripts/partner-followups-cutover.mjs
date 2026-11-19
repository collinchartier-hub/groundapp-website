#!/usr/bin/env node
// Run after the migration and Pages deploy, before enabling the hourly Worker.
// Dry run is read-only against both Resend and Supabase.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function isFutureScheduledReminder(email, now = Date.now()) {
  return email?.last_event === 'scheduled' && Number.isFinite(Date.parse(email.scheduled_at)) && Date.parse(email.scheduled_at) > now;
}

function devVars() {
  const out = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) out[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY']) {
    if (!out[key]) throw new Error(`missing ${key} in .dev.vars`);
  }
  return out;
}

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== '--dry-run')) throw new Error('usage: node scripts/partner-followups-cutover.mjs [--dry-run]');
  const dryRun = process.argv.includes('--dry-run');
  const env = devVars();
  const sbHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' };
  const resendHeaders = { authorization: `Bearer ${env.RESEND_API_KEY}` };
  let cursor = '', inspected = 0, future = 0, released = 0, alreadyHandled = 0, failed = 0;
  while (true) {
    const query = `partner_claims?select=id,nudge_email_id,followup_kind&or=(followup_kind.eq.legacy,followup_kind.is.null)&nudge_email_id=not.is.null${cursor ? `&id=gt.${encodeURIComponent(cursor)}` : ''}&order=id.asc&limit=200`;
    const list = await fetch(`${env.SUPABASE_URL}/rest/v1/${query}`, { headers: sbHeaders });
    if (!list.ok) throw new Error(`claim list failed ${list.status}`);
    const rows = await list.json();
    for (const row of rows) {
      cursor = row.id;
      inspected++;
      const get = await fetch(`https://api.resend.com/emails/${encodeURIComponent(row.nudge_email_id)}`, { headers: resendHeaders });
      if (!get.ok) { failed++; console.error(`Resend lookup failed: ${get.status}`); continue; }
      const email = await get.json();
      if (!isFutureScheduledReminder(email)) {
        // A claim created between migration and Pages deploy could still have
        // an old (already sent/canceled) reminder. Never send it a second one.
        if (!dryRun && row.followup_kind === null) {
          const handled = await fetch(`${env.SUPABASE_URL}/rest/v1/partner_claims?id=eq.${encodeURIComponent(row.id)}&nudge_email_id=eq.${encodeURIComponent(row.nudge_email_id)}&followup_kind=is.null&select=id`, {
            method: 'PATCH', headers: { ...sbHeaders, prefer: 'return=representation' },
            body: JSON.stringify({ followup_kind: 'legacy', followup_sent_at: new Date().toISOString() }),
          });
          if (!handled.ok || (await handled.json()).length !== 1) throw new Error('Failed to mark an already-handled claim as legacy');
          alreadyHandled++;
        }
        continue;
      }
      future++;
      if (dryRun) continue;
      const canceled = await fetch(`https://api.resend.com/emails/${encodeURIComponent(row.nudge_email_id)}/cancel`, { method: 'POST', headers: resendHeaders });
      if (!canceled.ok) { failed++; console.error(`Resend cancel failed: ${canceled.status}`); continue; }
      const patch = await fetch(`${env.SUPABASE_URL}/rest/v1/partner_claims?id=eq.${encodeURIComponent(row.id)}&nudge_email_id=eq.${encodeURIComponent(row.nudge_email_id)}&or=(followup_kind.eq.legacy,followup_kind.is.null)&select=id`, {
        method: 'PATCH', headers: { ...sbHeaders, prefer: 'return=representation' },
        body: JSON.stringify({ nudge_email_id: null, followup_kind: null, followup_sent_at: null }),
      });
      if (!patch.ok || (await patch.json()).length !== 1) {
        throw new Error('Resend cancellation succeeded but DB release failed; inspect this claim manually before enabling the Worker');
      }
      released++;
    }
    if (rows.length < 200) break;
  }
  console.log(JSON.stringify({ dryRun, inspected, futureScheduled: future, released, alreadyHandled, failed }));
  if (failed) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch((err) => { console.error(err.message); process.exitCode = 1; });
