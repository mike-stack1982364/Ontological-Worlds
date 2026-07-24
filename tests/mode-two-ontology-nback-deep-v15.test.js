'use strict';

const assert = require('assert');
const path = require('path');
const modeTwo = require(path.join(__dirname, '..', 'mode-two-ontology-nback-v14.js'));

const LEVELS = [...modeTwo.LEVELS];
const PROFILES = modeTwo.baseProfiles();
const FAMILIES = Object.keys(modeTwo.FAMILY_MEMBERS);
const ORDERS = [...modeTwo.FORM_ORDERS];
const DIRECTIONS = [...modeTwo.DIRECTIONS];

function oracleFamily(trial) {
  const name = trial?.ontology?.name || trial?.ontologyName || trial?.ontology;
  const family = trial?.ontology?.family;
  return family || modeTwo.ONTOLOGY_FAMILIES[name] || null;
}

function oracleDirection(trial) {
  if (trial?.composedDirection) return trial.composedDirection;
  const vector = { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] };
  const first = vector[trial?.dirs?.[0]];
  const second = vector[trial?.dirs?.[1]];
  if (!first || !second) return null;
  const x = first[0] + second[0];
  const y = first[1] + second[1];
  if (x === 0 && y === 0) return 'BALANCE';
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'E' : 'W';
  if (Math.abs(y) > Math.abs(x)) return y > 0 ? 'N' : 'S';
  return `${y > 0 ? 'N' : 'S'}${x > 0 ? 'E' : 'W'}`;
}

function oracleSignature(trial) {
  return {
    family: oracleFamily(trial),
    order: trial?.order || trial?.formOrder || null,
    direction: oracleDirection(trial)
  };
}

function oracleCompare(current, target) {
  const a = oracleSignature(current);
  const b = oracleSignature(target);
  return a.family === b.family && a.order === b.order && a.direction === b.direction;
}

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

function randomTrial(rng) {
  const family = pick(rng, FAMILIES);
  const members = modeTwo.FAMILY_MEMBERS[family];
  return {
    mode: 1,
    publicMode: 2,
    ontology: { name: pick(rng, members), family },
    order: pick(rng, ORDERS),
    dirs: [pick(rng, DIRECTIONS), pick(rng, DIRECTIONS)],
    symbols: [String.fromCharCode(65 + Math.floor(rng() * 26)), String.fromCharCode(65 + Math.floor(rng() * 26)), String.fromCharCode(65 + Math.floor(rng() * 26))]
  };
}

let parityComparisons = 0;
for (const current of PROFILES) {
  for (const target of PROFILES) {
    assert.strictEqual(modeTwo.compare(current, target).isMatch, oracleCompare(current, target));
    parityComparisons += 1;
  }
}
assert.strictEqual(parityComparisons, 230400);

let warmupChecks = 0;
for (const level of LEVELS) {
  for (let currentIndex = 0; currentIndex < level; currentIndex += 1) {
    const history = Array.from({ length: currentIndex + 1 }, (_, index) => PROFILES[index]);
    const result = modeTwo.evaluateHistory(history, currentIndex, level);
    assert.strictEqual(result.warmup, true);
    assert.strictEqual(result.scored, false);
    assert.strictEqual(result.targetIndex, currentIndex - level);
    warmupChecks += 1;
  }
}
assert.strictEqual(warmupChecks, 36);

let longHistoryChecks = 0;
let longHistoryMatches = 0;
let longHistoryNonMatches = 0;
for (let seed = 1; seed <= 512; seed += 1) {
  const rng = seeded(seed);
  const history = Array.from({ length: 512 }, () => randomTrial(rng));
  for (const level of LEVELS) {
    for (let currentIndex = level; currentIndex < history.length; currentIndex += 1) {
      const result = modeTwo.evaluateHistory(history, currentIndex, level);
      const expected = oracleCompare(history[currentIndex], history[currentIndex - level]);
      assert.strictEqual(result.targetIndex, currentIndex - level);
      assert.strictEqual(result.isMatch, expected);
      assert.strictEqual(result.warmup, false);
      assert.strictEqual(result.scored, true);
      if (expected) longHistoryMatches += 1;
      else longHistoryNonMatches += 1;
      longHistoryChecks += 1;
    }
  }
}
assert.strictEqual(longHistoryChecks, 2078720);
assert.strictEqual(longHistoryMatches + longHistoryNonMatches, longHistoryChecks);

let adversarialChecks = 0;
for (const profile of PROFILES) {
  const family = oracleFamily(profile);
  const members = modeTwo.FAMILY_MEMBERS[family];
  const sameFamilyName = members[(members.indexOf(profile.ontology.name) + 1) % members.length];
  const equivalent = {
    ...profile,
    ontology: { name: sameFamilyName, family },
    dirs: [profile.dirs[1], profile.dirs[0]],
    symbols: ['X', 'Y', 'Z']
  };
  assert.strictEqual(modeTwo.compare(equivalent, profile).isMatch, true);
  adversarialChecks += 1;

  for (const otherFamily of FAMILIES.filter(value => value !== family)) {
    const collision = {
      ...equivalent,
      ontology: { name: modeTwo.FAMILY_MEMBERS[otherFamily][0], family: otherFamily }
    };
    assert.strictEqual(modeTwo.compare(collision, profile).isMatch, false);
    adversarialChecks += 1;
  }

  for (const otherOrder of ORDERS.filter(value => value !== profile.order)) {
    assert.strictEqual(modeTwo.compare({ ...equivalent, order: otherOrder }, profile).isMatch, false);
    adversarialChecks += 1;
  }

  for (const first of DIRECTIONS) {
    for (const second of DIRECTIONS) {
      const candidate = { ...equivalent, dirs: [first, second] };
      const expected = oracleDirection(candidate) === oracleDirection(profile);
      assert.strictEqual(modeTwo.compare(candidate, profile).isMatch, expected);
      adversarialChecks += 1;
    }
  }
}
assert.strictEqual(adversarialChecks, 12480);

const deepAudit = modeTwo.runExhaustiveAudit(512);
assert.strictEqual(deepAudit.passed, true, JSON.stringify(deepAudit.failures, null, 2));
assert.strictEqual(deepAudit.totalEvaluations, 7864320);
assert.strictEqual(deepAudit.matches, 1966080);
assert.strictEqual(deepAudit.nonMatches, 5898240);
assert.strictEqual(deepAudit.failures.length, 0);
for (const result of deepAudit.perLevel) {
  assert.strictEqual(result.evaluations, 983040);
  assert.strictEqual(result.matches, 245760);
  assert.strictEqual(result.nonMatches, 737280);
  assert.strictEqual(result.falseMatches, 0);
  assert.strictEqual(result.falseNonMatches, 0);
  assert.strictEqual(result.wrongOffsetFailures, 0);
}

console.log(JSON.stringify({
  passed: true,
  parityComparisons,
  warmupChecks,
  longHistoryChecks,
  longHistoryMatches,
  longHistoryNonMatches,
  adversarialChecks,
  exhaustiveAudit: {
    repetitionsPerProfile: deepAudit.repetitionsPerProfile,
    totalEvaluations: deepAudit.totalEvaluations,
    matches: deepAudit.matches,
    nonMatches: deepAudit.nonMatches,
    matchRate: deepAudit.matchRate,
    nonMatchRate: deepAudit.nonMatchRate,
    failures: deepAudit.failures.length,
    perLevel: deepAudit.perLevel
  }
}, null, 2));
