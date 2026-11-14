import { createWorld } from './world.js';
import { createSeedWindState, aimSeedWind, fireSeedWind, stepSeedWind, describeSeedWind, createSeedWindView } from './seed-wind.js';
import { createExploreState, chooseExplorePath, steerExplore, stepExplore, selectExploreDisplay, describeExplore, createExploreView } from './explore.js';

const $ = id => document.getElementById(id);
const menu = $('menu'), rules = $('rules'), screen = $('play-screen'), canvas = $('arena');
const pauseDialog = $('pause-dialog'), resultDialog = $('result-dialog');
const pointers = new Map();
const aims = [$('aim-0'), $('aim-1')];
const shots = [$('gust-0'), $('gust-1')];
const seats = [$('seat-0'), $('seat-1')];
const scores = [$('score-0'), $('score-1')];
const ready = [$('ready-0'), $('ready-1')];
const assistInputs = [$('assist-0'), $('assist-1')];
let world, active = null, selected = 'wind', paused = false, resultShown = false;
let assist = [false, false], wins = [0, 0], draws = 0;
let lessMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let soundOn = false, audio = null, last = 0, hudAt = 0, cueKey = '', routeKey = '';
let lastFind = 0, lastRecovery = 0, noticeText = '', noticeRemaining = 0;
let choiceReadyAt = 0;
const landscape = () => active?.kind === 'wind' && matchMedia('(max-height: 600px) and (min-width: 600px)').matches;
const textCache = new Map();

