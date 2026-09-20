'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const engine = require('../mode-two-engine-v22.js');
const core = require('../mode-one-spatial-core.js');
const clone = value => JSON.parse(JSON.stringify(value));
const F = (category, form = 'A') => ({ category, form });
const S = (subject, subjectFacet, relation, object, objectFacet) => ({ subject, subjectFacet, relation, object, objectFacet });

class Rng {
  constructor(seed = 127) { this.state = seed; }
  next() { this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0; return this.state / 4294967296; }
}

const original = {
  complexity: 'facets', directionResolution: 8,
  premises: [
    S('H', F('Connection', 'O'), 'S', 'D', F('Projection')),
    S('D', F('Projection', 'O'), 'S', 'C', F('Multiplication'))
  ],
  conclusion: S('C', F('Projection'), 'N', 'H', F('Division', 'I'))
};
const matched = {
  complexity: 'facets', directionResolution: 8,
  premises: [
    S('Z', F('Multiplication'), 'N', 'Y', F('Projection', 'O')),
    S('Y', F('Projection'), 'N', 'X', F('Connection', 'O'))
  ],
  conclusion: S('X', F('Division', 'I'), 'S', 'Z', F('Projection'))
};

// A separate relational oracle: enumerate bijections and compare endpoint predicates directly.
// It does not use the engine's signature, statement normalization, alignment or inversion code.
const ring = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const opposite = code => ring[(ring.indexOf(code) + 8) % 16];
const list = trial => trial.premises.concat(trial.conclusion);
const letters = trial => [...new Set(list(trial).flatMap(s => [s.subject, s.object]))];
const sameFacet = (a, b) => a.category === b.category && a.form === b.form;
function maps(values) {
  return values.flatMap(a => values.filter(b => b !== a).map(b => [a, b, values.find(c => c !== a && c !== b)]));
}
function oracle(a, b) {
  if (a.directionResolution !== b.directionResolution || a.complexity !== b.complexity) return false;
  const from = letters(a), to = letters(b);
  for (const assignment of maps(to)) {
    const mapping = Object.fromEntries(from.map((letter, i) => [letter, assignment[i]]));
    if (a.complexity === 'worlds' && from.some(letter => !oracle(a.worlds[letter], b.worlds[mapping[letter]]))) continue;
    const same = (first, second) => (
      mapping[first.subject] === second.subject && mapping[first.object] === second.object
      && first.relation === second.relation && sameFacet(first.subjectFacet, second.subjectFacet) && sameFacet(first.objectFacet, second.objectFacet)
    ) || (
      mapping[first.subject] === second.object && mapping[first.object] === second.subject
      && opposite(first.relation) === second.relation && sameFacet(first.subjectFacet, second.objectFacet) && sameFacet(first.objectFacet, second.subjectFacet)
    );
    if (!same(a.conclusion, b.conclusion)) continue;
    if ((same(a.premises[0], b.premises[0]) && same(a.premises[1], b.premises[1]))
      || (same(a.premises[0], b.premises[1]) && same(a.premises[1], b.premises[0]))) return true;
  }
  return false;
}
function histogram(trial) {
  return list(trial).flatMap(s => [s.subjectFacet, s.objectFacet]).map(f => `${f.form}:${f.category}`).sort();
}

test('the proposed advanced two-trial pair preserves all six endpoint bindings', () => {
  assert.equal(engine.version, 22);
  assert.equal(engine.compare(original, matched).isMatch, true);
  assert.equal(oracle(original, matched), true);
  assert.deepEqual(engine.analyseAlignment(original, matched).mapping, { H: 'X', D: 'Y', C: 'Z' });
  const text = engine.renderOntologicalTrial(original);
  assert.match(text, /Outer Connection H is south of Projection D/);
  assert.match(text, /Candidate: Projection C is north of Inner Division H/);
  assert.equal(engine.evaluate(original).ontologyRelevant, true);
});

