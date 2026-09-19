'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const engine = require('../mode-two-engine-v21.js');

const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
const seed = () => engine.decorateTrial({
  directionResolution: 4,
  premises: [
    { subject: 'A', relation: 'N', object: 'B' },
    { subject: 'B', relation: 'N', object: 'C' }
  ],
  conclusion: { subject: 'A', relation: 'N', object: 'C' }
});

async function fixture(t) {
  const dom = new JSDOM(source('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''), {
    runScripts: 'outside-only', url: 'https://mode-two.test/'
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  await new Promise(resolve => setImmediate(resolve));
  let clock = 0;
  let sequence = 0;
  const timers = new Map();
  window.setTimeout = (callback, delay = 0) => {
    const id = ++sequence;
    timers.set(id, { at: clock + delay, callback });
    return id;
  };
  window.clearTimeout = id => timers.delete(id);
  Object.defineProperty(window.performance, 'now', { value: () => clock });
  function advance(milliseconds) {
    const end = clock + milliseconds;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]);
      clock = next[1].at;
      next[1].callback();
    }
    clock = end;
  }
  const speech = [];
  let pauses = 0;
  let resumes = 0;
  let stops = 0;
  let backgroundStops = 0;
  let backgroundResumes = 0;
  const app = {
    running: false, paused: false, awaiting: false, sessionToken: 42,
    current: null, trials: [], n: 1, directionResolution: 4,
    score: { hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0, timeouts: 0, shown: 0, scored: 0 },
    rts: [],
    settings: () => ({ n: 1, directionResolution: 4, matchProbability: 0.5, haptic: false }),
    renderTrial: () => '', matchSignature: () => '',
    makeTrial: () => null, nextTrial: () => null, answer: () => null,
    start() { this.running = true; },
    stop() { stops += 1; this.running = false; this.paused = false; this.awaiting = false; this.sessionToken += 1; this.current = null; },
    togglePause() {}, updateStats() {},
    beginSessionPause() { pauses += 1; }, endSessionPause() { resumes += 1; },
    stopDelta() { backgroundStops += 1; }, syncDelta() { backgroundResumes += 1; },
    synth: { cancel() {}, resume() {} },
    speak(text) { return new Promise(resolve => speech.push({ text, resolve })); }
  };
  window.__ontologicalWorlds = app;
  const byId = id => window.document.getElementById(id);
  byId('logic-mode').value = '1';
  byId('direction-resolution').value = '4';
  window.eval(source('mode-one-spatial-core.js'));
  window.eval(source('mode-two-engine-v21.js'));
  window.eval(source('mode-two-runtime-v21.js'));
  advance(0);
  await window.__modeTwoFinalRuntimeReady;
  app.running = true;
  app.trials = [seed()];
  return {
    app, window, speech, advance, byId,
    counters: () => ({ pauses, resumes, stops, backgroundStops, backgroundResumes })
  };
}

test('Mode 2 generation clears inherited answers and lure diagnostics without mutating history', () => {
  const target = Object.assign(seed(), {
    _answered: true, started: 0, correct: true, response: true, responseTime: 250,
    submitted: true, conflictResponses: [true], interferenceSlot: 3,
    partialStatementCompatibility: 2, statementMatchVector: [true, true, false], lureGenerationAttempts: 1
  });
  const original = JSON.stringify(target);
  for (const match of [true, false]) {
    const trial = engine.generateNBackTrial(null, target, { match, directionResolution: 4, interferenceLevel: 100 });
    for (const field of ['_answered', 'started', 'correct', 'response', 'responseTime', 'submitted', 'conflictResponses']) {
      assert.equal(Object.hasOwn(trial, field), false, `new trial inherited ${field}`);
    }
    assert.equal(engine.compare(target, trial).isMatch, match);
    if (match) {
      assert.equal(Object.hasOwn(trial, 'interferenceSlot'), false);
      assert.equal(Object.hasOwn(trial, 'partialStatementCompatibility'), false);
    }
  }
  assert.equal(JSON.stringify(target), original);
});

test('Mode 2 rejects mismatched resolution and missing historical positions', () => {
  const trial = seed();
  assert.equal(engine.ensureResolutionClosed(trial, 8), false);
  assert.equal(engine.ensureResolutionClosed(null, 4), false);
  assert.throws(() => engine.evaluateHistory([trial], 2, 1), /valid index/);
  assert.throws(() => engine.evaluateHistory([null, trial], 1, 1), /missing the N-back target/);
  assert.equal(engine.evaluateHistory([trial], 0, 1).scored, false);
});

