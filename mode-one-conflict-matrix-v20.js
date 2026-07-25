'use strict';

(function exposeModeOneConflictMatrix(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.__modeOneConflictMatrixV20 = api;
    const install = () => api.installBrowser(root);
    if (root.document?.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();
  }
})(typeof window !== 'undefined' ? window : globalThis, root => {
  const LEVELS = Object.freeze([1,2,3,4,5,6,7,8]);
  const LETTER_POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
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
  function canonicalStatement(statement, mapping) { const c = requireCore(); const direct = `${mapping[statement.subject]}>${statement.relation}>${mapping[statement.object]}`; const inverse = `${mapping[statement.object]}>${c.opposite(statement.relation)}>${mapping[statement.subject]}`; return direct < inverse ? direct : inverse; }
  function ensureResolutionClosed(trial, expectedResolution) { const c = requireCore(); const resolution = c.normaliseResolution(expectedResolution ?? trial?.directionResolution, null); if (!resolution) return false; trial.directionResolution = resolution; const pool = c.allowedCodes(resolution); let evaluation; try { evaluation = c.evaluateTrial(trial); } catch (_) { return false; } const relations = statements(trial).map(item => item.relation).concat(evaluation.expectedRelation); return relations.every(code => pool.includes(code)); }
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
  function evaluateConflictMatrix(target, current, options = {}) { const alignment = analyseAlignment(target, current, options), entailment = requireCore().evaluateTrial(current); return Object.freeze({ ...alignment, conclusionEntailed: entailment.isEntailed, expectedRelation: entailment.expectedRelation, assertedRelation: entailment.assertedRelation, responseVector: Object.freeze([...alignment.statementMatches, entailment.isEntailed, alignment.wholeTrialMatch]) }); }
  function renameAndTransform(rng, target) { const c = requireCore(), source = trialLetters(target), destination = shuffle(rng, LETTER_POOL).slice(0, 3); let trial = c.renameTrial(target, Object.fromEntries(source.map((letter, index) => [letter, destination[index]]))); trial = clone(trial); if (random(rng) < .5) trial.premises.reverse(); trial.premises = trial.premises.map(s => random(rng) < .5 ? c.invert(s) : s); if (random(rng) < .5) trial.conclusion = c.invert(trial.conclusion); trial.mode = 0; trial.publicMode = 1; trial.directionResolution = Number(target.directionResolution || 16); return trial; }
  function oneStepMutations(statement, resolution) { const c = requireCore(), ring = c.allowedCodes(resolution), index = ring.indexOf(statement.relation); if (index < 0) return []; return [-1,1].map(sign => ({...statement, relation: ring[(index + sign + ring.length) % ring.length]})); }
  function mutateDirection(rng, statement, interferenceLevel = 0, directionResolution = 16) { const c = requireCore(), ring = c.allowedCodes(directionResolution), index = ring.indexOf(statement.relation); if (index < 0) throw new Error('Cannot mutate a relation outside the selected resolution.'); const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0)); let distance; if (level >= 85) distance = 1; else if (level >= 55) distance = Math.min(2, Math.floor(ring.length / 2)); else distance = Math.max(1, Math.floor(ring.length / 2)); const sign = random(rng) < .5 ? -1 : 1; return { ...statement, relation: ring[(index + sign * distance + ring.length) % ring.length] }; }
  function finaliseConflictTrial(target, trial, options) { const resolution = options.directionResolution, roleSensitive = Boolean(options.roleSensitive), evaluation = evaluateConflictMatrix(target, trial, { roleSensitive }), requestedWholeMatch = Boolean(options.match); Object.assign(trial, { nBackRequestedMatch: requestedWholeMatch, nBackMatch: evaluation.wholeTrialMatch, isMatch: evaluation.wholeTrialMatch, statementMatchVector: evaluation.statementMatches.slice(), conclusionEntailed: evaluation.conclusionEntailed, conflictResponseVector: evaluation.responseVector.slice(), mappingConflict: evaluation.mappingConflict, localStatementCompatibility: evaluation.localStatementCompatibility.slice(), roleSensitive, directionResolution: resolution, interferenceLevel: options.interferenceLevel, interferenceProfile: `R${resolution}:${evaluation.statementMatches.map(Number).join('')}:${Number(evaluation.conclusionEntailed)}:${Number(evaluation.wholeTrialMatch)}`, scored: true }); return trial; }
  function buildExactSingleConflictCandidates(rng, target, resolution) { const candidates = []; for (let transformAttempt = 0; transformAttempt < 40; transformAttempt++) { const source = renameAndTransform(rng, target); source.directionResolution = resolution; const base = statements(source).map(item => ({...item})); for (let index = 0; index < 3; index++) { for (const replacement of oneStepMutations(base[index], resolution)) { const trial = clone(source), items = base.map(item => ({...item})); items[index] = replacement; trial.premises = items.slice(0,2); trial.conclusion = items[2]; candidates.push(trial); } } } return candidates; }
  function generateConflictTrial(rng, target, options = {}) {
    if (!target) throw new Error('A historical N-back target is required.');
    const c = requireCore(), resolution = c.normaliseResolution(options.directionResolution ?? target.directionResolution, 16);
    if (!ensureResolutionClosed(target, resolution)) throw new Error('Target resolution does not match session resolution.');
    const requestedWholeMatch = Boolean(options.match), interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0)), roleSensitive = Boolean(options.roleSensitive);
    if (requestedWholeMatch) { const trial = renameAndTransform(rng, target); trial.directionResolution = resolution; if (!ensureResolutionClosed(trial, resolution)) throw new Error('Transformed match trial escaped the selected resolution.'); return finaliseConflictTrial(target, trial, { match: true, roleSensitive, directionResolution: resolution, interferenceLevel }); }
    const pool = c.allowedCodes(resolution), candidates = [];
    const addCandidate = trial => { if (!trial || !ensureResolutionClosed(trial, resolution)) return; let evaluation; try { evaluation = evaluateConflictMatrix(target, trial, { roleSensitive }); } catch (_) { return; } const relations = statements(trial).map(statement => statement.relation).concat(evaluation.expectedRelation); if (evaluation.wholeTrialMatch || !relations.every(code => pool.includes(code))) return; candidates.push({trial, evaluation}); };
    if (interferenceLevel >= 80) buildExactSingleConflictCandidates(rng, target, resolution).forEach(addCandidate);
    const genericCount = interferenceLevel >= 80 ? 80 : interferenceLevel >= 60 ? 120 : 80;
    for (let attempt = 0; attempt < genericCount; attempt++) { const source = renameAndTransform(rng, target); source.directionResolution = resolution; const items = statements(source).map(item => ({...item})), mutationCount = interferenceLevel >= 80 ? 1 : interferenceLevel >= 50 ? (random(rng) < .65 ? 1 : 2) : 2, indexes = shuffle(rng,[0,1,2]).slice(0,mutationCount); indexes.forEach(index => { items[index] = mutateDirection(rng, items[index], interferenceLevel, resolution); }); source.premises = items.slice(0,2); source.conclusion = items[2]; addCandidate(source); }
    if (!candidates.length) throw new Error(`Unable to generate a ${resolution}-direction non-match trial.`);
    const exactTwo = candidates.filter(item => item.evaluation.matchedCount === 2), exactOne = candidates.filter(item => item.evaluation.matchedCount === 1), selectedPool = interferenceLevel >= 95 ? (exactTwo.length ? exactTwo : exactOne.length ? exactOne : candidates) : interferenceLevel >= 75 ? (exactTwo.length ? exactTwo.concat(exactOne) : candidates) : candidates, selected = pick(rng, selectedPool);
    return finaliseConflictTrial(target, selected.trial, { match: false, roleSensitive, directionResolution: resolution, interferenceLevel });
  }
  function generateWarmupTrial(rng, options = {}) { const c = requireCore(), resolution = c.normaliseResolution(options.directionResolution, 16), trial = c.generateTrial(rng, { matchProbability: random(rng) < .5 ? 1 : 0, interferenceLevel: options.interferenceLevel, directionResolution: resolution }), entailment = c.evaluateTrial(trial); Object.assign(trial, { mode: 0, publicMode: 1, nBackWarmup: true, scored: true, nBackRequestedMatch: false, nBackMatch: false, isMatch: false, statementMatchVector: [false,false,false], conclusionEntailed: entailment.isEntailed, conflictResponseVector: [false,false,false,entailment.isEntailed,false], mappingConflict: false, localStatementCompatibility: [false,false,false], roleSensitive: false, directionResolution: resolution, interferenceLevel: options.interferenceLevel, interferenceProfile: `R${resolution}:000:${Number(entailment.isEntailed)}:0` }); return trial; }
  function evaluateHistory(history, currentIndex, nBackLevel, options = {}) { const level = Math.max(1, Math.min(8, Math.round(Number(nBackLevel) || 1))), targetIndex = currentIndex - level; if (targetIndex < 0) { const current = history[currentIndex], entailment = requireCore().evaluateTrial(current); return Object.freeze({ warmup: true, scored: true, isMatch: false, currentIndex, targetIndex, nBackLevel: level, statementMatches: Object.freeze([false,false,false]), conclusionEntailed: entailment.isEntailed, wholeTrialMatch: false, responseVector: Object.freeze([false,false,false,entailment.isEntailed,false]), directionResolution: current.directionResolution }); } const evaluation = evaluateConflictMatrix(history[targetIndex], history[currentIndex], options); return Object.freeze({ ...evaluation, warmup: false, scored: true, isMatch: evaluation.wholeTrialMatch, currentIndex, targetIndex, nBackLevel: level }); }
  function installStyles(d) { if (d.getElementById('compass-resolution-style')) return; const style = d.createElement('style'); style.id = 'compass-resolution-style'; style.textContent = `#direction-resolution-group[hidden]{display:none!important}#direction-resolution-help{font-size:.75rem;color:#43566d;line-height:1.42;margin:8px 0 0}#direction-resolution-error{font-size:.78rem;color:#a61f17;font-weight:800;margin:7px 0 0}#direction-resolution[aria-invalid="true"]{outline:3px solid rgba(180,35,24,.3);border-color:#b42318}#direction-resolution-status{font-size:.7rem;font-weight:850;letter-spacing:.06em;color:#31546f;text-align:center;margin:5px 0 0;text-transform:uppercase}`; d.head.appendChild(style); }
  function ensureResolutionUI(d, app) {
    installStyles(d);
    const group = d.getElementById('direction-resolution-group'), select = d.getElementById('direction-resolution'), error = d.getElementById('direction-resolution-error'), status = d.getElementById('direction-resolution-status'), start = d.getElementById('start-btn'), mode = d.getElementById('logic-mode');
    if (!group || !select || !error || !status || !start || !mode) throw new Error('Compass-resolution UI is incomplete.');
    select.value = '';
    const getSelected = () => { const value = Number(select.value); return [4,8,16].includes(value) ? value : null; };
    const isModeOne = () => Number(mode.value || 0) === 0;
    const clearError = () => { select.setAttribute('aria-invalid','false'); error.hidden = true; };
    const sync = () => { const modeOne = isModeOne(), resolution = getSelected(); group.hidden = !modeOne; select.disabled = Boolean(app.running) || !modeOne; if (!app.running) start.disabled = modeOne ? resolution === null : false; status.textContent = resolution ? `COMPASS RESOLUTION: ${resolution} DIRECTIONS` : 'COMPASS RESOLUTION: NOT SELECTED'; if (resolution || !modeOne) clearError(); return resolution; };
    const validate = (focus = true) => { if (!isModeOne()) return true; const resolution = sync(); if (resolution) return true; select.setAttribute('aria-invalid','true'); error.hidden = false; if (focus) select.focus(); return false; };
    select.addEventListener('input', sync); select.addEventListener('change', sync); mode.addEventListener('change', sync); root.addEventListener?.('pageshow', sync); sync();
    return { group, select, getSelected, validate, sync };
  }
  function installMatrixInput(rootObject, app, matrix) {
    if (matrix.dataset.compassInputInstalled === 'true') return matrix.__inputApi;
    matrix.dataset.compassInputInstalled = 'true';
    const d = rootObject.document, responses = new Array(5).fill(null), decisionTimes = new Array(5).fill(null);
    const clearFeedback = () => matrix.querySelectorAll('.conflict-choice').forEach(button => { button.classList.remove('feedback-correct','feedback-incorrect','selected'); button.querySelectorAll('.conflict-feedback-icon').forEach(icon => icon.remove()); });
    const showButtonFeedback = (button, correct) => { button.classList.add(correct ? 'feedback-correct' : 'feedback-incorrect'); const icon = d.createElement('span'); icon.className = `conflict-feedback-icon ${correct ? 'correct' : 'incorrect'}`; icon.setAttribute('aria-hidden','true'); icon.innerHTML = correct ? '<svg viewBox="0 0 64 64"><path d="M13 33l12 12L52 18" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<svg viewBox="0 0 64 64"><path d="M17 17l30 30M47 17L17 47" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>'; button.appendChild(icon); };
    const reset = trial => { responses.fill(null); decisionTimes.fill(null); matrix.dataset.startedAt = String(Date.now()); matrix.dataset.submitting = 'false'; clearFeedback(); matrix.classList.add('active'); matrix.querySelectorAll('.conflict-choice').forEach(button => { button.disabled = !Boolean(trial?.scored); }); const progress = matrix.querySelector('#conflict-progress'); if (progress) progress.textContent = trial?.scored ? '0 of 5 decisions entered' : ''; };
    const handleButton = button => { if (!button || button.disabled || !app.awaiting || matrix.dataset.submitting === 'true') return; const row = button.closest('.conflict-row'), index = Number(row?.dataset.decision); if (!Number.isInteger(index) || responses[index] !== null) return; responses[index] = button.dataset.value === '1'; decisionTimes[index] = Date.now() - Number(matrix.dataset.startedAt || Date.now()); row.querySelectorAll('.conflict-choice').forEach(choice => { choice.classList.toggle('selected', choice === button); choice.disabled = true; }); const expected = app.current?.conflictResponseVector?.[index]; if (typeof expected === 'boolean') showButtonFeedback(button, responses[index] === expected); const completed = responses.filter(value => value !== null).length, progress = matrix.querySelector('#conflict-progress'); if (progress) progress.textContent = `${completed} of 5 decisions entered`; if (completed === 5) { matrix.dataset.submitting = 'true'; app.submitConflictMatrix(responses.slice(), decisionTimes.slice()); } };
    matrix.addEventListener('click', event => { const button = event.target.closest('.conflict-choice'); if (button) handleButton(button); });
    const keyboard = ['a','s','d','f','h','j','k','l',' ','n'];
    d.addEventListener('keydown', event => { if (!matrix.classList.contains('active') || !app.awaiting || /INPUT|SELECT|TEXTAREA/.test(event.target?.tagName || '')) return; const key = event.code === 'Space' ? ' ' : event.key.toLowerCase(), keyIndex = keyboard.indexOf(key); if (keyIndex < 0) return; event.preventDefault(); event.stopImmediatePropagation(); const decision = Math.floor(keyIndex / 2), value = keyIndex % 2 === 0; handleButton(matrix.querySelector(`[data-decision="${decision}"] [data-value="${value ? 1 : 0}"]`)); }, true);
    return matrix.__inputApi = { reset };
  }
  function installBrowser(rootObject) {
    const app = rootObject.__ontologicalWorlds, d = rootObject.document;
    if (!app || !requireCore() || app.__mandatoryCompassResolutionInstalled) return;
    const matrix = d.getElementById('conflict-matrix');
    if (!matrix) return;
    const ui = ensureResolutionUI(d, app), input = installMatrixInput(rootObject, app, matrix);
    const originalSettings = app.settings.bind(app), originalStart = app.start.bind(app), originalMakeTrial = app.makeTrial.bind(app), originalNextTrial = app.nextTrial.bind(app), originalStop = app.stop.bind(app), originalTogglePause = app.togglePause?.bind(app);
    const premiseDisplay = d.getElementById('premise-display'), feedback = d.getElementById('feedback'), explanation = d.getElementById('trial-explanation');
    let advanceTimerId = null;
    app.settings = function() { const settings = originalSettings(); return { ...settings, directionResolution: this.running ? this.directionResolution : ui.getSelected() }; };
    app.getSelectedDirectionResolution = ui.getSelected;
    app.validateDirectionResolutionBeforeStart = ui.validate;
    app.makeTrial = function() {
      const mode = Number(originalSettings().mode);
      if (mode !== 0) return originalMakeTrial();
      const resolution = requireCore().normaliseResolution(this.directionResolution, null);
      if (!resolution) throw new Error('Mode 1 cannot generate a trial without a frozen compass resolution.');
      const settings = originalSettings(), level = Math.max(1, Math.min(8, Math.round(Number(this.n || settings.n) || 1)));
      let target = this.trials[this.trials.length - level];
      if (target && !ensureResolutionClosed(target, resolution)) { this.trials = []; target = null; }
      const interferenceLevel = Number(d.getElementById('interference-slider')?.value) || 0;
      if (!target) return generateWarmupTrial(this.rng, { interferenceLevel, directionResolution: resolution });
      const requestedMatch = this.rng.next() < settings.matchProbability;
      return generateConflictTrial(this.rng, target, { match: requestedMatch, interferenceLevel, roleSensitive: true, directionResolution: resolution });
    };
    app.nextTrial = function(token = this.sessionToken) {
      if (Number(originalSettings().mode) !== 0) return originalNextTrial(token);
      if (!this.running || this.paused || token !== this.sessionToken) return null;
      clearTimeout(this.timerId); clearTimeout(advanceTimerId); advanceTimerId = null;
      const resolution = requireCore().normaliseResolution(this.directionResolution, null);
      if (!resolution) throw new Error('Mode 1 has no frozen compass resolution.');
      let trial = null, lastError = null;
      for (let attempt = 0; attempt < 12 && !trial; attempt++) {
        try { const candidate = attempt === 0 ? this.makeTrial() : generateWarmupTrial(this.rng, { interferenceLevel: Number(d.getElementById('interference-slider')?.value) || 0, directionResolution: resolution }); if (ensureResolutionClosed(candidate, resolution)) trial = candidate; }
        catch (error) { lastError = error; }
      }
      if (!trial) throw lastError || new Error('Mode 1 could not generate a valid first trial.');
      this.current = trial; this.trials.push(trial); this.score.shown++; this.awaiting = true;
      const rendered = requireCore().renderTrial(trial);
      if (premiseDisplay) { premiseDisplay.textContent = rendered; premiseDisplay.classList.remove('correct','incorrect'); }
      if (feedback) feedback.textContent = ''; if (explanation) explanation.textContent = '';
      input.reset(trial);
      try { this.speak?.(rendered); } catch (_) {}
      try { this.updateStats?.(); } catch (_) {}
      return trial;
    };
    app.start = function(...args) {
      const mode = Number(originalSettings().mode);
      if (mode !== 0) return originalStart(...args);
      if (this.running) return false;
      if (!ui.validate(true)) return false;
      this.directionResolution = ui.getSelected();
      this.trials = [];
      return originalStart(...args);
    };
    app.submitConflictMatrix = function(responses, decisionTimes) {
      if (!this.current?.scored || !Array.isArray(this.current.conflictResponseVector) || !this.awaiting || this.current.submitted) return;
      this.current.submitted = true;
      const expected = this.current.conflictResponseVector, correctness = responses.map((value,index) => value === expected[index]);
      Object.assign(this.current, { conflictResponses: responses.slice(), conflictDecisionCorrectness: correctness.slice(), conflictCorrectCount: correctness.filter(Boolean).length, conflictAllCorrect: correctness.every(Boolean), conflictDecisionTimes: decisionTimes.slice(), directionResolution: this.directionResolution });
      this.awaiting = false;
      clearTimeout(this.timerId); clearTimeout(advanceTimerId);
      if (feedback) feedback.textContent = this.current.conflictAllCorrect ? 'ALL FIVE CORRECT' : `${this.current.conflictCorrectCount}/5 CORRECT`;
      if (explanation) explanation.textContent = requireCore().explainTrial(this.current);
      try { this.updateStats?.(); } catch (_) {}
      const token = this.sessionToken;
      advanceTimerId = rootObject.setTimeout(() => { advanceTimerId = null; if (this.running && !this.paused && token === this.sessionToken) this.nextTrial(token); }, 1600);
    };
    if (originalTogglePause) app.togglePause = function(...args) { const wasPaused = this.paused, result = originalTogglePause(...args); if (wasPaused && !this.paused && this.current && !this.current.submitted) { this.awaiting = true; return result; } return result; };
    app.stop = function(...args) { clearTimeout(advanceTimerId); advanceTimerId = null; const result = originalStop(...args); this.directionResolution = null; ui.select.value = ''; matrix.classList.remove('active'); ui.sync(); return result; };
    app.__mandatoryCompassResolutionInstalled = true;
    ui.sync();
  }
  function runConflictAudit(iterationsPerResolution = 1000) { class AuditRng { constructor(seed) { this.s=seed>>>0; } next(){let v=this.s+=1831565813;v=Math.imul(v^v>>>15,1|v);v^=v+Math.imul(v^v>>>7,61|v);return((v^v>>>14)>>>0)/4294967296;} pick(values){return values[Math.floor(this.next()*values.length)];} shuffle(values){return fisherYates(this,values);} } const failures=[], rows=[]; for (const resolution of [4,8,16]) { const rng=new AuditRng(0x61000000+resolution), row={resolution,failures:0,exactTwo:0,nonMatches:0}; let target=generateWarmupTrial(rng,{interferenceLevel:100,directionResolution:resolution}); for(let i=0;i<iterationsPerResolution;i++){ try{ const trial=generateConflictTrial(rng,target,{match:false,interferenceLevel:100,roleSensitive:true,directionResolution:resolution}); const evaluation=evaluateConflictMatrix(target,trial,{roleSensitive:true}); row.nonMatches++; if(evaluation.matchedCount===2) row.exactTwo++; if(evaluation.wholeTrialMatch||!ensureResolutionClosed(trial,resolution)||evaluation.matchedCount!==2) row.failures++; target=trial; }catch(error){row.failures++;if(failures.length<20)failures.push(`${resolution}-${i}:${error.message}`);} } if(row.failures) failures.push(`resolution-${resolution}-summary`); rows.push(row); } return {passed:failures.length===0,failures,iterationsPerResolution,rows}; }
  return { version: 20, LEVELS, analyseAlignment, evaluateConflictMatrix, generateConflictTrial, generateWarmupTrial, evaluateHistory, installBrowser, runAudit: runConflictAudit, runConflictAudit, ensureResolutionClosed, mutateDirection };
});
