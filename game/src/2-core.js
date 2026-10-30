<script type="module">
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/+esm";
window.__bodieBoot = true;
const JSM = "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/";
const LUNG = "%%LUNG%%";
const $ = (id) => document.getElementById(id);
const stage = $("stage"), canvas = $("gl"), fx = $("fx");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m ? `${m}:${r.toFixed(1).padStart(4, "0")}` : `${r.toFixed(1)}s`; };

// ---------------------------------------------------------------- profile (this browser only)
// The Hall of Breath runs on the Claude artifact database. Where that is missing (groundapp.live), records stay on this device.
const HAS_HALL = !!(window.claude && window.claude.use);
const KEY = "bodie-run-v3";
const DEF = () => ({
  leaves: 0, unlocked: 1, wins: 0, best: {}, bestTime: {}, last: {}, stars: {},
  up: { lungs: 0, spring: 0, magnet: 0, aura: 0, sigh: 0, charge: 0 }, owned: ["classic"], skin: "classic", acc: [],
  sound: true, voice: true, glow: null,
  deep: { static: { best: null, last: null, hist: [] }, dash: { best: null, last: null, hist: [] } },
  surf: {}, daily: { date: "", best: 0 },
});
function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem("bodie-run-v2");
    const p = JSON.parse(raw);
    if (p && p.up) {
      const d = DEF(), pd = p.deep || {};
      return { ...d, ...p, up: { ...d.up, ...p.up }, best: { ...(p.best || {}) }, bestTime: { ...(p.bestTime || {}) }, last: { ...(p.last || {}) }, stars: { ...(p.stars || {}) },
        owned: p.owned || d.owned, acc: p.acc || [], surf: { ...(p.surf || {}) }, daily: { ...d.daily, ...(p.daily || {}) },
        deep: { static: { ...d.deep.static, ...(pd.static || {}) }, dash: { ...d.deep.dash, ...(pd.dash || {}) } } };
    }
  } catch (e) {}
  return DEF();
}
let profile = loadProfile();
function save() { try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) {} }
function loadGhost(k) { try { const g = JSON.parse(localStorage.getItem("bodie-ghost-" + k)); return g && g.xs ? g : null; } catch (e) { return null; } }
function saveGhost(k, g) { try { localStorage.setItem("bodie-ghost-" + k, JSON.stringify(g)); } catch (e) {} }
const totalStars = () => Object.values(profile.stars).reduce((a, s) => a + (s || []).filter(Boolean).length, 0);

const SKINS = {
  classic: { name: "Classic", desc: "Bone, like in the app.", body: "#e8ddd0", cheek: "#d4a574", cost: 0 },
  clay: { name: "Clay", desc: "Warm terracotta Bodie.", body: "#b98463", cheek: "#e6ab80", cost: 100 },
  golden: { name: "Golden Hour", desc: "Sunset gold all over.", body: "#e3bd88", cheek: "#c98a5e", cost: 160 },
  dusk: { name: "Dusk", desc: "Night-walk Bodie with bright eyes.", body: "#6d5a4f", cheek: "#d4a574", eye: "#f3e6d6", cost: 220 },
  moon: { name: "Moonstone", desc: "Pale and glowing. Needs 9 stars.", body: "#dcd6cf", cheek: "#c4935a", cost: 300, stars: 9 },
};
const ACCS = {
  sprout: { name: "Bodhi Sprout", desc: "A heart-shaped bodhi leaf on top.", cost: 80 },
  scarf: { name: "Amber Scarf", desc: "Flaps when Bodie runs.", cost: 60 },
  halo: { name: "Ring Halo", desc: "Concentric rings of light. Needs 5 stars.", cost: 250, stars: 5 },
};

