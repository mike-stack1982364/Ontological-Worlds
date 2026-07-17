'use strict';

/*
 * Public mode router v5
 *
 * Mode 1: Triadic Entailment with abstract logical N-back levels 1–8. A current
 * triad matches the triad N positions back when both instantiate the same
 * relational proof/error family. Letter identity and absolute orientation are
 * irrelevant.
 *
 * Mode 2: Ontological Integration. The previous ontology-category engine is
 * preserved intact behind an external mode-number translation from 1 to its
 * legacy internal mode 0.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const core = window.__modeOneTriadicEntailmentCore || window.__modeOneSpatialCore;
  const select = document.getElementById('logic-mode');
  const nSlider = document.getElementById('n-slider');
  const nLabel = nSlider?.closest('.control-group')?.querySelector('label');
  const interferenceHelp = document.getElementById('interference-help');
  const currentNHint = document.getElementById('current-n')?.parentElement;
  const explanation = document.getElementById('trial-explanation');
  if (!app || !core || !select) return;

  const clone = value => JSON.parse(JSON.stringify(value));
  const clampLevel = value => typeof core.clampNBackLevel === 'function'
    ? core.clampNBackLevel(value)
    : Math.max(1, Math.min(8, Math.round(Number(value) || 1)));

  const legacy = {
    settings: app.settings.bind(app),
    deriveTrial: app.deriveTrial.bind(app),
    makeBase: app.makeBase.bind(app),
    renderTrial: app.renderTrial.bind(app),
    surfaceVariant: app.surfaceVariant.bind(app),
    makeTrial: app.makeTrial.bind(app),
    matchSignature: typeof app.matchSignature === 'function' ? app.matchSignature.bind(app) : null,
    nextTrial: app.nextTrial.bind(app),
    answer: app.answer.bind(app)
  };

  let inLegacyModeTwo = false;

  function externaliseModeTwo(trial) {
    if (!trial) return trial;
    const copy = clone(trial);
    copy.mode = 1;
    copy.publicMode = 2;
    return copy;
  }

  function internaliseModeTwo(trial) {
    if (!trial) return trial;
    const copy = clone(trial);
    copy.mode = 0;
    delete copy.publicMode;
    return copy;
  }

  function withLegacyModeTwo(operation) {
    const savedTrials = app.trials;
    const savedCurrent = app.current;
    const savedSettings = app.settings;
    const savedFlag = inLegacyModeTwo;
    inLegacyModeTwo = true;
    app.trials = savedTrials.map(trial => trial?.mode === 1 ? internaliseModeTwo(trial) : trial);
    app.current = savedCurrent?.mode === 1 ? internaliseModeTwo(savedCurrent) : savedCurrent;
    app.settings = () => ({ ...legacy.settings(), mode: 0, n: clampLevel(legacy.settings().n) });
    try {
      return operation();
    } finally {
      app.trials = savedTrials;
      app.current = savedCurrent;
      app.settings = savedSettings;
      inLegacyModeTwo = savedFlag;
    }
  }

  function restoreNBackFields(source, hydrated) {
    if (!source || !hydrated || typeof source.nBackMatch !== 'boolean') return hydrated;
    hydrated.nBackLevel = clampLevel(source.nBackLevel);
    hydrated.nBackWarmup = Boolean(source.nBackWarmup);
    hydrated.nBackTargetFamily = source.nBackTargetFamily;
    hydrated.nBackCurrentFamily = source.nBackCurrentFamily;
    hydrated.nBackTargetSignature = source.nBackTargetSignature;
    hydrated.nBackCurrentSignature = source.nBackCurrentSignature;
    hydrated.nBackRequestedMatch = source.nBackRequestedMatch;
    hydrated.nBackMatch = source.nBackMatch;
    hydrated.withinTrialEntailed = source.withinTrialEntailed ?? hydrated.isEntailed;
    hydrated.withinTrialDistinctionClass = source.withinTrialDistinctionClass ?? hydrated.distinctionClass;
    hydrated.isMatch = source.nBackMatch;
    hydrated.scored = source.scored;
    hydrated.signature = source.nBackCurrentSignature || hydrated.signature;
    return hydrated;
  }

  app.settings = function settingsWithTriadicLogicNBack() {
    const settings = legacy.settings();
    const mode = settings.mode === 1 ? 1 : 0;
    return { ...settings, mode, n: clampLevel(settings.n) };
  };

  app.deriveTrial = function deriveRoutedTrial(trial) {
    if (inLegacyModeTwo) return legacy.deriveTrial(trial);
    if (trial?.mode === 0) return restoreNBackFields(trial, core.hydrateTrial(trial));
    if (trial?.mode === 1) {
      return externaliseModeTwo(withLegacyModeTwo(() => legacy.deriveTrial(internaliseModeTwo(trial))));
    }
    return legacy.deriveTrial(trial);
  };

  app.makeBase = function makeRoutedBase(mode) {
    if (inLegacyModeTwo) return legacy.makeBase(mode);
    if (Number(mode) === 0) {
      return core.generateTrial(this.rng, {
        matchProbability: 0.5,
        interferenceLevel: Number(document.getElementById('interference-slider')?.value) || 0
      });
    }
    if (Number(mode) === 1) {
      return externaliseModeTwo(withLegacyModeTwo(() => legacy.makeBase(0)));
    }
    return legacy.makeBase(mode);
  };

  app.renderTrial = function renderRoutedTrial(trial) {
    if (inLegacyModeTwo) return legacy.renderTrial(trial);
    if (trial?.mode === 0) return core.renderTrial(trial);
    if (trial?.mode === 1) {
      return withLegacyModeTwo(() => legacy.renderTrial(internaliseModeTwo(trial)));
    }
    return legacy.renderTrial(trial);
  };

  app.surfaceVariant = function routedSurfaceVariant(target) {
    if (inLegacyModeTwo) return legacy.surfaceVariant(target);
    if (target?.mode === 0 && typeof core.generateNBackTrial === 'function') {
      return core.generateNBackTrial(this.rng, target, {
        match: true,
        nBackLevel: clampLevel(this.n),
        interferenceLevel: Number(document.getElementById('interference-slider')?.value) || 0
      });
    }
    if (target?.mode === 1) {
      return externaliseModeTwo(withLegacyModeTwo(() => legacy.surfaceVariant(internaliseModeTwo(target))));
    }
    return legacy.surfaceVariant(target);
  };

  app.makeTrial = function makeRoutedTrial() {
    if (inLegacyModeTwo) return legacy.makeTrial();
    const settings = this.settings();
    const level = clampLevel(this.n || settings.n);
    this.n = level;

    if (settings.mode === 0) {
      const interferenceLevel = Number(document.getElementById('interference-slider')?.value) || 0;
      const target = this.trials[this.trials.length - level];
      if (!target) {
        return core.generateNBackWarmupTrial(this.rng, {
          nBackLevel: level,
          interferenceLevel
        });
      }
      const requestedMatch = this.rng.next() < settings.matchProbability;
      return core.generateNBackTrial(this.rng, target, {
        match: requestedMatch,
        nBackLevel: level,
        interferenceLevel
      });
    }

    if (settings.mode === 1) {
      return externaliseModeTwo(withLegacyModeTwo(() => legacy.makeTrial()));
    }
    return legacy.makeTrial();
  };

  app.matchSignature = function routedMatchSignature(trial, mode = trial?.mode) {
    if (Number(mode) === 0 && typeof core.nBackLogicSignature === 'function') {
      return core.nBackLogicSignature(trial);
    }
    if (Number(mode) === 1 && legacy.matchSignature) {
      return withLegacyModeTwo(() => legacy.matchSignature(internaliseModeTwo(trial), 0));
    }
    return trial?.signature || '';
  };

  app.nextTrial = async function nextTrialWithSeparateExplanation(...args) {
    if (explanation) {
      explanation.textContent = '';
      explanation.classList.remove('show');
    }
    return legacy.nextTrial(...args);
  };

  app.answer = function answerWithTriadicNBackExplanation(response) {
    const trial = this.current;
    const shouldExplain = Boolean(trial?.mode === 0 && this.running && !this.paused && this.awaiting);
    const result = legacy.answer(response);

    this.n = clampLevel(this.n);
    if (nSlider) nSlider.value = String(this.n);
    const currentValue = document.getElementById('current-n');
    if (currentValue) currentValue.textContent = String(this.n);

    if (shouldExplain && explanation) {
      explanation.textContent = typeof core.explainNBackTrial === 'function'
        ? core.explainNBackTrial(trial)
        : core.explainTrial(trial);
      explanation.classList.add('show');
    }
    return result;
  };

  function syncModeInterface() {
    const mode = Number(select.value) === 1 ? 1 : 0;
    if (nSlider) {
      nSlider.min = '1';
      nSlider.max = '8';
      nSlider.step = '1';
      nSlider.value = String(clampLevel(nSlider.value));
      nSlider.disabled = false;
      nSlider.removeAttribute('aria-disabled');
      nSlider.setAttribute('aria-valuemin', '1');
      nSlider.setAttribute('aria-valuemax', '8');
      nSlider.setAttribute('aria-valuetext', `N-back level ${nSlider.value}`);
      if (nLabel) nLabel.innerHTML = 'N-back level: <span id="n-val"></span>';
      if (currentNHint) currentNHint.innerHTML = `CURRENT N-BACK LEVEL: <span id="current-n">${nSlider.value}</span>`;
    }

    if (interferenceHelp) {
      interferenceHelp.textContent = mode === 0
        ? 'Controls relational precision and surface transformation while N-back level 1–8 controls how far back the abstract proof family must be compared. Letters and absolute directions never define a match.'
        : 'Controls logical competition between ontology premises. N-back level 1–8 sets the comparison distance for integrated ontology identity.';
    }
    app.updateLabels();
    app.saveSettings();
  }

  nSlider?.addEventListener('input', () => {
    nSlider.value = String(clampLevel(nSlider.value));
    nSlider.setAttribute('aria-valuetext', `N-back level ${nSlider.value}`);
    if (!app.running) app.n = clampLevel(nSlider.value);
  });
  select.addEventListener('change', syncModeInterface);

  const oldTestButton = document.getElementById('premise-test-btn');
  if (oldTestButton) {
    const testButton = oldTestButton.cloneNode(true);
    oldTestButton.replaceWith(testButton);
    testButton.addEventListener('click', () => {
      app.primeAudioFromUserGesture();
      const premise = Number(select.value) === 0
        ? 'A is west of B; B is north of C; C is southeast of A.'
        : 'Inner Division U; east to Outer Multiplication M; north to Connection R.';
      app.speak(premise);
    });
  }

  const audit = core.runAudit(8192);
  if (!audit.passed) console.error('Mode 1 Triadic Entailment audit failed', audit);

  window.__modeOneTriadicEntailmentTestAPI = {
    version: 8,
    ...core,
    exhaustiveAudit: audit,
    selfTestPassed: audit.passed,
    lettersDriveRelationalComputation: true,
    letteringIdentityIgnored: true,
    thirdRelationIsTestedConclusion: true,
    modelSetEvaluation: false,
    logicalContracts: false,
    visibleContractText: false,
    nBackEnabled: true,
    nBackLevels: [1, 2, 3, 4, 5, 6, 7, 8],
    nBackMatchIdentity: 'abstract approved relational proof and error family, invariant under lettering and lawful global transformations',
    scoringIdentity: 'logical-family equivalence with the triad N positions back',
    directionalResolution: 16,
    directionPools: [4, 8, 16]
  };
  window.__modeOneSpatialTestAPI = window.__modeOneTriadicEntailmentTestAPI;

  window.__modeReleaseTestAPI = {
    version: 5,
    activeModes: [0, 1],
    selectableModes: [...select.options].filter(option => !option.disabled).map(option => Number(option.value)),
    futureModesDisabled: [...select.options].slice(2).every(option => option.disabled)
  };

  syncModeInterface();
});
