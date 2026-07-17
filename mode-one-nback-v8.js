'use strict';

(function exposeTriadicLogicNBack(root, factory) {
  const apply = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = apply;
  if (root) {
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    if (core) apply(core);
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
  const FAMILY_NAMES = Object.freeze({
    'inverse-chain-entailment': 'inverse-chain entailment',
    'reordered-inverse-wording': 'reordered inverse-wording entailment',
    'sixteen-way-exact-composition': 'sixteen-way exact composition',
    'adjacent-resolution-substitution': 'adjacent-resolution substitution',
    'subject-object-reversal': 'subject–object reversal',
    'wrong-letter-pair': 'wrong-letter binding',
    'direct-chain-entailment': 'direct-chain entailment',
    'sixteen-way-near-miss': 'sixteen-way near-miss',
    'vector-cancellation': 'vector cancellation',
    'parallel-branch-discrimination': 'parallel-branch discrimination'
  });

  const clone = value => JSON.parse(JSON.stringify(value));

  function random(rng) {
    return rng && typeof rng.next === 'function' ? rng.next() : Math.random();
  }

  function pick(rng, values) {
    if (!values.length) throw new Error('Cannot choose from an empty N-back template pool.');
    if (rng && typeof rng.pick === 'function') return rng.pick(values);
    return values[Math.floor(random(rng) * values.length)];
  }

  function shuffle(rng, values) {
    if (rng && typeof rng.shuffle === 'function') return rng.shuffle(values);
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random(rng) * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function clampLevel(value) {
    return Math.max(1, Math.min(8, Math.round(Number(value) || 1)));
  }

  function trialLetters(trial) {
    if (Array.isArray(trial?.letters) && trial.letters.length === 3) return [...trial.letters];
    return [...new Set([
      ...(trial?.premises || []).flatMap(statement => [statement.subject, statement.object]),
      trial?.conclusion?.subject,
      trial?.conclusion?.object
    ].filter(Boolean))];
  }

  function apply(core) {
    if (!core || core.__triadicLogicNBackV8) return core;
    if (typeof core.approvedTrials !== 'function') {
      throw new Error('Triadic Logic N-back requires the approved ten-family generator.');
    }

    const templates = core.approvedTrials();
    const templateByFamily = new Map(templates.map(template => [template.family, template]));
    const directionCodes = core.DIRECTIONS.map(item => item.code);
    const directionIndex = new Map(directionCodes.map((code, index) => [code, index]));

    function familyOf(trial) {
      return trial?.approvedTemplateFamily || trial?.family || null;
    }

    function logicSignature(trial) {
      const family = familyOf(trial);
      if (!family || !templateByFamily.has(family)) {
        throw new Error('Triadic N-back trial lacks an approved logical family.');
      }
      return `TRIADIC-LOGIC:${family}`;
    }

    function transformDirection(code, rotation, reflected) {
      const index = directionIndex.get(code);
      if (!Number.isInteger(index)) throw new Error(`Unknown Triadic Entailment direction: ${code}`);
      const reflectedIndex = reflected ? (16 - index) % 16 : index;
      return directionCodes[(reflectedIndex + rotation + 16) % 16];
    }

    function transformStatement(statement, letterMap, rotation, reflected) {
      return {
        subject: letterMap[statement.subject],
        relation: transformDirection(statement.relation, rotation, reflected),
        object: letterMap[statement.object]
      };
    }

    function chooseReplacementLetters(rng, target) {
      const excluded = new Set(trialLetters(target));
      const nonOverlapping = shuffle(rng, core.LETTERS.filter(letter => !excluded.has(letter)));
      if (nonOverlapping.length >= 3) return nonOverlapping.slice(0, 3);
      const fallback = shuffle(rng, core.LETTERS).slice(0, 3);
      const targetSequence = trialLetters(target).join('|');
      return fallback.join('|') === targetSequence ? [fallback[1], fallback[2], fallback[0]] : fallback;
    }

    function transformedTemplate(template, target, rng, interferenceLevel) {
      const sourceLetters = trialLetters(template);
      const replacementLetters = chooseReplacementLetters(rng, target);
      const letterMap = Object.fromEntries(sourceLetters.map((letter, index) => [letter, replacementLetters[index]]));
      const resolutionStep = interferenceLevel < 25 ? 4 : interferenceLevel < 70 ? 2 : 1;
      const rotations = Array.from({ length: 16 / resolutionStep }, (_, index) => index * resolutionStep);
      const rotation = pick(rng, rotations);
      const reflected = interferenceLevel >= 45 && random(rng) < 0.5;
      const inversionProbability = Math.min(0.5, interferenceLevel / 200);

      let premises = template.premises.map(statement =>
        transformStatement(statement, letterMap, rotation, reflected)
      );
      premises = premises.map(statement => random(rng) < inversionProbability ? core.invert(statement) : statement);
      const premiseOrderReversed = random(rng) < 0.5;
      if (premiseOrderReversed) premises.reverse();

      let conclusion = transformStatement(template.conclusion, letterMap, rotation, reflected);
      const conclusionInverted = interferenceLevel >= 70 && random(rng) < 0.35;
      if (conclusionInverted) conclusion = core.invert(conclusion);

      const raw = {
        mode: 0,
        letters: replacementLetters,
        premises,
        conclusion,
        requestedMatch: template.expected,
        interferenceLevel,
        approvedTemplateId: template.id,
        approvedTemplateFamily: template.family,
        approvedTemplateExpected: template.expected,
        generatedFromApprovedTemplate: true,
        generatedForLogicNBack: true,
        templateTransformation: {
          consistentRenaming: true,
          rotationSteps: rotation,
          reflected,
          premiseOrderReversed,
          conclusionInverted
        },
        interferenceMeta: { level: interferenceLevel }
      };

      raw.intendedErrorClass = core.evaluateTrial(raw).distinctionClass;
      const hydrated = core.hydrateTrial(raw);
      hydrated.withinTrialEntailed = hydrated.isEntailed;
      hydrated.withinTrialDistinctionClass = hydrated.distinctionClass;
      if (hydrated.isEntailed !== template.expected) {
        throw new Error(`N-back transformation changed approved family ${template.family}.`);
      }
      return hydrated;
    }

    function chooseDifferentTemplate(rng, targetTemplate, interferenceLevel) {
      const alternatives = templates.filter(template => template.family !== targetTemplate.family);
      const ranked = [...alternatives].sort((first, second) => {
        const firstDistance = Math.abs(first.difficulty - targetTemplate.difficulty);
        const secondDistance = Math.abs(second.difficulty - targetTemplate.difficulty);
        if (firstDistance !== secondDistance) return firstDistance - secondDistance;
        const firstValidityDistance = Number(first.expected !== targetTemplate.expected);
        const secondValidityDistance = Number(second.expected !== targetTemplate.expected);
        return interferenceLevel >= 60
          ? firstValidityDistance - secondValidityDistance
          : secondValidityDistance - firstValidityDistance;
      });
      return pick(rng, ranked.slice(0, Math.min(5, ranked.length)));
    }

    core.nBackLevels = LEVELS;
    core.clampNBackLevel = clampLevel;
    core.nBackLogicSignature = logicSignature;
    core.nBackEquivalent = (first, second) => logicSignature(first) === logicSignature(second);
    core.nBackFamilyName = family => FAMILY_NAMES[family] || String(family || 'unknown relational family');

    core.generateNBackTrial = function generateNBackTrial(rng, target, options = {}) {
      const targetFamily = familyOf(target);
      const targetTemplate = templateByFamily.get(targetFamily);
      if (!targetTemplate) throw new Error('N-back target does not belong to an approved logical family.');

      const requestedMatch = Boolean(options.match);
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const level = clampLevel(options.nBackLevel);
      const template = requestedMatch
        ? targetTemplate
        : chooseDifferentTemplate(rng, targetTemplate, interferenceLevel);
      const trial = transformedTemplate(template, target, rng, interferenceLevel);
      const computedMatch = logicSignature(trial) === logicSignature(target);

      trial.nBackLevel = level;
      trial.nBackWarmup = false;
      trial.nBackTargetFamily = targetFamily;
      trial.nBackCurrentFamily = familyOf(trial);
      trial.nBackTargetSignature = logicSignature(target);
      trial.nBackCurrentSignature = logicSignature(trial);
      trial.nBackRequestedMatch = requestedMatch;
      trial.nBackMatch = computedMatch;
      trial.isMatch = computedMatch;
      trial.scored = true;
      trial.signature = trial.nBackCurrentSignature;

      if (computedMatch !== requestedMatch) {
        throw new Error('N-back generation branch disagrees with independently recomputed logical-family identity.');
      }
      return trial;
    };

    core.generateNBackWarmupTrial = function generateNBackWarmupTrial(rng, options = {}) {
      const level = clampLevel(options.nBackLevel);
      const trial = core.generateTrial(rng, {
        matchProbability: 0.5,
        interferenceLevel: Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0))
      });
      trial.withinTrialEntailed = trial.isEntailed;
      trial.withinTrialDistinctionClass = trial.distinctionClass;
      trial.nBackLevel = level;
      trial.nBackWarmup = true;
      trial.nBackCurrentFamily = familyOf(trial);
      trial.nBackCurrentSignature = logicSignature(trial);
      trial.nBackMatch = false;
      trial.isMatch = false;
      trial.scored = false;
      trial.signature = trial.nBackCurrentSignature;
      return trial;
    };

    core.explainNBackTrial = function explainNBackTrial(trial) {
      const level = clampLevel(trial?.nBackLevel);
      if (trial?.nBackWarmup) {
        return `Memory fill — retain this relational proof pattern. Scoring begins after ${level} triad${level === 1 ? '' : 's'}.`;
      }
      const currentName = core.nBackFamilyName(trial?.nBackCurrentFamily);
      const targetName = core.nBackFamilyName(trial?.nBackTargetFamily);
      if (trial?.nBackMatch) {
        return `MATCH — this triad and the triad ${level} back instantiate the same ${currentName} logic. Their letters and absolute directions may differ.`;
      }
      return `NO MATCH — this triad instantiates ${currentName}, while the triad ${level} back instantiated ${targetName}. The difference is relational, not alphabetical.`;
    };

    core.__triadicLogicNBackV8 = true;
    core.nBackRuntime = 'approved-logical-family-nback-v8';
    core.nBackPolicy = Object.freeze({
      minimumLevel: 1,
      maximumLevel: 8,
      letteringIdentityRelevant: false,
      globalRotationInvariant: true,
      globalReflectionInvariant: true,
      consistentRenamingInvariant: true,
      premiseOrderInvariant: true,
      inverseWordingInvariant: true,
      matchIdentity: 'approved relational proof and error family'
    });

    return core;
  }

  apply.LEVELS = LEVELS;
  return apply;
});
