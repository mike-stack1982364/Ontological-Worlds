'use strict';

/*
 * Cognitive interference v3
 *
 * Interference is engineered entirely in the scored relational structure among
 * premises. Ordinary letters are refreshed only after a logical candidate is
 * selected and never contribute to lure scoring. The sole exception is an
 * invention identifier, whose continued identity legitimately denotes stored
 * recursive structure.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const ontology = window.__ontologyTestAPI;
  const slider = document.getElementById('interference-slider');
  const valueLabel = document.getElementById('interference-val');
  if (!app || !ontology || !slider || !valueLabel) return;

  const STORAGE_KEY = 'ontological_worlds_interference_v3';
  const DIRS = ['N', 'E', 'S', 'W'];
  const FORMS = ['I', 'O', 'A'];
  const SYMBOLS = 'BCDEFGHJKLMNOPQRSTUVWXYZ'.split('');
  const CATEGORIES = ontology.categories;
  const CATEGORY_BY_ID = new Map(CATEGORIES.map(item => [item.id, item]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const opposite = direction => ({ N: 'S', S: 'N', E: 'W', W: 'E' })[direction];
  const rotate = (direction, quarters) => DIRS[(DIRS.indexOf(direction) + quarters + 4) % 4];
  const turnIndex = (first, second) => (DIRS.indexOf(second) - DIRS.indexOf(first) + 4) % 4;
  const digest = node => node?.memory?.canonicalDigest || node?.memory?.digest || 'NONE';

  function levelPercent() {
    return Math.max(0, Math.min(100, Number(slider.value) || 0));
  }

  function updateLevelLabel() {
    valueLabel.textContent = `${levelPercent()}%`;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) slider.value = String(Math.max(0, Math.min(100, Number(stored) || 0)));
  } catch (_) {}
  updateLevelLabel();
  slider.addEventListener('input', updateLevelLabel);
  slider.addEventListener('change', () => {
    updateLevelLabel();
    try { localStorage.setItem(STORAGE_KEY, String(levelPercent())); } catch (_) {}
  });

  const originalSettings = app.settings.bind(app);
  app.settings = function settingsWithInterference() {
    return { ...originalSettings(), interference: levelPercent() / 100 };
  };

  function stripRuntime(trial) {
    const copy = clone(trial);
    ['isMatch', 'scored', 'started', '_answered', 'interferenceMeta', '_lureKind'].forEach(key => delete copy[key]);
    return copy;
  }

  function effectiveNode(node) {
    if (!node?.memory) return { categoryId: node.categoryId, form: node.form };
    return {
      categoryId: ontology.composeCategory(node.memory.categoryId, node.categoryId, 'SAME'),
      form: ontology.composeForms([node.memory.form, node.form])
    };
  }

  function categoryDistance(firstId, secondId) {
    const first = CATEGORY_BY_ID.get(firstId);
    const second = CATEGORY_BY_ID.get(secondId);
    if (!first || !second) return 4;
    if (firstId === secondId) return 0;
    if (ontology.mirrorCategory(firstId) === secondId) return 0.5;
    const coordinateDistance = first.coord && second.coord
      ? Math.abs(first.coord[0] - second.coord[0]) + Math.abs(first.coord[1] - second.coord[1])
      : 3;
    const familyAdjustment = first.family === second.family ? -0.75 : 0;
    const phaseAdjustment = first.phase === second.phase ? -0.25 : 0;
    return Math.max(0.25, coordinateDistance + familyAdjustment + phaseAdjustment);
  }

  /*
   * Prevent a stored invention identifier from silently reappearing as an
   * ordinary letter in recursive modes. This is naming integrity, not an
   * interference device.
   */
  const originalMakeRecursiveNodes = app.makeRecursiveNodes.bind(app);
  app.makeRecursiveNodes = function makeRecursiveNodesWithIdentifierIntegrity(...args) {
    const nodes = originalMakeRecursiveNodes(...args);
    const reserved = new Set(this.inventionMemory.keys());
    const occupied = new Set(nodes.filter(node => node.memory || !reserved.has(node.symbol)).map(node => node.symbol));
    const available = this.rng.shuffle(SYMBOLS.filter(symbol => !reserved.has(symbol) && !occupied.has(symbol)));
    nodes.forEach(node => {
      if (!node.memory && reserved.has(node.symbol)) {
        node.symbol = available.shift();
        occupied.add(node.symbol);
      }
    });
    return nodes;
  };

  function canonicalReversal(trial) {
    const raw = [
      trial.nodes[0].categoryId, trial.nodes[0].form, trial.dirs[0],
      trial.nodes[1].categoryId, trial.nodes[1].form
    ];
    const reversed = [
      ontology.mirrorCategory(trial.nodes[1].categoryId), ontology.mirrorForm(trial.nodes[1].form),
      opposite(trial.dirs[0]),
      ontology.mirrorCategory(trial.nodes[0].categoryId), ontology.mirrorForm(trial.nodes[0].form)
    ];
    return raw.join('|') <= reversed.join('|') ? raw : reversed;
  }

  function canonicalEquivalence(trial) {
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
    const profile = [];
    const add = (id, value, weight, tier) => profile.push({ id, value: String(value), weight, tier });
    const effective = trial.nodes.map(effectiveNode);

    if (trial.mode === 0) {
      add('node0.category', trial.nodes[0].categoryId, 3, 1);
      add('node0.form', trial.nodes[0].form, 2, 1);
      add('edge.direction', trial.dirs[0], 5, 2);
      add('node1.category', trial.nodes[1].categoryId, 3, 1);
      add('node1.form', trial.nodes[1].form, 2, 1);
    } else if (trial.mode === 1) {
      const [c0, f0, direction, c1, f1] = canonicalReversal(trial);
      add('reversal.node0.category', c0, 3, 1);
      add('reversal.node0.form', f0, 2, 1);
      add('reversal.direction', direction, 5, 2);
      add('reversal.node1.category', c1, 3, 1);
      add('reversal.node1.form', f1, 2, 1);
      add('reversal.relation', ontology.relationCategory(c0, c1), 6, 3);
    } else if (trial.mode === 2) {
      trial.nodes.forEach((node, index) => {
        add(`node${index}.category`, node.categoryId, 3, 1);
        add(`node${index}.form`, node.form, 2, 1);
      });
      add('left.relation', ontology.relationCategory(effective[0].categoryId, effective[1].categoryId), 4, 2);
      add('right.relation', ontology.relationCategory(effective[1].categoryId, effective[2].categoryId), 4, 2);
      add('chain.turn', trial.turns[0], 5, 2);
      add('result.category', trial.resultCategory, 8, 3);
      add('result.form', trial.resultForm, 4, 3);
    } else if (trial.mode === 3) {
      const [c0, f0, c1, f1, quarter] = canonicalEquivalence(trial);
      add('equivalence.node0.category', c0, 3, 1);
      add('equivalence.node0.form', f0, 2, 1);
      add('equivalence.node1.category', c1, 3, 1);
      add('equivalence.node1.form', f1, 2, 1);
      add('equivalence.mapping', quarter, 6, 2);
      add('equivalence.relation', ontology.relationCategory(c0, c1), 7, 3);
    } else if (trial.mode === 4) {
      trial.nodes.forEach((node, index) => {
        add(`node${index}.category`, node.categoryId, 3, 1);
        add(`node${index}.form`, node.form, 2, 1);
      });
      add('turn0', trial.turns[0], 5, 2);
      add('turn1', trial.turns[1], 5, 2);
      const intermediate01 = ontology.composeCategory(effective[0].categoryId, effective[1].categoryId, 'SAME');
      const intermediate012 = ontology.composeCategory(intermediate01, effective[2].categoryId, trial.turns[0]);
      add('intermediate01', intermediate01, 5, 3);
      add('intermediate012', intermediate012, 6, 3);
      add('result.category', trial.resultCategory, 9, 3);
      add('result.form', trial.resultForm, 4, 3);
    } else if (trial.mode === 5) {
      trial.nodes.forEach((node, index) => {
        add(`wrapper${index}.category`, node.categoryId, 2, 1);
        add(`wrapper${index}.form`, node.form, 2, 1);
        add(`effective${index}.category`, effective[index].categoryId, 4, 2);
        add(`effective${index}.form`, effective[index].form, 3, 2);
        add(`lineage${index}`, digest(node), 9, 4);
      });
      add('recursive.direction', trial.dirs[0], 5, 2);
      add('recursive.relation', ontology.relationCategory(effective[0].categoryId, effective[1].categoryId), 6, 3);
      add('result.category', trial.resultCategory, 9, 3);
      add('result.form', trial.resultForm, 5, 3);
    } else {
      trial.nodes.forEach((node, index) => {
        add(`wrapper${index}.category`, node.categoryId, 2, 1);
        add(`wrapper${index}.form`, node.form, 2, 1);
        add(`effective${index}.category`, effective[index].categoryId, 4, 2);
        add(`effective${index}.form`, effective[index].form, 3, 2);
        add(`lineage${index}`, digest(node), 9, 4);
      });
      add('parallax.turn', trial.turns[0], 5, 2);
      add('left.relation', trial.leftRelationCategory, 6, 3);
      add('right.relation', trial.rightRelationCategory, 6, 3);
      add('relation.synthesis', trial.relationSynthesisCategory, 8, 3);
      add('node.synthesis', trial.nodeSynthesisCategory, 8, 3);
      add('reified.category', trial.reifiedCategory, 11, 3);
      add('transfer.category', trial.transferCategory, 8, 3);
    }
    return profile;
  }

  function compareLogic(firstTrial, secondTrial) {
    const first = new Map(logicProfile(firstTrial).map(item => [item.id, item]));
    const second = new Map(logicProfile(secondTrial).map(item => [item.id, item]));
    const ids = new Set([...first.keys(), ...second.keys()]);
    const totals = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const same = { 1: 0, 2: 0, 3: 0, 4: 0 };
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
      outcomeSimilarity: ratio(same[3], totals[3]),
      lineageSimilarity: ratio(same[4], totals[4]),
      highOrderDifference: changed.some(item => item.tier >= 2),
      changed
    };
  }

  function orderedBundles(trial, effective = false) {
    return trial.nodes.map(node => {
      const value = effective ? effectiveNode(node) : node;
      return `${value.categoryId}:${value.form}:${digest(node)}`;
    });
  }

  function bundleMultiset(trial, effective = false) {
    return orderedBundles(trial, effective).slice().sort().join('|');
  }

  function resultIdentity(trial) {
    if ([2, 4, 5].includes(trial.mode)) return `${trial.resultCategory}:${trial.resultForm}`;
    if (trial.mode === 6) return `${trial.reifiedCategory}:${trial.transferCategory}`;
    if (trial.mode === 3) return `Q${trial.mappingQuarter}`;
    return null;
  }

  function bindingPermutation(candidate, reference) {
    const plain = bundleMultiset(candidate) === bundleMultiset(reference)
      && orderedBundles(candidate).join('|') !== orderedBundles(reference).join('|');
    const effective = bundleMultiset(candidate, true) === bundleMultiset(reference, true)
      && orderedBundles(candidate, true).join('|') !== orderedBundles(reference, true).join('|');
    return plain || effective;
  }

  function constructionOutcomeConflict(candidate, reference) {
    const candidateResult = resultIdentity(candidate);
    const referenceResult = resultIdentity(reference);
    if (!candidateResult || !referenceResult) return 0;
    const sameOperators = bundleMultiset(candidate, true) === bundleMultiset(reference, true);
    if (candidateResult === referenceResult && candidate.signature !== reference.signature) return 1;
    if (sameOperators && candidateResult !== referenceResult) return 2;
    return 0;
  }

  function hiddenLineageConflict(candidate, reference) {
    if (candidate.mode < 5 || candidate.mode !== reference.mode) return false;
    const effectiveSame = candidate.nodes.every((node, index) => {
      const a = effectiveNode(node);
      const b = effectiveNode(reference.nodes[index]);
      return b && a.categoryId === b.categoryId && a.form === b.form;
    });
    return effectiveSame && candidate.nodes.some((node, index) => digest(node) !== digest(reference.nodes[index]));
  }

  function surfaceRefresh(trial) {
    const reservedInventions = trial.mode >= 5 ? new Set(app.inventionMemory.keys()) : new Set();
    const fixed = new Set(trial.nodes.filter(node => node.memory).map(node => node.memory.symbol));
    const available = app.rng.shuffle(SYMBOLS.filter(symbol => !reservedInventions.has(symbol) && !fixed.has(symbol)));
    trial.nodes.forEach(node => {
      node.symbol = node.memory ? node.memory.symbol : available.shift();
    });
    if (trial.mode >= 5) {
      const blocked = new Set([...reservedInventions, ...trial.nodes.map(node => node.symbol)]);
      const resultChoices = SYMBOLS.filter(symbol => !blocked.has(symbol));
      trial.invention = app.rng.pick(resultChoices);
    }
    trial.symbols = trial.nodes.map(node => node.symbol);
    return trial;
  }

  function synchroniseEquivalence(trial, sourceIndex) {
    if (trial.mode !== 3 || sourceIndex > 1) return;
    const targetIndex = sourceIndex + 2;
    trial.nodes[targetIndex].categoryId = ontology.mirrorCategory(trial.nodes[sourceIndex].categoryId);
    trial.nodes[targetIndex].form = ontology.mirrorForm(trial.nodes[sourceIndex].form);
    trial.nodes[targetIndex].memory = null;
  }

  function mutateCategory(trial) {
    const indices = trial.mode === 3 ? [0, 1] : trial.nodes.map((_, index) => index);
    const index = app.rng.pick(indices);
    const current = trial.nodes[index].categoryId;
    const choices = CATEGORIES
      .filter(item => item.id !== current)
      .map(item => ({ id: item.id, distance: categoryDistance(current, item.id) }))
      .sort((a, b) => a.distance - b.distance);
    trial.nodes[index].categoryId = app.rng.pick(choices.slice(0, Math.min(4, choices.length))).id;
    synchroniseEquivalence(trial, index);
    return true;
  }

  function mutatePerspective(trial) {
    if (trial.mode === 6) {
      const first = Math.floor(app.rng.next() * trial.nodes.length);
      let second = Math.floor(app.rng.next() * trial.nodes.length);
      if (second === first) second = (second + 1) % trial.nodes.length;
      [trial.nodes[first].form, trial.nodes[second].form] = [trial.nodes[second].form, trial.nodes[first].form];
      return true;
    }
    const indices = trial.mode === 3 ? [0, 1] : trial.nodes.map((_, index) => index);
    const index = app.rng.pick(indices);
    trial.nodes[index].form = app.rng.pick(FORMS.filter(form => form !== trial.nodes[index].form));
    synchroniseEquivalence(trial, index);
    return true;
  }

  function mutateTopology(trial) {
    if (trial.mode === 3) {
      const current = turnIndex(trial.dirs[0], trial.dirs[1]);
      const replacement = app.rng.pick([1, 2, 3].filter(quarter => quarter !== current));
      trial.dirs[1] = rotate(trial.dirs[0], replacement);
      return true;
    }
    const index = Math.floor(app.rng.next() * trial.dirs.length);
    trial.dirs[index] = rotate(trial.dirs[index], app.rng.pick([1, 2, 3]));
    return true;
  }

  function mutateBinding(trial) {
    const indices = trial.mode === 3 ? [0, 1] : trial.nodes.map((_, index) => index);
    if (indices.length < 2) return false;
    const first = app.rng.pick(indices);
    let second = app.rng.pick(indices);
    if (second === first) second = indices[(indices.indexOf(first) + 1) % indices.length];
    const bundle = { categoryId: trial.nodes[first].categoryId, form: trial.nodes[first].form };
    trial.nodes[first].categoryId = trial.nodes[second].categoryId;
    trial.nodes[first].form = trial.nodes[second].form;
    trial.nodes[second].categoryId = bundle.categoryId;
    trial.nodes[second].form = bundle.form;
    synchroniseEquivalence(trial, first);
    synchroniseEquivalence(trial, second);
    return true;
  }

  function mutateLineage(trial) {
    if (trial.mode < 5 || !app.inventionMemory.size) return false;
    const occupied = new Set(trial.nodes.map(node => node.symbol));
    const options = [];

    trial.nodes.forEach((node, nodeIndex) => {
      const oldEffective = effectiveNode(node);
      [...app.inventionMemory.values()].forEach(memory => {
        const newDigest = memory.canonicalDigest || memory.digest;
        if (occupied.has(memory.symbol) || digest(node) === newDigest) return;
        const newEffective = {
          categoryId: ontology.composeCategory(memory.categoryId, node.categoryId, 'SAME'),
          form: ontology.composeForms([memory.form, node.form])
        };
        const sameEffective = newEffective.categoryId === oldEffective.categoryId && newEffective.form === oldEffective.form;
        const sameStoredOutput = node.memory
          && memory.categoryId === node.memory.categoryId
          && memory.form === node.memory.form;
        const familyDistance = CATEGORY_BY_ID.get(newEffective.categoryId)?.family
          === CATEGORY_BY_ID.get(oldEffective.categoryId)?.family ? 0 : 1;
        options.push({
          nodeIndex,
          memory,
          rank: sameEffective ? 0 : sameStoredOutput ? 0.25 : 1 + familyDistance + categoryDistance(newEffective.categoryId, oldEffective.categoryId)
        });
      });
    });

    if (!options.length) return false;
    options.sort((a, b) => a.rank - b.rank);
    const bestRank = options[0].rank;
    const best = options.filter(option => option.rank <= bestRank + 0.25);
    const selected = app.rng.pick(best);
    trial.nodes[selected.nodeIndex].memory = clone(selected.memory);
    trial.nodes[selected.nodeIndex].symbol = selected.memory.symbol;
    return true;
  }

  function deriveCandidate(source, kind, forbiddenSignature) {
    const candidate = stripRuntime(source);
    let changed = false;
    if (kind === 'category') changed = mutateCategory(candidate);
    else if (kind === 'perspective') changed = mutatePerspective(candidate);
    else if (kind === 'topology') changed = mutateTopology(candidate);
    else if (kind === 'binding-permutation') changed = mutateBinding(candidate);
    else if (kind === 'recursive-lineage') changed = mutateLineage(candidate);
    else if (kind === 'proactive-reinstatement') changed = true;
    if (!changed) return null;
    surfaceRefresh(candidate);
    app.deriveTrial(candidate);
    if (candidate.signature === forbiddenSignature) return null;
    candidate._lureKind = kind;
    return candidate;
  }

  function snapshotGenerator() {
    return {
      categoryDeck: clone(app.categoryDeck || []),
      formDeck: clone(app.formDeck || []),
      turnDeck: clone(app.turnDeck || []),
      memory: [...app.inventionMemory.entries()].map(([key, value]) => [key, clone(value)])
    };
  }

  function restoreGenerator(snapshot) {
    app.categoryDeck = snapshot.categoryDeck;
    app.formDeck = snapshot.formDeck;
    app.turnDeck = snapshot.turnDeck;
    app.inventionMemory.clear();
    snapshot.memory.forEach(([key, value]) => app.inventionMemory.set(key, value));
  }

  function randomNonMatch(mode, forbiddenSignature) {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const candidate = app.makeBase(mode);
      if (candidate.signature !== forbiddenSignature) {
        candidate._lureKind = 'random';
        return candidate;
      }
    }
    const fallback = app.forceDifferentTrial(app.makeBase(mode), forbiddenSignature);
    fallback._lureKind = 'random';
    return fallback;
  }

  const KIND_PRIORITY = {
    'recursive-lineage': 6,
    'binding-permutation': 5,
    topology: 4,
    'proactive-reinstatement': 3,
    category: 2,
    perspective: 1,
    random: 0
  };

  function candidatePool(mode, target, distractors, level) {
    const snapshot = snapshotGenerator();
    const bySignature = new Map();
    const add = candidate => {
      if (!candidate || candidate.signature === target.signature) return;
      const existing = bySignature.get(candidate.signature);
      if (!existing || (KIND_PRIORITY[candidate._lureKind] || 0) > (KIND_PRIORITY[existing._lureKind] || 0)) {
        bySignature.set(candidate.signature, candidate);
      }
    };

    try {
      const kinds = ['topology', 'binding-permutation', 'category', 'perspective'];
      if (mode >= 5) kinds.unshift('recursive-lineage');
      const repetitions = 2 + Math.round(level / 10);
      kinds.forEach(kind => {
        for (let count = 0; count < repetitions; count += 1) add(deriveCandidate(target, kind, target.signature));
      });

      distractors.forEach(distractor => {
        add(deriveCandidate(distractor, 'proactive-reinstatement', target.signature));
        if (level >= 35) {
          add(deriveCandidate(distractor, 'topology', target.signature));
          add(deriveCandidate(distractor, 'binding-permutation', target.signature));
        }
      });

      const randomCount = Math.max(3, 12 - Math.round(level / 11));
      for (let count = 0; count < randomCount; count += 1) add(randomNonMatch(mode, target.signature));
    } finally {
      restoreGenerator(snapshot);
    }
    return [...bySignature.values()];
  }

  function scoreCandidate(candidate, target, distractors, level) {
    const ratio = level / 100;
    const targetComparison = compareLogic(candidate, target);
    const distractorComparisons = distractors.map(trial => ({ trial, comparison: compareLogic(candidate, trial) }));
    const strongestDistractor = distractorComparisons.reduce((best, item) => {
      return !best || item.comparison.similarity > best.comparison.similarity ? item : best;
    }, null);
    const exactDistractor = distractors.some(trial => trial.signature === candidate.signature);

    let score = targetComparison.similarity * (90 + 85 * ratio);
    score += targetComparison.constituentSimilarity * 24 * ratio;
    score += targetComparison.relationalSimilarity * 32 * ratio;
    if (targetComparison.highOrderDifference) score += 26 * ratio;
    if (bindingPermutation(candidate, target)) score += 26 * ratio;
    score += constructionOutcomeConflict(candidate, target) * 13 * ratio;
    if (hiddenLineageConflict(candidate, target)) score += 34 * ratio;

    if (strongestDistractor) {
      score += strongestDistractor.comparison.similarity * 48 * ratio;
      if (exactDistractor) score += 32 * ratio;
      if (bindingPermutation(candidate, strongestDistractor.trial)) score += 14 * ratio;
      score += constructionOutcomeConflict(candidate, strongestDistractor.trial) * 7 * ratio;
      if (hiddenLineageConflict(candidate, strongestDistractor.trial)) score += 18 * ratio;
    }

    score += (KIND_PRIORITY[candidate._lureKind] || 0) * 3 * ratio;
    if (level >= 55 && candidate.mode >= 2 && !targetComparison.highOrderDifference) score -= 55;
    if (candidate.signature === target.signature) score = Number.NEGATIVE_INFINITY;

    return { score, targetComparison, exactDistractor };
  }

  function selectNonMatch(mode, target, distractors, level) {
    if (level <= 0) {
      const random = randomNonMatch(mode, target.signature);
      delete random._lureKind;
      random.interferenceMeta = {
        level,
        mechanism: 'random-nonmatch',
        targetSimilarity: Number(compareLogic(random, target).similarity.toFixed(3)),
        highOrderDifference: compareLogic(random, target).highOrderDifference,
        proactiveExact: false,
        changedDimensions: compareLogic(random, target).changed.map(item => item.id)
      };
      return random;
    }

    const pool = candidatePool(mode, target, distractors, level);
    if (!pool.length) return selectNonMatch(mode, target, distractors, 0);
    const ranked = pool
      .map(candidate => ({ candidate, assessment: scoreCandidate(candidate, target, distractors, level) }))
      .filter(item => Number.isFinite(item.assessment.score))
      .sort((a, b) => b.assessment.score - a.assessment.score);
    if (!ranked.length) return selectNonMatch(mode, target, distractors, 0);

    const selectivity = level / 100;
    const rankSpan = Math.max(1, Math.ceil(ranked.length * (1 - 0.93 * selectivity)));
    const selected = ranked[Math.floor(app.rng.next() * rankSpan)];
    selected.candidate.interferenceMeta = {
      level,
      mechanism: selected.candidate._lureKind,
      targetSimilarity: Number(selected.assessment.targetComparison.similarity.toFixed(3)),
      highOrderDifference: selected.assessment.targetComparison.highOrderDifference,
      proactiveExact: selected.assessment.exactDistractor,
      changedDimensions: selected.assessment.targetComparison.changed.map(item => item.id)
    };
    delete selected.candidate._lureKind;
    return selected.candidate;
  }

  app.makeTrial = function makeTrialWithLogicEngineeredInterference() {
    const mode = this.settings().mode;
    const level = levelPercent();
    const targetCandidate = this.trials[this.trials.length - this.n];
    const target = targetCandidate?.mode === mode ? targetCandidate : null;
    const distractorStart = Math.max(0, this.trials.length - this.n + 1);
    const distractors = target ? this.trials.slice(distractorStart).filter(trial => trial.mode === mode) : [];
    let trial;
    let isMatch = false;

    if (!target) {
      trial = this.makeBase(mode);
    } else if (this.rng.next() < this.settings().matchProbability) {
      trial = this.surfaceVariant(target);
      isMatch = true;
      trial.interferenceMeta = {
        level,
        mechanism: 'structural-match-through-permitted-invariance',
        targetSimilarity: 1,
        highOrderDifference: false,
        proactiveExact: false,
        changedDimensions: []
      };
    } else {
      trial = selectNonMatch(mode, target, distractors, level);
      if (trial.signature === target.signature) trial = this.forceDifferentTrial(trial, target.signature);
    }

    trial.isMatch = isMatch;
    trial.scored = Boolean(target);
    trial.interferenceLevel = level;
    this.rememberInvention(trial);
    return trial;
  };

  const failures = [];
  try {
    const sample = app.deriveTrial({
      mode: 0,
      nodes: [
        { symbol: 'B', categoryId: 'DIVISION', form: 'I', memory: null },
        { symbol: 'C', categoryId: 'MULTIPLICATION', form: 'O', memory: null }
      ],
      dirs: ['E']
    });
    const renamed = stripRuntime(sample);
    renamed.nodes[0].symbol = 'X';
    renamed.nodes[1].symbol = 'Y';
    app.deriveTrial(renamed);
    if (JSON.stringify(logicProfile(sample)) !== JSON.stringify(logicProfile(renamed))) failures.push('surface-symbol-entered-logic');

    const turned = stripRuntime(sample);
    turned.dirs[0] = 'N';
    app.deriveTrial(turned);
    if (JSON.stringify(logicProfile(sample)) === JSON.stringify(logicProfile(turned))) failures.push('direction-absent-from-logic');

    const savedMemory = [...app.inventionMemory.entries()];
    const savedDecks = [clone(app.categoryDeck || []), clone(app.formDeck || []), clone(app.turnDeck || [])];
    app.inventionMemory.clear();
    app.inventionMemory.set('B', {
      symbol: 'B', categoryId: 'CONNECTION', form: 'A', digest: 'TEST', canonicalDigest: 'TEST', depth: 1, lineage: []
    });
    const plain = app.makeRecursiveNodes(2, [0, 0]);
    if (plain.some(node => !node.memory && node.symbol === 'B')) failures.push('invention-identifier-used-as-plain-symbol');
    app.inventionMemory.clear();
    savedMemory.forEach(([key, value]) => app.inventionMemory.set(key, value));
    [app.categoryDeck, app.formDeck, app.turnDeck] = savedDecks;
  } catch (error) {
    failures.push(`exception:${error.message}`);
  }
  if (failures.length) console.error('Cognitive interference v3 self-test failed', failures);

  window.__interferenceTestAPI = {
    version: 3,
    levelPercent,
    logicProfile,
    compareLogic,
    scoreCandidate,
    resultIdentity,
    bindingPermutation,
    constructionOutcomeConflict,
    hiddenLineageConflict,
    design: 'logic-space competition across target, intervening premises, topology, outcomes and recursive lineage',
    symbolsDriveInterference: false,
    inventionIdentifiersRemainLogical: true,
    selfTestPassed: failures.length === 0
  };
});
