'use strict';

/*
 * Public mode router v2
 *
 * Mode 1: triadic spatial entailment. The third letter-relation is a MATCH only
 * when it is logically entailed by the first two letter-bound premises.
 *
 * Mode 2: the previous ontology-category integration engine, preserved intact
 * behind an external mode-number translation from 1 -> its legacy internal 0.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const core = window.__modeOneSpatialCore;
  const select = document.getElementById('logic-mode');
  const nSlider = document.getElementById('n-slider');
  const nLabel = nSlider?.closest('.control-group')?.querySelector('label');
  const interferenceHelp = document.getElementById('interference-help');
  if (!app || !core || !select) return;

  const clone = value => JSON.parse(JSON.stringify(value));
  const legacy = {
    settings: app.settings.bind(app),
    deriveTrial: app.deriveTrial.bind(app),
    makeBase: app.makeBase.bind(app),
    renderTrial: app.renderTrial.bind(app),
    surfaceVariant: app.surfaceVariant.bind(app),
    makeTrial: app.makeTrial.bind(app),
    matchSignature: typeof app.matchSignature === 'function' ? app.matchSignature.bind(app) : null
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
    app.settings = () => ({ ...legacy.settings(), mode: 0 });
    try {
      return operation();
    } finally {
      app.trials = savedTrials;
      app.current = savedCurrent;
      app.settings = savedSettings;
      inLegacyModeTwo = savedFlag;
    }
  }

  app.settings = function settingsWithModeOneEntailment() {
    const settings = legacy.settings();
    const mode = settings.mode === 1 ? 1 : 0;
    return { ...settings, mode, n: mode === 0 ? 1 : settings.n };
  };

  app.deriveTrial = function deriveRoutedTrial(trial) {
    if (inLegacyModeTwo) return legacy.deriveTrial(trial);
    if (trial?.mode === 0) {
      const evaluated = core.evaluateTrial(trial);
      trial.letters = trial.letters || [...new Set([
        ...trial.premises.flatMap(item => [item.subject, item.object]),
        trial.conclusion.subject,
        trial.conclusion.object
      ])];
      trial.symbols = [...trial.letters];
      trial.expectedRelation = evaluated.expectedRelation;
      trial.isEntailed = evaluated.isEntailed;
      trial.isMatch = evaluated.isEntailed;
      trial.scored = true;
      trial.signature = [
        'M0-SPATIAL-ENTAILMENT',
        ...trial.premises.flatMap(item => [item.subject, item.relation, item.object]),
        trial.conclusion.subject,
        trial.conclusion.relation,
        trial.conclusion.object,
        `EXPECTED:${evaluated.expectedRelation}`,
        `VALID:${Number(evaluated.isEntailed)}`
      ].join('|');
      return trial;
    }
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
    if (target?.mode === 0) {
      return core.generateTrial(this.rng, {
        matchProbability: target.isEntailed ? 1 : 0,
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
    if (settings.mode === 0) {
      const trial = core.generateTrial(this.rng, {
        matchProbability: settings.matchProbability,
        interferenceLevel: Number(document.getElementById('interference-slider')?.value) || 0
      });
      trial.mode = 0;
      trial.scored = true;
      return trial;
    }
    if (settings.mode === 1) {
      return externaliseModeTwo(withLegacyModeTwo(() => legacy.makeTrial()));
    }
    return legacy.makeTrial();
  };

  app.matchSignature = function routedMatchSignature(trial, mode = trial?.mode) {
    if (Number(mode) === 0) {
      const evaluated = core.evaluateTrial(trial);
      return `M0-SPATIAL-ENTAILMENT|${Number(evaluated.isEntailed)}|${evaluated.expectedRelation}`;
    }
    if (Number(mode) === 1 && legacy.matchSignature) {
      return withLegacyModeTwo(() => legacy.matchSignature(internaliseModeTwo(trial), 0));
    }
    return trial?.signature || '';
  };

  function syncModeInterface() {
    const mode = Number(select.value) === 1 ? 1 : 0;
    if (nSlider) {
      if (mode === 0) {
        if (!nSlider.dataset.modeTwoValue) nSlider.dataset.modeTwoValue = nSlider.value;
        nSlider.value = '1';
        nSlider.disabled = true;
        nSlider.setAttribute('aria-disabled', 'true');
        if (nLabel) nLabel.innerHTML = 'Mode 1 inference structure: <span id="n-val">two premises + one tested conclusion</span>';
      } else {
        nSlider.disabled = false;
        nSlider.removeAttribute('aria-disabled');
        nSlider.value = nSlider.dataset.modeTwoValue || nSlider.value || '1';
        if (nLabel) nLabel.innerHTML = 'N-back distance: <span id="n-val"></span>';
      }
    }
    if (interferenceHelp) {
      interferenceHelp.textContent = mode === 0
        ? 'Controls meta-distinction difficulty: cardinal through sixteen-way directions, premise inversion, clause order, and near-miss conclusions approaching one 22.5° step from the entailed relation.'
        : 'Controls logical competition between ontology premises: near-miss bindings, topology, outcomes and intervening triads. Symbols remain surface carriers in Mode 2.';
    }
    app.updateLabels();
    app.saveSettings();
  }

  select.addEventListener('change', syncModeInterface);

  const oldTestButton = document.getElementById('premise-test-btn');
  if (oldTestButton) {
    const testButton = oldTestButton.cloneNode(true);
    oldTestButton.replaceWith(testButton);
    testButton.addEventListener('click', () => {
      app.primeAudioFromUserGesture();
      const premise = Number(select.value) === 0
        ? 'A is west of J; J is north of P; P is southeast of A.'
        : 'Inner Division U; east to Outer Multiplication M; north to Connection R.';
      app.speak(premise);
    });
  }

  const audit = core.runAudit(4096);
  if (!audit.passed) console.error('Mode 1 spatial-entailment audit failed', audit);

  window.__modeOneSpatialTestAPI = {
    version: 1,
    ...core,
    exhaustiveAudit: audit,
    selfTestPassed: audit.passed,
    lettersDriveRelationalComputation: true,
    thirdRelationIsTestedConclusion: true,
    scoringIdentity: 'logical entailment of the third letter-relation from the first two premises',
    directionalResolution: 16
  };

  window.__modeReleaseTestAPI = {
    version: 2,
    activeModes: [0, 1],
    selectableModes: [...select.options].filter(option => !option.disabled).map(option => Number(option.value)),
    futureModesDisabled: [...select.options].slice(2).every(option => option.disabled)
  };

  syncModeInterface();
});
