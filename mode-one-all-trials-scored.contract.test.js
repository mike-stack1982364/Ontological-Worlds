'use strict';

const assert = require('node:assert/strict');
const core = require('./mode-one-spatial-core.js');
const conflict = require('./mode-one-conflict-matrix-v20.js');
const maximal = require('./mode-one-letter-continuity-v1.js');
let seed = 819;
const rng = { next() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; } };
let warmups = 0;
for (const directionResolution of [4, 8, 16]) for (let n = 1; n <= 8; n++) {
  const history = [];
  for (let index = 0; index < n; index++) {
    const trial = maximal.generateMaximalWarmupTrial(rng, history.at(-1), { directionResolution });
    history.push(trial);
    const expected = [false, false, false, core.evaluateTrial(trial).isEntailed, false];
    assert.equal(trial.nBackWarmup, true);
    assert.equal(trial.scored, true, 'memory-fill trials retain the active five-decision interface');
    assert.deepEqual(trial.conflictResponseVector, expected);
    assert.equal(trial.submitted, false);
    const evaluation = conflict.evaluateHistory(history, index, n);
    assert.equal(evaluation.warmup, true);
    assert.equal(evaluation.scored, true);
    assert.deepEqual(evaluation.responseVector, expected);
    warmups++;
  }
}
console.log(JSON.stringify({ passed: true, warmups, decisionsPerTrial: 5 }));
