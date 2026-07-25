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
    style.textContent=`body.mode-one-conflict-active{overflow-x:hidden}.game-area{overflow:visible!important}.response-stage{position:relative;width:100%;min-height:188px;flex:0 0 188px;margin:0;overflow:visible}.response-buttons{display:none!important}#conflict-matrix{display:none!important;position:absolute;z-index:5;top:0;left:50%;transform:translateX(-50%);width:100vw;max-width:none;margin:0;padding:8px clamp(6px,1.2vw,18px);background:rgba(255,255,255,.98);border-top:1px solid #c8d3df;border-bottom:1px solid #c8d3df;box-sizing:border-box}#conflict-matrix.active{display:block!important}.conflict-heading{font-weight:900;letter-spacing:.055em;text-transform:uppercase;margin:0 auto 7px;color:#173f67;text-align:center;font-size:clamp(.7rem,.95vw,.92rem)}.conflict-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:clamp(4px,.65vw,10px);width:100%;margin:0}.conflict-row{display:grid;grid-template-columns:1fr 1fr;gap:4px;min-width:0}.conflict-label{grid-column:1/-1;min-height:2.2em;display:flex;align-items:flex-end;justify-content:center;text-align:center;font-size:clamp(.5rem,.68vw,.76rem);font-weight:800;line-height:1.12;color:#30465d;padding:0 1px}.conflict-choice{position:relative;width:100%;min-width:0;min-height:68px;border-radius:14px;font-size:clamp(1.05rem,1.8vw,1.9rem);font-weight:900;line-height:1;padding:6px 2px;white-space:normal;box-shadow:0 4px 12px rgba(15,42,70,.08);letter-spacing:.05em;overflow:hidden}.conflict-choice[data-value="1"]{background:#e9f8ef;color:#086b3a;border:2px solid #55a879}.conflict-choice[data-value="0"]{background:#fff0ef;color:#a61f17;border:2px solid #d78b86}.conflict-row[data-decision="3"] .conflict-choice{background:#eef4fb;color:#123f6b;border-color:#8fa3b9}.conflict-choice.selected{outline:3px solid #183f67;outline-offset:1px}.conflict-choice[disabled]{opacity:.52}.conflict-choice.feedback-correct,.conflict-choice.feedback-incorrect{opacity:1!important}.conflict-choice.feedback-correct{background:#d8f7e4!important;border-color:#087a3f!important;color:#065f32!important;box-shadow:0 0 0 4px rgba(8,122,63,.18),0 8px 20px rgba(8,122,63,.22)}.conflict-choice.feedback-incorrect{background:#ffe1df!important;border-color:#b42318!important;color:#9b1c14!important;box-shadow:0 0 0 4px rgba(180,35,24,.16),0 8px 20px rgba(180,35,24,.2)}.conflict-choice.feedback-correct::after,.conflict-choice.feedback-incorrect::after{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(2rem,3vw,3.4rem);font-weight:1000;line-height:1;background:rgba(255,255,255,.28);animation:conflict-feedback-pop .7s ease-out both;pointer-events:none}.conflict-choice.feedback-correct::after{content:'✓';color:#087a3f}.conflict-choice.feedback-incorrect::after{content:'✕';color:#b42318}@keyframes conflict-feedback-pop{0%{opacity:0;transform:scale(.45)}25%{opacity:1;transform:scale(1.14)}100%{opacity:1;transform:scale(1)}}#conflict-submit{display:block;width:min(100%,560px);min-height:32px;margin:6px auto 0;padding:6px 10px;border-radius:9px;font-size:.68rem;font-weight:900;text-transform:uppercase}#conflict-progress,#conflict-score{font-size:.64rem;margin-top:4px;color:#53697e;text-align:center;line-height:1.15}@media(max-width:760px){.response-stage{min-height:166px;flex-basis:166px}#conflict-matrix{padding-left:3px;padding-right:3px}.conflict-grid{gap:2px}.conflict-row{gap:2px}.conflict-label{font-size:.42rem;min-height:2.5em}.conflict-choice{min-height:58px;border-radius:9px;font-size:.88rem;padding:4px 1px;border-width:1px}.conflict-choice.feedback-correct::after,.conflict-choice.feedback-incorrect::after{font-size:2rem}#conflict-submit{min-height:29px;margin-top:4px;font-size:.58rem}#conflict-progress,#conflict-score{font-size:.52rem}}`;
    documentObject.head.appendChild(style);
  }
  function installMatrixUI(rootObject,app){
    const d=rootObject.document; installStyles(d);
    const originalButtons=d.querySelector('.response-buttons');
    let matrix=d.getElementById('conflict-matrix');
    if(!matrix){
      matrix=d.createElement('section'); matrix.id='conflict-matrix'; matrix.setAttribute('aria-label','Five-decision relational conflict matrix');
      const labels=['Statement 1 — N-back','Statement 2 — N-back','Statement 3 — N-back','Statement 3 — entailed?','Complete triad — N-back'];
      const keyPairs=[['A','S'],['D','F'],['H','J'],['K','L'],['Spacebar','N']];
      matrix.innerHTML=`<div class="conflict-heading">Relational conflict matrix</div><div class="conflict-grid">${labels.map((label,index)=>`<div class="conflict-row" data-decision="${index}"><div class="conflict-label">${label}</div><button class="conflict-choice" data-value="1" type="button" aria-label="${label} positive response — press ${keyPairs[index][0]}">${keyPairs[index][0]}</button><button class="conflict-choice" data-value="0" type="button" aria-label="${label} negative response — press ${keyPairs[index][1]}">${keyPairs[index][1]}</button></div>`).join('')}</div><button id="conflict-submit" type="button" disabled>Submit all five decisions</button><div id="conflict-progress" aria-live="polite">0 of 5 decisions entered</div><div id="conflict-score" aria-live="polite"></div>`;
      originalButtons?.insertAdjacentElement('afterend',matrix);
    }
    const responses=new Array(5).fill(null), decisionTimes=new Array(5).fill(null);
    const clearFeedback=()=>matrix.querySelectorAll('.conflict-choice').forEach(button=>{
      button.classList.remove('feedback-correct','feedback-incorrect');
      button.removeAttribute('data-feedback');
    });
    const setVisible=isModeOne=>{
      matrix.classList.toggle('active',isModeOne);
      d.body.classList.toggle('mode-one-conflict-active',isModeOne);
      matrix.setAttribute('aria-hidden',String(!isModeOne));
    };
    const reset=trial=>{
      responses.fill(null); decisionTimes.fill(null); matrix.dataset.startedAt=String(Date.now()); clearFeedback();
      const selectedMode=Number(d.getElementById('logic-mode')?.value||0);
      const isModeOne=selectedMode===0;
      setVisible(isModeOne);
      const scored=isModeOne&&Boolean(trial?.scored);
      matrix.querySelectorAll('.conflict-choice').forEach(b=>{b.classList.remove('selected');b.disabled=!scored;});
      matrix.querySelector('#conflict-submit').disabled=true;
      matrix.querySelector('#conflict-progress').textContent=scored?'0 of 5 decisions entered':(isModeOne?'Memory fill — observe only; no response required':'');
      matrix.querySelector('#conflict-score').textContent='';
    };
    const showFeedback=(correctness,selectedResponses)=>{
      clearFeedback();
      correctness.forEach((correct,index)=>{
        const row=matrix.querySelector(`[data-decision="${index}"]`);
        if(!row)return;
        const selectedValue=selectedResponses[index]?1:0;
        const button=row.querySelector(`[data-value="${selectedValue}"]`);
        if(!button)return;
        button.classList.add(correct?'feedback-correct':'feedback-incorrect');
        button.dataset.feedback=correct?'correct':'incorrect';
        button.setAttribute('aria-label',`${button.getAttribute('aria-label')} — ${correct?'correct':'incorrect'}`);
      });
      matrix.querySelectorAll('.conflict-choice').forEach(button=>button.disabled=true);
      matrix.querySelector('#conflict-submit').disabled=true;
    };
    matrix.addEventListener('click',event=>{const button=event.target.closest('.conflict-choice'); if(!button||button.disabled||!app.awaiting)return; const row=button.closest('.conflict-row'),index=Number(row.dataset.decision); responses[index]=button.dataset.value==='1'; if(decisionTimes[index]===null) decisionTimes[index]=Date.now()-Number(matrix.dataset.startedAt||Date.now()); row.querySelectorAll('.conflict-choice').forEach(choice=>choice.classList.toggle('selected',choice===button)); const completed=responses.filter(v=>v!==null).length; matrix.querySelector('#conflict-progress').textContent=`${completed} of 5 decisions entered`; matrix.querySelector('#conflict-submit').disabled=completed!==5;});
    matrix.querySelector('#conflict-submit').addEventListener('click',()=>{if(!app.awaiting||responses.some(v=>v===null))return;app.submitConflictMatrix(responses.slice(),decisionTimes.slice());});
    const keyboard=['a','s','d','f','h','j','k','l',' ','n'];
    d.addEventListener('keydown',event=>{
      if(!matrix.classList.contains('active')||!app.awaiting||/INPUT|SELECT|TEXTAREA/.test(event.target?.tagName||''))return;
      const normalisedKey=event.code==='Space'?' ':event.key.toLowerCase();
      const keyIndex=keyboard.indexOf(normalisedKey);
      if(keyIndex<0)return;
      event.preventDefault();event.stopImmediatePropagation();
      const decision=Math.floor(keyIndex/2),value=keyIndex%2===0;
      matrix.querySelector(`[data-decision="${decision}"]`)?.querySelector(`[data-value="${value?1:0}"]`)?.click();
    },true);
    d.getElementById('logic-mode')?.addEventListener('change',()=>reset(app.current));
    setVisible(Number(d.getElementById('logic-mode')?.value||0)===0);
    return Object.assign(matrix,{resetResponses:reset,responses,decisionTimes,setVisible,showFeedback,clearFeedback});
  }

  function installBrowser(rootObject){
    const app=rootObject.__ontologicalWorlds; if(!app||!requireCore()||app.__modeOneConflictMatrixV20)return;
    const originalMakeTrial=app.makeTrial.bind(app), originalNextTrial=app.nextTrial.bind(app), originalAnswer=app.answer.bind(app), originalStop=app.stop.bind(app);
    const matrix=installMatrixUI(rootObject,app);
    const premiseDisplay=rootObject.document.getElementById('premise-display');
    const feedback=rootObject.document.getElementById('feedback');
    const explanation=rootObject.document.getElementById('trial-explanation');
    const timerBar=rootObject.document.getElementById('timer-bar');
    app.conflictDecisionStats=Array.from({length:5},createDecisionScore);

    function renderModeOneTrial(trial){
      const c=requireCore();
      const rendered=c.renderTrial(trial);
      if(premiseDisplay){
        premiseDisplay.textContent=rendered;
        premiseDisplay.classList.remove('correct','incorrect');
      }
      if(feedback) feedback.textContent='';
      if(explanation) explanation.textContent='';
      try{app.speak?.(rendered);}catch(_){ }
      return rendered;
    }

    function scheduleModeOneTimeout(token,seconds){
      clearTimeout(app.timerId);
      const started=Date.now();
      const updateBar=()=>{
        if(!timerBar||!app.running||app.paused||token!==app.sessionToken)return;
        const elapsed=(Date.now()-started)/1000;
        timerBar.style.width=`${Math.max(0,100*(1-elapsed/seconds))}%`;
        if(elapsed<seconds) rootObject.requestAnimationFrame?.(updateBar);
      };
      if(timerBar){timerBar.style.width='100%';rootObject.requestAnimationFrame?.(updateBar);}
      app.timerId=rootObject.setTimeout(()=>{
        if(!app.running||app.paused||token!==app.sessionToken)return;
        if(app.current?.scored&&app.awaiting){
          app.awaiting=false;
          app.conflictDecisionStats.forEach(row=>{row.timeouts++;});
        }
        app.nextTrial(token);
      },seconds*1000);
    }

    app.makeTrial=function(){
      const settings=this.settings();
      if(Number(settings.mode)!==0)return originalMakeTrial();
      const level=Math.max(1,Math.min(8,Math.round(Number(this.n||settings.n)||1)));
      const target=this.trials[this.trials.length-level];
      if(!target)return generateWarmupTrial(this.rng,{interferenceLevel:Number(rootObject.document.getElementById('interference-slider')?.value)||0});
      const requestedMatch=this.rng.next()<settings.matchProbability;
      const options={match:requestedMatch,nBackLevel:level,interferenceLevel:Number(rootObject.document.getElementById('interference-slider')?.value)||0,roleSensitive:Boolean(this.trials.length%2)};
      for(let attempt=0;attempt<4;attempt++){
        try{return generateConflictTrial(this.rng,target,options);}catch(error){if(attempt===3)console.warn('Mode 1 trial generation recovered after repeated failure.',error);}
      }
      const fallback=renameAndTransform(this.rng,target);
      const evaluation=evaluateConflictMatrix(target,fallback,{roleSensitive:options.roleSensitive});
      Object.assign(fallback,{nBackRequestedMatch:true,nBackMatch:true,isMatch:true,statementMatchVector:evaluation.statementMatches.slice(),conclusionEntailed:evaluation.conclusionEntailed,conflictResponseVector:evaluation.responseVector.slice(),mappingConflict:evaluation.mappingConflict,localStatementCompatibility:evaluation.localStatementCompatibility.slice(),roleSensitive:options.roleSensitive,interferenceProfile:`${evaluation.statementMatches.map(Number).join('')}:${Number(evaluation.conclusionEntailed)}:1`,scored:true,recoveredGeneration:true});
      return fallback;
    };

    app.nextTrial=function(token=this.sessionToken){
      if(Number(this.settings().mode)!==0)return originalNextTrial(token);
      if(!this.running||this.paused||token!==this.sessionToken)return null;
      let trial;
      try{trial=this.makeTrial();}catch(error){
        console.error('Mode 1 native trial generation failed; using safe warm-up.',error);
        trial=generateWarmupTrial(this.rng,{interferenceLevel:Number(rootObject.document.getElementById('interference-slider')?.value)||0});
        trial.recoveredGeneration=true;
      }
      this.current=trial;
      this.trials.push(trial);
      this.score.shown++;
      this.awaiting=Boolean(trial.scored);
      renderModeOneTrial(trial);
      matrix.resetResponses(trial);
      try{this.updateStats?.();}catch(_){ }
      const seconds=Math.max(2,Number(this.settings().seconds)||8);
      scheduleModeOneTimeout(token,seconds);
      return trial;
    };

    app.submitConflictMatrix=function(responses,decisionTimes){
      if(!this.current?.scored||!Array.isArray(this.current.conflictResponseVector)||!this.awaiting)return;
      const expected=this.current.conflictResponseVector,correctness=responses.map((value,index)=>value===expected[index]);
      Object.assign(this.current,{conflictResponses:responses.slice(),conflictDecisionCorrectness:correctness.slice(),conflictCorrectCount:correctness.filter(Boolean).length,conflictAllCorrect:correctness.every(Boolean),conflictDecisionTimes:decisionTimes?.slice?.()||[]});
      correctness.forEach((correct,index)=>recordDecisionScore(this.conflictDecisionStats,index,correct,decisionTimes?.[index]));
      const scoreText=this.conflictDecisionStats.map((row,index)=>`D${index+1} ${row.total?Math.round(100*row.correct/row.total):0}%`).join(' · ');
      matrix.querySelector('#conflict-score').textContent=scoreText;
      if(typeof requireCore().recordNBackResponse==='function') requireCore().recordNBackResponse(this.current,{responses:responses.slice(),correctness:correctness.slice(),allCorrect:this.current.conflictAllCorrect});
      this.awaiting=false;
      clearTimeout(this.timerId);
      matrix.showFeedback(correctness,responses);
      if(feedback) feedback.textContent=this.current.conflictAllCorrect?'ALL FIVE CORRECT':`${this.current.conflictCorrectCount}/5 CORRECT`;
      if(explanation){try{explanation.textContent=requireCore().explainTrial(this.current);}catch(_){explanation.textContent='';}}
      try{this.updateStats?.();}catch(_){ }
      rootObject.setTimeout(()=>{if(this.running&&!this.paused)this.nextTrial(this.sessionToken);},1150);
    };

    app.answer=function(response){
      if(Number(this.settings().mode)===0)return;
      return originalAnswer(response);
    };
    app.stop=function(...args){const result=originalStop(...args);matrix.resetResponses(null);return result;};
    Object.assign(app,{modeOneConflictAnalyseAlignment:analyseAlignment,modeOneConflictEvaluate:evaluateConflictMatrix,modeOneConflictEvaluateHistory:evaluateHistory,modeOneConflictGenerateTrial:generateConflictTrial,modeOneConflictRunAudit:runAudit,__modeOneConflictMatrixV20:true});
  }

  return Object.freeze({version:31,LEVELS,ALL_MASKS,analyseAlignment,evaluateConflictMatrix,generateConflictTrial,generateWarmupTrial,evaluateHistory,runAudit,installBrowser});
});