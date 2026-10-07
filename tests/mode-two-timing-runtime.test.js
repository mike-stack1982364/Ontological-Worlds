'use strict';

// Scheduling tests evaluate the shipped runtime with a real DOM, a deterministic
// clock and manually completed speech. Generation is deliberately a tiny stub:
// engine correctness has separate exhaustive coverage, while this file checks
// exact timing, scoring and lifecycle boundaries without real-time sleeps.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../mode-two-runtime-v22.js'), 'utf8');
const flush = async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); };

async function fixture(t, settings = {}) {
  const dom = new JSDOM(`<!doctype html><head></head><body>
    <select id="logic-mode"><option value="0">One</option><option value="1" selected>Two</option></select>
    <div id="direction-resolution-group"></div>
    <select id="direction-resolution"><option value="4" selected>Four</option></select>
    <p id="direction-resolution-help"></p><p id="direction-resolution-error"></p><p id="direction-resolution-status"></p>
    <input id="interference-slider"><span id="interference-val"></span><p id="interference-help"></p>
    <button id="start-btn"></button><button id="match-btn"></button><button id="no-match-btn"></button>
    <div id="conflict-matrix"></div><div id="premise-display"></div><div id="feedback"></div>
    <div id="trial-explanation"></div><div id="paused-overlay"></div><button id="pause-btn"></button>
    <div id="mode-two-settings"></div><select id="mode-two-complexity"><option value="facets">Facets</option></select>
    <input type="checkbox" id="mode-two-reflections"><div class="response-stage"></div>
  </body>`, { url: 'https://runtime.test', runScripts: 'outside-only' });
  const { window } = dom;
  t.after(() => window.close());
  let clock = 1000, nextTimer = 0, generated = 0;
  const timers = new Map(), speech = [], vibrations = [];
  const prefs = { n: 1, directionResolution: 4, volume: 1, haptic: true,
    matchProbability: 0.35, listeningMode: false, trialInterval: 30,
    responseSeconds: 0, advanceOnResponse: true, ...settings };
  Object.defineProperty(window.performance, 'now', { value: () => clock });
  window.Date.now = () => clock;
  window.setTimeout = (callback, delay = 0) => {
    const id = ++nextTimer;
    timers.set(id, { callback, due: clock + Math.max(0, Number(delay) || 0) });
    return id;
  };
  window.clearTimeout = id => timers.delete(id);
  window.navigator.vibrate = value => { vibrations.push(value); return true; };
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.SpeechSynthesisUtterance = class {};
  const trial = extra => ({ mode: 1, id: ++generated, scored: true,
    nBackLevel: 1, nBackMatch: true, complexity: 'facets',
    premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'E', object: 'C' }],
    conclusion: { subject: 'A', relation: 'NE', object: 'C' }, ...extra });
  window.__modeOneSpatialCore = {
    normaliseResolution: value => [4, 8, 16].includes(Number(value)) ? Number(value) : null,
    direction: value => ({ name: value }), allowedCodes: () => ['N', 'E', 'S', 'W']
  };
  window.__modeTwoOntologyNBackV22 = {
    version: 22, RESOLUTIONS: [4, 8, 16], installBrowser() {},
    renderOntologicalTrial: item => `World ${item.id}: A north of B; B east of C; A northeast of C.`,
    generateTrial: () => trial(),
    generateNBackTrial: (rng, target, options) => trial({ nBackMatch: options.match }),
    runExhaustiveAudit: () => true, compare: () => ({ isMatch: true }),
    generateProbe: () => { throw new Error('Unexpected reflection in a timing test'); }
  };
  const app = window.__ontologicalWorlds = {
    running: false, paused: false, sessionToken: 0, n: 1, trials: [], current: null,
    awaiting: false, rts: [], score: {}, history: [], pauseStartedAt: null,
    rng: { next: () => 0 }, settings: () => prefs,
    synth: { cancel() {}, resume() {} },
    makeTrial() { throw new Error('Unexpected Mode 1 generation'); },
    nextTrial() {}, answer() { throw new Error('Unexpected Mode 1 answer'); },
    start() {
      this.running = true; this.paused = false; this.sessionToken += 1;
      this.endsAt = clock + 3600000; this.rts = []; this.score = {};
      void this.nextTrial(this.sessionToken);
      return true;
    },
    stop() { this.running = false; this.awaiting = false; this.sessionToken += 1; },
    togglePause() {},
    beginSessionPause() { if (this.pauseStartedAt === null) this.pauseStartedAt = clock; },
    endSessionPause() {
      if (this.pauseStartedAt !== null) this.endsAt += clock - this.pauseStartedAt;
      this.pauseStartedAt = null;
    },
    isSessionExpired() { return clock >= this.endsAt; },
    speak(text) {
      return new Promise((resolve, reject) => speech.push({ text, resolve, reject }));
    },
    cancelSpeech() {}, updateStats() {}, applyPremiseVisibility() {},
    stopDelta() {}, syncDelta() {},
    getSessionSummary() { return { mode: 1 }; }
  };
  async function tick(milliseconds) {
    const target = clock + milliseconds;
    await flush();
    for (let steps = 0; steps < 10000; steps += 1) {
      const pending = [...timers].sort((a, b) => a[1].due - b[1].due || a[0] - b[0]);
      if (!pending.length || pending[0][1].due > target) break;
      const [id, item] = pending[0];
      timers.delete(id); clock = item.due; item.callback(); await flush();
      assert.ok(steps < 9999, 'timer queue must converge');
    }
    clock = target; await flush();
  }
  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await tick(0);
  await window.__modeTwoFinalRuntimeReady;
  const byId = id => window.document.getElementById(id);
  const result = {
    window, app, prefs, speech, vibrations, tick, byId,
    phase: () => window.__modeTwoRestorationTestAPI.phase,
    now: () => clock,
    jump: milliseconds => { clock += milliseconds; },
    pendingCallbacks: () => [...timers.values()].map(item => item.callback),
    start: async () => { app.start(); await flush(); return app.current; },
    finish: async (index = speech.length - 1, value = true) => { speech[index].resolve(value); await flush(); },
    reject: async (index = speech.length - 1) => { speech[index].reject(new Error('Unavailable')); await flush(); }
  };
  return result;
}

