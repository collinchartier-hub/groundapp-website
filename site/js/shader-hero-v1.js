// shader-hero.js: run one GLSL ES 3.00 fragment shader on a full-screen triangle.
// No dependencies, WebGL2 only. Shader contract and usage: ../SKILL.md.
//
//   import { mountShader } from './shader-hero.js';
//   mountShader(canvas, { frag, colors: { a: 'var(--ink)', b: '#f2efe8' }, pointer: true });
//
// The canvas sits over a poster <img>. After its first frame the canvas gets `is-live` and its parent
// gets `has-live-canvas`, so CSS fades the canvas in and hides the poster (needed under transparent canvases). No WebGL2, a compile error or a lost context = poster stays.

export const HEADER = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uSpeed;
uniform float uScale;
uniform float uIntensity;
uniform sampler2D uImage;
uniform vec2 uImageSize;
out vec4 fragColor;
vec2 coverUV(vec2 frag) {
  vec2 uv = frag / uResolution;
  float ra = uResolution.x / uResolution.y, ri = uImageSize.x / max(uImageSize.y, 1.0);
  if (ra > ri) { float s = ri / ra; uv.y = uv.y * s + (1.0 - s) * 0.5; }
  else { float s = ra / ri; uv.x = uv.x * s + (1.0 - s) * 0.5; }
  return uv;
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;
export const HEADER_LINES = HEADER.split('\n').length - 1;

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// '#rrggbb' | '#rgb' | 'rgb(r g b)' | 'var(--token)' | [r, g, b] (0..1) -> [r, g, b] (0..1)
export function toRGB(value, el) {
  if (Array.isArray(value)) return value;
  let v = String(value).trim();
  const token = v.match(/^var\((--[^),\s]+)\)$/);
  if (token) v = getComputedStyle(el || document.documentElement).getPropertyValue(token[1]).trim();
  if (v.startsWith('#')) {
    let h = v.slice(1);
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const p = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0] / 255, p[1] / 255, p[2] / 255];
  }
  console.warn('[shader-hero] unreadable colour', value);
  return [0, 0, 0];
}

// Compile + link. Returns { program, log }. Line numbers in the log match the shader file.
export function compileProgram(gl, frag) {
  const make = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const vs = make(gl.VERTEX_SHADER, VERT);
  const fs = make(gl.FRAGMENT_SHADER, HEADER + frag);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    const log = (gl.getShaderInfoLog(fs) || '').replace(/0:(\d+)/g, (_, n) => `line ${n - HEADER_LINES}`);
    return { program: null, log };
  }
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, 'aPos');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return { program: null, log: gl.getProgramInfoLog(program) };
  return { program, log: '' };
}

