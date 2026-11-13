// Rules for partner code claims (groundapp.live/<partner>). Pure functions, no network.
import { SITE } from './util.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

// Email Collin when the bank reaches exactly these counts.
export const LOW_STOCK = [75, 25, 0];
// A repeat submit resends the member's email at most this often.
export const RESEND_WINDOW_MS = 15 * 60 * 1000;
// The one reminder goes out this long after the claim, unless the link was tapped on an iPhone.
export const NUDGE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

export function cleanPersonName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').replace(/[<>"\u0000-\u001f\u007f]/g, '').trim();
  if (!name || name.length > 60 || /@|https?:/i.test(name)) return null;
  return name;
}

// One key per real inbox: lower case, plus-tag removed, gmail dots removed, googlemail folded into gmail.
export function emailKey(email) {
  const e = String(email).trim().toLowerCase();
  const at = e.lastIndexOf('@');
  let domain = e.slice(at + 1);
  let local = e.slice(0, at).split('+')[0] || e.slice(0, at);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '') || local;
  return `${local}@${domain}`;
}

// Returns { value } or { error: <field name> } for the first bad field.
export function validateClaim(body) {
  const b = body && typeof body === 'object' ? body : {};
  const partner = String(b.partner || '').toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(partner)) return { error: 'partner' };
  const firstName = cleanPersonName(b.first_name);
  if (!firstName) return { error: 'first_name' };
  const lastName = cleanPersonName(b.last_name);
  if (!lastName) return { error: 'last_name' };
  const email = String(b.email || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { error: 'email' };
  if (b.device !== 'iphone' && b.device !== 'android') return { error: 'device' };
  const location = String(b.location || '').trim().slice(0, 60);
  if (!location) return { error: 'location' };
  if (b.member !== true) return { error: 'member' };
  const src = /^[a-z0-9_-]{1,24}$/.test(String(b.src || '')) ? String(b.src) : null;
  return {
    value: { partner, firstName, lastName, email, emailKey: emailKey(email), device: b.device, location, newsletter: b.newsletter === true, src },
  };
}

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = '';
  for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const isToken = (s) => TOKEN_RE.test(String(s || ''));
export const isIosUA = (ua) => /\b(iPhone|iPad|iPod)\b/.test(String(ua || ''));
export const redeemLink = (partner, token) => `${SITE}/${partner}/r/${token}`;
