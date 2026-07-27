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

  function chooseIdentityUpdatePlan(rng, targetTrial, previousTrial = null) {
    const targetLetters = trialLetters(targetTrial);
    const previousLetters = previousTrial ? trialLetters(previousTrial) : targetLetters.slice();
    const shared = overlap(targetLetters, previousLetters);

    // Preserve the only target/previous bridge when there is exactly one.
    const changeCandidates = shared.length === 1
      ? targetLetters.filter(letter => letter !== shared[0])
      : targetLetters.slice();
    const changedTargetLetter = pick(rng, shuffle(rng, changeCandidates));
    const retainedTargetLetters = targetLetters.filter(letter => letter !== changedTargetLetter);
    const retainedPreviousOverlap = overlap(retainedTargetLetters, previousLetters);

    let replacementPool;
    if (previousTrial && retainedPreviousOverlap.length === 0) {
      // Disjoint N-back target and immediate predecessor: use one predecessor letter as the bridge.
      replacementPool = previousLetters.filter(letter => !targetLetters.includes(letter));
    } else {
      // Otherwise introduce a genuinely new letter relative to both active contexts.
      replacementPool = LETTER_POOL.filter(letter => !targetLetters.includes(letter) && !previousLetters.includes(letter));
      if (!replacementPool.length) replacementPool = LETTER_POOL.filter(letter => !targetLetters.includes(letter));
    }
    const replacementLetter = pick(rng, shuffle(rng, replacementPool));
    const currentLetters = [...retainedTargetLetters, replacementLetter];
    const previousOverlapCount = overlap(currentLetters, previousLetters).length;

    if (new Set(currentLetters).size !== 3) throw new Error('Identity update produced duplicate letters.');
    if (overlap(currentLetters, targetLetters).length !== 2) throw new Error('Identity update must retain exactly two N-back target letters.');
    if (previousTrial && previousOverlapCount < 1) throw new Error('Identity update lost the immediate-predecessor bridge.');

    return Object.freeze({
      targetLetters: Object.freeze(targetLetters.slice()),
      previousLetters: Object.freeze(previousLetters.slice()),
      retainedTargetLetters: Object.freeze(retainedTargetLetters.slice()),
      changedTargetLetter,
      replacementLetter,
      currentLetters: Object.freeze(currentLetters.slice()),
      targetOverlapCount: 2,
      previousOverlapCount
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
    const roleSensitive = options.roleSensitive !== false;
    const before = conflict.evaluateConflictMatrix(targetTrial, trial, { roleSensitive });
    const beforeVector = responseVector(before);
    const targetLetters = trialLetters(targetTrial);
    const mappedCurrentLetters = targetLetters.map(letter => before.letterMapping?.[letter]);
    if (mappedCurrentLetters.some(letter => !letter) || new Set(mappedCurrentLetters).size !== 3) {
      throw new Error('Conflict alignment did not provide a bijective target-to-current letter mapping.');
    }

    const plan = chooseIdentityUpdatePlan(rng, targetTrial, previousTrial);
    const retained = new Set(plan.retainedTargetLetters);
    const replacements = {};
    targetLetters.forEach(targetLetter => {
      const currentLetter = before.letterMapping[targetLetter];
      replacements[currentLetter] = retained.has(targetLetter) ? targetLetter : plan.replacementLetter;
    });

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
    const changedIdentityRemoved = !adjustedLetters.includes(plan.changedTargetLetter);
    if (targetOverlapCount !== 2 || previousOverlapCount < 1 || !retainedIdentityValid || !changedIdentityRemoved) {
      throw new Error('Maximum logical-interference identity invariant failed.');
    }

    Object.assign(adjusted, {
      interferenceLevel: MAX_INTERFERENCE,
      maxLogicalInterference: true,
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
        changedTargetLetter: plan.changedTargetLetter,
        replacementLetter: plan.replacementLetter,
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
    return adjusted;
  }

  function generateMaximalScoredTrial(rng, targetTrial, previousTrial, options = {}) {
    requireDependencies();
    const match = Boolean(options.match);
    const roleSensitive = options.roleSensitive !== false;
    const directionResolution = core.normaliseResolution(options.directionResolution ?? targetTrial.directionResolution, 16);
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
    if (!previousTrial) {
      const trial = conflict.generateWarmupTrial(rng, { interferenceLevel: MAX_INTERFERENCE, directionResolution });
      trial.interferenceLevel = MAX_INTERFERENCE;
      trial.maxLogicalInterference = true;
      trial.logicalInterference = Object.freeze({ level: MAX_INTERFERENCE, source: 'initial-seed', initialTrial: true, valid: true });
      return trial;
    }
    const generated = generateMaximalScoredTrial(rng, previousTrial, previousTrial, {
      match: false,
      roleSensitive: true,
      directionResolution
    });
    generated.logicalInterference = Object.freeze({ ...generated.logicalInterference, source: 'warmup-predecessor' });
    return markWarmup(generated);
  }

  function analyseTransition(targetTrial, previousTrial, currentTrial, options = {}) {
    const roleSensitive = options.roleSensitive !== false;
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
      validSurfaceContinuity: result.targetOverlapCount === 2 && result.previousOverlapCount >= 1 && result.introducedRelativeToTarget === 1,
      validLogicalLure: result.wholeTrialMatch || result.statementMatchCount === 2,
      valid: result.targetOverlapCount === 2 && result.previousOverlapCount >= 1 && result.introducedRelativeToTarget === 1 && (result.wholeTrialMatch || result.statementMatchCount === 2)
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
    if (help) help.textContent = 'Mode 1 is fixed at maximum logical interference. Every scored trial retains exactly two letter identities from its N-back target, replaces exactly one, preserves a bridge to the immediately preceding trial, and makes every NO MATCH an exact two-of-three logical lure.';
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

    const originalMakeTrial = app.makeTrial.bind(app);
    forceMaximumInterferenceUI(documentObject);
    app.makeTrial = function() {
      const mode = Number(documentObject.getElementById('logic-mode')?.value ?? this.settings?.().mode ?? 0);
      if (mode !== 0) return originalMakeTrial();
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
        roleSensitive: true,
        directionResolution
      });
    };
    app.assertModeOneMaximumInterference = function(targetTrial, previousTrial, currentTrial) {
      const analysis = analyseTransition(targetTrial, previousTrial, currentTrial, { roleSensitive: true });
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
              ? generateMaximalScoredTrial(rng, target, previous, { match: index % 4 === 0, roleSensitive: true, directionResolution })
              : generateMaximalWarmupTrial(rng, previous, { directionResolution });
            if (target) {
              const analysis = analyseTransition(target, previous, trial, { roleSensitive: true });
              row.scored += 1;
              if (!analysis.valid || trial.interferenceLevel !== MAX_INTERFERENCE || !trial.logicalInterference?.valid) row.failures += 1;
            } else if (previous) {
              const previousOverlap = overlap(trialLetters(trial), trialLetters(previous)).length;
              if (previousOverlap !== 2 || trial.interferenceLevel !== MAX_INTERFERENCE) row.failures += 1;
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