export function mountShader(canvas, opts = {}) {
  const o = {
    dpr: 1.5, // cap: phones at 3x would render 9x the pixels for no visible gain
    speed: 1, scale: 1, intensity: 1,
    colors: {}, // { a, b, c }
    pointer: false, // feed uPointer / uPointerActive
    animate: true, // false = draw only on resize / pointer (static effects like halftone)
    stillTime: 2, // uTime used for the reduced-motion frame
    image: null, // url for uImage
    ...opts,
  };
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.dataset.webgl = 'off'; return null; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const capture = new URLSearchParams(location.search).has('capture-poster');
  let program, loc = {}, imageReady = !o.image, imageSize = [1, 1];
  let raf = 0, visible = true, live = false, start = performance.now();
  const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, tactive: 0 };
  const uniforms = { uSpeed: o.speed, uScale: o.scale, uIntensity: o.intensity };
  let colors = { a: [0, 0, 0], b: [1, 1, 1], c: [0.5, 0.5, 0.5] };

  function readColors() {
    for (const k of ['a', 'b', 'c']) if (o.colors[k] != null) colors[k] = toRGB(o.colors[k], canvas);
  }

  function init() {
    const built = compileProgram(gl, o.frag);
    if (!built.program) {
      console.error('[shader-hero] shader failed to compile:\n' + built.log);
      canvas.dataset.webgl = 'error';
      return false;
    }
    program = built.program;
    gl.useProgram(program);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uTime', 'uResolution', 'uPointer', 'uPointerActive', 'uColorA', 'uColorB', 'uColorC',
      'uSpeed', 'uScale', 'uIntensity', 'uImage', 'uImageSize']) loc[n] = gl.getUniformLocation(program, n);
    if (o.image) loadImage();
    return true;
  }

  function loadImage() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      imageSize = [img.naturalWidth, img.naturalHeight];
      imageReady = true;
      kick();
    };
    img.onerror = () => { canvas.dataset.webgl = 'error'; console.error('[shader-hero] image failed', o.image); };
    img.src = o.image;
  }

  function resize() {
    const r = Math.min(devicePixelRatio || 1, o.dpr);
    const w = Math.max(1, Math.round(canvas.clientWidth * r));
    const h = Math.max(1, Math.round(canvas.clientHeight * r));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }

  function draw(t) {
    if (!program || !imageReady || gl.isContextLost()) return;
    resize();
    gl.uniform1f(loc.uTime, t);
    gl.uniform2f(loc.uResolution, canvas.width, canvas.height);
    gl.uniform2f(loc.uPointer, ptr.x, ptr.y);
    gl.uniform1f(loc.uPointerActive, ptr.active);
    gl.uniform3fv(loc.uColorA, colors.a);
    gl.uniform3fv(loc.uColorB, colors.b);
    gl.uniform3fv(loc.uColorC, colors.c);
    gl.uniform1f(loc.uSpeed, uniforms.uSpeed);
    gl.uniform1f(loc.uScale, uniforms.uScale);
    gl.uniform1f(loc.uIntensity, uniforms.uIntensity);
    gl.uniform1i(loc.uImage, 0);
    gl.uniform2f(loc.uImageSize, imageSize[0], imageSize[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!live) {
      live = true;
      canvas.classList.add('is-live');
      canvas.parentElement?.classList.add('has-live-canvas');
      if (capture) canvas.dataset.poster = canvas.toDataURL('image/webp', 0.86);
    }
  }

  function frame(now) {
    raf = 0;
    const still = reduce.matches;
    ptr.x += (ptr.tx - ptr.x) * 0.12;
    ptr.y += (ptr.ty - ptr.y) * 0.12;
    ptr.active += (ptr.tactive - ptr.active) * 0.08;
    draw(still ? o.stillTime : ((now - start) / 1000));
    const settling = Math.abs(ptr.tx - ptr.x) + Math.abs(ptr.ty - ptr.y) + Math.abs(ptr.tactive - ptr.active) > 0.002;
    if (visible && !document.hidden && ((o.animate && !still) || settling)) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  readColors();
  if (!init()) return null;

  const ro = new ResizeObserver(kick);
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
  io.observe(canvas);
  const onVis = () => { if (!document.hidden) kick(); };
  document.addEventListener('visibilitychange', onVis);
  reduce.addEventListener('change', kick);

  let onMove, onLeave;
  if (o.pointer) {
    const target = canvas.parentElement || canvas;
    onMove = (e) => {
      if (reduce.matches) return;
      const b = canvas.getBoundingClientRect();
      ptr.tx = (e.clientX - b.left) / b.width;
      ptr.ty = 1 - (e.clientY - b.top) / b.height;
      ptr.tactive = 1;
      kick();
    };
    onLeave = () => { ptr.tactive = 0; kick(); };
    target.addEventListener('pointermove', onMove, { passive: true });
    target.addEventListener('pointerleave', onLeave, { passive: true });
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf); raf = 0; live = false;
    canvas.classList.remove('is-live');
    canvas.parentElement?.classList.remove('has-live-canvas');
  });
  canvas.addEventListener('webglcontextrestored', () => { if (init()) kick(); });

  kick();

  return {
    set(partial) { Object.assign(uniforms, partial); kick(); },
    setColors(next) { Object.assign(o.colors, next); readColors(); kick(); },
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      reduce.removeEventListener('change', kick);
      if (onMove) { (canvas.parentElement || canvas).removeEventListener('pointermove', onMove); (canvas.parentElement || canvas).removeEventListener('pointerleave', onLeave); }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
