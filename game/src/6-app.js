
// ---------------------------------------------------------------- menus
const OVERLAYS = ["ov-title", "ov-courses", "ov-brief", "ov-deep", "ov-surf", "ov-result", "ov-shop", "ov-hall", "ov-help", "ov-pause", "ov-cast"];
const SAGE_SAY = { hollow: "When the cloud comes, hold your breath.", lake: "Hold your breath to dive under the logs.", swamp: "Double tap to sigh the storms away.", peaks: "Tap fast on the pads, then hold through the thin air.", temple: "Ride the updraft, then glide through the rings." };
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
function show(id) {
  OVERLAYS.forEach((o) => ($(o).hidden = o !== id));
  $("btn-pause").hidden = !(state === "play" && id === null && mode !== "deep");
  $("hud-btns").hidden = !!id && $(id).classList.contains("center"); // cards get the whole stage
}
function walletHTML() { return `<span>Gold Leaves <b>${profile.leaves}</b></span><span>Wins <b>${profile.wins}</b></span><span>Stars <b>${totalStars()}/15</b></span>`; }
function refreshWallets() { ["wallet-title", "wallet-res", "wallet-shop"].forEach((id) => ($(id).innerHTML = walletHTML())); }
function toMenu(view) {
  clearWorld(); D = null; S = null; mode = "race";
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
  Voice.say(co.daily ? "A new course every day. Breathe well." : SAGE_SAY[co.key], true, "sage");
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
    ? "Player 1: <kbd>W</kbd> or <kbd>Space</kbd>, or tap the left half. Player 2: <kbd>↑</kbd> or <kbd>L</kbd>, or tap the right half. Tap to jump, hold to hold your breath."
    : "<kbd>Space</kbd> <kbd>↑</kbd> <kbd>W</kbd>, click or tap to jump. Keep holding to hold your breath. Let go to breathe out." + (co.sigh ? " Double tap to sigh." : "");
  if (state !== "menu") toMenu("ov-brief"); else show("ov-brief");
}
let deepSub = "static";
function openDeep(sub) {
  if (sub) deepSub = sub;
  if (state !== "menu") toMenu("ov-deep");
  menuView = "ov-deep";
  $("tab-static").setAttribute("aria-selected", String(deepSub === "static")); $("tab-dash").setAttribute("aria-selected", String(deepSub === "dash"));
  $("deep-sub-desc").textContent = deepSub === "static"
    ? "Static: pure breath hold. Bodie glides through the deep for as long as you hold. Your score is time."
    : "Dash: keep your thumb down to hold your breath, and tap with a second finger to swim up past jellyfish, coral and urchins. On a keyboard, hold Space and tap ↑. Your score is distance.";
  const rec = profile.deep[deepSub], f = deepSub === "static" ? (e) => fmtT(e.t) : (e) => e.d + "m";
  $("deep-bench").innerHTML = rec.best ? `<span>Best <b>${f(rec.best)}</b></span><span>Last <b>${f(rec.last)}</b></span><span>Dives <b>${rec.hist.length}</b></span>` : `<span>No dives yet. Your first one sets the flag to beat.</span>`;
  const ch = deepChart(deepSub); $("deep-chart").setAttribute("viewBox", "0 0 560 120"); $("deep-chart").innerHTML = ch.svg;
  show("ov-deep");
}
function renderSurfList() {
  $("surf-list").innerHTML = PATTERNS.map((p, i) => { const r = profile.surf[p.key]; return `<button class="pick" type="button" data-i="${i}"><span class="n"><span>${p.goal}</span>${r ? starStr([r.stars > 0, r.stars > 1, r.stars > 2]) : ""}</span><span class="t">${p.name}</span><span class="b">${p.desc}${r ? ` Best ${r.best}%, last ${r.last}%.` : ""}</span></button>`; }).join("");
  $("surf-list").querySelectorAll(".pick").forEach((b) => b.addEventListener("click", () => { Sound.play("click"); surfStart(+b.dataset.i); }));
}
let shopTab = "up";
const UPS = [
  { id: "lungs", name: "Bigger Lungs", desc: (lv) => `+1 second of breath to hold in races. Level ${lv}/3.`, cost: (lv) => [40, 90, 160][lv], max: 3 },
  { id: "spring", name: "Spring Roots", desc: () => "Double jump: tap again in the air.", cost: () => 120, max: 1 },
  { id: "magnet", name: "Seed Magnet", desc: () => "Pulls nearby Breath Seeds to Bodie.", cost: () => 80, max: 1 },
  { id: "aura", name: "Calm Aura", desc: () => "Your first Worry Cloud each race can't pop you.", cost: () => 60, max: 1 },
  { id: "sigh", name: "Sigh Charger", desc: () => "Your sigh recharges in 2 seconds instead of 3.", cost: () => 100, max: 1 },
  { id: "charge", name: "Power Lungs", desc: () => "Each power breath charges 8% instead of 6%.", cost: () => 90, max: 1 },
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

// ---------------------------------------------------------------- Hall of Breath (shared scores via the artifact's db)
const HALL_TABS = [...COURSES.map((c, i) => ({ name: c.name, field: "b" + i, fmt: (v) => String(v) })), { name: "Daily Dash", field: "ds", daily: true, fmt: (v) => String(v) }, { name: "Big Hold", field: "hold", fmt: (v) => fmtT(v) }, { name: "Hold Dash", field: "hdash", fmt: (v) => v + "m" }];
let DB = null, USER = null, myId = null, hallDocs = [], hallTab = 0, hallErr = "", canWrite = true, hallToken = 0, dbTried = false;
async function initDB() {
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
        const hold = Number(d.hold) || 0; if (hold && (!profile.deep.static.best || profile.deep.static.best.t < hold)) profile.deep.static.best = { t: hold, d: Math.round(hold * STATIC_SPEED), at: 0, bonks: 0 };
        const hd = Number(d.hdash) || 0; if (hd && (!profile.deep.dash.best || profile.deep.dash.best.d < hd)) profile.deep.dash.best = { t: 0, d: hd, at: 0, bonks: 0 };
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
  if (!DB || !myId || !canWrite) return;
  if (posting) { postAgain = true; return; }
  posting = true;
  const b = COURSES.map((c, i) => profile.best[i] || 0);
  const doc = { total: b.reduce((a, v) => a + v, 0), wins: profile.wins, hold: profile.deep.static.best ? profile.deep.static.best.t : 0, hdash: profile.deep.dash.best ? profile.deep.dash.best.d : 0, dd: profile.daily.date || "", ds: profile.daily.best || 0, at: Date.now() };
  b.forEach((v, i) => (doc["b" + i] = v));
  try { await DB.doc("scores/" + myId).set(doc); } catch (e) { if (e && e.code === "invalid_argument") canWrite = false; }
  posting = false; if (postAgain) { postAgain = false; postScore(); }
}
async function renderHall() {
  $("hall-tabs").innerHTML = HALL_TABS.map((t, i) => `<button class="tab" type="button" role="tab" data-i="${i}" aria-selected="${i === hallTab}">${t.name}</button>`).join("");
  $("hall-tabs").querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => { hallTab = +b.dataset.i; renderHall(); }));
  const list = $("hall-list"), note = $("hall-note"), tab = HALL_TABS[hallTab];
  if (!DB) { list.innerHTML = ""; note.textContent = dbTried ? "The Hall of Breath shows up when you open this page signed in to claude.ai. Your records are still saved in this browser." : "Loading the Hall..."; return; }
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
function syncButtons() {
  $("btn-sound").textContent = profile.sound ? "Sound on" : "Sound off";
  $("btn-voice").textContent = profile.voice ? "Voice on" : "Voice off";
  $("btn-glow").textContent = glowOn && composer ? "Glow on" : "Glow off";
}

