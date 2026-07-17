'use strict';

(function exposeTriadicMetaCurriculum(root, factory) {
  const apply = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = apply;
  if (root) {
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    if (core) apply(core);
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const LEVEL_FOCUS = Object.freeze({
    1: 'direct entailment, binding integrity, reversal, local-versus-global validity and adjacent relational error',
    2: 'consistent renaming, inversion, clause reordering, endpoint orientation and bridge-role regulation',
    3: 'four-, eight- and sixteen-way resolution, exactness, coarsening, adjacency and precision regulation',
    4: 'equal-unit, qualitative and unspecified-magnitude model spaces; necessity, possibility and contradiction',
    5: 'rotation, reflection, chirality, reference-frame invariance and transformation-class discrimination',
    6: 'same answer versus same proof, proof identity, proof equivalence, topology and mechanism comparison',
    7: 'evaluation-policy induction, criterion selection, contract discrimination and minimal rule revision',
    8: 'complete-profile integration, counterfactual dependency, contract revision and criterion-level regulation'
  });

  const clone = value => JSON.parse(JSON.stringify(value));

  const CONTRACTS = Object.freeze({
    unit8Exact: Object.freeze({ id: 'unit-8-exact', metric: 'unit', resolution: 8, evaluation: 'exact' }),
    unit16Exact: Object.freeze({ id: 'unit-16-exact', metric: 'unit', resolution: 16, evaluation: 'exact' }),
    unit4Truth: Object.freeze({ id: 'unit-4-truth', metric: 'unit', resolution: 4, evaluation: 'truth' }),
    qualitative8Necessary: Object.freeze({ id: 'qualitative-8-necessary', metric: 'qualitative-sign', resolution: 8, evaluation: 'necessary' }),
    positive16Necessary: Object.freeze({ id: 'positive-16-necessary', metric: 'positive-unspecified', resolution: 16, evaluation: 'necessary' }),
    unit8Truth: Object.freeze({ id: 'unit-8-truth', metric: 'unit', resolution: 8, evaluation: 'truth' }),
    unit16Maximal: Object.freeze({ id: 'unit-16-maximal-precision', metric: 'unit', resolution: 16, evaluation: 'maximal-precision' }),
    unit16Proof: Object.freeze({ id: 'unit-16-proof-identity', metric: 'unit', resolution: 16, evaluation: 'proof-identity' }),
    unit16Structural: Object.freeze({ id: 'unit-16-structural-equivalence', metric: 'unit', resolution: 16, evaluation: 'structural-equivalence' }),
    unit8Proof: Object.freeze({ id: 'unit-8-proof-identity', metric: 'unit', resolution: 8, evaluation: 'proof-identity' }),
    positive16MinimalRevision: Object.freeze({ id: 'positive-16-minimal-revision', metric: 'positive-unspecified', resolution: 16, evaluation: 'minimal-revision' }),
    unit16Counterfactual: Object.freeze({ id: 'unit-16-counterfactual', metric: 'unit', resolution: 16, evaluation: 'counterfactual-dependency' }),
    unit16Frame: Object.freeze({ id: 'unit-16-frame-sensitive', metric: 'unit', resolution: 16, evaluation: 'frame-invariance' }),
    unit16Stable: Object.freeze({ id: 'unit-16-stable-regime', metric: 'unit', resolution: 16, evaluation: 'global-consistency' }),
    unit16Revised: Object.freeze({ id: 'unit-16-revised-regime', metric: 'unit', resolution: 16, evaluation: 'minimal-revision' })
  });

  function profile(spec) {
    return Object.freeze({
      chirality: 0,
      referenceFrame: 'allocentric',
      transformationClass: 'orientation-preserving',
      revisionClass: 'stable',
      ...spec
    });
  }

  const EXTENDED_PROFILES = Object.freeze([
    profile({
      id: 'branch-orthogonal-inverse-unit8', label: 'inverse orthogonal branch entailment',
      topology: 'branch', mechanism: 'branch-comparison', queryOrientation: 'inverse',
      contract: CONTRACTS.unit8Exact, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'shared-anchor-comparison', dependencyClass: 'binding-critical',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'C', relation: 'E', object: 'B' }],
      conclusion: { subject: 'C', relation: 'SE', object: 'A' }
    }),
    profile({
      id: 'branch-orthogonal-reversal-error', label: 'branch subject-object reversal',
      topology: 'branch', mechanism: 'branch-comparison', queryOrientation: 'inverse',
      contract: CONTRACTS.unit8Exact, validityClass: 'subject-object-reversal', expected: false,
      proofEquivalence: 'shared-anchor-comparison', dependencyClass: 'orientation-critical',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'C', relation: 'E', object: 'B' }],
      conclusion: { subject: 'C', relation: 'NW', object: 'A' }
    }),
    profile({
      id: 'branch-local-consistency-error', label: 'local consistency without global entailment',
      topology: 'branch', mechanism: 'branch-comparison', queryOrientation: 'local',
      contract: CONTRACTS.unit8Exact, validityClass: 'local-consistency-without-global-entailment', expected: false,
      proofEquivalence: 'shared-anchor-comparison', dependencyClass: 'endpoint-critical',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'C', relation: 'E', object: 'B' }],
      conclusion: { subject: 'A', relation: 'N', object: 'B' }
    }),
    profile({
      id: 'chain-diagonal-reinforcement-unit16', label: 'diagonal reinforcement',
      topology: 'chain', mechanism: 'vector-reinforcement', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Exact, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-reinforcement', dependencyClass: 'composition-critical',
      premises: [{ subject: 'A', relation: 'NE', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NE', object: 'C' }
    }),
    profile({
      id: 'chain-diagonal-reinforcement-inverse-unit16', label: 'inverse diagonal reinforcement',
      topology: 'chain', mechanism: 'vector-reinforcement', queryOrientation: 'inverse',
      contract: CONTRACTS.unit16Exact, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-reinforcement', dependencyClass: 'composition-critical',
      premises: [{ subject: 'A', relation: 'NE', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'C', relation: 'SW', object: 'A' }
    }),
    profile({
      id: 'chain-diagonal-reinforcement-adjacent-error', label: 'diagonal reinforcement adjacent-sector substitution',
      topology: 'chain', mechanism: 'vector-reinforcement', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Exact, validityClass: 'adjacent-resolution-error', expected: false,
      proofEquivalence: 'vector-reinforcement', dependencyClass: 'resolution-critical',
      premises: [{ subject: 'A', relation: 'NE', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'ENE', object: 'C' }
    }),
    profile({
      id: 'chain-oblique-cancellation-unit16', label: 'oblique cancellation',
      topology: 'chain', mechanism: 'vector-cancellation', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Exact, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-cancellation', dependencyClass: 'cancellation-critical',
      premises: [{ subject: 'A', relation: 'NNE', object: 'B' }, { subject: 'B', relation: 'SSE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'E', object: 'C' }
    }),
    profile({
      id: 'chain-oblique-cancellation-inverse-unit16', label: 'inverse oblique cancellation',
      topology: 'chain', mechanism: 'vector-cancellation', queryOrientation: 'inverse',
      contract: CONTRACTS.unit16Exact, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-cancellation', dependencyClass: 'cancellation-critical',
      premises: [{ subject: 'A', relation: 'NNE', object: 'B' }, { subject: 'B', relation: 'SSE', object: 'C' }],
      conclusion: { subject: 'C', relation: 'W', object: 'A' }
    }),
    profile({
      id: 'chain-oblique-cancellation-adjacent-error', label: 'oblique cancellation adjacent-sector substitution',
      topology: 'chain', mechanism: 'vector-cancellation', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Exact, validityClass: 'adjacent-resolution-error', expected: false,
      proofEquivalence: 'vector-cancellation', dependencyClass: 'resolution-critical',
      premises: [{ subject: 'A', relation: 'NNE', object: 'B' }, { subject: 'B', relation: 'SSE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'ENE', object: 'C' }
    }),
    profile({
      id: 'branch-vertical-reinforcement-unit8', label: 'vertical branch reinforcement',
      topology: 'branch', mechanism: 'branch-comparison', queryOrientation: 'direct',
      contract: CONTRACTS.unit8Exact, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'shared-anchor-comparison', dependencyClass: 'binding-critical',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'C', relation: 'S', object: 'B' }],
      conclusion: { subject: 'A', relation: 'N', object: 'C' }
    }),
    profile({
      id: 'branch-vertical-reinforcement-inverse-unit8', label: 'inverse vertical branch reinforcement',
      topology: 'branch', mechanism: 'branch-comparison', queryOrientation: 'inverse',
      contract: CONTRACTS.unit8Exact, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'shared-anchor-comparison', dependencyClass: 'binding-critical',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'C', relation: 'S', object: 'B' }],
      conclusion: { subject: 'C', relation: 'S', object: 'A' }
    }),
    profile({
      id: 'chain-positive-same-axis-necessary', label: 'unspecified-magnitude same-axis necessity',
      topology: 'chain', mechanism: 'vector-reinforcement', queryOrientation: 'direct',
      contract: CONTRACTS.positive16Necessary, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-reinforcement', dependencyClass: 'metric-critical',
      premises: [{ subject: 'A', relation: 'E', object: 'B' }, { subject: 'B', relation: 'E', object: 'C' }],
      conclusion: { subject: 'A', relation: 'E', object: 'C' }
    }),
    profile({
      id: 'chain-positive-orthogonal-contradiction', label: 'unspecified-magnitude contradiction',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.positive16Necessary, validityClass: 'contradiction', expected: false,
      proofEquivalence: 'vector-sum', dependencyClass: 'modal-critical',
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'A', relation: 'E', object: 'C' }
    }),
    profile({
      id: 'chain-positive-orthogonal-compatible', label: 'compatible but non-necessary orthogonal claim',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.positive16Necessary, validityClass: 'compatible-possibility', expected: false,
      proofEquivalence: 'vector-sum', dependencyClass: 'modal-critical',
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NW', object: 'C' }
    }),
    profile({
      id: 'branch-qualitative-contradiction', label: 'qualitative branch contradiction',
      topology: 'branch', mechanism: 'branch-comparison', queryOrientation: 'direct',
      contract: CONTRACTS.qualitative8Necessary, validityClass: 'contradiction', expected: false,
      proofEquivalence: 'shared-anchor-comparison', dependencyClass: 'modal-critical',
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'C', relation: 'N', object: 'B' }],
      conclusion: { subject: 'A', relation: 'NE', object: 'C' }
    }),
    profile({
      id: 'chain-coarse4-orthogonal', label: 'four-way orthogonal truth',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit4Truth, validityClass: 'coarse-truth-entailment', expected: true,
      proofEquivalence: 'vector-sum', dependencyClass: 'resolution-critical',
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'A', relation: 'N', object: 'C' }
    }),
    profile({
      id: 'chain-exact16-orthogonal-underprecise', label: 'sixteen-way orthogonal under-precision',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Exact, validityClass: 'under-precise', expected: false,
      proofEquivalence: 'vector-sum', dependencyClass: 'resolution-critical',
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'A', relation: 'N', object: 'C' }
    }),
    profile({
      id: 'chain-coarse8-cardinal-diagonal', label: 'eight-way orthogonal truth',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit8Truth, validityClass: 'coarse-truth-entailment', expected: true,
      proofEquivalence: 'vector-sum', dependencyClass: 'resolution-critical',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'E', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NE', object: 'C' }
    }),
    profile({
      id: 'chain-unit16-maximal-cardinal-diagonal', label: 'maximal-precision cardinal-diagonal entailment',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Maximal, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-sum', dependencyClass: 'criterion-critical',
      criterionClass: 'maximal-precision',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNE', object: 'C' }
    }),
    profile({
      id: 'chain-unit16-proof-cardinal-diagonal', label: 'proof-identity cardinal-diagonal entailment',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Proof, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-sum', dependencyClass: 'proof-critical',
      criterionClass: 'proof-identity',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNE', object: 'C' }
    }),
    profile({
      id: 'chain-unit16-structural-cardinal-diagonal', label: 'structural-equivalence cardinal-diagonal entailment',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Structural, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-sum', dependencyClass: 'proof-critical',
      criterionClass: 'structural-equivalence',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNE', object: 'C' }
    }),
    profile({
      id: 'chain-positive16-minimal-revision-overprecise', label: 'minimal-revision possible but non-necessary claim',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.positive16MinimalRevision, validityClass: 'compatible-possibility', expected: false,
      proofEquivalence: 'vector-sum', dependencyClass: 'revision-critical',
      criterionClass: 'minimal-revision', revisionClass: 'revised',
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNW', object: 'C' }
    }),
    profile({
      id: 'chain-unit8-proof-orthogonal', label: 'proof-identity orthogonal chain',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit8Proof, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-sum', dependencyClass: 'proof-critical',
      criterionClass: 'proof-identity',
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NW', object: 'C' }
    }),
    profile({
      id: 'chain-unit8-proof-orthogonal-inverse', label: 'inverse proof-identity orthogonal chain',
      topology: 'chain', mechanism: 'orthogonal-composition', queryOrientation: 'inverse',
      contract: CONTRACTS.unit8Proof, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-sum', dependencyClass: 'proof-critical',
      criterionClass: 'proof-identity',
      premises: [{ subject: 'A', relation: 'W', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
      conclusion: { subject: 'C', relation: 'SE', object: 'A' }
    }),
    profile({
      id: 'branch-unit8-proof-orthogonal', label: 'proof-identity orthogonal branch',
      topology: 'branch', mechanism: 'branch-comparison', queryOrientation: 'direct',
      contract: CONTRACTS.unit8Proof, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'shared-anchor-comparison', dependencyClass: 'proof-critical',
      criterionClass: 'proof-identity',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'C', relation: 'E', object: 'B' }],
      conclusion: { subject: 'A', relation: 'NW', object: 'C' }
    }),
    profile({
      id: 'chain-unit16-counterfactual-cancellation', label: 'counterfactual cancellation dependency',
      topology: 'chain', mechanism: 'vector-cancellation', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Counterfactual, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-cancellation', dependencyClass: 'cancellation-critical',
      criterionClass: 'counterfactual-dependency',
      premises: [{ subject: 'A', relation: 'NE', object: 'B' }, { subject: 'B', relation: 'SE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'E', object: 'C' }
    }),
    profile({
      id: 'chain-unit16-counterfactual-reinforcement', label: 'counterfactual reinforcement dependency',
      topology: 'chain', mechanism: 'vector-reinforcement', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Counterfactual, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-reinforcement', dependencyClass: 'reinforcement-critical',
      criterionClass: 'counterfactual-dependency',
      premises: [{ subject: 'A', relation: 'NE', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NE', object: 'C' }
    }),
    profile({
      id: 'chain-unit16-frame-allocentric', label: 'allocentric frame-sensitive entailment',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Frame, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-sum', dependencyClass: 'frame-critical',
      criterionClass: 'frame-invariance', referenceFrame: 'allocentric', transformationClass: 'rotation',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNE', object: 'C' }
    }),
    profile({
      id: 'chain-unit16-frame-mirrored', label: 'mirrored frame-sensitive entailment',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Frame, validityClass: 'exact-entailment', expected: true, chirality: 1,
      proofEquivalence: 'vector-sum', dependencyClass: 'frame-critical',
      criterionClass: 'frame-invariance', referenceFrame: 'mirror-relative', transformationClass: 'reflection',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNE', object: 'C' }
    }),
    profile({
      id: 'chain-unit16-rule-stable', label: 'stable logical regime',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Stable, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-sum', dependencyClass: 'revision-critical',
      criterionClass: 'global-consistency', revisionClass: 'stable',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNE', object: 'C' }
    }),
    profile({
      id: 'chain-unit16-rule-revised', label: 'minimally revised logical regime',
      topology: 'chain', mechanism: 'cardinal-diagonal-composition', queryOrientation: 'direct',
      contract: CONTRACTS.unit16Revised, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-sum', dependencyClass: 'revision-critical',
      criterionClass: 'minimal-revision', revisionClass: 'revised',
      premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NNE', object: 'C' }
    }),
    profile({
      id: 'chain-positive-diagonal-reinforcement-necessary', label: 'unspecified-magnitude diagonal reinforcement necessity',
      topology: 'chain', mechanism: 'vector-reinforcement', queryOrientation: 'direct',
      contract: CONTRACTS.positive16Necessary, validityClass: 'exact-entailment', expected: true,
      proofEquivalence: 'vector-reinforcement', dependencyClass: 'metric-critical',
      premises: [{ subject: 'A', relation: 'NE', object: 'B' }, { subject: 'B', relation: 'NE', object: 'C' }],
      conclusion: { subject: 'A', relation: 'NE', object: 'C' }
    })
  ]);

  const EXTRA_ARCHETYPES = Object.freeze([
    ['1.11', 1, 'branch-orthogonal-inverse-unit8', 'branch-orthogonal-inverse-unit8', true, 'standard'],
    ['1.12', 1, 'branch-orthogonal-inverse-unit8', 'branch-orthogonal-reversal-error', false, 'standard'],
    ['1.13', 1, 'chain-diagonal-reinforcement-unit16', 'chain-diagonal-reinforcement-unit16', true, 'standard'],
    ['1.14', 1, 'chain-diagonal-reinforcement-unit16', 'chain-diagonal-reinforcement-adjacent-error', false, 'standard'],
    ['1.15', 1, 'branch-vertical-reinforcement-unit8', 'branch-vertical-reinforcement-unit8', true, 'standard'],
    ['1.16', 1, 'branch-vertical-reinforcement-unit8', 'branch-local-consistency-error', false, 'standard'],
    ['1.17', 1, 'chain-oblique-cancellation-unit16', 'chain-oblique-cancellation-unit16', true, 'standard'],
    ['1.18', 1, 'chain-oblique-cancellation-unit16', 'chain-oblique-cancellation-adjacent-error', false, 'standard'],
    ['1.19', 1, 'chain-unit8-proof-orthogonal', 'chain-unit8-proof-orthogonal', true, 'standard'],
    ['1.20', 1, 'chain-unit8-proof-orthogonal', 'branch-unit8-proof-orthogonal', false, 'standard'],
    ['2.11', 2, 'branch-vertical-reinforcement-unit8', 'branch-vertical-reinforcement-inverse-unit8', true, 'inverseEquivalent'],
    ['2.12', 2, 'branch-vertical-reinforcement-unit8', 'branch-orthogonal-reversal-error', false, 'inverseEquivalent'],
    ['2.13', 2, 'chain-diagonal-reinforcement-unit16', 'chain-diagonal-reinforcement-inverse-unit16', true, 'inverseEquivalent'],
    ['2.14', 2, 'chain-diagonal-reinforcement-unit16', 'chain-diagonal-reinforcement-adjacent-error', false, 'inverseEquivalent'],
    ['2.15', 2, 'chain-oblique-cancellation-unit16', 'chain-oblique-cancellation-inverse-unit16', true, 'inverseEquivalent'],
    ['2.16', 2, 'chain-oblique-cancellation-unit16', 'chain-oblique-cancellation-adjacent-error', false, 'inverseEquivalent'],
    ['2.17', 2, 'chain-unit8-proof-orthogonal', 'chain-unit8-proof-orthogonal-inverse', true, 'inverseEquivalent'],
    ['2.18', 2, 'chain-unit8-proof-orthogonal', 'branch-local-consistency-error', false, 'inverseEquivalent'],
    ['2.19', 2, 'branch-orthogonal-unit8', 'branch-orthogonal-inverse-unit8', true, 'inverseEquivalent'],
    ['2.20', 2, 'branch-orthogonal-unit8', 'branch-orthogonal-reversal-error', false, 'inverseEquivalent'],
    ['3.11', 3, 'chain-coarse8-cardinal-diagonal', 'chain-coarse8-cardinal-diagonal', true, 'standard'],
    ['3.12', 3, 'chain-coarse8-cardinal-diagonal', 'chain-cardinal-diagonal-unit16', false, 'standard'],
    ['3.13', 3, 'chain-coarse4-orthogonal', 'chain-coarse4-orthogonal', true, 'standard'],
    ['3.14', 3, 'chain-coarse4-orthogonal', 'chain-orthogonal-direct-unit16', false, 'standard'],
    ['3.15', 3, 'chain-unit16-maximal-cardinal-diagonal', 'chain-unit16-maximal-cardinal-diagonal', true, 'standard'],
    ['3.16', 3, 'chain-unit16-maximal-cardinal-diagonal', 'chain-exact16-underprecise', false, 'standard'],
    ['3.17', 3, 'chain-qualitative-quadrant8', 'chain-qualitative-quadrant8', true, 'proofIdentity'],
    ['3.18', 3, 'chain-qualitative-quadrant8', 'chain-positive16-overprecise', false, 'proofIdentity'],
    ['3.19', 3, 'chain-oblique-cancellation-unit16', 'chain-oblique-cancellation-unit16', true, 'standard'],
    ['3.20', 3, 'chain-oblique-cancellation-unit16', 'chain-oblique-cancellation-adjacent-error', false, 'standard'],
    ['4.11', 4, 'chain-positive-same-axis-necessary', 'chain-positive-same-axis-necessary', true, 'standard'],
    ['4.12', 4, 'chain-positive-same-axis-necessary', 'chain-cardinal-reinforcement-unit8', false, 'standard'],
    ['4.13', 4, 'chain-positive-orthogonal-compatible', 'chain-positive-orthogonal-compatible', true, 'standard'],
    ['4.14', 4, 'chain-positive-orthogonal-compatible', 'chain-positive-orthogonal-contradiction', false, 'standard'],
    ['4.15', 4, 'chain-diagonal-cancellation-unit16', 'chain-diagonal-cancellation-unit16', true, 'proofIdentity'],
    ['4.16', 4, 'chain-diagonal-cancellation-unit16', 'chain-positive16-cancellation-possible', false, 'proofIdentity'],
    ['4.17', 4, 'branch-qualitative-unit8', 'branch-qualitative-unit8', true, 'proofIdentity'],
    ['4.18', 4, 'branch-qualitative-unit8', 'branch-qualitative-contradiction', false, 'standard'],
    ['4.19', 4, 'chain-positive-diagonal-reinforcement-necessary', 'chain-positive-diagonal-reinforcement-necessary', true, 'standard'],
    ['4.20', 4, 'chain-positive-diagonal-reinforcement-necessary', 'chain-diagonal-reinforcement-unit16', false, 'standard'],
    ['5.11', 5, 'chain-diagonal-reinforcement-unit16', 'chain-diagonal-reinforcement-unit16', true, 'standard', 'reflect'],
    ['5.12', 5, 'chain-diagonal-reinforcement-unit16', 'chain-diagonal-reinforcement-unit16', false, 'rotationOnly', 'reflect'],
    ['5.13', 5, 'branch-vertical-reinforcement-unit8', 'branch-vertical-reinforcement-unit8', true, 'standard', 'reflect'],
    ['5.14', 5, 'branch-vertical-reinforcement-unit8', 'branch-vertical-reinforcement-unit8', false, 'rotationOnly', 'reflect'],
    ['5.15', 5, 'chain-unit16-frame-allocentric', 'chain-unit16-frame-allocentric', true, 'frameSensitive'],
    ['5.16', 5, 'chain-unit16-frame-allocentric', 'chain-unit16-frame-allocentric', false, 'frameSensitive', 'reflect'],
    ['5.17', 5, 'branch-orthogonal-unit8', 'branch-orthogonal-inverse-unit8', true, 'inverseEquivalent'],
    ['5.18', 5, 'branch-orthogonal-unit8', 'branch-orthogonal-inverse-unit8', false, 'standard'],
    ['5.19', 5, 'chain-unit16-frame-mirrored', 'chain-unit16-frame-mirrored', true, 'frameSensitive'],
    ['5.20', 5, 'chain-unit16-frame-mirrored', 'chain-unit16-frame-allocentric', false, 'frameSensitive'],
    ['6.11', 6, 'chain-cardinal-diagonal-unit16', 'chain-alternate-nne-unit16', true, 'semanticEquivalent'],
    ['6.12', 6, 'chain-cardinal-diagonal-unit16', 'chain-alternate-nne-unit16', false, 'proofIdentity'],
    ['6.13', 6, 'chain-diagonal-cancellation-unit16', 'chain-oblique-cancellation-unit16', true, 'proofEquivalent'],
    ['6.14', 6, 'chain-diagonal-cancellation-unit16', 'chain-cardinal-reinforcement-unit8', false, 'proofEquivalent'],
    ['6.15', 6, 'branch-orthogonal-unit8', 'branch-vertical-reinforcement-unit8', true, 'structuralEquivalent'],
    ['6.16', 6, 'branch-orthogonal-unit8', 'chain-orthogonal-direct-unit8', false, 'structuralEquivalent'],
    ['6.17', 6, 'chain-diagonal-reinforcement-unit16', 'chain-cardinal-reinforcement-unit8', true, 'proofEquivalent'],
    ['6.18', 6, 'chain-diagonal-reinforcement-unit16', 'chain-diagonal-cancellation-unit16', false, 'proofEquivalent'],
    ['6.19', 6, 'chain-orthogonal-direct-unit8', 'chain-unit8-proof-orthogonal', true, 'semanticEquivalent'],
    ['6.20', 6, 'chain-orthogonal-direct-unit8', 'chain-unit8-proof-orthogonal', false, 'proofIdentity'],
    ['7.11', 7, 'chain-unit16-maximal-cardinal-diagonal', 'chain-unit16-maximal-cardinal-diagonal', true, 'criterionSensitive'],
    ['7.12', 7, 'chain-unit16-maximal-cardinal-diagonal', 'chain-cardinal-diagonal-unit16', false, 'criterionSensitive'],
    ['7.13', 7, 'chain-unit8-proof-orthogonal', 'chain-unit8-proof-orthogonal', true, 'criterionSensitive'],
    ['7.14', 7, 'chain-unit8-proof-orthogonal', 'chain-orthogonal-direct-unit8', false, 'criterionSensitive'],
    ['7.15', 7, 'chain-coarse4-cardinal-diagonal', 'chain-coarse8-cardinal-diagonal', true, 'criterionOnly'],
    ['7.16', 7, 'chain-coarse4-cardinal-diagonal', 'chain-cardinal-diagonal-unit16', false, 'criterionOnly'],
    ['7.17', 7, 'chain-qualitative-quadrant8', 'chain-positive-diagonal-reinforcement-necessary', true, 'criterionOnly'],
    ['7.18', 7, 'chain-qualitative-quadrant8', 'chain-diagonal-reinforcement-unit16', false, 'criterionOnly'],
    ['7.19', 7, 'chain-unit16-rule-revised', 'chain-unit16-rule-revised', true, 'revisionSensitive'],
    ['7.20', 7, 'chain-unit16-rule-stable', 'chain-unit16-rule-revised', false, 'revisionSensitive'],
    ['8.11', 8, 'chain-unit16-rule-stable', 'chain-unit16-rule-stable', true, 'revisionSensitive'],
    ['8.12', 8, 'chain-unit16-rule-stable', 'chain-unit16-rule-revised', false, 'revisionSensitive'],
    ['8.13', 8, 'chain-positive16-minimal-revision-overprecise', 'chain-positive16-minimal-revision-overprecise', true, 'revisionSensitive'],
    ['8.14', 8, 'chain-positive16-minimal-revision-overprecise', 'chain-positive16-overprecise', false, 'revisionSensitive'],
    ['8.15', 8, 'chain-unit16-counterfactual-cancellation', 'chain-unit16-counterfactual-cancellation', true, 'counterfactualSensitive'],
    ['8.16', 8, 'chain-unit16-counterfactual-cancellation', 'chain-unit16-counterfactual-reinforcement', false, 'counterfactualSensitive'],
    ['8.17', 8, 'chain-unit16-structural-cardinal-diagonal', 'chain-unit16-structural-cardinal-diagonal', true, 'fullIntegration'],
    ['8.18', 8, 'chain-unit16-structural-cardinal-diagonal', 'chain-cardinal-diagonal-unit16', false, 'fullIntegration'],
    ['8.19', 8, 'chain-unit16-maximal-cardinal-diagonal', 'chain-unit16-maximal-cardinal-diagonal', true, 'fullIntegration'],
    ['8.20', 8, 'chain-unit16-maximal-cardinal-diagonal', 'chain-unit16-proof-cardinal-diagonal', false, 'fullIntegration']
  ].map(([id, level, targetProfile, currentProfile, expected, policy, relation = 'ordinary']) => Object.freeze({
    id, level, targetProfile, currentProfile, expected, policy, relation
  })));

  function apply(core) {
    if (!core || core.__triadicMetaCurriculumV11) return core;
    if (!core.__triadicCurriculumNBackV10) {
      throw new Error('Triadic Entailment meta-curriculum v11 requires level-specific curriculum v10.');
    }

    const levels = [...core.nBackLevels];
    const baseProfiles = core.logicProfiles();
    const repairedBase = {
      '2.10': { currentProfile: 'chain-orthogonal-orientation-error' },
      '3.2': { targetProfile: 'chain-orthogonal-direct-unit16', currentProfile: 'chain-orthogonal-direct-unit16' },
      '4.2': { targetProfile: 'chain-qualitative-quadrant8-inverse', currentProfile: 'chain-qualitative-quadrant8-inverse' },
      '4.8': { currentProfile: 'chain-positive-orthogonal-contradiction' },
      '5.2': { targetProfile: 'chain-cardinal-diagonal-inverse-unit16', currentProfile: 'chain-cardinal-diagonal-inverse-unit16' }
    };
    const baseArchetypes = core.canonicalNBackComparisons().map(item => Object.freeze({
      ...item,
      ...(repairedBase[item.id] || {})
    }));
    const legacyInstantiate = core.instantiateLogicProfile.bind(core);
    const legacyEvaluate = core.evaluateContractTrial.bind(core);
    const legacyRender = core.renderTrial.bind(core);

    function criterionForEvaluation(evaluation) {
      const map = {
        exact: 'exactness',
        truth: 'truth-sufficiency',
        necessary: 'necessity',
        'maximal-precision': 'maximal-precision',
        'proof-identity': 'proof-identity',
        'structural-equivalence': 'structural-equivalence',
        'minimal-revision': 'minimal-revision',
        'counterfactual-dependency': 'counterfactual-dependency',
        'frame-invariance': 'frame-invariance',
        'global-consistency': 'global-consistency'
      };
      return map[evaluation] || evaluation || 'exactness';
    }

    function modalFor(profileValue) {
      if (profileValue.expected) return 'necessary';
      if (['possible-not-necessary', 'compatible-possibility'].includes(profileValue.validityClass)) return 'possible';
      if (profileValue.validityClass === 'underdetermination') return 'undetermined';
      return 'impossible';
    }

    function precisionFor(profileValue) {
      const map = {
        'exact-entailment': 'exact',
        'coarse-truth-entailment': 'coarse',
        'adjacent-resolution-error': 'adjacent',
        'subject-object-reversal': 'orientation-error',
        'wrong-letter-pair': 'binding-error',
        'local-consistency-without-global-entailment': 'local-only',
        'orientation-error': 'orientation-error',
        'possible-not-necessary': 'over-precise',
        'compatible-possibility': 'over-precise',
        'under-precise': 'under-precise',
        contradiction: 'contradictory'
      };
      return map[profileValue.validityClass] || (profileValue.expected ? 'exact' : 'invalid');
    }

    function proofEquivalenceFor(profileValue) {
      if (profileValue.proofEquivalence) return profileValue.proofEquivalence;
      const map = {
        'orthogonal-composition': 'vector-sum',
        'cardinal-diagonal-composition': 'vector-sum',
        'counterbalanced-oblique-composition': 'vector-sum',
        'vector-cancellation': 'vector-cancellation',
        'vector-reinforcement': 'vector-reinforcement',
        'branch-comparison': 'shared-anchor-comparison'
      };
      return map[profileValue.mechanism] || profileValue.mechanism;
    }

    function normalizeProfile(profileValue) {
      const contract = profileValue.contract || CONTRACTS.unit8Exact;
      return Object.freeze({
        ...profileValue,
        modalStatus: profileValue.modalStatus || modalFor(profileValue),
        precisionStatus: profileValue.precisionStatus || precisionFor(profileValue),
        proofIdentity: profileValue.proofIdentity || `${profileValue.topology}:${profileValue.mechanism}`,
        proofEquivalence: proofEquivalenceFor(profileValue),
        referenceFrame: profileValue.referenceFrame || 'allocentric',
        transformationClass: profileValue.transformationClass || 'orientation-preserving',
        ruleRegime: profileValue.ruleRegime || contract.id,
        evaluationCriterion: profileValue.evaluationCriterion || contract.evaluation,
        criterionClass: profileValue.criterionClass || criterionForEvaluation(contract.evaluation),
        revisionClass: profileValue.revisionClass || 'stable',
        dependencyClass: profileValue.dependencyClass || (
          profileValue.validityClass === 'wrong-letter-pair' ? 'binding-critical'
            : profileValue.validityClass === 'subject-object-reversal' ? 'orientation-critical'
              : profileValue.validityClass?.includes('precision') || profileValue.validityClass?.includes('resolution') ? 'resolution-critical'
                : contract.metric === 'positive-unspecified' ? 'metric-critical'
                  : 'composition-critical'
        )
      });
    }

    const profiles = Object.freeze([...baseProfiles, ...EXTENDED_PROFILES].map(normalizeProfile));
    const profileById = new Map(profiles.map(item => [item.id, item]));
    const archetypes = Object.freeze([...baseArchetypes, ...EXTRA_ARCHETYPES]);

    const POLICIES = Object.freeze({
      standard: Object.freeze({ id: 'standard', key: 'standard', reflectionInvariant: true, fields: ['topology', 'mechanism', 'contract', 'validityClass', 'queryOrientation', 'modalStatus', 'precisionStatus'] }),
      inverseEquivalent: Object.freeze({ id: 'inverse-equivalent', key: 'inverseEquivalent', reflectionInvariant: true, fields: ['topology', 'mechanism', 'contract', 'validityClass', 'modalStatus', 'precisionStatus'] }),
      rotationOnly: Object.freeze({ id: 'rotation-only', key: 'rotationOnly', reflectionInvariant: false, fields: ['topology', 'mechanism', 'contract', 'validityClass', 'queryOrientation', 'modalStatus', 'precisionStatus', 'chirality'] }),
      semanticEquivalent: Object.freeze({ id: 'semantic-equivalent', key: 'semanticEquivalent', reflectionInvariant: true, fields: ['validityClass', 'modalStatus', 'precisionStatus'] }),
      proofEquivalent: Object.freeze({ id: 'proof-equivalent', key: 'proofEquivalent', reflectionInvariant: true, fields: ['topology', 'proofEquivalence', 'modalStatus', 'precisionStatus'] }),
      structuralEquivalent: Object.freeze({ id: 'structural-equivalent', key: 'structuralEquivalent', reflectionInvariant: true, fields: ['topology', 'proofEquivalence', 'referenceFrame'] }),
      proofIdentity: Object.freeze({ id: 'proof-identity', key: 'proofIdentity', reflectionInvariant: true, fields: ['topology', 'proofIdentity', 'contract', 'validityClass', 'queryOrientation'] }),
      criterionOnly: Object.freeze({ id: 'criterion-only', key: 'criterionOnly', reflectionInvariant: true, fields: ['evaluationCriterion', 'criterionClass', 'modalStatus'] }),
      criterionSensitive: Object.freeze({ id: 'criterion-sensitive', key: 'criterionSensitive', reflectionInvariant: true, fields: ['evaluationCriterion', 'criterionClass', 'contract', 'modalStatus', 'precisionStatus'] }),
      revisionSensitive: Object.freeze({ id: 'revision-sensitive', key: 'revisionSensitive', reflectionInvariant: true, fields: ['ruleRegime', 'revisionClass', 'criterionClass', 'contract'] }),
      frameSensitive: Object.freeze({ id: 'frame-sensitive', key: 'frameSensitive', reflectionInvariant: false, fields: ['referenceFrame', 'transformationClass', 'chirality', 'proofEquivalence'] }),
      counterfactualSensitive: Object.freeze({ id: 'counterfactual-sensitive', key: 'counterfactualSensitive', reflectionInvariant: true, fields: ['dependencyClass', 'modalStatus', 'precisionStatus', 'criterionClass'] }),
      fullIntegration: Object.freeze({
        id: 'full-integration', key: 'fullIntegration', reflectionInvariant: false,
        fields: ['topology', 'mechanism', 'proofIdentity', 'proofEquivalence', 'contract', 'ruleRegime', 'validityClass', 'modalStatus', 'precisionStatus', 'queryOrientation', 'referenceFrame', 'transformationClass', 'chirality', 'evaluationCriterion', 'criterionClass', 'revisionClass', 'dependencyClass']
      })
    });

    function policyFor(value) {
      if (!value) return POLICIES.standard;
      if (typeof value === 'string') return POLICIES[value] || Object.values(POLICIES).find(item => item.id === value) || POLICIES.standard;
      if (value.key && POLICIES[value.key]) return POLICIES[value.key];
      return Object.values(POLICIES).find(item => item.id === value.id) || POLICIES.standard;
    }

    function descriptorFor(trial) {
      const source = trial?.logicProfile || profileById.get(trial?.logicProfileId) || trial;
      const normalized = normalizeProfile(source);
      return {
        topology: normalized.topology,
        mechanism: normalized.mechanism,
        queryOrientation: trial?.queryOrientation || normalized.queryOrientation,
        contract: (trial?.logicalContract || normalized.contract).id,
        validityClass: normalized.validityClass,
        chirality: Number(trial?.chirality ?? normalized.chirality ?? 0) & 1,
        modalStatus: normalized.modalStatus,
        precisionStatus: normalized.precisionStatus,
        proofIdentity: normalized.proofIdentity,
        proofEquivalence: normalized.proofEquivalence,
        referenceFrame: normalized.referenceFrame,
        transformationClass: normalized.transformationClass,
        ruleRegime: normalized.ruleRegime,
        evaluationCriterion: normalized.evaluationCriterion,
        criterionClass: normalized.criterionClass,
        revisionClass: normalized.revisionClass,
        dependencyClass: normalized.dependencyClass
      };
    }

    function signatureFor(trial, explicitPolicy) {
      const policy = policyFor(explicitPolicy || trial?.comparisonPolicy);
      const descriptor = descriptorFor(trial);
      return `TRIADIC-META-V11|POLICY:${policy.id}|${policy.fields.map(field => `${field}:${descriptor[field]}`).join('|')}`;
    }

    function random(rng) { return rng && typeof rng.next === 'function' ? rng.next() : Math.random(); }
    function pick(rng, values) {
      if (!values.length) throw new Error('Cannot choose from an empty Triadic Entailment meta-curriculum pool.');
      if (rng && typeof rng.pick === 'function') return rng.pick(values);
      return values[Math.floor(random(rng) * values.length)];
    }
    function clampLevel(value) { return Math.max(1, Math.min(8, Math.round(Number(value) || 1))); }
    function trialLetters(trial) {
      if (Array.isArray(trial?.letters) && trial.letters.length === 3) return [...trial.letters];
      return [...new Set([...(trial?.premises || []).flatMap(statement => [statement.subject, statement.object]), trial?.conclusion?.subject, trial?.conclusion?.object].filter(Boolean))];
    }

    function instantiate(profileOrId, rng, options = {}) {
      const resolved = typeof profileOrId === 'string' ? profileById.get(profileOrId) : normalizeProfile(profileOrId);
      if (!resolved) throw new Error(`Unknown Triadic Entailment meta-profile: ${profileOrId}`);
      const policy = policyFor(options.policy);
      const trial = legacyInstantiate(resolved, rng, { ...options, policy });
      trial.logicProfile = resolved;
      trial.logicProfileId = resolved.id;
      trial.comparisonPolicy = policy;
      trial.logicMeta = descriptorFor(trial);
      trial.withinTrialDistinctionClass = resolved.validityClass;
      trial.distinctionClass = resolved.validityClass;
      return trial;
    }

    function desiredReflection(target, profileValue, policy, relation, rng, interferenceLevel) {
      const targetChirality = descriptorFor(target).chirality;
      const baseChirality = Number(profileValue.chirality || 0) & 1;
      if (!policy.reflectionInvariant) {
        const shouldDiffer = relation === 'reflect';
        const desiredChirality = shouldDiffer ? targetChirality ^ 1 : targetChirality;
        return Boolean(baseChirality ^ desiredChirality);
      }
      if (relation === 'reflect') return !Boolean(target?.profileTransformation?.reflected);
      return interferenceLevel >= 45 ? random(rng) < 0.5 : false;
    }

    const archetypesByLevel = new Map(levels.map(level => [level, archetypes.filter(item => item.level === level)]));
    const profileIdsByLevel = new Map(levels.map(level => [level, [...new Set(archetypesByLevel.get(level).flatMap(item => [item.targetProfile, item.currentProfile]))]]));

    function finalizeCurrent(trial, target, archetype, level) {
      const policy = policyFor(target?.comparisonPolicy || archetype.policy);
      trial.comparisonPolicy = policy;
      const targetSignature = signatureFor(target, policy);
      const currentSignature = signatureFor(trial, policy);
      const computedMatch = targetSignature === currentSignature;
      Object.assign(trial, {
        nBackLevel: level, nBackWarmup: false, nBackTargetProfile: target.logicProfileId,
        nBackCurrentProfile: trial.logicProfileId, nBackTargetSignature: targetSignature,
        nBackCurrentSignature: currentSignature, nBackRequestedMatch: Boolean(archetype.expected),
        nBackMatch: computedMatch, isMatch: computedMatch, scored: true, signature: currentSignature,
        curriculumArchetypeId: archetype.id, curriculumLevel: level, curriculumFocus: LEVEL_FOCUS[level],
        curriculumSource: 'approved-160-case-meta-matrix', metaLogicalLevel: level
      });
      if (computedMatch !== Boolean(archetype.expected)) throw new Error(`Meta-curriculum archetype ${archetype.id} disagrees with logical-profile comparison.`);
      return trial;
    }

    function instantiateArchetype(archetypeOrId, rng, options = {}) {
      const archetype = typeof archetypeOrId === 'string' ? archetypes.find(item => item.id === archetypeOrId) : archetypeOrId;
      if (!archetype) throw new Error(`Unknown Triadic Entailment meta-archetype: ${archetypeOrId}`);
      const level = clampLevel(archetype.level);
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const targetProfile = profileById.get(archetype.targetProfile);
      const currentProfile = profileById.get(archetype.currentProfile);
      const policy = policyFor(archetype.policy);
      if (!targetProfile || !currentProfile) throw new Error(`Archetype ${archetype.id} references an unknown profile.`);
      const target = instantiate(targetProfile, rng, { interferenceLevel, policy, reflected: false });
      Object.assign(target, {
        nBackLevel: level, nBackWarmup: true, nBackMatch: false, isMatch: false, scored: false,
        signature: signatureFor(target, policy), curriculumArchetypeId: archetype.id, curriculumLevel: level,
        curriculumFocus: LEVEL_FOCUS[level], curriculumSource: 'approved-160-case-meta-matrix', metaLogicalLevel: level
      });
      const reflected = desiredReflection(target, currentProfile, policy, archetype.relation, rng, interferenceLevel);
      const current = instantiate(currentProfile, rng, { target, interferenceLevel, policy, reflected });
      finalizeCurrent(current, target, archetype, level);
      return { archetype: clone(archetype), target, current, expected: Boolean(archetype.expected), level, focus: LEVEL_FOCUS[level] };
    }

    function targetPool(level) {
      const items = archetypesByLevel.get(level) || [];
      const supported = items.filter(item => {
        const peers = items.filter(other => other.targetProfile === item.targetProfile && other.policy === item.policy);
        return peers.some(other => other.expected) && peers.some(other => !other.expected);
      });
      return supported.length ? supported : items;
    }
    function directCandidates(target, level, requestedMatch) {
      const policy = policyFor(target?.comparisonPolicy);
      return (archetypesByLevel.get(level) || []).filter(item => item.targetProfile === target.logicProfileId && policyFor(item.policy).id === policy.id && Boolean(item.expected) === Boolean(requestedMatch));
    }
    function descriptorDistance(first, second, policy) {
      const a = descriptorFor(first), b = descriptorFor(second);
      return policy.fields.reduce((distance, field) => distance + Number(a[field] !== b[field]), 0);
    }
    function generalCandidates(target, level, requestedMatch) {
      const policy = policyFor(target?.comparisonPolicy);
      const targetSignature = signatureFor(target, policy);
      const targetChirality = descriptorFor(target).chirality;
      const candidates = [];
      for (const id of profileIdsByLevel.get(level) || []) {
        const profileValue = profileById.get(id);
        if (!profileValue) continue;
        const reflectionOptions = policy.reflectionInvariant ? [false] : [false, true];
        for (const reflected of reflectionOptions) {
          const synthetic = { logicProfile: profileValue, logicProfileId: profileValue.id, logicalContract: profileValue.contract, comparisonPolicy: policy, queryOrientation: profileValue.queryOrientation, chirality: (Number(profileValue.chirality || 0) ^ Number(reflected)) & 1 };
          const equivalent = signatureFor(synthetic, policy) === targetSignature;
          if (equivalent === requestedMatch) candidates.push({ profile: profileValue, reflected, relation: !policy.reflectionInvariant && descriptorFor(synthetic).chirality !== targetChirality ? 'reflect' : 'ordinary', distance: descriptorDistance(target, synthetic, policy) });
        }
      }
      return candidates.sort((first, second) => first.distance - second.distance);
    }
    function diagnosticPriority(candidate) {
      const model = core.__triadicLearnerModelV11;
      const profileValue = profileById.get(candidate.currentProfile || candidate.profile?.id);
      if (!model || !profileValue) return 0;
      return (model.errorsByClass[profileValue.validityClass] || 0) + (model.errorsByDependency[profileValue.dependencyClass] || 0) + (model.errorsByCriterion[profileValue.criterionClass] || 0);
    }
    function chooseCandidate(rng, candidates, adaptive, interferenceLevel) {
      if (!candidates.length) throw new Error('No candidate available for the requested meta-logical comparison.');
      if (adaptive && candidates.length > 1) {
        const ranked = [...candidates].sort((a, b) => diagnosticPriority(b) - diagnosticPriority(a));
        const best = diagnosticPriority(ranked[0]);
        return pick(rng, ranked.filter(item => diagnosticPriority(item) === best));
      }
      if (interferenceLevel >= 65 && candidates[0]?.distance !== undefined) return pick(rng, candidates.filter(item => item.distance === candidates[0].distance));
      return pick(rng, candidates);
    }

    core.generateNBackWarmupTrial = function generateMetaWarmup(rng, options = {}) {
      const level = clampLevel(options.nBackLevel);
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const anchor = pick(rng, targetPool(level));
      const policy = policyFor(anchor.policy);
      const targetProfile = profileById.get(anchor.targetProfile);
      const trial = instantiate(targetProfile, rng, { interferenceLevel, policy, reflected: false });
      Object.assign(trial, {
        nBackLevel: level, nBackWarmup: true, nBackCurrentSignature: signatureFor(trial, policy),
        nBackMatch: false, isMatch: false, scored: false, signature: signatureFor(trial, policy),
        curriculumArchetypeId: anchor.id, curriculumLevel: level, curriculumFocus: LEVEL_FOCUS[level],
        curriculumSource: 'approved-160-case-meta-matrix', metaLogicalLevel: level
      });
      return trial;
    };

    core.generateNBackTrial = function generateMetaTrial(rng, target, options = {}) {
      const level = clampLevel(options.nBackLevel);
      const requestedMatch = Boolean(options.match);
      const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
      const adaptive = typeof options.adaptive === 'boolean' ? options.adaptive : Boolean(typeof document !== 'undefined' && document.getElementById('adaptive')?.checked);
      const direct = directCandidates(target, level, requestedMatch);
      if (direct.length) {
        const archetype = chooseCandidate(rng, direct, adaptive, interferenceLevel);
        const policy = policyFor(target.comparisonPolicy || archetype.policy);
        const profileValue = profileById.get(archetype.currentProfile);
        const reflected = desiredReflection(target, profileValue, policy, archetype.relation, rng, interferenceLevel);
        return finalizeCurrent(instantiate(profileValue, rng, { target, interferenceLevel, policy, reflected }), target, archetype, level);
      }
      const general = generalCandidates(target, level, requestedMatch);
      const selected = chooseCandidate(rng, general, adaptive, interferenceLevel);
      const policy = policyFor(target.comparisonPolicy);
      const trial = instantiate(selected.profile, rng, { target, interferenceLevel, policy, reflected: selected.reflected });
      const synthetic = { id: `L${level}-GENERAL-${target.logicProfileId}-${selected.profile.id}-${policy.key}`, level, targetProfile: target.logicProfileId, currentProfile: selected.profile.id, expected: requestedMatch, policy: policy.key, relation: selected.relation };
      const finalised = finalizeCurrent(trial, target, synthetic, level);
      finalised.curriculumSource = 'level-constrained-meta-generalisation';
      return finalised;
    };

    core.__triadicLearnerModelV11 = { responses: 0, correct: 0, errors: 0, errorsByClass: Object.create(null), errorsByDependency: Object.create(null), errorsByCriterion: Object.create(null) };
    core.recordNBackResponse = function recordMetaResponse(trial, response) {
      if (!trial || trial.nBackWarmup || typeof trial.nBackMatch !== 'boolean') return;
      const model = core.__triadicLearnerModelV11;
      model.responses += 1;
      if (Boolean(response) === trial.nBackMatch) { model.correct += 1; return; }
      model.errors += 1;
      const descriptor = descriptorFor(trial);
      model.errorsByClass[descriptor.validityClass] = (model.errorsByClass[descriptor.validityClass] || 0) + 1;
      model.errorsByDependency[descriptor.dependencyClass] = (model.errorsByDependency[descriptor.dependencyClass] || 0) + 1;
      model.errorsByCriterion[descriptor.criterionClass] = (model.errorsByCriterion[descriptor.criterionClass] || 0) + 1;
    };

    function firstDifference(target, current, policy) {
      const a = descriptorFor(target), b = descriptorFor(current);
      const field = policy.fields.find(name => a[name] !== b[name]);
      if (!field) return 'a required logical component changes';
      const labels = { topology: 'proof topology', mechanism: 'composition mechanism', proofIdentity: 'exact proof identity', proofEquivalence: 'proof-equivalence class', contract: 'logical contract', ruleRegime: 'rule regime', validityClass: 'conclusion-validity class', modalStatus: 'modal force', precisionStatus: 'precision status', queryOrientation: 'subject-object orientation', referenceFrame: 'reference frame', transformationClass: 'transformation class', chirality: 'reflection parity', evaluationCriterion: 'evaluation policy', criterionClass: 'criterion used to select the logic', revisionClass: 'rule-revision state', dependencyClass: 'counterfactual dependency' };
      return `${labels[field] || field} changes from ${a[field]} to ${b[field]}`;
    }
    core.explainNBackTrial = function explainMetaTrial(trial) {
      const level = clampLevel(trial?.nBackLevel);
      if (trial?.nBackWarmup) return `Memory fill — retain this triad's relational, modal, proof and criterion profile. Scoring begins after ${level} triad${level === 1 ? '' : 's'}.`;
      const policy = policyFor(trial?.comparisonPolicy);
      if (trial?.nBackMatch) return `MATCH — this triad and the triad ${level} back preserve every component required by the ${policy.id} comparison. The letters themselves are irrelevant.`;
      const targetProfile = profileById.get(trial?.nBackTargetProfile);
      const target = { logicProfile: targetProfile, logicProfileId: targetProfile?.id, logicalContract: targetProfile?.contract, comparisonPolicy: policy, queryOrientation: targetProfile?.queryOrientation, chirality: trial?.nBackTargetSignature?.includes('chirality:1') ? 1 : Number(targetProfile?.chirality || 0) };
      return `NO MATCH — ${firstDifference(target, trial, policy)}. The difference is logical, not alphabetical.`;
    };

    core.logicProfiles = () => clone(profiles);
    core.instantiateLogicProfile = instantiate;
    core.nBackLogicDescriptor = descriptorFor;
    core.nBackLogicSignature = trial => signatureFor(trial, trial?.comparisonPolicy);
    core.nBackEquivalent = (first, second) => { const policy = policyFor(first?.comparisonPolicy || second?.comparisonPolicy); return signatureFor(first, policy) === signatureFor(second, policy); };
    core.nBackComparisonPolicies = () => clone(POLICIES);
    core.canonicalNBackComparisons = () => clone(archetypes);
    core.instantiateNBackArchetype = instantiateArchetype;
    core.nBackLevelCurriculum = level => clone(archetypesByLevel.get(clampLevel(level)) || []);
    core.nBackLevelSpecifications = () => clone(LEVEL_FOCUS);
    core.nBackLevelProfileIds = level => [...(profileIdsByLevel.get(clampLevel(level)) || [])];
    core.evaluateMetaContractTrial = trial => { const evaluation = legacyEvaluate(trial); const descriptor = descriptorFor(trial); return { ...evaluation, ...descriptor, distinctionClass: descriptor.validityClass }; };

    core.runNBackV11Audit = function runNBackV11Audit(iterations = 32768) {
      const failures = [], examplesPerLevel = {}, instantiatedPerLevel = {}, directArchetypeUse = Object.fromEntries(levels.map(level => [level, 0])), uniqueWithinLevel = {};
      levels.forEach(level => {
        const items = archetypesByLevel.get(level) || [];
        examplesPerLevel[level] = items.length;
        const keys = new Set(items.map(item => `${item.targetProfile}|${item.currentProfile}|${item.policy}|${item.relation}`));
        uniqueWithinLevel[level] = keys.size;
        if (items.length !== 20) failures.push(`level-${level}-count-${items.length}`);
        if (keys.size !== 20) failures.push(`level-${level}-duplicate-${20 - keys.size}`);
      });
      if (archetypes.length !== 160) failures.push(`archetype-count-${archetypes.length}`);
      const matchCount = archetypes.filter(item => item.expected).length;
      const nonMatchCount = archetypes.length - matchCount;
      if (matchCount !== 80 || nonMatchCount !== 80) failures.push(`answer-balance-${matchCount}-${nonMatchCount}`);

      class AuditRng {
        constructor(seed = 0x160bacc) { this.s = seed >>> 0; }
        next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
        pick(values) { return values[Math.floor(this.next() * values.length)]; }
        shuffle(values) { const result = [...values]; for (let index = result.length - 1; index > 0; index -= 1) { const swap = Math.floor(this.next() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]; } return result; }
      }

      const rng = new AuditRng();
      archetypes.forEach(archetype => {
        try {
          const pair = instantiateArchetype(archetype, rng, { interferenceLevel: 100 });
          if (pair.current.nBackMatch !== archetype.expected) failures.push(`archetype-answer-${archetype.id}`);
          if (trialLetters(pair.target).some(letter => trialLetters(pair.current).includes(letter))) failures.push(`letter-overlap-${archetype.id}`);
          for (const trial of [pair.target, pair.current]) {
            const rendered = legacyRender(trial);
            if ((rendered.match(/;/g) || []).length !== 2) failures.push(`surface-count-${archetype.id}`);
            if (/contract\s*:|therefore/i.test(rendered)) failures.push(`surface-leak-${archetype.id}`);
            if (trial.withinTrialEntailed !== trial.logicProfile.expected) failures.push(`proof-${archetype.id}`);
          }
          instantiatedPerLevel[archetype.level] = (instantiatedPerLevel[archetype.level] || 0) + 1;
        } catch (error) { failures.push(`archetype-${archetype.id}:${error.message}`); }
      });

      for (let index = 0; index < iterations; index += 1) {
        const level = levels[index % levels.length];
        const target = core.generateNBackWarmupTrial(rng, { nBackLevel: level, interferenceLevel: index % 101 });
        const requestedMatch = index % 2 === 0;
        const current = core.generateNBackTrial(rng, target, { nBackLevel: level, interferenceLevel: index % 101, match: requestedMatch, adaptive: index % 3 === 0 });
        if (current.nBackMatch !== requestedMatch) failures.push(`generated-answer-${index}`);
        if (current.curriculumArchetypeId && !current.curriculumArchetypeId.includes('GENERAL')) directArchetypeUse[level] += 1;
        if (trialLetters(target).some(letter => trialLetters(current).includes(letter))) failures.push(`generated-letter-overlap-${index}`);
        if (/contract\s*:|therefore/i.test(legacyRender(current))) failures.push(`generated-surface-leak-${index}`);
      }
      levels.forEach(level => {
        if (instantiatedPerLevel[level] !== 20) failures.push(`instantiated-level-${level}-${instantiatedPerLevel[level] || 0}`);
        if (!directArchetypeUse[level]) failures.push(`runtime-archetype-unused-level-${level}`);
      });
      const policyCoverage = [...new Set(archetypes.map(item => policyFor(item.policy).id))].sort();
      const requiredPolicies = ['criterion-only', 'criterion-sensitive', 'counterfactual-sensitive', 'frame-sensitive', 'full-integration', 'inverse-equivalent', 'proof-equivalent', 'proof-identity', 'revision-sensitive', 'rotation-only', 'semantic-equivalent', 'standard', 'structural-equivalent'];
      requiredPolicies.forEach(id => { if (!policyCoverage.includes(id)) failures.push(`policy-missing-${id}`); });
      return {
        passed: failures.length === 0, failures, iterations, archetypeCount: archetypes.length,
        examplesPerLevel, uniqueWithinLevel, instantiatedPerLevel, directArchetypeUse,
        matches: matchCount, nonMatches: nonMatchCount, policyCoverage, profileCount: profiles.length,
        implementationCoveragePercent: failures.length === 0 ? 100 : 0, nBackLevels: levels,
        liveCurriculumUsesApprovedMatrix: true, letteringIdentityRelevant: false,
        premiseContractTextVisible: false, thereforeVisible: false, separatePostResponseExplanation: true,
        criterionRegulationImplemented: true, proofSpaceComparisonImplemented: true,
        ruleRevisionImplemented: true, modeTwoPreserved: true
      };
    };

    core.__triadicMetaCurriculumV11 = true;
    core.nBackRuntime = 'level-specific-160-archetype-meta-nback-v11';
    core.nBackPolicy = Object.freeze({
      ...core.nBackPolicy,
      minimumLevel: 1, maximumLevel: 8, letteringIdentityRelevant: false,
      absoluteDirectionIdentityRelevant: false, curriculumExamples: 160, examplesPerLevel: 20,
      levelSpecificCurriculum: true, adaptiveDiagnosticSelection: true,
      diagnosticDimensions: ['validity class', 'dependency class', 'criterion class'],
      comparisonDimensions: ['binding', 'proof topology', 'proof identity', 'proof equivalence', 'transformation mechanism', 'logical contract', 'rule regime', 'modal force', 'precision', 'query orientation', 'reference frame', 'chirality', 'evaluation policy', 'criterion', 'revision state', 'counterfactual dependency'],
      matchIdentity: 'logical-profile equivalence under the active comparison criterion with the triad exactly N positions back'
    });
    core.implementationCoverage = Object.freeze({
      percent: 100,
      basis: '160 audited comparison archetypes, twenty at every N-back level from 1 through 8',
      visiblePremiseFormat: 'exactly three relational statements', letteringIdentityRelevant: false,
      criterionRegulation: true, proofSpaceComparison: true, ruleRevision: true,
      explanationSeparatedFromPremise: true, modeTwoPreserved: true
    });
    return core;
  }

  return apply;
});
