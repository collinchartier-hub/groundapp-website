
// ---------------------------------------------------------------- menus
const OVERLAYS = ["ov-title", "ov-courses", "ov-brief", "ov-surf", "ov-result", "ov-shop", "ov-hall", "ov-help", "ov-pause", "ov-cast"];
const SAGE_SAY = { hollow: "Press the button for your shield.", lake: "Jump the obstacles.", swamp: "Double tap to clear a storm.", peaks: "Tap on a power pad to charge the shield.", temple: "Press the button to glide through rings." };
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
function show(id) {
  OVERLAYS.forEach((o) => ($(o).hidden = o !== id));
  $("btn-pause").hidden = !(state === "play" && id === null);
  $("hud-btns").hidden = !!id && $(id).classList.contains("center");
  if (id) $(id).querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
  else stage.focus({ preventScroll: true });
}
function walletHTML() { return `<span>Gold Leaves <b>${profile.leaves}</b></span><span>Wins <b>${profile.wins}</b></span><span>Stars <b>${totalStars()}/15</b></span>`; }
function refreshWallets() { ["wallet-title", "wallet-res", "wallet-shop"].forEach((id) => ($(id).innerHTML = walletHTML())); }
function toMenu(view) {
  clearWorld(); S = null; mode = "race";
  hudEl.hidden = true; showCallout(null); $("countdown").hidden = true;
  state = "menu"; menuView = view || "title"; menu.visible = true;
  const co = COURSES[Math.min(courseIdx, COURSES.length - 1)];
  if (bdKey !== co.key + ":200") setBackdrop(co, 200);
  backdrop.visible = true;
  Sound.music(0, 128, 0); Sound.hold(false); Sound.danger(0);
  refreshWallets(); show(menuView === "title" ? "ov-title" : menuView);
}
const starStr = (arr) => { const n = (arr || []).filter(Boolean).length; return `<span class="stars">${"★".repeat(n)}<i>${"★".repeat(3 - n)}</i></span>`; };
function renderCourses() {
  $("courses-mode").textContent = raceMode === "duel" ? "2 Player Duel" : "Race Kip";
  $("courses").innerHTML = COURSES.map((c, i) => {
    const locked = raceMode === "kip" && i + 1 > profile.unlocked;
    const bt = profile.bestTime[c.key], last = profile.last[c.key];
    const meta = raceMode === "kip" ? [bt ? "best " + fmtT(bt) : "", last ? "last " + (last.time ? fmtT(last.time) : last.pct + "%") : ""].filter(Boolean).join(", ") : "";
    return `<button class="pick" type="button" data-i="${i}" ${locked ? "disabled" : ""}><span class="n"><span>Course ${i + 1}: ${c.tech.toLowerCase()}</span>${raceMode === "kip" ? starStr(profile.stars[c.key]) : ""}</span><span class="t">${c.name}</span><span class="b">${locked ? "Win the course before it to unlock" : c.len + "m" + (meta ? ". " + meta[0].toUpperCase() + meta.slice(1) : "")}</span></button>`;
  }).join("");
  $("courses").querySelectorAll(".pick").forEach((b) => b.addEventListener("click", () => { Sound.play("click"); courseIdx = +b.dataset.i; openBrief(COURSES[courseIdx]); }));
}
let briefCourse = null;
function openBrief(co) {
  briefCourse = co;
  $("brief-course").textContent = co.daily ? `Today's course, ${co.len}m` : `Course ${co.idx + 1}, ${co.tech.toLowerCase()}, ${co.len}m ${raceMode === "duel" ? "for two players" : "against Kip"}`;
  $("brief-title").textContent = co.daily ? "Daily Dash" : co.name;
  Voice.say(co.daily ? "A new course every day. Keep breathing normally." : SAGE_SAY[co.key], true, "sage");
  $("brief-tip").textContent = `Sage: "${co.tip} ${SAGE_LINES[(co.idx + 5) % SAGE_LINES.length]}"`;
  const st = profile.stars[co.key] || [];
  $("brief-ch").innerHTML = raceMode === "duel" ? "" : co.ch.map((c, j) => `<li class="${st[j] ? "got" : ""}"><span>★</span><span>${c.text}</span></li>`).join("");
  const bt = profile.bestTime[co.key], last = profile.last[co.key], ghost = loadGhost(co.key);
  const bench = [];
  if (raceMode !== "duel") {
    if (co.daily) bench.push(`<span>Today's best <b>${profile.daily.date === dayKey() ? profile.daily.best : 0}</b></span>`);
    if (bt) bench.push(`<span>Best time <b>${fmtT(bt)}</b></span>`);
    if (last) bench.push(`<span>Last <b>${last.time ? fmtT(last.time) : last.pct + "%"}</b></span>`);
    if (ghost) bench.push(`<span>A see-through Bodie replays your best run</span>`);
  }
  $("brief-bench").innerHTML = bench.join("");
  $("brief-controls").innerHTML = raceMode === "duel"
    ? "Player 1: <kbd>W</kbd> or <kbd>Space</kbd>, or tap the left half. Player 2: <kbd>↑</kbd> or <kbd>L</kbd>, or tap the right half. Tap to jump. Keep the button pressed for a screen shield. Breathe normally."
    : "<kbd>Space</kbd> <kbd>↑</kbd> <kbd>W</kbd>, click or tap to jump. Keep the button pressed for a screen shield. Release to recharge it. Keep breathing normally." + (co.sigh ? " Double tap for a gust." : "");
  if (state !== "menu") toMenu("ov-brief"); else show("ov-brief");
}
function renderSurfList() {
  $("surf-list").innerHTML = PATTERNS.map((p, i) => `<button class="pick" type="button" data-i="${i}"><span class="t">${p.name}</span><span class="b">${p.desc}</span></button>`).join("");
  $("surf-list").querySelectorAll(".pick").forEach((b) => b.addEventListener("click", () => { Sound.play("click"); surfStart(+b.dataset.i); }));
}
let shopTab = "up";
const UPS = [
  { id: "lungs", name: "Larger shield", desc: (lv) => `+1 second of screen-shield charge in races. Level ${lv}/3.`, cost: (lv) => [40, 90, 160][lv], max: 3 },
  { id: "spring", name: "Spring Roots", desc: () => "Double jump: tap again in the air.", cost: () => 120, max: 1 },
  { id: "magnet", name: "Seed Magnet", desc: () => "Pulls nearby Trail Seeds to Bodie.", cost: () => 80, max: 1 },
  { id: "aura", name: "Calm Aura", desc: () => "Your first Worry Cloud each race can't pop you.", cost: () => 60, max: 1 },
  { id: "sigh", name: "Gust charger", desc: () => "Your gust recharges in 2 seconds instead of 3.", cost: () => 100, max: 1 },
  { id: "charge", name: "Power shield", desc: () => "Each pad tap charges 8% instead of 6%.", cost: () => 90, max: 1 },
];
function renderShop() {
  $("tab-up").setAttribute("aria-selected", String(shopTab === "up")); $("tab-looks").setAttribute("aria-selected", String(shopTab === "looks"));
  const stars = totalStars();
  let html = "";
  if (shopTab === "up") html = UPS.map((it) => { const lv = profile.up[it.id] || 0, maxed = lv >= it.max, cost = maxed ? 0 : it.cost(lv); return `<div class="item${maxed ? " on" : ""}"><span class="nm">${it.name}</span><span class="ds">${it.desc(lv)}</span><button class="btn" type="button" data-up="${it.id}" ${maxed || profile.leaves < cost ? "disabled" : ""}>${maxed ? "Owned" : `<span class="data">${cost}</span> leaves`}</button></div>`; }).join("");
  else {
    const btn = (own, on, cost, need, onTxt, ownTxt, attr) => { const locked = !own && need && stars < need; return `<button class="btn" type="button" ${attr} ${(!own && (profile.leaves < cost || locked)) ? "disabled" : ""}>${on ? onTxt : own ? ownTxt : locked ? `Needs ${need}★` : `<span class="data">${cost}</span> leaves`}</button>`; };
    html = Object.entries(SKINS).map(([k, s]) => { const own = profile.owned.includes(k), on = profile.skin === k; return `<div class="item${on ? " on" : ""}"><span class="nm">${s.name} skin</span><span class="ds">${s.desc}</span>${btn(own, on, s.cost, s.stars, "Wearing", "Wear", `data-skin="${k}"`)}</div>`; }).join("")
      + Object.entries(ACCS).map(([k, a]) => { const own = profile.owned.includes(k), on = profile.acc.includes(k); return `<div class="item${on ? " on" : ""}"><span class="nm">${a.name}</span><span class="ds">${a.desc}</span>${btn(own, on, a.cost, a.stars, "Take off", "Put on", `data-acc="${k}"`)}</div>`; }).join("");
  }
  $("shop-list").innerHTML = html;
  $("shop-list").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.up) { const it = UPS.find((u) => u.id === b.dataset.up), lv = profile.up[it.id] || 0, cost = it.cost(lv); if (lv < it.max && profile.leaves >= cost) { profile.leaves -= cost; profile.up[it.id] = lv + 1; Sound.play("buy"); Voice.say(pickOne(["Good choice!", "Pleasure doing business!", "A fine trade!"]), true, "ember"); } }
    if ((b.dataset.skin || b.dataset.acc) && !b.disabled) Voice.say(pickOne(["Looking sharp, Bodie!", "Oh, that suits you.", "Very dashing!"]), true, "ember");
    if (b.dataset.skin) { const k = b.dataset.skin, s = SKINS[k]; if (!profile.owned.includes(k)) { if (profile.leaves < s.cost || (s.stars && stars < s.stars)) return; profile.leaves -= s.cost; profile.owned.push(k); Sound.play("buy"); } else Sound.play("click"); profile.skin = k; rebuildMenuBodie(); }
    if (b.dataset.acc) { const k = b.dataset.acc, a = ACCS[k]; if (!profile.owned.includes(k)) { if (profile.leaves < a.cost || (a.stars && stars < a.stars)) return; profile.leaves -= a.cost; profile.owned.push(k); profile.acc.push(k); Sound.play("buy"); } else { profile.acc = profile.acc.includes(k) ? profile.acc.filter((x) => x !== k) : profile.acc.concat(k); Sound.play("click"); } rebuildMenuBodie(); }
    save(); renderShop(); refreshWallets();
  }));
}

