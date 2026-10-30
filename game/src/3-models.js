
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
      if (s.blinking < 0 && (s.nextBlink -= dt) <= 0) s.blinking = 0;
      if (s.blinking >= 0) { const p = (s.blinking += dt) / .16; s.blink = p < .5 ? p * 2 : Math.max(0, 2 - p * 2); if (p >= 1) { s.blinking = -1; s.blink = 0; s.nextBlink = 2 + Math.random() * 3.5; } }
      s.lid += ((phase === "hold" ? 1 : 0) - s.lid) * Math.min(1, dt * 5);
      let open = (1 - s.blink) * (1 - .18 * (1 - fill)) * (1 - .88 * s.lid);
      let squash = 0;
      if (s.press >= 0) { const t = (s.press += dt); open = Math.min(open, t < .7 ? .15 : 1); squash = still ? 0 : Math.sin(t * 18) * Math.exp(-t * 5) * .07; if (t > .9) s.press = -1; }
      for (const eye of eyes) eye.scale.set(.85, 1.3 * Math.max(.08, open), .7);
      body.scale.set(1 + squash, 1 - squash, 1 + squash);
      mouth.visible = phase !== "o"; O.visible = phase === "o";
      if (haloRings) haloRings.rotation.y += dt * .8;
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
      const fast = mood === "sprint" ? 40 : 24, crashed = mood === "crash";
      for (const w of wings) w.pv.rotation.x = w.side * (crashed ? -.3 : Math.sin(t * fast) * .9);
      body.position.set(crashed ? 0 : (Math.random() - .5) * .03, crashed ? 0 : (Math.random() - .5) * .03, 0);
      body.rotation.z = crashed ? Math.sin(t * 14) * .45 : (mood === "sprint" ? -.18 : -.05);
      for (const p of pupils) { if (crashed) { p.position.y = .1 + Math.sin(t * 20) * .04; p.position.x = .24 + Math.cos(t * 20) * .02; } else { p.position.y = .1 + (Math.random() - .5) * .03; p.position.x = .25; } }
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
