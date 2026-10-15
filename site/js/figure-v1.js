/* "Breathe with me": an original round figure sitting cross-legged on a cushion, built from primitives.
   breath-figure-v1.js drives it from the hero pacer: update(dt, fill, still, phase, light). `light` (default: fill)
   sets only the glow, so under reduced motion the shape can hold still while the light still follows the breath.
   One hand rests on the chest and stays nearly still, the other rides the belly: the coaching cue for breathing
   low (diaphragm), not high (chest). The belly pushes forward on the inhale and draws in past rest on the exhale;
   a round orb glows from inside it as the lungs fill, fades back to bone on the way out, then darkens a little when empty.
   Eyes follow the pointer (they lead, the mount turns the head after them), blink, and close softly on a hold.
   Clean-room build, kit: ~/.claude/skills/studio-site-design/kits/breath-figure/. Bump the filename when editing. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const Z = new THREE.Vector3(0, 0, 1), UP = new THREE.Vector3(0, 1, 0);
const HEAD_R = 0.56, BELLY_Y = 1.0, RAD = [0.72, 0.72 * 1.06, 0.72 * 0.92];
const OUT = -0.1, IN = 0.24; // belly travel: drawn in at the bottom of the exhale .. full at the top of the inhale (Collin: 0.32 was too much)
const ORB = new THREE.Vector3(0, -0.2, 1).normalize(); // where the belly glows from: the front, a little below centre
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function buildBreather(colors = {}) {
  const c = { body: '#e8ddd0', cushion: '#8b5e3c', eye: '#1a110e', cheek: '#d4a574', inhale: '#c4935a', glow: '#c4935a', ...colors };
  const skin = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.62 });
  const root = new THREE.Group();

  const cushion = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshStandardMaterial({ color: c.cushion, roughness: 0.9 }));
  cushion.scale.set(1.05, 0.24, 0.95);
  cushion.position.y = 0.16;
  const glow = groundGlow(c.glow);
  root.add(cushion, glow);

  const body = new THREE.Group();
  root.add(body);
  const belly = makeBelly(c.body, c.inhale, c.glow);
  body.add(belly.mesh);
  // The orb's halo: soft light that spills past the belly's outline on the inhale. Drawn without depth test (with it,
  // the belly's curve hid part of the flat sprite and left a dark hole in the glow), then the arms, hands and legs are
  // drawn after it (limbs below), so the hand on the belly stays a clear shape in front of the light.
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture(c.glow), transparent: true, depthWrite: false,
    depthTest: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }));
  halo.scale.setScalar(1.3);
  halo.renderOrder = 10;
  body.add(halo);
  const limbs = skin.clone(); // same look, drawn in the late pass after the halo (renderOrder 11)
  limbs.transparent = true;
  const late = (mesh) => { mesh.renderOrder = 11; return mesh; };
  for (const side of [-1, 1]) { // crossed legs, one resting on the other
    const leg = late(new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.62, 8, 16), limbs));
    leg.rotation.set(0, side * 0.34, Math.PI / 2);
    leg.position.set(0, side < 0 ? 0.42 : 0.47, 0.36);
    body.add(leg);
  }

  // The figure's left hand on the chest, right hand on the belly. Each arm is one smooth tube through shoulder, elbow
  // (on the body's side), a point halfway round the belly, and the hand, rebuilt every frame so it follows the belly
  // as it grows instead of sinking into it. No separate segments, so no knobbly joints. Open ends hide inside the
  // body and inside the round hand.
  const hands = [
    { shoulder: new THREE.Vector3(-0.6, 1.3, 0.02), elbowDir: new THREE.Vector3(-0.95, 0, 0.32).normalize(), dir: new THREE.Vector3(-0.22, 0.5, 0.84).normalize() },
    { shoulder: new THREE.Vector3(0.6, 1.26, 0.02), elbowDir: new THREE.Vector3(0.95, -0.12, 0.3).normalize(), dir: new THREE.Vector3(0.2, -0.22, 0.95).normalize() },
  ].map((h) => {
    h.midDir = h.elbowDir.clone().add(h.dir).normalize();
    h.elbow = new THREE.Vector3();
    h.mid = new THREE.Vector3();
    h.palm = late(new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), limbs));
    h.palm.scale.set(1.12, 0.94, 0.86); // a soft mitten resting on the body
    h.curve = new THREE.CatmullRomCurve3([h.shoulder, h.elbow, h.mid, h.palm.position], false, 'centripetal');
    h.arm = late(new THREE.Mesh(new THREE.BufferGeometry(), limbs));
    body.add(h.arm, h.palm);
    return h;
  });
  function placeHands(d) {
    for (const h of hands) {
      belly.surface(h.elbowDir, d, h.elbow).addScaledVector(h.elbowDir, 0.1);
      belly.surface(h.midDir, d, h.mid).addScaledVector(h.midDir, 0.1);
      belly.surface(h.dir, d, h.palm.position).addScaledVector(h.dir, 0.09);
      h.arm.geometry.dispose();
      h.arm.geometry = new THREE.TubeGeometry(h.curve, 24, 0.105, 10, false);
    }
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
  const blush = new THREE.MeshBasicMaterial({ color: c.cheek, transparent: true, opacity: 0.55, depthWrite: false });
  for (const side of [-1, 1]) face.add(onSurface(new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), blush), side * 0.52, -0.1, HEAD_R + 0.003));
  const mouth = onSurface(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 24, Math.PI), eyeMat), 0, -0.17, HEAD_R);
  mouth.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(Z, Math.PI)); // arc opens upward: a smile
  face.add(mouth);

  const s = { gx: 0, gy: 0, tx: 0, ty: 0, blink: 0, nextBlink: 2, blinking: -1, press: -1, lid: 0 };
  return {
    root, body, head,
    look(x, y) { s.tx = x; s.ty = y; },
    press() { s.press = 0; },
    update(dt, fill, still, phase, light = fill) {
      const d = OUT + (IN - OUT) * fill;
      // Inhale: the orb lights up from about a third full. Exhale: it fades back to bone, then the belly darkens a
      // little as the lungs empty, so the bottom of the breath (and a box hold down there) reads as empty.
      const lit = smooth(0.3, 1, light), empty = 1 - smooth(0, 0.3, light);
      belly.breathe(d, lit, empty);
      placeHands(d);
      belly.surface(ORB, d, halo.position).addScaledVector(ORB, 0.05);
      halo.material.opacity = 0.3 * lit;
      glow.material.opacity = 0.12 + 0.24 * lit; // the floor glow swells with the breath
      head.position.y = 1.62 + 0.035 * fill; // the head rides up a little as the torso fills
      s.gx += (s.tx - s.gx) * Math.min(1, dt * 12);
      s.gy += (s.ty - s.gy) * Math.min(1, dt * 12);
      eyeRig.rotation.set(still ? 0 : s.gy * 0.16, still ? 0 : s.gx * 0.22, 0);
      if (s.blinking < 0 && (s.nextBlink -= dt) <= 0) s.blinking = 0;
      if (s.blinking >= 0) {
        const p = (s.blinking += dt) / 0.16;
        s.blink = p < 0.5 ? p * 2 : Math.max(0, 2 - p * 2);
        if (p >= 1) { s.blinking = -1; s.blink = 0; s.nextBlink = 2 + Math.random() * 3.5; }
      }
      s.lid += ((phase === 'hold' ? 1 : 0) - s.lid) * Math.min(1, dt * 5); // eyes close softly on a hold
      let open = (1 - s.blink) * (1 - 0.18 * (1 - fill)) * (1 - 0.88 * s.lid);
      let squash = 0;
      if (s.press >= 0) {
        const t = (s.press += dt);
        open = Math.min(open, t < 0.7 ? 0.15 : 1); // a happy squeeze of the eyes
        squash = still ? 0 : Math.sin(t * 18) * Math.exp(-t * 5) * 0.07;
        if (t > 0.9) s.press = -1;
      }
      for (const eye of eyes) eye.scale.set(0.85, 1.3 * Math.max(0.08, open), 0.7);
      body.scale.set(1 + squash, 1 - squash, 1 + squash);
    },
  };
}

// How much a point on the body moves with the breath: most at the front of the low belly, a little at the sides
// and back, almost nothing at the chest (so the chest hand stays nearly still). u = unit direction from the centre.
function bellyWeight(u) {
  const low = Math.exp(-((u.y + 0.18) ** 2) / (2 * 0.36 ** 2));
  return low * (0.12 + 0.88 * Math.max(0, u.z) ** 1.5);
}

// The body: one welded ellipsoid. breathe(d, glow, dark) moves every vertex along its direction by d * weight, lights
// a round orb on the front of the belly (emissive, added to the standard material's shader) as the lungs fill, and
// shades the belly a little darker when they are empty. surface(dir, d, out) gives the moving surface point.
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
  function breathe(d, glow, dark) {
    for (let i = 0; i < n; i++) {
      const k = d * weight[i], g = 0.25 * glow * orb[i], m = 1 - 0.3 * dark * weight[i];
      for (let j = 0; j < 3; j++) pos.array[i * 3 + j] = base[i * 3 + j] + dir[i * 3 + j] * k;
      colors[i * 3] = (a.r + (b.r - a.r) * g) * m;
      colors[i * 3 + 1] = (a.g + (b.g - a.g) * g) * m;
      colors[i * 3 + 2] = (a.b + (b.b - a.b) * g) * m;
    }
    uGlow.value = 0.55 * glow; // a soft glow, not a lamp (Collin 2026-10-15: the 1.35 peak was too bright)
    pos.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
  }
  function surface(u, d, out) { // u: unit direction from the body centre; out: Vector3 to fill (body coordinates)
    const r = 1 / Math.sqrt((u.x / RAD[0]) ** 2 + (u.y / RAD[1]) ** 2 + (u.z / RAD[2]) ** 2);
    const p = out.copy(u).multiplyScalar(r), w = bellyWeight(p.clone().normalize());
    return p.addScaledVector(p.clone().normalize(), d * w).add(mesh.position);
  }
  breathe(0, 0, 0);
  return { mesh, breathe, surface };
}

// Place a mesh on a sphere of radius r at (yaw, pitch), its local +Z along the surface normal.
function onSurface(mesh, yaw, pitch, r) {
  const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  mesh.position.copy(d).multiplyScalar(r);
  mesh.quaternion.setFromUnitVectors(Z, d);
  return mesh;
}

function radialTexture(color) { // a soft round light: colour in the middle, fading to nothing at the edge
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d'), grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function groundGlow(color) {
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: radialTexture(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35, toneMapped: false }));
  glow.name = 'GroundGlow';
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.01;
  return glow;
}
