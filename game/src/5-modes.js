
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
function svgBars(entries, valueOf, label, bestIdx) {
  if (!entries.length) return `<text x="8" y="60">No dives yet. Your history shows up here.</text>`;
  const W = 560, H = 120, pad = 18, n = entries.length, max = Math.max(...entries.map(valueOf)) || 1, bw = Math.min(46, (W - pad * 2) / n - 8);
  let s = `<line class="axis" x1="${pad}" y1="${H - 18}" x2="${W - pad}" y2="${H - 18}"/>`;
  entries.forEach((e, i) => {
    const v = valueOf(e), h = Math.max(2, (v / max) * (H - 46)), x = pad + i * ((W - pad * 2) / n) + 4, y = H - 18 - h;
    s += `<rect class="bar${i === bestIdx ? " best" : ""}${i === n - 1 ? " now" : ""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3"/>`;
    s += `<text class="val" x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle">${label(e)}</text>`;
  });
  s += `<text x="${pad}" y="${H - 4}">older</text><text x="${W - pad}" y="${H - 4}" text-anchor="end">latest</text>`;
  return s;
}
function deepChart(sub) {
  const rec = profile.deep[sub], hist = rec.hist.slice(-10);
  const val = sub === "static" ? (e) => e.t : (e) => e.d, lab = sub === "static" ? (e) => fmtT(e.t) : (e) => e.d + "m";
  let bi = -1, bv = -1; hist.forEach((e, i) => { if (val(e) > bv) { bv = val(e); bi = i; } });
  return { svg: svgBars(hist, val, lab, bi), n: rec.hist.length };
}

