// Tests for workers/asc-sync/src/asc.js. Run: node --test scripts/asc.test.mjs
// Fixtures follow the column names documented at
// https://developer.apple.com/documentation/analytics-reports (report pages linked in the README).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAscToken,
  createAscClient,
  createSupabaseClient,
  createBudget,
  parseDelimited,
  classifyReport,
  selectTrackedReports,
  aggregateReport,
  mergeInstance,
  buildRows,
  gunzipIfNeeded,
  downloadSegment,
  normDate,
  runSync,
} from '../workers/asc-sync/src/asc.js';

const APP = '6760352779';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function b64urlDecode(s) {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad), (c) => c.charCodeAt(0));
}

async function newP256Pem() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  let bin = '';
  for (const b of der) bin += String.fromCharCode(b);
  const body = btoa(bin).match(/.{1,64}/g).join('\n');
  return { pem: `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`, publicKey: pair.publicKey };
}

function tsv(headers, rows) {
  return [headers.join('\t'), ...rows.map((r) => headers.map((h) => (r[h] ?? '')).join('\t'))].join('\n') + '\n';
}

async function gzip(text) {
  const stream = new Blob([new TextEncoder().encode(text)]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function valuesOf(result) {
  const out = {};
  for (const [date, m] of result.dates) for (const [k, v] of m) out[`${date} ${k.replace('\t', ' ')}`] = v;
  return out;
}

function rowMap(rows) {
  const out = {};
  for (const r of rows) out[`${r.date} ${r.metric} ${r.dim}`] = r.value;
  return out;
}

// Column sets from the Apple report pages.
const DL_STD = ['Date', 'App Name', 'App Apple Identifier', 'Download Type', 'App Version', 'Device', 'Platform Version', 'Source Type', 'Page Type', 'Pre-Order', 'Territory', 'Counts'];
const DL_DET = ['Date', 'App Name', 'App Apple Identifier', 'Download Type', 'App Version', 'Device', 'Platform Version', 'Source Type', 'Source Info', 'Campaign', 'Page Type', 'Page Title', 'Pre-Order', 'Territory', 'Counts'];
const ENG_STD = ['Date', 'App Name', 'App Apple Identifier', 'Event', 'Page Type', 'Source Type', 'Engagement Type', 'Device', 'Platform Version', 'Territory', 'Counts', 'Unique Counts'];
const INST_STD = ['Date', 'App Name', 'App Apple Identifier', 'Event', 'Download Type', 'App Version', 'Device', 'Platform Version', 'Source Type', 'Page Type', 'App Download Date', 'Territory', 'Counts', 'Unique Devices'];
const SES_STD = ['Date', 'App Name', 'App Apple Identifier', 'App Version', 'Device', 'Platform Version', 'Source Type', 'Page Type', 'App Download Date', 'Territory', 'Sessions', 'Total Session Duration', 'Unique Devices'];
const SUBEV_STD = ['Event Date', 'App Name', 'App Apple Identifier', 'Event Sub Type', 'Event Grouping', 'Subscription Name', 'Subscription Identifier', 'Offer Type', 'App Download Source Type', 'Page Type', 'Territory', 'Counts'];
const SUBST_STD = ['Date', 'App Name', 'App Apple Identifier', 'State Metric', 'State Metric Grouping', 'Subscription Name', 'App Download Source Type', 'Territory', 'Counts'];

const base = { 'App Name': 'GroundApp - Breathwork', 'App Apple Identifier': APP, Device: 'iPhone', 'Platform Version': 'iOS 18.6', Territory: 'US' };

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

test('JWT: ES256 structure, claims and a verifiable signature', async () => {
  const { pem, publicKey } = await newP256Pem();
  const now = Date.UTC(2026, 9, 2, 12, 0, 0);
  const token = await createAscToken({ issuerId: 'issuer-123', keyId: 'KEY123ABCD', privateKey: pem, now });
  const parts = token.split('.');
  assert.equal(parts.length, 3);
  const header = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  assert.deepEqual(header, { alg: 'ES256', kid: 'KEY123ABCD', typ: 'JWT' });
  assert.equal(payload.iss, 'issuer-123');
  assert.equal(payload.aud, 'appstoreconnect-v1');
  assert.equal(payload.iat, Math.floor(now / 1000));
  assert.ok(payload.exp > payload.iat && payload.exp - payload.iat <= 1200, 'exp must be within 20 minutes');
  const sig = b64urlDecode(parts[2]);
  assert.equal(sig.length, 64, 'ES256 signature is raw r||s, 64 bytes');
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, sig, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  assert.ok(ok, 'signature verifies with the public key');
  // tampered payload must not verify
  const bad = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, sig, new TextEncoder().encode(`${parts[0]}.${parts[1]}x`));
  assert.equal(bad, false);
});

test('JWT: accepts a PEM pasted with literal \\n, rejects garbage', async () => {
  const { pem, publicKey } = await newP256Pem();
  const oneLine = pem.trim().replace(/\n/g, '\\n');
  const token = await createAscToken({ issuerId: 'i', keyId: 'k', privateKey: oneLine });
  const [h, p, s] = token.split('.');
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, b64urlDecode(s), new TextEncoder().encode(`${h}.${p}`)));
  await assert.rejects(createAscToken({ issuerId: 'i', keyId: 'k', privateKey: 'not a key!' }), /private key/);
  await assert.rejects(createAscToken({ issuerId: '', keyId: 'k', privateKey: pem }), /Missing App Store Connect credentials/);
});

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

