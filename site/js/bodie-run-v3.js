/* Bodie's Breath Run (groundapp.live/play). Built from one source with the Claude artifact version.
   three.js 0.186.1 from jsDelivr, like the home page figure. Bump the filename (v2, v3) when editing. */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/+esm";
window.__bodieBoot = true;
const JSM = "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/";
const LUNG = "/lung-logo.svg";
const $ = (id) => document.getElementById(id);
const stage = $("stage"), canvas = $("gl"), fx = $("fx");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m ? `${m}:${r.toFixed(1).padStart(4, "0")}` : `${r.toFixed(1)}s`; };

// ---------------------------------------------------------------- profile (this browser only)
// The Hall of Breath runs on the Claude artifact database. Where that is missing (groundapp.live), records stay on this device.
const HAS_HALL = !window.GroundPreview?.active() && !!(window.claude && window.claude.use);
const KEY = "bodie-controls-v1";
const DEF = () => ({
  leaves: 0, unlocked: 1, wins: 0, best: {}, bestTime: {}, last: {}, stars: {},
  up: { lungs: 0, spring: 0, magnet: 0, aura: 0, sigh: 0, charge: 0 }, owned: ["classic"], skin: "classic", acc: [],
  sound: false, voice: false, glow: null, motion: null, // motion null: follow the device's reduced-motion setting
  surf: {}, daily: { date: "", best: 0 },
});
function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    const p = JSON.parse(raw);
    if (p && p.up) {
      const d = DEF();
      return { ...d, ...p, up: { ...d.up, ...p.up }, best: { ...(p.best || {}) }, bestTime: { ...(p.bestTime || {}) }, last: { ...(p.last || {}) }, stars: { ...(p.stars || {}) },
        owned: p.owned || d.owned, acc: p.acc || [], surf: { ...(p.surf || {}) }, daily: { ...d.daily, ...(p.daily || {}) },
      };
    }
  } catch (e) {}
  return DEF();
}
let profile = loadProfile();
function save() { try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) {} }
function loadGhost(k) { try { const g = JSON.parse(localStorage.getItem("bodie-controls-ghost-" + k)); return g && g.xs ? g : null; } catch (e) { return null; } }
function saveGhost(k, g) { try { localStorage.setItem("bodie-controls-ghost-" + k, JSON.stringify(g)); } catch (e) {} }
const totalStars = () => Object.values(profile.stars).reduce((a, s) => a + (s || []).filter(Boolean).length, 0);

const SKINS = {
  classic: { name: "Classic", desc: "Bone, like in the app.", body: "#e8ddd0", cheek: "#d4a574", cost: 0 },
  clay: { name: "Clay", desc: "Warm terracotta Bodie.", body: "#b98463", cheek: "#e6ab80", cost: 100 },
  golden: { name: "Golden Hour", desc: "Sunset gold all over.", body: "#e3bd88", cheek: "#c98a5e", cost: 160 },
  dusk: { name: "Dusk", desc: "Night-walk Bodie with bright eyes.", body: "#6d5a4f", cheek: "#d4a574", eye: "#f3e6d6", cost: 220 },
  moon: { name: "Moonstone", desc: "Pale and glowing. Needs 9 stars.", body: "#dcd6cf", cheek: "#c4935a", cost: 300, stars: 9 },
};
const ACCS = {
  sprout: { name: "Bodie Sprout", desc: "A heart-shaped bodhi leaf on top.", cost: 80 },
  scarf: { name: "Amber Scarf", desc: "Flaps when Bodie runs.", cost: 60 },
  halo: { name: "Ring Halo", desc: "Concentric rings of light. Needs 5 stars.", cost: 250, stars: 5 },
};

// ---------------------------------------------------------------- courses: finger-control courses, never physiological instruction
const COURSES = [
  { key: "hollow", name: "Root Hollow", tech: "Shield control", len: 420, kip: .94, seed: 1101,
    f: { pits: .26, rocks: .5, clouds: .36, lake: 0, storms: 0, pads: 0, vents: 0, bubbles: .04 }, refill: 1.7, bpm: 150, musicKey: 0,
    sky: ["#0d0806", "#22150e", "#4a2b1b"], fog: 0x2b1b13, hills: [0x3a2618, 0x2c1d14, 0x22170f], ground: 0x3a2a1e, top: 0x4a3626, trees: "round",
    tip: "Tap to jump. Keep the button pressed for a screen shield, then release to recharge. Keep breathing normally.",
    ch: [{ text: "Beat Kip to the Great Tree", test: (P, r) => r.won }, { text: "Use the screen shield through 5 clouds", test: (P) => P.calm >= 5 }, { text: "Win without a single POP", test: (P, r) => r.won && P.pops === 0 }] },
  { key: "lake", name: "Still Lake", tech: "Obstacle control", len: 500, kip: .97, seed: 2202,
    f: { pits: .2, rocks: .36, clouds: .38, lake: 0, storms: 0, pads: 0, vents: 0, bubbles: .08 }, refill: 1.6, bpm: 156, musicKey: 2,
    sky: ["#090a0a", "#18201e", "#3b3a30"], fog: 0x1e2422, hills: [0x2b2c27, 0x23251f, 0x1b1d19], ground: 0x35281d, top: 0x463525, trees: "round",
    tip: "Tap to jump obstacles. The shield is a finger control, not a breathing cue.",
    ch: [{ text: "Beat Kip to the Great Tree", test: (P, r) => r.won }, { text: "Pass 6 clouds with the shield", test: (P) => P.calm >= 6 }, { text: "Use 2 shield releases", test: (P) => P.boxes >= 2 }] },
  { key: "swamp", name: "Sigh Swamp", tech: "Double-tap gust", len: 540, kip: .99, seed: 3303, sigh: true,
    f: { pits: .2, rocks: .34, clouds: .3, lake: 0, storms: .2, pads: 0, vents: 0, bubbles: .06 }, refill: 1.6, bpm: 160, musicKey: 5,
    sky: ["#080907", "#1a1d14", "#3a3524"], fog: 0x1f2117, hills: [0x2c2c20, 0x23241a, 0x1b1c14], ground: 0x342a1c, top: 0x3f3a24, trees: "round",
    tip: "Double tap for a gust that clears nearby storm clouds. No breathing action is involved.",
    ch: [{ text: "Beat Kip to the Great Tree", test: (P, r) => r.won }, { text: "Clear 4 storms with a gust", test: (P) => P.storms >= 4 }, { text: "Grab 60 Trail Seeds", test: (P) => P.seeds + P.gold * 5 >= 60 }] },
  { key: "peaks", name: "Power Peaks", tech: "Power pads", len: 600, kip: 1.01, seed: 4404,
    f: { pits: .26, rocks: .34, clouds: .32, lake: 0, storms: 0, pads: .2, vents: 0, bubbles: .14 }, refill: 1.1, bpm: 166, musicKey: -3, snow: true,
    sky: ["#07060a", "#1c1418", "#47302a"], fog: 0x24191b, hills: [0x3a2c28, 0x2e2320, 0x241b19], ground: 0x3e2e24, top: 0x52402f, trees: "pine",
    tip: "On a glowing pad, tap to charge the screen shield, then keep the button pressed through the windy zone. Release when the shield meter is low.",
    ch: [{ text: "Beat Kip to the Great Tree", test: (P, r) => r.won }, { text: "Charge the screen shield to 150%", test: (P) => P.maxCharge >= .5 }, { text: "Cross a windy zone without a shield bump", test: (P) => P.thinCleared >= 1 && P.thinPops === 0 }] },
  { key: "temple", name: "Starfall Temple", tech: "Glide control", len: 640, kip: 1.04, seed: 5505, sigh: true,
    f: { pits: .22, rocks: .32, clouds: .3, lake: 0, storms: .1, pads: .08, vents: .16, bubbles: .08 }, refill: 1.5, bpm: 172, musicKey: 7,
    sky: ["#08060c", "#1d1422", "#4a2d33"], fog: 0x221824, hills: [0x33263a, 0x2a1f2f, 0x211824], ground: 0x3a2c2a, top: 0x4c3a34, trees: "pine",
    tip: "Ride the updraft and press the button to glide through rings. Your own breathing stays normal.",
    ch: [{ text: "Beat Kip to the Great Tree", test: (P, r) => r.won }, { text: "Fly through 10 rhythm rings", test: (P) => P.rings >= 10 }, { text: "Win by 20m or more", test: (P, r) => r.won && r.margin >= 20 }] },
];
COURSES.forEach((c, i) => (c.idx = i));
function dayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function dailyCourse() {
  const k = dayKey(), r = mulberry(hashStr(k)), th = COURSES[Math.floor(r() * COURSES.length)];
  const f = { pits: .18 + r() * .1, rocks: .3 + r() * .15, clouds: .26 + r() * .14, lake: 0, storms: r() < .55 ? .14 : 0, pads: r() < .45 ? .1 : 0, vents: r() < .5 ? .1 : 0, bubbles: .08 };
  return { ...th, key: "daily-" + k, idx: -1, daily: true, name: "Daily Dash", len: 480, kip: .99, seed: hashStr(k), f, sigh: f.storms > 0, refill: 1.5, tech: "A bit of everything",
    tip: "Today's course mixes hazards from every course, and it's the same course for everyone today." + (HAS_HALL ? " Check the Hall of Breath to see who's on top." : "") + " Double tap to clear storms, and tap on power pads.", ch: [] };
}
const SAGE_LINES = ["One button at a time.", "This is finger-control play.", "Keep breathing normally.", "Pause whenever you want.", "Follow the trail."];
const KIP_LINES = ["Catch me on the trail!", "Espresso number seven!", "Fast fast fast fast!", "Who needs decaf?!", "Can't stop! Won't stop!", "CAW CAW CAW!", "Decaf is a myth!"];

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
// The cast. Each one has a voice: the browser's own speech with a pitch, speed and preferred voice per character.
const CAST = {
  bodie: { name: "Bodie", role: "Hero", line: "Hi, I'm Bodie! Tap to jump and press for my screen shield. Keep breathing normally while we play.", fact: "A finger-control game, not a breathing test." },
  kip: { name: "Kip the Caffeine Crow", role: "Rival", line: "CAW! Kip's the name, speed's the game! A shortcut? Never heard of it. Bet you can't catch me!", fact: "Favorite drink: espresso. Second favorite: also espresso." },
  sage: { name: "Sage the Owl", role: "Coach", line: "Hello, friend. I'm Sage. I live in the Great Tree at the end of every course. Slow is smooth, and smooth is fast.", fact: "Has never rushed. Not once. Not even for dessert." },
  ember: { name: "Ember the Fox", role: "Shopkeeper", line: "Ember's the name, deals are my game! Bring me Trail Seeds and I'll swap them for Gold Leaves. Fancy a new look?", fact: "Accepts seeds, leaves and compliments." },
};
const DEEP_VOICE = /Daniel|Arthur|Aaron|Alex|Fred|Rishi|Oliver|Google UK English Male|\bMale\b/i;
const VOICE_STYLE = {
  sage: { pitch: .8, rate: .9, pref: DEEP_VOICE },          // Sage, calm: coaching, the Big Hold, Breath Surf
  cue: { pitch: .88, rate: 1.12, pref: DEEP_VOICE },        // Sage, urgent: "Hold your breath!"
  kip: { pitch: 1.95, rate: 1.45, pref: /Samantha|Zira|Junior|Google US English|Karen/i },
  bodie: { pitch: 1.6, rate: 1.05, pref: /Samantha|Tessa|Ava|Allison|Google US English/i },
  ember: { pitch: 1.2, rate: 1.1, pref: /Moira|Fiona|Tessa|Karen|Serena|Google UK English Female|\bFemale\b/i },
};
const Voice = {
  last: 0, voices: null,
  list() { try { const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)); if (vs.length) this.voices = vs; } catch (e) {} return this.voices || []; },
  pick(st) { const vs = this.list(); return vs.find((v) => st.pref.test(v.name)) || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs[0] || null; },
  // who: "cue" (default), "sage", "kip", "bodie" or "ember" (true still means calm Sage). Kip never talks over anyone.
  // explicit: the visitor asked to hear it (a Hear button), so it plays even with voice switched off.
  say(text, force, who = "cue", explicit = false) {
    if (who === true) who = "sage";
    if (!text || (!explicit && (!profile.voice || !profile.sound))) return false;
    const s = window.speechSynthesis; if (!s || typeof SpeechSynthesisUtterance === "undefined") return false;
    const now = performance.now();
    if (who === "kip" && !force && (s.speaking || now - this.last < 2500)) return false;
    if (!force && now - this.last < 1400) return false;
    this.last = now;
    try { const st = VOICE_STYLE[who] || VOICE_STYLE.cue; s.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = st.rate; u.pitch = st.pitch; u.volume = 1; const v = this.pick(st); if (v) u.voice = v; s.speak(u); return true; } catch (e) { return false; }
  },
};
try { speechSynthesis.onvoiceschanged = () => Voice.list(); } catch (e) {}

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
  const c = document.createElement("canvas"), g = c.getContext("2d"), fs = 56, font = `600 ${fs}px "Ground Font Type", sans-serif`;
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

