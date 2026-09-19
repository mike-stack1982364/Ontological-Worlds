'use strict';

// Real Web Audio verification, including rendered PCM rather than speech event
// mocks. Run with CHROMIUM_EXECUTABLE_PATH if Chromium is installed externally.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

async function main() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const file = path.resolve(root, '.' + url.pathname);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      response.writeHead(error ? 404 : 200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : 'text/html' });
      response.end(error ? 'Not found' : data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const base = `http://127.0.0.1:${server.address().port}`;
    const rendering = await browser.newPage();
    await rendering.goto(base + '/extra-training.html');
    const rendered = await rendering.evaluate(async () => {
      const api = window.__numberSpeechAudio, data = window.__numberSpeechData;
      if (!api || !data) throw new Error('Number speech module or shipped recordings are missing');
      const rates = Object.keys(api.RATES), spacingNames = Object.keys(api.GAPS);
      let sequences = 0, sampleCount = 0, maximumError = 0;
      for (const rate of rates) for (const spacing of spacingNames) for (const count of [1, 2, 3]) {
        const settings = { speak: true, volume: .8, rate, spacing };
        const values = Array.from({ length: 9 }, (_, first) => Array.from({ length: count }, (_, i) => (first + i) % 9 + 1));
        const expected = values.map(digits => api.buildSequence(digits, settings, data));
        const frameCount = Math.max(...expected.map(sequence => sequence.samples.length));
        const context = new OfflineAudioContext(9, frameCount, data.sampleRate);
        const merger = context.createChannelMerger(9);
        merger.connect(context.destination);
        const players = [], promises = [], sources = [];
        for (let channel = 0; channel < 9; channel++) {
          const destination = context.createGain(); destination.connect(merger, 0, channel);
          const facade = {
            state: 'running', sampleRate: data.sampleRate, baseLatency: 0, outputLatency: 0, destination,
            createBuffer: (...args) => context.createBuffer(...args),
            createGain: () => context.createGain(),
            createBufferSource() {
              const node = context.createBufferSource();
              const originalStart = node.start.bind(node);
              node.start = (...args) => {
                if (!node.loop) sources.push({ channel, buffer: node.buffer, args, rate: node.playbackRate.value });
                return originalStart(...args);
              };
              return node;
            },
            resume: () => Promise.resolve(), close: () => Promise.resolve()
          };
          const environment = { AudioContext: function () { return facade; }, setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window) };
          const player = api.createPlayer(environment, data);
          players.push(player); promises.push(player.play(values[channel], settings));
        }
        // Let the actual player's preparation finish before rendering its graph.
        for (let i = 0; i < 12; i++) await Promise.resolve();
        if (sources.length !== 9) throw new Error(`Playback did not create exactly one compound source per sequence: ${sources.length}`);
        const audio = await context.startRendering();
        const completed = await Promise.all(promises);
        if (!completed.every(Boolean)) throw new Error('Complete audio rendering did not resolve successfully');
        for (let channel = 0; channel < 9; channel++) {
          const source = sources.find(item => item.channel === channel);
          if (source.args.length || source.rate !== 1) throw new Error('Playback offset, duration, or rate can clip or distort a digit');
          const output = audio.getChannelData(channel), expectedSamples = expected[channel].samples;
          for (let frame = 0; frame < frameCount; frame++) {
            const error = Math.abs(output[frame] - (expectedSamples[frame] || 0) * settings.volume);
            maximumError = Math.max(maximumError, error);
            if (error > 1e-7) throw new Error(`Rendered sample mismatch at ${rate}/${spacing}/${count}/${channel + 1}/${frame}: ${error}`);
            sampleCount++;
          }
          if (expected[channel].segments[0].start / data.sampleRate < .35) throw new Error('Protective onset padding was shortened');
          sequences++;
        }
        players.forEach(player => player.dispose());
      }
      return { sequences, sampleCount, maximumError };
    });
    assert.equal(rendered.sequences, 1323);
    console.log(JSON.stringify({ renderedAudio: rendered }));
    await rendering.close();

    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.__audioRuns = [];
        window.__nativeSpeechCalls = [];
        for (const name of ['speak', 'resume', 'cancel']) {
          if (window.speechSynthesis) window.speechSynthesis[name] = () => { window.__nativeSpeechCalls.push(name); throw new Error('Native speech was called'); };
        }
        let exposed;
        Object.defineProperty(window, '__numberSpeechAudio', { configurable: true, get: () => exposed, set(api) {
          exposed = { ...api, createPlayer(...args) {
            const player = api.createPlayer(...args);
            return { ...player, play(values, settings) {
              const record = { values: [...values], settings: { ...settings }, started: performance.now(), completed: null };
              window.__audioRuns.push(record);
              return player.play(values, settings).then(ok => { record.completed = ok; record.finished = performance.now(); return ok; });
            } };
          } };
        } });
      });
      await page.goto(base + '/extra-training.html');
      await page.locator('#n').selectOption('1');
      await page.locator('#count').selectOption('2');
      await page.locator('#response').selectOption('1');
      await page.locator('#audio-only').check();
      await page.locator('#test').click();
      await page.waitForFunction(() => window.__audioRuns.length === 1);
      await page.locator('#start').click();
      await page.waitForFunction(() => window.__audioRuns.length === 2);
      assert.equal(await page.evaluate(() => window.__audioRuns[0].completed), false, 'Start cancels only the old speech test');
      const firstSequence = await page.locator('#stimulus').innerText();
      await page.locator('#pause').click();
      assert.equal(await page.locator('#pause').innerText(), 'RESUME');
      assert.equal(await page.locator('#match').isDisabled(), true);
      await page.locator('#pause').click();
      await page.waitForFunction(() => window.__audioRuns.length === 3);
      assert.deepEqual(await page.evaluate(() => window.__audioRuns[2].values), firstSequence.split(',').map(Number));
      assert.equal(await page.locator('#match').isDisabled(), true);
      assert.equal(await page.locator('#timerbar').evaluate(element => element.style.width), '0%');
      await page.waitForFunction(() => window.__audioRuns[2].completed === true);
      assert.equal(await page.locator('#trials').innerText(), '1');
      await page.waitForFunction(() => !document.getElementById('match').disabled);
      const current = (await page.locator('#stimulus').innerText()).split(',').map(Number);
      const target = firstSequence.split(',').map(Number);
      await page.locator(current.some((digit, i) => digit === target[i]) ? '#match' : '#no-match').click();
      assert.equal(await page.locator('#feedback').innerText(), 'CORRECT');
      assert.equal(await page.locator('#accuracy').innerText(), '100%');
      await page.locator('#stop').click();
      await page.locator('#start').click();
      const restarted = await page.locator('#stimulus').innerText();
      await page.locator('#stop').click();
      assert.equal(await page.locator('#stimulus').innerText(), 'READY');
      assert.notEqual(restarted, 'READY');

      // The visual fallback remains usable with audio-only selected and speech
      // disabled; switching settings after Stop never reuses the old recording.
      await page.locator('#speak').uncheck();
      await page.locator('#count').selectOption('1');
      await page.locator('#start').click();
      assert.equal(await page.locator('#stimulus').evaluate(element => element.classList.contains('hidden')), false);
      assert.match(await page.locator('#stimulus').innerText(), /^[1-9]$/);
      await page.locator('#stop').click();
      assert.deepEqual(await page.evaluate(() => window.__nativeSpeechCalls), []);
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}px: prerecorded speech, Test→Start, pause replay, response timing, scoring, restart, audio fallback`);
      await page.close();
    }
  } finally {
    await browser?.close();
    server.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
