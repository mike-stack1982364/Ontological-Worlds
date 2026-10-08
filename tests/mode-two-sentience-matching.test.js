'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const engine = require('../mode-two-engine-v22.js');
const spatial = require('../mode-one-spatial-core.js');
const clone = value => JSON.parse(JSON.stringify(value));
const F = (category, form = 'A') => ({ category, form });
const S = (subject, subjectFacet, relation, object, objectFacet) => ({ subject, subjectFacet, relation, object, objectFacet });
const all = trial => [...trial.premises, trial.conclusion];
const perms = values => values.length < 2 ? [values.slice()] : values.flatMap((v, i) => perms(values.filter((_, j) => j !== i)).map(rest => [v, ...rest]));
const ring = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const opposite = code => ring[(ring.indexOf(code) + 8) % 16];
const letters = trial => [...new Set(all(trial).flatMap(s => [s.subject, s.object]))];
class Rng { constructor(seed) { this.s = seed; } next() { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s / 4294967296; } }
function triangle(relations = ['N', 'N', 'N'], resolution = 16) {
  return { complexity: 'facets', directionResolution: resolution, premises: [
    S('A', F('Connection','O'), relations[0], 'B', F('Projection')),
    S('B', F('Projection','O'), relations[1], 'C', F('Multiplication'))
  ], conclusion: S('A', F('Division','I'), relations[2], 'C', F('Projection')) };
}
function reorder(trial, order) {
  const result = clone(trial), list = all(result);
  result.premises = order.slice(0, 2).map(index => list[index]);
  result.conclusion = list[order[2]];
  return result;
}
function oracle(target, current) {
  const tl = letters(target), cl = letters(current), old = all(target), now = all(current);
  let best;
  for (const images of perms(cl)) {
    const mapping = Object.fromEntries(tl.map((l, i) => [l, images[i]]));
    const sameFacet = (a, b) => a.form === b.form && a.category === b.category;
    for (const assignment of perms([0, 1, 2])) {
      const vector = now.map((s, i) => {
        const t = old[assignment[i]];
        return mapping[t.subject] === s.subject && mapping[t.object] === s.object && t.relation === s.relation && sameFacet(t.subjectFacet,s.subjectFacet) && sameFacet(t.objectFacet,s.objectFacet)
          || mapping[t.subject] === s.object && mapping[t.object] === s.subject && opposite(t.relation) === s.relation && sameFacet(t.subjectFacet,s.objectFacet) && sameFacet(t.objectFacet,s.subjectFacet);
      });
      const count = vector.filter(Boolean).length;
      const key = `${3-count}|${vector.map(Number).join('')}|${assignment.join('')}|${tl.map(l=>mapping[l]).join('')}`;
      if (!best || count > best.count || count === best.count && key.localeCompare(best.key) < 0) best = {count,vector,assignment,mapping,key};
    }
  }
  return best;
}

test('all three statement positions share the same cross-trial matching role', () => {
  const target = triangle();
  for (const order of perms([0,1,2])) {
    const current = reorder(target, order), compared = engine.compare(target, current);
    assert.equal(compared.isMatch, true, order.join(''));
    assert.equal(compared.alignment.matchedCount, 3);
    assert.equal(engine.relationalSignature(target), engine.relationalSignature(current));
    assert.deepEqual(compared.alignment.statementMatches, [true,true,true]);
    assert.equal(engine.evaluateHistory([target,current],1,1).isMatch,true);
  }
  const collapsedProof = reorder(target,[0,2,1]);
  assert.throws(() => engine.evaluate(collapsedProof), /collapse|same position/);
  assert.equal(engine.compare(target,collapsedProof).currentWithinTrial,null);
  assert.equal(engine.compare(target,collapsedProof).isMatch,true);
  assert.equal(engine.ensureResolutionClosed(collapsedProof),false,'Generated worlds still require a valid within-trial proof');
});

