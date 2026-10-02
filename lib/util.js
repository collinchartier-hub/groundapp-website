// Shared helpers for the Pages Functions (Supabase REST, HMAC tokens, responses).

export const SITE = 'https://groundapp.live';
export const APP_STORE_URL = 'https://apps.apple.com/us/app/groundapp-breathwork/id6760352779';

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function b64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return b64url(new Uint8Array(sig)).slice(0, 32);
}

export async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function unsubscribeUrl(env, email) {
  const e = b64url(new TextEncoder().encode(email));
  const t = await hmac(env.UNSUBSCRIBE_SECRET, `unsubscribe:${email}`);
  return `${SITE}/api/unsubscribe?e=${e}&t=${t}`;
}

// Returns the email if the token is valid, otherwise null.
export async function verifyUnsubscribe(env, e, t) {
  if (!e || !t) return null;
  let email;
  try { email = fromB64url(e); } catch { return null; }
  const expected = await hmac(env.UNSUBSCRIBE_SECRET, `unsubscribe:${email}`);
  if (expected.length !== t.length) return null;
  let diff = 0;
  for (let i = 0; i < t.length; i++) diff |= expected.charCodeAt(i) ^ t.charCodeAt(i);
  return diff === 0 ? email : null;
}

export async function supabase(env, path, { method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
  };
  if (prefer) headers.prefer = prefer;
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}
