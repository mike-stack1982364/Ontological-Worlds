"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs
  .readFileSync(path.join(root, "index.html"), "utf8")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const historyKey = "ontological_worlds_history_v2";

async function setup(settings) {
  const dom = new JSDOM(html, {
    url: "https://trainer.example/",
    runScripts: "outside-only",
  });
  const window = dom.window;
  await new Promise((resolve) =>
    window.addEventListener("load", resolve, { once: true }),
  );
  let now = 1000000;
  let nextId = 0;
  const timers = new Map();
  const schedule = (callback, delay, repeat) => {
    const id = ++nextId;
    timers.set(id, {
      callback,
      due: now + Number(delay),
      delay: Number(delay),
      repeat,
    });
    return id;
  };
  window.Date.now = () => now;
  window.setTimeout = (callback, delay = 0) => schedule(callback, delay, false);
  window.setInterval = (callback, delay) => schedule(callback, delay, true);
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  if (settings)
    window.localStorage.setItem(
      "ontological_worlds_settings_v2",
      JSON.stringify(settings),
    );
  window.eval(source);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  const app = window.__ontologicalWorlds;
  app.syncDelta = () => {};
  app.stopDelta = () => {};
  const advance = async (duration) => {
    const end = now + duration;
    while (true) {
      const next = [...timers.entries()]
        .filter(([, item]) => item.due <= end)
        .sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      const [id, item] = next;
      now = item.due;
      if (item.repeat) item.due += item.delay;
      else timers.delete(id);
      item.callback();
      await Promise.resolve();
      await Promise.resolve();
    }
    now = end;
    await Promise.resolve();
  };
  return {
    dom,
    window,
    app,
    advance,
    get now() {
      return now;
    },
  };
}

test("legacy unavailable modes and hidden display settings cannot strand startup", async () => {
  const { dom, window, app } = await setup({
    mode: 6,
    n: 3,
    adaptive: true,
    hideText: true,
  });
  try {
    assert.equal(app.settings().mode, 0);
    assert.equal(app.settings().n, 3);
    assert.equal(app.settings().hideText, false);
    assert.equal(app.settings().adaptive, false);
    assert.equal(window.document.getElementById("adaptive").disabled, true);
    assert.match(
      window.document.getElementById("adaptive-help").textContent,
      /Select your N-back level/,
    );
  } finally {
    dom.window.close();
  }
});

test("paused startup preserves its countdown and settings remain frozen", async () => {
  const { dom, window, app, advance } = await setup();
  try {
    let trials = 0;
    app.nextTrial = () => {
      trials += 1;
      app.current = {};
      app.score.shown += 1;
    };
    const starting = app.start();
    assert.equal(window.document.getElementById("n-slider").disabled, true);
    assert.equal(
      window.document.getElementById("session-slider").disabled,
      true,
    );
    window.document.getElementById("n-slider").value = "8";
    window.document.getElementById("logic-mode").value = "1";
    window.document.getElementById("session-slider").value = "120";
    assert.equal(app.settings().n, 1);
    assert.equal(app.settings().mode, 0);
    assert.equal(app.settings().minutes, 15);
    await advance(700);
    app.togglePause();
    await advance(5000);
    assert.equal(trials, 0);
    assert.equal(
      window.document.getElementById("countdown-box").textContent,
      "2",
    );
    assert.equal(
      window.document.getElementById("session-countdown").textContent,
      "15:00",
    );
    app.togglePause();
    await advance(1300);
    await starting;
    assert.equal(trials, 1);
    assert.equal(app._starting, false);
    assert.equal(app.endsAt - app.startedAt, 15 * 60000);
    app.stop(true);
    assert.equal(window.document.getElementById("n-slider").disabled, false);
    assert.equal(
      window.document.getElementById("session-slider").disabled,
      false,
    );
  } finally {
    dom.window.close();
  }
});

test("stopping and immediately restarting cannot execute an abandoned countdown", async () => {
  const { dom, window, app, advance } = await setup();
  try {
    let trials = 0;
    app.nextTrial = () => {
      trials += 1;
      app.current = {};
      app.score.shown += 1;
    };
    const abandoned = app.start();
    await advance(1900);
    app.stop(true);
    assert.equal(
      window.document.getElementById("countdown-box").textContent,
      "",
    );
    assert.equal(app.history.length, 0);
    const restart = app.start();
    await advance(2000);
    await Promise.all([abandoned, restart]);
    assert.equal(trials, 1);
    app.stop(true);
  } finally {
    dom.window.close();
  }
});