test('comparison does not impose within-trial direction closure, while generation keeps it', () => {
  const target = triangle(['N','E','N'],4);
  assert.throws(()=>engine.evaluate(target), /derived relation escaped/);
  assert.equal(engine.compare(target,reorder(target,[2,0,1])).isMatch,true);
  for(const resolution of engine.RESOLUTIONS) for(const complexity of engine.COMPLEXITIES) {
    const generated=engine.generateTrial(new Rng(resolution*761+complexity.length),{directionResolution:resolution,complexity});
    assert.equal(engine.ensureResolutionClosed(generated,resolution),true);
    assert.ok(engine.compare(generated,generated).currentWithinTrial);
  }
});

test('endpoint categories, forms and same-letter facet roles remain scored after any slot movement', () => {
  const target=triangle(), moved=reorder(target,[2,0,1]);
  const changed=clone(moved);changed.premises[0].subjectFacet.category='Action';
  assert.equal(engine.compare(target,changed).isMatch,false);
  const form=clone(moved);form.premises[0].subjectFacet.form='O';
  assert.equal(engine.compare(target,form).isMatch,false);
  const swapped=clone(moved);
  [swapped.premises[0].subjectFacet,swapped.premises[1].subjectFacet]=[swapped.premises[1].subjectFacet,swapped.premises[0].subjectFacet];
  assert.equal(engine.compare(target,swapped).isMatch,false,'A bag of descriptors cannot replace endpoint bindings');
});

test('all six assignments and deterministic false-first ties agree with independent matching', () => {
  const variants=[];
  for(const first of ['N','E','S','W'])for(const second of ['N','E','S','W'])for(const third of ['N','E','S','W']) {
    const item=triangle([first,second,third],4);
    // Deliberately identical endpoint descriptors admit competing global maps.
    item.complexity='entities';all(item).forEach(s=>{s.subjectFacet=F('Action');s.objectFacet=F('Action');});
    variants.push(item);
  }
  for(const target of variants)for(const current of variants) {
    const expected=oracle(target,current), actual=engine.analyseAlignment(target,current);
    assert.equal(actual.matchedCount,expected.count);
    assert.deepEqual(actual.statementMatches,expected.vector);
    assert.deepEqual(actual.mapping,expected.mapping);
    assert.deepEqual(actual.premiseAssignment,expected.assignment);
    assert.equal(engine.compare(target,current).isMatch,expected.count===3);
  }
});

test('nested graphs use local mappings and free slots while retaining their outer attachment', () => {
  const target=engine.generateTrial(new Rng(421),{complexity:'worlds',directionResolution:16});
  const key=letters(target)[0], child=triangle(['N','N','S']);
  child.worldRule=engine.WORLD_RULE;child.outputFacet=engine.outputFacet(child);
  assert.equal(child.outputFacet.form,'I');
  target.worlds[key]=child;
  const moved=reorder(target,[2,1,0]);
  moved.worlds[key]=reorder(child,[0,2,1]);
  assert.equal(engine.outputFacet(moved.worlds[key]).form,'I');
  assert.equal(engine.compare(target,moved).isMatch,true);
  const changed=clone(moved);changed.worlds[key].premises[0].subjectFacet.category='Completion';
  assert.equal(engine.compare(target,changed).isMatch,false);
  const attachment=clone(target), other=letters(target)[1];
  [attachment.worlds[key],attachment.worlds[other]]=[attachment.worlds[other],attachment.worlds[key]];
  assert.equal(engine.compare(target,attachment).isMatch,false,'Local worlds stay attached to the mapped outer entities');
});