// ---------------------------------------------------------------- Trail board (shared scores via the artifact's db)
const HALL_TABS = [...COURSES.map((c, i) => ({ name: c.name, field: "b" + i, fmt: (v) => String(v) })), { name: "Daily Dash", field: "ds", daily: true, fmt: (v) => String(v) }];
let DB = null, USER = null, myId = null, hallDocs = [], hallTab = 0, hallErr = "", canWrite = true, hallToken = 0, dbTried = false;
async function initDB() {
  if (window.GroundPreview?.active()) { dbTried = true; renderHall(); return; }
  try {
    const w = window.claude; if (!w || !w.use) { dbTried = true; renderHall(); return; }
    const [db, user] = await Promise.all([w.use("db"), w.use("user")]); DB = db; USER = user;
    if (USER) myId = await USER.id();
    if (USER && USER.can) { const c = await USER.can("data.write"); if (c === false) canWrite = false; }
    if (DB && myId) {
      const snap = await DB.doc("scores/" + myId).get();
      if (snap.exists) {
        const d = snap.data();
        for (let i = 0; i < COURSES.length; i++) { const v = Number(d["b" + i]) || 0; if (v > (profile.best[i] || 0)) profile.best[i] = v; }
        if (d.dd === dayKey() && (profile.daily.date !== dayKey() || Number(d.ds) > profile.daily.best)) profile.daily = { date: dayKey(), best: Number(d.ds) || 0 };
        save(); refreshWallets();
      }
    }
    if (DB) DB.collection("scores").orderBy("total", "desc").limit(300).onSnapshot((s) => { hallDocs = s.docs.map((d) => ({ id: d.id, ...d.data() })); renderHall(); }, (e) => { hallErr = e.code || "unavailable"; renderHall(); });
  } catch (e) { hallErr = "unavailable"; }
  dbTried = true; renderHall();
}
let posting = false, postAgain = false;
async function postScore() {
  if (window.GroundPreview?.active() || !DB || !myId || !canWrite) return;
  if (posting) { postAgain = true; return; }
  posting = true;
  const b = COURSES.map((c, i) => profile.best[i] || 0);
  const doc = { total: b.reduce((a, v) => a + v, 0), wins: profile.wins, dd: profile.daily.date || "", ds: profile.daily.best || 0, at: Date.now() };
  b.forEach((v, i) => (doc["b" + i] = v));
  try { await DB.doc("scores/" + myId).set(doc); } catch (e) { if (e && e.code === "invalid_argument") canWrite = false; }
  posting = false; if (postAgain) { postAgain = false; postScore(); }
}
async function renderHall() {
  $("hall-tabs").innerHTML = HALL_TABS.map((t, i) => `<button class="tab" type="button" role="tab" data-i="${i}" aria-selected="${i === hallTab}">${t.name}</button>`).join("");
  $("hall-tabs").querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => { hallTab = +b.dataset.i; renderHall(); }));
  const list = $("hall-list"), note = $("hall-note"), tab = HALL_TABS[hallTab];
  if (!DB) { list.innerHTML = ""; note.textContent = dbTried ? "The Trail board shows up when you open this page signed in to claude.ai. Your records are still saved in this browser." : "Loading the Hall..."; return; }
  const f = tab.field, rows = hallDocs.filter((d) => Number(d[f]) > 0 && (!tab.daily || d.dd === dayKey())).sort((a, b) => b[f] - a[f]).slice(0, 10);
  note.textContent = hallErr ? "Couldn't load the latest scores. They'll appear when the connection is back." : !canWrite ? "You can view the Hall. Your records stay in this browser because you have view-only access." : rows.length ? (tab.daily ? "Today's course is the same for everyone. Resets at midnight." : "Your best on each board posts here automatically.") : "No scores here yet. Be the first.";
  const token = ++hallToken;
  const profs = USER && rows.length ? await USER.profiles(rows.map((r) => r.id)) : {};
  if (token !== hallToken) return;
  list.innerHTML = "";
  rows.forEach((r, i) => {
    const p = profs[r.id] || {}, row = document.createElement("div"); row.className = "hrow" + (r.id === myId ? " me" : "");
    const rk = document.createElement("span"); rk.className = "rk"; rk.textContent = "#" + (i + 1);
    const im = document.createElement("img"); im.alt = ""; if (p.avatarUrl) im.src = p.avatarUrl;
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = (p.name || "Someone") + (r.id === myId ? " (you)" : "");
    const sc = document.createElement("span"); sc.className = "sc"; sc.textContent = tab.fmt(Number(r[f]));
    row.append(rk, im, nm, sc); list.appendChild(row);
  });
}