// ---------------------------------------------------------------- courses: each one teaches a breathwork technique
const COURSES = [
  { key: "hollow", name: "Root Hollow", tech: "Box Breathing", len: 420, kip: .94, seed: 1101,
    f: { pits: .26, rocks: .5, clouds: .36, lake: 0, storms: 0, pads: 0, vents: 0, bubbles: .04 }, refill: 1.7, bpm: 150, key: 0,
    sky: ["#0d0806", "#22150e", "#4a2b1b"], fog: 0x2b1b13, hills: [0x3a2618, 0x2c1d14, 0x22170f], ground: 0x3a2a1e, top: 0x4a3626, trees: "round",
    tip: "Tap to jump rocks and gaps. When the game says HOLD YOUR BREATH, press and keep holding: Bodie walks right through the Worry Cloud. Breathe that smog in and he POPS. Hold 4 seconds for a Box Breath.",
    ch: [{ text: "Beat Kip to the Great Tree", test: (P, r) => r.won }, { text: "Hold your breath through 5 Worry Clouds", test: (P) => P.calm >= 5 }, { text: "Win without a single POP", test: (P, r) => r.won && P.pops === 0 }] },
  { key: "lake", name: "Still Lake", tech: "Breath-hold dives", len: 500, kip: .97, seed: 2202,
    f: { pits: .2, rocks: .36, clouds: .38, lake: .34, storms: 0, pads: 0, vents: 0, bubbles: .08 }, refill: 1.6, bpm: 156, key: 2,
    sky: ["#090a0a", "#18201e", "#3b3a30"], fog: 0x1e2422, hills: [0x2b2c27, 0x23251f, 0x1b1d19], ground: 0x35281d, top: 0x463525, trees: "round",
    tip: "On the lake, holding your breath makes Bodie dive. Stay under to slip below the logs, and grab the seeds down there. A long dive is also a Box Breath.",
    ch: [{ text: "Beat Kip to the Great Tree", test: (P, r) => r.won }, { text: "Dive under 6 logs without a bonk", test: (P) => P.dives >= 6 }, { text: "Land 2 Box Breaths", test: (P) => P.boxes >= 2 }] },
  { key: "swamp", name: "Sigh Swamp", tech: "Physiological Sigh", len: 540, kip: .99, seed: 3303, sigh: true,
    f: { pits: .2, rocks: .34, clouds: .3, lake: .1, storms: .2, pads: 0, vents: 0, bubbles: .06 }, refill: 1.6, bpm: 160, key: 5,
    sky: ["#080907", "#1a1d14", "#3a3524"], fog: 0x1f2117, hills: [0x2c2c20, 0x23241a, 0x1b1c14], ground: 0x342a1c, top: 0x3f3a24, trees: "round",
    tip: "Storm clouds zap you even if you hold your breath. Double tap fast to do a physiological sigh: two quick breaths in, one long breath out. The big exhale blows the storm away. It recharges in a few seconds.",
    ch: [{ text: "Beat Kip to the Great Tree", test: (P, r) => r.won }, { text: "Sigh away 4 storms", test: (P) => P.storms >= 4 }, { text: "Grab 60 Breath Seeds", test: (P) => P.seeds + P.gold * 5 >= 60 }] },
  { key: "peaks", name: "Power Peaks", tech: "Power Breaths", len: 600, kip: 1.01, seed: 4404,
    f: { pits: .26, rocks: .34, clouds: .32, lake: 0, storms: 0, pads: .2, vents: 0, bubbles: .14 }, refill: 1.1, bpm: 166, key: -3, snow: true,
    sky: ["#07060a", "#1c1418", "#47302a"], fog: 0x24191b, hills: [0x3a2c28, 0x2e2320, 0x241b19], ground: 0x3e2e24, top: 0x52402f, trees: "pine",
    tip: "Thin air up here. On a glowing power pad, tap tap tap: every tap is a power breath that charges your lungs past 100%. Then hold through the thin air all the way. Air bubbles top you up.",
    ch: [{ text: "Beat Kip to the Great Tree", test: (P, r) => r.won }, { text: "Charge your lungs to 150%", test: (P) => P.maxCharge >= .5 }, { text: "Cross thin air without a single cough", test: (P) => P.thinCleared >= 1 && P.thinPops === 0 }] },
  { key: "temple", name: "Starfall Temple", tech: "Glide control", len: 640, kip: 1.04, seed: 5505, sigh: true,
    f: { pits: .22, rocks: .32, clouds: .3, lake: .1, storms: .1, pads: .08, vents: .16, bubbles: .08 }, refill: 1.5, bpm: 172, key: 7,
    sky: ["#08060c", "#1d1422", "#4a2d33"], fog: 0x221824, hills: [0x33263a, 0x2a1f2f, 0x211824], ground: 0x3a2c2a, top: 0x4c3a34, trees: "pine",
    tip: "Everything you've learned, plus updrafts. Step on a vent to launch, then hold your breath to glide down through the rhythm rings. Every ring in a row is worth more. Kip is at full caffeine.",
    ch: [{ text: "Beat Kip to the Great Tree", test: (P, r) => r.won }, { text: "Fly through 10 rhythm rings", test: (P) => P.rings >= 10 }, { text: "Win by 20m or more", test: (P, r) => r.won && r.margin >= 20 }] },
];
COURSES.forEach((c, i) => (c.idx = i));
function dayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function dailyCourse() {
  const k = dayKey(), r = mulberry(hashStr(k)), th = COURSES[Math.floor(r() * COURSES.length)];
  const f = { pits: .18 + r() * .1, rocks: .3 + r() * .15, clouds: .26 + r() * .14, lake: r() < .5 ? .12 : 0, storms: r() < .55 ? .14 : 0, pads: r() < .45 ? .1 : 0, vents: r() < .5 ? .1 : 0, bubbles: .08 };
  return { ...th, key: "daily-" + k, idx: -1, daily: true, name: "Daily Dash", len: 480, kip: .99, seed: hashStr(k), f, sigh: f.storms > 0, refill: 1.5, tech: "A bit of everything",
    tip: "Today's course mixes hazards from every course, and it's the same course for everyone today." + (HAS_HALL ? " Check the Hall of Breath to see who's on top." : "") + " Double tap to sigh storms away, and tap fast on power pads.", ch: [] };
}
const SAGE_LINES = ["Slow is smooth. Smooth is fast.", "Your breath is the one thing Kip can't buy.", "Breathe out longer than you breathe in.", "Calm lungs, fast feet.", "The ring you're in is the only ring."];
const KIP_LINES = ["Breathing is for slowpokes!", "Espresso number seven!", "Fast fast fast fast!", "Who needs lungs?!", "Can't stop! Won't stop!", "CAW CAW CAW!", "Decaf is a myth!"];

