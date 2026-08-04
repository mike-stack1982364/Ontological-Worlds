'use strict';

const { test, expect } = require('@playwright/test');

async function configureModeOne(page, { n = 6, resolution = 4 } = {}) {
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
  await page.locator('#session-slider').evaluate(element => {
    element.value = '120';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#prob-slider').evaluate(element => {
    element.value = '56';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#interference-slider').evaluate(element => {
    element.value = '60';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function startAndWaitForFirstTrial(page) {
  await expect(page.locator('#start-btn')).toBeEnabled();
  await page.click('#start-btn');
  await expect(page.locator('#countdown-box')).toContainText('3');
  await expect(page.locator('#countdown-box')).toContainText('2');
  await expect(page.locator('#countdown-box')).toContainText('1');
  await expect(page.locator('#premise-display')).not.toHaveText('SYSTEM_READY');
  await expect(page.locator('#premise-display')).not.toContainText('START_FAILED');
  const state = await page.evaluate(() => {
    const app = window.__ontologicalWorlds;
    return {
      running: app.running,
      paused: app.paused,
      awaiting: app.awaiting,
      current: Boolean(app.current),
      trialsLength: app.trials.length,
      resolution: app.directionResolution,
      premise: document.getElementById('premise-display').textContent
    };
  });
  expect(state).toMatchObject({ running: true, paused: false, awaiting: true, current: true, trialsLength: 1 });
  return state;
}

async function answerDecision(page, index, value) {
  await page.locator(`.conflict-row[data-decision="${index}"] .conflict-choice[data-value="${value ? 1 : 0}"]`).click();
}

test('base Start contract awaits countdown and first dynamic nextTrial dispatch', async ({ page }) => {
  await configureModeOne(page);
  const trace = await page.evaluate(async () => {
    const app = window.__ontologicalWorlds;
    const events = [];
    const originalNext = app.nextTrial;
    app.nextTrial = function (...args) {
      events.push({ event: 'next-enter', time: performance.now() });
      const result = originalNext.apply(this, args);
      events.push({ event: 'next-exit', time: performance.now(), current: Boolean(this.current), awaiting: this.awaiting });
      return result;
    };
    const result = await app.start();
    events.push({ event: 'start-resolved', time: performance.now(), result, current: Boolean(app.current), awaiting: app.awaiting });
    return events;
  });
  expect(trace.map(item => item.event)).toEqual(['next-enter', 'next-exit', 'start-resolved']);
  expect(trace[1]).toMatchObject({ current: true, awaiting: true });
  expect(trace[2]).toMatchObject({ current: true, awaiting: true });
});

test('exact N6 / 4-direction configuration renders first premise with no false failure', async ({ page }) => {
  await configureModeOne(page, { n: 6, resolution: 4 });
  const state = await startAndWaitForFirstTrial(page);
  expect(state.resolution).toBe(4);
  expect(state.premise).toMatch(/\b(north|east|south|west)\b/i);
  expect(state.premise).not.toMatch(/northeast|northwest|southeast|southwest|north-northeast|east-northeast|east-southeast|south-southeast|south-southwest|west-southwest|west-northwest|north-northwest/i);
});

for (const resolution of [4, 8, 16]) {
  test(`${resolution}-direction sessions render first trial and preserve selected resolution`, async ({ page }) => {
    await configureModeOne(page, { n: 6, resolution });
    const state = await startAndWaitForFirstTrial(page);
    expect(state.resolution).toBe(resolution);
  });
}

for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
  test(`N-back ${n} renders a valid first warm-up trial`, async ({ page }) => {
    await configureModeOne(page, { n, resolution: 4 });
    await startAndWaitForFirstTrial(page);
    const trial = await page.evaluate(() => window.__ontologicalWorlds.current);
    expect(trial.nBackWarmup).toBe(true);
    expect(trial.conflictResponseVector).toHaveLength(5);
    expect(trial.conflictResponseVector.every(value => typeof value === 'boolean')).toBe(true);
  });
}

test('unanswered trial remains visible without automatic advancement', async ({ page }) => {
  await configureModeOne(page);
  const initial = await startAndWaitForFirstTrial(page);
  await page.waitForTimeout(30000);
  const later = await page.evaluate(() => ({
    premise: document.getElementById('premise-display').textContent,
    trialsLength: window.__ontologicalWorlds.trials.length,
    timeouts: window.__ontologicalWorlds.score.timeouts,
    awaiting: window.__ontologicalWorlds.awaiting
  }));
  expect(later).toMatchObject({ premise: initial.premise, trialsLength: 1, timeouts: 0, awaiting: true });
});

test('first four responses give immediate feedback and do not advance', async ({ page }) => {
  await configureModeOne(page);
  await startAndWaitForFirstTrial(page);
  const initialPremise = await page.locator('#premise-display').textContent();
  for (let index = 0; index < 4; index += 1) {
    await answerDecision(page, index, true);
    await expect(page.locator(`.conflict-row[data-decision="${index}"] .conflict-feedback-icon`)).toHaveCount(1);
    const state = await page.evaluate(() => ({ trialsLength: window.__ontologicalWorlds.trials.length, awaiting: window.__ontologicalWorlds.awaiting }));
    expect(state).toEqual({ trialsLength: 1, awaiting: true });
    await expect(page.locator('#premise-display')).toHaveText(initialPremise);
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

test('pause and resume preserve unanswered current trial', async ({ page }) => {
  await configureModeOne(page);
  const initial = await startAndWaitForFirstTrial(page);
  await page.click('#pause-btn');
  await expect(page.locator('#paused-overlay')).toHaveClass(/show/);
  await page.click('#pause-btn');
  const state = await page.evaluate(() => ({
    premise: document.getElementById('premise-display').textContent,
    trialsLength: window.__ontologicalWorlds.trials.length,
    current: Boolean(window.__ontologicalWorlds.current),
    awaiting: window.__ontologicalWorlds.awaiting
  }));
  expect(state).toEqual({ premise: initial.premise, trialsLength: 1, current: true, awaiting: true });
});

test('Stop cancels delayed post-submission advancement', async ({ page }) => {
  await configureModeOne(page);
  await startAndWaitForFirstTrial(page);
  for (let index = 0; index < 5; index += 1) await answerDecision(page, index, true);
  await page.click('#stop-btn');
  await page.waitForTimeout(2200);
  const state = await page.evaluate(() => ({ running: window.__ontologicalWorlds.running, trialsLength: window.__ontologicalWorlds.trials.length }));
  expect(state).toEqual({ running: false, trialsLength: 1 });
});

test('Mode 2 remains startable without compass selection', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.selectOption('#logic-mode', '1');
  await expect(page.locator('#direction-resolution-group')).toBeHidden();
  await expect(page.locator('#start-btn')).toBeEnabled();
  await page.click('#start-btn');
  await expect(page.locator('#premise-display')).not.toHaveText('SYSTEM_READY');
  await expect(page.locator('#premise-display')).not.toContainText('START_FAILED');
});
