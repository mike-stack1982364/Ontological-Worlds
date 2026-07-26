'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const conflict = require(path.join(__dirname, '..', 'mode-one-conflict-matrix-v20.js'));
const continuity = require(path.join(__dirname, '..', 'mode-one-letter-continuity-v1.js'));

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) { const out = [...values]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(this.next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
}

assert.strictEqual(continuity.version, 1);
assert.strictEqual(continuity.continuityCarryCount(0), 1);
assert.strictEqual(continuity.continuityCarryCount(49), 1);
assert.strictEqual(continuity.continuityCarryCount(50), 2);
assert.strictEqual(continuity.continuityCarryCount(100), 2);

let checkedTransitions = 0;
for (const interferenceLevel of [0, 60, 100]) {
  for (let nBackLevel = 1; nBackLevel <= 8; nBackLevel += 1) {
    const rng = new Rng(0x51000000 + interferenceLevel * 100 + nBackLevel), history = [];
    for (let index = 0; index < nBackLevel + 8; index += 1) {
      const target = history[history.length - nBackLevel] || null;
      const previous = history[history.length - 1] || null;
      const raw = target
        ? conflict.generateConflictTrial(rng, target, { match: index % 4 === 0, interferenceLevel, roleSensitive: true, directionResolution: 16 })
        : conflict.generateWarmupTrial(rng, { interferenceLevel, directionResolution: 16 });
      const beforeEntailment = core.evaluateTrial(raw).isEntailed;
      const beforeVector = target ? [...conflict.evaluateConflictMatrix(target, raw, { roleSensitive: true }).responseVector] : null;
      const adjusted = continuity.applyContinuity(rng, raw, previous, { targetTrial: target, interferenceLevel });

      assert.strictEqual(core.evaluateTrial(adjusted).isEntailed, beforeEntailment, 'surface relettering must preserve current-trial entailment');
      assert.strictEqual(new Set(continuity.trialLetters(adjusted)).size, 3, 'every trial must still contain exactly three unique letters');
      if (previous) {
        const analysis = continuity.analyseContinuity(previous, adjusted, target);
        assert.strictEqual(analysis.valid, true, `invalid continuity at N=${nBackLevel}, interference=${interferenceLevel}, index=${index}`);
        assert.strictEqual(analysis.previousOverlapCount, continuity.continuityCarryCount(interferenceLevel));
        assert.strictEqual(analysis.introducedCount, 3 - continuity.continuityCarryCount(interferenceLevel));
        assert.ok(analysis.previousOverlapCount >= 1 && analysis.previousOverlapCount <= 2);
        assert.ok(analysis.introducedCount >= 1);
        if (target) assert.ok(analysis.targetOverlapCount >= 1, 'scored trials must retain at least one N-back target letter');
        checkedTransitions += 1;
      }
      if (target) {
        const afterVector = [...conflict.evaluateConflictMatrix(target, adjusted, { roleSensitive: true }).responseVector];
        assert.deepStrictEqual(afterVector, beforeVector, 'surface continuity must not change the five logical answers');
      }
      history.push(adjusted);
    }
  }
}

const audit = continuity.runAudit(512);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures));
assert.ok(checkedTransitions > 250);

console.log(JSON.stringify({ passed: true, checkedTransitions, audit }, null, 2));