function text(id, value) {
  const str = String(value);
  if (textCache.get(id) !== str) { $(id).textContent = str; textCache.set(id, str); }
}
function tone(freq = 440) {
  if (!soundOn) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  if (!audio) audio = new Audio();
  if (audio.state !== 'running') void audio.resume();
  const now = audio.currentTime, oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.start(now); oscillator.stop(now + 0.15);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
function clearPointers() {
  for (const id of pointers.keys()) { try { canvas.releasePointerCapture(id); } catch (_) {} }
  pointers.clear();
}
function fit() {
  if (screen.hidden || !world) return;
  const wrap = $('arena-wrap'), turned = landscape();
  const width = Math.max(1, turned
    ? Math.min(wrap.clientHeight, wrap.clientWidth * 0.625)
    : Math.min(wrap.clientWidth, wrap.clientHeight * 0.625));
  canvas.style.width = width + 'px'; canvas.style.height = width * 1.6 + 'px';
  canvas.style.transform = turned ? 'rotate(90deg)' : '';
  world.resize();
}
function disposeActive() {
  clearPointers();
  if (active) active.view.dispose();
  world.group.clear(); active = null;
}
function showMenu() {
  pauseDialog.close(); resultDialog.close(); disposeActive();
  document.body.removeAttribute('data-mode');
  screen.hidden = true; rules.hidden = true; menu.hidden = false;
  paused = false; $('choose-wind').focus();
}
function showRules(kind) {
  selected = kind; menu.hidden = true; rules.hidden = false;
  text('rules-title', kind === 'wind' ? 'Seed Wind' : 'The Deep');
  $('rules-copy').replaceChildren();
  const lines = kind === 'wind' ? [
    'Gold and Sage play from opposite ends. In portrait, Gold is at the bottom. In landscape, Gold is on the left.',
    'Aim from your own end of the playfield, then lift your finger to send a gust. Slide off the playfield to cancel. Or use your aim slider and Gust button. Your aim is public.',
    'Push the seed into the other goal. Bank it off the stones, or save a gust to defend. Longer presses add no power.',
    'First to 5 wins. At 90 seconds, the leader wins. A tied match is a draw.',
    'Keyboard: A / D and Space for Gold. Left / Right and Enter for Sage.',
  ] : [
    'Bodie has a light to bring home. Choose a path through three quiet rooms and see what you find.',
    'Tap or slide on the playfield to guide the light. You can also use the slider or left and right keys. You never need to keep a finger down.',
    'Look for the glowing discoveries. Moving shadows send you back to a nearby ledge, without taking your discoveries.',
    'At home, choose a discovery to display. There is no best time and no breathing score.',
  ];
  for (const line of lines) { const p = document.createElement('p'); p.textContent = line; $('rules-copy').append(p); }
  $('assistance').hidden = kind !== 'wind';
  text('begin', kind === 'wind' ? 'Start the match' : 'Choose a path');
  $('rules-back').focus();
}
function start(kind = selected) {
  pauseDialog.close(); resultDialog.close(); disposeActive();
  selected = kind; paused = false; resultShown = false; hudAt = 0; cueKey = ''; routeKey = ''; textCache.clear();
  lastFind = 0; lastRecovery = 0; noticeText = ''; noticeRemaining = 0;
  menu.hidden = true; rules.hidden = true; screen.hidden = false;
  document.body.dataset.mode = kind === 'wind' ? 'wind' : 'explore';
  for (const seat of seats) seat.hidden = kind !== 'wind';
  $('explore-controls').hidden = kind === 'wind';
  $('home-controls').hidden = true; $('explore-detail').hidden = false; $('pause').hidden = false;
  $('game-cue').textContent = '';
  text('game-title', kind === 'wind' ? 'Seed Wind' : 'The Deep');
  if (kind === 'wind') {
    const model = createSeedWindState({ assist });
    active = { kind, model, view: createSeedWindView(world, model) };
    aims.forEach(input => { input.value = '500'; });
  } else {
    const model = createExploreState();
    active = { kind, model, view: createExploreView(world, model) };
    $('lantern-aim').min = '100'; $('lantern-aim').max = '900'; $('lantern-aim').value = '500';
  }
  last = performance.now(); fit(); syncHud(); canvas.focus({ preventScroll: true });
}
function pause() {
  if (!active || resultShown || paused) return;
  clearPointers(); paused = true; pauseDialog.showModal();
}
function resume() {
  pauseDialog.close(); paused = false; last = performance.now(); canvas.focus({ preventScroll: true });
}
function shoot(player) {
  if (!active || active.kind !== 'wind' || paused || resultShown) return;
  if (fireSeedWind(active.model, player)) { tone(player ? 392 : 294); syncHud(); }
}
function setAim(player, value) {
  if (!active || active.kind !== 'wind' || paused || resultShown) return;
  const x = Math.max(100, Math.min(900, value));
  aims[player].value = String(x); aimSeedWind(active.model, player, x);
}
function steer(value) {
  if (!active || active.kind !== 'explore' || paused || resultShown) return;
  const x = Math.max(100, Math.min(900, value));
  steerExplore(active.model, x); $('lantern-aim').value = String(active.model.lantern.targetX);
}
function chooseRoute(side) {
  if (!active || active.kind !== 'explore' || paused) return;
  if (!chooseExplorePath(active.model, side)) return;
  const center = active.model.lantern.targetX;
  $('lantern-aim').min = String(center - 164); $('lantern-aim').max = String(center + 164);
  $('lantern-aim').step = '1';
  $('lantern-aim').value = String(center);
  noticeText = ''; noticeRemaining = 0; routeKey = ''; syncHud(); canvas.focus({ preventScroll: true });
}
function showResult(description) {
  clearPointers(); resultShown = true;
  if (active.kind === 'explore') {
    $('home-controls').hidden = false; $('explore-detail').hidden = true; $('pause').hidden = true;
    $('route-choices').replaceChildren(); $('steering').hidden = true;
    text('game-cue', ''); text('round-label', 'Home clearing');
    text('home-detail', `${description.discoveries.length} discoveries brought home. Choose one to show in this clearing.`);
    const select = $('home-discovery'); select.replaceChildren();
    const prompt = document.createElement('option'); prompt.textContent = 'Choose a discovery'; prompt.value = ''; prompt.disabled = true; prompt.selected = true; select.append(prompt);
    description.discoveries.forEach((name, index) => {
      const option = document.createElement('option'); option.textContent = name; option.value = String(index); select.append(option);
    });
    text('game-status', 'You reached the home clearing. Choose a discovery to display.');
    tone(587); fit(); select.focus({ preventScroll: true }); return;
  }
  text('result-title', description.title);
  text('result-detail', `Gold ${description.scores[0]}, Sage ${description.scores[1]}. ${description.detail}`);
  if (description.winner === null) draws++; else wins[description.winner]++;
  text('set-score', `This visit: Gold ${wins[0]} wins · Sage ${wins[1]} wins · ${draws} draws`);
  text('again', 'Rematch'); $('swap').hidden = false;
  tone(587); resultDialog.showModal();
}
function syncHud() {
  if (!active || resultShown) return;
  if (active.kind === 'wind') {
    const d = describeSeedWind(active.model);
    for (let i = 0; i < 2; i++) {
      if (scores[i].textContent !== String(d.scores[i])) scores[i].textContent = d.scores[i];
      const isReady = d.phase === 'play' && d.cooldowns[i] <= 0;
      const status = d.phase === 'serve' ? 'New serve' : isReady ? 'Ready' : `Ready in ${d.cooldowns[i].toFixed(1)}s`;
      if (ready[i].textContent !== status) ready[i].textContent = status;
      shots[i].setAttribute('aria-disabled', String(!isReady));
    }
    const t = Math.max(0, Math.ceil(d.remaining));
    const clock = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    text('seat-time-0', clock); text('seat-time-1', clock);
    text('round-label', `First to 5 · ${clock}`);
    text('game-cue', d.phase === 'serve' ? d.title : '');
    const key = d.phase + ':' + d.scores.join(':');
    if (key !== cueKey) { cueKey = key; text('game-status', `${d.title}. Gold ${d.scores[0]}, Sage ${d.scores[1]}.`); }
    if (d.phase === 'result') showResult(d);
  } else {
    const d = describeExplore(active.model);
    text('round-label', `Room ${Math.min(3, d.room)} of 3 · ${d.discoveries.length} found`);
    text('explore-detail', d.detail);
    const steeringHadFocus = $('steering').contains(document.activeElement);
    $('steering').hidden = d.phase !== 'travel';
    const key = d.phase + ':' + d.room;
    if (key !== routeKey) {
      routeKey = key; $('route-choices').replaceChildren();
      if (d.phase === 'choice') choiceReadyAt = performance.now() + 400;
      for (const choice of d.choices) {
        const button = document.createElement('button'); button.textContent = choice.label;
        button.addEventListener('click', () => chooseRoute(choice.side)); $('route-choices').append(button);
      }
      text('game-status', `${d.title}. ${d.detail}`);
      if (d.phase === 'choice' && steeringHadFocus) $('route-choices').querySelector('button')?.focus({ preventScroll: true });
    }
    if (d.discoveries.length > lastFind) {
      lastFind = d.discoveries.length; noticeText = `Found ${d.discoveries[lastFind - 1]}`; noticeRemaining = 1.8;
      text('game-status', `${d.title}. ${noticeText}. ${d.detail}`); tone(523);
    }
    if (active.model.recoveries > lastRecovery) {
      lastRecovery = active.model.recoveries; noticeText = 'Back to the ledge'; noticeRemaining = 1.8;
      text('game-status', noticeText); tone(262);
    }
    text('game-cue', d.phase === 'choice' ? d.title : noticeRemaining > 0 ? noticeText : '');
    if (d.phase === 'result') showResult(d);
  }
}

$('choose-wind').addEventListener('click', () => showRules('wind'));
$('choose-explore').addEventListener('click', () => showRules('explore'));
$('rules-back').addEventListener('click', showMenu);
$('begin').addEventListener('click', () => { assist = assistInputs.map(input => input.checked); start(); });
$('leave').addEventListener('click', () => resultShown ? showMenu() : pause());
$('pause').addEventListener('click', pause);
$('resume').addEventListener('click', resume);
$('restart').addEventListener('click', () => start());
$('quit').addEventListener('click', showMenu);
$('again').addEventListener('click', () => start());
$('swap').addEventListener('click', () => { assist.reverse(); wins.reverse(); assistInputs.forEach((input, i) => { input.checked = assist[i]; }); start('wind'); });
$('result-menu').addEventListener('click', showMenu);
$('explore-again').addEventListener('click', () => start('explore'));
$('explore-menu').addEventListener('click', showMenu);
$('home-discovery').addEventListener('change', () => {
  if (active?.kind !== 'explore' || !resultShown) return;
  selectExploreDisplay(active.model, Number($('home-discovery').value));
  text('home-detail', `${active.model.display} is on display for this visit.`);
  text('game-status', `${active.model.display} is on display in the clearing.`);
  active.view.render(lessMotion); world.render();
});
pauseDialog.addEventListener('cancel', event => { event.preventDefault(); resume(); });
resultDialog.addEventListener('cancel', event => { event.preventDefault(); showMenu(); });
$('sound').addEventListener('click', () => { soundOn = !soundOn; text('sound', soundOn ? 'Sound on' : 'Sound off'); $('sound').setAttribute('aria-pressed', String(soundOn)); if (!soundOn && audio) void audio.suspend(); else tone(); });
$('motion').addEventListener('click', () => { lessMotion = !lessMotion; $('motion').setAttribute('aria-pressed', String(lessMotion)); text('motion', lessMotion ? 'Less motion on' : 'Less motion'); });
for (let i = 0; i < 2; i++) {
  aims[i].addEventListener('input', () => setAim(i, Number(aims[i].value)));
  shots[i].addEventListener('click', () => shoot(i));
  shots[i].addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') { event.preventDefault(); shots[i].setPointerCapture(event.pointerId); }
  });
  shots[i].addEventListener('pointerup', event => {
    if (event.pointerType === 'touch') { event.preventDefault(); shoot(i); }
  });
}
$('lantern-aim').addEventListener('input', () => steer(Number($('lantern-aim').value)));
$('lantern-aim').addEventListener('keydown', event => {
  if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;
  event.preventDefault();
  steer(Number($('lantern-aim').value) + (event.code === 'ArrowLeft' ? -41 : 41));
});

