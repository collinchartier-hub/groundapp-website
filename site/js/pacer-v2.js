/* GroundApp breath pacers: the hero pacer and the one the feelings wheel opens.
   Five gold rings (or the breath shader, when WebGL is on) spread on the inhale, hold on a hold and draw
   back in on the exhale, with the phase word and seconds in the center. Patterns are the app's own
   timings (breathwork_techniques.json). Idle: a resonance-paced loop (4.5 s in, 6.5 s out), paused
   off-screen. Sound: nothing plays until the visitor taps a sound button (that tap creates the
   AudioContext); the binaural tone swells with the inhale. Reduced motion: no idle loop, rings never
   scale; the count and words still run and the glow brightens and dims instead.
   Only one pacer runs at a time. Fires `pacer:cycle` and `pacer:stop` on document.
   Bump the filename (v3, v4) when editing: Cloudflare caches .js at the edge for 7 days. */
(function () {
  'use strict';
  var PATTERNS = {
    box: { name: 'Box Breathing', desc: '4 in, 4 hold, 4 out, 4 hold', phases: [['in', 4], ['hold', 4], ['out', 4], ['hold', 4]] },
    '478': { name: '4-7-8 Breathing', desc: '4 in, 7 hold, 8 out', phases: [['in', 4], ['hold', 7], ['out', 8]] },
    resonance: { name: 'Resonance Breathing', desc: '5.5 in, 5.5 out', phases: [['in', 5.5], ['out', 5.5]] },
    sigh: { name: 'Physiological Sigh', desc: '2 in, 1 more in, 6 out', phases: [['in', 2, 0.78], ['in', 1, 1], ['out', 6]] },
    deepslow: { name: 'Deep Slow Breathing', desc: '6 in, 6 out', phases: [['in', 6], ['out', 6]] }
  };
  var IDLE = [['in', 4.5], ['out', 6.5]];
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function RM() { return mq.matches; }
  function ease(x) { return 0.5 - 0.5 * Math.cos(Math.PI * x); }
  function total(ph) { var s = 0; for (var i = 0; i < ph.length; i++) s += ph[i][1]; return s; }
  function at(ph, t) {
    var T = total(ph), x = ((t % T) + T) % T, level = 0;
    for (var i = 0; i < ph.length; i++) {
      var k = ph[i][0], d = ph[i][1];
      var to = k === 'in' ? (ph[i][2] != null ? ph[i][2] : 1) : k === 'out' ? (ph[i][2] != null ? ph[i][2] : 0) : level;
      if (x < d) {
        var word = k === 'in' ? (i > 0 && ph[i - 1][0] === 'in' ? 'In again' : 'Breathe in') : k === 'out' ? 'Breathe out' : 'Hold';
        return { i: i, word: word, left: d - x, fill: level + (to - level) * ease(x / d), cycle: Math.floor(t / T) };
      }
      x -= d; level = to;
    }
    return { i: 0, word: 'Breathe in', left: ph[0][1], fill: 0, cycle: 0 };
  }

  var all = [];
  var actx = null;
  function audio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { if (!actx) actx = new AC(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; }
    return actx;
  }

  function init(root) {
    var rings = root.querySelectorAll('.pc-ring'), glow = root.querySelector('.pc-glow'), go = root.querySelector('.pc-go');
    var word = root.querySelector('.pc-word'), count = root.querySelector('.pc-count'), desc = root.querySelector('.pc-desc');
    var live = root.querySelector('.pc-live'), patBtns = root.querySelectorAll('[data-pattern]');
    var sndBtn = root.querySelector('[data-sound]'), sndLbl = root.querySelector('.pc-sound-label');
    if (!go) return null;
    var cur = root.getAttribute('data-start') || 'box', running = false, t0 = 0, cycles = 0, lastPhase = -1, lastCount = -1;
    var raf = 0, visible = true, idleOn = false, idleT0 = 0, shown = 0.25, blendFrom = null, blendT0 = 0, listeners = [];
    var soundOn = false, oscL = null, oscR = null, gain = null, lastGainAt = 0;

    function draw(fillAt, still) {
      for (var i = 0; i < rings.length; i++) {
        var f = fillAt(i * 0.08), amp = 0.12 + 0.055 * i;
        rings[i].style.transform = 'scale(' + (still ? 1 - amp * 0.5 : 1 - amp * (1 - f)).toFixed(4) + ')';
      }
      var g = fillAt(0); shown = g;
      if (glow) {
        glow.style.opacity = (0.18 + 0.62 * g).toFixed(3);
        glow.style.transform = still ? 'scale(1)' : 'scale(' + (0.86 + 0.3 * g).toFixed(4) + ')';
      }
      for (var k = 0; k < listeners.length; k++) listeners[k](g, still);
      return g;
    }
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
        if (a.cycle + 1 !== cycles) {
          if (cycles > 0) document.dispatchEvent(new CustomEvent('pacer:cycle', { detail: { cycles: cycles, root: root } }));
          cycles = a.cycle + 1;
          if (desc) desc.textContent = 'Cycle ' + cycles + '. Tap the center to stop.';
        }
        if (a.i !== lastPhase) { lastPhase = a.i; word.textContent = a.word; if (live) live.textContent = a.word; }
        var c = Math.ceil(a.left - 0.0001);
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
    function rest() { draw(function () { return 0.25; }, RM()); }
    function describe() { if (desc) desc.textContent = PATTERNS[cur].name + ': ' + PATTERNS[cur].desc + '.'; }
    function setPattern(id) {
      if (!PATTERNS[id]) return;
      cur = id;
      for (var i = 0; i < patBtns.length; i++) patBtns[i].setAttribute('aria-pressed', patBtns[i].getAttribute('data-pattern') === id ? 'true' : 'false');
      go.setAttribute('aria-label', 'Begin ' + PATTERNS[id].name);
      if (running) { stop(true); start(); } else describe();
    }
    function start() {
      for (var i = 0; i < all.length; i++) if (all[i] !== api && all[i].isRunning()) all[i].stop(true);
      running = true; cycles = 0; lastPhase = -1; lastCount = -1;
      t0 = performance.now(); blendFrom = shown; blendT0 = t0;
      root.classList.add('is-running');
      go.setAttribute('aria-pressed', 'true'); go.setAttribute('aria-label', 'Stop the breath pacer');
      if (soundOn) soundStart();
      kick();
    }
    function stop(quiet) {
      if (!running) return;
      var done = cycles - 1;
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      root.classList.remove('is-running');
      go.setAttribute('aria-pressed', 'false'); go.setAttribute('aria-label', 'Begin ' + PATTERNS[cur].name);
      word.textContent = 'Begin'; count.textContent = '';
      if (live && !quiet) live.textContent = 'Stopped.';
      describe(); soundStop();
      if (!quiet) document.dispatchEvent(new CustomEvent('pacer:stop', { detail: { cycles: done, root: root } }));
      idleT0 = performance.now();
      if (RM() || !idleOn) rest(); else { blendFrom = shown; blendT0 = idleT0; }
      kick();
    }
    function soundStart() {
      if (gain || !audio()) return;
      try {
        oscL = actx.createOscillator(); oscR = actx.createOscillator();
        oscL.frequency.value = 197; oscR.frequency.value = 203;
        var merger = actx.createChannelMerger(2);
        gain = actx.createGain(); gain.gain.value = 0;
        oscL.connect(merger, 0, 0); oscR.connect(merger, 0, 1); merger.connect(gain); gain.connect(actx.destination);
        oscL.start(); oscR.start();
        gain.gain.setValueAtTime(0, actx.currentTime); gain.gain.linearRampToValueAtTime(0.03, actx.currentTime + 1.5);
        lastGainAt = performance.now() + 1500;
      } catch (e) { oscL = oscR = gain = null; }
    }
    function soundFollow(f, now) {
      if (!gain || now < lastGainAt) return;
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

    go.addEventListener('click', function () { if (running) stop(false); else start(); });
    for (var i = 0; i < patBtns.length; i++) patBtns[i].addEventListener('click', function (e) { setPattern(e.currentTarget.getAttribute('data-pattern')); });
    if (sndBtn) sndBtn.addEventListener('click', function () {
      soundOn = !soundOn;
      sndBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      if (sndLbl) sndLbl.textContent = soundOn ? 'Sound on' : 'Sound off';
      if (soundOn && running) soundStart();
      if (!soundOn) soundStop();
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && running) stop(true); else if (!document.hidden) kick(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '80px 0px' }).observe(root);

    var api = {
      root: root, start: start, stop: stop, setPattern: setPattern,
      isRunning: function () { return running; },
      pattern: function (id) { return PATTERNS[id || cur]; },
      onFill: function (fn) { listeners.push(fn); fn(shown, RM()); }
    };
    rest(); describe();
    function beginIdle() { if (RM() || running) return; idleOn = true; idleT0 = performance.now(); kick(); }
    var wait = parseInt(root.getAttribute('data-idle-delay') || '0', 10);
    if (wait > 0) setTimeout(beginIdle, wait); else beginIdle();
    if (mq.addEventListener) mq.addEventListener('change', function () { if (RM()) { idleOn = false; rest(); } else beginIdle(); });
    root.groundPacer = api;
    return api;
  }

  var roots = document.querySelectorAll('[data-pacer]');
  for (var i = 0; i < roots.length; i++) { var p = init(roots[i]); if (p) all.push(p); }
  window.groundPacers = all;
  window.groundPacer = { isRunning: function () { for (var i = 0; i < all.length; i++) if (all[i].isRunning()) return true; return false; } };
  document.dispatchEvent(new CustomEvent('pacers:ready'));
})();
