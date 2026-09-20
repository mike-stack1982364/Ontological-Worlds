'use strict';

// Optional real-browser regression. Run with Playwright's Chromium installed,
// or set CHROMIUM_EXECUTABLE_PATH to an existing Chromium executable.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

async function main() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      response.writeHead(error ? 404 : 200, {
        'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'
      });
      response.end(error ? 'Not found' : data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await page.waitForFunction(() => window.__ontologicalWorlds?.__modeTwoFinalRuntimeV22);
      await page.locator('#premise-vol').evaluate(element => {
        element.value = '0';
        element.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.locator('#direction-resolution').selectOption('8');
      await page.locator('#start-btn').click();
      await page.waitForFunction(() => window.__ontologicalWorlds.awaiting);
      const expected = await page.evaluate(() => window.__ontologicalWorlds.current.conflictResponseVector);
      for (let decision = 0; decision < 5; decision++) {
        await page.locator(`[data-decision="${decision}"] [data-value="${Number(expected[decision])}"]`).click();
      }
      assert.equal(await page.locator('#feedback').innerText(), 'ALL FIVE CORRECT');
      assert.equal(await page.evaluate(() => window.__ontologicalWorlds.score.scored), 1);
      await page.locator('#pause-btn').click();
      assert.equal(await page.locator('#paused-overlay').isVisible(), true);
      await page.locator('#paused-overlay').click();
      await page.locator('#stop-btn').click();
      await page.locator('#history-btn').click();
      assert.match(await page.locator('#history-list').innerText(), /1 scored trials/);
      await page.locator('#dismiss-history').click();

      await page.locator('#logic-mode').selectOption('1');
      await page.locator('#direction-resolution').selectOption('16');
      await page.locator('#start-btn').click();
      await page.locator('#mode-two-warmup-continue').waitFor({ state: 'visible' });
      await page.locator('#mode-two-warmup-continue').click();
      await page.waitForFunction(() => window.__ontologicalWorlds.awaiting);
      const match = await page.evaluate(() => window.__ontologicalWorlds.current.nBackMatch);
      assert.equal(await page.locator('#match-btn').isVisible(), true);
      await page.locator(match ? '#match-btn' : '#no-match-btn').click();
      assert.equal(await page.evaluate(() => window.__ontologicalWorlds.score.scored), 1);
      assert.equal(await page.evaluate(() => window.__ontologicalWorlds.current.correct), true);
      await page.locator('#stop-btn').click();

      await page.locator('#extra-training-btn').click();
      await page.waitForURL('**/extra-training.html');
      await page.locator('#speak').uncheck();
      await page.locator('#audio-only').check();
      await page.locator('#n').selectOption('1');
      await page.locator('#response').selectOption('20');
      await page.locator('#start').click();
      const target = (await page.locator('#stimulus').innerText()).split(',').map(Number);
      assert.equal(await page.locator('#stimulus').evaluate(element => element.classList.contains('hidden')), false,
        'muting speech must preserve visible number stimuli even in audio-only mode');
      await page.waitForFunction(() => !document.getElementById('match').disabled);
      const current = (await page.locator('#stimulus').innerText()).split(',').map(Number);
      await page.locator('#pause').click();
      assert.equal(await page.locator('#match').isDisabled(), true);
      assert.equal(await page.locator('#no-match').isDisabled(), true);
      await page.keyboard.press('f');
      await page.locator('#pause').click();
      assert.equal(await page.locator('#stimulus').innerText(), current.join(', '));
      const numberMatch = current.some((value, index) => value === target[index]);
      await page.locator(numberMatch ? '#match' : '#no-match').click();
      assert.equal(await page.locator('#feedback').innerText(), 'CORRECT');
      assert.equal(await page.locator('#accuracy').innerText(), '100%');
      await page.locator('#stop').click();
      assert.equal(await page.locator('#n').isEnabled(), true);
      assert.equal(await page.locator('#count').isEnabled(), true);
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}px: matrix, pause, history, Mode 2, and number N-back`);
      await page.close();
    }
  } finally {
    await browser?.close();
    server.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
