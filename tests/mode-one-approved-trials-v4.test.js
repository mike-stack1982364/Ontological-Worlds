'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const applyApproved = require(path.join(__dirname, '..', 'mode-one-approved-trials-v4.js'));
applyApproved(core);

const trials = core.canonicalTrials();
assert.strictEqual(core.version, 6);
assert.strictEqual(core.surfacePolicy.approvedTrialSet, 'exact-ten-v6');
assert.strictEqual(trials.length, 10);

const expectedSurfaces = [
  'A is west of B; B is north of C; C is southeast of A.',
  'E is south of D; F is west of E; F is southwest of D.',
  'G is north of H; H is northeast of J; G is north-northeast of J.',
  'K is north of L; L is northeast of M; K is northeast of M.',
  'N is east of P; P is south of Q; Q is southeast of N.',
  'R is west of S; S is south of T; S is southwest of T.',
  'U is south of V; V is east of W; U is southeast of W.',
  'X is west of Y; Y is north of Z; X is north-northwest of Z.',
  'A is northeast of B; B is southeast of C; A is east of C.',
  'H is northeast of J; K is southeast of J; H is east of K.'
];
const expectedAnswers = [true, true, true, false, false, false, true, false, true, false];

trials.forEach((trial, index) => {
  const rendered = core.renderTrial(trial);
  assert.strictEqual(rendered, expectedSurfaces[index]);
  assert.strictEqual(core.evaluateTrial(trial).isEntailed, expectedAnswers[index]);
  assert(!/contract\s*:|therefore/i.test(rendered));
});

console.log('Legacy Mode 1 loader remains aligned with exact-ten-v6.');
