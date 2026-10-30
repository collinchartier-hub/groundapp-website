/* GroundApp landing page behaviour (site v3). Motion budget and phone cut: DESIGN.md.
   Bodie is ONE canvas (#bodie, /js/bodie-v3.js). He sits in a [data-slot] box in the layout; when another slot comes
   into view he moves there (desktop: flies with --ease-in-out; phone: fades in) and reacts (data-react). Clips play
   muted while in view; a refused play() means Low Power Mode, so Bodie goes still and every clip keeps its still.
   Bump the filename (v6) when editing: Cloudflare caches .js at the edge for 7 days. */
import { mountBodie } from '/js/bodie-v3.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const mqDesk = matchMedia('(min-width: 861px)');
const MARK = { inhale: '\uE010', hold: '\uE011', exhale: '\uE012', hold2: '\uE011' };
const WORD = { inhale: 'Breathe in', hold: 'Hold', exhale: 'Breathe out', hold2: 'Hold' };
const PATTERNS = {
  resonance: { inhale: 6, hold: 0, exhale: 6, hold2: 0 },
  box: { inhale: 4, hold: 4, exhale: 4, hold2: 4 },
  478: { inhale: 4, hold: 7, exhale: 8, hold2: 0 },
  sigh: { inhale: 3, hold: 0, exhale: 6, hold2: 0, sip: 1 },
};
let lowPower = false;
const still = () => mqReduce.matches || lowPower;

/* ---------- Bodie ---------- */
const canvas = $('#bodie');
let bodie = null, readout = null, readKey = '', libPattern = 'resonance';
try {
  bodie = mountBodie(canvas, { pattern: PATTERNS.resonance, interactive: true, asleep: !mqReduce.matches, onPhase });
  if (mqReduce.matches) bodie.setStill(true, { glow: false });
} catch { bodie = null; }
if (canvas.dataset.webgl === 'off') bodie = null;

function onPhase(phase, remaining) {
  if (!readout || still()) return;
  const n = remaining > 0.05 ? Math.ceil(remaining) : '';
  const key = phase + n;
  if (key === readKey) return;
  readKey = key;
  readout.removeAttribute('data-idle');
  readout.querySelector('.mark').textContent = MARK[phase];
  readout.querySelector('.word').textContent = WORD[phase];
  readout.querySelector('.count').textContent = n;
}
// Reduced motion or Low Power: the readout shows the whole pattern instead of a live count.
function staticReadout(el, p) {
  if (!el) return;
  el.removeAttribute('data-idle');
  const parts = [['inhale', p.inhale], ['hold', p.hold], ['exhale', p.exhale], ['hold2', p.hold2]].filter(([, s]) => s > 0);
  el.querySelector('.word').textContent = parts.map(([ph, s]) => `${MARK[ph]}\u2009${s}`).join('\u2003');
  el.querySelector('.mark').textContent = '';
  el.querySelector('.count').textContent = '';
}
function setReadout(slot) {
  if (readout) readout.setAttribute('data-idle', '');
  readout = slot.dataset.readout ? document.getElementById(slot.dataset.readout) : null;
  readKey = '';
  if (readout && still()) staticReadout(readout, slot.dataset.slot === 'library' ? PATTERNS[libPattern] : PATTERNS.resonance);
}

if (bodie) {
  const live = () => {
    root.classList.add('bodie-live');
    if (!mqReduce.matches) setTimeout(() => bodie.react('wake'), 250);
  };
  if (canvas.classList.contains('is-live')) live();
  else new MutationObserver((l, o) => { if (canvas.classList.contains('is-live')) { o.disconnect(); live(); } })
    .observe(canvas, { attributes: true, attributeFilter: ['class'] });
  setReadout(canvas.parentElement);
}

