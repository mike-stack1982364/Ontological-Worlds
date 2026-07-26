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
  const spatial = core ? Object.freeze({
    normaliseResolution: core.normaliseResolution.bind(core),
    allowedCodes: core.allowedCodes.bind(core),
    evaluateTrial: core.evaluateTrial.bind(core),
    renderTrial: core.renderTrial.bind(core),
    explainTrial: core.explainTrial.bind(core),
    generateTrial: core.generateTrial.bind(core),
    opposite: core.opposite.bind(core)
  }) : null;
  function requireSpatial() { if (!spatial) throw new Error('Mode 1 spatial primitives are unavailable.'); return spatial; }
  const clone = value => JSON.parse(JSON.stringify(value));
  const random = rng => rng?.next ? rng.next() : Math.random();
  const pick = (rng, values) => rng?.pick ? rng.pick(values) : values[Math.floor(random(rng) * values.length)];
  function fisherYates(rng, values) { const out = [...values]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random(rng) * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
  function shuffle(rng, values) { return rng?.shuffle ? rng.shuffle(values) : fisherYates(rng, values); }
  function statements(trial) { if (!trial || !Array.isArray(trial.premises) || trial.premises.length !== 2 || !trial.conclusion) throw new Error('A conflict trial requires two premises and one conclusion.'); return [...trial.premises, trial.conclusion]; }
  function trialLetters(trial) { return [...new Set(statements(trial).flatMap(s => [s.subject, s.object]))]; }
  function permutations(values) { if (values.length < 2) return [values.slice()]; return values.flatMap((v, i) => permutations(values.slice(0, i).concat(values.slice(i + 1))).map(rest => [v, ...rest])); }
  function clearPresentationState(trial) { if (!trial || typeof trial !== 'object') return trial; ['submitted','conflictResponses','conflictDecisionCorrectness','conflictCorrectCount','conflictAllCorrect','conflictDecisionTimes','started','_answered'].forEach(key => { delete trial[key]; }); return trial; }
  function canonicalStatement(statement, mapping) { const c = requireSpatial(); const direct = `${mapping[statement.subject]}>${statement.relation}>${mapping[statement.object]}`; const inverse = `${mapping[statement.object]}>${c.opposite(statement.relation)}>${mapping[statement.subject]}`; return direct < inverse ? direct : inverse; }
  function ensureResolutionClosed(trial, expectedResolution) { const c = requireSpatial(); const resolution = c.normaliseResolution(expectedResolution ?? trial?.directionResolution, null); if (!resolution) return false; trial.directionResolution = resolution; const pool = c.allowedCodes(resolution); let evaluation; try { evaluation = c.evaluateTrial(trial); } catch (_) { return false; } const relations = statements(trial).map(item => item.relation).concat(evaluation.expectedRelation); return relations.every(code => pool.includes(code)); }
  function analyseAlignment(target, current, options = {}) {
    const targetResolution = Number(target?.directionResolution || 16), currentResolution = Number(current?.directionResolution || 16);
    if (targetResolution !== currentResolution) throw new Error('N-back target and current trial use different compass resolutions.');
    const roleSensitive = Boolean(options.roleSensitive), targetLetters = trialLetters(target), currentLetters = trialLetters(current);
    if (targetLetters.length !== 3 || currentLetters.length !== 3) throw new Error('Conflict comparisons require exactly three letters in each trial.');
    const targetStatements = statements(target), currentStatements = statements(current), candidates = [];
    const assignments = roleSensitive ? [[0,1,2]] : permutations([0,1,2]);
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
  function evaluateConflictMatrix(target, current, options = {}) { const alignment = analyseAlignment(target, current, options), entailment = requireSpatial().evaluateTrial(current); return Object.freeze({ ...alignment, conclusionEntailed: entailment.isEntailed, expectedRelation: entailment.expectedRelation, assertedRelation: entailment.assertedRelation, responseVector: Object.freeze([...alignment.statementMatches, entailment.isEntailed, alignment.wholeTrialMatch]) }); }
  function statementSurfaceKey(statement) { return `${statement.subject}>${statement.relation}>${statement.object}`; }
  function declaredEditProfile(reference, current) {
    const before = statements(reference), after = statements(current);
    const changedStatements = before.map((statement,index) => statementSurfaceKey(statement) !== statementSurfaceKey(after[index]));
    const changedDirections = before.map((statement,index) => statement.relation !== after[index].relation);
    const unchangedStatementCount = changedStatements.filter(value => !value).length;
    const visibleEditCount = changedStatements.filter(Boolean).length;
    const directionEditCount = changedDirections.filter(Boolean).length;
    return Object.freeze({ changedStatements:Object.freeze(changedStatements), changedDirections:Object.freeze(changedDirections), unchangedStatementCount, visibleEditCount, directionEditCount });
  }
  function continuityProfile(reference, current) {
    const profile = declaredEditProfile(reference, current);
    const referenceLetters = new Set(trialLetters(reference)), currentLetters = new Set(trialLetters(current));
    const retainedLetters = [...referenceLetters].filter(letter => currentLetters.has(letter));
    const replacedLetters = [...referenceLetters].filter(letter => !currentLetters.has(letter));
    const introducedLetters = [...currentLetters].filter(letter => !referenceLetters.has(letter));
    const valid = retainedLetters.length === 2 && replacedLetters.length === 1 && introducedLetters.length === 1 && profile.directionEditCount === 1 && profile.visibleEditCount >= 1 && profile.visibleEditCount <= 2 && profile.unchangedStatementCount >= 1;
    return Object.freeze({ ...profile, retainedLetters:Object.freeze(retainedLetters), replacedLetters:Object.freeze(replacedLetters), introducedLetters:Object.freeze(introducedLetters), valid });
  }
  function mutateDirectionAt(statement, rng, interferenceLevel, directionResolution) {
    const c = requireSpatial(), ring = c.allowedCodes(directionResolution), index = ring.indexOf(statement.relation);
    if (index < 0) throw new Error('Cannot mutate a relation outside the selected resolution.');
    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    const distance = level >= 85 ? 1 : level >= 55 ? Math.min(2, Math.floor(ring.length / 2)) : Math.max(1, Math.floor(ring.length / 2));
    const sign = random(rng) < .5 ? -1 : 1;
    return { ...statement, relation: ring[(index + sign * distance + ring.length) % ring.length] };
  }
  function buildEditedCandidate(rng, reference, options) {
    const edited = clearPresentationState(clone(reference));
    const sourceLetters = trialLetters(reference);
    const oldLetter = pick(rng, sourceLetters);
    const available = LETTER_POOL.filter(letter => !sourceLetters.includes(letter));
    const newLetter = pick(rng, available);
    const replace = statement => ({ ...statement, subject: statement.subject === oldLetter ? newLetter : statement.subject, object: statement.object === oldLetter ? newLetter : statement.object });
    edited.premises = edited.premises.map(replace);
    edited.conclusion = replace(edited.conclusion);
    const items = statements(edited).map(item => ({...item}));
    const directionIndex = pick(rng, [0,1,2]);
    items[directionIndex] = mutateDirectionAt(items[directionIndex], rng, options.interferenceLevel, options.directionResolution);
    edited.premises = items.slice(0,2);
    edited.conclusion = items[2];
    edited.mode = 0;
    edited.publicMode = 1;
    edited.directionResolution = options.directionResolution;
    edited.editScript = { referenceOffset: options.referenceOffset, replacedLetter: oldLetter, introducedLetter: newLetter, directionIndex, visibleEditBudget: 2 };
    return edited;
  }
  function finaliseConflictTrial(target, continuityReference, trial, options) {
    clearPresentationState(trial);
    const resolution = options.directionResolution, roleSensitive = Boolean(options.roleSensitive), evaluation = evaluateConflictMatrix(target, trial, { roleSensitive }), continuity = continuityProfile(continuityReference, trial), requestedWholeMatch = Boolean(options.match);
    Object.assign(trial, { submitted: false, nBackRequestedMatch: requestedWholeMatch, nBackMatch: evaluation.wholeTrialMatch, isMatch: evaluation.wholeTrialMatch, statementMatchVector: evaluation.statementMatches.slice(), conclusionEntailed: evaluation.conclusionEntailed, conflictResponseVector: evaluation.responseVector.slice(), mappingConflict: evaluation.mappingConflict, localStatementCompatibility: evaluation.localStatementCompatibility.slice(), roleSensitive, directionResolution: resolution, interferenceLevel: options.interferenceLevel, continuityReferenceOffset: options.referenceOffset, continuityProfile: continuity, interferenceProfile: `R${resolution}:${evaluation.statementMatches.map(Number).join('')}:${Number(evaluation.conclusionEntailed)}:${Number(evaluation.wholeTrialMatch)}:V${continuity.visibleEditCount}:D${continuity.directionEditCount}:L${continuity.retainedLetters.length}`, scored: true });
    return trial;
  }
  function generateConflictTrial(rng, target, options = {}) {
    if (!target) throw new Error('A historical N-back target is required.');
    const continuityReference = options.continuityReference || target, c = requireSpatial(), resolution = c.normaliseResolution(options.directionResolution ?? target.directionResolution, 16);
    if (!ensureResolutionClosed(target, resolution) || !ensureResolutionClosed(continuityReference, resolution)) throw new Error('Historical trial resolution does not match session resolution.');
    const requestedWholeMatch = Boolean(options.match), interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0)), roleSensitive = Boolean(options.roleSensitive), pool = c.allowedCodes(resolution), candidates = [];
    for (let attempt = 0; attempt < 5000; attempt++) {
      const trial = buildEditedCandidate(rng, continuityReference, { interferenceLevel, directionResolution: resolution, referenceOffset: options.referenceOffset });
      if (!ensureResolutionClosed(trial, resolution)) continue;
      const continuity = continuityProfile(continuityReference, trial);
      if (!continuity.valid) continue;
      let evaluation;
      try { evaluation = evaluateConflictMatrix(target, trial, { roleSensitive }); } catch (_) { continue; }
      const relations = statements(trial).map(statement => statement.relation).concat(evaluation.expectedRelation);
      if (!relations.every(code => pool.includes(code))) continue;
      if (evaluation.wholeTrialMatch !== requestedWholeMatch) continue;
      candidates.push({trial: clearPresentationState(trial), evaluation, continuity});
      if (candidates.length >= 80) break;
    }
    if (!candidates.length) throw new Error(`Unable to generate an N-relative continuity-safe ${resolution}-direction ${requestedWholeMatch ? 'match' : 'non-match'} trial.`);
    const preferred = requestedWholeMatch ? candidates.filter(item => item.evaluation.matchedCount === 3) : interferenceLevel >= 75 ? candidates.filter(item => item.evaluation.matchedCount >= 1 && item.evaluation.matchedCount <= 2) : candidates;
    const selected = pick(rng, preferred.length ? preferred : candidates);
    return finaliseConflictTrial(target, continuityReference, selected.trial, { match: requestedWholeMatch, roleSensitive, directionResolution: resolution, interferenceLevel, referenceOffset: options.referenceOffset });
  }
  function generateWarmupTrial(rng, options = {}) { const c = requireSpatial(), resolution = c.normaliseResolution(options.directionResolution, 16), trial = c.generateTrial(rng, { matchProbability: random(rng) < .5 ? 1 : 0, interferenceLevel: options.interferenceLevel, directionResolution: resolution }), entailment = c.evaluateTrial(trial); Object.assign(trial, { submitted: false, mode: 0, publicMode: 1, nBackWarmup: true, scored: true, nBackRequestedMatch: false, nBackMatch: false, isMatch: false, statementMatchVector: [false,false,false], conclusionEntailed: entailment.isEntailed, conflictResponseVector: [false,false,false,entailment.isEntailed,false], mappingConflict: false, localStatementCompatibility: [false,false,false], roleSensitive: false, directionResolution: resolution, interferenceLevel: options.interferenceLevel, continuityProfile: null, interferenceProfile: `R${resolution}:000:${Number(entailment.isEntailed)}:0` }); return clearPresentationState(trial), trial.submitted = false, trial; }
  function evaluateHistory(history, currentIndex, nBackLevel, options = {}) { const level = Math.max(1, Math.min(8, Math.round(Number(nBackLevel) || 1))), targetIndex = currentIndex - level; if (targetIndex < 0) { const current = history[currentIndex], entailment = requireSpatial().evaluateTrial(current); return Object.freeze({ warmup: true, scored: true, isMatch: false, currentIndex, targetIndex, nBackLevel: level, statementMatches: Object.freeze([false,false,false]), conclusionEntailed: entailment.isEntailed, wholeTrialMatch: false, responseVector: Object.freeze([false,false,false,entailment.isEntailed,false]), directionResolution: current.directionResolution }); } const evaluation = evaluateConflictMatrix(history[targetIndex], history[currentIndex], options); return Object.freeze({ ...evaluation, warmup: false, scored: true, isMatch: evaluation.wholeTrialMatch, currentIndex, targetIndex, nBackLevel: level }); }
  function installStyles(d) { if (d.getElementById('compass-resolution-style')) return; const style = d.createElement('style'); style.id = 'compass-resolution-style'; style.textContent = `#direction-resolution-group[hidden]{display:none!important}#direction-resolution-help{font-size:.75rem;color:#43566d;line-height:1.42;margin:8px 0 0}#direction-resolution-error{font-size:.78rem;color:#a61f17;font-weight:800;margin:7px 0 0}#direction-resolution[aria-invalid="true"]{outline:3px solid rgba(180,35,24,.3);border-color:#b42318}#direction-resolution-status{font-size:.7rem;font-weight:850;letter-spacing:.06em;color:#31546f;text-align:center;margin:5px 0 0;text-transform:uppercase}`; d.head.appendChild(style); }
  function ensureResolutionUI(d, app) { installStyles(d); const group = d.getElementById('direction-resolution-group'), select = d.getElementById('direction-resolution'), error = d.getElementById('direction-resolution-error'), status = d.getElementById('direction-resolution-status'), start = d.getElementById('start-btn'), mode = d.getElementById('logic-mode'); if (!group || !select || !error || !status || !start || !mode) throw new Error('Compass-resolution UI is incomplete.'); const getSelected = () => { const value = Number(select.value); return [4,8,16].includes(value) ? value : null; }; const isModeOne = () => Number(mode.value || 0) === 0; const clearError = () => { select.setAttribute('aria-invalid','false'); error.hidden = true; }; const sync = () => { const modeOne = isModeOne(), resolution = getSelected(); group.hidden = !modeOne; select.disabled = Boolean(app.running) || !modeOne; if (!app.running) start.disabled = modeOne ? resolution === null : false; status.textContent = resolution ? `COMPASS RESOLUTION: ${resolution} DIRECTIONS` : 'COMPASS RESOLUTION: NOT SELECTED'; if (resolution || !modeOne) clearError(); return resolution; }; const validate = (focus = true) => { if (!isModeOne()) return true; const resolution = sync(); if (resolution) return true; select.setAttribute('aria-invalid','true'); error.hidden = false; if (focus) select.focus(); return false; }; select.addEventListener('input', sync); select.addEventListener('change', sync); mode.addEventListener('change', sync); root.addEventListener?.('pageshow', sync); sync(); return { group, select, getSelected, validate, sync }; }
  function installMatrixInput(rootObject, app, matrix) { if (matrix.dataset.compassInputInstalled === 'true') return matrix.__inputApi; matrix.dataset.compassInputInstalled = 'true'; const d = rootObject.document, responses = new Array(5).fill(null), decisionTimes = new Array(5).fill(null); const clearFeedback = () => matrix.querySelectorAll('.conflict-choice').forEach(button => { button.classList.remove('feedback-correct','feedback-incorrect','selected'); button.querySelectorAll('.conflict-feedback-icon').forEach(icon => icon.remove()); }); const showButtonFeedback = (button, correct) => { button.classList.add(correct ? 'feedback-correct' : 'feedback-incorrect'); const icon = d.createElement('span'); icon.className = `conflict-feedback-icon ${correct ? 'correct' : 'incorrect'}`; icon.setAttribute('aria-hidden','true'); icon.innerHTML = correct ? '<svg viewBox="0 0 64 64"><path d="M13 33l12 12L52 18" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<svg viewBox="0 0 64 64"><path d="M17 17l30 30M47 17L17 47" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>'; button.appendChild(icon); }; const reset = trial => { responses.fill(null); decisionTimes.fill(null); matrix.dataset.startedAt = String(Date.now()); matrix.dataset.submitting = 'false'; clearFeedback(); matrix.classList.add('active'); matrix.querySelectorAll('.conflict-choice').forEach(button => { button.disabled = !Boolean(trial?.scored); }); const progress = matrix.querySelector('#conflict-progress'); if (progress) progress.textContent = trial?.scored ? '0 of 5 decisions entered' : ''; }; const handleButton = button => { if (!button || button.disabled || !app.awaiting || matrix.dataset.submitting === 'true') return; const row = button.closest('.conflict-row'), index = Number(row?.dataset.decision); if (!Number.isInteger(index) || responses[index] !== null) return; responses[index] = button.dataset.value === '1'; decisionTimes[index] = Date.now() - Number(matrix.dataset.startedAt || Date.now()); row.querySelectorAll('.conflict-choice').forEach(choice => { choice.classList.toggle('selected', choice === button); choice.disabled = true; }); const expected = app.current?.conflictResponseVector?.[index]; if (typeof expected === 'boolean') showButtonFeedback(button, responses[index] === expected); const completed = responses.filter(value => value !== null).length, progress = matrix.querySelector('#conflict-progress'); if (progress) progress.textContent = `${completed} of 5 decisions entered`; if (completed === 5) { matrix.dataset.submitting = 'true'; app.submitConflictMatrix(responses.slice(), decisionTimes.slice()); } }; matrix.addEventListener('click', event => { const button = event.target.closest('.conflict-choice'); if (button) handleButton(button); }); const keyboard = ['a','s','d','f','h','j','k','l',' ','n']; d.addEventListener('keydown', event => { if (!matrix.classList.contains('active') || !app.awaiting || /INPUT|SELECT|TEXTAREA/.test(event.target?.tagName || '')) return; const key = event.code === 'Space' ? ' ' : event.key.toLowerCase(), keyIndex = keyboard.indexOf(key); if (keyIndex < 0) return; event.preventDefault(); event.stopImmediatePropagation(); const decision = Math.floor(keyIndex / 2), value = keyIndex % 2 === 0; handleButton(matrix.querySelector(`[data-decision="${decision}"] [data-value="${value ? 1 : 0}"]`)); }, true); return matrix.__inputApi = { reset }; }
  function installBrowser(rootObject) {
    const app = rootObject.__ontologicalWorlds, d = rootObject.document;
    if (!app || !requireSpatial() || app.__mandatoryCompassResolutionInstalled) return;
    const matrix = d.getElementById('conflict-matrix'); if (!matrix) return;
    const ui = ensureResolutionUI(d, app), input = installMatrixInput(rootObject, app, matrix);
    const originalSettings = app.settings.bind(app), originalStart = app.start.bind(app), originalNextTrial = app.nextTrial.bind(app), originalStop = app.stop.bind(app), originalTogglePause = app.togglePause?.bind(app);
    const premiseDisplay = d.getElementById('premise-display'), feedback = d.getElementById('feedback'), explanation = d.getElementById('trial-explanation');
    let advanceTimerId = null;
    app.settings = function() { const settings = originalSettings(); return { ...settings, directionResolution: this.running ? this.directionResolution : ui.getSelected() }; };
    app.makeTrial = function() {
      if (Number(originalSettings().mode) !== 0) return null;
      const resolution = requireSpatial().normaliseResolution(this.directionResolution, null);
      if (!resolution) throw new Error('Mode 1 cannot generate a trial without a frozen compass resolution.');
      const settings = originalSettings(), level = Math.max(1, Math.min(8, Math.round(Number(this.n || settings.n) || 1))), interferenceLevel = Number(d.getElementById('interference-slider')?.value) || 0;
      if (!this.trials.length) return generateWarmupTrial(this.rng, { interferenceLevel, directionResolution: resolution });
      const targetIndex = this.trials.length - level;
      const target = targetIndex >= 0 ? this.trials[targetIndex] : this.trials[0];
      const isWarmup = targetIndex < 0;
      const requestedMatch = isWarmup ? false : this.rng.next() < settings.matchProbability;
      const trial = generateConflictTrial(this.rng, target, { continuityReference: target, referenceOffset: level, match: requestedMatch, interferenceLevel, roleSensitive: true, directionResolution: resolution });
      if (isWarmup) {
        const entailment = requireSpatial().evaluateTrial(trial);
        Object.assign(trial, { nBackWarmup: true, nBackRequestedMatch: false, nBackMatch: false, isMatch: false, statementMatchVector: [false,false,false], conflictResponseVector: [false,false,false,entailment.isEntailed,false] });
      }
      return trial;
    };
    app.nextTrial = function(token = this.sessionToken) { if (Number(originalSettings().mode) !== 0) return originalNextTrial(token); if (!this.running || this.paused || token !== this.sessionToken) return null; clearTimeout(this.timerId); clearTimeout(advanceTimerId); advanceTimerId = null; const resolution = requireSpatial().normaliseResolution(this.directionResolution, null); if (!resolution) return this.failModeOneStartup?.(new Error('Mode 1 has no frozen compass resolution.')) || null; let trial = null, rendered = '', lastError = null; for (let attempt = 0; attempt < 32 && !trial; attempt++) { try { const candidate = clearPresentationState(this.makeTrial()); if (!candidate || !ensureResolutionClosed(candidate, resolution)) throw new Error('Generated trial failed resolution validation.'); candidate.submitted = false; const candidateRendered = requireSpatial().renderTrial(candidate); if (typeof candidateRendered !== 'string' || !candidateRendered.trim()) throw new Error('Mode 1 rendered an empty premise.'); trial = candidate; rendered = candidateRendered.trim(); } catch (error) { lastError = error; } } if (!trial) return this.failModeOneStartup?.(lastError || new Error('Mode 1 could not generate and render a valid trial.')) || null; if (!this.running || this.paused || token !== this.sessionToken) return null; premiseDisplay.textContent = rendered; this.current = trial; this.trials.push(trial); this.score.shown++; premiseDisplay.classList.remove('correct','incorrect'); if (feedback) feedback.textContent = ''; if (explanation) explanation.textContent = ''; input.reset(trial); this.awaiting = true; try { this.speak?.(rendered); } catch (_) {} try { this.updateStats?.(); } catch (_) {} return trial; };
    app.failModeOneStartup = function(error) { console.error('Mode 1 startup failed.', error); this.running = false; this.paused = false; this.awaiting = false; this.current = null; this.trials = []; this.sessionToken++; clearTimeout(this.timerId); clearTimeout(advanceTimerId); clearInterval(this.sessionTimerId); advanceTimerId = null; try { this.synth?.cancel(); } catch (_) {} try { this.stopDelta?.(); } catch (_) {} const countdown = d.getElementById('countdown-box'); if (countdown) countdown.textContent = ''; if (premiseDisplay) premiseDisplay.textContent = `START_FAILED: ${error?.message || 'Unknown Mode 1 startup error'}`; const start = d.getElementById('start-btn'), pause = d.getElementById('pause-btn'), stop = d.getElementById('stop-btn'); if (start) start.disabled = false; if (pause) pause.disabled = true; if (stop) stop.disabled = true; ui.select.disabled = false; ui.sync(); return null; };
    app.start = function(...args) { const mode = Number(originalSettings().mode); if (mode !== 0) return originalStart(...args); if (this.running) return false; if (!ui.validate(true)) return false; this.directionResolution = ui.getSelected(); this.trials = []; this.current = null; this.awaiting = false; const result = originalStart(...args); if (result && typeof result.catch === 'function') result.catch(error => this.failModeOneStartup(error)); return result; };
    app.submitConflictMatrix = function(responses, decisionTimes) { if (!this.current?.scored || !Array.isArray(this.current.conflictResponseVector) || !this.awaiting || this.current.submitted) return; this.current.submitted = true; const expected = this.current.conflictResponseVector, correctness = responses.map((value,index) => value === expected[index]); Object.assign(this.current, { conflictResponses: responses.slice(), conflictDecisionCorrectness: correctness.slice(), conflictCorrectCount: correctness.filter(Boolean).length, conflictAllCorrect: correctness.every(Boolean), conflictDecisionTimes: decisionTimes.slice(), directionResolution: this.directionResolution }); this.awaiting = false; clearTimeout(this.timerId); clearTimeout(advanceTimerId); if (feedback) feedback.textContent = this.current.conflictAllCorrect ? 'ALL FIVE CORRECT' : `${this.current.conflictCorrectCount}/5 CORRECT`; if (explanation) explanation.textContent = requireSpatial().explainTrial(this.current); try { this.updateStats?.(); } catch (_) {} const token = this.sessionToken; advanceTimerId = rootObject.setTimeout(() => { advanceTimerId = null; if (this.running && !this.paused && token === this.sessionToken) this.nextTrial(token); }, 1600); };
    if (originalTogglePause) app.togglePause = function(...args) { const wasPaused = this.paused, result = originalTogglePause(...args); if (wasPaused && !this.paused && this.current && !this.current.submitted) { this.awaiting = true; return result; } return result; };
    app.stop = function(...args) { clearTimeout(advanceTimerId); advanceTimerId = null; const result = originalStop(...args); this.directionResolution = null; this.current = null; ui.select.value = ''; matrix.classList.remove('active'); ui.sync(); return result; };
    app.__mandatoryCompassResolutionInstalled = true; ui.sync();
  }
  function runConflictAudit(iterationsPerResolution = 500) { class AuditRng { constructor(seed) { this.s=seed>>>0; } next(){let v=this.s+=1831565813;v=Math.imul(v^v>>>15,1|v);v^=v+Math.imul(v^v>>>7,61|v);return((v^v>>>14)>>>0)/4294967296;} pick(values){return values[Math.floor(this.next()*values.length)];} shuffle(values){return fisherYates(this,values);} } const failures=[], rows=[]; for (const resolution of [4,8,16]) { const rng=new AuditRng(0x64000000+resolution), row={resolution,iterations:0,failures:0}; const history=[generateWarmupTrial(rng,{interferenceLevel:85,directionResolution:resolution})]; for(let i=0;i<iterationsPerResolution;i++){ const level=1+(i%8), targetIndex=Math.max(0,history.length-level), target=history[targetIndex], wantMatch=i%2===0; try{ const trial=generateConflictTrial(rng,target,{continuityReference:target,referenceOffset:level,match:wantMatch,interferenceLevel:85,roleSensitive:true,directionResolution:resolution}); const evaluation=evaluateConflictMatrix(target,trial,{roleSensitive:true}), continuity=continuityProfile(target,trial); row.iterations++; if(!continuity.valid||evaluation.wholeTrialMatch!==wantMatch||!ensureResolutionClosed(trial,resolution))row.failures++; history.push(trial);}catch(error){row.failures++;if(failures.length<50)failures.push(`${resolution}-${i}:${error.message}`);} } if(row.failures)failures.push(`resolution-${resolution}-summary`); rows.push(row);} return {passed:failures.length===0,failures,iterationsPerResolution,rows,totalSimulations:rows.reduce((sum,row)=>sum+row.iterations,0)}; }
  return { version: 24, LEVELS, analyseAlignment, evaluateConflictMatrix, generateConflictTrial, generateWarmupTrial, evaluateHistory, installBrowser, runAudit: runConflictAudit, runConflictAudit, ensureResolutionClosed, continuityProfile, declaredEditProfile };
});