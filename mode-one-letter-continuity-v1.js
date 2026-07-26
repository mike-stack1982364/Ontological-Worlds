'use strict';

(function exposeModeOneLetterContinuity(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.__modeOneLetterContinuityV1 = api;
  if (root?.document) {
    const install = () => api.installBrowser(root);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();
  }
})(typeof window !== 'undefined' ? window : globalThis, root => {
  const core = root?.__modeOneTriadicEntailmentCore || root?.__modeOneSpatialCore || (typeof require === 'function' ? require('./mode-one-spatial-core.js') : null);
  const LETTER_POOL = Object.freeze([...(core?.LETTERS || 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split(''))]);
  const PRESENTATION_KEYS = Object.freeze(['submitted','conflictResponses','conflictDecisionCorrectness','conflictCorrectCount','conflictAllCorrect','conflictDecisionTimes','started','_answered']);

  function requireCore() {
    if (!core?.renameTrial) throw new Error('Mode 1 letter continuity requires the spatial core.');
    return core;
  }
  const random = rng => rng?.next ? rng.next() : Math.random();
  function shuffle(rng, values) {
    if (rng?.shuffle) return rng.shuffle(values);
    const out = [...values];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random(rng) * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function statements(trial) {
    if (!trial || !Array.isArray(trial.premises) || trial.premises.length !== 2 || !trial.conclusion) throw new Error('Letter continuity requires a complete three-statement trial.');
    return [...trial.premises, trial.conclusion];
  }
  function trialLetters(trial) {
    const letters = [...new Set(statements(trial).flatMap(statement => [statement.subject, statement.object]))];
    if (letters.length !== 3) throw new Error('Letter continuity requires exactly three distinct letters.');
    return letters;
  }
  function overlap(first, second) {
    const set = new Set(second);
    return first.filter(value => set.has(value));
  }
  function continuityCarryCount(interferenceLevel = 0) {
    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    return level >= 50 ? 2 : 1;
  }
  function analyseContinuity(previousTrial, currentTrial, targetTrial = null) {
    const previousLetters = trialLetters(previousTrial), currentLetters = trialLetters(currentTrial), targetLetters = targetTrial ? trialLetters(targetTrial) : [];
    const retained = overlap(currentLetters, previousLetters), introduced = currentLetters.filter(letter => !previousLetters.includes(letter)), targetOverlap = targetTrial ? overlap(currentLetters, targetLetters) : [];
    return Object.freeze({
      previousLetters: Object.freeze(previousLetters.slice()),
      currentLetters: Object.freeze(currentLetters.slice()),
      targetLetters: Object.freeze(targetLetters.slice()),
      retainedLetters: Object.freeze(retained.slice()),
      introducedLetters: Object.freeze(introduced.slice()),
      targetOverlapLetters: Object.freeze(targetOverlap.slice()),
      previousOverlapCount: retained.length,
      introducedCount: introduced.length,
      targetOverlapCount: targetOverlap.length,
      partialUpdate: retained.length >= 1 && retained.length <= 2 && introduced.length >= 1,
      targetAnchored: !targetTrial || targetOverlap.length >= 1,
      valid: retained.length >= 1 && retained.length <= 2 && introduced.length >= 1 && (!targetTrial || targetOverlap.length >= 1)
    });
  }
  function selectDestinationLetters(rng, previousTrial, targetTrial = null, interferenceLevel = 0) {
    const previousLetters = trialLetters(previousTrial), targetLetters = targetTrial ? trialLetters(targetTrial) : [], carryCount = continuityCarryCount(interferenceLevel);
    const sharedWithTarget = shuffle(rng, previousLetters.filter(letter => targetLetters.includes(letter)));
    const previousOnly = shuffle(rng, previousLetters.filter(letter => !targetLetters.includes(letter)));
    const selected = [...sharedWithTarget, ...previousOnly].slice(0, carryCount);

    if (targetTrial && !selected.some(letter => targetLetters.includes(letter))) {
      const targetFresh = shuffle(rng, targetLetters.filter(letter => !previousLetters.includes(letter)));
      if (targetFresh.length) selected.push(targetFresh[0]);
    }

    const freshPool = shuffle(rng, LETTER_POOL.filter(letter => !previousLetters.includes(letter) && !selected.includes(letter)));
    while (selected.length < 3 && freshPool.length) selected.push(freshPool.shift());
    if (selected.length !== 3 || new Set(selected).size !== 3) throw new Error('Unable to construct a three-letter partial update.');

    const previousOverlap = overlap(selected, previousLetters).length;
    if (previousOverlap !== carryCount) throw new Error(`Partial-update construction retained ${previousOverlap} letters; expected ${carryCount}.`);
    if (targetTrial && overlap(selected, targetLetters).length < 1) throw new Error('Partial-update construction lost all N-back target letters.');
    return shuffle(rng, selected);
  }
  function preserveRuntimeState(source, target) {
    for (const key of Object.keys(source)) {
      if (['premises','conclusion','letters','symbols','signature','interferenceMeta','explanation','expectedRelation','distinctionClass','isEntailed'].includes(key)) continue;
      target[key] = source[key];
    }
    return target;
  }
  function reletterTrial(rng, trial, destinationLetters) {
    const c = requireCore(), sourceLetters = shuffle(rng, trialLetters(trial)), destinations = shuffle(rng, destinationLetters);
    if (new Set(destinations).size !== 3) throw new Error('Destination letters must be unique.');
    const replacements = Object.fromEntries(sourceLetters.map((letter, index) => [letter, destinations[index]]));
    let renamed = c.renameTrial(trial, replacements);
    if (typeof c.hydrateTrial === 'function') renamed = preserveRuntimeState(trial, c.hydrateTrial(renamed));
    else {
      renamed.letters = trialLetters(renamed);
      renamed.symbols = renamed.letters.slice();
      if (typeof c.explainTrial === 'function') renamed.explanation = c.explainTrial(renamed);
      delete renamed.signature;
    }
    return renamed;
  }
  function applyContinuity(rng, trial, previousTrial, options = {}) {
    if (!trial) return trial;
    if (!previousTrial) {
      trial.surfaceContinuity = Object.freeze({ initialTrial: true, previousOverlapCount: 0, introducedCount: 3, targetOverlapCount: 0, partialUpdate: false, targetAnchored: true, valid: true });
      return trial;
    }
    const targetTrial = options.targetTrial || null, interferenceLevel = Number(options.interferenceLevel ?? trial.interferenceLevel) || 0;
    const destinationLetters = selectDestinationLetters(rng, previousTrial, targetTrial, interferenceLevel);
    const adjusted = reletterTrial(rng, trial, destinationLetters), analysis = analyseContinuity(previousTrial, adjusted, targetTrial);
    if (!analysis.valid) throw new Error('Generated trial failed the mandatory partial-letter continuity invariant.');
    adjusted.surfaceContinuity = Object.freeze({
      initialTrial: false,
      interferenceLevel,
      requestedCarryCount: continuityCarryCount(interferenceLevel),
      previousLetters: analysis.previousLetters,
      currentLetters: analysis.currentLetters,
      targetLetters: analysis.targetLetters,
      retainedLetters: analysis.retainedLetters,
      introducedLetters: analysis.introducedLetters,
      targetOverlapLetters: analysis.targetOverlapLetters,
      previousOverlapCount: analysis.previousOverlapCount,
      introducedCount: analysis.introducedCount,
      targetOverlapCount: analysis.targetOverlapCount,
      partialUpdate: analysis.partialUpdate,
      targetAnchored: analysis.targetAnchored,
      valid: analysis.valid
    });
    return adjusted;
  }
  function refreshConflictMetadata(conflict, target, trial) {
    if (!target || !conflict?.evaluateConflictMatrix) return trial;
    const before = Array.isArray(trial.conflictResponseVector) ? trial.conflictResponseVector.slice() : null;
    const evaluation = conflict.evaluateConflictMatrix(target, trial, { roleSensitive: Boolean(trial.roleSensitive) });
    const after = [...evaluation.statementMatches, evaluation.conclusionEntailed, evaluation.wholeTrialMatch];
    if (before && (before.length !== after.length || before.some((value, index) => value !== after[index]))) throw new Error('Partial relettering changed the logical N-back response vector.');
    Object.assign(trial, {
      nBackMatch: evaluation.wholeTrialMatch,
      isMatch: evaluation.wholeTrialMatch,
      statementMatchVector: evaluation.statementMatches.slice(),
      conclusionEntailed: evaluation.conclusionEntailed,
      conflictResponseVector: after,
      mappingConflict: evaluation.mappingConflict,
      localStatementCompatibility: evaluation.localStatementCompatibility.slice()
    });
    return trial;
  }
  function installBrowser(rootObject) {
    let attempts = 0, retryId = null;
    const attempt = () => {
      const app = rootObject.__ontologicalWorlds, conflict = rootObject.__modeOneConflictMatrixV20;
      if (!app || !conflict || !app.__mandatoryCompassResolutionInstalled || typeof app.makeTrial !== 'function') return false;
      if (app.__modeOnePartialLetterContinuityInstalled) return true;
      const originalMakeTrial = app.makeTrial.bind(app), d = rootObject.document;
      app.makeTrial = function(...args) {
        const trial = originalMakeTrial(...args);
        const mode = Number(d.getElementById('logic-mode')?.value ?? this.settings?.().mode ?? 0);
        if (mode !== 0 || !trial) return trial;
        const history = Array.isArray(this.trials) ? this.trials : [], previous = history[history.length - 1] || null;
        if (!previous) return applyContinuity(this.rng, trial, null, { interferenceLevel: trial.interferenceLevel });
        const level = Math.max(1, Math.min(8, Math.round(Number(this.n || d.getElementById('n-slider')?.value) || 1)));
        const target = history[history.length - level] || null;
        const interferenceLevel = Number(d.getElementById('interference-slider')?.value ?? trial.interferenceLevel) || 0;
        return refreshConflictMetadata(conflict, target, applyContinuity(this.rng, trial, previous, { targetTrial: target, interferenceLevel }));
      };
      app.assertModeOneLetterContinuity = function(previous, current, target = null) {
        const analysis = analyseContinuity(previous, current, target);
        if (!analysis.valid) throw new Error('Mode 1 trial violates partial-letter continuity.');
        return analysis;
      };
      app.__modeOnePartialLetterContinuityInstalled = true;
      return true;
    };
    if (attempt()) return true;
    retryId = rootObject.setInterval(() => {
      attempts += 1;
      if (attempt() || attempts >= 80) {
        rootObject.clearInterval(retryId);
        if (attempts >= 80 && !rootObject.__ontologicalWorlds?.__modeOnePartialLetterContinuityInstalled) console.error('Mode 1 partial-letter continuity could not attach to the authoritative runtime.');
      }
    }, 25);
    return false;
  }
  function runAudit(iterations = 1000) {
    class AuditRng {
      constructor(seed) { this.s = seed >>> 0; }
      next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
      shuffle(values) { const out = [...values]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(this.next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
    }
    const rng = new AuditRng(0x4c455454), failures = [], rows = [];
    const makeTrial = letters => ({ premises: [{ subject: letters[0], relation: 'N', object: letters[1] }, { subject: letters[1], relation: 'E', object: letters[2] }], conclusion: { subject: letters[0], relation: 'NE', object: letters[2] }, letters: letters.slice(), directionResolution: 8, scored: true });
    for (const interferenceLevel of [0, 49, 50, 100]) {
      let previous = makeTrial(['A','B','C']), target = makeTrial(['X','Y','Z']), row = { interferenceLevel, expectedCarry: continuityCarryCount(interferenceLevel), failures: 0 };
      for (let index = 0; index < iterations; index += 1) {
        try {
          const current = applyContinuity(rng, makeTrial(['D','E','F']), previous, { targetTrial: target, interferenceLevel });
          const analysis = analyseContinuity(previous, current, target);
          if (!analysis.valid || analysis.previousOverlapCount !== row.expectedCarry || analysis.introducedCount !== 3 - row.expectedCarry || analysis.targetOverlapCount < 1) row.failures += 1;
          target = previous;
          previous = current;
        } catch (error) {
          row.failures += 1;
          if (failures.length < 20) failures.push(`${interferenceLevel}-${index}:${error.message}`);
        }
      }
      if (row.failures) failures.push(`interference-${interferenceLevel}-summary`);
      rows.push(row);
    }
    return { passed: failures.length === 0, iterations, rows, failures };
  }

  return { version: 1, LETTER_POOL, PRESENTATION_KEYS, continuityCarryCount, trialLetters, analyseContinuity, selectDestinationLetters, reletterTrial, applyContinuity, refreshConflictMetadata, installBrowser, runAudit };
});
