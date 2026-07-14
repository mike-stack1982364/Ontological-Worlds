'use strict';

/*
 * Customisable cognitive interference for Ontological-Worlds.
 *
 * Interference is relational, not sensory noise. As the slider rises, the
 * generator increasingly:
 *   1. reuses one recent symbol in a different ontological role;
 *   2. selects non-matches with partial structural overlap and stronger
 *      direction/category conflict;
 *   3. preserves exact scoring while blocking repeated or reversed symbol
 *      pairs that could be recognised without relational integration.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const slider = document.getElementById('interference-slider');
  const valueLabel = document.getElementById('interference-val');
  const ontology = window.__ontologyTestAPI;
  if (!app || !slider || !valueLabel || !ontology) return;

  const STORAGE_KEY = 'ontological_worlds_interference_v1';
  const CATEGORY_BY_ID = new Map(ontology.categories.map(item => [item.id, item]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const opposite = direction => ({ N: 'S', S: 'N', E: 'W', W: 'E' })[direction];
  const isVertical = direction => direction === 'N' || direction === 'S';
  const isPerpendicular = (first, second) => Boolean(first && second && isVertical(first) !== isVertical(second));

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

  function categoryRelation(firstId, secondId) {
    if (firstId === secondId) return 'same';
    if (ontology.mirrorCategory(firstId) === secondId) return 'mirror';
    const first = CATEGORY_BY_ID.get(firstId);
    const second = CATEGORY_BY_ID.get(secondId);
    if (first?.family && first.family === second?.family) return 'family';
    return 'different';
  }

  function nodeConflict(candidateNode, priorNode) {
    if (!candidateNode || !priorNode) return 0;
    const relation = categoryRelation(candidateNode.categoryId, priorNode.categoryId);
    let score = relation === 'same' ? 2 : relation === 'mirror' ? 4 : relation === 'family' ? 3 : 1;
    if (candidateNode.form !== priorNode.form) score += relation === 'same' ? 4 : 2;
    if (Boolean(candidateNode.memory) !== Boolean(priorNode.memory)) score += 1;
    return score;
  }

  function partialLureScore(candidate, target) {
    if (!candidate || !target || candidate.mode !== target.mode || candidate.signature === target.signature) return 0;
    let shared = 0;
    let different = 0;
    const nodeCount = Math.min(candidate.nodes.length, target.nodes.length);
    for (let index = 0; index < nodeCount; index += 1) {
      const current = candidate.nodes[index];
      const prior = target.nodes[index];
      if (current.categoryId === prior.categoryId) shared += 3;
      else different += 1;
      if (current.form === prior.form) shared += 2;
      else different += 1;
      const currentDigest = current.memory?.canonicalDigest || current.memory?.digest || null;
      const priorDigest = prior.memory?.canonicalDigest || prior.memory?.digest || null;
      if (currentDigest && currentDigest === priorDigest) shared += 4;
      else if (currentDigest || priorDigest) different += 1;
    }
    const directionCount = Math.min(candidate.dirs.length, target.dirs.length);
    for (let index = 0; index < directionCount; index += 1) {
      if (candidate.dirs[index] === target.dirs[index]) shared += 2;
      else different += 1;
    }
    return different > 0 ? shared : 0;
  }

  function recentConflictScore(candidate, previous) {
    if (!previous || candidate.mode !== previous.mode) return 0;
    let score = 0;
    const nodeCount = Math.min(candidate.nodes.length, previous.nodes.length);
    for (let index = 0; index < nodeCount; index += 1) {
      score += nodeConflict(candidate.nodes[index], previous.nodes[index]);
    }
    const directionCount = Math.min(candidate.dirs.length, previous.dirs.length);
    for (let index = 0; index < directionCount; index += 1) {
      const current = candidate.dirs[index];
      const prior = previous.dirs[index];
      if (isPerpendicular(current, prior)) score += 5;
      else if (current === prior || current === opposite(prior)) score += 0;
    }
    return score;
  }

  function candidateInterferenceScore(candidate, target, previous) {
    const inherited = candidate.nodes.reduce((sum, node) => sum + (node.memory ? 4 : 0), 0);
    return partialLureScore(candidate, target) + recentConflictScore(candidate, previous) + inherited;
  }

  function relationPairs(trial) {
    if (!trial?.nodes?.length) return [];
    const pairs = [];
    const add = (first, second) => {
      const a = trial.nodes[first]?.symbol;
      const b = trial.nodes[second]?.symbol;
      if (a && b) pairs.push([a, b].sort().join(':'));
    };
    if (trial.mode === 3) {
      add(0, 1);
      add(2, 3);
      return pairs;
    }
    for (let index = 0; index < trial.nodes.length - 1; index += 1) add(index, index + 1);
    return pairs;
  }

  function recentPairSet(history) {
    const result = new Set();
    history.forEach(trial => relationPairs(trial).forEach(pair => result.add(pair)));
    return result;
  }

  function recentSymbolSources(history, windowSize) {
    const start = Math.max(0, history.length - Math.max(1, windowSize));
    const sources = [];
    for (let trialIndex = start; trialIndex < history.length; trialIndex += 1) {
      const trial = history[trialIndex];
      if (!trial?.nodes) continue;
      trial.nodes.forEach((node, roleIndex) => {
        if (!node?.symbol) return;
        sources.push({
          symbol: node.symbol,
          categoryId: node.categoryId,
          form: node.form,
          roleIndex,
          age: history.length - trialIndex,
          memory: node.memory || null
        });
      });
    }
    return sources;
  }

  function carryRoleScore(source, targetNode, targetIndex) {
    let score = nodeConflict(targetNode, source);
    if (source.roleIndex !== targetIndex) score += 3;
    score += Math.max(0, 3 - source.age) * 0.25;
    return score;
  }

  function applyOneCarry(trial, history, n, usedCarriedSymbols) {
    const sources = recentSymbolSources(history, n)
      .filter(source => !usedCarriedSymbols.has(source.symbol));
    const eligibleTargets = trial.nodes
      .map((node, index) => ({ node, index }))
      .filter(({ node }) => !node.memory);
    if (!sources.length || !eligibleTargets.length) return false;

    const existingSymbols = new Set(trial.nodes.map(node => node.symbol));
    const priorPairs = recentPairSet(history);
    const options = [];
    sources.forEach(source => {
      if (existingSymbols.has(source.symbol)) return;
      eligibleTargets.forEach(({ node, index }) => {
        options.push({ source, index, score: carryRoleScore(source, node, index) });
      });
    });
    options.sort((a, b) => b.score - a.score);

    const limit = Math.min(options.length, 24);
    for (let optionIndex = 0; optionIndex < limit; optionIndex += 1) {
      const option = options[optionIndex];
      const attempt = clone(trial);
      attempt.nodes[option.index].symbol = option.source.symbol;
      const symbols = attempt.nodes.map(node => node.symbol);
      if (new Set(symbols).size !== symbols.length) continue;
      app.deriveTrial(attempt);
      if (relationPairs(attempt).some(pair => priorPairs.has(pair))) continue;
      Object.keys(trial).forEach(key => delete trial[key]);
      Object.assign(trial, attempt);
      usedCarriedSymbols.add(option.source.symbol);
      return true;
    }
    return false;
  }

  function applyRelationalCarry(trial, history, n, level) {
    if (!history.length || level <= 0) return trial;
    const guaranteed = level >= 100;
    const firstCarry = guaranteed || app.rng.next() < level / 100;
    if (!firstCarry) return trial;

    const used = new Set();
    applyOneCarry(trial, history, n, used);

    if (trial.nodes.length >= 3 && level > 65) {
      const secondProbability = (level - 65) / 70;
      if (app.rng.next() < secondProbability) applyOneCarry(trial, history, n, used);
    }
    return trial;
  }

  function chooseNonMatch(mode, target, previous, level) {
    const poolSize = 1 + Math.round(level / 8);
    const candidates = [];
    let attempts = 0;
    while (candidates.length < poolSize && attempts < poolSize * 40) {
      let candidate = this.makeBase(mode);
      attempts += 1;
      if (candidate.signature === target.signature) continue;
      candidates.push(candidate);
    }
    if (!candidates.length) {
      const fallback = this.makeBase(mode);
      return fallback.signature === target.signature
        ? this.forceDifferentTrial(fallback, target.signature)
        : fallback;
    }
    if (level <= 0) return candidates[0];
    candidates.sort((a, b) => candidateInterferenceScore(b, target, previous) - candidateInterferenceScore(a, target, previous));
    const selectivity = level / 100;
    const rankSpan = Math.max(1, Math.ceil(candidates.length * (1 - selectivity * 0.85)));
    return candidates[Math.floor(this.rng.next() * rankSpan)];
  }

  app.makeTrial = function makeTrialWithRelationalInterference() {
    const mode = this.settings().mode;
    const level = interferencePercent();
    const candidateTarget = this.trials[this.trials.length - this.n];
    const target = candidateTarget?.mode === mode ? candidateTarget : null;
    const previous = this.trials.length ? this.trials[this.trials.length - 1] : null;
    let trial;
    let isMatch = false;

    if (!target) {
      trial = this.makeBase(mode);
    } else if (this.rng.next() < this.settings().matchProbability) {
      trial = this.surfaceVariant(target);
      isMatch = true;
    } else {
      trial = chooseNonMatch.call(this, mode, target, previous, level);
      if (trial.signature === target.signature) trial = this.forceDifferentTrial(trial, target.signature);
    }

    applyRelationalCarry(trial, this.trials, this.n, level);
    trial.isMatch = isMatch;
    trial.scored = Boolean(target);
    trial.interferenceLevel = level;
    this.rememberInvention(trial);
    return trial;
  };

  window.__interferenceTestAPI = {
    version: 1,
    interferencePercent,
    relationPairs,
    partialLureScore,
    recentConflictScore,
    candidateInterferenceScore,
    design: 'relational-role carry plus partial-structure non-match selection',
    sensoryNoise: false
  };
});
