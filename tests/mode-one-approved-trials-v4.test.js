'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const applyApproved = require(path.join(__dirname, '..', 'mode-one-approved-trials-v4.js'));
applyApproved(core);

const trials = core.canonicalTrials();
assert.strictEqual(trials.length, 10);
assert.strictEqual(core.version, 4);
assert.strictEqual(core.surfacePolicy.statementCount, 3);
assert.strictEqual(core.surfacePolicy.visibleContractText, false);
assert.strictEqual(core.surfacePolicy.thereforeInPremise, false);
assert.strictEqual(core.surfacePolicy.letteringIdentityAcrossTrialsRelevant, false);
assert.strictEqual(core.surfacePolicy.approvedTrialSet, 'exact-ten-v5');

const expectedAnswers = [true, true, true, false, false, false, true, false, true, false];
const expectedRelations = ['SE', 'SW', 'NNE', 'NNE', 'NW', 'S', 'E', 'N', 'SE', 'N'];
const exactRenderedTrials = [
  'A is west of B; B is north of C; C is southeast of A.',
  'E is south of D; F is west of E; F is southwest of D.',
  'G is north of H; H is northeast of J; G is north-northeast of J.',
  'K is north of L; L is northeast of M; K is northeast of M.',
  'N is east of P; P is south of Q; Q is southeast of N.',
  'R is west of S; S is south of T; S is southwest of T.',
  'U is northeast of V; V is southeast of W; U is east of W.',
  'X is northeast of Y; Z is southeast of Y; X is east of Z.',
  'B is west of C; A is north of B; C is southeast of A.',
  'H is northeast of J; K is southeast of J; H is east of K.'
];

trials.forEach((trial, index) => {
  const result = core.evaluateTrial(trial);
  const rendered = core.renderTrial(trial);
  assert.strictEqual(rendered, exactRenderedTrials[index], `Trial ${index + 1} surface changed.`);
  assert.strictEqual(result.isEntailed, expectedAnswers[index], `Trial ${index + 1} answer mismatch.`);
  assert.strictEqual(result.expectedRelation, expectedRelations[index], `Trial ${index + 1} derived relation mismatch.`);
  assert.strictEqual((rendered.match(/;/g) || []).length, 2, `Trial ${index + 1} must contain exactly three statements.`);
  assert(!/contract\s*:|therefore/i.test(rendered), `Trial ${index + 1} leaked contract or explanation text.`);
});

const renamed = core.renameTrial(trials[0], { A: 'X', B: 'Y', C: 'Z' });
assert.strictEqual(core.evaluateTrial(renamed).isEntailed, true);
assert.strictEqual(core.evaluateTrial(renamed).expectedRelation, 'SE');

const generated = core.generateTrial({
  s: 123456,
  next() {
    let value = this.s += 1831565813;
    value = Math.imul(value ^ value >>> 15, 1 | value);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  },
  pick(values) { return values[Math.floor(this.next() * values.length)]; },
  shuffle(values) {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.next() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }
}, { matchProbability: 0.5, interferenceLevel: 100 });
assert(!Object.prototype.hasOwnProperty.call(generated, 'contract'));
assert(!Object.prototype.hasOwnProperty.call(generated, 'contractLabel'));
assert(!/contract\s*:|therefore/i.test(core.renderTrial(generated)));

console.log(JSON.stringify({
  passed: true,
  approvedTrials: trials.map((trial, index) => ({
    number: index + 1,
    rendered: core.renderTrial(trial),
    expected: expectedAnswers[index],
    result: core.evaluateTrial(trial)
  }))
}, null, 2));