test('TSV parsing: BOM, NBSP header, CRLF, quotes, blank lines, ragged rows', () => {
  const text = '\uFEFFDate\tEvent\tUnique\u00a0Counts\tCounts\r\n2026-09-30\t"Page view"\t3\t5\r\n\r\n2026-09-30\tImpression\t\t12\r\n2026-10-01\tTap\n';
  const t = parseDelimited(text);
  assert.equal(t.delimiter, '\t');
  assert.deepEqual(t.headers, ['Date', 'Event', 'Unique Counts', 'Counts']);
  assert.equal(t.rows.length, 3);
  assert.deepEqual(t.rows[0], ['2026-09-30', 'Page view', '3', '5']);
  assert.deepEqual(t.rows[1], ['2026-09-30', 'Impression', '', '12']);
  assert.deepEqual(t.rows[2], ['2026-10-01', 'Tap']);
});

test('CSV fallback with quoted commas and escaped quotes', () => {
  const t = parseDelimited('Date,Campaign,Counts\n2026-09-30,"site-hero, v2",7\n2026-09-30,"say ""hi""",1\n');
  assert.equal(t.delimiter, ',');
  assert.deepEqual(t.rows[0], ['2026-09-30', 'site-hero, v2', '7']);
  assert.deepEqual(t.rows[1], ['2026-09-30', 'say "hi"', '1']);
});

test('date normalization', () => {
  assert.equal(normDate('2026-09-30'), '2026-09-30');
  assert.equal(normDate('2026-09-30T00:00:00Z'), '2026-09-30');
  assert.equal(normDate('9/30/2026'), '2026-09-30');
  assert.equal(normDate('20260930'), '2026-09-30');
  assert.equal(normDate('yesterday'), null);
  assert.equal(normDate(''), null);
});

test('gunzip and segment download (gzip, plain passthrough, no auth header, size check)', async () => {
  const text = tsv(['Date', 'Counts'], [{ Date: '2026-09-30', Counts: '4' }]);
  const gz = await gzip(text);
  assert.equal(new TextDecoder().decode(await gunzipIfNeeded(gz)), text);
  assert.equal(new TextDecoder().decode(await gunzipIfNeeded(new TextEncoder().encode(text))), text);
  let sawAuth = false;
  const fetchImpl = async (url, init) => {
    if (init && init.headers && (init.headers.authorization || init.headers.Authorization)) sawAuth = true;
    return new Response(gz);
  };
  const ok = await downloadSegment(fetchImpl, { url: 'https://s3.test/a.csv.gz?X-Amz-Signature=secret', sizeInBytes: gz.length, checksum: 'abc' }, { md5: async () => 'abc' });
  assert.equal(ok.text, text);
  assert.deepEqual(ok.warnings, []);
  assert.equal(sawAuth, false);
  const warn = await downloadSegment(fetchImpl, { url: 'https://s3.test/a.csv.gz', sizeInBytes: 1, checksum: 'abc' }, { md5: async () => 'def' });
  assert.equal(warn.warnings.length, 2);
  await assert.rejects(downloadSegment(async () => new Response('no', { status: 403 }), { url: 'https://s3.test/x?sig=1' }), (e) => /HTTP 403/.test(e.message) && !/sig=1/.test(e.message));
});

// ---------------------------------------------------------------------------
// Report names
// ---------------------------------------------------------------------------

test('report name classification tolerates Apple naming variants', () => {
  assert.deepEqual(classifyReport('App Downloads Standard'), { family: 'downloads', level: 'standard' });
  assert.deepEqual(classifyReport('App Store Downloads Detailed'), { family: 'downloads', level: 'detailed' });
  assert.deepEqual(classifyReport('App Store Discovery and Engagement Detailed'), { family: 'engagement', level: 'detailed' });
  assert.deepEqual(classifyReport('App Store Installation and Deletion Standard'), { family: 'installs', level: 'standard' });
  assert.deepEqual(classifyReport('App Store Installations and Deletions Standard'), { family: 'installs', level: 'standard' });
  assert.deepEqual(classifyReport('App Sessions Standard'), { family: 'sessions', level: 'standard' });
  assert.deepEqual(classifyReport('App Sessions'), { family: 'sessions', level: 'standard' });
  assert.deepEqual(classifyReport('App Store Subscription Event Report Standard'), { family: 'subscription_events', level: 'standard' });
  assert.deepEqual(classifyReport('App Store Subscription State Standard'), { family: 'subscription_state', level: 'standard' });
  assert.equal(classifyReport('App Sessions Context'), null);
  assert.equal(classifyReport('Streaming Downloads Performance'), null);
  assert.equal(classifyReport('App Store Pre-Orders Standard'), null);
  assert.equal(classifyReport('App Store Web Preview Engagement Standard'), null);
});