async function scoredTrial(f, expected = true) {
  await f.start();
  await f.finish();
  const warmupMs = f.prefs.responseSeconds > 0 ? f.prefs.responseSeconds * 1000
    : f.prefs.advanceOnResponse === false ? 30000 : 900;
  await f.tick(warmupMs);
  assert.equal(f.app.trials.length, 2, 'one unscored history trial precedes the response');
  f.app.current.nBackMatch = expected;
  await f.finish();
  assert.equal(f.app.awaiting, true);
  return f.app.current;
}

test('listening cadence uses decimal start-to-start intervals and never overlaps speech or records answers', async t => {
  const f = await fixture(t, { listeningMode: true, trialInterval: 1.25 });
  f.byId('mode-two-reflections').checked = true;
  await f.start();
  await f.tick(400); await f.finish();
  assert.equal(f.app.score.heard, 1);
  assert.equal(f.app.awaiting, false);
  assert.equal(f.byId('match-btn').disabled, true);
  assert.equal(f.byId('no-match-btn').disabled, true);
  for (const response of [true, false, null]) f.app.answer(response);
  await f.tick(849);
  assert.equal(f.app.trials.length, 1);
  await f.tick(1);
  assert.equal(f.app.trials.length, 2);
  await f.tick(5000);
  assert.equal(f.app.trials.length, 2, 'long speech must finish before the next world');
  await f.finish(); await f.tick(0);
  assert.equal(f.app.trials.length, 3, 'overdue cadence advances as soon as speech ends');
  assert.equal(f.app.score.heard, 2);
  for (const key of ['scored', 'hits', 'misses', 'falseAlarms', 'correctRejects', 'timeouts']) {
    assert.equal(f.app.score[key] || 0, 0, `${key} stays unscored`);
  }
  assert.equal(f.app.rts.length, 0);
  assert.deepEqual(f.vibrations, []);
  assert.equal(f.byId('mode-two-reflection').hidden, true);
  assert.equal(f.speech.length, 3, 'only the three world presentations are spoken');
});