// ---------------------------------------------------------------- portraits (rendered once with the main renderer)
const PORTRAIT = {};
function renderPortraits() {
  const ps = new THREE.Scene(); ps.environment = scene.environment; ps.environmentIntensity = .7;
  ps.add(new THREE.HemisphereLight(0xffe2c0, 0x2a1b14, .7)); const kl = new THREE.DirectionalLight(0xffe4c4, 1.8); kl.position.set(3, 5, 6); ps.add(kl); const rl = new THREE.DirectionalLight(0xd4a574, 1.2); rl.position.set(-4, 3, -6); ps.add(rl);
  const pc = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const shots = [
    ["bodie", () => { const b = buildBodie({ sit: true }); b.update(.016, .6, true, null, .6); b.head.rotation.y = -.35; return b.root; }, [-2.6, 2.2, 3.8], [0, 1.15, 0]],
    ["kip", () => { const k = buildKip(); k.update(0, 0, "cruise"); k.root.rotation.y = -.9; return k.root; }, [0, .4, 3.6], [0, -.05, 0]],
    ["sage", () => { const s = buildSage(); s.update(0, 1); return s.root; }, [-.6, 1.2, 3.8], [0, .8, 0]],
    ["ember", () => { const e = buildEmber(); e.update(0, 0); e.root.rotation.y = .5; return e.root; }, [-.7, 1.3, 3.9], [0, .85, 0]],
  ];
  renderer.setPixelRatio(1); renderer.setSize(320, 320, false);
  ps.background = new THREE.Color(0x2a1b14);
  for (const [name, make, pos, look] of shots) {
    const obj = make(); ps.add(obj); pc.position.set(...pos); pc.lookAt(...look);
    renderer.render(ps, pc);
    try { PORTRAIT[name] = canvas.toDataURL("image/png"); } catch (e) {}
    ps.remove(obj); disposeGroup(obj);
  }
  document.querySelectorAll("img[data-portrait]").forEach((im) => { const u = PORTRAIT[im.dataset.portrait]; if (u) im.src = u; });
  resize();
}

