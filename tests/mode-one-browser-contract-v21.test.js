'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { loadProductionPage } = require('./helpers/production-page.cjs');

test('all ten advertised response keys select exactly their assigned decision', async t => {
  const page = await loadProductionPage(t);
  const { window, app, byId } = page;
  assert.deepEqual(page.errors, [], 'the scripts loaded by index.html must start without exceptions');
  assert.equal(byId('conflict-matrix').querySelectorAll('.conflict-choice').length, 10);
  assert.equal(byId('conflict-matrix').querySelectorAll('.conflict-row').length, 5);
  assert.ok(byId('conflict-matrix').getAttribute('aria-label'));
  await page.start({ mode: 0, n: 1, resolution: 8 });
  await page.waitFor(() => app.awaiting, 'ready response controls');
  const choices = [['a', 'd', 'h', 'k', ' '], ['s', 'f', 'j', 'l', 'n']];
  for (let answer = 0; answer < choices.length; answer++) {
    const trial = app.current, expectedValue = answer === 0;
    const scoredBefore = app.score.scored;
    assert.equal(app.submitConflictMatrix([true], [12]), false, 'partial decisions cannot count as a submitted trial');
    assert.equal(app.submitConflictMatrix(new Array(5)), false, 'sparse empty arrays must not count as five answers');
    const partlySparse = Array(5).fill(false);
    delete partlySparse[2];
    assert.equal(app.submitConflictMatrix(partlySparse), false, 'a missing decision cannot be skipped by array validation');
    assert.equal(app.score.scored, scoredBefore);
    assert.equal(app.current.submitted, false);
    for (const [index, key] of choices[answer].entries()) {
      const row = byId('conflict-matrix').querySelector(`[data-decision="${index}"]`);
      const chosen = row.querySelector(`[data-value="${Number(expectedValue)}"]`);
      assert.equal(chosen.textContent.trim().toLowerCase(), key === ' ' ? 'spacebar' : key);
      page.key(key);
      assert.equal(chosen.classList.contains('selected'), true, `key ${key} must select decision ${index}`);
      assert.ok([...row.querySelectorAll('button')].every(button => button.disabled));
      const selected = row.querySelector('.selected');
      page.key(choices[1 - answer][index]);
      assert.equal(row.querySelector('.selected'), selected, 'each decision retains its first answer');
      if (index < 4) {
        assert.equal(app.current.submitted, false);
        assert.equal(app.score.scored, scoredBefore);
      }
    }
    assert.equal(trial.submitted, true);
    assert.deepEqual(Array.from(trial.conflictResponses), Array(5).fill(expectedValue));
    assert.equal(trial.conflictDecisionTimes.length, 5);
    assert.ok(Array.from(trial.conflictDecisionTimes).every(value => Number.isFinite(value) && value >= 0));
    assert.equal(app.score.scored, scoredBefore + 1);
    assert.equal(trial.correct, Array.from(trial.conflictDecisionCorrectness).every(Boolean));
    assert.equal(app.conflictDecisionStats.length, 5);
    assert.ok(Array.from(app.conflictDecisionStats).every(stats => stats.scored === answer + 1));
    if (answer === 0) {
      app.nextTrial(app.sessionToken);
      await page.waitFor(() => app.awaiting && app.current !== trial, 'next response controls');
    }
  }
  app.stop();
  assert.ok([...window.document.querySelectorAll('.conflict-choice')].every(button => button.disabled));
  assert.deepEqual(page.errors, []);
});

test('Space activates a focused Matching Tutorial button without answering the current trial', async t => {
  const page = await loadProductionPage(t);
  const { window, app, byId } = page;
  await page.start();
  const before = byId('conflict-progress').textContent;
  const button = byId('matching-tutorial-btn');
  button.focus();
  button.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
  assert.equal(byId('matching-tutorial-dialog').hidden, false);
  assert.equal(byId('conflict-progress').textContent, before);
  assert.equal(byId('conflict-matrix').querySelector('.selected'), null);
  assert.equal(app.score.scored, 0);
  assert.deepEqual(page.errors, []);
});

test('cancelled speech is retried after pause instead of treated as a completed reading', async t => {
  const page = await loadProductionPage(t);
  const { window, app, byId } = page;
  const readings = [];
  window.speechSynthesis.speak = utterance => { readings.push(utterance); };
  const trial = await page.start();
  assert.equal(trial.speechComplete, false);
  assert.equal(readings.length, 1);
  assert.equal(byId('premise-test-btn').disabled, true, 'audio testing cannot interrupt a live trial');
  readings[0].onerror({ error: 'interrupted' });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(trial.speechComplete, false, 'a cancelled reading is incomplete');
  assert.equal(readings.length, 1);
  app.togglePause();
  await Promise.resolve();
  app.togglePause();
  assert.equal(readings.length, 2, 'the current trial must be read again on resume');
  assert.equal(readings[1].text, readings[0].text);
  readings[1].onend();
  await page.waitFor(() => trial.speechComplete, 'completed resumed reading');
  assert.deepEqual(page.errors, []);
});
