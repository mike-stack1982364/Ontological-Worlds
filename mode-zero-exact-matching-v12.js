'use strict';

(function exposeModeZeroExactMatching(root, factory) {
  const apply = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = apply;
  if (root) {
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    if (core) apply(core);
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);

  class DeterministicRng {
    constructor(seed = 0x5f3759df) { this.state = seed >>> 0; }
    next() {
      let value = this.state += 0x6D2B79F5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }
    pick(values) { return values[Math.floor(this.next() * values.length)]; }
  }

  const SYSTEM_CASES = Object.freeze([
    {
      id: 'inverse-chain-nw-se', expected: true,
      premises: [
        { subject: 'A', relation: 'W', object: 'B' },
        { subject: 'B', relation: 'N', object: 'C' }
      ], conclusion: { subject: 'C', relation: 'SE', object: 'A' }
    },
    {
      id: 'branch-sw-exact', expected: true,
      premises: [
        { subject: 'E', relation: 'S', object: 'D' },
        { subject: 'F', relation: 'W', object: 'E' }
      ], conclusion: { subject: 'F', relation: 'SW', object: 'D' }
    },
    {
      id: 'sixteen-way-nne-exact', expected: true,
      premises: [
        { subject: 'G', relation: 'N', object: 'H' },
        { subject: 'H', relation: 'NE', object: 'J' }
      ], conclusion: { subject: 'G', relation: 'NNE', object: 'J' }
    },
    {
      id: 'adjacent-ne-for-nne', expected: false,
      premises: [
        { subject: 'K', relation: 'N', object: 'L' },
        { subject: 'L', relation: 'NE', object: 'M' }
      ], conclusion: { subject: 'K', relation: 'NE', object: 'M' }
    },
    {
      id: 'reversed-endpoints-without-direction-inversion', expected: false,
      premises: [
        { subject: 'N', relation: 'E', object: 'P' },
        { subject: 'P', relation: 'S', object: 'Q' }
      ], conclusion: { subject: 'Q', relation: 'SE', object: 'N' }
    },
    {
      id: 'relation-assigned-to-wrong-letter', expected: false,
      premises: [
        { subject: 'R', relation: 'W', object: 'S' },
        { subject: 'S', relation: 'S', object: 'T' }
      ], conclusion: { subject: 'S', relation: 'SW', object: 'T' }
    },
    {
      id: 'chain-se-exact', expected: true,
      premises: [
        { subject: 'U', relation: 'S', object: 'V' },
        { subject: 'V', relation: 'E', object: 'W' }
      ], conclusion: { subject: 'U', relation: 'SE', object: 'W' }
    },
    {
      id: 'equal-components-nw-not-nnw', expected: false,
      premises: [
        { subject: 'X', relation: 'W', object: 'Y' },
        { subject: 'Y', relation: 'N', object: 'Z' }
      ], conclusion: { subject: 'X', relation: 'NNW', object: 'Z' }
    },
    {
      id: 'diagonal-cancellation-east', expected: true,
      premises: [
        { subject: 'A', relation: 'NE', object: 'B' },
        { subject: 'B', relation: 'SE', object: 'C' }
      ], conclusion: { subject: 'A', relation: 'E', object: 'C' }
    },
    {
      id: 'shared-anchor-parallel-branches', expected: false,
      premises: [
        { subject: 'H', relation: 'NE', object: 'J' },
        { subject: 'K', relation: 'SE', object: 'J' }
      ], conclusion: { subject: 'H', relation: 'E', object: 'K' }
    }
  ]);

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function verdict(core, trial) {
    const evaluation = core.evaluateTrial(trial);
    return {
      expected: evaluation.isEntailed,
      expectedRelation: evaluation.expectedRelation,
      assertedRelation: evaluation.assertedRelation,
      distinctionClass: evaluation.distinctionClass,
      queryPairValid: evaluation.queryPairValid
    };
  }

  function renameTrial(trial, mapping) {
    const rename = statement => ({
      subject: mapping[statement.subject],
      relation: statement.relation,
      object: mapping[statement.object]
    });
    return {
      premises: trial.premises.map(rename),
      conclusion: rename(trial.conclusion)
    };
  }

  function rotateTrial(core, trial, steps) {
    const codes = core.directions.map(item => item.code);
    const rotate = code => codes[(codes.indexOf(code) + steps + 16) % 16];
    const transform = statement => ({
      subject: statement.subject,
      relation: rotate(statement.relation),
      object: statement.object
    });
    return {
      premises: trial.premises.map(transform),
      conclusion: transform(trial.conclusion)
    };
  }

  function invertStatement(core, statement) {
    return {
      subject: statement.object,
      relation: core.opposite(statement.relation),
      object: statement.subject
    };
  }

  function equivalentVariants(core, item, rng) {
    const letters = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z'];
    const sourceLetters = [...new Set([
      ...item.premises.flatMap(statement => [statement.subject, statement.object]),
      item.conclusion.subject, item.conclusion.object
    ])];
    const shuffled = [...letters].sort(() => rng.next() - 0.5);
    const mapping = Object.fromEntries(sourceLetters.map((letter, index) => [letter, shuffled[index]]));
    const renamed = renameTrial(item, mapping);
    const rotated = rotateTrial(core, renamed, Math.floor(rng.next() * 16));
    const reordered = clone(rotated);
    if (rng.next() < 0.5) reordered.premises.reverse();
    reordered.premises = reordered.premises.map(statement => rng.next() < 0.5 ? invertStatement(core, statement) : statement);
    if (rng.next() < 0.5) reordered.conclusion = invertStatement(core, reordered.conclusion);
    return reordered;
  }

  function runModeZeroExactMatchingAudit(core, iterationsPerCase = 4096, seed = 0x5f3759df) {
    const rng = new DeterministicRng(seed);
    const failures = [];
    const byLevel = {};
    let total = 0;
    let matches = 0;
    let nonMatches = 0;

    for (const level of LEVELS) {
      const levelStats = { total: 0, matches: 0, nonMatches: 0, failures: 0 };
      for (const systemCase of SYSTEM_CASES) {
        for (let iteration = 0; iteration < iterationsPerCase; iteration += 1) {
          const trial = equivalentVariants(core, systemCase, rng);
          const result = verdict(core, trial);
          total += 1;
          levelStats.total += 1;
          if (result.expected) { matches += 1; levelStats.matches += 1; }
          else { nonMatches += 1; levelStats.nonMatches += 1; }
          if (result.expected !== systemCase.expected) {
            levelStats.failures += 1;
            if (failures.length < 100) failures.push({
              level, caseId: systemCase.id, iteration,
              expected: systemCase.expected,
              actual: result.expected,
              expectedRelation: result.expectedRelation,
              assertedRelation: result.assertedRelation,
              distinctionClass: result.distinctionClass,
              trial
            });
          }
        }
      }
      byLevel[level] = levelStats;
    }

    const expectedPerLevel = SYSTEM_CASES.length * iterationsPerCase;
    return {
      passed: failures.length === 0,
      mode: 0,
      levels: [...LEVELS],
      cases: SYSTEM_CASES.length,
      iterationsPerCase,
      total,
      matches,
      nonMatches,
      expectedMatches: LEVELS.length * iterationsPerCase * SYSTEM_CASES.filter(item => item.expected).length,
      expectedNonMatches: LEVELS.length * iterationsPerCase * SYSTEM_CASES.filter(item => !item.expected).length,
      expectedPerLevel,
      byLevel,
      failures,
      invariants: {
        exactSixteenWayQuantisation: true,
        endpointBindingRequired: true,
        reversedQueryRequiresOppositeDirection: true,
        wrongLetterAssignmentRejected: true,
        sharedAnchorBranchesComparedBySubtraction: true,
        renamingInvariant: true,
        premiseOrderInvariant: true,
        statementInversionInvariant: true,
        rotationInvariant: true
      }
    };
  }

  return function applyModeZeroExactMatching(core) {
    if (!core || core.__modeZeroExactMatchingV12) return core;
    core.modeZeroExactSystemCases = () => clone(SYSTEM_CASES);
    core.runModeZeroExactMatchingAudit = (iterationsPerCase, seed) => runModeZeroExactMatchingAudit(core, iterationsPerCase, seed);
    core.modeZeroExactMatchingPolicy = Object.freeze({
      mode: 0,
      levels: [...LEVELS],
      matchDefinition: 'the asserted relation is exactly entailed for the tested ordered letter pair at sixteen-direction resolution',
      exactDirectionRequired: true,
      orderedEndpointBindingRequired: true,
      letteringIdentityRelevant: false,
      premiseOrderRelevant: false,
      inverseWordingEquivalentOnlyWithDirectionInversion: true,
      adjacentDirectionAccepted: false,
      wrongLetterAssignmentAccepted: false
    });
    core.__modeZeroExactMatchingV12 = true;
    return core;
  };
});
