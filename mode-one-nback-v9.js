'use strict';

(function exposeTriadicProfileNBack(root, factory) {
  const apply = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = apply;
  if (root) {
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    if (core) apply(core);
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
  const clone = value => JSON.parse(JSON.stringify(value));

  const POLICIES = Object.freeze({
    standard: Object.freeze({
      id: 'standard',
      reflectionInvariant: true,
      queryOrientationInvariant: false,
      topologyRequired: true,
      mechanismRequired: true,
      contractRequired: true,
      validityRequired: true
    }),
    inverseEquivalent: Object.freeze({
      id: 'inverse-equivalent',
      reflectionInvariant: true,
      queryOrientationInvariant: true,
      topologyRequired: true,
      mechanismRequired: true,
      contractRequired: true,
      validityRequired: true
    }),
    rotationOnly: Object.freeze({
      id: 'rotation-only',
      reflectionInvariant: false,
      queryOrientationInvariant: false,
      topologyRequired: true,
      mechanismRequired: true,
      contractRequired: true,
      validityRequired: true
    })
  });

  const CONTRACTS = Object.freeze({
    unit8: Object.freeze({ id: 'unit-8-exact', metric: 'unit', resolution: 8, evaluation: 'exact' }),
    unit16: Object.freeze({ id: 'unit-16-exact', metric: 'unit', resolution: 16, evaluation: 'exact' }),
    unit4: Object.freeze({ id: 'unit-4-truth', metric: 'unit', resolution: 4, evaluation: 'truth' }),
    qualitative8: Object.freeze({ id: 'qualitative-8-necessary', metric: 'qualitative-sign', resolution: 8, evaluation: 'necessary' }),
    positive16: Object.freeze({ id: 'positive-16-necessary', metric: 'positive-unspecified', resolution: 16, evaluation: 'necessary' })
  });

  const PROFILES = Object.freeze([
    {
      id: 'chain-orthogonal-direct-unit8', label: 'direct orthogonal chain entailment',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit8, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NW', object: 'C' }
    },
    {
      id: 'chain-orthogonal-inverse-unit8', label: 'inverse orthogonal chain entailment',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'inverse',
      contract: CONTRACTS.unit8, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'C', relation: 'SE', object: 'A' }
    },
    {
      id: 'branch-orthogonal-unit8', label: 'orthogonal branch comparison',
      topology: 'branch', mechanism: 'branch-comparison', queryOrientation: 'direct',
      contract: CONTRACTS.unit8, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'C', relation: 'E', object: 'B' }],
      conclusion: { subject: 'A', relation: 'NW', object: 'C' }
    },
    {
      id: 'branch-qualitative-unit8', label: 'qualitative branch comparison',
      topology: 'branch', mechanism: 'branch-comparison', queryOrientation: 'direct',
      contract: CONTRACTS.qualitative8, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'C', relation: 'N', object: 'B' }],
      conclusion: { subject: 'A', relation: 'SW', object: 'C' }
    },
    {
      id: 'chain-cardinal-diagonal-unit16', label: 'sixteen-way cardinal–diagonal composition',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNE', object: 'C' }
    },
    {
      id: 'chain-cardinal-diagonal-inverse-unit16', label: 'inverse sixteen-way cardinal–diagonal composition',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'inverse',
      contract: CONTRACTS.unit16, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'C', relation: 'SSW', object: 'A' }
    },
    {
      id: 'chain-cardinal-diagonal-adjacent-error', label: 'adjacent sixteen-way substitution',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16, validityClass: 'adjacent-resolution-error', expected: false, chirality: 0,
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NE', object: 'C' }
    },
    {
      id: 'chain-orthogonal-reversal-error', label: 'subject–object reversal',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'inverse',
      contract: CONTRACTS.unit8, validityClass: 'subject-object-reversal', expected: false, chirality: 0,
      premises: [{ subject: 'A', relation: 'E', object: 'B' }, { subject: 'B', relation: 'S', object: 'C' }],
      conclusion: { subject: 'C', relation: 'SE', object: 'A' }
    },
    {
      id: 'chain-wrong-letter-pair', label: 'wrong-letter binding',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'local',
      contract: CONTRACTS.unit8, validityClass: 'wrong-letter-pair', expected: false, chirality: 0,
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'S', object: 'C' }],
      conclusion: { subject: 'B', relation: 'SW', object: 'C' }
    },
    {
      id: 'chain-orthogonal-orientation-error', label: 'wrong turn orientation',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit8, validityClass: 'orientation-error', expected: false, chirality: 1,
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'W', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NE', object: 'C' }
    },
    {
      id: 'chain-diagonal-cancellation-unit16', label: 'diagonal cancellation',
      topology: 'chain', mechanism: 'vector-cancellation', queryOrientation: 'direct',
      contract: CONTRACTS.unit16, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'NE', object: 'B' }, { subject: 'B', relation: 'SE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'E', object: 'C' }
    },
    {
      id: 'chain-diagonal-cancellation-inverse-unit16', label: 'inverse diagonal cancellation',
      topology: 'chain', mechanism: 'vector-cancellation', queryOrientation: 'inverse',
      contract: CONTRACTS.unit16, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'NE', object: 'B' }, { subject: 'B', relation: 'SE', object: 'C' }],
      conclusion: { subject: 'C', relation: 'W', object: 'A' }
    },
    {
      id: 'chain-cardinal-reinforcement-unit8', label: 'cardinal reinforcement',
      topology: 'chain', mechanism: 'vector-reinforcement', queryOrientation: 'direct',
      contract: CONTRACTS.unit8, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'E', object: 'B' }, { subject: 'B', relation: 'E', object: 'C' }],
      conclusion: { subject: 'A', relation: 'E', object: 'C' }
    },
    {
      id: 'chain-alternate-nne-unit16', label: 'alternate-component north-northeast proof',
      topology: 'chain', mechanism: 'counterbalanced-oblique-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16, validityClass: 'exact-entailment', expected: true, chirality: 1,
      premises: [{ subject: 'A', relation: 'E', object: 'B' }, { subject: 'B', relation: 'NW', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNE', object: 'C' }
    },
    {
      id: 'chain-qualitative-quadrant8', label: 'necessary qualitative quadrant entailment',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.qualitative8, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NW', object: 'C' }
    },
    {
      id: 'chain-qualitative-quadrant8-inverse', label: 'inverse necessary qualitative quadrant entailment',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'inverse',
      contract: CONTRACTS.qualitative8, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'C', relation: 'SE', object: 'A' }
    },
    {
      id: 'chain-positive16-overprecise', label: 'possible but non-necessary sixteen-way claim',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.positive16, validityClass: 'possible-not-necessary', expected: false, chirality: 0,
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNW', object: 'C' }
    },
    {
      id: 'chain-coarse4-cardinal-diagonal', label: 'four-way truth classification',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit4, validityClass: 'coarse-truth-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'N', object: 'C' }
    },
    {
      id: 'chain-exact16-underprecise', label: 'under-precise sixteen-way conclusion',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16, validityClass: 'under-precise', expected: false, chirality: 0,
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'N', object: 'C' }
    },
    {
      id: 'chain-positive16-cancellation-possible', label: 'cancellation possible but non-necessary',
      topology: 'chain', mechanism: 'vector-cancellation', queryOrientation: 'direct',
      contract: CONTRACTS.positive16, validityClass: 'possible-not-necessary', expected: false, chirality: 0,
      premises: [{ subject: 'A', relation: 'NE', object: 'B' }, { subject: 'B', relation: 'SE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'E', object: 'C' }
    },
    {
      id: 'chain-orthogonal-direct-unit16', label: 'sixteen-way orthogonal chain entailment',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16, validityClass: 'exact-entailment', expected: true, chirality: 0,
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NW', object: 'C' }
    }
  ]);

  const PROFILE_BY_ID = new Map(PROFILES.map(profile => [profile.id, profile]));

  const ARCHETYPES = Object.freeze([
    ['1.1', 1, 'chain-orthogonal-inverse-unit8', 'chain-orthogonal-inverse-unit8', true, 'standard'],
    ['1.2', 1, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-direct-unit8', true, 'standard'],
    ['1.3', 1, 'chain-cardinal-diagonal-unit16', 'chain-cardinal-diagonal-unit16', true, 'standard'],
    ['1.4', 1, 'chain-diagonal-cancellation-unit16', 'chain-diagonal-cancellation-unit16', true, 'standard'],
    ['1.5', 1, 'branch-orthogonal-unit8', 'branch-orthogonal-unit8', true, 'standard'],
    ['1.6', 1, 'chain-cardinal-diagonal-unit16', 'chain-cardinal-diagonal-adjacent-error', false, 'standard'],
    ['1.7', 1, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-reversal-error', false, 'standard'],
    ['1.8', 1, 'chain-orthogonal-direct-unit8', 'chain-wrong-letter-pair', false, 'standard'],
    ['1.9', 1, 'chain-orthogonal-direct-unit8', 'branch-orthogonal-unit8', false, 'standard'],
    ['1.10', 1, 'chain-diagonal-cancellation-unit16', 'chain-cardinal-reinforcement-unit8', false, 'standard'],
    ['2.1', 2, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-inverse-unit8', true, 'inverseEquivalent'],
    ['2.2', 2, 'chain-orthogonal-inverse-unit8', 'chain-orthogonal-inverse-unit8', true, 'standard'],
    ['2.3', 2, 'chain-cardinal-diagonal-unit16', 'chain-cardinal-diagonal-inverse-unit16', true, 'inverseEquivalent'],
    ['2.4', 2, 'chain-diagonal-cancellation-unit16', 'chain-diagonal-cancellation-inverse-unit16', true, 'inverseEquivalent'],
    ['2.5', 2, 'branch-orthogonal-unit8', 'branch-orthogonal-unit8', true, 'standard'],
    ['2.6', 2, 'chain-orthogonal-direct-unit8', 'branch-orthogonal-unit8', false, 'standard'],
    ['2.7', 2, 'chain-orthogonal-inverse-unit8', 'chain-orthogonal-reversal-error', false, 'standard'],
    ['2.8', 2, 'chain-orthogonal-direct-unit8', 'chain-wrong-letter-pair', false, 'standard'],
    ['2.9', 2, 'chain-diagonal-cancellation-unit16', 'branch-orthogonal-unit8', false, 'standard'],
    ['2.10', 2, 'chain-orthogonal-inverse-unit8', 'chain-orthogonal-reversal-error', false, 'standard'],
    ['3.1', 3, 'chain-cardinal-diagonal-unit16', 'chain-cardinal-diagonal-unit16', true, 'standard'],
    ['3.2', 3, 'chain-cardinal-diagonal-unit16', 'chain-cardinal-diagonal-unit16', true, 'standard'],
    ['3.3', 3, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-direct-unit8', true, 'standard'],
    ['3.4', 3, 'chain-coarse4-cardinal-diagonal', 'chain-coarse4-cardinal-diagonal', true, 'standard'],
    ['3.5', 3, 'chain-qualitative-quadrant8', 'chain-qualitative-quadrant8', true, 'standard'],
    ['3.6', 3, 'chain-cardinal-diagonal-unit16', 'chain-cardinal-diagonal-adjacent-error', false, 'standard'],
    ['3.7', 3, 'chain-cardinal-diagonal-unit16', 'chain-exact16-underprecise', false, 'standard'],
    ['3.8', 3, 'chain-qualitative-quadrant8', 'chain-positive16-overprecise', false, 'standard'],
    ['3.9', 3, 'chain-cardinal-diagonal-unit16', 'chain-coarse4-cardinal-diagonal', false, 'standard'],
    ['3.10', 3, 'chain-alternate-nne-unit16', 'chain-exact16-underprecise', false, 'standard'],
    ['4.1', 4, 'chain-qualitative-quadrant8', 'chain-qualitative-quadrant8', true, 'standard'],
    ['4.2', 4, 'chain-qualitative-quadrant8', 'chain-qualitative-quadrant8', true, 'standard'],
    ['4.3', 4, 'chain-cardinal-diagonal-unit16', 'chain-cardinal-diagonal-unit16', true, 'standard'],
    ['4.4', 4, 'chain-diagonal-cancellation-unit16', 'chain-diagonal-cancellation-unit16', true, 'standard'],
    ['4.5', 4, 'branch-qualitative-unit8', 'branch-qualitative-unit8', true, 'standard'],
    ['4.6', 4, 'chain-qualitative-quadrant8', 'chain-positive16-overprecise', false, 'standard'],
    ['4.7', 4, 'chain-orthogonal-direct-unit8', 'chain-qualitative-quadrant8', false, 'standard'],
    ['4.8', 4, 'chain-qualitative-quadrant8', 'chain-positive16-overprecise', false, 'standard'],
    ['4.9', 4, 'chain-diagonal-cancellation-unit16', 'chain-positive16-cancellation-possible', false, 'standard'],
    ['4.10', 4, 'branch-qualitative-unit8', 'chain-qualitative-quadrant8', false, 'standard'],
    ['5.1', 5, 'chain-orthogonal-inverse-unit8', 'chain-orthogonal-inverse-unit8', true, 'standard'],
    ['5.2', 5, 'chain-orthogonal-inverse-unit8', 'chain-orthogonal-inverse-unit8', true, 'standard'],
    ['5.3', 5, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-inverse-unit8', true, 'inverseEquivalent'],
    ['5.4', 5, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-direct-unit8', true, 'standard', 'reflect'],
    ['5.5', 5, 'chain-diagonal-cancellation-unit16', 'chain-diagonal-cancellation-unit16', true, 'standard'],
    ['5.6', 5, 'chain-orthogonal-inverse-unit8', 'chain-orthogonal-reversal-error', false, 'standard'],
    ['5.7', 5, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-orientation-error', false, 'standard'],
    ['5.8', 5, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-reversal-error', false, 'standard'],
    ['5.9', 5, 'chain-orthogonal-direct-unit8', 'branch-orthogonal-unit8', false, 'standard'],
    ['5.10', 5, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-direct-unit8', false, 'rotationOnly', 'reflect'],
    ['6.1', 6, 'chain-orthogonal-inverse-unit8', 'chain-orthogonal-inverse-unit8', true, 'standard'],
    ['6.2', 6, 'chain-diagonal-cancellation-unit16', 'chain-diagonal-cancellation-unit16', true, 'standard'],
    ['6.3', 6, 'branch-orthogonal-unit8', 'branch-orthogonal-unit8', true, 'standard'],
    ['6.4', 6, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-inverse-unit8', true, 'inverseEquivalent'],
    ['6.5', 6, 'chain-qualitative-quadrant8', 'chain-qualitative-quadrant8', true, 'standard'],
    ['6.6', 6, 'chain-diagonal-cancellation-unit16', 'chain-cardinal-reinforcement-unit8', false, 'standard'],
    ['6.7', 6, 'chain-orthogonal-direct-unit8', 'branch-orthogonal-unit8', false, 'standard'],
    ['6.8', 6, 'chain-cardinal-diagonal-unit16', 'chain-alternate-nne-unit16', false, 'standard'],
    ['6.9', 6, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-inverse-unit8', false, 'standard'],
    ['6.10', 6, 'chain-diagonal-cancellation-unit16', 'chain-coarse4-cardinal-diagonal', false, 'standard'],
    ['7.1', 7, 'chain-cardinal-diagonal-unit16', 'chain-cardinal-diagonal-unit16', true, 'standard'],
    ['7.2', 7, 'chain-qualitative-quadrant8', 'chain-qualitative-quadrant8', true, 'standard'],
    ['7.3', 7, 'chain-coarse4-cardinal-diagonal', 'chain-coarse4-cardinal-diagonal', true, 'standard'],
    ['7.4', 7, 'branch-orthogonal-unit8', 'branch-orthogonal-unit8', true, 'standard'],
    ['7.5', 7, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-direct-unit8', true, 'standard'],
    ['7.6', 7, 'chain-orthogonal-direct-unit8', 'chain-qualitative-quadrant8', false, 'standard'],
    ['7.7', 7, 'chain-cardinal-diagonal-unit16', 'chain-coarse4-cardinal-diagonal', false, 'standard'],
    ['7.8', 7, 'chain-orthogonal-direct-unit8', 'branch-orthogonal-unit8', false, 'standard'],
    ['7.9', 7, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-reversal-error', false, 'standard'],
    ['7.10', 7, 'chain-qualitative-quadrant8', 'chain-orthogonal-direct-unit16', false, 'standard'],
    ['8.1', 8, 'chain-cardinal-diagonal-unit16', 'chain-cardinal-diagonal-unit16', true, 'standard'],
    ['8.2', 8, 'chain-qualitative-quadrant8', 'chain-qualitative-quadrant8', true, 'standard'],
    ['8.3', 8, 'branch-orthogonal-unit8', 'branch-orthogonal-unit8', true, 'standard'],
    ['8.4', 8, 'chain-diagonal-cancellation-unit16', 'chain-diagonal-cancellation-unit16', true, 'standard'],
    ['8.5', 8, 'chain-coarse4-cardinal-diagonal', 'chain-coarse4-cardinal-diagonal', true, 'standard'],
    ['8.6', 8, 'chain-cardinal-diagonal-unit16', 'chain-coarse4-cardinal-diagonal', false, 'standard'],
    ['8.7', 8, 'chain-diagonal-cancellation-unit16', 'chain-cardinal-reinforcement-unit8', false, 'standard'],
    ['8.8', 8, 'chain-orthogonal-direct-unit8', 'chain-orthogonal-direct-unit8', false, 'rotationOnly', 'reflect'],
    ['8.9', 8, 'chain-qualitative-quadrant8', 'chain-positive16-overprecise', false, 'standard'],
    ['8.10', 8, 'chain-diagonal-cancellation-unit16', 'chain-positive16-cancellation-possible', false, 'standard']
  ].map(([id, level, targetProfile, currentProfile, expected, policy, relation = 'ordinary']) => Object.freeze({
    id, level, targetProfile, currentProfile, expected, policy, relation
  })));

  function random(rng) {
    return rng && typeof rng.next === 'function' ? rng.next() : Math.random();
  }

  function pick(rng, values) {
    if (!values.length) throw new Error('Cannot choose from an empty Triadic Entailment profile pool.');
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

  function policyById(id) {
    if (id === 'inverseEquivalent' || id === 'inverse-equivalent') return POLICIES.inverseEquivalent;
    if (id === 'rotationOnly' || id === 'rotation-only') return POLICIES.rotationOnly;
    return POLICIES.standard;
  }

  function apply(core) {
    if (!core || core.__triadicProfileNBackV9) return core;

    const directionCodes = core.DIRECTIONS.map(item => item.code);
    const directionIndex = new Map(directionCodes.map((code, index) => [code, index]));
    const TWO_PI = Math.PI * 2;

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

    function trialLetters(trial) {
      if (Array.isArray(trial?.letters) && trial.letters.length === 3) return [...trial.letters];
      return [...new Set([
        ...(trial?.premises || []).flatMap(statement => [statement.subject, statement.object]),
        trial?.conclusion?.subject,
        trial?.conclusion?.object
      ].filter(Boolean))];
    }

    function chooseLetters(rng, target) {
      const excluded = new Set(trialLetters(target));
      const candidates = shuffle(rng, core.LETTERS.filter(letter => !excluded.has(letter)));
      if (candidates.length >= 3) return candidates.slice(0, 3);
      return shuffle(rng, core.LETTERS).slice(0, 3);
    }

    function coarsenDirection(code, resolution) {
      const index = directionIndex.get(code);
      if (!Number.isInteger(index)) throw new Error(`Unknown direction: ${code}`);
      const step = 16 / resolution;
      return directionCodes[(Math.round(index / step) * step) % 16];
    }

    function quantizeVector(x, y, resolution) {
      if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) return 'BALANCE';
      const clockwise = (Math.atan2(x, y) + TWO_PI) % TWO_PI;
      const sectors = resolution;
      const sector = Math.round(clockwise / (TWO_PI / sectors)) % sectors;
      return directionCodes[(sector * (16 / sectors)) % 16];
    }

    function signDirection(x, y) {
      const sx = Math.abs(x) < 1e-9 ? 0 : Math.sign(x);
      const sy = Math.abs(y) < 1e-9 ? 0 : Math.sign(y);
      if (sx === 0 && sy === 0) return 'BALANCE';
      if (sx === 0) return sy > 0 ? 'N' : 'S';
      if (sy === 0) return sx > 0 ? 'E' : 'W';
      return `${sy > 0 ? 'N' : 'S'}${sx > 0 ? 'E' : 'W'}`;
    }

    function positionsForLengths(premises, lengths) {
      const positions = new Map();
      const first = premises[0];
      const firstDirection = core.direction(first.relation);
      positions.set(first.object, [0, 0]);
      positions.set(first.subject, [firstDirection.x * lengths[0], firstDirection.y * lengths[0]]);

      for (let pass = 0; pass < 6; pass += 1) {
        premises.forEach((premise, index) => {
          const vector = core.direction(premise.relation);
          const dx = vector.x * lengths[index];
          const dy = vector.y * lengths[index];
          const subject = positions.get(premise.subject);
          const object = positions.get(premise.object);
          if (object && !subject) positions.set(premise.subject, [object[0] + dx, object[1] + dy]);
          if (subject && !object) positions.set(premise.object, [subject[0] - dx, subject[1] - dy]);
        });
      }
      return positions;
    }

    function sampledLengths(contract) {
      if (contract.metric === 'unit') return [[1, 1]];
      const ratios = [];
      for (let exponent = -12; exponent <= 12; exponent += 0.25) ratios.push(2 ** exponent);
      return ratios.map(ratio => [ratio, 1]);
    }

    function evaluateContractTrial(trial) {
      const profile = trial.logicProfile || PROFILE_BY_ID.get(trial.logicProfileId);
      if (!profile) throw new Error('Triadic Entailment trial lacks a logical profile.');
      const contract = trial.logicalContract || profile.contract;
      const graph = core.analyseGraph(trial.premises);
      const queryPairValid = trial.conclusion && graph.endpoints.includes(trial.conclusion.subject)
        && graph.endpoints.includes(trial.conclusion.object)
        && trial.conclusion.subject !== trial.conclusion.object;
      const possibilities = new Set();

      if (queryPairValid) {
        sampledLengths(contract).forEach(lengths => {
          const positions = positionsForLengths(trial.premises, lengths);
          const subject = positions.get(trial.conclusion.subject);
          const object = positions.get(trial.conclusion.object);
          if (!subject || !object) return;
          const x = subject[0] - object[0];
          const y = subject[1] - object[1];
          const code = contract.metric === 'qualitative-sign'
            ? signDirection(x, y)
            : quantizeVector(x, y, contract.resolution);
          if (code !== 'BALANCE') possibilities.add(code);
        });
      }

      const asserted = coarsenDirection(trial.conclusion.relation, contract.resolution);
      const necessary = queryPairValid && possibilities.size === 1 && possibilities.has(asserted);
      const possible = queryPairValid && possibilities.has(asserted);
      const isEntailed = necessary;
      let distinctionClass = 'local-or-global-relational-error';
      if (!queryPairValid) distinctionClass = 'wrong-letter-pair';
      else if (isEntailed) distinctionClass = profile.validityClass;
      else if (possible && possibilities.size > 1) distinctionClass = 'possible-not-necessary';
      else if (profile.validityClass === 'under-precise') distinctionClass = 'under-precise';
      else if (profile.validityClass === 'subject-object-reversal') distinctionClass = 'subject-object-reversal';
      else if (profile.validityClass === 'adjacent-resolution-error') distinctionClass = 'adjacent-resolution-error';
      else if (profile.validityClass === 'orientation-error') distinctionClass = 'orientation-error';
      else distinctionClass = profile.validityClass;

      return {
        graph,
        contract,
        queryPairValid,
        assertedRelation: trial.conclusion.relation,
        assertedAtResolution: asserted,
        possibleRelations: [...possibilities].sort(),
        necessary,
        possible,
        distinctionClass,
        isEntailed
      };
    }

    function descriptorFor(trial) {
      const profile = trial.logicProfile || PROFILE_BY_ID.get(trial.logicProfileId);
      if (!profile) throw new Error('Triadic N-back trial lacks a complete logical profile.');
      return {
        topology: profile.topology,
        mechanism: profile.mechanism,
        queryOrientation: trial.queryOrientation || profile.queryOrientation,
        contract: (trial.logicalContract || profile.contract).id,
        validityClass: profile.validityClass,
        chirality: Number(trial.chirality ?? profile.chirality ?? 0) & 1
      };
    }

    function signatureFor(trial, explicitPolicy) {
      const policy = explicitPolicy || trial.comparisonPolicy || POLICIES.standard;
      const descriptor = descriptorFor(trial);
      const fields = [];
      if (policy.topologyRequired) fields.push(`TOPOLOGY:${descriptor.topology}`);
      if (policy.mechanismRequired) fields.push(`MECHANISM:${descriptor.mechanism}`);
      if (policy.contractRequired) fields.push(`CONTRACT:${descriptor.contract}`);
      if (policy.validityRequired) fields.push(`VALIDITY:${descriptor.validityClass}`);
      if (!policy.queryOrientationInvariant) fields.push(`QUERY:${descriptor.queryOrientation}`);
      if (!policy.reflectionInvariant) fields.push(`CHIRALITY:${descriptor.chirality}`);
      return `TRIADIC-PROFILE-V9|${fields.join('|')}`;
    }

    function hydrateProfileTrial(trial) {
      const profile = trial.logicProfile || PROFILE_BY_ID.get(trial.logicProfileId);
      if (!profile) return trial;
      trial.mode = 0;
      trial.logicProfile = profile;
      trial.logicProfileId = profile.id;
      trial.letters = trialLetters(trial);
      trial.symbols = [...trial.letters];
      trial.logicalContract = trial.logicalContract || profile.contract;
      trial.comparisonPolicy = trial.comparisonPolicy || POLICIES.standard;
      trial.queryOrientation = trial.queryOrientation || profile.queryOrientation;
      trial.chirality = Number(trial.chirality ?? profile.chirality ?? 0) & 1;
      const evaluation = evaluateContractTrial(trial);
      trial.withinTrialEntailed = evaluation.isEntailed;
      trial.withinTrialDistinctionClass = evaluation.distinctionClass;
      trial.isEntailed = evaluation.isEntailed;
      trial.distinctionClass = evaluation.distinctionClass;
      trial.expectedRelations = evaluation.possibleRelations;
      trial.contractEvaluation = {
        necessary: evaluation.necessary,
        possible: evaluation.possible,
        possibleRelations: evaluation.possibleRelations
      };
      trial.interferenceMeta = {
        ...(trial.interferenceMeta || {}),
        letteringIdentityIgnored: true,
        completeLogicalProfileUsed: true,
        topology: profile.topology,
        mechanism: profile.mechanism,
        contractId: trial.logicalContract.id,
        validityClass: profile.validityClass
      };
      if (evaluation.isEntailed !== profile.expected) {
        throw new Error(`Logical profile ${profile.id} does not agree with its independently evaluated surface.`);
      }
      return trial;
    }

    function instantiateProfile(profileOrId, rng, options = {}) {
      const profile = typeof profileOrId === 'string' ? PROFILE_BY_ID.get(profileOrId) : profileOrId;
      if (!profile) throw new Error(`Unknown Triadic Entailment profile: ${profileOrId}`);
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const letters = options.letters || chooseLetters(rng, options.target);
      const sourceLetters = [...new Set(profile.premises.flatMap(item => [item.subject, item.object]))];
      const letterMap = Object.fromEntries(sourceLetters.map((letter, index) => [letter, letters[index]]));
      const surfaceStep = interferenceLevel < 25 ? 4 : interferenceLevel < 70 ? 2 : 1;
      const contractStep = profile.contract.metric === 'qualitative-sign' ? 4 : 16 / profile.contract.resolution;
      const rotationStep = Math.max(surfaceStep, contractStep);
      const rotationPool = Array.from({ length: 16 / rotationStep }, (_, index) => index * rotationStep);
      const rotation = Number.isInteger(options.rotation) ? ((options.rotation % 16) + 16) % 16 : pick(rng, rotationPool);
      const policy = options.policy || POLICIES.standard;
      const reflected = typeof options.reflected === 'boolean'
        ? options.reflected
        : policy.reflectionInvariant && interferenceLevel >= 45 && random(rng) < 0.4;
      const inversionProbability = Math.min(0.5, interferenceLevel / 200);

      let premises = profile.premises.map(statement => transformStatement(statement, letterMap, rotation, reflected));
      premises = premises.map(statement => random(rng) < inversionProbability ? core.invert(statement) : statement);
      const premiseOrderReversed = random(rng) < 0.5;
      if (premiseOrderReversed) premises.reverse();
      const conclusion = transformStatement(profile.conclusion, letterMap, rotation, reflected);

      return hydrateProfileTrial({
        mode: 0,
        premises,
        conclusion,
        letters,
        logicProfile: profile,
        logicProfileId: profile.id,
        logicalContract: profile.contract,
        comparisonPolicy: policy,
        queryOrientation: profile.queryOrientation,
        chirality: (profile.chirality ^ Number(reflected)) & 1,
        profileTransformation: {
          consistentRenaming: true,
          rotationSteps: rotation,
          reflected,
          premiseOrderReversed
        },
        interferenceLevel,
        interferenceMeta: { level: interferenceLevel }
      });
    }

    function profileDistance(firstTrial, secondProfile, policy) {
      const first = descriptorFor(firstTrial);
      const second = {
        topology: secondProfile.topology,
        mechanism: secondProfile.mechanism,
        queryOrientation: secondProfile.queryOrientation,
        contract: secondProfile.contract.id,
        validityClass: secondProfile.validityClass,
        chirality: secondProfile.chirality
      };
      let distance = 0;
      if (policy.topologyRequired && first.topology !== second.topology) distance += 1;
      if (policy.mechanismRequired && first.mechanism !== second.mechanism) distance += 1;
      if (policy.contractRequired && first.contract !== second.contract) distance += 1;
      if (policy.validityRequired && first.validityClass !== second.validityClass) distance += 1;
      if (!policy.queryOrientationInvariant && first.queryOrientation !== second.queryOrientation) distance += 1;
      return distance;
    }

    function choosePolicy(rng, level) {
      if (level >= 5) return pick(rng, [POLICIES.standard, POLICIES.inverseEquivalent, POLICIES.rotationOnly]);
      if (level >= 2) return pick(rng, [POLICIES.standard, POLICIES.inverseEquivalent]);
      return POLICIES.standard;
    }

    function chooseWarmupProfile(rng, level, interferenceLevel) {
      const eligible = PROFILES.filter(profile => {
        if (level <= 2) return ['unit-8-exact', 'unit-16-exact'].includes(profile.contract.id);
        if (level <= 4) return profile.contract.id !== 'positive-16-necessary' || interferenceLevel >= 55;
        return true;
      });
      return pick(rng, eligible);
    }

    function chooseEquivalentProfile(target, policy, rng) {
      const targetSignature = signatureFor(target, policy);
      const targetChirality = descriptorFor(target).chirality;
      const candidates = PROFILES.filter(profile => {
        const synthetic = {
          logicProfile: profile,
          logicalContract: profile.contract,
          comparisonPolicy: policy,
          queryOrientation: profile.queryOrientation,
          chirality: policy.reflectionInvariant ? profile.chirality : targetChirality
        };
        return signatureFor(synthetic, policy) === targetSignature;
      });
      return pick(rng, candidates.length ? candidates : [target.logicProfile]);
    }

    function chooseNonEquivalentProfile(target, policy, rng, interferenceLevel) {
      const targetSignature = signatureFor(target, policy);
      const candidates = PROFILES.filter(profile => {
        const synthetic = {
          logicProfile: profile,
          logicalContract: profile.contract,
          comparisonPolicy: policy,
          queryOrientation: profile.queryOrientation,
          chirality: profile.chirality
        };
        return signatureFor(synthetic, policy) !== targetSignature;
      });
      const ranked = candidates
        .map(profile => ({ profile, distance: profileDistance(target, profile, policy) }))
        .sort((a, b) => a.distance - b.distance);
      const nearCount = interferenceLevel >= 65 ? Math.min(4, ranked.length) : Math.min(10, ranked.length);
      return pick(rng, ranked.slice(0, Math.max(1, nearCount))).profile;
    }

    function profileDifference(first, second, policy) {
      const a = descriptorFor(first);
      const b = descriptorFor(second);
      if (policy.contractRequired && a.contract !== b.contract) return `the governing contract changes from ${a.contract} to ${b.contract}`;
      if (policy.topologyRequired && a.topology !== b.topology) return `the proof topology changes from ${a.topology} to ${b.topology}`;
      if (policy.mechanismRequired && a.mechanism !== b.mechanism) return `the proof mechanism changes from ${a.mechanism} to ${b.mechanism}`;
      if (policy.validityRequired && a.validityClass !== b.validityClass) return `the conclusion class changes from ${a.validityClass} to ${b.validityClass}`;
      if (!policy.queryOrientationInvariant && a.queryOrientation !== b.queryOrientation) return `the query orientation changes from ${a.queryOrientation} to ${b.queryOrientation}`;
      if (!policy.reflectionInvariant && a.chirality !== b.chirality) return 'the current proof is a reflection, while this comparison permits rotation only';
      return 'a logically relevant profile component changes';
    }

    core.renderTrial = function renderProfileTrial(trial) {
      const rendered = `${trial.premises.map(core.renderStatement).join('; ')}; ${core.renderStatement(trial.conclusion)}.`;
      if ((rendered.match(/;/g) || []).length !== 2) throw new Error('Mode 1 must contain exactly three relational statements.');
      if (/contract\s*:|therefore/i.test(rendered)) throw new Error('Mode 1 leaked hidden logic into the premise surface.');
      return rendered;
    };

    core.hydrateTrial = function hydrateV9Trial(trial) {
      if (trial?.logicProfile || trial?.logicProfileId) return hydrateProfileTrial(trial);
      return trial;
    };

    core.generateTrial = function generateProfileWarmup(rng, options = {}) {
      const level = clampLevel(options.nBackLevel || 1);
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const profile = chooseWarmupProfile(rng, level, interferenceLevel);
      const policy = choosePolicy(rng, level);
      return instantiateProfile(profile, rng, { interferenceLevel, policy });
    };

    core.generateNBackWarmupTrial = function generateProfileNBackWarmup(rng, options = {}) {
      const level = clampLevel(options.nBackLevel);
      const trial = core.generateTrial(rng, {
        nBackLevel: level,
        interferenceLevel: options.interferenceLevel
      });
      trial.nBackLevel = level;
      trial.nBackWarmup = true;
      trial.nBackCurrentSignature = signatureFor(trial, trial.comparisonPolicy);
      trial.nBackMatch = false;
      trial.isMatch = false;
      trial.scored = false;
      trial.signature = trial.nBackCurrentSignature;
      return trial;
    };

    core.generateNBackTrial = function generateProfileNBackTrial(rng, target, options = {}) {
      const requestedMatch = Boolean(options.match);
      const level = clampLevel(options.nBackLevel);
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const policy = target.comparisonPolicy || POLICIES.standard;
      let profile;
      let forceReflection = false;

      if (requestedMatch) {
        profile = chooseEquivalentProfile(target, policy, rng);
      } else if (!policy.reflectionInvariant && interferenceLevel >= 60 && random(rng) < 0.35) {
        profile = target.logicProfile;
        forceReflection = true;
      } else {
        profile = chooseNonEquivalentProfile(target, policy, rng, interferenceLevel);
      }

      const matchReflection = requestedMatch && !policy.reflectionInvariant
        ? Boolean((descriptorFor(target).chirality ^ profile.chirality) & 1)
        : undefined;
      const trial = instantiateProfile(profile, rng, {
        target,
        interferenceLevel,
        policy,
        reflected: forceReflection
          ? !Boolean(target.profileTransformation?.reflected)
          : matchReflection
      });
      const targetSignature = signatureFor(target, policy);
      const currentSignature = signatureFor(trial, policy);
      const computedMatch = targetSignature === currentSignature;

      trial.nBackLevel = level;
      trial.nBackWarmup = false;
      trial.nBackTargetProfile = target.logicProfileId;
      trial.nBackCurrentProfile = trial.logicProfileId;
      trial.nBackTargetSignature = targetSignature;
      trial.nBackCurrentSignature = currentSignature;
      trial.nBackRequestedMatch = requestedMatch;
      trial.nBackMatch = computedMatch;
      trial.isMatch = computedMatch;
      trial.scored = true;
      trial.signature = currentSignature;

      if (computedMatch !== requestedMatch) {
        throw new Error('N-back generation branch disagrees with complete logical-profile comparison.');
      }
      return trial;
    };

    core.nBackLevels = LEVELS;
    core.clampNBackLevel = clampLevel;
    core.nBackLogicDescriptor = descriptorFor;
    core.nBackLogicSignature = trial => signatureFor(trial, trial.comparisonPolicy || POLICIES.standard);
    core.nBackEquivalent = (first, second) => {
      const policy = first?.comparisonPolicy || second?.comparisonPolicy || POLICIES.standard;
      return signatureFor(first, policy) === signatureFor(second, policy);
    };
    core.evaluateContractTrial = evaluateContractTrial;
    core.instantiateLogicProfile = instantiateProfile;
    core.logicProfiles = () => clone(PROFILES);
    core.nBackComparisonPolicies = () => clone(POLICIES);
    core.canonicalNBackComparisons = () => clone(ARCHETYPES);

    core.explainNBackTrial = function explainProfileNBackTrial(trial) {
      const level = clampLevel(trial?.nBackLevel);
      if (trial?.nBackWarmup) {
        return `Memory fill — retain this complete relational profile. Scoring begins after ${level} triad${level === 1 ? '' : 's'}.`;
      }
      if (trial?.nBackMatch) {
        return `MATCH — this triad and the triad ${level} back preserve the same proof topology, transformation mechanism, logical contract, validity class and required query structure. Their letters and absolute directions are irrelevant.`;
      }
      const targetProfile = PROFILE_BY_ID.get(trial.nBackTargetProfile);
      const target = {
        logicProfile: targetProfile,
        logicalContract: targetProfile?.contract,
        comparisonPolicy: trial.comparisonPolicy,
        queryOrientation: targetProfile?.queryOrientation,
        chirality: trial.nBackTargetSignature?.includes('CHIRALITY:1') ? 1 : 0
      };
      return `NO MATCH — ${profileDifference(target, trial, trial.comparisonPolicy || POLICIES.standard)}. The difference is logical, not alphabetical.`;
    };

    function comparisonResult(archetype) {
      const policy = policyById(archetype.policy);
      const targetProfile = PROFILE_BY_ID.get(archetype.targetProfile);
      const currentProfile = PROFILE_BY_ID.get(archetype.currentProfile);
      const target = {
        logicProfile: targetProfile,
        logicalContract: targetProfile.contract,
        comparisonPolicy: policy,
        queryOrientation: targetProfile.queryOrientation,
        chirality: targetProfile.chirality
      };
      const reflected = archetype.relation === 'reflect';
      const current = {
        logicProfile: currentProfile,
        logicalContract: currentProfile.contract,
        comparisonPolicy: policy,
        queryOrientation: currentProfile.queryOrientation,
        chirality: (currentProfile.chirality ^ Number(reflected)) & 1
      };
      return signatureFor(target, policy) === signatureFor(current, policy);
    }

    core.runNBackV9Audit = function runNBackV9Audit(iterations = 8192) {
      const failures = [];
      const levelCounts = Object.fromEntries(LEVELS.map(level => [level, 0]));
      ARCHETYPES.forEach(archetype => {
        levelCounts[archetype.level] += 1;
        const result = comparisonResult(archetype);
        if (result !== archetype.expected) failures.push(`archetype-${archetype.id}`);
      });
      LEVELS.forEach(level => {
        if (levelCounts[level] !== 10) failures.push(`level-${level}-count-${levelCounts[level]}`);
      });

      class AuditRng {
        constructor(seed = 0x9bac80) { this.s = seed >>> 0; }
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
      let matches = 0;
      let nonMatches = 0;
      for (let index = 0; index < iterations; index += 1) {
        const level = LEVELS[index % LEVELS.length];
        const target = core.generateNBackWarmupTrial(rng, { nBackLevel: level, interferenceLevel: index % 101 });
        const requestedMatch = index % 2 === 0;
        const current = core.generateNBackTrial(rng, target, {
          match: requestedMatch,
          nBackLevel: level,
          interferenceLevel: index % 101
        });
        if (current.nBackMatch !== requestedMatch) failures.push(`generated-${index}`);
        if (trialLetters(current).some(letter => new Set(trialLetters(target)).has(letter))) failures.push(`letter-overlap-${index}`);
        if (/contract\s*:|therefore/i.test(core.renderTrial(current))) failures.push(`surface-leak-${index}`);
        if (current.withinTrialEntailed !== current.logicProfile.expected) failures.push(`surface-proof-${index}`);
        if (requestedMatch) matches += 1;
        else nonMatches += 1;
      }

      return {
        passed: failures.length === 0,
        failures,
        iterations,
        archetypeCount: ARCHETYPES.length,
        examplesPerLevel: levelCounts,
        matches,
        nonMatches,
        nBackLevels: LEVELS,
        letteringIdentityRelevant: false,
        completeProfileDimensions: ['topology', 'mechanism', 'contract', 'validity', 'query-orientation', 'chirality'],
        visibleContractText: false,
        modeTwoPreserved: true
      };
    };

    core.__triadicProfileNBackV9 = true;
    core.nBackRuntime = 'complete-logical-profile-nback-v9';
    core.nBackPolicy = Object.freeze({
      minimumLevel: 1,
      maximumLevel: 8,
      letteringIdentityRelevant: false,
      absoluteDirectionIdentityRelevant: false,
      comparisonDimensions: ['proof topology', 'transformation mechanism', 'logical contract', 'validity class', 'query orientation', 'symmetry criterion'],
      matchIdentity: 'complete logical-profile equivalence under the active comparison policy'
    });

    return core;
  }

  apply.LEVELS = LEVELS;
  apply.PROFILES = PROFILES;
  apply.ARCHETYPES = ARCHETYPES;
  return apply;
});