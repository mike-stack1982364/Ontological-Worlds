'use strict';

// Real shipped-page coverage. Set CHROMIUM_EXECUTABLE_PATH when using a local
// browser; all interactions below use the visible controls and actual timers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const screenshotDirectory = process.env.MODE_TWO_SCREENSHOT_DIR || '/tmp/mode2-browser-check';

async function assertLayout(page, label) {
  const result = await page.evaluate(() => {
    const errors = [];
    if (document.documentElement.scrollWidth > innerWidth + 2) errors.push('page horizontal overflow');
    for (const selector of ['.game-area', '#premise-display', '#mode-two-guide', '#mode-two-reflection']) {
      const element = document.querySelector(selector);
      if (!element || !element.getClientRects().length) continue;
      const rect = element.getBoundingClientRect();
      if (rect.left < -2 || rect.right > innerWidth + 2) errors.push(`${selector} outside viewport`);
      if (element.scrollWidth > element.clientWidth + 2) errors.push(`${selector} clips horizontal content`);
      if (selector === '#premise-display' && element.scrollHeight > element.clientHeight + 2) errors.push('stimulus clips vertical content');
      if (selector === '#premise-display') {
        const range = document.createRange();
        range.selectNodeContents(element);
        for (const line of range.getClientRects()) {
          if (line.left < rect.left - 2 || line.right > rect.right + 2 || line.top < rect.top - 2 || line.bottom > rect.bottom + 2) {
            errors.push('stimulus glyphs extend outside their container');
            break;
          }
        }
      }
    }
    const game = document.querySelector('.game-area').getBoundingClientRect();
    const guide = document.getElementById('mode-two-guide').getBoundingClientRect();
    if (guide.top < game.bottom) errors.push('Mode 2 guide overlaps the game');
    const reflection = document.getElementById('mode-two-reflection');
    if (reflection.getClientRects().length) {
      const panelTop = reflection.getBoundingClientRect().top;
      for (const id of ['match-btn', 'no-match-btn']) {
        if (document.getElementById(id).getBoundingClientRect().bottom > panelTop) {
          errors.push(`${id} overlaps the practice panel`);
        }
      }
    }
    return errors;
  });
  assert.deepEqual(result, [], label);
}

async function clickCorrectAnswer(page) {
  await page.waitForFunction(() => window.__ontologicalWorlds.awaiting);
  const expected = await page.evaluate(() => window.__ontologicalWorlds.current.nBackMatch);
  await page.locator(expected ? '#match-btn' : '#no-match-btn').click();
  assert.equal(await page.evaluate(() => window.__ontologicalWorlds.current.correct), true);
}

async function exercisePractice(page) {
  for (let index = 1; index < 6; index += 1) await clickCorrectAnswer(page);
  await page.locator('#mode-two-reflection').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.__ontologicalWorlds.score.scored), 6);
  const before = await page.evaluate(() => {
    const app = window.__ontologicalWorlds;
    const probe = window.__modeTwoOntologyNBackV22.generateProbe(app.current);
    return { count: app.trials.length, shown: app.score.shown, end: app.endsAt,
      pause: app.pauseStartedAt, answers: [probe.inference.expectedRelation, probe.counterfactual.expectedRelation] };
  });
  assert.notEqual(before.pause, null);
  for (const [index, answer] of before.answers.entries()) {
    const select = page.locator(`#mode-two-practice-${index}`);
    assert.ok(await select.locator('option').count() >= 5, 'direction choices rendered');
    await select.selectOption(answer);
  }
  await page.getByRole('button', { name: 'Check practice answers', exact: true }).click();
  assert.match(await page.locator('#mode-two-practice-feedback').innerText(), /1\. Correct/);
  assert.match(await page.locator('#mode-two-practice-feedback').innerText(), /2\. Correct/);
  await page.locator('#mode-two-practice-mapping').fill('A garden relay corresponds to a radio relay.');
  await page.waitForTimeout(300);
  const clock = await page.locator('#session-countdown').innerText();
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('#session-countdown').innerText(), clock, 'practice clock remains paused');
  assert.equal(await page.evaluate(() => window.__ontologicalWorlds.trials.length), before.count);
  assert.equal(await page.evaluate(() => window.__ontologicalWorlds.score.scored), 6);
  await assertLayout(page, 'practice layout');
  await page.locator('#mode-two-reflection').screenshot({ path: path.join(screenshotDirectory, 'facets-practice-390.png') });
  await page.locator('#mode-two-practice-continue').click();
  await page.waitForFunction(() => window.__ontologicalWorlds.awaiting);
  const after = await page.evaluate(() => {
    const app = window.__ontologicalWorlds;
    return { count: app.trials.length, shown: app.score.shown, scored: app.score.scored, end: app.endsAt, pause: app.pauseStartedAt };
  });
  assert.equal(after.count, before.count + 1, 'Continue adds exactly one N-back trial');
  assert.equal(after.shown, before.shown + 1);
  assert.equal(after.scored, 6);
  assert.equal(after.pause, null);
  assert.ok(after.end - before.end >= 1400, 'practice time is excluded from session duration');
  assert.equal(await page.locator('#mode-two-reflection').isVisible(), false);
}

