// Seed Wind's model is deliberately independent of the browser and Three.js.
// Positions are in the shared 1000 x 1600 tabletop coordinate system (y down).
const LEFT = 115;
const RIGHT = 885;
const TOP = 185;
const BOTTOM = 1415;
const GOAL_LEFT = 300;
const GOAL_RIGHT = 700;
const SEED_RADIUS = 23;
const STONE_RADIUS = 45;
const STONES = [{ x: 335, y: 570 }, { x: 665, y: 1030 }];
const MATCH_TIME = 90;
const WIN_SCORE = 5;
const RECHARGE = 1.7;
const GUST = 610;
const MAX_SPEED = 820;
const DRAG = 0.34;
const SLICE = 1 / 120;
const SERVE_DELAY = 1.2;
const TRAIL_INTERVAL = 0.075;

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

function resetTrail(state) {
  state.trailCount = 0;
  state.trailHead = 0;
  state.trailClock = 0;
  state.trailX.fill(state.seed.x);
  state.trailY.fill(state.seed.y);
}

function finish(state) {
  state.phase = 'result';
  state.winner = state.scores[0] === state.scores[1]
    ? null : (state.scores[0] > state.scores[1] ? 0 : 1);
  state.seed.vx = 0;
  state.seed.vy = 0;
}

function score(state, player) {
  state.scores[player] += 1;
  state.lastScorer = player;
  state.seed.vx = 0;
  state.seed.vy = 0;
  if (state.scores[player] >= WIN_SCORE || state.elapsed >= MATCH_TIME) {
    finish(state);
  } else {
    state.phase = 'serve';
    resetTrail(state);
    state.serveRemaining = SERVE_DELAY;
    state.cooldowns[0] = 0;
    state.cooldowns[1] = 0;
  }
}

export function createSeedWindState(options = {}) {
  const assist = options.assist || [false, false];
  const state = {
    seed: { x: 500, y: 800, vx: 0, vy: 0 },
    scores: [0, 0], cooldowns: [0, 0], aims: [500, 500],
    assist: [Boolean(assist[0]), Boolean(assist[1])],
    elapsed: 0, phase: 'serve', winner: null,
    serveRemaining: SERVE_DELAY, lastScorer: null,
    // One fixed-size recent trail and one gust flash per player; no frame allocations.
    trailX: new Float32Array(9), trailY: new Float32Array(9),
    trailHead: 0, trailCount: 0, trailClock: 0,
    gusts: [{ age: 0, x: 500, y: 800, dx: 0, dy: -1 },
      { age: 0, x: 500, y: 800, dx: 0, dy: 1 }],
  };
  resetTrail(state);
  return state;
}

export function aimSeedWind(state, player, x) {
  if ((player !== 0 && player !== 1) || !Number.isFinite(x)) return;
  state.aims[player] = clamp(x, LEFT + SEED_RADIUS, RIGHT - SEED_RADIUS);
}

function gustLean(state, player) {
  const lean = (state.aims[player] - 500) * 1.05 + state.seed.vx * 0.13;
  return state.assist[player] && Math.abs(lean) < 190 ? 0 : lean;
}

export function fireSeedWind(state, player) {
  if ((player !== 0 && player !== 1) || state.phase !== 'play' || state.cooldowns[player] > 0) return false;

  const seed = state.seed;
  const horizontal = gustLean(state, player);
  const vertical = player === 0 ? -690 : 690;
  const inverse = 1 / Math.hypot(horizontal, vertical);
  const dx = horizontal * inverse;
  const dy = vertical * inverse;

  // Aiming changes direction, never shot strength. Optional help widens the
  // straight-ahead aiming window without changing either player's impulse.
  seed.vx += GUST * dx;
  seed.vy += GUST * dy;
  const speed = Math.hypot(seed.vx, seed.vy);
  if (speed > MAX_SPEED) {
    seed.vx *= MAX_SPEED / speed;
    seed.vy *= MAX_SPEED / speed;
  }
  state.cooldowns[player] = RECHARGE;
  const gust = state.gusts[player];
  gust.age = 0.28;
  gust.x = seed.x;
  gust.y = seed.y;
  gust.dx = dx;
  gust.dy = dy;
  return true;
}

