'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));

const canonical = {
  premises: [
    { subject: 'A', relation: 'W', object: 'J' },
    { subject: 'J', relation: 'N', object: 'P' }
  ],
  conclusion: { subject: 'P', relation: 'SE', object: 'A' }
};
const canonicalResult = core.evaluateTrial(canonical);
assert.strictEqual(canonicalResult.expectedRelation, 'SE');
assert.strictEqual(canonicalResult.isEntailed, true);

const falseCanonical = JSON.parse(JSON.stringify(canonical));
falseCanonical.conclusion.relation = 'S';
const falseResult = core.evaluateTrial(falseCanonical);
assert.strictEqual(falseResult.expectedRelation, 'SE');
assert.strictEqual(falseResult.isEntailed, false);

const inverseWording = {
  premises: [
    { subject: 'J', relation: 'E', object: 'A' },
    { subject: 'P', relation: 'S', object: 'J' }
  ],
  conclusion: { subject: 'A', relation: 'NW', object: 'P' }
};
assert.deepStrictEqual(core.evaluateTrial(inverseWording), {
  expectedRelation: 'NW',
  isEntailed: true
});

const audit = core.runAudit(8192);
assert.strictEqual(audit.passed, true, audit.failures.join(', '));
assert.strictEqual(audit.directionalResolution, 16);
assert.strictEqual(audit.directionCoverage, 16);
assert.strictEqual(audit.lettersDriveRelationalComputation, true);
assert.strictEqual(audit.conclusionRecomputedFromPremises, true);
assert(audit.matches > 0);
assert(audit.nonMatches > 0);
assert(audit.adjacentNearMisses > 0);

console.log(JSON.stringify({
  passed: true,
  canonicalResult,
  inverseWording: core.evaluateTrial(inverseWording),
  exhaustiveAudit: audit
}, null, 2));
