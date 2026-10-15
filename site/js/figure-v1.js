/* "Breathe with me": an original round figure sitting cross-legged on a cushion, built from primitives.
   breath-figure-v1.js drives it from the hero pacer: update(dt, fill, still, phase).
   One hand rests on the chest and stays nearly still, the other rides the belly: the coaching cue for breathing
   low (diaphragm), not high (chest). The belly pushes forward on the inhale and draws in past rest on the exhale.
   Eyes follow the pointer (they lead, the mount turns the head after them), blink, and close softly on a hold.
   Clean-room build, kit: ~/.claude/skills/studio-site-design/kits/breath-figure/. Bump the filename when editing. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const Z = new THREE.Vector3(0, 0, 1), UP = new THREE.Vector3(0, 1, 0);
const HEAD_R = 0.56, BELLY_Y = 1.0, RAD = [0.72, 0.72 * 1.06, 0.72 * 0.92];
const OUT = -0.09, IN = 0.2; // belly travel: drawn in at the bottom of the exhale .. full at the top of the inhale

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
  const belly = makeBelly(c.body, c.inhale);
  body.add(belly.mesh);
  for (const side of [-1, 1]) { // crossed legs, one resting on the other
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.62, 8, 16), skin);
    leg.rotation.set(0, side * 0.34, Math.PI / 2);
    leg.position.set(0, side < 0 ? 0.42 : 0.47, 0.36);
    body.add(leg);
  }

  // The figure's left hand on the chest, right hand on the belly. Each arm bends at an elbow that rests on the
  // body's side, so it wraps around the round body instead of cutting through it. Re-aimed every frame.
  const hands = [
    { shoulder: new THREE.Vector3(-0.62, 1.3, 0.02), elbowDir: new THREE.Vector3(-0.95, 0, 0.32).normalize(), dir: new THREE.Vector3(-0.22, 0.5, 0.84).normalize() },
    { shoulder: new THREE.Vector3(0.62, 1.26, 0.02), elbowDir: new THREE.Vector3(0.95, -0.12, 0.3).normalize(), dir: new THREE.Vector3(0.2, -0.22, 0.95).normalize() },
  ].map((h) => {
    h.upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 8, 16), skin);
    h.fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.3, 8, 16), skin);
    h.elbow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skin);
    h.palm = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), skin);
    h.palm.scale.set(1.05, 0.85, 0.62); // flat against the body
    body.add(h.upper, h.fore, h.elbow, h.palm);
    return h;
  });
  const aim = new THREE.Vector3();
  function limb(mesh, from, to, height) { // stretch a capsule (total height `height`) from one point to another
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, aim.copy(to).sub(from).normalize());
    mesh.scale.y = from.distanceTo(to) / height;
  }
  function placeHands(d) {
    for (const h of hands) {
      belly.surface(h.elbowDir, d, h.elbow.position).addScaledVector(h.elbowDir, 0.1);
      belly.surface(h.dir, d, h.palm.position).addScaledVector(h.dir, 0.085);
      limb(h.upper, h.shoulder, h.elbow.position, 0.52);
      limb(h.fore, h.elbow.position, h.palm.position, 0.51);
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
    update(dt, fill, still, phase) {
      const d = OUT + (IN - OUT) * fill;
      belly.breathe(d, fill);
      placeHands(d);
      glow.material.opacity = 0.2 + 0.28 * fill; // the floor glow swells with the breath
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

// The body: one welded ellipsoid. breathe(d, fill) moves every vertex along its direction by d * weight and warms
// the belly toward the inhale colour; surface(dir, d, out) gives the moving surface point in that direction.
function makeBelly(bodyColor, inhaleColor) {
  let geo = new THREE.SphereGeometry(1, 64, 48);
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  geo = mergeVertices(geo); // weld the seam so recomputed normals stay smooth
  geo.scale(...RAD);
  const pos = geo.attributes.position, n = pos.count;
  const base = Float32Array.from(pos.array), dir = new Float32Array(n * 3), weight = new Float32Array(n);
  const colors = new Float32Array(n * 3), a = new THREE.Color(bodyColor), b = new THREE.Color(inhaleColor), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromArray(base, i * 3).normalize();
    v.toArray(dir, i * 3);
    weight[i] = bellyWeight(v);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.62 }));
  mesh.position.y = BELLY_Y;
  function breathe(d, fill) {
    for (let i = 0; i < n; i++) {
      const k = d * weight[i], g = 0.4 * fill * weight[i];
      for (let j = 0; j < 3; j++) pos.array[i * 3 + j] = base[i * 3 + j] + dir[i * 3 + j] * k;
      colors[i * 3] = a.r + (b.r - a.r) * g;
      colors[i * 3 + 1] = a.g + (b.g - a.g) * g;
      colors[i * 3 + 2] = a.b + (b.b - a.b) * g;
    }
    pos.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
  }
  function surface(u, d, out) { // u: unit direction from the body centre; out: Vector3 to fill (body coordinates)
    const r = 1 / Math.sqrt((u.x / RAD[0]) ** 2 + (u.y / RAD[1]) ** 2 + (u.z / RAD[2]) ** 2);
    const p = out.copy(u).multiplyScalar(r), w = bellyWeight(p.clone().normalize());
    return p.addScaledVector(p.clone().normalize(), d * w).add(mesh.position);
  }
  breathe(0, 0.4);
  return { mesh, breathe, surface };
}

// Place a mesh on a sphere of radius r at (yaw, pitch), its local +Z along the surface normal.
function onSurface(mesh, yaw, pitch, r) {
  const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  mesh.position.copy(d).multiplyScalar(r);
  mesh.quaternion.setFromUnitVectors(Z, d);
  return mesh;
}

function groundGlow(color) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d'), grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35, toneMapped: false }));
  glow.name = 'GroundGlow';
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.01;
  return glow;
}
