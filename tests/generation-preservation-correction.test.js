'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const baseline = require('./fixtures/generation-baseline-09a62fc.json');
const { recordCases } = require('./helpers/generation-preservation.cjs');

test('equal-status statement correction preserves seeded generation, exposure weights and match probability', () => {
  const actual = recordCases(path.resolve(__dirname, '..'));
  assert.equal(actual.length, 180);
  assert.equal(baseline.baselineCommit, '09a62fc8f8c2ca9d345641398e6a7a29ea251f22');
  assert.equal(actual.length, baseline.cases.length);
  for (let index = 0; index < actual.length; index += 1) {
    assert.deepEqual(actual[index], baseline.cases[index], actual[index].key);
  }
});
