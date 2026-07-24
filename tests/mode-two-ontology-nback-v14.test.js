'use strict';

const assert = require('assert');
const path = require('path');
const modeTwo = require(path.join(__dirname, '..', 'mode-two-ontology-nback-v14.js'));

assert.deepStrictEqual([...modeTwo.LEVELS], [1, 2, 3, 4, 5, 6, 7, 8]);
assert.strictEqual(modeTwo.baseProfiles().length, 16);

const target = modeTwo.makeTrial('Division', 'IOA', 'N', 'E', ['B', 'C', 'D']);
const renamedMetadataChanged = modeTwo.makeTrial('Completion', 'AOI', 'N', 'E', ['X', 'Y', 'Z']);
const reversedPath = modeTwo.makeTrial('Division', 'IOA', 'E', 'N', ['X', 'Y', 'Z']);
const changedFirst = modeTwo.makeTrial('Division', 'IOA', 'S', 'E', ['X', 'Y', 'Z']);
const changedSecond = modeTwo.makeTrial('Division', 'IOA', 'N', 'W', ['X', 'Y', 'Z']);
const aliasedRoles = modeTwo.makeTrial('Division', 'IOA', 'N', 'E', ['X', 'X', 'Z']);

assert.strictEqual(modeTwo.signature(target), 'PATH:0>N>1|1>E>2');
assert.strictEqual(modeTwo.compare(target, renamedMetadataChanged).isMatch, true);
assert.strictEqual(modeTwo.compare(target, reversedPath).isMatch, false);
assert.strictEqual(modeTwo.compare(target, changedFirst).isMatch, false);
assert.strictEqual(modeTwo.compare(target, changedSecond).isMatch, false);
assert.strictEqual(modeTwo.compare(target, aliasedRoles).isMatch, false);

for (const level of modeTwo.LEVELS) {
  const history = [target];
  for (let index = 1; index < level; index += 1) {
    history.push(modeTwo.makeTrial('All', 'OIA', 'S', 'W', [`F${index}`, `G${index}`, `H${index}`]));
  }
  history.push(renamedMetadataChanged);
  const matchResult = modeTwo.evaluateHistory(history, level, level);
  assert.strictEqual(matchResult.targetIndex, 0);
  assert.strictEqual(matchResult.isMatch, true);
  assert.strictEqual(matchResult.scored, true);

  const nonMatchHistory = [...history.slice(0, -1), reversedPath];
  const nonMatchResult = modeTwo.evaluateHistory(nonMatchHistory, level, level);
  assert.strictEqual(nonMatchResult.targetIndex, 0);
  assert.strictEqual(nonMatchResult.isMatch, false);
}

const audit = modeTwo.runExhaustiveAudit(4096);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures, null, 2));
assert.strictEqual(audit.canonicalOrderedPaths, 16);
assert.strictEqual(audit.totalEvaluations, 2621440);
assert.strictEqual(audit.matches, 524288);
assert.strictEqual(audit.nonMatches, 2097152);
assert.strictEqual(audit.matchRate, 0.2);
assert.strictEqual(audit.nonMatchRate, 0.8);
assert.strictEqual(audit.failures.length, 0);
assert.strictEqual(audit.invariants.orderedCompassPathRequired, true);
assert.strictEqual(audit.invariants.directionOrderRequired, true);
assert.strictEqual(audit.invariants.ontologyCategoryRelevant, false);
assert.strictEqual(audit.invariants.formOrderRelevant, false);
assert.strictEqual(audit.perLevel.length, 8);
for (const level of audit.perLevel) {
  assert.strictEqual(level.evaluations, 327680);
  assert.strictEqual(level.matches, 65536);
  assert.strictEqual(level.nonMatches, 262144);
  assert.strictEqual(level.falseMatches, 0);
  assert.strictEqual(level.falseNonMatches, 0);
  assert.strictEqual(level.wrongOffsetFailures, 0);
  assert.strictEqual(level.sameResultantOrderCollisionsRejected, 49152);
  assert.strictEqual(level.metadataInvarianceChecks, 65536);
}

console.log(JSON.stringify({
  passed: audit.passed,
  mode: audit.mode,
  levels: audit.nBackLevels,
  canonicalOrderedPaths: audit.canonicalOrderedPaths,
  repetitionsPerProfile: audit.repetitionsPerProfile,
  totalEvaluations: audit.totalEvaluations,
  matches: audit.matches,
  nonMatches: audit.nonMatches,
  matchRate: audit.matchRate,
  nonMatchRate: audit.nonMatchRate,
  failures: audit.failures.length,
  perLevel: audit.perLevel
}, null, 2));
