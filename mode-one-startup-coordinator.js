'use strict';

(function installModeOneStartupCoordinator(root) {
  if (!root || !root.document) return;

  const install = () => {
    const app = root.__ontologicalWorlds;
    const d = root.document;
    const modeSelect = d.getElementById('logic-mode');
    const resolutionSelect = d.getElementById('direction-resolution');
    const premiseDisplay = d.getElementById('premise-display');
    const countdown = d.getElementById('countdown-box');
    const startButton = d.getElementById('start-btn');
    const pauseButton = d.getElementById('pause-btn');
    const stopButton = d.getElementById('stop-btn');

    if (!app || !modeSelect || !premiseDisplay || !startButton) {
      console.error('Mode 1 startup coordinator could not install because required runtime elements are missing.');
      return;
    }
    if (app.__modeOneStartupCoordinatorInstalled) return;

    const downstreamStart = app.start.bind(app);
    const downstreamNextTrial = app.nextTrial.bind(app);
    const sleep = milliseconds => new Promise(resolve => root.setTimeout(resolve, milliseconds));

    const record = (event, details = {}) => {
      const entry = Object.freeze({
        at: Date.now(),
        event,
        running: Boolean(app.running),
        paused: Boolean(app.paused),
        awaiting: Boolean(app.awaiting),
        sessionToken: app.sessionToken,
        current: Boolean(app.current),
        trialCount: Array.isArray(app.trials) ? app.trials.length : null,
        premise: premiseDisplay.textContent || '',
        ...details
      });
      if (!Array.isArray(app.__modeOneStartupTrace)) app.__modeOneStartupTrace = [];
      app.__modeOneStartupTrace.push(entry);
      if (app.__modeOneStartupTrace.length > 200) app.__modeOneStartupTrace.shift();
      return entry;
    };

    const makePremiseVisible = text => {
      const value = String(text ?? '').trim();
      if (!value) throw new Error('Mode 1 produced an empty premise string.');
      premiseDisplay.hidden = false;
      premiseDisplay.classList.remove('hidden-mode', 'muted', 'hidden', 'correct', 'incorrect');
      premiseDisplay.removeAttribute('aria-hidden');
      premiseDisplay.style.removeProperty('display');
      premiseDisplay.style.removeProperty('visibility');
      premiseDisplay.style.removeProperty('opacity');
      premiseDisplay.textContent = value;
      premiseDisplay.setAttribute('aria-label', value);
      if (premiseDisplay.textContent.trim() !== value) throw new Error('Mode 1 premise DOM write did not persist.');
      return value;
    };

    const setControlsAfterFailure = () => {
      if (startButton) startButton.disabled = false;
      if (pauseButton) pauseButton.disabled = true;
      if (stopButton) stopButton.disabled = true;
      if (resolutionSelect) resolutionSelect.disabled = false;
    };

    const fail = error => {
      const normalised = error instanceof Error ? error : new Error(String(error || 'Unknown Mode 1 startup error'));
      record('START_FAILED', { message: normalised.message, stack: normalised.stack || '' });
      try {
        if (typeof app.failModeOneStartup === 'function') app.failModeOneStartup(normalised);
        else {
          app.running = false;
          app.paused = false;
          app.awaiting = false;
          app.current = null;
          app.trials = [];
          app.sessionToken++;
          clearTimeout(app.timerId);
          clearInterval(app.sessionTimerId);
          try { app.synth?.cancel(); } catch (_) {}
          try { app.stopDelta?.(); } catch (_) {}
        }
      } catch (secondaryError) {
        console.error('Mode 1 failure handler itself failed.', secondaryError);
      }
      if (countdown) countdown.textContent = '';
      try { makePremiseVisible(`START_FAILED: ${normalised.message}`); } catch (_) {}
      setControlsAfterFailure();
      console.error('Mode 1 startup failed.', normalised);
      return null;
    };

    const modeOneSelected = () => Number(modeSelect.value || 0) === 0;
    const selectedResolution = () => {
      const value = Number(resolutionSelect?.value);
      return [4, 8, 16].includes(value) ? value : null;
    };

    const hasValidFirstTrial = () => {
      const text = premiseDisplay.textContent.trim();
      return Boolean(
        app.running &&
        !app.paused &&
        app.awaiting &&
        app.current &&
        Array.isArray(app.trials) &&
        app.trials.length === 1 &&
        text &&
        text !== 'SYSTEM_READY' &&
        !text.startsWith('START_FAILED:')
      );
    };

    const createFirstTrialDirectly = token => {
      record('DIRECT_FIRST_TRIAL_ENTER', { token });
      if (!app.running || app.paused || token !== app.sessionToken) {
        throw new Error('Mode 1 startup state changed before Trial 1 could be generated.');
      }
      if (typeof app.makeTrial !== 'function') throw new Error('Mode 1 trial generator is unavailable.');
      if (typeof app.renderTrial !== 'function') throw new Error('Mode 1 trial renderer is unavailable.');

      let trial = null;
      let rendered = '';
      let lastError = null;
      for (let attempt = 1; attempt <= 32; attempt++) {
        try {
          const candidate = app.makeTrial();
          if (!candidate) throw new Error('Mode 1 generator returned no trial.');
          const text = app.renderTrial(candidate);
          if (typeof text !== 'string' || !text.trim()) throw new Error('Mode 1 renderer returned an empty premise.');
          trial = candidate;
          rendered = text.trim();
          record('DIRECT_FIRST_TRIAL_GENERATED', { attempt });
          break;
        } catch (error) {
          lastError = error;
          record('DIRECT_FIRST_TRIAL_ATTEMPT_FAILED', { attempt, message: error?.message || String(error) });
        }
      }
      if (!trial) throw lastError || new Error('Mode 1 failed all direct Trial 1 generation attempts.');
      if (!app.running || app.paused || token !== app.sessionToken) {
        throw new Error('Mode 1 startup state changed before Trial 1 could be committed.');
      }

      makePremiseVisible(rendered);
      app.current = trial;
      app.trials = [trial];
      if (app.score && typeof app.score.shown === 'number') app.score.shown = 1;
      app.awaiting = true;
      try { app.updateStats?.(); } catch (_) {}
      try { app.speak?.(rendered); } catch (_) {}
      record('DIRECT_FIRST_TRIAL_COMMITTED');
      return trial;
    };

    app.start = async function coordinatedModeOneStart(...args) {
      if (!modeOneSelected()) return downstreamStart(...args);
      if (this.running) return false;

      const resolution = selectedResolution();
      if (!resolution) {
        try { this.validateDirectionResolutionBeforeStart?.(true); } catch (_) {}
        return false;
      }

      record('START_ENTER', { resolution });
      const initialToken = this.sessionToken;
      let downstreamResult;
      try {
        downstreamResult = downstreamStart(...args);
        await Promise.resolve(downstreamResult);
      } catch (error) {
        return fail(error);
      }

      const token = this.sessionToken;
      record('DOWNSTREAM_START_RESOLVED', { initialToken, token });
      if (!this.running || this.paused) return fail(new Error('Mode 1 stopped before Trial 1 was established.'));

      for (let attempt = 0; attempt < 8 && !hasValidFirstTrial(); attempt++) {
        await sleep(25);
      }
      if (hasValidFirstTrial()) {
        makePremiseVisible(premiseDisplay.textContent);
        record('FIRST_TRIAL_CONFIRMED_FROM_DOWNSTREAM');
        return this.current;
      }

      try {
        const result = downstreamNextTrial(token);
        await Promise.resolve(result);
      } catch (error) {
        record('DOWNSTREAM_NEXT_TRIAL_FAILED', { message: error?.message || String(error) });
      }
      if (hasValidFirstTrial()) {
        makePremiseVisible(premiseDisplay.textContent);
        record('FIRST_TRIAL_CONFIRMED_AFTER_NEXT_TRIAL');
        return this.current;
      }

      try {
        createFirstTrialDirectly(token);
      } catch (error) {
        return fail(error);
      }
      if (!hasValidFirstTrial()) return fail(new Error('Countdown completed without a committed visible Trial 1.'));
      record('START_SUCCESS');
      return this.current;
    };

    root.addEventListener('error', event => {
      if (app.running && modeOneSelected()) record('WINDOW_ERROR', { message: event.message || '', stack: event.error?.stack || '' });
    });
    root.addEventListener('unhandledrejection', event => {
      if (app.running && modeOneSelected()) record('UNHANDLED_REJECTION', { message: event.reason?.message || String(event.reason || '') });
    });

    app.__modeOneStartupCoordinatorInstalled = true;
    app.__modeOneStartupCoordinatorVersion = 2;
    record('COORDINATOR_INSTALLED');
  };

  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(typeof window !== 'undefined' ? window : globalThis);