// ---------------------------------------------------------------- sound: chiptune music, sfx, voice
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
const Sound = (() => {
  let ctx = null, master, comp, music, musicLP, bassLP, sfx, rev, noiseBuf, pulse;
  let level = -1, bpm = 128, key = 0, step = 0, nextT = 0, loopN = 0, holding = false, nextBeat = 0, beatGap = .78, danger = 0, nextDanger = 0, unlocked = false;
  const F = (s) => 293.66 * Math.pow(2, (s + key) / 12);
  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = profile.sound ? .85 : 0; master.connect(ctx.destination);
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(master);
    music = ctx.createGain(); music.gain.value = .5;
    musicLP = ctx.createBiquadFilter(); musicLP.type = "lowpass"; musicLP.frequency.value = 18000; musicLP.Q.value = 1.2;
    music.connect(musicLP); musicLP.connect(comp);
    bassLP = ctx.createBiquadFilter(); bassLP.type = "lowpass"; bassLP.frequency.value = 900; bassLP.connect(music);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(comp);
    rev = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = ir; const rg = ctx.createGain(); rg.gain.value = .22; rev.connect(rg); rg.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const N = 40, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) { re[n] = Math.sin(2 * Math.PI * n * .25) / (n * Math.PI); im[n] = (1 - Math.cos(2 * Math.PI * n * .25)) / (n * Math.PI); }
    pulse = ctx.createPeriodicWave(re, im);
    setInterval(tick, 25);
    return ctx;
  }
  function unlock() {
    init(); if (!ctx) return;
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    if (unlocked) return; unlocked = true;
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    try { const a = new Audio(SILENT_WAV); a.play().catch(() => {}); } catch (e) {}
    try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
  }
  function osc(freq, t, dur, type, vol, dest, o = {}) {
    const n = ctx.createOscillator(), g = ctx.createGain();
    if (type === "pulse") n.setPeriodicWave(pulse); else n.type = type;
    n.frequency.setValueAtTime(freq, t);
    if (o.slide) n.frequency.exponentialRampToValueAtTime(Math.max(30, o.slide), t + (o.slideT || dur));
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibAmt || 12; l.connect(lg); lg.connect(n.frequency); l.start(t); l.stop(t + dur + .05); }
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.a || .004));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    n.connect(g); g.connect(dest || sfx); if (o.rev) g.connect(rev);
    n.start(t); n.stop(t + dur + .05);
  }
  function nz(t, dur, vol, ftype, freq, q, dest, sweep) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur); f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfx); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  // I - V - vi - IV with a bouncy "doo-doo-doo" lead in major pentatonic.
  const PROG = [{ r: -24, t: [0, 4, 7] }, { r: -29, t: [7, 11, 14] }, { r: -27, t: [9, 12, 16] }, { r: -31, t: [5, 9, 12] }];
  const MEL = [[0,12,2],[2,12,1],[3,12,1],[4,14,2],[6,16,2],[8,19,3],[11,16,1],[12,14,2],[14,12,2],
    [16,9,2],[18,9,1],[19,9,1],[20,12,2],[22,14,2],[24,16,4],[28,14,2],[30,12,2],
    [32,9,2],[34,12,2],[36,14,2],[38,9,2],[40,16,3],[43,14,1],[44,12,2],[46,9,2],
    [48,7,2],[50,7,1],[51,7,1],[52,9,2],[54,12,2],[56,14,4],[60,16,1],[61,14,1],[62,12,1],[63,9,1]];
  const MEL2 = MEL.map(([s, n, l]) => [s, n + ([0, 2, 0, -3][Math.floor(s / 16)] || 0) + (s % 8 === 4 ? 2 : 0), l]);
  const melAt = [{}, {}]; MEL.forEach((m) => (melAt[0][m[0]] = m)); MEL2.forEach((m) => (melAt[1][m[0]] = m));
  const BASS = [0, null, 12, 0, null, 12, 0, 12, 0, null, 12, 0, null, 12, 7, 12];
  function kick(t, v = 1) { const n = ctx.createOscillator(), g = ctx.createGain(); n.frequency.setValueAtTime(160, t); n.frequency.exponentialRampToValueAtTime(42, t + .12); g.gain.setValueAtTime(.95 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .24); n.connect(g); g.connect(music); n.start(t); n.stop(t + .26); }
  function snare(t) { nz(t, .15, .32, "bandpass", 1900, .8, music); osc(200, t, .08, "triangle", .2, music); }
  function hat(t, v, open) { nz(t, open ? .1 : .035, v, "highpass", 7800, .6, music); }
  function playStep(s, t) {
    if (level < 0) return;
    const bar = Math.floor(s / 16), st = s % 16, ch = PROG[bar], spb = 60 / bpm / 4;
    if (level === 3) { // ambient: pads and a slow bell, for the deep and for Breath Surf
      if (st === 0) { ch.t.forEach((n) => osc(F(n), t, spb * 18, "triangle", .03, music, { a: .7 })); osc(F(ch.r + 12), t, spb * 18, "sine", .06, bassLP, { a: .5 }); }
      if (st % 4 === 0) osc(F(ch.t[(st / 4) % 3] + 24), t, spb * 4, "sine", .022, music, { rev: true });
      return;
    }
    if (level >= 1) { if (st % 4 === 0) kick(t); if (st === 4 || st === 12) snare(t); if (st % 2 === 0) hat(t, .06); if (st % 4 === 2) hat(t, .1, true); }
    else { if (st === 0 || st === 8) kick(t, .55); if (st % 4 === 2) hat(t, .05); }
    const b = BASS[st]; if (b !== null) osc(F(ch.r + b), t, spb * 1.5, "square", .11, bassLP);
    const tri = ch.t, an = [tri[0], tri[1], tri[2], tri[1] + 12][st % 4] + (st >= 8 ? 12 : 0);
    if (level >= 1 || st % 2 === 0) osc(F(an), t, spb * .9, "triangle", level === 2 ? .07 : .035, music);
    const m = melAt[loopN % 2][s];
    if ((level >= 1 || loopN % 2 === 1) && m) osc(F(m[1] + (level === 2 ? 12 : 0)), t, spb * m[2] * .95, "pulse", level >= 1 ? .085 : .05, music, { vib: 6, vibAmt: 4 });
    if (level === 2 && st % 2 === 1) osc(F(tri[2] + 24), t, spb * .6, "pulse", .03, music);
  }
  function tick() {
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    if (nextT < now) nextT = now + .05;
    while (nextT < now + .12) { playStep(step, nextT); nextT += 60 / bpm / 4; step = (step + 1) % 64; if (step === 0) loopN++; }
    if (holding && now >= nextBeat) { const t = Math.max(now, nextBeat); osc(58, t, .18, "sine", .7, sfx, { slide: 40 }); osc(52, t + .17, .16, "sine", .5, sfx, { slide: 38 }); nextBeat = t + (danger ? .5 : beatGap); }
    if (danger && now >= nextDanger) { osc(1480, now + .01, .07, "square", .05, sfx); nextDanger = now + (danger > 1 ? .14 : .26); }
  }
  return {
    unlock,
    music(l, b, k) { if (!init()) return; if (b) bpm = b; if (k !== undefined) key = k; level = l; },
    hold(on, gap) { if (!ctx) return; holding = on; beatGap = gap || .78; musicLP.frequency.cancelScheduledValues(ctx.currentTime); musicLP.frequency.setTargetAtTime(on ? 480 : 18000, ctx.currentTime, on ? .05 : .18); if (on) nextBeat = ctx.currentTime + .05; },
    heart(gap) { beatGap = gap; },
    danger(l) { danger = l; },
    setEnabled(on) { if (master) master.gain.setTargetAtTime(on ? .85 : 0, ctx.currentTime, .05); },
    play(name, a) {
      if (!ctx || ctx.state !== "running") return; const t = ctx.currentTime + .005;
      switch (name) {
        case "jump": osc(392, t, .14, "square", .07, sfx, { slide: 880, slideT: .1 }); nz(t, .18, .08, "bandpass", 500, 1.2, sfx, 1800); break;
        case "land": osc(140, t, .08, "sine", .25, sfx, { slide: 70 }); break;
        case "seed": { const sc = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; const n = sc[Math.min(sc.length - 1, a || 0)]; osc(F(n + 24), t, .12, "square", .06, sfx); osc(F(n + 31), t + .05, .16, "triangle", .06, sfx, { rev: true }); break; }
        case "gold": [0, 4, 7, 12, 16].forEach((n, i) => osc(F(n + 24), t + i * .05, .2, "square", .06, sfx, { rev: true })); break;
        case "inhale": nz(t, .35, .12, "bandpass", 450, 1.4, sfx, 1700); break;
        case "exhale": nz(t, .55, .14, "bandpass", 1500, 1.2, sfx, 260); break;
        case "calm": osc(F(24), t, .25, "triangle", .07, sfx, { rev: true }); osc(F(31), t + .08, .3, "triangle", .06, sfx, { rev: true }); break;
        case "smog": nz(t, .4, .18, "lowpass", 400, 1, sfx, 2400); osc(220, t, .45, "sawtooth", .05, sfx, { slide: 660, vib: 14, vibAmt: 25 }); break;
        case "pop": nz(t, .25, .5, "lowpass", 3000, .7, sfx, 300); osc(900, t, .08, "square", .15, sfx, { slide: 120 }); osc(70, t, .3, "sine", .5, sfx, { slide: 40 }); break;
        case "pfft": nz(t, .8, .35, "bandpass", 1200, .9, sfx, 180); osc(95, t, .7, "sawtooth", .12, sfx, { vib: 28, vibAmt: 30, slide: 60 }); break;
        case "cough": nz(t, .12, .3, "lowpass", 1000, 1, sfx); nz(t + .16, .1, .24, "lowpass", 900, 1, sfx); break;
        case "bonk": osc(180, t, .16, "square", .12, sfx, { slide: 70 }); nz(t, .06, .3, "lowpass", 1500, 1, sfx); break;
        case "splash": nz(t, .5, .3, "lowpass", 2400, .7, sfx, 400); break;
        case "bubble": osc(500, t, .1, "sine", .14, sfx, { slide: 1500 }); osc(800, t + .06, .1, "sine", .1, sfx, { slide: 2000 }); break;
        case "caw": [0, .17].forEach((d) => { osc(980, t + d, .14, "sawtooth", .06, sfx, { slide: 520 }); nz(t + d, .12, .06, "bandpass", 1300, 4, sfx); }); break;
        case "box": [0, 7, 12, 16, 19, 24].forEach((n, i) => osc(F(n + 12), t + i * .06, .5, "triangle", .07, sfx, { rev: true })); osc(F(36), t + .35, .6, "pulse", .04, sfx, { rev: true }); break;
        case "clutch": osc(F(19), t, .1, "square", .07, sfx); osc(F(24), t + .08, .18, "square", .07, sfx); break;
        case "alarm": osc(1320, t, .09, "square", .07, sfx); osc(1320, t + .13, .09, "square", .07, sfx); break;
        case "beep": osc(660, t, .14, "square", .08, sfx); break;
        case "go": [12, 16, 19, 24].forEach((n) => osc(F(n), t, .4, "square", .05, sfx)); break;
        case "win": [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((n, i) => osc(F(n + 12), t + i * .09, .3, "pulse", .08, sfx, { rev: true })); [12, 16, 19].forEach((n) => osc(F(n), t + .85, 1.2, "triangle", .07, sfx, { rev: true })); break;
        case "lose": [12, 11, 9, 7, 4, 0].forEach((n, i) => osc(F(n), t + i * .16, .3, "square", .06, sfx, { vib: 5, vibAmt: 10 })); break;
        case "buy": osc(F(24), t, .08, "square", .06, sfx); osc(F(31), t + .07, .18, "square", .06, sfx, { rev: true }); break;
        case "click": osc(880, t, .04, "square", .03, sfx); break;
        case "flow": osc(F(12), t, .4, "sawtooth", .04, sfx, { slide: F(36) }); break;
        case "sigh": nz(t, .22, .16, "bandpass", 500, 1.4, sfx, 1500); nz(t + .28, .15, .14, "bandpass", 700, 1.4, sfx, 1900); nz(t + .5, 1.1, .24, "bandpass", 1600, 1, sfx, 220); break;
        case "zap": osc(1800, t, .12, "sawtooth", .09, sfx, { slide: 200 }); nz(t, .2, .4, "highpass", 2000, .7, sfx); osc(60, t, .3, "sine", .45, sfx, { slide: 35 }); break;
        case "charge": osc(F(12 + Math.min(24, (a || 0) * 2)), t, .09, "square", .065, sfx); break;
        case "ring": osc(F(19 + Math.min(12, (a || 0) * 2)), t, .3, "triangle", .08, sfx, { rev: true }); osc(F(26 + Math.min(12, (a || 0) * 2)), t + .06, .35, "sine", .05, sfx, { rev: true }); break;
        case "vent": nz(t, .7, .3, "bandpass", 300, 1, sfx, 2400); osc(200, t, .5, "sine", .15, sfx, { slide: 800 }); break;
        case "record": [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => osc(F(n + 12), t + i * .07, .45, "pulse", .07, sfx, { rev: true })); break;
        case "soft": osc(F(a ?? 12), t, .9, "sine", .07, sfx, { rev: true, a: .05 }); break;
        case "surface": nz(t, .4, .3, "lowpass", 2000, .7, sfx, 400); nz(t + .25, 1.3, .24, "bandpass", 1400, 1, sfx, 240); break;
        case "stroke": nz(t, .18, .12, "lowpass", 900, 1, sfx, 260); osc(300, t, .1, "sine", .05, sfx, { slide: 500 }); break;
        case "orb": osc(F(24 + (a || 0)), t, .14, "sine", .05, sfx, { rev: true }); break;
      }
    },
  };
})();
const Voice = {
  last: 0, voice: null,
  pick() { try { const vs = speechSynthesis.getVoices(); this.voice = vs.find((v) => /en[-_]US/i.test(v.lang) && /Samantha|Google|Aria|Jenny|Zira/i.test(v.name)) || vs.find((v) => /^en/i.test(v.lang)) || null; } catch (e) {} },
  say(text, force, calm) {
    if (!text || !profile.voice || !profile.sound) return;
    const s = window.speechSynthesis; if (!s || typeof SpeechSynthesisUtterance === "undefined") return;
    const now = performance.now(); if (!force && now - this.last < 1400) return; this.last = now;
    try { if (!this.voice) this.pick(); s.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = calm ? .95 : 1.2; u.pitch = calm ? 1.05 : 1.35; u.volume = 1; if (this.voice) u.voice = this.voice; s.speak(u); } catch (e) {}
  },
};
try { speechSynthesis.onvoiceschanged = () => Voice.pick(); } catch (e) {}

