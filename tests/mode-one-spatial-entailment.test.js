'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const applyApprovedTrials = require(path.join(__dirname, '..', 'mode-one-approved-trials-v7.js'));

// The production browser loads the exact spatial core first and then installs
// the approved ten-family Mode 1 generator. Audit that same stack rather than
// asking the unpatched algebra module for browser-only template methods.
applyApprovedTrials(core);

assert.ok(core.version >= 7);
assert.strictEqual(core.__approvedTriadicEntailmentV7, true);
assert.strictEqual(core.runtimeGenerator, 'approved-ten-template-orbits-v7');

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

// Independently retain coverage of the unpatched compass algebra across all
// three supported resolutions.
const resolutionAudit = core.runResolutionAudit(4096);
assert.strictEqual(resolutionAudit.passed, true, resolutionAudit.failures.join(', '));
assert.deepStrictEqual(resolutionAudit.perResolution.map(row => row.resolution), [4, 8, 16]);
assert(resolutionAudit.perResolution.every(row => row.matches > 0 && row.nonMatches > 0 && row.failures === 0));

const approvedAudit = core.runAudit(16384);
assert.strictEqual(approvedAudit.passed, true, approvedAudit.failures.join(', '));
assert.strictEqual(approvedAudit.directionalResolution, 16);
assert.deepStrictEqual(approvedAudit.directionPools, [4, 8, 16]);
assert.strictEqual(approvedAudit.directionCoverage, 16);
assert.strictEqual(approvedAudit.lettersDriveRelationalComputation, true);
assert.strictEqual(approvedAudit.letteringIdentityIgnored, true);
assert.strictEqual(approvedAudit.conclusionRecomputedFromPremises, true);
assert.strictEqual(approvedAudit.proofBindingRegulation, true);
assert.strictEqual(approvedAudit.visibleContractText, false);
assert.strictEqual(approvedAudit.exactlyThreeStatements, true);
assert(approvedAudit.matches > 0);
assert(approvedAudit.nonMatches > 0);
assert(approvedAudit.invarianceChecks > 0);
assert.deepStrictEqual(approvedAudit.templateCoverage, [1,2,3,4,5,6,7,8,9,10]);
assert(approvedAudit.distinctions.includes('adjacent-resolution-substitution'));
assert(approvedAudit.distinctions.includes('wrong-letter-pair'));
assert(approvedAudit.distinctions.includes('subject-object-reversal'));

console.log(JSON.stringify({
  passed: true,
  canonicalTrials: trials.length,
  resolutionAudit: resolutionAudit.perResolution,
  approvedAudit: {
    iterations: approvedAudit.iterations,
    matches: approvedAudit.matches,
    nonMatches: approvedAudit.nonMatches,
    templateCoverage: approvedAudit.templateCoverage,
    directionCoverage: approvedAudit.directionCoverage,
    invarianceChecks: approvedAudit.invarianceChecks
  }
}, null, 2));
