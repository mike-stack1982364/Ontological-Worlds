'use strict';

/*
 * Logic-engineered cognitive interference for Ontological-Worlds.
 *
 * The slider never treats letter reuse as the interference mechanism. Symbols
 * remain surface carriers, except where an invention symbol legitimately names
 * inherited recursive structure. Interference is generated in the scored logic
 * space between premises:
 *
 *   - target-near lures preserve most bindings but alter a decisive relation;
 *   - proactive lures reinstate the logic of an intervening premise;
 *   - binding lures preserve operators while permuting their relational roles;
 *   - topology lures preserve nodes while changing a turn or mapping;
 *   - convergence/divergence lures dissociate construction from outcome;
 *   - recursive lures preserve visible wrappers while changing lineage.
 *
 * Surface symbols are refreshed only after the logical candidate is selected.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const slider = document.getElementById('interference-slider');
  const valueLabel = document.getElementById('interference-val');
  const ontology = window.__ontologyTestAPI;
  if (!app || !slider || !valueLabel || !ontology) return;

  const STORAGE_KEY = 'ontological_worlds_interference_v2';
  const DIRS = ['N', 'E', 'S', 'W'];
  const FORMS = ['I', 'O', 'A'];
  const SYMBOLS = 'BCDEFGHJKLMNOPQRSTUVWXYZ'.split('');
  const CATEGORIES = ontology.categories;
  const CATEGORY_BY_ID = new Map(CATEGORIES.map(item => [item.id, item]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const opposite = direction => ({ N: 'S', S: 'N', E: 'W', W: 'E' })[direction];
  const rotate = (direction, quarters) => DIRS[(DIRS.indexOf(direction) + quarters + 4) % 4];
  const turnIndex = (first, second) => (DIRS.indexOf(second) - DIRS.indexOf(first) + 4) % 4;
  const memoryDigest = node => node?.memory?.canonicalDigest || node?.memory?.digest || 'NONE';

  function interferencePercent() {
    return Math.max(0, Math.min(100, Number(slider.value) || 0));
  }

  function updateInterferenceLabel() {
    valueLabel.textContent = `${interferencePercent()}%`;
  }

  function loadInterference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) slider.value = String(Math.max(0, Math.min(100, Number(stored) || 0)));
    } catch (_) {}
    updateInterferenceLabel();
  }

  function saveInterference() {
    try { localStorage.setItem(STORAGE_KEY, String(interferencePercent())); } catch (_) {}
  }

  slider.addEventListener('input', updateInterferenceLabel);
  slider.addEventListener('change', () => {
    updateInterferenceLabel();
    saveInterference();
  });
  loadInterference();

  const originalSettings = app.settings.bind(app);
  app.settings = function settingsWithInterference() {
    return { ...originalSettings(), interference: interferencePercent() / 100 };
  };

  function stripRuntimeFields(trial) {
    const copy = clone(trial);
    delete copy.isMatch;
    delete copy.scored;
    delete copy.started;
    delete copy._answered;
    delete copy.interferenceMeta;
    return copy;
  }

  function effectiveNode(node) {
    if (!node?.memory) return { categoryId: node.categoryId, form: node.form };
    return {
      categoryId: ontology.composeCategory(node.memory.categoryId, node.categoryId, 'SAME'),
      form: ontology.composeForms([node.memory.form, node.form])
    };
  }

  function nodeBundle(node, useEffective = false) {
    const effective = useEffective ? effectiveNode(node) : node;
    return `${effective.categoryId}:${effective.form}:${memoryDigest(node)}`;
  }

  function canonicalModeOne(trial) {
    const raw = [
      trial.nodes[0].categoryId, trial.nodes[0].form, trial.dirs[0],
      trial.nodes[1].categoryId, trial.nodes[1].form
    ];
    const reversed = [
      ontology.mirrorCategory(trial.nodes[1].categoryId),
      ontology.mirrorForm(trial.nodes[1].form),
      opposite(trial.dirs[0]),
      ontology.mirrorCategory(trial.nodes[0].categoryId),
      ontology.mirrorForm(trial.nodes[0].form)
    ];
    return raw.join('|') <= reversed.join('|') ? raw : reversed;
  }

  function canonicalModeThree(trial) {
    const quarter = turnIndex(trial.dirs[0], trial.dirs[1]);
    const source = [
      trial.nodes[0].categoryId, trial.nodes[0].form,
      trial.nodes[1].categoryId, trial.nodes[1].form,
      quarter
    ];
    const target = [
      trial.nodes[2].categoryId, trial.nodes[2].form,
      trial.nodes[3].categoryId, trial.nodes[3].form,
      (4 - quarter) % 4
    ];
    return source.join('|') <= target.join('|') ? source : target;
  }

  function logicProfile(trial) {
    const dimensions = [];
    const add = (id, value, weight, tier) => dimensions.push({ id, value: String(value), weight, tier });
    const effective = trial.nodes.map(effectiveNode);

    if (trial.mode === 0) {
      add('node0.category', trial.nodes[0].categoryId, 3, 1);
      add('node0.form', trial.nodes[0].form, 2, 1);
      add('edge.direction', trial.dirs[0], 5, 2);
      add('node1.category', trial.nodes[1].categoryId, 3, 1);
      add('node1.form', trial.nodes[1].form, 2, 1);
    } else if (trial.mode === 1) {
      const [c0, f0, direction, c1, f1] = canonicalModeOne(trial);
      add('reversal.node0.category', c0, 3, 1);
      add('reversal.node0.form', f0, 2, 1);
      add('reversal.direction', direction, 5, 2);
      add('reversal.node1.category', c1, 3, 1);
      add('reversal.node1.form', f1, 2, 1);
      add('reversal.relation', ontology.relationCategory(c0, c1), 5, 3);
    } else if (trial.mode === 2) {
      trial.nodes.forEach((node, index) => {
        add(`node${index}.category`, node.categoryId, 3, 1);
        add(`node${index}.form`, node.form, 2, 1);
      });
      add('left.relation', ontology.relationCategory(effective[0].categoryId, effective[1].categoryId), 4, 2);
      add('right.relation', ontology.relationCategory(effective[1].categoryId, effective[2].categoryId), 4, 2);
      add('chain.turn', trial.turns[0], 5, 2);
      add('result.category', trial.resultCategory, 7, 3);
      add('result.form', trial.resultForm, 4, 3);
    } else if (trial.mode === 3) {
      const [c0, f0, c1, f1, quarter] = canonicalModeThree(trial);
      add('equivalence.node0.category', c0, 3, 1);
      add('equivalence.node0.form', f0, 2, 1);
      add('equivalence.node1.category', c1, 3, 1);
      add('equivalence.node1.form', f1, 2, 1);
      add('equivalence.mapping', quarter, 6, 2);
      add('equivalence.relation', ontology.relationCategory(c0, c1), 6, 3);
    } else if (trial.mode === 4) {
      trial.nodes.forEach((node, index) => {
        add(`node${index}.category`, node.categoryId, 3, 1);
        add(`node${index}.form`, node.form, 2, 1);
      });
      add('turn0', trial.turns[0], 5, 2);
      add('turn1', trial.turns[1], 5, 2);
      const first = ontology.composeCategory(effective[0].categoryId, effective[1].categoryId, 'SAME');
      const second = ontology.composeCategory(first, effective[2].categoryId, trial.turns[0]);
      add('intermediate01', first, 5, 3);
      add('intermediate012', second, 6, 3);
      add('result.category', trial.resultCategory, 8, 3);
      add('result.form', trial.resultForm, 4, 3);
    } else if (trial.mode === 5) {
      trial.nodes.forEach((node, index) => {
        add(`wrapper${index}.category`, node.categoryId, 2, 1);
        add(`wrapper${index}.form`, node.form, 2, 1);
        add(`effective${index}.category`, effective[index].categoryId, 4, 2);
        add(`effective${index}.form`, effective[index].form, 3, 2);
        add(`lineage${index}`, memoryDigest(node), 8, 4);
      });
      add('recursive.direction', trial.dirs[0], 5, 2);
      add('recursive.relation', ontology.relationCategory(effective[0].categoryId, effective[1].categoryId), 6, 3);
      add('result.category', trial.resultCategory, 8, 3);
      add('result.form', trial.resultForm, 5, 3);
    } else {
      trial.nodes.forEach((node, index) => {
        add(`wrapper${index}.category`, node.categoryId, 2, 1);
        add(`wrapper${index}.form`, node.form, 2, 1);
        add(`effective${index}.category`, effective[index].categoryId, 4, 2);
        add(`effective${index}.form`, effective[index].form, 3, 2);
        add(`lineage${index}`, memoryDigest(node), 8, 4);
      });
      add('parallax.turn', trial.turns[0], 5, 2);
      add('left.relation', trial.leftRelationCategory, 6, 3);
      add('right.relation', trial.rightRelationCategory, 6, 3);
      add('relation.synthesis', trial.relationSynthesisCategory, 8, 3);
      add('node.synthesis', trial.nodeSynthesisCategory, 8, 3);
      add('reified.category', trial.reifiedCategory, 10, 3);
      add('transfer.category', trial.transferCategory, 7, 3);
    }

    return dimensions;
  }

  function compareLogic(firstTrial, secondTrial) {
    const first = new Map(logicProfile(firstTrial).map(item => [item.id, item]));
    const second = new Map(logicProfile(secondTrial).map(item => [item.id, item]));
    const ids = new Set([...first.keys(), ...second.keys()]);
    const tierTotals = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const tierSame = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const changed = [];
    let total = 0;
    let same = 0;

    ids.forEach(id => {
      const a = first.get(id);
      const b = second.get(id);
      const weight = Math.max(a?.weight || 0, b?.weight || 0);
      const tier = Math.max(a?.tier || 1, b?.tier || 1);
      total += weight;
      tierTotals[tier] += weight;
      if (a && b && a.value === b.value) {
        same += weight;
        tierSame[tier] += weight;
      } else {
        changed.push({ id, tier, weight, from: a?.value, to: b?.value });
      }
    });

    const ratio = (numerator, denominator) => denominator ? numerator / denominator : 0;
    return {
      similarity: ratio(same, total),
      constituentSimilarity: ratio(tierSame[1], tierTotals[1]),
      relationalSimilarity: ratio(tierSame[2], tierTotals[2]),
      outcomeSimilarity: ratio(tierSame[3], tierTotals[3]),
      lineageSimilarity: ratio(tierSame[4], tierTotals[4]),
      highOrderDifference: changed.some(item => item.tier >= 2),
      changed
    };
  }

  function nodeMultiset(trial, useEffective = false) {
    return trial.nodes.map(node => nodeBundle(node, useEffective)).sort().join('|');
  }

  function orderedNodes(trial, useEffective = false) {
    return trial.nodes.map(node => nodeBundle(node, useEffective)).join('|');
  }

  function resultIdentity(trial) {
    if (trial.mode === 2 || trial.mode === 4 || trial.mode === 5) {
      return `${trial.resultCategory}:${trial.resultForm}`;
    }
    if (trial.mode === 6) {
      return `${trial.reifiedCategory}:${trial.transferCategory}`;
    }
    if (trial.mode === 3) return `Q${trial.mappingQuarter}`;
    return null;
  }

  function bindingPermutationBonus(candidate, reference) {
    const plainPermutation = nodeMultiset(candidate) === nodeMultiset(reference) && orderedNodes(candidate) !== orderedNodes(reference);
    const effectivePermutation = nodeMultiset(candidate, true) === nodeMultiset(reference, true) && orderedNodes(candidate, true) !== orderedNodes(reference, true);
    return plainPermutation || effectivePermutation ? 24 : 0;
  }

  function constructionOutcomeBonus(candidate, reference) {
    const candidateResult = resultIdentity(candidate);
    const referenceResult = resultIdentity(reference);
    if (!candidateResult || !referenceResult) return 0;
    const nodesSame = nodeMultiset(candidate, true) === nodeMultiset(reference, true);
    if (candidateResult === referenceResult && candidate.signature !== reference.signature) return 18;
    if (nodesSame && candidateResult !== referenceResult) return 22;
    return 0;
  }

  function recursiveLineageBonus(candidate, reference) {
    if (candidate.mode < 5 || reference.mode !== candidate.mode) return 0;
    const effectiveSame = candidate.nodes.every((node, index) => {
      const a = effectiveNode(node);
      const b = effectiveNode(reference.nodes[index]);
      return b && a.categoryId === b.categoryId && a.form === b.form;
    });
    const lineageDifferent = candidate.nodes.some((node, index) => memoryDigest(node) !== memoryDigest(reference.nodes[index]));
    return effectiveSame && lineageDifferent ? 30 : 0;
  }

  function candidateScore(candidate, target, distractors, mutationKind, level) {
    const targetComparison = compareLogic(candidate, target);
    const distractorComparisons = distractors.map(trial => ({ trial, comparison: compareLogic(candidate, trial) }));
    const strongestDistractor = distractorComparisons.reduce((best, item) => {
      if (!best || item.comparison.similarity > best.comparison.similarity) return item;
      return best;
    }, null);
    const exactDistractor = distractors.some(trial => trial.signature === candidate.signature);
    const relationalChange = targetComparison.highOrderDifference ? 1 : 0;
    const levelRatio = level / 100;

    let score = targetComparison.similarity * (90 + 80 * levelRatio);
    score += targetComparison.constituentSimilarity * 25 * levelRatio;
    score += targetComparison.relationalSimilarity * 30 * levelRatio;
    score += relationalChange * 24 * levelRatio;
    score += bindingPermutationBonus(candidate, target) * levelRatio;
    score += constructionOutcomeBonus(candidate, target) * levelRatio;
    score += recursiveLineageBonus(candidate, target) * levelRatio;

    if (strongestDistractor) {
      score += strongestDistractor.comparison.similarity * 45 * levelRatio;
      if (exactDistractor) score += 28 * levelRatio;
    }

    const mutationWeights = {
      'binding-permutation': 18,
      topology: 16,
      'recursive-lineage': 22,
      category: 10,
      perspective: 8,
      'proactive-reinstatement': 20,
      random: 0
    };
    score += (mutationWeights[mutationKind] || 0) * levelRatio;

    if (level >= 55 && !targetComparison.highOrderDifference && candidate.mode >= 2) score -= 45;
    if (candidate.signature === target.signature) score = Number.NEGATIVE_INFINITY;

    return {
      score,
      targetComparison,
      strongestDistractor: strongestDistractor?.comparison || null,
      exactDistractor,
      mutationKind
    };
  }

  function freshSurfaceSymbols(trial) {
    const fixed = new Set(trial.nodes.filter(node => node.memory).map(node => node.memory.symbol));
    const available = app.rng.shuffle(SYMBOLS.filter(symbol => !fixed.has(symbol)));
    trial.nodes.forEach(node => {
      if (node.memory) node.symbol = node.memory.symbol;
      else node.symbol = available.shift();
    });

    if (trial.mode >= 5) {
      const blocked = new Set(trial.nodes.map(node => node.symbol));
      const unused = SYMBOLS.filter(symbol => !blocked.has(symbol) && !app.inventionMemory.has(symbol));
      const fallback = SYMBOLS.filter(symbol => !blocked.has(symbol));
      trial.invention = app.rng.pick(unused.length ? unused : fallback);
    }
    trial.symbols = trial.nodes.map(node => node.symbol);
    return trial;
  }

  function nearbyCategories(categoryId) {
    const source = CATEGORY_BY_ID.get(categoryId);
    const mirror = ontology.mirrorCategory(categoryId);
    return CATEGORIES
      .filter(item => item.id !== categoryId)
      .map(item => {
        const distance = source?.coord && item.coord
          ? Math.abs(source.coord[0] - item.coord[0]) + Math.abs(source.coord[1] - item.coord[1])
          : 4;
        const mirrorBonus = item.id === mirror ? -1.5 : 0;
        const familyBonus = item.family === source?.family ? -1 : 0;
        const phaseBonus = item.phase === source?.phase ? -0.25 : 0;
        return { id: item.id, rank: distance + mirrorBonus + familyBonus + phaseBonus };
      })
      .sort((a, b) => a.rank - b.rank)
      .map(item => item.id);
  }

  function syncEquivalenceMirror(trial, sourceIndex) {
    if (trial.mode !== 3 || sourceIndex > 1) return;
    const targetIndex = sourceIndex + 2;
    trial.nodes[targetIndex].categoryId = ontology.mirrorCategory(trial.nodes[sourceIndex].categoryId);
    trial.nodes[targetIndex].form = ontology.mirrorForm(trial.nodes[sourceIndex].form);
    trial.nodes[targetIndex].memory = null;
  }

  function mutateCategory(trial) {
    const selectable = trial.mode === 3 ? [0, 1] : trial.nodes.map((_, index) => index);
    const index = app.rng.pick(selectable);
    const options = nearbyCategories(trial.nodes[index].categoryId);
    trial.nodes[index].categoryId = app.rng.pick(options.slice(0, Math.min(4, options.length)));
    syncEquivalenceMirror(trial, index);
    return true;
  }

  function mutatePerspective(trial) {
    if (trial.mode === 6) {
      const first = Math.floor(app.rng.next() * trial.nodes.length);
      let second = Math.floor(app.rng.next() * trial.nodes.length);
      if (second === first) second = (second + 1) % trial.nodes.length;
      const form = trial.nodes[first].form;
      trial.nodes[first].form = trial.nodes[second].form;
      trial.nodes[second].form = form;
      return true;
    }

    const selectable = trial.mode === 3 ? [0, 1] : trial.nodes.map((_, index) => index);
    const index = app.rng.pick(selectable);
    const current = trial.nodes[index].form;
    const choices = FORMS.filter(form => form !== current);
    trial.nodes[index].form = app.rng.pick(choices);
    syncEquivalenceMirror(trial, index);
    return true;
  }

  function mutateTopology(trial) {
    if (trial.mode === 3) {
      const current = turnIndex(trial.dirs[0], trial.dirs[1]);
      const choices = [1, 2, 3].filter(quarter => quarter !== current);
      trial.dirs[1] = rotate(trial.dirs[0], app.rng.pick(choices));
      return true;
    }

    const index = Math.floor(app.rng.next() * trial.dirs.length);
    const quarterChoices = [1, 3, 2];
    trial.dirs[index] = rotate(trial.dirs[index], app.rng.pick(quarterChoices));
    return true;
  }

  function mutateBindingPermutation(trial) {
    const selectable = trial.mode === 3 ? [0, 1] : trial.nodes.map((_, index) => index);
    if (selectable.length < 2) return false;
    const first = app.rng.pick(selectable);
    let second = app.rng.pick(selectable);
    if (second === first) second = selectable[(selectable.indexOf(first) + 1) % selectable.length];

    const firstBundle = {
      categoryId: trial.nodes[first].categoryId,
      form: trial.nodes[first].form
    };
    trial.nodes[first].categoryId = trial.nodes[second].categoryId;
    trial.nodes[first].form = trial.nodes[second].form;
    trial.nodes[second].categoryId = firstBundle.categoryId;
    trial.nodes[second].form = firstBundle.form;

    if (trial.mode === 3) {
      syncEquivalenceMirror(trial, first);
      syncEquivalenceMirror(trial, second);
    }
    return true;
  }

  function mutateRecursiveLineage(trial) {
    if (trial.mode < 5 || !app.inventionMemory.size) return false;
    const otherNodeSymbols = new Set(trial.nodes.map(node => node.symbol));
    const options = [...app.inventionMemory.values()]
      .filter(memory => !otherNodeSymbols.has(memory.symbol))
      .map(memory => ({
        memory,
        rank: trial.nodes.reduce((best, node) => {
          const sameOutput = memory.categoryId === node.memory?.categoryId && memory.form === node.memory?.form;
          const sameFamily = CATEGORY_BY_ID.get(memory.categoryId)?.family === CATEGORY_BY_ID.get(node.memory?.categoryId)?.family;
          return Math.min(best, sameOutput ? 0 : sameFamily ? 1 : 2);
        }, 3)
      }))
      .sort((a, b) => a.rank - b.rank);
    if (!options.length) return false;

    const index = Math.floor(app.rng.next() * trial.nodes.length);
    const choice = app.rng.pick(options.slice(0, Math.min(6, options.length))).memory;
    if (memoryDigest(trial.nodes[index]) === (choice.canonicalDigest || choice.digest)) return false;
    trial.nodes[index].memory = clone(choice);
    trial.nodes[index].symbol = choice.symbol;
    return true;
  }

  function deriveCandidate(source, mutationKind, targetSignature) {
    const candidate = stripRuntimeFields(source);
    let changed = false;
    if (mutationKind === 'category') changed = mutateCategory(candidate);
    else if (mutationKind === 'perspective') changed = mutatePerspective(candidate);
    else if (mutationKind === 'topology') changed = mutateTopology(candidate);
    else if (mutationKind === 'binding-permutation') changed = mutateBindingPermutation(candidate);
    else if (mutationKind === 'recursive-lineage') changed = mutateRecursiveLineage(candidate);
    else if (mutationKind === 'proactive-reinstatement') changed = true;
    if (!changed) return null;

    freshSurfaceSymbols(candidate);
    app.deriveTrial(candidate);
    if (candidate.signature === targetSignature) return null;
    candidate._mutationKind = mutationKind;
    return candidate;
  }

  function snapshotGeneratorState() {
    return {
      categoryDeck: clone(app.categoryDeck || []),
      formDeck: clone(app.formDeck || []),
      turnDeck: clone(app.turnDeck || []),
      memory: [...app.inventionMemory.entries()].map(([key, value]) => [key, clone(value)])
    };
  }

  function restoreGeneratorState(snapshot) {
    app.categoryDeck = snapshot.categoryDeck;
    app.formDeck = snapshot.formDeck;
    app.turnDeck = snapshot.turnDeck;
    app.inventionMemory.clear();
    snapshot.memory.forEach(([key, value]) => app.inventionMemory.set(key, value));
  }

  function randomNonMatch(mode, targetSignature) {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const candidate = app.makeBase(mode);
      if (candidate.signature !== targetSignature) {
        candidate._mutationKind = 'random';
        return candidate;
      }
    }
    const fallback = app.makeBase(mode);
    return app.forceDifferentTrial(fallback, targetSignature);
  }

  function buildCandidatePool(mode, target, distractors, level) {
    const snapshot = snapshotGeneratorState();
    const pool = [];
    const signatures = new Set();
    const add = candidate => {
      if (!candidate || candidate.signature === target.signature) return;
      const key = `${candidate.signature}|${candidate._mutationKind || 'unknown'}`;
      if (signatures.has(key)) return;
      signatures.add(key);
      pool.push(candidate);
    };

    try {
      const mutationKinds = ['topology', 'binding-permutation', 'category', 'perspective'];
      if (mode >= 5) mutationKinds.unshift('recursive-lineage');
      const repetitions = 2 + Math.round(level / 12);

      mutationKinds.forEach(kind => {
        for (let index = 0; index < repetitions; index += 1) add(deriveCandidate(target, kind, target.signature));
      });

      distractors.forEach(distractor => {
        add(deriveCandidate(distractor, 'proactive-reinstatement', target.signature));
        if (level >= 35) {
          add(deriveCandidate(distractor, 'topology', target.signature));
          add(deriveCandidate(distractor, 'binding-permutation', target.signature));
        }
      });

      const randomCount = Math.max(4, 12 - Math.round(level / 12));
      for (let index = 0; index < randomCount; index += 1) add(randomNonMatch(mode, target.signature));
    } finally {
      restoreGeneratorState(snapshot);
    }

    return pool;
  }

  function chooseLogicEngineeredNonMatch(mode, target, distractors, level) {
    if (level <= 0) return randomNonMatch(mode, target.signature);
    const pool = buildCandidatePool(mode, target, distractors, level);
    if (!pool.length) return randomNonMatch(mode, target.signature);

    const ranked = pool
      .map(candidate => ({
        candidate,
        assessment: candidateScore(candidate, target, distractors, candidate._mutationKind || 'random', level)
      }))
      .filter(item => Number.isFinite(item.assessment.score))
      .sort((a, b) => b.assessment.score - a.assessment.score);

    if (!ranked.length) return randomNonMatch(mode, target.signature);
    const selectivity = level / 100;
    const rankSpan = Math.max(1, Math.ceil(ranked.length * (1 - 0.92 * selectivity)));
    const selected = ranked[Math.floor(app.rng.next() * rankSpan)];
    selected.candidate.interferenceMeta = {
      level,
      mechanism: selected.assessment.mutationKind,
      targetSimilarity: Number(selected.assessment.targetComparison.similarity.toFixed(3)),
      highOrderDifference: selected.assessment.targetComparison.highOrderDifference,
      proactiveExact: selected.assessment.exactDistractor,
      changedDimensions: selected.assessment.targetComparison.changed.map(item => item.id)
    };
    delete selected.candidate._mutationKind;
    return selected.candidate;
  }

  app.makeTrial = function makeTrialWithLogicEngineeredInterference() {
    const mode = this.settings().mode;
    const level = interferencePercent();
    const targetCandidate = this.trials[this.trials.length - this.n];
    const target = targetCandidate?.mode === mode ? targetCandidate : null;
    const windowStart = Math.max(0, this.trials.length - this.n + 1);
    const distractors = target
      ? this.trials.slice(windowStart).filter(trial => trial.mode === mode && trial !== target)
      : [];
    let trial;
    let isMatch = false;

    if (!target) {
      trial = this.makeBase(mode);
    } else if (this.rng.next() < this.settings().matchProbability) {
      trial = this.surfaceVariant(target);
      isMatch = true;
      trial.interferenceMeta = {
        level,
        mechanism: 'structural-match-through-surface-variation',
        targetSimilarity: 1,
        highOrderDifference: false,
        proactiveExact: false,
        changedDimensions: []
      };
    } else {
      trial = chooseLogicEngineeredNonMatch(mode, target, distractors, level);
      if (trial.signature === target.signature) trial = this.forceDifferentTrial(trial, target.signature);
    }

    trial.isMatch = isMatch;
    trial.scored = Boolean(target);
    trial.interferenceLevel = level;
    this.rememberInvention(trial);
    return trial;
  };

  const selfTestFailures = [];
  try {
    const sample = app.makeBase(0);
    const renamed = stripRuntimeFields(sample);
    freshSurfaceSymbols(renamed);
    app.deriveTrial(renamed);
    const originalProfile = JSON.stringify(logicProfile(sample));
    const renamedProfile = JSON.stringify(logicProfile(renamed));
    if (originalProfile !== renamedProfile) selfTestFailures.push('symbols-enter-logic-profile');

    const changed = stripRuntimeFields(sample);
    changed.dirs[0] = rotate(changed.dirs[0], 1);
    app.deriveTrial(changed);
    if (JSON.stringify(logicProfile(changed)) === originalProfile) selfTestFailures.push('direction-missing-from-profile');
  } catch (error) {
    selfTestFailures.push(`exception:${error.message}`);
  }
  if (selfTestFailures.length) console.error('Cognitive interference v2 self-test failed', selfTestFailures);

  window.__interferenceTestAPI = {
    version: 2,
    interferencePercent,
    logicProfile,
    compareLogic,
    candidateScore,
    resultIdentity,
    bindingPermutationBonus,
    constructionOutcomeBonus,
    recursiveLineageBonus,
    design: 'premise-logic competition, near-miss bindings, topology, outcomes and recursive lineage',
    symbolsDriveInterference: false,
    inventionSymbolsRemainLogical: true,
    selfTestPassed: selfTestFailures.length === 0
  };
});
