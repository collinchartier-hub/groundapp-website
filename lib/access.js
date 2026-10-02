// Cloudflare Access check for admin endpoints.
// Access protects groundapp.live/admin at the edge, but preview URLs (<hash>.groundapp.pages.dev)
// are not covered, so every admin endpoint verifies the signed Access JWT itself.
// Config (wrangler.toml [vars]): ACCESS_TEAM_DOMAIN (e.g. groundapp.cloudflareaccess.com),
// ACCESS_AUD (the Access application's audience tag), ADMIN_EMAILS (comma separated).
import { json } from './util.js';

let certCache = { at: 0, keys: null, team: null };

function b64urlToBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function accessKeys(team) {
  if (certCache.keys && certCache.team === team && Date.now() - certCache.at < 3600_000) return certCache.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`certs ${res.status}`);
  const { keys } = await res.json();
  certCache = { at: Date.now(), keys, team };
  return keys;
}

async function verifyJwt(token, env) {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
  if (header.alg !== 'RS256') return null;

  const jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;

  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.exp < now || !aud.includes(env.ACCESS_AUD)) return null;
  if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
  return payload;
}

function cookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

// Returns the admin's email, or a Response to send back (401/403/503).
export async function requireAdmin(request, env) {
  const host = new URL(request.url).hostname;
  if (env.DEV_ADMIN_BYPASS === '1' && (host === '127.0.0.1' || host === 'localhost')) return 'local-dev';

  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return json({ ok: false, error: 'access_not_configured' }, 503);
  const token = request.headers.get('cf-access-jwt-assertion') || cookie(request, 'CF_Authorization');
  if (!token) return json({ ok: false, error: 'unauthorized' }, 401);

  let payload = null;
  try { payload = await verifyJwt(token, env); } catch (err) { console.error('access verify error', err?.message); }
  if (!payload) return json({ ok: false, error: 'unauthorized' }, 401);

  const allowed = String(env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  const email = String(payload.email || '').toLowerCase();
  if (!allowed.includes(email)) return json({ ok: false, error: 'forbidden' }, 403);
  return email;
}
