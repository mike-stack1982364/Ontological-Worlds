'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createPlayer, buildSequence, RATES, GAPS, LEAD_SECONDS, TAIL_SECONDS } = require('../number-speech.js');

const rateNames = ['average', 'moderately-fast', 'fast', 'very-fast', 'extremely-fast', 'incredibly-fast', 'ultra-fast'];
const expectedRates = [1, 1.12, 1.25, 1.4, 1.55, 1.7, 1.85];
const expectedGaps = [300, 200, 120, 80, 40, 15, 0];
const settings = overrides => ({ speak: true, volume: .8, rate: 'average', spacing: 'average', ...overrides });
const digitWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
// Pin the original Asterisk 1.6.1 Australian English recording payloads. A
// generated asset's own manifest alone cannot detect a replaced source voice.
const originalPcmHashes = [
  '3c221f7f6850c43e6e6ca2b93b94dfde323de56d2c93f4fcafb3e5f077319e82',
  'fa3ce6faca5b6fd28ec3f519f529ff947f6a4cdb7c8ac3a09d0647e9c0a87e17',
  'c8571148e6f3d20b2ca5e7e5a54acbc52577806b10704e53a17e376e157a2554',
  '0aab1928ee5ef178d4b888db829ffd44a46b173e0f5ab94b1a599d3af6f91cae',
  'f543305da113b8a6cd164a0d7813dec6e7a5776a1c10c3e3adc2811305c00619',
  '47e198375fc30863e6eb7ff8221500cd5d4e0d12d07120a6b370795e0fc2f57b',
  'e04ef7fad20f946a7b381dc18782fc7b74c48c07fbe8d527245ae4d7c2131d47',
  '47d11020713a9541c7a98644f652c4e5f3bf14b74ff33d826c5fb906c4e31810',
  '289de6b8f1d31ec76d6c69e833e7a9fba5ba9942f2891590e7e2f16b8c6046a0'
];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function readPcmWav(bytes, sampleRate) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, 'the complete source WAV is present');
  let format, pcm;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const tag = bytes.toString('ascii', offset, offset + 4), length = bytes.readUInt32LE(offset + 4);
    assert.ok(offset + 8 + length <= bytes.length, 'source WAV chunks are complete');
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (tag === 'fmt ') format = chunk;
    if (tag === 'data') pcm = chunk;
    offset += 8 + length + (length % 2);
  }
  assert.ok(format && pcm);
  assert.equal(format.readUInt16LE(0), 1, 'source is linear PCM');
  assert.equal(format.readUInt16LE(2), 1, 'source is mono');
  assert.equal(format.readUInt32LE(4), sampleRate);
  assert.equal(format.readUInt16LE(14), 16);
  assert.equal(pcm.length % 2, 0);
  return pcm;
}

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
  assert.deepEqual(rateNames.map(rate => RATES[rate]), expectedRates);
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

test('the natural voice has traceable original recordings and average speed preserves every source sample', () => {
  const source = require('../assets/number-voice/source.json');
  const data = require('../number-speech-data.js');
  assert.equal(source.voice, 'Cameron (Australian English)');
  assert.equal(source.sampleRate, 16000);
  assert.equal(source.provenance.speaker, 'Cameron');
  assert.equal(source.provenance.recordedBy, 'CAMSOWN');
  assert.equal(source.provenance.license, 'CC-BY-3.0');
  assert.equal(source.provenance.archiveSha256, '4a11986b715756570012187f841a0655667e1d70e43239f1e4915067e5bfceed');
  assert.equal(source.provenance.sourceUrl, 'https://downloads.asterisk.org/pub/telephony/sounds/releases/asterisk-core-sounds-en_AU-sln16-1.6.1.tar.gz');
  assert.equal(data.voice, source.voice);
  assert.equal(data.sampleRate, source.sampleRate);
  assert.deepEqual(data.provenance, source.provenance);
  assert.equal(data.quietGuardFrames, Math.round(.02 * data.sampleRate));
  const guardBytes = data.quietGuardFrames * 2;
  for (let digit = 1; digit <= 9; digit++) {
    const recording = source.clips[digit], wav = Buffer.from(recording.wavBase64, 'base64');
    assert.equal(recording.transcript, digitWords[digit - 1]);
    assert.equal(recording.filename, `digits/${digit}.sln16`);
    assert.equal(sha256(wav), recording.sha256);
    assert.equal(data.sourceWavSha256[digit], recording.sha256);
    const original = readPcmWav(wav, source.sampleRate);
    assert.equal(sha256(original), originalPcmHashes[digit - 1]);
    assert.equal(recording.pcmSha256, originalPcmHashes[digit - 1]);
    assert.equal(data.sourcePcmSha256[digit], originalPcmHashes[digit - 1]);
    assert.equal(original.length, recording.frames * 2);
    assert.equal(data.sourceFrames[digit], recording.frames);
    const average = Buffer.from(data.clips.average[digit], 'base64');
    assert.equal(data.scheduleTailFrames.average[digit], Math.round(.08 * data.sampleRate));
    assert.equal(average.length, original.length + 2 * guardBytes + 2 * data.scheduleTailFrames.average[digit], 'average speed retains the full original duration plus silence');
    assert.ok(average.subarray(0, guardBytes).every(value => value === 0));
    assert.ok(average.subarray(guardBytes + original.length).every(value => value === 0), 'only silence follows the complete average recording');
    const normalized = average.subarray(guardBytes, guardBytes + original.length);
    assert.equal(sha256(normalized), data.normalizedSourcePcmSha256[digit]);
    const gain = data.normalization.digits[digit].gain;
    assert.ok(Number.isFinite(gain) && gain > 0);
    for (let offset = 0; offset < original.length; offset += 2) {
      const expected = original.readInt16LE(offset) * gain, actual = normalized.readInt16LE(offset);
      assert.ok(Math.abs(actual - expected) <= .50000001, `${digit}, sample ${offset / 2}: complete original survives with one constant gain and integer quantization`);
    }
  }
});