test("pause time is excluded from the session clock and saved active duration", async () => {
  const { dom, window, app, advance } = await setup({ mode: 1, minutes: 1 });
  try {
    app.nextTrial = () => {
      app.current = {};
      app.score.shown += 1;
    };
    const starting = app.start();
    await advance(1950);
    await starting;
    await advance(2000);
    app.togglePause();
    await advance(100);
    const display =
      window.document.getElementById("session-countdown").textContent;
    await advance(120000);
    assert.equal(app.running, true);
    assert.equal(
      window.document.getElementById("session-countdown").textContent,
      display,
    );
    app.stop(true);
    assert.equal(app.history[0].elapsedMs, 2000);
    assert.equal(
      window.document.getElementById("pause-btn").textContent,
      "Pause",
    );
    assert.equal(
      window.document
        .getElementById("paused-overlay")
        .classList.contains("show"),
      false,
    );
  } finally {
    dom.window.close();
  }
});

test("expiry saves one session and matrix accuracy counts all five decisions", async () => {
  const { dom, app, advance } = await setup({ minutes: 1 });
  try {
    app.nextTrial = () => {
      app.score.shown = 3;
      app.trials = [
        {
          submitted: true,
          conflictDecisionCorrectness: [true, true, true, true, true],
        },
        {
          submitted: true,
          conflictDecisionCorrectness: [true, false, true, false, true],
        },
        {
          submitted: false,
          conflictDecisionCorrectness: [true, true, true, true, true],
        },
      ];
      app.rts = [2000, 4000];
      app.updateStats();
    };
    const starting = app.start();
    await advance(1950);
    await starting;
    const summary = app.getSessionSummary();
    assert.equal(summary.completed, 2);
    assert.equal(summary.correctTrials, 1);
    assert.equal(summary.decisions, 10);
    assert.equal(summary.correctDecisions, 8);
    assert.equal(summary.accuracy, 0.8);
    assert.equal(summary.meanResponseMs, 3000);
    await advance(60500);
    assert.equal(app.running, false);
    assert.equal(app.history.length, 1);
    assert.equal(app.history[0].elapsedMs, 60000);
    assert.equal(app.history[0].stoppedEarly, false);
    app.saveSession(false);
    assert.equal(app.history.length, 1);
  } finally {
    dom.window.close();
  }
});

test("binary history persists, renders safely, exports CSV and clears", async () => {
  const { dom, window, app } = await setup({ mode: 1 });
  try {
    app.sessionSettings = { mode: 1, n: 2, minutes: 1 };
    app.n = 2;
    app.startedAt = 900000;
    app.stoppedAt = 960000;
    app.sessionDurationMs = 60000;
    app.directionResolution = 8;
    app.score = {
      shown: 5,
      scored: 3,
      hits: 1,
      correctRejects: 1,
      misses: 1,
      falseAlarms: 0,
    };
    app.saveSession(true);
    assert.equal(
      JSON.parse(window.localStorage.getItem(historyKey))[0].accuracy,
      2 / 3,
    );
    app.history[0].modeName = '<img src=x onerror="alert(1)">';
    app.showHistory();
    assert.equal(window.document.querySelector("#history-list img"), null);
    assert.match(
      window.document.getElementById("history-list").textContent,
      /67%/,
    );
    window.URL.createObjectURL = () => "blob:history-export";
    window.URL.revokeObjectURL = () => {};
    let download;
    window.HTMLAnchorElement.prototype.click = function () {
      download = this.download;
    };
    const csv = app.exportHistory();
    assert.match(csv, /"modeName"/);
    assert.match(csv, /"2","8","1","60000"/);
    assert.match(download, /^ontological-worlds-history-.*\.csv$/);
    app.clearHistory();
    assert.equal(app.history.length, 0);
    assert.equal(window.localStorage.getItem(historyKey), null);
    assert.match(
      window.document.getElementById("history-list").textContent,
      /No completed or stopped sessions/,
    );
  } finally {
    dom.window.close();
  }
});

test("storage failures keep current results available and do not break stopping", async () => {
  const { dom, window, app } = await setup({ mode: 1 });
  try {
    app.startedAt = 900000;
    app.sessionDurationMs = 60000;
    app.score.shown = 1;
    window.Storage.prototype.setItem = () => {
      throw new Error("quota");
    };
    app.saveSession(true);
    assert.equal(app.history.length, 1);
    app.showHistory();
    assert.match(
      window.document.querySelector("#history-list [role=alert]").textContent,
      /Export these results/,
    );
  } finally {
    dom.window.close();
  }
});
