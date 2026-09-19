'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createPlayer, buildSequence, RATES, GAPS, LEAD_SECONDS, TAIL_SECONDS } = require('../number-speech.js');

const rateNames = ['average', 'moderately-fast', 'fast', 'very-fast', 'extremely-fast', 'incredibly-fast', 'ultra-fast'];
const expectedGaps = [300, 200, 120, 80, 40, 15, 0];
const settings = overrides => ({ speak: true, volume: .8, rate: 'average', spacing: 'average', ...overrides });

// Deliberately nonzero first and last samples make onset loss, trimming, fades,
// offsets and dropped final samples observable without a speech-engine mock.
function syntheticData() {
  const clips = {};
  for (let rate = 0; rate < rateNames.length; rate++) {
    clips[rateNames[rate]] = {};
    for (let digit = 1; digit <= 9; digit++) {
      const pcm = Buffer.alloc((97 + digit * 3 + rate * 5) * 2);
      for (let index = 0; index < pcm.length / 2; index++) {
        const value = index === 0 ? -32768 : index === pcm.length / 2 - 1 ? 32767 : (index * 271 + digit * 101 + rate * 71) % 60001 - 30000;
        pcm.writeInt16LE(value, index * 2);
      }
      clips[rateNames[rate]][digit] = pcm.toString('base64');
    }
  }
  return { sampleRate: 8000, clips };
}

function decode(pcm) {
  const bytes = Buffer.from(pcm, 'base64');
  assert.equal(bytes.length % 2, 0, 'PCM samples must not be truncated');
  return Float32Array.from({ length: bytes.length / 2 }, (_, index) => bytes.readInt16LE(index * 2) / 32768);
}

function verifyCorpus(data) {
  assert.ok(Number.isInteger(data.sampleRate) && data.sampleRate >= 8000);
  let combinations = 0;
  for (const rate of rateNames) for (const spacing of rateNames) for (const count of [1, 2, 3]) {
    for (let firstDigit = 1; firstDigit <= 9; firstDigit++) {
      const digits = Array.from({ length: count }, (_, index) => (firstDigit - 1 + index) % 9 + 1);
      const sequence = buildSequence(digits, settings({ rate, spacing }), data);
      assert.ok(sequence.samples instanceof Float32Array);
      assert.equal(sequence.sampleRate, data.sampleRate);
      assert.equal(sequence.segments.length, count);
      let expectedStart = Math.round(LEAD_SECONDS * data.sampleRate);
      for (let index = 0; index < count; index++) {
        const segment = sequence.segments[index], original = decode(data.clips[rate][digits[index]]);
        assert.equal(segment.digit, digits[index]);
        assert.equal(segment.start, expectedStart, `${rate}/${spacing}/${digits}: number starts at its scheduled sample`);
        assert.equal(segment.end, segment.start + original.length);
        assert.deepEqual(sequence.samples.slice(segment.start, segment.end), original, `${rate}/${spacing}/${digits}: every phoneme sample remains intact`);
        const followingStart = index + 1 === count ? sequence.samples.length : segment.end + Math.round(GAPS[spacing] / 1000 * data.sampleRate);
        assert.ok(sequence.samples.subarray(segment.end, followingStart).every(sample => sample === 0), 'gaps and final padding are silence');
        expectedStart = followingStart;
      }
      assert.ok(sequence.segments[0].start / data.sampleRate >= .35, 'output startup has protected silence');
      assert.ok(sequence.samples.subarray(0, sequence.segments[0].start).every(sample => sample === 0));
      assert.ok((sequence.samples.length - sequence.segments.at(-1).end) / data.sampleRate >= .08, 'full last number precedes output drain padding');
      assert.equal(sequence.samples.length, sequence.segments.at(-1).end + Math.round(TAIL_SECONDS * data.sampleRate));
      combinations++;
    }
  }
  assert.equal(combinations, 1323);
}

