'use strict';
const assert=require('assert');
const core=require('./mode-one-spatial-core.js');
global.__modeOneSpatialCore=core;
global.__modeOneTriadicEntailmentCore=core;
const conflict=require('./mode-one-conflict-matrix-v20.js');
const coreAudit=core.runResolutionAudit(5000);
assert.strictEqual(coreAudit.passed,true,JSON.stringify(coreAudit.failures));
const conflictAudit=conflict.runAudit(1000);
assert.strictEqual(conflictAudit.passed,true,JSON.stringify(conflictAudit.failures));
for(const resolution of [4,8,16]){
 const pool=new Set(core.allowedCodes(resolution));
 for(let index=0;index<1000;index++){
  const rng={state:(resolution*100000+index)>>>0,next(){let value=this.state+=1831565813;value=Math.imul(value^value>>>15,1|value);value^=value+Math.imul(value^value>>>7,61|value);return((value^value>>>14)>>>0)/4294967296;},pick(values){return values[Math.floor(this.next()*values.length)];},shuffle(values){const output=[...values];for(let i=output.length-1;i>0;i--){const j=Math.floor(this.next()*(i+1));[output[i],output[j]]=[output[j],output[i]];}return output;}};
  const trial=core.generateTrial(rng,{matchProbability:index%2,interferenceLevel:index%101,directionResolution:resolution});
  const result=core.evaluateTrial(trial);
  const relations=[...trial.premises.map(item=>item.relation),trial.conclusion.relation,result.expectedRelation];
  assert.ok(relations.every(code=>pool.has(code)),`${resolution}: ${relations.join(',')}`);
  assert.strictEqual(trial.directionResolution,resolution);
  assert.notStrictEqual(result.expectedRelation,'BALANCE');
 }
}
console.log(JSON.stringify({coreAudit,conflictAudit},null,2));
