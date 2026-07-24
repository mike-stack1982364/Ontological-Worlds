'use strict';

const assert = require('assert');
const path = require('path');
const modeTwo = require(path.join(__dirname, '..', 'mode-two-ontology-nback-v14.js'));

const LEVELS = [...modeTwo.LEVELS];
const PROFILES = modeTwo.baseProfiles();
const DIRECTIONS = [...modeTwo.DIRECTIONS];

function oracleSignature(trial) {
  const symbols = Array.isArray(trial?.symbols) ? trial.symbols.slice(0, 3) : null;
  const dirs = Array.isArray(trial?.dirs) ? trial.dirs.slice(0, 2) : null;
  const valid = Boolean(
    symbols && symbols.length === 3 && new Set(symbols).size === 3 &&
    symbols.every(value => typeof value === 'string' && value.length > 0) &&
    dirs && dirs.length === 2 && dirs.every(value => DIRECTIONS.includes(value))
  );
  return valid ? `PATH:0>${dirs[0]}>1|1>${dirs[1]}>2` : null;
}

function oracleCompare(current, target) {
  const a = oracleSignature(current);
  const b = oracleSignature(target);
  return Boolean(a && b && a === b);
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

function randomTrial(rng, index) {
  const category = pick(rng, modeTwo.ONTOLOGY_CATEGORIES);
  const order = pick(rng, modeTwo.FORM_ORDERS);
  return modeTwo.makeTrial(
    category,
    order,
    pick(rng, DIRECTIONS),
    pick(rng, DIRECTIONS),
    [`A${index}`, `B${index}`, `C${index}`]
  );
}

let parityComparisons = 0;
for (const current of PROFILES) {
  for (const target of PROFILES) {
    assert.strictEqual(modeTwo.compare(current, target).isMatch, oracleCompare(current, target));
    parityComparisons += 1;
  }
}
assert.strictEqual(parityComparisons, 256);

let metadataInvarianceChecks = 0;
for (const profile of PROFILES) {
  for (const category of modeTwo.ONTOLOGY_CATEGORIES) {
    for (const order of modeTwo.FORM_ORDERS) {
      const candidate = modeTwo.makeTrial(category, order, profile.dirs[0], profile.dirs[1], ['X', 'Y', 'Z']);
      assert.strictEqual(modeTwo.compare(candidate, profile).isMatch, true);
      metadataInvarianceChecks += 1;
    }
  }
}
assert.strictEqual(metadataInvarianceChecks, 864);

let orderedPathCollisionChecks = 0;
for (const first of DIRECTIONS) {
  for (const second of DIRECTIONS) {
    if (first === second) continue;
    const target = modeTwo.makeTrial('Division', 'IOA', first, second, ['B', 'C', 'D']);
    const reversed = modeTwo.makeTrial('Division', 'IOA', second, first, ['X', 'Y', 'Z']);
    assert.strictEqual(modeTwo.compare(reversed, target).isMatch, false);
    orderedPathCollisionChecks += 1;
  }
}
assert.strictEqual(orderedPathCollisionChecks, 12);

let warmupChecks = 0;
for (const level of LEVELS) {
  for (let currentIndex = 0; currentIndex < level; currentIndex += 1) {
    const history = Array.from({ length: currentIndex + 1 }, (_, index) => randomTrial(() => 0.25, index));
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
for (let seed = 1; seed <= 2048; seed += 1) {
  const rng = seeded(seed);
  const history = Array.from({ length: 2048 }, (_, index) => randomTrial(rng, index));
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
assert.strictEqual(longHistoryChecks, 33488896);
assert.strictEqual(longHistoryMatches + longHistoryNonMatches, longHistoryChecks);

let adversarialChecks = 0;
for (const profile of PROFILES) {
  for (const first of DIRECTIONS) {
    for (const second of DIRECTIONS) {
      const candidate = modeTwo.makeTrial('All', 'AOI', first, second, ['X', 'Y', 'Z']);
      const expected = first === profile.dirs[0] && second === profile.dirs[1];
      assert.strictEqual(modeTwo.compare(candidate, profile).isMatch, expected);
      adversarialChecks += 1;
    }
  }
}
assert.strictEqual(adversarialChecks, 256);

const malformed = [
  {},
  { dirs: ['N', 'E'], symbols: ['A', 'B'] },
  { dirs: ['N', 'BAD'], symbols: ['A', 'B', 'C'] },
  { dirs: ['N', 'E'], symbols: ['A', 'A', 'C'] },
  { dirs: ['N'], symbols: ['A', 'B', 'C'] }
];
let malformedChecks = 0;
for (const a of malformed) {
  for (const b of malformed) {
    assert.strictEqual(modeTwo.compare(a, b).isMatch, false);
    malformedChecks += 1;
  }
}
assert.strictEqual(malformedChecks, 25);

const deepAudit = modeTwo.runExhaustiveAudit(16384);
assert.strictEqual(deepAudit.passed, true, JSON.stringify(deepAudit.failures, null, 2));
assert.strictEqual(deepAudit.totalEvaluations, 10485760);
assert.strictEqual(deepAudit.matches, 2097152);
assert.strictEqual(deepAudit.nonMatches, 8388608);
assert.strictEqual(deepAudit.matchRate, 0.2);
assert.strictEqual(deepAudit.nonMatchRate, 0.8);
assert.strictEqual(deepAudit.failures.length, 0);
for (const result of deepAudit.perLevel) {
  assert.strictEqual(result.evaluations, 1310720);
  assert.strictEqual(result.matches, 262144);
  assert.strictEqual(result.nonMatches, 1048576);
  assert.strictEqual(result.falseMatches, 0);
  assert.strictEqual(result.falseNonMatches, 0);
  assert.strictEqual(result.wrongOffsetFailures, 0);
  assert.strictEqual(result.sameResultantOrderCollisionsRejected, 196608);
  assert.strictEqual(result.metadataInvarianceChecks, 262144);
}

console.log(JSON.stringify({
  passed: true,
  parityComparisons,
  metadataInvarianceChecks,
  orderedPathCollisionChecks,
  warmupChecks,
  longHistoryChecks,
  longHistoryMatches,
  longHistoryNonMatches,
  adversarialChecks,
  malformedChecks,
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
