#!/usr/bin/env node
// Loads one-time App Store offer codes into partner_codes. Run on Collin's Mac only.
//
//   node scripts/load-partner-codes.mjs <codes.csv> --partner arsenal --batch 639153 --expires 2027-05-03 [--dry-run]
//
// The CSV lives OUTSIDE this repo (it is the codes). Columns: #,Code,Redeem link,... as exported on 2026-11-04.
// Supabase URL and service role key come from .dev.vars at the repo root. Codes already loaded are skipped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseCodesCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!/^#,Code,Redeem link/i.test(lines[0] || '')) throw new Error('unexpected header: want "#,Code,Redeem link,..."');
  const seen = new Set();
  return lines.slice(1).map((line, i) => {
    const [n, code, redeem_url] = line.split(',');
    const seq = Number(n);
    if (!Number.isInteger(seq) || !/^[A-Z0-9]{10,24}$/.test(code || '') || !String(redeem_url).startsWith('https://apps.apple.com/redeem?') || !redeem_url.endsWith(`code=${code}`)) {
      throw new Error(`row ${i + 2} is not a number, a code and its Apple link`);
    }
    if (seen.has(code)) throw new Error(`duplicate code at row ${i + 2}`);
    seen.add(code);
    return { seq, code, redeem_url };
  });
}

function devVars() {
  const out = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
  const partner = opt('partner');
  const batch = opt('batch');
  const expires = opt('expires');
  if (!file || !partner || !batch || !/^\d{4}-\d{2}-\d{2}$/.test(expires || '')) {
    console.error('usage: node scripts/load-partner-codes.mjs <codes.csv> --partner <slug> --batch <id> --expires YYYY-MM-DD [--dry-run]');
    process.exit(1);
  }
  if (path.resolve(file).startsWith(ROOT + path.sep)) {
    console.error('error: the code CSV must stay outside this repo (the repo is public).');
    process.exit(1);
  }
  const rows = parseCodesCsv(fs.readFileSync(file, 'utf8')).map((r) => ({ ...r, partner, batch, expires_on: expires }));
  console.log(`${rows.length} codes read, numbers ${rows[0].seq} to ${rows[rows.length - 1].seq}.`);
  if (args.includes('--dry-run')) return;

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = devVars();
  const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/partner_codes?on_conflict=code`, {
    method: 'POST',
    headers: { ...headers, prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) { console.error(`error: insert failed ${res.status} ${await res.text()}`); process.exit(1); }
  const reset = await fetch(`${SUPABASE_URL}/rest/v1/partner_programs?slug=eq.${encodeURIComponent(partner)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ low_stock_alerted: null }),
  });
  if (!reset.ok) { console.error(`error: low-stock reset failed ${reset.status}`); process.exit(1); }
  console.log('Low-stock alerts reset.');

  const count = await fetch(`${SUPABASE_URL}/rest/v1/partner_codes?partner=eq.${partner}&select=id`, { headers: { ...headers, prefer: 'count=exact', range: '0-0' } });
  console.log(`partner_codes now holds ${count.headers.get('content-range')?.split('/')[1]} codes for ${partner}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