test('listening uses a finite visible fallback for muted, failed and rejected speech without counting it as heard', async t => {
  for (const failure of ['muted', 'failed', 'rejected']) {
    const f = await fixture(t, { listeningMode: true, trialInterval: 1.1, volume: failure === 'muted' ? 0 : 1 });
    await f.start();
    if (failure === 'rejected') await f.reject();
    else await f.finish(0, false);
    assert.equal(f.app.score.heard || 0, 0, failure);
    assert.equal(f.app.paused, false, failure);
    assert.equal(f.byId('premise-display').hidden, false, failure);
    await f.tick(1099); assert.equal(f.app.trials.length, 1, failure);
    await f.tick(1); assert.equal(f.app.trials.length, 2, failure);
    assert.equal(f.app.score.scored || 0, 0, failure);
  }
});

test('normal response deadlines start after speech; null timeouts cannot earn a correct rejection', async t => {
  for (const expected of [true, false]) {
    const f = await fixture(t, { responseSeconds: 2.5 });
    await f.start(); await f.finish(); await f.tick(2500);
    f.app.current.nBackMatch = expected;
    const current = f.app.current;
    await f.tick(13000);
    assert.equal(f.app.score.scored || 0, 0, 'speech duration is outside the response window');
    await f.finish();
    await f.tick(2499); assert.equal(f.app.awaiting, true);
    await f.tick(1);
    assert.equal(current.response, null);
    assert.equal(current.correct, false);
    assert.equal(f.app.score.timeouts, 1);
    assert.equal(f.app.score.scored, 1);
    assert.equal(f.app.score.misses || 0, Number(expected));
    assert.equal(f.app.score.correctRejects || 0, 0);
    assert.equal(f.app.score.hits || 0, 0);
    assert.equal(f.app.score.falseAlarms || 0, 0);
    assert.equal(f.app.rts.length, 0, 'timeouts do not enter measured response times');
    f.app.answer(expected);
    assert.equal(f.app.score.scored, 1, 'an expired response cannot be scored twice');
  }
});

test('fixed response cadence holds an early answer until the original deadline', async t => {
  const f = await fixture(t, { responseSeconds: 3.5, advanceOnResponse: false });
  const current = await scoredTrial(f);
  await f.tick(1000);
  assert.equal(f.app.answer(true), true);
  assert.equal(current.responseTime, 1000);
  assert.equal(f.app.score.scored, 1);
  await f.tick(2499); assert.equal(f.app.trials.length, 2);
  await f.tick(1); assert.equal(f.app.trials.length, 3);
  assert.equal(f.app.score.scored, 1);
});

test('advance-on-response uses exactly 1200 milliseconds of feedback', async t => {
  const f = await fixture(t, { responseSeconds: 30, advanceOnResponse: true });
  await scoredTrial(f);
  await f.tick(1000); f.app.answer(true);
  await f.tick(1199); assert.equal(f.app.trials.length, 2);
  await f.tick(1); assert.equal(f.app.trials.length, 3);
});

test('untimed responses remain open; fixed cadence defensively normalizes untimed to 30 seconds', async t => {
  const untimed = await fixture(t, { responseSeconds: 0, advanceOnResponse: true });
  await scoredTrial(untimed);
  await untimed.tick(120000);
  assert.equal(untimed.app.awaiting, true);
  assert.equal(untimed.app.score.scored || 0, 0);
  const fixed = await fixture(t, { responseSeconds: 0, advanceOnResponse: false });
  await scoredTrial(fixed);
  const current = fixed.app.current;
  await fixed.tick(29999); assert.equal(fixed.app.awaiting, true);
  await fixed.tick(1);
  assert.equal(current.correct, false);
  assert.equal(fixed.app.score.timeouts, 1);
  assert.equal(fixed.app.trials.length, 3, 'fixed cadence advances at its deadline without an extra feedback delay');
});

