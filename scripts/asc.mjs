#!/usr/bin/env node
// Local CLI for the App Store Connect analytics sync (Node 20+).
//
//   node scripts/asc.mjs check                    auth test, prints the app name
//   node scripts/asc.mjs request [--snapshot]     create (or reuse) report requests, Admin key needed
//   node scripts/asc.mjs reports [--all]          list reports and DAILY instance counts
//   node scripts/asc.mjs sync --dry-run           download + aggregate, print rows, write nothing
//   node scripts/asc.mjs sync --write             download + aggregate + write to Supabase
//
// sync options: --since YYYY-MM-DD (only instances processed on/after), --no-snapshot,
//               --no-db (dry run without reading Supabase), --json (machine-readable output)
//
// Credentials: ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY_PATH (path to the .p8) from the
// environment. Supabase from .dev.vars at the repo root (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
// Secrets are never printed.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  createAscClient,
  createSupabaseClient,
  findOrCreateRequests,
  readState,
  listReports,
  listInstances,
  selectTrackedReports,
  classifyReport,
  runSync,
} from '../workers/asc-sync/src/asc.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_APP_ID = '6760352779';
const EXPECTED_BUNDLE_ID = 'live.groundapp.ground';

function die(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--') && ['since', 'app'].includes(k)) out[k] = argv[++i];
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

function loadDevVars() {
  const file = path.join(ROOT, '.dev.vars');
  const vars = {};
  if (!fs.existsSync(file)) return vars;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return vars;
}

function expandHome(p) {
  return p && p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

function ascFromEnv() {
  const issuerId = process.env.ASC_ISSUER_ID;
  const keyId = process.env.ASC_KEY_ID;
  const keyPath = expandHome(process.env.ASC_PRIVATE_KEY_PATH);
  let privateKey = process.env.ASC_PRIVATE_KEY;
  if (!privateKey && keyPath) {
    if (!fs.existsSync(keyPath)) die(`ASC_PRIVATE_KEY_PATH does not exist: ${keyPath}`);
    privateKey = fs.readFileSync(keyPath, 'utf8');
  }
  const missing = [!issuerId && 'ASC_ISSUER_ID', !keyId && 'ASC_KEY_ID', !privateKey && 'ASC_PRIVATE_KEY_PATH'].filter(Boolean);
  if (missing.length) die(`missing ${missing.join(', ')} in the environment`);
  return createAscClient({ issuerId, keyId, privateKey, log: (m) => console.error(`  ${m}`) });
}

function dbFromDevVars({ required }) {
  const vars = loadDevVars();
  // Take URL and key from the same place. A stray SUPABASE_SERVICE_ROLE_KEY in the shell (another project) must not pair with this repo's URL.
  const fromEnv = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const url = fromEnv ? process.env.SUPABASE_URL : vars.SUPABASE_URL;
  const serviceKey = fromEnv ? process.env.SUPABASE_SERVICE_ROLE_KEY : vars.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    if (required) die('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found in .dev.vars or the environment');
    return null;
  }
  return createSupabaseClient({ url, serviceKey });
}

const md5 = async (bytes) => createHash('md5').update(bytes).digest('hex');

function appIdFrom(args) {
  return String(args.app || process.env.ASC_APP_ID || DEFAULT_APP_ID);
}

async function requestIds(asc, db, appId) {
  if (db) {
    const state = await readState(db, ['requests']);
    if (state.requests && state.requests.ongoing && String(state.requests.appId) === appId) return { ...state.requests, from: 'groundapp_asc_state' };
  }
  const r = await findOrCreateRequests({ asc, db: null }, appId, { create: false });
  return { ...r, from: 'App Store Connect' };
}

// ---------------------------------------------------------------------------

async function cmdCheck(args) {
  const asc = ascFromEnv();
  const appId = appIdFrom(args);
  const res = await asc.get(`/v1/apps/${appId}`, { 'fields[apps]': 'name,bundleId' });
  const a = (res && res.data && res.data.attributes) || {};
  console.log(`OK: authenticated. App ${appId} is "${a.name}" (${a.bundleId}).`);
  if (a.bundleId && a.bundleId !== EXPECTED_BUNDLE_ID) console.log(`warning: expected bundle id ${EXPECTED_BUNDLE_ID}`);
}

async function cmdRequest(args) {
  const asc = ascFromEnv();
  const db = dbFromDevVars({ required: false });
  if (!db) console.error('warning: no Supabase credentials, request ids will only be printed (the worker needs them in groundapp_asc_state)');
  const appId = appIdFrom(args);
  const r = await findOrCreateRequests({ asc, db, log: (m) => console.log(m) }, appId, { snapshot: !!args.snapshot, create: true });
  console.log(`ONGOING request:   ${r.ongoing || '(none)'}`);
  console.log(`Snapshot requests: ${r.snapshots.length ? r.snapshots.join(', ') : '(none)'}`);
  if (r.stopped.length) console.log(`Stopped (inactive) requests: ${r.stopped.join(', ')}`);
  console.log(r.created.length ? `Created: ${r.created.map((c) => c.type).join(', ')}` : 'Nothing new created (reused existing requests).');
  if (db) console.log('Saved request ids to groundapp_asc_state (key "requests").');
  console.log('Apple generates the first reports 1 to 2 days after a new request.');
}

async function cmdReports(args) {
  const asc = ascFromEnv();
  const db = args['no-db'] ? null : dbFromDevVars({ required: false });
  const appId = appIdFrom(args);
  const req = await requestIds(asc, db, appId);
  console.log(`Request ids from ${req.from}`);
  const list = [{ type: 'ONGOING', id: req.ongoing }, ...(req.snapshots || []).map((id) => ({ type: 'ONE_TIME_SNAPSHOT', id }))].filter((r) => r.id);
  if (!list.length) die('no report requests yet. Run: node scripts/asc.mjs request --snapshot (Admin key)');
  for (const r of list) {
    const reports = await listReports(asc, r.id);
    console.log(`\n${r.type} ${r.id}: ${reports.length} report(s)`);
    const tracked = selectTrackedReports(reports);
    const trackedIds = new Set(tracked.map((t) => t.id));
    for (const t of tracked) {
      const insts = await listInstances(asc, t.id, 'DAILY');
      const latest = insts.map((i) => i.attributes && i.attributes.processingDate).filter(Boolean).sort().pop();
      console.log(`  [tracked] ${t.name}  (${t.family}/${t.level})  DAILY instances: ${insts.length}${latest ? `, latest ${latest}` : ''}`);
    }
    // Show near-miss names so a renamed report is easy to spot.
    const related = /download|engagement|install|session|subscription|purchase/i;
    for (const rep of reports) {
      const name = (rep.attributes && rep.attributes.name) || '';
      if (trackedIds.has(rep.id)) continue;
      if (args.all || (related.test(name) && !classifyReport(name))) console.log(`  [not tracked] ${name} (${rep.attributes && rep.attributes.category})`);
    }
  }
}

async function cmdSync(args) {
  if (!!args['dry-run'] === !!args.write) die('pick exactly one of --dry-run or --write');
  const dryRun = !!args['dry-run'];
  if (args.since && !/^\d{4}-\d{2}-\d{2}$/.test(args.since)) die('--since must be YYYY-MM-DD');
  const asc = ascFromEnv();
  const db = dryRun && args['no-db'] ? null : dbFromDevVars({ required: !dryRun });
  if (dryRun && !db) console.error('note: dry run without Supabase, so already-imported instances are not skipped');
  const summary = await runSync({
    asc,
    db,
    appId: appIdFrom(args),
    dryRun,
    includeSnapshot: !args['no-snapshot'],
    since: args.since || null,
    log: (m) => console.error(`  ${m}`),
    md5,
  });
  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  const { rows = [], ...rest } = summary;
  if (dryRun) {
    console.log(['date', 'metric', 'dim', 'value', 'report'].join('\t'));
    for (const r of rows) console.log([r.date, r.metric, r.dim, r.value, r.report].join('\t'));
    console.log(`\n${rows.length} row(s) would be upserted.`);
  }
  console.log(JSON.stringify(rest, null, 2));
  if (!summary.ok) process.exitCode = 2;
}

const COMMANDS = { check: cmdCheck, request: cmdRequest, reports: cmdReports, sync: cmdSync };

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
if (!cmd || !COMMANDS[cmd]) {
  console.log('usage: node scripts/asc.mjs <check | request [--snapshot] | reports [--all] | sync --dry-run | sync --write> [--since YYYY-MM-DD] [--no-snapshot] [--no-db] [--json]');
  process.exit(cmd ? 1 : 0);
}
COMMANDS[cmd](args).catch((e) => die(e && e.message ? e.message : String(e)));
