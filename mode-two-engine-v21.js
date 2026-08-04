'use strict';

(function exposeModeTwoOntologyNBack(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.__modeTwoOntologyNBackV14 = api;
    root.__modeTwoOntologyNBackV21 = api;
    if (typeof root.addEventListener === 'function') {
      root.addEventListener('DOMContentLoaded', () => api.installBrowser(root));
    }
  }
})(typeof window !== 'undefined' ? window : globalThis, root => {
  const VERSION = 21;
  const LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
  const RESOLUTIONS = Object.freeze([4, 8, 16]);
  const ONTOLOGY_CATEGORIES = Object.freeze([
    'All', 'Difference', 'Action', 'Division', 'Connection',
    'Multiplication', 'Projection', 'Encompassment', 'Completion'
  ]);
  const FORM_ORDERS = Object.freeze(['IO', 'OI']);
  const FORM_NAMES = Object.freeze({ I: 'Inner', O: 'Outer' });
  const core = root?.__modeOneTriadicEntailmentCore
    || root?.__modeOneSpatialCore
    || (typeof require === 'function' ? require('./mode-one-spatial-core.js') : null);

  const requireCore = () => {
    if (!core) throw new Error('Mode 2 requires the shared spatial core.');
    return core;
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const random = rng => rng?.next ? rng.next() : Math.random();
  const pick = (rng, values) => rng?.pick
    ? rng.pick(values)
    : values[Math.floor(random(rng) * values.length)];
  function shuffled(rng, values) {
    if (rng?.shuffle) return rng.shuffle(values);
    const out = [...values];
    for (let index = out.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random(rng) * (index + 1));
      [out[index], out[swap]] = [out[swap], out[index]];
    }
    return out;
  }
  function permutations(values) {
    if (values.length < 2) return [values.slice()];
    return values.flatMap((value, index) =>
      permutations(values.slice(0, index).concat(values.slice(index + 1)))
        .map(rest => [value, ...rest]));
  }
  function statements(trial) {
    if (!trial || !Array.isArray(trial.premises) || trial.premises.length !== 2 || !trial.conclusion) {
      throw new Error('Mode 2 requires exactly two premises and one conclusion.');
    }
    return [...trial.premises, trial.conclusion];
  }
  function trialLetters(trial) {
    const letters = [...new Set(statements(trial).flatMap(statement => [statement.subject, statement.object]))];
    if (letters.length !== 3) throw new Error('Mode 2 requires exactly three distinct letters.');
    return letters;
  }
  function normaliseResolution(value, fallback = 16) {
    return requireCore().normaliseResolution(value, fallback);
  }
  function resolutionOf(trial, fallback = 16) {
    return normaliseResolution(trial?.directionResolution, fallback);
  }
  function ontologyDecorations(trial) {
    return {
      categories: Array.isArray(trial?.ontologyCategories) && trial.ontologyCategories.length === 3
        ? trial.ontologyCategories.slice()
        : ['Completion', 'Multiplication', 'Difference'],
      order: FORM_ORDERS.includes(trial?.order) ? trial.order : 'IO'
    };
  }
  function normalisedStatement(statement, mapping) {
    const c = requireCore();
    const direct = `${mapping[statement.subject]}>${statement.relation}>${mapping[statement.object]}`;
    const inverse = `${mapping[statement.object]}>${c.opposite(statement.relation)}>${mapping[statement.subject]}`;
    return direct < inverse ? direct : inverse;
  }
  function ensureResolutionClosed(trial, expectedResolution = trial?.directionResolution) {
    const c = requireCore();
    const resolution = normaliseResolution(expectedResolution, null);
    if (!resolution) return false;
    const pool = c.allowedCodes(resolution);
    let evaluation;
    try {
      evaluation = c.evaluateTrial({ ...trial, directionResolution: resolution });
    } catch (_) {
      return false;
    }
    return statements(trial)
      .map(statement => statement.relation)
      .concat(evaluation.expectedRelation)
      .every(code => pool.includes(code));
  }
  function relationalSignature(trial) {
    const c = requireCore();
    const resolution = resolutionOf(trial, 16);
    if (!ensureResolutionClosed(trial, resolution)) {
      throw new Error(`Mode 2 trial escaped ${resolution}-direction resolution.`);
    }
    const letters = trialLetters(trial);
    c.evaluateTrial({ ...trial, directionResolution: resolution });
    return permutations(['A', 'B', 'C']).map(labels => {
      const mapping = Object.fromEntries(letters.map((letter, index) => [letter, labels[index]]));
      const premises = trial.premises.map(statement => normalisedStatement(statement, mapping)).sort();
      return `MODE2-COMPLETE-RELATIONAL-NBACK-V4|RES:${resolution}|P:${premises.join('&')}|C:${normalisedStatement(trial.conclusion, mapping)}`;
    }).sort()[0];
  }
  function analyseAlignment(target, current) {
    const targetResolution = resolutionOf(target, 16);
    const currentResolution = resolutionOf(current, 16);
    if (targetResolution !== currentResolution) {
      return Object.freeze({ matchedCount: 0, statementMatches: Object.freeze([false, false, false]), wholeTrialMatch: false });
    }
    const targetLetters = trialLetters(target);
    const currentLetters = trialLetters(current);
    const targetStatements = statements(target);
    const currentStatements = statements(current);
    const identity = Object.fromEntries(currentLetters.map(letter => [letter, letter]));
    const currentCanonical = currentStatements.map(statement => normalisedStatement(statement, identity));
    const assignments = [[0, 1, 2], [1, 0, 2]];
    const candidates = [];
    for (const assigned of permutations(currentLetters)) {
      const mapping = Object.fromEntries(targetLetters.map((letter, index) => [letter, assigned[index]]));
      const targetCanonical = targetStatements.map(statement => normalisedStatement(statement, mapping));
      for (const assignment of assignments) {
        const vector = currentStatements.map((_, index) =>
          targetCanonical[assignment[index]] === currentCanonical[index]);
        const count = vector.filter(Boolean).length;
        candidates.push({
          count,
          vector,
          key: `${3 - count}|${vector.map(Number).join('')}|${assignment.join('')}|${targetLetters.map(letter => mapping[letter]).join('')}`
        });
      }
    }
    candidates.sort((first, second) => second.count - first.count || first.key.localeCompare(second.key));
    const best = candidates[0];
    return Object.freeze({
      matchedCount: best.count,
      statementMatches: Object.freeze(best.vector.slice()),
      wholeTrialMatch: best.count === 3
    });
  }
  function evaluate(trial) {
    const resolution = resolutionOf(trial, 16);
    const result = requireCore().evaluateTrial({ ...trial, directionResolution: resolution });
    return Object.freeze({
      ...result,
      isMatch: result.isEntailed,
      withinTrialEntailed: result.isEntailed,
      ontologyRelevant: false,
      formOrderRelevant: false,
      directionResolution: resolution,
      resolutionClosed: ensureResolutionClosed(trial, resolution),
      signature: relationalSignature(trial)
    });
  }
  function compare(target, current) {
    if (!current) { current = target; target = null; }
    const currentSignature = relationalSignature(current);
    const targetSignature = target ? relationalSignature(target) : null;
    const alignment = target ? analyseAlignment(target, current) : null;
    return Object.freeze({
      isMatch: Boolean(target && targetSignature === currentSignature),
      valid: Boolean(target),
      target: targetSignature,
      current: currentSignature,
      alignment,
      currentWithinTrial: evaluate(current)
    });
  }
  function evaluateHistory(history, currentIndex, nBackLevel) {
    const level = Math.max(1, Math.min(8, Math.round(Number(nBackLevel) || 1)));
    const targetIndex = currentIndex - level;
    if (targetIndex < 0) {
      return Object.freeze({ nBackLevel: level, currentIndex, targetIndex, warmup: true, isMatch: false, scored: false });
    }
    return Object.freeze({
      ...compare(history[targetIndex], history[currentIndex]),
      nBackLevel: level,
      currentIndex,
      targetIndex,
      warmup: false,
      scored: true
    });
  }
  function decorateTrial(trial, categories = ['Completion', 'Multiplication', 'Difference'], order = 'IO') {
    const copy = clone(trial);
    copy.mode = 1;
    copy.publicMode = 2;
    copy.directionResolution = resolutionOf(copy, 16);
    copy.ontologyCategories = [...categories];
    copy.order = FORM_ORDERS.includes(order) ? order : 'IO';
    copy.ontologyScoringNeutral = true;
    const evaluation = requireCore().evaluateTrial(copy);
    copy.withinTrialEntailed = evaluation.isEntailed;
    copy.expectedRelation = evaluation.expectedRelation;
    copy.signature = relationalSignature(copy);
    return copy;
  }
  function renderOntologicalTrial(trial) {
    const c = requireCore();
    const { categories, order } = ontologyDecorations(trial);
    const forms = order.split('').map(code => FORM_NAMES[code]);
    return statements(trial).map((statement, index) => {
      const direction = c.direction(statement.relation).name;
      if (index === 0) return `${forms[0]} ${categories[0]} ${statement.subject} is ${direction} of ${statement.object}`;
      if (index === 1) return `${forms[1]} ${categories[1]} ${statement.subject} is ${direction} of ${statement.object}`;
      return `${categories[2]} ${statement.subject} is ${direction} of ${statement.object}`;
    }).join('; ') + '.';
  }
  function randomDecorations(rng) {
    return {
      categories: [pick(rng, ONTOLOGY_CATEGORIES), pick(rng, ONTOLOGY_CATEGORIES), pick(rng, ONTOLOGY_CATEGORIES)],
      order: pick(rng, FORM_ORDERS)
    };
  }
  function generateResolutionClosedSeed(rng, options = {}) {
    const c = requireCore();
    const resolution = normaliseResolution(options.directionResolution, 16);
    const ring = c.allowedCodes(resolution);
    const letters = shuffled(rng, c.LETTERS || 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')).slice(0, 3);
    const [first, bridge, last] = letters;
    const relation = pick(rng, ring);
    let premises = [
      { subject: first, relation, object: bridge },
      { subject: bridge, relation, object: last }
    ];
    premises = premises.map(statement => random(rng) < 0.5 ? c.invert(statement) : statement);
    if (random(rng) < 0.5) premises.reverse();

    const matchProbability = Math.max(0, Math.min(1, Number(options.matchProbability ?? 0.5)));
    const requestedEntailment = random(rng) < matchProbability;
    const alternatives = ring.filter(code => code !== relation);
    const conclusion = {
      subject: first,
      relation: requestedEntailment ? relation : pick(rng, alternatives),
      object: last
    };
    const trial = {
      mode: 1,
      publicMode: 2,
      letters,
      symbols: letters.slice(),
      premises,
      conclusion,
      requestedMatch: requestedEntailment,
      directionResolution: resolution,
      interferenceLevel: Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0)),
      seedGenerator: 'mode-two-resolution-closed-chain-v21'
    };
    const evaluation = c.evaluateTrial(trial);
    if (!evaluation.resolutionClosed || evaluation.expectedRelation !== relation
      || evaluation.isEntailed !== requestedEntailment) {
      throw new Error(`Mode 2 seed invariant failed at ${resolution}-direction resolution.`);
    }
    return trial;
  }
  function generateTrial(rng, options = {}) {
    const decorations = randomDecorations(rng);
    return decorateTrial(
      generateResolutionClosedSeed(rng, options),
      decorations.categories,
      decorations.order
    );
  }
  function transformedCopy(rng, target, options = {}) {
    const c = requireCore();
    const resolution = normaliseResolution(options.directionResolution ?? target?.directionResolution, 16);
    if (!ensureResolutionClosed(target, resolution)) {
      throw new Error('Mode 2 N-back target is not closed under the selected compass resolution.');
    }
    const source = trialLetters(target);
    const destination = shuffled(rng, c.LETTERS || 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')).slice(0, 3);
    const mapping = Object.fromEntries(source.map((letter, index) => [letter, destination[index]]));
    const out = clone(c.renameTrial(target, mapping));
    if (random(rng) < 0.5) out.premises.reverse();
    out.premises = out.premises.map(statement => random(rng) < 0.5 ? c.invert(statement) : statement);
    if (random(rng) < 0.5) out.conclusion = c.invert(out.conclusion);
    out.directionResolution = resolution;
    const decorations = randomDecorations(rng);
    return decorateTrial(out, decorations.categories, decorations.order);
  }
  function lureDistances(interferenceLevel, ringLength) {
    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    if (level >= 80) return [1];
    if (level >= 50) return [...new Set([1, Math.min(2, Math.max(1, ringLength - 1))])];
    return [...new Set([
      Math.max(1, Math.floor(ringLength / 2)),
      Math.max(1, Math.floor(ringLength / 2) - 1)
    ])];
  }
  function refreshTrial(trial) {
    const evaluation = requireCore().evaluateTrial(trial);
    trial.withinTrialEntailed = evaluation.isEntailed;
    trial.expectedRelation = evaluation.expectedRelation;
    trial.signature = relationalSignature(trial);
    return trial;
  }
  function makeRelationalLure(rng, target, options = {}) {
    const c = requireCore();
    const resolution = normaliseResolution(options.directionResolution ?? target?.directionResolution, 16);
    const ring = c.allowedCodes(resolution);
    const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
    const distances = lureDistances(interferenceLevel, ring.length);
    for (let attempt = 0; attempt < 2048; attempt += 1) {
      const trial = transformedCopy(rng, target, { directionResolution: resolution });
      const all = statements(trial).map(statement => ({ ...statement }));
      const slot = Math.floor(random(rng) * 3);
      const relationIndex = ring.indexOf(all[slot].relation);
      if (relationIndex < 0) continue;
      const distance = pick(rng, distances);
      const sign = random(rng) < 0.5 ? -1 : 1;
      all[slot].relation = ring[(relationIndex + sign * distance + ring.length) % ring.length];
      trial.premises = all.slice(0, 2);
      trial.conclusion = all[2];
      try {
        refreshTrial(trial);
        if (!ensureResolutionClosed(trial, resolution)) continue;
        const result = compare(target, trial);
        if (result.isMatch || result.alignment?.matchedCount !== 2) continue;
        trial.interferenceSlot = slot + 1;
        trial.partialStatementCompatibility = result.alignment.matchedCount;
        trial.statementMatchVector = result.alignment.statementMatches.slice();
        trial.lureGenerationAttempts = attempt + 1;
        trial.interferenceLevel = interferenceLevel;
        return trial;
      } catch (error) {
        if (!/collapse|same position|connected|endpoint|resolution/i.test(String(error?.message || error))) throw error;
      }
    }
    throw new Error(`Unable to generate a valid two-of-three Mode 2 lure at ${resolution}-direction resolution.`);
  }
  function generateNBackTrial(rng, target, options = {}) {
    if (!target) throw new Error('A historical N-back target is required.');
    const resolution = normaliseResolution(options.directionResolution ?? target.directionResolution, 16);
    if (resolutionOf(target, 16) !== resolution || !ensureResolutionClosed(target, resolution)) {
      throw new Error('Mode 2 target and selected compass resolution disagree.');
    }
    const requestedMatch = Boolean(options.match);
    const trial = requestedMatch
      ? transformedCopy(rng, target, { directionResolution: resolution })
      : makeRelationalLure(rng, target, {
          directionResolution: resolution,
          interferenceLevel: options.interferenceLevel
        });
    const result = compare(target, trial);
    trial.nBackLevel = Math.max(1, Math.min(8, Math.round(Number(options.nBackLevel) || 1)));
    trial.nBackRequestedMatch = requestedMatch;
    trial.nBackMatch = result.isMatch;
    trial.isMatch = result.isMatch;
    trial.scored = true;
    trial.nBackTargetSignature = result.target;
    trial.nBackCurrentSignature = result.current;
    trial.directionResolution = resolution;
    if (result.isMatch !== requestedMatch) {
      throw new Error('Mode 2 generator failed the requested complete-structure relation.');
    }
    if (!ensureResolutionClosed(trial, resolution)) {
      throw new Error('Mode 2 generated trial escaped the selected compass resolution.');
    }
    return trial;
  }
  class AuditRng {
    constructor(seed) { this.state = seed >>> 0; }
    next() {
      let value = this.state += 0x6D2B79F5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }
    pick(values) { return values[Math.floor(this.next() * values.length)]; }
    shuffle(values) {
      const out = [...values];
      for (let index = out.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(this.next() * (index + 1));
        [out[index], out[swap]] = [out[swap], out[index]];
      }
      return out;
    }
  }
  function runExhaustiveAudit(iterationsPerLevel = 1000) {
    const iterations = Math.max(1, Math.round(Number(iterationsPerLevel) || 1000));
    const failures = [];
    const rows = [];
    let totalEvaluations = 0;
    let matches = 0;
    let nonMatches = 0;
    let partialLureChecks = 0;
    for (const resolution of RESOLUTIONS) {
      for (const level of LEVELS) {
        const rng = new AuditRng(0x4d320000 + resolution * 257 + level);
        const history = [];
        const row = {
          resolution,
          nBackLevel: level,
          evaluations: 0,
          matches: 0,
          nonMatches: 0,
          falseMatches: 0,
          falseNonMatches: 0,
          wrongOffsetFailures: 0,
          resolutionFailures: 0,
          partialLureFailures: 0
        };
        for (let index = 0; index < level; index += 1) {
          history.push(generateTrial(rng, { matchProbability: 1, directionResolution: resolution }));
        }
        for (let index = 0; index < iterations; index += 1) {
          const requestedMatch = index % 2 === 0;
          const trial = generateNBackTrial(rng, history[history.length - level], {
            match: requestedMatch,
            nBackLevel: level,
            directionResolution: resolution,
            interferenceLevel: 100
          });
          history.push(trial);
          const currentIndex = history.length - 1;
          const result = evaluateHistory(history, currentIndex, level);
          row.evaluations += 1;
          totalEvaluations += 1;
          if (result.targetIndex !== currentIndex - level) row.wrongOffsetFailures += 1;
          if (!ensureResolutionClosed(trial, resolution)) row.resolutionFailures += 1;
          if (result.isMatch !== requestedMatch) {
            if (requestedMatch) row.falseNonMatches += 1;
            else row.falseMatches += 1;
          } else if (result.isMatch) {
            row.matches += 1;
            matches += 1;
          } else {
            row.nonMatches += 1;
            nonMatches += 1;
          }
          if (!requestedMatch) {
            partialLureChecks += 1;
            if (trial.partialStatementCompatibility !== 2 || result.alignment?.matchedCount !== 2) {
              row.partialLureFailures += 1;
            }
          }
        }
        if (row.falseMatches || row.falseNonMatches || row.wrongOffsetFailures
          || row.resolutionFailures || row.partialLureFailures) {
          failures.push(`resolution-${resolution}-level-${level}`);
        }
        rows.push(row);
      }
    }
    return Object.freeze({
      passed: failures.length === 0,
      mode: 2,
      version: VERSION,
      resolutions: RESOLUTIONS,
      nBackLevels: LEVELS,
      iterationsPerLevel: iterations,
      totalEvaluations,
      matches,
      nonMatches,
      matchRate: matches / totalEvaluations,
      nonMatchRate: nonMatches / totalEvaluations,
      partialLureChecks,
      failures,
      rows,
      invariants: Object.freeze({
        completeThreeStatementCrossTrialComparison: true,
        exactTwoStatementNonMatchLures: true,
        selectableCompassResolution: true,
        resolutionClosedGeneration: true,
        ontologyCategoriesScoringNeutral: true,
        formOrderScoringNeutral: true,
        letteringIdentityIgnored: true,
        premiseOrderIgnored: true,
        equivalentWordingInversionIgnored: true,
        allNBackLevelsUseSameComparator: true,
        collapsedGraphsRejectedAndRegenerated: true
      })
    });
  }
  function installBrowser(rootObject) {
    const app = rootObject.__ontologicalWorlds;
    if (!app || !requireCore() || app.__modeTwoOntologyNBackV21) return;
    const originalRenderTrial = app.renderTrial.bind(app);
    const originalMatchSignature = typeof app.matchSignature === 'function'
      ? app.matchSignature.bind(app)
      : null;
    app.renderTrial = function routedModeTwoRendering(trial) {
      return Number(trial?.mode) === 1 || Number(trial?.publicMode) === 2
        ? renderOntologicalTrial(trial)
        : originalRenderTrial(trial);
    };
    app.matchSignature = function routedModeTwoSignature(trial, mode = trial?.mode) {
      return Number(mode) === 1 || Number(trial?.publicMode) === 2
        ? relationalSignature(trial)
        : (originalMatchSignature ? originalMatchSignature(trial, mode) : trial?.signature || '');
    };
    Object.assign(app, {
      modeTwoOntologyCompare: compare,
      modeTwoOntologyEvaluate: evaluate,
      modeTwoOntologyEvaluateHistory: evaluateHistory,
      modeTwoOntologyGenerateTrial: generateTrial,
      modeTwoOntologyGenerateNBackTrial: generateNBackTrial,
      modeTwoOntologyRenderTrial: renderOntologicalTrial,
      modeTwoOntologyRunAudit: runExhaustiveAudit,
      __modeTwoOntologyNBackV14: true,
      __modeTwoOntologyNBackV21: true
    });
  }

  return Object.freeze({
    version: VERSION,
    LEVELS,
    RESOLUTIONS,
    ONTOLOGY_CATEGORIES,
    FORM_ORDERS,
    FORM_NAMES,
    ontologyDecorations,
    decorateTrial,
    relationalSignature,
    analyseAlignment,
    ensureResolutionClosed,
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