test('Mode 2 binary answers update each scoring outcome once and retain an RT starting at zero', async t => {
  const f = await fixture(t);
  for (const [expected, response, field] of [
    [true, true, 'hits'], [true, false, 'misses'], [false, true, 'falseAlarms'], [false, false, 'correctRejects']
  ]) {
    f.app.makeTrial = () => Object.assign(seed(), { scored: true, nBackLevel: 1, nBackMatch: expected });
    const pending = f.app.nextTrial(42);
    assert.equal(f.app.awaiting, false);
    f.speech.at(-1).resolve();
    await pending;
    const before = f.app.score.scored;
    assert.equal(f.app.answer(null), false);
    assert.equal(f.app.score.scored, before);
    f.advance(250);
    assert.equal(f.app.answer(response), expected === response);
    assert.equal(f.app.current.responseTime, 250);
    assert.equal(f.app.score[field], 1);
    f.app.answer(response);
    assert.equal(f.app.score.scored, before + 1);
  }
});

test('Mode 2 pause preserves the open trial and excludes pause time from reaction time', async t => {
  const f = await fixture(t);
  const pending = f.app.nextTrial(42);
  f.speech[0].resolve();
  await pending;
  const trial = f.app.current;
  f.advance(100);
  f.app.togglePause();
  f.advance(10000);
  assert.equal(f.app.answer(trial.nBackMatch), false);
  assert.equal(f.app.score.scored, 0);
  assert.equal(f.byId('match-btn').disabled, true);
  f.app.togglePause();
  f.advance(150);
  assert.equal(f.app.current, trial);
  assert.equal(f.app.trials.length, 2);
  f.app.answer(trial.nBackMatch);
  assert.equal(trial.responseTime, 250);
  assert.deepEqual(f.counters(), { pauses: 1, resumes: 1, stops: 0, backgroundStops: 1, backgroundResumes: 1 });
});

test('Mode 2 replays interrupted speech and ignores stale completion without advancing N-back history', async t => {
  const f = await fixture(t);
  const pending = f.app.nextTrial(42);
  const trial = f.app.current;
  await f.app.nextTrial(42);
  assert.equal(f.app.trials.length, 2, 'duplicate nextTrial advanced history during speech');
  f.app.togglePause();
  f.app.togglePause();
  assert.equal(f.speech.length, 2);
  assert.equal(f.speech[0].text, f.speech[1].text);
  f.speech[0].resolve();
  await pending;
  assert.equal(f.app.awaiting, false, 'cancelled speech reopened the response');
  assert.equal(f.byId('match-btn').disabled, true);
  f.speech[1].resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.app.awaiting, true);
  assert.equal(f.app.current, trial);
  assert.equal(f.app.trials.length, 2);
});

test('Mode 2 warm-up pause preserves memory-fill order and stop invalidates delayed speech', async t => {
  const f = await fixture(t);
  f.app.trials = [];
  f.app.n = 2;
  const pending = f.app.nextTrial(42);
  f.speech[0].resolve();
  await pending;
  assert.equal(f.app.current.nBackWarmup, true);
  f.advance(100);
  f.app.togglePause();
  f.advance(10000);
  assert.equal(f.app.trials.length, 1);
  f.app.togglePause();
  f.advance(899);
  assert.equal(f.app.trials.length, 1);
  f.advance(1);
  assert.equal(f.app.trials.length, 2);
  f.app.stop(false);
  f.speech[1].resolve();
  await new Promise(resolve => setImmediate(resolve));
  f.advance(2000);
  assert.equal(f.app.awaiting, false);
  assert.equal(f.byId('match-btn').disabled, true);
  assert.equal(f.app.trials.length, 2);
});

test('Mode 2 generation failure tears down the session and restores controls', async t => {
  const f = await fixture(t);
  f.app.makeTrial = () => { throw new Error('invalid historical trial'); };
  assert.equal(await f.app.nextTrial(42), null);
  assert.equal(f.app.running, false);
  assert.equal(f.counters().stops, 1);
  assert.equal(f.byId('logic-mode').disabled, false);
  assert.equal(f.byId('direction-resolution').disabled, false);
  assert.equal(f.byId('start-btn').disabled, false);
  assert.match(f.byId('premise-display').textContent, /MODE_2_GENERATION_FAILED: invalid historical trial/);
});
