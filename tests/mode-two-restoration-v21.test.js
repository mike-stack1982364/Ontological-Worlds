'use strict';

const assert = require('node:assert/strict');
const modeTwo = require('../mode-two-ontology-nback-v14.js');

assert.equal(modeTwo.version, 21);
assert.deepEqual([...modeTwo.RESOLUTIONS], [4, 8, 16]);
assert.deepEqual([...modeTwo.LEVELS], [1, 2, 3, 4, 5, 6, 7, 8]);

// 1,000 simulations at every N-back level and every available compass
// resolution: 3 resolutions × 8 levels × 1,000 = 24,000 scored trials.
const audit = modeTwo.runExhaustiveAudit(1000);
assert.equal(audit.totalEvaluations, 24000);
assert.equal(audit.passed, true, JSON.stringify(audit.failures.slice(0, 20)));
assert.equal(audit.failures.length, 0);
assert.equal(audit.matches, 12000);
assert.equal(audit.nonMatches, 12000);
assert.equal(audit.partialLureChecks, 12000);
assert.equal(audit.rows.length, 24);
for (const row of audit.rows) {
  assert.equal(row.evaluations, 1000);
  assert.equal(row.matches, 500);
  assert.equal(row.nonMatches, 500);
  assert.equal(row.falseMatches, 0);
  assert.equal(row.falseNonMatches, 0);
  assert.equal(row.wrongOffsetFailures, 0);
  assert.equal(row.resolutionFailures, 0);
  assert.equal(row.partialLureFailures, 0);
}
assert.equal(audit.invariants.selectableCompassResolution, true);
assert.equal(audit.invariants.resolutionClosedGeneration, true);
assert.equal(audit.invariants.exactTwoStatementNonMatchLures, true);

console.log(JSON.stringify({
  passed: audit.passed,
  simulations: audit.totalEvaluations,
  resolutions: audit.resolutions,
  nBackLevels: audit.nBackLevels,
  matches: audit.matches,
  nonMatches: audit.nonMatches,
  exactTwoStatementLures: audit.partialLureChecks
}, null, 2));
