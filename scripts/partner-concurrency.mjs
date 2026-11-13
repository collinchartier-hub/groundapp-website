#!/usr/bin/env node
// Proves the claim function under load, against the real database, with throwaway rows:
// 20 people claim at the same moment and only 5 codes exist. Expect 5 assigned, 15 waitlist, no code given twice,
// and a repeat by the same person returning the same claim. Removes everything it created.
//
//   node scripts/partner-concurrency.mjs        (run after db/2026-11-13_partner_codes.sql is applied)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vars = {};
for (const line of fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) vars[m[1]] = m[2].replace(/^"|"$/g, '');
}
const headers = { apikey: vars.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${vars.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' };
const rest = async (p, init = {}) => {
  const res = await fetch(`${vars.SUPABASE_URL}/rest/v1/${p}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${p}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
};

const slug = `zz-test-${Date.now()}`;
const claim = (i) =>
  rest('rpc/partner_claim', {
    method: 'POST',
    body: JSON.stringify({
      p_partner: slug, p_first: 'Test', p_last: `Person${i}`, p_email: `t${i}@example.com`, p_email_key: `t${i}@example.com`,
      p_device: 'iphone', p_location: 'Gym', p_src: null, p_newsletter: false, p_token: `${slug}-${i}`.padEnd(22, 'x').slice(-22), p_ip_hash: null,
    }),
  });

let failed = false;
const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failed = true; };

try {
  await rest('partner_programs', { method: 'POST', body: JSON.stringify({ slug, name: 'Concurrency test', locations: ['Gym'] }) });
  await rest('partner_codes', {
    method: 'POST',
    body: JSON.stringify([1, 2, 3, 4, 5].map((n) => ({ partner: slug, seq: n, code: `ZZTEST${Date.now()}${n}`, redeem_url: 'https://example.com/test', batch: 'test', expires_on: '2099-01-01' }))),
  });

  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => claim(i)));
  const assigned = results.filter((r) => r.outcome === 'assigned');
  const waitlist = results.filter((r) => r.outcome === 'waitlist');
  check(assigned.length === 5, `5 assigned (got ${assigned.length})`);
  check(waitlist.length === 15, `15 waitlist (got ${waitlist.length})`);
  check(new Set(assigned.map((r) => r.code)).size === 5, 'no code given twice');
  check(Math.min(...results.map((r) => r.codes_left)) === 0, 'bank reads 0 at the end');

  const again = await Promise.all([claim(0), claim(0), claim(0)]);
  check(again.every((r) => r.outcome === 'existing' && r.claim.id === results[0].claim.id), 'a repeat returns the same claim');

  const rows = await rest(`partner_codes?partner=eq.${slug}&select=claim_id`);
  check(rows.filter((r) => r.claim_id).length === 5 && new Set(rows.map((r) => r.claim_id)).size === 5, 'each code has exactly one owner');
} finally {
  await rest(`partner_codes?partner=eq.${slug}`, { method: 'DELETE' }).catch((e) => console.error('cleanup codes:', e.message));
  await rest(`partner_claims?partner=eq.${slug}`, { method: 'DELETE' }).catch((e) => console.error('cleanup claims:', e.message));
  await rest(`partner_programs?slug=eq.${slug}`, { method: 'DELETE' }).catch((e) => console.error('cleanup program:', e.message));
}
process.exit(failed ? 1 : 0);