// ---------------------------------------------------------------- renderer + zones
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); } catch (e) { renderer = null; }
if (!renderer) { $("ov-title").hidden = true; $("ov-nogl").hidden = false; throw new Error("WebGL unavailable"); }
let pixelRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75);
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 16 / 9, .1, 500);
const TANH = Math.tan(THREE.MathUtils.degToRad(15));
scene.add(new THREE.HemisphereLight(0xffe2c0, 0x2a1b14, .55));
const key = new THREE.DirectionalLight(0xffe4c4, 1.6); scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xd4a574, 1.3); scene.add(rim, rim.target);
let mergeVertices = null, composer = null, bloomPass = null, glowOn = profile.glow === null ? !coarse : !!profile.glow;
let vw = 1, vh = 1, aspect = 16 / 9;
// The three bands: hud (top), cue (instructions only), action (everything that moves). Labels stay in the action band.
let LAY = { hud: 92, cue: 96, actTop: 192, actBot: 600 };
function layoutZones() {
  const cs = getComputedStyle(stage), hud = parseFloat(cs.getPropertyValue("--hud-h")) || 92, cue = parseFloat(cs.getPropertyValue("--cue-h")) || 96;
  LAY = { hud, cue, actTop: hud + 4 + cue, actBot: vh - 54 };
}
function resize() {
  const r = stage.getBoundingClientRect(); vw = Math.max(1, r.width); vh = Math.max(1, r.height); aspect = vw / vh;
  renderer.setPixelRatio(pixelRatio); renderer.setSize(vw, vh, false);
  camera.aspect = aspect; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(pixelRatio); composer.setSize(vw, vh); }
  const sc = vh * pixelRatio / (2 * TANH);
  PART.forEach((p) => (p.mat.uniforms.uScale.value = sc)); fireflies.material.uniforms.uScale.value = sc;
  layoutZones();
}
// Where on screen the hero should sit: inside the action band, a bit below its middle.
function heroScreenY(f = .6) { return LAY.actTop + (LAY.actBot - LAY.actTop) * f; }
function lookOffsetY(dist, f) { return (heroScreenY(f) - vh / 2) * (2 * dist * TANH / vh); }

