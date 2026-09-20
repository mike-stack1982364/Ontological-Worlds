'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { loadProductionPage } = require('./helpers/production-page.cjs');

const statements = trial => [...trial.premises, trial.conclusion];

function requestNextOutcome(app, isMatch) {
  // Control only the next match-probability draw. Real generation, rendering,
  // speech, comparison, answer routing and score updates remain production code.
  const original = app.rng.next;
  app.rng.next = function firstDraw() {
    this.next = original;
    return isMatch ? 0 : 0.999999;
  };
}

test('all three Mode 2 complexities produce bound endpoints, freeze settings and retain separate history metadata', async t => {
  const f = await loadProductionPage(t);
  const api = f.window.__modeTwoOntologyNBackV22;
  const runtime = f.window.__modeTwoRestorationTestAPI;
  for (const complexity of ['entities', 'facets', 'worlds']) {
    f.change('mode-two-complexity', complexity);
    f.byId('mode-two-reflections').checked = false;
    const warmup = await f.start({ mode: 1, resolution: 4 });
    assert.equal(warmup.complexity, complexity);
    assert.equal(warmup.ontologyScoringNeutral, false);
    assert.equal(runtime.sessionComplexity, complexity);
    assert.equal(runtime.sessionReflections, false);
    assert.equal(f.byId('mode-two-complexity').disabled, true);
    assert.equal(f.byId('mode-two-reflections').disabled, true);
    for (const statement of statements(warmup)) {
      for (const facet of [statement.subjectFacet, statement.objectFacet]) {
        assert.ok(facet.category);
        assert.ok(['I', 'O', 'A'].includes(facet.form));
      }
    }
    if (complexity === 'entities') {
      const seen = new Map();
      for (const statement of statements(warmup)) {
        for (const side of ['subject', 'object']) {
          const key = statement[side];
          const binding = JSON.stringify(statement[`${side}Facet`]);
          if (seen.has(key)) assert.equal(binding, seen.get(key));
          seen.set(key, binding);
        }
      }
    }
    if (complexity === 'worlds') {
      assert.equal(Object.keys(warmup.worlds).length, 3);
      for (const world of Object.values(warmup.worlds)) {
        assert.equal(world.worldRule, api.WORLD_RULE);
        assert.equal(world.outputFacet.category, 'Projection');
      }
      assert.match(f.byId('premise-display').textContent, /Inside world/);
    }

    // DOM changes cannot rewrite the active session's task or practice cadence.
    f.change('mode-two-complexity', complexity === 'worlds' ? 'entities' : 'worlds');
    f.byId('mode-two-reflections').checked = true;
    await f.waitFor(() => f.app.awaiting, 'first scored Mode 2 response');
    assert.equal(f.app.current.complexity, complexity);
    assert.equal(runtime.sessionReflections, false);
    f.byId(f.app.current.nBackMatch ? 'match-btn' : 'no-match-btn').click();
    assert.equal(f.app.score.scored, 1);
    assert.equal(f.app.current.correct, true);
    f.app.stop(true);
    assert.equal(f.byId('mode-two-complexity').disabled, false);
    assert.equal(f.byId('mode-two-reflections').disabled, false);
    assert.equal(f.app.history[0].modeTwoVersion, 22);
    assert.equal(f.app.history[0].modeTwoComplexity, complexity);
    assert.equal(f.app.history[0].practiceEnabled, false);
    assert.equal(f.app.history[0].completed, 1);
    assert.equal(f.app.history[0].accuracy, 1);
  }
  assert.deepEqual(f.errors, []);
});

