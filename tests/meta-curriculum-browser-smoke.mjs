import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html', 'utf8').replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '');
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://ontological-worlds-v11.test/' });
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
  'mode-one-approved-trials-v7.js',
  'mode-one-nback-v8.js',
  'mode-one-nback-v9.js',
  'mode-one-nback-v10.js',
  'mode-one-nback-v11.js',
  'mode-router-v2.js',
  'mode-one-completion-v10.js',
  'mode-one-completion-v11.js',
  'audio-accessibility.js'
]) window.eval(fs.readFileSync(file, 'utf8'));

window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 0));

const app = window.__ontologicalWorlds;
const core = window.__modeOneTriadicEntailmentCore;
const api = window.__modeOneTriadicEntailmentTestAPI;
const completion = window.__modeOneCompletionTestAPI;
assert.ok(app);
assert.ok(core);
assert.equal(core.nBackRuntime, 'level-specific-160-archetype-meta-nback-v11');
assert.equal(api?.nBackRuntime, 'level-specific-160-archetype-meta-nback-v11');
assert.equal(api?.implementationCoveragePercent, 100);
assert.equal(api?.canonicalComparisonCount, 160);
assert.equal(api?.matches, 80);
assert.equal(api?.nonMatches, 80);
assert.equal(api?.criterionRegulationImplemented, true);
assert.equal(api?.proofSpaceComparisonImplemented, true);
assert.equal(api?.ruleRevisionImplemented, true);
assert.equal(api?.letteringIdentityIgnored, true);
assert.equal(api?.visibleContractText, false);
assert.equal(api?.separatePostResponseExplanation, true);
assert.equal(completion?.passed, true);
assert.deepEqual(JSON.parse(JSON.stringify(completion?.examplesPerLevel)), {
  1: 20, 2: 20, 3: 20, 4: 20, 5: 20, 6: 20, 7: 20, 8: 20
});

const modeSelect = window.document.getElementById('logic-mode');
const nSlider = window.document.getElementById('n-slider');
const interference = window.document.getElementById('interference-slider');
modeSelect.value = '0';
modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
interference.value = '100';
interference.dispatchEvent(new window.Event('input', { bubbles: true }));

for (let level = 1; level <= 8; level += 1) {
  const curriculum = core.nBackLevelCurriculum(level);
  assert.equal(curriculum.length, 20);
  assert.equal(new Set(curriculum.map(item => `${item.targetProfile}|${item.currentProfile}|${item.policy}|${item.relation}`)).size, 20);

  nSlider.value = String(level);
  nSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
  app.n = level;
  app.trials = [];

  for (let index = 0; index < level; index += 1) {
    const warmup = app.makeTrial();
    assert.equal(warmup.nBackLevel, level);
    assert.equal(warmup.scored, false);
    assert.equal(warmup.curriculumLevel, level);
    assert.equal(warmup.curriculumSource, 'approved-160-case-meta-matrix');
    assert.ok(warmup.curriculumArchetypeId);
    const rendered = app.renderTrial(warmup);
    assert.equal((rendered.match(/;/g) || []).length, 2);
    assert.ok(!/contract\s*:|therefore/i.test(rendered));
    app.trials.push(warmup);
  }

  for (let index = 0; index < 32; index += 1) {
    const target = app.trials[app.trials.length - level];
    const trial = app.makeTrial();
    assert.equal(trial.nBackLevel, level);
    assert.equal(trial.scored, true);
    assert.equal(trial.curriculumLevel, level);
    assert.equal(trial.nBackTargetSignature, core.nBackLogicSignature(target));
    assert.equal(trial.nBackMatch, core.nBackEquivalent(target, trial));
    assert.ok(trial.letters.every(letter => !target.letters.includes(letter)));
    const rendered = app.renderTrial(trial);
    assert.equal((rendered.match(/;/g) || []).length, 2);
    assert.ok(!/contract\s*:|therefore/i.test(rendered));
    app.trials.push(trial);
  }
}

const semantic = core.instantiateNBackArchetype('6.11', app.rng, { interferenceLevel: 100 });
assert.equal(semantic.current.nBackMatch, true);
const proof = core.instantiateNBackArchetype('6.12', app.rng, { interferenceLevel: 100 });
assert.equal(proof.current.nBackMatch, false);
const revision = core.instantiateNBackArchetype('8.12', app.rng, { interferenceLevel: 100 });
assert.equal(revision.current.nBackMatch, false);

modeSelect.value = '1';
modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
const ontologyTrial = app.makeBase(1);
assert.equal(ontologyTrial.mode, 1);
assert.equal(ontologyTrial.nodes.length, 3);
assert.ok(ontologyTrial.integratedCategory);
assert.ok(ontologyTrial.integratedForm);

console.log('Level-specific 160-case Triadic Entailment meta-curriculum passed.');
window.close();
