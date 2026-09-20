'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { loadProductionPage } = require('./helpers/production-page.cjs');

function choose(fixture, decision, value) {
  fixture.byId('conflict-matrix').querySelector(
    `[data-decision="${decision}"] [data-value="${Number(value)}"]`
  ).click();
}

test('the production script chain initializes both modes without errors', async t => {
  const f = await loadProductionPage(t);
  assert.ok(f.app);
  assert.equal(f.app.__modeTwoFinalRuntimeV22, true);
  assert.equal(f.window.__modeTwoOntologyNBackV22.version, 22);
  assert.equal(f.byId('start-btn').disabled, true, 'a compass selection is required');
  assert.equal(f.byId('conflict-matrix').querySelectorAll('.conflict-choice').length, 10);
  assert.ok(f.byId('matching-tutorial-btn'));
  assert.deepEqual(f.errors, []);
});

test('Mode 1 accepts five decisions once, rejects incomplete submissions, and persists real scores', async t => {
  const f = await loadProductionPage(t);
  const trial = await f.start();
  await f.waitFor(() => f.app.awaiting, 'matrix response');
  const expected = Array.from(trial.conflictResponseVector);
  assert.equal(expected.length, 5);
  assert.equal(trial.nBackWarmup, true);
  assert.deepEqual(expected.filter((_, index) => index !== 3), [false, false, false, false]);
  for (const invalid of [[], expected.slice(0, 4), [null, ...expected.slice(1)], [...expected, true]]) {
    f.app.submitConflictMatrix(invalid, []);
    assert.equal(f.app.score.scored, 0);
    assert.equal(trial.submitted, false);
  }
  expected.slice(0, 4).forEach((value, index) => choose(f, index, value));
  assert.equal(f.app.score.scored, 0, 'a partial matrix is not a scored trial');
  choose(f, 4, expected[4]);
  assert.equal(f.app.score.scored, 1);
  assert.equal(trial.conflictCorrectCount, 5);
  assert.equal(trial.correct, true);
  assert.equal(f.app.score.hits + f.app.score.correctRejects, 1);
  assert.equal(f.app.rts.length, 1);
  f.app.submitConflictMatrix(expected, new Array(5).fill(10));
  choose(f, 4, expected[4]);
  assert.equal(f.app.score.scored, 1, 'duplicate submission is ignored');
  assert.match(f.byId('feedback').textContent, /ALL FIVE CORRECT/);
  assert.match(f.byId('score').textContent, /100/);
  f.app.stop(true);
  assert.equal(f.app.history.length, 1);
  assert.equal(f.app.history[0].completed, 1);
  assert.equal(f.app.history[0].accuracy, 1);
  f.app.showHistory();
  assert.match(f.byId('history-list').textContent, /1 scored trials/);
  assert.deepEqual(f.errors, []);
});

test('Mode 1 ignores disabled keyboard controls, held keys, modifiers, and keys behind dialogs', async t => {
  const f = await loadProductionPage(t);
  await f.start();
  await f.waitFor(() => f.app.awaiting, 'matrix response');
  const initialProgress = f.byId('conflict-progress').textContent;
  f.byId('keyboard').checked = false;
  f.key('s');
  assert.equal(f.byId('conflict-progress').textContent, initialProgress);
  f.byId('keyboard').checked = true;
  f.key('s', { repeat: true });
  f.key('s', { ctrlKey: true });
  assert.equal(f.byId('conflict-progress').textContent, initialProgress);
  for (const modal of ['tutorial', 'history']) {
    f.app.openModal(modal);
    f.key('s');
    assert.equal(f.byId('conflict-progress').textContent, initialProgress);
    f.app.closeModal(modal);
  }
  f.byId('matching-tutorial-btn').click();
  assert.equal(f.byId('matching-tutorial-dialog').hidden, false);
  f.key('s');
  assert.equal(f.byId('conflict-progress').textContent, initialProgress);
  f.byId('matching-tutorial-dialog').querySelector('.matching-tutorial-close').click();
  f.key('s');
  assert.match(f.byId('conflict-progress').textContent, /^1 of 5/);
  assert.deepEqual(f.errors, []);
});