// ---------------------------------------------------------------- Bodie (ported from the website's figure-v1.js)
const HEAD_R = .56, BELLY_Y = 1.0, RAD = [.72, .72 * 1.06, .72 * .92], OUT = -.1, IN = .24;
const ORB = new THREE.Vector3(0, -.2, 1).normalize(), ZV = new THREE.Vector3(0, 0, 1);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function bellyWeight(u) { const low = Math.exp(-((u.y + .18) ** 2) / (2 * .36 ** 2)); return low * (.12 + .88 * Math.max(0, u.z) ** 1.5); }
function makeBelly(bodyColor, inhaleColor, glowColor) {
  let geo = new THREE.SphereGeometry(1, 56, 40);
  geo.deleteAttribute("uv"); geo.deleteAttribute("normal");
  if (mergeVertices) geo = mergeVertices(geo);
  geo.scale(...RAD);
  const pos = geo.attributes.position, n = pos.count;
  const base = Float32Array.from(pos.array), dir = new Float32Array(n * 3), weight = new Float32Array(n), orb = new Float32Array(n);
  const colors = new Float32Array(n * 3), a = new THREE.Color(bodyColor), b = new THREE.Color(inhaleColor), v = new THREE.Vector3(), tint = new THREE.Color(), cur = new THREE.Color();
  for (let i = 0; i < n; i++) { v.fromArray(base, i * 3).normalize(); v.toArray(dir, i * 3); weight[i] = bellyWeight(v); orb[i] = Math.max(0, v.dot(ORB)) ** 3; }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("orb", new THREE.BufferAttribute(orb, 1));
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .62 });
  const uGlow = { value: 0 }, uGlowColor = { value: new THREE.Color(glowColor) };
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = uGlow; sh.uniforms.uGlowColor = uGlowColor;
    sh.vertexShader = "attribute float orb;\nvarying float vOrb;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  vOrb = orb;");
    sh.fragmentShader = "uniform float uGlow;\nuniform vec3 uGlowColor;\nvarying float vOrb;\n" + sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += uGlowColor * (vOrb * uGlow);");
  };
  const mesh = new THREE.Mesh(geo, material); mesh.position.y = BELLY_Y;
  const st = { tintAmt: 0 };
  function breathe(d, glow, dark, boost = 0) {
    cur.copy(a).lerp(tint, st.tintAmt);
    for (let i = 0; i < n; i++) {
      const k = d * weight[i], g = .25 * glow * orb[i], m = 1 - .3 * dark * weight[i];
      for (let j = 0; j < 3; j++) pos.array[i * 3 + j] = base[i * 3 + j] + dir[i * 3 + j] * k;
      colors[i * 3] = (cur.r + (b.r - cur.r) * g) * m; colors[i * 3 + 1] = (cur.g + (b.g - cur.g) * g) * m; colors[i * 3 + 2] = (cur.b + (b.b - cur.b) * g) * m;
    }
    uGlow.value = (.55 + boost) * glow;
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
  }
  function surface(u, d, out) {
    const r = 1 / Math.sqrt((u.x / RAD[0]) ** 2 + (u.y / RAD[1]) ** 2 + (u.z / RAD[2]) ** 2);
    const p = out.copy(u).multiplyScalar(r), w = bellyWeight(p.clone().normalize());
    return p.addScaledVector(p.clone().normalize(), d * w).add(mesh.position);
  }
  function setTint(hex, amt) { tint.set(hex); st.tintAmt = amt; }
  breathe(0, 0, 0);
  return { mesh, breathe, surface, setTint };
}
function onSurface(mesh, yaw, pitch, r) {
  const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  mesh.position.copy(d).multiplyScalar(r); mesh.quaternion.setFromUnitVectors(ZV, d); return mesh;
}
const _tintC = new THREE.Color();
function buildBodie(o = {}) {
  const skin = SKINS[o.skin] || SKINS.classic, acc = o.acc || [];
  const c = { body: skin.body, cushion: "#8b5e3c", eye: skin.eye || "#1a110e", cheek: skin.cheek, inhale: "#c4935a", glow: "#d4a574" };
  const skinM = new THREE.MeshStandardMaterial({ color: c.body, roughness: .62 }), skinBase = new THREE.Color(c.body);
  const root = new THREE.Group(), sit = !!o.sit, LIFT = sit ? 0 : .36;
  if (sit) {
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshStandardMaterial({ color: c.cushion, roughness: .9 }));
    cushion.scale.set(1.05, .24, .95); cushion.position.y = .16; root.add(cushion);
    const gg = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: TEX.glow, color: c.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .25, toneMapped: false }));
    gg.rotation.x = -Math.PI / 2; gg.position.y = .01; root.add(gg); root.userData.floor = gg;
  }
  const body = new THREE.Group(); body.position.y = LIFT; root.add(body);
  const belly = makeBelly(c.body, c.inhale, c.glow); body.add(belly.mesh);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: c.glow, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }));
  halo.scale.setScalar(1.3); halo.renderOrder = 10; body.add(halo);
  const limbs = skinM.clone(); limbs.transparent = true;
  const late = (m) => { m.renderOrder = 11; return m; };
  const legs = [];
  if (sit) {
    for (const side of [-1, 1]) { const leg = late(new THREE.Mesh(new THREE.CapsuleGeometry(.17, .62, 8, 16), limbs)); leg.rotation.set(0, side * .34, Math.PI / 2); leg.position.set(0, side < 0 ? .42 : .47, .36); body.add(leg); }
  } else {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(side * .3, .5, 0);
      const leg = late(new THREE.Mesh(new THREE.CapsuleGeometry(.16, .5, 6, 12), limbs)); leg.position.y = -.4;
      const foot = late(new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 12), limbs)); foot.scale.set(1, .7, 1.35); foot.position.set(0, -.72, .08);
      pivot.add(leg, foot); body.add(pivot); legs.push(pivot);
    }
  }
  const hands = [
    { side: -1, shoulder: new THREE.Vector3(-.48, 1.28, .02), elbowDir: new THREE.Vector3(-.95, 0, .32).normalize(), dir: new THREE.Vector3(-.22, .5, .84).normalize(), lift: .035 },
    { side: 1, shoulder: new THREE.Vector3(.48, 1.24, .02), elbowDir: new THREE.Vector3(.95, -.12, .3).normalize(), dir: new THREE.Vector3(.2, -.22, .95).normalize(), lift: .06 },
  ].map((h) => {
    h.midDir = h.elbowDir.clone().add(h.dir).normalize(); h.elbow = new THREE.Vector3(); h.mid = new THREE.Vector3();
    h.palm = late(new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 14), limbs)); h.palm.scale.set(1.12, .94, .86);
    h.curve = new THREE.CatmullRomCurve3([h.shoulder, h.elbow, h.mid, h.palm.position], false, "centripetal");
    h.arm = late(new THREE.Mesh(new THREE.BufferGeometry(), limbs)); body.add(h.arm, h.palm);
    h.rE = new THREE.Vector3(h.side * .95, 1.6, .1); h.rM = new THREE.Vector3(h.side * .92, 2.1, .14); h.rP = new THREE.Vector3(h.side * .72, 2.6, .18);
    return h;
  });
  function placeHands(d, raise, swing) {
    for (const h of hands) {
      belly.surface(h.elbowDir, d, h.elbow).addScaledVector(h.elbowDir, .1);
      belly.surface(h.midDir, d, h.mid).addScaledVector(h.midDir, .1);
      belly.surface(h.dir, d, h.palm.position).addScaledVector(h.dir, h.lift);
      if (swing) { const s = swing * h.side; h.palm.position.z += s * .06; h.palm.position.y += Math.abs(s) * .03; }
      if (raise > 0) { h.elbow.lerp(h.rE, raise); h.mid.lerp(h.rM, raise); h.palm.position.lerp(h.rP, raise); }
      h.arm.geometry.dispose(); h.arm.geometry = new THREE.TubeGeometry(h.curve, 20, .105, 9, false);
    }
  }
  const head = new THREE.Group(); head.position.y = 1.62; body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 40, 28), skinM); skull.position.y = .4; head.add(skull);
  const eyeMat = new THREE.MeshStandardMaterial({ color: c.eye, roughness: .15, metalness: .1 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeRig = new THREE.Group(); eyeRig.position.y = .4; head.add(eyeRig);
  const eyes = [-1, 1].map((side) => { const eye = onSurface(new THREE.Mesh(new THREE.SphereGeometry(.07, 20, 14), eyeMat), side * .3, .1, HEAD_R * .99); const dot = new THREE.Mesh(new THREE.SphereGeometry(.02, 10, 8), shine); dot.position.set(-.025, .035, .06); eye.add(dot); eyeRig.add(eye); return eye; });
  const face = new THREE.Group(); face.position.y = .4; head.add(face);
  const blushM = new THREE.MeshBasicMaterial({ color: c.cheek, transparent: true, opacity: .55, depthWrite: false });
  for (const side of [-1, 1]) face.add(onSurface(new THREE.Mesh(new THREE.CircleGeometry(.075, 20), blushM), side * .52, -.1, HEAD_R + .003));
  const mouth = onSurface(new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 8, 20, Math.PI), eyeMat), 0, -.17, HEAD_R);
  mouth.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(ZV, Math.PI)); face.add(mouth);
  const O = onSurface(new THREE.Mesh(new THREE.TorusGeometry(.045, .016, 8, 18), eyeMat), 0, -.19, HEAD_R); O.visible = false; face.add(O);
  let scarfTail = null, haloRings = null;
  if (acc.includes("sprout")) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.015, .02, .22, 6), new THREE.MeshStandardMaterial({ color: 0x7d8450 })); stem.position.set(0, .4 + HEAD_R + .08, 0); head.add(stem);
    const lf = new THREE.Mesh(GEO.leaf, new THREE.MeshStandardMaterial({ color: 0x9aa06a, roughness: .6, side: THREE.DoubleSide }));
    lf.scale.setScalar(.34); lf.position.set(.05, .4 + HEAD_R + .26, 0); lf.rotation.set(0, .4, -.5); head.add(lf);
  }
  if (acc.includes("scarf")) {
    const sm = new THREE.MeshStandardMaterial({ color: 0xc4935a, roughness: .7 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.46, .11, 10, 28), sm); ring.rotation.x = Math.PI / 2 - .1; ring.position.y = 1.64; body.add(ring);
    scarfTail = new THREE.Group(); scarfTail.position.set(0, 1.62, -.42); const tl = new THREE.Mesh(GEO.box, sm); tl.scale.set(.18, .5, .06); tl.position.y = -.22; scarfTail.add(tl); body.add(scarfTail);
  }
  if (acc.includes("halo")) {
    haloRings = new THREE.Group(); haloRings.position.y = .4 + HEAD_R + .32;
    const hm = new THREE.MeshStandardMaterial({ color: 0xd4a574, emissive: 0xd4a574, emissiveIntensity: 1.8, roughness: .3 });
    [.32, .22, .12].forEach((r, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .022, 8, 40), hm); t.rotation.x = Math.PI / 2; t.position.y = i * .02; haloRings.add(t); });
    head.add(haloRings);
  }
  const s = { gx: 0, gy: 0, tx: 0, ty: 0, blink: 0, nextBlink: 2, blinking: -1, press: -1, lid: 0, runPh: 0, raise: 0, running: 0 };
  return {
    root, body, head,
    look(x, y) { s.tx = x; s.ty = y; },
    press() { s.press = 0; },
    update(dt, fill, still, phase, light = fill, boost = 0) {
      const d = OUT + (IN - OUT) * fill;
      const lit = smooth(.3, 1, light), empty = 1 - smooth(0, .3, light);
      belly.breathe(d, lit, empty, boost);
      placeHands(d, s.raise, legs.length ? Math.sin(s.runPh) * s.running : 0);
      belly.surface(ORB, d, halo.position).addScaledVector(ORB, .05);
      halo.material.opacity = (.3 + boost * .35) * lit;
      if (root.userData.floor) root.userData.floor.material.opacity = .12 + .24 * lit;
      head.position.y = 1.62 + .035 * fill;
      s.gx += (s.tx - s.gx) * Math.min(1, dt * 12); s.gy += (s.ty - s.gy) * Math.min(1, dt * 12);
      eyeRig.rotation.set(still ? 0 : s.gy * .16, still ? 0 : s.gx * .22, 0);
      if (s.blinking < 0 && !still && (s.nextBlink -= dt) <= 0) s.blinking = 0; // still: no idle blinks
      if (s.blinking >= 0) { const p = (s.blinking += dt) / .16; s.blink = p < .5 ? p * 2 : Math.max(0, 2 - p * 2); if (p >= 1) { s.blinking = -1; s.blink = 0; s.nextBlink = 2 + Math.random() * 3.5; } }
      s.lid += ((phase === "hold" ? 1 : 0) - s.lid) * Math.min(1, dt * 5);
      let open = (1 - s.blink) * (1 - .18 * (1 - fill)) * (1 - .88 * s.lid);
      let squash = 0;
      if (s.press >= 0) { const t = (s.press += dt); open = Math.min(open, t < .7 ? .15 : 1); squash = still ? 0 : Math.sin(t * 18) * Math.exp(-t * 5) * .07; if (t > .9) s.press = -1; }
      for (const eye of eyes) eye.scale.set(.85, 1.3 * Math.max(.08, open), .7);
      body.scale.set(1 + squash, 1 - squash, 1 + squash);
      mouth.visible = phase !== "o"; O.visible = phase === "o";
      if (haloRings && !still) haloRings.rotation.y += dt * .8;
    },
    // Running pose, layered on top of update(): legs, bob, lean, raised arms, smog balloon, tint.
    pose(dt, p) {
      s.running = p.mode === "run" ? 1 : 0;
      s.raise += ((p.raise || 0) - s.raise) * Math.min(1, dt * 6);
      if (legs.length) {
        if (p.mode === "run") {
          s.runPh += dt * (p.rate || 1) * 15;
          legs[0].rotation.x = Math.sin(s.runPh) * .95; legs[1].rotation.x = -Math.sin(s.runPh) * .95;
          body.position.y = LIFT + Math.abs(Math.sin(s.runPh)) * .08;
        } else if (p.mode === "air") {
          legs[0].rotation.x += (-.7 - legs[0].rotation.x) * Math.min(1, dt * 10); legs[1].rotation.x += (.45 - legs[1].rotation.x) * Math.min(1, dt * 10); body.position.y = LIFT;
        } else if (p.mode === "swim") {
          s.runPh += dt * (p.rate || 1) * 14; legs[0].rotation.x = Math.sin(s.runPh) * .45; legs[1].rotation.x = -Math.sin(s.runPh) * .45; body.position.y = LIFT;
        } else { legs[0].rotation.x *= .85; legs[1].rotation.x *= .85; body.position.y = LIFT; }
      }
      body.rotation.x = p.mode === "run" ? .1 : (p.mode === "air" ? -.05 : 0);
      body.rotation.z = p.spin ? Math.sin(p.spin * 30) * .35 : 0;
      const inflate = p.inflate || 0; body.scale.multiplyScalar(1 + inflate * .55);
      const tAmt = Math.max(inflate * .8, p.red || 0), tHex = inflate * .8 >= (p.red || 0) ? 0x8f8580 : 0xe0685a;
      belly.setTint(tHex, tAmt); skinM.color.copy(skinBase).lerp(_tintC.set(tHex), tAmt); limbs.color.copy(skinM.color);
      if (scarfTail) scarfTail.rotation.x = -.9 - Math.sin(s.runPh * 1.3) * .25 * (p.mode === "run" ? 1 : .2);
    },
  };
}
// A see-through Bodie that replays your best run.
function buildGhost() {
  const g = buildBodie({ skin: "golden" });
  g.update(.016, .45, true, null, .35);
  g.root.traverse((o) => { if (!o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.transparent = true; m.opacity = .3; m.depthWrite = false; if (m.emissive) { m.emissive.set(0xd4a574); m.emissiveIntensity = .5; } }); });
  return g;
}

// ---------------------------------------------------------------- Kip, Sage, Ember
function std(color, rough = .6, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra }); }
function buildKip() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const dark = std(0x3d2c25, .5), chest = std(0x5c463b, .7), beakM = std(0xd49a52, .35, { metalness: .2 }), white = std(0xf3ece2, .3), black = std(0x120c0a, .2);
  const torso = new THREE.Mesh(GEO.sphere, dark); torso.scale.set(.62, .46, .44); body.add(torso);
  const bel = new THREE.Mesh(GEO.sphere, chest); bel.scale.set(.46, .28, .36); bel.position.set(.12, -.18, 0); body.add(bel);
  const head = new THREE.Group(); head.position.set(.62, .3, 0); body.add(head);
  const skull = new THREE.Mesh(GEO.sphere, dark); skull.scale.setScalar(.34); head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.11, .44, 12), beakM); beak.rotation.z = -Math.PI / 2; beak.position.set(.45, -.04, 0); head.add(beak);
  const pupils = [];
  for (const side of [-1, 1]) {
    const e = new THREE.Mesh(GEO.sphere, white); e.scale.setScalar(.13); e.position.set(.17, .1, side * .22); head.add(e);
    const p = new THREE.Mesh(GEO.sphere, black); p.scale.setScalar(.06); p.position.set(.25, .1, side * .3); head.add(p); pupils.push(p);
    const brow = new THREE.Mesh(GEO.box, black); brow.scale.set(.2, .035, .05); brow.position.set(.2, .25, side * .23); brow.rotation.z = -.5; head.add(brow);
  }
  for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(.05, .26, 6), dark); t.position.set(-.05 - i * .07, .36, 0); t.rotation.z = .5 + i * .2; head.add(t); }
  const wings = [-1, 1].map((side) => { const pv = new THREE.Group(); pv.position.set(-.02, .15, side * .34); const w = new THREE.Mesh(GEO.sphere, dark); w.scale.set(.5, .06, .36); w.position.set(-.1, 0, side * .3); pv.add(w); body.add(pv); return { pv, side }; });
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.24, .6, 8), dark); tail.rotation.z = Math.PI / 2; tail.scale.z = .35; tail.position.set(-.78, .06, 0); body.add(tail);
  for (const side of [-1, 1]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .3, 6), beakM); lg.position.set(.08, -.52, side * .1); body.add(lg); }
  const cup = new THREE.Group(); cup.position.set(.1, -.78, 0); body.add(cup);
  cup.add(new THREE.Mesh(new THREE.CylinderGeometry(.14, .1, .28, 16), std(0xeee3d4, .4)));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.135, .12, .08, 16), std(0xe07a5a, .5)); band.position.y = -.01; cup.add(band);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .04, 16), std(0x3d2c25, .5)); lid.position.y = .16; cup.add(lid);
  return {
    root, body,
    update(dt, t, mood) {
      const fast = mood === "sprint" ? 40 : 24, crashed = mood === "crash", jit = dt ? .03 : 0; // dt 0 (Motion off): no caffeine jitter
      for (const w of wings) w.pv.rotation.x = w.side * (crashed ? -.3 : Math.sin(t * fast) * .9);
      body.position.set(crashed ? 0 : (Math.random() - .5) * jit, crashed ? 0 : (Math.random() - .5) * jit, 0);
      body.rotation.z = crashed ? Math.sin(t * 14) * .45 : (mood === "sprint" ? -.18 : -.05);
      for (const p of pupils) { if (crashed) { p.position.y = .1 + Math.sin(t * 20) * .04; p.position.x = .24 + Math.cos(t * 20) * .02; } else { p.position.y = .1 + (Math.random() - .5) * jit; p.position.x = .25; } }
    },
  };
}
function buildSage() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const brown = std(0x7e6b5c, .8), light = std(0xb3a090, .8), gold = std(0xc4935a, .4);
  const torso = new THREE.Mesh(GEO.sphere, brown); torso.scale.set(.6, .72, .55); torso.position.y = .72; body.add(torso);
  const facePlate = new THREE.Mesh(GEO.sphere, light); facePlate.scale.set(.44, .4, .2); facePlate.position.set(0, .98, .4); body.add(facePlate);
  const chestM = new THREE.Mesh(GEO.sphere, light); chestM.scale.set(.36, .38, .2); chestM.position.set(0, .5, .38); body.add(chestM);
  const eyeG = new THREE.Group(); body.add(eyeG);
  for (const side of [-1, 1]) [[.18, 0xe8ddd0], [.12, 0xc4935a], [.06, 0x1a110e]].forEach(([r, col], i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ color: col })); m.position.set(side * .19, 1.02, .6 + i * .006); eyeG.add(m); });
  for (const side of [-1, 1]) { const t = new THREE.Mesh(new THREE.ConeGeometry(.1, .32, 6), brown); t.position.set(side * .33, 1.32, .08); t.rotation.z = -side * .45; body.add(t); }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.06, .16, 8), gold); beak.position.set(0, .88, .62); beak.rotation.x = Math.PI * .65; body.add(beak);
  for (const side of [-1, 1]) { const w = new THREE.Mesh(GEO.sphere, brown); w.scale.set(.16, .48, .4); w.position.set(side * .55, .66, -.02); body.add(w); const f = new THREE.Mesh(GEO.sphere, gold); f.scale.set(.1, .05, .14); f.position.set(side * .16, .03, .2); body.add(f); }
  return { root, update(dt, t) { const blink = (t % 4.5) > 4.35; eyeG.scale.y = blink ? .15 : 1; eyeG.position.y = blink ? .86 : 0; body.rotation.z = Math.sin(t * .8) * .06; } };
}
function buildEmber() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const orange = std(0xc47e48, .7), cream = std(0xeadfce, .7), dark = std(0x2a1b14, .6);
  const torso = new THREE.Mesh(GEO.sphere, orange); torso.scale.set(.4, .5, .38); torso.position.y = .62; body.add(torso);
  const chest = new THREE.Mesh(GEO.sphere, cream); chest.scale.set(.24, .32, .2); chest.position.set(0, .66, .24); body.add(chest);
  const head = new THREE.Group(); head.position.set(0, 1.2, .05); body.add(head);
  const skull = new THREE.Mesh(GEO.sphere, orange); skull.scale.set(.34, .3, .32); head.add(skull);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(.15, .38, 12), cream); snout.rotation.x = Math.PI / 2; snout.position.set(0, -.07, .38); head.add(snout);
  const nose = new THREE.Mesh(GEO.sphere, dark); nose.scale.setScalar(.05); nose.position.set(0, -.06, .57); head.add(nose);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.12, .32, 4), orange); ear.position.set(side * .2, .3, 0); ear.rotation.z = -side * .25; head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(.06, .18, 4), dark); inner.position.set(side * .2, .28, .06); inner.rotation.z = -side * .25; head.add(inner);
    const eye = new THREE.Mesh(GEO.sphere, dark); eye.scale.setScalar(.045); eye.position.set(side * .13, .05, .28); head.add(eye);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .22, 4, 8), dark); leg.position.set(side * .18, .16, .08); body.add(leg);
  }
  const tailG = new THREE.Group(); tailG.position.set(0, .45, -.32); body.add(tailG);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.15, .15, -.35), new THREE.Vector3(.35, .55, -.45), new THREE.Vector3(.4, .9, -.3)]);
  tailG.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, .13, 10, false), orange));
  const tip = new THREE.Mesh(GEO.sphere, cream); tip.scale.setScalar(.15); tip.position.set(.4, .95, -.28); tailG.add(tip);
  const leaf = new THREE.Mesh(GEO.leaf, std(0xd4a574, .3, { emissive: 0xd4a574, emissiveIntensity: .8, side: THREE.DoubleSide })); leaf.scale.setScalar(.3); leaf.position.set(.26, .78, .32); leaf.rotation.z = -.6; body.add(leaf);
  return { root, update(dt, t) { tailG.rotation.y = Math.sin(t * 2.2) * .35; head.rotation.z = Math.sin(t * .9) * .08; } };
}

// ---------------------------------------------------------------- particles + confetti + fireflies + sky
function makeParticles(max, additive) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 3), size = new Float32Array(max), alpha = new Float32Array(max);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("pcolor", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("psize", new THREE.BufferAttribute(size, 1)); geo.setAttribute("palpha", new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 400 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: "attribute vec3 pcolor; attribute float psize; attribute float palpha; varying vec3 vC; varying float vA; uniform float uScale; void main(){ vC=pcolor; vA=palpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=psize*uScale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }",
    fragmentShader: "varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d)*vA; if(a<0.01) discard; gl_FragColor=vec4(vC,a); \n#include <colorspace_fragment>\n }",
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  return { pts, geo, mat, max, list: [], pos, col, size, alpha };
}
const PART = [makeParticles(500, false), makeParticles(500, true)];
function emit(o) {
  const sys = PART[o.add ? 1 : 0];
  for (let i = 0; i < (o.n || 8); i++) {
    if (sys.list.length >= sys.max) sys.list.shift();
    const a = Math.random() * Math.PI * 2, b = (Math.random() - .5) * Math.PI, sp = (o.speed || 2) * (.4 + Math.random() * .6);
    sys.list.push({ x: o.x + (Math.random() - .5) * (o.spread || .2), y: o.y + (Math.random() - .5) * (o.spread || .2), z: (o.z || 0) + (Math.random() - .5) * (o.spread || .2),
      vx: Math.cos(a) * Math.cos(b) * sp + (o.vx || 0), vy: Math.sin(b) * sp * .6 + (o.up || 0), vz: Math.sin(a) * Math.cos(b) * sp * .5,
      life: (o.life || .7) * (.7 + Math.random() * .6), t: 0, s: o.size || .2, grow: o.grow || 0, g: o.grav ?? 4, c: new THREE.Color(o.color ?? 0xd4a574) });
  }
}
function updateParticles(dt) {
  for (const sys of PART) {
    let i = 0;
    sys.list = sys.list.filter((p) => (p.t += dt) < p.life);
    for (const p of sys.list) {
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      sys.pos[i * 3] = p.x; sys.pos[i * 3 + 1] = p.y; sys.pos[i * 3 + 2] = p.z;
      sys.col[i * 3] = p.c.r; sys.col[i * 3 + 1] = p.c.g; sys.col[i * 3 + 2] = p.c.b;
      sys.size[i] = p.s * (1 + p.grow * p.t); sys.alpha[i] = 1 - p.t / p.life; i++;
    }
    for (; i < sys.max; i++) sys.alpha[i] = 0;
    for (const k of ["position", "pcolor", "psize", "palpha"]) sys.geo.attributes[k].needsUpdate = true;
  }
}
const CONF_N = 140;
const confetti = new THREE.InstancedMesh(GEO.leaf, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6a4a20, emissiveIntensity: .6, side: THREE.DoubleSide, roughness: .5 }), CONF_N);
confetti.frustumCulled = false; confetti.visible = false; scene.add(confetti);
const confData = [];
for (let i = 0; i < CONF_N; i++) { confetti.setColorAt(i, new THREE.Color([0xd4a574, 0xc4935a, 0x9aa06a, 0xf3d7a8, 0xe8ddd0][i % 5])); confData.push({}); }
function launchConfetti(x, y, z) {
  confetti.visible = true;
  confData.forEach((d) => Object.assign(d, { x: x + (Math.random() - .5) * 6, y: y + 3 + Math.random() * 4, z: z + (Math.random() - .5) * 3, vx: (Math.random() - .5) * 2, vy: Math.random() * 3, rx: Math.random() * 6, ry: Math.random() * 6, sr: 2 + Math.random() * 4, t: 0 }));
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function updateConfetti(dt) {
  if (!confetti.visible) return;
  confData.forEach((d, i) => {
    d.t += dt; d.vy -= 2.2 * dt; d.vy = Math.max(d.vy, -1.6); d.x += (d.vx + Math.sin(d.t * 3 + i) * .6) * dt; d.y += d.vy * dt; d.rx += d.sr * dt; d.ry += d.sr * .7 * dt;
    _q.setFromEuler(_e.set(d.rx, d.ry, 0)); _m.compose(_p.set(d.x, d.y, d.z), _q, _s.setScalar(.22)); confetti.setMatrixAt(i, _m);
  });
  confetti.instanceMatrix.needsUpdate = true;
  if (confData.every((d) => d.y < -3)) confetti.visible = false;
}
const FF_N = 150;
const fireflies = (() => {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(FF_N * 3), ph = new Float32Array(FF_N);
  for (let i = 0; i < FF_N; i++) { pos[i * 3] = Math.random() * 70; pos[i * 3 + 1] = .4 + Math.random() * 5; pos[i * 3 + 2] = -6 + Math.random() * 9; ph[i] = Math.random() * 10; }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCam: { value: 0 }, uScale: { value: 400 }, uColor: { value: new THREE.Vector3(1.6, 1.15, .65) }, uY: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "attribute float ph; uniform float uTime; uniform float uCam; uniform float uScale; uniform float uY; varying float vA; void main(){ vec3 p=position; p.x=mod(p.x-uCam+35.0,70.0)+uCam-35.0; p.y+=uY+sin(uTime*0.7+ph)*0.4; p.z+=cos(uTime*0.5+ph*1.3)*0.3; p.x+=sin(uTime*0.3+ph)*0.6; vA=0.35+0.65*pow(0.5+0.5*sin(uTime*2.2+ph*3.0),3.0); vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=0.16*uScale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }",
    fragmentShader: "uniform vec3 uColor; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d)*vA; gl_FragColor=vec4(uColor*a,a); \n#include <colorspace_fragment>\n }",
  });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; scene.add(p); return p;
})();
const sky = new THREE.Group(); scene.add(sky);
{
  const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.rings, color: 0xd4a574, transparent: true, opacity: .45, fog: false, depthWrite: false })); ring.scale.setScalar(44);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xf3e6d6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false })); moon.scale.setScalar(10);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: 0xeee2d2, fog: false }));
  const sg = new THREE.BufferGeometry(), sp = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) { sp[i * 3] = (Math.random() - .5) * 360; sp[i * 3 + 1] = 10 + Math.random() * 90; sp[i * 3 + 2] = -10 - Math.random() * 20; }
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xe8ddd0, size: .5, transparent: true, opacity: .7, fog: false }));
  ring.position.set(38, 34, -1); moon.position.set(38, 34, 0); disc.position.set(38, 34, 1); stars.position.set(0, -10, 0);
  sky.add(ring, moon, disc, stars); sky.userData.ring = ring;
}
function updateSky(t) {
  sky.position.set(camera.position.x * .96, camera.position.y * .5, -150);
  sky.userData.ring.material.rotation = t * .02;
  sky.userData.ring.scale.setScalar(44 * (1 + Math.sin(t * .6) * .02));
}

