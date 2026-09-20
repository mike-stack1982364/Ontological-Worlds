'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '../..');
const origin = 'https://ontological-worlds.test';

class LocalResources extends ResourceLoader {
  fetch(url) {
    const resource = new URL(url);
    if (resource.origin !== origin) return null;
    const filename = path.resolve(root, '.' + decodeURIComponent(resource.pathname));
    if (!filename.startsWith(root + path.sep)) return null;
    return fs.promises.readFile(filename);
  }
}

async function waitFor(predicate, message = 'condition', timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${message}.`);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

async function loadProductionPage(t) {
  const errors = [];
  const speech = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  virtualConsole.on('error', (...values) => errors.push(values.map(String).join(' ')));
  let clockOffset = 0;
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: origin + '/index.html',
    runScripts: 'dangerously',
    resources: new LocalResources(),
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      const originalNow = window.Date.now.bind(window.Date);
      window.Date.now = () => originalNow() + clockOffset;
      const performanceNow = window.performance.now.bind(window.performance);
      window.performance.now = () => performanceNow() + clockOffset;
      window.SpeechSynthesisUtterance = class {
        constructor(text) { this.text = text; }
      };
      let currentSpeech = null;
      window.speechSynthesis = {
        speaking: false, paused: false,
        getVoices: () => [{ name: 'Test voice', lang: 'en-AU' }],
        cancel() {
          const cancelled = currentSpeech;
          currentSpeech = null;
          this.speaking = false;
          if (cancelled) window.queueMicrotask(() => cancelled.onerror?.({ error: 'canceled' }));
        },
        pause() { this.paused = true; },
        resume() { this.paused = false; },
        speak(utterance) {
          currentSpeech = utterance;
          speech.push(utterance.text);
          this.speaking = true;
          window.queueMicrotask(() => {
            if (currentSpeech !== utterance) return;
            utterance.onstart?.();
            currentSpeech = null;
            this.speaking = false;
            utterance.onend?.();
          });
        }
      };
      window.navigator.vibrate = () => true;
      window.confirm = () => true;
      window.HTMLElement.prototype.scrollIntoView = () => {};
      window.URL.createObjectURL = () => 'blob:test-export';
      window.URL.revokeObjectURL = () => {};
    }
  });
  const { window } = dom;
  if (t) t.after(() => window.close());
  await waitFor(() => window.document.readyState === 'complete', 'production scripts');
  if (window.__modeTwoV22Ready) await window.__modeTwoV22Ready;
  if (window.__modeTwoFinalRuntimeReady) await window.__modeTwoFinalRuntimeReady;
  await new Promise(resolve => setTimeout(resolve, 10));
  const app = window.__ontologicalWorlds;
  const byId = id => window.document.getElementById(id);
  function change(id, value) {
    byId(id).value = String(value);
    byId(id).dispatchEvent(new window.Event('change', { bubbles: true }));
  }
  async function start({ mode = 0, n = 1, resolution = 4 } = {}) {
    change('logic-mode', mode);
    change('n-slider', n);
    change('direction-resolution', resolution);
    const result = app.start();
    if (result?.then) await result;
    await waitFor(() => app.current && !app._starting, 'first production trial');
    return app.current;
  }
  function key(keyValue, options = {}) {
    window.document.body.dispatchEvent(new window.KeyboardEvent('keydown', {
      key: keyValue, code: keyValue === ' ' ? 'Space' : `Key${keyValue.toUpperCase()}`,
      bubbles: true, cancelable: true, ...options
    }));
  }
  return { dom, window, app, byId, errors, speech, start, change, key, waitFor,
    advanceClock(milliseconds) { clockOffset += milliseconds; },
    close: () => window.close() };
}

module.exports = { loadProductionPage, waitFor };
