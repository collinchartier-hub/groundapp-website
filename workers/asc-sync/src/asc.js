// App Store Connect Analytics Reports -> Supabase sync for GroundApp.
//
// Shared by the Cloudflare Worker (src/index.js) and the local CLI (scripts/asc.mjs).
// Only web platform APIs are used (fetch, WebCrypto, DecompressionStream, Blob), so the
// same code runs in Workers and in Node 20+.
//
// Flow: report request ids (groundapp_asc_state) -> reports per request -> DAILY instances
// -> skip instances already in groundapp_asc_imports -> segments -> download .gz -> parse TSV
// -> aggregate per (date, metric, dim) -> latest processingDate wins per date -> upsert into
// groundapp_asc_daily -> record instances in groundapp_asc_imports.
//
// Apple docs: https://developer.apple.com/documentation/analytics-reports
// See README.md in this folder for the report-to-metric mapping.

export const ASC_API = 'https://api.appstoreconnect.apple.com';
const ASC_HOST = 'api.appstoreconnect.apple.com';

const TOKEN_TTL_SECONDS = 19 * 60; // Apple rejects tokens that expire more than 20 minutes out
const UPSERT_BATCH = 1000;
const DELETE_DATE_CHUNK = 60;
const IMPORT_ID_CHUNK = 80;
const WATERMARK_KEEP_DAYS = 70;
const EMPTY_INSTANCE_GRACE_DAYS = 3;

const noop = () => {};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class BudgetExceededError extends Error {
  constructor(max) {
    super(`Subrequest budget of ${max} used up`);
    this.name = 'BudgetExceededError';
  }
}

