"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function setup() {
  const classes = new Set(["hidden-mode"]);
  const attributes = new Map();
  const premise = {
    classList: {
      remove(...names) { names.forEach(name => classes.delete(name)); },
      add(...names) { names.forEach(name => classes.add(name)); }
    },
    setAttribute(name, value) { attributes.set(name, value); }
  };
  const callbacks = new Map();
  let timerId = 0;
  const setTimer = (callback, repeat, delay) => {
    const id = ++timerId;
    callbacks.set(id, { callback, repeat, delay });
    return id;
  };
  const utterances = [];
  const settings = { volume: 0.7, rate: 0.85, audioOnly: true };
  const app = {
    running: true,
    paused: false,
    sessionToken: 1,
    settings: () => settings,
    synth: {
      resume() {}, cancel() {}, getVoices: () => [],
      speak(utterance) { utterances.push(utterance); }
    },
    applyPremiseVisibility() { if (settings.audioOnly) premise.classList.add("hidden-mode"); },
    duckDelta() {},
    stop() { this.running = false; this.sessionToken++; }
  };
  const window = {
    __ontologicalWorlds: app,
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    addEventListener(_, callback) { callback(); }
  };
  const context = vm.createContext({
    window,
    document: { getElementById: () => premise },
    setTimeout: (callback, delay) => setTimer(callback, false, delay),
    setInterval: (callback, delay) => setTimer(callback, true, delay),
    clearTimeout: id => callbacks.delete(id),
    clearInterval: id => callbacks.delete(id)
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "audio-accessibility.js"), "utf8"), context);
  const fire = repeat => {
    for (const [id, timer] of [...callbacks]) {
      if (timer.repeat !== repeat) continue;
      if (!repeat) callbacks.delete(id);
      timer.callback();
    }
  };
  return { app, window, classes, attributes, settings, callbacks, utterances, fire };
}

test("superseded speech resolves without letting late events interrupt the next premise", async () => {
  const { app, utterances, callbacks } = setup();
  const first = app.speak("First premise");
  const firstUtterance = utterances[0];
  const second = app.speak("Second premise");
  assert.equal(await first, false);
  firstUtterance.onend();
  assert.equal(app._speakInProgress, true);
  utterances[1].onend();
  assert.equal(await second, true);
  assert.equal(app._speakInProgress, false);
  assert.equal(callbacks.size, 0);
});

test("a failed or unavailable voice exposes text in audio-only sessions", async () => {
  const { app, settings, classes, attributes, utterances } = setup();
  const speech = app.speak("Visible on failure");
  utterances[0].onerror();
  assert.equal(await speech, false);
  assert.equal(classes.has("hidden-mode"), false);
  assert.equal(attributes.get("aria-hidden"), "false");
  settings.volume = 0;
  assert.equal(await app.speak("Muted fallback"), false);
  assert.equal(classes.has("hidden-mode"), false);
  assert.equal(utterances.length, 1);
});

test("pause, stop and expired session tokens release pending speech promises", async () => {
  for (const action of ["pause", "stop", "token"]) {
    const { app, callbacks, fire } = setup();
    const speech = app.speak("Session premise");
    if (action === "pause") app.paused = true;
    if (action === "stop") app.stop(true);
    if (action === "token") app.sessionToken++;
    fire(true);
    assert.equal(await speech, false, action);
    assert.equal(callbacks.size, 0, action);
  }
});

test("a voice that never emits completion falls back instead of stranding the response phase", async () => {
  const { app, classes, callbacks, fire } = setup();
  const speech = app.speak("A stalled voice");
  fire(false);
  assert.equal(await speech, false);
  assert.equal(classes.has("hidden-mode"), false);
  assert.equal(callbacks.size, 0);
});

test("slow nested-world speech is allowed to finish beyond ninety seconds", async () => {
  const { app, settings, callbacks, utterances } = setup();
  settings.rate = 0.4;
  const speech = app.speak(new Array(240).fill("projection").join(" "));
  const watchdog = [...callbacks.values()].find(timer => !timer.repeat);
  assert.ok(watchdog.delay > 240 / settings.rate * 700,
    "the safety timeout must exceed the estimated full speech duration");
  utterances[0].onend();
  assert.equal(await speech, true);
  assert.equal(callbacks.size, 0);
});

test("one continuous utterance reads every relation without visual role labels", async () => {
  const { app, utterances } = setup();
  const speech = app.speak('Premise 1: A is north of B.\nPremise 2: B is east of C.\nCandidate: A is northeast of C.');
  assert.equal(utterances.length, 1);
  assert.equal(utterances[0].text, 'A is north of B.\nB is east of C.\nA is northeast of C.');
  assert.equal(utterances[0].pitch, 1);
  utterances[0].onend(); await speech;
});

test("speech mutes background while queued and stale callbacks cannot restore it", async () => {
  const { app, utterances } = setup();
  const gains = [];
  app.duckDelta = function(duck) { gains.push(duck || this._speakInProgress ? 0 : 1); };
  const first = app.speak('A is north of B.');
  assert.equal(gains.at(-1), 0);
  const second = app.speak('C is west of D.');
  assert.equal(await first, false);
  assert.equal(gains.at(-1), 0);
  utterances[0].onstart(); utterances[0].onend();
  assert.equal(gains.at(-1), 0);
  utterances[1].onend(); await second;
  assert.equal(gains.at(-1), 1);
});