// Move the canvas into a slot. Desktop flies it there from where it was on screen (clamped, so a slot far away
// arrives from just off the edge); phones fade it in. Reduced motion: no travel.
function moveTo(slot) {
  if (!bodie || canvas.parentElement === slot) return;
  const from = canvas.getBoundingClientRect();
  const leaving = canvas.parentElement.dataset.slot;
  slot.append(canvas);
  setReadout(slot);
  if (leaving === 'library') bodie.setPattern(PATTERNS.resonance);
  if (slot.dataset.slot === 'library') bodie.setPattern(PATTERNS[libPattern]);
  let delay = 300;
  if (!mqReduce.matches) {
    const to = canvas.getBoundingClientRect();
    if (mqDesk.matches && from.width && to.width) {
      const lim = innerHeight * 0.65;
      const dx = from.left - to.left, dy = Math.max(-lim, Math.min(lim, from.top - to.top)), s = from.width / to.width;
      canvas.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.5 }, { transform: 'none', opacity: 1 }],
        { duration: 900, easing: 'cubic-bezier(0.76, 0, 0.24, 1)' });
      delay = 850;
    } else {
      canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease' });
    }
  }
  const react = slot.dataset.react;
  if (react && !still()) setTimeout(() => { if (canvas.parentElement === slot) bodie.react(react, { dir: slot.dataset.dir }); }, delay);
}
if (bodie) {
  const slotIO = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) moveTo(e.target);
  }, { rootMargin: '-8% 0px -8% 0px', threshold: 0.6 });
  $$('[data-slot]').forEach((s) => slotIO.observe(s));
}

/* ---------- Library: tap a technique, Bodie breathes it ---------- */
const libSlot = $('[data-slot="library"]');
$$('[data-pattern]').forEach((btn) => btn.addEventListener('click', () => {
  libPattern = btn.dataset.pattern;
  $$('[data-pattern]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  const name = $('#lib-name');
  if (name) name.textContent = btn.dataset.say;
  if (!bodie) return;
  if (canvas.parentElement !== libSlot) moveTo(libSlot);
  else bodie.setPattern(PATTERNS[libPattern]);
  if (still()) staticReadout(readout, PATTERNS[libPattern]);
}));

/* ---------- App recordings: muted loops while in view; the still under each stays when play() is refused ---------- */
const clips = $$('video[data-clip]');
function goStill() {
  if (lowPower) return;
  lowPower = true;
  root.classList.add('low-power');
  clips.forEach((v) => { v.pause(); v.classList.remove('is-playing'); });
  if (bodie) { bodie.setStill(true); if (readout) staticReadout(readout, PATTERNS.resonance); }
}
function playClip(v) {
  if (still()) return;
  const p = v.play();
  if (p) p.catch((err) => { if (err && err.name === 'NotAllowedError') goStill(); });
}
clips.forEach((v) => {
  v.addEventListener('playing', () => { if (!still()) v.classList.add('is-playing'); });
});
const clipIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) playClip(e.target); else e.target.pause();
}), { threshold: 0.3 });
clips.forEach((v) => clipIO.observe(v));
mqReduce.addEventListener('change', (e) => {
  if (!e.matches) return;
  clips.forEach((v) => { v.pause(); v.classList.remove('is-playing'); });
  if (bodie) bodie.setStill(true, { glow: false });
});

/* ---------- Intro film: sound, on tap only ---------- */
const film = $('#intro');
if (film) {
  const frame = film.closest('.film');
  const start = () => {
    frame.classList.add('is-on');
    film.muted = false;
    film.controls = true;
    film.play().catch(() => {});
  };
  film.addEventListener('playing', () => film.classList.add('is-playing'));
  $$('[data-film-play]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.filmPlay === 'jump') frame.scrollIntoView({ block: 'center', behavior: mqReduce.matches ? 'auto' : 'smooth' });
    start();
  }));
}

/* ---------- Play band: the cast peeks into their tiles, once ---------- */
const play = $('#play');
if (play) new IntersectionObserver((es, o) => {
  if (es.some((e) => e.isIntersecting)) { play.classList.add('is-in'); o.disconnect(); }
}, { threshold: 0.25 }).observe(play);

/* ---------- Phone menu ---------- */
const menu = $('#menu'), menuBtn = $('#menuBtn');
function setMenu(open, focusBack) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menuBtn.textContent = open ? 'Close' : 'Menu';
  root.classList.toggle('menu-open', open);
  syncPill();
  if (open) menu.querySelector('a').focus();
  else if (focusBack) menuBtn.focus();
}
menuBtn.addEventListener('click', () => setMenu(menu.hidden, false));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false, true); });
mqDesk.addEventListener('change', (e) => { if (e.matches && !menu.hidden) setMenu(false, false); });

