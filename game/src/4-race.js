
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
    d.innerHTML = `${lungsHTML()}<div class="hp-stats"><div class="hp-label">${n > 1 ? "PLAYER " + (i + 1) : "BREATH"}</div><div class="hp-score">0</div><div class="hp-sub"><span class="s-seeds">0</span> SEEDS <span class="s-extra"></span></div></div>`;
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
    if (P.charge > 0) bits.push(`<span class="hot">LUNGS ${Math.round((1 + P.charge) * 100)}%</span>`);
    if (G.co.sigh) bits.push(P.sigh >= 1 ? `<span class="ready">SIGH READY</span>` : `SIGH ${Math.round(P.sigh * 100)}%`);
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
      // power pad, then a long stretch of thin air you must hold through
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
  event("PFFFT!", "You held too long. Let go when the lungs flash red", "warn", 1.4);
  if (voiceFor(P)) Voice.say("Too long! Breathe!", true);
}
function pop(P, zap) {
  P.inflate = 0; P.smogT = 0; P.dizzy = .9; P.pops++; hurt(P, .5, 1.3); P.breath = Math.max(0, P.breath - 1);
  Sound.play(zap ? "zap" : "pop");
  emit({ x: P.x, y: bodyY(P), z: P.z, n: 30, speed: 5, color: zap ? 0x6a5a70 : 0x8f8580, size: .5, grav: -.5, life: 1, grow: 1.5 });
  emit({ x: P.x, y: bodyY(P) + .4, z: P.z, n: 12, speed: 4, color: 0xf3d7a8, size: .2, grav: 5, life: .6, add: true });
  if (zap) { event("ZAP!", "Storms need a sigh: double tap before you reach them", "warn", 1.5); if (voiceFor(P)) Voice.say("Zap! Double tap to sigh!", true); }
  else { event("POP!", "You breathed in the smog. Hold your breath next time", "warn", 1.5); if (voiceFor(P)) Voice.say("Pop! Hold your breath!", true); }
  G.shake = .35;
}
function doSigh(P) {
  P.sigh = 0; P.sighs++; P.sighT = 1.3; Sound.play("sigh");
  G.pendingGust = { P, at: G.t + .35 };
  event("SIGH!", "Two breaths in, one long breath out", "good", 1.1);
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
  if (n) floater(`SIGHED AWAY ${n}`, P.x + 2, bodyY(P) + 1.4, P.z, "#F3D7A8");
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
      if (P.holdT >= 4) { P.boxes++; P.points += 100; P.flow = 3.2; Sound.play("box"); Sound.play("flow"); event("BOX BREATH!", "Flow: +100 and faster legs", "good", 1.4); if (voiceFor(P)) Voice.say("Box breath! Flow!", true); emit({ x: P.x, y: bodyY(P), z: P.z, n: 30, speed: 5, color: 0xf3d7a8, size: .25, grav: 0, life: .9, add: true }); }
      else if (P.holdT > .4 && P.breath / P.cap < .15) { P.clutch++; P.points += 50; Sound.play("clutch"); floater("CLUTCH EXHALE +50", P.x, bodyY(P) + 1.4, P.z, "#F3D7A8"); }
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
  // thin air: hold all the way through or keep coughing
  if (thin) {
    if (!P.inThin) { P.inThin = true; P.thinZonePops = 0; }
    if (!holding) { P.chokeT -= dt; if (P.chokeT <= 0) { P.chokeT = .7; P.thinPops++; P.thinZonePops++; hurt(P, .55, .6); Sound.play("cough"); emit({ x: P.x + .4, y: bodyY(P) + .5, z: P.z, n: 10, speed: 1.5, color: 0x8a8079, size: .35, grav: -.3, life: .6, grow: 1 }); if (voiceFor(P) && P.thinZonePops === 1) Voice.say("Hold your breath!", true); } }
    else { P.chokeT = .25; P.points += dt * 12; }
  } else if (P.inThin) {
    P.inThin = false;
    if (P.thinZonePops === 0) { P.thinCleared++; P.points += 100; floater("THIN AIR CLEARED +100", P.x, bodyY(P) + 1.5, P.z, "#F3D7A8"); Sound.play("calm"); }
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
      if (!e.hit[P.i] && P.inWater && Math.abs(dx) < .85 && P.dive < .45) { e.hit[P.i] = true; P.bonks++; hurt(P, .45, 1); G.shake = .25; Sound.play("bonk"); event("BONK!", "Hold your breath to dive under the logs", "warn", 1.1); }
      if (!e.passed[P.i] && dx < -.9) { e.passed[P.i] = true; if (!e.hit[P.i] && P.inWater) { P.dives++; floater("DIVE", P.x, by + 1.2, P.z, "#8FB3AC"); } }
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
      if (Math.hypot(dx, e.y - by) < 1) { e.dead[0] = true; world.remove(e.mesh); P.breath = Math.min(P.cap, P.breath + 2.5); P.gasp = 0; Sound.play("bubble"); floater("+AIR", e.x, e.y + .6, P.z, "#CFE2DE"); emit({ x: e.x, y: e.y, z: P.z, n: 10, speed: 2.5, color: 0xcfe2de, size: .18, grav: 0, life: .5, add: true }); }
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
}
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
// What should the cue band say for this player? Priority: run-out warning, storms, thin air, clouds and logs, pads, glide, hold states.
function cueFor(P) {
  if (G.over || G.phase !== "race") return null;
  const holding = P.wasHolding, v = Math.max(3, P.v || BASE), frac = P.breath / P.cap;
  if (holding && frac < .22) return { text: "LET IT OUT!", sub: "Let go now, or Bodie goes PFFFT", kind: "warn pulse", voice: "Let it out!", danger: 2 };
  const pad = zoneAt(P.x, "pad"), thinIn = zoneAt(P.x, "thin");
  if (pad) return { text: "TAP TAP TAP!", sub: `Power breaths · lungs at ${Math.round((1 + P.charge) * 100)}%`, kind: "good pulse", voice: "Tap tap tap!", id: "pad" + pad.x0 };
  if (thinIn) return holding ? { text: "KEEP HOLDING", sub: `Thin air · ${Math.ceil(thinIn.x1 - P.x)}m to clear`, kind: "good", danger: frac < .4 ? 1 : 0 } : { text: "HOLD YOUR BREATH!", sub: "Thin air: press and hold all the way through", kind: "warn pulse", voice: "Hold your breath!" };
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
    if (k === "storm") return P.sigh >= 1 ? { text: "DOUBLE TAP TO SIGH!", sub: "Two quick taps blow the storm away", kind: "pulse", voice: "Double tap! Sigh!", id: best.e } : { text: "SIGH RECHARGING", sub: `Storm ahead · sigh ready in ${Math.ceil((1 - P.sigh) * (profile.up.sigh ? 2 : 3))}s`, kind: "warn" };
    if (k === "pad") return { text: "POWER PAD AHEAD", sub: "Get ready to tap as fast as you can", kind: "good", voice: "Power pad!", id: "padAhead" + best.z.x0 };
    if (k === "thin") return holding ? { text: "HOLDING", sub: "Thin air next. Keep it held", kind: "good" } : { text: "HOLD YOUR BREATH!", sub: "Thin air ahead: hold all the way through", kind: "pulse", voice: "Hold your breath!", id: best.z };
    if (k === "ring") return holding ? { text: "GLIDING", sub: "Keep holding to float through the rings", kind: "good" } : { text: "HOLD TO GLIDE!", sub: "Hold your breath to float through the rings", kind: "pulse", voice: "Hold to glide!", id: best.e };
    const isLog = k === "log";
    if (!holding) return { text: "HOLD YOUR BREATH!", sub: isLog ? "Press and hold to dive under the log" : "Worry Cloud ahead. Press and hold", kind: "pulse", voice: isLog ? "Dive! Hold your breath!" : "Hold your breath!", id: best.e };
    return { text: inside ? "KEEP HOLDING" : "HOLDING", sub: isLog ? "Stay under..." : "Right through the smog", kind: "good", danger: frac < .4 ? 1 : 0 };
  }
  if (holding) {
    const need = 4 - P.holdT;
    if (need > 0 && P.breath > need + .25) return { text: "BOX BREATH IN " + need.toFixed(1), sub: "Keep holding for Flow, or let go to breathe", kind: "good", anim: "boxcd" };
    if (need > 0) return { text: "BREATHE OUT", sub: "Let go to refill your lungs", kind: "", voice: "Breathe out" };
    return { text: "LET GO FOR FLOW!", sub: "Box Breath ready", kind: "good pulse" };
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
      else if (k && k.voice && !k.id && k.text !== P.lastVoiceText && voiceFor(P)) { if (k.text !== "BREATHE OUT" || P.holdT > 1.5) Voice.say(k.voice); }
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
  Sound.music(1, G.co.bpm, G.co.key);
}
const CD = [[0, "BREATHE IN", "beep", "Breathe in"], [1.1, "HOLD", "beep", "Hold"], [2.2, "AND...", "beep", null], [3.0, "GO!", "go", "Go!"]];
function updateCountdown(dt) {
  const prev = G.cd; G.cd += dt;
  for (const [t, txt, snd, v] of CD) if (prev <= t && G.cd > t) { $("countdown").hidden = false; const b = $("countdown-t"); b.textContent = txt; b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; Sound.play(snd); if (v) Voice.say(v, true); }
  G.players.forEach((P) => { const f = G.cd < 1.1 ? G.cd / 1.1 : (G.cd < 2.2 ? 1 : 1 - (G.cd - 2.2) / .8); P.fig.update(dt, f, false, G.cd > 1.1 && G.cd < 2.6 ? "hold" : null, f, G.cd > 1.1 && G.cd < 2.6 ? .5 : 0); P.fig.pose(dt, { mode: "idle" }); P.fig.root.position.set(P.x, P.y, P.z); P.shadow.position.set(P.x, .02, P.z); });
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
  if (W) { Sound.play("win"); Voice.say(duel ? `Player ${winner + 1} wins!` : "Bodie wins!", true); launchConfetti(W.x, 2, W.z); event(duel ? `PLAYER ${winner + 1} WINS` : "BODIE WINS!", "First to the Great Tree", "good", 3.4); }
  else { Sound.play("lose"); Voice.say("Kip wins. Breathe, and try again.", true); kipSay("CAW! Winner winner, coffee dinner!"); event("KIP WINS", "So close. Breathe, then rematch", "warn", 3.4); }
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
    const rows = [["", "P1", "P2"], ["Distance", ...G.players.map((P) => Math.floor(Math.min(P.x, G.finish)))], ["Seeds", ...G.players.map((P) => P.seeds + P.gold * 5)], ["Calm passes", ...G.players.map((P) => P.calm)], ["Box Breaths", ...G.players.map((P) => P.boxes)], ["Pops", ...G.players.map((P) => P.pops)], ["Points", ...r.players.map((p) => p.score)]];
    body = `<div class="duel-tally">${rows.map((row, i) => row.map((c) => `<span class="${i === 0 ? "h" : ""}">${c}</span>`).join("")).join("")}</div>`;
  } else {
    const p = r.players[0], P = G.players[0];
    t.textContent = p.won ? "Bodie wins" : "Kip wins"; t.className = p.won ? "win" : "lose";
    const hint = P.pops ? `Bodie popped ${P.pops} time${P.pops > 1 ? "s" : ""}. Hold your breath when the cue says so.` : P.pffts ? "Bodie held too long. Let go when the lungs flash red." : P.thinPops ? "Hold all the way through thin air, and charge up on the power pad first." : "Try a Box Breath for a Flow boost.";
    $("res-line").textContent = p.won ? `Bodie beat Kip to the Great Tree by ${p.margin}m.${p.newBest ? " New best score!" : ""}` : `Kip got there ${p.margin}m ahead. ${hint}`;
    const bench = [];
    if (p.time) bench.push(`<span>Time <b>${fmtT(p.time)}</b></span>`); else bench.push(`<span>Reached <b>${p.pct}%</b></span>`);
    if (p.prevBestTime) bench.push(`<span>Best ${p.newBestTime ? "was " : ""}<b>${fmtT(p.prevBestTime)}</b></span>`);
    if (p.prevLast) bench.push(`<span>Last <b>${p.prevLast.time ? fmtT(p.prevLast.time) : p.prevLast.pct + "%"}</b></span>`);
    if (p.newBestTime) bench.push(`<span class="badge">New best time, ghost saved</span>`);
    body += `<div class="bench">${bench.join("")}</div>`;
    if (p.stars) body += `<ul class="chs">${p.stars.map((s) => `<li class="${s.got ? "got" : ""} ${s.fresh ? "new" : ""}"><span>★</span><span>${s.text}</span></li>`).join("")}</ul>`;
    const rows = [["Distance", Math.floor(Math.min(P.x, G.finish)) + " pts"], ["Seeds, rings, holds and tricks", P.points + " pts"], ["Win bonus", p.winBonus + " pts"], ["<b>Points</b>", `<b>${p.score}</b>`], ["Gold Leaves: seeds + purse", `${p.tokens} + ${p.purse} = +${p.leaves}`], ["Box Breaths, calm passes, best combo", `${P.boxes}, ${P.calm}, x${P.bestCombo}`]];
    if (co.sigh) rows.push(["Storms sighed away", String(P.storms)]);
    if (P.maxCharge > 0 || P.thinCleared) rows.push(["Max lung charge, thin air cleared", `${Math.round((1 + P.maxCharge) * 100)}%, ${P.thinCleared}`]);
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