test('pausing a response preserves the exact deadline remainder and excludes paused time from reaction time', async t => {
  const f = await fixture(t, { responseSeconds: 2.5 });
  const current = await scoredTrial(f);
  await f.tick(1000); f.app.togglePause();
  await f.tick(60000);
  assert.equal(f.app.score.scored || 0, 0);
  assert.equal(f.app.awaiting, false);
  f.app.answer(true); assert.equal(f.app.score.scored || 0, 0);
  f.app.togglePause(); await f.tick(1499);
  assert.equal(f.app.awaiting, true);
  f.app.answer(true);
  assert.equal(current.responseTime, 2499);
  assert.equal(current.correct, true);
});

test('warmup, feedback and listening pauses preserve their remaining delays', async t => {
  const warmup = await fixture(t);
  await warmup.start(); await warmup.finish(); await warmup.tick(400);
  warmup.app.togglePause(); await warmup.tick(50000); warmup.app.togglePause();
  await warmup.tick(499); assert.equal(warmup.app.trials.length, 1);
  await warmup.tick(1); assert.equal(warmup.app.trials.length, 2);
  assert.equal(warmup.app.score.scored || 0, 0);

  const feedback = await fixture(t);
  await scoredTrial(feedback); feedback.app.answer(true); await feedback.tick(700);
  feedback.app.togglePause(); await feedback.tick(50000); feedback.app.togglePause();
  await feedback.tick(499); assert.equal(feedback.app.trials.length, 2);
  await feedback.tick(1); assert.equal(feedback.app.trials.length, 3);

  const listening = await fixture(t, { listeningMode: true, trialInterval: 1.25 });
  await listening.start(); await listening.tick(400); await listening.finish(); await listening.tick(300);
  listening.app.togglePause(); await listening.tick(50000); listening.app.togglePause();
  await listening.tick(549); assert.equal(listening.app.trials.length, 1);
  await listening.tick(1); assert.equal(listening.app.trials.length, 2);
  assert.equal(listening.app.score.heard, 1, 'resume of a completed presentation must not replay or double-count it');
});

test('pausing active speech replays the same history entry and ignores its stale completion', async t => {
  const f = await fixture(t, { listeningMode: true, trialInterval: 2 });
  const current = await f.start();
  await f.tick(700); f.app.togglePause(); await f.tick(10000); f.app.togglePause();
  assert.equal(f.speech.length, 2);
  assert.equal(f.app.current, current);
  assert.equal(f.app.trials.length, 1);
  await f.finish(0, false);
  assert.equal(f.phase(), 'speaking');
  assert.equal(f.app.score.heard || 0, 0);
  await f.tick(100); await f.finish(1, true);
  assert.equal(f.app.score.heard, 1);
  assert.equal(f.app.trials.length, 1);
});

test('session expiration is checked before generation and after speech without opening a response', async t => {
  const f = await fixture(t, { responseSeconds: 2 });
  await f.start();
  f.app.endsAt = f.now() + 100;
  await f.tick(100); await f.finish();
  assert.equal(f.app.running, false);
  assert.equal(f.app.awaiting, false);
  assert.equal(f.app.trials.length, 1);
  assert.equal(f.app.score.scored || 0, 0);

  const before = await fixture(t);
  await scoredTrial(before); before.app.answer(true);
  before.app.endsAt = before.now();
  await before.tick(1200);
  assert.equal(before.app.running, false);
  assert.equal(before.app.trials.length, 2);
});

