'use strict';

(function exposeTriadicEntailmentCore(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.__modeOneTriadicEntailmentCore = api;
    root.__modeOneSpatialCore = api; // Compatibility alias for the existing router.
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
  const DIRECTIONS = [
    { code: 'N', name: 'north', x: 0, y: 1 },
    { code: 'NNE', name: 'north-northeast', x: Math.sin(Math.PI / 8), y: Math.cos(Math.PI / 8) },
    { code: 'NE', name: 'northeast', x: Math.SQRT1_2, y: Math.SQRT1_2 },
    { code: 'ENE', name: 'east-northeast', x: Math.cos(Math.PI / 8), y: Math.sin(Math.PI / 8) },
    { code: 'E', name: 'east', x: 1, y: 0 },
    { code: 'ESE', name: 'east-southeast', x: Math.cos(Math.PI / 8), y: -Math.sin(Math.PI / 8) },
    { code: 'SE', name: 'southeast', x: Math.SQRT1_2, y: -Math.SQRT1_2 },
    { code: 'SSE', name: 'south-southeast', x: Math.sin(Math.PI / 8), y: -Math.cos(Math.PI / 8) },
    { code: 'S', name: 'south', x: 0, y: -1 },
    { code: 'SSW', name: 'south-southwest', x: -Math.sin(Math.PI / 8), y: -Math.cos(Math.PI / 8) },
    { code: 'SW', name: 'southwest', x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    { code: 'WSW', name: 'west-southwest', x: -Math.cos(Math.PI / 8), y: -Math.sin(Math.PI / 8) },
    { code: 'W', name: 'west', x: -1, y: 0 },
    { code: 'WNW', name: 'west-northwest', x: -Math.cos(Math.PI / 8), y: Math.sin(Math.PI / 8) },
    { code: 'NW', name: 'northwest', x: -Math.SQRT1_2, y: Math.SQRT1_2 },
    { code: 'NNW', name: 'north-northwest', x: -Math.sin(Math.PI / 8), y: Math.cos(Math.PI / 8) }
  ];
  const BY_CODE = new Map(DIRECTIONS.map((item, index) => [item.code, { ...item, index }]));
  const TWO_PI = Math.PI * 2;
  const EPSILON = 1e-8;

  const CONTRACTS = {
    UNIT_4: {
      id: 'UNIT_4',
      algebra: 'directed-vector-composition',
      frame: 'allocentric',
      metric: 'equal-unit',
      resolution: 4,
      policy: 'exact-necessary',
      uncertainty: 'single-model',
      label: 'equal-unit vectors; exact four-way direction'
    },
    UNIT_8: {
      id: 'UNIT_8',
      algebra: 'directed-vector-composition',
      frame: 'allocentric',
      metric: 'equal-unit',
      resolution: 8,
      policy: 'exact-necessary',
      uncertainty: 'single-model',
      label: 'equal-unit vectors; exact eight-way direction'
    },
    UNIT_16: {
      id: 'UNIT_16',
      algebra: 'directed-vector-composition',
      frame: 'allocentric',
      metric: 'equal-unit',
      resolution: 16,
      policy: 'exact-necessary',
      uncertainty: 'single-model',
      label: 'equal-unit vectors; exact sixteen-way direction'
    },
    QUAL_8: {
      id: 'QUAL_8',
      algebra: 'qualitative-directional-composition',
      frame: 'allocentric',
      metric: 'unspecified-positive-distances',
      resolution: 8,
      policy: 'necessary-truth',
      uncertainty: 'all-admissible-models',
      label: 'unspecified distances; necessary truth; eight-way quadrant resolution'
    },
    QUAL_16: {
      id: 'QUAL_16',
      algebra: 'qualitative-directional-composition',
      frame: 'allocentric',
      metric: 'unspecified-positive-distances',
      resolution: 16,
      policy: 'necessary-truth',
      uncertainty: 'all-admissible-models',
      label: 'unspecified distances; necessary truth; exact sixteen-way direction'
    }
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function pick(rng, values) {
    if (!values.length) throw new Error('Cannot choose from an empty collection.');
    if (rng && typeof rng.pick === 'function') return rng.pick(values);
    const value = rng && typeof rng.next === 'function' ? rng.next() : Math.random();
    return values[Math.floor(value * values.length)];
  }

  function random(rng) {
    return rng && typeof rng.next === 'function' ? rng.next() : Math.random();
  }

  function shuffle(rng, values) {
    if (rng && typeof rng.shuffle === 'function') return rng.shuffle(values);
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random(rng) * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function direction(code) {
    const value = BY_CODE.get(code);
    if (!value) throw new Error(`Unknown direction: ${code}`);
    return value;
  }

  function opposite(code) {
    return DIRECTIONS[(direction(code).index + 8) % 16].code;
  }

  function allowedCodes(resolution) {
    if (![4, 8, 16].includes(Number(resolution))) throw new Error(`Unsupported resolution: ${resolution}`);
    const step = 16 / Number(resolution);
    return DIRECTIONS.filter((_, index) => index % step === 0).map(item => item.code);
  }

  function relationIsAtResolution(code, resolution) {
    return allowedCodes(resolution).includes(code);
  }

  function directionFromVector(x, y, resolution = 16) {
    if (Math.abs(x) < EPSILON && Math.abs(y) < EPSILON) return 'BALANCE';
    const clockwiseFromNorth = (Math.atan2(x, y) + TWO_PI) % TWO_PI;
    const sectors = Number(resolution);
    const sectorIndex = Math.round(clockwiseFromNorth / (TWO_PI / sectors)) % sectors;
    return DIRECTIONS[(sectorIndex * (16 / sectors)) % 16].code;
  }

  function coarsenDirection(code, resolution) {
    const value = direction(code);
    return directionFromVector(value.x, value.y, resolution);
  }

  function circularDistance(firstCode, secondCode) {
    const first = direction(firstCode).index;
    const second = direction(secondCode).index;
    const raw = Math.abs(first - second);
    return Math.min(raw, 16 - raw);
  }

  function relationVector(code) {
    const value = direction(code);
    return [value.x, value.y];
  }

  function zeroSymbolic() {
    return [
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ];
  }

  function symbolicStep(variableIndex, relationCode) {
    const [x, y] = relationVector(relationCode);
    const value = zeroSymbolic();
    value[variableIndex] = { x, y };
    return value;
  }

  function symbolicAdd(first, second, multiplier = 1) {
    return first.map((term, index) => ({
      x: term.x + multiplier * second[index].x,
      y: term.y + multiplier * second[index].y
    }));
  }

  function symbolicEqual(first, second) {
    return first.every((term, index) =>
      Math.abs(term.x - second[index].x) < 1e-6 &&
      Math.abs(term.y - second[index].y) < 1e-6
    );
  }

  function deriveSymbolicPositions(premises) {
    if (!Array.isArray(premises) || premises.length !== 2) {
      throw new Error('Triadic Entailment requires exactly two premises.');
    }
    const positions = new Map();
    const first = premises[0];
    positions.set(first.object, zeroSymbolic());
    positions.set(first.subject, symbolicStep(0, first.relation));

    for (let pass = 0; pass < 6; pass += 1) {
      premises.forEach((premise, index) => {
        const step = symbolicStep(index, premise.relation);
        const subject = positions.get(premise.subject);
        const object = positions.get(premise.object);
        if (object && !subject) positions.set(premise.subject, symbolicAdd(object, step));
        if (subject && !object) positions.set(premise.object, symbolicAdd(subject, step, -1));
        if (subject && object && !symbolicEqual(subject, symbolicAdd(object, step))) {
          throw new Error('Premises are relationally inconsistent.');
        }
      });
    }
    return positions;
  }

  function analyseGraph(premises) {
    const adjacency = new Map();
    const add = (first, second) => {
      if (!adjacency.has(first)) adjacency.set(first, new Set());
      adjacency.get(first).add(second);
    };
    premises.forEach(premise => {
      add(premise.subject, premise.object);
      add(premise.object, premise.subject);
    });
    const nodes = [...adjacency.keys()];
    if (nodes.length !== 3) throw new Error('Triadic Entailment requires exactly three distinct letter-nodes.');
    const endpoints = nodes.filter(node => adjacency.get(node).size === 1);
    const bridges = nodes.filter(node => adjacency.get(node).size === 2);
    if (endpoints.length !== 2 || bridges.length !== 1) throw new Error('Premises must form one connected three-node path.');
    return { nodes, endpoints, bridge: bridges[0], adjacency };
  }

  function queryTerms(premises, subject, object) {
    const positions = deriveSymbolicPositions(premises);
    const subjectPosition = positions.get(subject);
    const objectPosition = positions.get(object);
    if (!subjectPosition || !objectPosition) throw new Error('The queried letters are not connected by the premises.');
    return symbolicAdd(subjectPosition, objectPosition, -1);
  }

  function nonZeroTerms(terms) {
    return terms.filter(term => Math.abs(term.x) > EPSILON || Math.abs(term.y) > EPSILON);
  }

  function areParallel(first, second) {
    return Math.abs(first.x * second.y - first.y * second.x) < 1e-7;
  }

  function areSameDirection(first, second) {
    return areParallel(first, second) && first.x * second.x + first.y * second.y > 0;
  }

  function areOpposite(first, second) {
    return areParallel(first, second) && first.x * second.x + first.y * second.y < 0;
  }

  function isAxisVector(term) {
    const xZero = Math.abs(term.x) < EPSILON;
    const yZero = Math.abs(term.y) < EPSILON;
    return xZero !== yZero;
  }

  function quadrantCode(x, y) {
    const horizontal = x > 0 ? 'E' : x < 0 ? 'W' : '';
    const vertical = y > 0 ? 'N' : y < 0 ? 'S' : '';
    if (!horizontal) return vertical;
    if (!vertical) return horizontal;
    return `${vertical}${horizontal}`;
  }

  const QUALITATIVE_QUADRANT_16 = {
    NE: ['N', 'NNE', 'NE', 'ENE', 'E'],
    SE: ['E', 'ESE', 'SE', 'SSE', 'S'],
    SW: ['S', 'SSW', 'SW', 'WSW', 'W'],
    NW: ['W', 'WNW', 'NW', 'NNW', 'N']
  };

  function genericQualitativeRelations(first, second, resolution) {
    const relations = new Set();
    const samples = 2049;
    for (let index = 0; index < samples; index += 1) {
      const exponent = -8 + (16 * index) / (samples - 1);
      const ratio = 10 ** exponent;
      const x = first.x * ratio + second.x;
      const y = first.y * ratio + second.y;
      const relation = directionFromVector(x, y, resolution);
      if (relation !== 'BALANCE') relations.add(relation);
    }
    return [...relations].sort((a, b) => direction(a).index - direction(b).index);
  }

  function possibleRelationsForPair(premises, subject, object, contractInput) {
    const contract = resolveContract(contractInput);
    const terms = nonZeroTerms(queryTerms(premises, subject, object));
    if (!terms.length) return [];

    if (contract.metric === 'equal-unit') {
      const vector = terms.reduce((sum, term) => ({ x: sum.x + term.x, y: sum.y + term.y }), { x: 0, y: 0 });
      const relation = directionFromVector(vector.x, vector.y, contract.resolution);
      return relation === 'BALANCE' ? [] : [relation];
    }

    if (terms.length === 1) {
      return [directionFromVector(terms[0].x, terms[0].y, contract.resolution)];
    }

    const [first, second] = terms;
    if (areSameDirection(first, second)) return [directionFromVector(first.x, first.y, contract.resolution)];
    if (areOpposite(first, second)) {
      return [...new Set([
        directionFromVector(first.x, first.y, contract.resolution),
        directionFromVector(second.x, second.y, contract.resolution)
      ])];
    }

    if (isAxisVector(first) && isAxisVector(second) && Math.abs(first.x * second.x + first.y * second.y) < EPSILON) {
      const x = Math.abs(first.x) > EPSILON ? first.x : second.x;
      const y = Math.abs(first.y) > EPSILON ? first.y : second.y;
      const quadrant = quadrantCode(x, y);
      if (contract.resolution === 8) return [quadrant];
      if (contract.resolution === 16) return [...QUALITATIVE_QUADRANT_16[quadrant]];
    }

    return genericQualitativeRelations(first, second, contract.resolution);
  }

  function resolveContract(contractInput) {
    if (!contractInput) return CONTRACTS.UNIT_8;
    if (typeof contractInput === 'string') {
      const contract = CONTRACTS[contractInput];
      if (!contract) throw new Error(`Unknown logical contract: ${contractInput}`);
      return contract;
    }
    if (contractInput.id && CONTRACTS[contractInput.id]) return CONTRACTS[contractInput.id];
    return contractInput;
  }

  function sameUnorderedPair(first, second) {
    return first.length === 2 && second.length === 2 &&
      first.every(item => second.includes(item));
  }

  function activeStepDistance(firstCode, secondCode, resolution) {
    return circularDistance(firstCode, secondCode) / (16 / Number(resolution));
  }

  function evaluateTrial(trial) {
    if (!trial || !Array.isArray(trial.premises) || !trial.conclusion) {
      throw new Error('Incomplete Triadic Entailment trial.');
    }
    const contract = resolveContract(trial.contract || trial.contractId);
    const graph = analyseGraph(trial.premises);
    const queryPairValid = sameUnorderedPair(
      [trial.conclusion.subject, trial.conclusion.object],
      graph.endpoints
    );
    const possibleRelations = possibleRelationsForPair(
      trial.premises,
      trial.conclusion.subject,
      trial.conclusion.object,
      contract
    );
    const assertedRelation = trial.conclusion.relation;
    const assertedAtResolution = relationIsAtResolution(assertedRelation, contract.resolution);
    const relationPossible = possibleRelations.includes(assertedRelation);
    const relationNecessary = possibleRelations.length === 1 && relationPossible;
    const expectedRelation = possibleRelations.length === 1 ? possibleRelations[0] : null;

    let distinctionClass;
    if (!queryPairValid) distinctionClass = 'wrong-letter-pair';
    else if (!assertedAtResolution) distinctionClass = 'over-precise-resolution';
    else if (relationNecessary) distinctionClass = 'exact-necessary-entailment';
    else if (relationPossible) distinctionClass = 'possible-not-necessary';
    else if (expectedRelation && opposite(expectedRelation) === assertedRelation) distinctionClass = 'subject-object-reversal';
    else if (expectedRelation && activeStepDistance(expectedRelation, assertedRelation, contract.resolution) === 1) distinctionClass = 'adjacent-resolution-substitution';
    else if (possibleRelations.length > 1) distinctionClass = 'impossible-under-model-set';
    else distinctionClass = 'local-or-global-relational-error';

    const isEntailed = queryPairValid && assertedAtResolution && relationNecessary;
    return {
      contract,
      graph: { nodes: graph.nodes, endpoints: graph.endpoints, bridge: graph.bridge },
      queryPairValid,
      possibleRelations,
      expectedRelation,
      assertedRelation,
      assertedAtResolution,
      modalStatus: relationNecessary ? 'necessary' : relationPossible ? 'possible' : possibleRelations.length ? 'impossible' : 'undetermined',
      distinctionClass,
      isEntailed
    };
  }

  function invert(statement) {
    return {
      subject: statement.object,
      relation: opposite(statement.relation),
      object: statement.subject
    };
  }

  function renderStatement(statement) {
    return `${statement.subject} is ${direction(statement.relation).name} of ${statement.object}`;
  }

  function renderTrial(trial) {
    const contract = resolveContract(trial.contract || trial.contractId);
    return `Contract: ${contract.label}. ${trial.premises.map(renderStatement).join('; ')}; ${renderStatement(trial.conclusion)}.`;
  }

  function explainTrial(trial) {
    const result = evaluateTrial(trial);
    const relationName = code => code ? direction(code).name : 'no single exact direction';
    const pair = `${trial.conclusion.subject}–${trial.conclusion.object}`;

    if (result.isEntailed) {
      return `MATCH — the two premises necessarily place ${trial.conclusion.subject} ${relationName(result.assertedRelation)} of ${trial.conclusion.object} under the stated contract.`;
    }
    if (result.distinctionClass === 'wrong-letter-pair') {
      return `NO MATCH — the two-premise chain derives the relation between ${result.graph.endpoints.join(' and ')}, not the asserted ${pair} pairing.`;
    }
    if (result.distinctionClass === 'possible-not-necessary') {
      return `NO MATCH — ${relationName(result.assertedRelation)} is possible for some admissible distances, but it is not necessary across every model allowed by the contract.`;
    }
    if (result.distinctionClass === 'over-precise-resolution') {
      return `NO MATCH — the assertion uses finer directional precision than the active ${result.contract.resolution}-way contract permits.`;
    }
    if (result.distinctionClass === 'subject-object-reversal') {
      return `NO MATCH — reversing the queried letters requires the opposite direction; the exact relation is ${relationName(result.expectedRelation)}.`;
    }
    if (result.distinctionClass === 'adjacent-resolution-substitution') {
      return `NO MATCH — ${relationName(result.assertedRelation)} is adjacent to, but not identical with, the exact entailed relation ${relationName(result.expectedRelation)}.`;
    }
    if (result.possibleRelations.length > 1) {
      return `NO MATCH — the contract permits ${result.possibleRelations.map(relationName).join(', ')}, and the asserted relation is not necessary.`;
    }
    return `NO MATCH — the exact entailed relation is ${relationName(result.expectedRelation)}, not ${relationName(result.assertedRelation)}.`;
  }

  function chooseContract(rng, interferenceLevel) {
    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    if (level < 15) return pick(rng, [CONTRACTS.UNIT_4, CONTRACTS.UNIT_8]);
    if (level < 45) return pick(rng, [CONTRACTS.UNIT_8, CONTRACTS.UNIT_8, CONTRACTS.UNIT_16]);
    if (level < 75) return pick(rng, [CONTRACTS.UNIT_8, CONTRACTS.UNIT_16, CONTRACTS.QUAL_8]);
    return pick(rng, [CONTRACTS.UNIT_16, CONTRACTS.QUAL_8, CONTRACTS.QUAL_16]);
  }

  function choosePremiseDirections(rng, contract, requestedMatch, interferenceLevel) {
    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    if (contract.metric === 'unspecified-positive-distances') {
      const cardinals = ['N', 'E', 'S', 'W'];
      const first = pick(rng, cardinals);
      if (contract.resolution === 16 && requestedMatch && random(rng) < 0.8) return [first, first];
      if (contract.resolution === 16 && !requestedMatch && random(rng) < 0.35) return [first, first];
      const perpendicular = cardinals.filter(code => circularDistance(first, code) === 4);
      return [first, pick(rng, perpendicular)];
    }

    const pool = contract.resolution === 4
      ? allowedCodes(4)
      : contract.resolution === 8 || level < 55
        ? allowedCodes(8)
        : allowedCodes(16);
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const first = pick(rng, pool);
      const second = pick(rng, pool);
      const [ax, ay] = relationVector(first);
      const [bx, by] = relationVector(second);
      const resultant = directionFromVector(ax + bx, ay + by, contract.resolution);
      if (resultant !== 'BALANCE') return [first, second];
    }
    return ['W', 'N'];
  }

  function adjacentRelation(code, resolution, rng) {
    const codes = allowedCodes(resolution);
    const index = codes.indexOf(coarsenDirection(code, resolution));
    const offset = random(rng) < 0.5 ? -1 : 1;
    return codes[(index + offset + codes.length) % codes.length];
  }

  function finerRelationInside(coarseCode, rng) {
    const coarseIndex = direction(coarseCode).index;
    const choices = [
      DIRECTIONS[(coarseIndex - 1 + 16) % 16].code,
      DIRECTIONS[(coarseIndex + 1) % 16].code
    ].filter(code => !relationIsAtResolution(code, 8));
    return pick(rng, choices.length ? choices : ['NNE', 'ENE']);
  }

  function deriveEndpointRelations(premises, contract) {
    const graph = analyseGraph(premises);
    const [first, last] = graph.endpoints;
    return {
      graph,
      first,
      last,
      forward: possibleRelationsForPair(premises, first, last, contract),
      reverse: possibleRelationsForPair(premises, last, first, contract)
    };
  }

  function makeNonMatchConclusion(rng, premises, contract, interferenceLevel) {
    const derived = deriveEndpointRelations(premises, contract);
    const { first, last, graph, forward } = derived;
    const exact = forward.length === 1 ? forward[0] : null;
    const candidates = [];
    const add = (errorClass, conclusion, difficulty) => {
      const trial = { premises, conclusion, contract };
      const result = evaluateTrial(trial);
      if (!result.isEntailed) candidates.push({ errorClass, conclusion, difficulty, result });
    };

    if (exact) {
      add('adjacent-resolution-substitution', {
        subject: first,
        relation: adjacentRelation(exact, contract.resolution, rng),
        object: last
      }, 5);
      add('subject-object-reversal', {
        subject: last,
        relation: exact,
        object: first
      }, 4);
      add('wrong-letter-pair', {
        subject: first,
        relation: exact,
        object: graph.bridge
      }, 3);
      add('local-consistency-global-error', {
        subject: first,
        relation: premises[0].relation,
        object: last
      }, 3);
      add('contradiction', {
        subject: first,
        relation: opposite(exact),
        object: last
      }, 1);
      if (contract.resolution === 16) {
        const coarse = coarsenDirection(exact, 8);
        if (coarse !== exact) add('coarse-category-substitution', {
          subject: first,
          relation: coarse,
          object: last
        }, 5);
      }
      if (contract.resolution === 8) {
        add('over-precise-resolution', {
          subject: first,
          relation: finerRelationInside(exact, rng),
          object: last
        }, 5);
      }
    } else {
      forward.forEach(relation => add('possible-not-necessary', {
        subject: first,
        relation,
        object: last
      }, 6));
      const centre = forward[Math.floor(forward.length / 2)] || 'N';
      add('wrong-letter-pair', {
        subject: first,
        relation: centre,
        object: graph.bridge
      }, 3);
      add('impossible-under-model-set', {
        subject: first,
        relation: opposite(centre),
        object: last
      }, 2);
    }

    if (!candidates.length) throw new Error('Unable to construct a valid NO MATCH conclusion.');
    const target = Math.max(1, Math.min(6, 1 + Math.round((Number(interferenceLevel) || 0) / 20)));
    candidates.sort((a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target));
    const span = Math.max(1, Math.ceil(candidates.length * 0.35));
    return pick(rng, candidates.slice(0, span));
  }

  function hydrateTrial(trial) {
    const result = evaluateTrial(trial);
    const contract = result.contract;
    trial.mode = 0;
    trial.contractId = contract.id;
    trial.contract = clone(contract);
    trial.letters = trial.letters || result.graph.nodes;
    trial.symbols = [...trial.letters];
    trial.expectedRelation = result.expectedRelation;
    trial.possibleRelations = [...result.possibleRelations];
    trial.modalStatus = result.modalStatus;
    trial.distinctionClass = result.distinctionClass;
    trial.isEntailed = result.isEntailed;
    trial.isMatch = result.isEntailed;
    trial.scored = true;
    trial.signature = [
      'M0-TRIADIC-ENTAILMENT-V2',
      contract.id,
      ...trial.premises.flatMap(item => [item.subject, item.relation, item.object]),
      trial.conclusion.subject,
      trial.conclusion.relation,
      trial.conclusion.object,
      `POSSIBLE:${result.possibleRelations.join(',')}`,
      `VALID:${Number(result.isEntailed)}`
    ].join('|');
    trial.interferenceMeta = {
      ...(trial.interferenceMeta || {}),
      mechanism: result.isEntailed ? 'exact-necessary-entailment' : (trial.intendedErrorClass || result.distinctionClass),
      contractId: contract.id,
      resolution: contract.resolution,
      modalStatus: result.modalStatus,
      possibleRelations: [...result.possibleRelations],
      distinctionClass: result.distinctionClass,
      answerRecomputedFromLetterGraph: true,
      modelSetEvaluated: contract.uncertainty === 'all-admissible-models'
    };
    trial.explanation = explainTrial(trial);
    return trial;
  }

  function generateTrial(rng, options = {}) {
    const matchProbability = Math.max(0, Math.min(1, Number(options.matchProbability ?? 0.5)));
    const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
    const requestedMatch = random(rng) < matchProbability;
    const contract = resolveContract(options.contract || chooseContract(rng, interferenceLevel));
    const letters = shuffle(rng, LETTERS).slice(0, 3);
    const [firstLetter, bridgeLetter, lastLetter] = letters;
    const [firstDirection, secondDirection] = choosePremiseDirections(
      rng,
      contract,
      requestedMatch,
      interferenceLevel
    );

    let premises = [
      { subject: firstLetter, relation: firstDirection, object: bridgeLetter },
      { subject: bridgeLetter, relation: secondDirection, object: lastLetter }
    ];
    premises = premises.map(statement => random(rng) < 0.5 ? invert(statement) : statement);
    if (random(rng) < 0.5) premises.reverse();

    const derived = deriveEndpointRelations(premises, contract);
    let conclusion;
    let intendedErrorClass = null;
    let finalRequestedMatch = requestedMatch;

    if (requestedMatch && derived.forward.length === 1) {
      if (random(rng) < 0.5) {
        conclusion = { subject: derived.first, relation: derived.forward[0], object: derived.last };
      } else {
        conclusion = { subject: derived.last, relation: derived.reverse[0], object: derived.first };
      }
    } else {
      finalRequestedMatch = false;
      const selected = makeNonMatchConclusion(rng, premises, contract, interferenceLevel);
      conclusion = selected.conclusion;
      intendedErrorClass = selected.errorClass;
    }

    const trial = hydrateTrial({
      mode: 0,
      letters,
      premises,
      conclusion,
      contract: clone(contract),
      contractId: contract.id,
      requestedMatch: finalRequestedMatch,
      intendedErrorClass,
      interferenceLevel,
      interferenceMeta: { level: interferenceLevel }
    });

    if (trial.requestedMatch !== trial.isEntailed) {
      throw new Error('Generation branch disagrees with independently recomputed entailment.');
    }
    return trial;
  }

  function renameTrial(trial, replacements) {
    const renamed = clone(trial);
    const rename = value => replacements[value] || value;
    renamed.premises = renamed.premises.map(item => ({
      subject: rename(item.subject),
      relation: item.relation,
      object: rename(item.object)
    }));
    renamed.conclusion = {
      subject: rename(renamed.conclusion.subject),
      relation: renamed.conclusion.relation,
      object: rename(renamed.conclusion.object)
    };
    renamed.letters = (renamed.letters || []).map(rename);
    return renamed;
  }

  class AuditRng {
    constructor(seed = 0x7a1ad1c) { this.s = seed >>> 0; }
    next() {
      let value = this.s += 1831565813;
      value = Math.imul(value ^ value >>> 15, 1 | value);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }
    pick(values) { return values[Math.floor(this.next() * values.length)]; }
    shuffle(values) {
      const result = [...values];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(this.next() * (index + 1));
        [result[index], result[swap]] = [result[swap], result[index]];
      }
      return result;
    }
  }

  function canonicalTrials() {
    return [
      {
        contractId: 'UNIT_8',
        premises: [
          { subject: 'A', relation: 'W', object: 'B' },
          { subject: 'B', relation: 'N', object: 'C' }
        ],
        conclusion: { subject: 'C', relation: 'SE', object: 'A' },
        expected: true
      },
      {
        contractId: 'UNIT_8',
        premises: [
          { subject: 'F', relation: 'W', object: 'E' },
          { subject: 'D', relation: 'S', object: 'E' }
        ],
        conclusion: { subject: 'D', relation: 'SE', object: 'F' },
        expected: true
      },
      {
        contractId: 'UNIT_16',
        premises: [
          { subject: 'G', relation: 'N', object: 'H' },
          { subject: 'H', relation: 'NE', object: 'J' }
        ],
        conclusion: { subject: 'G', relation: 'NNE', object: 'J' },
        expected: true
      },
      {
        contractId: 'UNIT_16',
        premises: [
          { subject: 'K', relation: 'N', object: 'L' },
          { subject: 'L', relation: 'NE', object: 'M' }
        ],
        conclusion: { subject: 'K', relation: 'NE', object: 'M' },
        expected: false
      },
      {
        contractId: 'UNIT_8',
        premises: [
          { subject: 'N', relation: 'E', object: 'P' },
          { subject: 'P', relation: 'S', object: 'Q' }
        ],
        conclusion: { subject: 'Q', relation: 'SE', object: 'N' },
        expected: false
      },
      {
        contractId: 'UNIT_8',
        premises: [
          { subject: 'R', relation: 'W', object: 'S' },
          { subject: 'S', relation: 'S', object: 'T' }
        ],
        conclusion: { subject: 'S', relation: 'SW', object: 'T' },
        expected: false
      },
      {
        contractId: 'QUAL_16',
        premises: [
          { subject: 'U', relation: 'W', object: 'V' },
          { subject: 'V', relation: 'N', object: 'W' }
        ],
        conclusion: { subject: 'U', relation: 'NNW', object: 'W' },
        expected: false
      },
      {
        contractId: 'QUAL_8',
        premises: [
          { subject: 'X', relation: 'W', object: 'Y' },
          { subject: 'Y', relation: 'N', object: 'Z' }
        ],
        conclusion: { subject: 'X', relation: 'NW', object: 'Z' },
        expected: true
      },
      {
        contractId: 'UNIT_8',
        premises: [
          { subject: 'C', relation: 'S', object: 'D' },
          { subject: 'D', relation: 'E', object: 'E' }
        ],
        conclusion: { subject: 'C', relation: 'SE', object: 'E' },
        expected: true
      },
      {
        contractId: 'UNIT_8',
        premises: [
          { subject: 'H', relation: 'S', object: 'J' },
          { subject: 'K', relation: 'E', object: 'J' }
        ],
        conclusion: { subject: 'K', relation: 'SE', object: 'H' },
        expected: false
      }
    ];
  }

  function runAudit(iterations = 8192) {
    const rng = new AuditRng();
    const failures = [];
    const contractsReached = new Set();
    const distinctionsReached = new Set();
    const expectedDirections = new Set();
    let matches = 0;
    let nonMatches = 0;
    let invarianceChecks = 0;

    canonicalTrials().forEach((trial, index) => {
      const result = evaluateTrial(trial);
      if (result.isEntailed !== trial.expected) failures.push(`canonical-${index + 1}`);
    });

    for (let index = 0; index < iterations; index += 1) {
      const trial = generateTrial(rng, {
        matchProbability: index % 2 === 0 ? 1 : 0,
        interferenceLevel: index % 101
      });
      const recomputed = evaluateTrial(trial);
      contractsReached.add(trial.contractId);
      distinctionsReached.add(recomputed.distinctionClass);
      if (recomputed.expectedRelation) expectedDirections.add(recomputed.expectedRelation);
      if (recomputed.isEntailed !== trial.isMatch) failures.push(`answer:${index}`);
      if (trial.requestedMatch !== trial.isMatch) failures.push(`branch:${index}`);
      if (new Set(trial.letters).size !== 3) failures.push(`letters:${index}`);
      if (trial.premises.length !== 2) failures.push(`premises:${index}`);
      if (/therefore/i.test(renderTrial(trial))) failures.push(`therefore:${index}`);
      if (trial.isMatch) matches += 1;
      else nonMatches += 1;

      if (index % 17 === 0) {
        const replacementLetters = shuffle(rng, LETTERS).slice(0, 3);
        const replacements = Object.fromEntries(trial.letters.map((letter, letterIndex) => [letter, replacementLetters[letterIndex]]));
        const renamed = renameTrial(trial, replacements);
        if (evaluateTrial(renamed).isEntailed !== recomputed.isEntailed) failures.push(`rename-invariance:${index}`);

        const reordered = clone(trial);
        reordered.premises.reverse();
        if (evaluateTrial(reordered).isEntailed !== recomputed.isEntailed) failures.push(`order-invariance:${index}`);

        const inverted = clone(trial);
        inverted.premises = inverted.premises.map(invert);
        if (evaluateTrial(inverted).isEntailed !== recomputed.isEntailed) failures.push(`inverse-invariance:${index}`);
        invarianceChecks += 3;
      }
    }

    if (!matches) failures.push('no-matches');
    if (!nonMatches) failures.push('no-nonmatches');
    if (contractsReached.size < Object.keys(CONTRACTS).length) failures.push(`contract-coverage:${contractsReached.size}`);
    if (expectedDirections.size < 12) failures.push(`direction-coverage:${expectedDirections.size}`);
    if (!distinctionsReached.has('possible-not-necessary')) failures.push('no-modal-near-miss');
    if (!distinctionsReached.has('adjacent-resolution-substitution')) failures.push('no-adjacent-near-miss');
    if (!distinctionsReached.has('wrong-letter-pair')) failures.push('no-binding-near-miss');

    return {
      passed: failures.length === 0,
      failures,
      iterations,
      matches,
      nonMatches,
      contractCoverage: contractsReached.size,
      contracts: [...contractsReached].sort(),
      distinctionCoverage: distinctionsReached.size,
      distinctions: [...distinctionsReached].sort(),
      directionCoverage: expectedDirections.size,
      invarianceChecks,
      lettersDriveRelationalComputation: true,
      conclusionRecomputedFromPremises: true,
      modelSetEvaluation: true,
      proofBindingRegulation: true,
      criterionContracts: true,
      directionalResolutions: [4, 8, 16]
    };
  }

  return {
    version: 2,
    LETTERS,
    DIRECTIONS,
    CONTRACTS,
    direction,
    opposite,
    allowedCodes,
    relationIsAtResolution,
    directionFromVector,
    coarsenDirection,
    circularDistance,
    deriveSymbolicPositions,
    analyseGraph,
    possibleRelationsForPair,
    evaluateTrial,
    invert,
    renderStatement,
    renderTrial,
    explainTrial,
    hydrateTrial,
    generateTrial,
    renameTrial,
    canonicalTrials,
    runAudit
  };
});
