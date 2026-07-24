'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const modeTwo = require(path.join(__dirname, '..', 'mode-two-ontology-nback-v14.js'));

const LEVELS = [...modeTwo.LEVELS];
const DIRS = core.DIRECTIONS.map(item => item.code);
const VECTORS = new Map(core.DIRECTIONS.map(item => [item.code, [item.x, item.y]]));

function oracleDirection(x, y) {
  const angle = (Math.atan2(x, y) + Math.PI * 2) % (Math.PI * 2);
  return DIRS[Math.round(angle / (Math.PI * 2 / 16)) % 16];
}

function oracleEvaluate(trial) {
  if (!trial || !Array.isArray(trial.premises) || trial.premises.length !== 2 || !trial.conclusion) return false;
  const nodes = new Set();
  const adjacency = new Map();
  const connect = (a, b) => {
    nodes.add(a); nodes.add(b);
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a).add(b);
  };
  for (const premise of trial.premises) {
    if (!VECTORS.has(premise.relation)) return false;
    connect(premise.subject, premise.object);
    connect(premise.object, premise.subject);
  }
  if (nodes.size !== 3) return false;
  const endpoints = [...nodes].filter(node => adjacency.get(node).size === 1);
  if (endpoints.length !== 2) return false;
  if (!endpoints.includes(trial.conclusion.subject) || !endpoints.includes(trial.conclusion.object)) return false;

  const positions = new Map();
  const first = trial.premises[0];
  positions.set(first.object, [0, 0]);
  const [fx, fy] = VECTORS.get(first.relation);
  positions.set(first.subject, [fx, fy]);
  for (let pass = 0; pass < 6; pass += 1) {
    for (const premise of trial.premises) {
      const [dx, dy] = VECTORS.get(premise.relation);
      const subject = positions.get(premise.subject);
      const object = positions.get(premise.object);
      if (object && !subject) positions.set(premise.subject, [object[0] + dx, object[1] + dy]);
      if (subject && !object) positions.set(premise.object, [subject[0] - dx, subject[1] - dy]);
    }
  }
  const subject = positions.get(trial.conclusion.subject);
  const object = positions.get(trial.conclusion.object);
  if (!subject || !object) return false;
  const expected = oracleDirection(subject[0] - object[0], subject[1] - object[1]);
  return expected === trial.conclusion.relation;
}

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() {
    let value = this.s += 1831565813;
    value = Math.imul(value ^ value >>> 15, 1 | value);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.next() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }
}

let canonicalChecks = 0;
for (const trial of core.canonicalTrials()) {
  assert.strictEqual(oracleEvaluate(trial), trial.expected);
  assert.strictEqual(modeTwo.evaluate(trial).isMatch, trial.expected);
  canonicalChecks += 1;
}
assert.strictEqual(canonicalChecks, 10);

let generatedParityChecks = 0;
let metadataNeutralityChecks = 0;
let renamingChecks = 0;
let orderChecks = 0;
let inversionChecks = 0;
let renderedOutputChecks = 0;
for (let seed = 1; seed <= 4096; seed += 1) {
  const rng = new Rng(seed);
  for (let index = 0; index < 256; index += 1) {
    const trial = modeTwo.generateTrial(rng, {
      matchProbability: index % 2 === 0 ? 1 : 0,
      interferenceLevel: index % 101
    });
    const expected = oracleEvaluate(trial);
    assert.strictEqual(modeTwo.evaluate(trial).isMatch, expected);
    generatedParityChecks += 1;

    const rendered = modeTwo.renderOntologicalTrial(trial);
    assert.doesNotMatch(rendered, /archetypal/i);
    assert.strictEqual((rendered.match(/\b(?:Inner|Outer)\b/g) || []).length, 2);
    renderedOutputChecks += 1;

    if (index % 31 === 0) {
      const metadata = JSON.parse(JSON.stringify(trial));
      metadata.ontologyCategories = ['All', 'Projection', 'Completion'];
      metadata.order = 'OI';
      assert.strictEqual(modeTwo.evaluate(metadata).isMatch, expected);
      const metadataRendered = modeTwo.renderOntologicalTrial(metadata);
      assert.doesNotMatch(metadataRendered, /archetypal/i);
      assert.strictEqual((metadataRendered.match(/\b(?:Inner|Outer)\b/g) || []).length, 2);
      metadataNeutralityChecks += 1;

      const letters = trial.letters;
      const renamed = core.renameTrial(trial, { [letters[0]]: 'X', [letters[1]]: 'Y', [letters[2]]: 'Z' });
      assert.strictEqual(oracleEvaluate(renamed), expected);
      assert.strictEqual(modeTwo.evaluate(renamed).isMatch, expected);
      renamingChecks += 1;

      const reordered = JSON.parse(JSON.stringify(trial));
      reordered.premises.reverse();
      assert.strictEqual(oracleEvaluate(reordered), expected);
      assert.strictEqual(modeTwo.evaluate(reordered).isMatch, expected);
      orderChecks += 1;

      const inverted = JSON.parse(JSON.stringify(trial));
      inverted.premises = inverted.premises.map(core.invert);
      assert.strictEqual(oracleEvaluate(inverted), expected);
      assert.strictEqual(modeTwo.evaluate(inverted).isMatch, expected);
      inversionChecks += 1;
    }
  }
}
assert.strictEqual(generatedParityChecks, 1048576);
assert.strictEqual(renderedOutputChecks, 1048576);

