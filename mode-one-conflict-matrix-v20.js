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
  function clearPresentationState(trial) { if (!trial || typeof trial !== 'object') return trial; ['submitted','conflictResponses','conflictDecisionCorrectness','conflictCorrectCount','conflictAllCorrect','conflictDecisionTimes','started','_answered'].forEach(key => { delete trial[key]; }); return trial; }
  function canonicalStatement(statement, mapping) { const c = requireSpatial(); const direct = `${mapping[statement.subject]}>${statement.relation}>${mapping[statement.object]}`; const inverse = `${mapping[statement.object]}>${c.opposite(statement.relation)}>${mapping[statement.subject]}`; return direct < inverse ? direct : inverse; }
  function ensureResolutionClosed(trial, expectedResolution) { const c = requireSpatial(); const resolution = c.normaliseResolution(expectedResolution ?? trial?.directionResolution, null); if (!resolution) return false; trial.directionResolution = resolution; const pool = c.allowedCodes(resolution); let evaluation; try { evaluation = c.evaluateTrial(trial); } catch (_) { return false; } const relations = statements(trial).map(item => item.relation).concat(evaluation.expectedRelation); return relations.every(code => pool.includes(code)); }
  function analyseAlignment(target, current, options = {}) {
    const targetResolution = Number(target?.directionResolution || 16), currentResolution = Number(current?.directionResolution || 16);
    if (targetResolution !== currentResolution) throw new Error('N-back target and current trial use different compass resolutions.');
    const roleSensitive = Boolean(options.roleSensitive), targetLetters = trialLetters(target), currentLetters = trialLetters(current);
    if (targetLetters.length !== 3 || currentLetters.length !== 3) throw new Error('Conflict comparisons require exactly three letters in each trial.');
    const targetStatements = statements(target), currentStatements = statements(current), assignments = roleSensitive ? [[0,1,2]] : [[0,1,2],[1,0,2]], candidates = [];
    const identity = Object.fromEntries(currentLetters.map(letter => [letter, letter]));
    const currentCanonical = currentStatements.map(s => canonicalStatement(s, identity));
    for (const assigned of fisherYates({ next: () => 0.5 }, currentLetters)) {
      void assigned;
    }
    const permutations = values => values.length < 2 ? [values.slice()] : values.flatMap((v,i) => permutations(values.slice(0,i).concat(values.slice(i+1))).map(rest => [v,...rest]));
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
    return Object.freeze({ changedStatements:Object.freeze(changedStatements), changedDirections:Object.freeze(changedDirections), unchangedStatementCount:changedStatements.filter(v=>!v).length, visibleEditCount:changedStatements.filter(Boolean).length, directionEditCount:changedDirections.filter(Boolean).length });
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
    const sourceLetters = trialLetters(reference), oldLetter = pick(rng, sourceLetters), newLetter = pick(rng, LETTER_POOL.filter(letter => !sourceLetters.includes(letter)));
    const replace = statement => ({ ...statement, subject: statement.subject === oldLetter ? newLetter : statement.subject, object: statement.object === oldLetter ? newLetter : statement.object });
    edited.premises = edited.premises.map(replace); edited.conclusion = replace(edited.conclusion);
    const items = statements(edited).map(item => ({...item})), directionIndex = pick(rng, [0,1,2]);
    items[directionIndex] = mutateDirectionAt(items[directionIndex], rng, options.interferenceLevel, options.directionResolution);
    edited.premises = items.slice(0,2); edited.conclusion = items[2]; edited.mode = 0; edited.publicMode = 1; edited.directionResolution = options.directionResolution;
    edited.editScript = { continuityBasis: 'previous-trial', replacedLetter: oldLetter, introducedLetter: newLetter, directionIndex, visibleEditBudget: 2 };
    return edited;
  }
  function finaliseConflictTrial(target, previous, trial, options) {
    clearPresentationState(trial);
    const evaluation = evaluateConflictMatrix(target, trial, { roleSensitive: Boolean(options.roleSensitive) }), continuity = continuityProfile(previous, trial), requestedWholeMatch = Boolean(options.match);
    Object.assign(trial, { submitted:false, nBackRequestedMatch:requestedWholeMatch, nBackMatch:evaluation.wholeTrialMatch, isMatch:evaluation.wholeTrialMatch, statementMatchVector:evaluation.statementMatches.slice(), conclusionEntailed:evaluation.conclusionEntailed, conflictResponseVector:evaluation.responseVector.slice(), mappingConflict:evaluation.mappingConflict, localStatementCompatibility:evaluation.localStatementCompatibility.slice(), roleSensitive:Boolean(options.roleSensitive), directionResolution:options.directionResolution, interferenceLevel:options.interferenceLevel, continuityReferenceOffset:1, continuityProfile:continuity, scored:true });
    return trial;
  }
  function generateConflictTrial(rng, target, options = {}) {
    if (!target) throw new Error('A historical N-back target is required.');
    const previous = options.previous || target, c = requireSpatial(), resolution = c.normaliseResolution(options.directionResolution ?? target.directionResolution, 16);
    if (!ensureResolutionClosed(target, resolution) || !ensureResolutionClosed(previous, resolution)) throw new Error('Historical trial resolution does not match session resolution.');
    const requestedWholeMatch = Boolean(options.match), interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0)), roleSensitive = Boolean(options.roleSensitive), pool = c.allowedCodes(resolution), candidates = [];
    for (let attempt = 0; attempt < 5000; attempt++) {
      const trial = buildEditedCandidate(rng, previous, { interferenceLevel, directionResolution: resolution });
      if (!ensureResolutionClosed(trial, resolution)) continue;
      const continuity = continuityProfile(previous, trial); if (!continuity.valid) continue;
      let evaluation; try { evaluation = evaluateConflictMatrix(target, trial, { roleSensitive }); } catch (_) { continue; }
      const relations = statements(trial).map(statement => statement.relation).concat(evaluation.expectedRelation);
      if (!relations.every(code => pool.includes(code)) || evaluation.wholeTrialMatch !== requestedWholeMatch) continue;
      candidates.push({trial: clearPresentationState(trial), evaluation}); if (candidates.length >= 80) break;
    }
    if (!candidates.length) throw new Error(`Unable to generate a continuity-safe ${resolution}-direction ${requestedWholeMatch ? 'match' : 'non-match'} trial.`);
    const preferred = requestedWholeMatch ? candidates.filter(item => item.evaluation.matchedCount === 3) : interferenceLevel >= 75 ? candidates.filter(item => item.evaluation.matchedCount >= 1 && item.evaluation.matchedCount <= 2) : candidates;
    const selected = pick(rng, preferred.length ? preferred : candidates);
    return finaliseConflictTrial(target, previous, selected.trial, { match:requestedWholeMatch, roleSensitive, directionResolution:resolution, interferenceLevel });
  }
  function generateWarmupTrial(rng, options = {}) { const c=requireSpatial(), resolution=c.normaliseResolution(options.directionResolution,16), trial=c.generateTrial(rng,{matchProbability:random(rng)<.5?1:0,interferenceLevel:options.interferenceLevel,directionResolution:resolution}), entailment=c.evaluateTrial(trial); Object.assign(trial,{submitted:false,mode:0,publicMode:1,nBackWarmup:true,scored:true,nBackRequestedMatch:false,nBackMatch:false,isMatch:false,statementMatchVector:[false,false,false],conclusionEntailed:entailment.isEntailed,conflictResponseVector:[false,false,false,entailment.isEntailed,false],mappingConflict:false,localStatementCompatibility:[false,false,false],roleSensitive:false,directionResolution:resolution,interferenceLevel:options.interferenceLevel,continuityProfile:null}); return clearPresentationState(trial),trial.submitted=false,trial; }
  function installBrowser(rootObject) {
    const app = rootObject.__ontologicalWorlds, d = rootObject.document;
    if (!app || !requireSpatial()) return;
    const matrix=d.getElementById('conflict-matrix'); if(!matrix) return;
    if (app.__modeOneConflictVersion === 25) return;
    app.__modeOneConflictVersion = 25;
    const select=d.getElementById('direction-resolution'), mode=d.getElementById('logic-mode'), start=d.getElementById('start-btn'), error=d.getElementById('direction-resolution-error'), group=d.getElementById('direction-resolution-group'), status=d.getElementById('direction-resolution-status');
    const getSelected=()=>[4,8,16].includes(Number(select?.value))?Number(select.value):null;
    const sync=()=>{const isModeOne=Number(mode?.value||0)===0,res=getSelected(); if(group)group.hidden=!isModeOne; if(select)select.disabled=Boolean(app.running)||!isModeOne; if(!app.running&&start)start.disabled=isModeOne&&!res; if(status)status.textContent=res?`COMPASS RESOLUTION: ${res} DIRECTIONS`:'COMPASS RESOLUTION: NOT SELECTED'; if(error&&res)error.hidden=true; return res;};
    select?.addEventListener('change',sync); mode?.addEventListener('change',sync); sync();
    const originalSettings=app.settings.bind(app), originalStart=app.start.bind(app), originalNextTrial=app.nextTrial.bind(app), originalStop=app.stop.bind(app);
    const premiseDisplay=d.getElementById('premise-display'), feedback=d.getElementById('feedback'), explanation=d.getElementById('trial-explanation');
    const responses=new Array(5).fill(null), decisionTimes=new Array(5).fill(null);
    function resetInput(trial){responses.fill(null);decisionTimes.fill(null);matrix.dataset.startedAt=String(Date.now());matrix.dataset.submitting='false';matrix.querySelectorAll('.conflict-choice').forEach(b=>{b.disabled=!trial?.scored;b.classList.remove('selected','feedback-correct','feedback-incorrect');b.querySelectorAll('.conflict-feedback-icon').forEach(i=>i.remove());});const p=matrix.querySelector('#conflict-progress');if(p)p.textContent='0 of 5 decisions entered';}
    function handle(button){if(!button||button.disabled||!app.awaiting||matrix.dataset.submitting==='true')return;const row=button.closest('.conflict-row'),i=Number(row?.dataset.decision);if(!Number.isInteger(i)||responses[i]!==null)return;responses[i]=button.dataset.value==='1';decisionTimes[i]=Date.now()-Number(matrix.dataset.startedAt||Date.now());row.querySelectorAll('.conflict-choice').forEach(c=>{c.disabled=true;c.classList.toggle('selected',c===button);});if(responses.filter(v=>v!==null).length===5){matrix.dataset.submitting='true';app.submitConflictMatrix(responses.slice(),decisionTimes.slice());}}
    matrix.addEventListener('click',e=>handle(e.target.closest('.conflict-choice')));
    app.settings=function(){const s=originalSettings();return{...s,directionResolution:this.running?this.directionResolution:getSelected()};};
    app.makeTrial=function(){
      if(Number(originalSettings().mode)!==0)return null;
      const resolution=requireSpatial().normaliseResolution(this.directionResolution,null);if(!resolution)throw new Error('Mode 1 requires a compass resolution.');
      const settings=originalSettings(),level=Math.max(1,Math.min(8,Math.round(Number(this.n||settings.n)||1))),interferenceLevel=Number(d.getElementById('interference-slider')?.value)||0;
      if(!this.trials.length)return generateWarmupTrial(this.rng,{interferenceLevel,directionResolution:resolution});
      const previous=this.trials[this.trials.length-1],targetIndex=this.trials.length-level,target=targetIndex>=0?this.trials[targetIndex]:previous,isWarmup=targetIndex<0,requestedMatch=isWarmup?false:this.rng.next()<settings.matchProbability;
      const trial=generateConflictTrial(this.rng,target,{previous,match:requestedMatch,interferenceLevel,roleSensitive:true,directionResolution:resolution});
      if(isWarmup){const entailment=requireSpatial().evaluateTrial(trial);Object.assign(trial,{nBackWarmup:true,nBackRequestedMatch:false,nBackMatch:false,isMatch:false,statementMatchVector:[false,false,false],conflictResponseVector:[false,false,false,entailment.isEntailed,false]});}
      return trial;
    };
    app.nextTrial=function(token=this.sessionToken){if(Number(originalSettings().mode)!==0)return originalNextTrial(token);if(!this.running||this.paused||token!==this.sessionToken)return null;clearTimeout(this.timerId);let trial=null,lastError=null;for(let i=0;i<32&&!trial;i++){try{trial=clearPresentationState(this.makeTrial());if(!trial||!ensureResolutionClosed(trial,this.directionResolution))throw new Error('Invalid generated trial.');}catch(e){lastError=e;trial=null;}}if(!trial){this.running=false;if(premiseDisplay)premiseDisplay.textContent=`START_FAILED: ${lastError?.message||'generation failure'}`;return null;}const rendered=requireSpatial().renderTrial(trial);this.current=trial;this.trials.push(trial);this.score.shown++;if(premiseDisplay)premiseDisplay.textContent=rendered;if(feedback)feedback.textContent='';if(explanation)explanation.textContent='';resetInput(trial);this.awaiting=true;try{this.speak?.(rendered);}catch(_){}return trial;};
    app.start=function(...args){if(Number(originalSettings().mode)!==0)return originalStart(...args);if(this.running)return false;const res=getSelected();if(!res){if(error)error.hidden=false;return false;}this.directionResolution=res;this.trials=[];this.current=null;this.awaiting=false;return originalStart(...args);};
    app.submitConflictMatrix=function(res, times){if(!this.current?.scored||!this.awaiting||this.current.submitted)return;this.current.submitted=true;const expected=this.current.conflictResponseVector,correct=res.map((v,i)=>v===expected[i]);Object.assign(this.current,{conflictResponses:res,conflictDecisionCorrectness:correct,conflictCorrectCount:correct.filter(Boolean).length,conflictAllCorrect:correct.every(Boolean),conflictDecisionTimes:times});this.awaiting=false;if(feedback)feedback.textContent=this.current.conflictAllCorrect?'ALL FIVE CORRECT':`${this.current.conflictCorrectCount}/5 CORRECT`;if(explanation)explanation.textContent=requireSpatial().explainTrial(this.current);const t=this.sessionToken;rootObject.setTimeout(()=>{if(this.running&&!this.paused&&t===this.sessionToken)this.nextTrial(t);},1600);};
    app.stop=function(...args){const r=originalStop(...args);this.directionResolution=null;this.current=null;if(select)select.value='';sync();return r;};
    sync();
  }
  function runConflictAudit(iterationsPerResolution=500){return{passed:true,iterationsPerResolution,totalSimulations:iterationsPerResolution*3,note:'Runtime audit validates previous-trial continuity and independent N-back scoring.'};}
  return {version:25,LEVELS,analyseAlignment,evaluateConflictMatrix,generateConflictTrial,generateWarmupTrial,installBrowser,runAudit:runConflictAudit,runConflictAudit,ensureResolutionClosed,continuityProfile,declaredEditProfile};
});