test('tracked report selection: one per family+level, explicit suffix wins, detailed only where useful', () => {
  const reports = [
    { id: 'r1', attributes: { name: 'App Sessions' } },
    { id: 'r2', attributes: { name: 'App Sessions Standard' } },
    { id: 'r3', attributes: { name: 'App Sessions Detailed' } },
    { id: 'r4', attributes: { name: 'App Downloads Detailed' } },
    { id: 'r5', attributes: { name: 'App Crashes' } },
  ];
  const t = selectTrackedReports(reports);
  assert.deepEqual(t.map((x) => x.id).sort(), ['r2', 'r4']);
});

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

test('downloads standard: sums across segments, maps types, source dims, zero-fills, filters other apps', () => {
  const seg1 = parseDelimited(tsv(DL_STD, [
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'App Store search', Counts: '5' },
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'Web referrer', Counts: '2' },
    { ...base, Date: '2026-09-28', 'Download Type': 'Auto-update', 'Source Type': 'Unavailable', Counts: '40' },
  ]));
  const seg2 = parseDelimited(tsv(DL_STD, [
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'app store SEARCH', Counts: '3', Territory: 'CA' },
    { ...base, Date: '2026-09-28', 'Download Type': 'Redownload', 'Source Type': 'App Store browse', Counts: '1' },
    { ...base, Date: '2026-09-29', 'Download Type': 'Redownload', 'Source Type': 'App Store search', Counts: '4' },
    { ...base, Date: '2026-09-28', 'App Apple Identifier': '999', 'Download Type': 'First-time download', 'Source Type': 'App Store search', Counts: '100' },
  ]));
  const r = aggregateReport({ family: 'downloads', level: 'standard' }, [seg1, seg2], { appId: APP });
  assert.deepEqual(r.errors, []);
  const v = valuesOf(r);
  assert.equal(v['2026-09-28 downloads_first_time total'], 10);
  assert.equal(v['2026-09-28 downloads_first_time source:App Store search'], 8, 'case-insensitive source values merge');
  assert.equal(v['2026-09-28 downloads_first_time source:Web referrer'], 2);
  assert.equal(v['2026-09-28 redownloads total'], 1);
  assert.equal(v['2026-09-28 downloads_total total'], 11);
  assert.equal(v['2026-09-29 downloads_first_time total'], 0, 'zero-filled for a date present in the instance');
  assert.equal(v['2026-09-29 redownloads total'], 4);
  assert.equal(r.stats.otherApp, 1);
  assert.equal(Object.keys(r.stats.unmapped).length, 0, 'updates are known and ignored');
  assert.ok(!Object.keys(v).some((k) => k.includes('campaign:')));
});

test('engagement: impressions include product page views; other page views, taps and unknown events are skipped', () => {
  const t = parseDelimited(tsv(ENG_STD, [
    { ...base, Date: '2026-09-28', Event: 'Impression', 'Page Type': 'No page', 'Source Type': 'App Store search', Counts: '100', 'Unique Counts': '80' },
    { ...base, Date: '2026-09-28', Event: 'Page view', 'Page Type': 'Product page', 'Source Type': 'Web referrer', Counts: '20', 'Unique Counts': '15' },
    { ...base, Date: '2026-09-28', Event: 'Page view', 'Page Type': 'Store sheet', 'Source Type': 'App referrer', Counts: '5', 'Unique Counts': '5' },
    { ...base, Date: '2026-09-28', Event: 'Page view', 'Page Type': 'App version history', 'Source Type': 'App Store search', Counts: '9', 'Unique Counts': '9' },
    { ...base, Date: '2026-09-28', Event: 'Tap', 'Page Type': 'Product page', 'Source Type': 'Web referrer', 'Engagement Type': 'Get', Counts: '7', 'Unique Counts': '7' },
    { ...base, Date: '2026-09-28', Event: 'Hologram', 'Page Type': 'Product page', 'Source Type': 'Web referrer', Counts: '1', 'Unique Counts': '1' },
  ]));
  const r = aggregateReport({ family: 'engagement', level: 'standard' }, [t], { appId: APP });
  const v = valuesOf(r);
  assert.equal(v['2026-09-28 impressions total'], 125);
  assert.equal(v['2026-09-28 page_views total'], 25);
  assert.equal(v['2026-09-28 page_views source:Web referrer'], 20);
  assert.equal(v['2026-09-28 impressions source:App Store search'], 100);
  assert.deepEqual(r.stats.unmapped, { 'Event=Hologram': 1 }, 'unknown event logged, not fatal');
});