test('interval limits, decimal precision and invalid-value defaults remain deterministic', async t => {
  for (const [value, expected] of [[-5, 1], [0, 1], [1, 1], [1.125, 1.125], [120, 120], [999, 120], [Infinity, 30], ['', 30]]) {
    const f = await fixture(t, { listeningMode: true, trialInterval: value });
    await f.start(); await f.finish();
    assert.equal(f.app.getTrialTimingState().remainingMs, expected * 1000, `listening interval ${value}`);
    await f.tick(expected * 1000 - 1); assert.equal(f.app.trials.length, 1);
    await f.tick(1); assert.equal(f.app.trials.length, 2);
  }
  for (const [value, expected] of [[0, 0.9], [0.25, 1], [1, 1], [1.125, 1.125], [120, 120], [999, 120], [Infinity, 0.9]]) {
    const f = await fixture(t, { responseSeconds: value });
    await f.start(); await f.finish();
    assert.equal(f.app.getTrialTimingState().remainingMs, expected * 1000, `warmup response interval ${value}`);
    await f.tick(expected * 1000 - 1); assert.equal(f.app.trials.length, 1);
    await f.tick(1); assert.equal(f.app.trials.length, 2);
  }
});

test('a paused response expires at its remaining deadline, while its displayed remainder stays frozen', async t => {
  const f = await fixture(t, { responseSeconds: 2.5 });
  const current = await scoredTrial(f, false);
  await f.tick(1000); f.app.togglePause();
  assert.equal(f.app.getTrialTimingState().remainingMs, 1500);
  await f.tick(30000);
  assert.equal(f.app.getTrialTimingState().remainingMs, 1500);
  f.app.togglePause(); await f.tick(1499);
  assert.equal(f.app.score.scored || 0, 0);
  assert.equal(f.app.getTrialTimingState().remainingMs, 1);
  await f.tick(1);
  assert.equal(current.response, null);
  assert.equal(current.correct, false);
  assert.equal(f.app.score.timeouts, 1);
  assert.equal(f.app.score.correctRejects || 0, 0);
});

test('late input is a timeout even if the browser has not delivered its timer callback yet', async t => {
  const f = await fixture(t, { responseSeconds: 1.5 });
  const current = await scoredTrial(f, true);
  f.jump(1500); // Model a delayed timer task followed by a user input task.
  assert.equal(f.app.answer(true), false);
  assert.equal(current.response, null);
  assert.equal(f.app.score.timeouts, 1);
  assert.equal(f.app.score.misses, 1);
  await f.tick(0);
  assert.equal(f.app.score.scored, 1, 'the delayed timer cannot score the same trial again');
});

test('pausing after an early fixed-cadence answer preserves the original remaining interval', async t => {
  const f = await fixture(t, { responseSeconds: 3.5, advanceOnResponse: false });
  await scoredTrial(f); await f.tick(500); f.app.answer(true); await f.tick(1000);
  f.app.togglePause();
  assert.equal(f.app.getTrialTimingState().remainingMs, 2000);
  await f.tick(50000); f.app.togglePause();
  await f.tick(1999); assert.equal(f.app.trials.length, 2);
  await f.tick(1); assert.equal(f.app.trials.length, 3);
  assert.equal(f.app.score.scored, 1);
});

test('stopping and restarting invalidates both pending speech and scheduled advancement', async t => {
  const f = await fixture(t, { listeningMode: true, trialInterval: 1.25 });
  const old = await f.start();
  f.app.stop(); await f.start();
  const current = f.app.current;
  assert.notEqual(current, old);
  assert.equal(f.app.trials.length, 1);
  await f.finish(0, true);
  assert.equal(f.phase(), 'speaking');
  assert.equal(f.app.score.heard || 0, 0);
  await f.finish(1, true);
  assert.equal(f.app.score.heard, 1);
  f.app.stop();
  await f.tick(50000);
  assert.equal(f.app.current, current);
  assert.equal(f.app.trials.length, 1);
  assert.equal(f.app.running, false);
});

test('null input cannot manufacture an early timeout or a timeout on an untimed trial', async t => {
  for (const responseSeconds of [0, 2.5]) {
    const f = await fixture(t, { responseSeconds });
    const current = await scoredTrial(f, false);
    await f.tick(responseSeconds ? 2499 : 120000);
    assert.equal(f.app.answer(null), false);
    assert.equal(current._answered, false);
    assert.equal(f.app.awaiting, true);
    assert.equal(f.app.score.scored || 0, 0);
    assert.equal(f.app.score.timeouts || 0, 0);
    assert.equal(f.app.rts.length, 0);
    assert.equal(f.app.answer(false), true, 'valid input still works after a rejected null');
    assert.equal(f.app.score.correctRejects, 1);
    assert.equal(f.app.score.timeouts || 0, 0);
  }
});