// ---------------------------------------------------------------- The Big Hold (max breath hold)
const DEEP_SKY = ["#030a0a", "#0a1a19", "#12302d"], FLOOR = -3.7, CEIL = 5.4, TOP_Y = 2.6;
const DEEP_MILES = [[15, "Settling in. Soft shoulders."], [30, "Turtle pace. Relax your jaw.", "turtle"], [45, "Let your body go heavy.", "fish"], [60, "One minute! A seal would nod.", "fish"], [75, "Calm mind, soft body."], [90, "Dolphin territory.", "turtle"], [120, "Two minutes. Whale mode.", "whale"], [150, "Still and quiet.", "fish"], [180, "Three minutes. Legend.", "whale"], [240, "Four minutes. Breathe the moment you need to.", "turtle"], [300, "Five minutes. Freediver numbers.", "whale"]];
const DEEP_COACH = ["Soft shoulders.", "Relax your jaw.", "Let your belly stay soft.", "Thoughts drift by like fish.", "Notice your heartbeat.", "Let go whenever you need to breathe.", "Stay still and soft.", "You're doing great. Stay soft."];
let D = null;
function makeFlag(x, text, color) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.04, .06, 4.2, 8), std(0xe8ddd0, .5, { emissive: color, emissiveIntensity: .6 })); post.position.y = FLOOR + 2.1; g.add(post);
  const s = textSprite(text, "#" + new THREE.Color(color).getHexString(), .55); s.position.y = FLOOR + 4.6; g.add(s); g.userData.own = s.userData.own;
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(1.4); gl.position.y = FLOOR + .2; g.add(gl); g.userData.own.push(gl.material);
  g.position.x = x; g.position.z = -.6; return g;
}
const STATIC_SPEED = 2;
function deepStart(sub) {
  Sound.unlock();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  clearWorld(); menu.visible = false; mode = "deep"; state = "play"; show(null);
  if (backdrop) backdrop.visible = false; sky.visible = false; bdKey = "";
  scene.background = skyTexture(DEEP_SKY); scene.fog = new THREE.Fog(0x0a1a19, 10, 70);
  fireflies.material.uniforms.uColor.value.set(.7, 1.3, 1.2); fireflies.material.uniforms.uY.value = -2;
  const rec = profile.deep[sub];
  D = { sub, st: "ready", t: 0, holdT: 0, holdStart: 0, x: 0, y: TOP_Y, vy: 0, anchorId: null, graceUntil: 0, endT: 0, best: rec.best, last: rec.last,
    ents: [], genX: 14, nextMarker: 10, mile: 0, coachT: 0, coachI: 0, warned: false, newRecord: false, contractT: 50, contractTold: false,
    bonks: 0, strokes: 0, slow: 0, pacerT: 0, fill: .3, creatures: [], result: null, perf: { acc: 0, n: 0 }, event: null, firstBonk: true };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 60), std(0x2a2820, 1)); floor.rotation.x = -Math.PI / 2; floor.position.set(1900, FLOOR, -10); world.add(floor);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(4000, 60), new THREE.MeshStandardMaterial({ color: 0x8fb3ac, emissive: 0x3b5a55, emissiveIntensity: .7, transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false })); surf.rotation.x = Math.PI / 2; surf.position.set(1900, CEIL, -10); world.add(surf);
  D.rays = [];
  for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ map: TEX.ray, color: 0xbfe0d8, transparent: true, opacity: .09, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); r.scale.set(2 + Math.random() * 2.4, 16, 1); r.rotation.z = .32; r.userData = { base: i * 9 + Math.random() * 4, z: -2 - Math.random() * 7, own: [r.material] }; world.add(r); D.rays.push(r); }
  const KN = 70; D.kelp = new THREE.InstancedMesh(new THREE.CylinderGeometry(.05, .09, 1, 5), std(0x4d5a35, 1), KN); D.kelp.frustumCulled = false;
  D.kelpData = [...Array(KN)].map(() => ({ base: Math.random() * 90, z: -1.5 - Math.random() * 9, h: 1.5 + Math.random() * 4, ph: Math.random() * 6 })); world.add(D.kelp);
  const RN = 90, rocks = new THREE.InstancedMesh(GEO.rock, std(0x2f2b26, 1, { flatShading: true }), RN);
  for (let i = 0; i < RN; i++) { const s = .6 + Math.random() * 1.8; _m.compose(_p.set(i * 9 + Math.random() * 6, FLOOR + s * .3, -3 - Math.random() * 9), _q.setFromEuler(_e.set(Math.random(), Math.random(), 0)), _s.set(s, s * .7, s)); rocks.setMatrixAt(i, _m); }
  world.add(rocks);
  const speedOf = (e) => (sub === "static" ? e.t * STATIC_SPEED : e.d);
  if (D.best) world.add(D.bestFlag = makeFlag(speedOf(D.best), "BEST " + (sub === "static" ? fmtT(D.best.t) : D.best.d + "m"), 0xf3d7a8));
  if (D.last && (!D.best || D.last.at !== D.best.at)) world.add(makeFlag(speedOf(D.last), "LAST " + (sub === "static" ? fmtT(D.last.t) : D.last.d + "m"), 0xa89585));
  D.fig = buildBodie({ skin: profile.skin, acc: profile.acc }); D.fig.root.scale.setScalar(FIG); D.fig.root.rotation.y = Math.PI / 2 - .65; D.fig.head.rotation.y = -.35;
  D.swimmer = new THREE.Group(); D.swimmer.add(D.fig.root); world.add(D.swimmer);
  buildDeepHUD();
  hudEl.hidden = false;
  camPos.set(-4, 4, 14); camLook.set(2, 2, 0);
  Sound.music(3, 72, 2); Sound.hold(false);
}
function buildDeepHUD() {
  const dash = D.sub === "dash";
  hudEl.innerHTML = `<div class="hp">${lungsHTML()}<div class="hp-stats"><div class="hp-label">${dash ? "HOLD · DASH" : "BREATH HOLD"}</div><div class="hp-score big" id="dh-time">0.0s</div><div class="hp-sub" id="dh-sub"></div></div></div>
    <div class="track"><div class="t-line" id="dh-line"><span class="t-end"></span>${D.best ? `<span class="pin best" id="dh-pin-best" title="Best"></span>` : ""}${D.last && (!D.best || D.last.at !== D.best.at) ? `<span class="pin last" id="dh-pin-last" title="Last"></span>` : ""}<img class="mk p0" alt="Bodie" ${PORTRAIT.bodie ? `src="${PORTRAIT.bodie}"` : ""}></div><div class="t-txt" id="dh-txt"></div></div>
    <div class="hp right"><div class="hp-stats"><div class="hp-label">${dash ? "DISTANCE" : "SWUM"}</div><div class="hp-score" id="dh-dist">0 m</div><div class="hp-sub" id="dh-sub2"></div></div></div>`;
  const parts = { fill: hudEl.querySelector(".l-fill"), ring: hudEl.querySelector("circle"), time: $("dh-time"), sub: $("dh-sub"), dist: $("dh-dist"), sub2: $("dh-sub2"), txt: $("dh-txt"), mk: hudEl.querySelector(".mk.p0"), pb: $("dh-pin-best"), pl: $("dh-pin-last"), last: {} };
  const fmtV = (e) => (D.sub === "static" ? fmtT(e.t) : e.d + "m");
  parts.sub.textContent = [D.best ? "BEST " + fmtV(D.best) : "", D.last ? "LAST " + fmtV(D.last) : ""].filter(Boolean).join(" · ") || "FIRST DIVE";
  D.hud = parts;
}
function updateDeepHUD() {
  const h = D.hud, dash = D.sub === "dash", cur = dash ? D.x : D.holdT, bestV = D.best ? (dash ? D.best.d : D.best.t) : 0, lastV = D.last ? (dash ? D.last.d : D.last.t) : 0;
  const scaleMax = Math.max(bestV, lastV, cur, dash ? 40 : 30) * 1.15;
  setIf(h, "t", D.holdT.toFixed(1), () => (h.time.textContent = fmtT(D.holdT)));
  setIf(h, "d", Math.round(D.x), (v) => (h.dist.textContent = v + " m"));
  setIf(h, "s2", dash ? `BONKS ${D.bonks}` : `DEPTH ${Math.round(Math.max(0, TOP_Y - D.y) * 3)} m`, (v) => (h.sub2.textContent = v));
  const fillPct = D.st === "hold" ? 100 : Math.round(D.fill * 100);
  setIf(h, "f", fillPct, (v) => (h.fill.style.clipPath = `inset(${100 - v}% 0 0 0)`));
  const ring = bestV ? Math.min(1, cur / bestV) : 0;
  setIf(h, "r", Math.round(ring * 100), (v) => (h.ring.style.strokeDashoffset = String(289 * (1 - v / 100))));
  const pct = (v) => (clamp01(v / scaleMax) * 100).toFixed(1) + "%";
  h.mk.style.left = pct(cur); if (h.pb) h.pb.style.left = pct(bestV); if (h.pl) h.pl.style.left = pct(lastV);
  let txt;
  if (D.st === "ready") txt = `<span class="dim">${D.best ? "BEAT " + (dash ? D.best.d + "m" : fmtT(D.best.t)) : "SET YOUR FIRST RECORD"}</span>`;
  else if (D.newRecord) txt = `<span class="gold">NEW RECORD · +${dash ? Math.round(cur - bestV) + "m" : (cur - bestV).toFixed(1) + "s"}</span>`;
  else if (D.best) txt = `<span class="dim">${dash ? Math.max(0, Math.ceil(bestV - cur)) + "m" : Math.max(0, bestV - cur).toFixed(1) + "s"} TO YOUR BEST</span>`;
  else txt = `<span class="dim">FIRST DIVE · EVERY SECOND COUNTS</span>`;
  if (D.last && D.st === "hold") txt += `<br><span class="${cur >= lastV ? "lead" : "dim"}">${cur >= lastV ? "PAST YOUR LAST DIVE" : "LAST DIVE " + (dash ? lastV + "m" : fmtT(lastV))}</span>`;
  setIf(h, "x", txt, (v) => (h.txt.innerHTML = v));
}
function deepAnchorDown(id) {
  if (!D || state !== "play") return;
  if (D.anchorId !== null && D.anchorId !== id) { deepStroke(); return; }
  D.anchorId = id;
  if (D.st === "ready") { D.st = "hold"; D.holdT = 0; D.holdStart = performance.now(); D.graceUntil = 0; D.t = 0; Sound.play("inhale"); Sound.hold(true, .85); D.fig.press(); D.event = null; Voice.say("Hold", true, true); }
  else if (D.st === "hold" && D.graceUntil) D.graceUntil = 0;
}
function deepAnchorUp(id) {
  if (!D || id !== D.anchorId) return;
  D.anchorId = null;
  if (D.st === "hold") D.graceUntil = performance.now() + 250; // a slipped thumb gets a quarter second to come back
}
function deepStroke() {
  if (!D || D.st !== "hold" || D.sub !== "dash") return;
  D.vy = 2.9; D.strokes++; Sound.play("stroke");
  emit({ x: D.x - .3, y: D.y + .8, z: 0, n: 5, speed: .6, up: 1, color: 0xcfe2de, size: .14, grav: -1, life: .9 });
}
function deepGen() {
  if (D.sub !== "dash") return;
  while (D.genX < D.x + 40) {
    const x = D.genX, r = Math.random();
    if (r < .5) {
      const c = -1.3 + Math.random() * 4, gap = 3.3 - Math.min(.5, D.x / 600), hb = c - gap / 2 - FLOOR, ht = CEIL - (c + gap / 2);
      const lo = makeCoral(hb, false); lo.position.set(x, FLOOR, 0); world.add(lo);
      const hi = makeCoral(ht, true); hi.position.set(x, CEIL, 0); world.add(hi);
      D.ents.push({ type: "gate", x, lo: FLOOR + hb, hi: CEIL - ht, meshes: [lo, hi], hit: false });
    } else if (r < .85) {
      const y = -2 + Math.random() * 5.5, j = makeJelly(); j.position.set(x, y, 0); world.add(j);
      D.ents.push({ type: "jelly", x, y, y0: y, ph: Math.random() * 6, meshes: [j], hit: false });
    } else {
      for (let k = 0; k < 3; k++) { const u = new THREE.Group(); const core = new THREE.Mesh(GEO.sphere, std(0x1d1418, .6)); core.scale.setScalar(.35); u.add(core); for (let s = 0; s < 14; s++) { const sp = new THREE.Mesh(GEO.cone, std(0x2a1d22, .6)); sp.scale.set(.05, .5, .05); const dir = new THREE.Vector3(Math.random() - .5, Math.random() * .8, Math.random() - .5).normalize(); sp.position.copy(dir).multiplyScalar(.4); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); u.add(sp); } u.position.set(x + k * 1.1, FLOOR + .3, 0); world.add(u); D.ents.push({ type: "urchin", x: x + k * 1.1, y: FLOOR + .3, meshes: [u], hit: false }); }
    }
    D.genX += 7 + Math.random() * 3;
  }
  D.ents = D.ents.filter((e) => { if (e.x < D.x - 20) { e.meshes.forEach((m) => { world.remove(m); disposeGroup(m); }); return false; } return true; });
}
function deepCollide(by) {
  for (const e of D.ents) {
    if (e.hit) continue; const dx = e.x - D.x; if (Math.abs(dx) > 1.2) continue;
    let hit = false;
    if (e.type === "gate") hit = Math.abs(dx) < .55 && (by < e.lo + .5 || by > e.hi - .5);
    else if (e.type === "jelly") hit = Math.hypot(dx, e.y - by) < .85;
    else hit = Math.hypot(dx, e.y - by) < .85;
    if (hit) {
      e.hit = true; D.bonks++; D.x -= 1.6; D.slow = .8; D.vy = e.type === "gate" && by < e.lo + .5 ? 2.5 : -1.5;
      Sound.play("bonk"); D.fig.press(); emit({ x: D.x + .5, y: by, z: 0, n: 12, speed: 3, color: 0xcfe2de, size: .2, grav: 0, life: .5 });
      D.event = { text: "BONK!", sub: D.firstBonk ? (coarse ? "Tap with another finger to swim up. Keep your thumb down" : "Tap ↑ to swim up. Keep holding Space") : "-1.6m · keep holding", kind: "warn", until: D.t + 1.4 };
      D.firstBonk = false;
    }
  }
}
function spawnCreature(kind) {
  const c = kind === "turtle" ? makeTurtle() : kind === "whale" ? makeWhale() : makeFishSchool();
  const z = kind === "whale" ? -16 : kind === "turtle" ? -3 : -2.2, v = kind === "whale" ? 1 : kind === "turtle" ? .7 : -1.4;
  c.position.set(D.x + (kind === "whale" ? 34 : 16), kind === "whale" ? 1 : .5 + Math.random() * 2, z); if (v < 0) c.rotation.y = Math.PI;
  world.add(c); D.creatures.push({ obj: c, v });
}
function endHold() {
  if (D.holdT < 2) {
    D.st = "ready"; D.x = 0; D.y = TOP_Y; D.vy = 0; D.holdT = 0; Sound.hold(false);
    D.ents.forEach((e) => e.meshes.forEach((m) => { world.remove(m); disposeGroup(m); })); D.ents = []; D.genX = 14;
    D.event = { text: "TOO QUICK", sub: "Press and keep holding to start the dive", kind: "warn", until: D.t + 2 };
    return;
  }
  D.st = "surface"; D.endT = 0; Sound.hold(false); Sound.play("surface");
  emit({ x: D.x + .4, y: D.y + 1.4, z: 0, n: 40, speed: 2, up: 2.5, color: 0xcfe2de, size: .2, grav: -2, life: 1.6 });
  const entry = { t: +D.holdT.toFixed(1), d: Math.max(0, Math.round(D.x)), at: Date.now(), bonks: D.bonks };
  const rec = profile.deep[D.sub], prevBest = rec.best, prevLast = rec.last;
  rec.hist.push(entry); if (rec.hist.length > 30) rec.hist.shift(); rec.last = entry;
  const better = D.sub === "static" ? (!prevBest || entry.t > prevBest.t) : (!prevBest || entry.d > prevBest.d || (entry.d === prevBest.d && entry.t > prevBest.t));
  if (better) rec.best = entry;
  const leaves = Math.floor(entry.t / 3) + (D.sub === "dash" ? Math.floor(entry.d / 10) : 0); profile.leaves += leaves;
  D.result = { entry, prevBest, prevLast, better, leaves };
  save(); postScore();
  Voice.say(better ? "New record! Breathe in." : "Breathe in. Nice and slow.", true, true);
}
function updateDeep(dt) {
  D.t += dt;
  const dash = D.sub === "dash";
  let cue = null;
  if (D.st === "ready") {
    D.pacerT += dt; const c = D.pacerT % 10, inhale = c < 4;
    D.fill += ((inhale ? 1 : .05) - D.fill) * Math.min(1, dt * (inhale ? .9 : .6));
    D.y = TOP_Y + Math.sin(D.t * 1.2) * .12;
    const sub = coarse ? (dash ? "Ready? Thumb down and keep it there. Tap a 2nd finger to swim up" : "Ready? Put a thumb on the screen and keep it there") : (dash ? "Ready? Hold Space or the mouse. Tap ↑ to swim up" : "Ready? Hold Space or the mouse button. Don't let go");
    cue = { text: inhale ? `BREATHE IN · ${Math.ceil(4 - c)}` : `BREATHE OUT SLOWLY · ${Math.ceil(10 - c)}`, sub, kind: "sea", anim: inhale ? "pin" : "pout" };
    D.fig.update(dt, D.fill, false, null, D.fill * .7, 0);
    D.fig.pose(dt, { mode: "swim", rate: .3 });
    D.swimmer.rotation.z += (0 - D.swimmer.rotation.z) * Math.min(1, dt * 3);
  } else if (D.st === "hold") {
    // The hold is timed on the real clock, never on frames, so a slow device can't shortchange a record.
    const now = performance.now(); D.holdT = (Math.min(now, D.graceUntil || now) - D.holdStart) / 1000;
    if (D.graceUntil && now >= D.graceUntil) { endHold(); return; }
    Sound.heart(.85 + Math.min(.35, D.holdT / 200));
    if (D.slow > 0) D.slow -= dt;
    const spd = (dash ? 3 * (1 + Math.min(.4, D.holdT / 300)) : STATIC_SPEED) * (D.slow > 0 ? .4 : 1);
    if (dash) D.x += spd * dt; else D.x = D.holdT * STATIC_SPEED;
    if (dash) {
      if (D.holdT < 1.2) D.y += (1.2 - D.y) * Math.min(1, dt * 3);
      else { D.vy = Math.max(-2.2, D.vy - 2.4 * dt); D.y += D.vy * dt; if (D.y < FLOOR + .7) { D.y = FLOOR + .7; D.vy = 0; } if (D.y > CEIL - 1.2) { D.y = CEIL - 1.2; D.vy = Math.min(0, D.vy); } }
      deepGen(); deepCollide(D.y + 1.1);
    } else D.y += ((D.holdT < 6 ? 1.5 - D.holdT * .2 : .3 + Math.sin(D.holdT * .2) * .3) - D.y) * Math.min(1, dt * 1.2);
    D.fill = 1;
    D.fig.update(dt, 1, false, "hold", .85 + Math.sin(D.t * 2) * .15, .6);
    D.fig.pose(dt, { mode: "swim", rate: dash ? 1.2 : .6 });
    D.swimmer.rotation.z += (-.5 - D.swimmer.rotation.z) * Math.min(1, dt * 2);
    // milestones, coaching, benchmarks
    const m = DEEP_MILES[D.mile];
    if (m && D.holdT >= m[0]) { D.mile++; D.event = { text: fmtT(m[0]).replace(".0", ""), sub: m[1], kind: "sea", until: D.t + 3 }; Sound.play("soft", 19); if (m[2]) spawnCreature(m[2]); Voice.say(m[0] < 60 ? `${m[0]} seconds` : `${m[0] / 60 | 0} minute${m[0] >= 120 ? "s" : ""}${m[0] % 60 ? " thirty" : ""}`, true, true); }
    const bestV = D.best ? (dash ? D.best.d : D.best.t) : 0, cur = dash ? D.x : D.holdT;
    if (D.best && !D.warned && cur > bestV - (dash ? 15 : 10) && cur < bestV) { D.warned = true; D.event = { text: dash ? "15 METERS TO YOUR BEST" : "10 SECONDS TO YOUR BEST", sub: "Stay soft. Let go whenever you need air", kind: "good", until: D.t + 3 }; Sound.play("soft", 24); }
    if (D.best && !D.newRecord && cur > bestV) { D.newRecord = true; D.event = { text: "NEW RECORD!", sub: "Every second now is a win. Let go whenever you need to", kind: "good", until: D.t + 3.5 }; Sound.play("record"); emit({ x: D.x, y: D.y + 1.2, z: 0, n: 40, speed: 4, color: 0xf3d7a8, size: .25, grav: 0, life: 1, add: true }); }
    if (D.holdT > D.contractT && !reduceMotion) { D.contractT = D.holdT + 8 + Math.random() * 4; D.fig.press(); if (!D.contractTold) { D.contractTold = true; D.event = { text: "", sub: "Feel a squeeze? That's a contraction. Normal. Let go any time", kind: "sea", until: D.t + 4.5 }; } }
    D.coachT += dt; if (D.coachT > 9) { D.coachT = 0; D.coachI = (D.coachI + 1) % DEEP_COACH.length; }
    cue = { text: "", sub: dash && D.holdT < 8 ? (coarse ? "Thumb stays down. Tap another finger to swim up" : "Keep holding. Tap ↑ to swim up") : DEEP_COACH[D.coachI], kind: "sea" };
    if (Math.random() < dt * 2) emit({ x: D.x + .3, y: D.y + 1.5, z: 0, n: 1, speed: .2, up: 1, color: 0xcfe2de, size: .1, grav: -1, life: 1.4 });
  } else if (D.st === "surface") {
    D.endT += dt;
    D.y += (TOP_Y - D.y) * Math.min(1, dt * 2.5);
    const k = D.endT;
    D.fill = k < 1.2 ? Math.max(0, 1 - k) : k < 3.4 ? (k - 1.2) / 2.2 : Math.max(.05, 1 - (k - 3.4) / 2.6);
    D.fig.update(dt, D.fill, false, null, D.fill, 0); D.fig.pose(dt, { mode: "swim", rate: .3 });
    D.swimmer.rotation.z += (0 - D.swimmer.rotation.z) * Math.min(1, dt * 3);
    cue = k < 1.2 ? { text: "BREATHE", sub: "You did it. Air time", kind: "sea" } : k < 3.4 ? { text: "BREATHE IN", sub: "Recovery breath · tap to skip", kind: "sea" } : { text: "BREATHE OUT", sub: "Slow and easy · tap to skip", kind: "sea" };
    if (k > 6) { showDeepResult(); return; }
  }
  D.swimmer.position.set(D.x, D.y, 0);
  // ambience
  const camX = camLook.x;
  D.kelpData.forEach((k, i) => { const x = camX - 30 + (((k.base - (camX - 30)) % 90) + 90) % 90; _m.compose(_p.set(x, FLOOR + k.h / 2, k.z), _q.setFromEuler(_e.set(0, 0, Math.sin(D.t * .8 + k.ph) * .12)), _s.set(1, k.h, 1)); D.kelp.setMatrixAt(i, _m); });
  D.kelp.instanceMatrix.needsUpdate = true;
  D.rays.forEach((r) => { r.position.set(camX - 25 + (((r.userData.base - (camX - 25)) % 72) + 72) % 72, 1.5, r.userData.z); r.material.opacity = .07 + Math.sin(D.t * .5 + r.userData.base) * .03; });
  D.ents.forEach((e) => { if (e.type === "jelly") { e.y = e.y0 + Math.sin(D.t * 1.3 + e.ph) * .6; e.meshes[0].position.y = e.y; e.meshes[0].scale.y = 1 + Math.sin(D.t * 3 + e.ph) * .08; } });
  D.creatures = D.creatures.filter((c) => { c.obj.position.x += c.v * dt; if (c.obj.userData.tick) c.obj.userData.tick(D.t); if (c.obj.position.x < D.x - 40) { world.remove(c.obj); disposeGroup(c.obj); return false; } return true; });
  if (D.st === "hold" && D.x >= D.nextMarker - 20) { const s = textSprite(D.nextMarker + " m", "#8FB3AC", .45); s.position.set(D.nextMarker, FLOOR + .6, -1.4); world.add(s); D.nextMarker += 10; }
  if (D.event && D.t < D.event.until) showCallout(D.event); else showCallout(cue);
  updateDeepHUD();
  soloCamera(dt, D.x, D.y + 1.1, .35, .56, 12, 6.5, CEIL);
  perfGuard(dt, D.perf);
}
function deepIdle(dt) {
  D.t += dt; D.fill = .35 + Math.sin(D.t * 1.1) * .25;
  D.fig.update(dt, D.fill, false, null, D.fill, 0); D.fig.pose(dt, { mode: "swim", rate: .3 });
  D.y = TOP_Y + Math.sin(D.t * 1.2) * .12; D.swimmer.position.set(D.x, D.y, 0);
  soloCamera(dt, D.x, D.y + 1.1, .35, .56, 12, 6.5, CEIL);
}
function showDeepResult() {
  const r = D.result, e = r.entry, dash = D.sub === "dash";
  $("res-eyebrow").textContent = `The Big Hold, ${dash ? "Dash" : "Static"}`;
  const t = $("res-title"); t.textContent = r.better ? "New record" : "Nice dive"; t.className = r.better ? "win" : "sea";
  const diff = r.prevBest ? (dash ? `${e.d - r.prevBest.d >= 0 ? "+" : ""}${e.d - r.prevBest.d}m vs your best` : `${e.t - r.prevBest.t >= 0 ? "+" : ""}${(e.t - r.prevBest.t).toFixed(1)}s vs your best`) : "Your first recorded dive. Now there's a flag to beat.";
  $("res-line").textContent = r.better && r.prevBest ? `You beat your old best of ${dash ? r.prevBest.d + "m" : fmtT(r.prevBest.t)}. ${diff}.` : diff;
  const ch = deepChart(D.sub);
  $("res-body").innerHTML = `<div class="big-num">${dash ? e.d + " m" : fmtT(e.t)}</div>
    <div class="bench"><span>Held <b>${fmtT(e.t)}</b></span><span>Swum <b>${e.d} m</b></span>${dash ? `<span>Bonks <b>${e.bonks}</b></span>` : ""}${r.prevLast ? `<span>Last <b>${dash ? r.prevLast.d + "m" : fmtT(r.prevLast.t)}</b></span>` : ""}<span>Gold Leaves <b>+${r.leaves}</b></span>${r.better ? `<span class="badge">New ${dash ? "distance" : "hold"} record</span>` : ""}</div>
    <svg class="chart" viewBox="0 0 560 120" role="img" aria-label="Your last ${Math.min(10, ch.n)} dives">${ch.svg}</svg>
    <p class="muted">Next dive, a flag on the sea floor marks your best and your last one. Rest a couple of minutes between max holds.</p>`;
  const next = $("btn-next"); next.hidden = false; next.textContent = dash ? "Try Static" : "Try Dash"; next.onclick = () => openDeep(dash ? "static" : "dash");
  $("btn-again").textContent = "Dive again"; $("btn-again").onclick = () => deepStart(D.sub);
  state = "result"; refreshWallets(); show("ov-result"); hudEl.hidden = true; showCallout(null);
}