function moveSeed(state, dt) {
  const seed = state.seed;
  seed.x += seed.vx * dt;
  seed.y += seed.vy * dt;
  const decay = Math.exp(-DRAG * dt);
  seed.vx *= decay;
  seed.vy *= decay;

  if (seed.x < LEFT + SEED_RADIUS) {
    seed.x = LEFT + SEED_RADIUS;
    seed.vx = Math.abs(seed.vx) * 0.78;
  } else if (seed.x > RIGHT - SEED_RADIUS) {
    seed.x = RIGHT - SEED_RADIUS;
    seed.vx = -Math.abs(seed.vx) * 0.78;
  }

  // Goals are openings in the end rails; elsewhere the seed banks off them.
  if (seed.y <= TOP + SEED_RADIUS) {
    if (seed.x >= GOAL_LEFT + SEED_RADIUS && seed.x <= GOAL_RIGHT - SEED_RADIUS) {
      score(state, 0);
      return;
    }
    seed.y = TOP + SEED_RADIUS;
    seed.vy = Math.abs(seed.vy) * 0.78;
  } else if (seed.y >= BOTTOM - SEED_RADIUS) {
    if (seed.x >= GOAL_LEFT + SEED_RADIUS && seed.x <= GOAL_RIGHT - SEED_RADIUS) {
      score(state, 1);
      return;
    }
    seed.y = BOTTOM - SEED_RADIUS;
    seed.vy = -Math.abs(seed.vy) * 0.78;
  }

  const contact = STONE_RADIUS + SEED_RADIUS;
  for (let i = 0; i < STONES.length; i += 1) {
    const stone = STONES[i];
    let nx = seed.x - stone.x;
    let ny = seed.y - stone.y;
    const distanceSquared = nx * nx + ny * ny;
    if (distanceSquared >= contact * contact) continue;
    const distance = Math.sqrt(distanceSquared);
    if (distance > 0.00001) {
      nx /= distance;
      ny /= distance;
    } else {
      nx = 0;
      ny = seed.vy >= 0 ? 1 : -1;
    }
    seed.x = stone.x + nx * contact;
    seed.y = stone.y + ny * contact;
    const toward = seed.vx * nx + seed.vy * ny;
    if (toward < 0) {
      seed.vx -= 1.86 * toward * nx;
      seed.vy -= 1.86 * toward * ny;
    }
  }

  state.trailClock += dt;
  if (state.trailClock >= TRAIL_INTERVAL) {
    state.trailClock -= TRAIL_INTERVAL;
    state.trailHead = (state.trailHead + 1) % state.trailX.length;
    state.trailX[state.trailHead] = seed.x;
    state.trailY[state.trailHead] = seed.y;
    state.trailCount = Math.min(state.trailCount + 1, state.trailX.length);
  }
}

export function stepSeedWind(state, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || state.phase === 'result') return;
  // A match is at most 90 seconds; subdivisions prevent tunnelling through
  // the stones and goal rails even when the host delivers a late frame.
  let remaining = Math.min(dt, MATCH_TIME - state.elapsed);
  while (remaining > 0 && state.phase !== 'result') {
    const slice = Math.min(remaining, SLICE);
    remaining -= slice;
    state.elapsed = Math.min(MATCH_TIME, state.elapsed + slice);
    state.cooldowns[0] = Math.max(0, state.cooldowns[0] - slice);
    state.cooldowns[1] = Math.max(0, state.cooldowns[1] - slice);
    state.gusts[0].age = Math.max(0, state.gusts[0].age - slice);
    state.gusts[1].age = Math.max(0, state.gusts[1].age - slice);

    if (state.phase === 'serve') {
      state.serveRemaining -= slice;
      if (state.serveRemaining <= 0) {
        state.seed.x = 500;
        state.seed.y = 800;
        state.seed.vx = 0;
        state.seed.vy = 0;
        resetTrail(state);
        state.serveRemaining = 0;
        state.phase = 'play';
      }
    } else {
      moveSeed(state, slice);
    }
    if (state.elapsed >= MATCH_TIME && state.phase !== 'result') finish(state);
  }
}

export function describeSeedWind(state) {
  let title;
  let detail;
  if (state.phase === 'result') {
    title = state.winner === null ? 'A draw!' : (state.winner === 0 ? 'Gold wins!' : 'Sage wins!');
    detail = state.winner === null ? 'Even at the final gust. Play a rematch?' : 'Another round? Swap ends or play again.';
  } else if (state.phase === 'serve') {
    title = state.lastScorer === null ? 'Ready to gust' : state.lastScorer === 0 ? 'Gold scores' : 'Sage scores';
    detail = state.lastScorer === null
      ? 'Aim in public. The seed starts in the center; each gust has one fixed strength.'
      : 'The seed returns to center. Aim for the opposite goal.';
  } else {
    title = 'Seed Wind';
    detail = 'Gold sends the seed up. Sage sends it down. Aim, gust, and counter.';
  }
  return {
    phase: state.phase, title, detail,
    scores: [state.scores[0], state.scores[1]],
    remaining: Math.max(0, MATCH_TIME - state.elapsed),
    cooldowns: [state.cooldowns[0], state.cooldowns[1]],
    winner: state.winner,
  };
}

