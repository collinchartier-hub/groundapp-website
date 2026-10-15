/* The page's one shader moment: the hero pacer's rings drawn by the web-3d `breath` shader.
   The pacer (pacer-v2.js) stays the source of truth: its fill (idle resonance loop or the pattern the
   visitor started) is passed in as uSpeed, so rings, words and count share one timeline.
   Colors come from the page's CSS tokens. Reduced motion: uSpeed stays -1 and the runtime draws the
   still frame at stillTime 4.5 (a full inhale). No WebGL: the runtime marks the canvas data-webgl="off"
   and the poster image underneath stays. Bump the filename (v2, v3) when editing. */
import { mountShader } from './shader-hero-v1.js';

const canvas = document.querySelector('.hero .hero-art canvas');
const pacerRoot = document.getElementById('try-a-breath');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

async function start() {
  if (!canvas) return;
  let frag;
  try { frag = await (await fetch('/shaders/breath-v1.frag')).text(); } catch (e) { return; }
  const hero = mountShader(canvas, {
    frag, stillTime: 4.5, speed: -1, scale: 1.17, intensity: 5 / 6,
    colors: { a: 'var(--gold)', b: 'var(--bg)', c: 'var(--gold-2)' },
  });
  if (!hero) return;
  const link = () => {
    const p = pacerRoot && pacerRoot.groundPacer;
    if (!p) return false;
    p.onFill((fill, still) => hero.set({ uSpeed: (still || reduce.matches) ? -1 : fill }));
    return true;
  };
  if (!link()) document.addEventListener('pacers:ready', link, { once: true });
}
start();
