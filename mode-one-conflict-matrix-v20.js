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
  const ALL_MASKS = Object.freeze([
    [false,false,false],[true,false,false],[false,true,false],[false,false,true],
    [true,true,false],[true,false,true],[false,true,true],[true,true,true]
  ]);
  const core = root?.__modeOneTriadicEntailmentCore || root?.__modeOneSpatialCore ||
    (typeof require === 'function' ? require('./mode-one-spatial-core.js') : null);

  function requireCore(){ if(!core) throw new Error('Mode 1 conflict matrix requires the Mode 1 spatial core.'); return core; }
  const clone = value => JSON.parse(JSON.stringify(value));
  const random = rng => rng?.next ? rng.next() : Math.random();
  const pick = (rng, values) => rng?.pick ? rng.pick(values) : values[Math.floor(random(rng)*values.length)];
  function fisherYates(rng, values){ const out=[...values]; for(let i=out.length-1;i>0;i--){ const j=Math.floor(random(rng)*(i+1)); [out[i],out[j]]=[out[j],out[i]]; } return out; }
  function shuffle(rng, values){ return rng?.shuffle ? rng.shuffle(values) : fisherYates(rng, values); }

  function statements(trial){
    if(!trial || !Array.isArray(trial.premises) || trial.premises.length!==2 || !trial.conclusion) throw new Error('A conflict-matrix trial requires two premises and one conclusion.');
    return [...trial.premises, trial.conclusion];
  }
  function trialLetters(trial){ return [...new Set(statements(trial).flatMap(s=>[s.subject,s.object]))]; }
  function permutations(values){ if(values.length<2) return [values.slice()]; return values.flatMap((v,i)=>permutations(values.slice(0,i).concat(values.slice(i+1))).map(rest=>[v,...rest])); }
  function canonicalStatement(statement,mapping){
    const c=requireCore();
    const direct=`${mapping[statement.subject]}>${statement.relation}>${mapping[statement.object]}`;
    const inverse=`${mapping[statement.object]}>${c.opposite(statement.relation)}>${mapping[statement.subject]}`;
    return direct<inverse?direct:inverse;
  }

  function analyseAlignment(target,current,options={}){
    const roleSensitive=Boolean(options.roleSensitive);
    const targetLetters=trialLetters(target), currentLetters=trialLetters(current);
    if(targetLetters.length!==3 || currentLetters.length!==3) throw new Error('Conflict-matrix comparisons require exactly three letters in each trial.');
    const targetStatements=statements(target), currentStatements=statements(current), candidates=[];
    const assignments=roleSensitive ? [[0,1,2],[1,0,2]] : permutations([0,1,2]);
    const currentIdentity=Object.fromEntries(currentLetters.map(letter=>[letter,letter]));
    const currentCanonical=currentStatements.map(s=>canonicalStatement(s,currentIdentity));
    for(const assignedCurrentLetters of permutations(currentLetters)){
      const map=Object.fromEntries(targetLetters.map((letter,index)=>[letter,assignedCurrentLetters[index]]));
      const targetCanonical=targetStatements.map(s=>canonicalStatement(s,map));
      for(const assignment of assignments){
        const vector=currentStatements.map((_,i)=>targetCanonical[assignment[i]]===currentCanonical[i]);
        const count=vector.filter(Boolean).length;
        candidates.push({count,vector,assignment,map,key:`${3-count}|${vector.map(Number).join('')}|${assignment.join('')}|${targetLetters.map(l=>map[l]).join('')}`});
      }
    }
    candidates.sort((a,b)=>b.count-a.count || a.key.localeCompare(b.key));
    const best=candidates[0];
    const localVector=currentStatements.map((currentStatement,currentIndex)=>{
      const currentCode=canonicalStatement(currentStatement,currentIdentity);
      return permutations(currentLetters).some(assigned=>{
        const map=Object.fromEntries(targetLetters.map((letter,index)=>[letter,assigned[index]]));
        return targetStatements.some((targetStatement,targetIndex)=>{
          if(roleSensitive && currentIndex===2 && targetIndex!==2) return false;
          if(roleSensitive && currentIndex!==2 && targetIndex===2) return false;
          return canonicalStatement(targetStatement,map)===currentCode;
        });
      });
    });
    return Object.freeze({
      statementMatches:Object.freeze(best.vector.slice()), matchedCount:best.count,
      assignment:Object.freeze(best.assignment.slice()), letterMapping:Object.freeze({...best.map}),
      localStatementCompatibility:Object.freeze(localVector), localMatchCount:localVector.filter(Boolean).length,
      mappingConflict:localVector.filter(Boolean).length>best.count, wholeTrialMatch:best.count===3,
      roleSensitive
    });
  }

  function evaluateConflictMatrix(target,current,options={}){
    const alignment=analyseAlignment(target,current,options);
    const entailment=requireCore().evaluateTrial(current);
    return Object.freeze({...alignment, conclusionEntailed:entailment.isEntailed,
      expectedRelation:entailment.expectedRelation, assertedRelation:entailment.assertedRelation,
      responseVector:Object.freeze([...alignment.statementMatches,entailment.isEntailed,alignment.wholeTrialMatch])});
  }

  function renameAndTransform(rng,target){
    const c=requireCore(), source=trialLetters(target), destination=shuffle(rng,LETTER_POOL).slice(0,3);
    let trial=c.renameTrial(target,Object.fromEntries(source.map((letter,index)=>[letter,destination[index]])));
    trial=clone(trial);
    if(random(rng)<.5) trial.premises.reverse();
    trial.premises=trial.premises.map(s=>random(rng)<.5?c.invert(s):s);
    if(random(rng)<.5) trial.conclusion=c.invert(trial.conclusion);
    trial.mode=0; trial.publicMode=1;
    return trial;
  }
  function mutationDistances(interferenceLevel){
    const level=Math.max(0,Math.min(100,Number(interferenceLevel)||0));
    if(level<34) return [8,4,6,2,1];
    if(level<67) return [4,6,8,2,1,3];
    return [1,2,3,4,6,8];
  }
  function mutateDirection(rng,statement,interferenceLevel=0){
    const c=requireCore(), direction=c.direction(statement.relation), distance=pick(rng,mutationDistances(interferenceLevel)), sign=random(rng)<.5?-1:1;
    return {...statement,relation:c.DIRECTIONS[(direction.index+sign*distance+16)%16].code};
  }
  function desiredMask(rng,requestedWholeMatch,interferenceLevel){
    if(requestedWholeMatch) return [true,true,true];
    const level=Math.max(0,Math.min(100,Number(interferenceLevel)||0));
    if(level<34) return pick(rng,ALL_MASKS.slice(0,4)).slice();
    if(level<67) return pick(rng,ALL_MASKS.slice(1,7)).slice();
    return pick(rng,ALL_MASKS.slice(4,7)).slice();
  }

  function generateConflictTrial(rng,target,options={}){
    if(!target) throw new Error('A historical N-back target is required.');
    const requestedWholeMatch=Boolean(options.match), interferenceLevel=Math.max(0,Math.min(100,Number(options.interferenceLevel)||0));
    const roleSensitive=Boolean(options.roleSensitive), mask=options.mask?options.mask.slice():desiredMask(rng,requestedWholeMatch,interferenceLevel);
    for(let attempt=0;attempt<5000;attempt++){
      const trial=renameAndTransform(rng,target);
      if(!requestedWholeMatch){
        const all=statements(trial);
        for(let i=0;i<3;i++) if(!mask[i]) all[i]=mutateDirection(rng,all[i],interferenceLevel);
        trial.premises=all.slice(0,2); trial.conclusion=all[2];
      }
      let evaluation; try{ evaluation=evaluateConflictMatrix(target,trial,{roleSensitive}); }catch(_){ continue; }
      const exactMask=evaluation.statementMatches.every((value,index)=>value===mask[index]);
      if(requestedWholeMatch ? evaluation.wholeTrialMatch : (!evaluation.wholeTrialMatch && exactMask)){
        Object.assign(trial,{nBackRequestedMatch:requestedWholeMatch,nBackMatch:evaluation.wholeTrialMatch,isMatch:evaluation.wholeTrialMatch,
          statementMatchVector:evaluation.statementMatches.slice(),conclusionEntailed:evaluation.conclusionEntailed,
          conflictResponseVector:evaluation.responseVector.slice(),mappingConflict:evaluation.mappingConflict,
          localStatementCompatibility:evaluation.localStatementCompatibility.slice(),roleSensitive,
          interferenceProfile:`${evaluation.statementMatches.map(Number).join('')}:${Number(evaluation.conclusionEntailed)}:${Number(evaluation.wholeTrialMatch)}`,scored:true});
        return trial;
      }
    }
    throw new Error(`Unable to generate requested Mode 1 conflict profile ${mask.map(Number).join('')}.`);
  }
  function generateWarmupTrial(rng,options={}){
    const trial=requireCore().generateTrial(rng,{matchProbability:random(rng)<.5?1:0,interferenceLevel:options.interferenceLevel});
    Object.assign(trial,{mode:0,publicMode:1,nBackWarmup:true,scored:false}); return trial;
  }
  function evaluateHistory(history,currentIndex,nBackLevel,options={}){
    const level=Math.max(1,Math.min(8,Math.round(Number(nBackLevel)||1))), targetIndex=currentIndex-level;
    if(targetIndex<0) return Object.freeze({warmup:true,scored:false,isMatch:false,currentIndex,targetIndex,nBackLevel:level});
    const evaluation=evaluateConflictMatrix(history[targetIndex],history[currentIndex],options);
    return Object.freeze({...evaluation,warmup:false,scored:true,isMatch:evaluation.wholeTrialMatch,currentIndex,targetIndex,nBackLevel:level});
  }

  function createDecisionScore(){ return {correct:0,incorrect:0,timeouts:0,total:0,rtTotal:0,rtCount:0}; }
  function recordDecisionScore(score,index,correct,rt){ const row=score[index]; row.total++; correct?row.correct++:row.incorrect++; if(Number.isFinite(rt)){row.rtTotal+=rt;row.rtCount++;} }

  function runAudit(iterationsPerLevel=4096){
    class AuditRng{
      constructor(seed){this.s=seed>>>0;}
      next(){let value=this.s+=1831565813; value=Math.imul(value^value>>>15,1|value); value^=value+Math.imul(value^value>>>7,61|value); return ((value^value>>>14)>>>0)/4294967296;}
      pick(values){return values[Math.floor(this.next()*values.length)];}
      shuffle(values){return fisherYates(this,values);}
    }
    const failures=[], perLevel=[], maskCounts=Object.fromEntries(ALL_MASKS.map(mask=>[mask.map(Number).join(''),0]));
    let total=0,matches=0,nonMatches=0,statementDecisions=0,entailmentDecisions=0,wholeTrialDecisions=0,mappingConflicts=0;
    for(const level of LEVELS){
      const rng=new AuditRng(0x5a170000+level), history=Array.from({length:level},()=>generateWarmupTrial(rng,{interferenceLevel:100}));
      const row={nBackLevel:level,evaluations:0,matches:0,nonMatches:0,failures:0};
      for(let index=0;index<iterationsPerLevel;index++){
        const requestedMatch=index%2===0, target=history[history.length-level];
        const trial=generateConflictTrial(rng,target,{match:requestedMatch,interferenceLevel:100,roleSensitive:index%4===0});
        history.push(trial);
        const result=evaluateHistory(history,history.length-1,level,{roleSensitive:trial.roleSensitive});
        total++; row.evaluations++; statementDecisions+=3; entailmentDecisions++; wholeTrialDecisions++;
        if(result.isMatch){matches++;row.matches++;}else{nonMatches++;row.nonMatches++;}
        maskCounts[result.statementMatches.map(Number).join('')]++;
        if(result.mappingConflict) mappingConflicts++;
        if(result.isMatch!==requestedMatch || result.targetIndex!==history.length-1-level || result.responseVector.length!==5) row.failures++;
      }
      if(row.failures) failures.push(`level-${level}-${row.failures}`); perLevel.push(row);
    }
    return Object.freeze({passed:failures.length===0,levels:LEVELS,iterationsPerLevel,total,matches,nonMatches,statementDecisions,entailmentDecisions,wholeTrialDecisions,
      totalBinaryDecisions:statementDecisions+entailmentDecisions+wholeTrialDecisions,mappingConflicts,maskCounts,failures,perLevel,
      invariants:Object.freeze({fiveMandatoryDecisionsPerScoredTrial:true,threeStatementLevelNBackDecisions:true,separateWithinTrialEntailmentDecision:true,
        separateWholeTrialDecision:true,exactSixteenDirectionRelations:true,inverseWordingEquivalent:true,globallyConsistentLetterMappingRequired:true,
        oneToOneStatementAssignmentRequired:true,partialMatchesAreScoredInterference:true,roleSensitiveAndFlexibleComparison:true,
        nativePerDecisionScoring:true,allNBackLevelsSupported:true})});
  }

  function installStyles(documentObject){
    if(documentObject.getElementById('mode-one-conflict-matrix-style')) return;
    const style=documentObject.createElement('style'); style.id='mode-one-conflict-matrix-style';
    style.textContent=`#conflict-matrix{max-width:920px;margin:12px auto 16px;padding:14px;border:1px solid #b8c9da;border-radius:14px;background:rgba(255,255,255,.88)}#conflict-matrix[hidden]{display:none!important}.conflict-heading{font-weight:900;letter-spacing:.055em;text-transform:uppercase;margin-bottom:10px;color:#173f67}.conflict-row{display:grid;grid-template-columns:minmax(135px,1fr) 1fr 1fr;gap:8px;align-items:center;margin:7px 0}.conflict-label{font-size:.82rem;font-weight:800;color:#30465d}.conflict-choice{min-height:44px;border-radius:10px;font-weight:900}.conflict-choice.selected{outline:3px solid #183f67;outline-offset:1px}.conflict-choice[disabled]{opacity:.58}#conflict-submit{width:100%;min-height:48px;margin-top:11px;border-radius:11px;font-weight:900;text-transform:uppercase}#conflict-progress,#conflict-score{font-size:.78rem;margin-top:8px;color:#53697e;text-align:center}.response-buttons.conflict-replaced{display:none!important}@media(max-width:620px){.conflict-row{grid-template-columns:1fr 1fr}.conflict-label{grid-column:1/-1}.conflict-choice{min-height:48px}}`;
    documentObject.head.appendChild(style);
  }
  function installMatrixUI(rootObject,app){
    const d=rootObject.document; installStyles(d); if(d.getElementById('conflict-matrix')) return d.getElementById('conflict-matrix');
    const originalButtons=d.querySelector('.response-buttons'), matrix=d.createElement('section'); matrix.id='conflict-matrix'; matrix.hidden=true; matrix.setAttribute('aria-label','Five-decision relational conflict matrix');
    const labels=['Statement 1 — N-back','Statement 2 — N-back','Statement 3 — N-back','Statement 3 — entailed?','Complete triad — N-back'];
    matrix.innerHTML=`<div class="conflict-heading">Relational conflict matrix</div>${labels.map((label,index)=>`<div class="conflict-row" data-decision="${index}"><div class="conflict-label">${label}</div><button class="conflict-choice" data-value="1" type="button">${index===3?'Entailed':'Match'}</button><button class="conflict-choice" data-value="0" type="button">${index===3?'Not entailed':'No match'}</button></div>`).join('')}<button id="conflict-submit" type="button" disabled>Submit all five decisions</button><div id="conflict-progress" aria-live="polite">0 of 5 decisions entered</div><div id="conflict-score" aria-live="polite"></div>`;
    originalButtons?.insertAdjacentElement('afterend',matrix);
    const responses=new Array(5).fill(null), decisionTimes=new Array(5).fill(null);
    const reset=trial=>{ responses.fill(null); decisionTimes.fill(null); matrix.dataset.startedAt=String(Date.now()); matrix.querySelectorAll('.conflict-choice').forEach(b=>{b.classList.remove('selected');b.disabled=!trial?.scored;}); matrix.querySelector('#conflict-submit').disabled=true; matrix.querySelector('#conflict-progress').textContent=trial?.scored?'0 of 5 decisions entered':'Memory fill — observe only; no response required'; matrix.querySelector('#conflict-score').textContent=''; matrix.hidden=Number(trial?.mode)!==0&&Number(trial?.publicMode)!==1; originalButtons?.classList.toggle('conflict-replaced',!matrix.hidden); };
    matrix.addEventListener('click',event=>{const button=event.target.closest('.conflict-choice'); if(!button||button.disabled||!app.awaiting)return; const row=button.closest('.conflict-row'),index=Number(row.dataset.decision); responses[index]=button.dataset.value==='1'; if(decisionTimes[index]===null) decisionTimes[index]=Date.now()-Number(matrix.dataset.startedAt||Date.now()); row.querySelectorAll('.conflict-choice').forEach(choice=>choice.classList.toggle('selected',choice===button)); const completed=responses.filter(v=>v!==null).length; matrix.querySelector('#conflict-progress').textContent=`${completed} of 5 decisions entered`; matrix.querySelector('#conflict-submit').disabled=completed!==5;});
    matrix.querySelector('#conflict-submit').addEventListener('click',()=>{if(!app.awaiting||responses.some(v=>v===null))return;app.submitConflictMatrix(responses.slice(),decisionTimes.slice());});
    const keyboard=['a','s','d','f','g','h','j','k','l',';']; d.addEventListener('keydown',event=>{if(matrix.hidden||!app.awaiting||/INPUT|SELECT|TEXTAREA/.test(event.target?.tagName||''))return; const keyIndex=keyboard.indexOf(event.key.toLowerCase()); if(keyIndex<0)return; event.preventDefault();event.stopImmediatePropagation(); const decision=Math.floor(keyIndex/2),value=keyIndex%2===0; matrix.querySelector(`[data-decision="${decision}"]`)?.querySelector(`[data-value="${value?1:0}"]`)?.click();},true);
    return Object.assign(matrix,{resetResponses:reset,responses,decisionTimes});
  }

  function installBrowser(rootObject){
    const app=rootObject.__ontologicalWorlds; if(!app||!requireCore()||app.__modeOneConflictMatrixV20)return;
    const originalMakeTrial=app.makeTrial.bind(app), originalNextTrial=app.nextTrial.bind(app), originalAnswer=app.answer.bind(app), originalStop=app.stop.bind(app);
    const matrix=installMatrixUI(rootObject,app);
    app.conflictDecisionStats=Array.from({length:5},createDecisionScore);
    app.makeTrial=function(){const settings=this.settings(); if(Number(settings.mode)!==0)return originalMakeTrial(); const level=Math.max(1,Math.min(8,Math.round(Number(this.n||settings.n)||1))),target=this.trials[this.trials.length-level]; if(!target)return generateWarmupTrial(this.rng,{interferenceLevel:Number(rootObject.document.getElementById('interference-slider')?.value)||0}); return generateConflictTrial(this.rng,target,{match:this.rng.next()<settings.matchProbability,nBackLevel:level,interferenceLevel:Number(rootObject.document.getElementById('interference-slider')?.value)||0,roleSensitive:Boolean(this.trials.length%2)});};
    app.nextTrial=function(...args){const result=originalNextTrial(...args);rootObject.setTimeout(()=>matrix.resetResponses(this.current),0);return result;};
    app.submitConflictMatrix=function(responses,decisionTimes){if(!this.current?.scored||!Array.isArray(this.current.conflictResponseVector))return; const expected=this.current.conflictResponseVector,correctness=responses.map((value,index)=>value===expected[index]); Object.assign(this.current,{conflictResponses:responses.slice(),conflictDecisionCorrectness:correctness.slice(),conflictCorrectCount:correctness.filter(Boolean).length,conflictAllCorrect:correctness.every(Boolean),conflictDecisionTimes:decisionTimes?.slice?.()||[]}); correctness.forEach((correct,index)=>recordDecisionScore(this.conflictDecisionStats,index,correct,decisionTimes?.[index])); const scoreText=this.conflictDecisionStats.map((row,index)=>`D${index+1} ${row.total?Math.round(100*row.correct/row.total):0}%`).join(' · '); matrix.querySelector('#conflict-score').textContent=scoreText; if(typeof requireCore().recordNBackResponse==='function') requireCore().recordNBackResponse(this.current,{responses:responses.slice(),correctness:correctness.slice(),allCorrect:this.current.conflictAllCorrect}); const legacyResponse=this.current.conflictAllCorrect?Boolean(this.current.isMatch):!Boolean(this.current.isMatch); originalAnswer(legacyResponse);};
    app.answer=function(response){if((Number(this.current?.mode)===0||Number(this.current?.publicMode)===1)&&this.current?.scored){if(response===null||typeof response==='undefined')return originalAnswer(response);return;}return originalAnswer(response);};
    app.stop=function(...args){matrix.hidden=true;rootObject.document.querySelector('.response-buttons')?.classList.remove('conflict-replaced');return originalStop(...args);};
    Object.assign(app,{modeOneConflictAnalyseAlignment:analyseAlignment,modeOneConflictEvaluate:evaluateConflictMatrix,modeOneConflictEvaluateHistory:evaluateHistory,modeOneConflictGenerateTrial:generateConflictTrial,modeOneConflictRunAudit:runAudit,__modeOneConflictMatrixV20:true});
  }

  return Object.freeze({version:22,LEVELS,ALL_MASKS,analyseAlignment,evaluateConflictMatrix,generateConflictTrial,generateWarmupTrial,evaluateHistory,runAudit,installBrowser});
});