test('detailed: only campaign dims, no totals, null-ish campaigns skipped', () => {
  const t = parseDelimited(tsv(DL_DET, [
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'Web referrer', Campaign: 'site-hero', Counts: '6' },
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'Web referrer', Campaign: 'site-hero', Counts: '2', Territory: 'GB' },
    { ...base, Date: '2026-09-28', 'Download Type': 'Redownload', 'Source Type': 'App referrer', Campaign: 'ig-sticky', Counts: '5' },
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'App Store search', Campaign: '', Counts: '50' },
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'App Store search', Campaign: 'null', Counts: '9' },
  ]));
  const r = aggregateReport({ family: 'downloads', level: 'detailed' }, [t], { appId: APP });
  const v = valuesOf(r);
  assert.equal(v['2026-09-28 downloads_first_time campaign:site-hero'], 8);
  assert.equal(v['2026-09-28 downloads_total campaign:site-hero'], 8);
  assert.equal(v['2026-09-28 redownloads campaign:ig-sticky'], 5);
  assert.ok(!Object.keys(v).some((k) => k.endsWith(' total') || k.includes('source:')), 'detailed never writes totals or source dims');
  assert.ok(!Object.keys(v).some((k) => k.includes('campaign:null')));
});

test('installs, sessions, subscription event (Event Date) and state, with header variations', () => {
  const inst = aggregateReport({ family: 'installs', level: 'standard' }, [parseDelimited(tsv(INST_STD, [
    { ...base, Date: '2026-09-28', Event: 'Install', 'Download Type': 'First-time download', 'Source Type': 'App Store search', Counts: '7', 'Unique Devices': '7' },
    { ...base, Date: '2026-09-28', Event: 'Delete', 'Download Type': 'First-time download', 'Source Type': 'App Store search', Counts: '2', 'Unique Devices': '2' },
  ]))], { appId: APP });
  assert.equal(valuesOf(inst)['2026-09-28 installs total'], 7);
  assert.equal(valuesOf(inst)['2026-09-28 installs source:App Store search'], 7);
  assert.equal(valuesOf(inst)['2026-09-28 deletions total'], 2);

  // lower-case headers + NBSP inside "Unique Devices"
  const sesHeaders = SES_STD.map((h) => (h === 'Unique Devices' ? 'unique\u00a0devices' : h.toLowerCase()));
  const sesText = [sesHeaders.join('\t'),
    ['2026-09-28', 'GroundApp - Breathwork', APP, '1.4', 'iPhone', 'iOS 18.6', 'Web referrer', 'Product page', '', 'US', '30', '1800', '12'].join('\t'),
    ['2026-09-28', 'GroundApp - Breathwork', APP, '1.3', 'iPad', 'iOS 18.6', 'App Store search', 'Product page', '', 'US', '10', '600', '4'].join('\t')].join('\n');
  const ses = valuesOf(aggregateReport({ family: 'sessions', level: 'standard' }, [parseDelimited(sesText)], { appId: APP }));
  assert.equal(ses['2026-09-28 sessions total'], 40);
  assert.equal(ses['2026-09-28 active_devices total'], 16);
  assert.equal(ses['2026-09-28 session_seconds total'], 2400);

  const ev = valuesOf(aggregateReport({ family: 'subscription_events', level: 'standard' }, [parseDelimited(tsv(SUBEV_STD, [
    { ...base, 'Event Date': '2026-09-28', 'Event Sub Type': 'Free Trial Starts', 'Event Grouping': 'Offer Starts', 'App Download Source Type': 'Web referrer', Counts: '6' },
    { ...base, 'Event Date': '2026-09-28', 'Event Sub Type': 'Full Price from Free Trial', 'Event Grouping': 'Paid Subscriptions from Offers', 'App Download Source Type': 'Web referrer', Counts: '2' },
    { ...base, 'Event Date': '2026-09-28', 'Event Sub Type': 'Full Price Subscription Starts', 'Event Grouping': 'Paid Subscription Starts', 'App Download Source Type': 'App Store search', Counts: '1' },
    { ...base, 'Event Date': '2026-09-28', 'Event Sub Type': 'Full Price Renewals', 'Event Grouping': 'Renewals', 'App Download Source Type': 'App Store search', Counts: '3' },
    { ...base, 'Event Date': '2026-09-28', 'Event Sub Type': 'Voluntary Churn from Full Price', 'Event Grouping': 'Voluntary Churn', 'App Download Source Type': 'App Store search', Counts: '1' },
    { ...base, 'Event Date': '2026-09-28', 'Event Sub Type': 'Paid Offer Starts', 'Event Grouping': 'Offer Starts', 'App Download Source Type': 'App Store search', Counts: '4' },
  ]))], { appId: APP }));
  assert.equal(ev['2026-09-28 trial_starts total'], 6);
  assert.equal(ev['2026-09-28 trial_starts source:Web referrer'], 6);
  assert.equal(ev['2026-09-28 trial_conversions total'], 2);
  assert.equal(ev['2026-09-28 subscription_starts total'], 1);
  assert.equal(ev['2026-09-28 renewals total'], 3);
  assert.equal(ev['2026-09-28 churn_voluntary total'], 1);
  assert.equal(ev['2026-09-28 refunds total'], 0);

  const st = valuesOf(aggregateReport({ family: 'subscription_state', level: 'standard' }, [parseDelimited(tsv(SUBST_STD, [
    { ...base, Date: '2026-09-28', 'State Metric': 'Free trials', 'State Metric Grouping': 'Subscription offers', Counts: '11' },
    { ...base, Date: '2026-09-28', 'State Metric': 'Full price', 'State Metric Grouping': 'Paid plans', Counts: '20' },
    { ...base, Date: '2026-09-28', 'State Metric': 'Preserved price', 'State Metric Grouping': 'Paid plans', Counts: '5' },
    { ...base, Date: '2026-09-28', 'State Metric': 'Billing retry', 'State Metric Grouping': 'Billing issues', Counts: '1' },
  ]))], { appId: APP }));
  assert.equal(st['2026-09-28 active_trials total'], 11);
  assert.equal(st['2026-09-28 active_subscriptions total'], 25);
});