function position(event) {
  const rect = canvas.getBoundingClientRect();
  return landscape()
    ? { x: (event.clientY - rect.top) / rect.height * 1000, y: (rect.right - event.clientX) / rect.width * 1600 }
    : { x: (event.clientX - rect.left) / rect.width * 1000, y: (event.clientY - rect.top) / rect.height * 1600 };
}
canvas.addEventListener('pointerdown', event => {
  if (!active || paused || resultShown || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault(); const p = position(event), seat = p.y < 800 ? 1 : 0;
  if (active.kind === 'wind' && p.y >= 550 && p.y <= 1050) return;
  if (active.kind === 'explore' && active.model.phase === 'choice') {
    syncHud();
    if (performance.now() >= choiceReadyAt) chooseRoute(p.x < 500 ? 'left' : 'right');
    return;
  }
  if (active.kind === 'wind' && [...pointers.values()].includes(seat)) return;
  pointers.set(event.pointerId, seat); canvas.setPointerCapture(event.pointerId);
  if (active.kind === 'wind') setAim(seat, p.x); else steer(p.x);
});
canvas.addEventListener('pointermove', event => {
  if (!pointers.has(event.pointerId)) return;
  event.preventDefault(); const p = position(event);
  if (active?.kind === 'wind') setAim(pointers.get(event.pointerId), p.x); else steer(p.x);
});
function endPointer(event, cancelled) {
  if (!pointers.has(event.pointerId)) return;
  const player = pointers.get(event.pointerId); pointers.delete(event.pointerId);
  try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
  const p = position(event), outside = p.x < 0 || p.x > 1000 || p.y < 0 || p.y > 1600;
  if (!cancelled && !outside && active?.kind === 'wind') shoot(player);
}
canvas.addEventListener('pointerup', event => endPointer(event, false));
canvas.addEventListener('pointercancel', event => endPointer(event, true));
canvas.addEventListener('lostpointercapture', event => { pointers.delete(event.pointerId); });
window.addEventListener('keydown', event => {
  if (!active || resultShown) return;
  if (event.code === 'Escape' || event.code === 'KeyP') { if (!pauseDialog.open) { event.preventDefault(); pause(); } return; }
  if (paused || event.target.closest('input, select, a, dialog, button:not(#gust-0):not(#gust-1)')) return;
  if (active.kind === 'wind') {
    if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault(); const player = event.code.startsWith('Key') ? 0 : 1;
      setAim(player, Number(aims[player].value) + (event.code === 'KeyA' || event.code === 'ArrowLeft' ? -40 : 40));
    } else if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); if (!event.repeat) shoot(event.code === 'Space' ? 0 : 1); }
  } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
    event.preventDefault(); const d = describeExplore(active.model);
    if (d.phase === 'choice') { if (!event.repeat) chooseRoute(event.code === 'ArrowLeft' ? 'left' : 'right'); }
    else steer(Number($('lantern-aim').value) + (event.code === 'ArrowLeft' ? -60 : 60));
  }
});
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('resize', fit);
new ResizeObserver(fit).observe($('arena-wrap'));

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  if (!active) return;
  if (!paused && !resultShown) {
    noticeRemaining = Math.max(0, noticeRemaining - dt);
    if (active.kind === 'wind') stepSeedWind(active.model, dt); else stepExplore(active.model, dt);
    hudAt += dt;
    if (hudAt >= 0.08) { hudAt = 0; syncHud(); }
  }
  if (!paused) { active.view.render(lessMotion); world.render(); }
}
try {
  world = createWorld(canvas);
  $('choose-wind').disabled = false; $('choose-explore').disabled = false;
  $('boot-status').hidden = true; document.documentElement.dataset.playReady = 'true';
  clearTimeout(window.groundPlayLoading);
  $('motion').setAttribute('aria-pressed', String(lessMotion));
  text('motion', lessMotion ? 'Less motion on' : 'Less motion');
  requestAnimationFrame(frame);
} catch (error) {
  clearTimeout(window.groundPlayLoading);
  text('boot-status', 'Graphics could not start. Reload in a browser with WebGL enabled, or use the original game link below.');
  console.error('Ground play could not start:', error);
}
