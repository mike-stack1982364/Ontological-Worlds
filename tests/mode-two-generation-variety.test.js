'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const engine = require('../mode-two-engine-v22.js');
const spatial = require('../mode-one-spatial-core.js');
const clone = value => JSON.parse(JSON.stringify(value));
const all = trial => [...trial.premises, trial.conclusion];
const letters = trial => [...new Set(all(trial).flatMap(statement => [statement.subject, statement.object]))].sort();
const facets = trial => all(trial).flatMap(statement => [statement.subjectFacet, statement.objectFacet]);
const histogram = trial => facets(trial).map(facet => `${facet.form}:${facet.category}`).sort();
class Rng {
  constructor(seed) { this.state = seed; }
  next() { this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0; return this.state / 4294967296; }
}
const facet = (category, form = 'A') => ({ category, form });
const statement = (subject, relation, object, subjectFacet, objectFacet) => ({ subject, relation, object, subjectFacet, objectFacet });
function targetFixture() {
  return { complexity: 'facets', directionResolution: 16, premises: [
    statement('A', 'N', 'B', facet('Action'), facet('Connection')),
    statement('B', 'E', 'C', facet('Division'), facet('Completion'))
  ], conclusion: statement('A', 'S', 'C', facet('Projection'), facet('Encompassment')) };
}

test('Mode 2 varies retained identities and statement slots without an answer-dependent identity plan', () => {
  const target = targetFixture(), history = Array.from({ length: 32 }, () => clone(target));
  const overlaps = new Set(), candidateSources = new Set(), used = new Set();
  const before = JSON.stringify({ target, history });
  for (let index = 0; index < 180; index += 1) {
    const seed = 984213 + index * 997;
    const match = engine.generateNBackTrial(new Rng(seed), target, { match: true, history });
    const nonmatch = engine.generateNBackTrial(new Rng(seed), target, { match: false, history, lureKind: 'category' });
    const currentLetters = letters(match);
    assert.deepEqual(letters(nonmatch), currentLetters, 'Requested answers must not determine letter identities');
    const retained = currentLetters.filter(letter => letters(target).includes(letter)).length;
    assert.ok(retained < 3, 'Every scored trial introduces at least one new identity');
    overlaps.add(retained);
    currentLetters.forEach(letter => used.add(letter));
    candidateSources.add(match.alignment.premiseAssignment[2]);
    assert.deepEqual(histogram(match), histogram(target), 'A true match preserves endpoint descriptors');
    assert.equal(engine.compare(target, match).isMatch, true);
    assert.equal(engine.compare(target, nonmatch).isMatch, false);
    assert.equal(engine.ensureResolutionClosed(match), true);
    assert.equal(match.premises.length, 2);
  }
  assert.deepEqual([...overlaps].sort(), [0, 1, 2]);
  assert.deepEqual([...candidateSources].sort(), [0, 1, 2], 'All valid candidate slots are eligible');
  assert.equal(used.size, spatial.LETTERS.length);
  assert.equal(JSON.stringify({ target, history }), before, 'Generation must not modify historical trials');
});

test('recent exposure softly reduces repeated letters and categories, without forbidding them or using unbounded history', () => {
  const repeated = { complexity: 'entities', directionResolution: 4, premises: [
    statement('A', 'N', 'B', facet('All'), facet('All')),
    statement('B', 'N', 'C', facet('All'), facet('All'))
  ], conclusion: statement('A', 'N', 'C', facet('All'), facet('All')) };
  const history = Array.from({ length: 32 }, () => clone(repeated));
  let weightedLetters = 0, plainLetters = 0, weightedCategories = 0, plainCategories = 0;
  for (let index = 0; index < 128; index += 1) {
    const seed = 738 + index * 101;
    const weighted = engine.generateTrial(new Rng(seed), { history, complexity: 'entities', directionResolution: 4 });
    const plain = engine.generateTrial(new Rng(seed), { complexity: 'entities', directionResolution: 4 });
    weightedLetters += letters(weighted).filter(letter => ['A', 'B', 'C'].includes(letter)).length;
    plainLetters += letters(plain).filter(letter => ['A', 'B', 'C'].includes(letter)).length;
    weightedCategories += facets(weighted).filter(item => item.category === 'All').length;
    plainCategories += facets(plain).filter(item => item.category === 'All').length;
  }
  assert.ok(weightedLetters < plainLetters / 4);
  assert.ok(weightedCategories < plainCategories / 4);
  const zeroDraw = engine.generateTrial({ next: () => 0 }, { history, complexity: 'entities', directionResolution: 4 });
  assert.deepEqual(letters(zeroDraw), ['A', 'B', 'C'], 'Recently seen letters still have positive selection probability');
  assert.ok(facets(zeroDraw).some(item => item.category === 'All'), 'Recently seen categories remain eligible');
  const older = engine.generateTrial(new Rng(41));
  assert.deepEqual(
    engine.generateTrial(new Rng(782), { history: [older, ...history] }),
    engine.generateTrial(new Rng(782), { history }),
    'Observations outside the recent 32-trial window cannot affect selection'
  );
});

test('varied worlds preserve attached child outputs, descriptor constraints and all requested lure answers', () => {
  const rng = new Rng(94354);
  for (const directionResolution of engine.RESOLUTIONS) {
    const history = [];
    for (let index = 0; index < 3; index += 1) history.push(engine.generateTrial(rng, { complexity: 'worlds', directionResolution, history }));
    for (const lureKind of [null, ...engine.LURE_KINDS]) {
      const target = history[history.length - 2], match = lureKind === null;
      const current = engine.generateNBackTrial(rng, target, { match, lureKind, directionResolution, complexity: 'worlds', nBackLevel: 2, history });
      assert.equal(engine.ensureResolutionClosed(current), true);
      assert.equal(engine.compare(target, current).isMatch, match);
      if (match) {
        for (const [source, destination] of Object.entries(current.alignment.mapping)) {
          assert.deepEqual(current.worlds[destination].outputFacet, target.worlds[source].outputFacet);
          assert.equal(engine.compare(target.worlds[source], current.worlds[destination]).isMatch, true);
        }
      }
      history.push(current);
      assert.equal(engine.evaluateHistory(history, history.length - 1, 2).isMatch, match);
      for (const child of Object.values(current.worlds)) {
        assert.equal(child.premises.length, 2);
        assert.deepEqual(child.outputFacet, engine.outputFacet(child));
      }
    }
  }
});