test('missing required column is reported as an error instead of writing zeros', () => {
  const t = parseDelimited(tsv(['Date', 'App Apple Identifier', 'Counts'], [{ Date: '2026-09-28', 'App Apple Identifier': APP, Counts: '3' }]));
  const r = aggregateReport({ family: 'downloads', level: 'standard' }, [t], { appId: APP });
  assert.equal(r.dates.size, 0);
  assert.match(r.errors[0], /missing column\(s\) downloadType/);
});

test('merge: latest processingDate wins per date, older instance cannot overwrite', () => {
  const run = { blocks: new Map() };
  const wm = {};
  const mk = (n) => ({ dates: new Map([['2026-09-28', new Map([['downloads_first_time\ttotal', n]])]]) });
  mergeInstance(run, { id: 'a', processingDate: '2026-09-30', family: 'downloads', level: 'standard', reportName: 'App Downloads Standard' }, mk(5), wm);
  const late = mergeInstance(run, { id: 'b', processingDate: '2026-09-29', family: 'downloads', level: 'standard', reportName: 'App Downloads Standard' }, mk(1), wm);
  assert.deepEqual(late.skippedDates, ['2026-09-28']);
  mergeInstance(run, { id: 'c', processingDate: '2026-10-01', family: 'downloads', level: 'standard', reportName: 'App Downloads Standard' }, mk(7), wm);
  const { rows, perInstance } = buildRows(run);
  assert.deepEqual(rowMap(rows), { '2026-09-28 downloads_first_time total': 7 });
  assert.equal(perInstance.get('c'), 1);
  assert.equal(wm['downloads:standard']['2026-09-28'], '2026-10-01');
});

// ---------------------------------------------------------------------------
// End to end with a fake App Store Connect + fake PostgREST
// ---------------------------------------------------------------------------

