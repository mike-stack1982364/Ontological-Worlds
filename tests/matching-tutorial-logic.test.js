'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require(path.join(__dirname, '..', 'mode-one-spatial-core.js'));
const conflict = require(path.join(__dirname, '..', 'mode-one-conflict-matrix-v20.js'));

const trial = (premises, conclusion) => ({
  premises,
  conclusion,
  directionResolution: 8
});

const oldCard = trial([
  { subject: 'A', relation: 'E', object: 'B' },
  { subject: 'C', relation: 'N', object: 'A' }
], { subject: 'C', relation: 'NE', object: 'B' });

const directMatch = trial([
  { subject: 'P', relation: 'E', object: 'Q' },
  { subject: 'R', relation: 'N', object: 'P' }
], { subject: 'R', relation: 'NE', object: 'Q' });

const directEvaluation = conflict.evaluateConflictMatrix(oldCard, directMatch, { roleSensitive: true });
assert.deepStrictEqual([...directEvaluation.responseVector], [true, true, true, true, true]);

const swappedPremises = trial([
  { subject: 'R', relation: 'N', object: 'P' },
  { subject: 'P', relation: 'E', object: 'Q' }
], { subject: 'R', relation: 'NE', object: 'Q' });

const swappedEvaluation = conflict.evaluateConflictMatrix(oldCard, swappedPremises, { roleSensitive: true });
assert.deepStrictEqual([...swappedEvaluation.responseVector], [true, true, true, true, true]);
assert.deepStrictEqual([...swappedEvaluation.assignment], [1, 0, 2]);

const correctlyReversed = trial([
  { subject: 'Q', relation: 'W', object: 'P' },
  { subject: 'R', relation: 'N', object: 'P' }
], { subject: 'Q', relation: 'SW', object: 'R' });

const reversedEvaluation = conflict.evaluateConflictMatrix(oldCard, correctlyReversed, { roleSensitive: true });
assert.deepStrictEqual([...reversedEvaluation.responseVector], [true, true, true, true, true]);

const exactNearMiss = trial([
  { subject: 'P', relation: 'E', object: 'Q' },
  { subject: 'R', relation: 'N', object: 'P' }
], { subject: 'R', relation: 'E', object: 'Q' });

const nearMissEvaluation = conflict.evaluateConflictMatrix(oldCard, exactNearMiss, { roleSensitive: true });
assert.deepStrictEqual([...nearMissEvaluation.responseVector], [true, true, false, false, false]);

const wrongEndpointPair = trial([
  { subject: 'A', relation: 'E', object: 'B' },
  { subject: 'C', relation: 'N', object: 'A' }
], { subject: 'C', relation: 'N', object: 'A' });

const endpointEvaluation = core.evaluateTrial(wrongEndpointPair);
assert.strictEqual(endpointEvaluation.isEntailed, false);
assert.strictEqual(endpointEvaluation.distinctionClass, 'wrong-letter-pair');

const tutorialSource = fs.readFileSync(path.join(__dirname, '..', 'matching-tutorial.js'), 'utf8');
assert.match(tutorialSource, /width:min\(100%,620px\);min-height:68px/);
assert.match(tutorialSource, /#matching-tutorial-btn\{min-height:62px/);
assert.match(tutorialSource, /A, D, H, K and SPACEBAR/);
assert.match(tutorialSource, /single best valid shared alignment/);
assert.match(tutorialSource, /exact end-to-end conclusion/);

console.log(JSON.stringify({
  passed: true,
  auditedExamples: 5,
  buttonDesktopMinHeight: 68,
  buttonMobileMinHeight: 62,
  buttonWidthUnchanged: 'min(100%,620px)'
}, null, 2));