// ---------------------------------------------------------------- backdrop: mountains, trees, the Great Tree
function mountainStrip(x0, x1, z, base, amp, col, snow, seed) {
  const rnd = mulberry(seed), p = [rnd() * 6, rnd() * 6, rnd() * 6], step = 2, n = Math.floor((x1 - x0) / step) + 1;
  const pos = new Float32Array(n * 6), cl = new Float32Array(n * 6), idx = [];
  const c = new THREE.Color(col), top = c.clone().multiplyScalar(1.3), bot = c.clone().multiplyScalar(.5), snowC = new THREE.Color(0xe8ddd0).multiplyScalar(.6);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step, y = base + amp * (.55 * Math.sin(x * .021 + p[0]) + .3 * Math.sin(x * .057 + p[1]) + .4 * Math.abs(Math.sin(x * .011 + p[2])));
    pos.set([x, y, 0, x, -16, 0], i * 6);
    const sl = base + amp * .5, tc = snow && y > sl ? top.clone().lerp(snowC, Math.min(1, (y - sl) / (amp * .35))) : top;
    cl.set([tc.r, tc.g, tc.b, bot.r, bot.g, bot.b], i * 6);
    if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(cl, 3)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.position.z = z; return m;
}
function treeBelt(co, x0, x1) {
  const g = new THREE.Group(), n = Math.floor((x1 - x0) / 2.4);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .2, 1, 6), std(0x2a1c14, 1), n);
  const crowns = new THREE.InstancedMesh(co.trees === "pine" ? new THREE.ConeGeometry(1, 2.4, 7) : new THREE.IcosahedronGeometry(1, 1), std(0xffffff, 1, { flatShading: true }), n);
  const pal = co.trees === "pine" ? [0x2c3020, 0x33361f, 0x262a1c] : [0x3d2f1d, 0x45361f, 0x352b1b, 0x4a3a22];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 2.4 + Math.random() * 2, z = -7 - Math.random() * 14, h = 2.2 + Math.random() * 3.6, s = .9 + Math.random() * 1;
    _m.compose(_p.set(x, h / 2 - .2, z), _q.identity(), _s.set(1, h, 1)); trunks.setMatrixAt(i, _m);
    if (co.trees === "pine") _m.compose(_p.set(x, h * .7 + s, z), _q.identity(), _s.set(s * .8, s * 1.3, s * .8));
    else _m.compose(_p.set(x, h + s * .5, z), _q.setFromEuler(_e.set(Math.random(), Math.random(), 0)), _s.set(s * 1.2, s, s * 1.1));
    crowns.setMatrixAt(i, _m); crowns.setColorAt(i, new THREE.Color(pal[i % pal.length]));
  }
  g.add(trunks, crowns); return g;
}
function buildGreatTree() {
  const g = new THREE.Group(), bark = std(0x4a3424, .95);
  const prof = [[1.7, 0], [1.05, .4], [.8, 1.2], [.68, 3], [.62, 5], [.5, 7], [.36, 8.6]].map(([r, y]) => new THREE.Vector2(r, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 18), bark));
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + .3; const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .5, 0), new THREE.Vector3(Math.cos(a) * 1.6, .35, Math.sin(a) * 1.2), new THREE.Vector3(Math.cos(a) * 3.4, -.15, Math.sin(a) * 2.4)]); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 12, .2, 7), bark)); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const y0 = 4.8 + i * .5; const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, y0, 0), new THREE.Vector3(Math.cos(a) * 1.6, y0 + 1.6, Math.sin(a) * 1), new THREE.Vector3(Math.cos(a) * 3.2, y0 + 2.8, Math.sin(a) * 1.8)]); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 12, .17, 7), bark)); }
  const N = 560, leaves = new THREE.InstancedMesh(GEO.leaf, std(0xffffff, .7, { emissive: 0x3a2a10, emissiveIntensity: .5, side: THREE.DoubleSide }), N);
  const pal = [0x9aa06a, 0x8a924f, 0xd4a574, 0xc4935a, 0xb2a35f];
  for (let i = 0; i < N; i++) {
    const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1), r = .65 + Math.random() * .35;
    _m.compose(_p.set(Math.sin(v) * Math.cos(u) * 5 * r, 9 + Math.cos(v) * 3 * r, Math.sin(v) * Math.sin(u) * 3.2 * r), _q.setFromEuler(_e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)), _s.setScalar(.55 + Math.random() * .35));
    leaves.setMatrixAt(i, _m); leaves.setColorAt(i, new THREE.Color(pal[i % pal.length]));
  }
  g.add(leaves);
  const rings = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.rings, color: 0xd4a574, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending })); rings.scale.setScalar(18); rings.position.set(0, 8.5, -2); g.add(rings);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xd4a574, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(16); glow.position.set(0, 8, -1); g.add(glow);
  const pl = new THREE.PointLight(0xd4a574, 40, 30, 1.6); pl.position.set(0, 6, 5); g.add(pl);
  const sage = buildSage(); sage.root.position.set(2.6, 7.75, 1.1); sage.root.rotation.y = -.25; g.add(sage.root);
  g.userData = { rings, sage };
  return g;
}

// ---------------------------------------------------------------- course pieces
function makeGround(x0, x1, depth) {
  const len = x1 - x0, g = new THREE.Group(), cx = (x0 + x1) / 2;
  const box = new THREE.Mesh(GEO.box, [M.groundSide, M.groundSide, M.groundTop, M.groundSide, M.groundSide, M.groundSide]); box.scale.set(len, 5, depth); box.position.set(cx, -2.5, 0);
  const edge = new THREE.Mesh(GEO.box, M.edge); edge.scale.set(len, .05, .07); edge.position.set(cx, 0, depth / 2);
  const rm = M.roots.clone(); rm.map = TEX.roots.clone(); rm.map.wrapS = THREE.RepeatWrapping; rm.map.repeat.set(len / 5, 1); rm.map.needsUpdate = true;
  const face = new THREE.Mesh(GEO.plane, rm); face.scale.set(len, 4, 1); face.position.set(cx, -2, depth / 2 + .01);
  g.add(box, edge, face); g.userData.own = [rm];
  for (let k = 0; k < len / 2.2; k++) { const t = new THREE.Mesh(GEO.tuft, M.tuft); t.position.set(x0 + Math.random() * len, .15, -depth / 2 + Math.random() * depth * .35); t.rotation.z = (Math.random() - .5) * .5; g.add(t); }
  return g;
}
const SURF = -.35, SWIM = -1.44, DIVE = -3.1, BED = -3.7;
function makeWater(x0, x1, depth) {
  const len = x1 - x0, g = new THREE.Group(), cx = (x0 + x1) / 2;
  const bed = new THREE.Mesh(GEO.box, M.bed); bed.scale.set(len, 1.4, depth); bed.position.set(cx, BED - .7, 0);
  const vol = new THREE.Mesh(GEO.box, M.water); vol.scale.set(len, SURF - BED, depth); vol.position.set(cx, (SURF + BED) / 2, 0); vol.renderOrder = 2;
  const top = new THREE.Mesh(GEO.plane, M.waterTop); top.scale.set(len, depth, 1); top.rotation.x = -Math.PI / 2; top.position.set(cx, SURF, 0); top.renderOrder = 3;
  g.add(bed, vol, top);
  for (let k = 0; k < len / 1.5; k++) { const r = new THREE.Mesh(GEO.tuft, M.tuft); r.scale.set(1, 3 + Math.random() * 2, 1); r.position.set(x0 + Math.random() * len, SURF + .4, -depth / 2 + Math.random() * .4); g.add(r); }
  return g;
}
function makeCloud(r, zs, color = 0x7d6f67, storm = false) {
  const g = new THREE.Group(), mat = std(color, 1, { transparent: true, opacity: .96 });
  [[0, 0, 0, 1], [-.75, -.15, .1, .72], [.78, -.12, .05, .75], [-.35, .38, -.1, .7], [.4, .4, -.05, .68], [0, -.3, .3, .72]].forEach(([x, y, z, s]) => { const m = new THREE.Mesh(GEO.sphere, mat); m.scale.setScalar(r * s); m.position.set(x * r, y * r, z * r); g.add(m); });
  const face = new THREE.Group(); face.position.set(0, .05 * r, r * .98); g.add(face);
  for (const side of [-1, 1]) {
    const b = new THREE.Mesh(GEO.box, M.face); b.scale.set(.32 * r, .07 * r, .05); b.position.set(side * .26 * r, .18 * r, 0); b.rotation.z = side * (storm ? .65 : .45); face.add(b);
    const e = new THREE.Mesh(GEO.sphere, storm ? M.stormEye : M.face); e.scale.setScalar(.07 * r); e.position.set(side * .24 * r, .02 * r, 0); face.add(e);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.17 * r, .03 * r, 6, 16, Math.PI), M.face); mouth.position.y = -.26 * r; face.add(mouth);
  let bolt = null;
  if (storm) {
    bolt = new THREE.Group(); [[0, -1.05, .5], [.18, -1.45, -.6], [0, -1.85, .5]].forEach(([x, y, rz]) => { const s = new THREE.Mesh(GEO.box, M.bolt); s.scale.set(.09, .5, .09); s.position.set(x * r, y * r, .2); s.rotation.z = rz; bolt.add(s); });
    bolt.visible = false; g.add(bolt);
  }
  g.scale.z = zs; g.userData = { mat, face, mouth, bolt, own: [mat] }; return g;
}
function makeSeed(gold) { const g = new THREE.Group(); const m = new THREE.Mesh(GEO.seed, gold ? M.gold : M.seed); m.scale.set(.8, 1.15, .8).multiplyScalar(gold ? 1.5 : 1); const h = new THREE.Sprite(gold ? M.goldHalo : M.seedHalo); h.scale.setScalar(gold ? 1.3 : .8); g.add(m, h); return g; }
function makeBubble() { const g = new THREE.Group(); const m = new THREE.Mesh(GEO.sphere, M.bubble); m.scale.setScalar(.4); const r = new THREE.Sprite(M.bubbleRing); r.scale.setScalar(1); g.add(m, r); return g; }
function makeRock(w, h, depth) { const m = new THREE.Mesh(GEO.rock, M.rock); m.scale.set(w / 2, h, Math.min(.6, depth * .3)); m.rotation.y = Math.random() * .6; return m; }
function makeLog(depth) { const m = new THREE.Mesh(GEO.log, [M.logSide, M.logCap, M.logCap]); m.rotation.x = Math.PI / 2; m.scale.y = depth; return m; }
function makePad(len, depth) {
  const g = new THREE.Group();
  const n = Math.max(2, Math.round(len / 2.4));
  for (let i = 0; i < n; i++) { const d = new THREE.Mesh(GEO.plane, M.padGlow); d.rotation.x = -Math.PI / 2; d.scale.set(2.2, Math.min(2.2, depth), 1); d.position.set(-len / 2 + (i + .5) * len / n, .03, 0); g.add(d); }
  return g;
}
function makeThin(len, depth) {
  const g = new THREE.Group();
  const vol = new THREE.Mesh(GEO.box, M.thin); vol.scale.set(len, 4.2, depth + .4); vol.position.y = 2.1; vol.renderOrder = 2; g.add(vol);
  for (let i = 0; i < len / 1.6; i++) { const p = new THREE.Mesh(GEO.sphere, M.thin); p.scale.setScalar(.6 + Math.random() * .8); p.position.set(-len / 2 + Math.random() * len, .4 + Math.random() * 3.6, (Math.random() - .5) * depth); p.renderOrder = 2; g.add(p); }
  const sign = textSprite("THIN AIR", "#E07A5A", .55); sign.position.set(-len / 2 + .8, 4.6, 0); g.add(sign); g.userData.own = sign.userData.own;
  return g;
}
function makeVent() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.55, .12, 8, 24), M.vent); rim.rotation.x = -Math.PI / 2; rim.position.y = .06; g.add(rim);
  const grate = new THREE.Mesh(new THREE.CircleGeometry(.48, 24), M.ventGlow); grate.rotation.x = -Math.PI / 2; grate.position.y = .05; g.add(grate);
  const up = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.ray, color: 0xf3d7a8, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending })); up.scale.set(1.1, 4, 1); up.position.y = 2; up.material.rotation = Math.PI; g.add(up);
  g.userData.own = [up.material];
  return g;
}
function makeRingMesh() { const m = new THREE.Mesh(GEO.ring, M.ring); m.rotation.y = Math.PI / 2; return m; }

// ---------------------------------------------------------------- deep-sea pieces for The Big Hold
function makeJelly() {
  const g = new THREE.Group();
  const mat = std(0xe8b08a, .3, { emissive: 0xd4a574, emissiveIntensity: .9, transparent: true, opacity: .75 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat); g.add(dome);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const t = new THREE.Mesh(new THREE.CylinderGeometry(.025, .01, 1, 5), mat); t.position.set(Math.cos(a) * .3, -.5, Math.sin(a) * .3); g.add(t); }
  const h = new THREE.Sprite(M.goldHalo); h.scale.setScalar(1.6); g.add(h);
  g.userData.own = [mat]; return g;
}
function makeCoral(h, down) {
  const g = new THREE.Group(), mat = std(down ? 0x4a3a33 : 0xb07a55, .8, { flatShading: true });
  const n = 3; for (let i = 0; i < n; i++) { const c = new THREE.Mesh(GEO.cone, mat); const w = .5 - i * .1; c.scale.set(w, h * (1 - i * .18), w); c.position.set((i - 1) * .25, (down ? -1 : 1) * h * (1 - i * .18) / 2, (i % 2) * .2); if (down) c.rotation.x = Math.PI; g.add(c); }
  g.userData.own = [mat]; return g;
}
function makeFishSchool(n = 22) {
  const g = new THREE.Group(), geo = new THREE.ConeGeometry(.1, .4, 6); geo.rotateZ(-Math.PI / 2);
  const fish = new THREE.InstancedMesh(geo, std(0xffffff, .4, { emissive: 0x3b2a18, emissiveIntensity: .4 }), n);
  const off = [];
  for (let i = 0; i < n; i++) { off.push([(Math.random() - .5) * 3, (Math.random() - .5) * 1.6, (Math.random() - .5) * 1.5, Math.random() * 6]); fish.setColorAt(i, new THREE.Color([0xd4a574, 0xe8ddd0, 0xc4935a][i % 3])); }
  g.add(fish); g.userData = { fish, off, own: [] };
  g.userData.tick = (t) => { off.forEach((o, i) => { _m.compose(_p.set(o[0] + Math.sin(t * 2 + o[3]) * .2, o[1] + Math.sin(t * 3 + o[3]) * .15, o[2]), _q.identity(), _s.setScalar(1)); fish.setMatrixAt(i, _m); }); fish.instanceMatrix.needsUpdate = true; };
  return g;
}
function makeTurtle() {
  const g = new THREE.Group(), shell = std(0x6b6a40, .7), skinT = std(0xa89585, .7);
  const s = new THREE.Mesh(GEO.sphere, shell); s.scale.set(.9, .32, .7); g.add(s);
  const h = new THREE.Mesh(GEO.sphere, skinT); h.scale.setScalar(.22); h.position.set(.95, .02, 0); g.add(h);
  const fl = [];
  for (const [x, z] of [[.4, .6], [.4, -.6], [-.5, .5], [-.5, -.5]]) { const f = new THREE.Mesh(GEO.sphere, skinT); f.scale.set(.32, .05, .14); f.position.set(x, 0, z); g.add(f); fl.push(f); }
  g.userData.tick = (t) => fl.forEach((f, i) => (f.rotation.x = Math.sin(t * 3 + i) * .6));
  return g;
}
function makeWhale() {
  const g = new THREE.Group(), m = std(0x24343a, .8);
  const b = new THREE.Mesh(GEO.sphere, m); b.scale.set(6, 1.6, 1.7); g.add(b);
  const tail = new THREE.Group(); tail.position.set(-6, 0, 0); const t = new THREE.Mesh(GEO.sphere, m); t.scale.set(.5, .15, 1.8); tail.add(t); g.add(tail);
  const fin = new THREE.Mesh(GEO.sphere, m); fin.scale.set(1, .12, .5); fin.position.set(1.5, -1.1, 1.2); fin.rotation.x = .5; g.add(fin);
  const eye = new THREE.Mesh(GEO.sphere, std(0xe8ddd0, .3)); eye.scale.setScalar(.12); eye.position.set(4.6, .2, 1.3); g.add(eye);
  g.userData.tick = (t) => (tail.rotation.z = Math.sin(t * 1.2) * .3);
  return g;
}
function disposeGroup(g) {
  g.traverse((o) => {
    if (o.userData && o.userData.own) o.userData.own.forEach((m) => { if (m.map && m.map !== TEX.roots && !Object.values(TEX).includes(m.map)) m.map.dispose(); m.dispose(); });
    if (o.geometry && !SHARED_GEO.has(o.geometry)) o.geometry.dispose();
  });
}

// ---------------------------------------------------------------- scenes
const world = new THREE.Group(); scene.add(world);
const menu = new THREE.Group(); scene.add(menu);
let backdrop = null, bdKey = "";
function setBackdrop(co, len) {
  if (backdrop) { scene.remove(backdrop); disposeGroup(backdrop); }
  bdKey = co.key + ":" + len;
  backdrop = new THREE.Group(); scene.add(backdrop);
  scene.background = skyTexture(co.sky); scene.fog = new THREE.Fog(co.fog, 24, 105);
  M.groundSide.color.set(co.ground); M.groundTop.color.set(co.top);
  co.hills.forEach((hc, i) => backdrop.add(mountainStrip(-120, len + 220, -34 - i * 18, (co.snow ? 7 : 3) + i * 3, (co.snow ? 13 : 8) + i * 3, hc, co.snow, (co.idx + 2) * 10 + i + 1)));
  backdrop.add(treeBelt(co, -60, len + 80));
  sky.visible = true;
  fireflies.material.uniforms.uColor.value.set(1.6, 1.15, .65); fireflies.material.uniforms.uY.value = 0;
}
let menuBodie = null, menuKip = null, menuSage = null, menuEmber = null;
function buildMenu() {
  menu.clear();
  menu.add(makeGround(-40, 40, 6));
  menuBodie = buildBodie({ sit: true, skin: profile.skin, acc: profile.acc }); menu.add(menuBodie.root);
  menuKip = buildKip(); menuKip.root.position.set(2.3, 2.1, -1.2); menuKip.root.rotation.y = -1.2; menu.add(menuKip.root);
  menuSage = buildSage(); menuSage.root.position.set(2.1, 0, -.6); menuSage.root.rotation.y = -.5; menu.add(menuSage.root);
  menuEmber = buildEmber(); menuEmber.root.position.set(2.0, 0, .3); menuEmber.root.rotation.y = -.7; menu.add(menuEmber.root);
}
function rebuildMenuBodie() { if (!menuBodie) return; menu.remove(menuBodie.root); menuBodie = buildBodie({ sit: true, skin: profile.skin, acc: profile.acc }); menu.add(menuBodie.root); }

