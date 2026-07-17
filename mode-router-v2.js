'use strict';

/*
 * Public mode router v3
 *
 * Mode 1: Triadic Entailment. Two letter-bound premises define a relational
 * graph under an explicit logical contract. The third statement is a MATCH
 * only when it is the exact necessary relation licensed by that contract.
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
  const currentN = document.getElementById('current-n');
  const currentNHint = currentN?.parentElement;
  const explanation = document.getElementById('trial-explanation');
  if (!app || !core || !select) return;

  const clone = value => JSON.parse(JSON.stringify(value));
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

  app.settings = function settingsWithTriadicEntailment() {
    const settings = legacy.settings();
    const mode = settings.mode === 1 ? 1 : 0;
    return { ...settings, mode, n: mode === 0 ? 1 : settings.n };
  };

  app.deriveTrial = function deriveRoutedTrial(trial) {
    if (inLegacyModeTwo) return legacy.deriveTrial(trial);
    if (trial?.mode === 0) return core.hydrateTrial(trial);
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
        interferenceLevel: Number(document.getElementById('interference-slider')?.value) || 0,
        contract: target.contractId
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
      return core.generateTrial(this.rng, {
        matchProbability: settings.matchProbability,
        interferenceLevel: Number(document.getElementById('interference-slider')?.value) || 0
      });
    }
    if (settings.mode === 1) {
      return externaliseModeTwo(withLegacyModeTwo(() => legacy.makeTrial()));
    }
    return legacy.makeTrial();
  };

  app.matchSignature = function routedMatchSignature(trial, mode = trial?.mode) {
    if (Number(mode) === 0) {
      const result = core.evaluateTrial(trial);
      return [
        'M0-TRIADIC-ENTAILMENT-V2',
        result.contract.id,
        `VALID:${Number(result.isEntailed)}`,
        `POSSIBLE:${result.possibleRelations.join(',')}`,
        `CLASS:${result.distinctionClass}`
      ].join('|');
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

  app.answer = function answerWithTriadicExplanation(response) {
    const trial = this.current;
    const shouldExplain = Boolean(
      trial?.mode === 0 && this.running && !this.paused && this.awaiting
    );
    const result = legacy.answer(response);
    if (shouldExplain && explanation) {
      explanation.textContent = core.explainTrial(trial);
      explanation.classList.add('show');
    }
    return result;
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
        if (currentNHint) currentNHint.innerHTML = 'CURRENT STRUCTURE: <span id="current-n">TRIAD</span>';
      } else {
        nSlider.disabled = false;
        nSlider.removeAttribute('aria-disabled');
        nSlider.value = nSlider.dataset.modeTwoValue || nSlider.value || '1';
        if (nLabel) nLabel.innerHTML = 'N-back distance: <span id="n-val"></span>';
        if (currentNHint) currentNHint.innerHTML = 'CURRENT N: <span id="current-n">1</span>';
      }
    }
    if (interferenceHelp) {
      interferenceHelp.textContent = mode === 0
        ? 'Controls logical-contract depth and meta-distinction: four-, eight- and sixteen-way resolution; inverse wording; letter-role binding; adjacent directions; equal versus unspecified distances; and necessary versus merely possible conclusions.'
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
        ? 'Contract: equal-unit vectors; exact eight-way direction. A is west of J; J is north of P; P is southeast of A.'
        : 'Inner Division U; east to Outer Multiplication M; north to Connection R.';
      app.speak(premise);
    });
  }

  const audit = core.runAudit(8192);
  if (!audit.passed) console.error('Mode 1 Triadic Entailment audit failed', audit);

  window.__modeOneTriadicEntailmentTestAPI = {
    version: 2,
    ...core,
    exhaustiveAudit: audit,
    selfTestPassed: audit.passed,
    lettersDriveRelationalComputation: true,
    thirdRelationIsTestedConclusion: true,
    modelSetEvaluation: true,
    logicalContracts: true,
    scoringIdentity: 'exact necessary entailment of the third letter-relation under the active logical contract',
    directionalResolutions: [4, 8, 16]
  };
  window.__modeOneSpatialTestAPI = window.__modeOneTriadicEntailmentTestAPI;

  window.__modeReleaseTestAPI = {
    version: 3,
    activeModes: [0, 1],
    selectableModes: [...select.options].filter(option => !option.disabled).map(option => Number(option.value)),
    futureModesDisabled: [...select.options].slice(2).every(option => option.disabled)
  };

  syncModeInterface();
});
