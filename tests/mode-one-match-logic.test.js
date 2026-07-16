'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const DIRS = ['N', 'E', 'S', 'W'];
const CATEGORIES = [
  { id: 'ALL', coord: [-1, -1] },
  { id: 'DIFFERENCE', coord: [0, -1] },
  { id: 'ACTION', coord: [1, -1] },
  { id: 'DIVISION', coord: [-1, 0] },
  { id: 'CONNECTION', coord: [0, 0] },
  { id: 'MULTIPLICATION', coord: [1, 0] },
  { id: 'PROJECTION', coord: [-1, 1] },
  { id: 'ENCOMPASSMENT', coord: [0, 1] },
  { id: 'COMPLETION', coord: [1, 1] }
];
const BY_ID = new Map(CATEGORIES.map(item => [item.id, item]));
const BY_COORD = new Map(CATEGORIES.map(item => [item.coord.join(','), item]));
const SYMBOLS = 'BCDEFGHJKLMNOPQRSTUVWXYZ'.split('');

const turn = (first, second) =>
  ['SAME', 'RIGHT', 'REVERSE', 'LEFT'][
    (DIRS.indexOf(second) - DIRS.indexOf(first) + 4) % 4
  ];

function rotateCoord([x, y], relationTurn) {
  if (relationTurn === 'RIGHT') return [y, -x];
  if (relationTurn === 'REVERSE') return [-x, -y];
  if (relationTurn === 'LEFT') return [-y, x];
  return [x, y];
}

function coordCategory(x, y) {
  const key = `${Math.sign(x)},${Math.sign(y)}`;
  return (BY_COORD.get(key) || BY_ID.get('CONNECTION')).id;
}

function composeCategory(firstId, secondId, relationTurn = 'SAME') {
  const [ax, ay] = BY_ID.get(firstId).coord;
  const [bx, by] = rotateCoord(BY_ID.get(secondId).coord, relationTurn);
  return coordCategory(ax + bx, ay + by);
}

function relationCategory(firstId, secondId) {
  const [ax, ay] = BY_ID.get(firstId).coord;
  const [bx, by] = BY_ID.get(secondId).coord;
  return coordCategory(bx - ax, by - ay);
}

function composeForms(forms) {
  const unique = new Set(forms);
  if (unique.size === 1) return forms[0];
  if (unique.has('I') && unique.has('O')) return 'A';
  if (unique.has('I')) return 'I';
  if (unique.has('O')) return 'O';
  return 'A';
}

class RNG {
  constructor(seed = 0x5eed1234) {
    this.s = seed >>> 0;
  }

  next() {
    let value = this.s += 1831565813;
    value = Math.imul(value ^ value >>> 15, 1 | value);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }

  pick(values) {
    return values[Math.floor(this.next() * values.length)];
  }

  shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.next() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }
}

const descriptor = node => `${node.categoryId}|${node.form}|NEW`;

function deriveModeOne(trial) {
  trial.symbols = trial.nodes.map(node => node.symbol);
  trial.turns = [turn(trial.dirs[0], trial.dirs[1])];

  const [first, middle, last] = trial.nodes;
  trial.leftRelationCategory = relationCategory(first.categoryId, middle.categoryId);
  trial.rightRelationCategory = relationCategory(middle.categoryId, last.categoryId);
  trial.nodeSynthesisCategory = composeCategory(
    composeCategory(first.categoryId, middle.categoryId, 'SAME'),
    last.categoryId,
    trial.turns[0]
  );
  trial.relationSynthesisCategory = composeCategory(
    trial.leftRelationCategory,
    trial.rightRelationCategory,
    trial.turns[0]
  );
  trial.integratedCategory = composeCategory(
    trial.nodeSynthesisCategory,
    trial.relationSynthesisCategory,
    trial.turns[0]
  );
  trial.integratedForm = composeForms(trial.nodes.map(node => node.form));
  trial.signature = [
    'M0-T3',
    descriptor(first), trial.dirs[0],
    descriptor(middle), trial.dirs[1],
    descriptor(last), trial.turns[0],
    trial.leftRelationCategory,
    trial.rightRelationCategory,
    trial.nodeSynthesisCategory,
    trial.relationSynthesisCategory,
    trial.integratedCategory,
    trial.integratedForm
  ].join('|');
  return trial;
}