// ---------------------------------------------------------------- glow (bloom)
async function loadBloom() {
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import(JSM + "postprocessing/EffectComposer.js/+esm"), import(JSM + "postprocessing/RenderPass.js/+esm"),
      import(JSM + "postprocessing/UnrealBloomPass.js/+esm"), import(JSM + "postprocessing/OutputPass.js/+esm")]);
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(vw, vh), .5, .5, 1.05); composer.addPass(bloomPass); composer.addPass(new OutputPass());
    resize();
  } catch (e) { composer = null; glowOn = false; }
  syncButtons();
}
function setGlow(on, auto) { glowOn = on; if (!auto) { profile.glow = on; save(); } if (on && !composer) loadBloom(); syncButtons(); }
// Motion off (WCAG 2.2.2) stills the menu and result scenes: the idle breathing, the cast's bobbing, the camera's sway,
// fireflies and particles. A run itself always moves; it starts on the player's tap and has its own Pause.
const motionOn = () => (profile.motion === null || profile.motion === undefined ? !reduceMotion : profile.motion);
function syncButtons() {
  $("btn-sound").textContent = profile.sound ? "Sound on" : "Sound off";
  $("btn-voice").textContent = profile.voice ? "Voice on" : "Voice off";
  $("btn-motion").textContent = motionOn() ? "Motion on" : "Motion off";
  $("btn-glow").textContent = glowOn && composer ? "Glow on" : "Glow off";
}

