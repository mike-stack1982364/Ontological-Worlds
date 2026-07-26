import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html', 'utf8').replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, '');

function installBrowserStubs(window) {
  window.alert = () => {};
  window.confirm = () => true;
  window.requestAnimationFrame = callback => window.setTimeout(callback, 0);
  window.cancelAnimationFrame = id => window.clearTimeout(id);
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
}

async function boot() {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://ontological-worlds.test/',
    pretendToBeVisual: true
  });
  const { window } = dom;
  installBrowserStubs(window);
  const uncaught = [];
  window.addEventListener('error', event => uncaught.push(event.error || new Error(event.message)));
  window.addEventListener('unhandledrejection', event => uncaught.push(event.reason));

  for (const file of [
    'app.js',
    'mode-one-match-logic.js',
    'mode-one-spatial-core.js',
    'mode-router-v2.js',
    'mode-two-ontology-nback-v14.js',
    'audio-accessibility.js',
    'mode-one-conflict-matrix-v20.js',
    'mode-one-startup-coordinator.js'
  ]) window.eval(fs.readFileSync(file, 'utf8'));

  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await new Promise(resolve => window.setTimeout(resolve, 10));
  return { dom, window, uncaught };
}

function diagnostics(app, premise, uncaught) {
  return JSON.stringify({
    premise: premise.textContent.trim(),
    running: app.running,
    paused: app.paused,
    awaiting: app.awaiting,
    current: Boolean(app.current),
    trialCount: app.trials?.length,
    directionResolution: app.directionResolution,
    coordinatorInstalled: app.__modeOneStartupCoordinatorInstalled,
    conflictInstalled: app.__mandatoryCompassResolutionInstalled,
    trace: app.__modeOneStartupTrace,
    uncaught: uncaught.map(error => error?.stack || error?.message || String(error))
  }, null, 2);
}

async function waitForTrial(window, app, premise, uncaught, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const text = premise.textContent.trim();
    if (text !== 'SYSTEM_READY' && app.current && app.trials?.length === 1 && app.awaiting) return;
    await new Promise(resolve => window.setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for Trial 1.\n${diagnostics(app, premise, uncaught)}`);
}

async function runStartCase(resolution) {
  const { dom, window, uncaught } = await boot();
  const app = window.__ontologicalWorlds;
  assert.ok(app, 'application instance missing');
  assert.equal(app.__mandatoryCompassResolutionInstalled, true, 'final Mode 1 conflict runtime did not install');
  assert.equal(app.__modeOneStartupCoordinatorInstalled, true, 'startup coordinator did not install last');

  const mode = window.document.getElementById('logic-mode');
  const resolutionSelect = window.document.getElementById('direction-resolution');
  const start = window.document.getElementById('start-btn');
  const premise = window.document.getElementById('premise-display');

  mode.value = '0';
  mode.dispatchEvent(new window.Event('change', { bubbles: true }));
  resolutionSelect.value = String(resolution);
  resolutionSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(start.disabled, false, `Start remained disabled for ${resolution}-direction mode`);

  start.click();
  await waitForTrial(window, app, premise, uncaught);

  const text = premise.textContent.trim();
  assert.notEqual(text, 'SYSTEM_READY', `${resolution}-direction startup remained on SYSTEM_READY`);
  assert.ok(!text.startsWith('START_FAILED:'), `${resolution}-direction startup failed: ${text}`);
  assert.equal((text.match(/;/g) || []).length, 2, 'Trial 1 must contain exactly three relational statements');
  assert.ok(app.current, 'Trial 1 was not assigned to app.current');
  assert.equal(app.trials.length, 1, 'Trial 1 was not committed exactly once');
  assert.equal(app.awaiting, true, 'Trial 1 did not enter response state');
  assert.equal(app.running, true, 'session stopped after Trial 1 startup');
  assert.equal(app.current.directionResolution, resolution, 'Trial 1 escaped selected resolution');

  const core = window.__modeOneSpatialCore;
  const pool = core.allowedCodes(resolution);
  const evaluated = core.evaluateTrial(app.current);
  const relations = app.current.premises.map(item => item.relation)
    .concat(app.current.conclusion.relation, evaluated.expectedRelation);
  assert.ok(relations.every(code => pool.includes(code)), 'Trial 1 contains a relation outside selected resolution');
  assert.equal(core.renderTrial(app.current), text, 'visible Trial 1 differs from the canonical conflict-runtime rendering');
  assert.deepEqual(uncaught, [], `uncaught startup errors:\n${diagnostics(app, premise, uncaught)}`);

  app.stop(true);
  assert.equal(app.running, false, 'Stop did not terminate the first session');

  resolutionSelect.value = String(resolution);
  resolutionSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  start.click();
  await waitForTrial(window, app, premise, uncaught);
  assert.notEqual(premise.textContent.trim(), 'SYSTEM_READY', 'restart remained on SYSTEM_READY');
  assert.equal(app.trials.length, 1, 'restart duplicated or omitted Trial 1');
  assert.equal(app.awaiting, true, 'restart did not enter response state');

  dom.window.close();
}

for (const resolution of [4, 8, 16]) await runStartCase(resolution);
console.log('Mode 1 production-stack startup regression passed for 4, 8 and 16 directions.');
