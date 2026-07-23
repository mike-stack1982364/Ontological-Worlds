'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const button = document.getElementById('extra-training-btn');
  const panel = document.getElementById('extra-training-panel');
  const logicMode = document.getElementById('logic-mode');
  const premiseDisplay = document.getElementById('premise-display');
  const explanation = document.getElementById('trial-explanation');
  if (!app || !button || !panel || !logicMode || !premiseDisplay) return;

  const EXTRA_MODE = 'extra-number-nback';
  const digits = [1,2,3,4,5,6,7,8,9];
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine'];
  const rateMap = {
    average: 1,
    'moderately-fast': 1.3,
    fast: 1.65,
    'very-fast': 2.1,
    'extremely-fast': 2.8,
    'incredibly-fast': 4,
    'ultra-fast': 6
  };
  const separators = {
    average: '. ',
    'moderately-fast': ', ',
    fast: ' ',
    'very-fast': '\u2009',
    'extremely-fast': '\u200A',
    'incredibly-fast': '\u2060',
    'ultra-fast': '\u200B'
  };

  const legacy = {
    settings: app.settings.bind(app),
    makeTrial: app.makeTrial.bind(app),
    renderTrial: app.renderTrial.bind(app),
    speak: app.speak.bind(app),
    answer: app.answer.bind(app),
    updateLabels: app.updateLabels.bind(app),
    start: app.start.bind(app),
    stop: app.stop.bind(app)
  };

  let active = false;
  let extraTrials = [];

  panel.innerHTML = `
    <div class="control-group">
      <label>Ordered Number N-back</label>
      <p class="extra-help">Digits 1–9. A match exists only when the same number appears in the same sequence position as it did exactly N trials earlier.</p>
    </div>
    <div class="control-group"><label for="extra-n">N-back level</label><select id="extra-n">${Array.from({length:20},(_,i)=>`<option value="${i+1}">${i+1}-back</option>`).join('')}</select></div>
    <div class="control-group"><label for="extra-count">Numbers per trial</label><select id="extra-count"><option value="1">1 number</option><option value="2">2 numbers</option><option value="3">3 numbers</option></select></div>
    <div class="control-group"><label for="extra-response">Trial response time</label><select id="extra-response"><option value="1">1 second</option><option value="2">2 seconds</option><option value="3" selected>3 seconds</option><option value="5">5 seconds</option><option value="8">8 seconds</option><option value="12">12 seconds</option><option value="20">20 seconds</option></select></div>
    <div class="control-group"><label for="extra-session">Session length</label><select id="extra-session"><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15" selected>15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="open">Open-ended session</option></select></div>
    <div class="control-group"><label for="extra-probability">Match probability</label><select id="extra-probability"><option value="20">20%</option><option value="30">30%</option><option value="35" selected>35%</option><option value="40">40%</option><option value="50">50%</option><option value="60">60%</option></select></div>
    <div class="control-group"><label for="extra-interference">Cognitive interference</label><select id="extra-interference"><option value="0">None</option><option value="25">Low</option><option value="50">Moderate</option><option value="75" selected>High</option><option value="100">Maximum</option></select><p class="extra-help">Higher levels increasingly reuse recent digits, transpose remembered digits into incorrect positions and generate near-matches that preserve only one valid slot.</p></div>
    <div class="control-group"><label for="extra-rate">Number speech speed</label><select id="extra-rate"><option value="average">Average</option><option value="moderately-fast">Moderately fast</option><option value="fast">Fast</option><option value="very-fast">Very fast</option><option value="extremely-fast">Extremely fast</option><option value="incredibly-fast">Incredibly fast</option><option value="ultra-fast">Ultra fast</option></select></div>
    <div class="control-group"><label for="extra-spacing">Time between spoken numbers</label><select id="extra-spacing"><option value="average">Average</option><option value="moderately-fast">Moderately fast</option><option value="fast">Fast</option><option value="very-fast">Very fast</option><option value="extremely-fast">Extremely fast</option><option value="incredibly-fast">Incredibly fast</option><option value="ultra-fast">Ultra fast — minimum possible gap</option></select></div>
    <div class="control-group"><div class="toggle-row"><label><input id="extra-speak" type="checkbox" checked> Speak stimuli</label><label><input id="extra-audio-only" type="checkbox"> Audio-only display</label></div></div>
    <div class="button-group"><button id="extra-test" class="small-btn" type="button">Test Number Speech</button><button id="extra-close" class="small-btn" type="button">Close Extra Training</button></div>`;

  const $ = id => document.getElementById(id);
  const settings = () => ({
    n: Number($('extra-n').value),
    count: Number($('extra-count').value),
    responseSeconds: Number($('extra-response').value),
    session: $('extra-session').value,
    matchProbability: Number($('extra-probability').value) / 100,
    interference: Number($('extra-interference').value),
    speechProfile: $('extra-rate').value,
    spacingProfile: $('extra-spacing').value,
    speak: $('extra-speak').checked,
    audioOnly: $('extra-audio-only').checked
  });

  const pick = list => list[Math.floor(Math.random()*list.length)];
  const shuffle = list => [...list].sort(()=>Math.random()-.5);
  const recentDigits = () => extraTrials.slice(-8).flatMap(t=>t.values || []);

  function sameSlots(values, target) {
    const slots=[];
    for (let i=0;i<values.length;i++) if (values[i]===target[i]) slots.push(i);
    return slots;
  }

  function derange(values) {
    if (values.length===1) return [pick(digits.filter(d=>d!==values[0]))];
    if (values.length===2) return [values[1],values[0]];
    const rotations=[[values[1],values[2],values[0]],[values[2],values[0],values[1]]];
    return pick(rotations);
  }

  function makeValues(target,count,wantMatch,interference) {
    if (!target) return Array.from({length:count},()=>pick(digits));
    const recent = recentDigits();
    const lureChance = interference/100;
    let out=[];

    if (wantMatch) {
      const exactSlots = new Set(shuffle([...Array(count).keys()]).slice(0,count===1?1:(Math.random()<0.82?1:2)));
      const moved = derange(target.slice(0,count));
      for (let i=0;i<count;i++) {
        if (exactSlots.has(i)) { out[i]=target[i]; continue; }
        const lures = [
          ...target.filter((v,j)=>j!==i && v!==target[i]),
          ...moved.filter(v=>v!==target[i]),
          ...(Math.random()<lureChance?recent.filter(v=>v!==target[i]):[]),
          ...digits.filter(v=>v!==target[i])
        ];
        out[i]=pick(lures);
      }
    } else {
      out = count>1 && Math.random()<0.35+0.6*lureChance ? derange(target.slice(0,count)) : [];
      if (!out.length) {
        for (let i=0;i<count;i++) {
          const lures=[
            ...(Math.random()<lureChance?target.filter((v,j)=>j!==i && v!==target[i]):[]),
            ...(Math.random()<lureChance?recent.filter(v=>v!==target[i]):[]),
            ...digits.filter(v=>v!==target[i])
          ];
          out[i]=pick(lures);
        }
      }
      for (let i=0;i<count;i++) if (out[i]===target[i]) out[i]=pick(digits.filter(v=>v!==target[i]));
    }
    return out;
  }

  function makeExtraTrial() {
    const s=settings();
    const targetTrial=extraTrials[extraTrials.length-s.n];
    const target=targetTrial?.values;
    const requestedMatch=Boolean(target)&&Math.random()<s.matchProbability;
    const values=makeValues(target,s.count,requestedMatch,s.interference);
    const matchPositions=target?sameSlots(values,target):[];
    const trial={
      mode:EXTRA_MODE,
      values,
      targetValues:target?[...target]:null,
      matchPositions,
      nBackMatch:matchPositions.length>0,
      isMatch:matchPositions.length>0,
      scored:Boolean(target),
      signature:values.join('|')
    };
    extraTrials.push(trial);
    return trial;
  }

  function speakExtra(trial) {
    if (!settings().speak || !window.speechSynthesis) return Promise.resolve();
    const s=settings();
    const phrase=trial.values.map(v=>words[v]).join(separators[s.spacingProfile]);
    try { speechSynthesis.cancel(); speechSynthesis.resume(); } catch (_) {}
    return new Promise(resolve=>{
      const u=new SpeechSynthesisUtterance(phrase);
      u.lang='en-AU';
      u.rate=rateMap[s.speechProfile];
      u.pitch=1;
      u.volume=Number(document.getElementById('premise-vol')?.value||70)/100;
      let done=false;
      const finish=()=>{if(!done){done=true;resolve();}};
      u.onend=finish;u.onerror=finish;
      speechSynthesis.speak(u);
      setTimeout(finish,3500);
    });
  }

  function openPanel() {
    active=true;
    panel.hidden=false;
    button.textContent='Extra Training Active';
    button.setAttribute('aria-expanded','true');
    logicMode.disabled=true;
    extraTrials=[];
    premiseDisplay.classList.add('number-stimulus');
    syncLegacyControls();
  }

  function closePanel() {
    active=false;
    panel.hidden=true;
    button.textContent='Open Number N-back';
    button.setAttribute('aria-expanded','false');
    logicMode.disabled=false;
    premiseDisplay.classList.remove('number-stimulus');
    premiseDisplay.classList.remove('hidden-mode');
    extraTrials=[];
    legacy.updateLabels();
  }

  function syncLegacyControls() {
    if (!active) return;
    const s=settings();
    const nSlider=$('n-slider');
    const response=$('spt-slider');
    const session=$('session-slider');
    const probability=$('prob-slider');
    const interference=$('interference-slider');
    if (nSlider) { nSlider.value=String(Math.min(8,s.n)); nSlider.disabled=true; }
    if (response) response.value=String(s.responseSeconds);
    if (session && s.session!=='open') session.value=String(s.session);
    if (probability) probability.value=String(Math.max(15,Math.min(60,Math.round(s.matchProbability*100))));
    if (interference) interference.value=String(s.interference);
    premiseDisplay.classList.toggle('hidden-mode',s.audioOnly);
    legacy.updateLabels();
  }

  app.settings=function routedSettings(){
    const base=legacy.settings();
    if(!active) return base;
    const s=settings();
    return {
      ...base,
      mode:EXTRA_MODE,
      n:s.n,
      seconds:s.responseSeconds,
      minutes:s.session==='open'?1440:Number(s.session),
      matchProbability:s.matchProbability,
      audioOnly:s.audioOnly
    };
  };

  app.makeTrial=function routedMakeTrial(){ return active?makeExtraTrial():legacy.makeTrial(); };
  app.renderTrial=function routedRender(trial){ return trial?.mode===EXTRA_MODE?trial.values.join(', '):legacy.renderTrial(trial); };
  app.speak=function routedSpeak(text){ return active&&app.current?.mode===EXTRA_MODE?speakExtra(app.current):legacy.speak(text); };

  app.answer=function routedAnswer(response){
    const trial=app.current;
    const result=legacy.answer(response);
    if(trial?.mode===EXTRA_MODE&&explanation){
      if(!trial.scored) explanation.textContent=`Memory fill: store this ordered ${trial.values.length}-number sequence.`;
      else if(trial.nBackMatch){
        const slots=trial.matchPositions.map(i=>['first','second','third'][i]).join(', ');
        explanation.textContent=`MATCH: same-position equality at the ${slots} position${trial.matchPositions.length>1?'s':''}. Current ${trial.values.join(', ')}; target ${trial.targetValues.join(', ')}.`;
      } else explanation.textContent=`NO MATCH: repeated digits in different positions do not count. Current ${trial.values.join(', ')}; target ${trial.targetValues.join(', ')}.`;
    }
    return result;
  };

  app.start=async function routedStart(){
    if(active){
      syncLegacyControls();
      extraTrials=[];
      const s=settings();
      if(s.session==='open'){
        const originalStop=this.stop.bind(this);
        const result=await legacy.start();
        this.endsAt=Number.MAX_SAFE_INTEGER;
        return result;
      }
    }
    return legacy.start();
  };

  button.addEventListener('click',()=>active?closePanel():openPanel());
  $('extra-close').addEventListener('click',closePanel);
  $('extra-test').addEventListener('click',()=>speakExtra({values:[6,8,9]}));
  panel.querySelectorAll('select,input').forEach(el=>el.addEventListener('change',()=>{extraTrials=[];syncLegacyControls();}));

  window.__extraTrainingNumberNBack={
    version:3,
    launcher:'button',
    positionalIdentity:true,
    digits:[1,9],
    numbersPerTrial:[1,2,3],
    nBackLevels:[1,20],
    cognitiveInterference:true,
    speechProfiles:Object.keys(rateMap),
    spacingProfiles:Object.keys(separators)
  };
});