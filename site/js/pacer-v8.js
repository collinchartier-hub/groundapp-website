/* GroundApp breath pacers: the hero pacer and the one the feelings wheel opens.
   Five gold rings (or the breath shader, when WebGL is on) spread on the inhale, hold on a hold and draw
   back in on the exhale, with the phase word and seconds in the center. Patterns are the app's own
   timings (breathwork_techniques.json). Idle: a resonance-paced loop (4.5 s in, 6.5 s out), paused
   off-screen. Sound: nothing plays until the visitor taps a sound button (that tap creates the
   AudioContext); the binaural tone swells with the inhale. Reduced motion: no idle loop, rings never
   scale; the count and words still run and the glow brightens and dims instead.
   Only one pacer runs at a time. Fires `pacer:cycle` and `pacer:stop` on document.
   v3: an optional `.pc-track` lists the pattern's steps (In 4, Hold 4, Out 4, Hold 4) and fills the one you are on,
   so you can see what comes next; listeners get the phase ('in' / 'out' / 'hold', or null when idle) as a third
   argument (breath-figure-v1.js closes the figure's eyes on a hold); `data-begin-word` and `data-stop-hint` set the
   idle word and the running hint. `data-autostart="<ms>"` starts the pattern on its own after that delay (not under
   reduced motion, not in a hidden tab). An auto run is quiet: it fills no live region until the visitor touches the
   pacer, so a screen reader is not read breath cues from page load. It resumes when the tab comes back.
   v4: `data-sound-default="on"` starts the sound toggle on (Collin 2026-10-15). Browsers allow audio only after the
   visitor's first tap, click or key, so the tone starts then (one page-wide listener), never on load. While a
   running pacer is off screen its tone fades to silence, and it follows the breath again when it comes back.
   v5: the sound is tried as soon as the pacer starts, and plays at once wherever the browser allows it (Chrome for
   visitors who already engaged with the site, or a site setting that allows sound); everywhere else the first tap or
   key unlocks it. Until audio is actually playing, the toggle reads "Tap for sound" and its ring glows with the breath
   (`is-waiting`, --f), and a tap on it turns sound on rather than off.
   v7 (sound audit, 2026-10-15; v6 was a preview only): phones heard nothing. (1) v5 tried to unlock audio once, on the
   first pointerdown, but a finger's pointerdown is not a gesture (only the finished tap is), so the attempt failed and
   the real tap was ignored; now every finished tap, click or key tries until the audio plays. (2) iOS mutes Web Audio
   when the ring switch is on silent; the page asks for the "playback" audio session, like a music player. That pauses
   other audio (a podcast, Spotify), and iOS doesn't restart it when the tone stops, so once another app or a call has
   taken the audio back, taps on the page leave it alone; only the sound button or Begin bring the tone back. After the
   tone has played once it resumes only inside a gesture, never on its own. (3) Phone speakers barely play 200 Hz, so
   the pure tone was 15 to 30 dB quieter there than on a laptop; it now carries soft overtones (same pitch, same 6 Hz
   beat) and a little more level. (4) Sound is one page-wide setting (Collin): the hero's toggle sets it and the
   feelings pacer plays the tone too. With no pacer sounding, the context is suspended so the audio hardware can sleep.
   v8 (2026-10-27): adds `box6`, box breathing on a 6 count (6 in, 6 hold, 6 out, 6 hold), for the masterclass
   waiting room (/masterclass-waiting-room), which runs it on an endless loop. Nothing else changed from v7.
   Bump the filename (v9, v10) when editing: Cloudflare caches .js at the edge for 7 days. */
