import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html', 'utf8').replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '');
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'https://ontological-worlds.test/'
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
  constructor(text = '') {
    this.text = text;
    this.volume = 1;
    this.rate = 1;
    this.pitch = 1;
  }
};
window.speechSynthesis = {
  paused: false,
  speaking: false,
  getVoices: () => [],
  speak: utterance => { queueMicrotask(() => utterance.onend?.()); },
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
  'mode-one-triadic.js',
  'cognitive-interference-v3.js',
  'mode-one-interference.js',
  'audio-accessibility.js'
]) {
  window.eval(fs.readFileSync(file, 'utf8'));
}
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 0));

const app = window.__ontologicalWorlds;
const ontology = window.__ontologyTestAPI;
const legacyInterference = window.__interferenceTestAPI;
const modeOneInterference = window.__modeOneInterferenceTestAPI;
const modeOneTriadic = window.__modeOneTriadicTestAPI;
const releaseGate = window.__modeReleaseTestAPI;
const audioOnlyDisplay = window.__audioOnlyDisplayTestAPI;
const responseWindow = window.__responseWindowTestAPI;

assert.ok(app, 'application instance missing');
assert.equal(ontology?.selfTestPassed, true, 'ontology self-test failed');
assert.equal(legacyInterference?.selfTestPassed, true, 'dormant-mode interference self-test failed');
assert.equal(modeOneInterference?.selfTestPassed, true, 'Mode 1 interference self-test failed');
assert.equal(modeOneInterference?.symbolsDriveInterference, false, 'symbols must not drive Mode 1 interference');
assert.equal(modeOneInterference?.premiseLogicDrivesInterference, true, 'premise logic is not the interference engine');
assert.equal(modeOneTriadic?.selfTestPassed, true, 'triadic Mode 1 self-test failed');
assert.equal(modeOneTriadic?.nodeCount, 3, 'Mode 1 does not contain three symbols');
assert.equal(modeOneTriadic?.transformedSymbolCount, 3, 'Mode 1 does not contain three symbol transformations');

const modeSelect = window.document.getElementById('logic-mode');
assert.deepEqual(releaseGate?.selectableModes, [0], 'more than Mode 1 is selectable');
assert.equal(releaseGate?.futureModesDisabled, true, 'future modes are not disabled');
assert.equal(app.settings().mode, 0, 'release gate did not force Mode 1');
assert.equal([...modeSelect.options].filter(option => !option.disabled).length, 1, 'multiple modes remain clickable');
for (const option of [...modeSelect.options].slice(1)) {
  assert.equal(option.disabled, true, `${option.value} remains clickable`);
  assert.ok(option.textContent.includes('Released in future'), `${option.value} lacks future-release wording`);
}
modeSelect.value = '6';
modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(modeSelect.value, '0', 'programmatic future-mode selection was not rejected');
assert.equal(app.settings().mode, 0, 'runtime settings escaped the Mode 1 release gate');

assert.equal(audioOnlyDisplay?.blurControlRemoved, true, 'blur behaviour was not removed');
assert.equal(audioOnlyDisplay?.legacyControlHidden, true, 'legacy compatibility input must remain hidden');
assert.equal(audioOnlyDisplay?.settingsExcludeHideText, true, 'obsolete hideText setting remains active');
assert.equal(window.document.body.textContent.includes('Blur visible premise'), false, 'obsolete blur control remains visible');

const audioOnly = window.document.getElementById('audio-only');
const legacyHideText = window.document.getElementById('hide-text');
const premiseDisplay = window.document.getElementById('premise-display');
assert.equal(legacyHideText.hidden, true, 'legacy compatibility element is visible');
assert.equal(legacyHideText.closest('label'), null, 'legacy compatibility element remains user-facing');
assert.equal(legacyHideText.checked, false, 'legacy blur state was not neutralised');
assert.equal(Object.prototype.hasOwnProperty.call(app.settings(), 'hideText'), false, 'hideText remains in runtime settings');