test('a changed separate practice inference never changes an unchanged nested memory graph', () => {
  const target=engine.generateTrial(new Rng(643),{complexity:'worlds',directionResolution:16});
  const key=letters(target)[0], child=triangle(['N','E','NE']);
  child.worldRule=engine.WORLD_RULE;child.outputFacet=engine.outputFacet(child);
  assert.equal(child.outputFacet.form,'O');
  target.worlds[key]=child;
  const changed=clone(target), moved=reorder(child,[2,1,0]);
  moved.outputFacet=engine.outputFacet(moved);assert.equal(moved.outputFacet.form,'I');
  changed.worlds[key]=moved;
  assert.equal(engine.compare(child,moved).isMatch,true,'The inner edge graph still matches');
  assert.equal(engine.compare(target,changed).isMatch,true,'Only the stated graph and its attachment determine the nested memory match');
  assert.deepEqual(engine.compare(target,changed).alignment.statementMatches,[true,true,true]);
  const corrupt=clone(changed);corrupt.worlds[key].outputFacet=F('Projection','O');
  assert.equal(engine.compare(target,corrupt).isMatch,true,'A cached practice result cannot change a memory answer');
  assert.throws(()=>engine.evaluate(corrupt),/output does not follow/,'The independent practice still validates its result');
  assert.equal(spatial.evaluateTrial(child).isEntailed,true);
  assert.equal(spatial.evaluateTrial(moved).isEntailed,false);
});

test('all nested statement orders and equivalent inversions match even when a separate proof collapses', () => {
  const target=engine.generateTrial(new Rng(9187),{complexity:'worlds',directionResolution:16});
  const key=letters(target)[0], child=triangle(['N','N','N']);
  child.worldRule=engine.WORLD_RULE;child.outputFacet=engine.outputFacet(child);
  target.worlds[key]=child;
  let collapsed=0;
  for(const order of perms([0,1,2])) for(let mask=0;mask<8;mask++) {
    const current=reorder(target,[2,0,1]), moved=reorder(child,order);
    const items=all(moved).map((statement,index)=>(mask&(1<<index))?engine.invert(statement):statement);
    moved.premises=items.slice(0,2);moved.conclusion=items[2];
    current.worlds[key]=moved;
    const compared=engine.compare(target,current);
    assert.equal(compared.isMatch,true,`${order}:${mask}`);
    assert.equal(compared.alignment.wholeTrialMatch,true);
    assert.equal(engine.evaluateHistory([target,target,current],2,2).isMatch,true);
    assert.doesNotMatch(engine.renderOntologicalTrial(current),/premise|candidate|conclusion|world rule|infer its output/i);
    try { spatial.evaluateTrial(moved); } catch (_) { collapsed++;assert.equal(compared.currentWithinTrial,null); }
  }
  assert.ok(collapsed>0,'The fixtures cover undefined independent practice geometry');
  const malformed=clone(target);malformed.worlds[key].outputFacet={category:'Unknown',form:'O'};
  assert.throws(()=>engine.compare(target,malformed),/known category/,'Ignoring inferred truth does not ignore malformed facets');
  const changed=clone(target);changed.worlds[key].premises[0].subjectFacet.form='I';
  assert.equal(engine.compare(target,changed).isMatch,false,'An explicitly stated endpoint perspective is still scored');
});

test('a moved mixed-axis nested graph preserves true nonmatches for spatial and attachment changes', () => {
  const target=engine.generateTrial(new Rng(9981),{complexity:'worlds',directionResolution:16});
  const [key,other]=letters(target), child=triangle(['N','E','NE']);
  child.worldRule=engine.WORLD_RULE;child.outputFacet=engine.outputFacet(child);target.worlds[key]=child;
  const moved=clone(target);moved.worlds[key]=reorder(child,[2,1,0]);
  assert.equal(engine.compare(target,moved).isMatch,true);
  const spatialLure=clone(moved);spatialLure.worlds[key].premises[0].relation='E';
  assert.equal(engine.compare(target,spatialLure).isMatch,false);
  const attachmentLure=clone(moved);
  [attachmentLure.worlds[key],attachmentLure.worlds[other]]=[attachmentLure.worlds[other],attachmentLure.worlds[key]];
  assert.equal(engine.compare(target,attachmentLure).isMatch,false);
});