test('swapping an entity’s two facets changes its structural roles despite an identical histogram', () => {
  const lure = clone(matched);
  [lure.premises[0].subjectFacet, lure.conclusion.objectFacet] = [lure.conclusion.objectFacet, lure.premises[0].subjectFacet];
  assert.deepEqual(histogram(lure), histogram(matched));
  assert.equal(engine.compare(original, lure).isMatch, false);
  assert.equal(oracle(original, lure), false);
  assert.equal(engine.analyseAlignment(original, lure).matchedCount, 1);
  assert.equal(engine.evaluate(original).withinTrialEntailed, engine.evaluate(lure).withinTrialEntailed);
});

test('equivalent wording swaps endpoints with their own facets; it never swaps Inner and Outer', () => {
  for (const statement of list(original)) {
    const inverse = engine.invert(statement);
    assert.deepEqual(inverse.subjectFacet, statement.objectFacet);
    assert.deepEqual(inverse.objectFacet, statement.subjectFacet);
    assert.equal(inverse.relation, opposite(statement.relation));
    assert.deepEqual(engine.invert(inverse), statement);
  }
  const changed = clone(matched);
  changed.premises[1].objectFacet.form = 'I';
  assert.equal(engine.compare(original, changed).isMatch, false);
  const unmarked = clone(matched);
  unmarked.premises[1].objectFacet.form = 'A';
  assert.equal(engine.compare(original, unmarked).isMatch, false);
});

test('all generation settings and lure families agree with a separately implemented graph oracle', () => {
  const rng = new Rng(20260922), observed = new Set();
  for (const complexity of engine.COMPLEXITIES) for (const resolution of engine.RESOLUTIONS) {
    for (let iteration = 0; iteration < 12; iteration += 1) {
      const target = engine.generateTrial(rng, { complexity, directionResolution: resolution });
      const before = JSON.stringify(target);
      const match = engine.generateNBackTrial(rng, target, { match: true, complexity, directionResolution: resolution });
      assert.equal(oracle(target, match), true);
      assert.equal(engine.compare(target, match).isMatch, true);
      for (const lureKind of engine.LURE_KINDS.filter(kind => kind !== 'nested' || complexity === 'worlds')) {
        const lure = engine.generateNBackTrial(rng, target, { match: false, lureKind, interferenceLevel: iteration * 9 });
        observed.add(`${complexity}:${lureKind}`);
        assert.equal(lure.lureKind, lureKind);
        assert.equal(oracle(target, lure), false, `${complexity}/${resolution}/${lureKind}`);
        assert.equal(engine.compare(target, lure).isMatch, false);
        assert.equal(engine.ensureResolutionClosed(lure, resolution), true);
        assert.ok(lure.changedDetails.length > 0);
        assert.deepEqual(engine.analyseAlignment(target, lure).statementMatches, lure.statementMatchVector);
        if (lureKind === 'facet-role') assert.deepEqual(histogram(target), histogram(lure));
      }
      assert.equal(JSON.stringify(target), before, 'generation mutated its historical target');
      const unrelated = engine.generateTrial(rng, { complexity, directionResolution: resolution });
      assert.equal(engine.compare(target, unrelated).isMatch, oracle(target, unrelated));
    }
  }
  assert.equal(observed.size, 13);
});

test('inner world structure is scored even if its output and every outer statement are unchanged', () => {
  const target = engine.generateTrial(new Rng(712), { complexity: 'worlds', directionResolution: 8 });
  const changed = clone(target), key = letters(target)[0], child = changed.worlds[key];
  const statement = child.premises[0], old = statement.subjectFacet;
  const sibling = list(child).flatMap(s => [[s.subject, s.subjectFacet], [s.object, s.objectFacet]])
    .find(([letter, facet]) => letter === statement.subject && !sameFacet(facet, old))[1];
  const replacement = engine.ONTOLOGY_CATEGORIES.find(category => category !== old.category && !(category === sibling.category && old.form === sibling.form));
  statement.subjectFacet.category = replacement;
  assert.deepEqual(child.outputFacet, target.worlds[key].outputFacet);
  assert.deepEqual(changed.premises, target.premises);
  assert.deepEqual(changed.conclusion, target.conclusion);
  assert.equal(engine.compare(target, changed).isMatch, false);
  assert.equal(oracle(target, changed), false);
  const matchedWorld = engine.generateNBackTrial(new Rng(732), target, { match: true });
  assert.equal(oracle(target, matchedWorld), true, 'inner letters must be independently scoped');
});

