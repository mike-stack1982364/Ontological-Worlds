'use strict';

const assert = require('assert');
const path = require('path');
const modeTwo = require(path.join(__dirname, '..', 'mode-two-ontology-nback-v14.js'));

assert.deepStrictEqual([...modeTwo.LEVELS], [1, 2, 3, 4, 5, 6, 7, 8]);
assert.strictEqual(modeTwo.ONTOLOGY_CATEGORIES.length, 9);
assert.strictEqual(modeTwo.baseProfiles().length, 864);

const division = {
  ontology: { name: 'Division', family: 'division-multiplication' },
  order: 'IOA',
  dirs: ['E', 'N']
};
const sameCategoryEquivalentSurface = {
  ontology: { name: 'Division', family: 'division-multiplication' },
  order: 'IOA',
  dirs: ['N', 'E'],
  symbols: ['X', 'Y', 'Z']
};
const multiplication = {
  ontology: { name: 'Multiplication', family: 'division-multiplication' },
  order: 'IOA',
  dirs: ['N', 'E']
};

assert.strictEqual(modeTwo.compare(division, sameCategoryEquivalentSurface).isMatch, true);
assert.strictEqual(modeTwo.compare(division, multiplication).isMatch, false);
assert.strictEqual(modeTwo.compare(division, { ...sameCategoryEquivalentSurface, order: 'OIA' }).isMatch, false);
assert.strictEqual(modeTwo.compare(division, { ...sameCategoryEquivalentSurface, dirs: ['S', 'E'] }).isMatch, false);

for (const level of modeTwo.LEVELS) {
  const history = [division];
  for (let index = 1; index < level; index += 1) {
    history.push({ ontology: { name: 'Connection', family: 'connection' }, order: 'AOI', dirs: ['S', 'W'] });
  }
  history.push(sameCategoryEquivalentSurface);
  const matchResult = modeTwo.evaluateHistory(history, level, level);
  assert.strictEqual(matchResult.targetIndex, 0);
  assert.strictEqual(matchResult.isMatch, true);
  assert.strictEqual(matchResult.scored, true);

  const nonMatchHistory = [...history.slice(0, -1), multiplication];
  const nonMatchResult = modeTwo.evaluateHistory(nonMatchHistory, level, level);
  assert.strictEqual(nonMatchResult.targetIndex, 0);
  assert.strictEqual(nonMatchResult.isMatch, false);
}

const audit = modeTwo.runExhaustiveAudit(128);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures, null, 2));
assert.strictEqual(audit.canonicalProfiles, 864);
assert.strictEqual(audit.totalEvaluations, 4423680);
assert.strictEqual(audit.matches, 884736);
assert.strictEqual(audit.nonMatches, 3538944);
assert.strictEqual(audit.matchRate, 0.2);
assert.strictEqual(audit.nonMatchRate, 0.8);
assert.strictEqual(audit.failures.length, 0);
assert.strictEqual(audit.invariants.exactOntologyCategoryRequired, true);
assert.strictEqual(audit.invariants.sameFamilyDifferentCategoryRejected, true);
assert.strictEqual(audit.perLevel.length, 8);
for (const level of audit.perLevel) {
  assert.strictEqual(level.evaluations, 552960);
  assert.strictEqual(level.matches, 110592);
  assert.strictEqual(level.nonMatches, 442368);
  assert.strictEqual(level.falseMatches, 0);
  assert.strictEqual(level.falseNonMatches, 0);
  assert.strictEqual(level.wrongOffsetFailures, 0);
  assert.strictEqual(level.pairedCategoryFalseMatches, 0);
}

console.log(JSON.stringify({
  passed: audit.passed,
  mode: audit.mode,
  levels: audit.nBackLevels,
  ontologyCategories: audit.ontologyCategories,
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