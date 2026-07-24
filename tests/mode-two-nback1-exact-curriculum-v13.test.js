'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const modeZeroExact = require(path.join(__dirname, '..', 'mode-zero-exact-matching-v12.js'));
const modeTwoNBackOne = require(path.join(__dirname, '..', 'mode-two-nback1-exact-curriculum-v13.js'));

modeZeroExact(core);
modeTwoNBackOne.applyCore(core);

assert.strictEqual(core.__modeTwoNBackOneExactV13, true);
assert.strictEqual(core.modeTwoNBackOneExactPolicy.publicMode, 2);
assert.strictEqual(core.modeTwoNBackOneExactPolicy.nBackLevel, 1);
assert.strictEqual(core.modeTwoNBackOneExactPolicy.canonicalTrials, 20);
assert.strictEqual(core.modeTwoNBackOneExactPolicy.matches, 10);
assert.strictEqual(core.modeTwoNBackOneExactPolicy.nonMatches, 10);
assert.strictEqual(core.modeTwoNBackOneExactPolicy.adjacentDirectionAccepted, false);
assert.strictEqual(core.modeTwoNBackOneExactPolicy.reversedQueryAcceptedWithoutDirectionInversion, false);
assert.strictEqual(core.modeTwoNBackOneExactPolicy.wrongLetterAssignmentAccepted, false);

const curriculum = core.modeTwoNBackOneExactCurriculum();
assert.strictEqual(curriculum.length, 20);
assert.strictEqual(new Set(curriculum.map(item => item.id)).size, 20);
assert.strictEqual(curriculum.filter(item => item.expected).length, 10);
assert.strictEqual(curriculum.filter(item => !item.expected).length, 10);

const evaluations = core.evaluateModeTwoNBackOneExactCurriculum();
assert.strictEqual(evaluations.length, 20);
assert(evaluations.every(item => item.passed), JSON.stringify(evaluations.filter(item => !item.passed), null, 2));

const expectedRelations = new Map(evaluations.map(item => [item.id, item.expectedRelation]));
assert.strictEqual(expectedRelations.get('m2-n1-03-north-plus-ne-nne'), 'NNE');
assert.strictEqual(expectedRelations.get('m2-n1-07-east-plus-ne-ene'), 'ENE');
assert.strictEqual(expectedRelations.get('m2-n1-08-southwest-plus-north-wnw'), 'WNW');
assert.strictEqual(expectedRelations.get('m2-n1-10-sse-plus-wsw-ssw'), 'SSW');
assert.strictEqual(expectedRelations.get('m2-n1-15-shared-anchor-not-east'), 'N');

const distinctions = new Set(evaluations.filter(item => !item.actual).map(item => item.distinctionClass));
assert(distinctions.has('adjacent-resolution-substitution'));
assert(distinctions.has('subject-object-reversal'));
assert(distinctions.has('wrong-letter-pair'));

for (const item of curriculum) {
  const rendered = core.renderTrial(item);
  assert.strictEqual((rendered.match(/;/g) || []).length, 2, item.id);
  assert(!/therefore|contract\s*:/i.test(rendered), item.id);
  assert.strictEqual(core.evaluateTrial(item).isEntailed, item.expected, item.id);
}

const audit = core.runModeTwoNBackOneExactAudit(4096);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures, null, 2));
assert.strictEqual(audit.totalEvaluations, 81920);
assert.strictEqual(audit.matches, 40960);
assert.strictEqual(audit.nonMatches, 40960);
assert.strictEqual(audit.failures.length, 0);
assert.strictEqual(audit.invariants.exactSixteenWayDirectionRequired, true);
assert.strictEqual(audit.invariants.orderedEndpointBindingRequired, true);
assert.strictEqual(audit.invariants.sharedAnchorBranchesUseVectorSubtraction, true);

console.log(JSON.stringify({
  passed: true,
  mode: audit.mode,
  nBackLevel: audit.nBackLevel,
  canonicalTrials: audit.canonicalTrials,
  totalEvaluations: audit.totalEvaluations,
  matches: audit.matches,
  nonMatches: audit.nonMatches,
  failures: audit.failures.length
}, null, 2));