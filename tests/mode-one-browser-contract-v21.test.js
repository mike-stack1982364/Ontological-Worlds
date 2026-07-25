'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const conflict = require(path.join(__dirname, '..', 'mode-one-conflict-matrix-v20.js'));

assert.ok(conflict.version >= 25);
assert.deepStrictEqual([...conflict.LEVELS], [1,2,3,4,5,6,7,8]);
assert.strictEqual(conflict.ALL_MASKS.length, 8);
assert.strictEqual(new Set(conflict.ALL_MASKS.map(mask => mask.map(Number).join(''))).size, 8);

const target = {
  premises: [
    { subject: 'A', relation: 'N', object: 'B' },
    { subject: 'C', relation: 'E', object: 'A' }
  ],
  conclusion: { subject: 'B', relation: 'SW', object: 'C' },
  letters: ['A','B','C']
};

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() { let value = this.s += 1831565813; value = Math.imul(value ^ value >>> 15, 1 | value); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) { const out = [...values]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [out[i],out[j]] = [out[j],out[i]]; } return out; }
}

let explicitMaskChecks = 0;
for (const roleSensitive of [false, true]) {
  for (const [maskIndex, mask] of conflict.ALL_MASKS.entries()) {
    const requestedMatch = mask.every(Boolean);
    const rng = new Rng(0x7b000000 + Number(roleSensitive) * 1000 + maskIndex);
    const trial = conflict.generateConflictTrial(rng, target, {
      match: requestedMatch,
      mask,
      interferenceLevel: 100,
      roleSensitive
    });
    const result = conflict.evaluateConflictMatrix(target, trial, { roleSensitive });
    assert.deepStrictEqual(result.statementMatches, mask, `mask ${mask.map(Number).join('')} roleSensitive=${roleSensitive}`);
    assert.strictEqual(result.wholeTrialMatch, requestedMatch);
    assert.strictEqual(result.responseVector.length, 5);
    assert.strictEqual(result.responseVector[3], core.evaluateTrial(trial).isEntailed);
    assert.strictEqual(result.responseVector[4], requestedMatch);
    explicitMaskChecks += 1;
  }
}

assert.throws(() => conflict.evaluateConflictMatrix(target, {
  premises: [
    { subject: 'A', relation: 'N', object: 'B' },
    { subject: 'A', relation: 'E', object: 'B' }
  ],
  conclusion: { subject: 'A', relation: 'S', object: 'B' }
}), /exactly three letters/i);

const source = fs.readFileSync(path.join(__dirname, '..', 'mode-one-conflict-matrix-v20.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.ok(source.includes("const labels=['Statement 1 — N-back','Statement 2 — N-back','Statement 3 — N-back','Statement 3 — entailed?','Complete triad — N-back']"));
assert.ok(source.includes("const keyboard=['a','s','d','f','g','h','j','k','l',';']"));
assert.ok(source.includes('responses.some(v=>v===null)'), 'submission must reject incomplete five-decision vectors');
assert.ok(source.includes('conflictDecisionStats=Array.from({length:5},createDecisionScore)'), 'five independent score channels must exist');
assert.ok(source.includes('conflictDecisionTimes'), 'first-response latency must be retained');
assert.ok(source.includes('correctness.every(Boolean)'), 'trial success must require all five decisions');
assert.ok(source.includes('recordNBackResponse'), 'diagnostic learning hook must receive the multidimensional response');
assert.ok(source.includes("matrix.setAttribute('aria-label','Five-decision relational conflict matrix')"));
assert.ok(source.includes('aria-live="polite"'));
assert.ok(!source.includes('global.addEventListener'), 'production code must not rely on a Node event-listener shim');
assert.ok(source.includes("if(roleSensitive && currentIndex!==2 && targetIndex===2) return false"), 'role-sensitive local compatibility must preserve both premise and conclusion roles');
assert.ok(source.includes('function mutationDistances(interferenceLevel)'), 'interference level must control lure distance classes');

const staticChoices = (html.match(/class="conflict-choice"/g) || []).length;
assert.strictEqual(staticChoices, 10, 'front page must contain all ten response buttons without dynamic injection');
assert.ok(html.includes('grid-template-columns:repeat(5,minmax(0,1fr))'), 'five decision pairs must occupy one full-width horizontal grid');
assert.ok(html.includes('width:100vw'), 'response matrix must escape the narrow game card and span the viewport');
assert.ok(html.includes('position:absolute'), 'full-width response matrix must occupy the original response stage instead of expanding the page');
assert.ok(html.includes('.response-stage{position:relative'), 'response stage must anchor the viewport-wide matrix at the original button height');
assert.ok(!html.includes('overflow-x:auto'), 'front-page response controls must not become a horizontally scrolling strip');
assert.ok(source.includes('for(let attempt=0;attempt<4;attempt++)'), 'browser must retry transient Mode 1 generation failures');
assert.ok(source.includes('recoveredGeneration:true'), 'browser must recover safely rather than terminate the session');
assert.ok(source.includes("d.getElementById('logic-mode')?.addEventListener('change'"), 'matrix visibility must track mode selection');
assert.ok(source.includes("matrix.setAttribute('aria-hidden',String(!isModeOne))"), 'matrix visibility must be reflected accessibly');
assert.ok(source.includes("app.nextTrial=function(...args)"), 'trial lifecycle must be guarded');
assert.ok(source.includes("Mode 1 next-trial failure recovered"), 'runtime failures must recover without stopping the session');

const corePosition = html.indexOf('mode-one-spatial-core.js');
const modeTwoPosition = html.indexOf('mode-two-ontology-nback-v14.js');
const conflictPosition = html.indexOf('mode-one-conflict-matrix-v20.js');
assert.ok(corePosition >= 0 && modeTwoPosition > corePosition && conflictPosition > modeTwoPosition,
  'runtime scripts must load the shared core, then Mode 2, then the Mode 1 conflict-matrix patch');

const audit = conflict.runAudit(1024);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures));
assert.strictEqual(audit.total, 8192);
assert.strictEqual(audit.totalBinaryDecisions, audit.total * 5);
assert.strictEqual(audit.invariants.nativePerDecisionScoring, true);
assert.strictEqual(audit.invariants.roleSensitiveAndFlexibleComparison, true);
assert.strictEqual(audit.invariants.globallyConsistentLetterMappingRequired, true);
assert.strictEqual(audit.invariants.oneToOneStatementAssignmentRequired, true);

console.log(JSON.stringify({
  passed: true,
  explicitMaskChecks,
  browserContractChecks: 27,
  staticChoices,
  audit: {
    total: audit.total,
    totalBinaryDecisions: audit.totalBinaryDecisions,
    mappingConflicts: audit.mappingConflicts,
    failures: audit.failures
  }
}, null, 2));