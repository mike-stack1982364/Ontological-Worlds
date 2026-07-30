'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const conflict = require(path.join(__dirname, '..', 'mode-one-conflict-matrix-v20.js'));

assert.ok(conflict.version >= 20);
assert.deepStrictEqual([...conflict.LEVELS], [1,2,3,4,5,6,7,8]);

const target = {
  premises: [
    { subject: 'A', relation: 'N', object: 'B' },
    { subject: 'C', relation: 'E', object: 'A' }
  ],
  conclusion: { subject: 'B', relation: 'SW', object: 'C' },
  letters: ['A','B','C'],
  directionResolution: 16
};

const renamedEquivalent = {
  premises: [
    { subject: 'Y', relation: 'S', object: 'X' },
    { subject: 'Z', relation: 'E', object: 'X' }
  ],
  conclusion: { subject: 'Y', relation: 'SW', object: 'Z' },
  letters: ['X','Y','Z'],
  directionResolution: 16
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
  letters: ['X','Y','Z'],
  directionResolution: 16
};
const lure = conflict.evaluateConflictMatrix(target, twoOfThree);
assert.strictEqual(lure.wholeTrialMatch, false);
assert.strictEqual(lure.matchedCount, 2);
assert.strictEqual(lure.responseVector.length, 5);
assert.strictEqual(lure.responseVector[3], core.evaluateTrial(twoOfThree).isEntailed);

const roleSwapped = {
  premises: [
    { subject: 'Y', relation: 'SW', object: 'Z' },
    { subject: 'Z', relation: 'E', object: 'X' }
  ],
  conclusion: { subject: 'Y', relation: 'S', object: 'X' },
  letters: ['X','Y','Z'],
  directionResolution: 16
};
assert.strictEqual(conflict.evaluateConflictMatrix(target, roleSwapped).wholeTrialMatch, true);
assert.strictEqual(conflict.evaluateConflictMatrix(target, roleSwapped, { roleSensitive: true }).wholeTrialMatch, false);
assert.strictEqual(conflict.analyseAlignment(target, roleSwapped, { roleSensitive: true }).localStatementCompatibility[2], false);

assert.throws(() => conflict.evaluateConflictMatrix(target, {
  premises: [
    { subject: 'A', relation: 'N', object: 'B' },
    { subject: 'A', relation: 'E', object: 'B' }
  ],
  conclusion: { subject: 'A', relation: 'S', object: 'B' },
  directionResolution: 16
}), /exactly three letters/i);

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) { const out = [...values]; for (let i=out.length-1;i>0;i--) { const j=Math.floor(this.next()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; } return out; }
}

let generated = 0;
let fiveDecisionChecks = 0;
let exactTwoLures = 0;
let exactMatches = 0;
for (const resolution of [4,8,16]) {
  for (const level of conflict.LEVELS) {
    const rng = new Rng(0x71000000 + resolution * 100 + level);
    const history = Array.from({ length: level }, () => conflict.generateWarmupTrial(rng, { interferenceLevel: 100, directionResolution: resolution }));
    for (let index = 0; index < 512; index += 1) {
      const requestedMatch = index % 2 === 0;
      const historicalTarget = history[history.length - level];
      const current = conflict.generateConflictTrial(rng, historicalTarget, {
        match: requestedMatch,
        interferenceLevel: 100,
        roleSensitive: true,
        directionResolution: resolution
      });
      history.push(current);
      const result = conflict.evaluateHistory(history, history.length - 1, level, { roleSensitive: true });
      assert.strictEqual(result.targetIndex, history.length - 1 - level);
      assert.strictEqual(result.wholeTrialMatch, requestedMatch);
      assert.strictEqual(result.matchedCount, requestedMatch ? 3 : 2);
      assert.strictEqual(result.responseVector.length, 5);
      assert.strictEqual(current.conflictResponseVector.length, 5);
      assert.strictEqual(current.directionResolution, resolution);
      assert.deepStrictEqual(current.conflictResponseVector, [
        ...result.statementMatches,
        result.conclusionEntailed,
        result.wholeTrialMatch
      ]);
      if (requestedMatch) exactMatches += 1;
      else exactTwoLures += 1;
      generated += 1;
      fiveDecisionChecks += 5;
    }
  }
}
assert(exactMatches > 0);
assert(exactTwoLures > 0);

const audit = conflict.runAudit(2048);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures));
assert.strictEqual(audit.iterationsPerResolution, 2048);
assert.deepStrictEqual(audit.rows.map(row => row.resolution), [4,8,16]);
assert(audit.rows.every(row => row.failures === 0));
assert(audit.rows.every(row => row.nonMatches === 2048));
assert(audit.rows.every(row => row.exactTwo === 2048));

console.log(JSON.stringify({
  passed: true,
  generated,
  fiveDecisionChecks,
  exactMatches,
  exactTwoLures,
  resolutions: audit.rows
}, null, 2));