function fakeWorld({ requests, reports, instances, segments, files, db = {} }) {
  const calls = [];
  const tables = {
    groundapp_asc_daily: new Map(),
    groundapp_asc_imports: new Map(),
    groundapp_asc_state: new Map(),
  };
  const pk = { groundapp_asc_daily: (r) => `${r.date}|${r.metric}|${r.dim}`, groundapp_asc_imports: (r) => r.instance_id, groundapp_asc_state: (r) => r.key };
  for (const [t, rows] of Object.entries(db)) for (const r of rows) tables[t].set(pk[t](r), { ...r });

  function parseFilter(v) {
    const dot = v.indexOf('.');
    const op = v.slice(0, dot);
    const arg = v.slice(dot + 1);
    if (op === 'in') {
      const list = arg.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, ''));
      return (x) => list.includes(String(x));
    }
    if (op === 'eq') return (x) => String(x) === arg;
    if (op === 'gte') return (x) => String(x) >= arg;
    if (op === 'like') {
      const re = new RegExp('^' + arg.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
      return (x) => re.test(String(x));
    }
    throw new Error(`fake postgrest: unsupported op ${op}`);
  }

  async function handleDb(url, init) {
    const table = url.pathname.replace('/rest/v1/', '');
    const store = tables[table];
    if (!store) return new Response(JSON.stringify({ message: 'no table' }), { status: 404 });
    const filters = [];
    for (const [k, v] of url.searchParams) if (!['select', 'limit', 'on_conflict'].includes(k)) filters.push([k, parseFilter(v)]);
    const match = (r) => filters.every(([k, f]) => f(r[k]));
    const method = (init && init.method) || 'GET';
    calls.push({ kind: 'db', method, table, query: url.search });
    if (method === 'GET') {
      let rows = [...store.values()].filter(match);
      const sel = url.searchParams.get('select');
      if (sel) rows = rows.map((r) => Object.fromEntries(sel.split(',').map((c) => [c, r[c]])));
      return new Response(JSON.stringify(rows), { status: 200 });
    }
    if (method === 'POST') {
      assert.match(init.headers.prefer, /resolution=merge-duplicates/);
      for (const r of JSON.parse(init.body)) store.set(pk[table](r), { ...(store.get(pk[table](r)) || {}), ...r });
      return new Response('', { status: 201 });
    }
    if (method === 'DELETE') {
      for (const [k, r] of [...store]) if (match(r)) store.delete(k);
      return new Response(null, { status: 204 });
    }
    return new Response('', { status: 405 });
  }

  function page(data, url, size) {
    const offset = Number(url.searchParams.get('cursor') || 0);
    const slice = data.slice(offset, offset + size);
    const links = {};
    if (offset + size < data.length) {
      const next = new URL(url);
      next.searchParams.set('cursor', String(offset + size));
      links.next = next.toString();
    }
    return new Response(JSON.stringify({ data: slice, links }), { status: 200 });
  }

  async function fetchImpl(input, init = {}) {
    const url = new URL(input);
    if (url.host === 'db.test') return handleDb(url, init);
    if (url.host === 'api.appstoreconnect.apple.com') {
      assert.match(init.headers.authorization, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
      calls.push({ kind: 'asc', path: url.pathname });
      let m;
      if ((m = url.pathname.match(/^\/v1\/apps\/(\d+)\/analyticsReportRequests$/))) return page(requests, url, 50);
      if ((m = url.pathname.match(/^\/v1\/analyticsReportRequests\/([^/]+)\/reports$/))) return page(reports[m[1]] || [], url, 2);
      if ((m = url.pathname.match(/^\/v1\/analyticsReports\/([^/]+)\/instances$/))) {
        assert.equal(url.searchParams.get('filter[granularity]'), 'DAILY');
        return page(instances[m[1]] || [], url, 50);
      }
      if ((m = url.pathname.match(/^\/v1\/analyticsReportInstances\/([^/]+)\/segments$/))) return page(segments[m[1]] || [], url, 50);
      return new Response(JSON.stringify({ errors: [{ code: 'NOT_FOUND', title: 'nope' }] }), { status: 404 });
    }
    if (url.host === 's3.test') {
      assert.ok(!init.headers || !init.headers.authorization, 'no ASC token sent to S3');
      calls.push({ kind: 's3', path: url.pathname });
      const body = files[url.pathname];
      return body ? new Response(body) : new Response('missing', { status: 404 });
    }
    throw new Error(`unexpected fetch ${url.host}`);
  }
  return { fetchImpl, calls, tables };
}

const inst = (id, processingDate) => ({ type: 'analyticsReportInstances', id, attributes: { granularity: 'DAILY', processingDate } });
const seg = (path, bytes) => ({ type: 'analyticsReportSegments', id: path, attributes: { url: `https://s3.test${path}?X-Amz-Signature=s`, sizeInBytes: bytes.length, checksum: 'x' } });

