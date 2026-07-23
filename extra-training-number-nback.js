'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const controls = document.querySelector('.controls');
  const logicMode = document.getElementById('logic-mode');
  const premiseDisplay = document.getElementById('premise-display');
  const explanation = document.getElementById('trial-explanation');
  if (!app || !controls || !logicMode || !premiseDisplay) return;

  const EXTRA_VALUE = 'extra-number-nback';
  const numberWords = ['zero','one','two','three','four','five','six','seven','eight','nine'];
  const speechRates = {
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
    updateLabels: app.updateLabels.bind(app)
  };

  let extraActive = false;
  let extraTrials = [];

  const option = document.createElement('option');
  option.value = EXTRA_VALUE;
  option.textContent = 'Extra Training — Standard Number N-back';
  logicMode.insertAdjacentElement('afterend', option);
  logicMode.appendChild(option);

  const panel = document.createElement('div');
  panel.id = 'extra-training-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="control-group">
      <label>Extra Training</label>
      <p style="font-size:.75rem;color:#43566d;line-height:1.45;margin-top:6px">Ordered number N-back using digits 1–9. A number matches only when it occupies the same sequence position as the corresponding number exactly N trials back.</p>
    </div>
    <div class="control-group">
      <label for="extra-n">N-back level</label>
      <select id="extra-n">${Array.from({length:20},(_,i)=>`<option value="${i+1}">${i+1}-back</option>`).join('')}</select>
    </div>
    <div class="control-group">
      <label for="extra-count">Numbers per trial</label>
      <select id="extra-count"><option value="1">1 number</option><option value="2">2 numbers</option><option value="3">3 numbers</option></select>
    </div>
    <div class="control-group">
      <label for="extra-speech-rate">Number speech speed</label>
      <select id="extra-speech-rate">
        <option value="average">Average</option><option value="moderately-fast">Moderately fast</option><option value="fast">Fast</option><option value="very-fast">Very fast</option><option value="extremely-fast">Extremely fast</option><option value="incredibly-fast">Incredibly fast</option><option value="ultra-fast">Ultra fast</option>
      </select>
    </div>
    <div class="control-group">
      <label for="extra-spacing">Time between spoken numbers</label>
      <select id="extra-spacing">
        <option value="average">Average</option><option value="moderately-fast">Moderately fast</option><option value="fast">Fast</option><option value="very-fast">Very fast</option><option value="extremely-fast">Extremely fast</option><option value="incredibly-fast">Incredibly fast</option><option value="ultra-fast">Ultra fast — minimum possible gap</option>
      </select>
    </div>
    <div class="control-group">
      <div class="toggle-row"><label><input id="extra-speak" type="checkbox" checked> Speak number trials</label></div>
    </div>`;
  logicMode.closest('.control-group').insertAdjacentElement('afterend', panel);

  const $ = id => document.getElementById(id);
  const settings = () => ({
    n: Number($('extra-n').value),
    count: Number($('extra-count').value),
    speechProfile: $('extra-speech-rate').value,
    spacingProfile: $('extra-spacing').value,
    speak: $('extra-speak').checked,
    matchProbability: Number(document.getElementById('prob-slider')?.value || 35) / 100
  });

  function isExtraMode() { return logicMode.value === EXTRA_VALUE; }
  function sameSlots(values, target) {
    const slots = [];
    for (let i = 0; i < values.length; i++) if (values[i] === target[i]) slots.push(i);
    return slots;
  }
  function derange(values) {
    if (values.length < 2) return values.slice();
    if (values.length === 2) return [values[1], values[0]];
    return [values[1], values[2], values[0]];
  }
  function makeValues(target, count, requestedMatch) {
    if (!target) return Array.from({length:count},()=>1+Math.floor(Math.random()*9));
    const out = requestedMatch ? target.slice(0,count) : derange(target.slice(0,count));
    if (requestedMatch && count > 1) {
      const keep = Math.floor(Math.random()*count);
      for (let i = 0; i < count; i++) if (i !== keep) {
        const lures = target.filter((v,j)=>j!==i && v!==target[i]);
        out[i] = lures.length ? lures[Math.floor(Math.random()*lures.length)] : 1+Math.floor(Math.random()*9);
        if (out[i] === target[i]) out[i] = target[i] % 9 + 1;
      }
    }
    if (!requestedMatch) {
      for (let i=0;i<count;i++) if (out[i]===target[i]) out[i]=target[i]%9+1;
    }
    return out;
  }
  function makeExtraTrial() {
    const s = settings();
    const targetTrial = extraTrials[extraTrials.length-s.n];
    const target = targetTrial?.values;
    const requestedMatch = Boolean(target) && Math.random() < s.matchProbability;
    const values = makeValues(target,s.count,requestedMatch);
    const matchPositions = target ? sameSlots(values,target) : [];
    const trial = {
      mode: EXTRA_VALUE,
      values,
      targetValues: target ? target.slice() : null,
      matchPositions,
      nBackMatch: matchPositions.length > 0,
      isMatch: matchPositions.length > 0,
      scored: Boolean(target),
      signature: values.join('|')
    };
    extraTrials.push(trial);
    return trial;
  }
  function renderExtra(trial) { return trial.values.join(', '); }
  async function speakExtra(trial) {
    if (!settings().speak || !window.speechSynthesis) return;
    const s = settings();
    const phrase = trial.values.map(v=>numberWords[v]).join(separators[s.spacingProfile]);
    try { window.speechSynthesis.cancel(); window.speechSynthesis.resume(); } catch (_) {}
    await new Promise(resolve => {
      const u = new SpeechSynthesisUtterance(phrase);
      u.lang = 'en-AU'; u.rate = speechRates[s.speechProfile]; u.pitch = 1;
      u.volume = Number(document.getElementById('premise-vol')?.value || 70) / 100;
      u.onend = resolve; u.onerror = resolve;
      window.speechSynthesis.speak(u);
      setTimeout(resolve,3500);
    });
  }

  app.settings = function routedSettings() {
    const base = legacy.settings();
    if (!isExtraMode()) return base;
    return {...base, mode: EXTRA_VALUE, n: settings().n};
  };
  app.makeTrial = function routedTrial() {
    if (!isExtraMode()) return legacy.makeTrial();
    return makeExtraTrial();
  };
  app.renderTrial = function routedRender(trial) {
    return trial?.mode === EXTRA_VALUE ? renderExtra(trial) : legacy.renderTrial(trial);
  };
  app.speak = function routedSpeak(text) {
    if (extraActive && app.current?.mode === EXTRA_VALUE) return speakExtra(app.current);
    return legacy.speak(text);
  };
  app.answer = function routedAnswer(response) {
    const trial = app.current;
    const result = legacy.answer(response);
    if (trial?.mode === EXTRA_VALUE && explanation) {
      if (!trial.scored) explanation.textContent = `Memory fill: store this ordered ${trial.values.length}-number sequence.`;
      else if (trial.nBackMatch) explanation.textContent = `MATCH: same-position equality at ${trial.matchPositions.map(i=>['first','second','third'][i]).join(', ')} position${trial.matchPositions.length>1?'s':''}.`;
      else explanation.textContent = 'NO MATCH: repeated numbers in different positions do not count.';
    }
    return result;
  };

  function sync() {
    extraActive = isExtraMode();
    panel.hidden = !extraActive;
    if (extraActive) {
      extraTrials = [];
      const n = Number($('extra-n').value);
      document.getElementById('n-slider').value = String(Math.min(8,n));
      document.getElementById('n-slider').disabled = true;
      premiseDisplay.classList.add('number-stimulus');
    } else {
      document.getElementById('n-slider').disabled = false;
      premiseDisplay.classList.remove('number-stimulus');
    }
    legacy.updateLabels();
  }

  logicMode.addEventListener('change', sync);
  panel.querySelectorAll('select,input').forEach(el=>el.addEventListener('change',()=>{extraTrials=[];}));
  sync();

  window.__extraTrainingNumberNBack = {
    version: 1,
    modeValue: EXTRA_VALUE,
    positionalIdentity: true,
    digitRange: [1,9],
    numbersPerTrial: [1,2,3],
    speechProfiles: Object.keys(speechRates),
    spacingProfiles: Object.keys(separators)
  };
});
