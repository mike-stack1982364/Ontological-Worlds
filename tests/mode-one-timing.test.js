'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };

async function fixture(t, overrides = {}) {
  const dom = new JSDOM(source('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'https://timing.test/' });
  t.after(() => dom.window.close());
  const w = dom.window;
  await new Promise(resolve => setImmediate(resolve));
  let clock = 1000, sequence = 0, pauseAt = null;
  const timers = new Map(), speech = [];
  w.Date.now = () => clock;
  w.setTimeout = (fn, ms = 0) => { const id = ++sequence; timers.set(id, { at: clock + ms, fn }); return id; };
  w.clearTimeout = id => timers.delete(id);
  const advance = async ms => {
    const end = clock + ms;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
      if (!next) break;
      clock = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
    }
    clock = end; await flush();
  };
  const settings = { mode: 0, n: 2, directionResolution: 4, matchProbability: .5, volume: 1, haptic: false,
    listeningMode: false, trialInterval: 30, responseSeconds: 0, advanceOnResponse: true, ...overrides };
  const app = {
    running: true, paused: false, awaiting: false, sessionToken: 1, directionResolution: 4, n: 2, current: null, trials: [], rts: [],
    score: { shown: 0, scored: 0, hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0, timeouts: 0 },
    settings: () => settings, start() { this.running = true; }, nextTrial() {}, makeTrial() {},
    stop() { this.running = false; this.paused = false; this.awaiting = false; this.sessionToken++; }, togglePause() {},
    beginSessionPause() { pauseAt = clock; }, endSessionPause() { const elapsed = clock - pauseAt; pauseAt = null; return elapsed; },
    speak(text) { return new Promise(resolve => speech.push({ text, resolve })); }, cancelSpeech() {},
    applyPremiseVisibility() {}, updateStats() {}, stopDelta() {}, syncDelta() {},
    isSessionExpired() { return this.expired === true; }
  };
  w.__ontologicalWorlds = app;
  const byId = id => w.document.getElementById(id);
  byId('logic-mode').value = '0'; byId('direction-resolution').value = '4';
  w.eval(source('mode-one-spatial-core.js')); w.eval(source('mode-one-conflict-matrix-v20.js'));
  const api = w.__modeOneConflictMatrixV20;
  const seed = api.generateWarmupTrial(null, { directionResolution: 4 });
  app.makeTrial = () => JSON.parse(JSON.stringify(seed));
  const next = () => app.nextTrial(app.sessionToken);
  const finishSpeech = async (index = speech.length - 1, success = true) => { speech[index].resolve(success); await flush(); };
  const choose = (index, value) => byId('conflict-matrix').querySelector(`[data-decision="${index}"] [data-value="${Number(value)}"]`).click();
  return { app, w, byId, speech, advance, next, finishSpeech, choose, settings, timers, jump: ms => { clock += ms; } };
}

test('Mode 1 opens responses after speech and keeps finite history thinking time after an early complete answer', async t => {
  const f = await fixture(t, { responseSeconds: 10, advanceOnResponse: false });
  const trial = f.next();
  assert.equal(trial.nBackWarmup, true);
  assert.equal(f.app.awaiting, false);
  assert.equal(f.app.submitConflictMatrix(Array.from(trial.conflictResponseVector)), false);
  await f.advance(7000);
  assert.equal(f.app.trials.length, 1);
  await f.finishSpeech();
  assert.equal(f.app.awaiting, true);
  assert.equal(f.app.getTrialTimingState().remainingMs, 10000);
  trial.conflictResponseVector.forEach((value, index) => f.choose(index, value));
  assert.equal(f.app.score.scored, 1);
  assert.equal(trial.conflictCorrectCount, 5);
  await f.advance(9999); assert.equal(f.app.trials.length, 1);
  await f.advance(1); assert.equal(f.app.trials.length, 2);
});

test('Mode 1 deadline retains partial answers and marks omissions null and incorrect, never false correct rejections', async t => {
  const f = await fixture(t, { responseSeconds: 2 });
  const trial = f.next(); await f.finishSpeech();
  assert.equal(f.app.submitConflictMatrix(Array.from(trial.conflictResponseVector), [], true), false, 'timeout is controlled by the actual deadline');
  f.choose(0, false);
  await f.advance(2000);
  assert.deepEqual(Array.from(trial.conflictResponses), [false, null, null, null, null]);
  assert.deepEqual(Array.from(trial.conflictDecisionCorrectness), [true, false, false, false, false]);
  assert.equal(f.app.score.scored, 1); assert.equal(f.app.score.timeouts, 1);
  assert.equal(f.app.score.correctRejects, 0);
  assert.equal(f.app.conflictDecisionStats[1].correctRejects, 0);
  assert.equal(f.app.conflictDecisionStats[1].timeouts, 1);
  await f.advance(1600); assert.equal(f.app.trials.length, 2);
});

test('Mode 1 pause preserves the remaining response deadline and partial decisions', async t => {
  const f = await fixture(t, { responseSeconds: 10, advanceOnResponse: false });
  const trial = f.next(); await f.finishSpeech(); f.choose(0, false);
  await f.advance(3000); f.app.togglePause();
  assert.equal(f.app.getTrialTimingState().remainingMs, 7000);
  await f.advance(60000); assert.equal(f.app.score.scored, 0);
  f.app.togglePause(); await f.advance(6999); assert.equal(f.app.score.scored, 0);
  await f.advance(1); assert.equal(f.app.score.scored, 1);
  assert.equal(trial.conflictResponses[0], false); assert.equal(trial.responseTime, 10000);
});

test('Mode 1 listening finishes long speech, never accepts answers, and has no scores or penalties', async t => {
  const f = await fixture(t, { listeningMode: true, trialInterval: 1 });
  const trial = f.next();
  assert.equal(f.app.submitConflictMatrix(Array.from(trial.conflictResponseVector)), false);
  f.choose(0, false); await f.advance(5000);
  assert.equal(f.app.trials.length, 1);
  await f.finishSpeech(); assert.equal(f.app.score.heard, 1);
  await f.advance(0); assert.equal(f.app.trials.length, 2);
  assert.equal(f.app.score.scored, 0); assert.equal(f.app.score.timeouts, 0); assert.equal(f.app.rts.length, 0);
});

test('Mode 1 listening preserves wait remainder; muted fallback retains the full chosen cadence', async t => {
  const f = await fixture(t, { listeningMode: true, trialInterval: 12 });
  f.next(); await f.finishSpeech(0, false);
  assert.equal(f.app.score.heard || 0, 0);
  assert.equal(f.app.getTrialTimingState().remainingMs, 12000);
  await f.advance(4000); f.app.togglePause(); await f.advance(60000);
  f.app.togglePause(); await f.advance(7999); assert.equal(f.app.trials.length, 1);
  await f.advance(1); assert.equal(f.app.trials.length, 2);
});

test('Mode 1 speech pause replays the same trial and rejects the old completion; stop rejects all delayed work', async t => {
  const f = await fixture(t, { listeningMode: true, trialInterval: 10 });
  const trial = f.next(); await f.advance(4000); f.app.togglePause(); await f.advance(5000); f.app.togglePause();
  assert.equal(f.app.current, trial); assert.equal(f.speech.length, 2);
  await f.finishSpeech(0); assert.equal(f.app.getTrialTimingState().phase, 'speaking');
  await f.advance(2000); await f.finishSpeech(1);
  assert.equal(f.app.getTrialTimingState().remainingMs, 8000);
  f.app.stop(true); await f.advance(100000);
  assert.equal(f.app.running, false); assert.equal(f.app.trials.length, 1);
});

test('Mode 1 natural expiry completes the in-flight speech without inserting another trial', async t => {
  const f = await fixture(t, { listeningMode: true, trialInterval: 1 });
  f.next(); f.app.expired = true; await f.advance(5000);
  assert.equal(f.app.running, true); await f.finishSpeech();
  assert.equal(f.app.running, false); assert.equal(f.app.score.heard, 1); assert.equal(f.app.trials.length, 1);
});


test('Mode 1 rejects a response at the exact deadline even when a browser has delayed the timer callback', async t => {
  const f = await fixture(t, { responseSeconds: 5 });
  const trial = f.next(); await f.finishSpeech();
  f.jump(5000); f.choose(0, false);
  assert.deepEqual(Array.from(trial.conflictResponses), [null, null, null, null, null]);
  assert.equal(trial.conflictCorrectCount, 0); assert.equal(f.app.score.scored, 1);
});

test('Mode 1 stop and new session reject the prior utterance completion', async t => {
  const f = await fixture(t, { listeningMode: true, trialInterval: 10 });
  const old = f.next(); f.app.stop(true);
  f.byId('direction-resolution').value = '4'; f.app.start();
  const current = f.next();
  assert.notEqual(old, current);
  await f.finishSpeech(0); assert.equal(f.app.score.heard || 0, 0);
  assert.equal(f.app.getTrialTimingState().phase, 'speaking');
  await f.finishSpeech(1); assert.equal(f.app.score.heard, 1);
  assert.equal(f.app.current, current); assert.equal(f.app.trials.length, 1);
});