async function main() {
  fs.mkdirSync(screenshotDirectory, { recursive: true });
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
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
      for (const [index, complexity] of ['entities', 'facets', 'worlds'].entries()) {
        if (process.env.MODE_TWO_BROWSER_FILTER
          && !`${viewport.width}/${complexity}`.includes(process.env.MODE_TWO_BROWSER_FILTER)) continue;
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base);
        await page.waitForFunction(() => window.__ontologicalWorlds?.__modeTwoFinalRuntimeV22);
        await page.locator('#premise-vol').evaluate(element => {
          element.value = '0'; element.dispatchEvent(new Event('change', { bubbles: true }));
        });
        assert.equal(await page.locator('#mode-one-guide').isVisible(), true);
        assert.equal(await page.locator('#mode-two-guide').isVisible(), false);
        await page.locator('#logic-mode').selectOption('1');
        await page.locator('#mode-two-complexity').selectOption(complexity);
        await page.locator('#direction-resolution').selectOption(String([4, 8, 16][index]));
        const practice = viewport.width === 390 && complexity === 'facets';
        await page.locator('#mode-two-reflections').setChecked(practice);
        assert.equal(await page.locator('#mode-one-guide').isVisible(), false);
        assert.equal(await page.locator('#mode-two-guide').isVisible(), true);
        await page.locator('#start-btn').click();
        await page.locator('#mode-two-warmup-continue').waitFor({ state: 'visible' });
        await page.locator('#mode-two-warmup-continue').click();
        await page.waitForFunction(() => window.__ontologicalWorlds.awaiting);
        for (const id of ['mode-two-complexity', 'mode-two-reflections', 'direction-resolution', 'logic-mode']) {
          assert.equal(await page.locator(`#${id}`).isDisabled(), true, `${id} locked`);
        }
        const shown = await page.locator('#premise-display').innerText();
        const canonical = await page.evaluate(() => window.__modeTwoOntologyNBackV22.renderOntologicalTrial(window.__ontologicalWorlds.current));
        assert.equal(shown, canonical, 'visible stimulus is exactly the scored canonical rendering');
        assert.equal(await page.evaluate(() => window.__ontologicalWorlds.current.complexity), complexity);
        await assertLayout(page, `${viewport.width}px ${complexity}`);
        await page.locator('#premise-display').screenshot({ path: path.join(screenshotDirectory, `${complexity}-stimulus-${viewport.width}.png`) });
        if (complexity === 'facets') {
          await page.locator('#mode-two-guide').screenshot({ path: path.join(screenshotDirectory, `mode-two-guide-${viewport.width}.png`) });
          await page.locator('.controls').screenshot({ path: path.join(screenshotDirectory, `mode-two-controls-${viewport.width}.png`) });
        }
        if (viewport.width === 1280 && complexity === 'entities') {
          const researchLink = page.locator('#research-hub-link');
          assert.equal(await researchLink.getAttribute('target'), '_blank');
          const beforeResearch = await page.evaluate(() => window.__ontologicalWorlds.trials.length);
          const popupPending = page.waitForEvent('popup');
          await researchLink.click();
          const research = await popupPending;
          assert.equal(await page.evaluate(() => window.__ontologicalWorlds.paused), true,
            'opening research pauses the source training session');
          assert.equal(await page.evaluate(() => window.__ontologicalWorlds.trials.length), beforeResearch);
          await research.close();
          await page.locator('#paused-overlay').click();
          assert.equal(await page.evaluate(() => window.__ontologicalWorlds.paused), false);
        }
        await clickCorrectAnswer(page);
        if (practice) await exercisePractice(page);
        else {
          await page.locator('#pause-btn').click();
          assert.equal(await page.locator('#paused-overlay').isVisible(), true);
          assert.equal(await page.locator('#match-btn').isDisabled(), true);
          await page.locator('#paused-overlay').click();
          assert.equal(await page.locator('#paused-overlay').isVisible(), false);
        }
        await page.locator('#stop-btn').click();
        const summary = await page.evaluate(() => window.__ontologicalWorlds.history[0]);
        assert.equal(summary.modeTwoVersion, 22);
        assert.equal(summary.modeTwoComplexity, complexity);
        assert.equal(summary.completed, practice ? 6 : 1);
        assert.equal(summary.accuracy, 1);
        if (practice) {
          assert.equal(summary.practiceChecks, 2);
          assert.equal(summary.practiceCorrect, 2);
          assert.equal(summary.practiceBreaksCompleted, 1);
        }
        assert.equal(await page.locator('#mode-two-complexity').isEnabled(), true);
        await page.locator('#logic-mode').selectOption('0');
        assert.equal(await page.locator('#mode-one-guide').isVisible(), true);
        assert.equal(await page.locator('#mode-two-guide').isVisible(), false);
        if (viewport.width === 320 && complexity === 'facets') {
          await page.locator('#mode-one-guide').screenshot({ path: path.join(screenshotDirectory, 'mode-one-guide-320.png') });
        }
        assert.deepEqual(errors, []);
        console.log(`PASS ${viewport.width}px ${complexity}: canonical display, layout, guides, binary score, pause/stop and history${practice ? ', six-answer practice' : ''}`);
        await page.close();
      }
    }
  } finally {
    await browser?.close();
    server.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
