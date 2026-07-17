'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const applyApproved = require(path.join(__dirname, '..', 'mode-one-approved-trials-v7.js'));
const applyV8 = require(path.join(__dirname, '..', 'mode-one-nback-v8.js'));
const applyV9 = require(path.join(__dirname, '..', 'mode-one-nback-v9.js'));
const applyV10 = require(path.join(__dirname, '..', 'mode-one-nback-v10.js'));
const applyV11 = require(path.join(__dirname, '..', 'mode-one-nback-v11.js'));

applyApproved(core);
applyV8(core);
applyV9(core);
applyV10(core);
applyV11(core);

class AuditRng {
  constructor(seed = 0x160160) { this.s = seed >>> 0; }
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

assert.strictEqual(core.nBackRuntime, 'level-specific-160-archetype-meta-nback-v11');
assert.strictEqual(core.implementationCoverage.percent, 100);
assert.strictEqual(core.implementationCoverage.criterionRegulation, true);
assert.strictEqual(core.implementationCoverage.proofSpaceComparison, true);
assert.strictEqual(core.implementationCoverage.ruleRevision, true);
assert.strictEqual(core.nBackPolicy.curriculumExamples, 160);
assert.strictEqual(core.nBackPolicy.examplesPerLevel, 20);
assert.strictEqual(core.nBackPolicy.letteringIdentityRelevant, false);
assert.strictEqual(core.nBackPolicy.absoluteDirectionIdentityRelevant, false);
assert.deepStrictEqual(core.nBackLevels, [1, 2, 3, 4, 5, 6, 7, 8]);

const specifications = core.nBackLevelSpecifications();
assert.strictEqual(Object.keys(specifications).length, 8);
assert.match(specifications[1], /local-versus-global/);
assert.match(specifications[4], /model spaces/);
assert.match(specifications[6], /same answer versus same proof/);
assert.match(specifications[7], /criterion selection/);
assert.match(specifications[8], /contract revision/);

const comparisons = core.canonicalNBackComparisons();
assert.strictEqual(comparisons.length, 160);
assert.strictEqual(comparisons.filter(item => item.expected).length, 80);
assert.strictEqual(comparisons.filter(item => !item.expected).length, 80);
for (let level = 1; level <= 8; level += 1) {
  const curriculum = core.nBackLevelCurriculum(level);
  assert.strictEqual(curriculum.length, 20);
  assert.strictEqual(new Set(curriculum.map(item => `${item.targetProfile}|${item.currentProfile}|${item.policy}|${item.relation}`)).size, 20);
  assert(curriculum.every(item => item.level === level));
}

const profiles = core.logicProfiles();
assert(profiles.length >= 50);
assert(profiles.some(item => item.validityClass === 'compatible-possibility'));
assert(profiles.some(item => item.validityClass === 'contradiction'));
assert(profiles.some(item => item.validityClass === 'local-consistency-without-global-entailment'));
assert(profiles.some(item => item.criterionClass === 'minimal-revision'));
assert(profiles.some(item => item.criterionClass === 'proof-identity'));
assert(profiles.some(item => item.criterionClass === 'counterfactual-dependency'));

const policies = core.nBackComparisonPolicies();
for (const key of [
  'standard', 'inverseEquivalent', 'rotationOnly', 'semanticEquivalent', 'proofEquivalent',
  'structuralEquivalent', 'proofIdentity', 'criterionOnly', 'criterionSensitive',
  'revisionSensitive', 'frameSensitive', 'counterfactualSensitive', 'fullIntegration'
]) assert.ok(policies[key], `Missing policy ${key}`);

const rng = new AuditRng();
for (const archetype of comparisons) {
  const pair = core.instantiateNBackArchetype(archetype.id, rng, { interferenceLevel: 100 });
  assert.strictEqual(pair.level, archetype.level);
  assert.strictEqual(pair.expected, archetype.expected);
  assert.strictEqual(pair.current.nBackMatch, archetype.expected);
  assert.strictEqual(core.nBackEquivalent(pair.target, pair.current), archetype.expected);
  assert(pair.current.letters.every(letter => !pair.target.letters.includes(letter)), `Letters overlap in ${archetype.id}`);
  for (const trial of [pair.target, pair.current]) {
    const rendered = core.renderTrial(trial);
    assert.strictEqual((rendered.match(/;/g) || []).length, 2);
    assert(!/contract\s*:|therefore/i.test(rendered));
    assert.strictEqual(trial.withinTrialEntailed, trial.logicProfile.expected);
  }
}

const localPair = core.instantiateNBackArchetype('1.16', rng, { interferenceLevel: 100 });
assert.strictEqual(localPair.current.logicProfile.validityClass, 'local-consistency-without-global-entailment');
assert.strictEqual(localPair.current.withinTrialEntailed, false);

const semanticPair = core.instantiateNBackArchetype('6.11', rng, { interferenceLevel: 100 });
assert.strictEqual(semanticPair.current.nBackMatch, true);
const proofPair = core.instantiateNBackArchetype('6.12', rng, { interferenceLevel: 100 });
assert.strictEqual(proofPair.current.nBackMatch, false);

const stablePair = core.instantiateNBackArchetype('8.11', rng, { interferenceLevel: 100 });
assert.strictEqual(stablePair.current.nBackMatch, true);
const revisionPair = core.instantiateNBackArchetype('8.12', rng, { interferenceLevel: 100 });
assert.strictEqual(revisionPair.current.nBackMatch, false);

const errorsBefore = core.__triadicLearnerModelV11.errors;
core.recordNBackResponse(revisionPair.current, true);
assert.strictEqual(core.__triadicLearnerModelV11.errors, errorsBefore + 1);
assert(core.__triadicLearnerModelV11.errorsByDependency['revision-critical'] >= 1);
assert(core.__triadicLearnerModelV11.errorsByCriterion['minimal-revision'] >= 1);

const audit = core.runNBackV11Audit(16384);
assert.strictEqual(audit.passed, true, audit.failures.join(', '));
assert.strictEqual(audit.archetypeCount, 160);
assert.strictEqual(audit.matches, 80);
assert.strictEqual(audit.nonMatches, 80);
assert.deepStrictEqual(audit.examplesPerLevel, {
  1: 20, 2: 20, 3: 20, 4: 20, 5: 20, 6: 20, 7: 20, 8: 20
});
assert.deepStrictEqual(audit.uniqueWithinLevel, {
  1: 20, 2: 20, 3: 20, 4: 20, 5: 20, 6: 20, 7: 20, 8: 20
});
assert.strictEqual(audit.implementationCoveragePercent, 100);
assert.strictEqual(audit.criterionRegulationImplemented, true);
assert.strictEqual(audit.proofSpaceComparisonImplemented, true);
assert.strictEqual(audit.ruleRevisionImplemented, true);
assert.strictEqual(audit.premiseContractTextVisible, false);
assert.strictEqual(audit.thereforeVisible, false);
assert.strictEqual(audit.modeTwoPreserved, true);

console.log(JSON.stringify({
  passed: true,
  implementationCoveragePercent: audit.implementationCoveragePercent,
  nBackRuntime: core.nBackRuntime,
  archetypes: audit.archetypeCount,
  examplesPerLevel: audit.examplesPerLevel,
  matches: audit.matches,
  nonMatches: audit.nonMatches,
  policyCoverage: audit.policyCoverage,
  profiles: audit.profileCount
}, null, 2));