async function scenario({ preImported = [], state = [] } = {}) {
  const { pem } = await newP256Pem();
  const std1a = await gzip(tsv(DL_STD, [
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'Web referrer', Counts: '6' },
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'App Store search', Counts: '4' },
  ]));
  const std1b = await gzip(tsv(DL_STD, [
    { ...base, Date: '2026-09-28', 'Download Type': 'Redownload', 'Source Type': 'App Store search', Counts: '2' },
    { ...base, Date: '2026-09-29', 'Download Type': 'First-time download', 'Source Type': 'App Store search', Counts: '1' },
  ]));
  // newer instance restates 2026-09-29 (late events arrived)
  const std2 = await gzip(tsv(DL_STD, [
    { ...base, Date: '2026-09-29', 'Download Type': 'First-time download', 'Source Type': 'App Store search', Counts: '3' },
  ]));
  const det1 = await gzip(tsv(DL_DET, [
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'Web referrer', Campaign: 'site-hero', Counts: '6' },
    { ...base, Date: '2026-09-28', 'Download Type': 'First-time download', 'Source Type': 'App Store search', Campaign: '', Counts: '99' },
  ]));
  const eng1 = await gzip(tsv(ENG_STD, [
    { ...base, Date: '2026-09-28', Event: 'Impression', 'Page Type': 'No page', 'Source Type': 'App Store search', Counts: '50', 'Unique Counts': '40' },
    { ...base, Date: '2026-09-28', Event: 'Page view', 'Page Type': 'Product page', 'Source Type': 'Web referrer', Counts: '10', 'Unique Counts': '9' },
  ]));
  const world = fakeWorld({
    requests: [
      { type: 'analyticsReportRequests', id: 'req-ongoing', attributes: { accessType: 'ONGOING', stoppedDueToInactivity: false } },
    ],
    reports: {
      'req-ongoing': [
        { id: 'r-dl-std', attributes: { name: 'App Downloads Standard', category: 'COMMERCE' } },
        { id: 'r-dl-det', attributes: { name: 'App Downloads Detailed', category: 'COMMERCE' } },
        { id: 'r-eng-std', attributes: { name: 'App Store Discovery and Engagement Standard', category: 'APP_STORE_ENGAGEMENT' } },
        { id: 'r-crash', attributes: { name: 'App Crashes', category: 'APP_USAGE' } },
        { id: 'r-old', attributes: { name: 'App Sessions Standard', category: 'APP_USAGE' } },
      ],
    },
    instances: {
      'r-dl-std': [inst('i-dl-1', '2026-09-30'), inst('i-dl-2', '2026-10-01')],
      'r-dl-det': [inst('i-det-1', '2026-09-30')],
      'r-eng-std': [inst('i-eng-1', '2026-09-30')],
      'r-old': [inst('i-ses-old', '2026-09-20')],
    },
    segments: {
      'i-dl-1': [seg('/dl1a.csv.gz', std1a), seg('/dl1b.csv.gz', std1b)],
      'i-dl-2': [seg('/dl2.csv.gz', std2)],
      'i-det-1': [seg('/det1.csv.gz', det1)],
      'i-eng-1': [seg('/eng1.csv.gz', eng1)],
      'i-ses-old': [seg('/ses-old.csv.gz', std2)],
    },
    files: { '/dl1a.csv.gz': std1a, '/dl1b.csv.gz': std1b, '/dl2.csv.gz': std2, '/det1.csv.gz': det1, '/eng1.csv.gz': eng1, '/ses-old.csv.gz': std2 },
    db: {
      groundapp_asc_imports: preImported.map((id) => ({ instance_id: id, report_name: 'App Sessions Standard', granularity: 'DAILY', processing_date: '2026-09-20', rows_imported: 3 })),
      groundapp_asc_state: [
        { key: 'requests', value: { appId: APP, ongoing: 'req-ongoing', snapshots: [] } },
        ...state,
      ],
      // a stale source dim that the newer data no longer contains, and a stale campaign dim
      groundapp_asc_daily: [
        { date: '2026-09-28', metric: 'downloads_first_time', dim: 'source:App referrer', value: 9, report: 'App Downloads Standard' },
        { date: '2026-09-28', metric: 'downloads_first_time', dim: 'campaign:old-token', value: 9, report: 'App Downloads Detailed' },
        { date: '2026-09-01', metric: 'downloads_first_time', dim: 'source:App referrer', value: 1, report: 'App Downloads Standard' },
      ],
    },
  });
  const budget = createBudget(Infinity);
  const asc = createAscClient({ issuerId: 'iss', keyId: 'KID', privateKey: pem, fetch: world.fetchImpl, budget });
  const db = createSupabaseClient({ url: 'https://db.test', serviceKey: 'service-key', fetch: world.fetchImpl, budget });
  return { world, asc, db, budget };
}

test('sync: skips imported instances, sums segments, standard totals vs detailed campaigns, latest wins', async () => {
  const { world, asc, db } = await scenario({ preImported: ['i-ses-old'] });
  const summary = await runSync({ asc, db, appId: APP, now: new Date('2026-10-02T14:00:00Z') });
  assert.deepEqual(summary.errors, []);
  assert.equal(summary.instancesSeen, 5);
  assert.equal(summary.instancesNew, 4, 'already-imported instance is skipped');
  assert.ok(!world.calls.some((c) => c.kind === 'asc' && c.path.includes('i-ses-old')), 'no segment call for the imported instance');
  assert.ok(!world.calls.some((c) => c.kind === 's3' && c.path === '/ses-old.csv.gz'));
  assert.equal(world.calls.filter((c) => c.kind === 'asc' && c.path.endsWith('/reports')).length, 3, 'reports list was paginated via links.next');

  const daily = Object.fromEntries([...world.tables.groundapp_asc_daily.values()].map((r) => [`${r.date} ${r.metric} ${r.dim}`, Number(r.value)]));
  assert.equal(daily['2026-09-28 downloads_first_time total'], 10, 'totals from Standard only (Detailed 99 and campaign rows ignored)');
  assert.equal(daily['2026-09-28 redownloads total'], 2);
  assert.equal(daily['2026-09-28 downloads_total total'], 12);
  assert.equal(daily['2026-09-28 downloads_first_time source:Web referrer'], 6);
  assert.equal(daily['2026-09-28 downloads_first_time campaign:site-hero'], 6, 'campaign dims from Detailed');
  assert.equal(daily['2026-09-29 downloads_first_time total'], 3, 'newer processingDate replaces the older value, not summed');
  assert.equal(daily['2026-09-28 impressions total'], 60);
  assert.equal(daily['2026-09-28 page_views total'], 10);
  assert.equal(daily['2026-09-28 downloads_first_time source:App referrer'], undefined, 'stale source dim for a re-imported date removed');
  assert.equal(daily['2026-09-28 downloads_first_time campaign:old-token'], undefined, 'stale campaign dim removed');
  assert.equal(daily['2026-09-01 downloads_first_time source:App referrer'], 1, 'dates outside the instance untouched');

  const imports = world.tables.groundapp_asc_imports;
  assert.deepEqual([...imports.keys()].sort(), ['i-det-1', 'i-dl-1', 'i-dl-2', 'i-eng-1', 'i-ses-old']);
  assert.equal(imports.get('i-dl-2').processing_date, '2026-10-01');
  assert.ok(imports.get('i-dl-1').rows_imported > 0);

  const state = world.tables.groundapp_asc_state;
  assert.equal(state.get('watermarks').value['downloads:standard']['2026-09-29'], '2026-10-01');
  assert.equal(state.get('last_run').value.ok, true);

  // second run: everything imported, nothing downloaded, nothing upserted
  const before = world.calls.length;
  const again = await runSync({ asc, db, appId: APP, now: new Date('2026-10-02T15:00:00Z') });
  assert.equal(again.instancesNew, 0);
  assert.equal(again.rowsWritten, 0);
  assert.ok(!world.calls.slice(before).some((c) => c.kind === 's3'));
});

