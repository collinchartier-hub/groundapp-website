// The Deep is a short, deterministic solo outing. The player chooses a branch in each
// room; forward movement is automatic, while steering determines which finds they reach.
const ROOMS = [
  {
    name: 'The Mouth',
    left: { label: 'Glowmoss Gallery', finds: ['Glowmoss', 'Moth-wing glass', 'A small green star'] },
    right: { label: 'Whispering Arch', finds: ['Echo stone', 'Silver lichen', 'The arch chime'] },
  },
  {
    name: 'The Hollow',
    left: { label: 'Pearl Shelf', finds: ['Cave pearl', 'Shell of light', 'Pale river glass'] },
    right: { label: 'Stonebell Passage', finds: ['Stonebell', 'Copper thread', 'A ringing shard'] },
  },
  {
    name: 'The Garden',
    left: { label: 'Starfern Hollow', finds: ['Starfern', 'Fallen constellation', 'Fern-spun bead'] },
    right: { label: 'Amber Vein', finds: ['Amber ember', 'Golden seam', 'A warm crystal'] },
  },
];

const START_Y = 230;
const END_Y = 1410;
const CHECKPOINT_Y = 650;
const HAZARD_Y = 945;
const FORWARD_SPEED = 104;
const STEER_SPEED = 420;
const LANE_HALF_WIDTH = 164;
// The threshold find touches the incoming lantern; optional finds reward steering.
const FIND_Y = [280, 760, 1195];
const FIND_OFFSET = [0, 120, -116];
const HAZARD_RADIUS = 42;
const LANTERN_RADIUS = 24;
const FIND_RADIUS = 55;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const laneCenter = (side) => side === 'left' ? 300 : 700;

function updateHazard(state) {
  const branchPhase = state.route === 'right' ? Math.PI / 2 : 0;
  state.hazard.x = laneCenter(state.route) + 108 * Math.sin(state.roomTime * (1.8 + state.room * 0.35) + branchPhase);
}

export function createExploreState() {
  return {
    phase: 'choice', room: 1, route: null,
    lantern: { x: 500, y: START_Y, targetX: 500 },
    checkpointY: START_Y, immunity: 0, roomTime: 0,
    hazard: { x: 300, y: HAZARD_Y },
    collectibles: [], discoveries: [], discoveryTones: [], display: null, displayTone: null,
    recoveries: 0,
  };
}

export function chooseExplorePath(state, side) {
  if (state.phase !== 'choice' || (side !== 'left' && side !== 'right')) return false;
  const branch = ROOMS[state.room - 1][side];
  const center = laneCenter(side);
  state.route = side;
  state.phase = 'travel';
  state.lantern.x = center;
  state.lantern.y = START_Y;
  state.lantern.targetX = center;
  state.checkpointY = START_Y;
  state.immunity = 0;
  state.roomTime = 0;
  const sign = side === 'left' ? 1 : -1;
  const tone = state.room === 1 ? (side === 'left' ? 'sage' : 'bone')
    : state.room === 2 ? (side === 'left' ? 'bone' : 'clay')
      : (side === 'left' ? 'sage' : 'amber');
  state.collectibles = branch.finds.map((name, i) => ({
    name, tone, x: center + FIND_OFFSET[i] * sign * (0.8 + state.room * 0.1), y: FIND_Y[i], collected: false,
  }));
  updateHazard(state);
  return true;
}

export function steerExplore(state, x) {
  if (state.phase !== 'travel' || !Number.isFinite(x)) return;
  const center = laneCenter(state.route);
  state.lantern.targetX = clamp(x, center - LANE_HALF_WIDTH, center + LANE_HALF_WIDTH);
}

function advanceExplore(state, dt) {
  const lantern = state.lantern;
  const center = laneCenter(state.route);
  const destination = clamp(state.lantern.targetX, center - LANE_HALF_WIDTH, center + LANE_HALF_WIDTH);
  const dx = destination - lantern.x;
  lantern.x += clamp(dx, -STEER_SPEED * dt, STEER_SPEED * dt);
  lantern.y = Math.min(END_Y, lantern.y + FORWARD_SPEED * dt);
  state.roomTime += dt;
  state.immunity = Math.max(0, state.immunity - dt);
  updateHazard(state);

  for (const find of state.collectibles) {
    if (!find.collected && Math.hypot(find.x - lantern.x, find.y - lantern.y) <= FIND_RADIUS) {
      find.collected = true;
      state.discoveries.push(find.name);
      state.discoveryTones.push(find.tone);
    }
  }

  if (lantern.y >= CHECKPOINT_Y) state.checkpointY = CHECKPOINT_Y;
  if (state.immunity === 0 && Math.hypot(state.hazard.x - lantern.x, HAZARD_Y - lantern.y) < HAZARD_RADIUS + LANTERN_RADIUS) {
    lantern.y = state.checkpointY;
    // This grace carries the lantern safely past the obstacle even if no steering is used.
    state.immunity = 3.6;
    state.recoveries++;
  }

  if (lantern.y >= END_Y) {
    state.collectibles = [];
    if (state.room < ROOMS.length) {
      state.room++;
      state.route = null;
      state.phase = 'choice';
      lantern.x = 500;
      lantern.y = START_Y;
      lantern.targetX = 500;
    } else {
      state.phase = 'result';
      state.route = null;
      lantern.x = 500;
      lantern.y = 1110;
    }
  }
}

