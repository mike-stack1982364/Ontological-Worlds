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
assert.match(tutorialSource, /matching-tutorial-key green/);
assert.match(tutorialSource, /matching-tutorial-key statement-purple/);
assert.match(tutorialSource, /matching-tutorial-key light-purple/);
assert.match(tutorialSource, /matching-tutorial-key icy-blue/);
assert.match(tutorialSource, /matching-tutorial-key ocean-blue/);
assert.match(tutorialSource, /matching-tutorial-key dark-purple/);
assert.match(tutorialSource, /background:#5B21B6;color:#FFFFFF;border-color:#3B0764/);
assert.match(tutorialSource, /background:#D7F2FF;color:#08385F;border-color:#58B8E8/);
assert.match(tutorialSource, /background:#174A8B;color:#FFFFFF;border-color:#0A2E5C/);
assert.match(tutorialSource, /background:#4C1D95;color:#FFFFFF;border-color:#2E1065/);
assert.match(tutorialSource, /DARK PURPLE = THIS STATEMENT DOES NOT MATCH/);
assert.match(tutorialSource, /LIGHT PURPLE = THE WHOLE TRIAD DOES NOT MATCH/);
assert.match(tutorialSource, /DEEP PURPLE = THE WHOLE TRIAD MATCHES/);
assert.doesNotMatch(tutorialSource, /GREEN = YES<br>A · D · H · SPACEBAR/);
assert.doesNotMatch(tutorialSource, /BLUE = EXACT END-TO-END CONCLUSION/);

console.log(JSON.stringify({
  passed: true,
  auditedExamples: 5,
  buttonDesktopMinHeight: 68,
  buttonMobileMinHeight: 62,
  buttonWidthUnchanged: 'min(100%,620px)',
  colourMappingsAudited: 6
}, null, 2));