audioOnly.checked = false;
app.applyPremiseVisibility();
assert.equal(premiseDisplay.classList.contains('hidden-mode'), false, 'visible mode incorrectly hides premise');
assert.equal(premiseDisplay.classList.contains('muted'), false, 'blur class is still applied');
assert.equal(premiseDisplay.getAttribute('aria-hidden'), 'false', 'visible premise is hidden from accessibility tree');

audioOnly.checked = true;
app.applyPremiseVisibility();
assert.equal(premiseDisplay.classList.contains('hidden-mode'), true, 'audio-only mode did not hide premise');
assert.equal(premiseDisplay.classList.contains('muted'), false, 'audio-only mode applied obsolete blur class');
assert.equal(premiseDisplay.getAttribute('aria-hidden'), 'true', 'audio-only premise remains in accessibility tree');
audioOnly.checked = false;
app.applyPremiseVisibility();

const responseSlider = window.document.getElementById('spt-slider');
const responseLabel = window.document.getElementById('spt-val');
assert.equal(responseWindow?.maxSeconds, 300, 'response-window maximum is not five minutes');
assert.equal(responseSlider.max, '300', 'response-window slider does not expose five minutes');
assert.equal(responseSlider.step, '0.5', 'response-window precision changed unexpectedly');
responseSlider.value = '300';
responseSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
assert.equal(app.settings().seconds, 300, 'five-minute response setting is not consumed by the engine');
assert.equal(responseLabel.textContent, '5:00', 'five-minute response setting is not formatted as a clock');
assert.equal(responseSlider.getAttribute('aria-valuetext'), '5 minutes', 'five-minute response setting lacks accessible text');

const originalWindowSetTimeout = window.setTimeout;
let scheduledResponseMilliseconds = null;
window.setTimeout = (_callback, milliseconds) => {
  scheduledResponseMilliseconds = milliseconds;
  return 999;
};
app.running = true;
app.paused = false;
app.current = { _answered: false };
app.awaiting = false;
app._openResponseWindow(app.settings().seconds * 1000);
assert.equal(scheduledResponseMilliseconds, 300000, 'five-minute response deadline was not scheduled precisely');
window.setTimeout = originalWindowSetTimeout;
app.running = false;
app.awaiting = false;
app.current = null;
clearTimeout(app.timerId);
app.timerId = null;

function renamedLogicalClone(trial) {
  const copy = JSON.parse(JSON.stringify(trial));
  const replacements = ['X', 'Y', 'Z'];
  copy.nodes.forEach((node, index) => { node.symbol = replacements[index]; });
  copy.symbols = copy.nodes.map(node => node.symbol);
  app.deriveTrial(copy);
  return copy;
}

app.rng.s = 442211;
const categoryCoverage = new Set();
const formCoverage = new Set();
for (let index = 0; index < 3000; index += 1) {
  const trial = app.makeBase(0);
  assert.equal(trial.nodes.length, 3, 'Mode 1 premise does not contain three symbols');
  assert.equal(trial.dirs.length, 2, 'Mode 1 premise does not contain two cardinal transitions');
  assert.equal(trial.transformationCount, 3, 'Mode 1 premise does not encode three symbol transformations');
  assert.notEqual(trial.dirs[0], trial.dirs[1], 'Mode 1 failed to transform between directions');
  assert.equal(new Set(trial.nodes.map(node => node.symbol)).size, 3, 'Mode 1 repeated a symbol inside one premise');
  assert.ok(trial.leftRelationCategory, 'left relation category missing');
  assert.ok(trial.rightRelationCategory, 'right relation category missing');
  assert.ok(trial.nodeSynthesisCategory, 'node synthesis missing');
  assert.ok(trial.relationSynthesisCategory, 'relation synthesis missing');
  assert.ok(trial.integratedCategory, 'integrated synthesis missing');
  assert.ok(trial.integratedForm, 'integrated form missing');

  const rendered = app.renderTrial(trial);
  assert.equal((rendered.match(/;/g) || []).length, 2, 'Mode 1 does not contain three auditory clauses');
  assert.ok(!/undefined|null|Archetypal|connects|constrains/i.test(rendered), 'Mode 1 premise contains malformed or ambiguous wording');
  assert.deepEqual(
    modeOneInterference.logicProfile(trial),
    modeOneInterference.logicProfile(renamedLogicalClone(trial)),
    'surface symbols entered Mode 1 logic'
  );

  trial.nodes.forEach(node => {
    categoryCoverage.add(node.categoryId);
    formCoverage.add(node.form);
  });
}
assert.equal(categoryCoverage.size, 9, 'Mode 1 did not cover all ontological categories');
assert.equal(formCoverage.size, 3, 'Mode 1 did not cover all forms');

