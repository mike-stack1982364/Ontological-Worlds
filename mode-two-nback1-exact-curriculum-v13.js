'use strict';

(function exposeModeTwoNBackOneExactCurriculum(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    if (core) api.applyCore(core);
    root.addEventListener('DOMContentLoaded', () => api.installBrowser(root));
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const clone = value => JSON.parse(JSON.stringify(value));

  const CURRICULUM = Object.freeze([
    {
      id: 'm2-n1-01-inverse-nw-se', expected: true,
      premises: [
        { subject: 'A', relation: 'W', object: 'B' },
        { subject: 'B', relation: 'N', object: 'C' }
      ],
      conclusion: { subject: 'C', relation: 'SE', object: 'A' }
    },
    {
      id: 'm2-n1-02-south-west-southwest', expected: true,
      premises: [
        { subject: 'E', relation: 'S', object: 'D' },
        { subject: 'F', relation: 'W', object: 'E' }
      ],
      conclusion: { subject: 'F', relation: 'SW', object: 'D' }
    },
    {
      id: 'm2-n1-03-north-plus-ne-nne', expected: true,
      premises: [
        { subject: 'G', relation: 'N', object: 'H' },
        { subject: 'H', relation: 'NE', object: 'J' }
      ],
      conclusion: { subject: 'G', relation: 'NNE', object: 'J' }
    },
    {
      id: 'm2-n1-04-east-plus-south-se', expected: true,
      premises: [
        { subject: 'K', relation: 'E', object: 'L' },
        { subject: 'L', relation: 'S', object: 'M' }
      ],
      conclusion: { subject: 'K', relation: 'SE', object: 'M' }
    },
    {
      id: 'm2-n1-05-south-plus-east-se', expected: true,
      premises: [
        { subject: 'N', relation: 'S', object: 'P' },
        { subject: 'P', relation: 'E', object: 'Q' }
      ],
      conclusion: { subject: 'N', relation: 'SE', object: 'Q' }
    },
    {
      id: 'm2-n1-06-diagonal-cancellation-east', expected: true,
      premises: [
        { subject: 'R', relation: 'NE', object: 'S' },
        { subject: 'S', relation: 'SE', object: 'T' }
      ],
      conclusion: { subject: 'R', relation: 'E', object: 'T' }
    },
    {
      id: 'm2-n1-07-east-plus-ne-ene', expected: true,
      premises: [
        { subject: 'U', relation: 'E', object: 'V' },
        { subject: 'V', relation: 'NE', object: 'W' }
      ],
      conclusion: { subject: 'U', relation: 'ENE', object: 'W' }
    },
    {
      id: 'm2-n1-08-southwest-plus-north-wnw', expected: true,
      premises: [
        { subject: 'X', relation: 'SW', object: 'Y' },
        { subject: 'Y', relation: 'N', object: 'Z' }
      ],
      conclusion: { subject: 'X', relation: 'WNW', object: 'Z' }
    },
    {
      id: 'm2-n1-09-nw-plus-ne-north', expected: true,
      premises: [
        { subject: 'B', relation: 'NW', object: 'C' },
        { subject: 'C', relation: 'NE', object: 'D' }
      ],
      conclusion: { subject: 'B', relation: 'N', object: 'D' }
    },
    {
      id: 'm2-n1-10-sse-plus-wsw-ssw', expected: true,
      premises: [
        { subject: 'E', relation: 'SSE', object: 'F' },
        { subject: 'F', relation: 'WSW', object: 'G' }
      ],
      conclusion: { subject: 'E', relation: 'SSW', object: 'G' }
    },
    {
      id: 'm2-n1-11-adjacent-ne-for-nne', expected: false,
      premises: [
        { subject: 'H', relation: 'N', object: 'J' },
        { subject: 'J', relation: 'NE', object: 'K' }
      ],
      conclusion: { subject: 'H', relation: 'NE', object: 'K' }
    },
    {
      id: 'm2-n1-12-reversed-query-not-inverted', expected: false,
      premises: [
        { subject: 'L', relation: 'E', object: 'M' },
        { subject: 'M', relation: 'S', object: 'N' }
      ],
      conclusion: { subject: 'N', relation: 'SE', object: 'L' }
    },
    {
      id: 'm2-n1-13-derived-relation-on-wrong-letter', expected: false,
      premises: [
        { subject: 'P', relation: 'W', object: 'Q' },
        { subject: 'Q', relation: 'S', object: 'R' }
      ],
      conclusion: { subject: 'Q', relation: 'SW', object: 'R' }
    },
    {
      id: 'm2-n1-14-nnw-for-exact-nw', expected: false,
      premises: [
        { subject: 'S', relation: 'W', object: 'T' },
        { subject: 'T', relation: 'N', object: 'U' }
      ],
      conclusion: { subject: 'S', relation: 'NNW', object: 'U' }
    },
    {
      id: 'm2-n1-15-shared-anchor-not-east', expected: false,
      premises: [
        { subject: 'V', relation: 'NE', object: 'W' },
        { subject: 'X', relation: 'SE', object: 'W' }
      ],
      conclusion: { subject: 'V', relation: 'E', object: 'X' }
    },
    {
      id: 'm2-n1-16-ne-for-exact-ene', expected: false,
      premises: [
        { subject: 'Y', relation: 'E', object: 'Z' },
        { subject: 'Z', relation: 'NE', object: 'A' }
      ],
      conclusion: { subject: 'Y', relation: 'NE', object: 'A' }
    },
    {
      id: 'm2-n1-17-nw-for-exact-wnw', expected: false,
      premises: [
        { subject: 'C', relation: 'SW', object: 'D' },
        { subject: 'D', relation: 'N', object: 'E' }
      ],
      conclusion: { subject: 'C', relation: 'NW', object: 'E' }
    },
    {
      id: 'm2-n1-18-nne-for-exact-north', expected: false,
      premises: [
        { subject: 'F', relation: 'NW', object: 'G' },
        { subject: 'G', relation: 'NE', object: 'H' }
      ],
      conclusion: { subject: 'F', relation: 'NNE', object: 'H' }
    },
    {
      id: 'm2-n1-19-reversed-ssw-not-inverted', expected: false,
      premises: [
        { subject: 'J', relation: 'SSE', object: 'K' },
        { subject: 'K', relation: 'WSW', object: 'L' }
      ],
      conclusion: { subject: 'L', relation: 'SSW', object: 'J' }
    },
    {
      id: 'm2-n1-20-correct-vector-wrong-endpoints', expected: false,
      premises: [
        { subject: 'M', relation: 'NE', object: 'N' },
        { subject: 'N', relation: 'N', object: 'P' }
      ],
      conclusion: { subject: 'N', relation: 'NNE', object: 'P' }
    }
  ]);

  function evaluateCurriculum(core) {
    return CURRICULUM.map(item => {
      const evaluation = core.evaluateTrial(item);
      return {
        id: item.id,
        expected: item.expected,
        actual: evaluation.isEntailed,
        expectedRelation: evaluation.expectedRelation,
        assertedRelation: evaluation.assertedRelation,
        distinctionClass: evaluation.distinctionClass,
        passed: evaluation.isEntailed === item.expected
      };
    });
  }

  function hydrate(core, item, index) {
    const trial = core.hydrateTrial(clone(item));
    trial.mode = 1;
    trial.publicMode = 2;
    trial.nBackLevel = 1;
    trial.modeTwoNBackOneExact = true;
    trial.curriculumIndex = index;
    trial.curriculumId = item.id;
    trial.isMatch = item.expected;
    trial.scored = true;
    trial.signature = `M2-N1-EXACT|${item.id}|${Number(item.expected)}`;
    return trial;
  }

  function runAudit(core, repetitions = 4096) {
    const failures = [];
    let matches = 0;
    let nonMatches = 0;
    for (let repetition = 0; repetition < repetitions; repetition += 1) {
      for (const item of CURRICULUM) {
        const result = core.evaluateTrial(item);
        if (result.isEntailed) matches += 1;
        else nonMatches += 1;
        if (result.isEntailed !== item.expected && failures.length < 100) {
          failures.push({ repetition, id: item.id, expected: item.expected, actual: result.isEntailed, result });
        }
      }
    }
    return {
      passed: failures.length === 0,
      mode: 2,
      nBackLevel: 1,
      canonicalTrials: CURRICULUM.length,
      repetitions,
      totalEvaluations: CURRICULUM.length * repetitions,
      matches,
      nonMatches,
      expectedMatches: repetitions * 10,
      expectedNonMatches: repetitions * 10,
      failures,
      invariants: {
        exactSixteenWayDirectionRequired: true,
        orderedEndpointBindingRequired: true,
        reversedQueryRequiresOppositeDirection: true,
        correctRelationOnWrongLetterRejected: true,
        sharedAnchorBranchesUseVectorSubtraction: true,
        letteringIdentityRelevant: false
      }
    };
  }

  function applyCore(core) {
    if (!core || core.__modeTwoNBackOneExactV13) return core;
    core.modeTwoNBackOneExactCurriculum = () => clone(CURRICULUM);
    core.evaluateModeTwoNBackOneExactCurriculum = () => evaluateCurriculum(core);
    core.runModeTwoNBackOneExactAudit = repetitions => runAudit(core, repetitions);
    core.modeTwoNBackOneExactPolicy = Object.freeze({
      publicMode: 2,
      nBackLevel: 1,
      canonicalTrials: 20,
      matches: 10,
      nonMatches: 10,
      matchDefinition: 'the third relation is exactly entailed by the first two for the tested ordered letter pair at sixteen-way resolution',
      adjacentDirectionAccepted: false,
      reversedQueryAcceptedWithoutDirectionInversion: false,
      wrongLetterAssignmentAccepted: false
    });
    core.__modeTwoNBackOneExactV13 = true;
    return core;
  }

  function installBrowser(root) {
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    const app = root.__ontologicalWorlds;
    if (!core || !app || app.__modeTwoNBackOneExactV13) return;
    applyCore(core);

    const originalMakeTrial = app.makeTrial.bind(app);
    const originalRenderTrial = app.renderTrial.bind(app);
    const originalDeriveTrial = app.deriveTrial.bind(app);
    let deck = [];

    function refillDeck() {
      deck = app.rng && typeof app.rng.shuffle === 'function'
        ? app.rng.shuffle(CURRICULUM.map((_, index) => index))
        : CURRICULUM.map((_, index) => index);
    }

    app.makeTrial = function makeTrialWithModeTwoNBackOneExact() {
      const settings = this.settings();
      if (Number(settings.mode) === 1 && Number(this.n || settings.n) === 1) {
        if (!deck.length) refillDeck();
        const index = deck.shift();
        return hydrate(core, CURRICULUM[index], index);
      }
      return originalMakeTrial();
    };

    app.renderTrial = function renderModeTwoNBackOneExact(trial) {
      if (trial?.modeTwoNBackOneExact) return core.renderTrial(trial);
      return originalRenderTrial(trial);
    };

    app.deriveTrial = function deriveModeTwoNBackOneExact(trial) {
      if (trial?.modeTwoNBackOneExact) return hydrate(core, trial, trial.curriculumIndex ?? 0);
      return originalDeriveTrial(trial);
    };

    const audit = runAudit(core, 4096);
    if (!audit.passed) console.error('Mode 2 N-back 1 exact relational curriculum audit failed', audit);
    root.__modeTwoNBackOneExactTestAPI = {
      version: 13,
      policy: core.modeTwoNBackOneExactPolicy,
      curriculum: core.modeTwoNBackOneExactCurriculum(),
      evaluations: evaluateCurriculum(core),
      exhaustiveAudit: audit,
      selfTestPassed: audit.passed
    };
    app.__modeTwoNBackOneExactV13 = true;
  }

  return { applyCore, installBrowser, curriculum: () => clone(CURRICULUM), runAudit };
});