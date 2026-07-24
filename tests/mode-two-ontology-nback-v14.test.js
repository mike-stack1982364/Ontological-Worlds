'use strict';

const assert = require('assert');
const path = require('path');
const modeTwo = require(path.join(__dirname, '..', 'mode-two-ontology-nback-v14.js'));

assert.deepStrictEqual([...modeTwo.LEVELS], [1, 2, 3, 4, 5, 6, 7, 8]);
assert.strictEqual(modeTwo.baseProfiles().length, 480);

const sameFamily = {
  ontology: { name: 'Multiplication', family: 'division-multiplication' },
  order: 'IOA',
  dirs: ['E', 'N']
};
const equivalent = {
  ontology: { name: 'Division', family: 'division-multiplication' },
  order: 'IOA',
  dirs: ['N', 'E']
};
assert.strictEqual(modeTwo.compare(sameFamily, equivalent).isMatch, true);
assert.strictEqual(modeTwo.compare(sameFamily, { ...equivalent, order: 'OIA' }).isMatch, false);
assert.strictEqual(modeTwo.compare(sameFamily, { ...equivalent, ontology: { name: 'Action', family: 'action-projection' } }).isMatch, false);
assert.strictEqual(modeTwo.compare(sameFamily, { ...equivalent, dirs: ['S', 'E'] }).isMatch, false);

for (const level of modeTwo.LEVELS) {
  const history = [];
  history.push(sameFamily);
  for (let index = 1; index < level; index += 1) {
    history.push({ ontology: { name: 'Connection', family: 'connection' }, order: 'AOI', dirs: ['S', 'W'] });
  }
  history.push(equivalent);
  const result = modeTwo.evaluateHistory(history, level, level);
  assert.strictEqual(result.targetIndex, 0);
  assert.strictEqual(result.isMatch, true);
  assert.strictEqual(result.scored, true);
}

const audit = modeTwo.runExhaustiveAudit(128);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures, null, 2));
assert.strictEqual(audit.canonicalProfiles, 480);
assert.strictEqual(audit.totalEvaluations, 1966080);
assert.strictEqual(audit.matches, 491520);
assert.strictEqual(audit.nonMatches, 1474560);
assert.strictEqual(audit.matchRate, 0.25);
assert.strictEqual(audit.nonMatchRate, 0.75);
assert.strictEqual(audit.failures.length, 0);
assert.strictEqual(audit.perLevel.length, 8);
for (const level of audit.perLevel) {
  assert.strictEqual(level.evaluations, 245760);
  assert.strictEqual(level.matches, 61440);
  assert.strictEqual(level.nonMatches, 184320);
  assert.strictEqual(level.falseMatches, 0);
  assert.strictEqual(level.falseNonMatches, 0);
  assert.strictEqual(level.wrongOffsetFailures, 0);
}

console.log(JSON.stringify({
  passed: audit.passed,
  mode: audit.mode,
  levels: audit.nBackLevels,
  canonicalProfiles: audit.canonicalProfiles,
  repetitionsPerProfile: audit.repetitionsPerProfile,
  totalEvaluations: audit.totalEvaluations,
  matches: audit.matches,
  nonMatches: audit.nonMatches,
  matchRate: audit.matchRate,
  nonMatchRate: audit.nonMatchRate,
  failures: audit.failures.length,
  perLevel: audit.perLevel
}, null, 2));
