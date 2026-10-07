'use strict';

(function exposeNumberTrainer(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) root.__numberTrainer = api.createTrainer(root);
})(typeof window !== 'undefined' ? window : null, () => {
  const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const RATES = { average: 1, 'moderately-fast': 1.12, fast: 1.25, 'very-fast': 1.4, 'extremely-fast': 1.55, 'incredibly-fast': 1.7, 'ultra-fast': 1.85 };
  const GAPS = { average: 300, 'moderately-fast': 200, fast: 120, 'very-fast': 80, 'extremely-fast': 40, 'incredibly-fast': 15, 'ultra-fast': 0 };
  const CONTROL_IDS = ['n', 'count', 'response', 'session', 'probability', 'interference', 'rate', 'spacing', 'volume', 'speak', 'audio-only', 'keyboard', 'haptic', 'test', 'number-listening', 'number-seconds'];
  const emptyScore = () => ({ shown: 0, scored: 0, correct: 0, hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0, omissions: 0 });
  const bounded = (value, minimum, maximum, fallback) => Number.isFinite(Number(value)) && value !== '' ? Math.max(minimum, Math.min(maximum, Number(value))) : fallback;

  function normaliseSettings(raw) {
    return {
      n: Math.floor(bounded(raw.n, 1, 20, 2)), count: Math.floor(bounded(raw.count, 1, 6, 3)),
      response: bounded(raw.response, 1, 300, 3), session: raw.session === 'open' ? 'open' : bounded(raw.session, 5, 360, 15),
      prob: bounded(raw.probability, 0, 100, 35) / 100, interference: bounded(raw.interference, 0, 100, 75),
      rate: Object.hasOwn(RATES, raw.rate) ? raw.rate : 'average', spacing: Object.hasOwn(GAPS, raw.spacing) ? raw.spacing : 'average',
      volume: bounded(raw.volume, raw.listening ? .01 : 0, 1, .8), speak: !!raw.speak || !!raw.listening, audioOnly: !!raw.audioOnly,
      listening: !!raw.listening, seconds: bounded(raw.seconds, 1, 300, 5),
      keyboard: !!raw.keyboard, haptic: !!raw.haptic
    };
  }

  function sameSlots(values, target) {
    return target ? values.reduce((positions, value, index) => value === target[index] ? [...positions, index] : positions, []) : [];
  }

  // Repetition is a hard stimulus constraint, not a request to the RNG.
  // Enforce it while choosing digits, including reserved N-back matches.
  const MAX_DIGIT_OCCURRENCES = 2;

  function shuffled(values, random) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function makeTrial(history, settings, random = Math.random) {
    const target = history[history.length - settings.n]?.values;
    const wantMatch = !!target && random() < settings.prob;
    const previous = history[history.length - 1]?.values || [];
    const penultimate = history[history.length - 2]?.values || [];
    const tail = history.slice(-2).flatMap(trial => trial.values).slice(-2);
    // A repeated digit gets one entry, not one lottery ticket per old occurrence.
    const lureDigits = new Set([...(target || []), ...history.slice(-8).flatMap(trial => trial.values)]);
    const repeatedInSlot = index => previous[index] !== undefined && previous[index] === penultimate[index]
      ? previous[index] : null;

    function completeWithMatches(matchSlots) {
      const forced = new Set(matchSlots), values = [], counts = new Map();
      function fill(index) {
        if (index === settings.count) return [...values];
        const recentStream = [...tail, ...values];
        const last = recentStream[recentStream.length - 1];
        const beforeLast = recentStream[recentStream.length - 2];
        let pool = (forced.has(index) ? [target[index]] : DIGITS.filter(digit => !target || digit !== target[index]))
          .filter(digit => DIGITS.includes(digit)
            && (counts.get(digit) || 0) < MAX_DIGIT_OCCURRENCES
            && digit !== repeatedInSlot(index)
            && !(digit === last && digit === beforeLast));
        pool = shuffled(pool, random);
        if (!forced.has(index) && target && random() < settings.interference / 100) {
          // Prefer legal lures, but never manufacture a forbidden third repeat.
          pool = [...pool.filter(digit => lureDigits.has(digit)), ...pool.filter(digit => !lureDigits.has(digit))];
        }
        for (const digit of pool) {
          values.push(digit);
          counts.set(digit, (counts.get(digit) || 0) + 1);
          const result = fill(index + 1);
          if (result) return result;
          values.pop();
          counts.set(digit, counts.get(digit) - 1);
        }
        return null;
      }
      return fill(0);
    }

    let values = null;
    if (wantMatch) {
      const possible = shuffled(Array.from({ length: settings.count }, (_, index) => index)
        .filter(index => DIGITS.includes(target[index]) && target[index] !== repeatedInSlot(index)), random);
      // As before, some matching trials have a second matching position.
      // Try the entire valid plan before committing any digit to the stimulus.
      if (possible.length > 1 && random() < .18) {
        for (let a = 0; a < possible.length && !values; a++) {
          for (let b = a + 1; b < possible.length && !values; b++) {
            values = completeWithMatches([possible[a], possible[b]]);
          }
        }
      }
      for (const index of possible) {
        if (values) break;
        values = completeWithMatches([index]);
      }
    }
    // Example: 1-back, one digit, and two preceding 7s cannot produce another
    // matching 7. The repetition limit takes priority; score the actual digits.
    if (!values) values = completeWithMatches([]);
    if (!values) throw new RangeError('No sequence satisfies the repetition limits.');
    const positions = sameSlots(values, target);
    return {
      values, target: target ? [...target] : null, positions,
      match: positions.length > 0, scored: !!target,
      repetitionLimitedMatch: wantMatch && positions.length === 0
    };
  }

  // Acklam's inverse standard-normal approximation; log-linear correction below
  // keeps perfect observed rates finite rather than substituting a rate difference.
  function normalQuantile(p) {
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-.00778489400243029, -.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [.00778469570904146, .32246712907004, 2.445134137143, 3.75440866190742];
    if (p < .02425 || p > 1 - .02425) {
      const q = Math.sqrt(-2 * Math.log(p < .02425 ? p : 1 - p));
      const tail = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
      return p < .02425 ? tail : -tail;
    }
    const q = p - .5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function dPrime(score) {
    const signals = score.hits + score.misses, noise = score.falseAlarms + score.correctRejects;
    if (!signals || !noise) return null;
    return normalQuantile((score.hits + .5) / (signals + 1)) - normalQuantile((score.falseAlarms + .5) / (noise + 1));
  }

  function createTrainer(environment) {
    const document = environment.document, $ = id => document.getElementById(id);
    const now = () => environment.Date.now();
    const later = (callback, delay) => environment.setTimeout(callback, delay);
    const clear = handle => environment.clearTimeout(handle);
    const random = () => environment.Math.random();
    const speechApi = environment.__numberSpeechAudio || (typeof require === 'function' ? require('./number-speech.js') : null);
    const speechPlayer = speechApi?.createPlayer(environment);
    const state = { running: false, paused: false, awaiting: false, phase: 'idle', trials: [], current: null, timer: null, clock: null, generation: 0, finishAfterSpeech: false, elapsed: 0, activeStarted: 0, remaining: 0, deadline: 0, settings: null, score: emptyScore(), heard: 0, presented: 0, trialStarted: 0 };
    $('n').innerHTML = Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}"${i === 1 ? ' selected' : ''}>${i + 1}-back</option>`).join('');

    function readSettings() {
      const values = Object.fromEntries(CONTROL_IDS.slice(0, 9).map(id => [id, $(id).value]));
      return normaliseSettings({ ...values, speak: $('speak').checked, audioOnly: $('audio-only').checked, keyboard: $('keyboard').checked, haptic: $('haptic').checked, listening: $('number-listening').checked, seconds: $('number-seconds').value });
    }
    // One complete PCM sequence replaces per-digit native synthesis. In
    // particular, there is no shared speechSynthesis.cancel() call that can
    // arrive late and cut off the next digit or a restarted session.
    function cancelSpeech() { speechPlayer?.cancel(); }
    function speak(values, settings) {
      return speechPlayer ? speechPlayer.play(values, settings) : Promise.resolve(false);
    }
    function audioEnabled(settings) {
      return !!(settings.speak && settings.volume > 0 && speechPlayer?.available());
    }
    function syncListeningUI() {
      const listening = state.running ? state.settings.listening : $('number-listening').checked;
      $('number-listening-settings').hidden = !listening;
      $('number-seconds').disabled = state.running || !listening;
      $('response').disabled = state.running || listening;
      $('speak').disabled = state.running || listening;
      $('keyboard').disabled = state.running || listening;
      $('haptic').disabled = state.running || listening;
      if (listening) $('speak').checked = true;
      $('number-responses').hidden = listening;
      $('number-key-guide').hidden = listening;
      $('number-scored-stats').hidden = listening;
      $('number-listening-stats').hidden = !listening;
      $('number-listening-summary').hidden = !listening;
    }
    function buttons() { $('match').disabled = $('no-match').disabled = !state.running || state.paused || !state.awaiting || !!state.settings?.listening; }
    function updateStats() {
      $('number-heard').textContent = state.heard;
      $('trials').textContent = state.score.shown;
      $('hits').textContent = state.score.hits;
      $('accuracy').textContent = (state.score.scored ? Math.round(state.score.correct / state.score.scored * 100) : 0) + '%';
      const value = dPrime(state.score);
      $('dprime').textContent = value === null ? '—' : value.toFixed(2);
    }
    function elapsed() { return state.elapsed + (state.running && !state.paused ? now() - state.activeStarted : 0); }
    function updateClock() {
      const duration = state.settings.session === 'open' ? null : state.settings.session * 60000;
      const amount = duration === null ? elapsed() : Math.max(0, duration - elapsed());
      const minutes = Math.floor(amount / 60000), seconds = Math.floor(amount % 60000 / 1000);
      $('clock').textContent = `${duration === null ? 'OPEN · ' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      $('sessionprogress').style.width = duration === null ? '0%' : `${Math.min(100, elapsed() / duration * 100)}%`;
      if (duration !== null && amount <= 0 && state.running) {
        if (state.phase === 'speaking') state.finishAfterSpeech = true;
        else stop('SESSION COMPLETE');
      }
    }
    function progress() {
      const fraction = state.settings ? state.remaining / ((state.settings.listening ? state.settings.seconds : state.settings.response) * 1000) : 0;
      $('timerbar').style.transition = 'none';
      $('timerbar').style.width = ['response', 'listening'].includes(state.phase) ? `${Math.min(1, Math.max(0, fraction)) * 100}%` : '0%';
      if (!state.paused && ['response', 'listening'].includes(state.phase)) {
        void $('timerbar').offsetWidth;
        $('timerbar').style.transition = `width ${state.remaining}ms linear`;
        $('timerbar').style.width = '0%';
      }
    }
    function armTimer(milliseconds) {
      clear(state.timer);
      state.remaining = Math.max(0, milliseconds);
      state.deadline = now() + state.remaining;
      const generation = state.generation;
      state.timer = later(() => {
        if (!state.running || state.paused || state.generation !== generation) return;
        if (state.phase === 'response') finishTrial(null);
        else if (state.phase === 'feedback' || state.phase === 'listening') next();
      }, state.remaining);
      progress();
    }
    async function present() {
      const trial = state.current, generation = state.generation;
      state.phase = 'speaking'; state.awaiting = false; state.trialStarted = elapsed(); buttons();
      const audible = audioEnabled(state.settings);
      $('stimulus').classList.toggle('hidden', !!(state.settings.audioOnly && audible));
      const spoken = await speak(trial.values, state.settings);
      if (!state.running || state.paused || state.generation !== generation || state.current !== trial) return;
      if (state.settings.listening) {
        if (!spoken || !audible) {
          pause();
          $('pause').textContent = 'Retry audio';
          $('feedback').textContent = 'AUDIO PAUSED';
          $('feedback').style.color = '#b42318';
          $('explanation').textContent = 'Audio could not finish. Check your sound output, then select Retry audio to replay this same trial. Nothing has been scored or counted as heard.';
          return;
        }
        trial.audioAvailable = true;
        if (!trial.heard) { trial.heard = true; state.heard += 1; }
        updateStats();
        if (state.finishAfterSpeech) { stop('SESSION COMPLETE'); return; }
        state.phase = 'listening'; state.awaiting = false; buttons();
        $('feedback').textContent = 'LISTENING · NOT SCORED';
        $('feedback').style.color = '';
        $('explanation').textContent = 'Answer in your mind. The next trial starts automatically.';
        armTimer(state.settings.seconds * 1000 - (elapsed() - state.trialStarted));
        return;
      }
      if (state.finishAfterSpeech) { stop('SESSION COMPLETE'); return; }
      trial.audioAvailable = !!(spoken && audible);
      if (state.settings.audioOnly && !spoken) {
        $('stimulus').classList.remove('hidden');
        $('explanation').textContent = 'Audio unavailable. The sequence is shown so you can continue.';
      }
      state.phase = 'response'; state.awaiting = trial.scored; buttons();
      armTimer(state.settings.response * 1000);
    }
    function next() {
      if (!state.running || state.paused) return;
      clear(state.timer);
      if (state.settings.listening && state.settings.session !== 'open' && elapsed() >= state.settings.session * 60000) {
        stop('SESSION COMPLETE');
        return;
      }
      state.current = makeTrial(state.trials, state.settings, random);
      state.trials.push(state.current);
      // Only N-back targets and recent interference digits are needed, even in
      // open-ended sessions. Keep memory bounded without changing trial offsets.
      if (state.trials.length > Math.max(state.settings.n, 8)) state.trials.shift();
      state.presented += 1;
      if (!state.settings.listening) state.score.shown += 1;
      $('stimulus').textContent = state.current.values.join(', ');
      $('feedback').style.color = '';
      $('feedback').textContent = state.current.scored ? '' : `MEMORY FILL ${state.score.shown}/${state.settings.n}`;
      $('explanation').textContent = state.current.scored ? '' : 'Remember this ordered sequence. Responses begin after memory fill.';
      if (state.settings.listening) {
        $('feedback').textContent = 'LISTENING · NOT SCORED';
        $('explanation').textContent = state.current.scored ? 'Compare in your mind with the sequence exactly ' + state.settings.n + ' trials earlier.' : 'Memory fill ' + state.presented + '/' + state.settings.n + '. Remember this ordered sequence.';
      }
      updateStats(); present();
    }
    function finishTrial(response) {
      if (!state.running || state.paused || state.settings.listening || state.phase !== 'response') return;
      state.awaiting = false; state.phase = 'feedback'; clear(state.timer); buttons();
      const trial = state.current;
      if (trial.scored) {
        const correct = response !== null && response === trial.match;
        state.score.scored += 1;
        if (correct) state.score.correct += 1;
        if (response === null) state.score.omissions += 1;
        else if (trial.match) state.score[response ? 'hits' : 'misses'] += 1;
        else state.score[response ? 'falseAlarms' : 'correctRejects'] += 1;
        $('feedback').textContent = response === null ? 'TIMEOUT' : correct ? 'CORRECT' : 'INCORRECT';
        $('feedback').style.color = correct ? '#086b3a' : '#b42318';
        if (state.settings.haptic && environment.navigator?.vibrate) {
          try { environment.navigator.vibrate(correct ? 45 : [70, 40, 70]); } catch (_) {}
        }
        const slots = trial.positions.map(i => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][i]).join(', ');
        const result = trial.match ? `MATCH at the ${slots} position${trial.positions.length > 1 ? 's' : ''}.` : 'NO MATCH. Repeated digits in different positions do not count.';
        $('explanation').textContent = `${result} Current ${trial.values.join(', ')}; ${state.settings.n}-back target ${trial.target.join(', ')}.`;
      }
      updateStats(); armTimer(450);
    }
    function answer(response) {
      if (!state.running || state.paused || state.settings.listening || !state.awaiting || typeof response !== 'boolean') return;
      finishTrial(now() >= state.deadline ? null : response);
    }
    function start() {
      if (state.running) return;
      if ($('number-listening').checked && !$('number-seconds').reportValidity()) return;
      cancelSpeech(); clear(state.timer); environment.clearInterval(state.clock);
      Object.assign(state, { running: true, paused: false, awaiting: false, trials: [], current: null, finishAfterSpeech: false, elapsed: 0, activeStarted: now(), settings: readSettings(), score: emptyScore(), heard: 0, presented: 0, trialStarted: 0, generation: state.generation + 1 });
      if (audioEnabled(state.settings)) speechPlayer.prepare();
      CONTROL_IDS.forEach(id => { $(id).disabled = true; });
      syncListeningUI();
      $('start').disabled = true; $('pause').disabled = $('stop').disabled = false; $('pause').textContent = 'Pause';
      updateStats(); updateClock();
      state.clock = environment.setInterval(updateClock, 250);
      next();
    }
    function stop(message = 'READY') {
      if (state.running && !state.paused) state.elapsed += now() - state.activeStarted;
      Object.assign(state, { running: false, paused: false, awaiting: false, phase: 'idle', generation: state.generation + 1 });
      clear(state.timer); environment.clearInterval(state.clock); cancelSpeech(); speechPlayer?.release?.();
      CONTROL_IDS.forEach(id => { $(id).disabled = false; });
      syncListeningUI();
      $('start').disabled = false; $('pause').disabled = $('stop').disabled = true; $('pause').textContent = 'Pause';
      buttons(); progress();
      $('stimulus').classList.remove('hidden'); $('stimulus').textContent = message;
    }
    function pause() {
      if (!state.running) return;
      if (!state.paused) {
        state.elapsed += now() - state.activeStarted;
        state.remaining = Math.max(0, state.deadline - now());
        state.paused = true; state.generation += 1;
        clear(state.timer); cancelSpeech();
        $('pause').textContent = 'Resume';
        // Pausing must not provide unlimited viewing of a response trial.
        $('stimulus').classList.add('hidden');
        progress(); buttons(); updateClock();
      } else {
        state.paused = false; state.activeStarted = now(); $('pause').textContent = 'Pause';
        $('stimulus').classList.toggle('hidden', !!(state.settings.audioOnly && state.current.audioAvailable));
        if (state.phase === 'speaking') {
          if (state.settings.listening) { $('feedback').textContent = 'LISTENING · NOT SCORED'; $('feedback').style.color = ''; }
          present();
        }
        else { buttons(); armTimer(state.remaining); }
        updateClock();
      }
    }
    $('number-listening').addEventListener('change', syncListeningUI);
    syncListeningUI();
    $('start').onclick = start; $('stop').onclick = () => stop(); $('pause').onclick = pause;
    $('match').onclick = () => answer(true); $('no-match').onclick = () => answer(false);
    $('test').onclick = () => {
      if (state.running) return;
      const generation = ++state.generation;
      $('feedback').textContent = 'TESTING AUDIO';
      const settings = { ...readSettings(), speak: true };
      return speak([6, 8, 9, 2, 4, 1].slice(0, settings.count), settings).then(ok => {
        if (!state.running && state.generation === generation) {
          speechPlayer?.release?.();
          $('feedback').textContent = ok ? 'AUDIO READY' : 'Audio unavailable. Check the volume and try again.';
        }
        return ok;
      });
    };
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.running) { stop(); return; }
      if (!state.settings?.keyboard || !state.awaiting || state.paused || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target?.tagName || '') || event.target?.isContentEditable) return;
      const key = event.key.toLowerCase();
      if (['f', 'j', 'd', 'k'].includes(key)) { event.preventDefault(); answer(key === 'f' || key === 'j'); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.running && !state.paused) pause(); });
    environment.addEventListener('pagehide', () => stop());
    return { state, start, stop, pause, answer, player: speechPlayer };
  }
  return { createTrainer, makeTrial, sameSlots, normaliseSettings, dPrime, normalQuantile };
});
