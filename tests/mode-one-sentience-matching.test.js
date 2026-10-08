'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const spatial = require('../mode-one-spatial-core.js');
const conflict = require('../mode-one-conflict-matrix-v20.js');
const maximal = require('../mode-one-letter-continuity-v1.js');
const S = (subject, relation, object) => ({ subject, relation, object });
const trial = (first, second, third, resolution = 16) => ({ premises: [first, second], conclusion: third, directionResolution: resolution });
const list = value => [...value.premises, value.conclusion];
const letters = value => [...new Set(list(value).flatMap(statement => [statement.subject, statement.object]))];
const permutations = values => values.length < 2 ? [values.slice()] : values.flatMap((value, index) => permutations(values.filter((_, other) => index !== other)).map(rest => [value, ...rest]));

// Independent direct/inverse comparisons, with one shared mapping and a
// one-to-one assignment across every displayed statement. No production
// canonical strings, cached answers, spatial inference, or role restrictions.
function oracle(target, current) {
  const old = list(target), now = list(current), oldLetters = letters(target);
  const candidates = [];
  for (const mapped of permutations(letters(current))) {
    const mapping = Object.fromEntries(oldLetters.map((letter, index) => [letter, mapped[index]]));
    for (const assignment of permutations([0, 1, 2])) {
      const vector = now.map((statement, index) => {
        const prior = old[assignment[index]];
        return mapping[prior.subject] === statement.subject && mapping[prior.object] === statement.object && prior.relation === statement.relation ||
          mapping[prior.subject] === statement.object && mapping[prior.object] === statement.subject && spatial.opposite(prior.relation) === statement.relation;
      });
      candidates.push({ vector, matchedCount: vector.filter(Boolean).length, assignment, mapping, mapped });
    }
  }
  const compareArrays = (first, second) => first.map(Number).join('').localeCompare(second.map(Number).join(''));
  candidates.sort((first, second) => second.matchedCount - first.matchedCount || compareArrays(first.vector, second.vector) ||
    compareArrays(first.assignment, second.assignment) || first.mapped.join('').localeCompare(second.mapped.join('')));
  return candidates[0];
}
function assertAlignment(target, current, options = {}) {
  const actual = conflict.analyseAlignment(target, current, options), expected = oracle(target, current);
  assert.deepEqual(actual.statementMatches, expected.vector);
  assert.equal(actual.matchedCount, expected.matchedCount);
  assert.deepEqual(actual.assignment, expected.assignment);
  assert.deepEqual(actual.letterMapping, expected.mapping);
  assert.equal(actual.wholeTrialMatch, expected.matchedCount === 3);
  assert.equal(actual.roleSensitive, false);
  return actual;
}
class Rng {
  constructor(seed) { this.seed = seed >>> 0; }
  next() { let value = this.seed += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
}

test('all three statements match freely while K/L remains current-trial entailment', () => {
  const target = trial(S('A', 'N', 'B'), S('C', 'E', 'A'), S('B', 'SW', 'C'));
  const current = trial(S('Y', 'SW', 'Z'), S('Z', 'E', 'X'), S('Y', 'S', 'X'));
  for (const options of [{}, { roleSensitive: false }, { roleSensitive: true }]) {
    const actual = conflict.evaluateConflictMatrix(target, current, options);
    assert.deepEqual(actual.responseVector, [true, true, true, false, true]);
    assert.deepEqual(actual.assignment, [2, 1, 0]);
    assert.equal(actual.roleSensitive, false);
    assert.equal(actual.conclusionEntailed, spatial.evaluateTrial(current).isEntailed);
    assertAlignment(target, current, options);
  }
});

test('the Sentience matching rule covers every cardinal triangle pair, including deterministic ties', () => {
  const trials = [];
  for (const first of spatial.allowedCodes(4)) for (const second of spatial.allowedCodes(4)) for (const third of spatial.allowedCodes(4)) {
    trials.push(trial(S('A', first, 'B'), S('B', second, 'C'), S('A', third, 'C'), 4));
  }
  for (const target of trials) for (const current of trials) assertAlignment(target, current, { roleSensitive: true });
});

test('joint bindings distinguish a directed cycle from a transitive graph', () => {
  const transitive = trial(S('A', 'N', 'B'), S('B', 'N', 'C'), S('A', 'N', 'C'), 4);
  const cycle = trial(S('X', 'N', 'Y'), S('Y', 'N', 'Z'), S('Z', 'N', 'X'), 4);
  const actual = assertAlignment(transitive, cycle);
  assert.equal(actual.wholeTrialMatch, false);
  assert.equal(actual.matchedCount, 2);
});

test('every statement can cross the old third slot without inference overriding N-back', () => {
  const target = trial(S('A', 'N', 'B'), S('B', 'N', 'C'), S('A', 'N', 'C'), 4);
  let unavailable = 0;
  for (const assignment of permutations([0, 1, 2])) {
    const old = list(target), current = trial(...assignment.map(index => old[index]), 4);
    const result = conflict.evaluateConflictMatrix(target, current);
    assert.equal(result.wholeTrialMatch, true);
    assert.deepEqual(result.statementMatches, [true, true, true]);
    assert.equal(result.responseVector[4], true);
    if (!result.entailmentAvailable) {
      unavailable++;
      assert.equal(result.responseVector[3], false);
      assert.equal(result.expectedRelation, null);
    }
    assert.equal(conflict.evaluateHistory([target, target, current], 2, 2).isMatch, true);
  }
  assert(unavailable > 0, 'The fixture must exercise a collapsed independent spatial check');
});

test('feedback reports the N-back decision separately from K/L in both disagreement cases', () => {
  for (const nBackMatch of [false, true]) {
    const current = nBackMatch
      ? trial(S('A', 'E', 'B'), S('C', 'N', 'A'), S('C', 'W', 'B'), 8)
      : trial(S('A', 'E', 'B'), S('C', 'N', 'A'), S('C', 'NE', 'B'), 8);
    Object.assign(current, { nBackMatch, statementMatchVector: [true, true, nBackMatch] });
    const text = conflict.explainConflictTrial(current);
    assert(text.startsWith(`N-back: ${nBackMatch ? 'MATCH' : 'NO MATCH'} —`));
    assert(text.includes(`Separate K/L check: ${nBackMatch ? 'NO' : 'YES'}`));
  }
});

test('live wrong-pair statements retain their existing shape and entailment behavior', () => {
  // The live task can repeat a clue as its third statement. Sentience's
  // standalone triangle validator is deliberately not imported into this UI.
  const target = trial(S('A', 'E', 'B'), S('C', 'N', 'A'), S('C', 'N', 'A'), 8);
  const current = trial(S('Z', 'N', 'X'), S('Y', 'W', 'X'), S('X', 'S', 'Z'), 8);
  const actual = conflict.evaluateConflictMatrix(target, current, { roleSensitive: true });
  assert.deepEqual(actual.responseVector, [true, true, true, false, true]);
  assert.equal(spatial.evaluateTrial(current).distinctionClass, 'wrong-letter-pair');
  assertAlignment(target, current);
});

test('N=1/2/8 generation preserves five decisions, exact lures, warmup scoring and spatial proof', () => {
  for (const resolution of [4, 8, 16]) for (const n of [1, 2, 8]) {
    const rng = new Rng(0x819000 + resolution * 100 + n), history = [];
    for (let index = 0; index < n + 8; index++) {
      const target = history[index - n], previous = history.at(-1), match = index % 2 === 0;
      const current = target ? maximal.generateMaximalScoredTrial(rng, target, previous, { match, directionResolution: resolution, roleSensitive: true })
        : maximal.generateMaximalWarmupTrial(rng, previous, { directionResolution: resolution });
      history.push(current);
      const actual = conflict.evaluateHistory(history, index, n, { roleSensitive: true });
      assert.equal(current.premises.length, 2);
      assert(current.conclusion);
      assert.equal(current.conflictResponseVector.length, 5);
      assert.equal(current.scored, true);
      assert.equal(current.roleSensitive, false);
      assert.deepEqual(current.conflictResponseVector, actual.responseVector);
      assert.equal(actual.responseVector[3], spatial.evaluateTrial(current).isEntailed);
      assert.equal(actual.targetIndex, index - n);
      if (target) {
        assertAlignment(target, current, { roleSensitive: true });
        assert.equal(actual.matchedCount, match ? 3 : 2);
        assert.equal(actual.wholeTrialMatch, match);
      } else assert.deepEqual(actual.responseVector, [false, false, false, spatial.evaluateTrial(current).isEntailed, false]);
    }
  }
});
