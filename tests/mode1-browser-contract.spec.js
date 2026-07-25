'use strict';

const { test, expect } = require('@playwright/test');

async function configureModeOne(page, { n = 6, resolution = 4 } = {}) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.selectOption('#logic-mode', '0');
  await page.locator('#n-slider').evaluate((element, value) => {
    element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, n);
  await page.selectOption('#direction-resolution', String(resolution));
  for (const [selector, value] of [['#session-slider', '120'], ['#prob-slider', '56'], ['#interference-slider', '60']]) {
    await page.locator(selector).evaluate((element, nextValue) => {
      element.value = nextValue;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }
  return { pageErrors, consoleErrors };
}

async function startAndWaitForFirstTrial(page) {
  await expect(page.locator('#start-btn')).toBeEnabled();
  const trace = await page.evaluate(async () => {
    const app = window.__ontologicalWorlds;
    const events = [];
    const originalNext = app.nextTrial;
    const originalMake = app.makeTrial;
    app.makeTrial = function (...args) {
      events.push({ event: 'make-enter', time: performance.now() });
      try {
        const trial = originalMake.apply(this, args);
        events.push({ event: 'make-exit', time: performance.now(), trial: Boolean(trial) });
        return trial;
      } catch (error) {
        events.push({ event: 'make-throw', time: performance.now(), error: error.message });
        throw error;
      }
    };
    app.nextTrial = function (...args) {
      events.push({ event: 'next-enter', time: performance.now(), running: this.running, paused: this.paused, token: args[0], sessionToken: this.sessionToken });
      try {
        const trial = originalNext.apply(this, args);
        events.push({ event: 'next-exit', time: performance.now(), trial: Boolean(trial), current: Boolean(this.current), awaiting: this.awaiting });
        return trial;
      } catch (error) {
        events.push({ event: 'next-throw', time: performance.now(), error: error.message });
        throw error;
      }
    };
    const result = await app.start();
    events.push({ event: 'start-resolved', time: performance.now(), result, current: Boolean(app.current), awaiting: app.awaiting });
    return events;
  });
  await expect(page.locator('#countdown-box')).toHaveText('');
  await expect(page.locator('#premise-display')).not.toHaveText('SYSTEM_READY');
  await expect(page.locator('#premise-display')).not.toContainText('START_FAILED');
  await expect(page.locator('#premise-display')).not.toContainText('TRIAL_FAILED');
  const state = await page.evaluate(() => {
    const app = window.__ontologicalWorlds;
    return {
      running: app.running,
      paused: app.paused,
      awaiting: app.awaiting,
      current: Boolean(app.current),
      trialsLength: app.trials.length,
      resolution: app.directionResolution,
      premise: document.getElementById('premise-display').textContent,
      installer: app.__mandatoryCompassResolutionInstalled
    };
  });
  expect(trace.map(item => item.event)).toContain('next-enter');
  expect(trace.map(item => item.event)).toContain('make-enter');
  expect(state).toMatchObject({ running: true, paused: false, awaiting: true, current: true, trialsLength: 1, installer: true });
  return { state, trace };
}

async function answerDecision(page, index, value) {
  await page.locator(`.conflict-row[data-decision="${index}"] .conflict-choice[data-value="${value ? 1 : 0}"]`).click();
}

test('exact N6 / 4-direction configuration renders first premise after countdown', async ({ page }) => {
  const errors = await configureModeOne(page, { n: 6, resolution: 4 });
  const { state } = await startAndWaitForFirstTrial(page);
  expect(state.resolution).toBe(4);
  expect(state.premise).toMatch(/\b(north|east|south|west)\b/i);
  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

for (const resolution of [4, 8, 16]) {
  test(`${resolution}-direction session renders a first premise`, async ({ page }) => {
    const errors = await configureModeOne(page, { n: 6, resolution });
    const { state } = await startAndWaitForFirstTrial(page);
    expect(state.resolution).toBe(resolution);
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });
}

for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
  test(`N-back ${n} renders a scored warm-up`, async ({ page }) => {
    await configureModeOne(page, { n, resolution: 4 });
    await startAndWaitForFirstTrial(page);
    const trial = await page.evaluate(() => window.__ontologicalWorlds.current);
    expect(trial.nBackWarmup).toBe(true);
    expect(trial.conflictResponseVector).toHaveLength(5);
    expect(trial.conflictResponseVector.every(value => typeof value === 'boolean')).toBe(true);
  });
}

test('unanswered trial persists without timeout advancement', async ({ page }) => {
  await configureModeOne(page);
  const { state: initial } = await startAndWaitForFirstTrial(page);
  await page.waitForTimeout(30000);
  const later = await page.evaluate(() => ({
    premise: document.getElementById('premise-display').textContent,
    trialsLength: window.__ontologicalWorlds.trials.length,
    timeouts: window.__ontologicalWorlds.score.timeouts,
    awaiting: window.__ontologicalWorlds.awaiting
  }));
  expect(later).toEqual({ premise: initial.premise, trialsLength: 1, timeouts: 0, awaiting: true });
});

test('responses one through four give feedback without advancing', async ({ page }) => {
  await configureModeOne(page);
  const { state: initial } = await startAndWaitForFirstTrial(page);
  for (let index = 0; index < 4; index += 1) {
    await answerDecision(page, index, true);
    await expect(page.locator(`.conflict-row[data-decision="${index}"] .conflict-feedback-icon`)).toHaveCount(1);
    const state = await page.evaluate(() => ({ trialsLength: window.__ontologicalWorlds.trials.length, awaiting: window.__ontologicalWorlds.awaiting }));
    expect(state).toEqual({ trialsLength: 1, awaiting: true });
    await expect(page.locator('#premise-display')).toHaveText(initial.premise);
  }
});

test('fifth response advances exactly once', async ({ page }) => {
  await configureModeOne(page);
  await startAndWaitForFirstTrial(page);
  for (let index = 0; index < 5; index += 1) await answerDecision(page, index, true);
  await expect.poll(async () => page.evaluate(() => window.__ontologicalWorlds.trials.length)).toBe(2);
  await page.waitForTimeout(2200);
  expect(await page.evaluate(() => window.__ontologicalWorlds.trials.length)).toBe(2);
});

test('pause and resume preserve unanswered trial', async ({ page }) => {
  await configureModeOne(page);
  const { state: initial } = await startAndWaitForFirstTrial(page);
  await page.click('#pause-btn');
  await page.click('#pause-btn');
  const state = await page.evaluate(() => ({ premise: document.getElementById('premise-display').textContent, trialsLength: window.__ontologicalWorlds.trials.length, awaiting: window.__ontologicalWorlds.awaiting }));
  expect(state).toEqual({ premise: initial.premise, trialsLength: 1, awaiting: true });
});

test('Stop cancels delayed advancement', async ({ page }) => {
  await configureModeOne(page);
  await startAndWaitForFirstTrial(page);
  for (let index = 0; index < 5; index += 1) await answerDecision(page, index, true);
  await page.click('#stop-btn');
  await page.waitForTimeout(2200);
  expect(await page.evaluate(() => ({ running: window.__ontologicalWorlds.running, trialsLength: window.__ontologicalWorlds.trials.length }))).toEqual({ running: false, trialsLength: 1 });
});

test('Mode 2 starts without compass selection', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.selectOption('#logic-mode', '1');
  await expect(page.locator('#direction-resolution-group')).toBeHidden();
  await expect(page.locator('#start-btn')).toBeEnabled();
  await page.click('#start-btn');
  await expect(page.locator('#premise-display')).not.toHaveText('SYSTEM_READY');
  await expect(page.locator('#premise-display')).not.toContainText('START_FAILED');
  await expect(page.locator('#premise-display')).not.toContainText('TRIAL_FAILED');
});
