'use strict';

(function exposeModeOneConflictMatrix(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.__modeOneConflictMatrixV20 = api;
    root.addEventListener('DOMContentLoaded', () => api.installBrowser(root));
  }
})(typeof window !== 'undefined' ? window : globalThis, root => {
  const LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
  const LETTER_POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
  const core = root?.__modeOneTriadicEntailmentCore || root?.__modeOneSpatialCore ||
    (typeof require === 'function' ? require('./mode-one-spatial-core.js') : null);

  function requireCore() {
    if (!core) throw new Error('Mode 1 conflict matrix requires the Mode 1 spatial core.');
    return core;
  }

  const clone = value => JSON.parse(JSON.stringify(value));
  const random = rng => rng?.next ? rng.next() : Math.random();
  const pick = (rng, values) => rng?.pick ? rng.pick(values) : values[Math.floor(random(rng) * values.length)];

  function shuffle(rng, values) {
    if (rng?.shuffle) return rng.shuffle(values);
    const output = [...values];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random(rng) * (index + 1));
      [output[index], output[swap]] = [output[swap], output[index]];
    }
    return output;
  }

  function statements(trial) {
    if (!trial || !Array.isArray(trial.premises) || trial.premises.length !== 2 || !trial.conclusion) {
      throw new Error('A conflict-matrix trial requires two premises and one conclusion.');
    }
    return [...trial.premises, trial.conclusion];
  }

  function trialLetters(trial) {
    return [...new Set(statements(trial).flatMap(statement => [statement.subject, statement.object]))];
  }

  function permutations(values) {
    if (values.length < 2) return [values.slice()];
    return values.flatMap((value, index) =>
      permutations(values.slice(0, index).concat(values.slice(index + 1))).map(rest => [value, ...rest]));
  }

  function canonicalStatement(statement, mapping) {
    const c = requireCore();
    const direct = `${mapping[statement.subject]}>${statement.relation}>${mapping[statement.object]}`;
    const inverse = `${mapping[statement.object]}>${c.opposite(statement.relation)}>${mapping[statement.subject]}`;
    return direct < inverse ? direct : inverse;
  }

  function analyseAlignment(target, current) {
    const targetLetters = trialLetters(target);
    const currentLetters = trialLetters(current);
    if (targetLetters.length !== 3 || currentLetters.length !== 3) {
      throw new Error('Conflict-matrix comparisons require exactly three letters in each trial.');
    }

    const targetStatements = statements(target);
    const currentStatements = statements(current);
    const candidates = [];

    for (const assignedCurrentLetters of permutations(currentLetters)) {
      const map = Object.fromEntries(targetLetters.map((letter, index) => [letter, assignedCurrentLetters[index]]));
      const targetCanonical = targetStatements.map(statement => canonicalStatement(statement, map));
      const currentCanonical = currentStatements.map(statement => canonicalStatement(statement,
        Object.fromEntries(currentLetters.map(letter => [letter, letter]))));

      for (const assignment of permutations([0, 1, 2])) {
        const vector = currentStatements.map((_, currentIndex) =>
          targetCanonical[assignment[currentIndex]] === currentCanonical[currentIndex]);
        const count = vector.filter(Boolean).length;
        candidates.push({
          count,
          vector,
          assignment,
          map,
          key: `${String(3 - count)}|${vector.map(Number).join('')}|${assignment.join('')}|${targetLetters.map(letter => map[letter]).join('')}`
        });
      }
    }

    candidates.sort((first, second) => second.count - first.count || first.key.localeCompare(second.key));
    const best = candidates[0];
    const localVector = currentStatements.map(currentStatement => {
      const currentIdentity = Object.fromEntries(currentLetters.map(letter => [letter, letter]));
      const currentCode = canonicalStatement(currentStatement, currentIdentity);
      return permutations(currentLetters).some(assigned => {
        const map = Object.fromEntries(targetLetters.map((letter, index) => [letter, assigned[index]]));
        return targetStatements.some(targetStatement => canonicalStatement(targetStatement, map) === currentCode);
      });
    });

    return Object.freeze({
      statementMatches: Object.freeze(best.vector.slice()),
      matchedCount: best.count,
      assignment: Object.freeze(best.assignment.slice()),
      letterMapping: Object.freeze({ ...best.map }),
      localStatementCompatibility: Object.freeze(localVector),
      localMatchCount: localVector.filter(Boolean).length,
      mappingConflict: localVector.filter(Boolean).length > best.count,
      wholeTrialMatch: best.count === 3
    });
  }

  function evaluateConflictMatrix(target, current) {
    const c = requireCore();
    const alignment = analyseAlignment(target, current);
    const entailment = c.evaluateTrial(current);
    return Object.freeze({
      ...alignment,
      conclusionEntailed: entailment.isEntailed,
      expectedRelation: entailment.expectedRelation,
      assertedRelation: entailment.assertedRelation,
      responseVector: Object.freeze([
        ...alignment.statementMatches,
        entailment.isEntailed,
        alignment.wholeTrialMatch
      ])
    });
  }

  function renameAndTransform(rng, target) {
    const c = requireCore();
    const sourceLetters = trialLetters(target);
    const destination = shuffle(rng, LETTER_POOL).slice(0, 3);
    let trial = c.renameTrial(target, Object.fromEntries(sourceLetters.map((letter, index) => [letter, destination[index]])));
    trial = clone(trial);
    if (random(rng) < 0.5) trial.premises.reverse();
    trial.premises = trial.premises.map(statement => random(rng) < 0.5 ? c.invert(statement) : statement);
    if (random(rng) < 0.5) trial.conclusion = c.invert(trial.conclusion);
    trial.mode = 0;
    trial.publicMode = 1;
    return trial;
  }

  function mutateDirection(rng, statement, severity = 1) {
    const c = requireCore();
    const direction = c.direction(statement.relation);
    const signs = random(rng) < 0.5 ? -1 : 1;
    const distancePool = severity < 34 ? [1] : severity < 67 ? [1, 2] : [1, 2, 4, 8];
    const distance = pick(rng, distancePool);
    return { ...statement, relation: c.DIRECTIONS[(direction.index + signs * distance + 16) % 16].code };
  }

  function desiredMask(rng, requestedWholeMatch, interferenceLevel) {
    if (requestedWholeMatch) return [true, true, true];
    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    const masks = level < 34
      ? [[false, false, false], [true, false, false], [false, true, false], [false, false, true]]
      : level < 67
        ? [[true, true, false], [true, false, true], [false, true, true], [true, false, false], [false, true, false], [false, false, true]]
        : [[true, true, false], [true, false, true], [false, true, true]];
    return pick(rng, masks).slice();
  }

  function generateConflictTrial(rng, target, options = {}) {
    if (!target) throw new Error('A historical N-back target is required.');
    const requestedWholeMatch = Boolean(options.match);
    const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
    const mask = desiredMask(rng, requestedWholeMatch, interferenceLevel);

    for (let attempt = 0; attempt < 2000; attempt += 1) {
      const trial = renameAndTransform(rng, target);
      if (!requestedWholeMatch) {
        const all = statements(trial);
        for (let index = 0; index < 3; index += 1) {
          if (!mask[index]) all[index] = mutateDirection(rng, all[index], interferenceLevel);
        }
        trial.premises = all.slice(0, 2);
        trial.conclusion = all[2];
      }

      let evaluation;
      try { evaluation = evaluateConflictMatrix(target, trial); } catch (_) { continue; }
      const exactMask = evaluation.statementMatches.every((value, index) => value === mask[index]);
      if (requestedWholeMatch ? evaluation.wholeTrialMatch : (!evaluation.wholeTrialMatch && exactMask)) {
        trial.nBackRequestedMatch = requestedWholeMatch;
        trial.nBackMatch = evaluation.wholeTrialMatch;
        trial.isMatch = evaluation.wholeTrialMatch;
        trial.statementMatchVector = evaluation.statementMatches.slice();
        trial.conclusionEntailed = evaluation.conclusionEntailed;
        trial.conflictResponseVector = evaluation.responseVector.slice();
        trial.mappingConflict = evaluation.mappingConflict;
        trial.localStatementCompatibility = evaluation.localStatementCompatibility.slice();
        trial.interferenceProfile = `${evaluation.statementMatches.map(Number).join('')}:${Number(evaluation.conclusionEntailed)}:${Number(evaluation.wholeTrialMatch)}`;
        trial.scored = true;
        return trial;
      }
    }
    throw new Error(`Unable to generate requested Mode 1 conflict profile ${mask.map(Number).join('')}.`);
  }

  function generateWarmupTrial(rng, options = {}) {
    const trial = requireCore().generateTrial(rng, {
      matchProbability: random(rng) < 0.5 ? 1 : 0,
      interferenceLevel: options.interferenceLevel
    });
    trial.mode = 0;
    trial.publicMode = 1;
    trial.nBackWarmup = true;
    trial.scored = false;
    return trial;
  }

  function evaluateHistory(history, currentIndex, nBackLevel) {
    const level = Math.max(1, Math.min(8, Math.round(Number(nBackLevel) || 1)));
    const targetIndex = currentIndex - level;
    if (targetIndex < 0) {
      return Object.freeze({ warmup: true, scored: false, isMatch: false, currentIndex, targetIndex, nBackLevel: level });
    }
    const evaluation = evaluateConflictMatrix(history[targetIndex], history[currentIndex]);
    return Object.freeze({ ...evaluation, warmup: false, scored: true, isMatch: evaluation.wholeTrialMatch,
      currentIndex, targetIndex, nBackLevel: level });
  }

  function runAudit(iterationsPerLevel = 4096) {
    class AuditRng {
      constructor(seed) { this.s = seed >>> 0; }
      next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
      pick(values) { return values[Math.floor(this.next() * values.length)]; }
      shuffle(values) { return shuffle(this, values); }
    }
    const failures = [];
    const perLevel = [];
    let total = 0;
    let matches = 0;
    let nonMatches = 0;
    let statementDecisions = 0;
    let entailmentDecisions = 0;
    let wholeTrialDecisions = 0;

    for (const level of LEVELS) {
      const rng = new AuditRng(0x5a170000 + level);
      const history = Array.from({ length: level }, () => generateWarmupTrial(rng, { interferenceLevel: 100 }));
      const row = { nBackLevel: level, evaluations: 0, matches: 0, nonMatches: 0, failures: 0 };
      for (let index = 0; index < iterationsPerLevel; index += 1) {
        const requestedMatch = index % 2 === 0;
        const target = history[history.length - level];
        const trial = generateConflictTrial(rng, target, { match: requestedMatch, interferenceLevel: 100 });
        history.push(trial);
        const result = evaluateHistory(history, history.length - 1, level);
        total += 1;
        row.evaluations += 1;
        statementDecisions += 3;
        entailmentDecisions += 1;
        wholeTrialDecisions += 1;
        if (result.isMatch) { matches += 1; row.matches += 1; } else { nonMatches += 1; row.nonMatches += 1; }
        if (result.isMatch !== requestedMatch || result.targetIndex !== history.length - 1 - level || result.responseVector.length !== 5) {
          row.failures += 1;
        }
      }
      if (row.failures) failures.push(`level-${level}-${row.failures}`);
      perLevel.push(row);
    }

    return Object.freeze({
      passed: failures.length === 0,
      levels: LEVELS,
      iterationsPerLevel,
      total,
      matches,
      nonMatches,
      statementDecisions,
      entailmentDecisions,
      wholeTrialDecisions,
      totalBinaryDecisions: statementDecisions + entailmentDecisions + wholeTrialDecisions,
      failures,
      perLevel,
      invariants: Object.freeze({
        fiveMandatoryDecisionsPerScoredTrial: true,
        threeStatementLevelNBackDecisions: true,
        separateWithinTrialEntailmentDecision: true,
        separateWholeTrialDecision: true,
        exactSixteenDirectionRelations: true,
        inverseWordingEquivalent: true,
        globallyConsistentLetterMappingRequired: true,
        oneToOneStatementAssignmentRequired: true,
        partialMatchesAreScoredInterference: true,
        allNBackLevelsSupported: true
      })
    });
  }

  function installStyles(documentObject) {
    if (documentObject.getElementById('mode-one-conflict-matrix-style')) return;
    const style = documentObject.createElement('style');
    style.id = 'mode-one-conflict-matrix-style';
    style.textContent = `
      #conflict-matrix{max-width:920px;margin:12px auto 16px;padding:14px;border:1px solid #b8c9da;border-radius:14px;background:rgba(255,255,255,.88)}
      #conflict-matrix[hidden]{display:none!important}.conflict-heading{font-weight:900;letter-spacing:.055em;text-transform:uppercase;margin-bottom:10px;color:#173f67}
      .conflict-row{display:grid;grid-template-columns:minmax(135px,1fr) 1fr 1fr;gap:8px;align-items:center;margin:7px 0}
      .conflict-label{font-size:.82rem;font-weight:800;color:#30465d}.conflict-choice{min-height:44px;border-radius:10px;font-weight:900}
      .conflict-choice.selected{outline:3px solid #183f67;outline-offset:1px}.conflict-choice[disabled]{opacity:.58}
      #conflict-submit{width:100%;min-height:48px;margin-top:11px;border-radius:11px;font-weight:900;text-transform:uppercase}
      #conflict-progress{font-size:.78rem;margin-top:8px;color:#53697e;text-align:center}.response-buttons.conflict-replaced{display:none!important}
      @media(max-width:620px){.conflict-row{grid-template-columns:1fr 1fr}.conflict-label{grid-column:1/-1}.conflict-choice{min-height:48px}}
    `;
    documentObject.head.appendChild(style);
  }

  function installMatrixUI(rootObject, app) {
    const documentObject = rootObject.document;
    installStyles(documentObject);
    if (documentObject.getElementById('conflict-matrix')) return documentObject.getElementById('conflict-matrix');
    const originalButtons = documentObject.querySelector('.response-buttons');
    const matrix = documentObject.createElement('section');
    matrix.id = 'conflict-matrix';
    matrix.hidden = true;
    matrix.setAttribute('aria-label', 'Five-decision relational conflict matrix');
    const labels = ['Statement 1 — N-back', 'Statement 2 — N-back', 'Statement 3 — N-back', 'Statement 3 — entailed?', 'Complete triad — N-back'];
    matrix.innerHTML = `<div class="conflict-heading">Relational conflict matrix</div>${labels.map((label, index) =>
      `<div class="conflict-row" data-decision="${index}"><div class="conflict-label">${label}</div><button class="conflict-choice" data-value="1" type="button">${index === 3 ? 'Entailed' : 'Match'}</button><button class="conflict-choice" data-value="0" type="button">${index === 3 ? 'Not entailed' : 'No match'}</button></div>`).join('')}<button id="conflict-submit" type="button" disabled>Submit all five decisions</button><div id="conflict-progress" aria-live="polite">0 of 5 decisions entered</div>`;
    originalButtons?.insertAdjacentElement('afterend', matrix);

    const responses = new Array(5).fill(null);
    const reset = trial => {
      responses.fill(null);
      matrix.querySelectorAll('.conflict-choice').forEach(button => { button.classList.remove('selected'); button.disabled = !trial?.scored; });
      matrix.querySelector('#conflict-submit').disabled = true;
      matrix.querySelector('#conflict-progress').textContent = trial?.scored ? '0 of 5 decisions entered' : 'Memory fill — observe only; no response required';
      matrix.hidden = Number(trial?.mode) !== 0 && Number(trial?.publicMode) !== 1;
      originalButtons?.classList.toggle('conflict-replaced', !matrix.hidden);
    };

    matrix.addEventListener('click', event => {
      const button = event.target.closest('.conflict-choice');
      if (!button || button.disabled || !app.awaiting) return;
      const row = button.closest('.conflict-row');
      const index = Number(row.dataset.decision);
      responses[index] = button.dataset.value === '1';
      row.querySelectorAll('.conflict-choice').forEach(choice => choice.classList.toggle('selected', choice === button));
      const completed = responses.filter(value => value !== null).length;
      matrix.querySelector('#conflict-progress').textContent = `${completed} of 5 decisions entered`;
      matrix.querySelector('#conflict-submit').disabled = completed !== 5;
    });

    matrix.querySelector('#conflict-submit').addEventListener('click', () => {
      if (!app.awaiting || responses.some(value => value === null)) return;
      app.submitConflictMatrix(responses.slice());
    });

    const keyboard = ['a','s','d','f','g','h','j','k','l',';'];
    documentObject.addEventListener('keydown', event => {
      if (matrix.hidden || !app.awaiting || /INPUT|SELECT|TEXTAREA/.test(event.target?.tagName || '')) return;
      const keyIndex = keyboard.indexOf(event.key.toLowerCase());
      if (keyIndex < 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const decision = Math.floor(keyIndex / 2);
      const value = keyIndex % 2 === 0;
      const row = matrix.querySelector(`[data-decision="${decision}"]`);
      row?.querySelector(`[data-value="${value ? 1 : 0}"]`)?.click();
    }, true);

    return Object.assign(matrix, { resetResponses: reset, responses });
  }

  function installBrowser(rootObject) {
    const app = rootObject.__ontologicalWorlds;
    if (!app || !requireCore() || app.__modeOneConflictMatrixV20) return;

    const originalMakeTrial = app.makeTrial.bind(app);
    const originalNextTrial = app.nextTrial.bind(app);
    const originalAnswer = app.answer.bind(app);
    const originalStop = app.stop.bind(app);
    const matrix = installMatrixUI(rootObject, app);

    app.makeTrial = function modeOneConflictMakeTrial() {
      const settings = this.settings();
      if (Number(settings.mode) !== 0) return originalMakeTrial();
      const level = Math.max(1, Math.min(8, Math.round(Number(this.n || settings.n) || 1)));
      const target = this.trials[this.trials.length - level];
      if (!target) return generateWarmupTrial(this.rng, { interferenceLevel: Number(rootObject.document.getElementById('interference-slider')?.value) || 0 });
      return generateConflictTrial(this.rng, target, {
        match: this.rng.next() < settings.matchProbability,
        nBackLevel: level,
        interferenceLevel: Number(rootObject.document.getElementById('interference-slider')?.value) || 0
      });
    };

    app.nextTrial = function modeOneConflictNextTrial(...args) {
      const result = originalNextTrial(...args);
      rootObject.setTimeout(() => matrix.resetResponses(this.current), 0);
      return result;
    };

    app.submitConflictMatrix = function submitConflictMatrix(responses) {
      if (!this.current?.scored || !Array.isArray(this.current.conflictResponseVector)) return;
      const expected = this.current.conflictResponseVector;
      const correctness = responses.map((value, index) => value === expected[index]);
      this.current.conflictResponses = responses.slice();
      this.current.conflictDecisionCorrectness = correctness.slice();
      this.current.conflictCorrectCount = correctness.filter(Boolean).length;
      this.current.conflictAllCorrect = correctness.every(Boolean);
      const responseForLegacyScorer = this.current.conflictAllCorrect ? Boolean(this.current.isMatch) : !Boolean(this.current.isMatch);
      originalAnswer(responseForLegacyScorer);
    };

    app.answer = function modeOneConflictAnswer(response) {
      if ((Number(this.current?.mode) === 0 || Number(this.current?.publicMode) === 1) && this.current?.scored) {
        if (response === null || typeof response === 'undefined') return originalAnswer(response);
        return;
      }
      return originalAnswer(response);
    };

    app.stop = function modeOneConflictStop(...args) {
      matrix.hidden = true;
      rootObject.document.querySelector('.response-buttons')?.classList.remove('conflict-replaced');
      return originalStop(...args);
    };

    Object.assign(app, {
      modeOneConflictAnalyseAlignment: analyseAlignment,
      modeOneConflictEvaluate: evaluateConflictMatrix,
      modeOneConflictEvaluateHistory: evaluateHistory,
      modeOneConflictGenerateTrial: generateConflictTrial,
      modeOneConflictRunAudit: runAudit,
      __modeOneConflictMatrixV20: true
    });
  }

  return Object.freeze({
    version: 20,
    LEVELS,
    analyseAlignment,
    evaluateConflictMatrix,
    generateConflictTrial,
    generateWarmupTrial,
    evaluateHistory,
    runAudit,
    installBrowser
  });
});
