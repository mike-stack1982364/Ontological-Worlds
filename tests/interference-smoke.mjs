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
  'mode-one-match-logic.js',
  'mode-one-spatial-core.js',
  'mode-router-v2.js',
  'audio-accessibility.js'
]) window.eval(fs.readFileSync(file, 'utf8'));

window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 0));

const app = window.__ontologicalWorlds;
const ontology = window.__ontologyTestAPI;
const legacyInterference = window.__interferenceTestAPI;
const modeTwoInterference = window.__modeOneInterferenceTestAPI;
const legacyTriadic = window.__modeOneTriadicTestAPI;
const modeOne = window.__modeOneTriadicEntailmentTestAPI;
const releaseGate = window.__modeReleaseTestAPI;
const audioOnlyDisplay = window.__audioOnlyDisplayTestAPI;
const responseWindow = window.__responseWindowTestAPI;

assert.ok(app, 'application instance missing');
assert.equal(ontology?.selfTestPassed, true, 'ontology self-test failed');
assert.equal(legacyInterference?.selfTestPassed, true, 'dormant-mode interference self-test failed');
assert.equal(modeTwoInterference?.selfTestPassed, true, 'preserved Ontological Integration interference self-test failed');
assert.equal(modeTwoInterference?.symbolsDriveInterference, false, 'symbols drive preserved ontology interference');
assert.equal(modeTwoInterference?.premiseLogicDrivesInterference, true, 'premise logic is not the preserved interference engine');
assert.equal(legacyTriadic?.selfTestPassed, true, 'preserved triadic ontology self-test failed');
assert.equal(modeOne?.selfTestPassed, true, 'Triadic Entailment self-test failed');
assert.equal(modeOne?.lettersDriveRelationalComputation, true, 'letters do not bind the Mode 1 graph');
assert.equal(modeOne?.modelSetEvaluation, false, 'Mode 1 still varies invisible model-set contracts');
assert.equal(modeOne?.visibleContract, false, 'Mode 1 exposes a contract in the player-facing trial');
assert.equal(modeOne?.fixedLogicalRegime, 'EXACT_16');
assert.deepEqual(Array.from(modeOne?.directionalResolutions || []), [16]);

const modeSelect = window.document.getElementById('logic-mode');
assert.equal(Array.from(releaseGate?.selectableModes || []).join(','), '0,1', 'Modes 1 and 2 are not both selectable');
assert.equal(releaseGate?.futureModesDisabled, true, 'future modes are not disabled');
assert.equal([...modeSelect.options].filter(option => !option.disabled).length, 2, 'incorrect number of selectable modes');
for (const option of [...modeSelect.options].slice(2)) {
  assert.equal(option.disabled, true, `${option.value} remains clickable`);
  assert.ok(option.textContent.includes('Released in future'), `${option.value} lacks release wording`);
}
modeSelect.value = '6';
modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(modeSelect.value, '0', 'future-mode selection was not rejected');
assert.equal(app.settings().mode, 0, 'runtime escaped the public mode gate');

assert.equal(audioOnlyDisplay?.blurControlRemoved, true, 'blur behaviour remains');
assert.equal(audioOnlyDisplay?.legacyControlHidden, true, 'legacy blur input is visible');
assert.equal(audioOnlyDisplay?.settingsExcludeHideText, true, 'hideText remains active');
const audioOnly = window.document.getElementById('audio-only');
const legacyHideText = window.document.getElementById('hide-text');
const premiseDisplay = window.document.getElementById('premise-display');
assert.equal(legacyHideText.hidden, true);
assert.equal(legacyHideText.closest('label'), null);
assert.equal(Object.prototype.hasOwnProperty.call(app.settings(), 'hideText'), false);
audioOnly.checked = false;
app.applyPremiseVisibility();
assert.equal(premiseDisplay.classList.contains('hidden-mode'), false);
audioOnly.checked = true;
app.applyPremiseVisibility();
assert.equal(premiseDisplay.classList.contains('hidden-mode'), true);
audioOnly.checked = false;
app.applyPremiseVisibility();

const responseSlider = window.document.getElementById('spt-slider');
const responseLabel = window.document.getElementById('spt-val');
assert.equal(responseWindow?.maxSeconds, 300);
responseSlider.value = '300';
responseSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
assert.equal(app.settings().seconds, 300);
assert.equal(responseLabel.textContent, '5:00');

function chooseMode(value) {
  modeSelect.value = String(value);
  modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(app.settings().mode, value);
}