function audioFixture(options = {}) {
  let clock = 0, identifier = 0;
  const tasks = new Map(), contexts = [], sources = [], gains = [];
  const enqueue = (callback, delay = 0, repeat = false) => {
    const id = ++identifier;
    tasks.set(id, { callback, due: clock + Math.max(0, Number(delay) || 0), repeat, delay });
    return id;
  };
  let nativeCalls = 0;
  class Context {
    constructor() {
      if (options.constructorError) throw new Error('No output hardware');
      this.state = options.initialState || 'suspended';
      this.sampleRate = 48000;
      this.baseLatency = .01;
      this.outputLatency = .03;
      this.destination = {};
      this.listeners = {};
      this.resumeCalls = 0;
      this.audioTime = 0;
      this.runningSince = 0;
      contexts.push(this);
    }
    get currentTime() { return this.audioTime + (this.state === 'running' ? (clock - this.runningSince) / 1000 : 0); }
    setState(state) {
      this.audioTime = this.currentTime;
      this.state = state;
      this.runningSince = clock;
      this.onstatechange?.();
      for (const callback of this.listeners.statechange || []) callback();
    }
    resume() {
      this.resumeCalls++;
      if (options.resumeError) return Promise.reject(new Error('Output unavailable'));
      if (options.pendingResume) return new Promise(resolve => { this.releaseResume = () => { this.setState('running'); resolve(); }; });
      this.setState('running');
      return Promise.resolve();
    }
    suspend() { this.setState('suspended'); return Promise.resolve(); }
    close() { this.setState('closed'); return Promise.resolve(); }
    addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
    removeEventListener(name, callback) { this.listeners[name] = (this.listeners[name] || []).filter(item => item !== callback); }
    createBuffer(channels, length, sampleRate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: channel => data[channel], copyToChannel: (samples, channel, offset = 0) => data[channel].set(samples, offset) };
    }
    createGain() {
      const writes = [];
      const gain = { value: 1, setValueAtTime(value, time) { this.value = value; writes.push({ type: 'set', value, time }); }, linearRampToValueAtTime(value, time) { this.value = value; writes.push({ type: 'ramp', value, time }); }, setTargetAtTime(value, time) { this.value = value; writes.push({ type: 'target', value, time }); }, cancelScheduledValues() {} };
      const node = { gain, writes, connect() {}, disconnect() {} };
      gains.push(node); return node;
    }
    createBufferSource() {
      const context = this;
      const source = {
        buffer: null, playbackRate: { value: 1 }, loop: false, started: false, stopped: false, onended: null,
        connect() {}, disconnect() {},
        addEventListener(name, callback) { if (name === 'ended') this.onended = callback; },
        removeEventListener(name, callback) { if (name === 'ended' && this.onended === callback) this.onended = null; },
        start(when = 0, offset = 0, duration) {
          if (options.startError) throw new Error('Source failed');
          this.started = true; this.when = when; this.offset = offset; this.explicitDuration = duration;
          if (!this.loop) this.endTask = enqueue(() => { this.ended = true; this.onended?.(); }, Math.max(0, when - context.currentTime) * 1000 + (duration ?? this.buffer.duration) * 1000 / this.playbackRate.value);
        },
        stop() { this.stopped = true; tasks.delete(this.endTask); this.onended?.(); }
      };
      sources.push(source); return source;
    }
  }
  const environment = {
    AudioContext: Context, Date: { now: () => clock }, performance: { now: () => clock },
    setTimeout: enqueue, clearTimeout: id => tasks.delete(id),
    setInterval: (callback, delay) => enqueue(callback, delay, true), clearInterval: id => tasks.delete(id),
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    speechSynthesis: { cancel() { nativeCalls++; }, resume() { nativeCalls++; }, speak() { nativeCalls++; } },
    document: { hidden: false }, addEventListener() {}, removeEventListener() {}
  };
  const flush = async () => { for (let count = 0; count < 12; count++) await Promise.resolve(); };
  async function advance(milliseconds) {
    const destination = clock + milliseconds;
    await flush();
    for (let guard = 0; guard < 100000; guard++) {
      const next = [...tasks].filter(([, task]) => task.due <= destination).sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      if (!next) { clock = destination; await flush(); return; }
      const [id, task] = next; clock = task.due;
      if (task.repeat) task.due += Math.max(1, task.delay);
      else tasks.delete(id);
      task.callback(); await flush();
    }
    throw new Error('Audio timer did not settle');
  }
  const data = syntheticData(), player = createPlayer(environment, data);
  return { player, environment, data, contexts, sources, gains, tasks, flush, advance,
    nativeCalls: () => nativeCalls,
    spokenSources: () => sources.filter(source => source.buffer && source.buffer.duration > LEAD_SECONDS + TAIL_SECONDS)
  };
}

test('every digit, sequence length, speech speed and gap preserves complete PCM boundaries', () => {
  assert.deepEqual(Object.keys(RATES), rateNames);
  assert.deepEqual(rateNames.map(rate => GAPS[rate]), expectedGaps);
  verifyCorpus(syntheticData());
});

