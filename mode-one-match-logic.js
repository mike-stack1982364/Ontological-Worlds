'use strict';

/*
 * Mode 1 match architecture — IMAGI-WORLD parity layer (v2)
 *
 * IMAGI-WORLD separates:
 *   1. the rendered surface premise;
 *   2. the complete internal logic used for interference;
 *   3. the abstract match signature compared N trials back.
 *
 * Ontological Worlds now follows that architecture exactly. Mode 1's abstract
 * identity is the result of integrating all three transformed nodes and both
 * cardinal transitions:
 *
 *   integrated ontology + integrated form
 *
 * Letters never enter the signature. MATCH and NO MATCH are generated from
 * signature equality/inequality, selected as a cue-balanced pair, and the final
 * answer is recomputed from the two signatures rather than trusted from the
 * generation branch.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const ontology = window.__ontologyTestAPI;
  const interference = window.__modeOneInterferenceTestAPI;
  if (!app || !ontology || !interference) return;

  const DIRS = ['N', 'E', 'S', 'W'];
  const FORMS = ['I', 'O', 'A'];
  const CATEGORY_IDS = ontology.categories.map(item => item.id);
  const ALL_IDENTITIES = CATEGORY_IDS.flatMap(categoryId =>
    FORMS.map(form => ({ categoryId, form }))
  );
  const clone = value => JSON.parse(JSON.stringify(value));

  const baseDeriveTrial = app.deriveTrial.bind(app);
  const legacySurfaceVariant = app.surfaceVariant.bind(app);
  const legacyMakeTrial = app.makeTrial.bind(app);

  function modeOneMatchSignature(trial) {
    if (!trial || trial.mode !== 0) return trial?.signature || '';
    if (!trial.integratedCategory || !trial.integratedForm) {
      throw new Error('Mode 1 trial is missing its integrated logical result.');
    }
    return `M0-INTEGRATED|${trial.integratedCategory}|${trial.integratedForm}`;
  }

  function matchSignature(trial, mode = trial?.mode) {
    return Number(mode) === 0 ? modeOneMatchSignature(trial) : (trial?.signature || '');
  }

  function attachSignatures(trial) {
    if (!trial || trial.mode !== 0) return trial;
    trial.fullLogicSignature = trial.signature;
    trial.matchSignature = modeOneMatchSignature(trial);
    return trial;
  }

  function sameMatchIdentity(first, second) {
    return matchSignature(first, 0) === matchSignature(second, 0);
  }

  function displayedTemplate(trial) {
    return [
      ...trial.nodes.flatMap(node => [node.categoryId, node.form]),
      ...trial.dirs
    ].join('|');
  }

  function stripRuntime(trial) {
    const copy = clone(trial);
    [
      'isMatch', 'scored', 'started', '_answered', 'interferenceMeta',
      '_modeOneLureKind', 'fullLogicSignature', 'matchSignature'
    ].forEach(key => delete copy[key]);
    return copy;
  }

  function axis(direction) {
    return direction === 'N' || direction === 'S' ? 'V' : 'H';
  }

  /*
   * Port of IMAGI-WORLD's directional-conflict principle:
   * perpendicular changes require axis re-derivation; identical/opposite changes
   * are simple restatement/inversion cues and receive zero.
   */
  function directionalConflictScore(candidate, reference) {
    if (!candidate || !reference) return 0;
    const pairScore = (first, second) =>
      first && second && axis(first) !== axis(second) ? 1 : 0;
    return candidate.dirs.reduce((score, direction, index) => {
      return score + pairScore(direction, reference.dirs[index]);
    }, 0);
  }

  function categoryMatches(candidate, target) {
    return candidate.nodes.reduce((count, node, index) =>
      count + Number(node.categoryId === target.nodes[index].categoryId), 0);
  }

  function formMatches(candidate, target) {
    return candidate.nodes.reduce((count, node, index) =>
      count + Number(node.form === target.nodes[index].form), 0);
  }

  function directionMatches(candidate, target) {
    return candidate.dirs.reduce((count, direction, index) =>
      count + Number(direction === target.dirs[index]), 0);
  }

  function displayedChanges(candidate, target) {
    return 8 - categoryMatches(candidate, target)
      - formMatches(candidate, target)
      - directionMatches(candidate, target);
  }

  function cueProfile(candidate, target, previous) {
    const comparison = interference.compareLogic(candidate, target);
    return {
      similarity: comparison.similarity,
      constituentSimilarity: comparison.constituentSimilarity,
      relationalSimilarity: comparison.relationalSimilarity,
      synthesisSimilarity: comparison.synthesisSimilarity,
      directionalConflict: directionalConflictScore(candidate, previous),
      categoryMatches: categoryMatches(candidate, target),
      formMatches: formMatches(candidate, target),
      directionMatches: directionMatches(candidate, target),
      turnMatch: Number(candidate.turns[0] === target.turns[0]),
      displayedChanges: displayedChanges(candidate, target),
      changedDimensions: comparison.changed.map(item => item.id),
      highOrderDifference: comparison.highOrderDifference
    };
  }

  function desiredLogicSimilarity(level) {
    const ratio = Math.max(0, Math.min(1, level / 100));
    return 0.34 + 0.48 * ratio;
  }

  function desiredDirectionalConflict(level) {
    return 2 * Math.max(0, Math.min(1, level / 100));
  }

  function profileGap(first, second) {
    return (
      Math.abs(first.similarity - second.similarity) * 12 +
      Math.abs(first.constituentSimilarity - second.constituentSimilarity) * 4 +
      Math.abs(first.relationalSimilarity - second.relationalSimilarity) * 5 +
      Math.abs(first.synthesisSimilarity - second.synthesisSimilarity) * 5 +
      Math.abs(first.directionalConflict - second.directionalConflict) * 3 +
      Math.abs(first.categoryMatches - second.categoryMatches) * 0.8 +
      Math.abs(first.formMatches - second.formMatches) * 0.8 +
      Math.abs(first.directionMatches - second.directionMatches) * 1.2 +
      Math.abs(first.turnMatch - second.turnMatch) * 1.2
    );
  }

  function pairRank(matchAssessment, nonMatchAssessment, level) {
    const desiredLogic = desiredLogicSimilarity(level);
    const desiredDirection = desiredDirectionalConflict(level);
    const meanLogic = (matchAssessment.similarity + nonMatchAssessment.similarity) / 2;
    const meanDirection =
      (matchAssessment.directionalConflict + nonMatchAssessment.directionalConflict) / 2;
    const leak = profileGap(matchAssessment, nonMatchAssessment);
    const targetFit =
      Math.abs(meanLogic - desiredLogic) * 6 +
      Math.abs(meanDirection - desiredDirection) * 2;
    const variation =
      (matchAssessment.displayedChanges + nonMatchAssessment.displayedChanges) * 0.03;
    return leak * 100 + targetFit * 10 - variation;
  }

  const FORM_TRIPLES = new Map();
  FORMS.forEach(resultForm => FORM_TRIPLES.set(resultForm, []));
  FORMS.forEach(first => FORMS.forEach(middle => FORMS.forEach(last => {
    const forms = [first, middle, last];
    FORM_TRIPLES.get(ontology.composeForms(forms)).push(forms);
  })));

  let realisationCache = null;

  function integratedCategoryFor(categoryIds, dirs) {
    const [first, middle, last] = categoryIds;
    const relationTurn = ontology.turn(dirs[0], dirs[1]);
    const leftRelation = ontology.relationCategory(first, middle);
    const rightRelation = ontology.relationCategory(middle, last);
    const nodeSynthesis = ontology.composeCategory(
      ontology.composeCategory(first, middle, 'SAME'),
      last,
      relationTurn
    );
    const relationSynthesis = ontology.composeCategory(
      leftRelation,
      rightRelation,
      relationTurn
    );
    return ontology.composeCategory(nodeSynthesis, relationSynthesis, relationTurn);
  }

  function getRealisationCache() {
    if (realisationCache) return realisationCache;
    const byCategory = new Map(CATEGORY_IDS.map(id => [id, []]));
    CATEGORY_IDS.forEach(first => CATEGORY_IDS.forEach(middle => CATEGORY_IDS.forEach(last => {
      if (first === middle || first === last || middle === last) return;
      DIRS.forEach(firstDirection => DIRS.forEach(secondDirection => {
        if (firstDirection === secondDirection) return;
        const categoryIds = [first, middle, last];
        const dirs = [firstDirection, secondDirection];
        const integratedCategory = integratedCategoryFor(categoryIds, dirs);
        byCategory.get(integratedCategory).push({ categoryIds, dirs });
      }));
    })));
    realisationCache = byCategory;
    return realisationCache;
  }

  function makeCandidate(realisation, forms) {
    const trial = app.deriveTrial({
      mode: 0,
      nodes: realisation.categoryIds.map((categoryId, index) => ({
        symbol: ['X', 'Y', 'Z'][index],
        categoryId,
        form: forms[index],
        memory: null
      })),
      dirs: [...realisation.dirs]
    });
    app.renameSurfaceSymbols(trial);
    return attachSignatures(trial);
  }

  function buildDirectPool(target, wantMatch, count = 64) {
    attachSignatures(target);
    const cache = getRealisationCache();
    const targetTemplate = displayedTemplate(target);
    const targetIdentity = target.matchSignature;
    const identities = wantMatch
      ? [{ categoryId: target.integratedCategory, form: target.integratedForm }]
      : ALL_IDENTITIES.filter(identity =>
          identity.categoryId !== target.integratedCategory ||
          identity.form !== target.integratedForm
        );
    const candidates = [];
    const seen = new Set();
    const maxAttempts = count * 40;

    for (let attempt = 0; candidates.length < count && attempt < maxAttempts; attempt += 1) {
      const identity = app.rng.pick(identities);
      const realisations = cache.get(identity.categoryId);
      const forms = FORM_TRIPLES.get(identity.form);
      const candidate = makeCandidate(app.rng.pick(realisations), app.rng.pick(forms));
      const equal = candidate.matchSignature === targetIdentity;
      if (equal !== wantMatch) continue;
      if (candidate.fullLogicSignature === target.fullLogicSignature) continue;
      if (displayedTemplate(candidate) === targetTemplate) continue;
      if (wantMatch) {
        if (categoryMatches(candidate, target) === 3) continue;
        if (directionMatches(candidate, target) === 2) continue;
      }
      if (seen.has(candidate.fullLogicSignature)) continue;
      seen.add(candidate.fullLogicSignature);
      candidates.push(candidate);
    }

    if (!candidates.length) {
      throw new Error(`Unable to construct a Mode 1 ${wantMatch ? 'MATCH' : 'NO MATCH'} pool.`);
    }
    return candidates;
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

  function buildNonMatchPool(target, count = 64) {
    const candidates = [];
    const seen = new Set();
    const snapshot = snapshotGenerator();
    const derivedSurfaceVariant = app.surfaceVariant;

    try {
      /*
       * Retain the existing sophisticated lure generator as one source of
       * counter-isomorphs, but classify every candidate by the new match
       * signature. The old match branch is temporarily forced to use its old
       * surface variant so it cannot recurse into this layer.
       */
      app.surfaceVariant = legacySurfaceVariant;
      const legacyAttempts = Math.max(12, Math.round(count * 0.75));
      for (let attempt = 0; attempt < legacyAttempts; attempt += 1) {
        const candidate = attachSignatures(stripRuntime(legacyMakeTrial()));
        if (!candidate || candidate.mode !== 0) continue;
        if (sameMatchIdentity(candidate, target)) continue;
        if (seen.has(candidate.fullLogicSignature)) continue;
        seen.add(candidate.fullLogicSignature);
        candidates.push(candidate);
      }
    } finally {
      app.surfaceVariant = derivedSurfaceVariant;
      restoreGenerator(snapshot, false);
    }

    const direct = buildDirectPool(target, false, count);
    for (const candidate of direct) {
      if (seen.has(candidate.fullLogicSignature)) continue;
      seen.add(candidate.fullLogicSignature);
      candidates.push(candidate);
      if (candidates.length >= count) break;
    }
    return candidates;
  }

  function selectBalancedPair(matchPool, nonMatchPool, target, previous, level) {
    const matches = matchPool.map(candidate => ({
      candidate,
      assessment: cueProfile(candidate, target, previous)
    }));
    const nonMatches = nonMatchPool.map(candidate => ({
      candidate,
      assessment: cueProfile(candidate, target, previous)
    }));
    const pairs = [];

    for (const match of matches) {
      for (const nonMatch of nonMatches) {
        pairs.push({
          match,
          nonMatch,
          rank: pairRank(match.assessment, nonMatch.assessment, level)
        });
      }
    }
    pairs.sort((first, second) => first.rank - second.rank);
    if (!pairs.length) throw new Error('Unable to pair Mode 1 MATCH and NO MATCH candidates.');

    const ratio = Math.max(0, Math.min(1, level / 100));
    const span = Math.max(1, Math.ceil(pairs.length * (0.025 - 0.015 * ratio)));
    const selected = pairs[Math.floor(app.rng.next() * span)];
    return {
      match: selected.match.candidate,
      nonMatch: selected.nonMatch.candidate,
      matchCue: selected.match.assessment,
      nonMatchCue: selected.nonMatch.assessment,
      cueGap: Number(profileGap(
        selected.match.assessment,
        selected.nonMatch.assessment
      ).toFixed(6)),
      rank: selected.rank
    };
  }

  function buildBalancedAnswerPair(target, previous, level) {
    const matchPool = buildDirectPool(target, true, 64);
    const nonMatchPool = buildNonMatchPool(target, 64);
    return selectBalancedPair(matchPool, nonMatchPool, target, previous || target, level);
  }

  /*
   * Ensure every Mode 1 trial carries both its complete interference signature
   * and its compressed N-back identity.
   */
  app.deriveTrial = function deriveWithSeparatedMatchIdentity(trial) {
    return attachSignatures(baseDeriveTrial(trial));
  };

  app.matchSignature = matchSignature;
  app.modeOneMatchSignature = modeOneMatchSignature;

  /*
   * Compatibility entry point for any older layer requesting a surface variant.
   * The main trial generator below builds both answer classes together.
   */
  app.surfaceVariant = function surfaceVariantByDerivedLogic(target) {
    if (target?.mode !== 0) return legacySurfaceVariant(target);
    const level = Math.max(0, Math.min(100,
      Number(document.getElementById('interference-slider')?.value) || 0));
    const previous = this.trials[this.trials.length - 1] || target;
    return buildBalancedAnswerPair(target, previous, level).match;
  };

  app.makeTrial = function makeTrialWithImagiWorldArchitecture() {
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

    const previous = this.trials[this.trials.length - 1] || target;
    const requestedMatch = this.rng.next() < this.settings().matchProbability;

    /*
     * Build the MATCH and NO MATCH alternatives as a pair before choosing which
     * one to show. Therefore the requested answer class cannot influence the
     * surface-cue calibration.
     */
    const pair = buildBalancedAnswerPair(target, previous, level);
    const trial = requestedMatch ? pair.match : pair.nonMatch;
    attachSignatures(trial);

    const actualMatch = matchSignature(trial, 0) === matchSignature(target, 0);
    if (requestedMatch !== actualMatch) {
      throw new Error('Mode 1 generator disagrees with its recomputed logical signatures.');
    }

    const existing = trial.interferenceMeta || {};
    const selectedCue = requestedMatch ? pair.matchCue : pair.nonMatchCue;
    trial.interferenceMeta = {
      ...existing,
      level,
      mechanism: requestedMatch
        ? 'derived-integrated-isomorph'
        : (existing.mechanism || 'derived-logic-counterisomorph'),
      targetSimilarity: Number(selectedCue.similarity.toFixed(3)),
      directionalConflict: selectedCue.directionalConflict,
      highOrderDifference: selectedCue.highOrderDifference,
      changedDimensions: selectedCue.changedDimensions,
      matchIdentity: trial.matchSignature,
      targetMatchIdentity: target.matchSignature,
      pairedCueGap: pair.cueGap,
      answerRecomputedFromSignatures: true
    };
    trial.isMatch = actualMatch;
    trial.scored = true;
    trial.interferenceLevel = level;
    return trial;
  };

  function runExhaustiveAudit() {
    const failures = [];
    const snapshot = snapshotGenerator();
    const originalTrials = app.trials;
    let testedIdentities = 0;
    let maximumCueGap = 0;

    try {
      const cache = getRealisationCache();
      const realisationCount = [...cache.values()]
        .reduce((total, entries) => total + entries.length, 0);
      if (realisationCount !== 6048) failures.push(`realisation-count:${realisationCount}`);
      CATEGORY_IDS.forEach(id => {
        if (!cache.get(id)?.length) failures.push(`unreachable-category:${id}`);
      });

      const formCount = [...FORM_TRIPLES.values()]
        .reduce((total, entries) => total + entries.length, 0);
      if (formCount !== 27) failures.push(`form-count:${formCount}`);
      FORMS.forEach(form => {
        if (!FORM_TRIPLES.get(form)?.length) failures.push(`unreachable-form:${form}`);
      });

      app.trials = [];
      for (const identity of ALL_IDENTITIES) {
        const target = makeCandidate(
          cache.get(identity.categoryId)[0],
          FORM_TRIPLES.get(identity.form)[0]
        );
        const matchPool = buildDirectPool(target, true, 48);
        const nonMatchPool = buildDirectPool(target, false, 48);
        const pair = selectBalancedPair(matchPool, nonMatchPool, target, target, 60);

        if (!sameMatchIdentity(target, pair.match)) {
          failures.push(`match-identity:${identity.categoryId}:${identity.form}`);
        }
        if (sameMatchIdentity(target, pair.nonMatch)) {
          failures.push(`nonmatch-identity:${identity.categoryId}:${identity.form}`);
        }
        if (pair.match.fullLogicSignature === target.fullLogicSignature) {
          failures.push(`raw-clone:${identity.categoryId}:${identity.form}`);
        }
        if (displayedTemplate(pair.match) === displayedTemplate(target)) {
          failures.push(`template-repeat:${identity.categoryId}:${identity.form}`);
        }
        maximumCueGap = Math.max(maximumCueGap, pair.cueGap);
        testedIdentities += 1;
      }

      const target = makeCandidate(
        cache.get('CONNECTION')[0],
        FORM_TRIPLES.get('A')[0]
      );
      const renamed = clone(target);
      renamed.nodes[0].symbol = 'X';
      renamed.nodes[1].symbol = 'Y';
      renamed.nodes[2].symbol = 'Z';
      app.deriveTrial(renamed);
      if (!sameMatchIdentity(target, renamed)) failures.push('letters-entered-signature');
    } catch (error) {
      failures.push(`exception:${error.message}`);
    } finally {
      app.trials = originalTrials;
      restoreGenerator(snapshot, true);
    }

    return {
      passed: failures.length === 0,
      failures,
      testedIdentities,
      identityCount: ALL_IDENTITIES.length,
      realisationCount: 6048,
      maximumCueGap: Number(maximumCueGap.toFixed(6))
    };
  }

  const audit = runExhaustiveAudit();
  if (!audit.passed) console.error('Mode 1 IMAGI-WORLD parity audit failed', audit);

  window.__modeOneMatchLogicTestAPI = {
    version: 2,
    matchSignature,
    sameMatchIdentity,
    displayedTemplate,
    directionalConflictScore,
    cueProfile,
    buildBalancedAnswerPair,
    runExhaustiveAudit,
    exhaustiveAudit: audit,
    selfTestPassed: audit.passed,
    scoringIdentity: 'integrated ontology + integrated form',
    identityCount: ALL_IDENTITIES.length,
    rawTemplateDeterminesMatch: false,
    lettersDetermineMatch: false,
    generationBranchDeterminesAnswer: false,
    matchAndNonMatchUsePairedCueCalibration: true
  };
});