export function stepExplore(state, dt) {
  if (state.phase !== 'travel' || !Number.isFinite(dt) || dt <= 0) return;
  // A bounded step catches contact with small finds and moving hazards even after a slow frame.
  let remaining = dt;
  while (remaining > 0 && state.phase === 'travel') {
    const step = Math.min(remaining, 1 / 30);
    advanceExplore(state, step);
    remaining -= step;
  }
}

export function selectExploreDisplay(state, index) {
  if (state.phase !== 'result' || !Number.isInteger(index) || index < 0 || index >= state.discoveries.length) return false;
  state.display = state.discoveries[index];
  state.displayTone = state.discoveryTones[index];
  return true;
}

export function describeExplore(state) {
  if (state.phase === 'result') return {
    phase: 'result', title: 'Home clearing',
    detail: state.display ? `${state.display} is displayed in the clearing.` : 'Choose a discovery to display in the clearing.',
    room: state.room, discoveries: [...state.discoveries], choices: [], display: state.display,
  };
  const room = ROOMS[state.room - 1];
  if (state.phase === 'choice') return {
    phase: 'choice', title: `${room.name} · Room ${state.room} of ${ROOMS.length}`,
    detail: 'Choose a passage. Steer toward discoveries; the lantern travels on its own.',
    room: state.room, discoveries: [...state.discoveries],
    choices: [{ side: 'left', label: room.left.label }, { side: 'right', label: room.right.label }], display: null,
  };
  return {
    phase: 'travel', title: room[state.route].label,
    detail: state.immunity > 0 ? 'Back at the ledge. Your light can pass the shadow while its ring is dim.'
      : 'Guide the light toward discoveries and around the moving shadow. The ledge catches you if it touches the lantern.',
    room: state.room, discoveries: [...state.discoveries], choices: [], display: null,
  };
}

