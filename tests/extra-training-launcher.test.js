'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const launcherSource = fs.readFileSync(path.join(root, 'extra-training.js'), 'utf8');
const trainerHtml = fs.readFileSync(path.join(root, 'extra-training.html'), 'utf8');

assert.ok(indexHtml.includes('<script src="extra-training.js"></script>'),
  'the front page must load the launcher file it names');
assert.ok(indexHtml.includes('id="extra-training-btn"'),
  'the Extra Training launcher must remain present');
assert.ok(trainerHtml.includes('id="start"'),
  'the destination page must expose a playable Start control');
assert.ok(trainerHtml.includes("$('start').onclick=start"),
  'the destination Start control must be wired to the trainer runtime');

const attributes = {};
const assignments = [];
const launcher = {
  onclick: null,
  setAttribute(name, value) { attributes[name] = value; }
};
const context = {
  window: {
    location: {
      assign(value) { assignments.push(value); }
    }
  },
  document: {
    readyState: 'complete',
    getElementById(id) { return id === 'extra-training-btn' ? launcher : null; },
    addEventListener() {}
  }
};

vm.createContext(context);
vm.runInContext(launcherSource, context);

assert.strictEqual(typeof context.window.openExtraTrainingScreenFallback, 'function',
  'the inline fallback named by index.html must be installed');
assert.strictEqual(typeof launcher.onclick, 'function',
  'the launcher must receive a direct click handler');
assert.strictEqual(attributes['aria-label'],
  'Open dedicated Ordered Number N-back training screen');

const event = {
  prevented: false,
  stopped: false,
  preventDefault() { this.prevented = true; },
  stopPropagation() { this.stopped = true; }
};
launcher.onclick(event);

assert.strictEqual(event.prevented, true);
assert.strictEqual(event.stopped, true);
assert.deepStrictEqual(assignments, ['extra-training.html']);
assert.strictEqual(context.window.__extraTrainingLauncher.dependencyIndependent, true);

console.log(JSON.stringify({
  passed: true,
  destination: assignments[0],
  playableTargetVerified: true
}, null, 2));
