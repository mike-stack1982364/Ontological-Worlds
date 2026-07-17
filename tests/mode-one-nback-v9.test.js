'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const applyApproved = require(path.join(__dirname, '..', 'mode-one-approved-trials-v7.js'));
const applyV8 = require(path.join(__dirname, '..', 'mode-one-nback-v8.js'));
const applyV9 = require(path.join(__dirname, '..', 'mode-one-nback-v9.js'));

applyApproved(core);
applyV8(core);
applyV9(core);

class AuditRng {
  constructor(seed = 0x98080) { this.s = seed >>> 0; }
  next() {
    let value = this.s += 1831565813;
    value = Math.imul(value ^ value >>> 15, 1 | value);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.next() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }
}

assert.deepStrictEqual(core.nBackLevels, [1, 2, 3, 4, 5, 6, 7, 8]);
assert.strictEqual(core.nBackRuntime, 'complete-logical-profile-nback-v9');
assert.strictEqual(core.nBackPolicy.letteringIdentityRelevant, false);
assert.strictEqual(core.nBackPolicy.absoluteDirectionIdentityRelevant, false);
assert.deepStrictEqual(core.nBackPolicy.comparisonDimensions, [
  'proof topology',
  'transformation mechanism',
  'logical contract',
  'validity class',
  'query orientation',
  'symmetry criterion'
]);

const archetypes = core.canonicalNBackComparisons();
assert.strictEqual(archetypes.length, 80);
for (let level = 1; level <= 8; level += 1) {
  assert.strictEqual(archetypes.filter(item => item.level === level).length, 10);
}

const profiles = core.logicProfiles();
assert(profiles.length >= 20);
assert(profiles.some(profile => profile.contract.metric === 'qualitative-sign'));
assert(profiles.some(profile => profile.contract.metric === 'positive-unspecified'));
assert(profiles.some(profile => profile.topology === 'branch'));
assert(profiles.some(profile => profile.mechanism === 'vector-cancellation'));
assert(profiles.some(profile => profile.validityClass === 'possible-not-necessary'));

const audit = core.runNBackV9Audit(16384);
assert.strictEqual(audit.passed, true, audit.failures.join(', '));
assert.strictEqual(audit.archetypeCount, 80);
assert.deepStrictEqual(audit.examplesPerLevel, {
  1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10, 8: 10
});
assert(audit.matches > 0);
assert(audit.nonMatches > 0);
assert.strictEqual(audit.visibleContractText, false);
assert.strictEqual(audit.modeTwoPreserved, true);

const rng = new AuditRng();
for (const level of core.nBackLevels) {
  const trials = [];
  for (let index = 0; index < level + 96; index += 1) {
    const target = trials[trials.length - level];
    const trial = target
      ? core.generateNBackTrial(rng, target, {
          match: index % 2 === 0,
          nBackLevel: level,
          interferenceLevel: 100
        })
      : core.generateNBackWarmupTrial(rng, {
          nBackLevel: level,
          interferenceLevel: 100
        });

    assert.strictEqual(trial.nBackLevel, level);
    assert.strictEqual((core.renderTrial(trial).match(/;/g) || []).length, 2);
    assert(!/contract\s*:|therefore/i.test(core.renderTrial(trial)));
    assert.strictEqual(trial.withinTrialEntailed, trial.logicProfile.expected);
    if (target) {
      assert.strictEqual(trial.scored, true);
      assert.strictEqual(trial.nBackMatch, index % 2 === 0);
      assert.strictEqual(core.nBackEquivalent(trial, target), index % 2 === 0);
      assert(trial.letters.every(letter => !new Set(target.letters).has(letter)), 'N-back trial reused target lettering.');
    } else {
      assert.strictEqual(trial.scored, false);
      assert.strictEqual(trial.nBackWarmup, true);
    }
    trials.push(trial);
  }
}

const policySet = core.nBackComparisonPolicies();
const directProfile = profiles.find(profile => profile.id === 'chain-orthogonal-direct-unit8');
const inverseProfile = profiles.find(profile => profile.id === 'chain-orthogonal-inverse-unit8');
const targetDirect = core.instantiateLogicProfile(directProfile, rng, {
  interferenceLevel: 0,
  policy: policySet.inverseEquivalent,
  reflected: false
});
const inverseSurface = core.instantiateLogicProfile(inverseProfile, rng, {
  target: targetDirect,
  interferenceLevel: 0,
  policy: policySet.inverseEquivalent,
  reflected: false
});
assert.strictEqual(core.nBackLogicSignature(targetDirect), core.nBackLogicSignature(inverseSurface));

const rotationTarget = core.instantiateLogicProfile(directProfile, rng, {
  interferenceLevel: 0,
  policy: policySet.rotationOnly,
  reflected: false
});
const reflectedCurrent = core.instantiateLogicProfile(directProfile, rng, {
  target: rotationTarget,
  interferenceLevel: 0,
  policy: policySet.rotationOnly,
  reflected: true
});
assert.notStrictEqual(core.nBackLogicSignature(rotationTarget), core.nBackLogicSignature(reflectedCurrent));

const qualitative = profiles.find(profile => profile.id === 'chain-qualitative-quadrant8');
const qualitativeTrial = core.instantiateLogicProfile(qualitative, rng, {
  interferenceLevel: 100,
  policy: policySet.standard
});
assert.strictEqual(core.evaluateContractTrial(qualitativeTrial).necessary, true);

const overPrecise = profiles.find(profile => profile.id === 'chain-positive16-overprecise');
const overPreciseTrial = core.instantiateLogicProfile(overPrecise, rng, {
  interferenceLevel: 100,
  policy: policySet.standard
});
const overPreciseEvaluation = core.evaluateContractTrial(overPreciseTrial);
assert.strictEqual(overPreciseEvaluation.possible, true);
assert.strictEqual(overPreciseEvaluation.necessary, false);
assert.strictEqual(overPreciseTrial.withinTrialEntailed, false);

console.log(JSON.stringify({
  passed: true,
  archetypes: archetypes.length,
  examplesPerLevel: audit.examplesPerLevel,
  profiles: profiles.length,
  policy: core.nBackPolicy,
  audit
}, null, 2));