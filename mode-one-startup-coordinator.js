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
    const matrix = d.getElementById('conflict-matrix');
    const feedback = d.getElementById('feedback');
    const explanation = d.getElementById('trial-explanation');
    const core = root.__modeOneSpatialCore || root.__modeOneTriadicEntailmentCore;
    const conflict = root.__modeOneConflictMatrixV20;

    if (!app || !modeSelect || !resolutionSelect || !premiseDisplay || !countdown || !startButton || !core || !conflict) {
      console.error('Mode 1 startup coordinator could not install because required runtime elements are missing.');
      return;
    }
    if (app.__modeOneStartupCoordinatorInstalled) return;

    const downstreamStart = app.start.bind(app);
    const downstreamStop = app.stop.bind(app);
    const sleep = milliseconds => new Promise(resolve => root.setTimeout(resolve, milliseconds));

    const modeOneSelected = () => Number(modeSelect.value || 0) === 0;
    const selectedResolution = () => {
      const value = Number(resolutionSelect.value);
      return [4, 8, 16].includes(value) ? value : null;
    };

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

    const resetMatrix = trial => {
      if (!matrix) return;
      matrix.classList.add('active');
      matrix.dataset.submitting = 'false';
      matrix.dataset.startedAt = String(Date.now());
      matrix.querySelectorAll('.conflict-choice').forEach(button => {
        button.disabled = !Boolean(trial?.scored);
        button.classList.remove('feedback-correct', 'feedback-incorrect', 'selected');
        button.querySelectorAll('.conflict-feedback-icon').forEach(icon => icon.remove());
      });
      const progress = matrix.querySelector('#conflict-progress');
      if (progress) progress.textContent = trial?.scored ? '0 of 5 decisions entered' : '';
    };

    const syncIdleStartAvailability = () => {
      if (app.running) return;
      startButton.disabled = modeOneSelected() ? selectedResolution() === null : false;
    };

    const fail = error => {
      const normalised = error instanceof Error ? error : new Error(String(error || 'Unknown Mode 1 startup error'));
      record('START_FAILED', { message: normalised.message, stack: normalised.stack || '' });
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
      countdown.textContent = '';
      try { makePremiseVisible(`START_FAILED: ${normalised.message}`); } catch (_) {}
      if (pauseButton) pauseButton.disabled = true;
      if (stopButton) stopButton.disabled = true;
      resolutionSelect.disabled = false;
      syncIdleStartAvailability();
      console.error('Mode 1 startup failed.', normalised);
      return null;
    };

    const createFirstTrial = resolution => {
      const interferenceLevel = Number(d.getElementById('interference-slider')?.value) || 0;
      let lastError = null;
      for (let attempt = 1; attempt <= 32; attempt++) {
        try {
          const trial = conflict.generateWarmupTrial(app.rng, {
            interferenceLevel,
            directionResolution: resolution
          });
          if (!trial || !conflict.ensureResolutionClosed(trial, resolution)) {
            throw new Error('Generated Trial 1 failed resolution validation.');
          }
          const rendered = core.renderTrial(trial);
          if (typeof rendered !== 'string' || !rendered.trim()) {
            throw new Error('Trial 1 renderer returned an empty premise.');
          }
          trial.submitted = false;
          trial._answered = false;
          record('FIRST_TRIAL_GENERATED', { attempt, resolution });
          return { trial, rendered: rendered.trim() };
        } catch (error) {
          lastError = error;
          record('FIRST_TRIAL_ATTEMPT_FAILED', { attempt, message: error?.message || String(error) });
        }
      }
      throw lastError || new Error('Mode 1 failed all Trial 1 generation attempts.');
    };

    const commitFirstTrial = ({ trial, rendered }, resolution, token) => {
      if (!app.running || app.paused || token !== app.sessionToken) {
        throw new Error('Mode 1 startup state changed before Trial 1 could be committed.');
      }
      if (trial.directionResolution !== resolution) {
        throw new Error('Trial 1 does not use the selected compass resolution.');
      }
      makePremiseVisible(rendered);
      app.current = trial;
      app.trials = [trial];
      if (app.score && typeof app.score.shown === 'number') app.score.shown = 1;
      app.awaiting = true;
      if (feedback) feedback.textContent = '';
      if (explanation) explanation.textContent = '';
      resetMatrix(trial);
      try { app.updateStats?.(); } catch (_) {}
      try { app.speak?.(rendered); } catch (_) {}
      record('FIRST_TRIAL_COMMITTED', { resolution });
      return trial;
    };

    const initialiseModeOneSession = resolution => {
      app.running = true;
      app.paused = false;
      app.sessionToken++;
      app.trials = [];
      app.current = null;
      app.awaiting = false;
      app.inventionMemory?.clear?.();
      app.rts = [];
      app.score = { hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0, timeouts: 0, shown: 0, scored: 0 };
      app.n = Number(app.settings?.().n || 1);
      app.startedAt = Date.now();
      app.endsAt = app.startedAt + 60000 * Number(app.settings?.().minutes || 15);
      app.directionResolution = resolution;
      startButton.disabled = true;
      resolutionSelect.disabled = true;
      if (pauseButton) pauseButton.disabled = false;
      if (stopButton) stopButton.disabled = false;
      d.body.classList.remove('practice-active');
      try { app.syncDelta?.(); } catch (_) {}
      try { app.updateStats?.(); } catch (_) {}
      try { app.startSessionClock?.(); } catch (_) {}
      return app.sessionToken;
    };

    app.start = async function authoritativeModeOneStart(...args) {
      if (!modeOneSelected()) return downstreamStart(...args);
      if (this.running) return false;

      const resolution = selectedResolution();
      if (!resolution) {
        try { this.validateDirectionResolutionBeforeStart?.(true); } catch (_) {}
        syncIdleStartAvailability();
        return false;
      }

      record('START_ENTER', { resolution });
      const token = initialiseModeOneSession(resolution);

      for (const value of [3, 2, 1]) {
        if (!this.running || this.paused || token !== this.sessionToken) return null;
        countdown.textContent = String(value);
        await sleep(650);
      }
      countdown.textContent = '';

      try {
        const generated = createFirstTrial(resolution);
        const first = commitFirstTrial(generated, resolution, token);
        if (
          !this.running ||
          this.paused ||
          !this.awaiting ||
          !this.current ||
          this.trials.length !== 1 ||
          this.current !== first ||
          premiseDisplay.textContent.trim() !== generated.rendered
        ) {
          throw new Error('Countdown completed without one committed visible Trial 1.');
        }
        record('START_SUCCESS', { resolution });
        return first;
      } catch (error) {
        return fail(error);
      }
    };

    app.stop = function coordinatedStop(...args) {
      const result = downstreamStop(...args);
      app.current = null;
      app.awaiting = false;
      syncIdleStartAvailability();
      return result;
    };

    resolutionSelect.addEventListener('input', syncIdleStartAvailability);
    resolutionSelect.addEventListener('change', syncIdleStartAvailability);
    modeSelect.addEventListener('change', syncIdleStartAvailability);
    root.addEventListener('pageshow', syncIdleStartAvailability);

    root.addEventListener('error', event => {
      if (app.running && modeOneSelected()) record('WINDOW_ERROR', { message: event.message || '', stack: event.error?.stack || '' });
    });
    root.addEventListener('unhandledrejection', event => {
      if (app.running && modeOneSelected()) record('UNHANDLED_REJECTION', { message: event.reason?.message || String(event.reason || '') });
    });

    app.__modeOneStartupCoordinatorInstalled = true;
    app.__modeOneStartupCoordinatorVersion = 4;
    syncIdleStartAvailability();
    record('COORDINATOR_INSTALLED');
  };

  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(typeof window !== 'undefined' ? window : globalThis);