// ---------------------------------------------------------------- DOM labels (always inside the action band)
const _v = new THREE.Vector3();
function toScreen(x, y, z) { _v.set(x, y, z).project(camera); return { x: (_v.x * .5 + .5) * vw, y: (-_v.y * .5 + .5) * vh, ok: _v.z < 1 }; }
let floatStack = [];
function floater(text, x, y, z, color) {
  const p = toScreen(x, y, z); if (!p.ok) return;
  const now = performance.now(); floatStack = floatStack.filter((f) => now - f < 600);
  const top = Math.min(LAY.actBot - 24, Math.max(LAY.actTop + 54, p.y) + floatStack.length * 20); floatStack.push(now);
  const el = document.createElement("div"); el.className = "float"; el.textContent = text; if (color) el.style.color = color;
  el.style.transform = `translate(${Math.max(70, Math.min(vw - 70, p.x)).toFixed(1)}px,${top.toFixed(1)}px)`; fx.appendChild(el); setTimeout(() => el.remove(), 1150);
}
// mode "above": centred over the point; "side": to the right of the point. Hidden if it would leave the action band.
function placeLabel(el, x, y, z, mode = "above") {
  const p = toScreen(x, y, z), h = el.offsetHeight || 24, w = el.offsetWidth || 120;
  let vis = p.ok && p.x > -40 && p.x < vw + 40, left = mode === "side" ? p.x + 26 : p.x, top = mode === "side" ? p.y - h / 2 : p.y - h - 6;
  if (top < LAY.actTop + 4) { if (mode === "side") top = LAY.actTop + 4; else vis = false; }
  if (top + h > LAY.actBot) top = LAY.actBot - h;
  if (mode === "side") left = Math.min(left, vw - w - 8);
  el.style.transform = `translate(${left.toFixed(1)}px,${top.toFixed(1)}px)`; el.style.visibility = vis ? "visible" : "hidden";
}
const calloutEl = $("callout"), calloutT = $("callout-t"), calloutS = $("callout-s");
let calloutKey = "", calloutAnim = "";
// c.anim names the instruction; the pop-in animation only replays when it changes (not when a countdown number ticks).
function showCallout(c) {
  const k = c ? c.text + "|" + (c.sub || "") + "|" + (c.kind || "") : "";
  if (k === calloutKey) return; calloutKey = k;
  if (!c) { calloutEl.hidden = true; calloutAnim = ""; return; }
  const ak = c.anim || c.text, fresh = ak !== calloutAnim; calloutAnim = ak;
  calloutT.textContent = c.text || ""; calloutS.textContent = c.sub || "";
  calloutEl.className = "cue-zone callout " + (c.kind || "") + (fresh ? " in" : "");
  calloutEl.hidden = false;
}
let G = null; // current race
function event(text, sub, kind, dur = 1.1) { if (G) G.event = { text, sub, kind, until: G.t + dur }; }

// ---------------------------------------------------------------- race HUD
const hudEl = $("hud");
let hudParts = [], trackEls = null;
function lungsHTML() { return `<div class="lungs"><img class="l-base" alt="" src="${LUNG}"><img class="l-fill" alt="" src="${LUNG}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"></circle></svg></div>`; }
function buildRaceHUD(n, withKip, withGhost) {
  hudEl.innerHTML = ""; hudParts = [];
  for (let i = 0; i < n; i++) {
    const d = document.createElement("div"); d.className = "hp" + (i === 1 ? " right" : "");
    d.innerHTML = `${lungsHTML()}<div class="hp-stats"><div class="hp-label">${n > 1 ? "PLAYER " + (i + 1) : "SHIELD"}</div><div class="hp-score">0</div><div class="hp-sub"><span class="s-seeds">0</span> SEEDS <span class="s-extra"></span></div></div>`;
    hudEl.appendChild(d);
    hudParts.push({ fill: d.querySelector(".l-fill"), ring: d.querySelector("circle"), lungs: d.querySelector(".lungs"), score: d.querySelector(".hp-score"), seeds: d.querySelector(".s-seeds"), extra: d.querySelector(".s-extra"), last: {} });
  }
  const tr = document.createElement("div"); tr.className = "track";
  const img = (cls, alt, src) => `<img class="mk ${cls}" alt="${alt}" ${src ? `src="${src}"` : ""}>`;
  tr.innerHTML = `<div class="t-line"><span class="t-end" title="The Great Tree"></span>${withGhost ? img("ghost", "Your best run", PORTRAIT.bodie) : ""}${withKip ? img("kip", "Kip", PORTRAIT.kip) : ""}${[...Array(n)].map((_, i) => img("p" + i, "Player " + (i + 1), PORTRAIT.bodie)).join("")}</div><div class="t-txt"></div>`;
  hudEl.appendChild(tr);
  trackEls = { kip: tr.querySelector(".mk.kip"), ghost: tr.querySelector(".mk.ghost"), p: [...tr.querySelectorAll(".mk.p0,.mk.p1")], txt: tr.querySelector(".t-txt"), lastTxt: "" };
}
function setIf(o, k, v, fn) { if (o.last[k] !== v) { o.last[k] = v; fn(v); } }
function updateRaceHUD() {
  G.players.forEach((P, i) => {
    const h = hudParts[i]; if (!h) return;
    const f = clamp01(P.breath / P.cap);
    setIf(h, "f", Math.round(f * 100), (v) => (h.fill.style.clipPath = `inset(${100 - v}% 0 0 0)`));
    const ring = P.holdT > 0 ? Math.min(1, P.holdT / 4) : 0;
    setIf(h, "r", Math.round(ring * 100), (v) => (h.ring.style.strokeDashoffset = String(289 * (1 - v / 100))));
    setIf(h, "low", (P.holdT > 0 && f < .25) || P.gasp > 0, (v) => h.lungs.classList.toggle("low", v));
    setIf(h, "box", ring >= 1, (v) => h.lungs.classList.toggle("box", v));
    setIf(h, "sup", P.charge > 0, (v) => h.lungs.classList.toggle("super", v));
    setIf(h, "sc", scoreOf(P), (v) => (h.score.textContent = String(v)));
    setIf(h, "se", P.seeds + P.gold * 5, (v) => (h.seeds.textContent = String(v)));
    const mult = comboMult(P), bits = [];
    if (P.flow > 0) bits.push(`<span class="hot">FLOW</span>`); else if (mult > 1) bits.push(`<span class="hot">x${mult}</span>`);
    if (P.charge > 0) bits.push(`<span class="hot">SHIELD ${Math.round((1 + P.charge) * 100)}%</span>`);
    if (G.co.sigh) bits.push(P.sigh >= 1 ? `<span class="ready">GUST READY</span>` : `GUST ${Math.round(P.sigh * 100)}%`);
    setIf(h, "ex", bits.join(" · "), (v) => (h.extra.innerHTML = v ? "· " + v : ""));
  });
  const pct = (x) => (clamp01(x / G.finish) * 100).toFixed(1) + "%";
  G.players.forEach((P, i) => { if (trackEls.p[i]) trackEls.p[i].style.left = pct(P.x); });
  if (trackEls.ghost && G.ghost) trackEls.ghost.style.left = pct(G.ghost.x);
  let txt;
  if (G.kip) {
    trackEls.kip.style.left = pct(G.kip.x);
    const lead = Math.round(G.players[0].x - G.kip.x), left = Math.max(0, Math.round(G.finish - G.players[0].x));
    txt = (lead >= 0 ? `<span class="lead">AHEAD OF KIP BY ${lead}m</span>` : `<span class="trail">KIP LEADS BY ${-lead}m</span>`) + `<br><span class="dim">${left}m TO GO</span>`;
    if (G.ghost) { const gd = Math.round(G.players[0].x - G.ghost.x); txt += ` <span class="${gd >= 0 ? "gold" : "dim"}">· BEST RUN ${gd >= 0 ? "+" : ""}${gd}m</span>`; }
  } else {
    const [a, b] = G.players, lead = Math.round(a.x - b.x), left = Math.max(0, Math.round(G.finish - Math.max(a.x, b.x)));
    txt = (lead === 0 ? `<span class="dim">NECK AND NECK</span>` : `<span class="lead">PLAYER ${lead > 0 ? 1 : 2} LEADS BY ${Math.abs(lead)}m</span>`) + `<br><span class="dim">${left}m TO GO</span>`;
  }
  if (txt !== trackEls.lastTxt) { trackEls.lastTxt = txt; trackEls.txt.innerHTML = txt; }
}

// ---------------------------------------------------------------- race setup and course generation
const BASE = 7.2, GRAV = 30, JUMP = 11.6, FIG = .8;
let state = "menu", mode = "race", raceMode = "kip", courseIdx = 0, menuView = "title";
let menuHold = false, menuFill = .4, menuIdleT = 0;
function makePlayer(i, z) {
  const skinKey = i === 0 ? profile.skin : (profile.skin === "clay" ? "golden" : "clay");
  const fig = buildBodie({ skin: skinKey, acc: i === 0 ? profile.acc : [] });
  fig.root.scale.setScalar(FIG); fig.root.rotation.y = Math.PI / 2 - .65; fig.head.rotation.y = -.35; world.add(fig.root);
  const shadow = new THREE.Mesh(GEO.plane, M.shadow); shadow.rotation.x = -Math.PI / 2; shadow.scale.setScalar(1.5); world.add(shadow);
  const cap = 5 + profile.up.lungs;
  return { i, z, fig, shadow, x: 0, y: 0, vy: 0, v: 0, onGround: true, coyote: 0, jumps: 0, inWater: false, dive: 0,
    breath: cap, cap, baseCap: cap, holdT: 0, gasp: 0, slow: 0, slowF: 1, flow: 0, frozen: 0, fillVis: .4, held: false, edges: 0, wasHolding: false,
    smogT: 0, inflate: 0, dizzy: 0, red: 0, aura: profile.up.aura ? 1 : 0, raise: 0, boost: 0, lastTap: -9, sigh: 1, sighT: 0, charge: 0, maxCharge: 0, chokeT: .4, inThin: false, thinZonePops: 0,
    seeds: 0, gold: 0, calm: 0, boxes: 0, clutch: 0, pops: 0, pffts: 0, bonks: 0, falls: 0, combo: 0, bestCombo: 0, points: 0, dives: 0, storms: 0, sighs: 0, thinPops: 0, thinCleared: 0, rings: 0, ringChain: 0, lastRingT: -9,
    finishT: 0, lastHazardCue: null, lastVoiceText: null };
}
function newRace(m, co) {
  clearWorld();
  const duel = m === "duel";
  if (bdKey !== co.key + ":" + co.len) setBackdrop(co, co.len);
  G = { mode: m, co, idx: co.idx, t: 0, finish: co.len, depth: duel ? 5 : 3.2, lanes: duel ? [1.2, -1.2] : [0], segs: [], ents: [], zones: [], genX: -30, players: [], kip: null,
    phase: "countdown", cd: 0, over: false, result: null, endT: 0, timeScale: 1, hintCount: {}, event: null, shake: 0, perf: { acc: 0, n: 0 },
    rng: mulberry(co.seed), lastStormX: -99, rec: { xs: [], ys: [], acc: 0 }, ghost: null, pendingGust: null, shown: false };
  G.lanes.forEach((z, i) => G.players.push(makePlayer(i, z)));
  if (!duel) {
    const fig = buildKip(); fig.root.scale.setScalar(.95); fig.root.rotation.y = -.35; world.add(fig.root);
    G.kip = { x: -1.5, y: 2.9, z: -2.2, mood: "cruise", t: 2, sayT: 0, fig };
    const gd = loadGhost(co.key);
    if (gd) { const fig2 = buildGhost(); fig2.root.scale.setScalar(FIG); fig2.root.rotation.y = Math.PI / 2 - .65; world.add(fig2.root); G.ghost = { data: gd, fig: fig2, x: 0, y: 0 }; }
  }
  const tree = buildGreatTree(); tree.position.set(co.len + 9, 0, -5.5); world.add(tree); G.tree = tree;
  const strip = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ color: 0xf3d7a8, toneMapped: false })); strip.rotation.x = -Math.PI / 2; strip.scale.set(.4, G.depth + .3, 1); strip.position.set(co.len, .03, 0); world.add(strip);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 3, 10), std(0xe8ddd0, .5)); post.position.set(co.len, 1.5, side * (G.depth / 2 + .1)); world.add(post);
    const gl = new THREE.Sprite(M.goldHalo); gl.scale.setScalar(1.4); gl.position.set(co.len, 3.1, side * (G.depth / 2 + .1)); world.add(gl);
  }
  const ember = buildEmber(); ember.root.position.set(-4.5, 0, -1.6); ember.root.rotation.y = .4; world.add(ember.root); G.ember = ember;
  genWorld(70);
}
function clearWorld() {
  world.children.slice().forEach((c) => { world.remove(c); disposeGroup(c); });
  fx.querySelectorAll(".tag,.say,.float").forEach((e) => e.remove());
  kipSayEl = null; G = null; confetti.visible = false;
}
function addSeg(x0, x1, water) { const mesh = water ? makeWater(x0, x1, G.depth) : makeGround(x0, x1, G.depth); world.add(mesh); G.segs.push({ x0, x1, water, mesh }); }
function addEnt(type, o, mesh) {
  const e = { type, x: o.x, y: o.y || 0, lane: o.lane ?? -1, r: o.r || 0, w: o.w || 0, h: o.h || 0, gold: o.gold, mesh, hit: [false, false], dead: [false, false], passed: [false, false], t: Math.random() * 6 };
  if (mesh) { mesh.position.set(e.x, e.y, o.lane >= 0 ? G.lanes[o.lane] : 0); world.add(mesh); }
  G.ents.push(e); return e;
}
function laneEach(fn) { G.lanes.forEach((z, i) => fn(i, z)); }
function seedAt(x, y, gold) { laneEach((i) => addEnt("seed", { x, y, lane: i, gold }, makeSeed(gold))); }
function seedArc(x0, x1, yBase, h) { const n = Math.max(3, Math.floor((x1 - x0) / .9)); const gold = G.rng() < .06 ? Math.floor(n / 2) : -1; for (let k = 0; k < n; k++) { const f = k / (n - 1); seedAt(x0 + f * (x1 - x0), yBase + Math.sin(f * Math.PI) * h, k === gold); } }
function genWorld(toX) {
  const co = G.co, f = co.f, R = G.rng;
  while (G.genX < toX && G.genX < G.finish + 70) {
    const x = G.genX;
    if (x < 16 || x > G.finish - 18) { addSeg(x, x + 8, false); G.genX += 8; continue; }
    const r = R();
    if (r < f.lake) {
      const len = 16 + R() * 10; addSeg(x, x + len, true);
      for (let lx = x + 4.5; lx < x + len - 3; lx += 4.6 + R() * 2.2) { addEnt("log", { x: lx, y: SURF }, makeLog(G.depth)); seedAt(lx, DIVE + 1.1, R() < .1); }
      G.genX += len; addSeg(G.genX, G.genX + 7, false); G.genX += 7;
    } else if (r < f.lake + f.pits) {
      const gap = 2.2 + R() * (1.1 + Math.max(0, co.idx) * .25); seedArc(x - .6, x + gap + .6, 1.6, 2.1);
      G.genX += gap; const land = 8 + R() * 5; addSeg(G.genX, G.genX + land, false); G.genX += land;
    } else if (r < f.lake + f.pits + f.pads && x < G.finish - 70) {
      // power pad, then a long stretch of windy zone you must hold through
      const padLen = 7, thinLen = (co.key === "peaks" ? 33 : 26) + R() * 5, tail = 6, len = 3 + padLen + 2 + thinLen + tail;
      addSeg(x, x + len, false);
      const p0 = x + 3, t0 = p0 + padLen + 2;
      const pm = makePad(padLen, G.depth); pm.position.set(p0 + padLen / 2, 0, 0); world.add(pm);
      const tm = makeThin(thinLen, G.depth); tm.position.set(t0 + thinLen / 2, 0, 0); world.add(tm);
      G.zones.push({ type: "pad", x0: p0, x1: p0 + padLen, mesh: pm }, { type: "thin", x0: t0, x1: t0 + thinLen, mesh: tm });
      for (let sx = t0 + 1.5; sx < t0 + thinLen - 1; sx += 1.4) seedAt(sx, 1.2 + Math.sin(sx * .7) * .6, R() < .05);
      G.genX += len;
    } else if (r < f.lake + f.pits + f.pads + f.vents) {
      // updraft vent and a descending line of rhythm rings that only a held-breath glide can follow
      const len = 24; addSeg(x, x + len, false);
      const vx = x + 4; addEnt("vent", { x: vx, y: 0, r: .7 }, makeVent());
      for (let k = 0; k < 5; k++) { const rx = vx + 3.8 + k * 2.4, ry = 5.3 - k * 1.08; addEnt("ring", { x: rx, y: ry, r: .7 }, makeRingMesh()); }
      G.genX += len;
    } else {
      const len = 14 + R() * 10; addSeg(x, x + len, false);
      for (let fx = x + 3 + R() * 2; fx < x + len - 3; fx += 4.6 + R() * 2.6) {
        const q = R();
        if (q < f.rocks) { const w = .8 + R() * .35, h = .6 + R() * .25; laneEach((i) => addEnt("rock", { x: fx, y: 0, lane: i, w, h }, makeRock(w, h, G.depth))); seedArc(fx - 1.6, fx + 1.8, 1.2, 1.7); }
        else if (q < f.rocks + f.storms && fx - G.lastStormX > 28) { G.lastStormX = fx; addEnt("storm", { x: fx, y: 1.5, r: 1.3 }, makeCloud(1.3, G.mode === "duel" ? 2.3 : 1, 0x3f3644, true)); }
        else if (q < f.rocks + f.storms + f.clouds) { const low = R() < .62, rr = low ? 1.05 : .95; addEnt("cloud", { x: fx, y: low ? 1.25 : 3.7, r: rr }, makeCloud(rr, G.mode === "duel" ? 2.3 : 1)); if (low) seedAt(fx, 1.2, R() < .12); }
        else if (q < f.rocks + f.storms + f.clouds + f.bubbles) laneEach((i) => addEnt("bubble", { x: fx, y: 1.3 + R() * 1.5, lane: i }, makeBubble()));
        else for (let k = -1; k <= 1; k++) seedAt(fx + k * .9, 1.1, false);
      }
      G.genX += len;
    }
  }
}
function segAt(x) { for (const s of G.segs) if (x >= s.x0 && x <= s.x1) return s; return null; }
function zoneAt(x, type) { for (const z of G.zones) if (z.type === type && x >= z.x0 && x <= z.x1) return z; return null; }

