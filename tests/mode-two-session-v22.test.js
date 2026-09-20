'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
// Retained historical v21 lifecycle regression. The shipped v22 lifecycle is
// covered by production integration and the dedicated v22 session suite.
const engine = require('../mode-two-engine-v22.js');

const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
const seed = () => engine.generateTrial(null, { directionResolution: 4, complexity: 'facets' });

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
    getSessionSummary() { return { mode: Number(byId('logic-mode').value), scored: this.score.scored, accuracy: 1 }; },
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
  window.eval(source('mode-two-engine-v22.js'));
  window.eval(source('mode-two-runtime-v22.js'));
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

async function answerSix(f) {
  for (let index = 0; index < 6; index += 1) {
    const pending = f.app.nextTrial(f.app.sessionToken);
    f.speech.at(-1).resolve();
    await pending;
    f.advance(200);
    f.app.answer(f.app.current.nBackMatch);
  }
  f.advance(1200);
}

test('Mode 2 practice pauses at six scored answers and never creates or scores an N-back trial', async t => {
  const f = await fixture(t);
  await answerSix(f);
  const trial = f.app.current;
  const count = f.app.trials.length;
  assert.equal(f.window.__modeTwoRestorationTestAPI.phase, 'reflection');
  assert.equal(f.byId('mode-two-reflection').hidden, false);
  assert.equal(f.app.awaiting, false);
  assert.equal(f.app.paused, false);
  assert.equal(f.app.score.scored, 6);
  assert.equal(f.counters().pauses, 1);
  f.advance(100000);
  await f.app.nextTrial(f.app.sessionToken);
  assert.equal(f.app.trials.length, count);
  assert.equal(f.app.answer(true), false);
  assert.equal(f.app.score.scored, 6);
  assert.equal(f.app.current, trial);
  const probe = engine.generateProbe(trial);
  const select = f.byId('mode-two-practice-0');
  assert.equal(select.options.length, 5);
  assert.match(select.labels[0].textContent, new RegExp(`${trial.conclusion.subject} relative to ${trial.conclusion.object}`));
  select.value = probe.spatial.expectedRelation;
  f.byId('mode-two-practice-1').value = probe.counterfactual.expectedRelation;
  f.window.document.querySelector('.mode-two-practice-actions button').click();
  assert.equal(trial.reflection.inferenceCorrect, true);
  assert.equal(trial.reflection.counterfactualCorrect, true);
  assert.equal(f.app.score.scored, 6);
  const summary = f.app.getSessionSummary();
  assert.equal(summary.practiceChecks, 2);
  assert.equal(summary.practiceCorrect, 2);
  assert.equal(summary.reflectionCount, 1);
  assert.equal(summary.modeTwoVersion, 22);
  f.byId('mode-two-practice-continue').click();
  assert.equal(f.counters().resumes, 1);
  assert.equal(f.app.trials.length, count + 1);
  assert.equal(f.byId('mode-two-reflection').hidden, true);
  assert.equal(f.app.score.scored, 6);
  assert.equal(trial.reflection.completed, true);
  assert.equal(f.app.current.reflection, undefined, 'new trial inherited previous practice record');
});

test('Mode 2 manual pause inside practice preserves a single clock pause and replay cannot reopen answers', async t => {
  const f = await fixture(t);
  await answerSix(f);
  const trial = f.app.current;
  const read = f.window.document.querySelectorAll('.mode-two-practice-actions button')[1];
  read.click();
  const spoken = f.speech.at(-1);
  assert.match(spoken.text, /Practice question one/);
  f.app.togglePause();
  f.advance(9000);
  assert.equal(f.counters().pauses, 1);
  assert.equal(f.counters().resumes, 0);
  f.byId('mode-two-practice-continue').click();
  assert.equal(f.app.current, trial);
  f.app.togglePause();
  assert.equal(f.counters().resumes, 0);
  spoken.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.app.awaiting, false);
  assert.equal(f.window.__modeTwoRestorationTestAPI.phase, 'reflection');
  assert.equal(f.byId('match-btn').disabled, true);
  assert.equal(read.disabled, false);
  f.byId('mode-two-practice-continue').click();
  assert.equal(f.counters().resumes, 1);
});

test('Mode 2 stopping a practice break invalidates speech and prevents Continue from starting another trial', async t => {
  const f = await fixture(t);
  await answerSix(f);
  const continueButton = f.byId('mode-two-practice-continue');
  f.window.document.querySelectorAll('.mode-two-practice-actions button')[1].click();
  const spoken = f.speech.at(-1);
  const count = f.app.trials.length;
  f.app.stop(false);
  continueButton.click();
  spoken.resolve();
  await new Promise(resolve => setImmediate(resolve));
  f.advance(10000);
  assert.equal(f.app.trials.length, count);
  assert.equal(f.app.running, false);
  assert.equal(f.app.awaiting, false);
  assert.equal(f.byId('mode-two-reflection').hidden, true);
  assert.equal(f.window.__modeTwoRestorationTestAPI.phase, 'idle');
});

