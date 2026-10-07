'use strict';

const assert = require('node:assert/strict');
const { createTrainer, makeTrial, sameSlots, normaliseSettings, dPrime, normalQuantile } = require('../extra-training-runtime.js');
const numberSpeech = require('../number-speech.js');

// Real player, short deterministic PCM, and a clocked audio graph. This observes
// complete compound buffers rather than pretending each speech callback played
// a number successfully.
const audioData = { sampleRate: 8000, clips: Object.fromEntries(Object.keys(numberSpeech.RATES).map(rate => [rate,
  Object.fromEntries(Array.from({ length: 9 }, (_, index) => {
    const samples = Buffer.alloc(1600);
    for (let i = 0; i < 800; i++) samples.writeInt16LE((i % 2 ? 1 : -1) * (index + 1) * 1000, i * 2);
    return [index + 1, samples.toString('base64')];
  }))])) };

function seededRandom(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function fixture(options = {}) {
  let time = 0, identifier = 0;
  const tasks = new Map(), events = {}, elements = {};
  const defaults = { n: '2', count: '3', response: '1', session: '5', probability: '35', interference: '75', rate: 'average', spacing: 'average', volume: '.8', 'number-seconds': '5' };
  const controlIds = ['n', 'count', 'response', 'session', 'probability', 'interference', 'rate', 'spacing', 'volume', 'speak', 'audio-only', 'keyboard', 'haptic', 'test', 'start', 'pause', 'stop', 'match', 'no-match', 'stimulus', 'feedback', 'explanation', 'trials', 'hits', 'accuracy', 'dprime', 'clock', 'sessionprogress', 'timerbar', 'number-listening', 'number-seconds', 'number-listening-settings', 'number-responses', 'number-key-guide', 'number-scored-stats', 'number-listening-stats', 'number-listening-summary', 'number-heard'];
  for (const id of controlIds) {
    const classes = new Set();
    elements[id] = {
      value: defaults[id] || '', checked: id === 'keyboard', disabled: false, textContent: '', innerHTML: '', style: {}, hidden: false, listeners: {},
      addEventListener(name, callback) { this.listeners[name] = callback; },
      reportValidity() { return id !== 'number-seconds' || Number(this.value) >= 1 && Number(this.value) <= 300; },
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name), toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) }
    };
  }
  const schedule = (fn, milliseconds, repeat = false) => {
    const id = ++identifier;
    tasks.set(id, { fn, due: time + milliseconds, milliseconds, repeat });
    return id;
  };
  const environment = {
    Date: { now: () => time }, Math: { random: seededRandom(78231) }, navigator: {},
    document: { hidden: false, getElementById: id => elements[id], addEventListener: (name, fn) => { events[name] = fn; } },
    addEventListener: (name, fn) => { events[name] = fn; },
    setTimeout: (fn, ms) => schedule(fn, ms), clearTimeout: id => tasks.delete(id),
    setInterval: (fn, ms) => schedule(fn, ms, true), clearInterval: id => tasks.delete(id)
  };
  const spoken = [], sources = [], contexts = [];
  environment.__numberSpeechAudio = numberSpeech;
  environment.__numberSpeechData = audioData;
  environment.speechSynthesis = Object.fromEntries(['resume', 'cancel', 'speak'].map(name => [name, () => {
    assert.fail(`Traditional number playback called native speechSynthesis.${name}`);
  }]));
  if (options.speech) {
    elements.speak.checked = true;
    environment.AudioContext = class {
      constructor() { this.state = 'running'; this.sampleRate = 8000; this.destination = {}; this.baseLatency = 0; this.outputLatency = 0; contexts.push(this); }
      get currentTime() { return time / 1000; }
      resume() { this.state = 'running'; return Promise.resolve(); }
      close() { this.state = 'closed'; return Promise.resolve(); }
      createBuffer(channels, length, sampleRate) {
        const samples = new Float32Array(length);
        return { length, sampleRate, duration: length / sampleRate, getChannelData: () => samples };
      }
      createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
      createBufferSource() {
        const source = {
          buffer: null, playbackRate: { value: 1 }, onended: null, loop: false, stopped: false,
          connect() {}, disconnect() {},
          start() {
            if (this.loop) return;
            if (options.speech === 'failure') throw new Error('Audio output unavailable');
            spoken.push(this.buffer);
            this.completed = this.onended;
            this.endTask = schedule(() => { this.onended?.(); }, this.buffer.duration * 1000);
          },
          stop() { this.stopped = true; tasks.delete(this.endTask); this.onended?.(); }
        };
        sources.push(source); return source;
      }
    };
  }
  const trainer = createTrainer(environment);
  const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
  async function advance(milliseconds) {
    await flush();
    const destination = time + milliseconds;
    for (let guard = 0; guard < 100000; guard++) {
      const next = [...tasks].filter(([, task]) => task.due <= destination).sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      if (!next) break;
      const [id, task] = next;
      time = task.due;
      if (task.repeat) task.due += task.milliseconds;
      else tasks.delete(id);
      task.fn();
      await flush();
    }
    time = destination;
    await flush();
  }
  return { ...trainer, elements, events, environment, tasks, spoken, sources, contexts, flush, advance, now: () => time, jump: ms => { time += ms; } };
}