/* ---------- Phone action pill: after the hero, out of the way at Download ---------- */
const pill = $('#pill');
const seen = { hero: true, download: false, foot: false };
// It also steps aside while a headline or quote passes behind it, so it never sits on large text.
const big = new Set();
function syncPill() { if (pill) pill.classList.toggle('is-on', !seen.hero && !seen.download && !seen.foot && !big.size && menu.hidden); }
const pillIO = new IntersectionObserver((es) => {
  es.forEach((e) => { seen[e.target.id] = e.isIntersecting; });
  syncPill();
});
['hero', 'download', 'foot'].forEach((id) => { const el = document.getElementById(id); if (el) pillIO.observe(el); });
let bandIO = null;
function watchBand() {
  if (bandIO) bandIO.disconnect();
  big.clear();
  bandIO = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) big.add(e.target); else big.delete(e.target); });
    syncPill();
  }, { rootMargin: `-${Math.max(0, innerHeight - 110)}px 0px 0px 0px` });
  $$('main h2, main .quote, main .film-line, main .price .data').forEach((el) => bandIO.observe(el));
}
if (pill) { watchBand(); addEventListener('resize', () => { clearTimeout(watchBand.t); watchBand.t = setTimeout(watchBand, 200); }); }

/* ---------- Newsletter: posts to /api/subscribe exactly as the site always has (name, email, source, website, t) ---------- */
const T0 = window.__gaT0 || Date.now();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MSG = {
  invalid_email: "That email doesn't look right. Check it and try again.",
  rate_limited: 'Too many tries in a row. Give it a minute, then try again.',
  timeout: 'That took too long. Check your connection and try again.',
  network: "We couldn't reach the server. Check your connection and try again.",
  server: 'Something went wrong on our end. Please try again.',
};
const OK_NEW = "You're in. Check your inbox for a welcome from Collin.";
const OK_ALREADY = "You're already on the list. Thanks for being here.";
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
async function subscribe(data) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: ctrl.signal });
    const j = await res.json().catch(() => null);
    if (res.ok && j && j.ok === true) return j;
    return { ok: false, error: (j && j.error) || (res.status === 429 ? 'rate_limited' : res.status === 400 ? 'invalid_email' : 'server') };
  } catch (err) {
    return { ok: false, error: err && err.name === 'AbortError' ? 'timeout' : 'network' };
  } finally { clearTimeout(timer); }
}
const form = $('#nlForm');
if (form) {
  const nameIn = $('#nlName'), emailIn = $('#nlEmail'), hpIn = $('#nlWebsite'), btn = $('#nlBtn');
  const errEl = $('#nlError'), okEl = $('#nlSuccess'), note = $('#nlNote');
  const label = btn.textContent;
  let busy = false;
  const showErr = (m) => { errEl.textContent = m; emailIn.setAttribute('aria-invalid', 'true'); };
  const clearErr = () => { errEl.textContent = ''; emailIn.removeAttribute('aria-invalid'); };
  emailIn.addEventListener('input', () => { if (errEl.textContent) clearErr(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const email = emailIn.value.trim(), name = nameIn.value.trim();
    if (!EMAIL_RE.test(email)) { showErr(MSG.invalid_email); emailIn.focus(); return; }
    clearErr(); busy = true; btn.disabled = true; btn.textContent = 'Joining...';
    const data = { email, source: 'inline', website: hpIn ? hpIn.value : '', t: Date.now() - T0 };
    if (name) data.name = name;
    const j = await subscribe(data);
    busy = false;
    if (j.ok) {
      lsSet('ga-nl', String(Date.now()));
      form.hidden = true; if (note) note.hidden = true;
      okEl.textContent = j.status === 'already' ? OK_ALREADY : OK_NEW;
      okEl.focus({ preventScroll: true });
    } else {
      btn.disabled = false; btn.textContent = label;
      showErr(MSG[j.error] || MSG.server);
    }
  });
}
