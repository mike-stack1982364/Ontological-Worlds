'use strict';

/*
 * Mode 1 — Triadic Cardinal Streaming
 *
 * Every premise binds three independently transformed symbols. Each symbol is
 * specified by an ontology and form; two cardinal transitions bind the three
 * roles; the transition-between-transitions supplies a higher-order turn; and
 * the engine computes node, relation and integrated syntheses for scoring.
 * Ordinary letters remain surface carriers and never enter the signature.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const ontology = window.__ontologyTestAPI;
  if (!app || !ontology) return;

  const DIRS = ['N', 'E', 'S', 'W'];
  const DIR_NAME = { N: 'north', E: 'east', S: 'south', W: 'west' };
  const rotate = (direction, quarters) => DIRS[(DIRS.indexOf(direction) + quarters + 4) % 4];
  const descriptor = node => `${node.categoryId}|${node.form}|${node.memory?.canonicalDigest || node.memory?.digest || 'NEW'}`;

  const baseDeriveTrial = app.deriveTrial.bind(app);
  app.deriveTrial = function deriveTriadicModeOne(trial) {
    if (trial.mode !== 0) return baseDeriveTrial(trial);
    if (!Array.isArray(trial.nodes) || trial.nodes.length !== 3) {
      throw new Error('Mode 1 requires exactly three transformed symbols.');
    }
    if (!Array.isArray(trial.dirs) || trial.dirs.length !== 2) {
      throw new Error('Mode 1 requires exactly two cardinal transitions.');
    }

    trial.symbols = trial.nodes.map(node => node.symbol);
    trial.turns = [ontology.turn(trial.dirs[0], trial.dirs[1])];
    trial.transformationCount = 3;

    const [first, middle, last] = trial.nodes;
    trial.leftRelationCategory = ontology.relationCategory(first.categoryId, middle.categoryId);
    trial.rightRelationCategory = ontology.relationCategory(middle.categoryId, last.categoryId);
    trial.nodeSynthesisCategory = ontology.composeCategory(
      ontology.composeCategory(first.categoryId, middle.categoryId, 'SAME'),
      last.categoryId,
      trial.turns[0]
    );
    trial.relationSynthesisCategory = ontology.composeCategory(
      trial.leftRelationCategory,
      trial.rightRelationCategory,
      trial.turns[0]
    );
    trial.integratedCategory = ontology.composeCategory(
      trial.nodeSynthesisCategory,
      trial.relationSynthesisCategory,
      trial.turns[0]
    );
    trial.integratedForm = ontology.composeForms(trial.nodes.map(node => node.form));

    trial.signature = [
      'M0-T3',
      descriptor(first), trial.dirs[0], descriptor(middle), trial.dirs[1], descriptor(last),
      trial.turns[0],
      trial.leftRelationCategory,
      trial.rightRelationCategory,
      trial.nodeSynthesisCategory,
      trial.relationSynthesisCategory,
      trial.integratedCategory,
      trial.integratedForm
    ].join('|');
    return trial;
  };

  const baseMakeBase = app.makeBase.bind(app);
  app.makeBase = function makeTriadicModeOne(mode) {
    if (mode !== 0) return baseMakeBase(mode);
    const firstDirection = this.rng.pick(DIRS);
    const secondDirection = rotate(firstDirection, this.nextTurnQuarter(false));
    return this.deriveTrial({
      mode: 0,
      nodes: this.makePlainNodes(3),
      dirs: [firstDirection, secondDirection]
    });
  };

  const baseRenderTrial = app.renderTrial.bind(app);
  app.renderTrial = function renderTriadicModeOne(trial) {
    if (trial.mode !== 0) return baseRenderTrial(trial);
    const node = index => ontology.nodePhrase(trial.nodes[index]);
    return `${node(0)}; ${DIR_NAME[trial.dirs[0]]} to ${node(1)}; ${DIR_NAME[trial.dirs[1]]} to ${node(2)}.`;
  };

  const failures = [];
  try {
    const sample = app.makeBase(0);
    if (sample.nodes.length !== 3) failures.push('node-count');
    if (sample.dirs.length !== 2) failures.push('direction-count');
    if (sample.transformationCount !== 3) failures.push('transformation-count');
    if (sample.dirs[0] === sample.dirs[1]) failures.push('non-transforming-turn');
    if (!sample.integratedCategory || !sample.integratedForm) failures.push('missing-synthesis');
    if (app.renderTrial(sample).split(';').length !== 3) failures.push('auditory-clause-count');
  } catch (error) {
    failures.push(`exception:${error.message}`);
  }
  if (failures.length) console.error('Triadic Mode 1 self-test failed', failures);

  window.__modeOneTriadicTestAPI = {
    version: 1,
    nodeCount: 3,
    cardinalTransitionCount: 2,
    transformedSymbolCount: 3,
    higherOrderTurnCount: 1,
    surfaceSymbolsEnterSignature: false,
    selfTestPassed: failures.length === 0
  };
});