test('live v22 Match/No Match trials and practice breaks preserve exact N-back positions and active time', async t => {
  const f = await loadProductionPage(t);
  const api = f.window.__modeTwoOntologyNBackV22;
  const runtime = f.window.__modeTwoRestorationTestAPI;
  f.change('mode-two-complexity', 'facets');
  f.byId('mode-two-reflections').checked = true;
  await f.start({ mode: 1, n: 2, resolution: 8 });
  await f.waitFor(() => f.app.awaiting, 'two warmup trials');
  assert.equal(f.app.trials.length, 3);
  assert.equal(f.app.score.scored, 0);

  const requestedOutcomes = [];
  for (let decision = 0; decision < 6; decision += 1) {
    if (decision > 0) {
      const requestedMatch = decision % 2 === 0;
      requestedOutcomes.push(requestedMatch);
      requestNextOutcome(f.app, requestedMatch);
      await f.app.nextTrial(f.app.sessionToken);
      assert.equal(f.app.current.nBackMatch, requestedMatch);
    }
    const trial = f.app.current;
    const target = f.app.trials[f.app.trials.length - 1 - 2];
    assert.equal(api.compare(target, trial).isMatch, trial.nBackMatch);
    const historyLength = f.app.trials.length;
    f.byId(trial.nBackMatch ? 'match-btn' : 'no-match-btn').click();
    assert.equal(f.app.score.scored, decision + 1);
    assert.equal(trial.correct, true);
    f.app.answer(trial.nBackMatch);
    assert.equal(f.app.score.scored, decision + 1, 'repeated answer is ignored');
    assert.equal(f.app.trials.length, historyLength);
  }
  assert.ok(requestedOutcomes.includes(true) && requestedOutcomes.includes(false));

  await f.waitFor(() => runtime.phase === 'reflection', 'scheduled six-answer practice break');
  assert.equal(f.byId('mode-two-reflection').hidden, false);
  assert.equal(f.app.awaiting, false);
  assert.equal(f.app.paused, false, 'practice remains interactive while the session clock is paused');
  const before = {
    history: Array.from(f.app.trials), score: JSON.stringify(f.app.score),
    end: f.app.endsAt, pause: f.app.pauseStartedAt,
    rts: Array.from(f.app.rts), cue: f.byId('mode-two-domain-cue').textContent
  };
  assert.notEqual(before.pause, null);
  const reflectedTrial = f.app.current;
  const probe = api.generateProbe(reflectedTrial);
  f.change('mode-two-practice-0', probe.inference.expectedRelation);
  f.change('mode-two-practice-1', probe.counterfactual.expectedRelation);
  f.byId('mode-two-reflection').querySelector('.mode-two-practice-actions button').click();
  assert.equal(reflectedTrial.reflection.inferenceCorrect, true);
  assert.equal(reflectedTrial.reflection.counterfactualCorrect, true);
  assert.match(f.byId('mode-two-practice-feedback').textContent, /1\. Correct/);
  assert.match(f.byId('mode-two-practice-feedback').textContent, /2\. Correct/);
  f.byId('mode-two-practice-mapping').value = 'Garden nodes correspond to radios.';
  f.byId('mode-two-practice-mapping').dispatchEvent(new f.window.Event('input', { bubbles: true }));

  f.advanceClock(45000);
  f.app.answer(true);
  f.key('f');
  await f.app.nextTrial(f.app.sessionToken);
  f.app.togglePause();
  f.advanceClock(15000);
  f.byId('mode-two-practice-continue').click();
  assert.equal(runtime.phase, 'reflection', 'Continue is blocked while manually paused');
  f.app.togglePause();
  assert.equal(f.app.pauseStartedAt, before.pause, 'nested pause retains the whole practice pause');
  assert.deepEqual(Array.from(f.app.trials), before.history);
  assert.equal(JSON.stringify(f.app.score), before.score);
  assert.deepEqual(Array.from(f.app.rts), before.rts);

  f.byId('mode-two-practice-continue').click();
  await f.waitFor(() => f.app.awaiting, 'first trial after practice');
  assert.equal(f.app.trials.length, before.history.length + 1);
  assert.equal(f.app.score.scored, 6);
  assert.equal(f.app.pauseStartedAt, null);
  assert.ok(f.app.endsAt - before.end >= 60000, 'practice time is excluded from the active session');
  assert.equal(f.byId('mode-two-reflection').hidden, true);
  assert.notEqual(f.byId('mode-two-domain-cue').textContent, before.cue);
  const targetAfterBreak = before.history[before.history.length - 2];
  assert.equal(api.compare(targetAfterBreak, f.app.current).isMatch, f.app.current.nBackMatch,
    'the practice panel did not occupy a position in N-back history');
  f.byId(f.app.current.nBackMatch ? 'match-btn' : 'no-match-btn').click();
  assert.equal(f.app.score.scored, 7);
  assert.ok(f.app.current.responseTime < 5000, 'practice time did not enter the next reaction time');
  f.app.stop(true);
  assert.equal(f.app.history[0].completed, 7);
  assert.equal(f.app.history[0].reflectionCount, 1);
  assert.equal(f.app.history[0].practiceChecks, 2);
  assert.equal(f.app.history[0].practiceCorrect, 2);
  assert.equal(f.app.history[0].accuracy, 1);
  assert.equal(JSON.stringify(f.app.history).includes('Garden nodes correspond'), false,
    'private practice notes are not persisted in history');
  assert.deepEqual(f.errors, []);
});

test('switching modes displays the matching expanded guide below the game and restores Mode 1 decisions', async t => {
  const f = await loadProductionPage(t);
  const display = id => f.window.getComputedStyle(f.byId(id)).display;
  for (const mode of [0, 1, 0]) {
    f.change('logic-mode', mode);
    assert.notEqual(display(mode ? 'mode-two-guide' : 'mode-one-guide'), 'none');
    assert.equal(display(mode ? 'mode-one-guide' : 'mode-two-guide'), 'none');
    assert.equal(f.byId('mode-two-settings').hidden, mode === 0);
    const game = f.window.document.querySelector('.game-area');
    const guide = f.byId(mode ? 'mode-two-guide' : 'mode-one-guide');
    assert.ok(game.compareDocumentPosition(guide) & f.window.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.equal(guide.querySelector('details'), null, 'the guide is expanded by default');
  }
  await f.start({ mode: 0, n: 1, resolution: 4 });
  await f.waitFor(() => f.app.awaiting, 'Mode 1 response after mode switching');
  assert.equal(f.app.current.conflictResponseVector.length, 5);
  for (const [decision, expected] of Array.from(f.app.current.conflictResponseVector).entries()) {
    f.byId('conflict-matrix').querySelector(`[data-decision="${decision}"] [data-value="${Number(expected)}"]`).click();
  }
  assert.equal(f.app.score.scored, 1);
  assert.match(f.byId('feedback').textContent, /ALL FIVE CORRECT/);
  f.app.stop(true);
  assert.deepEqual(f.errors, []);
});
