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

for (const file of [
  'app.js',
  'mode-release-gate.js',
  'audio-only-display.js',
  'response-window.js',
  'ontology-integration-v4.js',
  'cognitive-interference-v3.js',
  'mode-one-triadic.js',
  'mode-one-interference.js',
  'audio-accessibility.js'
]) window.eval(fs.readFileSync(file, 'utf8'));

window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 0));

const app = window.__ontologicalWorlds;
const ontology = window.__ontologyTestAPI;
const legacyInterference = window.__interferenceTestAPI;
const modeOneInterference = window.__modeOneInterferenceTestAPI;
const triadic = window.__modeOneTriadicTestAPI;
const releaseGate = window.__modeReleaseTestAPI;
const audioOnlyDisplay = window.__audioOnlyDisplayTestAPI;
const responseWindow = window.__responseWindowTestAPI;

assert.ok(app, 'application instance missing');
assert.equal(ontology?.selfTestPassed, true, 'ontology self-test failed');
assert.equal(legacyInterference?.selfTestPassed, true, 'dormant-mode interference self-test failed');
assert.equal(modeOneInterference?.selfTestPassed, true, 'Mode 1 interference self-test failed');
assert.equal(modeOneInterference?.symbolsDriveInterference, false, 'symbols drive Mode 1 interference');
assert.equal(modeOneInterference?.premiseLogicDrivesInterference, true, 'premise logic is not the interference engine');
assert.equal(triadic?.selfTestPassed, true, 'triadic Mode 1 self-test failed');
assert.equal(triadic?.nodeCount, 3, 'Mode 1 does not contain three symbols');
assert.equal(triadic?.transformedSymbolCount, 3, 'Mode 1 does not contain three symbol transformations');

const modeSelect = window.document.getElementById('logic-mode');
assert.equal(Array.from(releaseGate?.selectableModes || []).join(','), '0', 'more than Mode 1 is selectable');
assert.equal(releaseGate?.futureModesDisabled, true, 'future modes are not disabled');
assert.equal(app.settings().mode, 0, 'release gate did not force Mode 1');
assert.equal([...modeSelect.options].filter(option => !option.disabled).length, 1, 'multiple modes remain clickable');
for (const option of [...modeSelect.options].slice(1)) {
  assert.equal(option.disabled, true, `${option.value} remains clickable`);
  assert.ok(option.textContent.includes('Released in future'), `${option.value} lacks release wording`);
}
modeSelect.value = '6';
modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(modeSelect.value, '0', 'future-mode selection was not rejected');
assert.equal(app.settings().mode, 0, 'runtime escaped the Mode 1 release gate');

assert.equal(audioOnlyDisplay?.blurControlRemoved, true, 'blur behaviour remains');
assert.equal(audioOnlyDisplay?.legacyControlHidden, true, 'legacy blur input is visible');
assert.equal(audioOnlyDisplay?.settingsExcludeHideText, true, 'hideText remains active');
assert.equal(window.document.body.textContent.includes('Blur visible premise'), false, 'blur control remains user-facing');
const audioOnly = window.document.getElementById('audio-only');
const legacyHideText = window.document.getElementById('hide-text');
const premiseDisplay = window.document.getElementById('premise-display');
assert.equal(legacyHideText.hidden, true);
assert.equal(legacyHideText.closest('label'), null);
assert.equal(Object.prototype.hasOwnProperty.call(app.settings(), 'hideText'), false);
audioOnly.checked = false;
app.applyPremiseVisibility();
assert.equal(premiseDisplay.classList.contains('hidden-mode'), false);
assert.equal(premiseDisplay.classList.contains('muted'), false);
audioOnly.checked = true;
app.applyPremiseVisibility();
assert.equal(premiseDisplay.classList.contains('hidden-mode'), true);
assert.equal(premiseDisplay.classList.contains('muted'), false);
audioOnly.checked = false;
app.applyPremiseVisibility();

const responseSlider = window.document.getElementById('spt-slider');
const responseLabel = window.document.getElementById('spt-val');
assert.equal(responseWindow?.maxSeconds, 300);
assert.equal(responseSlider.max, '300');
assert.equal(responseSlider.step, '0.5');
responseSlider.value = '300';
responseSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
assert.equal(app.settings().seconds, 300);
assert.equal(responseLabel.textContent, '5:00');
assert.equal(responseSlider.getAttribute('aria-valuetext'), '5 minutes');