export function createExploreView({ THREE, group, palette }, state) {
  const root = new THREE.Group();
  group.add(root);
  const geometries = [new THREE.PlaneGeometry(1, 1), new THREE.CircleGeometry(1, 32), new THREE.RingGeometry(0.77, 1, 40)];
  const [plane, circle, ring] = geometries;
  const materials = [];
  function paint(color, opacity = 1) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1 });
    materials.push(material);
    return material;
  }
  const bed = paint(palette.bed);
  const clay = paint(palette.clay);
  const dark = paint(palette.bg);
  const amber = paint(palette.amber);
  const gold = paint(palette.gold);
  const sage = paint(palette.sage);
  const bone = paint(palette.bone);
  const muted = paint(palette.muted, 0.62);
  const dim = paint(palette.muted, 0.22);
  const glow = paint(palette.amber, 0.28);
  const hazardInk = paint(palette.bg, 0.9);
  const checkpointInk = paint(palette.sage, 0.5);

  function mesh(geometry, material, x, y, z, sx, sy = sx, parent = root) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.scale.set(sx, sy, 1);
    parent.add(object);
    return object;
  }
  mesh(plane, bed, 500, 800, 0, 1000, 1600);
  // Two passages remain visible at the ledge; the unchosen one darkens in travel.
  const pathSurfaces = [];
  const paths = [300, 700].map((center) => {
    const path = new THREE.Group();
    root.add(path);
    pathSurfaces.push(mesh(plane, clay, center, 820, 0.3, 350, 1230, path));
    mesh(plane, dark, center, 820, 0.4, 325, 1200, path);
    for (const edge of [-1, 1]) {
      mesh(plane, gold, center + edge * 180, 820, 1, 7, 1240, path);
      for (let y = 275; y <= 1375; y += 145) {
        const rock = mesh(circle, clay, center + edge * 215, y + ((y / 145) % 3) * 12, 1.2, 28, 40, path);
        rock.rotation.z = edge * 0.3;
      }
    }
    for (let y = 330; y <= 1320; y += 165) {
      mesh(circle, dim, center, y, 0.8, 7, 7, path);
    }
    return path;
  });
  const approach = mesh(plane, clay, 500, 181, 0.8, 520, 130);
  const leftGate = mesh(ring, sage, 300, 213, 2, 65);
  const rightGate = mesh(ring, amber, 700, 213, 2, 65);
  const marker = mesh(ring, checkpointInk, 500, CHECKPOINT_Y, 1.8, 80, 46);
  const crossing = mesh(plane, checkpointInk, 500, CHECKPOINT_Y, 1.7, 335, 5);
  const exit = mesh(ring, gold, 500, END_Y, 1.8, 98, 28);
  const exitLight = mesh(circle, glow, 500, END_Y, 1.7, 105, 28);

  const finds = Array.from({ length: 3 }, () => {
    const light = new THREE.Group();
    root.add(light);
    mesh(circle, glow, 0, 0, 3, 56, 56, light);
    mesh(ring, gold, 0, 0, 3.1, 27, 27, light);
    mesh(circle, bone, 0, 0, 3.2, 13, 13, light);
    return light;
  });
  const shadow = new THREE.Group();
  root.add(shadow);
  const shadowRing = mesh(ring, clay, 0, 0, 3, 71, 71, shadow);
  mesh(circle, hazardInk, 0, 0, 3.1, HAZARD_RADIUS, HAZARD_RADIUS, shadow);
  mesh(circle, muted, 0, -12, 3.2, 13, 9, shadow);
  mesh(circle, muted, -17, 12, 3.2, 6, 6, shadow);
  mesh(circle, muted, 17, 12, 3.2, 6, 6, shadow);
  const lantern = new THREE.Group();
  root.add(lantern);
  const lanternHalo = mesh(circle, glow, 0, 0, 5, 72, 72, lantern);
  mesh(ring, gold, 0, 0, 5.1, 32, 32, lantern);
  mesh(circle, bone, 0, 0, 5.2, 23, 23, lantern);
  mesh(circle, amber, 0, 0, 5.3, 12, 12, lantern);
  mesh(circle, dark, 0, 14, 5.4, 4, 4, lantern);
  const clearing = new THREE.Group();
  root.add(clearing);
  mesh(circle, clay, 500, 795, 1, 420, 420, clearing);
  mesh(circle, bed, 500, 795, 1.2, 385, 385, clearing);
  mesh(ring, sage, 500, 795, 1.5, 375, 375, clearing);
  mesh(circle, amber, 500, 810, 2, 110, 110, clearing);
  mesh(ring, bone, 500, 810, 2.2, 82, 82, clearing);
  mesh(circle, dark, 500, 810, 2.4, 43, 43, clearing);
  const displayed = new THREE.Group();
  clearing.add(displayed);
  mesh(ring, gold, 500, 810, 2.6, 53, 53, displayed);
  const displayCore = mesh(circle, sage, 500, 810, 2.7, 26, 26, displayed);
  const displayMaterials = { sage, amber, gold, bone, clay };
  const displayRays = Array.from({ length: 7 }, (_, i) => {
    const angle = i * Math.PI * 2 / 7;
    const ray = mesh(plane, gold, 500 + Math.cos(angle) * 69, 810 + Math.sin(angle) * 69, 2.6, 8, 24, displayed);
    ray.rotation.z = -angle;
    return ray;
  });
  const homeLights = Array.from({ length: 9 }, (_, i) => {
    const angle = i * Math.PI * 2 / 9 - Math.PI / 2;
    return mesh(circle, gold, 500 + Math.cos(angle) * 300, 795 + Math.sin(angle) * 300, 2, 12);
  });

  function render(reducedMotion = false) {
    const result = state.phase === 'result';
    clearing.visible = result;
    const selectedIndex = result ? state.discoveries.indexOf(state.display) : -1;
    displayed.visible = selectedIndex >= 0;
    displayCore.material = displayMaterials[state.displayTone] || gold;
    for (let i = 0; i < homeLights.length; i++) {
      homeLights[i].visible = result && i < state.discoveries.length;
      homeLights[i].scale.setScalar(i === selectedIndex ? 24 : 12);
    }
    for (let i = 0; i < displayRays.length; i++) displayRays[i].visible = i < 3 + selectedIndex % 5;
    for (let i = 0; i < paths.length; i++) {
      paths[i].visible = !result && (state.phase === 'choice' || (i === 0 ? state.route === 'left' : state.route === 'right'));
      pathSurfaces[i].visible = state.phase === 'choice' || (i === 0 ? state.route === 'left' : state.route === 'right');
    }
    approach.visible = state.phase === 'choice';
    leftGate.visible = state.phase === 'choice';
    rightGate.visible = state.phase === 'choice';
    const travelling = state.phase === 'travel';
    marker.visible = travelling;
    crossing.visible = travelling;
    exit.visible = travelling;
    exitLight.visible = travelling;
    if (travelling) {
      const center = laneCenter(state.route);
      marker.position.x = center;
      crossing.position.x = center;
      exit.position.x = center;
      exitLight.position.x = center;
    }
    for (let i = 0; i < finds.length; i++) {
      const find = state.collectibles[i];
      finds[i].visible = travelling && !!find && !find.collected;
      if (find && finds[i].visible) {
        finds[i].position.set(find.x, find.y, 0);
        finds[i].scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(state.roomTime * 3 + i * 2) * 0.08);
      }
    }
    shadow.visible = travelling;
    shadowRing.material = state.immunity > 0 ? dim : clay;
    if (travelling) shadow.position.set(state.hazard.x, HAZARD_Y, 0);
    lantern.position.set(state.lantern.x, state.lantern.y, 0);
    lanternHalo.scale.setScalar(reducedMotion ? 64 : 64 + Math.sin(state.roomTime * 3) * 7);
    lantern.visible = true;
  }

  render(true);
  return {
    render,
    dispose() {
      group.remove(root);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