test('sync: a stored watermark from a newer instance blocks older data for that date', async () => {
  const { world, asc, db } = await scenario({
    preImported: ['i-ses-old', 'i-dl-2'],
    state: [{ key: 'watermarks', value: { 'downloads:standard': { '2026-09-29': '2026-10-05' } } }],
  });
  world.tables.groundapp_asc_daily.set('2026-09-29|downloads_first_time|total', { date: '2026-09-29', metric: 'downloads_first_time', dim: 'total', value: 42 });
  const summary = await runSync({ asc, db, appId: APP, now: new Date('2026-10-06T14:00:00Z') });
  assert.equal(summary.datesSkippedAsOlder, 1);
  assert.equal(Number(world.tables.groundapp_asc_daily.get('2026-09-29|downloads_first_time|total').value), 42);
  assert.equal(Number(world.tables.groundapp_asc_daily.get('2026-09-28|downloads_first_time|total').value), 10);
});

test('sync --dry-run writes nothing and returns rows', async () => {
  const { world, asc, db } = await scenario({ preImported: ['i-ses-old'] });
  const summary = await runSync({ asc, db, appId: APP, dryRun: true, now: new Date('2026-10-02T14:00:00Z') });
  assert.ok(summary.rows.length > 0);
  assert.equal(rowMap(summary.rows)['2026-09-28 downloads_first_time campaign:site-hero'], 6);
  assert.ok(!world.calls.some((c) => c.kind === 'db' && c.method !== 'GET'), 'no POST/DELETE in dry run');
  assert.equal(world.tables.groundapp_asc_imports.size, 1);
});

test('sync: tight subrequest budget defers work and still flushes cleanly', async () => {
  const { world, asc, db, budget } = await scenario({ preImported: ['i-ses-old'] });
  budget.max = 20;
  const s1 = await runSync({ asc, db, appId: APP, budget, now: new Date('2026-10-02T14:00:00Z') });
  assert.deepEqual(s1.errors, []);
  assert.ok(s1.instancesDeferred > 0, 'some instances deferred');
  assert.ok(budget.used <= 20);
  assert.ok(world.tables.groundapp_asc_state.get('last_run'), 'state flushed');
  // next runs finish the rest
  for (let i = 0; i < 4; i++) {
    budget.used = 0;
    await runSync({ asc, db, appId: APP, budget, now: new Date('2026-10-02T15:00:00Z') });
  }
  assert.equal(world.tables.groundapp_asc_imports.size, 5);
  assert.equal(Number(world.tables.groundapp_asc_daily.get('2026-09-29|downloads_first_time|total').value), 3);
});

test('ASC client refuses to send the token to a foreign next link and reports API errors clearly', async () => {
  const { pem } = await newP256Pem();
  const fetchImpl = async (input) => {
    const u = new URL(input);
    if (u.pathname === '/v1/evil') return new Response(JSON.stringify({ data: [{ id: 1 }], links: { next: 'https://evil.test/steal' } }));
    return new Response(JSON.stringify({ errors: [{ code: 'FORBIDDEN_ERROR', title: 'This request is forbidden for security reasons', detail: 'role' }] }), { status: 403 });
  };
  const asc = createAscClient({ issuerId: 'i', keyId: 'k', privateKey: pem, fetch: fetchImpl, sleep: async () => {} });
  await assert.rejects(asc.getAll('/v1/evil'), /Refusing to call evil.test/);
  await assert.rejects(asc.get('/v1/apps/1'), (e) => e.status === 403 && /HTTP 403 FORBIDDEN_ERROR/.test(e.message) && /Admin/.test(e.message));
});
