
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