test('shipped audio includes all 63 complete rate-specific recordings and preserves them in 1323 sequences', () => {
  const assetPath = path.resolve(__dirname, '../number-speech-data.js');
  assert.ok(fs.existsSync(assetPath), 'the deployed player must ship its speech recordings');
  const data = require(assetPath);
  for (const rate of rateNames) for (let digit = 1; digit <= 9; digit++) {
    const pcm = decode(data.clips[rate][digit]);
    assert.ok(pcm.length > data.sampleRate * .01, `${rate}/${digit} contains a complete speech clip`);
    assert.ok(pcm.some(value => Math.abs(value) > .01), `${rate}/${digit} is audible`);
    assert.ok(pcm.every(Number.isFinite));
  }
  verifyCorpus(data);
});

test('all generated recordings retain protected speech boundaries, verified hashes and distinct increasing speeds', () => {
  const data = require('../number-speech-data.js');
  const protectedFrames = data.protectedSpeechBoundaryFrames;
  assert.equal(protectedFrames, Math.round(.08 * data.sampleRate));
  let verifiedClips = 0, verifiedEdges = 0;
  for (let digit = 1; digit <= 9; digit++) {
    const original = Buffer.from(data.clips.average[digit], 'base64');
    const [speechStart, speechEnd] = data.sourceSpeechBounds[digit];
    assert.ok(speechStart >= 0 && speechEnd <= original.length / 2 && speechEnd - speechStart >= 2 * protectedFrames);
    let previousLength = Infinity;
    for (const rate of rateNames) {
      const pcm = Buffer.from(data.clips[rate][digit], 'base64');
      assert.equal(createHash('sha256').update(pcm).digest('hex'), data.clipPcmSha256[rate][digit], `${rate}/${digit}: shipped PCM matches its generation manifest`);
      assert.equal(pcm.length, data.frames[rate][digit] * 2);
      assert.ok(pcm.length < previousLength, `${rate}/${digit}: a faster option has a strictly shorter recording`);
      previousLength = pcm.length;
      const regions = data.preservedRegions[rate][digit];
      assert.equal(regions.length, 2);
      for (let index = 0; index < regions.length; index++) {
        const region = regions[index];
        assert.equal(region.sourceStart, index === 0 ? speechStart : speechEnd - protectedFrames);
        assert.equal(region.frames, protectedFrames);
        assert.ok(Number.isInteger(region.outputStart) && region.outputStart >= 0 && region.outputStart + protectedFrames <= pcm.length / 2);
        assert.deepEqual(
          pcm.subarray(region.outputStart * 2, (region.outputStart + protectedFrames) * 2),
          original.subarray(region.sourceStart * 2, (region.sourceStart + protectedFrames) * 2),
          `${rate}/${digit}: the ${index === 0 ? 'initial' : 'final'} 80 ms of speech survives tempo processing unchanged`
        );
        verifiedEdges++;
      }
      verifiedClips++;
    }
  }
  assert.equal(verifiedClips, 63);
  assert.equal(verifiedEdges, 126);
});

test('one continuous source per trial uses full buffer from offset zero at every volume', async () => {
  for (const volume of [.4, .6, .8, 1]) {
    const f = audioFixture();
    assert.equal(f.player.available(), true);
    const prepared = f.player.prepare();
    assert.equal(f.contexts[0].resumeCalls, 1, 'output unlock begins synchronously in the user gesture');
    assert.equal(await prepared, true);
    const result = f.player.play([1, 2, 9], settings({ volume, rate: 'ultra-fast', spacing: 'ultra-fast' }));
    await f.flush();
    assert.equal(f.spokenSources().length, 1);
    const source = f.spokenSources()[0], expected = buildSequence([1, 2, 9], settings({ volume, rate: 'ultra-fast', spacing: 'ultra-fast' }), f.data);
    assert.equal(source.offset, 0);
    assert.equal(source.explicitDuration, undefined, 'source may not truncate the last number');
    assert.equal(source.playbackRate.value, 1, 'fast speech is pre-rendered and does not change playback pitch');
    assert.deepEqual(source.buffer.getChannelData(0), expected.samples);
    assert.ok(f.gains.some(node => node.gain.value === volume));
    assert.ok(f.gains.flatMap(node => node.writes).every(write => write.type === 'set' || write.time <= source.when + LEAD_SECONDS), 'no volume ramp erases speech onset');
    await f.advance(2000);
    assert.equal(await result, true);
    assert.equal(f.nativeCalls(), 0, 'number playback never restarts native speech synthesis');
    f.player.dispose();
  }
});

