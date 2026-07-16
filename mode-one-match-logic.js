'use strict';

/*
 * Mode 1 match-logic bridge
 *
 * IMAGI-WORLD separates three things which must not be conflated:
 *   1. the rendered surface premise;
 *   2. the complete internal logic used for interference/lure selection; and
 *   3. the abstract logical identity used for N-back MATCH scoring.
 *
 * Ontological Worlds previously used the complete raw triad as both (2) and
 * (3). That made MATCH reducible to repeated ontology/form/direction templates.
 * This layer preserves the complete signature for interference, but scores
 * Mode 1 on the derived integrated identity produced by the triad:
 *
 *   integrated ontology + integrated form
 *
 * Consequently, two trials can MATCH while all three displayed ontologies,
 * forms and both directions differ. The user must integrate the trial; surface
 * repetition no longer supplies the answer.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const ontology = window.__ontologyTestAPI;
  const interference = window.__modeOneInterferenceTestAPI;
  if (!app || !ontology || !interference) return;

  const DIRS = ['N', 'E', 'S', 'W'];
  const FORMS = ['I', 'O', 'A'];
  const CATEGORY_IDS = ontology.categories.map(item => item.id);
  const clone = value => JSON.parse(JSON.stringify(value));

  function modeOneMatchSignature(trial) {
    if (!trial || trial.mode !== 0) return trial?.signature || '';
    if (!trial.integratedCategory || !trial.integratedForm) {
      throw new Error('Mode 1 trial is missing its integrated logical result.');
    }
    return `M0-INTEGRATED|${trial.integratedCategory}|${trial.integratedForm}`;
  }

  function attachSignatures(trial) {
    if (!trial || trial.mode !== 0) return trial;
    // `signature` remains the complete triadic logic signature used by the
    // interference engine. MATCH uses the separate derived identity below.
    trial.fullLogicSignature = trial.signature;
    trial.matchSignature = modeOneMatchSignature(trial);
    return trial;
  }

  function sameMatchIdentity(first, second) {
    return modeOneMatchSignature(first) === modeOneMatchSignature(second);
  }

  function displayedTemplate(trial) {
    return [
      ...trial.nodes.flatMap(node => [node.categoryId, node.form]),
      ...trial.dirs
    ].join('|');
  }

  function profileComparison(candidate, target) {
    return interference.compareLogic(candidate, target);
  }

  function desiredTargetSimilarity(level) {
    // Both MATCH and NO-MATCH candidates are selected around the same target
    // similarity. This prevents raw template similarity from leaking the answer,
    // especially at N=1 where the immediately previous trial is the target.
    const ratio = Math.max(0, Math.min(1, level / 100));
    return 0.34 + 0.48 * ratio;
  }

  function candidateAssessment(candidate, target, level) {
    const comparison = profileComparison(candidate, target);
    const desired = desiredTargetSimilarity(level);
    const displayedChanges = candidate.nodes.reduce((count, node, index) => {
      const other = target.nodes[index];
      return count + Number(node.categoryId !== other.categoryId) + Number(node.form !== other.form);
    }, 0) + candidate.dirs.reduce((count, direction, index) => {
      return count + Number(direction !== target.dirs[index]);
    }, 0);

    const derivedChanges = [
      'leftRelationCategory',
      'rightRelationCategory',
      'nodeSynthesisCategory',
      'relationSynthesisCategory'
    ].reduce((count, key) => count + Number(candidate[key] !== target[key]), 0);

    // Primary objective: equalise full-logic similarity between answer classes.
    // Secondary objective: avoid same-template "matches" and favour genuine
    // alternative derivations of the same integrated result.
    const distanceError = Math.abs(comparison.similarity - desired);
    const variationBonus = displayedChanges * 0.012 + derivedChanges * 0.018;
    return {
      comparison,
      displayedChanges,
      derivedChanges,
      rank: distanceError - variationBonus
    };
  }

  function selectCalibrated(candidates, target, level) {
    if (!candidates.length) return null;
    const ranked = candidates
      .map(candidate => ({ candidate, assessment: candidateAssessment(candidate, target, level) }))
      .sort((a, b) => a.assessment.rank - b.assessment.rank);

    const ratio = Math.max(0, Math.min(1, level / 100));
    const span = Math.max(1, Math.ceil(ranked.length * (0.22 - 0.17 * ratio)));
    const selected = ranked[Math.floor(app.rng.next() * span)];
    return { ...selected, candidate: selected.candidate };
  }

  function formTriplesFor(resultForm) {
    const triples = [];
    FORMS.forEach(first => FORMS.forEach(middle => FORMS.forEach(last => {
      const forms = [first, middle, last];
      if (ontology.composeForms(forms) === resultForm) triples.push(forms);
    })));
    return app.rng.shuffle(triples);
  }

  function directionPairs() {
    const pairs = [];
    DIRS.forEach(first => DIRS.forEach(second => {
      // Mode 1 deliberately requires a real higher-order turn.
      if (first !== second) pairs.push([first, second]);
    }));
    return app.rng.shuffle(pairs);
  }

  function categoryTriples() {
    const triples = [];
    CATEGORY_IDS.forEach(first => CATEGORY_IDS.forEach(middle => CATEGORY_IDS.forEach(last => {
      if (first !== middle && first !== last && middle !== last) {
        triples.push([first, middle, last]);
      }
    })));
    return app.rng.shuffle(triples);
  }

  function buildLogicalMatchVariant(target, level) {
    attachSignatures(target);
    const targetIdentity = target.matchSignature;
    const targetTemplate = displayedTemplate(target);
    const candidates = [];
    const forms = formTriplesFor(target.integratedForm);
    const categories = categoryTriples();
    const dirs = directionPairs();

    // Exhaustive finite search over category triples and cardinal turns, with
    // form triples restricted only by the required integrated form. Stop once a
    // large, diverse candidate pool exists; no clone of the target is necessary.
    outer:
    for (const categoryIds of categories) {
      for (const directions of dirs) {
        const formOrder = forms[(candidates.length + categoryIds[0].length) % forms.length];
        const trial = app.deriveTrial({
          mode: 0,
          nodes: categoryIds.map((categoryId, index) => ({
            symbol: ['X', 'Y', 'Z'][index],
            categoryId,
            form: formOrder[index],
            memory: null
          })),
          dirs: [...directions]
        });
        attachSignatures(trial);

        if (trial.matchSignature !== targetIdentity) continue;
        if (trial.fullLogicSignature === target.fullLogicSignature) continue;
        if (displayedTemplate(trial) === targetTemplate) continue;

        // At least one ontology role and one direction must change. This
        // guarantees that MATCH cannot be solved by noticing a repeated displayed
        // template; it must come from the derived integrated identity.
        const categoryChanges = trial.nodes.reduce((count, node, index) => {
          return count + Number(node.categoryId !== target.nodes[index].categoryId);
        }, 0);
        const formChanges = trial.nodes.reduce((count, node, index) => {
          return count + Number(node.form !== target.nodes[index].form);
        }, 0);
        const directionChanges = trial.dirs.reduce((count, direction, index) => {
          return count + Number(direction !== target.dirs[index]);
        }, 0);
        const displayedChanges = categoryChanges + formChanges + directionChanges;
        if (displayedChanges < 2 || categoryChanges < 1 || directionChanges < 1) continue;

        app.renameSurfaceSymbols(trial);
        app.deriveTrial(trial);
        attachSignatures(trial);
        candidates.push(trial);
        if (candidates.length >= 96) break outer;
      }
    }

    const selected = selectCalibrated(candidates, target, level);
    if (!selected) {
      throw new Error(`Unable to construct a varied Mode 1 logical match for ${targetIdentity}`);
    }

    const trial = selected.candidate;
    trial.interferenceMeta = {
      level,
      mechanism: 'derived-integrated-isomorph',
      targetSimilarity: Number(selected.assessment.comparison.similarity.toFixed(3)),
      highOrderDifference: selected.assessment.comparison.highOrderDifference,
      proactiveExact: false,
      changedDimensions: selected.assessment.comparison.changed.map(item => item.id),
      matchIdentity: trial.matchSignature,
      targetMatchIdentity: target.matchSignature
    };
    return trial;
  }

  function snapshotGenerator() {
    return {
      rngState: app.rng.s,
      categoryDeck: clone(app.categoryDeck || []),
      formDeck: clone(app.formDeck || []),
      turnDeck: clone(app.turnDeck || [])
    };
  }

  function restoreGenerator(snapshot, restoreRng = false) {
    if (restoreRng) app.rng.s = snapshot.rngState;
    app.categoryDeck = snapshot.categoryDeck;
    app.formDeck = snapshot.formDeck;
    app.turnDeck = snapshot.turnDeck;
  }

  const legacySurfaceVariant = app.surfaceVariant.bind(app);
  const legacyMakeTrial = app.makeTrial.bind(app);
  const baseDeriveTrial = app.deriveTrial.bind(app);

  // Ensure every Mode 1 trial, including lures created by earlier layers, carries
  // both its complete logic signature and its abstract N-back match signature.
  app.deriveTrial = function deriveWithSeparatedMatchIdentity(trial) {
    return attachSignatures(baseDeriveTrial(trial));
  };

  app.modeOneMatchSignature = modeOneMatchSignature;

  app.surfaceVariant = function surfaceVariantByDerivedLogic(target) {
    if (target?.mode !== 0) return legacySurfaceVariant(target);
    const level = Math.max(0, Math.min(100,
      Number(document.getElementById('interference-slider')?.value) || 0));
    return buildLogicalMatchVariant(target, level);
  };

  function buildLogicalNonMatch(target, distractors, level) {
    const candidates = [];
    const seen = new Set();
    const snapshot = snapshotGenerator();

    try {
      // Reuse the existing sophisticated lure generator, but classify every
      // candidate using the new derived match identity rather than its raw full
      // signature. Candidates that accidentally integrate to the target result
      // are correctly discarded as MATCHES.
      const legacyAttempts = 6 + Math.round(level / 20);
      const derivedSurfaceVariant = app.surfaceVariant;
      try {
        // Prevent the legacy generator's own MATCH branch from recursively
        // invoking the expensive derived-match search while we are only building
        // a NO-MATCH candidate pool. Its old surface clone is filtered out below.
        app.surfaceVariant = legacySurfaceVariant;
        for (let attempt = 0; attempt < legacyAttempts; attempt += 1) {
          const candidate = attachSignatures(legacyMakeTrial());
          if (!candidate || candidate.mode !== 0) continue;
          if (sameMatchIdentity(candidate, target)) continue;
          if (seen.has(candidate.fullLogicSignature)) continue;
          seen.add(candidate.fullLogicSignature);
          candidates.push(candidate);
        }
      } finally {
        app.surfaceVariant = derivedSurfaceVariant;
      }

      // Add independent logical alternatives so low-interference sessions do not
      // collapse into only near-clone lures.
      const randomAttempts = 18;
      for (let attempt = 0; attempt < randomAttempts; attempt += 1) {
        const candidate = attachSignatures(app.makeBase(0));
        if (sameMatchIdentity(candidate, target)) continue;
        if (seen.has(candidate.fullLogicSignature)) continue;
        seen.add(candidate.fullLogicSignature);
        candidates.push(candidate);
      }
    } finally {
      // Match/non-match pool construction must not consume the balanced category,
      // form and turn decks. RNG progression is retained so trials do not repeat.
      restoreGenerator(snapshot, false);
    }

    if (!candidates.length) {
      for (let attempt = 0; attempt < 1000; attempt += 1) {
        const candidate = attachSignatures(app.makeBase(0));
        if (!sameMatchIdentity(candidate, target)) {
          candidates.push(candidate);
          break;
        }
      }
    }

    const selected = selectCalibrated(candidates, target, level);
    if (!selected) throw new Error('Unable to construct a Mode 1 logical non-match.');

    const trial = selected.candidate;
    const existing = trial.interferenceMeta || {};
    trial.interferenceMeta = {
      ...existing,
      level,
      mechanism: existing.mechanism || 'derived-logic-nonmatch',
      targetSimilarity: Number(selected.assessment.comparison.similarity.toFixed(3)),
      highOrderDifference: selected.assessment.comparison.highOrderDifference,
      proactiveExact: Boolean(existing.proactiveExact),
      changedDimensions: selected.assessment.comparison.changed.map(item => item.id),
      matchIdentity: trial.matchSignature,
      targetMatchIdentity: target.matchSignature,
      distractorMatchIdentities: distractors.map(modeOneMatchSignature)
    };
    return trial;
  }

  app.makeTrial = function makeTrialWithImagiWorldMatchArchitecture() {
    if (this.settings().mode !== 0) return legacyMakeTrial();

    const level = Math.max(0, Math.min(100,
      Number(document.getElementById('interference-slider')?.value) || 0));
    const targetCandidate = this.trials[this.trials.length - this.n];
    const target = targetCandidate?.mode === 0 ? attachSignatures(targetCandidate) : null;

    if (!target) {
      const warmup = attachSignatures(this.makeBase(0));
      warmup.isMatch = false;
      warmup.scored = false;
      warmup.interferenceLevel = level;
      return warmup;
    }

    const distractorStart = Math.max(0, this.trials.length - this.n + 1);
    const distractors = this.trials
      .slice(distractorStart)
      .filter(trial => trial.mode === 0)
      .map(attachSignatures);

    const requestedMatch = this.rng.next() < this.settings().matchProbability;
    const trial = requestedMatch
      ? this.surfaceVariant(target)
      : buildLogicalNonMatch(target, distractors, level);

    attachSignatures(trial);
    const actualMatch = sameMatchIdentity(trial, target);

    // Never trust the generation branch as the answer. As in IMAGI-WORLD, the
    // answer is recomputed from the current and N-back logical signatures.
    if (requestedMatch !== actualMatch) {
      throw new Error('Mode 1 generator produced a trial inconsistent with its derived match signature.');
    }

    trial.isMatch = actualMatch;
    trial.scored = true;
    trial.interferenceLevel = level;
    return trial;
  };

  const failures = [];
  const generatorSnapshot = snapshotGenerator();
  const originalTrials = app.trials;
  try {
    app.trials = [];
    const target = attachSignatures(app.makeBase(0));
    const match = buildLogicalMatchVariant(target, 60);
    if (!sameMatchIdentity(target, match)) failures.push('derived-match-identity');
    if (target.fullLogicSignature === match.fullLogicSignature) failures.push('raw-template-clone');
    if (displayedTemplate(target) === displayedTemplate(match)) failures.push('displayed-template-repeat');

    const renamed = clone(target);
    renamed.nodes[0].symbol = 'X';
    renamed.nodes[1].symbol = 'Y';
    renamed.nodes[2].symbol = 'Z';
    app.deriveTrial(renamed);
    if (!sameMatchIdentity(target, renamed)) failures.push('letters-entered-match-identity');

    let nonMatch = null;
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const candidate = attachSignatures(app.makeBase(0));
      if (!sameMatchIdentity(target, candidate)) {
        nonMatch = candidate;
        break;
      }
    }
    if (!nonMatch) failures.push('nonmatch-construction');
  } catch (error) {
    failures.push(`exception:${error.message}`);
  } finally {
    app.trials = originalTrials;
    restoreGenerator(generatorSnapshot, true);
  }

  if (failures.length) console.error('Mode 1 separated match-logic self-test failed', failures);

  window.__modeOneMatchLogicTestAPI = {
    version: 1,
    matchSignature: modeOneMatchSignature,
    sameMatchIdentity,
    displayedTemplate,
    desiredTargetSimilarity,
    buildLogicalMatchVariant,
    selfTestPassed: failures.length === 0,
    scoringIdentity: 'integrated ontology + integrated form',
    rawTemplateDeterminesMatch: false,
    lettersDetermineMatch: false
  };
});
