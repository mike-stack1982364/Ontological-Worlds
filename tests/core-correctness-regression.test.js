'use strict';

const assert = require('node:assert/strict');
const core = require('../mode-one-spatial-core.js');
const conflict = require('../mode-one-conflict-matrix-v20.js');
const maximal = require('../mode-one-letter-continuity-v1.js');

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() {
    let value = this.s += 1831565813;
    value = Math.imul(value ^ value >>> 15, 1 | value);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
}

// Independently check all possible unit-vector sums against their reversals.
// The old half-sector rounding violated this on 44 of 240 nonzero sums.
let inverseChecks = 0;
for (const first of core.DIRECTIONS) {
  for (const second of core.DIRECTIONS) {
    const x = first.x + second.x, y = first.y + second.y;
    const forward = core.directionFromVector(x, y);
    if (forward === 'BALANCE') continue;
    assert.equal(core.directionFromVector(-x, -y), core.opposite(forward), `${first.code} + ${second.code}`);
    const clockwiseSectors = ((Math.atan2(x, y) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 8);
    const nearestSector = core.DIRECTIONS.findIndex(direction => direction.code === forward);
    const sectorError = Math.min(Math.abs(nearestSector - clockwiseSectors), 16 - Math.abs(nearestSector - clockwiseSectors));
    assert.ok(sectorError <= 0.500000001, 'quantization must select a nearest sector');
    const trial = {
      directionResolution: 16,
      premises: [{ subject: 'A', relation: first.code, object: 'B' }, { subject: 'B', relation: second.code, object: 'C' }],
      conclusion: { subject: 'A', relation: forward, object: 'C' }
    };
    assert.equal(core.evaluateTrial(trial).isEntailed, true);
    assert.equal(core.evaluateTrial({ ...trial, conclusion: core.invert(trial.conclusion) }).isEntailed, true);
    assert.equal(core.evaluateTrial({ ...trial, premises: trial.premises.map(core.invert).reverse() }).isEntailed, true);
    inverseChecks++;
  }
}
assert.equal(inverseChecks, 240);

const cardinal = {
  directionResolution: 16,
  premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'B', relation: 'N', object: 'C' }],
  conclusion: { subject: 'A', relation: 'N', object: 'C' }
};
const snapshot = JSON.stringify(cardinal);
assert.equal(conflict.ensureResolutionClosed(cardinal, 4), false, 'a session cannot reinterpret an existing historical resolution');
assert.equal(JSON.stringify(cardinal), snapshot, 'validation must not mutate memory');
assert.throws(() => conflict.generateConflictTrial(new Rng(20), cardinal, { match: true, directionResolution: 4 }), /resolution/);
assert.equal(JSON.stringify(cardinal), snapshot);
assert.equal(conflict.ensureResolutionClosed(Object.freeze(cardinal), 16), true, 'validation must accept immutable history');
assert.equal(conflict.ensureResolutionClosed(null, 16), false);

const escapedPremises = {
  directionResolution: 4,
  premises: [{ subject: 'A', relation: 'NNE', object: 'B' }, { subject: 'B', relation: 'SSE', object: 'C' }],
  conclusion: { subject: 'A', relation: 'E', object: 'C' }
};
assert.equal(core.evaluateTrial(escapedPremises).resolutionClosed, false, 'all premises must belong to the selected compass');
assert.equal(conflict.ensureResolutionClosed(escapedPremises, 4), false);

let generated = 0;
for (const directionResolution of [4, 8, 16]) {
  for (let n = 1; n <= 8; n++) {
    const rng = new Rng(0x593100 + directionResolution * 100 + n), history = [];
    for (let index = 0; index < n + 12; index++) {
      const target = history[history.length - n];
      const previous = history.at(-1);
      const requestedMatch = index % 2 === 0;
      const trial = target
        ? maximal.generateMaximalScoredTrial(rng, target, previous, { match: requestedMatch, directionResolution, roleSensitive: true })
        : maximal.generateMaximalWarmupTrial(rng, previous, { directionResolution });
      history.push(trial);
      const proof = core.evaluateTrial(trial);
      assert.equal(proof.resolutionClosed, true);
      assert.equal(trial.conclusionEntailed, proof.isEntailed);
      assert.equal(trial.isEntailed, proof.isEntailed, 'mutations must refresh the cloned entailment metadata');
      assert.equal(trial.expectedRelation, proof.expectedRelation);
      assert.equal(trial.explanation, core.explainTrial(trial), 'explanation must refer to the displayed letters');
      assert.deepEqual(trial.symbols, trial.letters);
      if (target) {
        const historical = conflict.evaluateHistory(history, index, n, { roleSensitive: true });
        assert.equal(historical.targetIndex, index - n);
        assert.equal(historical.wholeTrialMatch, requestedMatch);
        assert.equal(historical.matchedCount, requestedMatch ? 3 : 2);
        assert.deepEqual(trial.conflictResponseVector, historical.responseVector);
        assert.equal(maximal.analyseTransition(target, previous, trial).valid, true);
        generated++;
      }
    }
  }
}

// Check the conflict generator directly too: maximum-letter continuity must
// not be needed to repair the proof metadata of transformed historical trials.
for (const directionResolution of [4, 8, 16]) {
  const rng = new Rng(9870 + directionResolution);
  let target = conflict.generateWarmupTrial(rng, { directionResolution });
  for (let index = 0; index < 12; index++) {
    Object.assign(target, { submitted: true, correct: true, response: true, responseTime: 123, speechComplete: true, _speechId: 9,
      conflictResponses: [true, true, true, true, true], conflictDecisionTimes: [1, 2, 3, 4, 5] });
    const trial = conflict.generateConflictTrial(rng, target, { match: index % 2 === 0, interferenceLevel: 100, directionResolution, roleSensitive: true });
    assert.equal(trial.submitted, false);
    for (const field of ['correct', 'response', 'responseTime', 'speechComplete', '_speechId', 'conflictResponses', 'conflictDecisionTimes']) {
      assert.equal(Object.hasOwn(trial, field), false, `a generated trial must not inherit historical ${field}`);
    }
    const proof = core.evaluateTrial(trial);
    assert.equal(trial.isEntailed, proof.isEntailed);
    assert.equal(trial.expectedRelation, proof.expectedRelation);
    assert.equal(trial.explanation, core.explainTrial(trial));
    assert.deepEqual(trial.symbols, trial.letters);
    const independentlyHydrated = core.hydrateTrial(JSON.parse(JSON.stringify(trial)));
    assert.equal(trial.signature, independentlyHydrated.signature);
    target = trial;
  }
}

console.log(JSON.stringify({ passed: true, inverseChecks, scoredTransitions: generated, nBackLevels: 8, compassResolutions: [4, 8, 16] }));
