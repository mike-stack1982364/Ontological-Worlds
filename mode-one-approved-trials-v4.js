'use strict';

(function exposeApprovedModeOne(root, factory) {
  const apply = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = apply;
  if (root) {
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    if (core) apply(core);
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const APPROVED_TRIALS = [
    {
      premises: [
        { subject: 'A', relation: 'W', object: 'B' },
        { subject: 'B', relation: 'N', object: 'C' }
      ],
      conclusion: { subject: 'C', relation: 'SE', object: 'A' },
      expected: true,
      explanation: 'A is northwest of C, making C southeast of A.'
    },
    {
      premises: [
        { subject: 'E', relation: 'S', object: 'D' },
        { subject: 'F', relation: 'W', object: 'E' }
      ],
      conclusion: { subject: 'F', relation: 'SW', object: 'D' },
      expected: true,
      explanation: 'F lies one step west and one step south of D.'
    },
    {
      premises: [
        { subject: 'G', relation: 'N', object: 'H' },
        { subject: 'H', relation: 'NE', object: 'J' }
      ],
      conclusion: { subject: 'G', relation: 'NNE', object: 'J' },
      expected: true,
      explanation: 'Combining north with northeast produces north-northeast at sixteen-way resolution.'
    },
    {
      premises: [
        { subject: 'K', relation: 'N', object: 'L' },
        { subject: 'L', relation: 'NE', object: 'M' }
      ],
      conclusion: { subject: 'K', relation: 'NE', object: 'M' },
      expected: false,
      explanation: 'K is north-northeast of M. Northeast is adjacent, but not exact.'
    },
    {
      premises: [
        { subject: 'N', relation: 'E', object: 'P' },
        { subject: 'P', relation: 'S', object: 'Q' }
      ],
      conclusion: { subject: 'Q', relation: 'SE', object: 'N' },
      expected: false,
      explanation: 'N is southeast of Q, so Q is northwest of N.'
    },
    {
      premises: [
        { subject: 'R', relation: 'W', object: 'S' },
        { subject: 'S', relation: 'S', object: 'T' }
      ],
      conclusion: { subject: 'S', relation: 'SW', object: 'T' },
      expected: false,
      explanation: 'R is southwest of T. S is directly south of T, so the derived relation is attached to the wrong letter.'
    },
    {
      premises: [
        { subject: 'U', relation: 'NE', object: 'V' },
        { subject: 'V', relation: 'SE', object: 'W' }
      ],
      conclusion: { subject: 'U', relation: 'E', object: 'W' },
      expected: true,
      explanation: 'The northward and southward components cancel while the eastward components combine.'
    },
    {
      premises: [
        { subject: 'X', relation: 'NE', object: 'Y' },
        { subject: 'Z', relation: 'SE', object: 'Y' }
      ],
      conclusion: { subject: 'X', relation: 'E', object: 'Z' },
      expected: false,
      explanation: 'X is directly north of Z. The shared reference creates two branches, not an eastward chain.'
    },
    {
      premises: [
        { subject: 'B', relation: 'W', object: 'C' },
        { subject: 'A', relation: 'N', object: 'B' }
      ],
      conclusion: { subject: 'C', relation: 'SE', object: 'A' },
      expected: true,
      explanation: 'A is northwest of C, making C southeast of A. Reordered premises and different letter positions do not alter the logic.'
    },
    {
      premises: [
        { subject: 'H', relation: 'NE', object: 'J' },
        { subject: 'K', relation: 'SE', object: 'J' }
      ],
      conclusion: { subject: 'H', relation: 'E', object: 'K' },
      expected: false,
      explanation: 'H is directly north of K. The conclusion preserves surface similarity but breaks the actual relational structure.'
    }
  ];

  function apply(core) {
    if (!core || core.__approvedTriadicEntailmentV4) return core;

    const originalGenerateTrial = core.generateTrial.bind(core);
    const originalRenderTrial = core.renderTrial.bind(core);
    const originalHydrateTrial = core.hydrateTrial.bind(core);

    function enforceSurface(trial) {
      if (!trial) return trial;
      delete trial.contract;
      delete trial.contractId;
      delete trial.contractLabel;
      delete trial.logicalContract;
      delete trial.metricContract;
      return trial;
    }

    core.generateTrial = function generateApprovedTriadicTrial(rng, options) {
      return enforceSurface(originalGenerateTrial(rng, options));
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
        throw new Error('Mode 1 premise display may not expose contracts or explanatory connectives.');
      }
      return rendered;
    };

    core.canonicalTrials = function canonicalApprovedTrials() {
      return clone(APPROVED_TRIALS);
    };

    core.approvedTrials = core.canonicalTrials;
    core.version = 4;
    core.__approvedTriadicEntailmentV4 = true;
    core.surfacePolicy = Object.freeze({
      statementCount: 3,
      premiseCount: 2,
      testedRelationCount: 1,
      visibleContractText: false,
      thereforeInPremise: false,
      letteringIdentityAcrossTrialsRelevant: false,
      approvedTrialSet: 'exact-ten-v5',
      scoringRule: 'logical accuracy of the third relation after composing the first two letter-bound transformations'
    });

    return core;
  }

  apply.APPROVED_TRIALS = APPROVED_TRIALS;
  return apply;
});