// ---------------------------------------------------------------- finger and keyboard input
const pointers = new Map(), keysDown = new Set();
const KEYS1 = ["Space", "ArrowUp", "KeyW"], DUEL1 = ["Space", "KeyW"], DUEL2 = ["ArrowUp", "KeyL"];
function playerFor(clientX) { if (!G || G.players.length < 2) return 0; const r = stage.getBoundingClientRect(); return clientX - r.left < r.width / 2 ? 0 : 1; }
function keyPlayer(code) { if (!G || G.players.length < 2) return KEYS1.includes(code) ? 0 : -1; if (DUEL1.includes(code)) return 0; if (DUEL2.includes(code)) return 1; return -1; }
function press(i) { if (!G || state !== "play") return; const p = G.players[i]; if (!p) return; if (!p.held) p.edges++; p.held = true; }
function release(i) { if (G?.players[i]) G.players[i].held = false; }
function releaseInputs() {
  G?.players.forEach((p) => p.held = false); if (S) S.pressed = 0;
  menuHold = false; pointers.clear(); keysDown.clear();
}
stage.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, a, input, .panel, .card")) return;
  Sound.unlock(); stage.focus({ preventScroll: true });
  if (state !== "play") return;
  e.preventDefault(); try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  if (mode === "race") { const i = playerFor(e.clientX); pointers.set(e.pointerId, i); press(i); }
  else if (mode === "surf" && S) { pointers.set(e.pointerId, "surf"); S.pressed++; }
});
function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  const i = pointers.get(e.pointerId); pointers.delete(e.pointerId);
  if (i === "surf") { if (S) S.pressed = Math.max(0, S.pressed - 1); }
  else if (![...pointers.values()].includes(i)) release(i);
}
stage.addEventListener("pointerup", endPointer); stage.addEventListener("pointercancel", endPointer); stage.addEventListener("lostpointercapture", endPointer);
window.addEventListener("keydown", (e) => {
  if (e.target.closest?.("button, a, input, textarea, select")) return;
  if (state === "play") {
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); pause(); return; }
    if (mode === "race") { const i = keyPlayer(e.code); if (i >= 0) { e.preventDefault(); if (!e.repeat) press(i); } }
    else if (mode === "surf" && S && KEYS1.includes(e.code)) { e.preventDefault(); if (!e.repeat && !keysDown.has(e.code)) { keysDown.add(e.code); S.pressed++; } }
  } else if (state === "paused" && (e.code === "Escape" || e.code === "KeyP")) resume();
});
window.addEventListener("keyup", (e) => {
  if (mode === "race") { const i = keyPlayer(e.code); if (i >= 0) release(i); }
  if (mode === "surf" && S && keysDown.delete(e.code)) S.pressed = Math.max(0, S.pressed - 1);
});
function pause() {
  if (state !== "play" || (mode === "race" && (!G || G.over))) return;
  releaseInputs(); state = "paused";
  Sound.hold(false); Sound.danger(0); Sound.music(-1); try { speechSynthesis.cancel(); } catch (_) {}
  show("ov-pause");
}
function resume() {
  releaseInputs(); state = "play"; show(null);
  if (mode === "race" && G) Sound.music(G.anyFlow ? 2 : 1, G.co.bpm, G.co.musicKey); else Sound.music(3, 72, 0);
}
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

