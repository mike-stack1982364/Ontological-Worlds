'use strict';

const assert = require('node:assert/strict');
const core = require('../mode-one-spatial-core.js');
const conflict = require('../mode-one-conflict-matrix-v20.js');
const statements = trial => [...trial.premises, trial.conclusion];
const letters = trial => [...new Set(statements(trial).flatMap(item => [item.subject, item.object]))];
const permutations = values => values.length < 2 ? [values] : values.flatMap((value, index) => permutations(values.filter((_, other) => index !== other)).map(rest => [value, ...rest]));

// Independently enumerate bijections without production canonical strings,
// sorting keys or cached generation metadata.
function independentAlignment(target, current, roleSensitive) {
  const old = statements(target), now = statements(current), oldLetters = letters(target);
  let best = -1;
  const masks = new Set();
  for (const assignedLetters of permutations(letters(current))) {
    const mapping = Object.fromEntries(oldLetters.map((letter, index) => [letter, assignedLetters[index]]));
    for (const assignment of permutations([0, 1, 2])) {
      if (roleSensitive && assignment[2] !== 2) continue;
      const matches = now.map((statement, index) => {
        const historical = old[assignment[index]];
        const direct = mapping[historical.subject] === statement.subject && mapping[historical.object] === statement.object && historical.relation === statement.relation;
        const inverse = mapping[historical.subject] === statement.object && mapping[historical.object] === statement.subject && core.opposite(historical.relation) === statement.relation;
        return direct || inverse;
      });
      const count = matches.filter(Boolean).length;
      if (count > best) { best = count; masks.clear(); }
      if (count === best) masks.add(matches.map(Number).join(''));
    }
  }
  return { best, masks };
}

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
}
const target = { premises: [{ subject: 'A', relation: 'N', object: 'B' }, { subject: 'C', relation: 'E', object: 'A' }], conclusion: { subject: 'B', relation: 'SW', object: 'C' }, directionResolution: 16 };
const roleSwapped = { premises: [{ subject: 'Y', relation: 'SW', object: 'Z' }, { subject: 'Z', relation: 'E', object: 'X' }], conclusion: { subject: 'Y', relation: 'S', object: 'X' }, directionResolution: 16 };
assert.equal(conflict.evaluateConflictMatrix(target, roleSwapped).wholeTrialMatch, true);
assert.equal(conflict.evaluateConflictMatrix(target, roleSwapped, { roleSensitive: true }).wholeTrialMatch, false);
assert.deepEqual([...conflict.LEVELS], [1, 2, 3, 4, 5, 6, 7, 8]);
let generated = 0;
for (const resolution of [4, 8, 16]) for (const n of conflict.LEVELS) {
  const rng = new Rng(0x710000 + resolution * 100 + n);
  const history = Array.from({ length: n }, () => conflict.generateWarmupTrial(rng, { directionResolution: resolution }));
  for (let index = 0; index < 16; index++) {
    const historical = history[history.length - n];
    const requestedMatch = index % 2 === 0, roleSensitive = index % 4 < 2;
    const current = conflict.generateConflictTrial(rng, historical, { match: requestedMatch, directionResolution: resolution, interferenceLevel: 100, roleSensitive });
    const oracle = independentAlignment(historical, current, roleSensitive);
    history.push(current);
    const result = conflict.evaluateHistory(history, history.length - 1, n, { roleSensitive });
    assert.equal(result.targetIndex, history.length - 1 - n);
    assert.equal(result.matchedCount, oracle.best);
    assert.ok(oracle.masks.has(result.statementMatches.map(Number).join('')));
    assert.equal(result.wholeTrialMatch, requestedMatch);
    assert.equal(result.matchedCount, requestedMatch ? 3 : 2);
    assert.deepEqual(current.conflictResponseVector, result.responseVector);
    assert.equal(result.conclusionEntailed, core.evaluateTrial(current).isEntailed);
    assert.equal(new Set(Object.values(result.letterMapping)).size, 3);
    assert.equal(new Set(result.assignment).size, 3);
    if (roleSensitive) assert.equal(result.assignment[2], 2);
    generated++;
  }
}
console.log(JSON.stringify({ passed: true, independentlyCheckedTrials: generated, nBackLevels: 8, compassResolutions: [4, 8, 16], roleRegimes: 2 }));
