'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const conflict = require(path.join(__dirname, '..', 'mode-one-conflict-matrix-v20.js'));
const maximal = require(path.join(__dirname, '..', 'mode-one-letter-continuity-v1.js'));

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) { const out = [...values]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(this.next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
}

assert.strictEqual(maximal.version, 2);
assert.strictEqual(maximal.MAX_INTERFERENCE, 100);

let transitions = 0;
for (const directionResolution of [4, 8, 16]) {
  for (let level = 1; level <= 8; level += 1) {
    const rng = new Rng(0x71000000 + directionResolution * 100 + level);
    const history = [];
    for (let index = 0; index < level + 96; index += 1) {
      const previous = history[history.length - 1] || null;
      const target = history[history.length - level] || null;
      const requestedMatch = index % 4 === 0;
      const trial = target
        ? maximal.generateMaximalScoredTrial(rng, target, previous, { match: requestedMatch, roleSensitive: true, directionResolution })
        : maximal.generateMaximalWarmupTrial(rng, previous, { directionResolution });

      assert.strictEqual(trial.interferenceLevel, 100);
      assert.strictEqual(trial.maxLogicalInterference, true);
      assert.strictEqual(maximal.trialLetters(trial).length, 3);
      assert.strictEqual(new Set(maximal.trialLetters(trial)).size, 3);
      assert.strictEqual(core.evaluateTrial(trial).isEntailed, trial.conclusionEntailed);

      if (target) {
        const analysis = maximal.analyseTransition(target, previous, trial, { roleSensitive: true });
        const evaluation = conflict.evaluateConflictMatrix(target, trial, { roleSensitive: true });
        assert.strictEqual(analysis.valid, true, JSON.stringify({ directionResolution, level, index, analysis, meta: trial.logicalInterference }));
        assert.strictEqual(analysis.targetOverlapCount, 2);
        assert(analysis.previousOverlapCount >= 1);
        assert.strictEqual(analysis.introducedRelativeToTarget, 1);
        assert.strictEqual(trial.logicalInterference.retainedIdentityValid, true);
        assert.strictEqual(trial.logicalInterference.changedIdentityRemoved, true);
        assert.strictEqual(trial.logicalInterference.level, 100);
        assert.strictEqual(evaluation.wholeTrialMatch, requestedMatch);
        assert.strictEqual(evaluation.matchedCount, requestedMatch ? 3 : 2);
        assert.deepStrictEqual(trial.conflictResponseVector, [...evaluation.statementMatches, evaluation.conclusionEntailed, evaluation.wholeTrialMatch]);
        transitions += 1;
      } else if (previous) {
        const previousLetters = maximal.trialLetters(previous);
        const currentLetters = maximal.trialLetters(trial);
        assert.strictEqual(currentLetters.filter(letter => previousLetters.includes(letter)).length, 2);
        assert.strictEqual(trial.nBackWarmup, true);
        assert.deepStrictEqual(trial.statementMatchVector, [false, false, false]);
      }
      history.push(trial);
    }
  }
}

// Direct regression for the screenshot failure: N=1 must never produce disjoint triads.
{
  const rng = new Rng(0x71717171);
  const first = maximal.generateMaximalWarmupTrial(rng, null, { directionResolution: 4 });
  const second = maximal.generateMaximalScoredTrial(rng, first, first, { match: false, roleSensitive: true, directionResolution: 4 });
  const firstLetters = maximal.trialLetters(first);
  const secondLetters = maximal.trialLetters(second);
  assert.strictEqual(secondLetters.filter(letter => firstLetters.includes(letter)).length, 2);
  assert.strictEqual(secondLetters.filter(letter => !firstLetters.includes(letter)).length, 1);
  assert.strictEqual(conflict.evaluateConflictMatrix(first, second, { roleSensitive: true }).matchedCount, 2);
}

const audit = maximal.runAudit(64);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures));
assert.strictEqual(audit.maximumInterference, 100);
assert(transitions > 2000);

console.log(JSON.stringify({ passed: true, transitions, auditRows: audit.rows.length }, null, 2));
