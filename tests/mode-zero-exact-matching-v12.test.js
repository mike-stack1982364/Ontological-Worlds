'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const applyExactMatching = require(path.join(__dirname, '..', 'mode-zero-exact-matching-v12.js'));

applyExactMatching(core);

assert.strictEqual(core.__modeZeroExactMatchingV12, true);
assert.deepStrictEqual(core.modeZeroExactMatchingPolicy.levels, [1, 2, 3, 4, 5, 6, 7, 8]);
assert.strictEqual(core.modeZeroExactMatchingPolicy.exactDirectionRequired, true);
assert.strictEqual(core.modeZeroExactMatchingPolicy.orderedEndpointBindingRequired, true);
assert.strictEqual(core.modeZeroExactMatchingPolicy.inverseWordingEquivalentOnlyWithDirectionInversion, true);
assert.strictEqual(core.modeZeroExactMatchingPolicy.adjacentDirectionAccepted, false);
assert.strictEqual(core.modeZeroExactMatchingPolicy.wrongLetterAssignmentAccepted, false);

const systemCases = core.modeZeroExactSystemCases();
assert.strictEqual(systemCases.length, 10);
assert.strictEqual(systemCases.filter(item => item.expected).length, 5);
assert.strictEqual(systemCases.filter(item => !item.expected).length, 5);

for (const item of systemCases) {
  assert.strictEqual(core.evaluateTrial(item).isEntailed, item.expected, item.id);
}

const iterationsPerCase = 4096;
const audit = core.runModeZeroExactMatchingAudit(iterationsPerCase);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures.slice(0, 5)));
assert.strictEqual(audit.mode, 0);
assert.deepStrictEqual(audit.levels, [1, 2, 3, 4, 5, 6, 7, 8]);
assert.strictEqual(audit.total, 8 * 10 * iterationsPerCase);
assert.strictEqual(audit.matches, 8 * 5 * iterationsPerCase);
assert.strictEqual(audit.nonMatches, 8 * 5 * iterationsPerCase);
assert.strictEqual(audit.matches, audit.expectedMatches);
assert.strictEqual(audit.nonMatches, audit.expectedNonMatches);

for (let level = 1; level <= 8; level += 1) {
  assert.deepStrictEqual(audit.byLevel[level], {
    total: 10 * iterationsPerCase,
    matches: 5 * iterationsPerCase,
    nonMatches: 5 * iterationsPerCase,
    failures: 0
  });
}

assert.deepStrictEqual(audit.invariants, {
  exactSixteenWayQuantisation: true,
  endpointBindingRequired: true,
  reversedQueryRequiresOppositeDirection: true,
  wrongLetterAssignmentRejected: true,
  sharedAnchorBranchesComparedBySubtraction: true,
  renamingInvariant: true,
  premiseOrderInvariant: true,
  statementInversionInvariant: true,
  rotationInvariant: true
});

console.log(JSON.stringify({
  passed: audit.passed,
  mode: audit.mode,
  levels: audit.levels,
  systemCases: audit.cases,
  iterationsPerCase: audit.iterationsPerCase,
  simulatedComparisons: audit.total,
  matches: audit.matches,
  nonMatches: audit.nonMatches,
  byLevel: audit.byLevel,
  invariants: audit.invariants
}, null, 2));
