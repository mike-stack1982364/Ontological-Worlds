'use strict';
// Focused real-browser contract: preserve the published controls while changing
// only how all three displayed statements share one N-back letter mapping.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const baselineMode=process.argv.includes('--baseline');
const root=path.resolve(process.env.MATCHING_PAGE_ROOT||path.join(__dirname,'..'));
const artifacts=path.resolve(process.env.MATCHING_BROWSER_ARTIFACTS||'/tmp/ontological-matching-browser');
fs.mkdirSync(artifacts,{recursive:true});
async function contract(page){return page.evaluate(()=>({
 configuration:[...document.querySelectorAll('.controls input,.controls select,.controls button')].map(e=>({tag:e.tagName,id:e.id,type:e.type,text:e.tagName==='BUTTON'?e.textContent.trim():undefined,min:e.getAttribute('min'),max:e.getAttribute('max'),step:e.getAttribute('step'),options:e.tagName==='SELECT'?[...e.options].map(o=>({value:o.value,text:o.textContent.trim()})):undefined})),
 matrix:[...document.querySelectorAll('#conflict-matrix .conflict-row')].map(row=>({decision:row.dataset.decision,label:row.querySelector('.conflict-label').textContent.trim(),buttons:[...row.querySelectorAll('button')].map(e=>({value:e.dataset.value,text:e.textContent.trim(),type:e.type}))})),
 binary:['match-btn','no-match-btn'].map(id=>{const e=document.getElementById(id);return{id,text:e.textContent.trim(),label:e.getAttribute('aria-label'),type:e.type};})
}));}
async function matrixLayout(page){return page.evaluate(()=>[...document.querySelectorAll('#conflict-matrix .conflict-choice')].map(e=>{
 const r=e.getBoundingClientRect(),parent=e.closest('#conflict-matrix').getBoundingClientRect(),s=getComputedStyle(e);
 return {key:e.textContent.trim(),x:Math.round((r.x-parent.x)*100)/100,y:Math.round((r.y-parent.y)*100)/100,width:r.width,height:r.height,color:s.color,backgroundColor:s.backgroundColor,borderColor:s.borderColor,fontSize:s.fontSize};
}));}
async function main(){
 const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(error?'Not found':data);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[],controls={},layouts={},modeOne=[],modeTwo=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.__ontologicalWorlds?.__modeTwoFinalRuntimeV22);
  await page.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
  await page.locator('#premise-vol').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('change',{bubbles:true}));});
  for(const mode of ['0','1']){
   await page.locator('#logic-mode').selectOption(mode);controls[mode]=await contract(page);layouts[mode]={};
   for(const width of [1280,390]){await page.setViewportSize({width,height:1000});layouts[mode][width]=await matrixLayout(page);await page.locator('.controls').screenshot({path:path.join(artifacts,`${baselineMode?'baseline':'final'}-mode-${Number(mode)+1}-controls-${width}.png`)});}
   await page.setViewportSize({width:1280,height:1000});
  }
  if(baselineMode){fs.writeFileSync(path.join(artifacts,'baseline-controls.json'),JSON.stringify({controls,layouts},null,2));assert.deepEqual(errors,[]);console.log('Baseline controls and screenshots captured.');return;}
  assert.deepEqual(JSON.parse(JSON.stringify({controls,layouts})),JSON.parse(fs.readFileSync(path.join(artifacts,'baseline-controls.json'),'utf8')),'published controls, choices, counts, labels, matrix layout and palette must remain unchanged at desktop and mobile widths');
  assert.equal(controls[0].matrix.length,5);assert.equal(controls[0].matrix.reduce((n,r)=>n+r.buttons.length,0),10);assert.equal(controls[1].binary.length,2);
  await page.locator('#logic-mode').selectOption('0');
  const tutorial=[];
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:1000});await page.locator('#matching-tutorial-btn').click();
   const dialog=page.locator('#matching-tutorial-dialog');await dialog.waitFor({state:'visible'});
   const text=await dialog.innerText();
   assert.match(text,/three equal-status relational statements/);assert.match(text,/all six statement assignments/);
   assert.match(text,/Current Statement 3 can match old Statement 1, 2 or 3/);assert.match(text,/K\/L is a separate question/);
   assert.doesNotMatch(text,/candidate conclusion|conclusion slot|third statement must match (the )?old third/i);
   await dialog.screenshot({path:path.join(artifacts,`final-matching-tutorial-${width}.png`)});
   tutorial.push({width,allStatementsEqual:true,allSixAssignments:true,independentKL:true});
   await dialog.locator('.matching-tutorial-close').click();await dialog.waitFor({state:'hidden'});
  }
  await page.setViewportSize({width:1280,height:1000});await page.locator('#direction-resolution').selectOption('16');
  await page.locator('#n-slider').evaluate(e=>{e.value='2';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#start-btn').click();await page.waitForFunction(()=>__ontologicalWorlds.awaiting);
  const keysets=[['a','d','h','k','Space'],['s','f','j','l','n']];
  for(let round=0;round<2;round++){
   await page.locator('#premise-display').click();
   const before=await page.evaluate(()=>__ontologicalWorlds.score.scored);
   for(let decision=0;decision<5;decision++){
    await page.keyboard.press(keysets[round][decision]);
    const selected=page.locator(`#conflict-matrix [data-decision="${decision}"] [data-value="${round===0?1:0}"]`);
    assert.equal(await selected.evaluate(e=>e.classList.contains('selected')),true);
    assert.equal(await selected.isDisabled(),true);
    await page.keyboard.press(keysets[1-round][decision]);
    assert.equal(await selected.evaluate(e=>e.classList.contains('selected')),true,'first answer remains locked');
    if(decision<4)assert.equal(await page.evaluate(()=>__ontologicalWorlds.score.scored),before);
   }
   const observed=await page.evaluate(()=>({responses:__ontologicalWorlds.current.conflictResponses,scored:__ontologicalWorlds.score.scored,shown:__ontologicalWorlds.score.shown}));
   assert.deepEqual(observed.responses,Array(5).fill(round===0));assert.equal(observed.scored,before+1);modeOne.push(observed);
   await page.evaluate(()=>__ontologicalWorlds.nextTrial(__ontologicalWorlds.sessionToken));await page.waitForFunction(()=>__ontologicalWorlds.awaiting);
  }
  const history=await page.evaluate(()=>{const a=__ontologicalWorlds,h=a.trials,i=h.length-1,e=__modeOneConflictMatrixV20.evaluateHistory(h,i,2,{roleSensitive:true});return{length:h.length,n:a.n,targetIndex:e.targetIndex,expected:e.responseVector,actual:a.current.conflictResponseVector};});
  assert.equal(history.length,3);assert.equal(history.n,2);assert.equal(history.targetIndex,0);assert.deepEqual(history.actual,history.expected);
  const fixture=await page.evaluate(()=>{
   const target={premises:[{subject:'A',relation:'N',object:'B'},{subject:'C',relation:'E',object:'A'}],conclusion:{subject:'B',relation:'SW',object:'C'},directionResolution:16};
   const current={premises:[{subject:'Y',relation:'SW',object:'Z'},{subject:'Z',relation:'E',object:'X'}],conclusion:{subject:'Y',relation:'S',object:'X'},directionResolution:16};
   const e=__modeOneConflictMatrixV20.evaluateConflictMatrix(target,current,{roleSensitive:true}),a=__ontologicalWorlds;
   Object.assign(a.current,current,{conflictResponseVector:[...e.responseVector],conclusionEntailed:e.conclusionEntailed,nBackMatch:e.wholeTrialMatch,statementMatchVector:[...e.statementMatches]});
   document.getElementById('premise-display').textContent=__modeOneSpatialCore.renderTrial(a.current);return e;
  });
  assert.deepEqual(fixture.responseVector,[true,true,true,false,true]);assert.deepEqual(fixture.assignment,[2,1,0]);
  await page.locator('#premise-display').click();for(const key of ['a','d','h','l','Space'])await page.keyboard.press(key);
  assert.equal(await page.locator('#feedback').innerText(),'ALL FIVE CORRECT');
  const explanation=await page.locator('#trial-explanation').innerText();
  assert.match(explanation,/N-back: MATCH.*3 of 3 statements match/);assert.match(explanation,/Separate K\/L check: NO/);
  assert.match(explanation,/does not determine the N-back match/);assert.doesNotMatch(explanation,/conclusion/i);
  assert.equal(await page.evaluate(()=>__ontologicalWorlds.score.scored),3);
  await page.locator('#conflict-matrix').screenshot({path:path.join(artifacts,'final-mode-one-matrix.png')});await page.locator('#stop-btn').click();

  for(const complexity of ['facets','worlds']){
   await page.locator('#logic-mode').selectOption('1');await page.locator('#mode-two-complexity').selectOption(complexity);await page.locator('#mode-two-reflections').uncheck();
   await page.locator('#direction-resolution').selectOption('16');await page.locator('#start-btn').click();
   for(let i=0;i<2;i++){await page.locator('#mode-two-warmup-continue').waitFor({state:'visible'});await page.locator('#mode-two-warmup-continue').click();}
   await page.waitForFunction(()=>__ontologicalWorlds.awaiting);
   assert.equal(await page.locator('#mode-two-complexity').isDisabled(),true);
   const modeTwoText=await page.locator('#premise-display').innerText();assert.doesNotMatch(modeTwoText,/candidate|conclusion/i);
   assert.match(modeTwoText,/ is /);
   for(const key of ['f','j','d','k']){
    await page.locator('#premise-display').click();
    const before=await page.evaluate(()=>{const a=__ontologicalWorlds,c=a.current,t=a.trials.at(-1-a.n);return{scored:a.score.scored,shown:a.score.shown,n:a.n,comparison:__modeTwoOntologyNBackV22.compare(t,c).isMatch,actual:c.nBackMatch};});
    assert.equal(before.n,2);assert.equal(before.comparison,before.actual);
    await page.keyboard.press(key);
    const after=await page.evaluate(()=>{const a=__ontologicalWorlds;return{scored:a.score.scored,response:a.current.response,correct:a.current.correct,truth:a.current.nBackMatch};});
    assert.equal(after.scored,before.scored+1);assert.equal(after.response,['f','j'].includes(key));assert.equal(after.correct,after.response===after.truth);
    modeTwo.push({complexity,key,...before,...after});
    if(key!=='k'){await page.evaluate(()=>__ontologicalWorlds.nextTrial(__ontologicalWorlds.sessionToken));await page.waitForFunction(()=>__ontologicalWorlds.awaiting);}
   }
   const bindingFixtures=await page.evaluate(()=>{
    const api=__modeTwoOntologyNBackV22,target=__ontologicalWorlds.current,clone=t=>JSON.parse(JSON.stringify(t));
    const current=clone(target),all=[...current.premises,current.conclusion];current.premises=[all[2],all[1]];current.conclusion=all[0];
    const reordered=api.compare(target,current),changed=clone(current);changed.premises[0].subjectFacet.category=changed.premises[0].subjectFacet.category==='Action'?'Division':'Action';
    const changedBinding=api.compare(target,changed);
    let nested=null;if(target.worlds){const changedWorld=clone(target),child=Object.values(changedWorld.worlds)[0];child.premises[0].subjectFacet.category=child.premises[0].subjectFacet.category==='Action'?'Division':'Action';nested=api.compare(target,changedWorld).isMatch;}
    return{reordered:reordered.isMatch,matches:reordered.statementMatches||reordered.alignment?.statementMatches,changedBinding:changedBinding.isMatch,nested};
   });
   assert.equal(bindingFixtures.reordered,true);assert.equal(bindingFixtures.changedBinding,false);if(complexity==='worlds')assert.equal(bindingFixtures.nested,false);
   modeTwo.push({complexity,bindingFixtures});
   await page.setViewportSize({width:390,height:844});await page.locator('#premise-display').screenshot({path:path.join(artifacts,`final-${complexity}-stimulus-mobile.png`)});await page.setViewportSize({width:1280,height:1000});
   await page.locator('#stop-btn').click();assert.equal(await page.locator('#mode-two-complexity').isEnabled(),true);
   assert.equal(await page.evaluate(()=>__ontologicalWorlds.history[0].completed),4);
  }
  assert.deepEqual(errors,[]);const report={passed:true,controlsIdentical:true,matrixRows:5,matrixButtons:10,modeTwoButtons:2,modeOneKeys:keysets.flat(),modeOne,modeOneExactNBack:history,modeOneRolePermutation:fixture,modeOneExplanation:explanation,tutorial,layouts,modeTwo,errors};fs.writeFileSync(path.join(artifacts,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
