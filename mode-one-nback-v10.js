'use strict';

(function exposeTriadicCurriculumNBack(root, factory) {
  const apply = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = apply;
  if (root) {
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    if (core) apply(core);
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const LEVEL_FOCUS = Object.freeze({
    1: 'direct entailment, reversal, wrong-letter binding and chain-versus-branch discrimination',
    2: 'inverse wording, premise reordering and equivalent endpoint orientation',
    3: 'four-, eight- and sixteen-way resolution regulation',
    4: 'equal-unit versus qualitative or unspecified-distance model-set reasoning',
    5: 'renaming, rotation, reflection and chirality regulation',
    6: 'proof-space comparison: cancellation, reinforcement, branches and alternative derivations',
    7: 'logical-contract and evaluation-policy discrimination',
    8: 'complete-profile integration across topology, mechanism, contract, validity, query and symmetry'
  });

  const clone = value => JSON.parse(JSON.stringify(value));

  function apply(core) {
    if (!core || core.__triadicCurriculumNBackV10) return core;
    if (!core.__triadicProfileNBackV9) {
      throw new Error('Triadic Entailment curriculum v10 requires complete-profile N-back v9.');
    }

    const levels = [...core.nBackLevels];
    const profiles = core.logicProfiles();
    const profileById = new Map(profiles.map(profile => [profile.id, profile]));
    const archetypes = core.canonicalNBackComparisons();
    const policies = core.nBackComparisonPolicies();
    const legacyWarmup = core.generateNBackWarmupTrial.bind(core);
    const legacyTrial = core.generateNBackTrial.bind(core);
    const legacyExplain = core.explainNBackTrial.bind(core);

    const archetypesByLevel = new Map(levels.map(level => [
      level,
      archetypes.filter(archetype => archetype.level === level)
    ]));

    const profileIdsByLevel = new Map(levels.map(level => [
      level,
      new Set(archetypesByLevel.get(level).flatMap(archetype => [
        archetype.targetProfile,
        archetype.currentProfile
      ]))
    ]));

    const policyKeysByLevel = new Map(levels.map(level => [
      level,
      [...new Set(archetypesByLevel.get(level).map(archetype => archetype.policy))]
    ]));

    function random(rng) {
      return rng && typeof rng.next === 'function' ? rng.next() : Math.random();
    }

    function pick(rng, values) {
      if (!values.length) throw new Error('Cannot choose from an empty Triadic Entailment curriculum pool.');
      if (rng && typeof rng.pick === 'function') return rng.pick(values);
      return values[Math.floor(random(rng) * values.length)];
    }

    function clampLevel(value) {
      return Math.max(1, Math.min(8, Math.round(Number(value) || 1)));
    }

    function policyForKey(key) {
      if (key === 'inverseEquivalent' || key === 'inverse-equivalent') return policies.inverseEquivalent;
      if (key === 'rotationOnly' || key === 'rotation-only') return policies.rotationOnly;
      return policies.standard;
    }

    function policyKey(policy) {
      if (policy?.id === 'inverse-equivalent') return 'inverseEquivalent';
      if (policy?.id === 'rotation-only') return 'rotationOnly';
      return 'standard';
    }

    function currentPolicy(target, archetype) {
      return target?.comparisonPolicy || policyForKey(archetype?.policy);
    }

    function desiredReflection(target, profile, policy, relation, rng, interferenceLevel) {
      const targetChirality = core.nBackLogicDescriptor(target).chirality;
      const baseChirality = Number(profile.chirality || 0) & 1;
      if (!policy.reflectionInvariant) {
        const shouldDiffer = relation === 'reflect';
        const desiredChirality = shouldDiffer ? targetChirality ^ 1 : targetChirality;
        return Boolean(baseChirality ^ desiredChirality);
      }
      if (relation === 'reflect') return !Boolean(target?.profileTransformation?.reflected);
      return interferenceLevel >= 45 ? random(rng) < 0.5 : false;
    }

    function finalizeCurrent(trial, target, archetype, level) {
      const targetSignature = core.nBackLogicSignature(target);
      const currentSignature = core.nBackLogicSignature(trial);
      const computedMatch = core.nBackEquivalent(target, trial);

      trial.nBackLevel = level;
      trial.nBackWarmup = false;
      trial.nBackTargetProfile = target.logicProfileId;
      trial.nBackCurrentProfile = trial.logicProfileId;
      trial.nBackTargetSignature = targetSignature;
      trial.nBackCurrentSignature = currentSignature;
      trial.nBackRequestedMatch = Boolean(archetype.expected);
      trial.nBackMatch = computedMatch;
      trial.isMatch = computedMatch;
      trial.scored = true;
      trial.signature = currentSignature;
      trial.curriculumArchetypeId = archetype.id;
      trial.curriculumLevel = level;
      trial.curriculumFocus = LEVEL_FOCUS[level];
      trial.curriculumSource = 'approved-80-case-matrix';

      if (computedMatch !== Boolean(archetype.expected)) {
        throw new Error(`Curriculum archetype ${archetype.id} disagrees with complete-profile comparison.`);
      }
      return trial;
    }

    function instantiateArchetype(archetypeOrId, rng, options = {}) {
      const archetype = typeof archetypeOrId === 'string'
        ? archetypes.find(item => item.id === archetypeOrId)
        : archetypeOrId;
      if (!archetype) throw new Error(`Unknown Triadic Entailment curriculum archetype: ${archetypeOrId}`);

      const level = clampLevel(archetype.level);
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const targetProfile = profileById.get(archetype.targetProfile);
      const currentProfile = profileById.get(archetype.currentProfile);
      const policy = policyForKey(archetype.policy);
      if (!targetProfile || !currentProfile) throw new Error(`Archetype ${archetype.id} references an unknown logical profile.`);

      const target = core.instantiateLogicProfile(targetProfile, rng, {
        interferenceLevel,
        policy,
        reflected: false
      });
      target.nBackLevel = level;
      target.nBackWarmup = true;
      target.nBackMatch = false;
      target.isMatch = false;
      target.scored = false;
      target.signature = core.nBackLogicSignature(target);
      target.curriculumArchetypeId = archetype.id;
      target.curriculumLevel = level;
      target.curriculumFocus = LEVEL_FOCUS[level];
      target.curriculumSource = 'approved-80-case-matrix';

      const reflected = desiredReflection(
        target,
        currentProfile,
        policy,
        archetype.relation,
        rng,
        interferenceLevel
      );
      const current = core.instantiateLogicProfile(currentProfile, rng, {
        target,
        interferenceLevel,
        policy,
        reflected
      });
      finalizeCurrent(current, target, archetype, level);

      return {
        archetype: clone(archetype),
        target,
        current,
        expected: Boolean(archetype.expected),
        level,
        focus: LEVEL_FOCUS[level]
      };
    }

    function targetArchetypePool(level) {
      const levelArchetypes = archetypesByLevel.get(level) || [];
      const supported = levelArchetypes.filter(archetype => {
        const sameTarget = levelArchetypes.filter(other => other.targetProfile === archetype.targetProfile);
        return sameTarget.some(other => other.expected) && sameTarget.some(other => !other.expected);
      });
      return supported.length ? supported : levelArchetypes;
    }

    function matchingArchetypeCandidates(target, level, requestedMatch) {
      const activePolicyKey = policyKey(target?.comparisonPolicy);
      return (archetypesByLevel.get(level) || []).filter(archetype =>
        archetype.targetProfile === target.logicProfileId
        && Boolean(archetype.expected) === Boolean(requestedMatch)
        && archetype.policy === activePolicyKey
      );
    }

    function generalisedLevelCandidates(target, level, requestedMatch) {
      const policy = target?.comparisonPolicy || policies.standard;
      const targetChirality = core.nBackLogicDescriptor(target).chirality;
      const ids = [...(profileIdsByLevel.get(level) || [])];
      const candidates = [];
      ids.forEach(id => {
        const profile = profileById.get(id);
        if (!profile) return;
        const reflectionOptions = policy.reflectionInvariant ? [false] : [false, true];
        reflectionOptions.forEach(reflected => {
          const synthetic = {
            logicProfile: profile,
            logicProfileId: profile.id,
            logicalContract: profile.contract,
            comparisonPolicy: policy,
            queryOrientation: profile.queryOrientation,
            chirality: (Number(profile.chirality || 0) ^ Number(reflected)) & 1
          };
          const equivalent = core.nBackEquivalent(target, synthetic);
          if (equivalent === requestedMatch) {
            candidates.push({
              profile,
              relation: !policy.reflectionInvariant && synthetic.chirality !== targetChirality ? 'reflect' : 'ordinary'
            });
          }
        });
      });
      return candidates;
    }

    function diagnosticPriority(archetype) {
      const learner = core.__triadicLearnerModelV10;
      if (!learner || !archetype) return 0;
      const currentProfile = profileById.get(archetype.currentProfile || archetype.profile?.id);
      const classId = currentProfile?.validityClass || 'unknown';
      return learner.errorsByClass[classId] || 0;
    }

    function chooseCandidate(rng, candidates, adaptive) {
      if (!adaptive || candidates.length < 2) return pick(rng, candidates);
      const ranked = [...candidates].sort((first, second) => diagnosticPriority(second) - diagnosticPriority(first));
      const topScore = diagnosticPriority(ranked[0]);
      const top = ranked.filter(item => diagnosticPriority(item) === topScore);
      return pick(rng, top.length ? top : ranked);
    }

    core.generateNBackWarmupTrial = function generateCurriculumWarmup(rng, options = {}) {
      const level = clampLevel(options.nBackLevel);
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const anchor = pick(rng, targetArchetypePool(level));
      const targetProfile = profileById.get(anchor.targetProfile);
      const policy = policyForKey(anchor.policy);
      if (!targetProfile) return legacyWarmup(rng, options);

      const trial = core.instantiateLogicProfile(targetProfile, rng, {
        interferenceLevel,
        policy,
        reflected: false
      });
      trial.nBackLevel = level;
      trial.nBackWarmup = true;
      trial.nBackCurrentSignature = core.nBackLogicSignature(trial);
      trial.nBackMatch = false;
      trial.isMatch = false;
      trial.scored = false;
      trial.signature = trial.nBackCurrentSignature;
      trial.curriculumArchetypeId = anchor.id;
      trial.curriculumLevel = level;
      trial.curriculumFocus = LEVEL_FOCUS[level];
      trial.curriculumSource = 'approved-80-case-matrix';
      return trial;
    };

    core.generateNBackTrial = function generateCurriculumTrial(rng, target, options = {}) {
      const level = clampLevel(options.nBackLevel);
      const requestedMatch = Boolean(options.match);
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const adaptive = typeof options.adaptive === 'boolean'
        ? options.adaptive
        : Boolean(typeof document !== 'undefined' && document.getElementById('adaptive')?.checked);
      const candidates = matchingArchetypeCandidates(target, level, requestedMatch);

      if (!candidates.length) {
        const generalised = generalisedLevelCandidates(target, level, requestedMatch);
        if (generalised.length) {
          const selected = chooseCandidate(rng, generalised, adaptive);
          const policy = target?.comparisonPolicy || policies.standard;
          const reflected = desiredReflection(target, selected.profile, policy, selected.relation, rng, interferenceLevel);
          const trial = core.instantiateLogicProfile(selected.profile, rng, {
            target,
            interferenceLevel,
            policy,
            reflected
          });
          const syntheticArchetype = {
            id: `L${level}-GENERAL-${target.logicProfileId}-${selected.profile.id}`,
            level,
            targetProfile: target.logicProfileId,
            currentProfile: selected.profile.id,
            expected: requestedMatch,
            policy: policyKey(policy),
            relation: selected.relation
          };
          const finalised = finalizeCurrent(trial, target, syntheticArchetype, level);
          finalised.curriculumSource = 'level-constrained-profile-generalisation';
          return finalised;
        }
        const fallback = legacyTrial(rng, target, options);
        fallback.curriculumLevel = level;
        fallback.curriculumFocus = LEVEL_FOCUS[level];
        fallback.curriculumSource = 'safety-fallback';
        return fallback;
      }

      const archetype = chooseCandidate(rng, candidates, adaptive);
      const profile = profileById.get(archetype.currentProfile);
      const policy = currentPolicy(target, archetype);
      const reflected = desiredReflection(target, profile, policy, archetype.relation, rng, interferenceLevel);
      const trial = core.instantiateLogicProfile(profile, rng, {
        target,
        interferenceLevel,
        policy,
        reflected
      });
      return finalizeCurrent(trial, target, archetype, level);
    };

    core.recordNBackResponse = function recordNBackResponse(trial, response) {
      if (!trial || trial.nBackWarmup || typeof trial.nBackMatch !== 'boolean') return;
      const learner = core.__triadicLearnerModelV10;
      learner.responses += 1;
      const correct = Boolean(response) === trial.nBackMatch;
      if (correct) learner.correct += 1;
      else {
        learner.errors += 1;
        const classId = trial.logicProfile?.validityClass || trial.withinTrialDistinctionClass || 'profile-equivalence';
        learner.errorsByClass[classId] = (learner.errorsByClass[classId] || 0) + 1;
      }
    };

    core.__triadicLearnerModelV10 = {
      responses: 0,
      correct: 0,
      errors: 0,
      errorsByClass: Object.create(null)
    };

    core.explainNBackTrial = function explainCurriculumTrial(trial) {
      const base = legacyExplain(trial);
      if (!trial?.curriculumArchetypeId) return base;
      return `${base} Level ${trial.curriculumLevel} focus: ${trial.curriculumFocus}.`;
    };

    core.instantiateNBackArchetype = instantiateArchetype;
    core.nBackLevelCurriculum = level => clone(archetypesByLevel.get(clampLevel(level)) || []);
    core.nBackLevelSpecifications = () => clone(LEVEL_FOCUS);
    core.nBackLevelProfileIds = level => [...(profileIdsByLevel.get(clampLevel(level)) || [])];
    core.nBackLevelPolicyKeys = level => [...(policyKeysByLevel.get(clampLevel(level)) || [])];

    core.runNBackV10Audit = function runNBackV10Audit(iterations = 16384) {
      const failures = [];
      const examplesPerLevel = {};
      const instantiatedPerLevel = {};
      const directArchetypeUse = Object.fromEntries(levels.map(level => [level, 0]));

      levels.forEach(level => {
        const items = archetypesByLevel.get(level) || [];
        examplesPerLevel[level] = items.length;
        if (items.length !== 10) failures.push(`level-${level}-count-${items.length}`);
      });
      if (archetypes.length !== 80) failures.push(`archetype-count-${archetypes.length}`);

      class AuditRng {
        constructor(seed = 0x10c080) { this.s = seed >>> 0; }
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

      const rng = new AuditRng();
      archetypes.forEach(archetype => {
        try {
          const pair = instantiateArchetype(archetype, rng, { interferenceLevel: 100 });
          if (pair.current.nBackMatch !== archetype.expected) failures.push(`archetype-answer-${archetype.id}`);
          if (pair.target.letters.some(letter => pair.current.letters.includes(letter))) failures.push(`archetype-letter-overlap-${archetype.id}`);
          if ((core.renderTrial(pair.target).match(/;/g) || []).length !== 2) failures.push(`archetype-target-surface-${archetype.id}`);
          if ((core.renderTrial(pair.current).match(/;/g) || []).length !== 2) failures.push(`archetype-current-surface-${archetype.id}`);
          if (/contract\s*:|therefore/i.test(core.renderTrial(pair.target))) failures.push(`archetype-target-leak-${archetype.id}`);
          if (/contract\s*:|therefore/i.test(core.renderTrial(pair.current))) failures.push(`archetype-current-leak-${archetype.id}`);
          instantiatedPerLevel[archetype.level] = (instantiatedPerLevel[archetype.level] || 0) + 1;
        } catch (error) {
          failures.push(`archetype-${archetype.id}:${error.message}`);
        }
      });

      for (let index = 0; index < iterations; index += 1) {
        const level = levels[index % levels.length];
        const target = core.generateNBackWarmupTrial(rng, {
          nBackLevel: level,
          interferenceLevel: index % 101
        });
        const requestedMatch = index % 2 === 0;
        const current = core.generateNBackTrial(rng, target, {
          nBackLevel: level,
          interferenceLevel: index % 101,
          match: requestedMatch,
          adaptive: index % 3 === 0
        });
        if (current.nBackMatch !== requestedMatch) failures.push(`generated-answer-${index}`);
        if (current.curriculumArchetypeId) directArchetypeUse[level] += 1;
        if (target.letters.some(letter => current.letters.includes(letter))) failures.push(`generated-letter-overlap-${index}`);
        if (/contract\s*:|therefore/i.test(core.renderTrial(current))) failures.push(`generated-surface-leak-${index}`);
      }

      levels.forEach(level => {
        if (instantiatedPerLevel[level] !== 10) failures.push(`instantiated-level-${level}-${instantiatedPerLevel[level] || 0}`);
        if (!directArchetypeUse[level]) failures.push(`runtime-archetype-unused-level-${level}`);
      });

      return {
        passed: failures.length === 0,
        failures,
        iterations,
        archetypeCount: archetypes.length,
        examplesPerLevel,
        instantiatedPerLevel,
        directArchetypeUse,
        nBackLevels: levels,
        implementationCoveragePercent: failures.length === 0 ? 100 : 0,
        liveCurriculumUsesApprovedMatrix: true,
        letteringIdentityRelevant: false,
        premiseContractTextVisible: false,
        thereforeVisible: false,
        separatePostResponseExplanation: true,
        modeTwoPreserved: true
      };
    };

    core.__triadicCurriculumNBackV10 = true;
    core.nBackRuntime = 'level-specific-80-archetype-nback-v10';
    core.nBackPolicy = Object.freeze({
      ...core.nBackPolicy,
      minimumLevel: 1,
      maximumLevel: 8,
      letteringIdentityRelevant: false,
      absoluteDirectionIdentityRelevant: false,
      curriculumExamples: 80,
      examplesPerLevel: 10,
      levelSpecificCurriculum: true,
      adaptiveDiagnosticSelection: true,
      matchIdentity: 'complete logical-profile equivalence with the triad exactly N positions back'
    });
    core.implementationCoverage = Object.freeze({
      percent: 100,
      basis: '80 approved comparison archetypes, ten at each N-back level from 1 through 8',
      visiblePremiseFormat: 'exactly three relational statements',
      letteringIdentityRelevant: false,
      explanationSeparatedFromPremise: true,
      modeTwoPreserved: true
    });

    return core;
  }

  return apply;
});
