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

for (const file of ['app.js', 'audio-only-display.js', 'response-window.js', 'ontology-integration-v4.js', 'cognitive-interference-v3.js', 'audio-accessibility.js']) {
  window.eval(fs.readFileSync(file, 'utf8'));
}
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 0));

const app = window.__ontologicalWorlds;
const ontology = window.__ontologyTestAPI;
const interference = window.__interferenceTestAPI;
const audioOnlyDisplay = window.__audioOnlyDisplayTestAPI;
const responseWindow = window.__responseWindowTestAPI;
assert.ok(app, 'application instance missing');
assert.equal(ontology?.selfTestPassed, true, 'ontology self-test failed');
assert.equal(interference?.selfTestPassed, true, 'interference self-test failed');
assert.equal(interference?.symbolsDriveInterference, false, 'symbols must not drive interference');
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

responseSlider.value = '60.5';
responseSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
assert.equal(responseLabel.textContent, '1:00.5', 'sub-second precision above one minute was lost');
assert.equal(responseSlider.getAttribute('aria-valuetext'), '1 minute and 0.5 seconds', 'accessible duration formatting is incorrect');

responseSlider.value = '300';
responseSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
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

const modeSelect = window.document.getElementById('logic-mode');
const interferenceSlider = window.document.getElementById('interference-slider');
let forcedMatchProbability = 0;
const runtimeSettings = app.settings.bind(app);
app.settings = function deterministicTestSettings() {
  return { ...runtimeSettings(), matchProbability: forcedMatchProbability };
};

function resetMode(mode, level, seed) {
  modeSelect.value = String(mode);
  interferenceSlider.value = String(level);
  interferenceSlider.dispatchEvent(new window.Event('input'));
  app.rng.s = seed >>> 0;
  app.trials = [];
  app.inventionMemory.clear();
  app.categoryDeck = [];
  app.formDeck = [];
  app.turnDeck = [];
  app.n = 3;
  app.score.shown = 0;
}

function renamedLogicalClone(trial) {
  const copy = JSON.parse(JSON.stringify(trial));
  const replacements = ['X', 'Y', 'Z', 'Q'];
  copy.nodes.forEach((node, index) => {
    if (!node.memory) node.symbol = replacements[index];
  });
  copy.symbols = copy.nodes.map(node => node.symbol);
  app.deriveTrial(copy);
  return copy;
}

function runNonMatchSequence(mode, level, seed, count = 450) {
  forcedMatchProbability = 0;
  resetMode(mode, level, seed);
  const similarities = [];
  const highOrder = [];
  for (let index = 0; index < count; index += 1) {
    const target = app.trials[app.trials.length - app.n];
    const trial = app.makeTrial();
    assert.ok(trial.signature, `missing signature in mode ${mode}`);
    assert.ok(!/undefined|null/.test(app.renderTrial(trial)), `malformed premise in mode ${mode}`);

    if (target) {
      assert.equal(trial.isMatch, false, `unexpected match path in mode ${mode}`);
      assert.notEqual(trial.signature, target.signature, `false non-match in mode ${mode}`);
      const comparison = interference.compareLogic(trial, target);
      similarities.push(comparison.similarity);
      highOrder.push(comparison.highOrderDifference ? 1 : 0);
      assert.deepEqual(
        interference.logicProfile(trial),
        interference.logicProfile(renamedLogicalClone(trial)),
        `surface symbols entered logic profile in mode ${mode}`
      );
    }

    if (mode >= 5) {
      const reserved = new Set(app.inventionMemory.keys());
      for (const node of trial.nodes) {
        if (!node.memory) assert.equal(reserved.has(node.symbol), false, 'plain node reused an invention identifier');
      }
    }

    app.trials.push(trial);
    app.score.shown += 1;
  }
  return {
    averageSimilarity: similarities.reduce((sum, value) => sum + value, 0) / Math.max(1, similarities.length),
    highOrderRate: highOrder.reduce((sum, value) => sum + value, 0) / Math.max(1, highOrder.length)
  };
}

for (let mode = 0; mode < 7; mode += 1) {
  const low = runNonMatchSequence(mode, 0, 1000 + mode);
  const high = runNonMatchSequence(mode, 100, 2000 + mode);
  assert.ok(
    high.averageSimilarity > low.averageSimilarity,
    `interference did not increase logical lure similarity in mode ${mode}: ${low.averageSimilarity} -> ${high.averageSimilarity}`
  );
  if (mode >= 2) {
    assert.ok(high.highOrderRate >= 0.7, `high-order lure rate too low in mode ${mode}: ${high.highOrderRate}`);
  }
}

forcedMatchProbability = 1;
for (let mode = 0; mode < 7; mode += 1) {
  resetMode(mode, 100, 3000 + mode);
  for (let index = 0; index < 40; index += 1) {
    const target = app.trials[app.trials.length - app.n];
    const trial = app.makeTrial();
    if (target) {
      assert.equal(trial.isMatch, true, `match path not selected in mode ${mode}`);
      assert.equal(trial.signature, target.signature, `false match in mode ${mode}`);
    }
    app.trials.push(trial);
  }
}

console.log('Logic-engineered cognitive interference, audio-only visibility and five-minute response-window tests passed.');