let warmupChecks = 0;
for (const level of LEVELS) {
  for (let index = 0; index < level; index += 1) {
    const result = modeTwo.evaluateHistory([], index, level);
    assert.strictEqual(result.warmup, true);
    assert.strictEqual(result.scored, false);
    assert.strictEqual(result.targetIndex, index - level);
    warmupChecks += 1;
  }
}
assert.strictEqual(warmupChecks, 36);

let longHistoryChecks = 0;
let longHistoryMatches = 0;
let longHistoryNonMatches = 0;
for (let seed = 1; seed <= 1024; seed += 1) {
  const rng = new Rng(0x60000000 + seed);
  const history = Array.from({ length: 2048 }, (_, index) => modeTwo.generateTrial(rng, {
    matchProbability: index % 2 === 0 ? 1 : 0,
    interferenceLevel: (seed + index) % 101
  }));
  for (const level of LEVELS) {
    for (let currentIndex = level; currentIndex < history.length; currentIndex += 1) {
      const result = modeTwo.evaluateHistory(history, currentIndex, level);
      const expected = oracleEvaluate(history[currentIndex]);
      assert.strictEqual(result.targetIndex, currentIndex - level);
      assert.strictEqual(result.isMatch, expected);
      if (expected) longHistoryMatches += 1;
      else longHistoryNonMatches += 1;
      longHistoryChecks += 1;
    }
  }
}
assert.strictEqual(longHistoryChecks, 16744448);
assert.strictEqual(longHistoryMatches + longHistoryNonMatches, longHistoryChecks);

const audit = modeTwo.runExhaustiveAudit(262144);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures, null, 2));
assert.strictEqual(audit.totalEvaluations, 2097152);
assert.strictEqual(audit.matches, 1048576);
assert.strictEqual(audit.nonMatches, 1048576);
assert.strictEqual(audit.matchRate, 0.5);
assert.strictEqual(audit.nonMatchRate, 0.5);
assert.strictEqual(audit.renderChecks, 2097152);
assert.strictEqual(audit.failures.length, 0);
for (const level of audit.perLevel) {
  assert.strictEqual(level.evaluations, 262144);
  assert.strictEqual(level.matches, 131072);
  assert.strictEqual(level.nonMatches, 131072);
  assert.strictEqual(level.falseMatches, 0);
  assert.strictEqual(level.falseNonMatches, 0);
  assert.strictEqual(level.wrongOffsetFailures, 0);
  assert.strictEqual(level.ontologyMutationFailures, 0);
  assert.strictEqual(level.renamingFailures, 0);
  assert.strictEqual(level.premiseOrderFailures, 0);
  assert.strictEqual(level.inversionFailures, 0);
  assert.strictEqual(level.renderFailures, 0);
}

console.log(JSON.stringify({
  passed: true,
  canonicalChecks,
  generatedParityChecks,
  renderedOutputChecks,
  metadataNeutralityChecks,
  renamingChecks,
  orderChecks,
  inversionChecks,
  warmupChecks,
  longHistoryChecks,
  longHistoryMatches,
  longHistoryNonMatches,
  exhaustiveAudit: {
    totalEvaluations: audit.totalEvaluations,
    matches: audit.matches,
    nonMatches: audit.nonMatches,
    matchRate: audit.matchRate,
    nonMatchRate: audit.nonMatchRate,
    renderChecks: audit.renderChecks,
    failures: audit.failures.length,
    perLevel: audit.perLevel
  }
}, null, 2));
