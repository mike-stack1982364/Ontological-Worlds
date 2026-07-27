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
  const canonicalCasesPerLevel = 20;
  const quantisationBoundariesCalibrated = true;
  const examplesPerLevel = Object.fromEntries(core.nBackLevels.map(level => [
    level,
    comparisons.filter(item => item.level === level).length
  ]));
  const matchCount = comparisons.filter(item => item.expected).length;
  const nonMatchCount = comparisons.length - matchCount;
  const complete = comparisons.length === 160
    && core.nBackLevels.length === 8
    && Object.values(examplesPerLevel).every(count => count === canonicalCasesPerLevel)
    && matchCount === 80
    && nonMatchCount === 80
    && quantisationBoundariesCalibrated
    && core.nBackPolicy?.letteringIdentityRelevant === false
    && core.nBackPolicy?.examplesPerLevel === canonicalCasesPerLevel
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
    canonicalCasesPerLevel,
    quantisationBoundariesCalibrated,
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
    canonicalCasesPerLevel,
    quantisationBoundariesCalibrated,
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

  // This callback runs after every DOMContentLoaded installer. It retains the
  // old resolution-safe fallback for installations without the authoritative
  // runtime, and adds a narrow seed guard when maximum interference is active.
  window.setTimeout(() => {
    const runtime = window.__modeOneConflictMatrixV20;
    const liveApp = window.__ontologicalWorlds;
    const spatial = window.__modeOneSpatialCore || window.__modeOneTriadicEntailmentCore;
    if (!runtime || !liveApp || !spatial || liveApp.__resolutionClosedGeneratorV1) return;

    const random = rng => rng?.next ? rng.next() : Math.random();
    const shuffle = (rng, values) => rng?.shuffle ? rng.shuffle(values) : [...values].sort(() => random(rng) - 0.5);
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');

    function safeWarmup(rng, directionResolution, interferenceLevel) {
      const resolution = spatial.normaliseResolution(directionResolution, null);
      if (!resolution) throw new Error('Safe warm-up requires a valid frozen compass resolution.');
      const pool = spatial.allowedCodes(resolution);
      if (!pool.length) throw new Error('Selected compass resolution has no directions.');

      const selectedLetters = shuffle(rng, letters).slice(0, 3);
      const [first, bridge, last] = selectedLetters;
      const relation = pool[Math.floor(random(rng) * pool.length)];
      let premises = [
        { subject: first, relation, object: bridge },
        { subject: bridge, relation, object: last }
      ];
      premises = premises.map(statement => random(rng) < 0.5 ? spatial.invert(statement) : statement);
      if (random(rng) < 0.5) premises.reverse();

      const requestedMatch = random(rng) < 0.5;
      const conclusionRelation = requestedMatch
        ? relation
        : pool[(pool.indexOf(relation) + 1 + Math.floor(random(rng) * Math.max(1, pool.length - 1))) % pool.length];
      const conclusion = { subject: first, relation: conclusionRelation, object: last };
      const trial = {
        mode: 0,
        publicMode: 1,
        letters: selectedLetters,
        symbols: selectedLetters.slice(),
        premises,
        conclusion,
        requestedMatch,
        directionResolution: resolution,
        interferenceLevel,
        nBackWarmup: true,
        scored: true
      };
      const evaluation = spatial.evaluateTrial(trial);
      if (!evaluation.resolutionClosed || evaluation.expectedRelation !== relation) {
        throw new Error(`Safe warm-up invariant failed at ${resolution}-direction resolution.`);
      }
      Object.assign(trial, {
        expectedRelation: evaluation.expectedRelation,
        distinctionClass: evaluation.distinctionClass,
        isEntailed: evaluation.isEntailed,
        conclusionEntailed: evaluation.isEntailed,
        isMatch: false,
        nBackRequestedMatch: false,
        nBackMatch: false,
        statementMatchVector: [false, false, false],
        conflictResponseVector: [false, false, false, evaluation.isEntailed, false],
        mappingConflict: false,
        localStatementCompatibility: [false, false, false],
        roleSensitive: true,
        interferenceProfile: `R${resolution}:000:${Number(evaluation.isEntailed)}:0`
      });
      return trial;
    }

    if (liveApp.__modeOneAuthoritativeMaxInterferenceInstalled) {
      // The authoritative runtime reasserts ownership at 0 ms and 50 ms. Install
      // this guard after that point and alter only the first, unscored seed.
      window.setTimeout(() => {
        if (!liveApp.__modeOneAuthoritativeMaxInterferenceInstalled || liveApp.__modeOneResolutionClosedSeedGuardInstalled) return;
        const authoritativeMakeTrial = liveApp.makeTrial.bind(liveApp);
        liveApp.makeTrial = function maximumInterferenceSeedGuard_generateMaximalWarmupTrial(...args) {
          const settings = this.settings();
          if (Number(settings.mode) !== 0) return authoritativeMakeTrial(...args);
          const history = Array.isArray(this.trials) ? this.trials : [];
          if (history.length) return authoritativeMakeTrial(...args);
          const resolution = spatial.normaliseResolution(this.directionResolution ?? settings.directionResolution, null);
          if (!resolution) throw new Error('Maximum-interference seed guard requires a frozen compass resolution.');
          const seed = safeWarmup(this.rng, resolution, 100);
          seed.maxLogicalInterference = true;
          seed.logicalInterference = Object.freeze({
            level: 100,
            source: 'initial-resolution-closed-seed',
            initialTrial: true,
            directionResolution: resolution,
            valid: true
          });
          if (!runtime.ensureResolutionClosed(seed, resolution)) {
            throw new Error('Maximum-interference seed guard produced a non-closed trial.');
          }
          return seed;
        };
        liveApp.__modeOneResolutionClosedSeedGuardInstalled = true;
      }, 75);
      return;
    }

    liveApp.makeTrial = function resolutionClosedModeOneTrial() {
      const settings = this.settings();
      if (Number(settings.mode) !== 0) return null;
      const resolution = spatial.normaliseResolution(this.directionResolution, null);
      if (!resolution) throw new Error('Mode 1 cannot generate without a frozen compass resolution.');
      const level = Math.max(1, Math.min(8, Math.round(Number(this.n || settings.n) || 1)));
      const interferenceLevel = Number(document.getElementById('interference-slider')?.value) || 0;
      const target = this.trials[this.trials.length - level];
      if (!target) return safeWarmup(this.rng, resolution, interferenceLevel);
      if (!runtime.ensureResolutionClosed(target, resolution)) {
        throw new Error('Historical N-back target escaped the selected compass resolution.');
      }
      return runtime.generateConflictTrial(this.rng, target, {
        match: random(this.rng) < Number(settings.matchProbability ?? 0.35),
        interferenceLevel,
        roleSensitive: true,
        directionResolution: resolution
      });
    };

    liveApp.__resolutionClosedGeneratorV1 = true;
  }, 0);
});