// ---------------------------------------------------------------- input
const pointers = new Map();
function playerFor(clientX) { if (!G || G.players.length < 2) return 0; const r = stage.getBoundingClientRect(); return clientX - r.left < r.width / 2 ? 0 : 1; }
function press(i) { if (!G || state !== "play") return; const P = G.players[i]; if (!P) return; if (!P.held) P.edges++; P.held = true; }
function release(i) { if (!G) return; const P = G.players[i]; if (P) P.held = false; }
stage.addEventListener("pointerdown", (e) => {
  Sound.unlock();
  if (e.target.closest("button, a, input, .panel, .card")) return;
  try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  if (state === "play") {
    e.preventDefault();
    if (mode === "race") { const i = playerFor(e.clientX); pointers.set(e.pointerId, i); press(i); }
    else if (mode === "deep") { pointers.set(e.pointerId, "deep"); if (D && D.st === "surface") { if (D.endT > .8) showDeepResult(); return; } deepAnchorDown(e.pointerId); }
    else if (mode === "surf") { pointers.set(e.pointerId, "surf"); S.pressed++; }
  } else if (state === "menu") { menuHold = true; menuIdleT = 0; pointers.set(e.pointerId, -1); if (menuBodie) menuBodie.press(); Sound.play("inhale"); }
});
function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  const i = pointers.get(e.pointerId); pointers.delete(e.pointerId);
  if (i === -1) { if (menuHold) Sound.play("exhale"); menuHold = false; }
  else if (i === "deep") deepAnchorUp(e.pointerId);
  else if (i === "surf") { if (S) S.pressed = Math.max(0, S.pressed - 1); }
  else if (![...pointers.values()].includes(i)) release(i);
}
stage.addEventListener("pointerup", endPointer); stage.addEventListener("pointercancel", endPointer);
document.addEventListener("pointerdown", () => Sound.unlock(), { capture: true });
const KEYS1 = ["Space", "ArrowUp", "KeyW"], DUEL1 = ["Space", "KeyW"], DUEL2 = ["ArrowUp", "KeyL"];
function keyPlayer(code) { if (!G || G.players.length < 2) return KEYS1.includes(code) ? 0 : -1; if (DUEL1.includes(code)) return 0; if (DUEL2.includes(code)) return 1; return -1; }
const keysDown = new Set();
window.addEventListener("keydown", (e) => {
  Sound.unlock();
  const onButton = e.target && e.target.closest && e.target.closest("button");
  if (state === "play") {
    if (mode === "race") { const i = keyPlayer(e.code); if (i >= 0) { e.preventDefault(); if (!e.repeat) press(i); return; } }
    else if (mode === "deep" && D) {
      if (KEYS1.includes(e.code) || e.code === "KeyJ") {
        e.preventDefault(); if (e.repeat) return;
        if (D.st === "surface") { if (D.endT > .8) showDeepResult(); return; }
        if (e.code === "Space" || D.anchorId === null) { keysDown.add(e.code); deepAnchorDown("key:" + e.code); }
        else deepStroke();
        return;
      }
      if (e.code === "Escape" && D.st === "ready") { toMenu("title"); return; }
    } else if (mode === "surf" && S && KEYS1.includes(e.code)) { e.preventDefault(); if (!e.repeat && !keysDown.has(e.code)) { keysDown.add(e.code); S.pressed++; } return; }
    if ((e.code === "Escape" || e.code === "KeyP") && mode !== "deep") pause();
  } else if (state === "paused" && (e.code === "Escape" || e.code === "KeyP")) resume();
  else if (state === "menu" && e.code === "Space" && !onButton) { e.preventDefault(); if (!menuHold) { menuHold = true; menuIdleT = 0; Sound.play("inhale"); } }
});
window.addEventListener("keyup", (e) => {
  if (state === "play" && mode === "race") { const i = keyPlayer(e.code); if (i >= 0) release(i); }
  if (mode === "deep" && D && keysDown.has(e.code)) { keysDown.delete(e.code); deepAnchorUp("key:" + e.code); }
  if (mode === "surf" && S && keysDown.has(e.code)) { keysDown.delete(e.code); S.pressed = Math.max(0, S.pressed - 1); }
  if (state === "menu" && e.code === "Space") { if (menuHold) Sound.play("exhale"); menuHold = false; }
});
window.addEventListener("blur", () => {
  if (G) G.players.forEach((P) => (P.held = false)); menuHold = false; if (S) S.pressed = 0;
  keysDown.clear(); pointers.clear();
  if (D && D.st === "hold") { D.anchorId = null; D.graceUntil = performance.now(); }
});
function pause() {
  if (state !== "play" || mode === "deep") return;
  if (mode === "race" && (!G || G.over)) return;
  state = "paused"; if (G) G.players.forEach((P) => (P.held = false)); if (S) S.pressed = 0; keysDown.clear();
  Sound.hold(false); Sound.danger(0); Sound.music(-1); try { speechSynthesis.cancel(); } catch (e) {} show("ov-pause");
}
function resume() { state = "play"; show(null); if (mode === "race" && G) Sound.music(G.anyFlow ? 2 : 1, G.co.bpm, G.co.key); else Sound.music(3, 72, 0); }
document.addEventListener("visibilitychange", () => { if (!document.hidden) return; if (mode === "deep" && D && D.st === "hold") { D.anchorId = null; D.graceUntil = performance.now(); } else pause(); });

