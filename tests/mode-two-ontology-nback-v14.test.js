'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const modeTwo = require(path.join(__dirname, '..', 'mode-two-ontology-nback-v14.js'));

assert.deepStrictEqual([...modeTwo.LEVELS], [1,2,3,4,5,6,7,8]);
assert.strictEqual(modeTwo.version, 19);

const target = modeTwo.decorateTrial({
  premises: [
    { subject: 'A', relation: 'W', object: 'B' },
    { subject: 'B', relation: 'N', object: 'C' }
  ],
  conclusion: { subject: 'C', relation: 'SE', object: 'A' },
  letters: ['A','B','C']
}, ['Completion','Multiplication','Difference'], 'IO');

const renamedReorderedInverted = modeTwo.decorateTrial({
  premises: [
    { subject: 'Z', relation: 'S', object: 'Y' },
    { subject: 'Y', relation: 'E', object: 'X' }
  ],
  conclusion: { subject: 'X', relation: 'NW', object: 'Z' },
  letters: ['X','Y','Z']
}, ['Action','All','Division'], 'OI');

assert.strictEqual(modeTwo.compare(target, renamedReorderedInverted).isMatch, true,
  'letter renaming, premise reordering and equivalent reversed wording must preserve the complete structure');

const twoOfThreeLure = modeTwo.decorateTrial({
  premises: [
    { subject: 'X', relation: 'W', object: 'Y' },
    { subject: 'Y', relation: 'N', object: 'Z' }
  ],
  conclusion: { subject: 'Z', relation: 'ESE', object: 'X' },
  letters: ['X','Y','Z']
}, ['Completion','Multiplication','Difference'], 'IO');
assert.strictEqual(modeTwo.compare(target, twoOfThreeLure).isMatch, false,
  'two compatible premises cannot compensate for a different third statement');

const oneOfThreeLure = modeTwo.decorateTrial({
  premises: [
    { subject: 'X', relation: 'W', object: 'Y' },
    { subject: 'Y', relation: 'S', object: 'Z' }
  ],
  conclusion: { subject: 'Z', relation: 'NE', object: 'X' },
  letters: ['X','Y','Z']
}, ['All','Projection','Connection'], 'OI');
assert.strictEqual(modeTwo.compare(target, oneOfThreeLure).isMatch, false,
  'one compatible statement is only interference, never a complete match');

const metadataOnly = JSON.parse(JSON.stringify(target));
metadataOnly.ontologyCategories = ['All','Action','Division'];
metadataOnly.order = 'OI';
assert.strictEqual(modeTwo.compare(target, metadataOnly).isMatch, true,
  'ontology categories and Inner/Outer order remain scoring-neutral');

for (const [index, trial] of core.canonicalTrials().entries()) {
  const decorated = modeTwo.decorateTrial(trial, ['Completion','Multiplication','Difference'], 'IO');
  assert.strictEqual(modeTwo.evaluate(decorated).isMatch, trial.expected, `Mode 1 entailment parity ${index + 1}`);
}

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() { let v = this.s += 1831565813; v = Math.imul(v ^ v >>> 15, 1 | v); v ^= v + Math.imul(v ^ v >>> 7, 61 | v); return ((v ^ v >>> 14) >>> 0) / 4294967296; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) { const out = [...values]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [out[i],out[j]]=[out[j],out[i]]; } return out; }
}

for (const level of modeTwo.LEVELS) {
  const rng = new Rng(1000 + level);
  const history = Array.from({ length: level }, () => modeTwo.generateTrial(rng, { matchProbability: 1 }));
  for (let index = 0; index < 2048; index += 1) {
    const requestedMatch = index % 2 === 0;
    const historicalTarget = history[history.length - level];
    const current = modeTwo.generateNBackTrial(rng, historicalTarget, { match: requestedMatch, nBackLevel: level });
    history.push(current);
    const result = modeTwo.evaluateHistory(history, history.length - 1, level);
    assert.strictEqual(result.targetIndex, history.length - 1 - level);
    assert.strictEqual(result.isMatch, requestedMatch);
    if (!requestedMatch) assert.strictEqual(current.partialStatementCompatibility, 2);
  }
}

const audit = modeTwo.runExhaustiveAudit(8192);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures));
assert.strictEqual(audit.totalEvaluations, 65536);
assert.strictEqual(audit.matches, 32768);
assert.strictEqual(audit.nonMatches, 32768);
assert.strictEqual(audit.partialLureChecks, 32768);
assert.strictEqual(audit.invariants.completeThreeStatementCrossTrialComparison, true);
assert.strictEqual(audit.invariants.twoStatementCompatibilityInsufficient, true);
assert.strictEqual(audit.invariants.ontologyCategoriesScoringNeutral, true);

console.log(JSON.stringify({ passed: true, audit }, null, 2));