test('nested output changes exactly when the child candidate truth changes', () => {
  const target = engine.generateTrial(new Rng(311), { complexity: 'worlds', directionResolution: 16 });
  for (const child of Object.values(target.worlds)) {
    const evaluation = core.evaluateTrial(child);
    assert.deepEqual(child.outputFacet, F('Projection', evaluation.isEntailed ? 'O' : 'I'));
    assert.equal(child.worldRule, engine.WORLD_RULE);
  }
  const key = letters(target)[0], corrupt = clone(target);
  corrupt.worlds[key].outputFacet.form = corrupt.worlds[key].outputFacet.form === 'I' ? 'O' : 'I';
  assert.throws(() => engine.relationalSignature(corrupt), /output does not follow/);
});

test('exact N-back offsets and unscored warmups are used at all eight levels', () => {
  for (const level of engine.LEVELS) {
    const rng = new Rng(419 + level), history = [];
    for (let i = 0; i < level; i += 1) {
      history.push(engine.generateTrial(rng));
      const warmup = engine.evaluateHistory(history, i, level);
      assert.equal(warmup.warmup, true);
      assert.equal(warmup.scored, false);
    }
    history.push(engine.generateNBackTrial(rng, history[0], { match: true, nBackLevel: level }));
    const result = engine.evaluateHistory(history, level, level);
    assert.equal(result.targetIndex, 0);
    assert.equal(result.isMatch, true);
    assert.equal(result.scored, true);
    if (level > 1) {
      history[level - 1] = engine.generateNBackTrial(rng, history[0], { match: false, lureKind: 'category' });
      assert.equal(engine.evaluateHistory(history, level, level).isMatch, true);
      assert.equal(engine.evaluateHistory(history, level, 1).isMatch, false);
    }
  }
  assert.throws(() => engine.evaluateHistory([original], 0, 0), /integer from 1 through 8/);
  assert.throws(() => engine.evaluateHistory([original], 0, 1.5), /integer from 1 through 8/);
});

test('fresh copies carry no previous answers, old targets, lure metadata or timings', () => {
  const target = clone(original);
  Object.assign(target, { _answered: true, response: 'noMatch', correct: false, responseTime: 888, started: 123,
    submitted: true, lureKind: 'nested', changedDetails: [{ stale: true }], nBackTargetSignature: 'old',
    conflictResponses: { stale: true }, customAnswer: 'do not copy arbitrary fields' });
  const next = engine.generateNBackTrial(new Rng(821), target, { match: true });
  for (const key of ['_answered', 'response', 'correct', 'responseTime', 'started', 'submitted', 'lureKind', 'changedDetails', 'conflictResponses', 'customAnswer']) {
    assert.equal(Object.prototype.hasOwnProperty.call(next, key), false, key);
  }
  assert.notEqual(next.nBackTargetSignature, 'old');
});

