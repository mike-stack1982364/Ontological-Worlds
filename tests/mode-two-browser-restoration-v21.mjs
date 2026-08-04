import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html', 'utf8')
  .replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '');
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'https://mode-two-restoration.test/'
});
const { window } = dom;

window.alert = () => {};
window.confirm = () => true;
window.requestAnimationFrame = callback => setTimeout(callback, 0);
window.cancelAnimationFrame = id => clearTimeout(id);
window.navigator.vibrate = () => true;
window.URL.createObjectURL = () => 'blob:test';
window.URL.revokeObjectURL = () => {};
window.SpeechSynthesisUtterance = class SpeechSynthesisUtterance {
  constructor(text = '') { this.text = text; this.volume = 1; this.rate = 1; this.pitch = 1; }
};
window.speechSynthesis = {
  paused: false,
  speaking: false,
  getVoices: () => [],
  speak: utterance => queueMicrotask(() => utterance.onend?.()),
  cancel: () => {},
  resume: () => {},
  pause: () => {}
};
window.AudioContext = class AudioContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createGain() { return { gain: { value: 0, setTargetAtTime() {} }, connect() { return this; }, disconnect() {} }; }
  createOscillator() { return { frequency: { value: 0 }, type: 'sine', connect() { return this; }, start() {}, stop() {}, disconnect() {} }; }
  createChannelMerger() { return { connect() { return this; }, disconnect() {} }; }
};
window.webkitAudioContext = window.AudioContext;

for (const file of [
  'app.js',
  'mode-release-gate.js',
  'audio-only-display.js',
  'response-window.js',
  'ontology-integration-v4.js',
  'cognitive-interference-v3.js',
  'mode-one-triadic.js',
  'mode-one-interference.js',
  'mode-one-match-logic.js',
  'mode-one-spatial-core.js',
  'mode-zero-exact-matching-v12.js',
  'mode-one-approved-trials-v7.js',
  'mode-one-nback-v8.js',
  'mode-one-nback-v9.js',
  'mode-one-nback-v10.js',
  'mode-one-nback-v11.js',
  'mode-router-v2.js',
  'mode-two-engine-v21.js',
  'mode-one-completion-v10.js',
  'mode-one-completion-v11.js',
  'audio-accessibility.js',
  'mode-one-conflict-matrix-v20.js',
  'mode-one-letter-continuity-v1.js',
  'mode-two-runtime-v21.js'
]) window.eval(fs.readFileSync(file, 'utf8'));

window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 80));

const app = window.__ontologicalWorlds;
const modeTwo = window.__modeTwoOntologyNBackV21;
const restoration = window.__modeTwoRestorationTestAPI;
assert.ok(app);
assert.equal(modeTwo?.version, 21);
assert.equal(app.__modeTwoFinalRuntimeV21, true);
assert.equal(restoration?.modeTwoGeneratorRoutedAfterModeOneOverrides, true);

const modeSelect = window.document.getElementById('logic-mode');
const directionGroup = window.document.getElementById('direction-resolution-group');
const directionSelect = window.document.getElementById('direction-resolution');
const startButton = window.document.getElementById('start-btn');
const matchButton = window.document.getElementById('match-btn');
const noMatchButton = window.document.getElementById('no-match-btn');
const matrix = window.document.getElementById('conflict-matrix');
const interference = window.document.getElementById('interference-slider');

modeSelect.value = '1';
modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(directionGroup.hidden, false);
assert.equal(startButton.disabled, true);
assert.equal(interference.disabled, false);
assert.equal(interference.min, '0');
assert.equal(interference.max, '100');
assert.equal(window.document.body.classList.contains('mode-two-active'), true);
assert.equal(window.getComputedStyle(matrix).display, 'none');
assert.notEqual(window.getComputedStyle(matchButton.parentElement).display, 'none');

directionSelect.value = '4';
directionSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(startButton.disabled, false);
app.directionResolution = 4;
app.n = 1;
app.trials = [];

const warmup = app.makeTrial();
assert.ok(warmup);
assert.equal(warmup.mode, 1);
assert.equal(warmup.publicMode, 2);
assert.equal(warmup.directionResolution, 4);
assert.equal(warmup.nBackWarmup, true);
assert.equal(modeTwo.ensureResolutionClosed(warmup, 4), true);
app.trials.push(warmup);

for (let index = 0; index < 128; index += 1) {
  const trial = app.makeTrial();
  assert.ok(trial, `Mode 2 returned no trial at browser iteration ${index}`);
  assert.equal(trial.mode, 1);
  assert.equal(trial.directionResolution, 4);
  assert.equal(modeTwo.ensureResolutionClosed(trial, 4), true);
  const target = app.trials[app.trials.length - app.n];
  assert.equal(modeTwo.compare(target, trial).isMatch, trial.nBackMatch);
  app.trials.push(trial);
}

app.trials = [warmup];
app.current = null;
app.running = true;
app.paused = false;
app.awaiting = false;
app.sessionToken = 777;
app.score = { hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0, timeouts: 0, shown: 0, scored: 0 };
app.rts = [];
await app.nextTrial(777);
assert.ok(app.current);
assert.equal(app.current.mode, 1);
assert.equal(app.current.scored, true);
assert.equal(app.awaiting, true);
assert.equal(matchButton.disabled, false);
assert.equal(noMatchButton.disabled, false);
const expected = app.current.nBackMatch;
assert.equal(app.answer(expected), true);
assert.equal(app.awaiting, false);
assert.equal(app.score.scored, 1);
assert.match(window.document.getElementById('feedback').textContent, /CORRECT/);
app.stop(false);

console.log('Mode 2 browser routing, controls, binary responses and 4-direction generation passed.');
window.close();
