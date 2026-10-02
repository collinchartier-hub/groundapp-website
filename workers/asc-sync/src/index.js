// groundapp-asc-sync: daily App Store Connect analytics -> Supabase (groundapp_asc_daily).
//
// scheduled(): runs the sync with the Sales and Reports key (cron in wrangler.toml).
// GET  /health : liveness only, returns no data.
// POST /run    : manual run, requires header "x-sync-token: <SYNC_TOKEN>" (or Authorization: Bearer).

import { createAscClient, createSupabaseClient, createBudget, runSync } from './asc.js';

const DEFAULT_MAX_SUBREQUESTS = 45; // Workers Free caps each invocation at 50 subrequests

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// Constant-time comparison via SHA-256 digests (lengths never leak).
async function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const ax = new Uint8Array(x);
  const ay = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ax.length; i++) diff |= ax[i] ^ ay[i];
  return diff === 0;
}

function missingEnv(env) {
  return ['ASC_ISSUER_ID', 'ASC_KEY_ID', 'ASC_PRIVATE_KEY', 'ASC_APP_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !env[k]);
}

async function sync(env, trigger) {
  const missing = missingEnv(env);
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
  const max = Number(env.ASC_MAX_SUBREQUESTS) > 0 ? Number(env.ASC_MAX_SUBREQUESTS) : DEFAULT_MAX_SUBREQUESTS;
  const budget = createBudget(max);
  const log = (msg) => console.log(`[asc-sync] ${msg}`);
  const asc = createAscClient({
    issuerId: env.ASC_ISSUER_ID,
    keyId: env.ASC_KEY_ID,
    privateKey: env.ASC_PRIVATE_KEY,
    budget,
    log,
  });
  const db = createSupabaseClient({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, budget });
  const summary = await runSync({
    asc,
    db,
    appId: env.ASC_APP_ID,
    includeSnapshot: env.ASC_INCLUDE_SNAPSHOT === '1' || env.ASC_INCLUDE_SNAPSHOT === 'true',
    budget,
    log,
  });
  // Log counts only, never analytics values or secrets.
  console.log(`[asc-sync] ${trigger} done`, JSON.stringify({
    ok: summary.ok,
    instancesNew: summary.instancesNew,
    instancesProcessed: summary.instancesProcessed,
    instancesDeferred: summary.instancesDeferred,
    rowsWritten: summary.rowsWritten,
    subrequests: summary.subrequests,
    errors: summary.errors,
    warnings: summary.warnings.slice(0, 10),
    unmapped: summary.unmapped,
  }));
  return summary;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'method not allowed' }, 405);
      return json({ ok: true, service: 'groundapp-asc-sync' });
    }
    if (url.pathname === '/run') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
      if (!env.SYNC_TOKEN) return json({ error: 'manual runs are disabled (SYNC_TOKEN is not set)' }, 503);
      const auth = request.headers.get('authorization') || '';
      const provided = request.headers.get('x-sync-token') || (auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '');
      if (!(await safeEqual(provided, env.SYNC_TOKEN))) return json({ error: 'unauthorized' }, 401);
      try {
        const summary = await sync(env, 'manual');
        const { rows, ...rest } = summary; // never return analytics rows over HTTP
        return json(rest, summary.ok ? 200 : 207);
      } catch (e) {
        console.error('[asc-sync] manual run failed:', e && e.message);
        return json({ ok: false, error: e && e.message }, 500);
      }
    }
    return json({ error: 'not found' }, 404);
  },

  async scheduled(event, env, ctx) {
    try {
      await sync(env, `cron ${event.cron}`);
    } catch (e) {
      console.error('[asc-sync] scheduled run failed:', e && e.message);
      throw e; // surface the failure in the Cron Events log
    }
  },
};
