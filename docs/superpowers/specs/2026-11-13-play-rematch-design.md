# Ground play: rematch prototypes

User approved the competitive feeling, “one more rematch,” and asked to execute the proposed next steps. This implements Seed Wind plus one solo exploration outing. Existing /play and its breathhold mode remain untouched. New route: /play-next. No production merge or live deployment authorized.

## Direction contract

THESIS: two people on one phone make tactical decisions, score, then immediately choose a rematch. The solo alternative is discovery, not physiological endurance.
OWN-WORLD: inherit Ground's existing night palette and self-hosted Ground Font Type/Source Serif 4. Warm clay arena, gold versus sage player markers, seed/light objects. No new identity or marketing redesign.
STORY: select Seed Wind or The Deep, learn controls, play a complete round/outing, see actual results, rematch/replay or return. Normal breathing throughout. No sensing, prescribed respiratory timing, accounts, attribution scripts or medical claims.
FIRST VIEWPORT: full-height game surface with a small fixed header, large 10:16 playfield, two distinct score labels, concise instructions and native buttons. Top player faces the opposite end of the phone during the duel. No website navbar over the playfield. Menu is an unboxed two-row choice, not a card dashboard.
FORM: plain JavaScript ES modules built by existing game/build.py into versioned site assets. Existing Three.js pinned CDN import, rendered with an orthographic camera for the tabletop arena. No engine migration, packages or backend.
SIGNATURE: a seed visibly responds to a fixed-strength gust, and a scored goal settles into a rematch-ready result. Reduced motion removes decorative bobbing/pulses, never game information.

## Core loops and encounter plans

Seed Wind: aim a gust to move a seed over the opposite goal while your opponent can counter and a visible recharge limits firing. Goal gives a point and a short serve reset. First to five or the leader at 90 seconds wins; a tied clock ends in a draw. Result offers immediate rematch and swap seats. Sustained pressing cannot increase power. One mirrored arena contains fixed bank-shot stones and a readable center serve. The opening serve provides a ready delay, not an automatic scored shot. Either player can cancel a canvas drag. Per-player aim help straightens a near-central aim without increasing gust strength. Aiming is public on one shared screen.

The Deep: choose one of two paths, steer a lantern through a short cavern encounter, collect discoveries, then make another route choice. Three rooms lead to a home clearing where you choose which discovery to display. Hazards move visibly and return the lantern to a nearby checkpoint rather than erase progress. Each path has an accessible discovery; press duration has no influence on rarity or rewards. No real breath holds or timers. Mouse/touch target steering, keyboard left/right and native route buttons. All paths finish a whole outing, with a replay action.

## File ownership and API

Source directory: game/src/next/. Parent owns index.html, play.css, world.js, app.js, build integration, docs and tests. Independent implementations own seed-wind.js and explore.js respectively. Do not edit generated site files directly.

world.js exports createWorld(canvas), returning {THREE, group, palette, render(), resize(), dispose()}. A single orthographic view uses world coordinates x=0..1000 and y=0..1600, with positive y down and z toward camera. The HTML canvas itself has aspect ratio 10/16 and is fitted to available height; pointer coordinates map exactly to those world coordinates. DOM owns all text and buttons. Geometry is in the xy plane, z>=0. Shapes use MeshBasicMaterial and no lights. Palette: bg=0x1a110e, bed=0x231916, clay=0x8b5e3c, gold=0xc4935a, amber=0xd4a574, bone=0xe8ddd0, muted=0xa89585, sage=0x7a8b6f.

Both modules have NO top-level browser/Three dependency; model functions must import in Node. Three is passed only to the view constructor. No global listeners or requestAnimationFrame in modules. Parent owns time, pause, resize, input capture and disposal. No per-frame text DOM writes if unchanged.

### seed-wind.js exports

- createSeedWindState(options={assist:[false,false]}): mutable model.
- aimSeedWind(state, player, x): update aim from world x clamped to arena.
- fireSeedWind(state, player): fixed-strength action; returns whether accepted; respects visible cooldown; has no duration parameter.
- stepSeedWind(state, dt): advance active match; no wall-clock reads; bounded/substepped collision.
- describeSeedWind(state): {phase, title, detail, scores:[number,number], remaining:number, cooldowns:[number,number], winner:number|null}; phase is 'play'|'serve'|'result'. winner 0/1 or null for draw.
- createSeedWindView({THREE,group,palette}, state): {render(reducedMotion), dispose()}.
- State has seed:{x,y,vx,vy}, scores:[0,0], cooldowns:[0,0], aims:[500,500], elapsed, phase and winner. Extra internal fields allowed. Player 0 controls bottom and scores at top; player 1 controls top and scores at bottom. Landscape turns the duel to Gold left and Sage right. Keep goals wide/readable. Aim x sets directional lead toward the seed; no drag-length power. Parent maps own-end pointer down/move x to aim and pointerup to fire; pointercancel or lifting off canvas does not fire. Keyboard A/D+Space for Gold and Left/Right+Enter for Sage, including when a Gust button has focus. Native Gust buttons call fire; native range controls set aim. Serve counts down from an explicit initial ready delay, not breathing cues. Update cooldown/phase truthfully.

### explore.js exports

- createExploreState(): mutable model.
- chooseExplorePath(state, side): side 'left'|'right', only valid in phase 'choice'.
- steerExplore(state, x): world x target (100..900), used during travel.
- stepExplore(state, dt): advance deterministic travel; no time-to-win score.
- selectExploreDisplay(state, index): choose discovered home display in final phase.
- describeExplore(state): {phase,title,detail,room:number,discoveries:[string],choices:[{side,label}],display:string|null}; phase is 'choice'|'travel'|'result'.
- createExploreView({THREE,group,palette},state): {render(reducedMotion),dispose()}.
- Initial phase choice with two named paths. Three real rooms; each travel lasts roughly 10-14 seconds of simulation but human sees progress not stopwatch. Target steering changes lane and collectible contact. Hazards return to room checkpoint, not add respiratory instructions. Guarantee room can be completed without holding a button; don't require pressing while travelling. Route and steering determine discoveries; final phase can display a selected discovery. No fake randomness or health values.

## Verification acceptance

Orchestrator runs one consolidated build, narrow deterministic model tests for uncertain scoring/collision/outing-completion edges, and real browser scenarios after all source changes land. Phone portrait/landscape and desktop must show usable controls. Exercise simultaneous touch, score/serve/win/rematch, pause/restart, pointer cancellation, both paths through a complete outing, sound off and reduced motion. No debug state mutation to pretend a game was won. Programmatic model scenarios are separate from actual browser proof. Report human rematch preference and real-device checks as untested unless observed.
