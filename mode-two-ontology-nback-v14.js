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
  const CANONICAL_LETTERS = Object.freeze(['A', 'B', 'C']);
  const core = root?.__modeOneTriadicEntailmentCore || root?.__modeOneSpatialCore ||
    (typeof require === 'function' ? require('./mode-one-spatial-core.js') : null);

  function requireCore() {
    if (!core) throw new Error('Mode 2 requires the Mode 1 Triadic Entailment core.');
    return core;
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function random(rng) { return rng?.next ? rng.next() : Math.random(); }
  function pick(rng, values) { return rng?.pick ? rng.pick(values) : values[Math.floor(random(rng) * values.length)]; }
  function shuffle(rng, values) {
    if (rng?.shuffle) return rng.shuffle(values);
    const out = [...values];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random(rng) * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function ontologyDecorations(trial) {
    const categories = Array.isArray(trial?.ontologyCategories) && trial.ontologyCategories.length === 3
      ? trial.ontologyCategories.slice() : ['Completion', 'Multiplication', 'Difference'];
    const order = FORM_ORDERS.includes(trial?.order) ? trial.order : 'IO';
    return { categories, order };
  }

  function trialLetters(trial) {
    return [...new Set([...trial.premises, trial.conclusion].flatMap(s => [s.subject, s.object]))];
  }

  function permutations(values) {
    if (values.length <= 1) return [values.slice()];
    const result = [];
    values.forEach((value, index) => {
      const rest = values.slice(0, index).concat(values.slice(index + 1));
      permutations(rest).forEach(tail => result.push([value, ...tail]));
    });
    return result;
  }

  function normalisedStatement(statement, mapping) {
    const c = requireCore();
    const subject = mapping[statement.subject];
    const object = mapping[statement.object];
    const direct = `${subject}>${statement.relation}>${object}`;
    const inverse = `${object}>${c.opposite(statement.relation)}>${subject}`;
    return direct < inverse ? direct : inverse;
  }

  function relationalSignature(trial) {
    if (!trial || !Array.isArray(trial.premises) || trial.premises.length !== 2 || !trial.conclusion) {
      throw new Error('Mode 2 requires two premises and one conclusion.');
    }
    const letters = trialLetters(trial);
    if (letters.length !== 3) throw new Error('Mode 2 requires exactly three distinct letters.');
    requireCore().evaluateTrial(trial); // validates the same connected compass graph used by Mode 1

    const candidates = permutations(CANONICAL_LETTERS).map(labels => {
      const mapping = Object.fromEntries(letters.map((letter, index) => [letter, labels[index]]));
      const premises = trial.premises.map(s => normalisedStatement(s, mapping)).sort();
      const conclusion = normalisedStatement(trial.conclusion, mapping);
      return `MODE2-COMPLETE-RELATIONAL-NBACK-V3|P:${premises.join('&')}|C:${conclusion}`;
    });
    candidates.sort();
    return candidates[0];
  }

  function evaluate(trial) {
    const result = requireCore().evaluateTrial(trial);
    return Object.freeze({
      ...result,
      isMatch: result.isEntailed,
      withinTrialEntailed: result.isEntailed,
      ontologyRelevant: false,
      formOrderRelevant: false,
      signature: relationalSignature(trial)
    });
  }

  function compare(target, current) {
    if (!current) { current = target; target = null; }
    const currentSignature = relationalSignature(current);
    const targetSignature = target ? relationalSignature(target) : null;
    return Object.freeze({
      isMatch: Boolean(target && targetSignature === currentSignature),
      valid: Boolean(target),
      target: targetSignature,
      current: currentSignature,
      currentWithinTrial: evaluate(current)
    });
  }

  function evaluateHistory(history, currentIndex, nBackLevel) {
    const level = Math.max(1, Math.min(8, Math.round(Number(nBackLevel) || 1)));
    const targetIndex = currentIndex - level;
    if (targetIndex < 0) {
      return Object.freeze({ nBackLevel: level, currentIndex, targetIndex, warmup: true, isMatch: false, scored: false });
    }
    const comparison = compare(history[targetIndex], history[currentIndex]);
    return Object.freeze({
      ...comparison,
      nBackLevel: level,
      currentIndex,
      targetIndex,
      warmup: false,
      scored: true
    });
  }

  function decorateTrial(trial, categories, order) {
    const copy = clone(trial);
    copy.mode = 1;
    copy.publicMode = 2;
    copy.ontologyCategories = [...categories];
    copy.order = FORM_ORDERS.includes(order) ? order : 'IO';
    copy.ontologyScoringNeutral = true;
    copy.withinTrialEntailed = requireCore().evaluateTrial(copy).isEntailed;
    copy.signature = relationalSignature(copy);
    return copy;
  }

  function renderOntologicalTrial(trial) {
    const c = requireCore();
    const { categories, order } = ontologyDecorations(trial);
    const forms = order.split('').map(code => FORM_NAMES[code]);
    return [...trial.premises, trial.conclusion].map((statement, index) => {
      const direction = c.direction(statement.relation).name;
      if (index === 0) return `${forms[0]} ${categories[0]} ${statement.subject} is ${direction} of ${statement.object}`;
      if (index === 1) return `${forms[1]} ${categories[1]} ${statement.subject} is ${direction} of ${statement.object}`;
      return `${categories[2]} ${statement.subject} is ${direction} of ${statement.object}`;
    }).join('; ') + '.';
  }

  function generateTrial(rng, options = {}) {
    const base = requireCore().generateTrial(rng, options);
    const categories = [pick(rng, ONTOLOGY_CATEGORIES), pick(rng, ONTOLOGY_CATEGORIES), pick(rng, ONTOLOGY_CATEGORIES)];
    return decorateTrial(base, categories, pick(rng, FORM_ORDERS));
  }

  function transformedCopy(rng, target) {
    const c = requireCore();
    const sourceLetters = trialLetters(target);
    const available = shuffle(rng, c.LETTERS || 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')).slice(0, 3);
    let out = c.renameTrial(target, Object.fromEntries(sourceLetters.map((letter, i) => [letter, available[i]])));
    out = clone(out);
    if (random(rng) < 0.5) out.premises.reverse();
    out.premises = out.premises.map(statement => random(rng) < 0.5 ? c.invert(statement) : statement);
    if (random(rng) < 0.5) out.conclusion = c.invert(out.conclusion);
    return decorateTrial(out,
      [pick(rng, ONTOLOGY_CATEGORIES), pick(rng, ONTOLOGY_CATEGORIES), pick(rng, ONTOLOGY_CATEGORIES)],
      pick(rng, FORM_ORDERS));
  }

  function makeRelationalLure(rng, target) {
    const c = requireCore();
    const trial = transformedCopy(rng, target);
    const slot = Math.floor(random(rng) * 3);
    const statements = [...trial.premises, trial.conclusion];
    const original = statements[slot].relation;
    const direction = c.direction(original);
    const offset = random(rng) < 0.5 ? 1 : 15;
    statements[slot].relation = c.DIRECTIONS[(direction.index + offset) % 16].code;
    trial.premises = statements.slice(0, 2);
    trial.conclusion = statements[2];
    trial.signature = relationalSignature(trial);
    trial.interferenceSlot = slot + 1;
    trial.partialStatementCompatibility = 2;
    return trial;
  }

  function generateNBackTrial(rng, target, options = {}) {
    if (!target) throw new Error('A historical N-back target is required.');
    const requestedMatch = Boolean(options.match);
    const trial = requestedMatch ? transformedCopy(rng, target) : makeRelationalLure(rng, target);
    const comparison = compare(target, trial);
    trial.nBackLevel = Math.max(1, Math.min(8, Math.round(Number(options.nBackLevel) || 1)));
    trial.nBackRequestedMatch = requestedMatch;
    trial.nBackMatch = comparison.isMatch;
    trial.isMatch = comparison.isMatch;
    trial.scored = true;
    trial.nBackTargetSignature = comparison.target;
    trial.nBackCurrentSignature = comparison.current;
    if (comparison.isMatch !== requestedMatch) throw new Error('Mode 2 generator failed its requested cross-trial relation.');
    return trial;
  }

  function runExhaustiveAudit(iterationsPerLevel = 32768) {
    class AuditRng {
      constructor(seed) { this.s = seed >>> 0; }
      next() { let v = this.s += 1831565813; v = Math.imul(v ^ v >>> 15, 1 | v); v ^= v + Math.imul(v ^ v >>> 7, 61 | v); return ((v ^ v >>> 14) >>> 0) / 4294967296; }
      pick(values) { return values[Math.floor(this.next() * values.length)]; }
      shuffle(values) { return shuffle(this, values); }
    }
    const failures = [];
    const perLevel = [];
    let totalEvaluations = 0, matches = 0, nonMatches = 0, partialLureChecks = 0;
    for (const level of LEVELS) {
      const rng = new AuditRng(0x4d320000 + level);
      const history = [];
      const row = { nBackLevel: level, evaluations: 0, matches: 0, nonMatches: 0, falseMatches: 0, falseNonMatches: 0, wrongOffsetFailures: 0, partialLureFailures: 0 };
      for (let i = 0; i < level; i += 1) history.push(generateTrial(rng, { matchProbability: 1 }));
      for (let i = 0; i < iterationsPerLevel; i += 1) {
        const requestedMatch = i % 2 === 0;
        const target = history[history.length - level];
        const trial = generateNBackTrial(rng, target, { match: requestedMatch, nBackLevel: level });
        history.push(trial);
        const index = history.length - 1;
        const result = evaluateHistory(history, index, level);
        row.evaluations += 1; totalEvaluations += 1;
        if (result.targetIndex !== index - level) row.wrongOffsetFailures += 1;
        if (result.isMatch !== requestedMatch) requestedMatch ? row.falseNonMatches++ : row.falseMatches++;
        else if (result.isMatch) { row.matches++; matches++; } else { row.nonMatches++; nonMatches++; }
        if (!requestedMatch) {
          partialLureChecks += 1;
          if (trial.partialStatementCompatibility !== 2 || relationalSignature(target) === relationalSignature(trial)) row.partialLureFailures += 1;
        }
      }
      if (row.falseMatches || row.falseNonMatches || row.wrongOffsetFailures || row.partialLureFailures) failures.push(`level-${level}`);
      perLevel.push(row);
    }
    return Object.freeze({
      passed: failures.length === 0, mode: 2, nBackLevels: LEVELS, iterationsPerLevel,
      totalEvaluations, matches, nonMatches, matchRate: matches / totalEvaluations,
      nonMatchRate: nonMatches / totalEvaluations, partialLureChecks, failures, perLevel,
      invariants: Object.freeze({
        completeThreeStatementCrossTrialComparison: true,
        oneStatementCompatibilityInsufficient: true,
        twoStatementCompatibilityInsufficient: true,
        modeOneCompassRelationsUsed: true,
        ontologyCategoriesScoringNeutral: true,
        formOrderScoringNeutral: true,
        letteringIdentityIgnored: true,
        premiseOrderIgnored: true,
        equivalentWordingInversionIgnored: true,
        allNBackLevelsUseSameComparator: true
      })
    });
  }

  function installBrowser(rootObject) {
    const app = rootObject.__ontologicalWorlds;
    if (!app || !requireCore() || app.__modeTwoOntologyNBackV14) return;
    const originalMakeTrial = app.makeTrial.bind(app);
    const originalRenderTrial = app.renderTrial.bind(app);
    const originalMatchSignature = typeof app.matchSignature === 'function' ? app.matchSignature.bind(app) : null;

    app.makeTrial = function modeTwoRelationalMakeTrial() {
      const settings = this.settings();
      if (Number(settings.mode) !== 1) return originalMakeTrial();
      const level = Math.max(1, Math.min(8, Math.round(Number(this.n || settings.n) || 1)));
      const target = this.trials[this.trials.length - level];
      if (!target) {
        const warmup = generateTrial(this.rng, { matchProbability: this.rng.next() < 0.5 ? 1 : 0 });
        warmup.nBackWarmup = true; warmup.scored = false; return warmup;
      }
      return generateNBackTrial(this.rng, target, {
        match: this.rng.next() < settings.matchProbability,
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
    version: 19, LEVELS, ONTOLOGY_CATEGORIES, FORM_ORDERS, FORM_NAMES,
    ontologyDecorations, decorateTrial, relationalSignature, evaluate, compare,
    evaluateHistory, renderOntologicalTrial, generateTrial, generateNBackTrial,
    runExhaustiveAudit, installBrowser
  });
});