(function () {
  'use strict';
  var PATTERNS = {
    box: { name: 'Box Breathing', desc: '4 in, 4 hold, 4 out, 4 hold', phases: [['in', 4], ['hold', 4], ['out', 4], ['hold', 4]] },
    box6: { name: 'Box Breathing', desc: '6 in, 6 hold, 6 out, 6 hold', phases: [['in', 6], ['hold', 6], ['out', 6], ['hold', 6]] },
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
  // start: the lungs' level when the visitor pressed Begin. The first inhale rises from there instead of dropping to
  // empty first (the hero figure visibly deflated on Begin before v3).
  function at(ph, t, start) {
    var T = total(ph), x = ((t % T) + T) % T, level = start && t < T ? start : 0;
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
  // Sound is one setting for the whole page: the hero's toggle sets it, and the feelings pacer plays the tone too.
  var soundOn = !!document.querySelector('[data-pacer][data-sound-default="on"]');
  var actx = null, wave = null, heard = false, released = false, lost = false, audibleSince = 0;
  function wanted() { if (soundOn) for (var i = 0; i < all.length; i++) if (all[i].isRunning()) return true; return false; }
  function labels() { for (var i = 0; i < all.length; i++) all[i].soundLabel(); }
  function sync(explicit) { for (var i = 0; i < all.length; i++) all[i].syncSound(explicit); labels(); }
  function inGesture() { var u = navigator.userActivation; return !u || u.isActive; }
  // Browsers start audio only inside a gesture: a finished tap (touchend / pointerup), a click, a mouse press or a key.
  // A finger's pointerdown and the end of a scroll don't count, so every gesture tries until the audio plays. Once a call
  // or another app has taken the audio (`lost`), taps on the page leave it alone: a visitor who restarts their podcast
  // keeps it. The sound button and Begin still bring the tone back.
  function unlock(e) {
    if (e.type === 'pointerdown' && e.pointerType !== 'mouse') return;
    if (audible() || lost || !wanted()) return;
    audio(false); sync(false);
  }
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(function (t) { window.addEventListener(t, unlock, { capture: true, passive: true }); });
  // The context may be created before any gesture. Until it has played once it tries at once (Chrome plays for visitors
  // who engaged with the site before); after that it resumes only inside a gesture, so it never takes the audio on its
  // own (a returning tab waits for a tap). `explicit`: the sound button or Begin, which may take back lost audio.
  function audio(explicit) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    // iOS plays Web Audio as "ambient" sound, which the ring switch silences; "playback" plays on silent (iOS 16.4+).
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      if (!actx) { actx = new AC(); actx.onstatechange = stateChanged; }
      if (actx.state !== 'running' && (!heard || inGesture()) && (explicit || !lost)) { // 'suspended', or iOS's 'interrupted'
        var r = actx.resume(); if (r && r.catch) r.catch(function () {});
      }
    } catch (e) { actx = null; }
    return actx;
  }
  function stateChanged() {
    if (actx.state === 'running') { heard = true; released = false; lost = false; audibleSince = audibleSince || performance.now(); }
    else { if (heard && !released && !document.hidden) lost = true; audibleSince = 0; } // a call, Siri or another app took it
    labels();
  }
  // With no pacer sounding, suspend so the audio hardware can sleep (and iOS can let other apps play).
  function release() { if (actx && actx.state === 'running' && !wanted()) { released = true; var r = actx.suspend(); if (r && r.catch) r.catch(function () {}); } }
  // One voice of the tone: a sine with soft overtones (2x to 5x). Phone speakers barely play 200 Hz, so the overtones
  // carry the pitch there; on headphones and laptops it still sounds like the same low hum.
  function voice() {
    if (!wave) wave = actx.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, 0.5, 0.3, 0.15, 0.07]));
    var o = actx.createOscillator(); o.setPeriodicWave(wave); return o;
  }
  function audible() { return !!actx && actx.state === 'running'; }

  function init(root) {
    var rings = root.querySelectorAll('.pc-ring'), glow = root.querySelector('.pc-glow'), go = root.querySelector('.pc-go');
    var word = root.querySelector('.pc-word'), count = root.querySelector('.pc-count'), desc = root.querySelector('.pc-desc');
    var live = root.querySelector('.pc-live'), patBtns = root.querySelectorAll('[data-pattern]');
    var sndBtn = root.querySelector('[data-sound]'), sndLbl = root.querySelector('.pc-sound-label');
    var track = root.querySelector('.pc-track'), steps = [];
    var beginWord = root.getAttribute('data-begin-word') || 'Begin', stopHint = root.getAttribute('data-stop-hint') || ' Tap the center to stop.';
    var quiet = false, auto = false, resumeAuto = false;
    // data-loop: the waiting room's endless run. A tap on the center never stops it (it only unlocks sound), and it
    // resumes on its own after the tab was hidden.
    var loopOnly = root.hasAttribute('data-loop');
    if (!go) return null;
    var cur = root.getAttribute('data-start') || 'box', running = false, t0 = 0, cycles = 0, lastPhase = -1, lastCount = -1;
    var raf = 0, visible = true, idleOn = false, idleT0 = 0, shown = 0.25, blendFrom = null, blendT0 = 0, listeners = [], startLevel = 0;
    var oscL = null, oscR = null, gain = null, lastGainAt = 0;

    function draw(fillAt, still, phase) {
      for (var i = 0; i < rings.length; i++) {
        var f = fillAt(i * 0.08), amp = 0.12 + 0.055 * i;
        rings[i].style.transform = 'scale(' + (still ? 1 - amp * 0.5 : 1 - amp * (1 - f)).toFixed(4) + ')';
      }
      var g = fillAt(0); shown = g;
      if (glow) {
        glow.style.opacity = (0.18 + 0.62 * g).toFixed(3);
        glow.style.transform = still ? 'scale(1)' : 'scale(' + (0.86 + 0.3 * g).toFixed(4) + ')';
      }
      for (var k = 0; k < listeners.length; k++) listeners[k](g, still, phase || null);
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
        var a = at(ph, t, startLevel);
        var f = draw(blend(function (lag) { return at(ph, Math.max(0, t - lag), startLevel).fill; }, now), RM(), ph[a.i][0]);
        if (a.cycle + 1 !== cycles) {
          if (cycles > 0) document.dispatchEvent(new CustomEvent('pacer:cycle', { detail: { cycles: cycles, root: root } }));
          cycles = a.cycle + 1;
          if (desc) putData(desc, 'Cycle ', String(cycles), '.' + stopHint);
        }
        if (a.i !== lastPhase) { lastPhase = a.i; word.textContent = a.word; if (live && !quiet) live.textContent = a.word; stepTo(a.i); }
        if (steps[a.i]) steps[a.i].style.setProperty('--p', (1 - a.left / ph[a.i][1]).toFixed(3));
        var c = Math.max(1, Math.min(Math.ceil(a.left - 0.0001), Math.floor(ph[a.i][1]))); // a 5.5 s step counts 5, 4, 3, 2, 1
        if (c !== lastCount) { lastCount = c; count.textContent = String(c); }
        soundFollow(f, now);
        if (sndBtn && soundOn && !audible()) sndBtn.style.setProperty('--f', f.toFixed(3)); // "Tap for sound" glows with the breath
        if (visible && !document.hidden) raf = requestAnimationFrame(frame); // paused off screen; the time-based clock resumes in step
      } else if (idleOn && visible && !document.hidden) {
        t = (now - idleT0) / 1000;
        draw(blend(function (lag) { return 0.25 + 0.5 * at(IDLE, Math.max(0, t - lag)).fill; }, now), false);
        raf = requestAnimationFrame(frame);
      }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    function rest() { draw(function () { return 0.25; }, RM()); }
    // Timings and counts render in the data face (span.data, Source Code Pro); the words around them stay serif.
    function putData(el, before, data, after) { el.textContent = before; var s = document.createElement('span'); s.className = 'data'; s.textContent = data; el.appendChild(s); el.appendChild(document.createTextNode(after)); }
    function describe() { if (desc) putData(desc, PATTERNS[cur].name + ': ', PATTERNS[cur].desc, '.'); }
    // The step track: one item per phase, widths in proportion to the seconds, the current one filling.
    function buildTrack() {
      if (!track) return;
      track.textContent = ''; steps = [];
      var ph = PATTERNS[cur].phases;
      for (var i = 0; i < ph.length; i++) {
        var li = document.createElement('li'), name = document.createElement('span');
        li.className = 'pc-step'; li.style.flexGrow = String(ph[i][1]);
        name.className = 'pc-step-name'; name.textContent = ph[i][0] === 'in' ? 'In' : ph[i][0] === 'out' ? 'Out' : 'Hold';
        li.appendChild(name); putData(li.appendChild(document.createElement('span')), '', String(ph[i][1]), '');
        li.appendChild(document.createElement('i'));
        track.appendChild(li); steps.push(li);
      }
    }
    function stepTo(n) {
      for (var i = 0; i < steps.length; i++) {
        steps[i].classList.toggle('is-done', n >= 0 && i < n);
        steps[i].classList.toggle('is-on', i === n);
        steps[i].style.setProperty('--p', n >= 0 && i < n ? '1' : '0');
      }
    }
    function setPattern(id) {
      if (!PATTERNS[id]) return;
      cur = id;
      for (var i = 0; i < patBtns.length; i++) patBtns[i].setAttribute('aria-pressed', patBtns[i].getAttribute('data-pattern') === id ? 'true' : 'false');
      go.setAttribute('aria-label', 'Begin ' + PATTERNS[id].name);
      buildTrack();
      if (running) { stop(true); start(); } else describe();
    }
    function start(silent) {
      for (var i = 0; i < all.length; i++) if (all[i] !== api && all[i].isRunning()) all[i].stop(true);
      quiet = !!silent; if (!silent) auto = false;
      running = true; cycles = 0; lastPhase = -1; lastCount = -1;
      t0 = performance.now(); startLevel = Math.min(shown, 0.7); blendFrom = null; blendT0 = t0;
      root.classList.add('is-running');
      go.setAttribute('aria-pressed', 'true'); go.setAttribute('aria-label', 'Stop the breath pacer');
      if (soundOn) soundStart(!silent);
      labels();
      kick();
    }
    function stop(quiet) {
      if (!running) return;
      var done = cycles - 1;
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      root.classList.remove('is-running');
      go.setAttribute('aria-pressed', 'false'); go.setAttribute('aria-label', 'Begin ' + PATTERNS[cur].name);
      word.textContent = beginWord; count.textContent = ''; stepTo(-1);
      if (live && !quiet) live.textContent = 'Stopped.';
      describe(); soundStop(); labels();
      if (!quiet) document.dispatchEvent(new CustomEvent('pacer:stop', { detail: { cycles: done, root: root } }));
      idleT0 = performance.now();
      if (RM() || !idleOn) rest(); else { blendFrom = shown; blendT0 = idleT0; }
      kick();
    }
    function soundStart(explicit) {
      if (gain || !audio(explicit)) return; // builds the tone even on a suspended context; it sounds once the browser allows it
      try {
        oscL = voice(); oscR = voice();
        oscL.frequency.value = 197; oscR.frequency.value = 203; // 6 Hz apart: a binaural beat on headphones
        var merger = actx.createChannelMerger(2);
        gain = actx.createGain(); gain.gain.value = 0;
        oscL.connect(merger, 0, 0); oscR.connect(merger, 0, 1); merger.connect(gain); gain.connect(actx.destination);
        oscL.start(); oscR.start();
        gain.gain.setValueAtTime(0, actx.currentTime); gain.gain.linearRampToValueAtTime(0.05, actx.currentTime + 1.5);
        lastGainAt = performance.now() + 1500;
      } catch (e) { oscL = oscR = gain = null; }
    }
    function soundFollow(f, now) {
      if (!gain || !visible || now < lastGainAt) return; // off screen the tone stays hushed (a frame already in flight must not undo it)
      lastGainAt = now + 120;
      gain.gain.setTargetAtTime(0.035 + 0.115 * f, actx.currentTime, 0.25);
    }
    function soundHush() { // off screen: fade to silence, soundFollow brings it back with the breath
      if (!gain || !actx) return;
      gain.gain.cancelScheduledValues(actx.currentTime); gain.gain.setTargetAtTime(0, actx.currentTime, 0.3); lastGainAt = 0;
    }
    function soundStop() {
      if (!gain || !actx) return;
      var l = oscL, r = oscR, g = gain, t = actx.currentTime;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 1);
      setTimeout(function () { try { l.stop(); r.stop(); l.disconnect(); r.disconnect(); g.disconnect(); } catch (e) {} release(); }, 1100);
      oscL = oscR = gain = null;
    }

    go.addEventListener('click', function () {
      if (loopOnly) { if (!running) { auto = true; start(); } return; }
      auto = false; if (running) stop(false); else start();
    });
    for (var i = 0; i < patBtns.length; i++) patBtns[i].addEventListener('click', function (e) { auto = false; quiet = false; setPattern(e.currentTarget.getAttribute('data-pattern')); });
    // The toggle: "Sound off", "Sound on", or "Tap for sound" while a pacer runs with sound on but the audio isn't
    // playing yet (or a call or another app took it). aria-pressed is true only when sound is really on.
    function soundLabel() {
      if (!sndBtn) return;
      var waiting = soundOn && wanted() && !audible();
      sndBtn.setAttribute('aria-pressed', soundOn && !waiting ? 'true' : 'false');
      sndBtn.classList.toggle('is-waiting', waiting);
      if (sndLbl) sndLbl.textContent = !soundOn ? 'Sound off' : waiting ? 'Tap for sound' : 'Sound on';
    }
    soundLabel();
    if (sndBtn) sndBtn.addEventListener('click', function () {
      // A tap on "Tap for sound" (or one that only just unlocked the audio) means "I want sound": never toggle it off.
      if (soundOn && wanted() && (!audible() || performance.now() - audibleSince < 400)) { audio(true); sync(true); return; }
      soundOn = !soundOn;
      sync(true);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && running) { resumeAuto = auto; stop(true); }
      else if (!document.hidden) { if (resumeAuto && !running && !RM()) { resumeAuto = false; auto = true; start(true); } kick(); }
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); else soundHush(); }, { rootMargin: '80px 0px' }).observe(root);

    var api = {
      root: root, putData: putData, start: start, stop: stop, setPattern: setPattern,
      isRunning: function () { return running; },
      soundLabel: soundLabel,
      syncSound: function (explicit) { if (soundOn && running) soundStart(explicit); else soundStop(); },
      pattern: function (id) { return PATTERNS[id || cur]; },
      onFill: function (fn) { listeners.push(fn); fn(shown, RM()); },
      describe: function () { return PATTERNS[cur].name + ': ' + PATTERNS[cur].desc; }
    };
    rest(); describe(); buildTrack();
    function beginIdle() { if (RM() || running) return; idleOn = true; idleT0 = performance.now(); kick(); }
    var idleAttr = root.getAttribute('data-idle-delay') || '0', wait = parseInt(idleAttr, 10);
    if (idleAttr !== 'manual') { if (wait > 0) setTimeout(beginIdle, wait); else beginIdle(); }
    api.idle = function (on) { if (on) beginIdle(); else { idleOn = false; rest(); } };
    var autoAttr = root.getAttribute('data-autostart');
    if (autoAttr !== null) setTimeout(function () {
      if (running || RM()) return;
      if (document.hidden) { resumeAuto = true; return; }
      auto = true; start(true);
    }, parseInt(autoAttr, 10) || 0);
    if (mq.addEventListener) mq.addEventListener('change', function () { if (RM()) { idleOn = false; rest(); } else if (idleAttr !== 'manual') beginIdle(); });
    root.groundPacer = api;
    return api;
  }

  var roots = document.querySelectorAll('[data-pacer]');
  for (var i = 0; i < roots.length; i++) { var p = init(roots[i]); if (p) all.push(p); }
  window.groundPacers = all;
  window.groundPacer = { isRunning: function () { for (var i = 0; i < all.length; i++) if (all[i].isRunning()) return true; return false; } };
  document.dispatchEvent(new CustomEvent('pacers:ready'));
})();