// ---------------------------------------------------------------- shared textures, geometry, materials
function canvasTex(size, draw, srgb = true, h) { const c = document.createElement("canvas"); c.width = size; c.height = h || size; draw(c.getContext("2d"), size, h || size); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
const TEX = {
  glow: canvasTex(128, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.35, "rgba(255,255,255,.4)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, s, s); }),
  shadow: canvasTex(64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, "rgba(0,0,0,.75)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, s, s); }),
  rings: canvasTex(256, (g, s) => { for (let i = 6; i >= 1; i--) { g.strokeStyle = `rgba(255,255,255,${.15 + .12 * (6 - i) / 6})`; g.lineWidth = 3; g.beginPath(); g.arc(s / 2, s / 2, i * 20, 0, 7); g.stroke(); } }),
  ray: canvasTex(32, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, "rgba(255,255,255,.9)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); const x = g.createLinearGradient(0, 0, w, 0); x.addColorStop(0, "rgba(0,0,0,1)"); x.addColorStop(.5, "rgba(0,0,0,0)"); x.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = x; g.fillRect(0, 0, w, h); }, true, 256),
  roots: canvasTex(256, (g, s) => {
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineCap = "round";
    for (let i = 0; i < 5; i++) { const x = 20 + i * 50 + Math.random() * 20; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 0); let cx = x, cy = 0; for (let k = 0; k < 6; k++) { const nx = cx + (Math.random() - .5) * 40, ny = cy + 30 + Math.random() * 20; g.quadraticCurveTo(cx + (Math.random() - .5) * 30, (cy + ny) / 2, nx, ny); if (Math.random() < .5) { g.moveTo(nx, ny); g.lineTo(nx + (Math.random() - .5) * 50, ny + 25); g.moveTo(nx, ny); } cx = nx; cy = ny; g.lineWidth = Math.max(1, 3 - k * .4); } g.stroke(); }
  }),
};
TEX.roots.wrapS = THREE.RepeatWrapping;
function skyTexture(c) { return canvasTex(256, (g, s) => { const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, c[0]); gr.addColorStop(.55, c[1]); gr.addColorStop(1, c[2]); g.fillStyle = gr; g.fillRect(0, 0, s, s); }); }
function textSprite(text, color = "#E8DDD0", size = .9) {
  const c = document.createElement("canvas"), g = c.getContext("2d"), fs = 56, font = `700 ${fs}px "Source Code Pro", ui-monospace, monospace`;
  g.font = font; const w = Math.ceil(g.measureText(text).width) + 44; c.width = w; c.height = fs + 32;
  g.font = font; g.fillStyle = "rgba(26,17,14,.78)"; if (g.roundRect) { g.beginPath(); g.roundRect(0, 0, w, c.height, 22); g.fill(); } else g.fillRect(0, 0, w, c.height);
  g.fillStyle = color; g.textBaseline = "middle"; g.fillText(text, 22, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(size * w / c.height, size, 1); s.userData.own = [s.material]; return s;
}
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1), sphere: new THREE.SphereGeometry(1, 20, 14),
  seed: new THREE.SphereGeometry(.15, 16, 12), rock: new THREE.IcosahedronGeometry(1, 0), log: new THREE.CylinderGeometry(.32, .32, 1, 16),
  tuft: new THREE.ConeGeometry(.08, .35, 5), ring: new THREE.TorusGeometry(.72, .07, 10, 40), cone: new THREE.ConeGeometry(1, 1, 8), leaf: null,
};
{ const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(-.5, .15, -.62, .74, -.32, .98); s.bezierCurveTo(-.15, 1.1, 0, 1.0, 0, .9); s.bezierCurveTo(0, 1.0, .15, 1.1, .32, .98); s.bezierCurveTo(.62, .74, .5, .15, 0, 0); GEO.leaf = new THREE.ShapeGeometry(s, 6); GEO.leaf.translate(0, -.5, 0); }
const SHARED_GEO = new Set(Object.values(GEO));
const M = {
  groundSide: new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 }),
  groundTop: new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 }),
  edge: new THREE.MeshStandardMaterial({ color: 0xc4935a, emissive: 0xc4935a, emissiveIntensity: .9, roughness: .5 }),
  roots: new THREE.MeshBasicMaterial({ color: 0xc4935a, transparent: true, opacity: .22, depthWrite: false }),
  tuft: new THREE.MeshStandardMaterial({ color: 0x6b6a40, roughness: 1 }),
  bed: new THREE.MeshStandardMaterial({ color: 0x1f1611, roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: 0x2b4844, transparent: true, opacity: .6, roughness: .12, metalness: .1, depthWrite: false }),
  waterTop: new THREE.MeshStandardMaterial({ color: 0x6f918a, emissive: 0x2c4440, emissiveIntensity: .5, transparent: true, opacity: .45, roughness: .05, depthWrite: false, side: THREE.DoubleSide }),
  rock: new THREE.MeshStandardMaterial({ color: 0x5f4a3a, roughness: .95, flatShading: true }),
  logSide: new THREE.MeshStandardMaterial({ color: 0x5e4330, roughness: .9 }),
  logCap: new THREE.MeshStandardMaterial({ color: 0x9a7552, roughness: .8 }),
  seed: new THREE.MeshStandardMaterial({ color: 0xd4a574, emissive: 0xd4a574, emissiveIntensity: 1.5, roughness: .3, metalness: .2 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xf3d7a8, emissive: 0xf3d7a8, emissiveIntensity: 2.6, roughness: .2, metalness: .3 }),
  seedHalo: new THREE.SpriteMaterial({ map: TEX.glow, color: 0xd4a574, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }),
  goldHalo: new THREE.SpriteMaterial({ map: TEX.glow, color: 0xf3d7a8, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }),
  bubble: new THREE.MeshStandardMaterial({ color: 0xd6e8e3, emissive: 0x5f857e, emissiveIntensity: .5, transparent: true, opacity: .32, roughness: .05, metalness: .4, depthWrite: false }),
  bubbleRing: new THREE.SpriteMaterial({ map: TEX.rings, color: 0xcfe2de, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending }),
  shadow: new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false, opacity: .6 }),
  face: new THREE.MeshBasicMaterial({ color: 0x1a110e }),
  ring: new THREE.MeshStandardMaterial({ color: 0xf3d7a8, emissive: 0xd4a574, emissiveIntensity: 1.8, roughness: .3, metalness: .3 }),
  ringDone: new THREE.MeshStandardMaterial({ color: 0x9aa06a, emissive: 0x9aa06a, emissiveIntensity: 1.2, roughness: .3 }),
  thin: new THREE.MeshStandardMaterial({ color: 0x8a8079, roughness: 1, transparent: true, opacity: .22, depthWrite: false }),
  padGlow: new THREE.MeshBasicMaterial({ map: TEX.rings, color: 0xd4a574, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  vent: new THREE.MeshStandardMaterial({ color: 0x4b3a30, roughness: .9 }),
  ventGlow: new THREE.MeshBasicMaterial({ color: 0xf3d7a8, toneMapped: false }),
  bolt: new THREE.MeshBasicMaterial({ color: 0xf6e3bd, toneMapped: false }),
  stormEye: new THREE.MeshBasicMaterial({ color: 0xf3d7a8, toneMapped: false }),
};