test('Mode 2 settings freeze complexity and optional practice for the whole session', async t => {
  const f = await fixture(t);
  f.app.stop(true);
  f.byId('mode-two-complexity').value = 'worlds';
  f.byId('mode-two-reflections').checked = false;
  f.app.start();
  assert.equal(f.byId('mode-two-complexity').disabled, true);
  assert.equal(f.byId('mode-two-reflections').disabled, true);
  f.byId('mode-two-complexity').value = 'entities';
  f.byId('mode-two-reflections').checked = true;
  const generated = f.app.makeTrial();
  assert.equal(generated.complexity, 'worlds');
  assert.equal(f.window.__modeTwoRestorationTestAPI.sessionReflections, false);
  f.app.trials = [generated];
  await answerSix(f);
  assert.notEqual(f.window.__modeTwoRestorationTestAPI.phase, 'reflection');
  assert.equal(f.app.getSessionSummary().practiceEnabled, false);
  assert.equal(f.app.getSessionSummary().modeTwoComplexity, 'worlds');
});

test('Mode 2 practice hides the canonical stimulus in audio-only display', async t => {
  const f = await fixture(t);
  const settings = f.app.settings;
  f.app.settings = () => ({ ...settings(), audioOnly: true, volume: 1 });
  f.window.SpeechSynthesisUtterance = function() {};
  await answerSix(f);
  assert.equal(f.window.document.querySelector('.mode-two-reflection-stimulus').hidden, true);
  assert.equal(f.byId('mode-two-practice-continue').disabled, false);
});

test('Mode 2 practice retains first answers when a learner corrects their response', async t => {
  const f = await fixture(t);
  await answerSix(f);
  const expected = engine.generateProbe(f.app.current).spatial.expectedRelation;
  const select = f.byId('mode-two-practice-0');
  select.value = [...select.options].map(option => option.value).find(value => value && value !== expected);
  f.window.document.querySelector('.mode-two-practice-actions button').click();
  assert.equal(f.app.getSessionSummary().practiceChecks, 1);
  assert.equal(f.app.getSessionSummary().practiceCorrect, 0);
  select.value = expected;
  f.window.document.querySelector('.mode-two-practice-actions button').click();
  assert.match(f.byId('mode-two-practice-feedback').textContent, /1\. Correct/);
  assert.equal(f.app.getSessionSummary().practiceChecks, 1);
  assert.equal(f.app.getSessionSummary().practiceCorrect, 0);
});

test('Mode 2 practice does not disclose answers or award checks for unanswered questions', async t => {
  const f = await fixture(t);
  await answerSix(f);
  const check = f.window.document.querySelector('.mode-two-practice-actions button');
  check.click();
  assert.equal(f.byId('mode-two-practice-feedback').textContent,
    '1. Choose a direction to check this question. 2. Choose a direction to check this question.');
  assert.equal(f.app.getSessionSummary().practiceChecks, 0);
  assert.equal(f.app.getSessionSummary().practiceCorrect, 0);
  const probe = engine.generateProbe(f.app.current);
  f.byId('mode-two-practice-0').value = probe.spatial.expectedRelation;
  check.click();
  assert.match(f.byId('mode-two-practice-feedback').textContent, /^1\. Correct/);
  assert.match(f.byId('mode-two-practice-feedback').textContent, /2\. Choose a direction to check this question\.$/);
  assert.equal(f.app.getSessionSummary().practiceChecks, 1);
  assert.equal(f.app.getSessionSummary().practiceCorrect, 1);
  assert.equal(f.app.current.reflection.counterfactualCheckedResponse, undefined);
  assert.equal(f.app.current.reflection.counterfactualCorrect, undefined);
});

test('Mode 2 audio-only practice falls back to visible stimulus when speech is unavailable or muted', async t => {
  const f = await fixture(t);
  const settings = f.app.settings;
  f.app.settings = () => ({ ...settings(), audioOnly: true, volume: 0 });
  await answerSix(f);
  assert.equal(f.window.document.querySelector('.mode-two-reflection-stimulus').hidden, false);
});

test('Mode 2 silent memory fill waits for Continue across pause and ignores double clicks', async t => {
  const f = await fixture(t);
  f.app.trials = [];
  f.app.n = 2;
  const pending = f.app.nextTrial(42);
  f.speech[0].resolve(false);
  await pending;
  const button = f.byId('mode-two-warmup-continue');
  assert.equal(button.hidden, false);
  assert.equal(button.disabled, false);
  assert.equal(f.app.awaiting, false);
  assert.equal(f.app.score.scored, 0);
  f.advance(20000);
  assert.equal(f.app.trials.length, 1);
  f.app.togglePause();
  assert.equal(button.disabled, true);
  button.click();
  assert.equal(f.app.trials.length, 1);
  f.app.togglePause();
  f.advance(20000);
  assert.equal(f.app.trials.length, 1);
  button.click();
  button.click();
  assert.equal(f.app.trials.length, 2);
  assert.equal(button.hidden, true);
  f.speech[1].resolve(false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(button.hidden, false);
  f.app.stop(true);
  button.click();
  assert.equal(button.hidden, true);
  assert.equal(button.disabled, true);
  assert.equal(f.app.trials.length, 2);
});
