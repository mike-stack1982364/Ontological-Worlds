import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html', 'utf8').replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '');
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://ontological-worlds.test/' });
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

// Mirror the production index.html script order exactly. This makes the smoke
// test exercise the final browser overrides, not obsolete intermediate APIs.
for (const file of [
  'app.js',
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
  'mode-two-ontology-nback-v14.js',
  'mode-one-completion-v10.js',
  'mode-one-completion-v11.js',
  'audio-accessibility.js',
  'extra-training.js',
  'mode-one-conflict-matrix-v20.js',
  'mode-one-letter-continuity-v1.js'
]) window.eval(fs.readFileSync(file, 'utf8'));

window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 120));

const app = window.__ontologicalWorlds;
const core = window.__modeOneTriadicEntailmentCore;
const conflict = window.__modeOneConflictMatrixV20;
const maximal = window.__modeOneLetterContinuityV1;
const modeSelect = window.document.getElementById('logic-mode');
const nSlider = window.document.getElementById('n-slider');
const directionSelect = window.document.getElementById('direction-resolution');
const interferenceSlider = window.document.getElementById('interference-slider');
const interferenceValue = window.document.getElementById('interference-val');
const matrix = window.document.getElementById('conflict-matrix');

assert.ok(app, 'application instance missing');
assert.ok(core, 'spatial core missing');
assert.ok(conflict, 'conflict-matrix runtime missing');
assert.ok(maximal, 'maximum-interference runtime missing');
assert.equal(window.__modeOneMaxInterferenceReady, true, 'maximum-interference runtime did not install');
assert.equal(window.__modeOneMaxInterferenceInstallError, undefined, 'maximum-interference installation reported an error');
assert.equal(app.__modeOneAuthoritativeMaxInterferenceInstalled, true);
assert.equal(app.modeOneInterferenceLevel, 100);
assert.equal(maximal.version, 2);
assert.equal(maximal.MAX_INTERFERENCE, 100);

assert.equal(nSlider.min, '1');
assert.equal(nSlider.max, '8');
assert.equal(nSlider.step, '1');
assert.equal(nSlider.disabled, false);
assert.equal(nSlider.getAttribute('aria-valuemax'), '8');

// The obsolete per-trial response deadline was intentionally removed.
assert.equal(window.document.getElementById('spt-slider'), null);
assert.equal(window.document.getElementById('spt-val'), null);
assert.equal(typeof app._openResponseWindow, 'undefined');
assert.equal(Object.prototype.hasOwnProperty.call(app.settings(), 'seconds'), false);

// Mode 1 is now fail-closed at exactly 100% logical interference.
assert.equal(interferenceSlider.min, '100');
assert.equal(interferenceSlider.max, '100');
assert.equal(interferenceSlider.value, '100');
assert.equal(interferenceSlider.disabled, true);
assert.match(interferenceValue.textContent, /100%/);

const letters = trial => maximal.trialLetters(trial);
const overlapCount = (first, second) => {
  const set = new Set(second);
  return first.filter(value => set.has(value)).length;
};

let checkedTransitions = 0;
for (const directionResolution of [4, 8, 16]) {
  directionSelect.value = String(directionResolution);
  directionSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  app.directionResolution = directionResolution;

  for (let level = 1; level <= 8; level += 1) {
    modeSelect.value = '0';
    modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    nSlider.value = String(level);
    nSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
    app.n = level;
    app.trials = [];
    app.current = null;
    app.rng.s = (0x73a00000 + directionResolution * 100 + level) >>> 0;

    for (let index = 0; index < level + 48; index += 1) {
      const previous = app.trials[app.trials.length - 1] || null;
      const target = app.trials[app.trials.length - level] || null;
      const trial = app.makeTrial();
      assert.ok(trial, `Mode 1 returned no trial at resolution=${directionResolution}, N=${level}, index=${index}`);
      assert.equal(trial.interferenceLevel, 100);
      assert.equal(trial.maxLogicalInterference, true);
      assert.equal(letters(trial).length, 3);
      assert.equal(new Set(letters(trial)).size, 3);
      assert.equal(core.evaluateTrial(trial).isEntailed, trial.conclusionEntailed);
      assert.doesNotMatch(core.renderTrial(trial), /undefined|null/i);

      if (target) {
        const analysis = app.assertModeOneMaximumInterference(target, previous, trial);
        const evaluation = conflict.evaluateConflictMatrix(target, trial, { roleSensitive: true });
        assert.equal(analysis.valid, true);
        assert.equal(analysis.targetOverlapCount, 2);
        assert.ok(analysis.previousOverlapCount >= 1);
        assert.equal(analysis.introducedRelativeToTarget, 1);
        assert.equal(evaluation.matchedCount, evaluation.wholeTrialMatch ? 3 : 2);
        assert.deepEqual(trial.conflictResponseVector, [
          ...evaluation.statementMatches,
          evaluation.conclusionEntailed,
          evaluation.wholeTrialMatch
        ]);
        if (level === 1) {
          assert.equal(overlapCount(letters(previous), letters(trial)), 2, 'N=1 produced a disjoint or non-partial transition');
        }
        checkedTransitions += 1;
      } else if (previous) {
        assert.equal(overlapCount(letters(previous), letters(trial)), 2, 'warm-up transition did not retain exactly two predecessor letters');
        assert.equal(trial.nBackWarmup, true);
        assert.deepEqual(trial.conflictResponseVector.slice(0, 3), [false, false, false]);
      }

      app.trials.push(trial);
    }
  }
}
assert.ok(checkedTransitions > 1000);

// The maximum-interference override must delegate other public modes through
// the pre-existing router rather than returning null and breaking Mode 2.
modeSelect.value = '1';
modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
app.trials = [];
app.current = null;
app.n = 1;
const modeTwoTrial = app.makeTrial();
assert.ok(modeTwoTrial, 'Mode 2 generation was broken by the Mode 1 override');
assert.equal(modeTwoTrial.mode, 1);
assert.equal(typeof app.renderTrial(modeTwoTrial), 'string');
assert.ok(app.renderTrial(modeTwoTrial).trim().length > 0);
assert.equal(window.document.body.classList.contains('mode-one-conflict-active'), false);
assert.equal(matrix.getAttribute('aria-hidden'), 'true');

modeSelect.value = '0';
modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(window.document.body.classList.contains('mode-one-conflict-active'), true);
assert.equal(matrix.getAttribute('aria-hidden'), 'false');

console.log(JSON.stringify({
  passed: true,
  checkedTransitions,
  maximumInterference: maximal.MAX_INTERFERENCE,
  nBackLevels: [1,2,3,4,5,6,7,8],
  directionResolutions: [4,8,16],
  modeTwoPreserved: true,
  responseDeadlineRemoved: true
}, null, 2));
