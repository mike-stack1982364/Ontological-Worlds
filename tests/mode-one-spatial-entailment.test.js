'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));

const trials = core.canonicalTrials();
assert.strictEqual(trials.length, 10);

const expectedClasses = [
  'exact-entailment',
  'exact-entailment',
  'exact-entailment',
  'adjacent-resolution-substitution',
  'subject-object-reversal',
  'wrong-letter-pair',
  'exact-entailment',
  'adjacent-resolution-substitution',
  'exact-entailment',
  'relational-composition-error'
];

trials.forEach((trial, index) => {
  const result = core.evaluateTrial(trial);
  assert.strictEqual(result.isEntailed, trial.expected, `Canonical trial ${index + 1} answer mismatch.`);
  assert.strictEqual(result.distinctionClass, expectedClasses[index], `Canonical trial ${index + 1} class mismatch.`);
  const rendered = core.renderTrial(trial);
  assert.strictEqual((rendered.match(/;/g) || []).length, 2, `Canonical trial ${index + 1} lacks exactly three statements.`);
  assert(!/contract:|therefore/i.test(rendered), `Canonical trial ${index + 1} leaks hidden instructions.`);
});

assert.deepStrictEqual(core.evaluateTrial(trials[0]).possibleRelations, ['SE']);
assert.strictEqual(core.evaluateTrial(trials[2]).expectedRelation, 'NNE');
assert.strictEqual(core.evaluateTrial(trials[8]).expectedRelation, 'E');
assert.strictEqual(core.evaluateTrial(trials[9]).expectedRelation, 'N');

const renamed = core.renameTrial(trials[0], { A: 'X', B: 'Y', C: 'Z' });
assert.strictEqual(core.evaluateTrial(renamed).isEntailed, true, 'Consistent letter renaming must preserve entailment.');

const reordered = JSON.parse(JSON.stringify(trials[0]));
reordered.premises.reverse();
assert.strictEqual(core.evaluateTrial(reordered).isEntailed, true, 'Premise order must not alter the relation graph.');

const invertedPremises = JSON.parse(JSON.stringify(trials[0]));
invertedPremises.premises = invertedPremises.premises.map(core.invert);
assert.strictEqual(core.evaluateTrial(invertedPremises).isEntailed, true, 'Equivalent inverse premise wording must preserve entailment.');

const invertedConclusion = JSON.parse(JSON.stringify(trials[0]));
invertedConclusion.conclusion = core.invert(invertedConclusion.conclusion);
assert.strictEqual(core.evaluateTrial(invertedConclusion).isEntailed, true, 'Equivalent inverse conclusion wording must preserve entailment.');

const audit = core.runAudit(16384);
assert.strictEqual(audit.passed, true, audit.failures.join(', '));
assert.deepStrictEqual(audit.directionalResolutions, [16]);
assert.strictEqual(audit.templateCoverage, 10);
assert.strictEqual(audit.directionCoverage, 16);
assert.strictEqual(audit.lettersDriveRelationalComputation, true);
assert.strictEqual(audit.conclusionRecomputedFromPremises, true);
assert.strictEqual(audit.visibleContract, false);
assert.strictEqual(audit.fixedLogicalRegime, 'EXACT_16');
assert(audit.matches > 0);
assert(audit.nonMatches > 0);
assert(audit.invarianceChecks > 0);
assert(audit.distinctions.includes('adjacent-resolution-substitution'));
assert(audit.distinctions.includes('subject-object-reversal'));
assert(audit.distinctions.includes('wrong-letter-pair'));

console.log(JSON.stringify({
  passed: true,
  canonicalTrials: trials.map((trial, index) => ({
    trial: index + 1,
    expected: trial.expected,
    rendered: core.renderTrial(trial),
    result: core.evaluateTrial(trial)
  })),
  exhaustiveAudit: audit
}, null, 2));