export class AscApiError extends Error {
  constructor(method, path, status, body) {
    const first = body && Array.isArray(body.errors) ? body.errors[0] : null;
    const title = first && first.title ? String(first.title) : '';
    const sep = /[.!?]$/.test(title) ? ' ' : ': ';
    const detail = first ? `${first.code || ''} ${title}${first.detail ? sep + first.detail : ''}`.trim() : '';
    let hint = '';
    if (status === 401) hint = ' (check ASC_ISSUER_ID, ASC_KEY_ID, the .p8 key contents and the system clock)';
    if (status === 403) hint = ' (the API key role may not allow this: creating report requests needs Admin, listing and downloading reports needs Admin, Sales and Reports, or Finance)';
    super(`App Store Connect ${method} ${path} failed with HTTP ${status}${detail ? ' ' + detail : ''}${hint}`);
    this.name = 'AscApiError';
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function b64urlFromBytes(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlFromJson(obj) {
  return b64urlFromBytes(new TextEncoder().encode(JSON.stringify(obj)));
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isoDay(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function addDays(d, days) {
  return new Date(new Date(d).getTime() + days * 86400000);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Strips anything secret-looking (query strings on presigned S3 urls) before logging.
export function safeUrl(u) {
  try {
    const x = new URL(u);
    return `${x.host}${x.pathname}`;
  } catch {
    return '[url]';
  }
}

// ---------------------------------------------------------------------------
// Subrequest budget (Workers Free allows 50 subrequests per invocation)
// ---------------------------------------------------------------------------

export function createBudget(max = Infinity) {
  return {
    used: 0,
    max,
    remaining() {
      return this.max - this.used;
    },
  };
}

function budgeted(fetchImpl, budget) {
  return async (url, init) => {
    if (budget) {
      if (budget.used >= budget.max) throw new BudgetExceededError(budget.max);
      budget.used++;
    }
    return fetchImpl(url, init);
  };
}

// ---------------------------------------------------------------------------
// ES256 JWT for the App Store Connect API
// https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests
// ---------------------------------------------------------------------------

export function pemToDer(pem) {
  let s = String(pem || '').trim();
  // Secrets pasted as one line often carry literal "\n" sequences.
  s = s.replace(/\\n/g, '\n');
  s = s.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
  if (!s) throw new Error('ASC private key is empty');
  if (!/^[A-Za-z0-9+/]+=*$/.test(s)) throw new Error('ASC private key is not valid PEM (expected the contents of AuthKey_<KEYID>.p8)');
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function importAscKey(pem) {
  try {
    return await crypto.subtle.importKey('pkcs8', pemToDer(pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  } catch (e) {
    throw new Error(`Could not import the ASC private key (expected the PKCS8 PEM from AuthKey_<KEYID>.p8): ${e.message}`);
  }
}

export async function createAscToken({ issuerId, keyId, privateKey, now = Date.now(), ttlSeconds = TOKEN_TTL_SECONDS }) {
  if (!issuerId || !keyId || !privateKey) throw new Error('Missing App Store Connect credentials (ASC_ISSUER_ID, ASC_KEY_ID, private key)');
  const key = typeof privateKey === 'string' ? await importAscKey(privateKey) : privateKey;
  const iat = Math.floor(now / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: issuerId, iat, exp: iat + Math.min(ttlSeconds, 1200), aud: 'appstoreconnect-v1' };
  const signingInput = `${b64urlFromJson(header)}.${b64urlFromJson(payload)}`;
  // WebCrypto ECDSA returns the raw r||s (IEEE P1363) form, which is exactly what JWS ES256 wants.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64urlFromBytes(new Uint8Array(sig))}`;
}

// ---------------------------------------------------------------------------
// App Store Connect API client
// ---------------------------------------------------------------------------

function buildUrl(base, pathOrUrl, params) {
  const url = new URL(/^https?:\/\//.test(pathOrUrl) ? pathOrUrl : base + pathOrUrl);
  if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  return url;
}

export function createAscClient({
  issuerId,
  keyId,
  privateKey,
  fetch: fetchImpl = globalThis.fetch,
  budget = null,
  log = noop,
  baseUrl = ASC_API,
  sleep = defaultSleep,
  maxRetries = 2,
} = {}) {
  if (!issuerId || !keyId || !privateKey) throw new Error('Missing App Store Connect credentials (ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY)');
  const f = budgeted(fetchImpl, budget);
  const apiHost = new URL(baseUrl).host;
  let key = typeof privateKey === 'string' ? null : privateKey;
  let token = null;
  let tokenExp = 0;

  async function bearer() {
    const nowMs = Date.now();
    if (!token || nowMs / 1000 > tokenExp - 120) {
      if (!key) key = await importAscKey(privateKey);
      token = await createAscToken({ issuerId, keyId, privateKey: key, now: nowMs });
      tokenExp = Math.floor(nowMs / 1000) + TOKEN_TTL_SECONDS;
    }
    return token;
  }

  async function request(method, pathOrUrl, { params, body } = {}) {
    const url = buildUrl(baseUrl, pathOrUrl, params);
    // Never send the bearer token anywhere except the App Store Connect API host.
    if (url.host !== apiHost) throw new Error(`Refusing to call ${url.host} with App Store Connect credentials`);
    const label = url.pathname;
    for (let attempt = 0; ; attempt++) {
      const headers = { authorization: `Bearer ${await bearer()}`, accept: 'application/json' };
      if (body) headers['content-type'] = 'application/json';
      const res = await f(url.toString(), { method, headers, body: body ? JSON.stringify(body) : undefined });
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const ra = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(ra) && ra > 0 ? Math.min(ra, 30) * 1000 : 1000 * 2 ** attempt;
        log(`ASC ${method} ${label} -> ${res.status}, retrying in ${wait} ms`);
        try { await res.text(); } catch { /* drain */ }
        await sleep(wait);
        continue;
      }
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (!res.ok) throw new AscApiError(method, label, res.status, data);
      return data;
    }
  }

  async function getAll(path, params, { maxPages = 50 } = {}) {
    const out = [];
    let next = buildUrl(baseUrl, path, params).toString();
    for (let page = 0; next; page++) {
      if (page >= maxPages) throw new Error(`Too many pages for ${path}`);
      const body = await request('GET', next);
      if (body && Array.isArray(body.data)) out.push(...body.data);
      next = body && body.links && body.links.next ? body.links.next : null;
    }
    return out;
  }

  return {
    get: (path, params) => request('GET', path, { params }),
    post: (path, body) => request('POST', path, { body }),
    getAll,
    // Unauthenticated fetch (same budget) for the presigned segment download urls.
    rawFetch: f,
  };
}

// ---------------------------------------------------------------------------
// Supabase PostgREST client (same header style as lib/util.js, but throws on errors)
// ---------------------------------------------------------------------------

export function createSupabaseClient({ url, serviceKey, fetch: fetchImpl = globalThis.fetch, budget = null } = {}) {
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  const f = budgeted(fetchImpl, budget);
  const base = url.replace(/\/+$/, '');
  async function req(path, { method = 'GET', body, prefer } = {}) {
    const headers = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' };
    if (prefer) headers.prefer = prefer;
    const res = await f(`${base}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = data && typeof data === 'object' ? data.message || data.hint || JSON.stringify(data) : String(text).slice(0, 200);
      throw new Error(`Supabase ${method} ${path.split('?')[0]} failed with HTTP ${res.status}: ${msg}`);
    }
    return data;
  }
  return { req };
}

// --- state (groundapp_asc_state) ---

export async function readState(db, keys) {
  const list = keys.map((k) => `"${k}"`).join(',');
  const rows = await db.req(`groundapp_asc_state?select=key,value&key=in.(${encodeURIComponent(list)})`);
  const out = {};
  for (const r of rows || []) out[r.key] = r.value;
  return out;
}

export async function writeState(db, entries, nowIso = new Date().toISOString()) {
  const body = Object.entries(entries).map(([key, value]) => ({ key, value, updated_at: nowIso }));
  if (!body.length) return;
  await db.req('groundapp_asc_state?on_conflict=key', { method: 'POST', body, prefer: 'resolution=merge-duplicates,return=minimal' });
}

// --- imports (groundapp_asc_imports) ---

export async function fetchImportedIds(db, instances, now = new Date()) {
  const ids = new Set();
  if (!instances.length) return ids;
  // One cheap query covers everything Apple still lists (instances live 35 days).
  const cutoff = isoDay(addDays(now, -45));
  const recent = (await db.req(`groundapp_asc_imports?select=instance_id&processing_date=gte.${cutoff}&limit=1000`)) || [];
  for (const r of recent) ids.add(r.instance_id);
  const truncated = recent.length >= 1000;
  const rest = instances.filter((i) => !ids.has(i.id) && (truncated || i.processingDate < cutoff)).map((i) => i.id);
  for (const part of chunk([...new Set(rest)], IMPORT_ID_CHUNK)) {
    const list = part.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
    const rows = (await db.req(`groundapp_asc_imports?select=instance_id&instance_id=in.(${encodeURIComponent(list)})`)) || [];
    for (const r of rows) ids.add(r.instance_id);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Report requests
// https://developer.apple.com/documentation/appstoreconnectapi/downloading-analytics-reports
// ---------------------------------------------------------------------------

async function createReportRequest(asc, appId, accessType) {
  const body = {
    data: {
      type: 'analyticsReportRequests',
      attributes: { accessType },
      relationships: { app: { data: { type: 'apps', id: String(appId) } } },
    },
  };
  const res = await asc.post('/v1/analyticsReportRequests', body);
  return res && res.data ? res.data : null;
}

async function listReportRequests(asc, appId) {
  return asc.getAll(`/v1/apps/${appId}/analyticsReportRequests`, { limit: 200 });
}

// Finds the app's ONGOING (and optionally ONE_TIME_SNAPSHOT) requests, creating them when
// `create` is true (needs an Admin key), and stores the ids in groundapp_asc_state under "requests".
export async function findOrCreateRequests({ asc, db = null, log = noop }, appId, { snapshot = false, create = true } = {}) {
  let existing = await listReportRequests(asc, appId);
  const created = [];
  const active = (type) => existing.filter((r) => r.attributes && r.attributes.accessType === type && !r.attributes.stoppedDueToInactivity);

  async function ensure(type) {
    if (active(type).length || !create) return;
    try {
      const r = await createReportRequest(asc, appId, type);
      if (r) { existing = [...existing, r]; created.push({ type, id: r.id }); log(`Created ${type} report request ${r.id}`); }
    } catch (e) {
      // 409 means Apple already has one; re-list and reuse it.
      if (e instanceof AscApiError && e.status === 409) existing = await listReportRequests(asc, appId);
      else throw e;
    }
  }

  await ensure('ONGOING');
  if (snapshot) await ensure('ONE_TIME_SNAPSHOT');

  const ongoing = active('ONGOING')[0] || null;
  const stopped = existing.filter((r) => r.attributes && r.attributes.stoppedDueToInactivity).map((r) => r.id);
  const snapshots = existing.filter((r) => r.attributes && r.attributes.accessType === 'ONE_TIME_SNAPSHOT').map((r) => r.id);
  const value = {
    appId: String(appId),
    ongoing: ongoing ? ongoing.id : null,
    snapshots,
    stopped,
    updatedAt: new Date().toISOString(),
  };
  if (db) await writeState(db, { requests: value });
  return { ...value, created };
}

// ---------------------------------------------------------------------------
// Report families and metric mapping (documented in README.md)
// ---------------------------------------------------------------------------

// Normalizes a header or value for comparisons: case-insensitive, punctuation and NBSP folded.
export function normVal(s) {
  if (s === undefined || s === null) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normHeader(h) {
  return String(h || '')
    .replace(/^\uFEFF/, '')
    .replace(/\u00a0/g, ' ')
    .replace(/^"+|"+$/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Logical field -> accepted header spellings (normalized). First match wins.
const COLUMN_ALIASES = {
  date: ['date', 'event date'],
  appId: ['app apple identifier', 'app apple id', 'apple identifier', 'app id'],
  event: ['event', 'event type'],
  pageType: ['page type'],
  sourceType: ['source type', 'app download source type', 'download source type'],
  campaign: ['campaign', 'campaign token', 'campaign name'],
  downloadType: ['download type'],
  counts: ['counts', 'count', 'total counts'],
  sessions: ['sessions', 'total sessions'],
  uniqueDevices: ['unique devices', 'unique device count'],
  duration: ['total session duration', 'total session duration seconds', 'total session duration (seconds)', 'session duration'],
  subType: ['event sub type', 'event subtype', 'event sub-type'],
  grouping: ['event grouping'],
  stateMetric: ['state metric'],
  stateGrouping: ['state metric grouping'],
};

export function resolveColumns(headers) {
  const idx = new Map();
  headers.forEach((h, i) => {
    const k = normHeader(h);
    if (!idx.has(k)) idx.set(k, i);
  });
  const cols = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const a of aliases) {
      if (idx.has(a)) { cols[field] = idx.get(a); break; }
    }
  }
  return cols;
}

const SOURCE_NAMES = {
  'app store search': 'App Store search',
  'app store browse': 'App Store browse',
  'app referrer': 'App referrer',
  'web referrer': 'Web referrer',
  'app clip': 'App Clip',
  notification: 'Notification',
  unavailable: 'Unavailable',
  'institutional purchase': 'Institutional purchase',
};

const NULLISH = new Set(['', 'null', 'none', 'na', 'n a', 'nan', 'undefined', 'no campaign', 'not set']);

const PRODUCT_PAGE_TYPES = new Set(['product page', 'store sheet']);
const DOWNLOAD_TYPES_IGNORED = new Set(['manual update', 'auto update', 'automatic update', 'update', 'updates', 'restore', 'restores']);
const SUB_EVENT_GROUPS = new Set([
  'offer starts', 'offer renewals', 'paid subscriptions from offers', 'paid subscription starts', 'renewals',
  'commitment based payments', 'entered billing issue', 'recoveries from billing issue', 'involuntary churn',
  'voluntary churn', 'exits', 'extensions', 'refunds',
]);
const SUB_STATE_METRICS = new Set([
  'free trials', 'paid offers', 'full price', 'preserved price', 'contingent price', 'grace period',
  'billing retry', 'suspended', 'voluntarily churned', 'involuntarily churned',
]);

// Each family: accepted report base names (normalized, Standard/Detailed suffix and a trailing
// "report" stripped), metrics it owns, which metrics get source:/campaign: dims, and whether
// the Detailed report is read (only for campaign dims).
export const FAMILIES = {
  engagement: {
    names: ['app store discovery and engagement'],
    metrics: ['impressions', 'page_views'],
    dimMetrics: ['impressions', 'page_views'],
    detailed: true,
    required: ['date', 'event', 'counts'],
    describe: (r) => `Event=${r.raw('event')}`,
    extract(r) {
      const ev = r.v('event');
      const n = r.n('counts');
      if (ev === 'impression' || ev === 'impressions') return [['impressions', n]];
      if (ev === 'page view' || ev === 'page views') {
        const pt = r.v('pageType');
        // ASC "Product Page Views" = product page + StoreKit store sheet. ASC "Impressions" includes them.
        if (!pt || PRODUCT_PAGE_TYPES.has(pt)) return [['page_views', n], ['impressions', n]];
        return [];
      }
      if (ev === 'tap' || ev === 'taps') return [];
      return null;
    },
  },
  downloads: {
    names: ['app downloads', 'app store downloads', 'app download', 'app store download'],
    metrics: ['downloads_first_time', 'redownloads', 'downloads_total'],
    dimMetrics: ['downloads_first_time', 'redownloads', 'downloads_total'],
    detailed: true,
    required: ['date', 'downloadType', 'counts'],
    describe: (r) => `Download Type=${r.raw('downloadType')}`,
    extract(r) {
      const t = r.v('downloadType');
      const n = r.n('counts');
      if (t === 'first time download' || t === 'first time downloads') return [['downloads_first_time', n], ['downloads_total', n]];
      if (t === 'redownload' || t === 'redownloads' || t === 're download') return [['redownloads', n], ['downloads_total', n]];
      if (DOWNLOAD_TYPES_IGNORED.has(t)) return [];
      return null;
    },
  },
  installs: {
    names: [
      'app store installation and deletion', 'app store installations and deletions',
      'app installation and deletion', 'app installations and deletions',
    ],
    metrics: ['installs', 'deletions'],
    dimMetrics: ['installs'],
    detailed: false,
    required: ['date', 'event', 'counts'],
    describe: (r) => `Event=${r.raw('event')}`,
    extract(r) {
      const ev = r.v('event');
      const n = r.n('counts');
      if (['install', 'installs', 'installation', 'installations'].includes(ev)) return [['installs', n]];
      if (['delete', 'deletes', 'deletion', 'deletions'].includes(ev)) return [['deletions', n]];
      return null;
    },
  },
  sessions: {
    names: ['app sessions'],
    metrics: ['sessions', 'active_devices', 'session_seconds'],
    dimMetrics: [],
    detailed: false,
    required: ['date', 'sessions'],
    available: (cols) => ['sessions', ...(cols.uniqueDevices != null ? ['active_devices'] : []), ...(cols.duration != null ? ['session_seconds'] : [])],
    describe: () => 'row',
    extract(r) {
      return [['sessions', r.n('sessions')], ['active_devices', r.n('uniqueDevices')], ['session_seconds', r.n('duration')]];
    },
  },
  subscription_events: {
    names: ['app store subscription event', 'app store subscription events', 'subscription event', 'subscription events'],
    metrics: ['trial_starts', 'trial_conversions', 'subscription_starts', 'renewals', 'churn_voluntary', 'churn_involuntary', 'refunds'],
    dimMetrics: ['trial_starts', 'trial_conversions', 'subscription_starts'],
    detailed: true,
    required: ['date', 'counts', ['subType', 'grouping']],
    describe: (r) => `Event Sub Type=${r.raw('subType')} / Event Grouping=${r.raw('grouping')}`,
    extract(r) {
      const sub = r.v('subType');
      const grp = r.v('grouping');
      const n = r.n('counts');
      if (sub === 'free trial starts') return [['trial_starts', n]];
      if (sub === 'full price from free trial' || sub === 'contingent price from free trial') return [['trial_conversions', n]];
      if (grp === 'paid subscription starts' || sub === 'full price subscription starts' || sub === 'contingent price subscription starts') return [['subscription_starts', n]];
      if (grp === 'renewals' || /^(full|preserved|contingent) price renewals?( from .+)?$/.test(sub)) return [['renewals', n]];
      if (grp === 'voluntary churn' || sub.startsWith('voluntary churn')) return [['churn_voluntary', n]];
      if (grp === 'involuntary churn' || sub.startsWith('involuntary churn')) return [['churn_involuntary', n]];
      if (sub.startsWith('refunds')) return [['refunds', n]];
      if (SUB_EVENT_GROUPS.has(grp)) return [];
      return null;
    },
  },
  subscription_state: {
    names: ['app store subscription state', 'app store subscription states', 'subscription state', 'subscription states'],
    metrics: ['active_subscriptions', 'active_trials'],
    dimMetrics: [],
    detailed: false,
    required: ['date', 'counts', ['stateMetric', 'stateGrouping']],
    describe: (r) => `State Metric=${r.raw('stateMetric')}`,
    extract(r) {
      const m = r.v('stateMetric');
      const g = r.v('stateGrouping');
      const n = r.n('counts');
      if (m === 'free trials' || m === 'free trial') return [['active_trials', n]];
      if (g === 'paid plans' || m === 'full price' || m === 'preserved price' || m === 'contingent price') return [['active_subscriptions', n]];
      if (SUB_STATE_METRICS.has(m)) return [];
      return null;
    },
  },
};

// "App Downloads Standard" -> { family: 'downloads', level: 'standard' }. Unknown -> null.
export function classifyReport(name) {
  let n = normHeader(name);
  let level = 'standard';
  const m = n.match(/^(.*?)\s+(standard|detailed)$/);
  if (m) { n = m[1]; level = m[2]; }
  n = n.replace(/\s+report$/, '').trim();
  for (const [family, def] of Object.entries(FAMILIES)) if (def.names.includes(n)) return { family, level };
  return null;
}

// One report per family+level per request; an explicit "Standard"/"Detailed" suffix beats a bare name.
export function selectTrackedReports(reports) {
  const best = new Map();
  for (const r of reports || []) {
    const name = (r.attributes && r.attributes.name) || '';
    const c = classifyReport(name);
    if (!c) continue;
    if (c.level === 'detailed' && !FAMILIES[c.family].detailed) continue;
    const key = `${c.family}:${c.level}`;
    const explicit = /(standard|detailed)\s*$/i.test(name);
    const prev = best.get(key);
    if (!prev || (explicit && !prev.explicit)) best.set(key, { id: r.id, name, family: c.family, level: c.level, explicit, category: r.attributes && r.attributes.category });
  }
  return [...best.values()];
}

// ---------------------------------------------------------------------------
// Download, gunzip, parse
// ---------------------------------------------------------------------------

export async function gunzipIfNeeded(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return bytes; // already plain text (for example if the CDN decoded Content-Encoding: gzip)
}

async function defaultMd5(bytes) {
  try {
    return hex(await crypto.subtle.digest('MD5', bytes)); // supported in Workers, not in Node WebCrypto
  } catch {
    return null;
  }
}

// Downloads one segment from its presigned url (no auth header), verifies size/checksum when
// possible, gunzips and decodes. Checksum mismatches are warnings because Apple does not
// document the algorithm (it looks like MD5 of the .gz file).
export async function downloadSegment(fetchImpl, attrs, { md5 = defaultMd5 } = {}) {
  if (!attrs || !attrs.url) throw new Error('Segment has no download url');
  const res = await fetchImpl(attrs.url);
  if (!res.ok) throw new Error(`Segment download failed with HTTP ${res.status} (${safeUrl(attrs.url)}). Presigned urls expire after a few minutes.`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const warnings = [];
  const gz = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (gz && Number.isFinite(attrs.sizeInBytes) && attrs.sizeInBytes !== bytes.length) {
    warnings.push(`segment size ${bytes.length} != sizeInBytes ${attrs.sizeInBytes}`);
  }
  if (gz && attrs.checksum && md5) {
    const sum = await md5(bytes);
    if (sum && sum.toLowerCase() !== String(attrs.checksum).toLowerCase()) warnings.push('segment checksum mismatch (assumed MD5)');
  }
  const plain = await gunzipIfNeeded(bytes);
  const text = new TextDecoder('utf-8').decode(plain).replace(/^\uFEFF/, '');
  return { text, warnings, bytes: bytes.length };
}

// Parses Apple's tab-separated files (falls back to comma if the header has no tab).
// Handles CRLF, BOM, blank lines, ragged rows and double-quoted fields.
export function parseDelimited(text) {
  const src = String(text || '').replace(/^\uFEFF/, '');
  const firstBreak = src.search(/\r?\n/);
  const firstLine = firstBreak === -1 ? src : src.slice(0, firstBreak);
  const delim = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : '\t';
  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let fieldStart = true;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"' && fieldStart) { inQuotes = true; fieldStart = false; continue; }
    if (c === delim) { row.push(field); field = ''; fieldStart = true; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      records.push(row);
      row = [];
      field = '';
      fieldStart = true;
      continue;
    }
    field += c;
    fieldStart = false;
  }
  if (field !== '' || row.length) { row.push(field); records.push(row); }
  const nonEmpty = records.filter((r) => !(r.length === 1 && r[0].trim() === ''));
  if (!nonEmpty.length) return { headers: [], rows: [], delimiter: delim };
  const headers = nonEmpty[0].map((h) => h.replace(/\u00a0/g, ' ').trim());
  return { headers, rows: nonEmpty.slice(1), delimiter: delim };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export function normDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (us) m = [null, us[3], us[1].padStart(2, '0'), us[2].padStart(2, '0')];
  }
  if (!m) {
    const compact = t.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compact) m = compact;
  }
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function parseNum(s) {
  if (s === undefined) return null; // column missing
  const t = String(s).trim();
  if (t === '') return 0;
  const n = Number(t.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

export function canonicalSource(raw) {
  const k = normVal(raw);
  return SOURCE_NAMES[k] || String(raw).trim();
}

function campaignToken(raw) {
  const t = String(raw || '').trim();
  return NULLISH.has(normVal(t)) ? null : t.slice(0, 200);
}

const KEY_SEP = '\t';

function missingRequired(required, cols) {
  const missing = [];
  for (const req of required) {
    if (Array.isArray(req)) { if (!req.some((f) => cols[f] != null)) missing.push(req.join(' or ')); }
    else if (cols[req] == null) missing.push(req);
  }
  return missing;
}

// Aggregates all segment tables of one report instance into
// dates: Map<date, Map<"metric\tdim", value>>. Standard reports produce 'total' and
// 'source:<type>' dims (totals are zero-filled for every date present); Detailed reports
// produce only 'campaign:<token>' dims so totals are never double counted.
export function aggregateReport({ family, level }, tables, { appId = null } = {}) {
  const def = FAMILIES[family];
  if (!def) throw new Error(`Unknown report family ${family}`);
  const result = {
    dates: new Map(),
    stats: { rows: 0, used: 0, otherApp: 0, badDate: 0, badNumber: 0, unmapped: {} },
    errors: [],
    notes: [],
    headers: null,
  };
  const dimMetrics = new Set(def.dimMetrics);

  for (const table of tables) {
    if (!table.headers.length) continue;
    if (!result.headers) result.headers = table.headers;
    const cols = resolveColumns(table.headers);
    const missing = missingRequired(def.required, cols);
    if (missing.length) {
      result.errors.push(`missing column(s) ${missing.join(', ')}; got: ${table.headers.join(' | ')}`);
      continue;
    }
    if (level === 'detailed' && cols.campaign == null) {
      result.notes.push('detailed report has no Campaign column, nothing to import');
      continue;
    }
    const fillMetrics = def.available ? def.available(cols) : def.metrics;

    for (const raw of table.rows) {
      result.stats.rows++;
      const get = (f) => (cols[f] == null ? undefined : (raw[cols[f]] ?? '').trim());
      if (appId != null && cols.appId != null) {
        const a = get('appId');
        if (a && a !== String(appId)) { result.stats.otherApp++; continue; }
      }
      const date = normDate(get('date'));
      if (!date) { result.stats.badDate++; continue; }

      let bucket = result.dates.get(date);
      if (!bucket) {
        bucket = new Map();
        if (level === 'standard') for (const m of fillMetrics) bucket.set(m + KEY_SEP + 'total', 0);
        result.dates.set(date, bucket);
      }

      const r = { v: (f) => normVal(get(f)), raw: (f) => get(f) ?? '', n: (f) => parseNum(get(f)) };
      const contribs = def.extract(r);
      if (contribs === null) {
        const label = def.describe(r);
        result.stats.unmapped[label] = (result.stats.unmapped[label] || 0) + 1;
        continue;
      }
      let used = false;
      for (const [metric, value] of contribs) {
        if (value === null || value === undefined) continue;
        if (Number.isNaN(value)) { result.stats.badNumber++; continue; }
        const dims = [];
        if (level === 'standard') {
          dims.push('total');
          if (dimMetrics.has(metric) && cols.sourceType != null) {
            const src = get('sourceType');
            if (src && !NULLISH.has(normVal(src))) dims.push('source:' + canonicalSource(src));
          }
        } else if (dimMetrics.has(metric)) {
          const ct = campaignToken(get('campaign'));
          if (ct) dims.push('campaign:' + ct);
        }
        for (const dim of dims) {
          const k = metric + KEY_SEP + dim;
          bucket.set(k, (bucket.get(k) || 0) + value);
          used = true;
        }
      }
      if (used) result.stats.used++;
    }
  }
  return result;
}

// Applies one instance's aggregate to the run, honoring "latest processingDate wins" per
// (family, level, date). watermarks[group][date] = processingDate that last wrote that date.
export function mergeInstance(run, inst, result, watermarks) {
  const group = `${inst.family}:${inst.level}`;
  const wm = (watermarks[group] ||= {});
  let blocks = run.blocks.get(group);
  if (!blocks) { blocks = new Map(); run.blocks.set(group, blocks); }
  const skippedDates = [];
  let accepted = 0;
  for (const [date, values] of result.dates) {
    const prev = wm[date];
    if (prev && prev > inst.processingDate) { skippedDates.push(date); continue; }
    wm[date] = inst.processingDate;
    blocks.set(date, { values, report: inst.reportName, instanceId: inst.id });
    accepted += values.size;
  }
  return { accepted, skippedDates };
}

function round(v) {
  return Math.round(v * 1e6) / 1e6;
}

// Turns the run's per-date blocks into rows for groundapp_asc_daily. Dims are only written
// when non-zero; totals are always written so a newer instance can zero out an older one.
export function buildRows(run, nowIso = new Date().toISOString()) {
  const rows = [];
  const perInstance = new Map();
  for (const blocks of run.blocks.values()) {
    for (const [date, block] of blocks) {
      for (const [k, v] of block.values) {
        const [metric, dim] = k.split(KEY_SEP);
        if (dim !== 'total' && !v) continue;
        rows.push({ date, metric, dim, value: round(v), report: block.report, updated_at: nowIso });
        perInstance.set(block.instanceId, (perInstance.get(block.instanceId) || 0) + 1);
      }
    }
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.metric < b.metric ? -1 : a.metric > b.metric ? 1 : a.dim < b.dim ? -1 : a.dim > b.dim ? 1 : 0));
  return { rows, perInstance };
}

function groupHasDims(group) {
  const [family] = group.split(':');
  return FAMILIES[family] && FAMILIES[family].dimMetrics.length > 0;
}

// Upper bound on Supabase calls the final flush needs, used to stop early on a tight budget.
function flushCost(run, extraGroup = null) {
  let calls = 2; // imports + state
  let rows = 0;
  const groups = new Set(run.blocks.keys());
  if (extraGroup) groups.add(extraGroup);
  for (const g of groups) {
    const blocks = run.blocks.get(g);
    let dates = blocks ? blocks.size : 0;
    if (blocks) for (const b of blocks.values()) rows += b.values.size;
    if (g === extraGroup) dates += 3;
    if (groupHasDims(g)) calls += Math.max(1, Math.ceil(dates / DELETE_DATE_CHUNK));
  }
  return calls + Math.ceil((rows + 300) / UPSERT_BATCH);
}

// --- writes ---

async function deleteDims(db, group, dates) {
  const [family, level] = group.split(':');
  const def = FAMILIES[family];
  if (!def || !def.dimMetrics.length || !dates.length) return;
  const prefix = level === 'detailed' ? 'campaign:' : 'source:';
  const metrics = def.dimMetrics.join(',');
  for (const part of chunk(dates.sort(), DELETE_DATE_CHUNK)) {
    await db.req(
      `groundapp_asc_daily?date=in.(${part.join(',')})&metric=in.(${metrics})&dim=like.${encodeURIComponent(prefix + '*')}`,
      { method: 'DELETE', prefer: 'return=minimal' },
    );
  }
}

export async function upsertDaily(db, rows) {
  for (const part of chunk(rows, UPSERT_BATCH)) {
    await db.req('groundapp_asc_daily?on_conflict=date,metric,dim', {
      method: 'POST',
      body: part,
      prefer: 'resolution=merge-duplicates,return=minimal',
    });
  }
}

export async function recordImports(db, records) {
  if (!records.length) return;
  await db.req('groundapp_asc_imports?on_conflict=instance_id', {
    method: 'POST',
    body: records,
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

function pruneWatermarks(watermarks, now) {
  const cutoff = isoDay(addDays(now, -WATERMARK_KEEP_DAYS));
  const out = {};
  for (const [group, dates] of Object.entries(watermarks || {})) {
    const kept = {};
    for (const [d, p] of Object.entries(dates || {})) if (d >= cutoff) kept[d] = p;
    if (Object.keys(kept).length) out[group] = kept;
  }
  return out;
}

function compareInstances(a, b) {
  if (a.processingDate !== b.processingDate) return a.processingDate < b.processingDate ? -1 : 1;
  const ra = a.requestType === 'ONE_TIME_SNAPSHOT' ? 0 : 1;
  const rb = b.requestType === 'ONE_TIME_SNAPSHOT' ? 0 : 1;
  if (ra !== rb) return ra - rb; // on ties the ONGOING instance is applied last and wins
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// ---------------------------------------------------------------------------
// The sync
// ---------------------------------------------------------------------------

export async function listReports(asc, requestId) {
  return asc.getAll(`/v1/analyticsReportRequests/${requestId}/reports`, { limit: 200 });
}

export async function listInstances(asc, reportId, granularity = 'DAILY') {
  return asc.getAll(`/v1/analyticsReports/${reportId}/instances`, { 'filter[granularity]': granularity, limit: 200 });
}

export async function listSegments(asc, instanceId) {
  return asc.getAll(`/v1/analyticsReportInstances/${instanceId}/segments`, { limit: 200 });
}

// Collects tracked reports and their DAILY instances for every request.
export async function collectInstances(asc, requestList, { since = null, summary = null, log = noop } = {}) {
  const candidates = [];
  for (const r of requestList) {
    let reports;
    try {
      reports = await listReports(asc, r.id);
    } catch (e) {
      if (e instanceof BudgetExceededError) throw e;
      if (summary) summary.errors.push(`list reports for ${r.type} request: ${e.message}`);
      continue;
    }
    const tracked = selectTrackedReports(reports);
    if (summary) summary.requests.push({ type: r.type, id: r.id, reports: reports.length, tracked: tracked.map((t) => t.name) });
    log(`${r.type} request: ${reports.length} reports, tracking ${tracked.length}`);
    for (const rep of tracked) {
      let insts;
      try {
        insts = await listInstances(asc, rep.id, 'DAILY');
      } catch (e) {
        if (e instanceof BudgetExceededError) throw e;
        if (summary) summary.errors.push(`list instances for ${rep.name}: ${e.message}`);
        continue;
      }
      for (const i of insts) {
        const a = i.attributes || {};
        if (!a.processingDate) continue;
        if (a.granularity && a.granularity !== 'DAILY') continue;
        if (since && a.processingDate < since) continue;
        candidates.push({
          id: i.id,
          processingDate: a.processingDate,
          granularity: 'DAILY',
          requestType: r.type,
          reportId: rep.id,
          reportName: rep.name,
          family: rep.family,
          level: rep.level,
        });
      }
    }
  }
  return candidates;
}

export async function runSync({
  asc,
  db = null,
  appId,
  dryRun = false,
  includeSnapshot = true,
  since = null,
  budget = null,
  log = noop,
  now = new Date(),
  md5,
}) {
  if (!asc) throw new Error('runSync needs an App Store Connect client');
  if (!appId) throw new Error('runSync needs appId');
  if (!dryRun && !db) throw new Error('runSync needs a Supabase client to write (or use dryRun)');
  const t0 = Date.now();
  const nowIso = now.toISOString();
  const summary = {
    ok: true,
    appId: String(appId),
    dryRun,
    startedAt: nowIso,
    requests: [],
    instancesSeen: 0,
    instancesNew: 0,
    instancesProcessed: 0,
    instancesDeferred: 0,
    rowsWritten: 0,
    datesSkippedAsOlder: 0,
    errors: [],
    warnings: [],
    notes: [],
    unmapped: {},
    columnsSeen: {},
    subrequests: 0,
  };

  // 1. State: request ids + watermarks.
  const state = db ? await readState(db, ['requests', 'watermarks']) : {};
  let requests = state.requests;
  let requestsDiscovered = false;
  if (!requests || !requests.ongoing || (requests.appId && String(requests.appId) !== String(appId))) {
    log('No stored report request ids, listing them from App Store Connect');
    try {
      requests = await findOrCreateRequests({ asc, db: null, log }, appId, { create: false });
    } catch (e) {
      throw new Error(`No report request ids in groundapp_asc_state and listing them failed (${e.message}). Run "node scripts/asc.mjs request" with the Admin key first.`);
    }
    if (!requests.ongoing) throw new Error('No active ONGOING analytics report request for this app. Run "node scripts/asc.mjs request" with the Admin key.');
    requestsDiscovered = true;
  }
  const requestList = [{ type: 'ONGOING', id: requests.ongoing }];
  if (includeSnapshot) for (const id of requests.snapshots || []) requestList.push({ type: 'ONE_TIME_SNAPSHOT', id });

  // 2. Reports and instances.
  const candidates = await collectInstances(asc, requestList, { since, summary, log });
  summary.instancesSeen = candidates.length;

  // 3. Skip instances already imported.
  const imported = db ? await fetchImportedIds(db, candidates, now) : new Set();
  const todo = candidates.filter((c) => !imported.has(c.id)).sort(compareInstances);
  summary.instancesNew = todo.length;

  // 4. Download, aggregate, merge (oldest processingDate first).
  const watermarks = JSON.parse(JSON.stringify(state.watermarks || {}));
  const run = { blocks: new Map() };
  const done = [];
  for (let i = 0; i < todo.length; i++) {
    const inst = todo[i];
    const group = `${inst.family}:${inst.level}`;
    const label = `${inst.reportName} ${inst.processingDate}`;
    if (budget && budget.remaining() < 2 + (dryRun ? 0 : flushCost(run, group))) {
      summary.instancesDeferred = todo.length - i;
      summary.notes.push(`budget reached, ${todo.length - i} instance(s) left for the next run`);
      break;
    }
    try {
      const segs = await listSegments(asc, inst.id);
      if (!segs.length) {
        const old = inst.processingDate <= isoDay(addDays(now, -EMPTY_INSTANCE_GRACE_DAYS));
        if (old) done.push({ inst, rows: 0 });
        summary.notes.push(`${label}: no segments${old ? '' : ' yet'}`);
        continue;
      }
      if (budget && budget.remaining() < segs.length + (dryRun ? 0 : flushCost(run, group))) {
        summary.instancesDeferred = todo.length - i;
        summary.notes.push(`budget reached, ${todo.length - i} instance(s) left for the next run`);
        break;
      }
      const tables = [];
      for (const seg of segs) {
        const dl = await downloadSegment(asc.rawFetch, seg.attributes || {}, md5 ? { md5 } : undefined);
        for (const w of dl.warnings) summary.warnings.push(`${label}: ${w}`);
        tables.push(parseDelimited(dl.text));
      }
      const result = aggregateReport(inst, tables, { appId });
      if (result.headers && !summary.columnsSeen[inst.reportName]) summary.columnsSeen[inst.reportName] = result.headers;
      for (const [k, v] of Object.entries(result.stats.unmapped)) {
        const key = `${inst.reportName}: ${k}`;
        summary.unmapped[key] = (summary.unmapped[key] || 0) + v;
      }
      for (const n of result.notes) summary.notes.push(`${label}: ${n}`);
      if (result.stats.badDate || result.stats.badNumber) {
        summary.warnings.push(`${label}: skipped ${result.stats.badDate} row(s) with bad dates, ${result.stats.badNumber} bad number(s)`);
      }
      if (result.errors.length) {
        summary.errors.push(`${label}: ${result.errors.join('; ')}`);
        continue; // not recorded, retried next run
      }
      const merged = mergeInstance(run, inst, result, watermarks);
      summary.datesSkippedAsOlder += merged.skippedDates.length;
      done.push({ inst });
      summary.instancesProcessed++;
      log(`${label}: ${result.stats.rows} rows, ${result.dates.size} date(s)`);
    } catch (e) {
      if (e instanceof BudgetExceededError) {
        summary.instancesDeferred = todo.length - i;
        summary.notes.push(`budget reached, ${todo.length - i} instance(s) left for the next run`);
        break;
      }
      summary.errors.push(`${label}: ${e.message}`);
    }
  }

  // 5. Flush.
  const { rows, perInstance } = buildRows(run, nowIso);
  summary.rowsWritten = rows.length;
  const importRecords = done.map(({ inst }) => ({
    instance_id: inst.id,
    report_name: inst.reportName,
    granularity: inst.granularity,
    processing_date: inst.processingDate,
    rows_imported: perInstance.get(inst.id) || 0,
    imported_at: nowIso,
  }));

  if (dryRun) {
    summary.rows = rows;
    summary.wouldRecordImports = importRecords.map((r) => `${r.report_name} ${r.processing_date} (${r.rows_imported} rows)`);
  } else if (db) {
    for (const [group, blocks] of run.blocks) await deleteDims(db, group, [...blocks.keys()]);
    await upsertDaily(db, rows);
    await recordImports(db, importRecords);
    const lastRun = {
      at: nowIso,
      ok: summary.errors.length === 0,
      instancesNew: summary.instancesNew,
      instancesProcessed: summary.instancesProcessed,
      instancesDeferred: summary.instancesDeferred,
      rowsWritten: summary.rowsWritten,
      errors: summary.errors.slice(0, 5),
      durationMs: Date.now() - t0,
    };
    const entries = { watermarks: pruneWatermarks(watermarks, now), last_run: lastRun };
    if (requestsDiscovered) entries.requests = { ...requests, created: undefined };
    await writeState(db, entries, nowIso);
  }

  summary.ok = summary.errors.length === 0;
  summary.durationMs = Date.now() - t0;
  summary.subrequests = budget ? budget.used : undefined;
  return summary;
}
