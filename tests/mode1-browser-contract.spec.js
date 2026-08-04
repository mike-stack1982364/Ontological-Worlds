'use strict';

const { test, expect } = require('@playwright/test');

async function load(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  return { pageErrors, consoleErrors };
}

async function setValue(page, selector, value) {
  await page.locator(selector).evaluate((element, nextValue) => {
    element.value = String(nextValue);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function configureModeOne(page, { n = 6, resolution = 4 } = {}) {
  const errors = await load(page);
  await page.selectOption('#logic-mode', '0');
  await setValue(page, '#n-slider', n);
  await page.selectOption('#direction-resolution', String(resolution));
  await setValue(page, '#session-slider', 120);
  await setValue(page, '#prob-slider', 56);
  await setValue(page, '#interference-slider', 60);
  return errors;
}

async function startAndRead(page) {
  await expect(page.locator('#start-btn')).toBeEnabled();
  const trace = await page.evaluate(async () => {
    const app = window.__ontologicalWorlds;
    const events = [];
    const next = app.nextTrial;
    const make = app.makeTrial;
    app.makeTrial = function (...args) {
      events.push({ event: 'make-enter', time: performance.now() });
      try {
        const result = make.apply(this, args);
        events.push({ event: 'make-exit', time: performance.now(), result: Boolean(result) });
        return result;
      } catch (error) {
        events.push({ event: 'make-throw', time: performance.now(), error: error.message });
        throw error;
      }
    };
    app.nextTrial = function (...args) {
      events.push({ event: 'next-enter', time: performance.now(), running: this.running, paused: this.paused, token: args[0], sessionToken: this.sessionToken });
      try {
        const result = next.apply(this, args);
        events.push({ event: 'next-exit', time: performance.now(), result: Boolean(result), current: Boolean(this.current), awaiting: this.awaiting });
        return result;
      } catch (error) {
        events.push({ event: 'next-throw', time: performance.now(), error: error.message });
        throw error;
      }
    };
    const result = await app.start();
    events.push({ event: 'start-resolved', time: performance.now(), result, current: Boolean(app.current), awaiting: app.awaiting });
    return events;
  });
  const state = await page.evaluate(() => {
    const app = window.__ontologicalWorlds;
    return {
      running: app.running,
      paused: app.paused,
      awaiting: app.awaiting,
      current: Boolean(app.current),
      trialsLength: app.trials.length,
      directionResolution: app.directionResolution,
      premise: document.getElementById('premise-display').textContent,
      timeouts: app.score.timeouts
    };
  });
  return { trace, state };
}

for (const resolution of [4, 8, 16]) {
  test(`${resolution}-direction first premise renders after countdown`, async ({ page }) => {
    const errors = await configureModeOne(page, { n: 6, resolution });
    const { trace, state } = await startAndRead(page);
    expect(trace.map(item => item.event)).toEqual(['next-enter', 'make-enter', 'make-exit', 'next-exit', 'start-resolved']);
    expect(state).toMatchObject({ running: true, paused: false, awaiting: true, current: true, trialsLength: 1, directionResolution: resolution, timeouts: 0 });
    expect(state.premise).not.toBe('SYSTEM_READY');
    expect(state.premise).not.toContain('START_FAILED');
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });
}

for (const n of [1,2,3,4,5,6,7,8]) {
  test(`N-back ${n} produces a first warm-up premise`, async ({ page }) => {
    await configureModeOne(page, { n, resolution: 4 });
    const { state } = await startAndRead(page);
    expect(state).toMatchObject({ running: true, awaiting: true, current: true, trialsLength: 1 });
    const trial = await page.evaluate(() => window.__ontologicalWorlds.current);
    expect(trial.nBackWarmup).toBe(true);
    expect(trial.conflictResponseVector).toHaveLength(5);
  });
}

test('first premise remains indefinitely without timeout advancement', async ({ page }) => {
  await configureModeOne(page, { n: 6, resolution: 4 });
  const { state: before } = await startAndRead(page);
  await page.waitForTimeout(30000);
  const after = await page.evaluate(() => ({
    premise: document.getElementById('premise-display').textContent,
    trialsLength: window.__ontologicalWorlds.trials.length,
    awaiting: window.__ontologicalWorlds.awaiting,
    timeouts: window.__ontologicalWorlds.score.timeouts
  }));
  expect(after).toEqual({ premise: before.premise, trialsLength: 1, awaiting: true, timeouts: 0 });
});
