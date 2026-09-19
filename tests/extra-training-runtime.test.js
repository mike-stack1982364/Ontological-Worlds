'use strict';

const assert = require('node:assert/strict');
const { createTrainer, makeTrial, sameSlots, normaliseSettings, dPrime, normalQuantile } = require('../extra-training-runtime.js');

function seededRandom(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function fixture(options = {}) {
  let time = 0, identifier = 0;
  const tasks = new Map(), events = {}, elements = {};
  const defaults = { n: '2', count: '3', response: '1', session: '5', probability: '35', interference: '75', rate: 'average', spacing: 'average', volume: '.8' };
  const controlIds = ['n', 'count', 'response', 'session', 'probability', 'interference', 'rate', 'spacing', 'volume', 'speak', 'audio-only', 'keyboard', 'haptic', 'test', 'start', 'pause', 'stop', 'match', 'no-match', 'stimulus', 'feedback', 'explanation', 'trials', 'hits', 'accuracy', 'dprime', 'clock', 'sessionprogress', 'timerbar'];
  for (const id of controlIds) {
    const classes = new Set();
    elements[id] = {
      value: defaults[id] || '', checked: id === 'keyboard', disabled: false, textContent: '', innerHTML: '', style: {},
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
  const spoken = [], speechTasks = new Set();
  if (options.speech) {
    elements.speak.checked = true;
    environment.SpeechSynthesisUtterance = function (text) { this.text = text; };
    environment.speechSynthesis = {
      resume() {},
      cancel() { speechTasks.forEach(id => tasks.delete(id)); speechTasks.clear(); },
      speak(utterance) {
        spoken.push(utterance.text);
        const id = schedule(() => {
          speechTasks.delete(id);
          if (options.speech === 'failure') utterance.onerror();
          else utterance.onend();
        }, 100);
        speechTasks.add(id);
      }
    };
  }
  const trainer = createTrainer(environment);
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
  async function advance(milliseconds) {
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
  return { ...trainer, elements, events, environment, tasks, spoken, flush, advance, jump: ms => { time += ms; } };
}

async function run() {
  // Independent positional oracle: a repeated digit only counts in its original
  // slot, including sequences containing duplicate digits.
  assert.deepEqual(sameSlots([2, 3, 1], [1, 2, 3]), []);
  assert.deepEqual(sameSlots([1, 1, 9], [1, 2, 1]), [0]);
  let generated = 0;
  for (const n of [1, 2, 8, 20]) for (const count of [1, 2, 3]) for (const interference of [0, 25, 50, 75, 100]) for (const probability of [0, 100]) {
    const settings = normaliseSettings({ n, count, interference, probability });
    const history = [], random = seededRandom(23847);
    for (let index = 0; index < n + 80; index++) {
      const trial = makeTrial(history, settings, random);
      assert.equal(trial.values.length, count);
      assert.ok(trial.values.every(digit => Number.isInteger(digit) && digit >= 1 && digit <= 9));
      assert.equal(trial.scored, index >= n);
      assert.deepEqual(trial.target, index >= n ? history[index - n].values : null);
      assert.equal(trial.match, index >= n && trial.values.some((value, slot) => value === history[index - n].values[slot]));
      if (index >= n) assert.equal(trial.match, probability === 100);
      history.push(trial); generated++;
    }
  }
  const bounds = normaliseSettings({ n: -10, count: 99, response: NaN, session: 'open', volume: Infinity, rate: 'constructor', spacing: 'toString' });
  assert.equal(bounds.n, 1); assert.equal(bounds.count, 3); assert.equal(bounds.response, 3); assert.equal(bounds.volume, .8);
  assert.equal(bounds.rate, 'average'); assert.equal(bounds.spacing, 'average'); assert.equal(bounds.session, 'open');
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
  await audio.advance(899); assert.equal(audio.state.phase, 'speaking');
  await audio.advance(1); assert.equal(audio.state.phase, 'response');
  assert.equal(audio.state.current, audioTrial); assert.equal(audio.state.score.shown, 1);
  assert.equal(audio.spoken.length, 4); // Initial interrupted number plus replayed sequence.
  audio.stop(); assert.equal(audio.tasks.size, 0);

  const complete = fixture(); complete.start(); await complete.flush(); await complete.advance(300000);
  assert.equal(complete.state.running, false); assert.equal(complete.elements.stimulus.textContent, 'SESSION COMPLETE');
  assert.equal(complete.tasks.size, 0);
  assert.ok(complete.state.trials.length <= 8);
  console.log(JSON.stringify({ passed: true, generatedTrials: generated, timingScoringAndAudioRegressions: true }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
