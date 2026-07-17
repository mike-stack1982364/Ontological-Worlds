'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const applyApproved = require(path.join(__dirname, '..', 'mode-one-approved-trials-v7.js'));
const applyNBack = require(path.join(__dirname, '..', 'mode-one-nback-v8.js'));

applyApproved(core);
applyNBack(core);

class AuditRng {
  constructor(seed = 0x8bac1e8) { this.s = seed >>> 0; }
  next() {
    let value = this.s += 1831565813;
    value = Math.imul(value ^ value >>> 15, 1 | value);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.next() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }
}

const rng = new AuditRng();
assert.deepStrictEqual(core.nBackLevels, [1, 2, 3, 4, 5, 6, 7, 8]);
assert.strictEqual(core.clampNBackLevel(0), 1);
assert.strictEqual(core.clampNBackLevel(9), 8);
assert.strictEqual(core.clampNBackLevel(4.4), 4);
assert.strictEqual(core.nBackPolicy.letteringIdentityRelevant, false);
assert.strictEqual(core.nBackPolicy.minimumLevel, 1);
assert.strictEqual(core.nBackPolicy.maximumLevel, 8);

const target = core.generateTrial(rng, { matchProbability: 1, interferenceLevel: 100 });
const targetLetters = new Set(target.letters);

for (const level of core.nBackLevels) {
  const matching = core.generateNBackTrial(rng, target, {
    match: true,
    nBackLevel: level,
    interferenceLevel: 100
  });
  assert.strictEqual(matching.nBackLevel, level);
  assert.strictEqual(matching.scored, true);
  assert.strictEqual(matching.nBackMatch, true);
  assert.strictEqual(matching.isMatch, true);
  assert.strictEqual(core.nBackEquivalent(matching, target), true);
  assert.strictEqual(core.nBackLogicSignature(matching), core.nBackLogicSignature(target));
  assert.strictEqual(matching.approvedTemplateFamily, target.approvedTemplateFamily);
  assert.strictEqual(matching.withinTrialEntailed, target.approvedTemplateExpected);
  assert(matching.letters.every(letter => !targetLetters.has(letter)), 'N-back MATCH reused target lettering.');
  assert(!/contract\s*:|therefore/i.test(core.renderTrial(matching)));

  const nonMatching = core.generateNBackTrial(rng, target, {
    match: false,
    nBackLevel: level,
    interferenceLevel: 100
  });
  assert.strictEqual(nonMatching.nBackLevel, level);
  assert.strictEqual(nonMatching.scored, true);
  assert.strictEqual(nonMatching.nBackMatch, false);
  assert.strictEqual(nonMatching.isMatch, false);
  assert.strictEqual(core.nBackEquivalent(nonMatching, target), false);
  assert.notStrictEqual(nonMatching.approvedTemplateFamily, target.approvedTemplateFamily);
  assert(!/contract\s*:|therefore/i.test(core.renderTrial(nonMatching)));

  const warmup = core.generateNBackWarmupTrial(rng, {
    nBackLevel: level,
    interferenceLevel: 100
  });
  assert.strictEqual(warmup.nBackLevel, level);
  assert.strictEqual(warmup.nBackWarmup, true);
  assert.strictEqual(warmup.scored, false);
  assert.strictEqual(warmup.isMatch, false);
  assert.ok(core.nBackLogicSignature(warmup).startsWith('TRIADIC-LOGIC:'));
}

const renamed = JSON.parse(JSON.stringify(target));
const letters = target.letters;
const replacements = { [letters[0]]: 'X', [letters[1]]: 'Y', [letters[2]]: 'Z' };
renamed.premises = renamed.premises.map(statement => ({
  subject: replacements[statement.subject],
  relation: statement.relation,
  object: replacements[statement.object]
}));
renamed.conclusion = {
  subject: replacements[renamed.conclusion.subject],
  relation: renamed.conclusion.relation,
  object: replacements[renamed.conclusion.object]
};
renamed.letters = ['X', 'Y', 'Z'];
assert.strictEqual(core.nBackEquivalent(target, renamed), true, 'Consistent renaming changed N-back identity.');

const explanationMatch = core.explainNBackTrial(core.generateNBackTrial(rng, target, {
  match: true,
  nBackLevel: 8,
  interferenceLevel: 100
}));
assert.match(explanationMatch, /^MATCH/);
assert.match(explanationMatch, /8 back/);
assert.match(explanationMatch, /letters and absolute directions may differ/i);

const explanationNonMatch = core.explainNBackTrial(core.generateNBackTrial(rng, target, {
  match: false,
  nBackLevel: 8,
  interferenceLevel: 100
}));
assert.match(explanationNonMatch, /^NO MATCH/);
assert.match(explanationNonMatch, /relational, not alphabetical/i);

console.log(JSON.stringify({
  passed: true,
  levels: core.nBackLevels,
  targetFamily: target.approvedTemplateFamily,
  policy: core.nBackPolicy
}, null, 2));