// ---------------------------------------------------------------- Breath Surf (guided breathwork techniques)
const PATTERNS = [
  { key: "coherent", name: "Resonance Breathing", goal: "Even pace", desc: "5.5 seconds in, 5.5 out. About five and a half breaths a minute.", phases: [["in", 5.5], ["out", 5.5]], cycles: 6 },
  { key: "box", name: "Box Breathing", goal: "Square", desc: "4 in, 4 hold, 4 out, 4 hold.", phases: [["in", 4], ["hold", 4], ["out", 4], ["hold0", 4]], cycles: 4 },
  { key: "478", name: "4-7-8 Breathing", goal: "Long exhale", desc: "4 in, 7 hold, 8 out. The exhale runs twice as long as the inhale.", phases: [["in", 4], ["hold", 7], ["out", 8]], cycles: 4 },
  { key: "sigh", name: "Physiological Sigh", goal: "Double inhale", desc: "2 in, 1 more in, 6 out. Two breaths in, one long breath out.", phases: [["in", 2, .72], ["in2", 1, 1], ["out", 6]], cycles: 6 },
  { key: "power", name: "Power Breaths", goal: "Fast pace", desc: "25 quick, full breaths, then a calm 15 second hold. Sit down for this one.", power: true, cycles: 1 },
];
const SURF_SPEED = 2.4, RIB_BASE = 1.4, RIB_AMP = 2.6;
let S = null;
function buildTimeline(p) {
  let phases = p.phases;
  if (p.power) { phases = []; for (let i = 0; i < 25; i++) phases.push(["in", 1.2], ["out", 1.2]); phases.push(["in", 1.5], ["hold", 15], ["out", 3]); }
  const segs = [{ type: "ready", t0: 0, t1: 3, from: 0, to: 0 }];
  let t = 3, lvl = 0, n = 0;
  for (let c = 0; c < (p.power ? 1 : p.cycles); c++) for (const ph of phases) {
    const [type, dur, target] = ph; const to = type === "in" || type === "in2" ? (target ?? 1) : type === "out" ? 0 : lvl;
    if (type === "in") n++;
    segs.push({ type, t0: t, t1: t + dur, from: lvl, to, cycle: c, n }); t += dur; lvl = to;
  }
  segs.push({ type: "end", t0: t, t1: t + 2, from: lvl, to: lvl });
  const firstIn = phases.find((x) => x[0] === "in"), firstOut = phases.find((x) => x[0] === "out");
  return { segs, T: t, rise: (firstIn[2] ?? 1) / firstIn[1], fall: 1 / firstOut[1], breaths: n };
}
function segAtT(tl, t) { for (const s of tl.segs) if (t >= s.t0 && t < s.t1) return s; return tl.segs[tl.segs.length - 1]; }
function levelAt(tl, t) { const s = segAtT(tl, t); if (s.type === "in" || s.type === "in2" || s.type === "out") { const k = clamp01((t - s.t0) / (s.t1 - s.t0)); return lerp(s.from, s.to, .5 - Math.cos(k * Math.PI) / 2); } return s.from; }
const ribY = (l) => RIB_BASE + l * RIB_AMP;
function surfStart(pi) {
  Sound.unlock();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const p = PATTERNS[pi];
  clearWorld(); menu.visible = false; mode = "surf"; state = "play"; show(null);
  const tl = buildTimeline(p), len = tl.T * SURF_SPEED + 40;
  setBackdrop(COURSES[1], len); if (backdrop) backdrop.visible = true;
  S = { pi, p, tl, t: 0, h: 0, pressed: 0, inSync: 0, active: 0, orbs: [], got: 0, total: 0, lastSeg: null, perf: { acc: 0, n: 0 }, done: false, endT: 0 };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(len + 200, 60), M.waterTop); water.rotation.x = -Math.PI / 2; water.position.set(len / 2, -.4, -10); world.add(water);
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(len + 200, 60), M.bed); deep.rotation.x = -Math.PI / 2; deep.position.set(len / 2, -1.6, -10); world.add(deep);
  // the ribbon: a soft band (the tolerance) with a bright centre line
  const N = Math.ceil(tl.T / .1) + 1, band = new Float32Array(N * 6), line = new Float32Array(N * 6), idx = [];
  for (let i = 0; i < N; i++) {
    const t = i * .1, x = t * SURF_SPEED, y = ribY(levelAt(tl, t));
    band.set([x, y - .38, 0, x, y + .38, 0], i * 6); line.set([x, y - .05, .01, x, y + .05, .01], i * 6);
    if (i < N - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const mk = (arr, op) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(arr, 3)); g.setIndex(idx); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xd4a574, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false })); m.userData.own = [m.material]; m.frustumCulled = false; return m; };
  world.add(mk(band, .16), mk(line, .85));
  for (let t = 3.5; t < tl.T; t += .5) { const l = levelAt(tl, t), o = makeSeed(false); o.position.set(t * SURF_SPEED, ribY(l), 0); world.add(o); S.orbs.push({ t, l, mesh: o, done: false }); }
  S.total = S.orbs.length;
  S.fig = buildBodie({ sit: true, skin: profile.skin, acc: profile.acc }); S.fig.root.scale.setScalar(.9); S.fig.root.rotation.y = .5; world.add(S.fig.root);
  buildSurfHUD();
  hudEl.hidden = false;
  camPos.set(-4, 3, 12); camLook.set(2, 2, 0);
  Sound.music(3, 72, 0);
}
function buildSurfHUD() {
  const rec = profile.surf[S.p.key];
  hudEl.innerHTML = `<div class="hp">${lungsHTML()}<div class="hp-stats"><div class="hp-label">IN SYNC</div><div class="hp-score big" id="sh-acc">0%</div><div class="hp-sub">${rec ? `BEST ${rec.best}% · LAST ${rec.last}%` : "FIRST SESSION"}</div></div></div>
    <div class="track"><div class="t-line"><span class="t-end"></span><img class="mk p0" alt="Bodie" ${PORTRAIT.bodie ? `src="${PORTRAIT.bodie}"` : ""}></div><div class="t-txt" id="sh-txt"></div></div>
    <div class="hp right"><div class="hp-stats"><div class="hp-label">ORBS</div><div class="hp-score" id="sh-orbs">0</div><div class="hp-sub">${S.p.goal.toUpperCase()}</div></div></div>`;
  S.hud = { fill: hudEl.querySelector(".l-fill"), ring: hudEl.querySelector("circle"), acc: $("sh-acc"), orbs: $("sh-orbs"), txt: $("sh-txt"), mk: hudEl.querySelector(".mk.p0"), last: {} };
}
const SURF_WORDS = { ready: ["GET READY", "Let go and breathe out", "Get ready"], in: ["BREATHE IN", "Press and hold", "In"], in2: ["SIP MORE AIR", "Keep holding · top up", "More"], hold: ["HOLD", "Keep holding", "Hold"], out: ["BREATHE OUT", "Let go · slow and long", "Out"], hold0: ["HOLD EMPTY", "Stay let go", "Hold"], end: ["DONE", "Breathe normally", null] };
function updateSurf(dt) {
  if (S.done) { S.endT += dt; if (S.endT > 1.8) { showSurfResult(); return; } }
  S.t += dt;
  const tl = S.tl, pressed = S.pressed > 0 && state === "play";
  S.h = clamp01(S.h + (pressed ? tl.rise : -tl.fall) * dt);
  const seg = segAtT(tl, S.t), target = levelAt(tl, S.t), ok = Math.abs(S.h - target) < .16;
  if (seg.type !== "ready" && seg.type !== "end") { S.active += dt; if (ok) S.inSync += dt; }
  if (seg !== S.lastSeg) {
    S.lastSeg = seg;
    const w = SURF_WORDS[seg.type];
    if (w && w[2] && seg.type !== "ready" && !(S.p.power && (seg.type === "in" || seg.type === "out") && seg.t1 - seg.t0 < 1.4)) Voice.say(w[2], true, true);
    if (seg.type !== "ready" && seg.type !== "end") Sound.play("soft", seg.type === "in" || seg.type === "in2" ? 19 : seg.type === "out" ? 12 : 16);
    if (seg.type === "end" && !S.done) { S.done = true; }
  }
  for (const o of S.orbs) if (!o.done && S.t >= o.t) { o.done = true; if (Math.abs(S.h - o.l) < .2) { S.got++; Sound.play("orb", Math.round(o.l * 12)); emit({ x: o.t * SURF_SPEED, y: ribY(o.l), z: 0, n: 6, speed: 1.5, color: 0xf3d7a8, size: .16, grav: 0, life: .4, add: true }); world.remove(o.mesh); } else o.mesh.visible = false; }
  const x = S.t * SURF_SPEED, y = ribY(S.h);
  S.fig.root.position.set(x, y - .9, 0);
  const hold = seg.type === "hold" || (seg.type === "in2");
  S.fig.update(dt, S.h, false, hold && S.h > .75 ? "hold" : null, S.h, ok ? .5 : 0);
  S.fig.root.rotation.y = .5 + Math.sin(S.t * .4) * .1;
  if (ok && Math.random() < dt * 8) emit({ x, y: y - .2, z: 0, n: 1, speed: .4, vx: -1, color: 0xd4a574, size: .16, grav: 0, life: .6, add: true });
  // cue band
  const w = SURF_WORDS[seg.type], left = Math.max(0, Math.ceil(seg.t1 - S.t));
  let text = w[0] + (seg.type !== "end" ? " · " + left : ""), sub = w[1];
  if (S.p.power && seg.type !== "ready" && seg.type !== "end") { if (seg.t1 - seg.t0 < 1.4) { text = seg.type === "in" ? "IN" : "OUT"; sub = `Power breath ${seg.n} of 25 · full in, easy out`; } else if (seg.type === "hold") sub = "Calm hold. Let go early if you need to"; }
  showCallout({ text, sub, kind: ok || seg.type === "ready" ? "good" : "", anim: seg.type + seg.t0 });
  // HUD
  const h = S.hud, acc = S.active > 0 ? Math.round(S.inSync / S.active * 100) : 0;
  setIf(h, "a", acc, (v) => (h.acc.textContent = v + "%"));
  setIf(h, "o", S.got, (v) => (h.orbs.textContent = `${v}/${S.total}`));
  setIf(h, "f", Math.round(S.h * 100), (v) => (h.fill.style.clipPath = `inset(${100 - v}% 0 0 0)`));
  setIf(h, "r", ok ? 100 : 0, (v) => (h.ring.style.strokeDashoffset = String(289 * (1 - v / 100))));
  h.mk.style.left = (clamp01(S.t / tl.T) * 100).toFixed(1) + "%";
  const cyc = S.p.power ? `BREATH ${Math.min(25, seg.n || 0)} OF 25` : `CYCLE ${Math.min(S.p.cycles, (seg.cycle ?? 0) + 1)} OF ${S.p.cycles}`;
  setIf(h, "x", `<span class="gold">${S.p.name.toUpperCase()}</span><br><span class="dim">${cyc}</span>`, (v) => (h.txt.innerHTML = v));
  soloCamera(dt, x, RIB_BASE + RIB_AMP / 2, .32, .52, 11, 5.6);
  perfGuard(dt, S.perf);
}
function surfIdle(dt) {
  S.t += dt * .3; const x = S.tl.T * SURF_SPEED, y = ribY(.3 + Math.sin(S.t * 2) * .1);
  S.fig.update(dt, .4 + Math.sin(S.t * 3) * .2, false, null, .4, 0); S.fig.root.position.set(x, y - .9, 0);
  soloCamera(dt, x, RIB_BASE + RIB_AMP / 2, .32, .52, 11, 5.6);
}
function showSurfResult() {
  const acc = S.active > 0 ? Math.round(S.inSync / S.active * 100) : 0, stars = acc >= 88 ? 3 : acc >= 75 ? 2 : acc >= 60 ? 1 : 0;
  const prev = profile.surf[S.p.key], better = !prev || acc > prev.best;
  const leaves = Math.floor(S.got / 2) + stars * 5; profile.leaves += leaves;
  profile.surf[S.p.key] = { best: Math.max(acc, prev ? prev.best : 0), last: acc, stars: Math.max(stars, prev ? prev.stars : 0) };
  save();
  $("res-eyebrow").textContent = `Breath Surf, ${S.p.goal.toLowerCase()}`;
  const t = $("res-title"); t.textContent = S.p.name; t.className = "win";
  $("res-line").textContent = acc >= 88 ? "Locked in. Your breath and Bodie moved as one." : acc >= 75 ? "Smooth. A little more patience on the long phases." : acc >= 60 ? "Good start. Follow the ribbon a beat earlier." : "Keep practicing: press as you start breathing in, let go as you start breathing out.";
  $("res-body").innerHTML = `<div class="big-num">${acc}%</div><div class="stars" aria-label="${stars} of 3 stars">${"★".repeat(stars)}<i>${"★".repeat(3 - stars)}</i></div>
    <div class="bench"><span>Orbs <b>${S.got}/${S.total}</b></span>${prev ? `<span>Best ${better ? "was " : ""}<b>${prev.best}%</b></span><span>Last <b>${prev.last}%</b></span>` : ""}<span>Gold Leaves <b>+${leaves}</b></span>${better && prev ? `<span class="badge">New best</span>` : ""}</div>
    <p class="muted">${S.p.desc}</p>`;
  const next = $("btn-next"), ni = (S.pi + 1) % PATTERNS.length; next.hidden = false; next.textContent = "Next: " + PATTERNS[ni].name; next.onclick = () => surfStart(ni);
  $("btn-again").textContent = "Again"; $("btn-again").onclick = () => surfStart(S.pi);
  state = "result"; refreshWallets(); show("ov-result"); hudEl.hidden = true; showCallout(null);
}