test('all 63 whole-word recordings have verified hashes, silent guards, unclipped samples and increasing speeds', () => {
  const data = require('../number-speech-data.js');
  assert.deepEqual(rateNames.map(rate => data.rates[rate]), expectedRates);
  assert.equal(data.processing.method, 'whole-word-pitch-preserving');
  assert.equal(data.processing.pitch, 1);
  assert.equal(data.processing.crossfades, false);
  assert.equal(data.processing.sourceTrimming, false);
  assert.equal(data.processing.trimming, 'padding-only-digital-silence');
  assert.equal(data.processing.flushPaddingFrames, Math.round(.25 * data.sampleRate));
  assert.equal(data.processing.flushTrailingPaddingFrames, data.processing.flushPaddingFrames + 1);
  assert.equal(data.processing.durationAllowanceFrames, Math.round(.08 * data.sampleRate));
  assert.deepEqual(data.processing.rateRange, [1, 1.85]);
  const guardBytes = data.quietGuardFrames * 2;
  let verifiedClips = 0;
  for (let digit = 1; digit <= 9; digit++) {
    let previousLength = Infinity;
    for (const rate of rateNames) {
      const pcm = Buffer.from(data.clips[rate][digit], 'base64');
      assert.equal(sha256(pcm), data.clipPcmSha256[rate][digit], `${rate}/${digit}: shipped PCM matches its generation manifest`);
      assert.equal(pcm.length, data.frames[rate][digit] * 2);
      const renderedFrames = data.renderedFrames[rate][digit], scheduleTailFrames = data.scheduleTailFrames[rate][digit];
      assert.ok(Number.isInteger(scheduleTailFrames) && scheduleTailFrames >= 0);
      assert.equal(data.frames[rate][digit], renderedFrames + scheduleTailFrames + 2 * data.quietGuardFrames);
      assert.equal(renderedFrames + scheduleTailFrames, Math.round(data.sourceFrames[digit] / RATES[rate]) + data.processing.durationAllowanceFrames, `${rate}/${digit}: complete speech fits its deterministic slot`);
      assert.ok(Math.abs(renderedFrames - data.sourceFrames[digit] / RATES[rate]) <= data.sampleRate * .08, `${rate}/${digit}: tempo retains the expected whole-word duration`);
      const removed = data.paddingRemovedFrames[rate][digit];
      assert.ok(Number.isInteger(removed.leading) && removed.leading >= 0);
      assert.ok(Number.isInteger(removed.trailing) && removed.trailing >= 0);
      assert.equal(data.fullTransformFrames[rate][digit], renderedFrames + removed.leading + removed.trailing);
      const expectedTransformFrames = rate === 'average' ? data.sourceFrames[digit] : (data.sourceFrames[digit] + data.processing.flushPaddingFrames + data.processing.flushTrailingPaddingFrames) / RATES[rate];
      assert.ok(Math.abs(data.fullTransformFrames[rate][digit] - expectedTransformFrames) <= 1, `${rate}/${digit}: the tempo filter flushed its complete output`);
      assert.ok(pcm.length < previousLength, `${rate}/${digit}: a faster option has a strictly shorter recording`);
      previousLength = pcm.length;
      assert.ok(pcm.subarray(0, guardBytes).every(value => value === 0), `${rate}/${digit}: silence protects the complete onset`);
      assert.ok(pcm.subarray(guardBytes + renderedFrames * 2).every(value => value === 0), `${rate}/${digit}: all added timing padding is silence after the complete ending`);
      let peak = 0, energy = 0;
      for (let offset = guardBytes; offset < pcm.length - guardBytes; offset += 2) {
        const sample = pcm.readInt16LE(offset);
        peak = Math.max(peak, Math.abs(sample));
        energy += sample * sample;
      }
      assert.ok(peak < 32767, `${rate}/${digit}: PCM does not reach the clipping limit`);
      assert.ok(Math.sqrt(energy / data.renderedFrames[rate][digit]) / 32768 > .01, `${rate}/${digit}: the processed recording has audible energy`);
      verifiedClips++;
    }
  }
  assert.equal(verifiedClips, 63);
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
