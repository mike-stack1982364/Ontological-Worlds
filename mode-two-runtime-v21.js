'use strict';

(function installModeTwoFinalRuntimeV21(root) {
  if (!root?.document) return;

  function install() {
    const api = root.__modeTwoOntologyNBackV21 || root.__modeTwoOntologyNBackV14;
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    if (!api || !core) throw new Error('Mode 2 v21 requires its engine and the shared spatial core.');
    api.installBrowser?.(root);
    const VERSION = api.version;
    const RESOLUTIONS = [...api.RESOLUTIONS];
    const normaliseResolution = core.normaliseResolution.bind(core);
    const renderOntologicalTrial = api.renderOntologicalTrial.bind(api);
    const generateTrial = api.generateTrial.bind(api);
    const generateNBackTrial = api.generateNBackTrial.bind(api);
    const runExhaustiveAudit = api.runExhaustiveAudit.bind(api);
    const random = rng => rng?.next ? rng.next() : Math.random();

    function installFinalRuntime(rootObject) {
      const app = rootObject.__ontologicalWorlds;
      const documentObject = rootObject.document;
      if (!app || !documentObject || app.__modeTwoFinalRuntimeV21) return Boolean(app?.__modeTwoFinalRuntimeV21);

      const modeSelect = documentObject.getElementById('logic-mode');
      const directionGroup = documentObject.getElementById('direction-resolution-group');
      const directionSelect = documentObject.getElementById('direction-resolution');
      const directionHelp = documentObject.getElementById('direction-resolution-help');
      const directionError = documentObject.getElementById('direction-resolution-error');
      const directionStatus = documentObject.getElementById('direction-resolution-status');
      const interferenceSlider = documentObject.getElementById('interference-slider');
      const interferenceValue = documentObject.getElementById('interference-val');
      const interferenceHelp = documentObject.getElementById('interference-help');
      const startButton = documentObject.getElementById('start-btn');
      const matchButton = documentObject.getElementById('match-btn');
      const noMatchButton = documentObject.getElementById('no-match-btn');
      const matrix = documentObject.getElementById('conflict-matrix');
      const premiseDisplay = documentObject.getElementById('premise-display');
      const feedback = documentObject.getElementById('feedback');
      const explanation = documentObject.getElementById('trial-explanation');
      const pausedOverlay = documentObject.getElementById('paused-overlay');
      const pauseButton = documentObject.getElementById('pause-btn');
      if (!modeSelect || !directionGroup || !directionSelect || !startButton || !matchButton || !noMatchButton) {
        throw new Error('Mode 2 restoration requires the mode, direction and binary-response controls.');
      }

      [...documentObject.querySelectorAll('#tutorial p')].forEach(paragraph => {
        if (/Mode 2 does not require or use the Mode 1 compass-resolution selector/i.test(paragraph.textContent || '')) {
          paragraph.textContent = 'Mode 2 uses the same customisable 4-, 8- or 16-direction selector as Mode 1. Its ontology categories and Inner/Outer labels remain scoring-neutral; the complete three-statement compass structure is compared N trials back at the selected resolution.';
        }
      });

      const styleId = 'mode-two-final-runtime-v21-style';
      if (!documentObject.getElementById(styleId)) {
        const style = documentObject.createElement('style');
        style.id = styleId;
        style.textContent = `
          body.mode-two-active .response-buttons{display:flex!important;justify-content:center;gap:18px;width:min(100%,620px);margin:12px auto!important}
          body.mode-two-active #conflict-matrix{display:none!important}
          body.mode-two-active .response-stage{height:128px!important;min-height:128px!important;flex-basis:128px!important;overflow:visible!important}
          body.mode-two-active .response-buttons button{display:block!important;min-width:min(42vw,260px);min-height:76px;font-size:clamp(1rem,2.2vw,1.45rem);font-weight:900}
          body.mode-one-conflict-active .response-buttons{display:none!important}
        `;
        documentObject.head.appendChild(style);
      }

      const modeOneMakeTrial = app.makeTrial.bind(app);
      const modeOneNextTrial = app.nextTrial.bind(app);
      const modeOneAnswer = app.answer.bind(app);
      const modeOneStart = app.start.bind(app);
      const modeOneStop = app.stop.bind(app);
      const modeOneTogglePause = typeof app.togglePause === 'function' ? app.togglePause.bind(app) : null;
      let modeTwoAdvanceTimer = null;
      let modeTwoPresentation = 0;
      let modeTwoPhase = 'idle';
      let responsePausedAt = null;
      const now = () => rootObject.performance?.now?.() ?? Date.now();

      const selectedMode = () => Number(modeSelect.value) === 1 ? 1 : 0;
      const selectedResolution = () => {
        const resolution = Number(directionSelect.value);
        return RESOLUTIONS.includes(resolution) ? resolution : null;
      };
      const setDirectionError = show => {
        directionSelect.setAttribute('aria-invalid', show ? 'true' : 'false');
        if (directionError) directionError.hidden = !show;
      };
      const setBinaryButtons = enabled => {
        matchButton.disabled = !enabled;
        noMatchButton.disabled = !enabled;
      };
      const clearModeTwoTimer = () => {
        if (modeTwoAdvanceTimer !== null) rootObject.clearTimeout(modeTwoAdvanceTimer);
        modeTwoAdvanceTimer = null;
      };
      const modeTwoInterference = () => 100;

      function scheduleAdvance(token, milliseconds) {
        clearModeTwoTimer();
        modeTwoAdvanceTimer = rootObject.setTimeout(() => {
          modeTwoAdvanceTimer = null;
          if (app.running && !app.paused && token === app.sessionToken) {
            modeTwoPhase = 'advance';
            app.nextTrial(token);
          }
        }, milliseconds);
      }

      async function presentTrial(trial, token) {
        const presentation = ++modeTwoPresentation;
        modeTwoPhase = 'speaking';
        app.awaiting = false;
        setBinaryButtons(false);
        const rendered = renderOntologicalTrial(trial);
        if (premiseDisplay) {
          premiseDisplay.textContent = rendered;
          premiseDisplay.setAttribute('aria-label', rendered);
        }
        app.applyPremiseVisibility?.();
        try { await app.speak?.(rendered); } catch (_) {}
        // Cancelling speech is asynchronous in several browsers. An old speech
        // completion must not open answers after pause/resume or restart.
        if (presentation !== modeTwoPresentation || !app.running || app.paused
          || token !== app.sessionToken || app.current !== trial) return trial;
        if (trial.nBackWarmup || !trial.scored) {
          modeTwoPhase = 'warmup';
          if (feedback) feedback.textContent = `MEMORY FILL — ${app.trials.length} OF ${trial.nBackLevel}`;
          scheduleAdvance(token, 900);
        } else {
          modeTwoPhase = 'response';
          app.awaiting = true;
          trial.started = now();
          setBinaryButtons(true);
        }
        return trial;
      }

      function failSession(error) {
        rootObject.__modeTwoLastError = error;
        app.stop(true);
        if (premiseDisplay) premiseDisplay.textContent = `MODE_2_GENERATION_FAILED: ${error?.message || error}`;
        return null;
      }

      function syncInterface() {
        const mode = selectedMode();
        const resolution = selectedResolution();
        documentObject.body.classList.toggle('mode-one-conflict-active', mode === 0);
        documentObject.body.classList.toggle('mode-two-active', mode === 1);
        if (mode === 1) matrix?.classList.remove('active');
        directionGroup.hidden = false;
        directionSelect.disabled = Boolean(app.running);
        modeSelect.disabled = Boolean(app.running);
        if (!app.running) startButton.disabled = resolution === null;
        if (directionStatus) {
          directionStatus.textContent = resolution
            ? `COMPASS RESOLUTION: ${resolution} DIRECTIONS — MODE ${mode + 1}`
            : 'COMPASS RESOLUTION: NOT SELECTED';
        }
        if (directionHelp) {
          directionHelp.textContent = mode === 0
            ? 'Choose 4, 8 or 16 directions for the Relational Conflict Matrix. The selection is frozen for the session.'
            : 'Choose 4, 8 or 16 directions for Ontological Integration. Ontology labels remain scoring-neutral; the complete compass structure is compared N trials back at the selected resolution.';
        }
        if (resolution) setDirectionError(false);

        if (interferenceSlider) {
          interferenceSlider.min = '100';
          interferenceSlider.max = '100';
          interferenceSlider.step = '1';
          interferenceSlider.value = '100';
          interferenceSlider.disabled = true;
          if (interferenceValue) interferenceValue.textContent = '100% — FIXED';
          if (interferenceHelp) {
            interferenceHelp.textContent = mode === 0
              ? 'Mode 1 is fixed at maximum logical interference: every scored NO MATCH is an exact two-of-three lure with controlled letter continuity.'
              : 'Mode 2 is fixed at maximum logical interference: every scored NO MATCH preserves exactly two globally coherent statements and changes one relation within the selected compass resolution.';
          }
        }
        if (!app.running && mode === 1) setBinaryButtons(false);
        return { mode, resolution };
      }

      modeSelect.addEventListener('change', syncInterface);
      directionSelect.addEventListener('input', syncInterface);
      directionSelect.addEventListener('change', syncInterface);
      rootObject.addEventListener?.('pageshow', syncInterface);

      app.makeTrial = function routedFinalMakeTrial() {
        const mode = selectedMode();
        if (mode === 0) return modeOneMakeTrial();
        const settings = this.settings();
        const resolution = normaliseResolution(
          this.directionResolution ?? settings.directionResolution ?? selectedResolution(),
          null
        );
        if (!resolution) throw new Error('Mode 2 requires a selected compass resolution.');
        const level = Math.max(1, Math.min(8, Math.round(Number(this.n || settings.n) || 1)));
        const history = Array.isArray(this.trials) ? this.trials : [];
        const target = history[history.length - level];
        if (!target) {
          const warmup = generateTrial(this.rng, {
            matchProbability: random(this.rng) < 0.5 ? 1 : 0,
            directionResolution: resolution,
            interferenceLevel: modeTwoInterference()
          });
          Object.assign(warmup, {
            nBackLevel: level,
            nBackWarmup: true,
            nBackMatch: false,
            isMatch: false,
            scored: false,
            directionResolution: resolution
          });
          return warmup;
        }
        return generateNBackTrial(this.rng, target, {
          match: random(this.rng) < Number(settings.matchProbability ?? 0.35),
          nBackLevel: level,
          directionResolution: resolution,
          interferenceLevel: modeTwoInterference()
        });
      };

      app.start = function routedFinalStart(...args) {
        if (this.running) return false;
        const { resolution } = syncInterface();
        if (!resolution) {
          setDirectionError(true);
          directionSelect.focus();
          return false;
        }
        this.directionResolution = resolution;
        clearModeTwoTimer();
        if (selectedMode() === 1) {
          modeTwoPresentation += 1;
          modeTwoPhase = 'idle';
          responsePausedAt = null;
          this.trials = [];
          this.current = null;
          this.awaiting = false;
          setBinaryButtons(false);
        }
        const result = modeOneStart(...args);
        syncInterface();
        return result;
      };

      app.nextTrial = async function routedFinalNextTrial(token = this.sessionToken) {
        if (selectedMode() === 0) return modeOneNextTrial(token);
        if (!this.running || this.paused || token !== this.sessionToken) return null;
        if (this.current && !this.current._answered
          && ['speaking', 'response', 'warmup'].includes(modeTwoPhase)) return this.current;
        clearModeTwoTimer();
        rootObject.clearTimeout(this.timerId);
        this.awaiting = false;
        setBinaryButtons(false);
        if (feedback) feedback.textContent = '';
        if (explanation) {
          explanation.textContent = '';
          explanation.classList.remove('show');
        }

        let trial;
        try {
          trial = this.makeTrial();
          if (!trial) throw new Error('Mode 2 generator returned no trial.');
          renderOntologicalTrial(trial);
        } catch (error) {
          return failSession(error);
        }
        trial._answered = false;
        this.current = trial;
        this.trials.push(trial);
        this.score.shown = Number(this.score.shown || 0) + 1;
        this.updateStats?.();
        return presentTrial(trial, token);
      };

      app.answer = function routedFinalAnswer(response) {
        if (selectedMode() === 0 || Number(this.current?.mode) === 0) return modeOneAnswer(response);
        const trial = this.current;
        if (!this.running || this.paused || !this.awaiting || !trial || trial._answered) return false;
        if (typeof response !== 'boolean') return false;
        trial._answered = true;
        this.awaiting = false;
        setBinaryButtons(false);
        const expected = Boolean(trial.nBackMatch);
        const correct = response === expected;
        const answeredAt = now();
        const reactionTime = Math.max(0, answeredAt - (Number.isFinite(trial.started) ? trial.started : answeredAt));
        this.rts.push(reactionTime);
        this.score.scored = Number(this.score.scored || 0) + 1;
        if (response && expected) this.score.hits = Number(this.score.hits || 0) + 1;
        else if (response && !expected) this.score.falseAlarms = Number(this.score.falseAlarms || 0) + 1;
        else if (!response && expected) this.score.misses = Number(this.score.misses || 0) + 1;
        else this.score.correctRejects = Number(this.score.correctRejects || 0) + 1;
        trial.correct = correct;
        trial.response = response;
        trial.responseTime = reactionTime;
        modeTwoPhase = 'feedback';
        if (feedback) feedback.textContent = correct ? 'CORRECT' : 'INCORRECT';
        if (explanation) {
          explanation.textContent = `${expected ? 'MATCH' : 'NO MATCH'} — the complete three-statement compass structure ${expected ? 'is' : 'is not'} identical to the trial ${trial.nBackLevel} position${trial.nBackLevel === 1 ? '' : 's'} back at ${trial.directionResolution}-direction resolution.`;
          explanation.classList.add('show');
        }
        try { this.updateStats?.(); } catch (_) {}
        try {
          if (this.settings().haptic) rootObject.navigator?.vibrate?.(correct ? 25 : [35, 25, 35]);
        } catch (_) {}
        const nextToken = this.sessionToken;
        scheduleAdvance(nextToken, 1200);
        return correct;
      };

      app.togglePause = function routedFinalTogglePause(...args) {
        if (selectedMode() === 0) return modeOneTogglePause ? modeOneTogglePause(...args) : undefined;
        if (!this.running) return false;
        if (this.paused) this.endSessionPause?.();
        else this.beginSessionPause?.();
        this.paused = !this.paused;
        pausedOverlay?.classList.toggle('show', this.paused);
        if (pauseButton) pauseButton.textContent = this.paused ? 'Resume' : 'Pause';
        if (this.paused) {
          clearModeTwoTimer();
          modeTwoPresentation += 1;
          responsePausedAt = modeTwoPhase === 'response' ? now() : null;
          this.awaiting = false;
          try {
            if (this.cancelSpeech) this.cancelSpeech();
            else this.synth?.cancel();
          } catch (_) {}
          try { this.stopDelta?.(); } catch (_) {}
          setBinaryButtons(false);
        } else {
          try { this.synth?.resume(); } catch (_) {}
          try { this.syncDelta?.(); } catch (_) {}
          if (modeTwoPhase === 'response' && this.current && !this.current._answered) {
            if (responsePausedAt !== null && Number.isFinite(this.current.started)) {
              this.current.started += now() - responsePausedAt;
            }
            this.awaiting = true;
            setBinaryButtons(true);
          } else if (modeTwoPhase === 'speaking' && this.current) {
            presentTrial(this.current, this.sessionToken);
          } else if (modeTwoPhase === 'warmup') {
            scheduleAdvance(this.sessionToken, 900);
          } else if (modeTwoPhase === 'feedback') {
            scheduleAdvance(this.sessionToken, 1200);
          }
          // A paused startup countdown is resumed by the session starter;
          // generating here would insert a second trial into N-back history.
          responsePausedAt = null;
        }
        return this.paused;
      };

      app.stop = function routedFinalStop(...args) {
        const preservedResolution = this.directionResolution || selectedResolution();
        clearModeTwoTimer();
        modeTwoPresentation += 1;
        modeTwoPhase = 'idle';
        responsePausedAt = null;
        const result = modeOneStop(...args);
        if (preservedResolution) directionSelect.value = String(preservedResolution);
        setBinaryButtons(false);
        syncInterface();
        return result;
      };

      app.__modeTwoFinalRuntimeV21 = true;
      rootObject.__modeTwoRestorationTestAPI = Object.freeze({
        version: VERSION,
        selectableResolutions: RESOLUTIONS,
        modeTwoBinaryResponsesRestored: true,
        modeTwoGeneratorRoutedAfterModeOneOverrides: true,
        modeTwoInterferenceCustomisable: false,
        modeTwoInterferenceFixedAtMaximum: true,
        modeTwoDirectionResolutionCustomisable: true,
        audit: runExhaustiveAudit
      });
      syncInterface();
      return true;
    }

    return installFinalRuntime(root);
  }

  let resolveInstallation;
  let rejectInstallation;
  root.__modeTwoFinalRuntimeReady = new Promise((resolve, reject) => {
    resolveInstallation = resolve;
    rejectInstallation = reject;
  });
  // Standalone script consumers may inspect the error flag instead of awaiting
  // readiness. Keep that path from emitting an unhandled promise rejection.
  root.__modeTwoFinalRuntimeReady.catch(() => {});
  const schedule = () => root.setTimeout(() => root.setTimeout(() => {
    try {
      if (!install()) throw new Error('Mode 2 application was unavailable during installation.');
      resolveInstallation(true);
    } catch (error) {
      root.__modeTwoFinalRuntimeV21Error = error;
      console.error('Mode 2 final runtime installation failed.', error);
      const display = root.document.getElementById('premise-display');
      if (display) display.textContent = `MODE_2_INSTALL_FAILED: ${error?.message || error}`;
      const start = root.document.getElementById('start-btn');
      if (start) start.disabled = true;
      rejectInstallation(error);
    }
  }, 0), 0);

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})(typeof window !== 'undefined' ? window : globalThis);