const originalSetTimeout = window.setTimeout;
let scheduledMs = null;
window.setTimeout = (_callback, milliseconds) => { scheduledMs = milliseconds; return 999; };
app.running = true;
app.paused = false;
app.current = { _answered: false };
app.awaiting = false;
app._openResponseWindow(app.settings().seconds * 1000);
assert.equal(scheduledMs, 300000, 'five-minute deadline was not scheduled precisely');
window.setTimeout = originalSetTimeout;
app.running = false;
app.awaiting = false;
app.current = null;
clearTimeout(app.timerId);
app.timerId = null;

function renamedClone(trial) {
  const copy = JSON.parse(JSON.stringify(trial));
  ['X', 'Y', 'Z'].forEach((symbol, index) => { copy.nodes[index].symbol = symbol; });
  copy.symbols = copy.nodes.map(node => node.symbol);
  app.deriveTrial(copy);
  return copy;
}

app.rng.s = 442211;
const categories = new Set();
const forms = new Set();
for (let index = 0; index < 3000; index += 1) {
  const trial = app.makeBase(0);
  assert.equal(trial.nodes.length, 3);
  assert.equal(trial.dirs.length, 2);
  assert.equal(trial.transformationCount, 3);
  assert.notEqual(trial.dirs[0], trial.dirs[1]);
  assert.equal(new Set(trial.nodes.map(node => node.symbol)).size, 3);
  assert.ok(trial.leftRelationCategory && trial.rightRelationCategory);
  assert.ok(trial.nodeSynthesisCategory && trial.relationSynthesisCategory);
  assert.ok(trial.integratedCategory && trial.integratedForm);
  const rendered = app.renderTrial(trial);
  assert.equal((rendered.match(/;/g) || []).length, 2, 'premise lacks three auditory clauses');
  assert.ok(!/undefined|null|Archetypal|connects|constrains/i.test(rendered), 'malformed premise');
  assert.deepEqual(modeOneInterference.logicProfile(trial), modeOneInterference.logicProfile(renamedClone(trial)));
  trial.nodes.forEach(node => { categories.add(node.categoryId); forms.add(node.form); });
}
assert.equal(categories.size, 9, 'not all ontologies appear');
assert.equal(forms.size, 3, 'not all forms appear');

const interferenceSlider = window.document.getElementById('interference-slider');
let forcedMatchProbability = 0;
const runtimeSettings = app.settings.bind(app);
app.settings = function deterministicSettings() {
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

function runNonMatches(level, seed, count = 900) {
  forcedMatchProbability = 0;
  resetSequence(level, seed);
  const similarities = [];
  const highOrder = [];
  for (let index = 0; index < count; index += 1) {
    const target = app.trials[app.trials.length - app.n];
    const trial = app.makeTrial();
    assert.equal(trial.mode, 0);
    assert.equal(trial.nodes.length, 3);
    assert.equal(trial.dirs.length, 2);
    assert.ok(!/undefined|null/.test(app.renderTrial(trial)));
    if (target) {
      assert.equal(trial.isMatch, false);
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

const low = runNonMatches(0, 11001);
const high = runNonMatches(100, 22002);
assert.ok(high.averageSimilarity > low.averageSimilarity, `${low.averageSimilarity} -> ${high.averageSimilarity}`);
assert.ok(high.highOrderRate >= 0.9, `high-order lure rate ${high.highOrderRate}`);

forcedMatchProbability = 1;
resetSequence(100, 33003, 4);
for (let index = 0; index < 500; index += 1) {
  const target = app.trials[app.trials.length - app.n];
  const trial = app.makeTrial();
  if (target) {
    assert.equal(trial.isMatch, true);
    assert.equal(trial.signature, target.signature, 'false match');
    assert.deepEqual(modeOneInterference.logicProfile(trial), modeOneInterference.logicProfile(target));
  }
  app.trials.push(trial);
}

for (let mode = 1; mode < 7; mode += 1) {
  const dormant = app.makeBase(mode);
  assert.equal(dormant.mode, mode, `future mode ${mode + 1} engine removed`);
  assert.ok(dormant.signature);
  assert.ok(!/undefined|null/.test(app.renderTrial(dormant)));
}

console.log('Triadic Mode 1, release gate, logic interference, accessibility and response-window tests passed.');