export function createSeedWindView({ THREE, group, palette }, state) {
  const root = new THREE.Group();
  group.add(root);
  const box = new THREE.PlaneGeometry(1, 1);
  const circle = new THREE.CircleGeometry(1, 24);
  const triangle = new THREE.CircleGeometry(1, 3);
  const ring = new THREE.RingGeometry(0.78, 1, 32);
  const geometries = [box, circle, triangle, ring];
  const materials = [];
  function material(color, opacity = 1) {
    const value = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1 });
    materials.push(value);
    return value;
  }
  const bed = material(palette.bed);
  const clay = material(palette.clay);
  const border = material(palette.amber);
  const subdued = material(palette.muted, 0.37);
  const goalGold = material(palette.gold, 0.62);
  const goalSage = material(palette.sage, 0.8);
  const gold = material(palette.gold);
  const sage = material(palette.sage);
  const stoneMaterial = material(palette.clay);
  const stoneHighlight = material(palette.amber, 0.55);
  const seedShadow = material(palette.bg, 0.55);
  const seedMaterial = material(palette.bone);
  const seedCore = material(palette.amber);
  const aimMaterials = [material(palette.gold, 0.52), material(palette.sage, 0.68)];
  const pulseMaterials = [material(palette.gold, 0.32), material(palette.sage, 0.36)];
  const trailMaterials = Array.from({ length: state.trailX.length }, (_, i) => material(palette.bone, 0.06 + i * 0.025));

  function shape(geometry, finish, x, y, z, width, height = width) {
    const mesh = new THREE.Mesh(geometry, finish);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, 1);
    root.add(mesh);
    return mesh;
  }
  function rectangle(finish, x, y, z, width, height) {
    return shape(box, finish, x, y, z, width, height);
  }
  function line(mesh, x1, y1, x2, y2, thickness) {
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, mesh.position.z);
    mesh.scale.set(Math.hypot(x2 - x1, y2 - y1), thickness, 1);
    mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  }

  rectangle(bed, 500, 800, 0.01, 790, 1260);
  rectangle(clay, 500, 800, 0.02, 770, 1235);
  rectangle(subdued, 500, 800, 0.025, 760, 2);
  shape(ring, subdued, 500, 800, 0.03, 82);
  shape(circle, subdued, 500, 800, 0.031, 6);
  rectangle(border, LEFT, 800, 0.07, 8, BOTTOM - TOP);
  rectangle(border, RIGHT, 800, 0.07, 8, BOTTOM - TOP);
  for (const y of [TOP, BOTTOM]) {
    rectangle(border, (LEFT + GOAL_LEFT) / 2, y, 0.07, GOAL_LEFT - LEFT, 8);
    rectangle(border, (GOAL_RIGHT + RIGHT) / 2, y, 0.07, RIGHT - GOAL_RIGHT, 8);
  }
  // The scoring strips sit outside the open rail, coloured for the owner of
  // that end: the *other* player scores by crossing them.
  rectangle(goalSage, 500, TOP - 16, 0.04, GOAL_RIGHT - GOAL_LEFT, 24);
  rectangle(goalGold, 500, BOTTOM + 16, 0.04, GOAL_RIGHT - GOAL_LEFT, 24);
  for (const x of [GOAL_LEFT, GOAL_RIGHT]) {
    rectangle(goalSage, x, TOP - 22, 0.07, 9, 55);
    rectangle(goalGold, x, BOTTOM + 22, 0.07, 9, 55);
  }
  // Mirrored, off-center bank stones leave a wide straight scoring lane.
  for (const stone of STONES) {
    shape(circle, seedShadow, stone.x + 5, stone.y + 7, 0.055, STONE_RADIUS + 6);
    shape(circle, stoneMaterial, stone.x, stone.y, 0.08, STONE_RADIUS);
    shape(ring, stoneHighlight, stone.x, stone.y, 0.085, STONE_RADIUS - 5);
    shape(circle, stoneHighlight, stone.x - 12, stone.y - 11, 0.09, 7);
  }
  const aimRails = [[], []];
  const arrows = [];
  const aimKnobs = [];
  const cooldownFill = [];
  const gustLines = [];
  const gustWaves = [];
  for (let player = 0; player < 2; player += 1) {
    const ownY = player === 0 ? 1350 : 250;
    const color = player === 0 ? gold : sage;
    const guide = aimMaterials[player];
    const railY = player === 0 ? 1375 : 225;
    rectangle(subdued, 500, railY, 0.09, 685, 4);
    aimKnobs.push(shape(circle, color, 500, railY, 0.12, 14));
    const fill = rectangle(color, LEFT + 16, player === 0 ? 1400 : 200, 0.1, 158, 8);
    cooldownFill.push(fill);
    for (let part = 0; part < 3; part += 1) {
      aimRails[player].push(rectangle(guide, 500, 800, 0.1, 10, 3));
    }
    arrows.push(shape(triangle, color, 500, 800, 0.13, 13));
    gustLines.push(rectangle(pulseMaterials[player], 500, ownY, 0.14, 10, 8));
    gustWaves.push(shape(ring, pulseMaterials[player], 500, 800, 0.15, 26));
  }
  const trails = trailMaterials.map((finish) => shape(circle, finish, 500, 800, 0.11, 13));
  const shadow = shape(circle, seedShadow, 507, 808, 0.17, 32);
  const seedHalo = shape(ring, stoneHighlight, 500, 800, 0.18, 36);
  const seed = shape(circle, seedMaterial, 500, 800, 0.19, SEED_RADIUS);
  const seedLight = shape(circle, seedCore, 493, 792, 0.2, 6);

  return {
    render(reducedMotion) {
      const current = state.seed;
      const playing = state.phase === 'play';
      shadow.position.set(current.x + 7, current.y + 8, 0.17);
      seed.position.set(current.x, current.y, 0.19);
      seedLight.position.set(current.x - 7, current.y - 8, 0.2);
      seedHalo.position.set(current.x, current.y, 0.18);
      seedHalo.scale.setScalar(reducedMotion ? 35 : 35 + 3 * Math.sin(state.elapsed * 5));

      for (let i = 0; i < trails.length; i += 1) {
        const dot = trails[i];
        dot.visible = playing && i < state.trailCount;
        if (dot.visible) {
          const index = (state.trailHead - i + state.trailX.length) % state.trailX.length;
          dot.position.set(state.trailX[index], state.trailY[index], 0.11);
          dot.scale.setScalar(15 - i * 0.9);
        }
      }
      for (let player = 0; player < 2; player += 1) {
        const ownY = player === 0 ? 1350 : 250;
        const horizontal = gustLean(state, player);
        const vertical = player === 0 ? -690 : 690;
        const inv = 1 / Math.hypot(horizontal, vertical);
        const dx = horizontal * inv;
        const dy = vertical * inv;
        const startX = clamp(current.x - dx * (current.y - ownY) / dy, LEFT + 28, RIGHT - 28);
        const knob = aimKnobs[player];
        knob.position.x = state.aims[player];
        const fill = cooldownFill[player];
        const fraction = clamp(1 - state.cooldowns[player] / RECHARGE, 0, 1);
        fill.scale.x = 158 * fraction;
        fill.position.x = LEFT + 16 + 79 * fraction;
        const aim = aimRails[player];
        const lineX = current.x - startX;
        const lineY = current.y - ownY;
        for (let part = 0; part < 3; part += 1) {
          const from = 0.2 + part * 0.26;
          const to = from + 0.15;
          line(aim[part], startX + lineX * from, ownY + lineY * from,
            startX + lineX * to, ownY + lineY * to, 3);
          aim[part].visible = playing;
        }
        const arrow = arrows[player];
        arrow.visible = playing;
        arrow.position.set(current.x + dx * 80, current.y + dy * 80, 0.13);
        arrow.rotation.z = Math.atan2(dy, dx);
        const blast = state.gusts[player];
        const active = blast.age > 0;
        const gust = gustLines[player];
        gust.visible = active;
        const wave = gustWaves[player];
        wave.visible = active;
        if (active) {
          const length = 110 + (0.28 - blast.age) * 420;
          line(gust, blast.x - blast.dx * length, blast.y - blast.dy * length,
            blast.x + blast.dx * 38, blast.y + blast.dy * 38,
            state.assist[player] ? 52 : 34);
          wave.position.set(blast.x, blast.y, 0.15);
          wave.scale.setScalar(reducedMotion ? 33 : 28 + (0.28 - blast.age) * 155);
        }
      }
    },
    dispose() {
      group.remove(root);
      for (const geometry of geometries) geometry.dispose();
      for (const finish of materials) finish.dispose();
    },
  };
}
