/* GroundApp landing page behaviour (site v3). Motion budget and phone cut: DESIGN.md.
   Everything that isn't Bodie runs first and on its own (clips, film, the Library list, the dock, the newsletter), so
   a failed 3D download never breaks them. The menu is /js/site-menu-v1.js. Bodie (/js/bodie-v3.js, three.js from
   jsDelivr) loads last through a caught dynamic import; if it fails his still image stays.
   Bodie is ONE canvas (#bodie). He sits in a [data-slot] box in the layout; when another slot comes into view he moves
   there and reacts (data-react). On desktop he flies when his path stays clear of copy, else he fades out and back in.
   Clips play muted while in view; a refused play() means Low Power Mode, so Bodie goes still and clips keep their still.
   Bump the filename (v6) when editing after a deploy: Cloudflare caches .js at the edge for 7 days. */
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
// Read the setting once and then only from its change event: reading mqReduce.matches every frame (onPhase) makes
// Chrome refresh the cached value before it compares, so the change event never fires.
let reduced = mqReduce.matches;
const still = () => reduced || lowPower;
let bodie = null, readout = null, readKey = '', libPattern = 'resonance';
const canvas = $('#bodie');

/* ---------- Breath readouts: a live count while Bodie breathes; the whole pattern when he holds still ---------- */
function staticReadout(el, p) {
  if (!el) return;
  el.removeAttribute('data-idle');
  const parts = [['inhale', p.inhale], ['hold', p.hold], ['exhale', p.exhale], ['hold2', p.hold2]].filter(([, s]) => s > 0);
  el.querySelector('.word').textContent = parts.map(([ph, s]) => `${MARK[ph]}\u2009${s}`).join('\u2003');
  el.querySelector('.mark').textContent = '';
  el.querySelector('.count').textContent = '';
}
const slotPattern = (slot) => (slot && slot.dataset.slot === 'library' ? PATTERNS[libPattern] : PATTERNS.resonance);
// The readout that belongs to the slot Bodie is in now shows the pattern (still, or no Bodie at all) or waits for
// the next onPhase (live).
function showReadout() {
  readKey = '';
  if (!readout) return;
  if (still() || !bodie) staticReadout(readout, slotPattern(canvas.parentElement));
  else readout.setAttribute('data-idle', '');
}
function setReadout(slot) {
  if (readout) readout.setAttribute('data-idle', '');
  readout = slot.dataset.readout ? document.getElementById(slot.dataset.readout) : null;
  showReadout();
}
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

/* ---------- App recordings: muted loops while in view; the still under each stays when play() is refused ---------- */
const clips = $$('video[data-clip]');
const inView = new Set();
function stopClips() { clips.forEach((v) => { v.pause(); v.classList.remove('is-playing'); }); }
function goStill() {
  if (lowPower) return;
  lowPower = true;
  root.classList.add('low-power');
  stopClips();
  if (bodie) bodie.setStill(true);
  showReadout();
}
function playClip(v) {
  if (still()) return;
  const p = v.play();
  if (p) p.catch((err) => { if (err && err.name === 'NotAllowedError') goStill(); });
}
clips.forEach((v) => v.addEventListener('playing', () => { if (!still()) v.classList.add('is-playing'); }));
const clipIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { inView.add(e.target); playClip(e.target); } else { inView.delete(e.target); e.target.pause(); }
}), { threshold: 0.3 });
clips.forEach((v) => clipIO.observe(v));
// The visitor can switch reduced motion while the page is open: going still swaps the live count for the pattern;
// coming back restores the live count and restarts the clips in view (unless Low Power Mode holds them).
mqReduce.addEventListener('change', (e) => {
  reduced = e.matches;
  if (e.matches) {
    stopClips();
    if (bodie) bodie.setStill(true, { glow: false });
  } else if (!lowPower) {
    if (bodie) bodie.setStill(false);
    inView.forEach(playClip);
  }
  showReadout();
});

/* ---------- Library: tap a technique, Bodie breathes it (the list works without Bodie too) ---------- */
const libSlot = $('[data-slot="library"]');
$$('[data-pattern]').forEach((btn) => btn.addEventListener('click', () => {
  libPattern = btn.dataset.pattern;
  $$('[data-pattern]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  const name = $('#lib-name');
  if (name) name.textContent = btn.dataset.say;
  if (bodie && canvas.parentElement !== libSlot) { moveTo(libSlot); return; }
  if (bodie) bodie.setPattern(PATTERNS[libPattern]);
  if (!bodie || still()) staticReadout($('#read-lib'), PATTERNS[libPattern]);
}));

/* ---------- Intro film: sound, on tap only ---------- */
const film = $('#intro');
if (film) {
  const frame = film.closest('.film');
  film.addEventListener('playing', () => film.classList.add('is-playing'));
  $$('[data-film-play]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.filmPlay === 'jump') frame.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    frame.classList.add('is-on');
    film.muted = false;
    film.controls = true;
    film.play().catch(() => {});
  }));
}

/* ---------- Play band: the cast peeks into their tiles, once ---------- */
const play = $('#play');
if (play) new IntersectionObserver((es, o) => {
  if (es.some((e) => e.isIntersecting)) { play.classList.add('is-in'); o.disconnect(); }
}, { threshold: 0.25 }).observe(play);

