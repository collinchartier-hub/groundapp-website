/* Live Bodie for partner landing pages: the site's 3D Bodie (/js/bodie-v3.js), awake and breathing
   Resonance 6·6. The page's awake still is the first paint and the fallback: it stays when
   the visitor asks for reduced motion, when WebGL is off, or when the module or three.js fails to load.
   Bodie is never started asleep and never set still: both give the bowed, eyes-shut pose. */
const box = document.getElementById('ax-bodie');
const canvas = box && box.querySelector('canvas');

if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  canvas.hidden = false; // he needs his size before the first frame
  import('/js/bodie-v3.js').then(({ mountBodie }) => {
    const bodie = mountBodie(canvas, {
      pattern: { inhale: 6, hold: 0, exhale: 6, hold2: 0 },
      interactive: true,
      asleep: false,
    });
    if (canvas.dataset.webgl === 'off') {
      bodie.destroy();
      canvas.hidden = true;
      return;
    }
    const live = () => box.classList.add('is-live');
    if (canvas.classList.contains('is-live')) live();
    else new MutationObserver((list, obs) => {
      if (canvas.classList.contains('is-live')) { obs.disconnect(); live(); }
    }).observe(canvas, { attributes: true, attributeFilter: ['class'] });
  }).catch(() => { canvas.hidden = true; });
}