// ---------------------------------------------------------------- race gameplay
const comboMult = (P) => 1 + Math.min(4, Math.floor(P.combo / 6));
const scoreOf = (P) => Math.floor(Math.min(P.x, G.finish)) + P.points;
function hurt(P, f, dur) { P.slowF = Math.min(P.slow > 0 ? P.slowF : 1, f); P.slow = Math.max(P.slow, dur); P.combo = 0; }
const bodyY = (P) => P.y + 1.1;
function jump(P, v, dbl) { P.vy = v; P.onGround = false; P.coyote = 0; P.jumps = dbl ? 2 : 1; Sound.play("jump"); emit({ x: P.x, y: P.y + .1, z: P.z, n: dbl ? 10 : 6, speed: 2, color: dbl ? 0x9aa06a : 0xa89585, size: .18, grav: 3, life: .5 }); }
function voiceFor(P) { return G.players.length === 1 || P.i === 0; }
function blowout(P) {
  P.gasp = 1.1; P.holdT = 0; P.pffts++; P.red = 0; hurt(P, .55, 1.1); P.dive = 0; P.charge = 0; P.cap = P.baseCap; P.breath = Math.min(P.breath, P.cap);
  Sound.play("pfft"); Sound.danger(0);
  emit({ x: P.x + .6, y: bodyY(P) + .6, z: P.z, n: 26, speed: 6, vx: 4, color: 0xe8ddd0, size: .35, grav: 0, life: .7, grow: 2 });
  event("PFFFT!", "Shield empty. Release the button to recharge", "warn", 1.4);
  if (voiceFor(P)) Voice.say("Release the button to recharge.", true);
}
function pop(P, zap) {
  P.inflate = 0; P.smogT = 0; P.dizzy = .9; P.pops++; hurt(P, .5, 1.3); P.breath = Math.max(0, P.breath - 1);
  Sound.play(zap ? "zap" : "pop");
  emit({ x: P.x, y: bodyY(P), z: P.z, n: 30, speed: 5, color: zap ? 0x6a5a70 : 0x8f8580, size: .5, grav: -.5, life: 1, grow: 1.5 });
  emit({ x: P.x, y: bodyY(P) + .4, z: P.z, n: 12, speed: 4, color: 0xf3d7a8, size: .2, grav: 5, life: .6, add: true });
  if (zap) { event("ZAP!", "Double tap for a gust before a storm", "warn", 1.5); if (voiceFor(P)) Voice.say("Double tap for a gust!", true); }
  else { event("POP!", "Use the screen shield through a cloud", "warn", 1.5); if (voiceFor(P)) Voice.say("Press the button for your shield!", true); }
  G.shake = .35;
}
function doSigh(P) {
  P.sigh = 0; P.sighs++; P.sighT = 1.3; Sound.play("sigh");
  G.pendingGust = { P, at: G.t + .35 };
  event("GUST!", "Two taps create a screen gust", "good", 1.1);
}
function gust(P) {
  let n = 0;
  for (const e of G.ents) {
    if ((e.type === "storm" || e.type === "cloud") && !e.cleared && !e.calmed && e.x > P.x - 1 && e.x < P.x + 12) {
      e.cleared = true; n++;
      if (e.type === "storm") { P.storms++; P.points += 40; } else P.points += 15;
      emit({ x: e.x, y: e.y, z: 0, n: 22, speed: 4, vx: 3, color: 0xe8ddd0, size: .35, grav: -.3, life: .9, grow: 1.2 });
    }
  }
  emit({ x: P.x + 1, y: bodyY(P) + .5, z: P.z, n: 30, speed: 3, vx: 9, color: 0xe8ddd0, size: .25, grav: 0, life: .8, add: true });
  P.boost = Math.max(P.boost, .8); P.slow = 0; P.slowF = 1;
  if (n) floater(`CLEARED ${n}`, P.x + 2, bodyY(P) + 1.4, P.z, "#F3D7A8");
}
function chargeTap(P) {
  const step = profile.up.charge ? .08 : .06;
  P.charge = Math.min(.8, P.charge + step); P.maxCharge = Math.max(P.maxCharge, P.charge);
  P.cap = P.baseCap * (1 + P.charge); P.breath = P.cap; P.vy = 3.2; P.onGround = false;
  Sound.play("charge", Math.round(P.charge / step));
  emit({ x: P.x, y: bodyY(P), z: P.z, n: 5, speed: 2, color: 0xf3d7a8, size: .2, grav: 0, life: .4, add: true });
}
function updatePlayer(P, dt) {
  const co = G.co, racing = G.phase === "race" && !G.over;
  const pad = racing ? zoneAt(P.x, "pad") : null, thin = racing ? zoneAt(P.x, "thin") : null;
  while (P.edges > 0) { // every tap counts, even two in one slow frame (that's how a double-tap sigh works)
    P.edges--;
    if (racing && P.frozen <= 0 && P.dizzy <= 0) {
      const quick = G.t - P.lastTap < .32;
      if (pad && !P.inWater) chargeTap(P);
      else if (co.sigh && quick && P.sigh >= 1 && !P.inWater) doSigh(P);
      else if (!P.inWater) { if (P.onGround || P.coyote > 0) jump(P, JUMP); else if (profile.up.spring && P.jumps < 2 && !(co.sigh && quick)) jump(P, JUMP * .85, true); }
    }
    P.lastTap = G.t;
  }
  const holding = racing && P.held && P.gasp <= 0 && P.frozen <= 0 && !pad;
  if (holding && !P.wasHolding) Sound.play("inhale");
  if (!holding && P.wasHolding) {
    if (P.gasp <= 0) {
      if (P.holdT >= 4) { P.boxes++; P.points += 100; P.flow = 3.2; Sound.play("box"); Sound.play("flow"); event("SHIELD READY!", "Flow: +100 and faster legs", "good", 1.4); if (voiceFor(P)) Voice.say("Shield release! Flow!", true); emit({ x: P.x, y: bodyY(P), z: P.z, n: 30, speed: 5, color: 0xf3d7a8, size: .25, grav: 0, life: .9, add: true }); }
      else if (P.holdT > .4 && P.breath / P.cap < .15) { P.clutch++; P.points += 50; Sound.play("clutch"); floater("TIMED RELEASE +50", P.x, bodyY(P) + 1.4, P.z, "#F3D7A8"); }
      Sound.play("exhale");
      emit({ x: P.x + .5, y: bodyY(P) + .7, z: P.z, n: 8, speed: 1.6, vx: 2, color: 0xe8ddd0, size: .22, grav: -.3, life: .6, grow: 1.5 });
    }
    P.holdT = 0;
    if (P.charge > 0 && !pad) { P.charge = 0; P.cap = P.baseCap; P.breath = Math.min(P.breath, P.cap); }
  }
  P.wasHolding = holding;
  if (holding) { P.breath -= dt; P.holdT += dt; if (P.breath <= 0) { P.breath = 0; blowout(P); } }
  else if (racing && !pad) P.breath = Math.min(P.cap, P.breath + co.refill * dt);
  const frac = P.breath / P.cap;
  P.red = holding && frac < .3 ? (1 - frac / .3) * .55 : Math.max(0, P.red - dt * 2);
  P.gasp = Math.max(0, P.gasp - dt); P.flow = Math.max(0, P.flow - dt); P.dizzy = Math.max(0, P.dizzy - dt); P.boost = Math.max(0, P.boost - dt); P.sighT = Math.max(0, P.sighT - dt);
  if (co.sigh) P.sigh = Math.min(1, P.sigh + dt / (profile.up.sigh ? 2 : 3));
  if (P.smogT > 0) { P.smogT -= dt; P.inflate = Math.min(1, P.inflate + dt * 2.2); if (P.smogT <= 0) pop(P); } else P.inflate = Math.max(0, P.inflate - dt * 6);
  // windy zone: hold all the way through or keep coughing
  if (thin) {
    if (!P.inThin) { P.inThin = true; P.thinZonePops = 0; }
    if (!holding) { P.chokeT -= dt; if (P.chokeT <= 0) { P.chokeT = .7; P.thinPops++; P.thinZonePops++; hurt(P, .55, .6); Sound.play("cough"); emit({ x: P.x + .4, y: bodyY(P) + .5, z: P.z, n: 10, speed: 1.5, color: 0x8a8079, size: .35, grav: -.3, life: .6, grow: 1 }); if (voiceFor(P) && P.thinZonePops === 1) Voice.say("Press the button!", true); } }
    else { P.chokeT = .25; P.points += dt * 12; }
  } else if (P.inThin) {
    P.inThin = false;
    if (P.thinZonePops === 0) { P.thinCleared++; P.points += 100; floater("WINDY ZONE CLEARED +100", P.x, bodyY(P) + 1.5, P.z, "#F3D7A8"); Sound.play("calm"); }
  }
  // speed
  if (P.slow > 0) { P.slow -= dt; if (P.slow <= 0) P.slowF = 1; }
  let spd = BASE * (P.flow > 0 ? 1.3 : 1) * (P.boost > 0 ? 1.15 : 1) * (P.slow > 0 ? P.slowF : 1) * (P.inWater && !holding ? .8 : 1) * (pad ? .55 : 1);
  if (P.smogT > 0) spd *= .7;
  if (P.frozen > 0) { P.frozen -= dt; spd = 0; }
  if (G.phase === "countdown") spd = 0;
  if (G.over) P.v *= Math.max(0, 1 - dt * 2.2); else P.v = spd;
  P.x += P.v * dt;
  if (!P.finishT && P.x >= G.finish && G.phase === "race") P.finishT = G.t;
  // vertical
  const seg = segAt(P.x);
  if (P.inWater) {
    if (!seg || !seg.water) { P.inWater = false; P.y = -.3; P.vy = 9.5; P.onGround = false; P.dive = 0; Sound.play("splash"); emit({ x: P.x, y: SURF, z: P.z, n: 14, speed: 3, up: 3, color: 0xb6cdc8, size: .2, life: .6 }); }
    else {
      P.dive += ((holding ? 1 : 0) - P.dive) * Math.min(1, dt * 5);
      const target = SWIM + (DIVE - SWIM) * P.dive; P.y += (target - P.y) * Math.min(1, dt * 8); P.vy = 0;
      if (P.dive > .5 && Math.random() < dt * 8) emit({ x: P.x + .3, y: bodyY(P) + .8, z: P.z, n: 1, speed: .3, up: 1.6, color: 0xcfe2de, size: .12, grav: -1, life: 1.2 });
    }
  }
  if (!P.inWater) {
    const glide = holding && P.vy < 0;
    P.vy -= GRAV * (glide ? .3 : 1) * dt; if (glide && P.vy < -3.4) P.vy = -3.4;
    const prevY = P.y; P.y += P.vy * dt;
    const ground = seg && !seg.water;
    if (ground && P.y <= 0 && prevY >= -.2) {
      if (!P.onGround && P.vy < -8) { Sound.play("land"); P.fig.press(); emit({ x: P.x, y: .05, z: P.z, n: 6, speed: 1.5, color: 0xa89585, size: .18, grav: 2, life: .4 }); }
      P.y = 0; P.vy = 0; P.onGround = true; P.jumps = 0; P.coyote = .1;
    } else { if (P.onGround) P.coyote = .1; P.onGround = false; P.coyote = Math.max(0, P.coyote - dt); }
    if (seg && seg.water && P.y <= SWIM + .3) { P.inWater = true; P.vy = 0; P.dive = 0; Sound.play("splash"); emit({ x: P.x, y: SURF, z: P.z, n: 18, speed: 3.5, up: 4, color: 0xb6cdc8, size: .22, life: .7 }); }
    if (P.y < -6) {
      P.falls++; P.combo = 0; let nx = P.x; for (const s of G.segs) if (!s.water && s.x0 > P.x) { nx = s.x0 + 1; break; }
      P.x = nx; P.y = 3; P.vy = 0; P.frozen = .8; Sound.play("bonk"); event("WHOOPS!", "Jump the gaps, or hold to float across", "warn", 1.2);
    }
  }
  if (!racing) return holding;
  // collisions
  const by = bodyY(P), hy = by + .78;
  for (const e of G.ents) {
    if (e.lane >= 0 && e.lane !== P.i) continue;
    if (e.lane >= 0 ? e.dead[0] : e.dead[P.i]) continue;
    const dx = e.x - P.x; if (dx < -3 || dx > 3) continue;
    if (e.type === "seed") {
      if (profile.up.magnet || P.flow > 0) { const d = Math.hypot(dx, e.y - by); if (d < 2.8) { e.x -= dx * Math.min(1, dt * 9); e.y += (by - e.y) * Math.min(1, dt * 9); e.mesh.position.x = e.x; } }
      if (Math.hypot(e.x - P.x, e.y - by) < .85 || Math.hypot(e.x - P.x, e.y - hy) < .6) {
        e.dead[0] = true; world.remove(e.mesh); P.combo++; P.bestCombo = Math.max(P.bestCombo, P.combo);
        const mult = comboMult(P);
        if (e.gold) { P.gold++; P.points += 50 * mult; Sound.play("gold"); floater("GOLDEN SEED +" + 50 * mult, e.x, e.y + .6, P.z, "#F3D7A8"); }
        else { P.seeds++; P.points += 10 * mult; Sound.play("seed", Math.min(10, P.combo % 11)); if (mult > 1 && P.combo % 6 === 0) floater("COMBO x" + mult, e.x, e.y + .7, P.z, "#F3D7A8"); }
        emit({ x: e.x, y: e.y, z: P.z, n: 6, speed: 2, color: 0xf3d7a8, size: .16, grav: 1, life: .4, add: true });
      }
    } else if (e.type === "rock") {
      if (!e.hit[0] && Math.abs(dx) < e.w / 2 + .35 && P.y < e.h - .05 && !P.inWater) { e.hit[0] = true; P.bonks++; hurt(P, .5, .9); P.vy = 6; P.onGround = false; G.shake = .25; Sound.play("bonk"); floater("OOF!", P.x, by + 1.3, P.z, "#E07A5A"); }
    } else if (e.type === "log") {
      if (!e.hit[P.i] && P.inWater && Math.abs(dx) < .85 && P.dive < .45) { e.hit[P.i] = true; P.bonks++; hurt(P, .45, 1); G.shake = .25; Sound.play("bonk"); event("BONK!", "Use the button to clear the obstacle", "warn", 1.1); }
      if (!e.passed[P.i] && dx < -.9) { e.passed[P.i] = true; if (!e.hit[P.i] && P.inWater) { P.dives++; floater("CLEAR", P.x, by + 1.2, P.z, "#8FB3AC"); } }
    } else if (e.type === "cloud" || e.type === "storm") {
      if (e.cleared || e.calmed) continue;
      if (!e.hit[P.i] && (Math.hypot(dx, e.y - by) < e.r + .55 || Math.hypot(dx, e.y - hy) < e.r + .35)) {
        e.hit[P.i] = true;
        if (e.type === "storm") pop(P, true);
        else if (holding) { e.calmed = true; P.calm++; P.points += 25; Sound.play("calm"); floater("CALM +25", P.x, by + 1.5, P.z); emit({ x: e.x, y: e.y, z: 0, n: 16, speed: 3, color: 0xe8ddd0, size: .3, grav: -.5, life: .8, add: true }); }
        else if (P.aura > 0) { P.aura = 0; e.calmed = true; floater("CALM AURA SAVED YOU", P.x, by + 1.5, P.z, "#9AA06A"); Sound.play("calm"); }
        else { P.smogT = .55; Sound.play("smog"); emit({ x: P.x + .5, y: by + .5, z: P.z, n: 14, speed: 1.5, vx: -3, color: 0x7d6f67, size: .4, grav: 0, life: .5, grow: 1 }); }
      }
    } else if (e.type === "bubble") {
      if (Math.hypot(dx, e.y - by) < 1) { e.dead[0] = true; world.remove(e.mesh); P.breath = Math.min(P.cap, P.breath + 2.5); P.gasp = 0; Sound.play("bubble"); floater("+SHIELD", e.x, e.y + .6, P.z, "#CFE2DE"); emit({ x: e.x, y: e.y, z: P.z, n: 10, speed: 2.5, color: 0xcfe2de, size: .18, grav: 0, life: .5, add: true }); }
    } else if (e.type === "vent") {
      if (!e.hit[P.i] && P.onGround && Math.abs(dx) < .75) { e.hit[P.i] = true; P.vy = 16; P.onGround = false; Sound.play("vent"); emit({ x: e.x, y: .3, z: P.z, n: 20, speed: 2, up: 8, color: 0xf3d7a8, size: .22, grav: 2, life: .8, add: true }); floater("UPDRAFT!", P.x, by + 1.6, P.z, "#F3D7A8"); }
    } else if (e.type === "ring") {
      if (!e.hit[P.i] && Math.abs(dx) < .5 && Math.abs(by - e.y) < .8) {
        e.hit[P.i] = true; P.ringChain = G.t - P.lastRingT < 1.6 ? P.ringChain + 1 : 1; P.lastRingT = G.t; P.rings++; P.points += 50 * P.ringChain; P.boost = Math.max(P.boost, .6);
        e.mesh.material = M.ringDone; Sound.play("ring", P.ringChain); floater(`RING x${P.ringChain} +${50 * P.ringChain}`, e.x, e.y + 1, P.z, "#F3D7A8");
        emit({ x: e.x, y: e.y, z: P.z, n: 16, speed: 3, color: 0xf3d7a8, size: .2, grav: 0, life: .5, add: true });
      }
    }
  }
  return holding;
}
function figPose(P, holding, dt) {
  let fill = holding ? 1 : (P.gasp > 0 ? 0 : .35 + .15 * Math.sin(G.t * 5 + P.i));
  if (P.sighT > 0) { const k = 1.3 - P.sighT; fill = k < .3 ? lerp(.3, .8, k / .3) : k < .4 ? .72 : k < .55 ? 1 : lerp(1, 0, (k - .55) / .75); }
  const rate = P.sighT > 0 ? 16 : (fill > P.fillVis ? 7 : 3);
  P.fillVis += (fill - P.fillVis) * Math.min(1, dt * rate);
  const light = holding ? .3 + .7 * (P.breath / P.cap) : P.fillVis * .6;
  const mode = G.over && P.v < .4 ? "idle" : P.inWater ? "swim" : (P.onGround ? "run" : "air");
  const phase = holding ? "hold" : (P.smogT > 0 || P.gasp > .6 || (P.sighT > 0 && P.sighT < .75) ? "o" : null);
  P.fig.update(dt, P.fillVis, false, phase, light, holding ? .7 : (P.flow > 0 || P.charge > 0 ? .3 : 0));
  P.fig.pose(dt, { mode, rate: P.v / BASE, raise: P.raise, inflate: P.inflate, red: P.red, spin: P.dizzy > 0 ? P.dizzy : 0 });
  P.fig.root.position.set(P.x, P.y, P.z);
  if (G.over && P.winner) { P.fig.root.rotation.y += (.15 - P.fig.root.rotation.y) * Math.min(1, dt * 3); P.fig.head.rotation.y *= .9; }
  const seg = segAt(P.x);
  P.shadow.visible = !!(seg && !seg.water) && !P.inWater;
  if (P.shadow.visible) { const h = Math.max(0, P.y); P.shadow.position.set(P.x, .02, P.z); P.shadow.scale.setScalar(1.5 / (1 + h * .3)); P.shadow.material.opacity = .6 / (1 + h * .5); }
  if (P.flow > 0 && Math.random() < dt * 30) emit({ x: P.x - .4, y: bodyY(P), z: P.z, n: 1, speed: .4, vx: -2, color: 0xd4a574, size: .3, grav: 0, life: .5, add: true });
  if (holding && Math.random() < dt * 10) emit({ x: P.x, y: bodyY(P), z: P.z, n: 1, speed: .8, color: 0xd4a574, size: .15, grav: -.5, life: .6, add: true });
}
let kipSayEl = null;
function kipSay(text) {
  const K = G && G.kip; if (!K) return; K.sayT = 2.2;
  if (!kipSayEl) { kipSayEl = document.createElement("div"); kipSayEl.className = "say"; fx.appendChild(kipSayEl); }
  kipSayEl.textContent = "Kip: " + text;
  Voice.say(text.replace(/\.\.\./g, ","), false, "kip");
}
// A line from one of the cast at the top of a results card, spoken in their voice.
function quoteHTML(who, line) { return `<div class="speaker quote"><img alt="${CAST[who].name}" ${PORTRAIT[who] ? `src="${PORTRAIT[who]}"` : ""}><p><b>${CAST[who].name.split(" ")[0]}:</b> "${line}"</p></div>`; }
function quote(who, line) { Voice.say(line, true, who === "sage" ? "sage" : who); return quoteHTML(who, line); }
function updateKip(dt) {
  const K = G.kip, P = G.players[0];
  K.t -= dt;
  if (!G.over && G.phase === "race" && K.t <= 0) {
    const r = Math.random(), near = Math.abs(K.x - P.x) < 25;
    if (K.mood === "crash") { K.mood = "cruise"; K.t = 2 + Math.random() * 2; }
    else if (r < .28) { K.mood = "sprint"; K.t = 1.2 + Math.random() * .8; if (near) { Sound.play("caw"); kipSay(KIP_LINES[Math.floor(Math.random() * KIP_LINES.length)]); } }
    else if (r < .48) { K.mood = "crash"; K.t = .8 + Math.random() * .5; if (near) kipSay("Too... much... coffee..."); }
    else { K.mood = "cruise"; K.t = 1.5 + Math.random() * 1.5; }
  }
  if (G.phase === "race" && !G.over) {
    const gap = K.x - P.x, band = gap > 14 ? .9 : gap < -14 ? 1.12 : 1, ks = { cruise: 1, sprint: 1.32, crash: .3 }[K.mood];
    const before = K.x - P.x; K.x += BASE * G.co.kip * ks * band * dt; const after = K.x - P.x;
    if (before < 0 && after >= 0 && G.t > 2) { kipSay("Later, slowpoke!"); Sound.play("caw"); }
    if (before >= 0 && after < 0 && G.t > 2) kipSay("HEY! No fair!");
  }
  let y = 2.9 + Math.sin(G.t * 3) * .3 - (K.mood === "crash" ? 1 : 0), x = K.x;
  if (G.over && G.result && G.result.winner === -1) { const a = G.endT * 3; x = G.finish + 1.5 + Math.cos(a) * 2; y = 4 + Math.sin(a) * 1.3; K.fig.root.rotation.z = -a; }
  else K.fig.root.rotation.z = 0;
  K.y += (y - K.y) * Math.min(1, dt * 6);
  K.fig.root.position.set(x, K.y, K.z);
  K.fig.update(dt, G.t, G.over && G.result && G.result.winner === 0 ? "crash" : K.mood);
  K.sayT -= dt;
  if (kipSayEl) { if (K.sayT <= 0) { kipSayEl.remove(); kipSayEl = null; } else placeLabel(kipSayEl, x + .4, K.y + .2, K.z, "side"); }
}
function updateGhost() {
  const g = G.ghost; if (!g) return;
  const d = g.data, f = G.phase === "race" ? G.t * 10 : 0, i = Math.min(d.xs.length - 1, Math.floor(f)), j = Math.min(d.xs.length - 1, i + 1), k = f - Math.floor(f);
  g.x = lerp(d.xs[i], d.xs[j], k); g.y = Math.max(-1.5, lerp(d.ys[i], d.ys[j], k));
  g.fig.root.position.set(g.x, g.y, -.9);
  g.fig.pose(1 / 60, { mode: g.y > .05 ? "air" : (i >= d.xs.length - 1 ? "idle" : "run"), rate: 1 });
}
// What should the cue band say for this player? Priority: run-out warning, storms, windy zone, clouds and logs, pads, glide, hold states.
function cueFor(P) {
  if (G.over || G.phase !== "race") return null;
  const holding = P.wasHolding, v = Math.max(3, P.v || BASE), frac = P.breath / P.cap;
  if (holding && frac < .22) return { text: "RELEASE BUTTON", sub: "Release the button to recharge the shield", kind: "warn pulse", voice: "Release the button!", danger: 2 };
  const pad = zoneAt(P.x, "pad"), thinIn = zoneAt(P.x, "thin");
  if (pad) return { text: "TAP TAP TAP!", sub: `Pad taps · shield at ${Math.round((1 + P.charge) * 100)}%`, kind: "good pulse", voice: "Tap tap tap!", id: "pad" + pad.x0 };
  if (thinIn) return holding ? { text: "KEEP HOLDING", sub: `Windy zone · ${Math.ceil(thinIn.x1 - P.x)}m to clear`, kind: "good", danger: frac < .4 ? 1 : 0 } : { text: "PRESS THE BUTTON", sub: "Windy zone: press and hold all the way through", kind: "warn pulse", voice: "Press the button!" };
  let best = null;
  for (const z of G.zones) {
    const dist = z.x0 - P.x; if (dist < 0 || dist > v * 1.4) continue;
    if (!best || dist < best.dist) best = { z, dist, kind: z.type };
  }
  for (const e of G.ents) {
    if (e.hit[P.i] || e.cleared || e.calmed) continue;
    let r, ok = false;
    if (e.type === "storm") { r = e.r; ok = true; }
    else if (e.type === "cloud") { r = e.r; ok = !(e.y > 2.5 && P.onGround); }
    else if (e.type === "log") { r = .4; ok = P.inWater || !!(segAt(e.x - 1) && segAt(e.x - 1).water); }
    else if (e.type === "ring") { r = .5; ok = !P.onGround && e.x > P.x; }
    if (!ok) continue;
    const start = e.x - r - .6, end = e.x + r + .6, look = e.type === "storm" ? 1.7 : 1.35;
    if (end < P.x || start - P.x > v * look) continue;
    const dist = start - P.x;
    if (!best || dist < best.dist) best = { e, dist, kind: e.type, start };
  }
  if (best) {
    const k = best.kind, inside = best.dist <= 0;
    if (k === "storm") return P.sigh >= 1 ? { text: "DOUBLE TAP FOR A GUST", sub: "Two quick taps blow the storm away", kind: "pulse", voice: "Double tap! Gust!", id: best.e } : { text: "GUST RECHARGING", sub: `Storm ahead · gust ready in ${Math.ceil((1 - P.sigh) * (profile.up.sigh ? 2 : 3))}s`, kind: "warn" };
    if (k === "pad") return { text: "POWER PAD AHEAD", sub: "Tap the pad to charge the shield", kind: "good", voice: "Power pad!", id: "padAhead" + best.z.x0 };
    if (k === "thin") return holding ? { text: "HOLDING", sub: "Windy zone next. Keep it held", kind: "good" } : { text: "PRESS THE BUTTON", sub: "Windy zone ahead: hold all the way through", kind: "pulse", voice: "Press the button!", id: best.z };
    if (k === "ring") return holding ? { text: "GLIDING", sub: "Keep holding to float through the rings", kind: "good" } : { text: "HOLD TO GLIDE!", sub: "Press the button to float through the rings", kind: "pulse", voice: "Hold to glide!", id: best.e };
    const isLog = k === "log";
    if (!holding) return { text: "PRESS THE BUTTON", sub: isLog ? "Press for your screen shield" : "Worry Cloud ahead. Press and hold", kind: "pulse", voice: isLog ? "Press for the shield!" : "Press the button!", id: best.e };
    return { text: inside ? "KEEP HOLDING" : "HOLDING", sub: isLog ? "Stay under..." : "Right through the smog", kind: "good", danger: frac < .4 ? 1 : 0 };
  }
  if (holding) {
    const need = 4 - P.holdT;
    if (need > 0 && P.breath > need + .25) return { text: "SHIELD CHARGE IN " + need.toFixed(1), sub: "Keep the button pressed, or release to recharge", kind: "good", anim: "boxcd" };
    if (need > 0) return { text: "RELEASE BUTTON", sub: "Release to recharge the screen shield", kind: "", voice: "Release button" };
    return { text: "LET GO FOR FLOW!", sub: "Shield release ready", kind: "good pulse" };
  }
  return null;
}
function updateCues() {
  let c = null, danger = 0;
  if (G.phase === "race" && !G.over) {
    for (const P of G.players) {
      const k = cueFor(P);
      if (k) { danger = Math.max(danger, k.danger || 0); const urgent = (k.kind || "").includes("pulse") || (k.kind || "").includes("warn"); if (!c || (urgent && !(c.kind || "").includes("warn"))) c = G.players.length > 1 ? { ...k, sub: "P" + (P.i + 1) + " · " + k.sub } : k; }
      if (k && k.id && P.lastHazardCue !== k.id) { P.lastHazardCue = k.id; if (k.voice) { Sound.play("alarm"); if (voiceFor(P)) Voice.say(k.voice); } }
      else if (k && k.voice && !k.id && k.text !== P.lastVoiceText && voiceFor(P)) { if (k.text !== "RELEASE BUTTON" || P.holdT > 1.5) Voice.say(k.voice); }
      P.lastVoiceText = k ? k.text : null;
    }
  }
  Sound.danger(danger);
  if (G.event && G.t < G.event.until) showCallout(G.event); else showCallout(c);
}
// Tutorial tags only on the first course, only for rocks, and never while the cue band is busy with something else.
function updateHints() {
  for (const e of G.ents) {
    if (e.tag === undefined && e.type === "rock" && e.lane <= 0 && G.idx === 0 && G.mode === "kip") {
      const c = G.hintCount.rock || 0;
      if (e.x - G.players[0].x < 24) { if (c < 3) { G.hintCount.rock = c + 1; e.tag = document.createElement("div"); e.tag.className = "tag"; e.tag.textContent = "TAP TO JUMP"; fx.appendChild(e.tag); } else e.tag = null; }
    }
    if (e.tag) {
      if (e.x < G.players[0].x - 1 || e.hit[0]) { e.tag.remove(); e.tag = null; continue; }
      placeLabel(e.tag, e.x, e.h + .7, e.lane >= 0 ? G.lanes[e.lane] : 0, "above");
    }
  }
}
function updateEnts(dt) {
  for (const e of G.ents) {
    e.t += dt; if (!e.mesh) continue;
    if (e.type === "seed") { e.mesh.rotation.y += dt * 3; e.mesh.position.y = e.y + Math.sin(e.t * 3) * .08; }
    else if (e.type === "bubble") e.mesh.position.y = e.y + Math.sin(e.t * 2.5) * .25;
    else if (e.type === "log") e.mesh.position.y = SURF + Math.sin(e.t * 1.6) * .05;
    else if (e.type === "ring") { e.mesh.rotation.x = Math.sin(e.t * 2) * .15; e.mesh.position.y = e.y + Math.sin(e.t * 2.2) * .08; }
    else if (e.type === "cloud" || e.type === "storm") {
      const u = e.mesh.userData;
      e.mesh.position.y = e.y + Math.sin(e.t * 1.8) * .15;
      if (u.bolt) u.bolt.visible = !e.cleared && Math.sin(e.t * 9) > .55 && Math.random() > .3;
      if (e.calmed || e.cleared) {
        e.fade = (e.fade || 0) + dt; u.mat.color.lerp(_c.set(0xe8ddd0), dt * 3); u.mat.opacity = Math.max(0, .96 - e.fade * .9);
        u.mouth.rotation.z = Math.PI; u.mouth.position.y = -.2 * e.r;
        e.mesh.scale.setScalar(1 + e.fade * .6); e.mesh.scale.z *= G.mode === "duel" ? 2.3 : 1;
        e.mesh.position.y += e.fade * 1.5; e.mesh.position.x = e.x + (e.cleared ? e.fade * 6 : 0);
        if (e.fade > 1.1) e.mesh.visible = false;
      } else e.mesh.rotation.z = Math.sin(e.t * 2) * .05;
    }
  }
  for (const z of G.zones) if (z.type === "pad") z.mesh.children.forEach((d, i) => d.scale.setScalar(Math.min(2.2, G.depth) * (1 + Math.sin(G.t * 6 + i) * .06)));
}
function cleanup() {
  const minX = Math.min(...G.players.map((p) => p.x)) - 26;
  G.segs = G.segs.filter((s) => { if (s.x1 < minX) { world.remove(s.mesh); disposeGroup(s.mesh); return false; } return true; });
  G.zones = G.zones.filter((z) => { if (z.x1 < minX) { world.remove(z.mesh); disposeGroup(z.mesh); return false; } return true; });
  G.ents = G.ents.filter((e) => { if (e.x < minX) { if (e.mesh) { world.remove(e.mesh); disposeGroup(e.mesh); } if (e.tag) e.tag.remove(); return false; } return true; });
}