$("btn-race").addEventListener("click", () => { Sound.play("click"); raceMode = "kip"; menuView = "ov-courses"; renderCourses(); show("ov-courses"); });
$("btn-duel").addEventListener("click", () => { Sound.play("click"); raceMode = "duel"; menuView = "ov-courses"; renderCourses(); show("ov-courses"); });
$("btn-daily").addEventListener("click", () => { Sound.play("click"); raceMode = "kip"; openBrief(dailyCourse()); });
$("btn-surf").addEventListener("click", () => { Sound.play("click"); menuView = "ov-surf"; renderSurfList(); show("ov-surf"); });
$("btn-courses-back").addEventListener("click", () => { Sound.play("click"); menuView = "title"; show("ov-title"); });
$("btn-shop").addEventListener("click", () => { Sound.play("click"); menuView = "ov-shop"; renderShop(); refreshWallets(); show("ov-shop"); Voice.say("Welcome to the Root Market! Have a look around.", true, "ember"); });
// Meet the cast: the camera visits each character while they say hello.
const CAST_ORDER = ["bodie", "kip", "sage", "ember"];
let castI = 0, castT = 0;
function openCast(i = 0) { castI = i; menuView = "ov-cast"; show("ov-cast"); castStep(); }
function castStep() {
  const k = CAST_ORDER[castI], c = CAST[k];
  $("cast-img").src = PORTRAIT[k] || ""; $("cast-img").alt = c.name;
  $("cast-role").textContent = c.role; $("cast-name").textContent = c.name;
  $("cast-line").textContent = `"${c.line}"`; $("cast-fact").textContent = c.fact;
  $("btn-cast-next").textContent = castI < CAST_ORDER.length - 1 ? "Next: " + CAST[CAST_ORDER[castI + 1]].name.split(" ")[0] : "Let's play";
  $("cast-dots").innerHTML = CAST_ORDER.map((_, j) => `<span class="${j === castI ? "on" : ""}"></span>`).join("");
  castT = 0; castSpeak();
}
function castSpeak() { const k = CAST_ORDER[castI]; castT = 0; if (k === "kip") Sound.play("caw"); if (k === "bodie" && menuBodie) menuBodie.press(); Voice.say(CAST[k].line, true, k, true); }
$("btn-cast").addEventListener("click", () => { Sound.play("click"); openCast(0); });
$("btn-cast-next").addEventListener("click", () => { Sound.play("click"); if (castI < CAST_ORDER.length - 1) { castI++; castStep(); } else { try { speechSynthesis.cancel(); } catch (e) {} menuView = "title"; show("ov-title"); } });
$("btn-cast-replay").addEventListener("click", castSpeak);
$("btn-cast-skip").addEventListener("click", () => { try { speechSynthesis.cancel(); } catch (e) {} Sound.play("click"); menuView = "title"; show("ov-title"); });
document.querySelectorAll(".hear").forEach((b) => b.addEventListener("click", () => {
  Sound.unlock(); const k = b.dataset.who, ok = Voice.say(CAST[k].line, true, k, true); if (k === "kip") Sound.play("caw");
  const im = b.parentElement.querySelector("img"); im.classList.remove("talk"); void im.offsetWidth; im.classList.add("talk");
  if (!ok) b.textContent = "This browser has no voices";
}));
$("btn-hall").addEventListener("click", () => { Sound.play("click"); menuView = "ov-hall"; renderHall(); show("ov-hall"); });
$("btn-help").addEventListener("click", () => { Sound.play("click"); show("ov-help"); });
$("btn-help-back").addEventListener("click", () => { Sound.play("click"); show("ov-title"); });
$("tab-up").addEventListener("click", () => { shopTab = "up"; renderShop(); });
$("tab-looks").addEventListener("click", () => { shopTab = "looks"; renderShop(); });
$("btn-surf-back").addEventListener("click", () => { Sound.play("click"); menuView = "title"; show("ov-title"); });
$("btn-shop-back").addEventListener("click", () => { Sound.play("click"); if (state === "result") { show("ov-result"); return; } menuView = "title"; show("ov-title"); refreshWallets(); });
$("btn-hall-back").addEventListener("click", () => { Sound.play("click"); menuView = "title"; show("ov-title"); });
$("btn-go").addEventListener("click", () => startRace(briefCourse));
$("btn-brief-back").addEventListener("click", () => { Sound.play("click"); if (briefCourse && briefCourse.daily) { toMenu("title"); return; } toMenu("ov-courses"); renderCourses(); });
$("btn-res-shop").addEventListener("click", () => { Sound.play("click"); renderShop(); refreshWallets(); show("ov-shop"); });
$("btn-res-menu").addEventListener("click", () => { Sound.play("click"); toMenu("title"); });
$("btn-pause").addEventListener("click", (e) => { e.stopPropagation(); pause(); });
$("btn-resume").addEventListener("click", resume);
$("btn-quit").addEventListener("click", () => toMenu("title"));
$("btn-sound").addEventListener("click", () => { profile.sound = !profile.sound; save(); Sound.unlock(); Sound.setEnabled(profile.sound); if (!profile.sound) try { speechSynthesis.cancel(); } catch (e) {} syncButtons(); });
$("btn-voice").addEventListener("click", () => { profile.voice = !profile.voice; save(); syncButtons(); if (profile.voice) Voice.say("Use your finger or keyboard. Breathe normally.", true); });
$("btn-motion").addEventListener("click", () => { profile.motion = !motionOn(); save(); syncButtons(); });
$("btn-glow").addEventListener("click", () => setGlow(!(glowOn && composer)));
$("btn-full").addEventListener("click", async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.requestFullscreen(); } catch (e) { $("btn-full").hidden = true; } });

