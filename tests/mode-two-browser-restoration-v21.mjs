import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { loadProductionPage } = createRequire(import.meta.url)('./helpers/production-page.cjs');

// The historical filename is retained for existing CI callers. This exercises
// the actual shipped page and dynamic loader, including v22 endpoint bindings.
// A manually selected old engine/runtime chain would conceal routing failures.
const f = await loadProductionPage();
try {
  const { window, app, byId } = f;
  const modeTwo = window.__modeTwoOntologyNBackV22;
  const restoration = window.__modeTwoRestorationTestAPI;
  assert.ok(app);
  assert.equal(modeTwo?.version, 22);
  assert.equal(app.__modeTwoFinalRuntimeV22, true);
  assert.equal(restoration?.modeTwoGeneratorRoutedAfterModeOneOverrides, true);
  assert.equal(restoration?.modeTwoInterferenceFixedAtMaximum, true);

  f.change('logic-mode', 1);
  assert.equal(byId('direction-resolution-group').hidden, false);
  assert.equal(byId('start-btn').disabled, true);
  const interference = byId('interference-slider');
  assert.equal(interference.disabled, true);
  assert.equal(interference.min, '100');
  assert.equal(interference.max, '100');
  assert.equal(interference.value, '100');
  assert.equal(window.document.body.classList.contains('mode-two-active'), true);
  assert.equal(window.getComputedStyle(byId('conflict-matrix')).display, 'none');
  assert.notEqual(window.getComputedStyle(byId('match-btn').parentElement).display, 'none');

  f.change('direction-resolution', 4);
  assert.equal(byId('start-btn').disabled, false);
  app.directionResolution = 4;
  app.n = 1;
  app.trials = [];
  const warmup = app.makeTrial();
  assert.ok(warmup);
  assert.equal(warmup.mode, 1);
  assert.equal(warmup.publicMode, 2);
  assert.equal(warmup.directionResolution, 4);
  assert.equal(warmup.nBackWarmup, true);
  assert.equal(modeTwo.ensureResolutionClosed(warmup, 4), true);
  app.trials.push(warmup);

  for (let index = 0; index < 128; index += 1) {
    const trial = app.makeTrial();
    assert.ok(trial, `Mode 2 returned no trial at browser iteration ${index}`);
    assert.equal(trial.mode, 1);
    assert.equal(trial.directionResolution, 4);
    assert.equal(modeTwo.ensureResolutionClosed(trial, 4), true);
    const target = app.trials[app.trials.length - app.n];
    assert.equal(modeTwo.compare(target, trial).isMatch, trial.nBackMatch);
    app.trials.push(trial);
  }

  app.trials = [warmup];
  app.current = null;
  app.running = true;
  app.paused = false;
  app.awaiting = false;
  app.sessionToken = 777;
  app.score = { hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0, timeouts: 0, shown: 0, scored: 0 };
  app.rts = [];
  await app.nextTrial(777);
  assert.ok(app.current);
  assert.equal(app.current.mode, 1);
  assert.equal(app.current.scored, true);
  assert.equal(app.awaiting, true);
  assert.equal(byId('match-btn').disabled, false);
  assert.equal(byId('no-match-btn').disabled, false);
  assert.equal(app.answer(app.current.nBackMatch), true);
  assert.equal(app.awaiting, false);
  assert.equal(app.score.scored, 1);
  assert.match(byId('feedback').textContent, /CORRECT/);
  app.stop(false);
  assert.deepEqual(f.errors, []);
  console.log('Shipped Mode 2 v22 routing, controls, bound-ontology responses and 4-direction generation passed.');
} finally {
  f.close();
}
