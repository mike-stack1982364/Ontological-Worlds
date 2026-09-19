'use strict';

const assert = require('node:assert/strict');
const core = require('../mode-one-spatial-core.js');
const statement = (subject, relation, object) => ({ subject, relation, object });
const cases = [
  ['branch', [statement('A', 'N', 'B'), statement('C', 'E', 'B')], statement('C', 'SE', 'A'), 'SE', true, 'exact-relational-entailment'],
  ['chain', [statement('A', 'W', 'B'), statement('B', 'N', 'C')], statement('A', 'NW', 'C'), 'NW', true, 'exact-relational-entailment'],
  ['oblique', [statement('A', 'N', 'B'), statement('B', 'NE', 'C')], statement('A', 'NNE', 'C'), 'NNE', true, 'exact-relational-entailment'],
  ['adjacent error', [statement('A', 'N', 'B'), statement('B', 'NE', 'C')], statement('A', 'NE', 'C'), 'NNE', false, 'adjacent-resolution-substitution'],
  ['reversal', [statement('A', 'W', 'B'), statement('B', 'N', 'C')], statement('C', 'NW', 'A'), 'SE', false, 'subject-object-reversal'],
  ['wrong endpoints', [statement('A', 'W', 'B'), statement('B', 'N', 'C')], statement('A', 'W', 'B'), 'W', false, 'wrong-letter-pair'],
  ['cancellation', [statement('A', 'NNE', 'B'), statement('B', 'SSE', 'C')], statement('A', 'E', 'C'), 'E', true, 'exact-relational-entailment'],
  ['global error', [statement('A', 'N', 'B'), statement('C', 'S', 'B')], statement('A', 'E', 'C'), 'N', false, 'local-or-global-relational-error'],
  ['inverse chain', [statement('A', 'E', 'B'), statement('B', 'E', 'C')], statement('C', 'W', 'A'), 'W', true, 'exact-relational-entailment'],
  ['branch adjacency', [statement('A', 'N', 'B'), statement('C', 'E', 'B')], statement('A', 'WNW', 'C'), 'NW', false, 'adjacent-resolution-substitution']
];
for (const [label, premises, conclusion, expectedDirection, expected, distinction] of cases) {
  const trial = { premises, conclusion, directionResolution: 16 };
  const result = core.evaluateTrial(trial);
  assert.equal(result.expectedRelation, expectedDirection, label);
  assert.equal(result.isEntailed, expected, label);
  assert.equal(result.distinctionClass, distinction, label);
  assert.equal(core.renderTrial(trial).split(';').length, 3);
  for (const equivalent of [core.renameTrial(trial, { A: 'X', B: 'Y', C: 'Z' }), { ...trial, premises: premises.slice().reverse() }, { ...trial, premises: premises.map(core.invert), conclusion: core.invert(conclusion) }]) {
    assert.equal(core.evaluateTrial(equivalent).isEntailed, expected, `${label} transformation`);
  }
}
assert.throws(() => core.evaluateTrial({ premises: [statement('A', 'N', 'B'), statement('B', 'S', 'C')], conclusion: statement('A', 'N', 'C') }), /same position/);
assert.throws(() => core.evaluateTrial({ premises: [statement('A', 'N', 'B'), statement('C', 'N', 'D')], conclusion: statement('A', 'N', 'D') }), /three distinct/);
const audit = core.runResolutionAudit(512);
assert.equal(audit.passed, true, JSON.stringify(audit.failures));
assert.deepEqual(audit.perResolution.map(row => row.resolution), [4, 8, 16]);
for (const row of audit.perResolution) {
  assert.equal(row.matches, 256);
  assert.equal(row.nonMatches, 256);
  assert.equal(row.failures, 0);
  assert.equal(row.coverage, row.resolution);
}
console.log(JSON.stringify({ passed: true, canonicalExamples: cases.length, generated: 1536, audit: audit.perResolution }));
