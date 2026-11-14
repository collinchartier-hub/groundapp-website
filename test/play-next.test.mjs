import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedWindState, aimSeedWind, fireSeedWind, stepSeedWind, describeSeedWind } from '../game/src/next/seed-wind.js';
import { createExploreState, chooseExplorePath, stepExplore, steerExplore, describeExplore, selectExploreDisplay } from '../game/src/next/explore.js';

function readyMatch() {
  const state = createSeedWindState();
  for (let i = 0; i < 600 && describeSeedWind(state).phase === 'serve'; i++) stepSeedWind(state, 1 / 120);
  assert.equal(describeSeedWind(state).phase, 'play');
  return state;
}

test('a gust is unavailable until recharge, and a new match does not inherit a score', () => {
  const state = readyMatch();
  aimSeedWind(state, 0, 500);
  assert.equal(fireSeedWind(state, 0), true);
  assert.equal(fireSeedWind(state, 0), false);
  assert.ok(describeSeedWind(state).cooldowns[0] > 0);
  for (let i = 0; i < 600 && (state.cooldowns[0] > 0 || state.phase === 'serve'); i++) stepSeedWind(state, 1 / 120);
  assert.equal(describeSeedWind(state).phase, 'play');
  assert.equal(fireSeedWind(state, 0), true);
  state.scores[0] = 4;
  const fresh = describeSeedWind(createSeedWindState());
  assert.deepEqual(fresh.scores, [0, 0]);
});

test('crossing the opposite goal awards one point, not repeated points during serve', () => {
  const state = readyMatch();
  state.seed.x = 500;
  state.seed.y = 1;
  state.seed.vx = 0;
  state.seed.vy = -300;
  for (let i = 0; i < 120 && describeSeedWind(state).scores[0] === 0; i++) stepSeedWind(state, 1 / 120);
  assert.equal(describeSeedWind(state).scores[0], 1);
  for (let i = 0; i < 30; i++) stepSeedWind(state, 1 / 120);
  assert.deepEqual(describeSeedWind(state).scores, [1, 0]);
});

test('a fifth goal ends the match and ignores subsequent shots', () => {
  const state = readyMatch();
  state.scores[0] = 4;
  state.seed.x = 500;
  state.seed.y = 1;
  state.seed.vx = 0;
  state.seed.vy = -300;
  for (let i = 0; i < 120 && describeSeedWind(state).phase !== 'result'; i++) stepSeedWind(state, 1 / 120);
  const result = describeSeedWind(state);
  assert.equal(result.phase, 'result');
  assert.equal(result.winner, 0);
  assert.equal(fireSeedWind(state, 1), false);
});

for (const side of ['left', 'right']) {
  test(`three ${side} routes finish a real outing and expose a selectable discovery`, () => {
    const state = createExploreState();
    for (let room = 0; room < 3; room++) {
      assert.equal(describeExplore(state).phase, 'choice');
      chooseExplorePath(state, side);
      assert.equal(describeExplore(state).phase, 'travel');
      for (let i = 0; i < 120 * 90 && describeExplore(state).phase === 'travel'; i++) {
        steerExplore(state, side === 'left' ? 250 : 750);
        stepExplore(state, 1 / 120);
      }
    }
    const result = describeExplore(state);
    assert.equal(result.phase, 'result');
    assert.ok(result.discoveries.length > 0);
    selectExploreDisplay(state, 0);
    assert.equal(describeExplore(state).display, result.discoveries[0]);
  });
}

test('aim and optional help do not secretly change gust impulse', () => {
  const impulses = [];
  for (const help of [false, true]) {
    for (const x of [140, 500, 860]) {
      const state = createSeedWindState({ assist: [help, false] });
      stepSeedWind(state, 1.3);
      aimSeedWind(state, 0, x);
      assert.equal(fireSeedWind(state, 0), true);
      impulses.push(Math.hypot(state.seed.vx, state.seed.vy));
    }
  }
  for (const impulse of impulses) assert.ok(Math.abs(impulse - impulses[0]) < 1e-9);
});

test('steering reports the reachable target within the chosen passage', () => {
  const state = createExploreState();
  chooseExplorePath(state, 'left');
  steerExplore(state, 900);
  assert.equal(state.lantern.targetX, 464);
  steerExplore(state, 100);
  assert.equal(state.lantern.targetX, 136);
});

test('a tied timed match ends rather than waiting for an unearned winner', () => {
  const state = createSeedWindState();
  stepSeedWind(state, 90);
  const result = describeSeedWind(state);
  assert.equal(result.phase, 'result');
  assert.equal(result.winner, null);
  assert.deepEqual(result.scores, [0, 0]);
});