// ---------------------------------------------------------------- menu scene + main loop
function castCamera(dt, t) {
  const k = CAST_ORDER[castI], obj = { bodie: menuBodie, kip: menuKip, sage: menuSage, ember: menuEmber }[k].root;
  const f = new THREE.Vector3(); obj.getWorldPosition(f); f.y += k === "kip" ? 0 : k === "bodie" ? 1.2 : .9;
  const phone = aspect < .9, d = phone ? 13 : 9.5, a = -.22 + Math.sin(t * .2) * .05;
  // Pan so the character sits right of the card on wide screens and above it on phones.
  const pan = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(phone ? 0 : -d * TANH * aspect * .3);
  pan.y = ((phone ? .2 : .46) * vh - vh / 2) * (2 * d * TANH / vh);
  const look = f.clone().add(pan);
  tPos.set(f.x + Math.sin(a) * d, f.y + .5, f.z + Math.cos(a) * d).add(pan);
  camPos.lerp(tPos, Math.min(1, dt * 3)); camLook.lerp(look, Math.min(1, dt * 3));
  camera.position.copy(camPos); camera.lookAt(camLook);
  key.position.set(f.x + 4, 9, f.z + 8); key.target.position.copy(f); rim.position.set(f.x - 4, 5, f.z - 8); rim.target.position.copy(f);
}
function menuCamera(dt, t) {
  if (menuView === "ov-cast") return castCamera(dt, t);
  const a = -.42 + Math.sin(t * .12) * .12, d = aspect < .9 ? 13 : 9.6;
  const look = new THREE.Vector3(0, 1.15, 0);
  if (aspect >= .9) { const right = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)); look.addScaledVector(right, -d * TANH * aspect * .36); }
  else look.y -= 1.75;
  tPos.set(Math.sin(a) * d + look.x, 2.4, Math.cos(a) * d + look.z);
  camPos.lerp(tPos, Math.min(1, dt * 2.5)); camLook.lerp(look, Math.min(1, dt * 2.5));
  camera.position.copy(camPos); camera.lookAt(camLook);
  key.position.set(4, 9, 8); key.target.position.set(0, 1, 0); rim.position.set(-4, 5, -8); rim.target.position.set(0, 1, 0);
  fireflies.material.uniforms.uCam.value = 0;
}
let last = performance.now(), clock = 0;
function updateMenu(dt, mdt) {
  menuIdleT += dt;
  const cast = menuView === "ov-cast", focus = cast ? CAST_ORDER[castI] : null;
  if (cast) castT += dt;
  let target;
  if (focus === "bodie") target = castT < 3.4 ? 1 : .35;
  else if (menuHold) target = 1;
  else if (menuIdleT > 2.5 && mdt) { const c = clock % 12; target = c < 4 ? c / 4 : c < 6 ? 1 : c < 10 ? 1 - (c - 6) / 4 : 0; }
  else target = Math.max(0, menuFill - dt * .5);
  menuFill += (target - menuFill) * Math.min(1, dt * (menuHold ? 1.6 : 3));
  const holdPhase = menuFill > .96 || (menuIdleT > 2.5 && mdt && (clock % 12) >= 4 && (clock % 12) < 6);
  if (menuBodie) { menuBodie.update(dt, menuFill, reduceMotion || !mdt, holdPhase ? "hold" : null, menuFill, menuHold && menuFill > .9 ? .5 : 0); menuBodie.root.rotation.y = .15; menuBodie.head.rotation.y = -.2 + Math.sin(clock * .5) * .1; }
  // In Meet the cast everyone is on stage at once; elsewhere each one turns up where they belong.
  menuBodie.root.visible = !cast || focus === "bodie";
  menuKip.root.visible = cast ? focus === "kip" : ["title", "ov-courses", "ov-help", "ov-brief"].includes(menuView);
  menuKip.update(mdt, clock, focus === "kip" && castT < 3 ? "sprint" : "cruise");
  menuKip.root.position.set(cast ? 1.7 : 2.3, (cast ? 2.5 : 2.1) + Math.sin(clock * 2.6) * .25 + (focus === "kip" ? Math.sin(clock * 9) * .08 : 0), cast ? -1.5 : -1.2);
  menuSage.root.visible = cast ? focus === "sage" : menuView === "ov-hall" || menuView === "ov-surf";
  menuSage.root.position.set(cast ? -2.4 : 2.1, 0, cast ? -.9 : -.6); menuSage.root.rotation.y = cast ? .5 : -.5; menuSage.update(mdt, clock);
  menuEmber.root.visible = cast ? focus === "ember" : menuView === "ov-shop";
  menuEmber.root.position.set(cast ? 2.5 : 2.0, 0, cast ? .5 : .3); menuEmber.update(mdt, focus === "ember" ? clock * 2.5 : clock);
  menuCamera(dt, clock);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const mdt = state === "play" || motionOn() ? dt : 0; // scenery time: frozen while Motion is off, outside a run
  clock += mdt;
  if (state === "play") { if (mode === "race" && G) updateRace(dt); else if (mode === "surf" && S) updateSurf(dt); }
  else if (state === "result") {
    if (mode === "race" && G) { G.endT += mdt; G.players.forEach((P) => figPose(P, false, mdt)); if (G.kip) updateKip(mdt); raceCamera(mdt); }
    else if (mode === "surf" && S) surfIdle(mdt);
  } else if (state === "menu") updateMenu(dt, mdt);
  updateParticles(mdt); updateConfetti(mdt); updateSky(clock);
  fireflies.material.uniforms.uTime.value = clock;
  if (glowOn && composer) composer.render(); else renderer.render(scene, camera);
}

// ---------------------------------------------------------------- boot
async function boot() {
  if (!HAS_HALL) $("btn-hall").remove(); else $("btn-help").style.gridColumn = "1 / -1"; // keep the menu grid even
  resize(); new ResizeObserver(resize).observe(stage);
  try { ({ mergeVertices } = await import(JSM + "utils/BufferGeometryUtils.js/+esm")); } catch (e) { mergeVertices = null; }
  try {
    const { RoomEnvironment } = await import(JSM + "environments/RoomEnvironment.js/+esm");
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose();
  } catch (e) {}
  setBackdrop(COURSES[0], 200); buildMenu();
  renderPortraits();
  syncButtons(); refreshWallets(); renderHall();
  Sound.music(0, 128, 0);
  if (glowOn) loadBloom();
  requestAnimationFrame(frame);
  initDB();
}
boot();
</script>
