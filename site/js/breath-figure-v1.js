/* The page's one 3D moment: "Breathe with me", the round figure in the hero dial (figure-v1.js).
   The hero pacer (pacer-v3.js) stays the source of truth: its fill (the idle loop, or the pattern the visitor
   started) sets the belly, and its phase closes the eyes on a hold, so figure, words, count and track share one
   timeline. Head and eyes follow the pointer; a tap on the figure starts the pacer. Colours from CSS tokens.
   Reduced motion: one still frame (mid-inhale), the pacer's words and count still run. No WebGL: the canvas gets
   data-webgl="off" and the poster underneath stays. Bump the filename (v2, v3) when editing. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildBreather } from './figure-v1.js';

const canvas = document.querySelector('.hero .hero-art canvas');
const pacerRoot = document.getElementById('try-a-breath');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const capture = new URLSearchParams(location.search).has('capture-poster'); // web-3d verify-webgl.mjs poster
// Seen about 40 degrees off its front, so the belly's forward push shows in the outline (site-critic round 1: front-on
// it read as a lamp, not a breath). The head rests turned toward the viewer (HEAD_YAW) and follows the pointer from there.
const VIEW = { pos: [-3.1, 2.2, 3.7], target: [0, 0.92, 0], half: 1.8 }; // room under the cushion for the cue pill
const HEAD_YAW = -0.45;

function css(name) { return getComputedStyle(canvas).getPropertyValue(name).trim(); }

function start() {
  if (!canvas) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { canvas.dataset.webgl = 'off'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffe4c4, 1.5); // warm, from the front right: side light shows the belly
  key.position.set(2.5, 3.5, 3);
  scene.add(key);

  const fig = buildBreather({
    body: css('--text'), cushion: css('--clay'), cheek: css('--gold-2'), eye: css('--bg'), inhale: css('--gold'), glow: css('--gold-2'),
  });
  scene.add(fig.root);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(...VIEW.pos);
  camera.lookAt(new THREE.Vector3(...VIEW.target));
  function fit() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const a = w / h, hh = VIEW.half;
    Object.assign(camera, { left: -hh * a, right: hh * a, top: hh, bottom: -hh });
    camera.updateProjectionMatrix();
  }

  const st = { fill: 0.4, phase: null, yaw: 0, pitch: 0, tyaw: 0, tpitch: 0 };
  let raf = 0, visible = true, live = false, dirty = true, last = performance.now();
  function tick() {
    raf = 0;
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05), still = reduce.matches || capture;
    last = now;
    const glowOnly = still && !capture && st.phase !== null; // reduced motion while running: only the light breathes
    if (!still || dirty || glowOnly) {
      dirty = false;
      fit();
      st.yaw += ((still ? 0 : st.tyaw) - st.yaw) * Math.min(1, dt * 4); // slower than the eyes: the eyes lead
      st.pitch += ((still ? 0 : st.tpitch) - st.pitch) * Math.min(1, dt * 4);
      fig.head.rotation.set(st.pitch, HEAD_YAW + st.yaw, 0);
      fig.update(dt, still ? 0.6 : st.fill, still, still && !glowOnly ? null : st.phase, still && !glowOnly ? 0.6 : st.fill);
      renderer.render(scene, camera);
      if (!live) {
        live = true;
        canvas.classList.add('is-live');
        canvas.parentElement && canvas.parentElement.classList.add('has-live-canvas');
        if (capture) canvas.dataset.poster = canvas.toDataURL('image/webp', 0.86);
      }
    }
    if (visible && !document.hidden && (!still || glowOnly)) raf = requestAnimationFrame(tick);
  }
  function request() { if (!raf) { last = performance.now() - 16; raf = requestAnimationFrame(tick); } }
  function redraw() { dirty = true; request(); }

  const link = () => {
    const p = pacerRoot && pacerRoot.groundPacer;
    if (!p) return false;
    p.onFill((fill, still, phase) => {
      if (st.phase !== null && phase === null) dirty = true; // stopped: draw the resting light once more
      st.fill = fill; st.phase = phase;
      if (reduce.matches) request(); // the reduced-motion loop sleeps between runs
    });
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    canvas.parentElement.addEventListener('pointerdown', (e) => { // a tap on the figure itself starts the breath
      const b = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (!ray.intersectObject(fig.root, true).some((h) => h.object.name !== 'GroundGlow')) return;
      fig.press();
      if (!p.isRunning()) p.start();
      request();
    });
    return true;
  };
  if (!link()) document.addEventListener('pacers:ready', link, { once: true });

  let back = 0;
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  const onLeave = () => { st.tyaw = st.tpitch = 0; fig.look(0, 0); };
  addEventListener('pointermove', (e) => {
    const b = canvas.getBoundingClientRect();
    const nx = clamp((e.clientX - (b.left + b.width / 2)) / (innerWidth / 2));
    let ny = clamp((e.clientY - (b.top + b.height * 0.3)) / (innerHeight / 2));
    if (ny > 0) ny *= 0.5; // looking down hides the eyes from the camera, so it only glances down
    st.tyaw = nx * 0.32; st.tpitch = ny * 0.2;
    fig.look(nx, ny);
    clearTimeout(back);
    if (e.pointerType && e.pointerType !== 'mouse') back = setTimeout(onLeave, 1500); // touch: look, then back at you
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  new ResizeObserver(redraw).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) request(); }).observe(canvas);
  if (reduce.addEventListener) reduce.addEventListener('change', redraw);
  document.addEventListener('visibilitychange', request);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); live = false; canvas.classList.remove('is-live'); });
  canvas.addEventListener('webglcontextrestored', redraw);
  request();
}
start();
