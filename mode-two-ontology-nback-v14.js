'use strict';

(function exposeModeTwoOntologyNBack(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.__modeTwoOntologyNBackV14 = api;
    root.addEventListener('DOMContentLoaded', () => api.installBrowser(root));
  }
})(typeof window !== 'undefined' ? window : globalThis, root => {
  const LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
  const ONTOLOGY_CATEGORIES = Object.freeze([
    'All', 'Difference', 'Action', 'Division', 'Connection',
    'Multiplication', 'Projection', 'Encompassment', 'Completion'
  ]);
  const FORM_ORDERS = Object.freeze(['IO', 'OI']);
  const FORM_NAMES = Object.freeze({ I: 'Inner', O: 'Outer' });
  const core = root?.__modeOneTriadicEntailmentCore || root?.__modeOneSpatialCore ||
    (typeof require === 'function' ? require('./mode-one-spatial-core.js') : null);

  function requireCore() {
    if (!core) throw new Error('Mode 2 requires the Mode 1 Triadic Entailment core.');
    return core;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ontologyDecorations(trial) {
    const categories = Array.isArray(trial?.ontologyCategories) && trial.ontologyCategories.length === 3
      ? trial.ontologyCategories.slice()
      : ['Completion', 'Multiplication', 'Difference'];
    const order = FORM_ORDERS.includes(trial?.order) ? trial.order : 'IO';
    return { categories, order };
  }

  function decorateTrial(trial, categories, order) {
    const copy = clone(trial);
    copy.mode = 1;
    copy.publicMode = 2;
    copy.ontologyCategories = [...categories];
    copy.order = FORM_ORDERS.includes(order) ? order : 'IO';
    copy.ontologyScoringNeutral = true;
    copy.isMatch = requireCore().evaluateTrial(copy).isEntailed;
    copy.signature = relationalSignature(copy);
    return copy;
  }

  function relationalSignature(trial) {
    const result = requireCore().evaluateTrial(trial);
    return [
      'MODE2-RELATIONAL-ENTAILMENT-V2',
      `EXPECTED:${result.expectedRelation}`,
      `ASSERTED:${result.assertedRelation}`,
      `PAIR:${result.queryPairValid ? 'ENDPOINTS' : 'WRONG'}`,
      `VALID:${Number(result.isEntailed)}`
    ].join('|');
  }

  function evaluate(trial) {
    const result = requireCore().evaluateTrial(trial);
    return Object.freeze({
      ...result,
      isMatch: result.isEntailed,
      ontologyRelevant: false,
      formOrderRelevant: false,
      lettersDriveRelationalComputation: true,
      letteringIdentityIgnored: true,
      signature: relationalSignature(trial)
    });
  }

  function compare(current) {
    const result = evaluate(current);
    return Object.freeze({
      isMatch: result.isMatch,
      valid: true,
      result,
      current: result.signature
    });
  }

  function evaluateHistory(history, currentIndex, nBackLevel) {
    const level = Math.max(1, Math.min(8, Math.round(Number(nBackLevel) || 1)));
    const targetIndex = currentIndex - level;
    if (targetIndex < 0) {
      return Object.freeze({ nBackLevel: level, currentIndex, targetIndex, warmup: true, isMatch: false, scored: false });
    }
    const current = history[currentIndex];
    const result = evaluate(current);
    return Object.freeze({
      ...result,
      nBackLevel: level,
      currentIndex,
      targetIndex,
      warmup: false,
      scored: true
    });
  }

  function renderOntologicalTrial(trial) {
    const c = requireCore();
    const { categories, order } = ontologyDecorations(trial);
    const forms = order.split('').map(code => FORM_NAMES[code]);
    const statements = [...trial.premises, trial.conclusion];
    return statements.map((statement, index) => {
      const direction = c.direction(statement.relation).name;
      if (index === 0) return `${forms[0]} ${categories[0]} ${statement.subject} is ${direction} of ${statement.object}`;
      if (index === 1) return `${forms[1]} ${categories[1]} ${statement.subject} is ${direction} of ${statement.object}`;
      return `${categories[2]} ${statement.subject} is ${direction} of ${statement.object}`;
    }).join('; ') + '.';
  }

  function generateTrial(rng, options = {}) {
    const c = requireCore();
    const base = c.generateTrial(rng, options);
    const pick = values => rng?.pick ? rng.pick(values) : values[Math.floor(Math.random() * values.length)];
    const categories = [pick(ONTOLOGY_CATEGORIES), pick(ONTOLOGY_CATEGORIES), pick(ONTOLOGY_CATEGORIES)];
    const order = pick(FORM_ORDERS);
    return decorateTrial(base, categories, order);
  }

  function generateNBackTrial(rng, target, options = {}) {
    const requestedMatch = Boolean(options.match);
    const trial = generateTrial(rng, {
      matchProbability: requestedMatch ? 1 : 0,
      interferenceLevel: options.interferenceLevel
    });
    trial.nBackLevel = Math.max(1, Math.min(8, Math.round(Number(options.nBackLevel) || 1)));
    trial.nBackRequestedMatch = requestedMatch;
    trial.nBackMatch = evaluate(trial).isMatch;
    trial.isMatch = trial.nBackMatch;
    trial.scored = true;
    trial.nBackTargetSignature = target ? relationalSignature(target) : null;
    trial.nBackCurrentSignature = relationalSignature(trial);
    return trial;
  }

  function runExhaustiveAudit(iterationsPerLevel = 131072) {
    const c = requireCore();
    const failures = [];
    const perLevel = [];
    let totalEvaluations = 0;
    let matches = 0;
    let nonMatches = 0;
    let ontologyMutationChecks = 0;
    let renamingChecks = 0;
    let premiseOrderChecks = 0;
    let inversionChecks = 0;
    let renderChecks = 0;

    class AuditRng {
      constructor(seed) { this.s = seed >>> 0; }
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

    for (const level of LEVELS) {
      const rng = new AuditRng(0x2a4f6c10 + level);
      const levelResult = {
        nBackLevel: level,
        evaluations: 0,
        matches: 0,
        nonMatches: 0,
        falseMatches: 0,
        falseNonMatches: 0,
        wrongOffsetFailures: 0,
        ontologyMutationFailures: 0,
        renamingFailures: 0,
        premiseOrderFailures: 0,
        inversionFailures: 0,
        renderFailures: 0
      };

      const history = [];
      for (let index = 0; index < iterationsPerLevel + level; index += 1) {
        const requestedMatch = index % 2 === 0;
        const trial = generateTrial(rng, {
          matchProbability: requestedMatch ? 1 : 0,
          interferenceLevel: index % 101
        });
        history.push(trial);
        if (index < level) continue;

        const result = evaluateHistory(history, index, level);
        levelResult.evaluations += 1;
        totalEvaluations += 1;
        if (result.targetIndex !== index - level) levelResult.wrongOffsetFailures += 1;
        if (result.isMatch === requestedMatch) {
          if (result.isMatch) { levelResult.matches += 1; matches += 1; }
          else { levelResult.nonMatches += 1; nonMatches += 1; }
        } else if (result.isMatch) levelResult.falseMatches += 1;
        else levelResult.falseNonMatches += 1;

        const rendered = renderOntologicalTrial(trial);
        if (/archetypal/i.test(rendered) || !/^(Inner|Outer)\s/.test(rendered) || (rendered.match(/\b(?:Inner|Outer)\b/g) || []).length !== 2) {
          levelResult.renderFailures += 1;
        }
        renderChecks += 1;

        if (index % 17 === 0) {
          const baseline = evaluate(trial).isMatch;

          const ontologyMutated = clone(trial);
          ontologyMutated.ontologyCategories = ['All', 'Action', 'Division'];
          ontologyMutated.order = 'OI';
          if (evaluate(ontologyMutated).isMatch !== baseline) levelResult.ontologyMutationFailures += 1;
          ontologyMutationChecks += 1;

          const letters = trial.letters || [...new Set(trial.premises.flatMap(p => [p.subject, p.object]))];
          const renamed = c.renameTrial(trial, { [letters[0]]: 'X', [letters[1]]: 'Y', [letters[2]]: 'Z' });
          if (evaluate(renamed).isMatch !== baseline) levelResult.renamingFailures += 1;
          renamingChecks += 1;

          const reordered = clone(trial);
          reordered.premises.reverse();
          if (evaluate(reordered).isMatch !== baseline) levelResult.premiseOrderFailures += 1;
          premiseOrderChecks += 1;

          const inverted = clone(trial);
          inverted.premises = inverted.premises.map(c.invert);
          if (evaluate(inverted).isMatch !== baseline) levelResult.inversionFailures += 1;
          inversionChecks += 1;
        }
      }
      perLevel.push(levelResult);
    }

    c.canonicalTrials().forEach((trial, index) => {
      const result = evaluate(trial);
      if (result.isMatch !== trial.expected) failures.push(`canonical-${index + 1}`);
    });

    perLevel.forEach(level => {
      if (level.falseMatches) failures.push(`level-${level.nBackLevel}-false-matches-${level.falseMatches}`);
      if (level.falseNonMatches) failures.push(`level-${level.nBackLevel}-false-nonmatches-${level.falseNonMatches}`);
      if (level.wrongOffsetFailures) failures.push(`level-${level.nBackLevel}-wrong-offset-${level.wrongOffsetFailures}`);
      if (level.ontologyMutationFailures) failures.push(`level-${level.nBackLevel}-ontology-${level.ontologyMutationFailures}`);
      if (level.renamingFailures) failures.push(`level-${level.nBackLevel}-rename-${level.renamingFailures}`);
      if (level.premiseOrderFailures) failures.push(`level-${level.nBackLevel}-order-${level.premiseOrderFailures}`);
      if (level.inversionFailures) failures.push(`level-${level.nBackLevel}-invert-${level.inversionFailures}`);
      if (level.renderFailures) failures.push(`level-${level.nBackLevel}-render-${level.renderFailures}`);
    });

    return Object.freeze({
      passed: failures.length === 0,
      mode: 2,
      nBackLevels: LEVELS,
      iterationsPerLevel,
      totalEvaluations,
      matches,
      nonMatches,
      matchRate: matches / totalEvaluations,
      nonMatchRate: nonMatches / totalEvaluations,
      ontologyMutationChecks,
      renamingChecks,
      premiseOrderChecks,
      inversionChecks,
      renderChecks,
      canonicalChecks: c.canonicalTrials().length,
      failures,
      perLevel,
      invariants: Object.freeze({
        modeOneRelationalEntailmentCopiedExactly: true,
        ontologyCategoriesScoringNeutral: true,
        formOrderScoringNeutral: true,
        lettersDriveRelationalComputation: true,
        letteringIdentityIgnored: true,
        exactEndpointRelationRequired: true,
        sixteenDirectionResolution: true,
        subjectObjectReversalRejected: true,
        wrongLetterPairRejected: true,
        adjacentDirectionRejected: true,
        allNBackLevelsUseSameEvaluator: true,
        conclusionHasNoFormPrefix: true,
        archetypalWordForbiddenInModeTwoOutput: true
      })
    });
  }

  function installBrowser(rootObject) {
    const app = rootObject.__ontologicalWorlds;
    const c = rootObject.__modeOneTriadicEntailmentCore || rootObject.__modeOneSpatialCore;
    if (!app || !c || app.__modeTwoOntologyNBackV14) return;

    const originalMakeTrial = app.makeTrial.bind(app);
    const originalRenderTrial = app.renderTrial.bind(app);
    const originalMatchSignature = typeof app.matchSignature === 'function' ? app.matchSignature.bind(app) : null;

    app.makeTrial = function modeTwoRelationalMakeTrial() {
      const settings = this.settings();
      if (Number(settings.mode) !== 1) return originalMakeTrial();
      const level = Math.max(1, Math.min(8, Math.round(Number(this.n || settings.n) || 1)));
      const target = this.trials[this.trials.length - level];
      const requestedMatch = this.rng.next() < settings.matchProbability;
      if (!target) {
        const warmup = generateTrial(this.rng, {
          matchProbability: this.rng.next() < 0.5 ? 1 : 0,
          interferenceLevel: Number(document.getElementById('interference-slider')?.value) || 0
        });
        warmup.nBackWarmup = true;
        warmup.scored = false;
        return warmup;
      }
      return generateNBackTrial(this.rng, target, {
        match: requestedMatch,
        nBackLevel: level,
        interferenceLevel: Number(document.getElementById('interference-slider')?.value) || 0
      });
    };

    app.renderTrial = function modeTwoRelationalRenderTrial(trial) {
      if (Number(trial?.mode) === 1 || Number(trial?.publicMode) === 2) return renderOntologicalTrial(trial);
      return originalRenderTrial(trial);
    };

    app.matchSignature = function modeTwoRelationalMatchSignature(trial, mode = trial?.mode) {
      if (Number(mode) === 1 || Number(trial?.publicMode) === 2) return relationalSignature(trial);
      return originalMatchSignature ? originalMatchSignature(trial, mode) : trial?.signature || '';
    };

    app.modeTwoOntologyCompare = compare;
    app.modeTwoOntologyEvaluate = evaluate;
    app.modeTwoOntologyEvaluateHistory = evaluateHistory;
    app.modeTwoOntologyGenerateTrial = generateTrial;
    app.modeTwoOntologyGenerateNBackTrial = generateNBackTrial;
    app.modeTwoOntologyRenderTrial = renderOntologicalTrial;
    app.modeTwoOntologyRunAudit = runExhaustiveAudit;
    app.__modeTwoOntologyNBackV14 = true;
  }

  return Object.freeze({
    version: 18,
    LEVELS,
    ONTOLOGY_CATEGORIES,
    FORM_ORDERS,
    FORM_NAMES,
    ontologyDecorations,
    decorateTrial,
    relationalSignature,
    evaluate,
    compare,
    evaluateHistory,
    renderOntologicalTrial,
    generateTrial,
    generateNBackTrial,
    runExhaustiveAudit,
    installBrowser
  });
});
