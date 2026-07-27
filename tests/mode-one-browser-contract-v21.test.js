'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const conflict = require(path.join(__dirname, '..', 'mode-one-conflict-matrix-v20.js'));
const maximal = require(path.join(__dirname, '..', 'mode-one-letter-continuity-v1.js'));

assert.ok(conflict.version >= 20);
assert.strictEqual(maximal.version, 2);
assert.strictEqual(maximal.MAX_INTERFERENCE, 100);
assert.deepStrictEqual([...conflict.LEVELS], [1,2,3,4,5,6,7,8]);

const conflictSource = fs.readFileSync(path.join(__dirname, '..', 'mode-one-conflict-matrix-v20.js'), 'utf8');
const maximalSource = fs.readFileSync(path.join(__dirname, '..', 'mode-one-letter-continuity-v1.js'), 'utf8');
const routerSource = fs.readFileSync(path.join(__dirname, '..', 'mode-router-v2.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Five independent decisions remain statically present and independently timed.
const staticChoices = (html.match(/class="conflict-choice"/g) || []).length;
assert.strictEqual(staticChoices, 10, 'front page must contain all ten response buttons');
for (const label of ['A','S','D','F','H','J','K','L','SPACEBAR','N']) {
  assert.ok(html.includes(`>${label}</button>`), `missing response button ${label}`);
}
assert.ok(conflictSource.includes("const keyboard = ['a','s','d','f','h','j','k','l',' ','n']"));
assert.ok(conflictSource.includes('conflictDecisionTimes'));
assert.ok(conflictSource.includes('correctness.every(Boolean)'));
assert.ok(conflictSource.includes('responses = new Array(5).fill(null)'));
assert.ok(conflictSource.includes('responses.filter(value => value !== null).length'));

// Maximum interference is fixed in both the initial HTML and authoritative runtime.
assert.ok(html.includes('id="interference-val">100% — FIXED</span>'));
assert.ok(html.includes('id="interference-slider" type="range" min="100" max="100" step="1" value="100" disabled'));
assert.ok(maximalSource.includes('const MAX_INTERFERENCE = 100'));
assert.ok(maximalSource.includes('targetOverlapCount: 2'));
assert.ok(maximalSource.includes("exactTwoStatementLure: !after.wholeTrialMatch && after.matchedCount === 2"));
assert.ok(maximalSource.includes("if (mode !== 0) return originalMakeTrial();"), 'Mode 2 delegation must be preserved');
assert.ok(maximalSource.includes('Maximum-interference relettering changed the five-decision logical response vector.'));
assert.ok(maximalSource.includes('Mode 1 trial violates the authoritative maximum-interference invariant.'));

// The display lifecycle validates generated trials before any premise reaches the DOM.
assert.ok(conflictSource.includes('Mode 1 candidate escaped fixed 100% logical interference.'));
assert.ok(conflictSource.includes('this.assertModeOneMaximumInterference(target, previous, candidate)'));
assert.ok(conflictSource.includes('Mode 1 warm-up candidate violated two-retained/one-replaced continuity.'));
assert.ok(conflictSource.includes("if (Number(originalSettings().mode) !== 0) return originalMakeTrial();"));
assert.ok(conflictSource.includes("matrix.setAttribute('aria-hidden', String(!isModeOne))"));
assert.ok(conflictSource.includes("d.body.classList.toggle('mode-one-conflict-active', isModeOne)"));
assert.ok(html.includes('body.mode-one-conflict-active .response-buttons{display:none!important}'));

// Installation is fail-closed rather than silently falling back to random premises.
assert.ok(maximalSource.includes('MAX_INTERFERENCE_INSTALL_FAILED'));
assert.ok(maximalSource.includes('if (start) start.disabled = true'));
assert.ok(maximalSource.includes('rootObject.__modeOneMaxInterferenceReady = true'));

// Production audit must remain stable even after later N-back layers replace the
// earlier approved-template generator.
assert.ok(routerSource.includes('function runStableProductionAudit()'));
assert.ok(routerSource.includes('productionStackAudit: true'));
assert.ok(!routerSource.includes('core.runAudit(8192)'), 'browser must not run a stale heavy audit against a later generator');

// Script order and cache-busting are part of the deployment contract.
const corePosition = html.indexOf('mode-one-spatial-core.js');
const modeTwoPosition = html.indexOf('mode-two-ontology-nback-v14.js');
const conflictPosition = html.indexOf('mode-one-conflict-matrix-v20.js');
const maximalPosition = html.indexOf('mode-one-letter-continuity-v1.js');
assert.ok(corePosition >= 0 && modeTwoPosition > corePosition && conflictPosition > modeTwoPosition && maximalPosition > conflictPosition,
  'runtime scripts must load core, Mode 2, conflict runtime, then authoritative maximum interference');
assert.ok(html.includes('mode-one-conflict-matrix-v20.js?v=20260727-max-interference-3'));
assert.ok(html.includes('mode-one-letter-continuity-v1.js?v=20260727-authoritative-max-logic-3'));

const audit = maximal.runAudit(128);
assert.strictEqual(audit.passed, true, JSON.stringify(audit.failures));
assert.strictEqual(audit.maximumInterference, 100);
assert.strictEqual(audit.rows.length, 24);
assert(audit.rows.every(row => row.failures === 0));
assert(audit.rows.every(row => row.scored > 0));

console.log(JSON.stringify({
  passed: true,
  staticChoices,
  fixedInterference: maximal.MAX_INTERFERENCE,
  auditRows: audit.rows.length,
  failClosedGeneration: true,
  modeTwoDelegationPreserved: true,
  cacheKey: '20260727-authoritative-max-logic-3'
}, null, 2));