/* ---------- Phone dock: after the hero; away at Download, the footer and the open menu ---------- */
// It also slides away while anything that must stay readable is in the bottom 120px: Bodie and his readout, safety
// lines, the technique list, the plans, headlines and quotes. Copy otherwise scrolls under its opaque top edge.
const dock = $('#dock');
const menu = $('#menu');
const seen = { hero: true, download: false, foot: false };
const under = new Set();
function syncDock() { if (dock) dock.classList.toggle('is-on', !seen.hero && !seen.download && !seen.foot && !under.size && (!menu || menu.hidden)); }
document.addEventListener('menu:toggle', syncDock);
const zoneIO = new IntersectionObserver((es) => {
  es.forEach((e) => { seen[e.target.id] = e.isIntersecting; });
  syncDock();
});
['hero', 'download', 'foot'].forEach((id) => { const el = document.getElementById(id); if (el) zoneIO.observe(el); });
const KEEP_CLEAR = '[data-slot], .readout, .lib-name, .safety, .mode-safe, .techs, .plan, main h2, main .h3, main .quote, main .film-line';
let bandIO = null;
function watchBand() {
  if (bandIO) bandIO.disconnect();
  under.clear();
  bandIO = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) under.add(e.target); else under.delete(e.target); });
    syncDock();
  }, { rootMargin: `-${Math.max(0, innerHeight - 120)}px 0px 0px 0px` });
  $$(KEEP_CLEAR).forEach((el) => bandIO.observe(el));
}
if (dock) { watchBand(); addEventListener('resize', () => { clearTimeout(watchBand.t); watchBand.t = setTimeout(watchBand, 200); }); }

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

/* ---------- Bodie: loaded last, so nothing above waits on three.js ---------- */
// Desktop flight: true when Bodie's box, flown in a straight line from `from` to `to` (scaling as it goes), would pass
// over copy or a button. Then he fades out where he was and fades in at the new slot instead.
const COPY = 'main :is(h1, h2, h3, p, li, dt, dd, blockquote, figcaption, .btn, .tech)';
function crossesCopy(from, to) {
  const boxes = $$(COPY).filter((el) => !el.closest('[data-slot]') && !el.contains(canvas)).map((el) => el.getBoundingClientRect())
    .filter((r) => r.width && r.height && r.bottom > 0 && r.top < innerHeight);
  const ins = (r, k) => ({ l: r.left + r.width * k, r: r.right - r.width * k, t: r.top + r.height * k, b: r.bottom - r.height * k });
  for (let i = 1; i < 12; i++) {
    const t = i / 12, lerp = (a, b) => a + (b - a) * t;
    const r = ins({ left: lerp(from.left, to.left), right: lerp(from.right, to.right), top: lerp(from.top, to.top), bottom: lerp(from.bottom, to.bottom),
      width: lerp(from.width, to.width), height: lerp(from.height, to.height) }, 0.2); // Bodie fills about the middle 60% of his box
    if (boxes.some((c) => c.left < r.r && c.right > r.l && c.top < r.b && c.bottom > r.t)) return true;
  }
  return false;
}
let moveSeq = 0;
function moveTo(slot) {
  if (!bodie || canvas.parentElement === slot) return;
  const seq = ++moveSeq;
  const from = canvas.getBoundingClientRect(), to = slot.getBoundingClientRect();
  const land = (delay) => {
    if (seq !== moveSeq) return;
    const leaving = canvas.parentElement.dataset.slot;
    slot.append(canvas);
    setReadout(slot);
    if (leaving === 'library') bodie.setPattern(PATTERNS.resonance);
    if (slot.dataset.slot === 'library') bodie.setPattern(PATTERNS[libPattern]);
    const react = slot.dataset.react;
    if (react && !still()) setTimeout(() => { if (canvas.parentElement === slot) bodie.react(react, { dir: slot.dataset.dir }); }, delay);
  };
  if (reduced) { land(0); return; }
  const onScreen = from.width && from.bottom > 0 && from.top < innerHeight;
  if (mqDesk.matches && onScreen && to.width && !crossesCopy(from, to)) {
    land(850);
    const dx = from.left - to.left, dy = from.top - to.top, s = from.width / to.width;
    canvas.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.5 }, { transform: 'none', opacity: 1 }],
      { duration: 900, easing: 'cubic-bezier(0.76, 0, 0.24, 1)' });
    return;
  }
  const fadeIn = () => { land(450); canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease' }); };
  if (onScreen) canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease', fill: 'forwards' }).finished
    .then((a) => { fadeIn(); a.cancel(); }, fadeIn);
  else fadeIn();
}

const heroSlot = $('[data-slot="hero"]');
function noBodie() {
  bodie = null;
  canvas.hidden = true; // no live Bodie to press: the still image stays and the canvas leaves the tab order
  readout = null;
  setReadout(heroSlot);
  staticReadout($('#read-lib'), PATTERNS[libPattern]);
}
import('/js/bodie-v3.js').then(({ mountBodie }) => {
  bodie = mountBodie(canvas, { pattern: PATTERNS.resonance, interactive: true, asleep: !reduced, onPhase });
  if (canvas.dataset.webgl === 'off') { bodie.destroy(); noBodie(); return; }
  if (reduced) bodie.setStill(true, { glow: false });
  else if (lowPower) bodie.setStill(true);
  const live = () => {
    root.classList.add('bodie-live');
    if (!still()) setTimeout(() => bodie.react('wake'), 250);
  };
  if (canvas.classList.contains('is-live')) live();
  else new MutationObserver((l, o) => { if (canvas.classList.contains('is-live')) { o.disconnect(); live(); } })
    .observe(canvas, { attributes: true, attributeFilter: ['class'] });
  setReadout(canvas.parentElement);
  const slotIO = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) moveTo(e.target);
  }, { rootMargin: '-8% 0px -8% 0px', threshold: 0.6 });
  $$('[data-slot]').forEach((s) => slotIO.observe(s));
}).catch(noBodie);
