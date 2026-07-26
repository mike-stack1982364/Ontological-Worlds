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
    const core = root.__modeOneSpatialCore || root.__modeOneTriadicEntailmentCore;
    const conflict = root.__modeOneConflictMatrixV20;

    if (!app || !modeSelect || !resolutionSelect || !premiseDisplay || !startButton || !core || !conflict) {
      console.error('Mode 1 startup coordinator could not install because required runtime elements are missing.');
      return;
    }
    if (app.__modeOneStartupCoordinatorInstalled) return;

    const downstreamStart = app.start.bind(app);
    const downstreamStop = app.stop.bind(app);
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

    const selectedResolution = () => {
      const value = Number(resolutionSelect.value);
      return [4, 8, 16].includes(value) ? value : null;
    };
    const modeOneSelected = () => Number(modeSelect.value || 0) === 0;

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
      startButton.disabled = false;
      if (pauseButton) pauseButton.disabled = true;
      if (stopButton) stopButton.disabled = true;
      resolutionSelect.disabled = false;
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
      if (countdown) countdown.textContent = '';
      try { makePremiseVisible(`START_FAILED: ${normalised.message}`); } catch (_) {}
      setControlsAfterFailure();
      console.error('Mode 1 startup failed.', normalised);
      return null;
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

    const createFirstTrial = resolution => {
      const interferenceLevel = Number(d.getElementById('interference-slider')?.value) || 0;
      let trial = null;
      let rendered = '';
      let lastError = null;
      for (let attempt = 1; attempt <= 32; attempt++) {
        try {
          const candidate = conflict.generateWarmupTrial(app.rng, {
            interferenceLevel,
            directionResolution: resolution
          });
          if (!candidate || !conflict.ensureResolutionClosed(candidate, resolution)) {
            throw new Error('Generated Trial 1 failed resolution validation.');
          }
          const text = core.renderTrial(candidate);
          if (typeof text !== 'string' || !text.trim()) throw new Error('Trial 1 renderer returned an empty premise.');
          candidate.submitted = false;
          candidate._answered = false;
          trial = candidate;
          rendered = text.trim();
          record('FIRST_TRIAL_GENERATED', { attempt, resolution });
          break;
        } catch (error) {
          lastError = error;
          record('FIRST_TRIAL_ATTEMPT_FAILED', { attempt, message: error?.message || String(error) });
        }
      }
      if (!trial) throw lastError || new Error('Mode 1 failed all Trial 1 generation attempts.');
      return { trial, rendered };
    };

    const commitFirstTrial = ({ trial, rendered }) => {
      makePremiseVisible(rendered);
      app.current = trial;
      app.trials = [trial];
      if (app.score && typeof app.score.shown === 'number') app.score.shown = 1;
      app.awaiting = true;
      resetMatrix(trial);
      try { app.updateStats?.(); } catch (_) {}
      try { app.speak?.(rendered); } catch (_) {}
      record('FIRST_TRIAL_COMMITTED');
      return trial;
    };

    const hasValidFirstTrial = resolution => {
      const text = premiseDisplay.textContent.trim();
      return Boolean(
        app.running &&
        !app.paused &&
        app.awaiting &&
        app.current &&
        Array.isArray(app.trials) &&
        app.trials.length === 1 &&
        app.current.directionResolution === resolution &&
        text &&
        text !== 'SYSTEM_READY' &&
        !text.startsWith('START_FAILED:')
      );
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
      this.directionResolution = resolution;
      let downstreamError = null;
      try {
        await Promise.resolve(downstreamStart(...args));
      } catch (error) {
        downstreamError = error;
        record('DOWNSTREAM_START_FAILED', { message: error?.message || String(error) });
      }

      if (!this.running) {
        this.running = true;
        this.paused = false;
        this.sessionToken++;
        this.trials = [];
        this.current = null;
        this.awaiting = false;
        if (startButton) startButton.disabled = true;
        if (pauseButton) pauseButton.disabled = false;
        if (stopButton) stopButton.disabled = false;
      }

      const token = this.sessionToken;
      if (countdown?.textContent) countdown.textContent = '';
      if (!this.running || this.paused || token !== this.sessionToken) {
        return fail(downstreamError || new Error('Mode 1 startup state changed before Trial 1 generation.'));
      }

      try {
        const generated = createFirstTrial(resolution);
        commitFirstTrial(generated);
      } catch (error) {
        return fail(error);
      }

      if (!hasValidFirstTrial(resolution)) return fail(new Error('Countdown completed without a committed visible Trial 1.'));
      record('START_SUCCESS');
      return this.current;
    };

    app.stop = function coordinatedStop(...args) {
      const result = downstreamStop(...args);
      app.current = null;
      app.awaiting = false;
      return result;
    };

    root.addEventListener('error', event => {
      if (app.running && modeOneSelected()) record('WINDOW_ERROR', { message: event.message || '', stack: event.error?.stack || '' });
    });
    root.addEventListener('unhandledrejection', event => {
      if (app.running && modeOneSelected()) record('UNHANDLED_REJECTION', { message: event.reason?.message || String(event.reason || '') });
    });

    app.__modeOneStartupCoordinatorInstalled = true;
    app.__modeOneStartupCoordinatorVersion = 3;
    record('COORDINATOR_INSTALLED');
  };

  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(typeof window !== 'undefined' ? window : globalThis);
