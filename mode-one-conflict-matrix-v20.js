'use strict';

(function exposeModeOneConflictMatrix(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.__modeOneConflictMatrixV20 = api;
    if (typeof root.addEventListener === 'function') root.addEventListener('DOMContentLoaded', () => api.installBrowser(root));
  }
})(typeof window !== 'undefined' ? window : globalThis, root => {
  const LEVELS = Object.freeze([1,2,3,4,5,6,7,8]);
  const LETTER_POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
  const ALL_MASKS = Object.freeze([[false,false,false],[true,false,false],[false,true,false],[false,false,true],[true,true,false],[true,false,true],[false,true,true],[true,true,true]]);
  const core = root?.__modeOneTriadicEntailmentCore || root?.__modeOneSpatialCore || (typeof require === 'function' ? require('./mode-one-spatial-core.js') : null);
  function requireCore() { if (!core) throw new Error('Mode 1 conflict matrix requires the spatial core.'); return core; }
  const clone = value => JSON.parse(JSON.stringify(value));
  const random = rng => rng?.next ? rng.next() : Math.random();
  const pick = (rng, values) => rng?.pick ? rng.pick(values) : values[Math.floor(random(rng) * values.length)];
  function fisherYates(rng, values) { const out = [...values]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random(rng) * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
  function shuffle(rng, values) { return rng?.shuffle ? rng.shuffle(values) : fisherYates(rng, values); }
  function statements(trial) { if (!trial || !Array.isArray(trial.premises) || trial.premises.length !== 2 || !trial.conclusion) throw new Error('A conflict trial requires two premises and one conclusion.'); return [...trial.premises, trial.conclusion]; }
  function trialLetters(trial) { return [...new Set(statements(trial).flatMap(s => [s.subject, s.object]))]; }
  function permutations(values) { if (values.length < 2) return [values.slice()]; return values.flatMap((v, i) => permutations(values.slice(0, i).concat(values.slice(i + 1))).map(rest => [v, ...rest])); }
  function canonicalStatement(statement, mapping) {
    const c = requireCore();
    const direct = `${mapping[statement.subject]}>${statement.relation}>${mapping[statement.object]}`;
    const inverse = `${mapping[statement.object]}>${c.opposite(statement.relation)}>${mapping[statement.subject]}`;
    return direct < inverse ? direct : inverse;
  }
  function analyseAlignment(target, current, options = {}) {
    const targetResolution = Number(target?.directionResolution || 16), currentResolution = Number(current?.directionResolution || 16);
    if (targetResolution !== currentResolution) throw new Error('N-back target and current trial use different compass resolutions.');
    const roleSensitive = Boolean(options.roleSensitive), targetLetters = trialLetters(target), currentLetters = trialLetters(current);
    if (targetLetters.length !== 3 || currentLetters.length !== 3) throw new Error('Conflict comparisons require exactly three letters in each trial.');
    const targetStatements = statements(target), currentStatements = statements(current), candidates = [];
    const assignments = roleSensitive ? [[0,1,2],[1,0,2]] : permutations([0,1,2]);
    const identity = Object.fromEntries(currentLetters.map(letter => [letter, letter]));
    const currentCanonical = currentStatements.map(s => canonicalStatement(s, identity));
    for (const assigned of permutations(currentLetters)) {
      const map = Object.fromEntries(targetLetters.map((letter, index) => [letter, assigned[index]]));
      const targetCanonical = targetStatements.map(s => canonicalStatement(s, map));
      for (const assignment of assignments) {
        const vector = currentStatements.map((_, i) => targetCanonical[assignment[i]] === currentCanonical[i]);
        const count = vector.filter(Boolean).length;
        candidates.push({ count, vector, assignment, map, key: `${3-count}|${vector.map(Number).join('')}|${assignment.join('')}|${targetLetters.map(l => map[l]).join('')}` });
      }
    }
    candidates.sort((a,b) => b.count - a.count || a.key.localeCompare(b.key));
    const best = candidates[0];
    return Object.freeze({ statementMatches: Object.freeze(best.vector.slice()), matchedCount: best.count, assignment: Object.freeze(best.assignment.slice()), letterMapping: Object.freeze({...best.map}), localStatementCompatibility: Object.freeze(best.vector.slice()), localMatchCount: best.count, mappingConflict: false, wholeTrialMatch: best.count === 3, roleSensitive, directionResolution: currentResolution });
  }
  function evaluateConflictMatrix(target, current, options = {}) {
    const alignment = analyseAlignment(target, current, options), entailment = requireCore().evaluateTrial(current);
    return Object.freeze({ ...alignment, conclusionEntailed: entailment.isEntailed, expectedRelation: entailment.expectedRelation, assertedRelation: entailment.assertedRelation, responseVector: Object.freeze([...alignment.statementMatches, entailment.isEntailed, alignment.wholeTrialMatch]) });
  }
  function renameAndTransform(rng, target) {
    const c = requireCore(), source = trialLetters(target), destination = shuffle(rng, LETTER_POOL).slice(0, 3);
    let trial = c.renameTrial(target, Object.fromEntries(source.map((letter, index) => [letter, destination[index]])));
    trial = clone(trial);
    if (random(rng) < .5) trial.premises.reverse();
    trial.premises = trial.premises.map(s => random(rng) < .5 ? c.invert(s) : s);
    if (random(rng) < .5) trial.conclusion = c.invert(trial.conclusion);
    trial.mode = 0; trial.publicMode = 1; trial.directionResolution = Number(target.directionResolution || 16);
    return trial;
  }
  function desiredMask(rng, requestedWholeMatch, interferenceLevel) {
    if (requestedWholeMatch) return [true,true,true];
    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    if (level < 34) return pick(rng, ALL_MASKS.slice(0,4)).slice();
    if (level < 67) return pick(rng, ALL_MASKS.slice(1,7)).slice();
    return pick(rng, ALL_MASKS.slice(4,7)).slice();
  }
  function resolutionMutationDistances(resolution, interferenceLevel) {
    const ringLength = Number(resolution), level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    const distances = [];
    for (let d = 1; d <= Math.floor(ringLength / 2); d++) distances.push(d);
    if (level >= 67) return distances;
    if (level >= 34) return distances.slice().sort((a,b) => Math.abs(a - ringLength/4) - Math.abs(b - ringLength/4));
    return distances.slice().sort((a,b) => b - a);
  }
  function mutateDirection(rng, statement, interferenceLevel = 0, directionResolution = 16) {
    const c = requireCore(), ring = c.allowedCodes(directionResolution), index = ring.indexOf(statement.relation);
    if (index < 0) throw new Error('Cannot mutate a relation outside the selected resolution.');
    const distances = resolutionMutationDistances(ring.length, interferenceLevel), distance = pick(rng, distances), sign = random(rng) < .5 ? -1 : 1;
    return { ...statement, relation: ring[(index + sign * distance + ring.length) % ring.length] };
  }
  function generateConflictTrial(rng, target, options = {}) {
    if (!target) throw new Error('A historical N-back target is required.');
    const c = requireCore();
    const resolution = c.normaliseResolution(options.directionResolution ?? target.directionResolution, 16);
    if (Number(target.directionResolution || resolution) !== resolution) throw new Error('Target resolution does not match session resolution.');
    const requestedWholeMatch = Boolean(options.match);
    const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
    const roleSensitive = Boolean(options.roleSensitive);
    if (requestedWholeMatch) {
      const trial = renameAndTransform(rng, target);
      const evaluation = evaluateConflictMatrix(target, trial, { roleSensitive });
      Object.assign(trial, {
        nBackRequestedMatch: true, nBackMatch: true, isMatch: true,
        statementMatchVector: evaluation.statementMatches.slice(),
        conclusionEntailed: evaluation.conclusionEntailed,
        conflictResponseVector: evaluation.responseVector.slice(),
        mappingConflict: evaluation.mappingConflict,
        localStatementCompatibility: evaluation.localStatementCompatibility.slice(),
        roleSensitive, directionResolution: resolution,
        interferenceProfile: `R${resolution}:${evaluation.statementMatches.map(Number).join('')}:${Number(evaluation.conclusionEntailed)}:1`,
        scored: true
      });
      return trial;
    }
    const pool = c.allowedCodes(resolution);
    for (let attempt = 0; attempt < 1000; attempt++) {
      const trial = c.generateTrial(rng, {
        matchProbability: random(rng) < 0.5 ? 1 : 0,
        interferenceLevel,
        directionResolution: resolution
      });
      trial.mode = 0; trial.publicMode = 1; trial.directionResolution = resolution;
      let evaluation;
      try { evaluation = evaluateConflictMatrix(target, trial, { roleSensitive }); } catch (_) { continue; }
      const relations = statements(trial).map(statement => statement.relation).concat(evaluation.expectedRelation);
      if (evaluation.wholeTrialMatch || !relations.every(code => pool.includes(code))) continue;
      Object.assign(trial, {
        nBackRequestedMatch: false, nBackMatch: false, isMatch: false,
        statementMatchVector: evaluation.statementMatches.slice(),
        conclusionEntailed: evaluation.conclusionEntailed,
        conflictResponseVector: evaluation.responseVector.slice(),
        mappingConflict: evaluation.mappingConflict,
        localStatementCompatibility: evaluation.localStatementCompatibility.slice(),
        roleSensitive, directionResolution: resolution,
        interferenceProfile: `R${resolution}:${evaluation.statementMatches.map(Number).join('')}:${Number(evaluation.conclusionEntailed)}:0`,
        scored: true
      });
      return trial;
    }
    throw new Error(`Unable to generate a ${resolution}-direction non-match trial.`);
  }
  function generateWarmupTrial(rng, options = {}) {
    const c = requireCore(), resolution = c.normaliseResolution(options.directionResolution, 16);
    const trial = c.generateTrial(rng, { matchProbability: random(rng) < .5 ? 1 : 0, interferenceLevel: options.interferenceLevel, directionResolution: resolution });
    const entailment = c.evaluateTrial(trial);
    Object.assign(trial, { mode: 0, publicMode: 1, nBackWarmup: true, scored: true, nBackRequestedMatch: false, nBackMatch: false, isMatch: false, statementMatchVector: [false,false,false], conclusionEntailed: entailment.isEntailed, conflictResponseVector: [false,false,false,entailment.isEntailed,false], mappingConflict: false, localStatementCompatibility: [false,false,false], roleSensitive: false, directionResolution: resolution, interferenceProfile: `R${resolution}:000:${Number(entailment.isEntailed)}:0` });
    return trial;
  }
  function evaluateHistory(history, currentIndex, nBackLevel, options = {}) {
    const level = Math.max(1, Math.min(8, Math.round(Number(nBackLevel) || 1))), targetIndex = currentIndex - level;
    if (targetIndex < 0) { const current = history[currentIndex], entailment = requireCore().evaluateTrial(current); return Object.freeze({ warmup: true, scored: true, isMatch: false, currentIndex, targetIndex, nBackLevel: level, statementMatches: Object.freeze([false,false,false]), conclusionEntailed: entailment.isEntailed, wholeTrialMatch: false, responseVector: Object.freeze([false,false,false,entailment.isEntailed,false]), directionResolution: current.directionResolution }); }
    const evaluation = evaluateConflictMatrix(history[targetIndex], history[currentIndex], options);
    return Object.freeze({ ...evaluation, warmup: false, scored: true, isMatch: evaluation.wholeTrialMatch, currentIndex, targetIndex, nBackLevel: level });
  }
  function installStyles(d) {
    if (d.getElementById('compass-resolution-style')) return;
    const style = d.createElement('style'); style.id = 'compass-resolution-style';
    style.textContent = `#direction-resolution-group[hidden]{display:none!important}#direction-resolution-help{font-size:.75rem;color:#43566d;line-height:1.42;margin:8px 0 0}#direction-resolution-error{font-size:.78rem;color:#a61f17;font-weight:800;margin:7px 0 0}#direction-resolution[aria-invalid="true"]{outline:3px solid rgba(180,35,24,.3);border-color:#b42318}#compass-resolution-status{font-size:.7rem;font-weight:850;letter-spacing:.06em;color:#31546f;text-align:center;margin:5px 0 0;text-transform:uppercase}`;
    d.head.appendChild(style);
  }
  function ensureResolutionUI(d, app) {
    installStyles(d);
    let group = d.getElementById('direction-resolution-group');
    if (!group) {
      group = d.createElement('div'); group.id = 'direction-resolution-group'; group.className = 'control-group';
      group.innerHTML = `<label for="direction-resolution">Compass directions</label><select id="direction-resolution" aria-describedby="direction-resolution-help direction-resolution-error" aria-invalid="false"><option value="">Choose direction count…</option><option value="4">4 directions</option><option value="8">8 directions</option><option value="16">16 directions — full resolution</option></select><p id="direction-resolution-help">4 uses north, east, south and west. 8 adds northeast, southeast, southwest and northwest. 16 adds the intermediate directions. Cognitive interference changes lure difficulty, not compass resolution.</p><p id="direction-resolution-error" role="alert" hidden>Choose 4, 8 or 16 compass directions before starting Mode 1.</p><div id="compass-resolution-status" aria-live="polite">Compass resolution: not selected</div>`;
      const nGroup = d.getElementById('n-slider')?.closest('.control-group');
      nGroup?.insertAdjacentElement('afterend', group);
    }
    const select = d.getElementById('direction-resolution'), error = d.getElementById('direction-resolution-error'), status = d.getElementById('compass-resolution-status'), start = d.getElementById('start-btn'), mode = d.getElementById('logic-mode');
    select.value = '';
    const getSelected = () => { const value = Number(select.value); return [4,8,16].includes(value) ? value : null; };
    const isModeOne = () => Number(mode?.value || 0) === 0;
    const clearError = () => { select.setAttribute('aria-invalid','false'); error.hidden = true; };
    const validate = (focus = true) => {
      if (!isModeOne()) return true;
      const resolution = getSelected();
      if (resolution) { clearError(); return true; }
      select.setAttribute('aria-invalid','true'); error.hidden = false; status.textContent = 'Compass resolution: not selected';
      if (focus) select.focus();
      return false;
    };
    const sync = () => {
      const modeOne = isModeOne(), resolution = getSelected(); group.hidden = !modeOne; select.disabled = Boolean(app.running);
      if (!modeOne) { start.disabled = Boolean(app.running); clearError(); }
      else if (!app.running) start.disabled = !resolution;
      status.textContent = resolution ? `Compass resolution: ${resolution} directions` : 'Compass resolution: not selected';
    };
    select.addEventListener('change', () => { if (getSelected()) clearError(); sync(); });
    mode?.addEventListener('change', sync);
    sync();
    return { group, select, getSelected, validate, sync };
  }
  function installMatrixInput(rootObject, app, matrix) {
    if (matrix.dataset.compassInputInstalled === 'true') return;
    matrix.dataset.compassInputInstalled = 'true';
    const d = rootObject.document, responses = new Array(5).fill(null), decisionTimes = new Array(5).fill(null);
    const clearFeedback = () => matrix.querySelectorAll('.conflict-choice').forEach(button => { button.classList.remove('feedback-correct','feedback-incorrect','selected'); button.querySelectorAll('.conflict-feedback-icon').forEach(icon => icon.remove()); });
    const showButtonFeedback = (button, correct) => {
      button.classList.add(correct ? 'feedback-correct' : 'feedback-incorrect');
      const icon = d.createElement('span'); icon.className = `conflict-feedback-icon ${correct ? 'correct' : 'incorrect'}`; icon.setAttribute('aria-hidden','true');
      icon.innerHTML = correct ? '<svg viewBox="0 0 64 64"><path d="M13 33l12 12L52 18" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<svg viewBox="0 0 64 64"><path d="M17 17l30 30M47 17L17 47" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/></svg>';
      button.appendChild(icon);
    };
    const reset = trial => {
      responses.fill(null); decisionTimes.fill(null); matrix.dataset.startedAt = String(Date.now()); clearFeedback();
      matrix.querySelectorAll('.conflict-choice').forEach(button => { button.disabled = !Boolean(trial?.scored); });
      const progress = matrix.querySelector('#conflict-progress'); if (progress) progress.textContent = trial?.scored ? '0 of 5 decisions entered' : '';
    };
    const handleButton = button => {
      if (!button || button.disabled || !app.awaiting) return;
      const row = button.closest('.conflict-row'), index = Number(row?.dataset.decision); if (!Number.isInteger(index) || responses[index] !== null) return;
      responses[index] = button.dataset.value === '1'; decisionTimes[index] = Date.now() - Number(matrix.dataset.startedAt || Date.now());
      row.querySelectorAll('.conflict-choice').forEach(choice => { choice.classList.toggle('selected', choice === button); choice.disabled = true; });
      const expected = app.current?.conflictResponseVector?.[index]; if (typeof expected === 'boolean') showButtonFeedback(button, responses[index] === expected);
      const completed = responses.filter(value => value !== null).length, progress = matrix.querySelector('#conflict-progress'); if (progress) progress.textContent = `${completed} of 5 decisions entered`;
      if (completed === 5) app.submitConflictMatrix(responses.slice(), decisionTimes.slice());
    };
    matrix.addEventListener('click', event => { const button = event.target.closest('.conflict-choice'); if (button) handleButton(button); });
    const keyboard = ['a','s','d','f','h','j','k','l',' ','n'];
    d.addEventListener('keydown', event => {
      if (!matrix.classList.contains('active') || !app.awaiting || /INPUT|SELECT|TEXTAREA/.test(event.target?.tagName || '')) return;
      const key = event.code === 'Space' ? ' ' : event.key.toLowerCase(), keyIndex = keyboard.indexOf(key); if (keyIndex < 0) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const decision = Math.floor(keyIndex / 2), value = keyIndex % 2 === 0;
      handleButton(matrix.querySelector(`[data-decision="${decision}"] [data-value="${value ? 1 : 0}"]`));
    }, true);
    return { reset };
  }
  function installBrowser(rootObject) {
    const app = rootObject.__ontologicalWorlds, d = rootObject.document; if (!app || !requireCore() || app.__mandatoryCompassResolutionInstalled) return;
    const matrix = d.getElementById('conflict-matrix'); if (!matrix) return;
    const ui = ensureResolutionUI(d, app), input = installMatrixInput(rootObject, app, matrix);
    const originalSettings = app.settings.bind(app), originalStart = app.start.bind(app), originalMakeTrial = app.makeTrial.bind(app), originalNextTrial = app.nextTrial.bind(app), originalStop = app.stop.bind(app);
    app.settings = function() { const settings = originalSettings(); return { ...settings, directionResolution: ui.getSelected() }; };
    app.getSelectedDirectionResolution = ui.getSelected;
    app.validateDirectionResolutionBeforeStart = ui.validate;
    app.start = async function(...args) {
      if (Number(originalSettings().mode) === 0) {
        if (!ui.validate(true)) return false;
        this.directionResolution = ui.getSelected(); ui.select.disabled = true; ui.sync();
      } else this.directionResolution = null;
      return originalStart(...args);
    };
    d.getElementById('start-btn')?.addEventListener('click', event => { if (Number(d.getElementById('logic-mode')?.value || 0) === 0 && !ui.validate(true)) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    d.addEventListener('keydown', event => { if (event.code === 'Space' && !app.running && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target?.tagName || '') && Number(d.getElementById('logic-mode')?.value || 0) === 0 && !ui.validate(true)) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    app.makeTrial = function() {
      const settings = originalSettings(); if (Number(settings.mode) !== 0) return originalMakeTrial();
      const resolution = requireCore().normaliseResolution(this.directionResolution, null); if (!resolution) throw new Error('Mode 1 cannot generate a trial without a frozen compass resolution.');
      const level = Math.max(1, Math.min(8, Math.round(Number(this.n || settings.n) || 1))), target = this.trials[this.trials.length - level], interferenceLevel = Number(d.getElementById('interference-slider')?.value) || 0;
      if (!target) return generateWarmupTrial(this.rng, { interferenceLevel, directionResolution: resolution });
      const requestedMatch = this.rng.next() < settings.matchProbability, options = { match: requestedMatch, interferenceLevel, roleSensitive: Boolean(this.trials.length % 2), directionResolution: resolution };
      for (let attempt = 0; attempt < 5; attempt++) { try { return generateConflictTrial(this.rng, target, options); } catch (error) { if (attempt === 4) console.warn('Resolution-aware conflict generation recovered.', error); } }
      return generateWarmupTrial(this.rng, { interferenceLevel, directionResolution: resolution });
    };
    const premiseDisplay = d.getElementById('premise-display'), feedback = d.getElementById('feedback'), explanation = d.getElementById('trial-explanation'), timerBar = d.getElementById('timer-bar');
    function schedule(token, seconds) { clearTimeout(app.timerId); const started = Date.now(); const update = () => { if (!timerBar || !app.running || app.paused || token !== app.sessionToken) return; const elapsed = (Date.now() - started) / 1000; timerBar.style.width = `${Math.max(0, 100 * (1 - elapsed / seconds))}%`; if (elapsed < seconds) rootObject.requestAnimationFrame?.(update); }; if (timerBar) { timerBar.style.width = '100%'; rootObject.requestAnimationFrame?.(update); } app.timerId = rootObject.setTimeout(() => { if (app.running && !app.paused && token === app.sessionToken) app.nextTrial(token); }, seconds * 1000); }
    app.nextTrial = function(token = this.sessionToken) {
      if (Number(originalSettings().mode) !== 0) return originalNextTrial(token);
      if (!this.running || this.paused || token !== this.sessionToken) return null;
      const trial = this.makeTrial(); this.current = trial; this.trials.push(trial); this.score.shown++; this.awaiting = true;
      const rendered = requireCore().renderTrial(trial); if (premiseDisplay) { premiseDisplay.textContent = rendered; premiseDisplay.classList.remove('correct','incorrect'); }
      if (feedback) feedback.textContent = ''; if (explanation) explanation.textContent = '';
      try { this.speak?.(rendered); } catch (_) {}
      input.reset(trial); try { this.updateStats?.(); } catch (_) {}
      schedule(token, Math.max(2, Number(originalSettings().seconds) || 8)); return trial;
    };
    app.submitConflictMatrix = function(responses, decisionTimes) {
      if (!this.current?.scored || !Array.isArray(this.current.conflictResponseVector) || !this.awaiting) return;
      const expected = this.current.conflictResponseVector, correctness = responses.map((value,index) => value === expected[index]);
      Object.assign(this.current, { conflictResponses: responses.slice(), conflictDecisionCorrectness: correctness.slice(), conflictCorrectCount: correctness.filter(Boolean).length, conflictAllCorrect: correctness.every(Boolean), conflictDecisionTimes: decisionTimes.slice(), directionResolution: this.directionResolution });
      this.awaiting = false; clearTimeout(this.timerId); if (feedback) feedback.textContent = this.current.conflictAllCorrect ? 'ALL FIVE CORRECT' : `${this.current.conflictCorrectCount}/5 CORRECT`; if (explanation) explanation.textContent = requireCore().explainTrial(this.current); try { this.updateStats?.(); } catch (_) {}
      rootObject.setTimeout(() => { if (this.running && !this.paused) this.nextTrial(this.sessionToken); }, 1600);
    };
    app.stop = function(...args) { const result = originalStop(...args); this.directionResolution = null; ui.select.disabled = false; ui.select.value = ''; ui.sync(); return result; };
    const tutorial = d.querySelector('#tutorial .modal-inner'); if (tutorial && !tutorial.querySelector('[data-compass-resolution-help]')) { const p = d.createElement('p'); p.dataset.compassResolutionHelp = 'true'; p.textContent = 'Before starting Mode 1, choose 4, 8 or 16 compass directions. Four uses the cardinal directions; eight adds the diagonals; sixteen adds the intermediate directions. Cognitive interference changes lure difficulty but never changes the selected compass resolution.'; tutorial.insertBefore(p, tutorial.querySelector('h3:nth-of-type(2)')); }
    Object.assign(app, { modeOneConflictAnalyseAlignment: analyseAlignment, modeOneConflictEvaluate: evaluateConflictMatrix, modeOneConflictEvaluateHistory: evaluateHistory, modeOneConflictGenerateTrial: generateConflictTrial, __mandatoryCompassResolutionInstalled: true, __modeOneConflictMatrixV20: true });
    ui.sync();
  }
  function runAudit(iterationsPerResolution = 2000) {
    class Rng { constructor(seed) { this.s = seed >>> 0; } next() { let v = this.s += 1831565813; v = Math.imul(v ^ v >>> 15, 1 | v); v ^= v + Math.imul(v ^ v >>> 7, 61 | v); return ((v ^ v >>> 14) >>> 0) / 4294967296; } pick(values) { return values[Math.floor(this.next() * values.length)]; } shuffle(values) { return fisherYates(this, values); } }
    const failures = [], rows = [];
    for (const resolution of [4,8,16]) {
      const rng = new Rng(0x61000000 + resolution), history = [], pool = requireCore().allowedCodes(resolution), row = { resolution, failures: 0 };
      for (let i = 0; i < iterationsPerResolution; i++) {
        try {
          const target = history.length ? history[Math.max(0, history.length - 1)] : null;
          const trial = target ? generateConflictTrial(rng, target, { match: i % 2 === 0, interferenceLevel: i % 101, directionResolution: resolution }) : generateWarmupTrial(rng, { interferenceLevel: i % 101, directionResolution: resolution });
          history.push(trial); const relations = statements(trial).map(s => s.relation).concat(requireCore().evaluateTrial(trial).expectedRelation);
          if (trial.directionResolution !== resolution || !relations.every(code => pool.includes(code)) || trial.conflictResponseVector.length !== 5) row.failures++;
        } catch (error) { row.failures++; if (failures.length < 20) failures.push(`${resolution}-${i}:${error.message}`); }
      }
      if (row.failures) failures.push(`resolution-${resolution}-summary`); rows.push(row);
    }
    return { passed: failures.length === 0, failures, rows, iterationsPerResolution };
  }
  return Object.freeze({ version: 40, LEVELS, ALL_MASKS, analyseAlignment, evaluateConflictMatrix, generateConflictTrial, generateWarmupTrial, evaluateHistory, mutateDirection, runAudit, installBrowser });
});
