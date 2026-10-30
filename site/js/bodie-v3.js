/* Bodie, the GroundApp character, breathing on his terracotta disc. The landing page's one 3D canvas.

   import { mountBodie } from '/js/bodie-v3.js';
   const bodie = mountBodie(canvas, {
     pattern: { inhale: 6, hold: 0, exhale: 6, hold2: 0 }, // seconds, default Resonance 6·6 as in the app
     interactive: true,  // press and hold on the canvas: breathe in and keep filling. Let go: breathe out
     asleep: false,      // true: starts slumped with his eyes shut until react('wake')
     onPhase(phase, remaining, info) {}, // every drawn frame. phase 'inhale' | 'hold' | 'exhale' | 'hold2',
                                         // remaining seconds (float), info { fill 0..1, sip: true in a second sip }
   });
   bodie.setPattern({ inhale: 3, exhale: 6, sip: 1 }); // physiological sigh: the last 1 s of the inhale is a second sip
   bodie.press(); bodie.release();
   bodie.react('wake' | 'wave' | 'lean' | 'cheer', { dir: 'left' | 'right' }); // dir: lean and wave side (screen)
   bodie.setStill(true);  // reduced motion / Low Power: a calm still pose. The belly light still follows the breath,
                          // one short fade per phase, so the canvas paints only at phase changes.
                          // setStill(true, { glow: false }): fully frozen until a press, pattern or resize.
   bodie.destroy();

   Looks like the app's Bodie (screenshots 01-welcome, 03-player): bone white, small dark eyes, peach cheeks, sat
   cross-legged on a terracotta disc. One hand rests on the chest, the other on the belly, which pushes forward on the
   inhale and glows from inside as it fills. Geometry comes from figure-v1.js (copied, not imported, so that file can
   go), raised-arm targets from the game's Bodie (game/src/3-models.js).
   Transparent canvas: the page colour shows through. Pixel ratio capped at 2. The loop sleeps when the canvas is off
   screen or the tab is hidden. Reduced motion starts still and follows the setting if it changes.
   No WebGL: canvas gets data-webgl="off", the breath clock and onPhase still run. First frame: canvas gets .is-live.
   Bump the filename (v4) when editing after a deploy. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const COLORS = { body: '#eee1d2', disc: '#7f4f2c', eye: '#1a110e', cheek: '#d9a97c', inhale: '#c4935a', glow: '#d4a574' };
const Z = new THREE.Vector3(0, 0, 1);
const HEAD_R = 0.56, BELLY_Y = 1.0, RAD = [0.72, 0.72 * 1.06, 0.72 * 0.92];
const OUT = -0.1, IN = 0.24; // belly travel: drawn in at the bottom of the exhale .. full at the top of the inhale
const ORB = new THREE.Vector3(0, -0.2, 1).normalize(); // where the belly glows from: the front, a little below centre
const DISC_R = 1.14, DISC_H = 0.16, SEAT = -0.06; // the disc, and how far the body sits down into it
const STILL_FILL = 0.6; // the belly shape held under reduced motion
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const clamp = (v) => Math.max(-1, Math.min(1, v));
// Studio motion tokens as functions: --ease-breath (sine.inOut), --ease-out (power4.out), --ease-in-out (power3.inOut),
// --ease-expo (expo.out).
const breathEase = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);
const breathInv = (f) => Math.acos(1 - 2 * clamp01(f)) / Math.PI; // the progress at which breathEase reaches f
const easeOut = (p) => 1 - (1 - clamp01(p)) ** 4;
const easeInOut = (p) => { p = clamp01(p); return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2; };
const easeExpo = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * clamp01(p)));
const ramp = (t, a, b) => clamp01((t - a) / (b - a));

// Additive light that also writes alpha, so a glow spilling past Bodie onto the transparent canvas shows as warm
// light over the page colour instead of an invalid premultiplied pixel.
function glowMaterial(Kind, params) {
  return new Kind({ transparent: true, depthWrite: false, toneMapped: false, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, ...params });
}

function radialTexture(color, inner = 0) { // a soft round light: colour in the middle, fading to nothing at the edge
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d'), grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64), c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  grad.addColorStop(0, `rgba(${rgb},1)`);
  if (inner) grad.addColorStop(inner, `rgba(${rgb},0.85)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// The app's disc: a flat puck with a rounded edge, lathed from its profile.
function makeDisc(color) {
  const r = 0.07, pts = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(DISC_R - r + Math.cos(a) * r, r + Math.sin(a) * r)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(DISC_R - r + Math.cos(a) * r, DISC_H - r + Math.sin(a) * r)); }
  pts.push(new THREE.Vector2(0, DISC_H));
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 72), new THREE.MeshStandardMaterial({ color, roughness: 0.78 }));
}

// Place a mesh on a sphere of radius r at (yaw, pitch), its local +Z along the surface normal.
function onSurface(mesh, yaw, pitch, r) {
  const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  mesh.position.copy(d).multiplyScalar(r);
  mesh.quaternion.setFromUnitVectors(Z, d);
  return mesh;
}

// How much a point on the body moves with the breath: most at the front of the low belly, a little at the sides
// and back, almost nothing at the chest (so the chest hand stays nearly still). u = unit direction from the centre.
function bellyWeight(u) {
  const low = Math.exp(-((u.y + 0.18) ** 2) / (2 * 0.36 ** 2));
  return low * (0.12 + 0.88 * Math.max(0, u.z) ** 1.5);
}

// The body: one welded ellipsoid. breathe(d, lit, empty) moves every vertex along its direction by d * weight (only
// when d changed, so a still pose costs nothing), lights a round orb on the front of the belly (emissive, added to the
// standard material's shader) as the lungs fill, and shades the belly a little darker when they are empty.
// surface(dir, d, out) gives the moving surface point in body coordinates.
function makeBelly(bodyColor, inhaleColor, glowColor) {
  let geo = new THREE.SphereGeometry(1, 64, 48);
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  geo = mergeVertices(geo); // weld the seam so recomputed normals stay smooth
  geo.scale(...RAD);
  const pos = geo.attributes.position, n = pos.count;
  const base = Float32Array.from(pos.array), dir = new Float32Array(n * 3), weight = new Float32Array(n), orb = new Float32Array(n);
  const colors = new Float32Array(n * 3), a = new THREE.Color(bodyColor), b = new THREE.Color(inhaleColor), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromArray(base, i * 3).normalize();
    v.toArray(dir, i * 3);
    weight[i] = bellyWeight(v);
    orb[i] = Math.max(0, v.dot(ORB)) ** 3; // a round spot on the front of the belly, brightest in the middle
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('orb', new THREE.BufferAttribute(orb, 1));
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.62 });
  const uGlow = { value: 0 }, uGlowColor = { value: new THREE.Color(glowColor) };
  material.onBeforeCompile = (sh) => { // light from inside: emissive = glow colour x orb shape x how full the lungs are
    sh.uniforms.uGlow = uGlow;
    sh.uniforms.uGlowColor = uGlowColor;
    sh.vertexShader = 'attribute float orb;\nvarying float vOrb;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vOrb = orb;');
    sh.fragmentShader = 'uniform float uGlow;\nuniform vec3 uGlowColor;\nvarying float vOrb;\n' +
      sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uGlowColor * (vOrb * uGlow);');
  };
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = BELLY_Y;
  let lastD = NaN, lastLit = NaN, lastEmpty = NaN;
  function breathe(d, lit, empty) {
    if (d !== lastD) {
      lastD = d;
      for (let i = 0; i < n * 3; i++) pos.array[i] = base[i] + dir[i] * d * weight[(i / 3) | 0];
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
    if (lit !== lastLit || empty !== lastEmpty) {
      lastLit = lit; lastEmpty = empty;
      for (let i = 0; i < n; i++) {
        const g = 0.25 * lit * orb[i], m = 1 - 0.3 * empty * weight[i];
        colors[i * 3] = (a.r + (b.r - a.r) * g) * m;
        colors[i * 3 + 1] = (a.g + (b.g - a.g) * g) * m;
        colors[i * 3 + 2] = (a.b + (b.b - a.b) * g) * m;
      }
      geo.attributes.color.needsUpdate = true;
      uGlow.value = 0.55 * lit; // a soft glow, not a lamp (Collin 2026-10-15: the 1.35 peak was too bright)
    }
  }
  function surface(u, d, out) { // u: unit direction from the body centre; out: Vector3 to fill (body coordinates)
    const r = 1 / Math.sqrt((u.x / RAD[0]) ** 2 + (u.y / RAD[1]) ** 2 + (u.z / RAD[2]) ** 2);
    const p = out.copy(u).multiplyScalar(r), w = bellyWeight(v.copy(p).normalize());
    return p.addScaledVector(v, d * w).add(mesh.position);
  }
  breathe(0, 0, 0);
  return { mesh, breathe, surface };
}

// Bodie on his disc. update(dt, pose) draws one frame; pose is built by mountBodie (breath, reactions, gaze).
function buildBodie(c) {
  const skin = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.6 });
  const root = new THREE.Group();
  const disc = makeDisc(c.disc);
  // Contact shadow where he sits, and the warm light the belly throws on the disc as it fills.
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.7), new THREE.MeshBasicMaterial({
    map: radialTexture('#1a0d06', 0.35), transparent: true, depthWrite: false, opacity: 0.4, toneMapped: false }));
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), glowMaterial(THREE.MeshBasicMaterial, { map: radialTexture(c.glow), opacity: 0 }));
  for (const [m, y] of [[shadow, 0.003], [floorGlow, 0.006]]) { m.rotation.x = -Math.PI / 2; m.position.set(0, DISC_H + y, 0.12); }
  root.add(disc, shadow, floorGlow);

  const body = new THREE.Group(); // pivots at the seat: hop, lean and slump move him from where he sits
  body.position.y = SEAT;
  root.add(body);
  const belly = makeBelly(c.body, c.inhale, c.glow);
  body.add(belly.mesh);
  // The orb's halo: soft light that spills past the belly's outline on the inhale. Drawn without depth test, then the
  // arms, hands and legs after it (renderOrder 11), so the hand on the belly stays a clear shape in front of the light.
  const halo = new THREE.Sprite(glowMaterial(THREE.SpriteMaterial, { map: radialTexture(c.glow), depthTest: false, opacity: 0 }));
  halo.scale.setScalar(1.3);
  halo.renderOrder = 10;
  body.add(halo);
  const limbs = skin.clone();
  limbs.transparent = true;
  const late = (mesh) => { mesh.renderOrder = 11; return mesh; };
  const legGeo = new THREE.CapsuleGeometry(0.17, 0.62, 8, 16);
  for (const side of [-1, 1]) { // crossed legs, one resting on the other
    const leg = late(new THREE.Mesh(legGeo, limbs));
    leg.rotation.set(0, side * 0.34, Math.PI / 2);
    leg.position.set(0, side < 0 ? 0.42 : 0.47, 0.36);
    body.add(leg);
  }

  // Left of screen: the hand across the chest. Right: the hand round the belly. Each arm is one smooth tube through
  // shoulder, elbow, a point halfway round the belly, and the hand, rebuilt when the belly or the arm moves. raise
  // lifts a hand to the game's arms-up targets (wave, cheer); sway swings a raised hand side to side.
  const palmGeo = new THREE.SphereGeometry(0.13, 20, 14);
  const hands = [
    { side: -1, shoulder: new THREE.Vector3(-0.48, 1.28, 0.02), elbowDir: new THREE.Vector3(-0.95, 0, 0.32), dir: new THREE.Vector3(0.05, 0.45, 0.89), lift: 0.04 },
    { side: 1, shoulder: new THREE.Vector3(0.48, 1.24, 0.02), elbowDir: new THREE.Vector3(0.95, -0.12, 0.3), dir: new THREE.Vector3(0.42, -0.26, 0.87), lift: 0.06 },
  ].map((h) => {
    h.elbowDir.normalize(); h.dir.normalize();
    h.midDir = h.elbowDir.clone().add(h.dir).normalize();
    h.elbow = new THREE.Vector3();
    h.mid = new THREE.Vector3();
    h.palm = late(new THREE.Mesh(palmGeo, limbs));
    h.palm.scale.set(1.12, 0.94, 0.86); // a soft mitten resting on the body
    h.curve = new THREE.CatmullRomCurve3([h.shoulder, h.elbow, h.mid, h.palm.position], false, 'centripetal');
    h.arm = late(new THREE.Mesh(new THREE.BufferGeometry(), limbs));
    h.s0 = h.shoulder.clone(); // a raised arm starts higher, from the top of the side, so it grows out of a shoulder
    h.rS = new THREE.Vector3(h.side * 0.44, 1.52, 0.04);
    h.rE = new THREE.Vector3(h.side * 0.92, 1.66, 0.12);
    h.rM = new THREE.Vector3(h.side * 0.95, 2.08, 0.16);
    h.rP = new THREE.Vector3(h.side * 0.78, 2.56, 0.2);
    h.key = '';
    body.add(h.arm, h.palm);
    return h;
  });
  const tmp = new THREE.Vector3();
  function placeHands(d, raise, sway) {
    hands.forEach((h, i) => {
      const r = raise[i], s = sway[i];
      const key = `${d.toFixed(4)}|${r.toFixed(4)}|${s.toFixed(4)}`;
      if (key === h.key) return; // nothing moved: keep last frame's tube
      h.key = key;
      h.shoulder.lerpVectors(h.s0, h.rS, r);
      belly.surface(h.elbowDir, d, h.elbow).addScaledVector(h.elbowDir, 0.1);
      belly.surface(h.midDir, d, h.mid).addScaledVector(h.midDir, 0.1);
      belly.surface(h.dir, d, h.palm.position).addScaledVector(h.dir, h.lift);
      if (r > 0) {
        h.elbow.lerp(h.rE, r);
        h.mid.lerp(tmp.copy(h.rM).add({ x: s * 0.1, y: 0, z: 0 }), r);
        h.palm.position.lerp(tmp.copy(h.rP).add({ x: s * 0.26, y: -Math.abs(s) * 0.06, z: 0 }), r);
      }
      h.arm.geometry.dispose();
      h.arm.geometry = new THREE.TubeGeometry(h.curve, 24, 0.105, 10, false);
    });
  }

  const head = new THREE.Group();
  head.position.y = 1.62; // pivot low in the head, so it turns from the neck
  body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 48, 32), skin);
  skull.position.y = 0.4;
  head.add(skull);
  const eyeMat = new THREE.MeshStandardMaterial({ color: c.eye, roughness: 0.15, metalness: 0.1 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeRig = new THREE.Group(); // turns inside the head, so the eyes slide over its surface
  eyeRig.position.y = 0.4;
  head.add(eyeRig);
  const eyes = [-1, 1].map((side) => {
    const eye = onSurface(new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), eyeMat), side * 0.3, 0.1, HEAD_R * 0.99);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), shine);
    dot.position.set(-0.025, 0.035, 0.06);
    eye.add(dot);
    eyeRig.add(eye);
    return eye;
  });
  const face = new THREE.Group();
  face.position.y = 0.4;
  head.add(face);
  const blush = new THREE.MeshBasicMaterial({ color: c.cheek, transparent: true, opacity: 0.6, depthWrite: false });
  for (const side of [-1, 1]) face.add(onSurface(new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), blush), side * 0.5, -0.1, HEAD_R + 0.003));
  const mouth = onSurface(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 24, Math.PI), eyeMat), 0, -0.17, HEAD_R);
  mouth.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(Z, Math.PI)); // arc opens upward: a smile
  face.add(mouth);

  const s = { blink: 0, nextBlink: 2, blinking: -1, lid: 0 };
  const qSlump = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0);
  return {
    root, body, head,
    // pose: { fill, light, phase, still, look: [x, y], head: [pitch, yaw, roll], raise: [l, r], sway: [l, r],
    //         slump 0..1, hop, lean (radians about leanAxis), leanAxis, squash, happy 0..1 }
    update(dt, p) {
      const d = OUT + (IN - OUT) * p.fill;
      // Inhale: the orb lights up from about a third full. Exhale: it fades back to bone, then the belly darkens a
      // little as the lungs empty, so the bottom of the breath (and a hold down there) reads as empty.
      const lit = smooth(0.3, 1, p.light), empty = 1 - smooth(0, 0.3, p.light);
      belly.breathe(d, Math.round(lit * 500) / 500, Math.round(empty * 500) / 500);
      placeHands(d, p.raise, p.sway);
      belly.surface(ORB, d, halo.position).addScaledVector(ORB, 0.05);
      halo.material.opacity = 0.3 * lit;
      floorGlow.material.opacity = 0.1 + 0.22 * lit; // the light on the disc swells with the breath
      shadow.material.opacity = 0.4 * (1 - Math.min(1, p.hop * 2.5)); // lifts off the disc on a hop
      head.position.y = 1.62 + 0.035 * p.fill - 0.06 * p.slump; // rides up as the torso fills, sinks when asleep
      head.rotation.set(p.head[0] + 0.42 * p.slump, p.head[1], p.head[2]);
      eyeRig.rotation.set(p.still ? 0 : p.look[1] * 0.16, p.still ? 0 : p.look[0] * 0.22, 0);
      if (!p.still && s.blinking < 0 && (s.nextBlink -= dt) <= 0) s.blinking = 0;
      if (s.blinking >= 0) {
        const q = (s.blinking += dt) / 0.16;
        s.blink = q < 0.5 ? q * 2 : Math.max(0, 2 - q * 2);
        if (q >= 1) { s.blinking = -1; s.blink = 0; s.nextBlink = 2 + Math.random() * 3.5; }
      }
      s.lid += ((p.phase === 'hold' && !p.still ? 1 : 0) - s.lid) * Math.min(1, dt * 5); // eyes close softly on a hold
      const open = (1 - s.blink) * (1 - 0.18 * (1 - p.fill)) * (1 - 0.88 * s.lid) * (1 - p.slump) * (1 - 0.8 * p.happy);
      for (const eye of eyes) eye.scale.set(0.85 + 0.15 * p.happy, 1.3 * Math.max(0.08, open), 0.7);
      mouth.scale.setScalar(1 + 0.45 * p.happy);
      body.position.y = SEAT + p.hop - 0.05 * p.slump;
      qSlump.setFromAxisAngle(X, 0.12 * p.slump);
      body.quaternion.setFromAxisAngle(p.leanAxis, p.lean).multiply(qSlump);
      body.scale.set(1 + p.squash, 1 - p.squash - 0.06 * p.slump, 1 + p.squash);
    },
  };
}

// The breath clock. Auto: loops the pattern. Press: breathe in from wherever the belly is and keep filling (phase
// 'hold' once full, remaining 0). Release: breathe out from there, rest for the pattern's hold2 (at least 1 s), then
// the pattern starts again at its inhale. A new pattern or a wake starts a fresh cycle; `carry` glides the belly from
// where it was into the new curve so nothing jumps.
function normPattern(p) {
  p = p || {};
  const num = (v, d) => (v != null && Number.isFinite(+v) && +v >= 0 ? +v : d);
  const inhale = Math.max(0.5, num(p.inhale, 6)), exhale = Math.max(0.5, num(p.exhale, 6));
  const sip = Math.min(num(p.sip, 0), inhale * 0.6);
  return { inhale, hold: num(p.hold, 0), exhale, hold2: num(p.hold2, 0), sip };
}

function inhaleFill(p, t) { // physiological sigh: a long first pull to 80%, then a short second sip to the top
  if (!p.sip) return breathEase(t / p.inhale);
  const a = p.inhale - p.sip;
  return t < a ? 0.8 * breathEase(t / a) : 0.8 + 0.2 * breathEase((t - a) / p.sip);
}

function makeBreath(pattern) {
  const s = { p: normPattern(pattern), mode: 'auto', t: 0, m: 0, carry: 0, out: null };
  function read() {
    const p = s.p;
    let phase, remaining, fill, sip = false;
    if (s.mode === 'press') {
      phase = s.m >= 1 ? 'hold' : 'inhale'; remaining = (1 - s.m) * p.inhale; fill = breathEase(s.m);
    } else if (s.mode === 'release') {
      phase = 'exhale'; remaining = (1 - s.m) * p.exhale; fill = 1 - breathEase(s.m);
    } else if (s.mode === 'rest') {
      phase = 'hold2'; remaining = s.m; fill = 0;
    } else {
      let t = s.t;
      for (const [name, dur] of [['inhale', p.inhale], ['hold', p.hold], ['exhale', p.exhale], ['hold2', p.hold2]]) {
        if (!dur) continue;
        if (t < dur || name === 'hold2') { phase = name; remaining = Math.max(0, dur - t); break; }
        t -= dur;
      }
      if (!phase) { phase = 'exhale'; remaining = 0; t = p.exhale; } // a pattern with no hold2 ends on its exhale
      if (phase === 'inhale') { fill = inhaleFill(p, t); sip = p.sip > 0 && t >= p.inhale - p.sip; }
      else if (phase === 'hold') fill = 1;
      else if (phase === 'exhale') fill = 1 - breathEase(Math.min(1, t / p.exhale));
      else fill = 0;
    }
    return { phase, remaining, fill: clamp01(fill + s.carry), sip };
  }
  return {
    step(dt) {
      const p = s.p;
      s.carry *= Math.exp(-dt * 4);
      if (Math.abs(s.carry) < 1e-3) s.carry = 0;
      if (s.mode === 'press') s.m = Math.min(1, s.m + dt / p.inhale);
      else if (s.mode === 'release') { s.m += dt / p.exhale; if (s.m >= 1) { s.mode = 'rest'; s.m = Math.max(1, p.hold2); } }
      else if (s.mode === 'rest') { s.m -= dt; if (s.m <= 0) { s.mode = 'auto'; s.t = 0; } }
      else s.t = (s.t + dt) % (p.inhale + p.hold + p.exhale + p.hold2);
      return (s.out = read());
    },
    read: () => s.out || (s.out = read()),
    restart() { const f = read().fill; s.mode = 'auto'; s.t = 0; s.carry = f; s.out = null; },
    setPattern(p) { s.p = normPattern(p); if (s.mode === 'auto') this.restart(); },
    press() { const f = read().fill; s.mode = 'press'; s.m = breathInv(f); s.carry = 0; s.out = null; },
    release() { if (s.mode !== 'press') return; const f = read().fill; s.mode = 'release'; s.m = breathInv(1 - f); s.carry = 0; s.out = null; },
    get pressed() { return s.mode === 'press'; },
  };
}

// Seen a little from above and from the front left, like the app: the belly's forward push shows in the outline.
// The frame keeps room for arms up and a hop, so reactions never leave the canvas.
const CAM = { fov: 28, yaw: -0.36, pitch: 0.2, target: new THREE.Vector3(0, 1.3, 0), w: 2.5, h: 3.1 };
const HEAD_YAW = CAM.yaw * 0.7; // his face turns most of the way to the viewer
const REACTIONS = { wake: 1.3, wave: 1.5, lean: 1.5, cheer: 1.4 }; // seconds, all under 1.6
const side = (dir, d) => (dir === 'left' || dir < 0 ? -1 : dir === 'right' || dir > 0 ? 1 : d);

export function mountBodie(canvas, opts = {}) {
  const o = { interactive: false, asleep: false, onPhase: null, colors: {}, ...opts };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const breath = makeBreath(o.pattern);
  const st = { still: reduce.matches, asleep: !!o.asleep, sleepT: 0, act: null, pressT: -1, tx: 0, ty: 0, gx: 0, gy: 0, yaw: 0,
    visible: true, sized: false, dirty: true, lost: false, live: false, destroyed: false, light: -1, sl: 0.35, glow: true };
  const leanAxis = new THREE.Vector3(Math.sin(CAM.yaw), 0, Math.cos(CAM.yaw));
  const pose = { fill: 0, light: 0, phase: 'inhale', still: st.still, look: [0, 0], head: [0, HEAD_YAW, 0], raise: [0, 0],
    sway: [0, 0], slump: st.asleep ? 1 : 0, hop: 0, lean: 0, leanAxis, squash: 0, happy: 0 };

  let renderer = null, scene, camera, fig;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch { canvas.dataset.webgl = 'off'; }
  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // transparent: the page colour shows through
    renderer.toneMapping = THREE.NeutralToneMapping;
    scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.75;
    pmrem.dispose();
    const key = new THREE.DirectionalLight(0xffe4c4, 1.4); // warm, from the front right: side light shows the belly
    key.position.set(2.5, 3.5, 3);
    scene.add(key);
    fig = buildBodie({ ...COLORS, ...o.colors });
    scene.add(fig.root);
    camera = new THREE.PerspectiveCamera(CAM.fov, 1, 0.1, 60);
  }
  function fit() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect = w / h, tan = Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2));
    const dist = Math.max(CAM.h / 2 / tan, CAM.w / 2 / (tan * aspect)) + 1.1; // + about the disc's depth toward us
    camera.aspect = aspect;
    camera.position.set(Math.sin(CAM.yaw) * Math.cos(CAM.pitch), Math.sin(CAM.pitch), Math.cos(CAM.yaw) * Math.cos(CAM.pitch))
      .multiplyScalar(dist).add(CAM.target);
    camera.lookAt(CAM.target);
    camera.updateProjectionMatrix();
    st.sized = true;
  }

  // Reactions as pure functions of time, eased with the studio curves. Every curve ends at rest, so he always comes
  // back to breathing. Output is smoothed a little, so a reaction that interrupts another never jumps.
  const target = { raise: [0, 0], sway: [0, 0], slump: 0, hop: 0, lean: 0, squash: 0, happy: 0, yaw: 0, roll: 0, lookX: 0 };
  function reactionTarget(dt) {
    const g = target;
    g.raise[0] = g.raise[1] = g.sway[0] = g.sway[1] = g.hop = g.lean = g.squash = g.happy = g.yaw = g.roll = g.lookX = 0;
    g.slump = st.asleep ? 1 : 0;
    if (st.pressT >= 0) { // press feedback (--t-press): a small squeeze and back
      st.pressT += dt;
      g.squash += 0.03 * Math.sin(Math.PI * Math.min(1, st.pressT / 0.28));
      if (st.pressT >= 0.28) st.pressT = -1;
    }
    const a = st.act;
    if (!a) return;
    const t = (a.t += dt);
    if (a.name === 'wake') {
      g.slump = a.fromSleep ? 1 - easeExpo(t / 1.1) : 0.5 * Math.sin(Math.PI * ramp(t, 0, 0.9)); // sits up, eyes open
      g.happy = 0.6 * Math.sin(Math.PI * ramp(t, 0.6, 1.3));
    } else if (a.name === 'wave') {
      const i = a.dir < 0 ? 0 : 1, r = easeOut(ramp(t, 0, 0.3)) * (1 - easeInOut(ramp(t, 1.15, 1.5)));
      g.raise[i] = r;
      g.sway[i] = Math.sin((t - 0.25) * Math.PI * 2 * 2.4) * ramp(t, 0.2, 0.35) * r;
      g.happy = ramp(t, 0.2, 0.4) * (1 - ramp(t, 1.1, 1.4));
      g.roll = -a.dir * 0.08 * r;
    } else if (a.name === 'lean') {
      const l = easeInOut(ramp(t, 0, 0.45)) * (1 - easeInOut(ramp(t, 1.05, 1.5)));
      g.lean = -a.dir * 0.2 * l;
      g.yaw = a.dir * 0.35 * l;
      g.lookX = a.dir * 0.8 * l;
      g.roll = -a.dir * 0.06 * l;
    } else if (a.name === 'cheer') {
      const r = easeOut(ramp(t, 0, 0.28)) * (1 - easeInOut(ramp(t, 1.05, 1.4)));
      g.raise[0] = g.raise[1] = r;
      g.sway[0] = g.sway[1] = 0.22 * Math.sin(t * 16) * r;
      g.hop = 0.3 * Math.sin(Math.PI * ramp(t, 0.3, 0.76));
      g.squash = 0.06 * Math.sin(Math.PI * ramp(t, 0.1, 0.3)) + 0.05 * Math.sin(Math.PI * ramp(t, 0.76, 1.0));
      g.happy = ramp(t, 0.1, 0.3) * (1 - ramp(t, 1.1, 1.4));
    }
    if (t >= a.dur) st.act = null;
  }

  function buildPose(dt, b) {
    const k = st.still ? 1 : 1 - Math.exp(-dt * 18), ease = (from, to) => from + (to - from) * k;
    if (!st.still) reactionTarget(dt);
    else { target.slump = st.asleep ? 1 : 0; target.raise[0] = target.raise[1] = target.sway[0] = target.sway[1] = 0;
      target.hop = target.lean = target.squash = target.happy = target.yaw = target.roll = target.lookX = 0; }
    for (const key of ['slump', 'hop', 'lean', 'squash', 'happy']) pose[key] = ease(pose[key], target[key]);
    for (let i = 0; i < 2; i++) { pose.raise[i] = ease(pose.raise[i], target.raise[i]); pose.sway[i] = ease(pose.sway[i], target.sway[i]); }
    st.gx += (st.tx - st.gx) * Math.min(1, dt * 4); // the head turns slower than the eyes: the eyes lead
    st.gy += (st.ty - st.gy) * Math.min(1, dt * 4);
    const free = st.still ? 0 : 1;
    pose.look[0] = free * clamp(st.tx + target.lookX); pose.look[1] = free * st.ty;
    pose.head[0] = free * st.gy * 0.2;
    st.yaw = ease(st.yaw, target.yaw);
    pose.head[1] = HEAD_YAW + free * (st.gx * 0.32 + st.yaw);
    pose.head[2] = ease(pose.head[2], target.roll);
    pose.still = st.still;
    pose.phase = b.phase;
    if (st.still) {
      // Still: no shape change. The light steps with the phase (lit on the way in and at the top, dim on the way out
      // and at the bottom) with a short fade, then stops, so the canvas paints only at a phase change.
      // setStill(true, { glow: false }) holds the light too.
      const goal = st.asleep || !st.glow ? 0.35 : b.phase === 'inhale' || b.phase === 'hold' ? 0.9 : 0.12;
      st.sl += (goal - st.sl) * Math.min(1, dt * 6);
      if (Math.abs(goal - st.sl) < 0.003) st.sl = goal;
      pose.fill = STILL_FILL;
      pose.light = st.sl;
      pose.phase = st.asleep ? null : b.phase;
    } else if (st.asleep) { // asleep: a slow, shallow breath of his own
      st.sleepT += dt;
      pose.fill = pose.light = 0.3 + 0.1 * Math.sin((st.sleepT / 7) * Math.PI * 2);
      pose.phase = null;
    } else {
      pose.fill = pose.light = b.fill;
    }
  }

  let raf = 0, last = 0;
  const running = () => !st.destroyed && st.visible && !document.hidden;
  function tick(now) {
    raf = 0;
    const real = Math.min(Math.max(0, (now - last) / 1000), 0.25), dt = Math.min(real, 0.05);
    last = now;
    const b = st.asleep ? breath.read() : breath.step(real); // the clock runs on real time, so the pace stays true
    if (o.onPhase && !st.asleep) o.onPhase(b.phase, b.remaining, { fill: b.fill, sip: b.sip });
    if (renderer && !st.lost) {
      buildPose(dt, b);
      // Still: draw only when the light has moved enough to see, or after a resize or a change of state.
      if (!st.still || st.dirty || Math.abs(pose.light - st.light) > 0.002) {
        if (!st.sized) fit();
        if (st.sized) {
          st.dirty = false;
          st.light = pose.light;
          fig.update(dt, pose);
          renderer.render(scene, camera);
          if (!st.live) { st.live = true; canvas.classList.add('is-live'); }
        }
      }
    }
    if (running()) raf = requestAnimationFrame(tick);
  }
  function request() {
    if (raf || !running()) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function redraw() { st.dirty = true; request(); }

  function wake() {
    if (st.still) { st.asleep = false; st.act = null; breath.restart(); redraw(); return; }
    st.act = { name: 'wake', t: 0, dur: REACTIONS.wake, fromSleep: st.asleep };
    st.asleep = false;
    breath.restart(); // his first inhale starts as he sits up
  }
  const api = {
    setPattern(p) { breath.setPattern(p); request(); },
    press() {
      if (st.destroyed) return;
      if (st.asleep) wake();
      breath.press();
      if (!st.still) st.pressT = 0;
      request();
    },
    release() { breath.release(); request(); },
    react(name, ro = {}) {
      if (st.destroyed || !(name in REACTIONS)) return;
      if (name === 'wake') wake();
      else if (!st.asleep && !st.still) st.act = { name, t: 0, dur: REACTIONS[name], dir: side(ro.dir, name === 'wave' ? -1 : 1) };
      request();
    },
    setStill(on, so = {}) { st.still = !!on; st.glow = so.glow !== false; if (st.still) st.act = null; redraw(); },
    destroy() {
      if (st.destroyed) return;
      st.destroyed = true;
      cancelAnimationFrame(raf);
      cleanup.forEach((fn) => fn());
      if (renderer) {
        scene.traverse((m) => {
          m.geometry?.dispose();
          for (const mat of [].concat(m.material || [])) { mat.map?.dispose(); mat.dispose(); }
        });
        scene.environment?.dispose();
        renderer.dispose();
      }
      canvas.classList.remove('is-live');
    },
  };

  const cleanup = [];
  const on = (el, type, fn, opt) => { el.addEventListener(type, fn, opt); cleanup.push(() => el.removeEventListener(type, fn, opt)); };

  // Gaze: the eyes follow the pointer, the head follows the eyes. Touch: looks at the tap, then back at you after 1.5 s.
  let back = 0;
  const lookAt = (e) => {
    const r = canvas.getBoundingClientRect();
    st.tx = clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2));
    st.ty = clamp((e.clientY - (r.top + r.height * 0.3)) / (innerHeight / 2));
    if (st.ty > 0) st.ty *= 0.5; // looking down hides the eyes from the camera, so he only glances down
    clearTimeout(back);
    if (e.pointerType && e.pointerType !== 'mouse') back = setTimeout(lookHome, 1500);
  };
  const lookHome = () => { st.tx = st.ty = 0; };
  on(window, 'pointermove', lookAt, { passive: true });
  on(window, 'pointerdown', lookAt, { passive: true });
  on(document.documentElement, 'pointerleave', lookHome);
  cleanup.push(() => clearTimeout(back));

  if (o.interactive) { // press and hold anywhere on the canvas: mouse, touch, pen, or Space/Enter when it has focus
    let held = null, key = false;
    Object.assign(canvas.style, { touchAction: 'pan-y', userSelect: 'none', webkitUserSelect: 'none', webkitTouchCallout: 'none' });
    on(canvas, 'pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      held = e.pointerId;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
      api.press();
    });
    const up = (e) => { if (held === e.pointerId) { held = null; api.release(); } };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) on(canvas, type, up);
    on(canvas, 'contextmenu', (e) => e.preventDefault()); // a long press is a breath, not a menu
    on(canvas, 'keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); key = true; api.press(); }
    });
    on(canvas, 'keyup', (e) => { if (key && (e.key === ' ' || e.key === 'Enter')) { key = false; api.release(); } });
    on(canvas, 'blur', () => { if (key) { key = false; api.release(); } });
  }

  const ro = new ResizeObserver(() => { st.sized = false; redraw(); });
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; request(); });
  io.observe(canvas);
  cleanup.push(() => { ro.disconnect(); io.disconnect(); });
  on(document, 'visibilitychange', request);
  on(reduce, 'change', (e) => api.setStill(e.matches));
  on(canvas, 'webglcontextlost', (e) => { e.preventDefault(); st.lost = true; st.live = false; canvas.classList.remove('is-live'); });
  on(canvas, 'webglcontextrestored', () => { st.lost = false; redraw(); });
  request();
  return api;
}
