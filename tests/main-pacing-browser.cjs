'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const server = http.createServer((req, res) => {
    const name = path.resolve(root, '.' + (new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
    if (!name.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.readFile(name, (error, data) => { res.writeHead(error ? 404 : 200, { 'Content-Type': name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(error ? '' : data); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    for (const width of [1280, 390]) {
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--no-zygote', '--single-process', '--disable-dev-shm-usage'] });
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForFunction(() => window.__ontologicalWorlds?.__modeTwoFinalRuntimeV22);
      await page.clock.install();
      await page.evaluate(() => {
        const app = window.__ontologicalWorlds;
        app.speak = function(text) { this._speakInProgress = true; return new Promise(resolve => setTimeout(() => { this._speakInProgress = false; resolve(true); }, 200)); };
      });
      for (const seconds of [120, 300]) for (const mode of [0, 1]) for (const audioOnly of [false, true]) {
        await page.evaluate(({ mode, audioOnly, seconds }) => {
          const d = document; const change = (id, value) => { d.getElementById(id).value = value; d.getElementById(id).dispatchEvent(new Event('change', { bubbles: true })); };
          change('logic-mode', mode); change('direction-resolution', '4'); change('session-slider', '360');
          d.getElementById('listening-mode').checked = true; d.getElementById('audio-only').checked = audioOnly;
          change('trial-interval', String(seconds)); window.__ontologicalWorlds.start();
        }, { mode, audioOnly, seconds });
        await page.clock.runFor(2200);
        assert.equal(await page.evaluate(() => window.__ontologicalWorlds.trials.length), 1);
        const remaining = await page.evaluate(() => window.__ontologicalWorlds.getTrialTimingState().remainingMs);
        assert.ok(remaining > seconds * 1000 - 1000 && remaining <= seconds * 1000);
        await page.clock.runFor(remaining - 1);
        assert.equal(await page.evaluate(() => window.__ontologicalWorlds.trials.length), 1, `no early trial at ${seconds} seconds`);
        await page.clock.runFor(1);
        assert.equal(await page.evaluate(() => window.__ontologicalWorlds.trials.length), 2);
        assert.equal(await page.evaluate(() => window.__ontologicalWorlds.score.scored), 0);
        await page.evaluate(() => window.__ontologicalWorlds.stop(true));
      }
      for (const seconds of [120, 300]) {
        await page.evaluate(seconds => {
          const d = document, app = window.__ontologicalWorlds;
          d.getElementById('logic-mode').value = '0'; d.getElementById('logic-mode').dispatchEvent(new Event('change', { bubbles: true }));
          d.getElementById('direction-resolution').value = '4'; d.getElementById('direction-resolution').dispatchEvent(new Event('change', { bubbles: true }));
          d.getElementById('listening-mode').checked = false; d.getElementById('audio-only').checked = false;
          d.getElementById('advance-on-response').checked = false; d.getElementById('response-seconds').value = String(seconds); app.updateLabels(); app.start();
        }, seconds);
        await page.clock.runFor(2300);
        await page.evaluate(() => { const app = window.__ontologicalWorlds; app.submitConflictMatrix(app.current.conflictResponseVector); });
        const remaining = await page.evaluate(() => window.__ontologicalWorlds.getTrialTimingState().remainingMs);
        assert.ok(remaining > seconds * 1000 - 1000 && remaining <= seconds * 1000);
        await page.clock.runFor(remaining - 1);
        assert.equal(await page.evaluate(() => window.__ontologicalWorlds.trials.length), 1, `answered trial retains ${seconds}-second deadline`);
        await page.clock.runFor(1);
        assert.equal(await page.evaluate(() => window.__ontologicalWorlds.trials.length), 2);
        await page.evaluate(() => window.__ontologicalWorlds.stop(true));
      }
      assert.deepEqual(await page.locator('.conflict-choice').allTextContents(), ['A', 'S', 'D', 'F', 'H', 'J', 'K', 'L', 'SPACEBAR', 'N']);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: both modes at 120/300 seconds, visible/audio-only, six-hour sessions, zero listening scores, early-answer fixed deadlines, unchanged keys`);
      await browser.close(); browser = null;
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
