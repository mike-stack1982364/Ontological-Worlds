'use strict';

(function installModeTwoFinalRuntimeV22(root) {
  if (!root?.document) return;

  function install() {
    const api = root.__modeTwoOntologyNBackV22;
    const core = root.__modeOneTriadicEntailmentCore || root.__modeOneSpatialCore;
    if (!api || !core) throw new Error('Mode 2 v22 requires its engine and the shared spatial core.');
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
      if (!app || !documentObject || app.__modeTwoFinalRuntimeV22) return Boolean(app?.__modeTwoFinalRuntimeV22);

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
      const modeTwoSettings = documentObject.getElementById('mode-two-settings');
      const complexitySelect = documentObject.getElementById('mode-two-complexity');
      const reflectionsCheckbox = documentObject.getElementById('mode-two-reflections');
      if (!modeSelect || !directionGroup || !directionSelect || !startButton || !matchButton || !noMatchButton) {
        throw new Error('Mode 2 restoration requires the mode, direction and binary-response controls.');
      }

      [...documentObject.querySelectorAll('#tutorial p')].forEach(paragraph => {
        if (/Mode 2 does not require or use the Mode 1 compass-resolution selector/i.test(paragraph.textContent || '')) {
          paragraph.textContent = 'Mode 2 compares the complete spatial and ontology structure N trials back. Categories, Inner/Outer/unmarked perspectives, endpoint roles and any inner worlds must all fit one consistent entity mapping.';
        }
      });

      const styleId = 'mode-two-final-runtime-v22-style';
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
      const originalSessionSummary = typeof app.getSessionSummary === 'function' ? app.getSessionSummary.bind(app) : null;
      const originalSyncDelta = typeof app.syncDelta === 'function' ? app.syncDelta.bind(app) : null;
      const originalVisibility = typeof app.applyPremiseVisibility === 'function' ? app.applyPremiseVisibility.bind(app) : null;
      let modeTwoAdvanceTimer = null;
      let modeTwoPresentation = 0;
      let modeTwoPhase = 'idle';
      let responsePausedAt = null;
      let sessionComplexity = 'facets';
      let sessionReflections = true;
      let domainBlock = -1;
      let reflectionTrial = null;
      let reflectionSpeech = 0;
      let manualWarmup = false;
      const now = () => rootObject.performance?.now?.() ?? Date.now();

      const DOMAIN_PAIRS = Object.freeze([
        ['a living garden', 'a radio communication network'],
        ['a city water system', 'an orchestra making music'],
        ['a colony of insects', 'a team making a film'],
        ['a kitchen preparing food', 'a space station moving supplies'],
        ['a forest ecosystem', 'a library sharing stories'],
        ['a railway network', 'a group of cells exchanging signals']
      ]);
      const PREFERENCE_KEY = 'ontological-worlds-mode-two-v22';
      const selectedComplexity = () => ['entities', 'facets', 'worlds'].includes(complexitySelect?.value)
        ? complexitySelect.value : 'facets';
      const selectedReflections = () => reflectionsCheckbox ? Boolean(reflectionsCheckbox.checked) : true;
      try {
        const preferences = JSON.parse(rootObject.localStorage?.getItem(PREFERENCE_KEY) || 'null');
        if (complexitySelect && ['entities', 'facets', 'worlds'].includes(preferences?.complexity)) complexitySelect.value = preferences.complexity;
        if (reflectionsCheckbox && typeof preferences?.reflections === 'boolean') reflectionsCheckbox.checked = preferences.reflections;
      } catch (_) {}
      const savePreferences = () => {
        if (app.running) return;
        try { rootObject.localStorage?.setItem(PREFERENCE_KEY, JSON.stringify({ complexity: selectedComplexity(), reflections: selectedReflections() })); } catch (_) {}
      };
      complexitySelect?.addEventListener('change', savePreferences);
      reflectionsCheckbox?.addEventListener('change', savePreferences);
      const responseStage = documentObject.querySelector('.response-stage');
      let domainCue = documentObject.getElementById('mode-two-domain-cue');
      if (!domainCue) {
        domainCue = documentObject.createElement('p');
        domainCue.id = 'mode-two-domain-cue';
        domainCue.setAttribute('aria-live', 'polite');
        responseStage?.before(domainCue);
      }
      const warmupContinue = documentObject.createElement('button');
      warmupContinue.id = 'mode-two-warmup-continue';
      warmupContinue.type = 'button';
      warmupContinue.textContent = 'Remember this world — Continue';
      warmupContinue.hidden = true;
      warmupContinue.disabled = true;
      warmupContinue.setAttribute('aria-describedby', 'feedback');
      domainCue.after(warmupContinue);
      let reflectionPanel = documentObject.getElementById('mode-two-reflection');
      if (!reflectionPanel) {
        reflectionPanel = documentObject.createElement('section');
        reflectionPanel.id = 'mode-two-reflection';
        reflectionPanel.hidden = true;
        reflectionPanel.setAttribute('aria-labelledby', 'mode-two-reflection-title');
        responseStage?.after(reflectionPanel);
      }
      const updateDomainCue = () => {
        const nextBlock = Math.floor(Number(app.score.scored || 0) / 6);
        domainBlock = nextBlock;
        const [first, second] = DOMAIN_PAIRS[nextBlock % DOMAIN_PAIRS.length];
        domainCue.textContent = `Imagination pair: ${first} → ${second}. Rebuild the same complete structure in both worlds. Let each operation and perspective shape your story. Your story is not scored.`;
        domainCue.hidden = selectedMode() !== 1;
      };

      // The practice break uses the same clock pause as a manual pause, but it
      // never overlays the practice controls. Manual pause may nest inside it.
      const hideReflection = () => {
        reflectionSpeech += 1;
        reflectionPanel.hidden = true;
        reflectionPanel.replaceChildren();
        reflectionTrial = null;
      };
      const makeElement = (tag, text, parent, className) => {
        const node = documentObject.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        parent?.appendChild(node);
        return node;
      };
      const relationName = relation => core.direction(relation).name;

      function showReflection(trial) {
        if (!sessionReflections || !app.running || app.paused || reflectionTrial || !trial?._answered) return false;
        const generatedProbe = api.generateProbe(trial);
        const subject = trial.conclusion.subject, object = trial.conclusion.object;
        const probe = {
          inference: { ...generatedProbe.spatial,
            question: `Use only the two premises. Where is ${subject} relative to ${object}?`,
            answer: generatedProbe.spatial.expectedRelation },
          counterfactual: { ...generatedProbe.counterfactual,
            question: `Reverse the compass direction in BOTH premises, keeping every letter, aspect and the candidate fixed. Where would ${subject} be relative to ${object}? This changes the spatial facts; it does not merely reverse the wording.`,
            answer: generatedProbe.counterfactual.expectedRelation },
          options: core.allowedCodes(trial.directionResolution)
        };
        clearModeTwoTimer();
        modeTwoPhase = 'reflection';
        modeTwoPresentation += 1;
        reflectionTrial = trial;
        trial.reflection = { scored: false, shown: true };
        app.awaiting = false;
        setBinaryButtons(false);
        app.beginSessionPause?.();
        try { app.stopDelta?.(); } catch (_) {}
        reflectionPanel.replaceChildren();
        reflectionPanel.hidden = false;
        const heading = makeElement('h3', 'Imagination practice — session clock paused', reflectionPanel);
        heading.id = 'mode-two-reflection-title';
        heading.tabIndex = -1;
        makeElement('p', 'These practice answers are separate from your N-back score. You can continue without answering or writing.', reflectionPanel);
        const stimulus = makeElement('p', renderOntologicalTrial(trial), reflectionPanel, 'mode-two-reflection-stimulus');
        stimulus.hidden = Boolean(app.settings().audioOnly && !app._speechUnavailable && app.synth
          && typeof rootObject.SpeechSynthesisUtterance === 'function' && Number(app.settings().volume) > 0);
        const [first, second] = DOMAIN_PAIRS[Math.max(0, domainBlock) % DOMAIN_PAIRS.length];
        makeElement('p', `Reconstruct this problem as ${first}, then as ${second}. Preserve the same entities, endpoint operations, perspectives, relations and any inner worlds. Spatial direction alone does not imply cause.`, reflectionPanel);
        const fields = [];
        for (const [index, item] of [probe.inference, probe.counterfactual].entries()) {
          const fieldset = makeElement('fieldset', '', reflectionPanel);
          makeElement('legend', index ? '2. Change both clues' : '1. Follow the spatial clues', fieldset);
          const label = makeElement('label', item.question, fieldset);
          const select = makeElement('select', '', fieldset);
          select.id = `mode-two-practice-${index}`;
          label.htmlFor = select.id;
          const empty = makeElement('option', 'Choose a direction', select);
          empty.value = '';
          for (const option of probe.options) {
            const value = typeof option === 'string' ? option : option.value;
            const entry = makeElement('option', typeof option === 'string' ? relationName(option) : option.label, select);
            entry.value = value;
          }
          fields.push({ select, item });
        }
        const controls = makeElement('div', '', reflectionPanel, 'mode-two-practice-actions');
        const check = makeElement('button', 'Check practice answers', controls);
        check.type = 'button';
        const read = makeElement('button', 'Read practice aloud', controls);
        read.type = 'button';
        const result = makeElement('p', '', reflectionPanel);
        result.id = 'mode-two-practice-feedback';
        result.setAttribute('role', 'status');
        const notes = [];
        for (const [id, title] of [['mapping', 'Your cross-domain mapping (optional)'], ['boundary', 'Where does your analogy stop working? (optional)']]) {
          const label = makeElement('label', title, reflectionPanel);
          const textarea = makeElement('textarea', '', reflectionPanel);
          textarea.id = `mode-two-practice-${id}`;
          textarea.rows = 3;
          textarea.maxLength = 4000;
          label.htmlFor = textarea.id;
          notes.push(textarea);
        }
        makeElement('p', 'Notes stay in this open session on this device. They are not graded or saved to session history.', reflectionPanel);
        const continueButton = makeElement('button', 'Continue training', reflectionPanel);
        continueButton.id = 'mode-two-practice-continue';
        continueButton.type = 'button';
        const savePractice = () => {
          trial.reflection = {
            ...(trial.reflection || {}),
            domainPair: [first, second],
            inferenceResponse: fields[0].select.value || null,
            counterfactualResponse: fields[1].select.value || null,
            mappingNotes: notes[0].value,
            boundaryNotes: notes[1].value,
            scored: false
          };
        };
        notes.forEach(note => note.addEventListener('input', savePractice));
        fields.forEach(({ select }) => select.addEventListener('change', savePractice));
        check.addEventListener('click', () => {
          if (!app.running || app.paused || reflectionTrial !== trial) return;
          savePractice();
          const answers = fields.map(({ select, item }) => select.value ? select.value === item.answer : null);
          // Keep the first submitted answer for each question as the measured
          // practice result. Further attempts still receive helpful feedback.
          for (const [index, key] of ['inference', 'counterfactual'].entries()) {
            if (fields[index].select.value && !trial.reflection[`${key}CheckedResponse`]) {
              trial.reflection[`${key}CheckedResponse`] = fields[index].select.value;
              trial.reflection[`${key}Correct`] = answers[index];
            }
          }
          trial.reflection.checked = true;
          result.textContent = fields.map(({ item }, index) => answers[index] === null
            ? `${index + 1}. Choose a direction to check this question.`
            : `${index + 1}. ${answers[index] ? 'Correct' : 'Try again'} — ${relationName(item.answer)}. ${item.explanation || ''}`).join(' ');
        });
        read.addEventListener('click', async () => {
          if (!app.running || app.paused || reflectionTrial !== trial) return;
          app.primeAudioFromUserGesture?.();
          const speech = ++reflectionSpeech;
          read.disabled = true;
          try { await app.speak?.(`${renderOntologicalTrial(trial)} Practice question one. ${probe.inference.question} Practice question two. ${probe.counterfactual.question}`); } catch (_) {}
          if (speech === reflectionSpeech && reflectionTrial === trial && !app.paused) read.disabled = false;
        });
        continueButton.addEventListener('click', () => {
          if (!app.running || app.paused || reflectionTrial !== trial) return;
          savePractice();
          trial.reflection.completed = true;
          try { app.cancelSpeech?.(); } catch (_) {}
          hideReflection();
          app.endSessionPause?.();
          modeTwoPhase = 'advance';
          try { app.syncDelta?.(); } catch (_) {}
          updateDomainCue();
          app.nextTrial(app.sessionToken);
        });
        heading.focus({ preventScroll: true });
        reflectionPanel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        return true;
      }

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
      const hideWarmupContinue = () => {
        manualWarmup = false;
        warmupContinue.hidden = true;
        warmupContinue.disabled = true;
      };
      warmupContinue.addEventListener('click', () => {
        if (!app.running || app.paused || modeTwoPhase !== 'warmup' || !manualWarmup) return;
        hideWarmupContinue();
        modeTwoPhase = 'advance';
        app.nextTrial(app.sessionToken);
      });

      function scheduleAdvance(token, milliseconds) {
        clearModeTwoTimer();
        modeTwoAdvanceTimer = rootObject.setTimeout(() => {
          modeTwoAdvanceTimer = null;
          if (app.running && !app.paused && token === app.sessionToken) {
            if (modeTwoPhase === 'reflection') return;
            if (modeTwoPhase === 'feedback' && sessionReflections && Number(app.score.scored || 0) % 6 === 0
              && app.current?._answered && !app.current.reflection?.completed) {
              try { showReflection(app.current); } catch (error) { failSession(error); }
              return;
            }
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
        hideWarmupContinue();
        const rendered = renderOntologicalTrial(trial);
        if (premiseDisplay) {
          premiseDisplay.textContent = rendered;
          premiseDisplay.setAttribute('aria-label', rendered);
        }
        app.applyPremiseVisibility?.();
        let speechResult;
        try { speechResult = await app.speak?.(rendered); } catch (_) { speechResult = false; }
        // Cancelling speech is asynchronous in several browsers. An old speech
        // completion must not open answers after pause/resume or restart.
        if (presentation !== modeTwoPresentation || !app.running || app.paused
          || token !== app.sessionToken || app.current !== trial) return trial;
        if (trial.nBackWarmup || !trial.scored) {
          modeTwoPhase = 'warmup';
          manualWarmup = speechResult === false || Number(app.settings().volume) <= 0 || Boolean(app._speechUnavailable);
          if (feedback) feedback.textContent = `MEMORY FILL — ${app.trials.length} OF ${trial.nBackLevel} · UNSCORED${manualWarmup ? ' · Continue when ready' : ''}`;
          if (manualWarmup) {
            warmupContinue.hidden = false;
            warmupContinue.disabled = false;
          } else scheduleAdvance(token, 900);
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
        if (modeTwoSettings) modeTwoSettings.hidden = mode !== 1;
        if (complexitySelect) complexitySelect.disabled = Boolean(app.running);
        if (reflectionsCheckbox) reflectionsCheckbox.disabled = Boolean(app.running);
        domainCue.hidden = mode !== 1;
        if (mode !== 1) reflectionPanel.hidden = true;
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
            : 'Choose 4, 8 or 16 directions. Match the complete endpoint-bound ontology and spatial structure N trials back, including inner worlds when selected.';
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
              : 'Mode 2 uses close structural lures: a compass relation, endpoint category, perspective, aspect binding or a feature inside an inner world can change. Inspect every scored part under one consistent entity mapping.';
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
            interferenceLevel: modeTwoInterference(),
            complexity: this.running ? sessionComplexity : selectedComplexity()
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
          interferenceLevel: modeTwoInterference(),
          complexity: this.running ? sessionComplexity : selectedComplexity()
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
          sessionComplexity = selectedComplexity();
          sessionReflections = selectedReflections();
          domainBlock = -1;
          hideReflection();
          hideWarmupContinue();
          modeTwoPresentation += 1;
          modeTwoPhase = 'idle';
          responsePausedAt = null;
          this.trials = [];
          this.current = null;
          this.awaiting = false;
          warmupContinue.disabled = true;
          setBinaryButtons(false);
        }
        const result = modeOneStart(...args);
        if (selectedMode() === 1) updateDomainCue();
        syncInterface();
        return result;
      };

      app.nextTrial = async function routedFinalNextTrial(token = this.sessionToken) {
        if (selectedMode() === 0) return modeOneNextTrial(token);
        if (!this.running || this.paused || token !== this.sessionToken) return null;
        if (modeTwoPhase === 'reflection') return this.current;
        if (this.current && !this.current._answered
          && ['speaking', 'response', 'warmup'].includes(modeTwoPhase)) return this.current;
        clearModeTwoTimer();
        if (Math.floor(Number(this.score.scored || 0) / 6) !== domainBlock) updateDomainCue();
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
        if (!this.running || this.paused || modeTwoPhase !== 'response' || !this.awaiting || !trial || trial._answered) return false;
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
          const target = this.trials[this.trials.length - 1 - trial.nBackLevel];
          let comparison;
          try { comparison = target ? api.compare(target, trial) : null; } catch (_) {}
          const mapping = comparison?.alignment?.mapping || comparison?.mapping || comparison?.letterMap || comparison?.entityMap;
          const mappingText = mapping ? ` Entity key: ${Object.entries(mapping).map(([from, to]) => `${from} → ${to}`).join(', ')}.` : '';
          const reasons = {
            spatial: 'A compass relationship differs.', relation: 'A compass relationship differs.',
            category: 'An endpoint operation differs.', perspective: 'An endpoint perspective differs.',
            binding: 'The same aspects are attached to different relationship roles.',
            facet: 'An aspect is attached to a different relationship role.',
            'facet-role': 'The same aspects have exchanged their relationship roles.',
            nested: 'A scored feature inside an inner world differs.',
            inner: 'An inner-world structure differs.', world: 'An inner-world structure differs.',
            gate: 'An inner-world activation rule differs.'
          };
          const kind = String(trial.lureKind || '');
          const reason = reasons[kind] || (kind ? `Changed feature: ${kind.replace(/[-_]/g, ' ')}.` : 'No one consistent entity mapping preserves every required part.');
          explanation.textContent = `${expected ? 'MATCH' : 'NO MATCH'} — compared with ${trial.nBackLevel} trial${trial.nBackLevel === 1 ? '' : 's'} back. ${expected ? 'One entity mapping preserves the endpoint operations, perspectives, relationship roles, compass links and any inner worlds.' : reason}${mappingText}`;
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
        // Reflection already owns the session-clock pause. A manual pause in
        // that phase must neither start another pause nor end the existing one.
        if (modeTwoPhase !== 'reflection') {
          if (this.paused) this.endSessionPause?.();
          else this.beginSessionPause?.();
        }
        this.paused = !this.paused;
        pausedOverlay?.classList.toggle('show', this.paused);
        if (pauseButton) pauseButton.textContent = this.paused ? 'Resume' : 'Pause';
        if (this.paused) {
          clearModeTwoTimer();
          modeTwoPresentation += 1;
          reflectionSpeech += 1;
          responsePausedAt = modeTwoPhase === 'response' ? now() : null;
          this.awaiting = false;
          warmupContinue.disabled = true;
          try {
            if (this.cancelSpeech) this.cancelSpeech();
            else this.synth?.cancel();
          } catch (_) {}
          try { this.stopDelta?.(); } catch (_) {}
          setBinaryButtons(false);
        } else {
          try { this.synth?.resume(); } catch (_) {}
          if (modeTwoPhase !== 'reflection') { try { this.syncDelta?.(); } catch (_) {} }
          if (modeTwoPhase === 'reflection') {
            reflectionPanel.querySelectorAll('button').forEach(button => { button.disabled = false; });
          }
          if (modeTwoPhase === 'response' && this.current && !this.current._answered) {
            if (responsePausedAt !== null && Number.isFinite(this.current.started)) {
              this.current.started += now() - responsePausedAt;
            }
            this.awaiting = true;
            setBinaryButtons(true);
          } else if (modeTwoPhase === 'speaking' && this.current) {
            presentTrial(this.current, this.sessionToken);
          } else if (modeTwoPhase === 'warmup') {
            if (manualWarmup) warmupContinue.disabled = false;
            else scheduleAdvance(this.sessionToken, 900);
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
        hideReflection();
        hideWarmupContinue();
        const result = modeOneStop(...args);
        if (preservedResolution) directionSelect.value = String(preservedResolution);
        setBinaryButtons(false);
        syncInterface();
        return result;
      };

      if (originalSessionSummary) app.getSessionSummary = function modeTwoSessionSummary(...args) {
        const summary = originalSessionSummary(...args);
        if (Number(summary.mode) !== 1) return summary;
        const practice = (this.trials || []).map(trial => trial.reflection).filter(Boolean);
        return {
          ...summary,
          modeTwoVersion: 22,
          modeTwoComplexity: sessionComplexity,
          practiceEnabled: sessionReflections,
          reflectionCount: practice.length,
          practiceBreaksCompleted: practice.filter(item => item.completed).length,
          practiceChecks: practice.reduce((count, item) => count + Number(Boolean(item.inferenceCheckedResponse)) + Number(Boolean(item.counterfactualCheckedResponse)), 0),
          practiceCorrect: practice.reduce((count, item) => count + Number(item.inferenceCorrect === true) + Number(item.counterfactualCorrect === true), 0)
        };
      };
      if (originalSyncDelta) app.syncDelta = function modeTwoReflectionBackground(...args) {
        if (selectedMode() === 1 && modeTwoPhase === 'reflection') return this.stopDelta?.();
        return originalSyncDelta(...args);
      };
      if (originalVisibility) app.applyPremiseVisibility = function modeTwoPracticeVisibility(...args) {
        const result = originalVisibility(...args);
        const stimulus = reflectionPanel.querySelector('.mode-two-reflection-stimulus');
        if (stimulus) stimulus.hidden = Boolean(this.settings().audioOnly && !this._speechUnavailable && this.synth
          && typeof rootObject.SpeechSynthesisUtterance === 'function' && Number(this.settings().volume) > 0);
        return result;
      };

      app.__modeTwoFinalRuntimeV21 = true;
      app.__modeTwoFinalRuntimeV22 = true;
      rootObject.__modeTwoRestorationTestAPI = Object.freeze({
        version: VERSION,
        selectableResolutions: RESOLUTIONS,
        modeTwoBinaryResponsesRestored: true,
        modeTwoGeneratorRoutedAfterModeOneOverrides: true,
        modeTwoInterferenceCustomisable: false,
        modeTwoInterferenceFixedAtMaximum: true,
        modeTwoDirectionResolutionCustomisable: true,
        modeTwoEndpointOntologyScored: true,
        modeTwoPracticeSeparateFromScore: true,
        get phase() { return modeTwoPhase; },
        get sessionComplexity() { return sessionComplexity; },
        get sessionReflections() { return sessionReflections; },
        showReflection,
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
      root.__modeTwoFinalRuntimeV22Error = error;
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
