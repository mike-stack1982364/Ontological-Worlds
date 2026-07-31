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
const paletteSource = fs.readFileSync(path.join(__dirname, '..', 'response-palette-v2.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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

assert.match(paletteSource, /version: 3/);
assert.match(paletteSource, /keys: 'A · D · H'[\s\S]*label: 'LIGHT BLUE = THIS STATEMENT MATCHES'[\s\S]*background: '#D9F0FF'[\s\S]*text: '#08385F'[\s\S]*border: '#5AB5E6'/);
assert.match(paletteSource, /keys: 'S · F · J'[\s\S]*label: 'DARK BLUE = THIS STATEMENT DOES NOT MATCH'[\s\S]*background: '#123A6D'[\s\S]*text: '#FFFFFF'[\s\S]*border: '#082A52'/);
assert.match(paletteSource, /keys: 'K'[\s\S]*label: 'LIGHT GREEN = STATEMENT 3 IS EXACTLY ENTAILED'[\s\S]*background: '#DDF7E8'[\s\S]*text: '#075A37'[\s\S]*border: '#58B883'/);
assert.match(paletteSource, /keys: 'L'[\s\S]*label: 'DARK GREEN = STATEMENT 3 IS NOT ENTAILED'[\s\S]*background: '#0B5D3B'[\s\S]*text: '#FFFFFF'[\s\S]*border: '#063B27'/);
assert.match(paletteSource, /keys: 'SPACEBAR'[\s\S]*label: 'DEEP PURPLE = THE WHOLE TRIAD MATCHES'[\s\S]*background: '#4C1D95'/);
assert.match(paletteSource, /keys: 'N'[\s\S]*label: 'LIGHT PURPLE = THE WHOLE TRIAD DOES NOT MATCH'[\s\S]*background: '#F1E4FF'/);
assert.match(paletteSource, /synchroniseTutorial/);
assert.match(paletteSource, /openMatchingTutorialWithCurrentPalette/);
assert.match(indexSource, /response-palette-v2\.js\?v=20260731-2/);

assert.doesNotMatch(paletteSource, /GREEN = THIS STATEMENT MATCHES/);
assert.doesNotMatch(paletteSource, /DARK PURPLE = THIS STATEMENT DOES NOT MATCH/);
assert.doesNotMatch(paletteSource, /ICY BLUE = STATEMENT 3 IS EXACTLY ENTAILED/);
assert.doesNotMatch(paletteSource, /DARK OCEAN BLUE = STATEMENT 3 IS NOT ENTAILED/);

console.log(JSON.stringify({
  passed: true,
  auditedExamples: 5,
  buttonDesktopMinHeight: 68,
  buttonMobileMinHeight: 62,
  buttonWidthUnchanged: 'min(100%,620px)',
  colourMappingsAudited: 6,
  paletteVersion: 3
}, null, 2));