test('session expiration immediately before input stops the session without scoring the late answer', async t => {
  for (const response of [true, false, null]) {
    const f = await fixture(t, { responseSeconds: 2.5 });
    const current = await scoredTrial(f, true);
    f.app.endsAt = f.now() + 100;
    f.jump(100); // The session-clock callback has not run yet.
    assert.equal(f.app.answer(response), false);
    assert.equal(f.app.running, false);
    assert.equal(f.app.awaiting, false);
    assert.equal(current._answered, false);
    assert.equal(f.app.score.scored || 0, 0);
    assert.equal(f.app.score.timeouts || 0, 0);
    assert.equal(f.app.rts.length, 0);
    assert.deepEqual(f.vibrations, []);
    await f.tick(10000);
    assert.equal(f.app.trials.length, 2);
  }
});

test('muted or failed untimed warmup waits for manual Continue and preserves it across pause/resume', async t => {
  for (const failure of ['muted', 'failed', 'rejected']) {
    const f = await fixture(t, { responseSeconds: 0, volume: failure === 'muted' ? 0 : 1 });
    const warmup = await f.start();
    if (failure === 'rejected') await f.reject();
    else await f.finish(0, false);
    const button = f.byId('mode-two-warmup-continue');
    assert.equal(button.hidden, false, failure);
    assert.equal(button.disabled, false, failure);
    assert.equal(f.app.getTrialTimingState().remainingMs, null, failure);
    await f.tick(120000);
    assert.equal(f.app.trials.length, 1, `${failure}: untimed warmup remains manual`);
    f.app.togglePause();
    assert.equal(button.disabled, true, failure);
    button.click();
    await f.tick(50000);
    assert.equal(f.app.trials.length, 1, failure);
    f.app.togglePause();
    assert.equal(button.disabled, false, failure);
    assert.equal(button.hidden, false, failure);
    assert.equal(f.speech.length, 1, `${failure}: completed presentation is not replayed`);
    button.click();
    await flush();
    assert.equal(f.app.trials.length, 2, failure);
    assert.equal(warmup._answered, false, failure);
    assert.equal(f.app.score.scored || 0, 0, failure);
    assert.equal(button.hidden, true, failure);
    assert.equal(button.disabled, true, failure);
    button.click();
    assert.equal(f.app.trials.length, 2, `${failure}: Continue cannot duplicate history`);
  }
});

test('a finite warmup remains timed when speech fails', async t => {
  const f = await fixture(t, { responseSeconds: 1.5, volume: 0 });
  await f.start(); await f.finish(0, false);
  assert.equal(f.byId('mode-two-warmup-continue').hidden, true);
  assert.equal(f.app.getTrialTimingState().remainingMs, 1500);
  await f.tick(1499); assert.equal(f.app.trials.length, 1);
  await f.tick(1); assert.equal(f.app.trials.length, 2);
  assert.equal(f.app.score.scored || 0, 0);
});

test('a canceled callback delivered after pause/resume cannot clear or run the replacement timer', async t => {
  const f = await fixture(t);
  await f.start(); await f.finish();
  const callbacks = f.pendingCallbacks();
  assert.equal(callbacks.length, 1);
  const canceled = callbacks[0];
  await f.tick(400); f.app.togglePause(); await f.tick(10000); f.app.togglePause();
  assert.equal(f.app.getTrialTimingState().remainingMs, 500);
  canceled(); await flush();
  assert.equal(f.phase(), 'warmup');
  assert.equal(f.app.trials.length, 1);
  assert.equal(f.app.getTrialTimingState().remainingMs, 500);
  await f.tick(499); assert.equal(f.app.trials.length, 1);
  await f.tick(1); assert.equal(f.app.trials.length, 2);
});
