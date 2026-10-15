/* GroundApp breath pacer (the homepage hero).
   Five gold rings, like the rings in the app. They spread on the inhale, hold still on a hold
   and draw back in on the exhale, with the phase word and seconds in the center.
   Idle (before anyone taps): a slow resonance-paced loop, about 5.5 breaths a minute
   (4.5 s in, 6.5 s out), so the page breathes before you do. It pauses off-screen.
   Sound: nothing plays until the visitor taps the sound button (the tap creates the
   AudioContext). The binaural tone swells with the inhale and settles with the exhale.
   Reduced motion: no idle loop and the rings never scale; the count and words still run
   and the center glow brightens and dims instead.
   Fires `pacer:cycle` on document after each full cycle (the signup card listens for it).
   Bump the filename (v2, v3) when editing: Cloudflare caches .js at the edge for 7 days. */
(function () {
  'use strict';
  var root = document.querySelector('[data-pacer]');
  if (!root) return;

  var PATTERNS = {
    box: { name: 'Box breathing', desc: '4 in, 4 hold, 4 out, 4 hold', phases: [['in', 4], ['hold', 4], ['out', 4], ['hold', 4]] },
    '478': { name: '4-7-8 breathing', desc: '4 in, 7 hold, 8 out', phases: [['in', 4], ['hold', 7], ['out', 8]] },
    resonance: { name: 'Resonance breathing', desc: '5.5 in, 5.5 out', phases: [['in', 5.5], ['out', 5.5]] }
  };
  var IDLE = [['in', 4.5], ['out', 6.5]];
  var WORD = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' };

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function RM() { return mq.matches; }

  var rings = root.querySelectorAll('.pc-ring');
  var glow = root.querySelector('.pc-glow');
  var go = root.querySelector('.pc-go');
  var word = root.querySelector('.pc-word');
  var count = root.querySelector('.pc-count');
  var desc = root.querySelector('.pc-desc');
  var live = root.querySelector('.pc-live');
  var patBtns = root.querySelectorAll('[data-pattern]');
  var sndBtn = root.querySelector('[data-sound]');
  var sndLbl = root.querySelector('.pc-sound-label');
  if (!go || !rings.length) return;

  var cur = 'box', running = false, t0 = 0, cycles = 0, lastPhase = -1, lastCount = -1;
  var raf = 0, visible = true, idleOn = false, idleT0 = 0;
  var shown = 0.25, blendFrom = null, blendT0 = 0;
  var soundOn = false, actx = null, oscL = null, oscR = null, gain = null, lastGainAt = 0;

  function ease(x) { return 0.5 - 0.5 * Math.cos(Math.PI * x); }
  function total(ph) { var s = 0; for (var i = 0; i < ph.length; i++) s += ph[i][1]; return s; }

  /* where we are in a pattern at time t (seconds): phase index, seconds left, fill 0..1 */
  function at(ph, t) {
    var T = total(ph), x = ((t % T) + T) % T, fill = 0, i;
    for (i = 0; i < ph.length; i++) {
      var k = ph[i][0], d = ph[i][1];
      if (x < d) {
        var p = x / d;
        if (k === 'in') fill = ease(p);
        else if (k === 'out') fill = 1 - ease(p);
        else fill = (i > 0 && ph[i - 1][0] === 'in') ? 1 : 0;
        return { i: i, k: k, left: d - x, fill: fill, cycle: Math.floor(t / T) };
      }
      x -= d;
    }
    return { i: 0, k: ph[0][0], left: ph[0][1], fill: 0, cycle: 0 };
  }

  /* rings: outer rings travel further than inner ones, and each trails the one inside it */
  function draw(fillAt, still) {
    for (var i = 0; i < rings.length; i++) {
      var f = fillAt(i * 0.08);
      var amp = 0.12 + 0.055 * i;
      var s = still ? 1 - amp * 0.5 : 1 - amp * (1 - f);
      rings[i].style.transform = 'scale(' + s.toFixed(4) + ')';
    }
    var g = fillAt(0);
    shown = g;
    if (glow) {
      glow.style.opacity = (0.18 + 0.62 * g).toFixed(3);
      glow.style.transform = still ? 'scale(1)' : 'scale(' + (0.86 + 0.3 * g).toFixed(4) + ')';
    }
    return g;
  }

  /* ease from whatever is on screen into the new motion, so starting or stopping never jumps */
  function blend(fn, now) {
    if (blendFrom === null) return fn;
    var k = Math.min(1, (now - blendT0) / 700), from = blendFrom;
    if (k >= 1) { blendFrom = null; return fn; }
    k = ease(k);
    return function (lag) { return from + (fn(lag) - from) * k; };
  }
  function frame(now) {
    raf = 0;
    var t;
    if (running) {
      var ph = PATTERNS[cur].phases;
      t = (now - t0) / 1000;
      var a = at(ph, t);
      var f = draw(blend(function (lag) { return at(ph, Math.max(0, t - lag)).fill; }, now), RM());
      var c = Math.ceil(a.left - 0.0001);
      if (a.i !== lastPhase || a.cycle + 1 !== cycles) {
        if (a.cycle + 1 !== cycles) {
          if (cycles > 0) document.dispatchEvent(new CustomEvent('pacer:cycle', { detail: { cycles: cycles } }));
          cycles = a.cycle + 1;
          if (desc) desc.textContent = 'Cycle ' + cycles + '. Tap the center to stop.';
        }
        lastPhase = a.i;
        word.textContent = WORD[a.k];
        if (live) live.textContent = WORD[a.k];
      }
      if (c !== lastCount) { lastCount = c; count.textContent = String(c); }
      soundFollow(f, now);
      raf = requestAnimationFrame(frame);
    } else if (idleOn && visible && !document.hidden) {
      t = (now - idleT0) / 1000;
      draw(blend(function (lag) { return 0.25 + 0.5 * at(IDLE, Math.max(0, t - lag)).fill; }, now), false);
      raf = requestAnimationFrame(frame);
    }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function setPattern(id) {
    if (!PATTERNS[id]) return;
    cur = id;
    for (var i = 0; i < patBtns.length; i++) patBtns[i].setAttribute('aria-pressed', patBtns[i].getAttribute('data-pattern') === id ? 'true' : 'false');
    if (running) { stop(true); start(); }
    else if (desc) desc.textContent = PATTERNS[id].name + ': ' + PATTERNS[id].desc + '.';
  }

  function start() {
    running = true; cycles = 0; lastPhase = -1; lastCount = -1;
    t0 = performance.now();
    blendFrom = shown; blendT0 = t0;
    root.classList.add('is-running');
    go.setAttribute('aria-pressed', 'true');
    go.setAttribute('aria-label', 'Stop the breath pacer');
    if (soundOn) soundStart();
    kick();
  }
  function stop(quiet) {
    if (!running) return;
    var done = cycles - 1;
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    root.classList.remove('is-running');
    go.setAttribute('aria-pressed', 'false');
    go.setAttribute('aria-label', 'Begin ' + PATTERNS[cur].name.toLowerCase());
    word.textContent = 'Begin';
    count.textContent = '';
    if (live && !quiet) live.textContent = 'Stopped.';
    if (desc) desc.textContent = PATTERNS[cur].name + ': ' + PATTERNS[cur].desc + '.';
    soundStop();
    if (!quiet) document.dispatchEvent(new CustomEvent('pacer:stop', { detail: { cycles: done } }));
    idleT0 = performance.now();
    if (RM() || !idleOn) rest(); else { blendFrom = shown; blendT0 = idleT0; }
    kick();
  }
  function rest() { draw(function () { return 0.25; }, RM()); }

  go.addEventListener('click', function () { if (running) stop(false); else start(); });
  for (var i = 0; i < patBtns.length; i++) {
    patBtns[i].addEventListener('click', function (e) { setPattern(e.currentTarget.getAttribute('data-pattern')); });
  }

  /* ---------- sound: only after a tap on the sound button ---------- */
  function soundStart() {
    if (gain) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      oscL = actx.createOscillator(); oscR = actx.createOscillator();
      oscL.frequency.value = 197; oscR.frequency.value = 203;
      var merger = actx.createChannelMerger(2);
      gain = actx.createGain(); gain.gain.value = 0;
      oscL.connect(merger, 0, 0); oscR.connect(merger, 0, 1);
      merger.connect(gain); gain.connect(actx.destination);
      oscL.start(); oscR.start();
      gain.gain.setValueAtTime(0, actx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03, actx.currentTime + 1.5);
      lastGainAt = performance.now() + 1500;
    } catch (e) { oscL = oscR = gain = null; }
  }
  function soundFollow(f, now) {
    if (!gain || !actx || now < lastGainAt) return;
    lastGainAt = now + 120;
    gain.gain.setTargetAtTime(0.02 + 0.07 * f, actx.currentTime, 0.25);
  }
  function soundStop() {
    if (!gain || !actx) return;
    var l = oscL, r = oscR, g = gain, t = actx.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 1);
    setTimeout(function () { try { l.stop(); r.stop(); l.disconnect(); r.disconnect(); g.disconnect(); } catch (e) {} }, 1100);
    oscL = oscR = gain = null;
  }
  if (sndBtn) {
    sndBtn.addEventListener('click', function () {
      soundOn = !soundOn;
      sndBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      if (sndLbl) sndLbl.textContent = soundOn ? 'Sound on' : 'Sound off';
      if (soundOn && running) soundStart();
      if (!soundOn) soundStop();
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && running) stop(true);
    else if (!document.hidden) kick();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) kick();
    }, { rootMargin: '80px 0px' }).observe(root);
  }

  /* first paint: resting rings; the idle loop starts after the hero entrance has played */
  rest();
  function beginIdle() {
    if (RM() || running) return;
    idleOn = true; idleT0 = performance.now(); kick();
  }
  var wait = parseInt(root.getAttribute('data-idle-delay') || '0', 10);
  if (wait > 0) setTimeout(beginIdle, wait); else beginIdle();
  if (mq.addEventListener) mq.addEventListener('change', function () { if (RM()) { idleOn = false; rest(); } else beginIdle(); });

  window.groundPacer = { start: start, stop: stop, setPattern: setPattern, isRunning: function () { return running; } };
})();
