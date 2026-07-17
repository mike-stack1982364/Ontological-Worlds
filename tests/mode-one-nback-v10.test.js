'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const applyApproved = require(path.join(__dirname, '..', 'mode-one-approved-trials-v7.js'));
const applyV8 = require(path.join(__dirname, '..', 'mode-one-nback-v8.js'));
const applyV9 = require(path.join(__dirname, '..', 'mode-one-nback-v9.js'));
const applyV10 = require(path.join(__dirname, '..', 'mode-one-nback-v10.js'));

applyApproved(core);
applyV8(core);
applyV9(core);
applyV10(core);

class AuditRng {
  constructor(seed = 0x801008) { this.s = seed >>> 0; }
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

assert.strictEqual(core.nBackRuntime, 'level-specific-80-archetype-nback-v10');
assert.strictEqual(core.implementationCoverage.percent, 100);
assert.strictEqual(core.nBackPolicy.curriculumExamples, 80);
assert.strictEqual(core.nBackPolicy.examplesPerLevel, 10);
assert.strictEqual(core.nBackPolicy.levelSpecificCurriculum, true);
assert.strictEqual(core.nBackPolicy.letteringIdentityRelevant, false);
assert.deepStrictEqual(core.nBackLevels, [1, 2, 3, 4, 5, 6, 7, 8]);

const specifications = core.nBackLevelSpecifications();
assert.strictEqual(Object.keys(specifications).length, 8);
assert.match(specifications[1], /direct entailment/);
assert.match(specifications[4], /model-set/);
assert.match(specifications[8], /complete-profile/);

const comparisons = core.canonicalNBackComparisons();
assert.strictEqual(comparisons.length, 80);
const rng = new AuditRng();
for (let level = 1; level <= 8; level += 1) {
  const curriculum = core.nBackLevelCurriculum(level);
  assert.strictEqual(curriculum.length, 10);
  assert(curriculum.every(item => item.level === level));
  assert(core.nBackLevelProfileIds(level).length > 0);
  assert(core.nBackLevelPolicyKeys(level).length > 0);
}

for (const archetype of comparisons) {
  const pair = core.instantiateNBackArchetype(archetype.id, rng, { interferenceLevel: 100 });
  assert.strictEqual(pair.level, archetype.level);
  assert.strictEqual(pair.expected, archetype.expected);
  assert.strictEqual(pair.current.nBackMatch, archetype.expected);
  assert.strictEqual(core.nBackEquivalent(pair.target, pair.current), archetype.expected);
  assert(pair.current.letters.every(letter => !pair.target.letters.includes(letter)));
  for (const trial of [pair.target, pair.current]) {
    const rendered = core.renderTrial(trial);
    assert.strictEqual((rendered.match(/;/g) || []).length, 2);
    assert(!/contract\s*:|therefore/i.test(rendered));
  }
}

const before = core.__triadicLearnerModelV10.errors;
const diagnosticPair = core.instantiateNBackArchetype('1.6', rng, { interferenceLevel: 100 });
core.recordNBackResponse(diagnosticPair.current, true);
assert.strictEqual(core.__triadicLearnerModelV10.errors, before + 1);
assert(core.__triadicLearnerModelV10.errorsByClass['adjacent-resolution-error'] >= 1);

const audit = core.runNBackV10Audit(8192);
assert.strictEqual(audit.passed, true, audit.failures.join(', '));
assert.strictEqual(audit.implementationCoveragePercent, 100);
assert.strictEqual(audit.archetypeCount, 80);
assert.deepStrictEqual(audit.examplesPerLevel, {
  1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10, 8: 10
});
assert.strictEqual(audit.liveCurriculumUsesApprovedMatrix, true);
assert.strictEqual(audit.letteringIdentityRelevant, false);
assert.strictEqual(audit.premiseContractTextVisible, false);
assert.strictEqual(audit.thereforeVisible, false);
assert.strictEqual(audit.separatePostResponseExplanation, true);
assert.strictEqual(audit.modeTwoPreserved, true);

console.log(JSON.stringify({
  passed: true,
  implementationCoveragePercent: audit.implementationCoveragePercent,
  nBackRuntime: core.nBackRuntime,
  archetypes: audit.archetypeCount,
  examplesPerLevel: audit.examplesPerLevel,
  directArchetypeUse: audit.directArchetypeUse
}, null, 2));
