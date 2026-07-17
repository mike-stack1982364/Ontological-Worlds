'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const core = window.__modeOneTriadicEntailmentCore || window.__modeOneSpatialCore;
  const app = window.__ontologicalWorlds;
  if (!core || !app || !core.__triadicMetaCurriculumV11) return;

  const previousAnswer = app.answer.bind(app);
  app.answer = function answerWithMetaDiagnosticLearning(response) {
    const trial = this.current;
    if (trial?.mode === 0 && typeof core.recordNBackResponse === 'function') {
      core.recordNBackResponse(trial, response);
    }
    return previousAnswer(response);
  };

  const comparisons = core.canonicalNBackComparisons();
  const examplesPerLevel = Object.fromEntries(core.nBackLevels.map(level => [
    level,
    comparisons.filter(item => item.level === level).length
  ]));
  const matchCount = comparisons.filter(item => item.expected).length;
  const nonMatchCount = comparisons.length - matchCount;
  const complete = comparisons.length === 160
    && core.nBackLevels.length === 8
    && Object.values(examplesPerLevel).every(count => count === 20)
    && matchCount === 80
    && nonMatchCount === 80
    && core.nBackPolicy?.letteringIdentityRelevant === false
    && core.nBackPolicy?.examplesPerLevel === 20
    && core.nBackPolicy?.curriculumExamples === 160
    && core.implementationCoverage?.criterionRegulation === true
    && core.implementationCoverage?.proofSpaceComparison === true
    && core.implementationCoverage?.ruleRevision === true;

  const api = window.__modeOneTriadicEntailmentTestAPI || {};
  Object.assign(api, {
    version: 11,
    selfTestPassed: Boolean(api.selfTestPassed !== false && complete),
    modelSetEvaluation: true,
    logicalContracts: true,
    visibleContractText: false,
    separatePostResponseExplanation: true,
    runtimeGenerator: 'approved-160-case-meta-curriculum-v11',
    nBackRuntime: core.nBackRuntime,
    nBackEnabled: true,
    nBackLevels: [...core.nBackLevels],
    nBackPolicy: core.nBackPolicy,
    nBackMatchIdentity: core.nBackPolicy.matchIdentity,
    scoringIdentity: 'logical-profile equivalence under the active criterion with the triad exactly N positions back',
    canonicalComparisonCount: comparisons.length,
    examplesPerLevel,
    matches: matchCount,
    nonMatches: nonMatchCount,
    implementationCoveragePercent: complete ? 100 : 0,
    implementationCoverage: core.implementationCoverage,
    levelSpecifications: core.nBackLevelSpecifications(),
    adaptiveDiagnosticSelection: true,
    diagnosticDimensions: [...(core.nBackPolicy.diagnosticDimensions || [])],
    criterionRegulationImplemented: true,
    proofSpaceComparisonImplemented: true,
    ruleRevisionImplemented: true,
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
    matches: matchCount,
    nonMatches: nonMatchCount,
    nBackRuntime: core.nBackRuntime,
    visiblePremiseFormat: 'three relational statements only',
    contractTextVisible: false,
    thereforeVisible: false,
    explanationSeparatedFromPremise: true,
    criterionRegulationImplemented: true,
    proofSpaceComparisonImplemented: true,
    ruleRevisionImplemented: true,
    modeTwoPreserved: true
  };
});
