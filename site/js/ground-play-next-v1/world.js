import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/+esm';

export function createWorld(canvas) {
  const styles = getComputedStyle(document.documentElement);
  const token = name => new THREE.Color(styles.getPropertyValue(name).trim()).getHex();
  const palette = {
    bg: token('--bg'), bed: token('--bg-2'), clay: token('--clay'),
    gold: token('--gold'), amber: token('--gold-2'), bone: token('--text'),
    muted: token('--muted'), sage: token('--sage'),
  };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.bg);
  const group = new THREE.Group();
  group.scale.y = -1;
  group.position.y = 1600;
  scene.add(group);
  const camera = new THREE.OrthographicCamera(0, 1000, 1600, 0, 0.1, 3000);
  camera.position.z = 2000;
  let width = 0, height = 0;
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); }
  }
  resize();
  return { THREE, group, palette, resize, render() { renderer.render(scene, camera); }, dispose() { renderer.dispose(); } };
}
