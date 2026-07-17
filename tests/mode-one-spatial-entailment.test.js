'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));

const trials = core.canonicalTrials();
assert.strictEqual(trials.length, 10);

const expectedClasses = [
  'exact-relational-entailment',
  'exact-relational-entailment',
  'exact-relational-entailment',
  'adjacent-resolution-substitution',
  'subject-object-reversal',
  'wrong-letter-pair',
  'exact-relational-entailment',
  'local-or-global-relational-error',
  'exact-relational-entailment',
  'adjacent-resolution-substitution'
];

trials.forEach((trial, index) => {
  const result = core.evaluateTrial(trial);
  const rendered = core.renderTrial(trial);
  assert.strictEqual(result.isEntailed, trial.expected, `Canonical trial ${index + 1} answer mismatch.`);
  assert.strictEqual(result.distinctionClass, expectedClasses[index], `Canonical trial ${index + 1} class mismatch.`);
  assert.strictEqual((rendered.match(/;/g) || []).length, 2, `Canonical trial ${index + 1} is not exactly three statements.`);
  assert(!/contract:|therefore/i.test(rendered), `Canonical trial ${index + 1} leaks instructions into the triad.`);
});

assert.strictEqual(core.evaluateTrial(trials[0]).expectedRelation, 'SE');
assert.strictEqual(core.evaluateTrial(trials[2]).expectedRelation, 'NNE');
assert.strictEqual(core.evaluateTrial(trials[6]).expectedRelation, 'E');
assert.strictEqual(core.evaluateTrial(trials[7]).expectedRelation, 'N');
assert.strictEqual(core.evaluateTrial(trials[9]).expectedRelation, 'W');

const renamed = core.renameTrial(trials[0], { A: 'X', B: 'Y', C: 'Z' });
assert.strictEqual(core.evaluateTrial(renamed).isEntailed, true, 'Consistent letter renaming must preserve entailment.');

const reordered = JSON.parse(JSON.stringify(trials[0]));
reordered.premises.reverse();
assert.strictEqual(core.evaluateTrial(reordered).isEntailed, true, 'Premise order must not alter the relational world.');

const inverted = JSON.parse(JSON.stringify(trials[0]));
inverted.premises = inverted.premises.map(core.invert);
assert.strictEqual(core.evaluateTrial(inverted).isEntailed, true, 'Equivalent inverse wording must preserve entailment.');

const audit = core.runAudit(16384);
assert.strictEqual(audit.passed, true, audit.failures.join(', '));
assert.strictEqual(audit.directionalResolution, 16);
assert.deepStrictEqual(audit.directionPools, [4, 8, 16]);
assert(audit.directionCoverage >= 14);
assert.strictEqual(audit.lettersDriveRelationalComputation, true);
assert.strictEqual(audit.letteringIdentityIgnored, true);
assert.strictEqual(audit.conclusionRecomputedFromPremises, true);
assert.strictEqual(audit.proofBindingRegulation, true);
assert.strictEqual(audit.visibleContractText, false);
assert.strictEqual(audit.exactlyThreeStatements, true);
assert(audit.matches > 0);
assert(audit.nonMatches > 0);
assert(audit.invarianceChecks > 0);
assert(audit.distinctions.includes('adjacent-resolution-substitution'));
assert(audit.distinctions.includes('wrong-letter-pair'));
assert(audit.distinctions.includes('subject-object-reversal'));

console.log(JSON.stringify({
  passed: true,
  canonicalTrials: trials.map((trial, index) => ({
    trial: index + 1,
    rendered: core.renderTrial(trial),
    expected: trial.expected,
    result: core.evaluateTrial(trial)
  })),
  exhaustiveAudit: audit
}, null, 2));
