'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const conflict = require(path.join(__dirname, '..', 'mode-one-conflict-matrix-v20.js'));

assert.strictEqual(conflict.version, 20);
assert.deepStrictEqual([...conflict.LEVELS], [1,2,3,4,5,6,7,8]);

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
assert.strictEqual(reversedAnalysis.localStatementCompatibility[0], true,
  'B south of A must be locally equivalent to A north of B');
assert.ok(reversedAnalysis.matchedCount >= 1,
  'the valid inverse wording must survive globally consistent alignment');

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

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) { const out = [...values]; for (let i=out.length-1;i>0;i--) { const j=Math.floor(this.next()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; } return out; }
}

let generated = 0;
let fiveDecisionChecks = 0;
let partialInterferenceChecks = 0;
for (const level of conflict.LEVELS) {
  const rng = new Rng(0x71000000 + level);
  const history = Array.from({ length: level }, () => conflict.generateWarmupTrial(rng, { interferenceLevel: 100 }));
  for (let index = 0; index < 1024; index += 1) {
    const requestedMatch = index % 2 === 0;
    const historicalTarget = history[history.length - level];
    const current = conflict.generateConflictTrial(rng, historicalTarget, {
      match: requestedMatch,
      nBackLevel: level,
      interferenceLevel: 100
    });
    history.push(current);
    const result = conflict.evaluateHistory(history, history.length - 1, level);
    assert.strictEqual(result.targetIndex, history.length - 1 - level);
    assert.strictEqual(result.wholeTrialMatch, requestedMatch);
    assert.strictEqual(result.responseVector.length, 5);
    assert.strictEqual(current.conflictResponseVector.length, 5);
    if (!requestedMatch) {
      assert.strictEqual(result.matchedCount, 2,
        'maximum interference must retain exactly two globally coherent statement matches');
      partialInterferenceChecks += 1;
    }
    generated += 1;
    fiveDecisionChecks += 5;
  }
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
assert.strictEqual(audit.invariants.allNBackLevelsSupported, true);

console.log(JSON.stringify({
  passed: true,
  generated,
  fiveDecisionChecks,
  partialInterferenceChecks,
  audit: {
    total: audit.total,
    matches: audit.matches,
    nonMatches: audit.nonMatches,
    totalBinaryDecisions: audit.totalBinaryDecisions,
    failures: audit.failures
  }
}, null, 2));