test('Mode 1 pause preserves partial decisions, the N-back trial, and active session time', async t => {
  const f = await loadProductionPage(t);
  const trial = await f.start({ n: 2, resolution: 8 });
  await f.waitFor(() => f.app.awaiting, 'matrix response');
  choose(f, 0, false);
  const endBefore = f.app.endsAt;
  const startedBefore = trial.started;
  f.app.togglePause();
  assert.equal(f.app.paused, true);
  assert.ok(Array.from(f.byId('conflict-matrix').querySelectorAll('.conflict-choice')).every(button => button.disabled));
  f.advanceClock(60000);
  choose(f, 1, false);
  f.key('f');
  f.app.submitConflictMatrix(Array.from(trial.conflictResponseVector), new Array(5).fill(0));
  assert.equal(f.app.score.scored, 0);
  assert.match(f.byId('conflict-progress').textContent, /^1 of 5/);
  f.app.togglePause();
  await f.waitFor(() => f.app.awaiting, 'resumed matrix response');
  assert.equal(f.app.current, trial);
  assert.equal(f.app.trials.length, 1);
  assert.ok(f.app.endsAt - endBefore >= 60000);
  assert.ok(trial.started - startedBefore >= 60000);
  assert.match(f.byId('conflict-progress').textContent, /^1 of 5/);
  const row = f.byId('conflict-matrix').querySelector('[data-decision="0"]');
  assert.ok(Array.from(row.querySelectorAll('button')).every(button => button.disabled));
  trial.conflictResponseVector.slice(1).forEach((value, index) => choose(f, index + 1, value));
  assert.equal(f.app.score.scored, 1);
  assert.ok(trial.responseTime < 5000, 'paused time is excluded from the reaction time');
  assert.deepEqual(f.errors, []);
});

test('stop and restart invalidate an old countdown and retain frozen session settings', async t => {
  const f = await loadProductionPage(t);
  f.change('direction-resolution', 4);
  const abandoned = f.app.start();
  await new Promise(resolve => setTimeout(resolve, 80));
  f.app.stop(true);
  const trial = await f.start({ n: 3, resolution: 16 });
  await abandoned;
  assert.equal(f.app.trials.length, 1);
  assert.equal(f.app.current, trial);
  assert.equal(f.app.n, 3);
  assert.equal(f.app.directionResolution, 16);
  for (const id of ['logic-mode', 'n-slider', 'session-slider', 'direction-resolution', 'premise-test-btn']) {
    assert.equal(f.byId(id).disabled, true, `${id} remains frozen during the session`);
  }
  f.change('n-slider', 1);
  assert.equal(f.app.settings().n, 3);
  f.app.stop(true);
  for (const id of ['logic-mode', 'n-slider', 'session-slider', 'direction-resolution', 'premise-test-btn']) {
    assert.equal(f.byId(id).disabled, false, `${id} becomes usable after stop`);
  }
  assert.equal(f.byId('paused-overlay').classList.contains('show'), false);
  assert.deepEqual(f.errors, []);
});

test('pausing the startup countdown never inserts an early or duplicate N-back trial', async t => {
  const f = await loadProductionPage(t);
  f.change('direction-resolution', 4);
  const pending = f.app.start();
  await new Promise(resolve => setTimeout(resolve, 80));
  f.app.togglePause();
  assert.equal(f.app.paused, true);
  f.advanceClock(60000);
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(f.app.trials.length, 0);
  assert.equal(f.app.current, null);
  assert.equal(f.byId('session-countdown').textContent, '15:00');
  f.app.togglePause();
  await pending;
  assert.equal(f.app.trials.length, 1);
  assert.equal(f.app.score.shown, 1);
  assert.ok(f.app.endsAt - f.window.Date.now() > 895000);
  assert.deepEqual(f.errors, []);
});

test('a production session can switch to Mode 2, fill memory, pause, and score one binary answer', async t => {
  const f = await loadProductionPage(t);
  await f.start({ mode: 0 });
  f.app.stop(true);
  const warmup = await f.start({ mode: 1, n: 1, resolution: 8 });
  assert.equal(warmup.nBackWarmup, true);
  assert.equal(f.app.score.scored, 0);
  await f.waitFor(() => f.app.awaiting && f.app.current !== warmup, 'Mode 2 memory fill');
  const trial = f.app.current;
  assert.equal(trial.nBackLevel, 1);
  assert.equal(f.app.trials.length, 2);
  assert.equal(f.byId('conflict-matrix').classList.contains('active'), false);
  f.app.openModal('tutorial');
  f.key('f');
  assert.equal(f.app.score.scored, 0, 'a dialog blocks underlying binary keyboard answers');
  f.app.closeModal('tutorial');
  f.app.togglePause();
  f.advanceClock(20000);
  f.app.answer(trial.nBackMatch);
  assert.equal(f.app.score.scored, 0);
  f.app.togglePause();
  assert.equal(f.app.current, trial);
  assert.equal(f.app.trials.length, 2);
  f.byId(trial.nBackMatch ? 'match-btn' : 'no-match-btn').click();
  assert.equal(f.app.score.scored, 1);
  assert.equal(trial.correct, true);
  assert.ok(trial.responseTime < 5000);
  f.app.answer(trial.nBackMatch);
  assert.equal(f.app.score.scored, 1);
  f.app.stop(true);
  assert.equal(f.app.history[0].mode, 1);
  assert.equal(f.app.history[0].completed, 1);
  assert.equal(f.app.history[0].accuracy, 1);
  assert.deepEqual(f.errors, []);
});
