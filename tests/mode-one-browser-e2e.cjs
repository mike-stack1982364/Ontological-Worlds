'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const expectedCacheKey = process.env.EXPECTED_CACHE_KEY || '20260727-authoritative-max-logic-3';
const deploymentRetries = Number(process.env.DEPLOYMENT_RETRIES || 1);
const deploymentRetryDelayMs = Number(process.env.DEPLOYMENT_RETRY_DELAY_MS || 15000);

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const browserErrors = [];

  page.on('pageerror', error => browserErrors.push(`pageerror:${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(`console:${message.text()}`);
  });

  await page.addInitScript(() => {
    class SilentUtterance {
      constructor(text = '') { this.text = text; this.volume = 1; this.rate = 1; this.pitch = 1; }
    }
    const speech = {
      paused: false,
      speaking: false,
      getVoices: () => [],
      speak: utterance => queueMicrotask(() => utterance.onend?.()),
      cancel: () => {},
      resume: () => {},
      pause: () => {}
    };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: SilentUtterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: speech });
    class SilentAudioContext {
      constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
      resume() { this.state = 'running'; return Promise.resolve(); }
      createGain() { return { gain: { value: 0, setTargetAtTime() {} }, connect() { return this; }, disconnect() {} }; }
      createOscillator() { return { frequency: { value: 0 }, type: 'sine', connect() { return this; }, start() {}, stop() {}, disconnect() {} }; }
      createChannelMerger() { return { connect() { return this; }, disconnect() {} }; }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: SilentAudioContext });
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: SilentAudioContext });
    try { Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => true }); } catch (_) {}
  });

  let loadedCurrentDeployment = false;
  for (let attempt = 1; attempt <= deploymentRetries; attempt += 1) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    await page.goto(`${baseUrl}${separator}e2e=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const scriptSources = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src') || ''));
    loadedCurrentDeployment = scriptSources.some(source => source.includes(expectedCacheKey));
    if (loadedCurrentDeployment) break;
    if (attempt < deploymentRetries) await sleep(deploymentRetryDelayMs);
  }
  assert.equal(loadedCurrentDeployment, true, `Page did not expose cache key ${expectedCacheKey}`);

  await page.waitForFunction(() => window.__modeOneMaxInterferenceReady === true, null, { timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.__ontologicalWorlds?.__modeOneAuthoritativeMaxInterferenceInstalled), null, { timeout: 15000 });

  const initialState = await page.evaluate(() => {
    const app = window.__ontologicalWorlds;
    const slider = document.getElementById('interference-slider');
    return {
      ready: window.__modeOneMaxInterferenceReady,
      installError: window.__modeOneMaxInterferenceInstallError?.message || null,
      installed: app.__modeOneAuthoritativeMaxInterferenceInstalled,
      runtimeLevel: app.modeOneInterferenceLevel,
      slider: {
        min: slider?.min,
        max: slider?.max,
        value: slider?.value,
        disabled: slider?.disabled,
        ariaValue: slider?.getAttribute('aria-valuenow')
      },
      responseDeadlinePresent: Boolean(document.getElementById('spt-slider')),
      matrixAriaHidden: document.getElementById('conflict-matrix')?.getAttribute('aria-hidden')
    };
  });
  assert.equal(initialState.ready, true);
  assert.equal(initialState.installError, null);
  assert.equal(initialState.installed, true);
  assert.equal(initialState.runtimeLevel, 100);
  assert.deepEqual(initialState.slider, { min: '100', max: '100', value: '100', disabled: true, ariaValue: '100' });
  assert.equal(initialState.responseDeadlinePresent, false);
  assert.equal(initialState.matrixAriaHidden, 'false');

  // Directly exercise the final browser-loaded generator across every supported
  // N-back level and compass resolution. This is separate from the Node audit:
  // it verifies the actual script composition installed by index.html.
  const exhaustiveBrowserResult = await page.evaluate(() => {
    const app = window.__ontologicalWorlds;
    const maximal = window.__modeOneLetterContinuityV1;
    const conflict = window.__modeOneConflictMatrixV20;
    const core = window.__modeOneTriadicEntailmentCore;
    const mode = document.getElementById('logic-mode');
    const n = document.getElementById('n-slider');
    const direction = document.getElementById('direction-resolution');
    const overlap = (first, second) => {
      const set = new Set(second);
      return first.filter(value => set.has(value)).length;
    };
    const failures = [];
    let transitions = 0;

    mode.value = '0';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
    for (const resolution of [4, 8, 16]) {
      direction.value = String(resolution);
      direction.dispatchEvent(new Event('change', { bubbles: true }));
      app.directionResolution = resolution;
      for (let level = 1; level <= 8; level += 1) {
        n.value = String(level);
        n.dispatchEvent(new Event('input', { bubbles: true }));
        app.n = level;
        app.trials = [];
        app.current = null;
        app.rng.s = (0x7e000000 + resolution * 100 + level) >>> 0;
        for (let index = 0; index < level + 40; index += 1) {
          const previous = app.trials[app.trials.length - 1] || null;
          const target = app.trials[app.trials.length - level] || null;
          try {
            const trial = app.makeTrial();
            if (!trial) throw new Error('empty-trial');
            if (trial.interferenceLevel !== 100 || trial.maxLogicalInterference !== true) throw new Error('not-fixed-100');
            if (new Set(maximal.trialLetters(trial)).size !== 3) throw new Error('letter-cardinality');
            if (core.evaluateTrial(trial).isEntailed !== trial.conclusionEntailed) throw new Error('entailment-metadata');
            if (target) {
              const analysis = app.assertModeOneMaximumInterference(target, previous, trial);
              const evaluation = conflict.evaluateConflictMatrix(target, trial, { roleSensitive: true });
              if (!analysis.valid || analysis.targetOverlapCount !== 2 || analysis.previousOverlapCount < 1 || analysis.introducedRelativeToTarget !== 1) throw new Error('transition-invariant');
              if (evaluation.matchedCount !== (evaluation.wholeTrialMatch ? 3 : 2)) throw new Error('logical-lure-strength');
              if (level === 1 && overlap(maximal.trialLetters(previous), maximal.trialLetters(trial)) !== 2) throw new Error('n1-disjoint-regression');
              transitions += 1;
            } else if (previous) {
              if (overlap(maximal.trialLetters(previous), maximal.trialLetters(trial)) !== 2) throw new Error('warmup-continuity');
            }
            app.trials.push(trial);
          } catch (error) {
            failures.push(`${resolution}-${level}-${index}:${error.message}`);
          }
        }
      }
    }
    return { transitions, failures };
  });
  assert.deepEqual(exhaustiveBrowserResult.failures, []);
  assert(exhaustiveBrowserResult.transitions > 800);

  // True UI lifecycle at N=1: start the application, read the displayed trial,
  // answer all five matrix decisions through real buttons, and allow the normal
  // submission/advance pathway to create each next trial.
  await page.selectOption('#logic-mode', '0');
  await page.selectOption('#direction-resolution', '4');
  await page.locator('#n-slider').evaluate(element => {
    element.value = '1';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#session-slider').evaluate(element => {
    element.value = '1';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.evaluate(() => { window.__ontologicalWorlds.rng.s = 0x71c0ffee; });
  await page.click('#start-btn');
  await page.waitForFunction(() => window.__ontologicalWorlds.trials.length === 1 && window.__ontologicalWorlds.awaiting, null, { timeout: 15000 });

  let uiTransitions = 0;
  for (let round = 0; round < 8; round += 1) {
    const snapshot = await page.evaluate(() => {
      const app = window.__ontologicalWorlds;
      const core = window.__modeOneTriadicEntailmentCore;
      const current = app.current;
      const previous = app.trials[app.trials.length - 2] || null;
      const target = app.trials[app.trials.length - 2] || null;
      const analysis = target ? app.assertModeOneMaximumInterference(target, previous, current) : null;
      return {
        length: app.trials.length,
        displayed: document.getElementById('premise-display')?.textContent?.trim(),
        rendered: core.renderTrial(current).trim(),
        vector: current.conflictResponseVector.slice(),
        analysis,
        interferenceLevel: current.interferenceLevel,
        maxLogicalInterference: current.maxLogicalInterference
      };
    });
    assert.equal(snapshot.displayed, snapshot.rendered);
    assert.equal(snapshot.interferenceLevel, 100);
    assert.equal(snapshot.maxLogicalInterference, true);
    if (snapshot.analysis) {
      assert.equal(snapshot.analysis.valid, true);
      assert.equal(snapshot.analysis.targetOverlapCount, 2);
      assert.equal(snapshot.analysis.previousOverlapCount, 2);
      uiTransitions += 1;
    }

    for (let decision = 0; decision < 5; decision += 1) {
      const value = snapshot.vector[decision] ? '1' : '0';
      await page.click(`.conflict-row[data-decision="${decision}"] .conflict-choice[data-value="${value}"]`);
    }
    await page.waitForFunction(previousLength => window.__ontologicalWorlds.trials.length > previousLength && window.__ontologicalWorlds.awaiting, snapshot.length, { timeout: 10000 });
  }
  assert(uiTransitions >= 7);
  await page.click('#stop-btn');

  // Confirm the Mode 1 override did not swallow Mode 2's generator or controls.
  await page.selectOption('#logic-mode', '1');
  await page.waitForFunction(() => document.getElementById('conflict-matrix')?.getAttribute('aria-hidden') === 'true');
  const modeTwoPreflight = await page.evaluate(() => {
    const app = window.__ontologicalWorlds;
    app.trials = [];
    app.current = null;
    app.n = 1;
    const trial = app.makeTrial();
    return {
      exists: Boolean(trial),
      mode: trial?.mode,
      rendered: trial ? app.renderTrial(trial) : '',
      bodyClass: document.body.classList.contains('mode-one-conflict-active'),
      matrixHidden: document.getElementById('conflict-matrix')?.getAttribute('aria-hidden'),
      responseButtonsDisplay: getComputedStyle(document.querySelector('.response-buttons')).display
    };
  });
  assert.equal(modeTwoPreflight.exists, true);
  assert.equal(modeTwoPreflight.mode, 1);
  assert(modeTwoPreflight.rendered.trim().length > 0);
  assert.equal(modeTwoPreflight.bodyClass, false);
  assert.equal(modeTwoPreflight.matrixHidden, 'true');
  assert.notEqual(modeTwoPreflight.responseButtonsDisplay, 'none');

  await page.click('#start-btn');
  await page.waitForFunction(() => window.__ontologicalWorlds.current?.mode === 1, null, { timeout: 15000 });
  const modeTwoLive = await page.evaluate(() => ({
    mode: window.__ontologicalWorlds.current?.mode,
    displayed: document.getElementById('premise-display')?.textContent?.trim()
  }));
  assert.equal(modeTwoLive.mode, 1);
  assert(modeTwoLive.displayed.length > 0);
  await page.click('#stop-btn');

  assert.deepEqual(browserErrors, [], `Browser emitted errors:\n${browserErrors.join('\n')}`);

  console.log(JSON.stringify({
    passed: true,
    baseUrl,
    expectedCacheKey,
    exhaustiveBrowserTransitions: exhaustiveBrowserResult.transitions,
    uiTransitions,
    fixedInterference: 100,
    nBackLevels: [1,2,3,4,5,6,7,8],
    compassResolutions: [4,8,16],
    modeTwoPreserved: true,
    browserErrors: 0
  }, null, 2));

  await browser.close();
})().catch(async error => {
  console.error(error);
  process.exitCode = 1;
});
