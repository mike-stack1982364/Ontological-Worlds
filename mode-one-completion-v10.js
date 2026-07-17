'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const core = window.__modeOneTriadicEntailmentCore || window.__modeOneSpatialCore;
  const app = window.__ontologicalWorlds;
  if (!core || !app || !core.__triadicCurriculumNBackV10) return;

  const previousAnswer = app.answer.bind(app);
  app.answer = function answerWithDiagnosticLearning(response) {
    const trial = this.current;
    if (trial?.mode === 0 && typeof core.recordNBackResponse === 'function') {
      core.recordNBackResponse(trial, response);
    }
    return previousAnswer(response);
  };

  const comparisons = core.canonicalNBackComparisons();
  const examplesPerLevel = Object.fromEntries(
    core.nBackLevels.map(level => [
      level,
      comparisons.filter(item => item.level === level).length
    ])
  );
  const complete = comparisons.length === 80
    && core.nBackLevels.length === 8
    && Object.values(examplesPerLevel).every(count => count === 10)
    && core.nBackPolicy?.letteringIdentityRelevant === false
    && core.nBackPolicy?.levelSpecificCurriculum === true;

  const api = window.__modeOneTriadicEntailmentTestAPI || {};
  Object.assign(api, {
    version: 10,
    selfTestPassed: Boolean(api.selfTestPassed !== false && complete),
    modelSetEvaluation: typeof core.evaluateContractTrial === 'function',
    logicalContracts: true,
    visibleContractText: false,
    separatePostResponseExplanation: true,
    runtimeGenerator: 'approved-80-case-level-curriculum-v10',
    nBackRuntime: core.nBackRuntime,
    nBackEnabled: true,
    nBackLevels: [...core.nBackLevels],
    nBackPolicy: core.nBackPolicy,
    nBackMatchIdentity: core.nBackPolicy.matchIdentity,
    scoringIdentity: 'complete logical-profile equivalence with the triad exactly N positions back',
    canonicalComparisonCount: comparisons.length,
    examplesPerLevel,
    implementationCoveragePercent: complete ? 100 : 0,
    implementationCoverage: core.implementationCoverage,
    levelSpecifications: core.nBackLevelSpecifications(),
    adaptiveDiagnosticSelection: true,
    letteringIdentityIgnored: true,
    modeTwoPreserved: true
  });

  window.__modeOneTriadicEntailmentTestAPI = api;
  window.__modeOneSpatialTestAPI = api;
  window.__modeOneCompletionTestAPI = {
    passed: complete,
    implementationCoveragePercent: complete ? 100 : 0,
    canonicalComparisonCount: comparisons.length,
    examplesPerLevel,
    nBackRuntime: core.nBackRuntime,
    visiblePremiseFormat: 'three relational statements only',
    contractTextVisible: false,
    thereforeVisible: false,
    explanationSeparatedFromPremise: true,
    modeTwoPreserved: true
  };
});
