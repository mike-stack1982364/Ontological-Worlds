'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));

const trials = core.canonicalTrials();
assert.strictEqual(trials.length, 10);

const expectedClasses = [
  'exact-necessary-entailment',
  'exact-necessary-entailment',
  'exact-necessary-entailment',
  'adjacent-resolution-substitution',
  'subject-object-reversal',
  'wrong-letter-pair',
  'possible-not-necessary',
  'exact-necessary-entailment',
  'exact-necessary-entailment',
  'local-or-global-relational-error'
];

trials.forEach((trial, index) => {
  const result = core.evaluateTrial(trial);
  assert.strictEqual(result.isEntailed, trial.expected, `Canonical trial ${index + 1} answer mismatch.`);
  assert.strictEqual(result.distinctionClass, expectedClasses[index], `Canonical trial ${index + 1} class mismatch.`);
  assert(!/therefore/i.test(core.renderTrial(trial)), `Canonical trial ${index + 1} contains therefore.`);
});

assert.deepStrictEqual(core.evaluateTrial(trials[0]).possibleRelations, ['SE']);
assert.deepStrictEqual(core.evaluateTrial(trials[6]).possibleRelations, ['W', 'WNW', 'NW', 'NNW', 'N']);
assert.deepStrictEqual(core.evaluateTrial(trials[7]).possibleRelations, ['NW']);

const renamed = core.renameTrial(trials[0], { A: 'X', B: 'Y', C: 'Z' });
assert.strictEqual(core.evaluateTrial(renamed).isEntailed, true, 'Consistent letter renaming must preserve entailment.');

const reordered = JSON.parse(JSON.stringify(trials[0]));
reordered.premises.reverse();
assert.strictEqual(core.evaluateTrial(reordered).isEntailed, true, 'Premise order must not alter the graph.');

const inverted = JSON.parse(JSON.stringify(trials[0]));
inverted.premises = inverted.premises.map(core.invert);
assert.strictEqual(core.evaluateTrial(inverted).isEntailed, true, 'Equivalent inverse wording must preserve entailment.');

const audit = core.runAudit(16384);
assert.strictEqual(audit.passed, true, audit.failures.join(', '));
assert.deepStrictEqual(audit.directionalResolutions, [4, 8, 16]);
assert.strictEqual(audit.contractCoverage, 5);
assert.strictEqual(audit.directionCoverage, 16);
assert.strictEqual(audit.lettersDriveRelationalComputation, true);
assert.strictEqual(audit.conclusionRecomputedFromPremises, true);
assert.strictEqual(audit.modelSetEvaluation, true);
assert.strictEqual(audit.proofBindingRegulation, true);
assert.strictEqual(audit.criterionContracts, true);
assert(audit.matches > 0);
assert(audit.nonMatches > 0);
assert(audit.invarianceChecks > 0);
assert(audit.distinctions.includes('possible-not-necessary'));
assert(audit.distinctions.includes('adjacent-resolution-substitution'));
assert(audit.distinctions.includes('wrong-letter-pair'));

console.log(JSON.stringify({
  passed: true,
  canonicalTrials: trials.map((trial, index) => ({
    trial: index + 1,
    expected: trial.expected,
    result: core.evaluateTrial(trial)
  })),
  exhaustiveAudit: audit
}, null, 2));
