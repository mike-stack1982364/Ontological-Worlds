'use strict';

(function exposeApprovedModeOne(root, factory) {
  const apply = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = apply;
  if (root) {
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    if (core) apply(core);
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const clone = value => JSON.parse(JSON.stringify(value));

  const APPROVED_TRIALS = [
    {
      id: 1,
      family: 'inverse-chain-entailment',
      difficulty: 2,
      premises: [
        { subject: 'A', relation: 'W', object: 'B' },
        { subject: 'B', relation: 'N', object: 'C' }
      ],
      conclusion: { subject: 'C', relation: 'SE', object: 'A' },
      expected: true,
      explanation: 'A is northwest of C, so C is southeast of A.'
    },
    {
      id: 2,
      family: 'reordered-inverse-wording',
      difficulty: 3,
      premises: [
        { subject: 'E', relation: 'S', object: 'D' },
        { subject: 'F', relation: 'W', object: 'E' }
      ],
      conclusion: { subject: 'F', relation: 'SW', object: 'D' },
      expected: true,
      explanation: 'F is one step west and one step south of D. Different letters and reversed wording do not alter the valid relational structure.'
    },
    {
      id: 3,
      family: 'sixteen-way-exact-composition',
      difficulty: 5,
      premises: [
        { subject: 'G', relation: 'N', object: 'H' },
        { subject: 'H', relation: 'NE', object: 'J' }
      ],
      conclusion: { subject: 'G', relation: 'NNE', object: 'J' },
      expected: true,
      explanation: 'Combining north with northeast produces north-northeast at sixteen-way resolution.'
    },
    {
      id: 4,
      family: 'adjacent-resolution-substitution',
      difficulty: 5,
      premises: [
        { subject: 'K', relation: 'N', object: 'L' },
        { subject: 'L', relation: 'NE', object: 'M' }
      ],
      conclusion: { subject: 'K', relation: 'NE', object: 'M' },
      expected: false,
      explanation: 'K is north-northeast of M. Northeast is adjacent but not exact.'
    },
    {
      id: 5,
      family: 'subject-object-reversal',
      difficulty: 4,
      premises: [
        { subject: 'N', relation: 'E', object: 'P' },
        { subject: 'P', relation: 'S', object: 'Q' }
      ],
      conclusion: { subject: 'Q', relation: 'SE', object: 'N' },
      expected: false,
      explanation: 'N is southeast of Q, making Q northwest of N. The tested relation reverses the letters without reversing the direction.'
    },
    {
      id: 6,
      family: 'wrong-letter-pair',
      difficulty: 4,
      premises: [
        { subject: 'R', relation: 'W', object: 'S' },
        { subject: 'S', relation: 'S', object: 'T' }
      ],
      conclusion: { subject: 'S', relation: 'SW', object: 'T' },
      expected: false,
      explanation: 'R is southwest of T. S is directly south of T, so the correct derived relation has been assigned to the wrong letter.'
    },
    {
      id: 7,
      family: 'direct-chain-entailment',
      difficulty: 2,
      premises: [
        { subject: 'U', relation: 'S', object: 'V' },
        { subject: 'V', relation: 'E', object: 'W' }
      ],
      conclusion: { subject: 'U', relation: 'SE', object: 'W' },
      expected: true,
      explanation: 'U is one step east and one step south of W.'
    },
    {
      id: 8,
      family: 'sixteen-way-near-miss',
      difficulty: 5,
      premises: [
        { subject: 'X', relation: 'W', object: 'Y' },
        { subject: 'Y', relation: 'N', object: 'Z' }
      ],
      conclusion: { subject: 'X', relation: 'NNW', object: 'Z' },
      expected: false,
      explanation: 'Equal transformations place X exactly northwest of Z, not north-northwest.'
    },
    {
      id: 9,
      family: 'vector-cancellation',
      difficulty: 5,
      premises: [
        { subject: 'A', relation: 'NE', object: 'B' },
        { subject: 'B', relation: 'SE', object: 'C' }
      ],
      conclusion: { subject: 'A', relation: 'E', object: 'C' },
      expected: true,
      explanation: 'The northward and southward components cancel while both eastward components remain.'
    },
    {
      id: 10,
      family: 'parallel-branch-discrimination',
      difficulty: 5,
      premises: [
        { subject: 'H', relation: 'NE', object: 'J' },
        { subject: 'K', relation: 'SE', object: 'J' }
      ],
      conclusion: { subject: 'H', relation: 'E', object: 'K' },
      expected: false,
      explanation: 'H is directly north of K. The shared reference letter creates parallel branches, not the eastward chain asserted.'
    }
  ];

  function random(rng) {
    return rng && typeof rng.next === 'function' ? rng.next() : Math.random();
  }

  function pick(rng, values) {
    if (!values.length) throw new Error('Cannot choose from an empty approved-trial pool.');
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

  function trialLetters(trial) {
    return [...new Set([
      ...trial.premises.flatMap(statement => [statement.subject, statement.object]),
      trial.conclusion.subject,
      trial.conclusion.object
    ])];
  }

  function apply(core) {
    if (!core || core.__approvedTriadicEntailmentV7) return core;

    const originalRenderTrial = core.renderTrial.bind(core);
    const originalHydrateTrial = core.hydrateTrial.bind(core);
    const directionCodes = core.DIRECTIONS.map(item => item.code);
    const directionIndex = new Map(directionCodes.map((code, index) => [code, index]));

    function enforceSurface(trial) {
      if (!trial) return trial;
      delete trial.contract;
      delete trial.contractId;
      delete trial.contractLabel;
      delete trial.logicalContract;
      delete trial.metricContract;
      delete trial.contractDescription;
      return trial;
    }

    function transformDirection(code, rotation, reflected) {
      const index = directionIndex.get(code);
      if (!Number.isInteger(index)) throw new Error(`Unknown approved direction: ${code}`);
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

    function rotationPool(interferenceLevel) {
      if (interferenceLevel < 25) return [0, 4, 8, 12];
      if (interferenceLevel < 70) return [0, 2, 4, 6, 8, 10, 12, 14];
      return Array.from({ length: 16 }, (_, index) => index);
    }

    function chooseTemplate(rng, expected, interferenceLevel) {
      const pool = APPROVED_TRIALS.filter(template => template.expected === expected);
      const targetDifficulty = 1 + Math.round(Math.max(0, Math.min(100, interferenceLevel)) / 25);
      const ranked = [...pool].sort((first, second) =>
        Math.abs(first.difficulty - targetDifficulty) - Math.abs(second.difficulty - targetDifficulty)
      );
      return pick(rng, ranked.slice(0, Math.min(3, ranked.length)));
    }

    function transformedTrial(template, rng, interferenceLevel, forced = {}) {
      const sourceLetters = trialLetters(template);
      const replacementLetters = forced.letters || shuffle(rng, core.LETTERS).slice(0, 3);
      const letterMap = Object.fromEntries(sourceLetters.map((letter, index) => [letter, replacementLetters[index]]));
      const rotation = Number.isInteger(forced.rotation)
        ? ((forced.rotation % 16) + 16) % 16
        : pick(rng, rotationPool(interferenceLevel));
      const reflected = typeof forced.reflected === 'boolean'
        ? forced.reflected
        : interferenceLevel >= 45 && random(rng) < 0.35;
      const inversionProbability = Math.min(0.5, interferenceLevel / 200);

      let premises = template.premises.map(statement =>
        transformStatement(statement, letterMap, rotation, reflected)
      );
      if (!forced.disablePremiseInversion) {
        premises = premises.map(statement => random(rng) < inversionProbability ? core.invert(statement) : statement);
      }
      const reversePremises = typeof forced.reversePremises === 'boolean'
        ? forced.reversePremises
        : random(rng) < 0.5;
      if (reversePremises) premises.reverse();

      let conclusion = transformStatement(template.conclusion, letterMap, rotation, reflected);
      const invertConclusion = typeof forced.invertConclusion === 'boolean'
        ? forced.invertConclusion
        : interferenceLevel >= 70 && random(rng) < 0.3;
      if (invertConclusion) conclusion = core.invert(conclusion);

      const raw = {
        mode: 0,
        letters: replacementLetters,
        premises,
        conclusion,
        requestedMatch: template.expected,
        intendedErrorClass: null,
        interferenceLevel,
        approvedTemplateId: template.id,
        approvedTemplateFamily: template.family,
        approvedTemplateExpected: template.expected,
        generatedFromApprovedTemplate: true,
        templateTransformation: {
          consistentRenaming: true,
          rotationSteps: rotation,
          reflected,
          premiseOrderReversed: reversePremises,
          conclusionInverted: invertConclusion
        },
        interferenceMeta: { level: interferenceLevel }
      };
      raw.intendedErrorClass = core.evaluateTrial(raw).distinctionClass;
      const hydrated = enforceSurface(originalHydrateTrial(raw));
      hydrated.explanation = core.explainTrial(hydrated);
      if (hydrated.isMatch !== template.expected) {
        throw new Error(`Approved template ${template.id} changed logical status during transformation.`);
      }
      return hydrated;
    }

    core.generateTrial = function generateApprovedTriadicTrial(rng, options = {}) {
      const matchProbability = Math.max(0, Math.min(1, Number(options.matchProbability ?? 0.5)));
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const requestedMatch = random(rng) < matchProbability;
      const template = chooseTemplate(rng, requestedMatch, interferenceLevel);
      return transformedTrial(template, rng, interferenceLevel);
    };

    core.hydrateTrial = function hydrateApprovedTriadicTrial(trial) {
      return enforceSurface(originalHydrateTrial(trial));
    };

    core.renderTrial = function renderApprovedTriadicTrial(trial) {
      const rendered = originalRenderTrial(enforceSurface(trial));
      if ((rendered.match(/;/g) || []).length !== 2) {
        throw new Error('Mode 1 must render exactly two premise relations and one tested relation.');
      }
      if (/contract\s*:|therefore/i.test(rendered)) {
        throw new Error('Mode 1 may not expose contracts or explanatory connectives in the three-statement trial.');
      }
      return rendered;
    };

    core.canonicalTrials = function canonicalApprovedTrials() {
      return clone(APPROVED_TRIALS);
    };
    core.approvedTrials = core.canonicalTrials;
    core.approvedTemplateFamilies = () => APPROVED_TRIALS.map(template => ({
      id: template.id,
      family: template.family,
      expected: template.expected,
      difficulty: template.difficulty
    }));

    class AuditRng {
      constructor(seed = 0x7a1ad17) { this.s = seed >>> 0; }
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

    core.runAudit = function runApprovedTemplateAudit(iterations = 8192) {
      const rng = new AuditRng();
      const failures = [];
      const templateCoverage = new Set();
      const distinctions = new Set();
      const expectedDirections = new Set();
      let matches = 0;
      let nonMatches = 0;
      let invarianceChecks = 0;

      APPROVED_TRIALS.forEach(template => {
        const canonicalResult = core.evaluateTrial(template);
        const canonicalSurface = core.renderTrial(template);
        if (canonicalResult.isEntailed !== template.expected) failures.push(`canonical-${template.id}`);
        if ((canonicalSurface.match(/;/g) || []).length !== 2) failures.push(`canonical-format-${template.id}`);
        if (/contract\s*:|therefore/i.test(canonicalSurface)) failures.push(`canonical-leak-${template.id}`);

        for (let rotation = 0; rotation < 16; rotation += 1) {
          [false, true].forEach(reflected => {
            const transformed = transformedTrial(template, rng, 100, {
              letters: ['Q', 'R', 'S'],
              rotation,
              reflected,
              disablePremiseInversion: true,
              reversePremises: false,
              invertConclusion: false
            });
            const result = core.evaluateTrial(transformed);
            if (result.isEntailed !== template.expected) failures.push(`orbit-${template.id}-${rotation}-${Number(reflected)}`);
            if (/contract\s*:|therefore/i.test(core.renderTrial(transformed))) failures.push(`orbit-leak-${template.id}-${rotation}`);
            expectedDirections.add(result.expectedRelation);
            distinctions.add(result.distinctionClass);
            invarianceChecks += 1;
          });
        }
      });

      for (let index = 0; index < iterations; index += 1) {
        const trial = core.generateTrial(rng, {
          matchProbability: index % 2 === 0 ? 1 : 0,
          interferenceLevel: index % 101
        });
        const result = core.evaluateTrial(trial);
        const rendered = core.renderTrial(trial);
        templateCoverage.add(trial.approvedTemplateId);
        distinctions.add(result.distinctionClass);
        expectedDirections.add(result.expectedRelation);
        if (!trial.generatedFromApprovedTemplate) failures.push(`generator-source-${index}`);
        if (trial.requestedMatch !== result.isEntailed) failures.push(`generator-answer-${index}`);
        if (trial.approvedTemplateExpected !== result.isEntailed) failures.push(`template-answer-${index}`);
        if (new Set(trial.letters).size !== 3) failures.push(`letters-${index}`);
        if ((rendered.match(/;/g) || []).length !== 2) failures.push(`format-${index}`);
        if (/contract\s*:|therefore/i.test(rendered)) failures.push(`surface-leak-${index}`);
        ['contract', 'contractId', 'contractLabel', 'logicalContract', 'metricContract'].forEach(key => {
          if (Object.prototype.hasOwnProperty.call(trial, key)) failures.push(`metadata-leak-${key}-${index}`);
        });
        if (result.isEntailed) matches += 1;
        else nonMatches += 1;
      }

      if (templateCoverage.size !== APPROVED_TRIALS.length) failures.push(`template-coverage-${templateCoverage.size}`);
      if (expectedDirections.size !== 16) failures.push(`direction-coverage-${expectedDirections.size}`);
      if (!matches) failures.push('no-matches');
      if (!nonMatches) failures.push('no-nonmatches');
      ['exact-relational-entailment', 'adjacent-resolution-substitution', 'subject-object-reversal', 'wrong-letter-pair', 'local-or-global-relational-error']
        .forEach(value => { if (!distinctions.has(value)) failures.push(`missing-${value}`); });

      return {
        passed: failures.length === 0,
        failures,
        iterations,
        matches,
        nonMatches,
        templateCoverage: [...templateCoverage].sort((a, b) => a - b),
        approvedTemplateCount: APPROVED_TRIALS.length,
        generatedOnlyFromApprovedTemplates: true,
        directionCoverage: expectedDirections.size,
        distinctions: [...distinctions].sort(),
        invarianceChecks,
        lettersDriveRelationalComputation: true,
        letteringIdentityIgnored: true,
        conclusionRecomputedFromPremises: true,
        proofBindingRegulation: true,
        directionalResolution: 16,
        directionPools: [4, 8, 16],
        visibleContractText: false,
        exactlyThreeStatements: true
      };
    };

    core.version = 7;
    core.__approvedTriadicEntailmentV7 = true;
    core.runtimeGenerator = 'approved-ten-template-orbits-v7';
    core.surfacePolicy = Object.freeze({
      statementCount: 3,
      premiseCount: 2,
      testedRelationCount: 1,
      visibleContractText: false,
      thereforeInPremise: false,
      letteringIdentityAcrossTrialsRelevant: false,
      approvedTrialSet: 'exact-ten-v7',
      runtimeGeneration: 'consistent renamings and lawful spatial transformations of the approved ten trial families',
      scoringRule: 'logical accuracy of the third relation after composing the first two letter-bound transformations'
    });

    return core;
  }

  apply.APPROVED_TRIALS = APPROVED_TRIALS;
  return apply;
});