// ---------------------------------------------------------------- race camera (frames the hero inside the action band)
const camPos = new THREE.Vector3(0, 3.5, 14), camLook = new THREE.Vector3(), tPos = new THREE.Vector3(), tLook = new THREE.Vector3();
function raceCamera(dt) {
  const duel = G.mode === "duel", halfW = (duel ? 7 : 6.2) * (aspect < 1 ? .85 : 1);
  let dist = Math.max(14, halfW / (TANH * aspect));
  if (duel) { const gap = Math.abs(G.players[0].x - G.players[1].x); dist = Math.max(dist, (gap * .5 + 5) / (TANH * aspect)); }
  const viewHalf = dist * TANH * aspect;
  const lead = Math.max(...G.players.map((p) => p.x)), trail = Math.min(...G.players.map((p) => p.x));
  const P0 = G.players[0], px = duel ? (lead + trail) / 2 : P0.x, py = duel ? 0 : Math.min(Math.max(P0.y, -1.5), 3.5);
  const tx = px + viewHalf * (duel ? .15 : .5);
  if (G.over && G.endT > .4) {
    const r = G.result;
    if (r.winner >= 0) { const W = G.players[r.winner]; tPos.set(W.x + 2.4, 2.1, W.z + 7.2); tLook.set(W.x, 1.3 + lookOffsetY(7.6, .62) * .6, W.z); }
    else { tPos.set(G.finish - 2, 3.6, 10); tLook.set(G.finish + 1.5, 3.4, -2); }
  } else {
    const bodyC = py + 1.1;
    tLook.set(tx, bodyC + lookOffsetY(dist, .6), 0);
    tPos.set(tx - 1.4, tLook.y + 1.7 + dist * .04, dist);
  }
  const k = Math.min(1, dt * (G.over ? 2.2 : 5));
  camPos.lerp(tPos, k); camLook.lerp(tLook, k);
  camera.position.copy(camPos);
  if (G.shake > 0 && !reduceMotion) { camera.position.x += (Math.random() - .5) * G.shake; camera.position.y += (Math.random() - .5) * G.shake; G.shake = Math.max(0, G.shake - dt); }
  camera.lookAt(camLook);
  key.position.set(camLook.x + 6, 11, 9); key.target.position.copy(camLook);
  rim.position.set(camLook.x - 5, 6, -12); rim.target.position.copy(camLook);
  fireflies.material.uniforms.uCam.value = camLook.x;
}

// ---------------------------------------------------------------- race flow
let raceCourse = null;
function startRace(co) {
  Sound.unlock();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  raceCourse = co || raceCourse;
  newRace(raceMode, raceCourse);
  menu.visible = false; mode = "race";
  buildRaceHUD(G.players.length, !!G.kip, !!G.ghost);
  state = "play"; show(null); hudEl.hidden = false;
  camPos.set(-6, 3.6, 16); camLook.set(2, 1.5, 0);
  Sound.music(1, G.co.bpm, G.co.musicKey);
}
const CD = [[0, "READY", "beep", "Ready"], [1.1, "SET", "beep", "Set"], [2.2, "AND...", "beep", null], [3.0, "GO!", "go", "Go!"]];
function updateCountdown(dt) {
  const prev = G.cd; G.cd += dt;
  for (const [t, txt, snd, v] of CD) if (prev <= t && G.cd > t) { $("countdown").hidden = false; const b = $("countdown-t"); b.textContent = txt; b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; Sound.play(snd); if (v) Voice.say(v, true); }
  G.players.forEach((P) => { P.fig.update(dt, .4, true, null, .4, 0); P.fig.pose(dt, { mode: "idle" }); P.fig.root.position.set(P.x, P.y, P.z); P.shadow.position.set(P.x, .02, P.z); });
  if (G.cd > 3.0) { G.phase = "race"; G.t = 0; if (G.kip) { Sound.play("caw"); kipSay("Catch me if you can! CAW!"); } }
}
function updateRace(rawDt) {
  if (G.phase === "countdown") updateCountdown(rawDt);
  else if (G.cd < 99) { G.cd += rawDt; if (G.cd > 3.6) { $("countdown").hidden = true; G.cd = 99; } }
  let slowmo = 1;
  if (!G.over && G.phase === "race" && !reduceMotion) {
    const xs = G.players.map((p) => p.x).concat(G.kip ? [G.kip.x] : []).sort((a, b) => b - a);
    if (xs[0] > G.finish - 9 && xs[0] - xs[1] < 3.5) slowmo = .35;
  }
  G.timeScale += (slowmo - G.timeScale) * Math.min(1, rawDt * 6);
  const dt = rawDt * G.timeScale;
  if (G.phase === "race" && !G.over) G.t += dt;
  if (G.over) G.endT += rawDt;
  if (G.phase !== "countdown") {
    let anyHold = false;
    G.players.forEach((P) => { const h = updatePlayer(P, dt); figPose(P, h, dt); anyHold = anyHold || h; });
    if (anyHold !== !!G.anyHold) { G.anyHold = anyHold; Sound.hold(anyHold); }
    const flow = G.players.some((p) => p.flow > 0);
    if (flow !== !!G.anyFlow) { G.anyFlow = flow; if (!G.over) Sound.music(flow ? 2 : 1); }
    if (G.pendingGust && G.t >= G.pendingGust.at) { gust(G.pendingGust.P); G.pendingGust = null; }
    if (G.phase === "race" && !G.over && G.mode !== "duel") { const R = G.rec; R.acc += dt; while (R.acc >= .1) { R.acc -= .1; R.xs.push(+G.players[0].x.toFixed(2)); R.ys.push(+G.players[0].y.toFixed(2)); } }
  }
  if (G.kip) updateKip(dt);
  updateGhost();
  if (G.ember) G.ember.update(dt, G.t);
  if (G.tree) { G.tree.userData.sage.update(dt, G.t); G.tree.userData.rings.material.rotation += dt * .05; }
  updateEnts(dt);
  genWorld(Math.max(...G.players.map((p) => p.x)) + 70);
  cleanup();
  if (!G.over && G.phase === "race") {
    if (G.mode === "duel") { const done = G.players.filter((p) => p.x >= G.finish); if (done.length) endRace(done.sort((a, b) => b.x - a.x)[0].i); }
    else if (G.players[0].x >= G.finish) endRace(0);
    else if (G.kip.x >= G.finish) endRace(-1);
  }
  if (G.over && G.endT > 3.4 && !G.shown) { G.shown = true; showRaceResult(); }
  updateCues(); updateHints(); updateRaceHUD();
  raceCamera(rawDt);
  perfGuard(rawDt, G.perf);
}
function endRace(winner) {
  G.over = true; G.endT = 0; Sound.hold(false); Sound.danger(0); G.anyHold = false;
  const duel = G.mode === "duel", co = G.co;
  const res = { winner, players: [] };
  G.players.forEach((P, i) => {
    const won = winner === i;
    P.winner = won; P.raise = won ? 1 : 0;
    const margin = duel ? Math.abs(Math.round(G.players[0].x - G.players[1].x)) : Math.abs(Math.round(P.x - G.kip.x));
    const winBonus = won ? 500 + margin * 5 : 0;
    const tokens = P.seeds + P.gold * 5, purse = won ? 40 + Math.max(0, co.idx) * 20 + (co.daily ? 30 : 0) : (duel ? 10 : 5);
    res.players[i] = { won, margin, winBonus, tokens, purse, leaves: tokens + purse, score: scoreOf(P) + winBonus, time: P.finishT || null, pct: Math.round(clamp01(P.x / G.finish) * 100) };
    profile.leaves += tokens + purse;
  });
  if (!duel) {
    const r = res.players[0], P = G.players[0], k = co.key;
    r.prevBest = profile.best[co.daily ? "daily" : co.idx] || 0;
    r.prevBestTime = profile.bestTime[k] || null; r.prevLast = profile.last[k] || null;
    if (co.daily) {
      if (profile.daily.date !== dayKey()) profile.daily = { date: dayKey(), best: 0 };
      r.newBest = r.score > profile.daily.best; if (r.newBest) profile.daily.best = r.score;
    } else {
      if (r.won) { profile.wins++; if (co.idx + 2 > profile.unlocked && co.idx + 1 < COURSES.length) profile.unlocked = co.idx + 2; }
      r.newBest = r.score > r.prevBest; if (r.newBest) profile.best[co.idx] = r.score;
      const old = profile.stars[k] || [false, false, false];
      r.stars = co.ch.map((c, j) => { const got = !!c.test(P, r); return { got: got || old[j], fresh: got && !old[j], text: c.text }; });
      profile.stars[k] = r.stars.map((s) => s.got);
    }
    if (r.time) {
      r.newBestTime = !r.prevBestTime || r.time < r.prevBestTime;
      if (r.newBestTime) { profile.bestTime[k] = r.time; saveGhost(k, { t: r.time, xs: G.rec.xs, ys: G.rec.ys }); }
    }
    profile.last[k] = { won: r.won, time: r.time, pct: r.pct, score: r.score };
  }
  save(); G.result = res;
  showCallout(null);
  const W = winner >= 0 ? G.players[winner] : null;
  if (W) { Sound.play("win"); if (duel) Voice.say(`Player ${winner + 1} wins!`, true); else Voice.say("Yes! I did it! Bodie wins!", true, "bodie"); launchConfetti(W.x, 2, W.z); event(duel ? `PLAYER ${winner + 1} WINS` : "BODIE WINS!", "First to the Great Tree", "good", 3.4); }
  else { Sound.play("lose"); kipSay("CAW! Winner winner, coffee dinner!"); Voice.say("CAW! Winner winner, coffee dinner!", true, "kip"); event("KIP WINS", "You can stop here, or choose another run", "warn", 3.4); }
  Sound.music(0, 128, 0);
  if (!duel) postScore();
}
function showRaceResult() {
  const r = G.result, duel = G.mode === "duel", co = G.co;
  $("res-eyebrow").textContent = `${co.daily ? "Daily Dash, " + dayKey() : "Course " + (co.idx + 1) + ", " + co.name}${duel ? ", duel" : ""}`;
  const t = $("res-title");
  let body = "";
  if (duel) {
    t.textContent = `Player ${r.winner + 1} wins`; t.className = "win";
    $("res-line").textContent = `Player ${r.winner + 1} reached the Great Tree ${r.players[r.winner].margin}m ahead. Player ${2 - r.winner}, that's the loser seat. Rematch?`;
    body += quote("sage", `Well raced, both of you. Player ${r.winner + 1} takes it. Pause whenever you want.`);
    const rows = [["", "P1", "P2"], ["Distance", ...G.players.map((P) => Math.floor(Math.min(P.x, G.finish)))], ["Seeds", ...G.players.map((P) => P.seeds + P.gold * 5)], ["Calm passes", ...G.players.map((P) => P.calm)], ["Shield releases", ...G.players.map((P) => P.boxes)], ["Pops", ...G.players.map((P) => P.pops)], ["Points", ...r.players.map((p) => p.score)]];
    body = `<div class="duel-tally">${rows.map((row, i) => row.map((c) => `<span class="${i === 0 ? "h" : ""}">${c}</span>`).join("")).join("")}</div>`;
  } else {
    const p = r.players[0], P = G.players[0];
    t.textContent = p.won ? "Bodie wins" : "Kip wins"; t.className = p.won ? "win" : "lose";
    const hint = P.pops ? `Bodie popped ${P.pops} time${P.pops > 1 ? "s" : ""}. Press the button when the cue says so.` : P.pffts ? "Release when the shield meter is low." : P.thinPops ? "Hold all the way through windy zone, and charge up on the power pad first." : "Try releasing a charged shield for a Flow boost.";
    $("res-line").textContent = p.won ? `Bodie beat Kip to the Great Tree by ${p.margin}m.${p.newBest ? " New best score!" : ""}` : `Kip got there ${p.margin}m ahead. ${hint}`;
    const bench = [];
    if (p.time) bench.push(`<span>Time <b>${fmtT(p.time)}</b></span>`); else bench.push(`<span>Reached <b>${p.pct}%</b></span>`);
    if (p.prevBestTime) bench.push(`<span>Best ${p.newBestTime ? "was " : ""}<b>${fmtT(p.prevBestTime)}</b></span>`);
    if (p.prevLast) bench.push(`<span>Last <b>${p.prevLast.time ? fmtT(p.prevLast.time) : p.prevLast.pct + "%"}</b></span>`);
    if (p.newBestTime) bench.push(`<span class="badge">New best time, ghost saved</span>`);
    body += quote(p.won ? "sage" : "kip", p.won ? (p.margin >= 20 ? "Nicely played. Kip is still looking for his coffee." : "Nicely played. Kip is still on the trail.") : "Rematch, slowpoke? I'll be here. Probably on espresso number eight.");
    body += `<div class="bench">${bench.join("")}</div>`;
    if (p.stars) body += `<ul class="chs">${p.stars.map((s) => `<li class="${s.got ? "got" : ""} ${s.fresh ? "new" : ""}"><span>★</span><span>${s.text}</span></li>`).join("")}</ul>`;
    const rows = [["Distance", Math.floor(Math.min(P.x, G.finish)) + " pts"], ["Seeds, rings, holds and tricks", P.points + " pts"], ["Win bonus", p.winBonus + " pts"], ["<b>Points</b>", `<b>${p.score}</b>`], ["Gold Leaves: seeds + purse", `${p.tokens} + ${p.purse} = +${p.leaves}`], ["Shield releases, calm passes, best combo", `${P.boxes}, ${P.calm}, x${P.bestCombo}`]];
    if (co.sigh) rows.push(["Storms cleared", String(P.storms)]);
    if (P.maxCharge > 0 || P.thinCleared) rows.push(["Max shield charge, windy zones cleared", `${Math.round((1 + P.maxCharge) * 100)}%, ${P.thinCleared}`]);
    if (P.rings) rows.push(["Rhythm rings", String(P.rings)]);
    body += `<div class="tally">${rows.map(([a, b], i) => `<span class="${i === 3 ? "total" : ""}">${a}</span><span class="${i === 3 ? "total" : ""}">${b}</span>`).join("")}</div>`;
  }
  $("res-body").innerHTML = body;
  const next = $("btn-next");
  if (!duel && !co.daily && r.players[0].won && co.idx + 1 < COURSES.length) { next.hidden = false; next.textContent = "Next course"; next.onclick = () => { courseIdx = co.idx + 1; openBrief(COURSES[courseIdx]); }; }
  else next.hidden = true;
  $("btn-again").textContent = duel ? "Rematch" : "Race again"; $("btn-again").onclick = () => startRace(co);
  state = "result"; refreshWallets(); show("ov-result"); hudEl.hidden = true; showCallout(null);
}