function logicProfile(trial) {
  const profile = [];
  const add = (id, value, weight, tier) =>
    profile.push({ id, value: String(value), weight, tier });

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

const app = {
  rng: new RNG(),
  trials: [],
  n: 1,
  categoryDeck: [],
  formDeck: [],
  turnDeck: [],

  settings() {
    return { mode: 0, matchProbability: 0.35 };
  },

  deriveTrial(trial) {
    return deriveModeOne(trial);
  },

  makeBase() {
    const categoryIds = this.rng.shuffle(CATEGORIES.map(item => item.id)).slice(0, 3);
    const forms = [
      this.rng.pick(['I', 'O', 'A']),
      this.rng.pick(['I', 'O', 'A']),
      this.rng.pick(['I', 'O', 'A'])
    ];
    const firstDirection = this.rng.pick(DIRS);
    const secondDirection = this.rng.pick(DIRS.filter(item => item !== firstDirection));
    return this.deriveTrial({
      mode: 0,
      nodes: categoryIds.map((categoryId, index) => ({
        symbol: SYMBOLS[index],
        categoryId,
        form: forms[index],
        memory: null
      })),
      dirs: [firstDirection, secondDirection]
    });
  },

  renameSurfaceSymbols(trial) {
    const symbols = this.rng.shuffle(SYMBOLS).slice(0, 3);
    trial.nodes.forEach((node, index) => {
      node.symbol = symbols[index];
    });
    this.deriveTrial(trial);
  },

  surfaceVariant(target) {
    const candidate = JSON.parse(JSON.stringify(target));
    this.renameSurfaceSymbols(candidate);
    return candidate;
  },

  makeTrial() {
    const target = this.trials[this.trials.length - this.n];
    if (!target) return Object.assign(this.makeBase(), { isMatch: false, scored: false });
    let candidate;
    do {
      candidate = this.makeBase();
    } while (candidate.signature === target.signature);
    return Object.assign(candidate, { isMatch: false, scored: true });
  }
};

global.document = {
  getElementById(id) {
    return { value: id === 'interference-slider' ? '60' : '0' };
  }
};

global.window = {
  __ontologicalWorlds: app,
  __ontologyTestAPI: {
    categories: CATEGORIES,
    turn,
    composeCategory,
    relationCategory,
    composeForms
  },
  __modeOneInterferenceTestAPI: { compareLogic },
  addEventListener(eventName, callback) {
    if (eventName === 'DOMContentLoaded') callback();
  }
};

const productionPath = path.join(__dirname, '..', 'mode-one-match-logic.js');
vm.runInThisContext(fs.readFileSync(productionPath, 'utf8'), {
  filename: productionPath
});

const api = window.__modeOneMatchLogicTestAPI;
assert(api, 'Mode 1 test API was not exposed.');
assert.strictEqual(api.version, 2);
assert.strictEqual(api.exhaustiveAudit.passed, true, api.exhaustiveAudit.failures.join(', '));
assert.strictEqual(api.exhaustiveAudit.identityCount, 27);
assert.strictEqual(api.exhaustiveAudit.testedIdentities, 27);
assert.strictEqual(api.exhaustiveAudit.realisationCount, 6048);
assert.strictEqual(api.rawTemplateDeterminesMatch, false);
assert.strictEqual(api.lettersDetermineMatch, false);
assert.strictEqual(api.generationBranchDeterminesAnswer, false);
assert.strictEqual(api.matchAndNonMatchUsePairedCueCalibration, true);

for (const n of [1, 2, 3, 5]) {
  app.n = n;
  app.trials = [];
  let matches = 0;
  let nonMatches = 0;

  for (let index = 0; index < 200; index += 1) {
    const trial = app.makeTrial();
    if (trial.scored) {
      const target = app.trials[app.trials.length - n];
      const recomputed =
        app.matchSignature(trial, 0) === app.matchSignature(target, 0);
      assert.strictEqual(trial.isMatch, recomputed);
      if (trial.isMatch) matches += 1;
      else nonMatches += 1;
    }
    app.trials.push(trial);
  }

  assert(matches > 0, `N=${n} produced no MATCH trials.`);
  assert(nonMatches > 0, `N=${n} produced no NO MATCH trials.`);
}

console.log(JSON.stringify({
  passed: true,
  exhaustiveAudit: api.exhaustiveAudit,
  simulatedTrials: 800,
  testedN: [1, 2, 3, 5]
}, null, 2));