test('input validation rejects bad endpoint bindings, resolution, identity, world keys and recursion', () => {
  const cases = [
    trial => { delete trial.premises[0].subjectFacet; },
    trial => { trial.premises[0].subjectFacet.category = 'Invented'; },
    trial => { trial.premises[0].subjectFacet.form = 'inner'; },
    trial => { trial.directionResolution = 7; },
    trial => { trial.conclusion.object = trial.conclusion.subject; },
    trial => { trial.premises[0].subject = 'a'; },
    trial => { trial.complexity = 'unknown'; },
    trial => { trial.complexity = 'entities'; },
    trial => { trial.premises[0].objectFacet = clone(trial.premises[1].subjectFacet); },
    trial => { trial.worlds = {}; },
    trial => { trial.directionResolution = 4; trial.premises[0].relation = 'NE'; }
  ];
  for (const change of cases) { const trial = clone(original); change(trial); assert.throws(() => engine.relationalSignature(trial)); }
  const world = engine.generateTrial(new Rng(87), { complexity: 'worlds' });
  const key = letters(world)[0];
  const missing = clone(world); delete missing.worlds[key];
  assert.throws(() => engine.relationalSignature(missing), /exactly one inner world/);
  const extra = clone(world); extra.worlds['Q'] = clone(world.worlds[key]);
  if (!Object.hasOwn(world.worlds, 'Q')) assert.throws(() => engine.relationalSignature(extra), /exactly one inner world/);
  const nested = clone(world); nested.worlds[key] = clone(world);
  assert.throws(() => engine.relationalSignature(nested), /exactly one inner level/);
  const resolution = clone(world); resolution.worlds[key].directionResolution = 8;
  assert.throws(() => engine.relationalSignature(resolution), /resolutions must agree/);
});

test('probe interventions reverse geometry without changing endpoint identities or ontology perspectives', () => {
  const probe = engine.generateProbe(original);
  assert.equal(probe.spatial.answer, true);
  assert.equal(probe.spatial.expectedRelation, 'N');
  assert.equal(probe.counterfactual.answer, false);
  assert.equal(probe.counterfactual.expectedRelation, 'S');
  assert.deepEqual(probe.counterfactual.trial.conclusion, original.conclusion);
  original.premises.forEach((statement, i) => {
    const changed = probe.counterfactual.trial.premises[i];
    assert.equal(changed.subject, statement.subject);
    assert.equal(changed.object, statement.object);
    assert.deepEqual(changed.subjectFacet, statement.subjectFacet);
    assert.deepEqual(changed.objectFacet, statement.objectFacet);
  });
  assert.equal(engine.compare(original, probe.counterfactual.trial).isMatch, false);
});

test('generation covers bent chains, all forms/categories and every default lure type', () => {
  const rng = new Rng(381), categories = new Set(), forms = new Set(), bends = new Set(), lures = new Set();
  for (const resolution of engine.RESOLUTIONS) for (let i = 0; i < 100; i += 1) {
    const trial = engine.generateTrial(rng, { complexity: 'worlds', directionResolution: resolution });
    for (const statement of list(trial)) for (const facet of [statement.subjectFacet, statement.objectFacet]) { categories.add(facet.category); forms.add(facet.form); }
    const first = trial.premises[0].relation, second = trial.premises[1].relation;
    if (first !== second && first !== opposite(second)) bends.add(resolution);
    const lure = engine.generateNBackTrial(rng, trial, { match: false });
    lures.add(lure.lureKind);
  }
  assert.deepEqual([...categories].sort(), [...engine.ONTOLOGY_CATEGORIES].sort());
  assert.deepEqual([...forms].sort(), ['A', 'I', 'O']);
  assert.deepEqual([...bends].sort((a, b) => a - b), [8, 16]);
  assert.deepEqual([...lures].sort(), [...engine.LURE_KINDS].sort());
});

test('audit covers 3 complexities × 3 resolutions × 8 N levels and reports honest lure invariants', () => {
  const audit = engine.runExhaustiveAudit(8);
  assert.equal(audit.passed, true, JSON.stringify(audit.failures));
  assert.equal(audit.rows.length, 72);
  assert.equal(audit.totalEvaluations, 576);
  assert.equal(audit.matches, 288);
  assert.equal(audit.nonMatches, 288);
  assert.equal(audit.partialLureChecks, 288);
  assert.equal(audit.invariants.exactTwoStatementNonMatchLures, false);
  assert.equal(audit.invariants.ontologyCategoriesScoringNeutral, false);
  assert.equal(audit.invariants.nestedCompleteStructureScored, true);
});
