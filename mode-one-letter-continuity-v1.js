'use strict';

(function exposeModeOneMaxInterference(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.__modeOneLetterContinuityV1 = api;
  if (root?.document) {
    const install = () => {
      try {
        api.installBrowser(root);
      } catch (error) {
        root.__modeOneMaxInterferenceInstallError = error;
        console.error('Authoritative Mode 1 maximum-interference installation failed.', error);
        const display = root.document.getElementById('premise-display');
        if (display) display.textContent = `MAX_INTERFERENCE_INSTALL_FAILED: ${error?.message || 'unknown error'}`;
        const start = root.document.getElementById('start-btn');
        if (start) start.disabled = true;
      }
    };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();
  }
})(typeof window !== 'undefined' ? window : globalThis, root => {
  const MAX_INTERFERENCE = 100;
  const core = root?.__modeOneTriadicEntailmentCore || root?.__modeOneSpatialCore || (typeof require === 'function' ? require('./mode-one-spatial-core.js') : null);
  const conflict = root?.__modeOneConflictMatrixV20 || (typeof require === 'function' ? require('./mode-one-conflict-matrix-v20.js') : null);
  const LETTER_POOL = Object.freeze([...(core?.LETTERS || 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split(''))]);

  function requireDependencies() {
    if (!core?.renameTrial || !core?.evaluateTrial || !conflict?.generateConflictTrial || !conflict?.evaluateConflictMatrix) {
      throw new Error('Mode 1 maximum interference requires the spatial core and conflict-matrix runtime.');
    }
    return { core, conflict };
  }
  const random = rng => rng?.next ? rng.next() : Math.random();
  const pick = (rng, values) => {
    if (!values.length) throw new Error('Cannot select from an empty collection.');
    return rng?.pick ? rng.pick(values) : values[Math.floor(random(rng) * values.length)];
  };
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
    if (!trial || !Array.isArray(trial.premises) || trial.premises.length !== 2 || !trial.conclusion) {
      throw new Error('Maximum interference requires a complete three-statement trial.');
    }
    return [...trial.premises, trial.conclusion];
  }
  function trialLetters(trial) {
    const letters = [...new Set(statements(trial).flatMap(statement => [statement.subject, statement.object]))];
    if (letters.length !== 3) throw new Error('Maximum interference requires exactly three distinct letters.');
    return letters;
  }
  function overlap(first, second) {
    const set = new Set(second);
    return first.filter(value => set.has(value));
  }
  function responseVector(evaluation) {
    return [...evaluation.statementMatches, evaluation.conclusionEntailed, evaluation.wholeTrialMatch];
  }
  function sameVector(first, second) {
    return first.length === second.length && first.every((value, index) => value === second[index]);
  }

  const EXPOSURE_WINDOW = 32;
  function summariseExposure(recentTrials) {
    const counts = Object.fromEntries(LETTER_POOL.map(letter => [letter, 0]));
    const streaks = Object.fromEntries(LETTER_POOL.map(letter => [letter, 0]));
    for (const row of recentTrials) {
      const used = new Set(row);
      for (const letter of LETTER_POOL) {
        counts[letter] += Number(used.has(letter));
        streaks[letter] = used.has(letter) ? streaks[letter] + 1 : 0;
      }
    }
    return { trialCount: recentTrials.length, counts, streaks, recentTrials };
  }
  function exposureBefore(previousTrial) {
    if (!previousTrial) return summariseExposure([]);
    const previousLetters = trialLetters(previousTrial), recorded = previousTrial.letterExposure;
    const recent = recorded?.recentTrials;
    const valid = recorded?.version === 2 && Array.isArray(recent) && recent.length > 0 && recent.length <= EXPOSURE_WINDOW &&
      recent.every(row => Array.isArray(row) && row.length === 3 && new Set(row).size === 3 && row.every(letter => LETTER_POOL.includes(letter))) &&
      recent[recent.length - 1].every(letter => previousLetters.includes(letter));
    // Earlier trials without a usable exposure window supply one known
    // observation; never manufacture missing session history.
    return summariseExposure(valid ? recent.map(row => [...row]) : [[...previousLetters]]);
  }
  function recordExposure(trial, previousTrial) {
    const recentTrials = [...exposureBefore(previousTrial).recentTrials, trialLetters(trial)].slice(-EXPOSURE_WINDOW);
    const exposure = summariseExposure(recentTrials);
    // All counts and arrays describe only the last 32 trials, so metadata
    // stays bounded even in long or open-ended sessions.
    trial.letterExposure = Object.freeze({ version: 2, windowSize: EXPOSURE_WINDOW,
      trialCount: exposure.trialCount, counts: Object.freeze(exposure.counts), streaks: Object.freeze(exposure.streaks),
      recentTrials: Object.freeze(recentTrials.map(row => Object.freeze([...row]))) });
    return trial;
  }
  function sampleLetters(rng, candidates, count, exposure) {
    const remaining = [...candidates], selected = [];
    if (!Number.isInteger(count) || count < 0 || count > remaining.length) throw new Error('Invalid letter sample size.');
    while (selected.length < count) {
      // Soft penalties preserve positive probability for every eligible
      // letter; they do not enforce a predictable least-used rotation.
      const weights = remaining.map(letter => 1 / (1 + 0.5 * exposure.counts[letter] + 2 * exposure.streaks[letter] ** 2));
      let threshold = random(rng) * weights.reduce((sum, weight) => sum + weight, 0), selectedIndex = weights.length - 1;
      for (let index = 0; index < weights.length; index++) {
        threshold -= weights[index];
        if (threshold < 0) { selectedIndex = index; break; }
      }
      selected.push(remaining.splice(selectedIndex, 1)[0]);
    }
    return selected;
  }

  function chooseIdentityUpdatePlan(rng, targetTrial, previousTrial = null) {
    const targetLetters = trialLetters(targetTrial);
    const previousLetters = previousTrial ? trialLetters(previousTrial) : targetLetters.slice();
    const before = exposureBefore(previousTrial || targetTrial);
    // Draw this plan before generating the requested match/nonmatch. Both
    // outcomes use the same 0/1/2 overlap distribution, with no forced bridge.
    const targetOverlapCount = Math.floor(random(rng) * 3);
    const retainedTargetLetters = sampleLetters(rng, targetLetters, targetOverlapCount, before);
    const introducedLetters = sampleLetters(rng, LETTER_POOL.filter(letter => !targetLetters.includes(letter)), 3 - targetOverlapCount, before);
    const removedTargetLetters = targetLetters.filter(letter => !retainedTargetLetters.includes(letter));
    const currentLetters = [...retainedTargetLetters, ...introducedLetters];
    const previousOverlapCount = overlap(currentLetters, previousLetters).length;
    if (new Set(currentLetters).size !== 3) throw new Error('Identity update produced duplicate letters.');
    if (overlap(currentLetters, targetLetters).length !== targetOverlapCount) throw new Error('The variable letter-overlap plan failed.');

    return Object.freeze({
      targetLetters: Object.freeze(targetLetters.slice()),
      previousLetters: Object.freeze(previousLetters.slice()),
      retainedTargetLetters: Object.freeze(retainedTargetLetters.slice()),
      removedTargetLetters: Object.freeze(removedTargetLetters.slice()),
      introducedLetters: Object.freeze(introducedLetters.slice()),
      changedTargetLetter: removedTargetLetters.length === 1 ? removedTargetLetters[0] : null,
      replacementLetter: introducedLetters.length === 1 ? introducedLetters[0] : null,
      currentLetters: Object.freeze(currentLetters.slice()),
      targetOverlapCount,
      previousOverlapCount,
      identityPolicy: 'variable-overlap-random-roles'
    });
  }

  function refreshSpatialMetadata(trial) {
    const evaluation = core.evaluateTrial(trial);
    trial.letters = trialLetters(trial);
    trial.symbols = trial.letters.slice();
    trial.expectedRelation = evaluation.expectedRelation;
    trial.distinctionClass = evaluation.distinctionClass;
    trial.isEntailed = evaluation.isEntailed;
    trial.explanation = core.explainTrial ? core.explainTrial(trial) : trial.explanation;
    delete trial.signature;
    trial.interferenceMeta = {
      ...(trial.interferenceMeta || {}),
      level: MAX_INTERFERENCE,
      maximumLogicalInterference: true,
      expectedRelation: evaluation.expectedRelation,
      assertedRelation: evaluation.assertedRelation,
      distinctionClass: evaluation.distinctionClass
    };
    return trial;
  }

  function applyMaximumIdentityInterference(rng, targetTrial, previousTrial, trial, options = {}) {
    requireDependencies();
    const roleSensitive = false;
    const before = conflict.evaluateConflictMatrix(targetTrial, trial, { roleSensitive });
    const beforeVector = responseVector(before);
    const plan = options.identityPlan || chooseIdentityUpdatePlan(rng, targetTrial, previousTrial);
    const assignedLetters = shuffle(rng, plan.currentLetters.slice()), sourceLetters = trialLetters(trial);
    // A full random bijection also moves retained identities between roles.
    // Statement order and the separate within-trial entailment stay intact.
    const replacements = Object.fromEntries(sourceLetters.map((letter, index) => [letter, assignedLetters[index]]));

    let adjusted = core.renameTrial(trial, replacements);
    adjusted = refreshSpatialMetadata(adjusted);
    const after = conflict.evaluateConflictMatrix(targetTrial, adjusted, { roleSensitive });
    const afterVector = responseVector(after);
    if (!sameVector(beforeVector, afterVector)) {
      throw new Error('Maximum-interference relettering changed the five-decision logical response vector.');
    }

    const adjustedLetters = trialLetters(adjusted);
    const targetOverlapCount = overlap(adjustedLetters, plan.targetLetters).length;
    const previousOverlapCount = previousTrial ? overlap(adjustedLetters, plan.previousLetters).length : targetOverlapCount;
    const retainedIdentityValid = plan.retainedTargetLetters.every(letter => adjustedLetters.includes(letter));
    const changedIdentityRemoved = plan.removedTargetLetters.every(letter => !adjustedLetters.includes(letter));
    if (targetOverlapCount !== plan.targetOverlapCount || targetOverlapCount > 2 || !retainedIdentityValid || !changedIdentityRemoved) {
      throw new Error('Maximum logical-interference identity invariant failed.');
    }

    Object.assign(adjusted, {
      interferenceLevel: MAX_INTERFERENCE,
      maxLogicalInterference: true,
      nBackWarmup: false,
      nBackMatch: after.wholeTrialMatch,
      isMatch: after.wholeTrialMatch,
      statementMatchVector: after.statementMatches.slice(),
      conclusionEntailed: after.conclusionEntailed,
      conflictResponseVector: afterVector,
      mappingConflict: after.mappingConflict,
      localStatementCompatibility: after.localStatementCompatibility.slice(),
      roleSensitive,
      logicalInterference: Object.freeze({
        level: MAX_INTERFERENCE,
        source: options.source || 'n-back-target',
        targetLetters: plan.targetLetters,
        previousLetters: plan.previousLetters,
        currentLetters: Object.freeze(adjustedLetters.slice()),
        retainedTargetLetters: plan.retainedTargetLetters,
        removedTargetLetters: plan.removedTargetLetters,
        introducedLetters: plan.introducedLetters,
        changedTargetLetter: plan.changedTargetLetter,
        replacementLetter: plan.replacementLetter,
        identityPolicy: plan.identityPolicy,
        rolesRandomized: true,
        targetOverlapCount,
        previousOverlapCount,
        retainedIdentityValid,
        changedIdentityRemoved,
        statementMatchCount: after.matchedCount,
        wholeTrialMatch: after.wholeTrialMatch,
        exactTwoStatementLure: !after.wholeTrialMatch && after.matchedCount === 2,
        valid: true
      })
    });
    delete adjusted.warmupSourceStatementMatchVector;
    return recordExposure(adjusted, previousTrial || targetTrial);
  }

  function generateMaximalScoredTrial(rng, targetTrial, previousTrial, options = {}) {
    requireDependencies();
    const match = Boolean(options.match);
    const roleSensitive = false;
    const directionResolution = core.normaliseResolution(options.directionResolution ?? targetTrial.directionResolution, 16);
    const identityPlan = chooseIdentityUpdatePlan(rng, targetTrial, previousTrial || targetTrial);
    let lastError = null;
    for (let attempt = 0; attempt < 128; attempt += 1) {
      try {
        const trial = conflict.generateConflictTrial(rng, targetTrial, {
          match,
          interferenceLevel: MAX_INTERFERENCE,
          roleSensitive,
          directionResolution
        });
        const evaluation = conflict.evaluateConflictMatrix(targetTrial, trial, { roleSensitive });
        if (match && evaluation.matchedCount !== 3) throw new Error('MATCH trial did not preserve all three logical statements.');
        if (!match && evaluation.matchedCount !== 2) throw new Error('Maximum-interference NO MATCH trial was not an exact two-of-three lure.');
        return applyMaximumIdentityInterference(rng, targetTrial, previousTrial || targetTrial, trial, {
          roleSensitive,
          identityPlan,
          source: 'n-back-target'
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Unable to generate a maximum-interference scored trial.');
  }

  function markWarmup(trial) {
    const entailment = core.evaluateTrial(trial);
    trial.warmupSourceStatementMatchVector = Array.isArray(trial.statementMatchVector) ? trial.statementMatchVector.slice() : null;
    trial.nBackWarmup = true;
    trial.nBackRequestedMatch = false;
    trial.nBackMatch = false;
    trial.isMatch = false;
    trial.statementMatchVector = [false, false, false];
    trial.localStatementCompatibility = [false, false, false];
    trial.conclusionEntailed = entailment.isEntailed;
    trial.conflictResponseVector = [false, false, false, entailment.isEntailed, false];
    trial.interferenceProfile = `MAX100:WARMUP:000:${Number(entailment.isEntailed)}:0`;
    return trial;
  }

  function generateMaximalWarmupTrial(rng, previousTrial, options = {}) {
    requireDependencies();
    const directionResolution = core.normaliseResolution(options.directionResolution ?? previousTrial?.directionResolution, 16);
    // Draw a new valid spatial problem, not a near-copy of the predecessor.
    // Formal Mode 1 still scores its existing five warmup decisions, including K/L.
    const generated = conflict.generateWarmupTrial(rng, { interferenceLevel: MAX_INTERFERENCE, directionResolution });
    const letters = shuffle(rng, sampleLetters(rng, LETTER_POOL, 3, exposureBefore(previousTrial)));
    const sourceLetters = trialLetters(generated);
    const trial = refreshSpatialMetadata(core.renameTrial(generated, Object.fromEntries(sourceLetters.map((letter, index) => [letter, letters[index]]))));
    trial.interferenceLevel = MAX_INTERFERENCE;
    trial.maxLogicalInterference = true;
    trial.logicalInterference = Object.freeze({ level: MAX_INTERFERENCE, source: 'independent-warmup', initialTrial: !previousTrial, valid: true });
    return recordExposure(markWarmup(trial), previousTrial);
  }

  function analyseTransition(targetTrial, previousTrial, currentTrial, options = {}) {
    const roleSensitive = false;
    const targetLetters = trialLetters(targetTrial);
    const previousLetters = previousTrial ? trialLetters(previousTrial) : targetLetters;
    const currentLetters = trialLetters(currentTrial);
    const evaluation = conflict.evaluateConflictMatrix(targetTrial, currentTrial, { roleSensitive });
    const result = {
      targetOverlapCount: overlap(currentLetters, targetLetters).length,
      previousOverlapCount: overlap(currentLetters, previousLetters).length,
      introducedRelativeToTarget: currentLetters.filter(letter => !targetLetters.includes(letter)).length,
      statementMatchCount: evaluation.matchedCount,
      wholeTrialMatch: evaluation.wholeTrialMatch
    };
    return Object.freeze({
      ...result,
      // Keep the legacy API field while reflecting variable identity overlap.
      validSurfaceContinuity: result.targetOverlapCount <= 2 && result.introducedRelativeToTarget === 3 - result.targetOverlapCount,
      validLogicalLure: result.wholeTrialMatch || result.statementMatchCount === 2,
      valid: result.targetOverlapCount <= 2 && result.introducedRelativeToTarget === 3 - result.targetOverlapCount && (result.wholeTrialMatch || result.statementMatchCount === 2)
    });
  }

  function forceMaximumInterferenceUI(documentObject) {
    const slider = documentObject.getElementById('interference-slider');
    const value = documentObject.getElementById('interference-val');
    const help = documentObject.getElementById('interference-help');
    if (slider) {
      slider.min = String(MAX_INTERFERENCE);
      slider.max = String(MAX_INTERFERENCE);
      slider.step = '1';
      slider.value = String(MAX_INTERFERENCE);
      slider.disabled = true;
      slider.setAttribute('aria-valuemin', String(MAX_INTERFERENCE));
      slider.setAttribute('aria-valuemax', String(MAX_INTERFERENCE));
      slider.setAttribute('aria-valuenow', String(MAX_INTERFERENCE));
      slider.setAttribute('aria-valuetext', 'Maximum logical interference, fixed at 100 percent');
    }
    if (value) value.textContent = '100% — FIXED';
    if (help) help.textContent = 'Mode 1 is fixed at maximum logical interference. Letter overlap varies from zero to two N-back target letters, and retained letters can change roles. Every NO MATCH remains an exact two-of-three logical lure.';
  }

  function installBrowser(rootObject) {
    requireDependencies();
    const app = rootObject.__ontologicalWorlds;
    const documentObject = rootObject.document;
    if (!app || !documentObject) throw new Error('Ontological Worlds browser runtime is unavailable.');
    if (!app.__mandatoryCompassResolutionInstalled || typeof app.makeTrial !== 'function') {
      throw new Error('The authoritative Mode 1 conflict runtime must install before maximum interference.');
    }
    if (app.__modeOneAuthoritativeMaxInterferenceInstalled) return true;

    forceMaximumInterferenceUI(documentObject);
    app.makeTrial = function() {
      const mode = Number(documentObject.getElementById('logic-mode')?.value ?? this.settings?.().mode ?? 0);
      if (mode !== 0) return null;
      const settings = this.settings();
      const directionResolution = core.normaliseResolution(this.directionResolution ?? settings.directionResolution, null);
      if (!directionResolution) throw new Error('Maximum-interference Mode 1 requires a frozen compass resolution.');
      const level = Math.max(1, Math.min(8, Math.round(Number(this.n || settings.n) || 1)));
      const history = Array.isArray(this.trials) ? this.trials : [];
      const previousTrial = history[history.length - 1] || null;
      const targetTrial = history[history.length - level] || null;
      if (!targetTrial) return generateMaximalWarmupTrial(this.rng, previousTrial, { directionResolution });
      const requestedMatch = this.rng.next() < settings.matchProbability;
      return generateMaximalScoredTrial(this.rng, targetTrial, previousTrial, {
        match: requestedMatch,
        roleSensitive: false,
        directionResolution
      });
    };
    app.assertModeOneMaximumInterference = function(targetTrial, previousTrial, currentTrial) {
      const analysis = analyseTransition(targetTrial, previousTrial, currentTrial, { roleSensitive: false });
      if (!analysis.valid) throw new Error('Mode 1 trial violates the authoritative maximum-interference invariant.');
      return analysis;
    };
    app.modeOneInterferenceLevel = MAX_INTERFERENCE;
    app.__modeOnePartialLetterContinuityInstalled = true;
    app.__modeOneAuthoritativeMaxInterferenceInstalled = true;
    rootObject.__modeOneMaxInterferenceReady = true;
    return true;
  }

  function runAudit(iterationsPerLevel = 256) {
    class AuditRng {
      constructor(seed) { this.s = seed >>> 0; }
      next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
      pick(values) { return values[Math.floor(this.next() * values.length)]; }
      shuffle(values) { const out = [...values]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(this.next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
    }
    const failures = [], rows = [];
    for (const directionResolution of [4, 8, 16]) {
      for (let level = 1; level <= 8; level += 1) {
        const rng = new AuditRng(0x6d780000 + directionResolution * 100 + level), history = [];
        const row = { directionResolution, level, trials: 0, scored: 0, failures: 0 };
        for (let index = 0; index < iterationsPerLevel + level; index += 1) {
          try {
            const previous = history[history.length - 1] || null;
            const target = history[history.length - level] || null;
            const trial = target
              ? generateMaximalScoredTrial(rng, target, previous, { match: index % 4 === 0, roleSensitive: false, directionResolution })
              : generateMaximalWarmupTrial(rng, previous, { directionResolution });
            if (target) {
              const analysis = analyseTransition(target, previous, trial, { roleSensitive: false });
              row.scored += 1;
              if (!analysis.valid || trial.interferenceLevel !== MAX_INTERFERENCE || !trial.logicalInterference?.valid) row.failures += 1;
            } else if (previous) {
              if (!trial.nBackWarmup || trial.interferenceLevel !== MAX_INTERFERENCE || trial.logicalInterference?.source !== 'independent-warmup') row.failures += 1;
            }
            history.push(trial);
            row.trials += 1;
          } catch (error) {
            row.failures += 1;
            if (failures.length < 30) failures.push(`${directionResolution}-${level}-${index}:${error.message}`);
          }
        }
        if (row.failures) failures.push(`resolution-${directionResolution}-level-${level}-summary`);
        rows.push(row);
      }
    }
    return { passed: failures.length === 0, maximumInterference: MAX_INTERFERENCE, iterationsPerLevel, rows, failures };
  }

  return Object.freeze({
    version: 2,
    MAX_INTERFERENCE,
    LETTER_POOL,
    trialLetters,
    chooseIdentityUpdatePlan,
    applyMaximumIdentityInterference,
    generateMaximalScoredTrial,
    generateMaximalWarmupTrial,
    analyseTransition,
    forceMaximumInterferenceUI,
    installBrowser,
    runAudit
  });
});
