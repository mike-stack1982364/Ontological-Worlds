'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const core = require('../mode-one-spatial-core.js');
const conflict = require('../mode-one-conflict-matrix-v20.js');
const maximal = require('../mode-one-letter-continuity-v1.js');

class Rng {
  constructor(seed) { this.seed = seed >>> 0; }
  next() {
    let value = this.seed += 1831565813;
    value = Math.imul(value ^ value >>> 15, 1 | value);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
}
const statement = (subject, relation, object) => ({ subject, relation, object });
const target = (letters = ['A', 'B', 'C'], directionResolution = 4) => core.hydrateTrial({
  premises: [statement(letters[0], 'N', letters[1]), statement(letters[1], 'N', letters[2])],
  conclusion: statement(letters[0], 'N', letters[2]), directionResolution
});
const sortedLetters = trial => maximal.trialLetters(trial).sort();

test('identity overlap varies without a permanently protected predecessor bridge', () => {
  const old = target(), previous = target(['A', 'D', 'E']), rng = new Rng(0x703718);
  const overlaps = new Set(); let disjointPrevious = 0, soleBridgeRemoved = 0;
  for (let i = 0; i < 240; i++) {
    const plan = maximal.chooseIdentityUpdatePlan(rng, old, previous);
    overlaps.add(plan.targetOverlapCount);
    assert.equal(plan.currentLetters.length, 3);
    assert.equal(new Set(plan.currentLetters).size, 3);
    assert.equal(plan.currentLetters.filter(letter => ['A', 'B', 'C'].includes(letter)).length, plan.targetOverlapCount);
    assert.equal(plan.removedTargetLetters.length, 3 - plan.targetOverlapCount);
    assert.equal(plan.introducedLetters.length, 3 - plan.targetOverlapCount);
    if (plan.previousOverlapCount === 0) disjointPrevious++;
    if (!plan.currentLetters.includes('A')) soleBridgeRemoved++;
  }
  assert.deepEqual([...overlaps].sort(), [0, 1, 2]);
  assert(disjointPrevious > 0); assert(soleBridgeRemoved > 0);
});

test('letter-set sampling is independent of the requested answer and scored metadata is fresh', () => {
  for (const directionResolution of [4, 8, 16]) {
    const old = maximal.generateMaximalWarmupTrial(new Rng(directionResolution), null, { directionResolution });
    const previous = maximal.generateMaximalWarmupTrial(new Rng(directionResolution + 99), old, { directionResolution });
    for (let seed = 0; seed < 12; seed++) {
      const options = { directionResolution };
      const yes = maximal.generateMaximalScoredTrial(new Rng(seed + 7300), old, previous, { ...options, match: true });
      const no = maximal.generateMaximalScoredTrial(new Rng(seed + 7300), old, previous, { ...options, match: false });
      assert.deepEqual(sortedLetters(yes), sortedLetters(no));
      assert.equal(yes.logicalInterference.targetOverlapCount, no.logicalInterference.targetOverlapCount);
      for (const [trial, expectedMatch] of [[yes, true], [no, false]]) {
        const evaluated = conflict.evaluateConflictMatrix(old, trial);
        assert.equal(trial.nBackWarmup, false);
        assert.equal(trial.scored, true);
        assert.equal(trial.submitted, false);
        assert.equal(Object.hasOwn(trial, 'warmupSourceStatementMatchVector'), false);
        assert.equal(trial.premises.length, 2); assert(trial.conclusion);
        assert.equal(evaluated.wholeTrialMatch, expectedMatch);
        assert.equal(evaluated.matchedCount, expectedMatch ? 3 : 2);
        assert.deepEqual(trial.conflictResponseVector, evaluated.responseVector);
        assert.equal(trial.conflictResponseVector[3], core.evaluateTrial(trial).isEntailed);
        assert.equal(conflict.ensureResolutionClosed(trial, directionResolution), true);
      }
    }
  }
});

test('all letter roles can move, including retained identities, without changing any matrix answer', () => {
  const old = target();
  const plan = Array.from({ length: 32 }, (_, seed) => maximal.chooseIdentityUpdatePlan(new Rng(seed), old, old))
    .find(item => item.retainedTargetLetters.length === 2);
  assert(plan);
  const seen = new Set();
  for (let seed = 0; seed < 96; seed++) {
    const trial = maximal.applyMaximumIdentityInterference(new Rng(seed + 31), old, old, old, { identityPlan: plan });
    const roles = [trial.premises[0].subject, trial.premises[0].object, trial.premises[1].object];
    seen.add(roles.join(''));
    assert.deepEqual(sortedLetters(trial), [...plan.currentLetters].sort());
    assert.deepEqual(trial.conflictResponseVector, [true, true, true, true, true]);
  }
  assert.equal(seen.size, 6);
});

test('warmups are fresh spatial problems and bounded exposure agrees with actual recent trials', () => {
  for (const directionResolution of [4, 8, 16]) {
    const rng = new Rng(0x71600 + directionResolution), history = [], axes = new Set(); let disjoint = 0;
    for (let i = 0; i < 72; i++) {
      const previous = history.at(-1), trial = maximal.generateMaximalWarmupTrial(rng, previous, { directionResolution });
      history.push(trial);
      assert.equal(trial.logicalInterference.source, 'independent-warmup');
      assert.equal(trial.nBackWarmup, true); assert.equal(trial.scored, true);
      assert.deepEqual(trial.conflictResponseVector, [false, false, false, core.evaluateTrial(trial).isEntailed, false]);
      assert.equal(trial.premises.length, 2); assert(trial.conclusion);
      assert.equal(conflict.ensureResolutionClosed(trial, directionResolution), true);
      axes.add(trial.premises[0].relation);
      if (previous && !maximal.trialLetters(trial).some(letter => maximal.trialLetters(previous).includes(letter))) disjoint++;
      const recent = history.slice(-32), exposure = trial.letterExposure;
      assert.equal(exposure.trialCount, recent.length);
      assert.deepEqual(exposure.recentTrials, recent.map(maximal.trialLetters));
      assert(Object.isFrozen(exposure)); assert(Object.isFrozen(exposure.recentTrials));
      for (const letter of maximal.LETTER_POOL) {
        const count = recent.filter(item => maximal.trialLetters(item).includes(letter)).length;
        let streak = 0;
        for (let j = recent.length - 1; j >= 0 && maximal.trialLetters(recent[j]).includes(letter); j--) streak++;
        assert.equal(exposure.counts[letter], count); assert.equal(exposure.streaks[letter], streak);
      }
    }
    assert(axes.size >= 4); assert(disjoint > 0);
  }
});