const interferenceSlider = window.document.getElementById('interference-slider');
let forcedMatchProbability = 0;
const runtimeSettings = app.settings.bind(app);
app.settings = function deterministicTestSettings() {
  return { ...runtimeSettings(), mode: 0, matchProbability: forcedMatchProbability };
};

function resetSequence(level, seed, n = 3) {
  interferenceSlider.value = String(level);
  interferenceSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
  app.rng.s = seed >>> 0;
  app.trials = [];
  app.inventionMemory.clear();
  app.categoryDeck = [];
  app.formDeck = [];
  app.turnDeck = [];
  app.n = n;
  app.score.shown = 0;
}

function runNonMatchSequence(level, seed, count = 900) {
  forcedMatchProbability = 0;
  resetSequence(level, seed);
  const similarities = [];
  const highOrder = [];
  for (let index = 0; index < count; index += 1) {
    const target = app.trials[app.trials.length - app.n];
    const trial = app.makeTrial();
    assert.equal(trial.mode, 0, 'released game generated a future mode');
    assert.equal(trial.nodes.length, 3, 'generated trial lost triadic structure');
    assert.equal(trial.dirs.length, 2, 'generated trial lost dual transitions');
    assert.ok(!/undefined|null/.test(app.renderTrial(trial)), 'generated malformed premise');

    if (target) {
      assert.equal(trial.isMatch, false, 'unexpected match path');
      assert.notEqual(trial.signature, target.signature, 'false non-match');
      const comparison = modeOneInterference.compareLogic(trial, target);
      similarities.push(comparison.similarity);
      highOrder.push(comparison.highOrderDifference ? 1 : 0);
    }
    app.trials.push(trial);
    app.score.shown += 1;
  }
  return {
    averageSimilarity: similarities.reduce((sum, value) => sum + value, 0) / Math.max(1, similarities.length),
    highOrderRate: highOrder.reduce((sum, value) => sum + value, 0) / Math.max(1, highOrder.length)
  };
}

const lowInterference = runNonMatchSequence(0, 11001);
const highInterference = runNonMatchSequence(100, 22002);
assert.ok(
  highInterference.averageSimilarity > lowInterference.averageSimilarity,
  `interference did not increase triadic logical similarity: ${lowInterference.averageSimilarity} -> ${highInterference.averageSimilarity}`
);
assert.ok(highInterference.highOrderRate >= 0.9, `high-order lure rate too low: ${highInterference.highOrderRate}`);

forcedMatchProbability = 1;
resetSequence(100, 33003, 4);
for (let index = 0; index < 500; index += 1) {
  const target = app.trials[app.trials.length - app.n];
  const trial = app.makeTrial();
  if (target) {
    assert.equal(trial.isMatch, true, 'match path was not selected');
    assert.equal(trial.signature, target.signature, 'false match in triadic Mode 1');
    assert.deepEqual(
      modeOneInterference.logicProfile(trial),
      modeOneInterference.logicProfile(target),
      'matched premises differ logically'
    );
  }
  app.trials.push(trial);
}

// Dormant engines remain intact for future release, despite being inaccessible.
for (let mode = 1; mode < 7; mode += 1) {
  const dormant = app.makeBase(mode);
  assert.equal(dormant.mode, mode, `future mode ${mode + 1} engine was removed`);
  assert.ok(dormant.signature, `future mode ${mode + 1} lacks a signature`);
  assert.ok(!/undefined|null/.test(app.renderTrial(dormant)), `future mode ${mode + 1} renders malformed output`);
}

console.log('Triadic Mode 1, release gate, logic interference, accessibility and response-window tests passed.');