$("btn-race").addEventListener("click", () => { Sound.play("click"); raceMode = "kip"; menuView = "ov-courses"; renderCourses(); show("ov-courses"); });
$("btn-duel").addEventListener("click", () => { Sound.play("click"); raceMode = "duel"; menuView = "ov-courses"; renderCourses(); show("ov-courses"); });
$("btn-daily").addEventListener("click", () => { Sound.play("click"); raceMode = "kip"; openBrief(dailyCourse()); });
$("btn-deep").addEventListener("click", () => { Sound.play("click"); openDeep(); });
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
$("tab-static").addEventListener("click", () => openDeep("static"));
$("tab-dash").addEventListener("click", () => openDeep("dash"));
$("btn-deep-go").addEventListener("click", () => deepStart(deepSub));
$("btn-deep-back").addEventListener("click", () => { Sound.play("click"); menuView = "title"; show("ov-title"); });
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
$("btn-voice").addEventListener("click", () => { profile.voice = !profile.voice; save(); syncButtons(); if (profile.voice) Voice.say("Hold your breath!", true); });
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
function updateMenu(dt) {
  menuIdleT += dt;
  const cast = menuView === "ov-cast", focus = cast ? CAST_ORDER[castI] : null;
  if (cast) castT += dt;
  let target;
  if (focus === "bodie") target = castT < 3.4 ? 1 : .35;
  else if (menuHold) target = 1;
  else if (menuIdleT > 2.5) { const c = clock % 12; target = c < 4 ? c / 4 : c < 6 ? 1 : c < 10 ? 1 - (c - 6) / 4 : 0; }
  else target = Math.max(0, menuFill - dt * .5);
  menuFill += (target - menuFill) * Math.min(1, dt * (menuHold ? 1.6 : 3));
  const holdPhase = menuFill > .96 || (menuIdleT > 2.5 && (clock % 12) >= 4 && (clock % 12) < 6);
  if (menuBodie) { menuBodie.update(dt, menuFill, reduceMotion, holdPhase ? "hold" : null, menuFill, menuHold && menuFill > .9 ? .5 : 0); menuBodie.root.rotation.y = .15; menuBodie.head.rotation.y = -.2 + Math.sin(clock * .5) * .1; }
  // In Meet the cast everyone is on stage at once; elsewhere each one turns up where they belong.
  menuBodie.root.visible = !cast || focus === "bodie";
  menuKip.root.visible = cast ? focus === "kip" : ["title", "ov-courses", "ov-help", "ov-brief"].includes(menuView);
  menuKip.update(dt, clock, focus === "kip" && castT < 3 ? "sprint" : "cruise");
  menuKip.root.position.set(cast ? 1.7 : 2.3, (cast ? 2.5 : 2.1) + Math.sin(clock * 2.6) * .25 + (focus === "kip" ? Math.sin(clock * 9) * .08 : 0), cast ? -1.5 : -1.2);
  menuSage.root.visible = cast ? focus === "sage" : menuView === "ov-hall" || menuView === "ov-surf" || menuView === "ov-deep";
  menuSage.root.position.set(cast ? -2.4 : 2.1, 0, cast ? -.9 : -.6); menuSage.root.rotation.y = cast ? .5 : -.5; menuSage.update(dt, clock);
  menuEmber.root.visible = cast ? focus === "ember" : menuView === "ov-shop";
  menuEmber.root.position.set(cast ? 2.5 : 2.0, 0, cast ? .5 : .3); menuEmber.update(dt, focus === "ember" ? clock * 2.5 : clock);
  menuCamera(dt, clock);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
  if (state === "play") { if (mode === "race" && G) updateRace(dt); else if (mode === "deep" && D) updateDeep(dt); else if (mode === "surf" && S) updateSurf(dt); }
  else if (state === "result") {
    if (mode === "race" && G) { G.endT += dt; G.players.forEach((P) => figPose(P, false, dt)); if (G.kip) updateKip(dt); raceCamera(dt); }
    else if (mode === "deep" && D) deepIdle(dt);
    else if (mode === "surf" && S) surfIdle(dt);
  } else if (state === "menu") updateMenu(dt);
  updateParticles(dt); updateConfetti(dt); updateSky(clock);
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