// ---------------------------------------------------------------- shared helpers for the solo modes
function perfGuard(rawDt, pf) {
  pf.acc += rawDt; pf.n++;
  if (pf.acc > 2.5) { const avg = pf.acc / pf.n; pf.acc = 0; pf.n = 0; if (avg > 1 / 36 && glowOn && composer) setGlow(false, true); else if (avg > 1 / 32 && pixelRatio > 1) { pixelRatio = 1; resize(); } }
}
function soloCamera(dt, x, y, aheadF, heroF, minDist, halfW, maxY = Infinity) {
  const dist = Math.max(minDist, halfW / (TANH * aspect)), viewHalf = dist * TANH * aspect;
  tLook.set(x + viewHalf * aheadF, Math.min(maxY - .9, y + lookOffsetY(dist, heroF)), 0);
  tPos.set(tLook.x - 1, Math.min(maxY - .3, tLook.y + .7), dist);
  const k = Math.min(1, dt * 4); camPos.lerp(tPos, k); camLook.lerp(tLook, k);
  camera.position.copy(camPos); camera.lookAt(camLook);
  key.position.set(camLook.x + 6, camLook.y + 10, 9); key.target.position.copy(camLook);
  rim.position.set(camLook.x - 5, camLook.y + 5, -12); rim.target.position.copy(camLook);
  fireflies.material.uniforms.uCam.value = camLook.x;
}

// Ribbon ride: a bounded finger-control toy. No breath instruction, scores, records or rewards.
const PATTERNS = [
  { key: "rolling", name: "Rolling trail", goal: "Finger control", desc: "Press to rise, release to settle. Breathe normally.", wave: 3.2 },
  { key: "arc", name: "Long arc", goal: "Finger control", desc: "A wider ribbon to explore. No score or perfect route.", wave: 4.6 },
  { key: "steps", name: "Small steps", goal: "Finger control", desc: "Shorter turns for your fingertips, not your breath.", wave: 2.3 },
];
const SURF_SPEED = 2.4, RIB_BASE = 1.4, RIB_AMP = 2.6, RIDE_SECONDS = 45;
let S = null;
const ribY = (level) => RIB_BASE + level * RIB_AMP;
const ribbonLevel = (p, t) => .5 + .32 * Math.sin(t / p.wave);
function surfStart(pi) {
  Sound.unlock();
  if (document.activeElement?.blur) document.activeElement.blur();
  const p = PATTERNS[pi];
  clearWorld(); menu.visible = false; mode = "surf"; state = "play"; show(null);
  const len = RIDE_SECONDS * SURF_SPEED + 40;
  setBackdrop(COURSES[0], len);
  S = { pi, p, t: 0, h: .5, pressed: 0, perf: { acc: 0, n: 0 }, done: false };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(len + 200, 60), M.groundTop);
  floor.rotation.x = -Math.PI / 2; floor.position.set(len / 2, -.4, -10); world.add(floor);
  const N = Math.ceil(RIDE_SECONDS / .1) + 1, band = new Float32Array(N * 6), line = new Float32Array(N * 6), idx = [];
  for (let i = 0; i < N; i++) {
    const t = i * .1, x = t * SURF_SPEED, y = ribY(ribbonLevel(p, t));
    band.set([x, y - .38, 0, x, y + .38, 0], i * 6);
    line.set([x, y - .05, .01, x, y + .05, .01], i * 6);
    if (i < N - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  function makeRibbon(arr, opacity) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3)); geo.setIndex(idx);
    const material = new THREE.MeshBasicMaterial({ color: 0xd4a574, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, material); mesh.userData.own = [material]; return mesh;
  }
  world.add(makeRibbon(band, .16), makeRibbon(line, .85));
  S.fig = buildBodie({ sit: true, skin: profile.skin, acc: profile.acc });
  S.fig.root.scale.setScalar(.9); S.fig.root.rotation.y = .5; world.add(S.fig.root);
  hudEl.innerHTML = `<div class="hp"><div class="hp-stats"><div class="hp-label">RIBBON RIDE</div><div class="hp-sub">No score. Breathe normally.</div></div></div>`;
  hudEl.hidden = false;
  camPos.set(-4, 3, 12); camLook.set(2, 2, 0); Sound.music(3, 72, 0);
}
function updateSurf(dt) {
  S.t += dt;
  S.h = clamp01(S.h + (S.pressed > 0 ? .55 : -.4) * dt);
  const x = S.t * SURF_SPEED, y = ribY(S.h);
  S.fig.root.position.set(x, y - .9, 0);
  S.fig.update(dt, S.h, reduceMotion, null, .4, 0);
  showCallout({ text: S.pressed > 0 ? "Rising" : "Settling", sub: "Finger or Space only. Keep breathing normally. Pause whenever you want.", kind: "" });
  soloCamera(dt, x, RIB_BASE + RIB_AMP / 2, .32, .52, 11, 5.6);
  perfGuard(dt, S.perf);
  if (S.t >= RIDE_SECONDS) showSurfResult();
}
function surfIdle(dt) {
  S.fig.update(dt, .5, reduceMotion || !motionOn(), null, .4, 0);
  soloCamera(dt, S.t * SURF_SPEED, RIB_BASE + RIB_AMP / 2, .32, .52, 11, 5.6);
}
function showSurfResult() {
  S.done = true;
  $("res-eyebrow").textContent = "Ribbon ride";
  $("res-title").textContent = "A little time on the trail";
  $("res-title").className = "";
  $("res-line").textContent = "No score, breath record or physiological result. You can leave here or try another trail.";
  $("res-body").textContent = S.p.desc;
  const next = $("btn-next"), ni = (S.pi + 1) % PATTERNS.length;
  next.hidden = false; next.textContent = "Next: " + PATTERNS[ni].name; next.onclick = () => surfStart(ni);
  $("btn-again").textContent = "Ride again"; $("btn-again").onclick = () => surfStart(S.pi);
  state = "result"; refreshWallets(); show("ov-result"); hudEl.hidden = true; showCallout(null);
}

// ---------------------------------------------------------------- menus
const OVERLAYS = ["ov-title", "ov-courses", "ov-brief", "ov-surf", "ov-result", "ov-shop", "ov-hall", "ov-help", "ov-pause", "ov-cast"];
const SAGE_SAY = { hollow: "Press the button for your shield.", lake: "Jump the obstacles.", swamp: "Double tap to clear a storm.", peaks: "Tap on a power pad to charge the shield.", temple: "Press the button to glide through rings." };
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
function show(id) {
  OVERLAYS.forEach((o) => ($(o).hidden = o !== id));
  $("btn-pause").hidden = !(state === "play" && id === null);
  $("hud-btns").hidden = !!id && $(id).classList.contains("center");
  if (id) $(id).querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
  else stage.focus({ preventScroll: true });
}
function walletHTML() { return `<span>Gold Leaves <b>${profile.leaves}</b></span><span>Wins <b>${profile.wins}</b></span><span>Stars <b>${totalStars()}/15</b></span>`; }
function refreshWallets() { ["wallet-title", "wallet-res", "wallet-shop"].forEach((id) => ($(id).innerHTML = walletHTML())); }
function toMenu(view) {
  clearWorld(); S = null; mode = "race";
  hudEl.hidden = true; showCallout(null); $("countdown").hidden = true;
  state = "menu"; menuView = view || "title"; menu.visible = true;
  const co = COURSES[Math.min(courseIdx, COURSES.length - 1)];
  if (bdKey !== co.key + ":200") setBackdrop(co, 200);
  backdrop.visible = true;
  Sound.music(0, 128, 0); Sound.hold(false); Sound.danger(0);
  refreshWallets(); show(menuView === "title" ? "ov-title" : menuView);
}
const starStr = (arr) => { const n = (arr || []).filter(Boolean).length; return `<span class="stars">${"★".repeat(n)}<i>${"★".repeat(3 - n)}</i></span>`; };
function renderCourses() {
  $("courses-mode").textContent = raceMode === "duel" ? "2 Player Duel" : "Race Kip";
  $("courses").innerHTML = COURSES.map((c, i) => {
    const locked = raceMode === "kip" && i + 1 > profile.unlocked;
    const bt = profile.bestTime[c.key], last = profile.last[c.key];
    const meta = raceMode === "kip" ? [bt ? "best " + fmtT(bt) : "", last ? "last " + (last.time ? fmtT(last.time) : last.pct + "%") : ""].filter(Boolean).join(", ") : "";
    return `<button class="pick" type="button" data-i="${i}" ${locked ? "disabled" : ""}><span class="n"><span>Course ${i + 1}: ${c.tech.toLowerCase()}</span>${raceMode === "kip" ? starStr(profile.stars[c.key]) : ""}</span><span class="t">${c.name}</span><span class="b">${locked ? "Win the course before it to unlock" : c.len + "m" + (meta ? ". " + meta[0].toUpperCase() + meta.slice(1) : "")}</span></button>`;
  }).join("");
  $("courses").querySelectorAll(".pick").forEach((b) => b.addEventListener("click", () => { Sound.play("click"); courseIdx = +b.dataset.i; openBrief(COURSES[courseIdx]); }));
}
let briefCourse = null;
function openBrief(co) {
  briefCourse = co;
  $("brief-course").textContent = co.daily ? `Today's course, ${co.len}m` : `Course ${co.idx + 1}, ${co.tech.toLowerCase()}, ${co.len}m ${raceMode === "duel" ? "for two players" : "against Kip"}`;
  $("brief-title").textContent = co.daily ? "Daily Dash" : co.name;
  Voice.say(co.daily ? "A new course every day. Keep breathing normally." : SAGE_SAY[co.key], true, "sage");
  $("brief-tip").textContent = `Sage: "${co.tip} ${SAGE_LINES[(co.idx + 5) % SAGE_LINES.length]}"`;
  const st = profile.stars[co.key] || [];
  $("brief-ch").innerHTML = raceMode === "duel" ? "" : co.ch.map((c, j) => `<li class="${st[j] ? "got" : ""}"><span>★</span><span>${c.text}</span></li>`).join("");
  const bt = profile.bestTime[co.key], last = profile.last[co.key], ghost = loadGhost(co.key);
  const bench = [];
  if (raceMode !== "duel") {
    if (co.daily) bench.push(`<span>Today's best <b>${profile.daily.date === dayKey() ? profile.daily.best : 0}</b></span>`);
    if (bt) bench.push(`<span>Best time <b>${fmtT(bt)}</b></span>`);
    if (last) bench.push(`<span>Last <b>${last.time ? fmtT(last.time) : last.pct + "%"}</b></span>`);
    if (ghost) bench.push(`<span>A see-through Bodie replays your best run</span>`);
  }
  $("brief-bench").innerHTML = bench.join("");
  $("brief-controls").innerHTML = raceMode === "duel"
    ? "Player 1: <kbd>W</kbd> or <kbd>Space</kbd>, or tap the left half. Player 2: <kbd>↑</kbd> or <kbd>L</kbd>, or tap the right half. Tap to jump. Keep the button pressed for a screen shield. Breathe normally."
    : "<kbd>Space</kbd> <kbd>↑</kbd> <kbd>W</kbd>, click or tap to jump. Keep the button pressed for a screen shield. Release to recharge it. Keep breathing normally." + (co.sigh ? " Double tap for a gust." : "");
  if (state !== "menu") toMenu("ov-brief"); else show("ov-brief");
}
function renderSurfList() {
  $("surf-list").innerHTML = PATTERNS.map((p, i) => `<button class="pick" type="button" data-i="${i}"><span class="t">${p.name}</span><span class="b">${p.desc}</span></button>`).join("");
  $("surf-list").querySelectorAll(".pick").forEach((b) => b.addEventListener("click", () => { Sound.play("click"); surfStart(+b.dataset.i); }));
}
let shopTab = "up";
const UPS = [
  { id: "lungs", name: "Larger shield", desc: (lv) => `+1 second of screen-shield charge in races. Level ${lv}/3.`, cost: (lv) => [40, 90, 160][lv], max: 3 },
  { id: "spring", name: "Spring Roots", desc: () => "Double jump: tap again in the air.", cost: () => 120, max: 1 },
  { id: "magnet", name: "Seed Magnet", desc: () => "Pulls nearby Trail Seeds to Bodie.", cost: () => 80, max: 1 },
  { id: "aura", name: "Calm Aura", desc: () => "Your first Worry Cloud each race can't pop you.", cost: () => 60, max: 1 },
  { id: "sigh", name: "Gust charger", desc: () => "Your gust recharges in 2 seconds instead of 3.", cost: () => 100, max: 1 },
  { id: "charge", name: "Power shield", desc: () => "Each pad tap charges 8% instead of 6%.", cost: () => 90, max: 1 },
];
function renderShop() {
  $("tab-up").setAttribute("aria-selected", String(shopTab === "up")); $("tab-looks").setAttribute("aria-selected", String(shopTab === "looks"));
  const stars = totalStars();
  let html = "";
  if (shopTab === "up") html = UPS.map((it) => { const lv = profile.up[it.id] || 0, maxed = lv >= it.max, cost = maxed ? 0 : it.cost(lv); return `<div class="item${maxed ? " on" : ""}"><span class="nm">${it.name}</span><span class="ds">${it.desc(lv)}</span><button class="btn" type="button" data-up="${it.id}" ${maxed || profile.leaves < cost ? "disabled" : ""}>${maxed ? "Owned" : `<span class="data">${cost}</span> leaves`}</button></div>`; }).join("");
  else {
    const btn = (own, on, cost, need, onTxt, ownTxt, attr) => { const locked = !own && need && stars < need; return `<button class="btn" type="button" ${attr} ${(!own && (profile.leaves < cost || locked)) ? "disabled" : ""}>${on ? onTxt : own ? ownTxt : locked ? `Needs ${need}★` : `<span class="data">${cost}</span> leaves`}</button>`; };
    html = Object.entries(SKINS).map(([k, s]) => { const own = profile.owned.includes(k), on = profile.skin === k; return `<div class="item${on ? " on" : ""}"><span class="nm">${s.name} skin</span><span class="ds">${s.desc}</span>${btn(own, on, s.cost, s.stars, "Wearing", "Wear", `data-skin="${k}"`)}</div>`; }).join("")
      + Object.entries(ACCS).map(([k, a]) => { const own = profile.owned.includes(k), on = profile.acc.includes(k); return `<div class="item${on ? " on" : ""}"><span class="nm">${a.name}</span><span class="ds">${a.desc}</span>${btn(own, on, a.cost, a.stars, "Take off", "Put on", `data-acc="${k}"`)}</div>`; }).join("");
  }
  $("shop-list").innerHTML = html;
  $("shop-list").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.up) { const it = UPS.find((u) => u.id === b.dataset.up), lv = profile.up[it.id] || 0, cost = it.cost(lv); if (lv < it.max && profile.leaves >= cost) { profile.leaves -= cost; profile.up[it.id] = lv + 1; Sound.play("buy"); Voice.say(pickOne(["Good choice!", "Pleasure doing business!", "A fine trade!"]), true, "ember"); } }
    if ((b.dataset.skin || b.dataset.acc) && !b.disabled) Voice.say(pickOne(["Looking sharp, Bodie!", "Oh, that suits you.", "Very dashing!"]), true, "ember");
    if (b.dataset.skin) { const k = b.dataset.skin, s = SKINS[k]; if (!profile.owned.includes(k)) { if (profile.leaves < s.cost || (s.stars && stars < s.stars)) return; profile.leaves -= s.cost; profile.owned.push(k); Sound.play("buy"); } else Sound.play("click"); profile.skin = k; rebuildMenuBodie(); }
    if (b.dataset.acc) { const k = b.dataset.acc, a = ACCS[k]; if (!profile.owned.includes(k)) { if (profile.leaves < a.cost || (a.stars && stars < a.stars)) return; profile.leaves -= a.cost; profile.owned.push(k); profile.acc.push(k); Sound.play("buy"); } else { profile.acc = profile.acc.includes(k) ? profile.acc.filter((x) => x !== k) : profile.acc.concat(k); Sound.play("click"); } rebuildMenuBodie(); }
    save(); renderShop(); refreshWallets();
  }));
}

