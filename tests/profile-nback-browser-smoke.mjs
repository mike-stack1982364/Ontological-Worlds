import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html', 'utf8').replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '');
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://ontological-worlds-v9.test/' });
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
  'mode-router-v2.js',
  'audio-accessibility.js'
]) window.eval(fs.readFileSync(file, 'utf8'));

window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 0));

const app = window.__ontologicalWorlds;
const core = window.__modeOneTriadicEntailmentCore;
const api = window.__modeOneTriadicEntailmentTestAPI;
assert.ok(app);
assert.ok(core);
assert.equal(core.nBackRuntime, 'complete-logical-profile-nback-v9');
assert.equal(api?.nBackRuntime, 'complete-logical-profile-nback-v9');
assert.equal(core.canonicalNBackComparisons().length, 80);
assert.deepEqual(Array.from(core.nBackLevels), [1, 2, 3, 4, 5, 6, 7, 8]);

const modeSelect = window.document.getElementById('logic-mode');
const nSlider = window.document.getElementById('n-slider');
assert.equal([...modeSelect.options].filter(option => !option.disabled).length, 2);
assert.equal(nSlider.min, '1');
assert.equal(nSlider.max, '8');

modeSelect.value = '0';
modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
const interference = window.document.getElementById('interference-slider');
interference.value = '100';
interference.dispatchEvent(new window.Event('input', { bubbles: true }));

for (let level = 1; level <= 8; level += 1) {
  nSlider.value = String(level);
  nSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
  app.n = level;
  app.trials = [];

  for (let index = 0; index < level; index += 1) {
    const warmup = app.makeTrial();
    assert.equal(warmup.nBackLevel, level);
    assert.equal(warmup.scored, false);
    assert.ok(warmup.logicProfileId);
    assert.ok(warmup.logicalContract?.id);
    const rendered = app.renderTrial(warmup);
    assert.equal((rendered.match(/;/g) || []).length, 2);
    assert.ok(!/contract\s*:|therefore/i.test(rendered));
    app.trials.push(warmup);
  }

  const target = app.trials[app.trials.length - level];
  for (let index = 0; index < 24; index += 1) {
    const requestedMatch = index % 2 === 0;
    const trial = core.generateNBackTrial(app.rng, target, {
      match: requestedMatch,
      nBackLevel: level,
      interferenceLevel: 100
    });
    assert.equal(trial.nBackMatch, requestedMatch);
    assert.equal(core.nBackEquivalent(trial, target), requestedMatch);
    assert.equal(trial.withinTrialEntailed, trial.logicProfile.expected);
    assert.ok(trial.letters.every(letter => !target.letters.includes(letter)));
    assert.ok(!/contract\s*:|therefore/i.test(app.renderTrial(trial)));
  }
}

modeSelect.value = '1';
modeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
const ontologyTrial = app.makeBase(1);
assert.equal(ontologyTrial.mode, 1);
assert.equal(ontologyTrial.nodes.length, 3);
assert.ok(ontologyTrial.integratedCategory);
assert.ok(ontologyTrial.integratedForm);

console.log('Complete-profile Triadic Entailment N-back 1–8 browser smoke test passed.');
window.close();