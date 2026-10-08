'use strict';

// A gameplay-only snapshot: wording and cached signatures deliberately stay
// out, while statements, attached worlds, identities, RNG draws and answers
// remain part of the contract. The baseline was recorded from commit 09a62fc.
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const path = require('node:path');

class Rng {
  constructor(seed) { this.state = seed >>> 0; this.calls = 0; }
  next() {
    this.calls += 1;
    let value = this.state += 1831565813;
    value = Math.imul(value ^ value >>> 15, 1 | value);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
}
function gameplay(trial) {
  const snapshot = {
    directionResolution: trial.directionResolution,
    complexity: trial.complexity,
    statements: [...trial.premises, trial.conclusion],
    outputFacet: trial.outputFacet,
    nBackWarmup: trial.nBackWarmup,
    nBackRequestedMatch: trial.nBackRequestedMatch,
    nBackMatch: trial.nBackMatch,
    isMatch: trial.isMatch,
    scored: trial.scored,
    statementMatchVector: trial.statementMatchVector,
    conflictResponseVector: trial.conflictResponseVector,
    logicalInterference: trial.logicalInterference,
    letterExposure: trial.letterExposure,
    lureKind: trial.lureKind,
    changedDetails: trial.changedDetails,
    lureGenerationAttempts: trial.lureGenerationAttempts
  };
  if (trial.worlds) snapshot.worlds = Object.fromEntries(Object.keys(trial.worlds).sort()
    .map(letter => [letter, gameplay(trial.worlds[letter])]));
  return snapshot;
}
function recordCases(repository) {
  const conflict = require(path.join(repository, 'mode-one-conflict-matrix-v20.js'));
  const maximal = require(path.join(repository, 'mode-one-letter-continuity-v1.js'));
  const modeTwo = require(path.join(repository, 'mode-two-engine-v22.js'));
  const cases = [];
  for (const type of ['mode1', 'entities', 'facets', 'worlds']) {
    for (const resolution of [4, 8, 16]) for (const level of [1, 2, 8]) {
      for (const probability of [0, 0.15, 0.35, 0.6, 1]) {
        const key = `${type}/R${resolution}/N${level}/P${probability}`;
        const seed = 0x108000 + ['mode1', 'entities', 'facets', 'worlds'].indexOf(type) * 100000
          + resolution * 1000 + level * 100 + Math.round(probability * 100);
        const rng = new Rng(seed), history = [], records = [];
        // The extended N=2, P=.35 runs cross the 32-trial exposure window.
        const scoredTrials = level === 2 && probability === 0.35 ? 36 : 18;
        let requestedMatches = 0, actualMatches = 0;
        for (let index = 0; index < level + scoredTrials; index += 1) {
          const targetIndex = index - level, target = history[targetIndex];
          const requestedMatch = target ? rng.next() < probability : false;
          let current;
          if (type === 'mode1') {
            current = target ? maximal.generateMaximalScoredTrial(rng, target, history.at(-1), {
              match: requestedMatch, directionResolution: resolution
            }) : maximal.generateMaximalWarmupTrial(rng, history.at(-1), { directionResolution: resolution });
          } else if (target) {
            current = modeTwo.generateNBackTrial(rng, target, {
              match: requestedMatch, nBackLevel: level, directionResolution: resolution,
              interferenceLevel: 100, complexity: type, history: history.slice(-32)
            });
          } else {
            current = modeTwo.generateTrial(rng, {
              matchProbability: rng.next() < 0.5 ? 1 : 0, directionResolution: resolution,
              interferenceLevel: 100, complexity: type, history: history.slice(-32)
            });
            Object.assign(current, { nBackLevel: level, nBackWarmup: true, nBackMatch: false,
              isMatch: false, scored: false, directionResolution: resolution });
          }
          history.push(current);
          const evaluated = type === 'mode1' ? conflict.evaluateHistory(history, index, level)
            : modeTwo.evaluateHistory(history, index, level);
          assert.equal(evaluated.targetIndex, targetIndex, `${key} trial ${index}: exact N-back target`);
          assert.equal(evaluated.isMatch, requestedMatch, `${key} trial ${index}: requested answer`);
          requestedMatches += Number(requestedMatch);
          actualMatches += Number(evaluated.isMatch);
          records.push({ index, targetIndex, requestedMatch, actualMatch: evaluated.isMatch,
            responseVector: evaluated.responseVector, statementMatches: evaluated.statementMatches,
            alignment: evaluated.alignment, trial: gameplay(current), rngCalls: rng.calls, rngState: rng.state });
        }
        cases.push({ key, seed, trials: history.length, scoredTrials, requestedMatches, actualMatches,
          rngCalls: rng.calls, digest: createHash('sha256').update(JSON.stringify(records)).digest('hex') });
      }
    }
  }
  return cases;
}

module.exports = { recordCases };
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Pass the repository containing the historical generator modules.');
  process.stdout.write(JSON.stringify({ baselineCommit: '09a62fc8f8c2ca9d345641398e6a7a29ea251f22',
    cases: recordCases(path.resolve(process.argv[2])) }, null, 2) + '\n');
}
