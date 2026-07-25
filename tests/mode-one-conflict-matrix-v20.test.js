'use strict';

global.addEventListener = global.addEventListener || (() => {});

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const conflict = require(path.join(__dirname, '..', 'mode-one-conflict-matrix-v20.js'));

assert.strictEqual(conflict.version, 21);
assert.deepStrictEqual([...conflict.LEVELS], [1,2,3,4,5,6,7,8]);
assert.strictEqual(conflict.ALL_MASKS.length, 8);

const target = {
  premises: [
    { subject: 'A', relation: 'N', object: 'B' },
    { subject: 'C', relation: 'E', object: 'A' }
  ],
  conclusion: { subject: 'B', relation: 'SW', object: 'C' },
  letters: ['A','B','C']
};

const reversedStatementMatch = {
  premises: [
    { subject: 'B', relation: 'S', object: 'A' },
    { subject: 'C', relation: 'S', object: 'B' }
  ],
  conclusion: { subject: 'A', relation: 'W', object: 'C' },
  letters: ['A','B','C']
};
const reversedAnalysis = conflict.analyseAlignment(target, reversedStatementMatch);
assert.strictEqual(reversedAnalysis.localStatementCompatibility[0], true);
assert.ok(reversedAnalysis.matchedCount >= 1);

const renamedEquivalent = {
  premises: [
    { subject: 'Y', relation: 'S', object: 'X' },
    { subject: 'Z', relation: 'E', object: 'X' }
  ],
  conclusion: { subject: 'Y', relation: 'SW', object: 'Z' },
  letters: ['X','Y','Z']
};
const equivalent = conflict.evaluateConflictMatrix(target, renamedEquivalent);
assert.deepStrictEqual(equivalent.statementMatches, [true,true,true]);
assert.strictEqual(equivalent.wholeTrialMatch, true);
assert.strictEqual(equivalent.responseVector.length, 5);

const twoOfThree = {
  premises: [
    { subject: 'Y', relation: 'S', object: 'X' },
    { subject: 'Z', relation: 'E', object: 'X' }
  ],
  conclusion: { subject: 'Y', relation: 'SSW', object: 'Z' },
  letters: ['X','Y','Z']
};
const lure = conflict.evaluateConflictMatrix(target, twoOfThree);
assert.strictEqual(lure.wholeTrialMatch, false);
assert.strictEqual(lure.matchedCount, 2);
assert.strictEqual(lure.responseVector.length, 5);

const roleSwapped = {
  premises: [
    { subject: 'Y', relation: 'SW', object: 'Z' },
    { subject: 'Z', relation: 'E', object: 'X' }
  ],
  conclusion: { subject: 'Y', relation: 'S', object: 'X' },
  letters: ['X','Y','Z']
};
assert.strictEqual(conflict.evaluateConflictMatrix(target, roleSwapped).wholeTrialMatch, true);
assert.strictEqual(conflict.evaluateConflictMatrix(target, roleSwapped, { roleSensitive: true }).wholeTrialMatch, false);

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) { const out = [...values]; for (let i=out.length-1;i>0;i--) { const j=Math.floor(this.next()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; } return out; }
}

let generated = 0;
let fiveDecisionChecks = 0;
let partialInterferenceChecks = 0;
const observedMasks = new Set();
for (const level of conflict.LEVELS) {
  const rng = new Rng(0x71000000 + level);
  const history = Array.from({ length: level }, () => conflict.generateWarmupTrial(rng, { interferenceLevel: 100 }));
  for (let index = 0; index < 1024; index += 1) {
    const requestedMatch = index % 2 === 0;
    const historicalTarget = history[history.length - level];
    const current = conflict.generateConflictTrial(rng, historicalTarget, {
      match: requestedMatch,
      nBackLevel: level,
      interferenceLevel: 100,
      roleSensitive: index % 4 === 0
    });
    history.push(current);
    const result = conflict.evaluateHistory(history, history.length - 1, level, { roleSensitive: current.roleSensitive });
    assert.strictEqual(result.targetIndex, history.length - 1 - level);
    assert.strictEqual(result.wholeTrialMatch, requestedMatch);
    assert.strictEqual(result.responseVector.length, 5);
    assert.strictEqual(current.conflictResponseVector.length, 5);
    observedMasks.add(result.statementMatches.map(Number).join(''));
    if (!requestedMatch) {
      assert.strictEqual(result.matchedCount, 2);
      partialInterferenceChecks += 1;
    }
    generated += 1;
    fiveDecisionChecks += 5;
  }
}
assert.ok(observedMasks.has('111'));
assert.ok([...observedMasks].some(mask => mask !== '111'));

for (const mask of conflict.ALL_MASKS.slice(0,7)) {
  const rng = new Rng(0x72000000 + Number(mask.map(Number).join('')));
  const current = conflict.generateConflictTrial(rng, target, { match: false, interferenceLevel: 66, mask });
  const evaluation = conflict.evaluateConflictMatrix(target, current);
  assert.deepStrictEqual(evaluation.statementMatches, mask);
  assert.strictEqual(evaluation.wholeTrialMatch, false);
}

const audit = conflict.runAudit(2048);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures));
assert.strictEqual(audit.total, 16384);
assert.strictEqual(audit.matches, 8192);
assert.strictEqual(audit.nonMatches, 8192);
assert.strictEqual(audit.totalBinaryDecisions, audit.total * 5);
assert.strictEqual(audit.invariants.fiveMandatoryDecisionsPerScoredTrial, true);
assert.strictEqual(audit.invariants.globallyConsistentLetterMappingRequired, true);
assert.strictEqual(audit.invariants.oneToOneStatementAssignmentRequired, true);
assert.strictEqual(audit.invariants.exactSixteenDirectionRelations, true);
assert.strictEqual(audit.invariants.roleSensitiveAndFlexibleComparison, true);
assert.strictEqual(audit.invariants.nativePerDecisionScoring, true);
assert.strictEqual(audit.invariants.allNBackLevelsSupported, true);

console.log(JSON.stringify({
  passed: true,
  generated,
  fiveDecisionChecks,
  partialInterferenceChecks,
  observedMasks: [...observedMasks].sort(),
  audit: {
    total: audit.total,
    matches: audit.matches,
    nonMatches: audit.nonMatches,
    totalBinaryDecisions: audit.totalBinaryDecisions,
    mappingConflicts: audit.mappingConflicts,
    failures: audit.failures
  }
}, null, 2));