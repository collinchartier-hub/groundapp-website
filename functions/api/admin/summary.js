// GET /api/admin/summary?days=30
// Everything the admin dashboard shows, in one call: email list + App Store taps + Apple numbers
// (Supabase), website traffic (Cloudflare Web Analytics), and the live App Store rating.
import { json, supabase } from '../../../lib/util.js';
import { requireAdmin } from '../../../lib/access.js';

const TRAFFIC_QUERY = `query($acc:String!,$host:String!,$from:Date!,$to:Date!){viewer{accounts(filter:{accountTag:$acc}){
  daily:rumPageloadEventsAdaptiveGroups(limit:400,filter:{requestHost:$host,date_geq:$from,date_leq:$to},orderBy:[date_ASC]){count sum{visits} dimensions{date}}
  paths:rumPageloadEventsAdaptiveGroups(limit:10,filter:{requestHost:$host,date_geq:$from,date_leq:$to},orderBy:[count_DESC]){count dimensions{requestPath}}
  refs:rumPageloadEventsAdaptiveGroups(limit:10,filter:{requestHost:$host,date_geq:$from,date_leq:$to},orderBy:[sum_visits_DESC]){sum{visits} dimensions{refererHost}}
  devices:rumPageloadEventsAdaptiveGroups(limit:5,filter:{requestHost:$host,date_geq:$from,date_leq:$to},orderBy:[sum_visits_DESC]){sum{visits} dimensions{deviceType}}
}}}`;

async function traffic(env, days) {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return { configured: false };
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - (days - 1) * 86400_000).toISOString().slice(0, 10);
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: TRAFFIC_QUERY, variables: { acc: env.CF_ACCOUNT_ID, host: env.SITE_HOST || 'groundapp.live', from, to } }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.errors?.length) {
    console.error('traffic query failed', res.status, JSON.stringify(j.errors || '').slice(0, 300));
    return { configured: true, error: 'query_failed' };
  }
  const a = j.data.viewer.accounts[0] || {};
  return {
    configured: true,
    daily: (a.daily || []).map((r) => ({ date: r.dimensions.date, visits: r.sum.visits, pageviews: r.count })),
    paths: (a.paths || []).map((r) => ({ path: r.dimensions.requestPath, pageviews: r.count })),
    referrers: (a.refs || []).map((r) => ({ host: r.dimensions.refererHost || '(direct or app)', visits: r.sum.visits })),
    devices: (a.devices || []).map((r) => ({ device: r.dimensions.deviceType, visits: r.sum.visits })),
  };
}

async function store() {
  try {
    const res = await fetch('https://itunes.apple.com/lookup?id=6760352779&country=us', { cf: { cacheTtl: 3600 } });
    const r = (await res.json()).results?.[0];
    if (!r) return null;
    return { rating: r.averageUserRating, ratings: r.userRatingCount, version: r.version, released: r.currentVersionReleaseDate };
  } catch { return null; }
}

export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const days = Math.min(365, Math.max(7, parseInt(new URL(request.url).searchParams.get('days'), 10) || 30));
  try {
    const [db, web, app] = await Promise.all([
      supabase(env, 'rpc/groundapp_admin_summary', { method: 'POST', body: { days } }),
      traffic(env, days).catch((err) => { console.error('traffic error', err?.message); return { configured: true, error: 'query_failed' }; }),
      store(),
    ]);
    if (!db.ok) throw new Error(`summary rpc ${db.status}`);
    return json({ ok: true, admin, days, generated_at: new Date().toISOString(), ...db.data, traffic: web, store: app });
  } catch (err) {
    console.error('admin summary error', err?.message || err);
    return json({ ok: false, error: 'server' }, 500);
  }
}