test('speech disabled and zero volume skip playback without invisible response delays', async () => {
  for (const overrides of [{ speak: false }, { volume: 0 }]) {
    const f = audioFixture();
    assert.equal(await f.player.play([1, 2], settings(overrides)), false);
    assert.equal(f.spokenSources().length, 0);
    assert.equal(f.nativeCalls(), 0);
    f.player.dispose();
  }
});

test('completion waits for the entire sequence and output drain before allowing a response', async () => {
  const f = audioFixture();
  const promise = f.player.play([1, 2, 3], settings());
  let settled = false;
  promise.then(() => { settled = true; });
  await f.flush();
  const source = f.spokenSources()[0];
  await f.advance(source.buffer.duration * 1000 - 1);
  assert.equal(settled, false, 'every final sample must finish');
  await f.advance(1);
  assert.equal(settled, false, 'device output still needs to drain after the graph ends');
  await f.advance(59);
  assert.equal(settled, false);
  await f.advance(1);
  assert.equal(await promise, true);
  f.player.dispose();
});

test('cancelled and superseded audio cannot complete or stop a subsequent trial', async () => {
  const f = audioFixture();
  const first = f.player.play([1, 2], settings()); await f.flush();
  const oldSource = f.spokenSources().at(-1), lateEnd = oldSource.onended;
  f.player.cancel(); assert.equal(await first, false); assert.equal(oldSource.stopped, true);
  const second = f.player.play([3, 4], settings()); let secondSettled = false;
  second.then(() => { secondSettled = true; }); await f.flush();
  const active = f.spokenSources().at(-1);
  lateEnd?.(); await f.flush();
  assert.equal(secondSettled, false);
  assert.equal(active.stopped, false);
  const third = f.player.play([9], settings()); await f.flush();
  assert.equal(await second, false); assert.equal(active.stopped, true);
  await f.advance(2000); assert.equal(await third, true);
  f.player.dispose();
});

test('cancel during a delayed output unlock prevents late playback', async () => {
  const f = audioFixture({ pendingResume: true });
  const pending = f.player.play([1], settings()); await f.flush();
  f.player.cancel(); await f.flush();
  assert.equal(await pending, false);
  f.contexts[0].releaseResume(); await f.flush();
  assert.equal(f.spokenSources().length, 0);
  f.player.dispose();
});

test('an output unlock that never resolves fails visibly instead of leaving the trainer stuck', async () => {
  const f = audioFixture({ pendingResume: true });
  const pending = f.player.play([1], settings());
  let settled = false;
  pending.then(() => { settled = true; });
  await f.advance(2499); assert.equal(settled, false);
  await f.advance(1); assert.equal(await pending, false);
  f.contexts[0].releaseResume(); await f.flush();
  assert.equal(f.spokenSources().length, 0, 'late output readiness cannot resurrect a failed presentation');
  f.player.dispose();
});

test('release closes idle audio and a late previous resume cannot unlock a restarted session', async () => {
  const f = audioFixture({ pendingResume: true });
  const first = f.player.play([1], settings()); await f.flush();
  const oldContext = f.contexts[0];
  f.player.release();
  assert.equal(await first, false);
  assert.equal(oldContext.state, 'closed');
  assert.ok(f.sources.filter(source => source.loop).every(source => source.stopped), 'idle output does not continue after Stop');
  const second = f.player.play([2], settings()); let secondSettled = false;
  second.then(() => { secondSettled = true; }); await f.flush();
  assert.equal(f.contexts.length, 2);
  oldContext.releaseResume(); await f.flush();
  assert.equal(f.spokenSources().length, 0);
  assert.equal(secondSettled, false);
  f.contexts[1].releaseResume(); await f.flush();
  assert.equal(f.spokenSources().length, 1);
  await f.advance(2000);
  assert.equal(await second, true);
  f.player.dispose();
  assert.equal(f.player.available(), false);
});

test('unavailable output, rejected unlock and failed start settle as unavailable audio', async () => {
  const noAudio = createPlayer({ setTimeout, clearTimeout }, syntheticData());
  assert.equal(noAudio.available(), false);
  assert.equal(await noAudio.prepare(), false);
  assert.equal(await noAudio.play([1], settings()), false);
  noAudio.dispose();
  for (const options of [{ constructorError: true }, { resumeError: true }, { startError: true }]) {
    const f = audioFixture(options);
    assert.equal(await f.player.play([1, 2, 3], settings()), false);
    f.player.dispose();
    assert.equal(f.nativeCalls(), 0);
  }
});
