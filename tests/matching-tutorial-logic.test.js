'use strict';

const assert = require('assert');
const path = require('path');
const test = require('node:test');
const { loadProductionPage } = require('./helpers/production-page.cjs');
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

test('the visible matching tutorial teaches the live key meanings and palette', async t => {
  const page = await loadProductionPage(t);
  const { window, byId } = page;
  assert.deepStrictEqual(page.errors, []);
  const button = byId('matching-tutorial-btn');
  const dialog = byId('matching-tutorial-dialog');
  assert.ok(button);
  assert.strictEqual(dialog.hidden, true);
  button.click();
  assert.strictEqual(dialog.hidden, false);
  assert.strictEqual(button.getAttribute('aria-expanded'), 'true');
  assert.strictEqual(dialog.getAttribute('role'), 'dialog');
  assert.match(dialog.textContent, /A, D, H, K and SPACEBAR/);
  assert.match(dialog.textContent, /single best valid shared alignment/);
  assert.match(dialog.textContent, /exact end-to-end conclusion/);
  const expectedLegend = [
    ['A · D · H', 'LIGHT BLUE = THIS STATEMENT MATCHES', 'rgb(217, 240, 255)'],
    ['S · F · J', 'DARK BLUE = THIS STATEMENT DOES NOT MATCH', 'rgb(18, 58, 109)'],
    ['K', 'LIGHT GREEN = STATEMENT 3 IS EXACTLY ENTAILED', 'rgb(221, 247, 232)'],
    ['L', 'DARK GREEN = STATEMENT 3 IS NOT ENTAILED', 'rgb(11, 93, 59)'],
    ['SPACEBAR', 'DEEP PURPLE = THE WHOLE TRIAD MATCHES', 'rgb(76, 29, 149)'],
    ['N', 'LIGHT PURPLE = THE WHOLE TRIAD DOES NOT MATCH', 'rgb(241, 228, 255)']
  ];
  const cards = [...dialog.querySelectorAll('.matching-tutorial-key')];
  assert.strictEqual(cards.length, expectedLegend.length);
  for (const [keys, label, background] of expectedLegend) {
    const card = cards.find(candidate => candidate.querySelector('strong')?.textContent.trim() === keys);
    assert.ok(card, keys);
    assert.ok(card.textContent.includes(label), label);
    assert.strictEqual(window.getComputedStyle(card).backgroundColor, background);
  }
  assert.doesNotMatch(dialog.textContent, /GREEN = THIS STATEMENT MATCHES|DARK PURPLE = THIS STATEMENT DOES NOT MATCH|ICY BLUE = STATEMENT 3|DARK OCEAN BLUE = STATEMENT 3/);
  page.key('Escape');
  assert.strictEqual(dialog.hidden, true);
  assert.strictEqual(button.getAttribute('aria-expanded'), 'false');
  assert.deepStrictEqual(page.errors, []);
});