// ---------------------------------------------------------------- Trail board (shared scores via the artifact's db)
const HALL_TABS = [...COURSES.map((c, i) => ({ name: c.name, field: "b" + i, fmt: (v) => String(v) })), { name: "Daily Dash", field: "ds", daily: true, fmt: (v) => String(v) }];
let DB = null, USER = null, myId = null, hallDocs = [], hallTab = 0, hallErr = "", canWrite = true, hallToken = 0, dbTried = false;
async function initDB() {
  if (window.GroundPreview?.active()) { dbTried = true; renderHall(); return; }
  try {
    const w = window.claude; if (!w || !w.use) { dbTried = true; renderHall(); return; }
    const [db, user] = await Promise.all([w.use("db"), w.use("user")]); DB = db; USER = user;
    if (USER) myId = await USER.id();
    if (USER && USER.can) { const c = await USER.can("data.write"); if (c === false) canWrite = false; }
    if (DB && myId) {
      const snap = await DB.doc("scores/" + myId).get();
      if (snap.exists) {
        const d = snap.data();
        for (let i = 0; i < COURSES.length; i++) { const v = Number(d["b" + i]) || 0; if (v > (profile.best[i] || 0)) profile.best[i] = v; }
        if (d.dd === dayKey() && (profile.daily.date !== dayKey() || Number(d.ds) > profile.daily.best)) profile.daily = { date: dayKey(), best: Number(d.ds) || 0 };
        save(); refreshWallets();
      }
    }
    if (DB) DB.collection("scores").orderBy("total", "desc").limit(300).onSnapshot((s) => { hallDocs = s.docs.map((d) => ({ id: d.id, ...d.data() })); renderHall(); }, (e) => { hallErr = e.code || "unavailable"; renderHall(); });
  } catch (e) { hallErr = "unavailable"; }
  dbTried = true; renderHall();
}
let posting = false, postAgain = false;
async function postScore() {
  if (window.GroundPreview?.active() || !DB || !myId || !canWrite) return;
  if (posting) { postAgain = true; return; }
  posting = true;
  const b = COURSES.map((c, i) => profile.best[i] || 0);
  const doc = { total: b.reduce((a, v) => a + v, 0), wins: profile.wins, dd: profile.daily.date || "", ds: profile.daily.best || 0, at: Date.now() };
  b.forEach((v, i) => (doc["b" + i] = v));
  try { await DB.doc("scores/" + myId).set(doc); } catch (e) { if (e && e.code === "invalid_argument") canWrite = false; }
  posting = false; if (postAgain) { postAgain = false; postScore(); }
}
async function renderHall() {
  $("hall-tabs").innerHTML = HALL_TABS.map((t, i) => `<button class="tab" type="button" role="tab" data-i="${i}" aria-selected="${i === hallTab}">${t.name}</button>`).join("");
  $("hall-tabs").querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => { hallTab = +b.dataset.i; renderHall(); }));
  const list = $("hall-list"), note = $("hall-note"), tab = HALL_TABS[hallTab];
  if (!DB) { list.innerHTML = ""; note.textContent = dbTried ? "The Trail board shows up when you open this page signed in to claude.ai. Your records are still saved in this browser." : "Loading the Hall..."; return; }
  const f = tab.field, rows = hallDocs.filter((d) => Number(d[f]) > 0 && (!tab.daily || d.dd === dayKey())).sort((a, b) => b[f] - a[f]).slice(0, 10);
  note.textContent = hallErr ? "Couldn't load the latest scores. They'll appear when the connection is back." : !canWrite ? "You can view the Hall. Your records stay in this browser because you have view-only access." : rows.length ? (tab.daily ? "Today's course is the same for everyone. Resets at midnight." : "Your best on each board posts here automatically.") : "No scores here yet. Be the first.";
  const token = ++hallToken;
  const profs = USER && rows.length ? await USER.profiles(rows.map((r) => r.id)) : {};
  if (token !== hallToken) return;
  list.innerHTML = "";
  rows.forEach((r, i) => {
    const p = profs[r.id] || {}, row = document.createElement("div"); row.className = "hrow" + (r.id === myId ? " me" : "");
    const rk = document.createElement("span"); rk.className = "rk"; rk.textContent = "#" + (i + 1);
    const im = document.createElement("img"); im.alt = ""; if (p.avatarUrl) im.src = p.avatarUrl;
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = (p.name || "Someone") + (r.id === myId ? " (you)" : "");
    const sc = document.createElement("span"); sc.className = "sc"; sc.textContent = tab.fmt(Number(r[f]));
    row.append(rk, im, nm, sc); list.appendChild(row);
  });
}

// ---------------------------------------------------------------- portraits (rendered once with the main renderer)
const PORTRAIT = {};
function renderPortraits() {
  const ps = new THREE.Scene(); ps.environment = scene.environment; ps.environmentIntensity = .7;
  ps.add(new THREE.HemisphereLight(0xffe2c0, 0x2a1b14, .7)); const kl = new THREE.DirectionalLight(0xffe4c4, 1.8); kl.position.set(3, 5, 6); ps.add(kl); const rl = new THREE.DirectionalLight(0xd4a574, 1.2); rl.position.set(-4, 3, -6); ps.add(rl);
  const pc = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const shots = [
    ["bodie", () => { const b = buildBodie({ sit: true }); b.update(.016, .6, true, null, .6); b.head.rotation.y = -.35; return b.root; }, [-2.6, 2.2, 3.8], [0, 1.15, 0]],
    ["kip", () => { const k = buildKip(); k.update(0, 0, "cruise"); k.root.rotation.y = -.9; return k.root; }, [0, .4, 3.6], [0, -.05, 0]],
    ["sage", () => { const s = buildSage(); s.update(0, 1); return s.root; }, [-.6, 1.2, 3.8], [0, .8, 0]],
    ["ember", () => { const e = buildEmber(); e.update(0, 0); e.root.rotation.y = .5; return e.root; }, [-.7, 1.3, 3.9], [0, .85, 0]],
  ];
  renderer.setPixelRatio(1); renderer.setSize(320, 320, false);
  ps.background = new THREE.Color(0x2a1b14);
  for (const [name, make, pos, look] of shots) {
    const obj = make(); ps.add(obj); pc.position.set(...pos); pc.lookAt(...look);
    renderer.render(ps, pc);
    try { PORTRAIT[name] = canvas.toDataURL("image/png"); } catch (e) {}
    ps.remove(obj); disposeGroup(obj);
  }
  document.querySelectorAll("img[data-portrait]").forEach((im) => { const u = PORTRAIT[im.dataset.portrait]; if (u) im.src = u; });
  resize();
}

// ---------------------------------------------------------------- glow (bloom)
async function loadBloom() {
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import(JSM + "postprocessing/EffectComposer.js/+esm"), import(JSM + "postprocessing/RenderPass.js/+esm"),
      import(JSM + "postprocessing/UnrealBloomPass.js/+esm"), import(JSM + "postprocessing/OutputPass.js/+esm")]);
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(vw, vh), .5, .5, 1.05); composer.addPass(bloomPass); composer.addPass(new OutputPass());
    resize();
  } catch (e) { composer = null; glowOn = false; }
  syncButtons();
}
function setGlow(on, auto) { glowOn = on; if (!auto) { profile.glow = on; save(); } if (on && !composer) loadBloom(); syncButtons(); }
// Motion off (WCAG 2.2.2) stills the menu and result scenes: the idle breathing, the cast's bobbing, the camera's sway,
// fireflies and particles. A run itself always moves; it starts on the player's tap and has its own Pause.
const motionOn = () => (profile.motion === null || profile.motion === undefined ? !reduceMotion : profile.motion);
function syncButtons() {
  $("btn-sound").textContent = profile.sound ? "Sound on" : "Sound off";
  $("btn-voice").textContent = profile.voice ? "Voice on" : "Voice off";
  $("btn-motion").textContent = motionOn() ? "Motion on" : "Motion off";
  $("btn-glow").textContent = glowOn && composer ? "Glow on" : "Glow off";
}

// ---------------------------------------------------------------- finger and keyboard input
const pointers = new Map(), keysDown = new Set();
const KEYS1 = ["Space", "ArrowUp", "KeyW"], DUEL1 = ["Space", "KeyW"], DUEL2 = ["ArrowUp", "KeyL"];
function playerFor(clientX) { if (!G || G.players.length < 2) return 0; const r = stage.getBoundingClientRect(); return clientX - r.left < r.width / 2 ? 0 : 1; }
function keyPlayer(code) { if (!G || G.players.length < 2) return KEYS1.includes(code) ? 0 : -1; if (DUEL1.includes(code)) return 0; if (DUEL2.includes(code)) return 1; return -1; }
function press(i) { if (!G || state !== "play") return; const p = G.players[i]; if (!p) return; if (!p.held) p.edges++; p.held = true; }
function release(i) { if (G?.players[i]) G.players[i].held = false; }
function releaseInputs() {
  G?.players.forEach((p) => p.held = false); if (S) S.pressed = 0;
  menuHold = false; pointers.clear(); keysDown.clear();
}
stage.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, a, input, .panel, .card")) return;
  Sound.unlock(); stage.focus({ preventScroll: true });
  if (state !== "play") return;
  e.preventDefault(); try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  if (mode === "race") { const i = playerFor(e.clientX); pointers.set(e.pointerId, i); press(i); }
  else if (mode === "surf" && S) { pointers.set(e.pointerId, "surf"); S.pressed++; }
});
function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  const i = pointers.get(e.pointerId); pointers.delete(e.pointerId);
  if (i === "surf") { if (S) S.pressed = Math.max(0, S.pressed - 1); }
  else if (![...pointers.values()].includes(i)) release(i);
}
stage.addEventListener("pointerup", endPointer); stage.addEventListener("pointercancel", endPointer); stage.addEventListener("lostpointercapture", endPointer);
window.addEventListener("keydown", (e) => {
  if (e.target.closest?.("button, a, input, textarea, select")) return;
  if (state === "play") {
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); pause(); return; }
    if (mode === "race") { const i = keyPlayer(e.code); if (i >= 0) { e.preventDefault(); if (!e.repeat) press(i); } }
    else if (mode === "surf" && S && KEYS1.includes(e.code)) { e.preventDefault(); if (!e.repeat && !keysDown.has(e.code)) { keysDown.add(e.code); S.pressed++; } }
  } else if (state === "paused" && (e.code === "Escape" || e.code === "KeyP")) resume();
});
window.addEventListener("keyup", (e) => {
  if (mode === "race") { const i = keyPlayer(e.code); if (i >= 0) release(i); }
  if (mode === "surf" && S && keysDown.delete(e.code)) S.pressed = Math.max(0, S.pressed - 1);
});
function pause() {
  if (state !== "play" || (mode === "race" && (!G || G.over))) return;
  releaseInputs(); state = "paused";
  Sound.hold(false); Sound.danger(0); Sound.music(-1); try { speechSynthesis.cancel(); } catch (_) {}
  show("ov-pause");
}
function resume() {
  releaseInputs(); state = "play"; show(null);
  if (mode === "race" && G) Sound.music(G.anyFlow ? 2 : 1, G.co.bpm, G.co.musicKey); else Sound.music(3, 72, 0);
}
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

$("btn-race").addEventListener("click", () => { Sound.play("click"); raceMode = "kip"; menuView = "ov-courses"; renderCourses(); show("ov-courses"); });
$("btn-duel").addEventListener("click", () => { Sound.play("click"); raceMode = "duel"; menuView = "ov-courses"; renderCourses(); show("ov-courses"); });
$("btn-daily").addEventListener("click", () => { Sound.play("click"); raceMode = "kip"; openBrief(dailyCourse()); });
$("btn-surf").addEventListener("click", () => { Sound.play("click"); menuView = "ov-surf"; renderSurfList(); show("ov-surf"); });
$("btn-courses-back").addEventListener("click", () => { Sound.play("click"); menuView = "title"; show("ov-title"); });
$("btn-shop").addEventListener("click", () => { Sound.play("click"); menuView = "ov-shop"; renderShop(); refreshWallets(); show("ov-shop"); Voice.say("Welcome to the Root Market! Have a look around.", true, "ember"); });
// Meet the cast: the camera visits each character while they say hello.
const CAST_ORDER = ["bodie", "kip", "sage", "ember"];
let castI = 0, castT = 0;
function openCast(i = 0) { castI = i; menuView = "ov-cast"; show("ov-cast"); castStep(); }
function castStep() {
  const k = CAST_ORDER[castI], c = CAST[k];
  $("cast-img").src = PORTRAIT[k] || ""; $("cast-img").alt = c.name;
  $("cast-role").textContent = c.role; $("cast-name").textContent = c.name;
  $("cast-line").textContent = `"${c.line}"`; $("cast-fact").textContent = c.fact;
  $("btn-cast-next").textContent = castI < CAST_ORDER.length - 1 ? "Next: " + CAST[CAST_ORDER[castI + 1]].name.split(" ")[0] : "Let's play";
  $("cast-dots").innerHTML = CAST_ORDER.map((_, j) => `<span class="${j === castI ? "on" : ""}"></span>`).join("");
  castT = 0; castSpeak();
}
function castSpeak() { const k = CAST_ORDER[castI]; castT = 0; if (k === "kip") Sound.play("caw"); if (k === "bodie" && menuBodie) menuBodie.press(); Voice.say(CAST[k].line, true, k, true); }
$("btn-cast").addEventListener("click", () => { Sound.play("click"); openCast(0); });
$("btn-cast-next").addEventListener("click", () => { Sound.play("click"); if (castI < CAST_ORDER.length - 1) { castI++; castStep(); } else { try { speechSynthesis.cancel(); } catch (e) {} menuView = "title"; show("ov-title"); } });
$("btn-cast-replay").addEventListener("click", castSpeak);
$("btn-cast-skip").addEventListener("click", () => { try { speechSynthesis.cancel(); } catch (e) {} Sound.play("click"); menuView = "title"; show("ov-title"); });
document.querySelectorAll(".hear").forEach((b) => b.addEventListener("click", () => {
  Sound.unlock(); const k = b.dataset.who, ok = Voice.say(CAST[k].line, true, k, true); if (k === "kip") Sound.play("caw");
  const im = b.parentElement.querySelector("img"); im.classList.remove("talk"); void im.offsetWidth; im.classList.add("talk");
  if (!ok) b.textContent = "This browser has no voices";
}));
$("btn-hall").addEventListener("click", () => { Sound.play("click"); menuView = "ov-hall"; renderHall(); show("ov-hall"); });
$("btn-help").addEventListener("click", () => { Sound.play("click"); show("ov-help"); });
$("btn-help-back").addEventListener("click", () => { Sound.play("click"); show("ov-title"); });
$("tab-up").addEventListener("click", () => { shopTab = "up"; renderShop(); });
$("tab-looks").addEventListener("click", () => { shopTab = "looks"; renderShop(); });
$("btn-surf-back").addEventListener("click", () => { Sound.play("click"); menuView = "title"; show("ov-title"); });
$("btn-shop-back").addEventListener("click", () => { Sound.play("click"); if (state === "result") { show("ov-result"); return; } menuView = "title"; show("ov-title"); refreshWallets(); });
$("btn-hall-back").addEventListener("click", () => { Sound.play("click"); menuView = "title"; show("ov-title"); });
$("btn-go").addEventListener("click", () => startRace(briefCourse));
$("btn-brief-back").addEventListener("click", () => { Sound.play("click"); if (briefCourse && briefCourse.daily) { toMenu("title"); return; } toMenu("ov-courses"); renderCourses(); });
$("btn-res-shop").addEventListener("click", () => { Sound.play("click"); renderShop(); refreshWallets(); show("ov-shop"); });
$("btn-res-menu").addEventListener("click", () => { Sound.play("click"); toMenu("title"); });
$("btn-pause").addEventListener("click", (e) => { e.stopPropagation(); pause(); });
$("btn-resume").addEventListener("click", resume);
$("btn-quit").addEventListener("click", () => toMenu("title"));
$("btn-sound").addEventListener("click", () => { profile.sound = !profile.sound; save(); Sound.unlock(); Sound.setEnabled(profile.sound); if (!profile.sound) try { speechSynthesis.cancel(); } catch (e) {} syncButtons(); });
$("btn-voice").addEventListener("click", () => { profile.voice = !profile.voice; save(); syncButtons(); if (profile.voice) Voice.say("Use your finger or keyboard. Breathe normally.", true); });
$("btn-motion").addEventListener("click", () => { profile.motion = !motionOn(); save(); syncButtons(); });
$("btn-glow").addEventListener("click", () => setGlow(!(glowOn && composer)));
$("btn-full").addEventListener("click", async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.requestFullscreen(); } catch (e) { $("btn-full").hidden = true; } });

// ---------------------------------------------------------------- menu scene + main loop
function castCamera(dt, t) {
  const k = CAST_ORDER[castI], obj = { bodie: menuBodie, kip: menuKip, sage: menuSage, ember: menuEmber }[k].root;
  const f = new THREE.Vector3(); obj.getWorldPosition(f); f.y += k === "kip" ? 0 : k === "bodie" ? 1.2 : .9;
  const phone = aspect < .9, d = phone ? 13 : 9.5, a = -.22 + Math.sin(t * .2) * .05;
  // Pan so the character sits right of the card on wide screens and above it on phones.
  const pan = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(phone ? 0 : -d * TANH * aspect * .3);
  pan.y = ((phone ? .2 : .46) * vh - vh / 2) * (2 * d * TANH / vh);
  const look = f.clone().add(pan);
  tPos.set(f.x + Math.sin(a) * d, f.y + .5, f.z + Math.cos(a) * d).add(pan);
  camPos.lerp(tPos, Math.min(1, dt * 3)); camLook.lerp(look, Math.min(1, dt * 3));
  camera.position.copy(camPos); camera.lookAt(camLook);
  key.position.set(f.x + 4, 9, f.z + 8); key.target.position.copy(f); rim.position.set(f.x - 4, 5, f.z - 8); rim.target.position.copy(f);
}
function menuCamera(dt, t) {
  if (menuView === "ov-cast") return castCamera(dt, t);
  const a = -.42 + Math.sin(t * .12) * .12, d = aspect < .9 ? 13 : 9.6;
  const look = new THREE.Vector3(0, 1.15, 0);
  if (aspect >= .9) { const right = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)); look.addScaledVector(right, -d * TANH * aspect * .36); }
  else look.y -= 1.75;
  tPos.set(Math.sin(a) * d + look.x, 2.4, Math.cos(a) * d + look.z);
  camPos.lerp(tPos, Math.min(1, dt * 2.5)); camLook.lerp(look, Math.min(1, dt * 2.5));
  camera.position.copy(camPos); camera.lookAt(camLook);
  key.position.set(4, 9, 8); key.target.position.set(0, 1, 0); rim.position.set(-4, 5, -8); rim.target.position.set(0, 1, 0);
  fireflies.material.uniforms.uCam.value = 0;
}
let last = performance.now(), clock = 0;
function updateMenu(dt, mdt) {
  menuIdleT += dt;
  const cast = menuView === "ov-cast", focus = cast ? CAST_ORDER[castI] : null;
  if (cast) castT += dt;
  let target;
  if (focus === "bodie") target = castT < 3.4 ? 1 : .35;
  else if (menuHold) target = 1;
  else if (menuIdleT > 2.5 && mdt) { const c = clock % 12; target = c < 4 ? c / 4 : c < 6 ? 1 : c < 10 ? 1 - (c - 6) / 4 : 0; }
  else target = Math.max(0, menuFill - dt * .5);
  menuFill += (target - menuFill) * Math.min(1, dt * (menuHold ? 1.6 : 3));
  const holdPhase = menuFill > .96 || (menuIdleT > 2.5 && mdt && (clock % 12) >= 4 && (clock % 12) < 6);
  if (menuBodie) { menuBodie.update(dt, menuFill, reduceMotion || !mdt, holdPhase ? "hold" : null, menuFill, menuHold && menuFill > .9 ? .5 : 0); menuBodie.root.rotation.y = .15; menuBodie.head.rotation.y = -.2 + Math.sin(clock * .5) * .1; }
  // In Meet the cast everyone is on stage at once; elsewhere each one turns up where they belong.
  menuBodie.root.visible = !cast || focus === "bodie";
  menuKip.root.visible = cast ? focus === "kip" : ["title", "ov-courses", "ov-help", "ov-brief"].includes(menuView);
  menuKip.update(mdt, clock, focus === "kip" && castT < 3 ? "sprint" : "cruise");
  menuKip.root.position.set(cast ? 1.7 : 2.3, (cast ? 2.5 : 2.1) + Math.sin(clock * 2.6) * .25 + (focus === "kip" ? Math.sin(clock * 9) * .08 : 0), cast ? -1.5 : -1.2);
  menuSage.root.visible = cast ? focus === "sage" : menuView === "ov-hall" || menuView === "ov-surf";
  menuSage.root.position.set(cast ? -2.4 : 2.1, 0, cast ? -.9 : -.6); menuSage.root.rotation.y = cast ? .5 : -.5; menuSage.update(mdt, clock);
  menuEmber.root.visible = cast ? focus === "ember" : menuView === "ov-shop";
  menuEmber.root.position.set(cast ? 2.5 : 2.0, 0, cast ? .5 : .3); menuEmber.update(mdt, focus === "ember" ? clock * 2.5 : clock);
  menuCamera(dt, clock);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const mdt = state === "play" || motionOn() ? dt : 0; // scenery time: frozen while Motion is off, outside a run
  clock += mdt;
  if (state === "play") { if (mode === "race" && G) updateRace(dt); else if (mode === "surf" && S) updateSurf(dt); }
  else if (state === "result") {
    if (mode === "race" && G) { G.endT += mdt; G.players.forEach((P) => figPose(P, false, mdt)); if (G.kip) updateKip(mdt); raceCamera(mdt); }
    else if (mode === "surf" && S) surfIdle(mdt);
  } else if (state === "menu") updateMenu(dt, mdt);
  updateParticles(mdt); updateConfetti(mdt); updateSky(clock);
  fireflies.material.uniforms.uTime.value = clock;
  if (glowOn && composer) composer.render(); else renderer.render(scene, camera);
}

// ---------------------------------------------------------------- boot
async function boot() {
  if (!HAS_HALL) $("btn-hall").remove(); else $("btn-help").style.gridColumn = "1 / -1"; // keep the menu grid even
  resize(); new ResizeObserver(resize).observe(stage);
  try { ({ mergeVertices } = await import(JSM + "utils/BufferGeometryUtils.js/+esm")); } catch (e) { mergeVertices = null; }
  try {
    const { RoomEnvironment } = await import(JSM + "environments/RoomEnvironment.js/+esm");
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose();
  } catch (e) {}
  setBackdrop(COURSES[0], 200); buildMenu();
  renderPortraits();
  syncButtons(); refreshWallets(); renderHall();
  Sound.music(0, 128, 0);
  if (glowOn) loadBloom();
  requestAnimationFrame(frame);
  initDB();
}
boot();
