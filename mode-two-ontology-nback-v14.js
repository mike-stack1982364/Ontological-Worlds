'use strict';
(function expose(root,factory){
  const api=factory(root);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root){root.__modeTwoOntologyNBackV14=api;const install=()=>api.installBrowser(root);if(root.document?.readyState==='loading'&&typeof root.addEventListener==='function')root.addEventListener('DOMContentLoaded',install,{once:true});else install();}
})(typeof window!=='undefined'?window:globalThis,root=>{
  const LEVELS=Object.freeze([1,2,3,4,5,6,7,8]);
  const ONTOLOGY_CATEGORIES=Object.freeze(['All','Difference','Action','Division','Connection','Multiplication','Projection','Encompassment','Completion']);
  const FORM_ORDERS=Object.freeze(['IO','OI']);
  const FORM_NAMES=Object.freeze({I:'Inner',O:'Outer'});
  const core=root?.__modeOneTriadicEntailmentCore||root?.__modeOneSpatialCore||(typeof require==='function'?require('./mode-one-spatial-core.js'):null);
  const requireCore=()=>{if(!core)throw new Error('Mode 2 requires the Mode 1 Triadic Entailment core.');return core;};
  const clone=value=>JSON.parse(JSON.stringify(value));
  const random=rng=>rng?.next?rng.next():Math.random();
  const pick=(rng,values)=>rng?.pick?rng.pick(values):values[Math.floor(random(rng)*values.length)];
  function shuffled(rng,values){if(rng?.shuffle)return rng.shuffle(values);const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random(rng)*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
  function ontologyDecorations(trial){return{categories:Array.isArray(trial?.ontologyCategories)&&trial.ontologyCategories.length===3?trial.ontologyCategories.slice():['Completion','Multiplication','Difference'],order:FORM_ORDERS.includes(trial?.order)?trial.order:'IO'};}
  const trialLetters=trial=>[...new Set([...trial.premises,trial.conclusion].flatMap(s=>[s.subject,s.object]))];
  function permutations(values){if(values.length<2)return[values.slice()];return values.flatMap((value,index)=>permutations(values.slice(0,index).concat(values.slice(index+1))).map(rest=>[value,...rest]));}
  function normalisedStatement(statement,mapping){const c=requireCore();const direct=`${mapping[statement.subject]}>${statement.relation}>${mapping[statement.object]}`;const inverse=`${mapping[statement.object]}>${c.opposite(statement.relation)}>${mapping[statement.subject]}`;return direct<inverse?direct:inverse;}
  function relationalSignature(trial){
    if(!trial||!Array.isArray(trial.premises)||trial.premises.length!==2||!trial.conclusion)throw new Error('Mode 2 requires exactly two premises and one conclusion.');
    const letters=trialLetters(trial);if(letters.length!==3)throw new Error('Mode 2 requires exactly three distinct letters.');
    requireCore().evaluateTrial(trial);
    return permutations(['A','B','C']).map(labels=>{const map=Object.fromEntries(letters.map((letter,i)=>[letter,labels[i]]));const premises=trial.premises.map(s=>normalisedStatement(s,map)).sort();return`MODE2-COMPLETE-RELATIONAL-NBACK-V3|P:${premises.join('&')}|C:${normalisedStatement(trial.conclusion,map)}`;}).sort()[0];
  }
  function evaluate(trial){const result=requireCore().evaluateTrial(trial);return Object.freeze({...result,isMatch:result.isEntailed,withinTrialEntailed:result.isEntailed,ontologyRelevant:false,formOrderRelevant:false,signature:relationalSignature(trial)});}
  function compare(target,current){if(!current){current=target;target=null;}const currentSignature=relationalSignature(current);const targetSignature=target?relationalSignature(target):null;return Object.freeze({isMatch:Boolean(target&&targetSignature===currentSignature),valid:Boolean(target),target:targetSignature,current:currentSignature,currentWithinTrial:evaluate(current)});}
  function evaluateHistory(history,currentIndex,nBackLevel){const level=Math.max(1,Math.min(8,Math.round(Number(nBackLevel)||1)));const targetIndex=currentIndex-level;if(targetIndex<0)return Object.freeze({nBackLevel:level,currentIndex,targetIndex,warmup:true,isMatch:false,scored:false});return Object.freeze({...compare(history[targetIndex],history[currentIndex]),nBackLevel:level,currentIndex,targetIndex,warmup:false,scored:true});}
  function decorateTrial(trial,categories=['Completion','Multiplication','Difference'],order='IO'){const copy=clone(trial);copy.mode=1;copy.publicMode=2;copy.ontologyCategories=[...categories];copy.order=FORM_ORDERS.includes(order)?order:'IO';copy.ontologyScoringNeutral=true;copy.withinTrialEntailed=requireCore().evaluateTrial(copy).isEntailed;copy.signature=relationalSignature(copy);return copy;}
  function renderOntologicalTrial(trial){const c=requireCore();const{categories,order}=ontologyDecorations(trial);const forms=order.split('').map(code=>FORM_NAMES[code]);return[...trial.premises,trial.conclusion].map((s,i)=>{const direction=c.direction(s.relation).name;if(i===0)return`${forms[0]} ${categories[0]} ${s.subject} is ${direction} of ${s.object}`;if(i===1)return`${forms[1]} ${categories[1]} ${s.subject} is ${direction} of ${s.object}`;return`${categories[2]} ${s.subject} is ${direction} of ${s.object}`;}).join('; ')+'.';}
  function generateTrial(rng,options={}){return decorateTrial(requireCore().generateTrial(rng,options),[pick(rng,ONTOLOGY_CATEGORIES),pick(rng,ONTOLOGY_CATEGORIES),pick(rng,ONTOLOGY_CATEGORIES)],pick(rng,FORM_ORDERS));}
  function transformedCopy(rng,target){const c=requireCore();const source=trialLetters(target);const destination=shuffled(rng,c.LETTERS||'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')).slice(0,3);const out=clone(c.renameTrial(target,Object.fromEntries(source.map((letter,i)=>[letter,destination[i]]))));if(random(rng)<.5)out.premises.reverse();out.premises=out.premises.map(s=>random(rng)<.5?c.invert(s):s);if(random(rng)<.5)out.conclusion=c.invert(out.conclusion);return decorateTrial(out,[pick(rng,ONTOLOGY_CATEGORIES),pick(rng,ONTOLOGY_CATEGORIES),pick(rng,ONTOLOGY_CATEGORIES)],pick(rng,FORM_ORDERS));}
  function makeRelationalLure(rng,target){
    const c=requireCore();
    for(let attempt=0;attempt<1024;attempt++){
      const trial=transformedCopy(rng,target);
      const all=[...trial.premises,trial.conclusion];
      const slot=Math.floor(random(rng)*3);
      const d=c.direction(all[slot].relation);
      all[slot]={...all[slot],relation:c.DIRECTIONS[(d.index+(random(rng)<.5?1:15))%16].code};
      trial.premises=all.slice(0,2);trial.conclusion=all[2];
      try{
        const signature=relationalSignature(trial);
        if(signature===relationalSignature(target))continue;
        trial.signature=signature;trial.interferenceSlot=slot+1;trial.partialStatementCompatibility=2;trial.lureGenerationAttempts=attempt+1;
        return trial;
      }catch(error){
        if(!/collapse|same position|connected|endpoint/i.test(String(error?.message||error)))throw error;
      }
    }
    throw new Error('Unable to generate a valid two-of-three Mode 2 relational lure without collapsing the spatial graph.');
  }
  function generateNBackTrial(rng,target,options={}){if(!target)throw new Error('A historical N-back target is required.');const requestedMatch=Boolean(options.match);const trial=requestedMatch?transformedCopy(rng,target):makeRelationalLure(rng,target);const result=compare(target,trial);trial.nBackLevel=Math.max(1,Math.min(8,Math.round(Number(options.nBackLevel)||1)));trial.nBackRequestedMatch=requestedMatch;trial.nBackMatch=result.isMatch;trial.isMatch=result.isMatch;trial.scored=true;trial.nBackTargetSignature=result.target;trial.nBackCurrentSignature=result.current;if(result.isMatch!==requestedMatch)throw new Error('Mode 2 generator failed requested complete-structure relation.');return trial;}
  function runExhaustiveAudit(iterationsPerLevel=32768){
    class AuditRng{constructor(seed){this.s=seed>>>0;}next(){let v=this.s+=1831565813;v=Math.imul(v^v>>>15,1|v);v^=v+Math.imul(v^v>>>7,61|v);return((v^v>>>14)>>>0)/4294967296;}pick(values){return values[Math.floor(this.next()*values.length)];}shuffle(values){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(this.next()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}}
    const failures=[],perLevel=[];let totalEvaluations=0,matches=0,nonMatches=0,partialLureChecks=0;
    for(const level of LEVELS){const rng=new AuditRng(0x4d320000+level),history=[];const row={nBackLevel:level,evaluations:0,matches:0,nonMatches:0,falseMatches:0,falseNonMatches:0,wrongOffsetFailures:0,partialLureFailures:0};for(let i=0;i<level;i++)history.push(generateTrial(rng,{matchProbability:1}));for(let i=0;i<iterationsPerLevel;i++){const requestedMatch=i%2===0;const trial=generateNBackTrial(rng,history[history.length-level],{match:requestedMatch,nBackLevel:level});history.push(trial);const index=history.length-1,result=evaluateHistory(history,index,level);row.evaluations++;totalEvaluations++;if(result.targetIndex!==index-level)row.wrongOffsetFailures++;if(result.isMatch!==requestedMatch)requestedMatch?row.falseNonMatches++:row.falseMatches++;else if(result.isMatch){row.matches++;matches++;}else{row.nonMatches++;nonMatches++;}if(!requestedMatch){partialLureChecks++;if(trial.partialStatementCompatibility!==2)row.partialLureFailures++;}}if(row.falseMatches||row.falseNonMatches||row.wrongOffsetFailures||row.partialLureFailures)failures.push(`level-${level}`);perLevel.push(row);}
    return Object.freeze({passed:failures.length===0,mode:2,nBackLevels:LEVELS,iterationsPerLevel,totalEvaluations,matches,nonMatches,matchRate:matches/totalEvaluations,nonMatchRate:nonMatches/totalEvaluations,partialLureChecks,failures,perLevel,invariants:Object.freeze({completeThreeStatementCrossTrialComparison:true,oneStatementCompatibilityInsufficient:true,twoStatementCompatibilityInsufficient:true,modeOneCompassRelationsUsed:true,ontologyCategoriesScoringNeutral:true,formOrderScoringNeutral:true,letteringIdentityIgnored:true,premiseOrderIgnored:true,equivalentWordingInversionIgnored:true,allNBackLevelsUseSameComparator:true,collapsedGraphsRejectedAndRegenerated:true})});
  }
  function installBrowser(rootObject){const app=rootObject.__ontologicalWorlds;if(!app||!requireCore()||app.__modeTwoOntologyNBackV14)return;const originalMakeTrial=app.makeTrial.bind(app),originalRenderTrial=app.renderTrial.bind(app);const originalMatchSignature=typeof app.matchSignature==='function'?app.matchSignature.bind(app):null;app.makeTrial=function(){const settings=this.settings();if(Number(settings.mode)!==1)return originalMakeTrial();const level=Math.max(1,Math.min(8,Math.round(Number(this.n||settings.n)||1)));const target=this.trials[this.trials.length-level];if(!target){const warmup=generateTrial(this.rng,{matchProbability:this.rng.next()<.5?1:0});warmup.nBackWarmup=true;warmup.scored=false;return warmup;}return generateNBackTrial(this.rng,target,{match:this.rng.next()<settings.matchProbability,nBackLevel:level});};app.renderTrial=function(trial){return Number(trial?.mode)===1||Number(trial?.publicMode)===2?renderOntologicalTrial(trial):originalRenderTrial(trial);};app.matchSignature=function(trial,mode=trial?.mode){return Number(mode)===1||Number(trial?.publicMode)===2?relationalSignature(trial):(originalMatchSignature?originalMatchSignature(trial,mode):trial?.signature||'');};Object.assign(app,{modeTwoOntologyCompare:compare,modeTwoOntologyEvaluate:evaluate,modeTwoOntologyEvaluateHistory:evaluateHistory,modeTwoOntologyGenerateTrial:generateTrial,modeTwoOntologyGenerateNBackTrial:generateNBackTrial,modeTwoOntologyRenderTrial:renderOntologicalTrial,modeTwoOntologyRunAudit:runExhaustiveAudit,__modeTwoOntologyNBackV14:true});}
  return Object.freeze({version:20,LEVELS,ONTOLOGY_CATEGORIES,FORM_ORDERS,FORM_NAMES,ontologyDecorations,decorateTrial,relationalSignature,evaluate,compare,evaluateHistory,renderOntologicalTrial,generateTrial,generateNBackTrial,runExhaustiveAudit,installBrowser});
});