async function run() {
  // Independent positional oracle: a repeated digit only counts in its original
  // slot, including sequences containing duplicate digits.
  assert.deepEqual(sameSlots([2, 3, 1], [1, 2, 3]), []);
  assert.deepEqual(sameSlots([1, 1, 9], [1, 2, 1]), [0]);
  let generated = 0;
  for (let n = 1; n <= 20; n++) for (const count of [1, 2, 3, 4, 5, 6]) for (const interference of [0, 25, 50, 75, 100]) for (const probability of [0, 20, 30, 35, 40, 50, 60, 100]) {
    const settings = normaliseSettings({ n, count, interference, probability });
    const history = [], random = seededRandom(23847);
    for (let index = 0; index < n + 80; index++) {
      const trial = makeTrial(history, settings, random);
      assert.equal(trial.values.length, count);
      assert.ok(trial.values.every(digit => Number.isInteger(digit) && digit >= 1 && digit <= 9));
      assert.equal(trial.scored, index >= n);
      assert.deepEqual(trial.target, index >= n ? history[index - n].values : null);
      assert.equal(trial.match, index >= n && trial.values.some((value, slot) => value === history[index - n].values[slot]));
      // Requested matches yield to the hard repetition constraints. Score the
      // actual same-slot relation rather than manufacturing a third repeat.
      if (probability === 0) assert.equal(trial.match, false);
      if (index >= n && probability === 100 && !trial.match) assert.equal(trial.repetitionLimitedMatch, true);
      for (const digit of new Set(trial.values)) assert.ok(trial.values.filter(value => value === digit).length <= 2);
      const stream = [...history.slice(-2).flatMap(old => old.values).slice(-2), ...trial.values];
      for (let i = 2; i < stream.length; i++) assert.ok(!(stream[i] === stream[i - 1] && stream[i] === stream[i - 2]));
      if (index >= 2) for (let slot = 0; slot < count; slot++) {
        assert.ok(!(trial.values[slot] === history[index - 1].values[slot] && trial.values[slot] === history[index - 2].values[slot]));
      }
      history.push(trial); generated++;
    }
  }
  const bounds = normaliseSettings({ n: -10, count: 99, response: NaN, session: 'open', volume: Infinity, rate: 'constructor', spacing: 'toString' });
  assert.equal(bounds.n, 1); assert.equal(bounds.count, 6); assert.equal(bounds.response, 3); assert.equal(bounds.volume, .8);
  assert.equal(bounds.rate, 'average'); assert.equal(bounds.spacing, 'average'); assert.equal(bounds.session, 'open');
  for (const response of [30, 60, 120, 180, 240, 300]) assert.equal(normaliseSettings({ response }).response, response);
  for (const seconds of [1.25, 120, 299.75, 300]) assert.equal(normaliseSettings({ listening: true, seconds }).seconds, seconds);
  assert.equal(normaliseSettings({ response: 301 }).response, 300);
  assert.equal(normaliseSettings({ listening: true, seconds: 301 }).seconds, 300);
  assert.equal(normaliseSettings({}).response, 3); assert.equal(normaliseSettings({}).seconds, 5);
  assert.ok(Math.abs(normalQuantile(.975) - 1.959963986) < 1e-7);
  assert.equal(normalQuantile(.5), 0);
  assert.equal(dPrime({ hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0 }), null);
  const sensitivity = dPrime({ hits: 9, misses: 1, falseAlarms: 1, correctRejects: 9 });
  assert.ok(Math.abs(sensitivity - 2.193607124) < 1e-7);

  // Memory fill happens exactly N times and cannot inflate scored accuracy.
  for (const n of [1, 2, 8, 20]) {
    const f = fixture(); f.elements.n.value = String(n);
    f.start(); await f.flush();
    assert.equal(f.state.awaiting, false); assert.equal(f.elements.match.disabled, true);
    f.answer(true); assert.equal(f.state.score.scored, 0);
    await f.advance(n * 1450);
    assert.equal(f.state.score.shown, n + 1); assert.equal(f.state.current.scored, true);
    assert.equal(f.state.score.scored, 0);
    f.answer(f.state.current.match);
    assert.equal(f.state.score.correct, 1);
    assert.equal(f.state.score.scored, 1);
    f.stop();
  }

  // Pause preserves the trial, remaining response time and session duration.
  const paused = fixture(); paused.elements.n.value = '1';
  paused.start(); await paused.flush(); await paused.advance(1450); await paused.advance(400);
  const trial = paused.state.current, before = paused.state.score.shown;
  paused.pause();
  const clock = paused.elements.clock.textContent;
  assert.equal(paused.elements.match.disabled, true);
  assert.equal(paused.elements.stimulus.classList.contains('hidden'), true);
  paused.answer(trial.match); assert.equal(paused.state.score.scored, 0);
  await paused.advance(10000);
  assert.equal(paused.elements.clock.textContent, clock);
  paused.pause(); await paused.advance(599);
  assert.equal(paused.state.current, trial); assert.equal(paused.state.score.shown, before); assert.equal(paused.state.awaiting, true);
  paused.answer(trial.match); assert.equal(paused.state.score.correct, 1);
  await paused.advance(200); paused.pause(); await paused.advance(5000); paused.pause();
  await paused.advance(249); assert.equal(paused.state.current, trial);
  await paused.advance(1); assert.equal(paused.state.score.shown, before + 1);
  paused.stop(); assert.equal(paused.elements.pause.textContent, 'Pause');

  // An old feedback callback cannot insert a trial into a restarted session.
  const restarted = fixture(); restarted.elements.n.value = '1';
  restarted.start(); await restarted.flush(); await restarted.advance(1450);
  restarted.answer(restarted.state.current.match); restarted.stop(); restarted.start(); await restarted.flush();
  await restarted.advance(450); assert.equal(restarted.state.score.shown, 1);
  assert.equal(restarted.state.current.scored, false);
  restarted.stop(); assert.equal(restarted.tasks.size, 0);

  // Settings are frozen, including N, sequence length and probability.
  const frozen = fixture(); frozen.elements.n.value = '1'; frozen.elements.probability.value = '100';
  frozen.start(); await frozen.flush();
  assert.equal(frozen.elements.n.disabled, true); assert.equal(frozen.elements.test.disabled, true);
  frozen.elements.n.value = '20'; frozen.elements.count.value = '1'; frozen.elements.probability.value = '0';
  await frozen.advance(1450);
  assert.equal(frozen.state.current.scored, true); assert.equal(frozen.state.current.values.length, 3); assert.equal(frozen.state.current.match, true);
  frozen.stop(); assert.equal(frozen.elements.n.disabled, false);

  // A delayed input cannot beat the deadline, and an omission never becomes a
  // correct rejection or an observed signal-detection response.
  const timeout = fixture(); timeout.elements.n.value = '1'; timeout.elements.probability.value = '0';
  timeout.start(); await timeout.flush(); await timeout.advance(1450); timeout.jump(1001);
  timeout.answer(false);
  assert.equal(timeout.state.score.scored, 1); assert.equal(timeout.state.score.correct, 0);
  assert.equal(timeout.state.score.omissions, 1); assert.equal(timeout.state.score.correctRejects, 0);
  timeout.stop();

  const keys = fixture(); keys.elements.n.value = '1';
  keys.start(); await keys.flush(); await keys.advance(1450);
  const event = { key: keys.state.current.match ? 'f' : 'd', repeat: true, target: { tagName: 'BUTTON' }, preventDefault() {} };
  keys.events.keydown(event); assert.equal(keys.state.score.scored, 0);
  keys.events.keydown({ ...event, repeat: false, target: { tagName: 'SELECT' } }); assert.equal(keys.state.score.scored, 0);
  keys.events.keydown({ ...event, repeat: false }); assert.equal(keys.state.score.correct, 1);
  keys.environment.document.hidden = true; keys.events.visibilitychange(); assert.equal(keys.state.paused, true);
  keys.stop();

  // Audio-only never hides unavailable audio. A pause during speech restarts the
  // same stimulus and arms a single response timer after the full sequence.
  const visual = fixture(); visual.elements['audio-only'].checked = true;
  visual.start(); await visual.flush(); assert.equal(visual.elements.stimulus.classList.contains('hidden'), false); visual.stop();
  const failed = fixture({ speech: 'failure' }); failed.elements['audio-only'].checked = true;
  failed.start(); await failed.advance(100);
  assert.equal(failed.elements.stimulus.classList.contains('hidden'), false);
  failed.pause(); failed.pause(); assert.equal(failed.elements.stimulus.classList.contains('hidden'), false); failed.stop();
  const audio = fixture({ speech: true }); audio.elements['audio-only'].checked = true;
  audio.start(); await audio.advance(50); const audioTrial = audio.state.current;
  audio.pause(); await audio.advance(1000); audio.pause();
  await audio.advance(1409); assert.equal(audio.state.phase, 'speaking');
  await audio.advance(1); assert.equal(audio.state.phase, 'response');
  assert.equal(audio.state.current, audioTrial); assert.equal(audio.state.score.shown, 1);
  assert.equal(audio.spoken.length, 2); // Interrupted full sequence and full replay.
  audio.stop(); assert.equal(audio.tasks.size, 0);

  // The original N/count/response combinations preserve the full response
  // window. Rotate probability, interference, and silent/audio-only states;
  // their complete generator combinations are independently checked above.
  let lifecycleCombinations = 0;
  for (let n = 1; n <= 20; n++) for (const count of [1, 2, 3, 4, 5, 6]) for (const response of [1, 2, 3, 5, 8, 12, 20]) {
    const f = fixture({ speech: true });
    Object.entries({ n, count, response, probability: [20, 30, 35, 40, 50, 60][n % 6], interference: [0, 25, 50, 75, 100][n % 5] }).forEach(([id, value]) => { f.elements[id].value = String(value); });
    f.elements.session.value = 'open';
    // Muted output and unchecked speech both keep an audio-only trial visible.
    f.elements['audio-only'].checked = true;
    if ((n + count + response) % 2) f.elements.volume.value = '0';
    else f.elements.speak.checked = false;
    f.start(); await f.flush();
    assert.equal(f.state.phase, 'response');
    assert.equal(f.elements.stimulus.classList.contains('hidden'), false);
    assert.equal(f.state.remaining, response * 1000);
    await f.advance(n * (response * 1000 + 450));
    assert.equal(f.state.current.scored, true);
    assert.equal(f.state.score.shown, n + 1);
    f.answer(f.state.current.match); assert.equal(f.state.score.correct, 1);
    assert.equal(f.spoken.length, 0);
    f.stop(); assert.equal(f.tasks.size, 0);
    lifecycleCombinations++;
  }

  // The player receives one uninterrupted buffer under every speed/gap/count
  // combination; response timing begins after both its tail and output drain.
  let audibleCombinations = 0;
  for (const rate of Object.keys(numberSpeech.RATES)) for (const spacing of Object.keys(numberSpeech.GAPS)) for (const count of [1, 2, 3, 4, 5, 6]) {
    const f = fixture({ speech: true });
    f.elements.rate.value = rate; f.elements.spacing.value = spacing; f.elements.count.value = String(count);
    f.elements['audio-only'].checked = true;
    f.elements.volume.value = ['.4', '.6', '.8', '1'][audibleCombinations % 4];
    f.start(); await f.flush();
    assert.equal(f.state.phase, 'speaking'); assert.equal(f.state.awaiting, false);
    assert.equal(f.spoken.length, 1);
    const expected = numberSpeech.buildSequence(f.state.current.values, f.state.settings, audioData);
    assert.deepEqual(f.spoken[0].getChannelData(0), expected.samples);
    const completion = expected.duration * 1000 + 60;
    await f.advance(completion - .01);
    assert.equal(f.state.phase, 'speaking'); assert.equal(f.state.score.scored, 0);
    await f.advance(.02);
    assert.equal(f.state.phase, 'response');
    assert.equal(f.state.deadline > f.now() + 999, true);
    assert.equal(f.elements.stimulus.classList.contains('hidden'), true);
    f.stop(); assert.equal(f.tasks.size, 0); audibleCombinations++;
  }

  // Expiration of session time must not cut a phoneme in half. Automatic finish
  // waits for the complete playing buffer; an explicit Stop remains immediate.
  for (const session of [5, 10, 15, 20, 30, 45, 60, 120, 180, 240, 300, 360, 'open']) {
    const expiring = fixture({ speech: true }); expiring.elements.session.value = String(session);
    expiring.start(); await expiring.flush();
    expiring.state.elapsed = (session === 'open' ? 60 : session) * 60000 - 100;
    const finalSource = expiring.sources.find(source => !source.loop);
    await expiring.advance(250);
    assert.equal(expiring.state.running, true); assert.equal(expiring.state.phase, 'speaking');
    assert.equal(finalSource.stopped, false);
    await expiring.advance(1160);
    if (session === 'open') {
      assert.equal(expiring.state.running, true); assert.equal(expiring.state.phase, 'response');
      expiring.stop();
    } else {
      assert.equal(expiring.state.running, false);
      assert.equal(expiring.elements.stimulus.textContent, 'SESSION COMPLETE');
    }
    assert.equal(expiring.tasks.size, 0);
  }

  // Completed Test speech, cancelled tests, Stop/Start, and a delayed old audio
  // event cannot close the new output or open a response window prematurely.
  const stale = fixture({ speech: true });
  stale.elements.test.onclick(); await stale.flush();
  const oldTest = stale.sources.find(source => !source.loop), oldTestEnd = oldTest.completed;
  stale.start(); await stale.flush();
  assert.equal(oldTest.stopped, true);
  const firstTrial = stale.state.current, firstEnd = stale.sources.filter(source => !source.loop).at(-1).completed;
  oldTestEnd?.(); await stale.flush();
  assert.equal(stale.state.current, firstTrial); assert.equal(stale.state.phase, 'speaking');
  stale.stop(); stale.start(); await stale.flush();
  const newTrial = stale.state.current, newSource = stale.sources.filter(source => !source.loop).at(-1);
  firstEnd?.(); oldTestEnd?.(); await stale.flush();
  assert.equal(stale.state.current, newTrial); assert.equal(stale.state.score.shown, 1);
  assert.equal(stale.state.phase, 'speaking'); assert.equal(newSource.stopped, false);
  await stale.advance(1410);
  assert.equal(stale.state.phase, 'response'); assert.equal(stale.state.current, newTrial);
  stale.stop(); assert.equal(stale.tasks.size, 0);

  // Listening is a separate unscored path. Every supported count remains
  // audible, 120 seconds is start-to-start, and pause freezes active time.
  for (const count of [1, 2, 3, 4, 5, 6]) {
    const listening = fixture({ speech: true });
    listening.elements.count.value = String(count);
    listening.elements['number-listening'].checked = true;
    listening.elements['number-seconds'].value = '120';
    listening.start(); await listening.flush();
    assert.equal(listening.state.settings.seconds, 120);
    assert.equal(listening.elements['number-responses'].hidden, true);
    assert.equal(listening.elements['number-scored-stats'].hidden, true);
    assert.equal(listening.elements['number-listening-stats'].hidden, false);
    await listening.advance(119999);
    assert.equal(listening.state.presented, 1); assert.equal(listening.state.heard, 1);
    listening.answer(true); assert.ok(Object.values(listening.state.score).every(value => value === 0));
    await listening.advance(1); assert.equal(listening.state.presented, 2);
    const sequenceDuration = numberSpeech.buildSequence(listening.state.current.values, listening.state.settings, audioData).duration * 1000 + 60;
    await listening.advance(sequenceDuration);
    assert.equal(listening.state.heard, 2);
    listening.pause(); const remaining = listening.state.remaining;
    await listening.advance(5000); assert.equal(listening.state.presented, 2);
    listening.pause(); await listening.advance(remaining - .01); assert.equal(listening.state.presented, 2);
    await listening.advance(.02); assert.equal(listening.state.presented, 3);
    assert.ok(Object.values(listening.state.score).every(value => value === 0));
    listening.stop(); assert.equal(listening.tasks.size, 0);
  }

  const noAudio = fixture({ speech: 'failure' });
  noAudio.elements['number-listening'].checked = true;
  noAudio.start(); await noAudio.advance(10000);
  assert.equal(noAudio.state.paused, true); assert.equal(noAudio.state.heard, 0);
  assert.equal(noAudio.state.presented, 1); assert.ok(Object.values(noAudio.state.score).every(value => value === 0));
  noAudio.stop();

  // Five-minute listening is still measured start-to-start, including speech.
  // The previous 120-second limit must not silently shorten its cadence.
  const fiveMinuteListening = fixture({ speech: true });
  Object.entries({ count: '6', session: 'open', 'number-seconds': '300' }).forEach(([id, value]) => { fiveMinuteListening.elements[id].value = value; });
  fiveMinuteListening.elements['number-listening'].checked = true;
  fiveMinuteListening.start(); await fiveMinuteListening.flush();
  const listeningSpeech = numberSpeech.buildSequence(fiveMinuteListening.state.current.values, fiveMinuteListening.state.settings, audioData).duration * 1000 + 60;
  await fiveMinuteListening.advance(listeningSpeech - .01); assert.equal(fiveMinuteListening.state.phase, 'speaking');
  await fiveMinuteListening.advance(.01); assert.equal(fiveMinuteListening.state.phase, 'listening');
  assert.equal(fiveMinuteListening.state.deadline, 300000); assert.equal(fiveMinuteListening.state.heard, 1);
  await fiveMinuteListening.advance(120000 - fiveMinuteListening.now());
  assert.equal(fiveMinuteListening.state.presented, 1);
  fiveMinuteListening.pause(); assert.equal(fiveMinuteListening.state.remaining, 180000);
  await fiveMinuteListening.advance(500000); assert.equal(fiveMinuteListening.state.presented, 1);
  fiveMinuteListening.pause(); await fiveMinuteListening.advance(179999); assert.equal(fiveMinuteListening.state.presented, 1);
  await fiveMinuteListening.advance(1); assert.equal(fiveMinuteListening.state.presented, 2);
  assert.equal(fiveMinuteListening.now(), 800000);
  assert.ok(Object.values(fiveMinuteListening.state.score).every(value => value === 0));
  fiveMinuteListening.stop(); assert.equal(fiveMinuteListening.tasks.size, 0);

  // Both memory fill and scored responses receive the full 300 seconds after
  // six complete spoken numbers. Paused wall time is excluded from the window.
  const fiveMinuteResponse = fixture({ speech: true });
  Object.entries({ count: '6', n: '1', session: 'open', response: '300' }).forEach(([id, value]) => { fiveMinuteResponse.elements[id].value = value; });
  fiveMinuteResponse.start(); await fiveMinuteResponse.flush();
  const responseSpeech = numberSpeech.buildSequence(fiveMinuteResponse.state.current.values, fiveMinuteResponse.state.settings, audioData).duration * 1000 + 60;
  await fiveMinuteResponse.advance(responseSpeech);
  assert.equal(fiveMinuteResponse.state.phase, 'response'); assert.equal(fiveMinuteResponse.state.awaiting, false);
  assert.equal(fiveMinuteResponse.state.remaining, 300000);
  await fiveMinuteResponse.advance(299999); assert.equal(fiveMinuteResponse.state.presented, 1);
  await fiveMinuteResponse.advance(1); assert.equal(fiveMinuteResponse.state.phase, 'feedback');
  assert.equal(fiveMinuteResponse.state.score.scored, 0);
  await fiveMinuteResponse.advance(450); assert.equal(fiveMinuteResponse.state.presented, 2);
  await fiveMinuteResponse.advance(responseSpeech);
  assert.equal(fiveMinuteResponse.state.awaiting, true); assert.equal(fiveMinuteResponse.state.remaining, 300000);
  await fiveMinuteResponse.advance(120000); assert.equal(fiveMinuteResponse.state.score.scored, 0);
  fiveMinuteResponse.pause(); assert.equal(fiveMinuteResponse.state.remaining, 180000);
  await fiveMinuteResponse.advance(500000); assert.equal(fiveMinuteResponse.state.score.scored, 0);
  fiveMinuteResponse.pause(); await fiveMinuteResponse.advance(179999); assert.equal(fiveMinuteResponse.state.score.scored, 0);
  await fiveMinuteResponse.advance(1); assert.equal(fiveMinuteResponse.state.score.scored, 1); assert.equal(fiveMinuteResponse.state.score.omissions, 1);
  fiveMinuteResponse.stop(); assert.equal(fiveMinuteResponse.tasks.size, 0);

  const invalidInterval = fixture({ speech: true });
  invalidInterval.elements['number-listening'].checked = true; invalidInterval.elements['number-seconds'].value = '301';
  invalidInterval.start(); await invalidInterval.flush();
  assert.equal(invalidInterval.state.running, false); assert.equal(invalidInterval.spoken.length, 0);

  const complete = fixture(); complete.start(); await complete.flush(); await complete.advance(300000);
  assert.equal(complete.state.running, false); assert.equal(complete.elements.stimulus.textContent, 'SESSION COMPLETE');
  assert.equal(complete.tasks.size, 0);
  assert.ok(complete.state.trials.length <= 8);
  console.log(JSON.stringify({ passed: true, generatedTrials: generated, lifecycleCombinations, audibleCombinations, timingScoringAndAudioRegressions: true, fiveMinutePacing: true }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
