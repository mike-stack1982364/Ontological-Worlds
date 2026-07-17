'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const applyApproved = require(path.join(__dirname, '..', 'mode-one-approved-trials-v7.js'));
applyApproved(core);

const trials = core.canonicalTrials();
assert.strictEqual(trials.length, 10);
assert.strictEqual(core.version, 7);
assert.strictEqual(core.runtimeGenerator, 'approved-ten-template-orbits-v7');
assert.strictEqual(core.surfacePolicy.statementCount, 3);
assert.strictEqual(core.surfacePolicy.visibleContractText, false);
assert.strictEqual(core.surfacePolicy.thereforeInPremise, false);
assert.strictEqual(core.surfacePolicy.letteringIdentityAcrossTrialsRelevant, false);
assert.strictEqual(core.surfacePolicy.approvedTrialSet, 'exact-ten-v7');

const expectedAnswers = [true, true, true, false, false, false, true, false, true, false];
const expectedRelations = ['SE', 'SW', 'NNE', 'NNE', 'NW', 'S', 'SE', 'NW', 'E', 'N'];
const exactRenderedTrials = [
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

trials.forEach((trial, index) => {
  const result = core.evaluateTrial(trial);
  const rendered = core.renderTrial(trial);
  assert.strictEqual(rendered, exactRenderedTrials[index], `Trial ${index + 1} surface changed.`);
  assert.strictEqual(result.isEntailed, expectedAnswers[index], `Trial ${index + 1} answer mismatch.`);
  assert.strictEqual(result.expectedRelation, expectedRelations[index], `Trial ${index + 1} derived relation mismatch.`);
  assert.strictEqual((rendered.match(/;/g) || []).length, 2, `Trial ${index + 1} must contain exactly three statements.`);
  assert(!/contract\s*:|therefore/i.test(rendered), `Trial ${index + 1} leaked hidden logic or explanation text.`);
});

class Rng {
  constructor(seed = 123456) { this.s = seed >>> 0; }
  next() {
    let value = this.s += 1831565813;
    value = Math.imul(value ^ value >>> 15, 1 | value);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.next() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }
}

const rng = new Rng();
const templateCoverage = new Set();
for (let index = 0; index < 5000; index += 1) {
  const requestedMatch = index % 2 === 0;
  const trial = core.generateTrial(rng, {
    matchProbability: requestedMatch ? 1 : 0,
    interferenceLevel: index % 101
  });
  const result = core.evaluateTrial(trial);
  const rendered = core.renderTrial(trial);
  templateCoverage.add(trial.approvedTemplateId);
  assert.strictEqual(trial.generatedFromApprovedTemplate, true);
  assert.strictEqual(trial.approvedTemplateExpected, requestedMatch);
  assert.strictEqual(result.isEntailed, requestedMatch);
  assert.strictEqual(trial.isMatch, requestedMatch);
  assert.strictEqual(new Set(trial.letters).size, 3);
  assert.strictEqual((rendered.match(/;/g) || []).length, 2);
  assert(!/contract\s*:|therefore/i.test(rendered));
  assert(!Object.prototype.hasOwnProperty.call(trial, 'contract'));
  assert(!Object.prototype.hasOwnProperty.call(trial, 'contractLabel'));
}
assert.deepStrictEqual([...templateCoverage].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

const audit = core.runAudit(8192);
assert.strictEqual(audit.passed, true, audit.failures.join(', '));
assert.strictEqual(audit.generatedOnlyFromApprovedTemplates, true);
assert.strictEqual(audit.approvedTemplateCount, 10);
assert.deepStrictEqual(audit.templateCoverage, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.strictEqual(audit.directionCoverage, 16);
assert.strictEqual(audit.visibleContractText, false);
assert.strictEqual(audit.exactlyThreeStatements, true);
assert(audit.invarianceChecks >= 320);

console.log(JSON.stringify({
  passed: true,
  runtimeGenerator: core.runtimeGenerator,
  approvedTemplates: core.approvedTemplateFamilies(),
  exhaustiveAudit: audit
}, null, 2));
