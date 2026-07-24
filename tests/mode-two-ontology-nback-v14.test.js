'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const modeTwo = require(path.join(__dirname, '..', 'mode-two-ontology-nback-v14.js'));

assert.deepStrictEqual([...modeTwo.LEVELS], [1, 2, 3, 4, 5, 6, 7, 8]);
assert.strictEqual(modeTwo.version, 18);
assert.deepStrictEqual([...modeTwo.FORM_ORDERS], ['IO', 'OI']);
assert.deepStrictEqual(modeTwo.FORM_NAMES, { I: 'Inner', O: 'Outer' });
assert.strictEqual(Object.values(modeTwo.FORM_NAMES).some(value => /archetypal/i.test(value)), false);

for (const [index, trial] of core.canonicalTrials().entries()) {
  const decorated = modeTwo.decorateTrial(trial, ['Completion', 'Multiplication', 'Difference'], 'IO');
  const result = modeTwo.evaluate(decorated);
  assert.strictEqual(result.isMatch, trial.expected, `canonical ${index + 1}`);

  const metadataChanged = modeTwo.decorateTrial(trial, ['Action', 'All', 'Division'], 'OI');
  assert.strictEqual(modeTwo.evaluate(metadataChanged).isMatch, trial.expected, `metadata invariance ${index + 1}`);

  const rendered = modeTwo.renderOntologicalTrial(decorated);
  assert.doesNotMatch(rendered, /archetypal/i);
  assert.strictEqual((rendered.match(/\b(?:Inner|Outer)\b/g) || []).length, 2);
}

const matchTrial = modeTwo.decorateTrial({
  premises: [
    { subject: 'A', relation: 'W', object: 'B' },
    { subject: 'B', relation: 'N', object: 'C' }
  ],
  conclusion: { subject: 'C', relation: 'SE', object: 'A' },
  letters: ['A', 'B', 'C']
}, ['Completion', 'Multiplication', 'Difference'], 'IO');

const noMatchTrial = modeTwo.decorateTrial({
  premises: [
    { subject: 'K', relation: 'N', object: 'L' },
    { subject: 'L', relation: 'NE', object: 'M' }
  ],
  conclusion: { subject: 'K', relation: 'NE', object: 'M' },
  letters: ['K', 'L', 'M']
}, ['All', 'Projection', 'Connection'], 'OI');

assert.strictEqual(modeTwo.evaluate(matchTrial).isMatch, true);
assert.strictEqual(modeTwo.evaluate(noMatchTrial).isMatch, false);
const renderedMatch = modeTwo.renderOntologicalTrial(matchTrial);
assert.match(renderedMatch, /Inner Completion/);
assert.match(renderedMatch, /Outer Multiplication/);
assert.match(renderedMatch, /Difference C is southeast of A/);
assert.doesNotMatch(renderedMatch, /Archetypal/i);
assert.strictEqual((renderedMatch.match(/\b(?:Inner|Outer)\b/g) || []).length, 2);

for (const level of modeTwo.LEVELS) {
  const history = [];
  for (let index = 0; index < level; index += 1) history.push(matchTrial);
  history.push(noMatchTrial);
  const result = modeTwo.evaluateHistory(history, level, level);
  assert.strictEqual(result.targetIndex, 0);
  assert.strictEqual(result.isMatch, false);
  assert.strictEqual(result.scored, true);
}

const audit = modeTwo.runExhaustiveAudit(131072);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures, null, 2));
assert.strictEqual(audit.totalEvaluations, 1048576);
assert.strictEqual(audit.matches, 524288);
assert.strictEqual(audit.nonMatches, 524288);
assert.strictEqual(audit.matchRate, 0.5);
assert.strictEqual(audit.nonMatchRate, 0.5);
assert.strictEqual(audit.failures.length, 0);
assert.strictEqual(audit.renderChecks, 1048576);
assert.strictEqual(audit.invariants.modeOneRelationalEntailmentCopiedExactly, true);
assert.strictEqual(audit.invariants.ontologyCategoriesScoringNeutral, true);
assert.strictEqual(audit.invariants.formOrderScoringNeutral, true);
assert.strictEqual(audit.invariants.sixteenDirectionResolution, true);
assert.strictEqual(audit.invariants.allNBackLevelsUseSameEvaluator, true);
assert.strictEqual(audit.invariants.conclusionHasNoFormPrefix, true);
assert.strictEqual(audit.invariants.archetypalWordForbiddenInModeTwoOutput, true);
assert.strictEqual(audit.perLevel.length, 8);
for (const level of audit.perLevel) {
  assert.strictEqual(level.evaluations, 131072);
  assert.strictEqual(level.matches, 65536);
  assert.strictEqual(level.nonMatches, 65536);
  assert.strictEqual(level.falseMatches, 0);
  assert.strictEqual(level.falseNonMatches, 0);
  assert.strictEqual(level.wrongOffsetFailures, 0);
  assert.strictEqual(level.ontologyMutationFailures, 0);
  assert.strictEqual(level.renamingFailures, 0);
  assert.strictEqual(level.premiseOrderFailures, 0);
  assert.strictEqual(level.inversionFailures, 0);
  assert.strictEqual(level.renderFailures, 0);
}

console.log(JSON.stringify({
  passed: audit.passed,
  mode: audit.mode,
  levels: audit.nBackLevels,
  totalEvaluations: audit.totalEvaluations,
  matches: audit.matches,
  nonMatches: audit.nonMatches,
  matchRate: audit.matchRate,
  nonMatchRate: audit.nonMatchRate,
  renderChecks: audit.renderChecks,
  ontologyMutationChecks: audit.ontologyMutationChecks,
  renamingChecks: audit.renamingChecks,
  premiseOrderChecks: audit.premiseOrderChecks,
  inversionChecks: audit.inversionChecks,
  failures: audit.failures.length,
  perLevel: audit.perLevel
}, null, 2));