chooseMode(0);
const interferenceSlider = window.document.getElementById('interference-slider');
interferenceSlider.value = '100';
interferenceSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
app.rng.s = 442211;
const templates = new Set();
const distinctions = new Set();
for (let index = 0; index < 500; index += 1) {
  const trial = app.makeBase(0);
  assert.equal(trial.mode, 0);
  assert.equal(trial.premises.length, 2);
  assert.equal(new Set(trial.letters).size, 3);
  assert.ok(trial.conclusion?.subject && trial.conclusion?.relation && trial.conclusion?.object);
  assert.equal(trial.contractId, 'EXACT_16');
  assert.equal(modeOne.evaluateTrial(trial).isEntailed, trial.isMatch);
  const rendered = app.renderTrial(trial);
  assert.equal((rendered.match(/;/g) || []).length, 2, 'Mode 1 lacks exactly three relational statements');
  assert.ok(!/^Contract:/i.test(rendered), 'logical contract leaked into the player-facing trial');
  assert.ok(!/therefore/i.test(rendered), 'therefore entered the trial');
  assert.ok(!/undefined|null/.test(rendered), 'malformed Triadic Entailment trial');
  templates.add(trial.templateId);
  distinctions.add(trial.distinctionClass);
}
assert.equal(templates.size, 10, 'not all approved relational structures are generated');
assert.ok(distinctions.has('exact-entailment'));
assert.ok(modeOne.exhaustiveAudit.distinctions.includes('wrong-letter-pair'));
assert.ok(modeOne.exhaustiveAudit.distinctions.includes('adjacent-resolution-substitution'));
assert.ok(modeOne.exhaustiveAudit.distinctions.includes('subject-object-reversal'));

for (let index = 0; index < 100; index += 1) {
  assert.equal(modeOne.generateTrial(app.rng, { matchProbability: 0, interferenceLevel: 100 }).isMatch, false);
  assert.equal(modeOne.generateTrial(app.rng, { matchProbability: 1, interferenceLevel: 100 }).isMatch, true);
}

const canonical = modeOne.canonicalTrials();
assert.equal(canonical.length, 10);
canonical.forEach((trial, index) => {
  assert.equal(modeOne.evaluateTrial(trial).isEntailed, trial.expected, `canonical trial ${index + 1} failed`);
  assert.equal((modeOne.renderTrial(trial).match(/;/g) || []).length, 2);
  assert.ok(!/contract:|therefore/i.test(modeOne.renderTrial(trial)));
});

chooseMode(1);
assert.equal(window.document.getElementById('n-slider').disabled, false, 'Mode 2 N-back control remains disabled');
app.rng.s = 90210;
const categories = new Set();
const forms = new Set();
for (let index = 0; index < 500; index += 1) {
  const trial = app.makeBase(1);
  assert.equal(trial.mode, 1);
  assert.equal(trial.nodes.length, 3);
  assert.equal(trial.dirs.length, 2);
  assert.equal(trial.transformationCount, 3);
  assert.notEqual(trial.dirs[0], trial.dirs[1]);
  assert.equal(new Set(trial.nodes.map(node => node.symbol)).size, 3);
  assert.ok(trial.leftRelationCategory && trial.rightRelationCategory);
  assert.ok(trial.nodeSynthesisCategory && trial.relationSynthesisCategory);
  assert.ok(trial.integratedCategory && trial.integratedForm);
  assert.ok(!/undefined|null/.test(app.renderTrial(trial)));
  trial.nodes.forEach(node => { categories.add(node.categoryId); forms.add(node.form); });
}
assert.equal(categories.size, 9, 'not all ontologies appear in Mode 2');
assert.equal(forms.size, 3, 'not all forms appear in Mode 2');

const probabilitySlider = window.document.getElementById('prob-slider');
probabilitySlider.value = '35';
probabilitySlider.dispatchEvent(new window.Event('input', { bubbles: true }));
app.n = 1;
app.trials = [];
let modeTwoMatches = 0;
let modeTwoNonMatches = 0;
for (let index = 0; index < 200; index += 1) {
  const target = app.trials[app.trials.length - app.n];
  const trial = app.makeTrial();
  if (target) {
    const recomputed = app.matchSignature(trial, 1) === app.matchSignature(target, 1);
    assert.equal(trial.isMatch, recomputed, 'Mode 2 answer disagrees with its derived match identity');
    if (trial.isMatch) modeTwoMatches += 1;
    else modeTwoNonMatches += 1;
  }
  app.trials.push(trial);
}
assert.ok(modeTwoMatches > 0, 'Mode 2 generated no matches');
assert.ok(modeTwoNonMatches > 0, 'Mode 2 generated no non-matches');

console.log('Triadic Entailment, Ontological Integration, release gate, accessibility and response-window tests passed.');
window.close();
