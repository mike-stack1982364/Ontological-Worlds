'use strict';

/*
 * Mode 1 cognitive interference
 *
 * Lures are selected in the complete triadic logic space: three transformed
 * roles, two cardinal transitions, their higher-order turn, two relation
 * categories and three synthesis outcomes. Letter identity is assigned only
 * after lure construction and never contributes to similarity or selection.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const ontology = window.__ontologyTestAPI;
  const triadic = window.__modeOneTriadicTestAPI;
  if (!app || !ontology || !triadic) return;

  const DIRS = ['N', 'E', 'S', 'W'];
  const FORMS = ['I', 'O', 'A'];
  const CATEGORIES = ontology.categories;
  const BY_ID = new Map(CATEGORIES.map(item => [item.id, item]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const rotate = (direction, quarters) => DIRS[(DIRS.indexOf(direction) + quarters + 4) % 4];

  function stripRuntime(trial) {
    const copy = clone(trial);
    ['isMatch', 'scored', 'started', '_answered', 'interferenceMeta', '_modeOneLureKind'].forEach(key => delete copy[key]);
    return copy;
  }

  function logicProfile(trial) {
    if (trial.mode !== 0) return [];
    const profile = [];
    const add = (id, value, weight, tier) => profile.push({ id, value: String(value), weight, tier });

    trial.nodes.forEach((node, index) => {
      add(`node${index}.category`, node.categoryId, 3, 1);
      add(`node${index}.form`, node.form, 2, 1);
    });
    add('edge0.direction', trial.dirs[0], 5, 2);
    add('edge1.direction', trial.dirs[1], 5, 2);
    add('edge.turn', trial.turns[0], 6, 2);
    add('left.relation', trial.leftRelationCategory, 6, 3);
    add('right.relation', trial.rightRelationCategory, 6, 3);
    add('node.synthesis', trial.nodeSynthesisCategory, 8, 3);
    add('relation.synthesis', trial.relationSynthesisCategory, 8, 3);
    add('integrated.category', trial.integratedCategory, 10, 3);
    add('integrated.form', trial.integratedForm, 5, 3);
    return profile;
  }

  function compareLogic(firstTrial, secondTrial) {
    const first = new Map(logicProfile(firstTrial).map(item => [item.id, item]));
    const second = new Map(logicProfile(secondTrial).map(item => [item.id, item]));
    const ids = new Set([...first.keys(), ...second.keys()]);
    const totals = { 1: 0, 2: 0, 3: 0 };
    const same = { 1: 0, 2: 0, 3: 0 };
    const changed = [];
    let totalWeight = 0;
    let sameWeight = 0;

    ids.forEach(id => {
      const a = first.get(id);
      const b = second.get(id);
      const weight = Math.max(a?.weight || 0, b?.weight || 0);
      const tier = Math.max(a?.tier || 1, b?.tier || 1);
      totalWeight += weight;
      totals[tier] += weight;
      if (a && b && a.value === b.value) {
        sameWeight += weight;
        same[tier] += weight;
      } else {
        changed.push({ id, tier, weight, from: a?.value, to: b?.value });
      }
    });

    const ratio = (value, total) => total ? value / total : 0;
    return {
      similarity: ratio(sameWeight, totalWeight),
      constituentSimilarity: ratio(same[1], totals[1]),
      relationalSimilarity: ratio(same[2], totals[2]),
      synthesisSimilarity: ratio(same[3], totals[3]),
      highOrderDifference: changed.some(item => item.tier >= 2),
      changed
    };
  }

  function categoryDistance(firstId, secondId) {
    const first = BY_ID.get(firstId);
    const second = BY_ID.get(secondId);
    if (!first || !second) return 9;
    if (firstId === secondId) return 0;
    if (ontology.mirrorCategory(firstId) === secondId) return 0.5;
    const coordinateDistance = Math.abs(first.coord[0] - second.coord[0]) + Math.abs(first.coord[1] - second.coord[1]);
    const familyAdjustment = first.family === second.family ? -0.75 : 0;
    const phaseAdjustment = first.phase === second.phase ? -0.25 : 0;
    return Math.max(0.25, coordinateDistance + familyAdjustment + phaseAdjustment);
  }

  function refreshSymbols(candidate) {
    app.renameSurfaceSymbols(candidate);
    return app.deriveTrial(candidate);
  }

  function mutateCategory(candidate) {
    const index = Math.floor(app.rng.next() * 3);
    const current = candidate.nodes[index].categoryId;
    const ranked = CATEGORIES
      .filter(item => item.id !== current)
      .map(item => ({ id: item.id, distance: categoryDistance(current, item.id) }))
      .sort((a, b) => a.distance - b.distance);
    candidate.nodes[index].categoryId = app.rng.pick(ranked.slice(0, 4)).id;
    return true;
  }

  function mutatePerspective(candidate) {
    const index = Math.floor(app.rng.next() * 3);
    candidate.nodes[index].form = app.rng.pick(FORMS.filter(form => form !== candidate.nodes[index].form));
    return true;
  }

  function mutateTopology(candidate) {
    const edge = Math.floor(app.rng.next() * 2);
    const other = edge === 0 ? 1 : 0;
    const choices = DIRS.filter(direction => direction !== candidate.dirs[edge] && direction !== candidate.dirs[other]);
    candidate.dirs[edge] = app.rng.pick(choices);
    return true;
  }

  function mutateBinding(candidate) {
    const first = Math.floor(app.rng.next() * 3);
    let second = Math.floor(app.rng.next() * 3);
    if (second === first) second = (second + 1) % 3;
    const bundle = {
      categoryId: candidate.nodes[first].categoryId,
      form: candidate.nodes[first].form
    };
    candidate.nodes[first].categoryId = candidate.nodes[second].categoryId;
    candidate.nodes[first].form = candidate.nodes[second].form;
    candidate.nodes[second].categoryId = bundle.categoryId;
    candidate.nodes[second].form = bundle.form;
    return true;
  }

  function mutateDoubleRelation(candidate) {
    const first = Math.floor(app.rng.next() * 3);
    const second = (first + 1 + Math.floor(app.rng.next() * 2)) % 3;
    mutateCategoryAt(candidate, first);
    mutateCategoryAt(candidate, second);
    return true;
  }

  function mutateCategoryAt(candidate, index) {
    const current = candidate.nodes[index].categoryId;
    const choices = CATEGORIES
      .filter(item => item.id !== current)
      .sort((a, b) => categoryDistance(current, a.id) - categoryDistance(current, b.id));
    candidate.nodes[index].categoryId = app.rng.pick(choices.slice(0, 3)).id;
  }

  function deriveCandidate(source, kind, forbiddenSignature) {
    const candidate = stripRuntime(source);
    let changed = false;
    if (kind === 'category-near-miss') changed = mutateCategory(candidate);
    else if (kind === 'perspective-near-miss') changed = mutatePerspective(candidate);
    else if (kind === 'topology-near-miss') changed = mutateTopology(candidate);
    else if (kind === 'binding-permutation') changed = mutateBinding(candidate);
    else if (kind === 'relational-recomposition') changed = mutateDoubleRelation(candidate);
    else if (kind === 'proactive-reinstatement') changed = true;
    if (!changed) return null;

    refreshSymbols(candidate);
    if (candidate.signature === forbiddenSignature) return null;
    candidate._modeOneLureKind = kind;
    return candidate;
  }

  function randomNonMatch(forbiddenSignature) {
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const candidate = app.makeBase(0);
      if (candidate.signature !== forbiddenSignature) {
        candidate._modeOneLureKind = 'random-nonmatch';
        return candidate;
      }
    }
    const fallback = app.forceDifferentTrial(app.makeBase(0), forbiddenSignature);
    fallback._modeOneLureKind = 'random-nonmatch';
    return fallback;
  }

  function bundleSequence(trial) {
    return trial.nodes.map(node => `${node.categoryId}:${node.form}`);
  }

  function isBindingPermutation(candidate, reference) {
    const candidateBundles = bundleSequence(candidate);
    const referenceBundles = bundleSequence(reference);
    return candidateBundles.slice().sort().join('|') === referenceBundles.slice().sort().join('|')
      && candidateBundles.join('|') !== referenceBundles.join('|');
  }

  function synthesisConflict(candidate, reference) {
    const sameIntegrated = candidate.integratedCategory === reference.integratedCategory
      && candidate.integratedForm === reference.integratedForm;
    const sameConstituents = bundleSequence(candidate).slice().sort().join('|')
      === bundleSequence(reference).slice().sort().join('|');
    if (sameIntegrated && candidate.signature !== reference.signature) return 1;
    if (sameConstituents && !sameIntegrated) return 2;
    return 0;
  }

  const KIND_WEIGHT = {
    'binding-permutation': 7,
    'topology-near-miss': 6,
    'relational-recomposition': 5,
    'proactive-reinstatement': 4,
    'category-near-miss': 3,
    'perspective-near-miss': 2,
    'random-nonmatch': 0
  };

  function scoreCandidate(candidate, target, distractors, level) {
    const ratio = level / 100;
    const targetComparison = compareLogic(candidate, target);
    const distractorComparisons = distractors.map(trial => ({ trial, comparison: compareLogic(candidate, trial) }));
    const strongestDistractor = distractorComparisons.reduce((best, item) => {
      return !best || item.comparison.similarity > best.comparison.similarity ? item : best;
    }, null);
    const proactiveExact = distractors.some(trial => trial.signature === candidate.signature);

    let score = targetComparison.similarity * (90 + 100 * ratio);
    score += targetComparison.constituentSimilarity * 24 * ratio;
    score += targetComparison.relationalSimilarity * 38 * ratio;
    score += targetComparison.synthesisSimilarity * 28 * ratio;
    if (targetComparison.highOrderDifference) score += 28 * ratio;
    if (isBindingPermutation(candidate, target)) score += 32 * ratio;
    score += synthesisConflict(candidate, target) * 16 * ratio;

    if (strongestDistractor) {
      score += strongestDistractor.comparison.similarity * 50 * ratio;
      if (proactiveExact) score += 36 * ratio;
      if (isBindingPermutation(candidate, strongestDistractor.trial)) score += 18 * ratio;
      score += synthesisConflict(candidate, strongestDistractor.trial) * 8 * ratio;
    }

    score += (KIND_WEIGHT[candidate._modeOneLureKind] || 0) * 3 * ratio;
    if (level >= 50 && !targetComparison.highOrderDifference) score -= 70;
    if (candidate.signature === target.signature) score = Number.NEGATIVE_INFINITY;

    return { score, targetComparison, proactiveExact };
  }

  function snapshotGenerator() {
    return {
      categoryDeck: clone(app.categoryDeck || []),
      formDeck: clone(app.formDeck || []),
      turnDeck: clone(app.turnDeck || [])
    };
  }

  function restoreGenerator(snapshot) {
    app.categoryDeck = snapshot.categoryDeck;
    app.formDeck = snapshot.formDeck;
    app.turnDeck = snapshot.turnDeck;
  }

  function buildPool(target, distractors, level) {
    const snapshot = snapshotGenerator();
    const bySignature = new Map();
    const add = candidate => {
      if (!candidate || candidate.signature === target.signature) return;
      const existing = bySignature.get(candidate.signature);
      if (!existing || (KIND_WEIGHT[candidate._modeOneLureKind] || 0) > (KIND_WEIGHT[existing._modeOneLureKind] || 0)) {
        bySignature.set(candidate.signature, candidate);
      }
    };

    try {
      const kinds = [
        'binding-permutation',
        'topology-near-miss',
        'relational-recomposition',
        'category-near-miss',
        'perspective-near-miss'
      ];
      const repetitions = 3 + Math.round(level / 10);
      kinds.forEach(kind => {
        for (let index = 0; index < repetitions; index += 1) add(deriveCandidate(target, kind, target.signature));
      });

      distractors.forEach(distractor => {
        add(deriveCandidate(distractor, 'proactive-reinstatement', target.signature));
        if (level >= 35) {
          add(deriveCandidate(distractor, 'binding-permutation', target.signature));
          add(deriveCandidate(distractor, 'topology-near-miss', target.signature));
        }
      });

      const randomCount = Math.max(3, 14 - Math.round(level / 9));
      for (let index = 0; index < randomCount; index += 1) add(randomNonMatch(target.signature));
    } finally {
      restoreGenerator(snapshot);
    }
    return [...bySignature.values()];
  }

  function selectNonMatch(target, distractors, level) {
    if (level <= 0) {
      const random = randomNonMatch(target.signature);
      const comparison = compareLogic(random, target);
      random.interferenceMeta = {
        level,
        mechanism: 'random-nonmatch',
        targetSimilarity: Number(comparison.similarity.toFixed(3)),
        highOrderDifference: comparison.highOrderDifference,
        proactiveExact: false,
        changedDimensions: comparison.changed.map(item => item.id)
      };
      delete random._modeOneLureKind;
      return random;
    }

    const ranked = buildPool(target, distractors, level)
      .map(candidate => ({ candidate, assessment: scoreCandidate(candidate, target, distractors, level) }))
      .filter(item => Number.isFinite(item.assessment.score))
      .sort((a, b) => b.assessment.score - a.assessment.score);
    if (!ranked.length) return selectNonMatch(target, distractors, 0);

    const selectivity = level / 100;
    const rankSpan = Math.max(1, Math.ceil(ranked.length * (1 - 0.95 * selectivity)));
    const selected = ranked[Math.floor(app.rng.next() * rankSpan)];
    selected.candidate.interferenceMeta = {
      level,
      mechanism: selected.candidate._modeOneLureKind,
      targetSimilarity: Number(selected.assessment.targetComparison.similarity.toFixed(3)),
      highOrderDifference: selected.assessment.targetComparison.highOrderDifference,
      proactiveExact: selected.assessment.proactiveExact,
      changedDimensions: selected.assessment.targetComparison.changed.map(item => item.id)
    };
    delete selected.candidate._modeOneLureKind;
    return selected.candidate;
  }

  const baseMakeTrial = app.makeTrial.bind(app);
  app.makeTrial = function makeTriadicModeOneTrial() {
    if (this.settings().mode !== 0) return baseMakeTrial();

    const level = Math.max(0, Math.min(100, Number(document.getElementById('interference-slider')?.value) || 0));
    const targetCandidate = this.trials[this.trials.length - this.n];
    const target = targetCandidate?.mode === 0 ? targetCandidate : null;
    const distractorStart = Math.max(0, this.trials.length - this.n + 1);
    const distractors = target ? this.trials.slice(distractorStart).filter(trial => trial.mode === 0) : [];
    let trial;
    let isMatch = false;

    if (!target) {
      trial = this.makeBase(0);
    } else if (this.rng.next() < this.settings().matchProbability) {
      trial = this.surfaceVariant(target);
      isMatch = true;
      trial.interferenceMeta = {
        level,
        mechanism: 'exact-triadic-logic-through-surface-renaming',
        targetSimilarity: 1,
        highOrderDifference: false,
        proactiveExact: false,
        changedDimensions: []
      };
    } else {
      trial = selectNonMatch(target, distractors, level);
      if (trial.signature === target.signature) trial = this.forceDifferentTrial(trial, target.signature);
    }

    trial.isMatch = isMatch;
    trial.scored = Boolean(target);
    trial.interferenceLevel = level;
    return trial;
  };

  const failures = [];
  try {
    const sample = app.makeBase(0);
    const renamed = stripRuntime(sample);
    renamed.nodes[0].symbol = 'X';
    renamed.nodes[1].symbol = 'Y';
    renamed.nodes[2].symbol = 'Z';
    app.deriveTrial(renamed);
    if (JSON.stringify(logicProfile(sample)) !== JSON.stringify(logicProfile(renamed))) failures.push('surface-symbol-entered-profile');

    const changed = stripRuntime(sample);
    changed.dirs[1] = DIRS.find(direction => direction !== changed.dirs[0] && direction !== changed.dirs[1]);
    app.deriveTrial(changed);
    if (!compareLogic(sample, changed).highOrderDifference) failures.push('topology-not-high-order');
  } catch (error) {
    failures.push(`exception:${error.message}`);
  }
  if (failures.length) console.error('Mode 1 interference self-test failed', failures);

  window.__modeOneInterferenceTestAPI = {
    version: 1,
    logicProfile,
    compareLogic,
    scoreCandidate,
    isBindingPermutation,
    synthesisConflict,
    symbolsDriveInterference: false,
    premiseLogicDrivesInterference: true,
    selfTestPassed: failures.length === 0
  };
});
