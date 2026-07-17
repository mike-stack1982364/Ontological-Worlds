'use strict';

(function exposeTriadicEntailmentCore(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.__modeOneTriadicEntailmentCore = api;
    root.__modeOneSpatialCore = api;
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
  const clone = value => JSON.parse(JSON.stringify(value));

  function random(rng) {
    return rng && typeof rng.next === 'function' ? rng.next() : Math.random();
  }

  function pick(rng, values) {
    if (!values.length) throw new Error('Cannot choose from an empty collection.');
    if (rng && typeof rng.pick === 'function') return rng.pick(values);
    return values[Math.floor(random(rng) * values.length)];
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

  function directionFromVector(x, y) {
    if (Math.abs(x) < EPSILON && Math.abs(y) < EPSILON) return 'BALANCE';
    const clockwiseFromNorth = (Math.atan2(x, y) + TWO_PI) % TWO_PI;
    return DIRECTIONS[Math.round(clockwiseFromNorth / (TWO_PI / 16)) % 16].code;
  }

  function circularDistance(firstCode, secondCode) {
    const raw = Math.abs(direction(firstCode).index - direction(secondCode).index);
    return Math.min(raw, 16 - raw);
  }

  function relationVector(code) {
    const value = direction(code);
    return [value.x, value.y];
  }

  function allowedCodes(resolution) {
    const numeric = Number(resolution);
    if (![4, 8, 16].includes(numeric)) throw new Error(`Unsupported direction pool: ${resolution}`);
    const step = 16 / numeric;
    return DIRECTIONS.filter((_, index) => index % step === 0).map(item => item.code);
  }

  function derivePositions(premises) {
    if (!Array.isArray(premises) || premises.length !== 2) {
      throw new Error('Triadic Entailment requires exactly two relational premises.');
    }

    const positions = new Map();
    const first = premises[0];
    const [firstX, firstY] = relationVector(first.relation);
    positions.set(first.object, [0, 0]);
    positions.set(first.subject, [firstX, firstY]);

    for (let pass = 0; pass < 6; pass += 1) {
      premises.forEach(premise => {
        const [dx, dy] = relationVector(premise.relation);
        const subject = positions.get(premise.subject);
        const object = positions.get(premise.object);
        if (object && !subject) positions.set(premise.subject, [object[0] + dx, object[1] + dy]);
        if (subject && !object) positions.set(premise.object, [subject[0] - dx, subject[1] - dy]);
        if (subject && object) {
          const expectedX = object[0] + dx;
          const expectedY = object[1] + dy;
          if (Math.abs(subject[0] - expectedX) > 1e-6 || Math.abs(subject[1] - expectedY) > 1e-6) {
            throw new Error('Premises are relationally inconsistent.');
          }
        }
      });
    }
    return positions;
  }

  function analyseGraph(premises) {
    const adjacency = new Map();
    const connect = (first, second) => {
      if (!adjacency.has(first)) adjacency.set(first, new Set());
      adjacency.get(first).add(second);
    };

    premises.forEach(premise => {
      connect(premise.subject, premise.object);
      connect(premise.object, premise.subject);
    });

    const nodes = [...adjacency.keys()];
    if (nodes.length !== 3) throw new Error('Triadic Entailment requires exactly three distinct letters.');
    const endpoints = nodes.filter(node => adjacency.get(node).size === 1);
    const bridges = nodes.filter(node => adjacency.get(node).size === 2);
    if (endpoints.length !== 2 || bridges.length !== 1) {
      throw new Error('The first two statements must form one connected three-letter relation.');
    }
    return { nodes, endpoints, bridge: bridges[0] };
  }

  function sameUnorderedPair(first, second) {
    return first.length === 2 && second.length === 2 && first.every(item => second.includes(item));
  }

  function entailedDirection(premises, subject, object) {
    const positions = derivePositions(premises);
    const subjectPosition = positions.get(subject);
    const objectPosition = positions.get(object);
    if (!subjectPosition || !objectPosition) throw new Error('The queried letters are not connected by the premises.');
    const relation = directionFromVector(
      subjectPosition[0] - objectPosition[0],
      subjectPosition[1] - objectPosition[1]
    );
    if (relation === 'BALANCE') throw new Error('The queried letters collapse to the same position.');
    return relation;
  }

  function coarseNeighbours(code) {
    const index = direction(code).index;
    if (index % 2 === 0) return [];
    return [
      DIRECTIONS[(index - 1 + 16) % 16].code,
      DIRECTIONS[(index + 1) % 16].code
    ];
  }

  function evaluateTrial(trial) {
    if (!trial || !Array.isArray(trial.premises) || !trial.conclusion) {
      throw new Error('Incomplete Triadic Entailment trial.');
    }

    const graph = analyseGraph(trial.premises);
    const queryPairValid = sameUnorderedPair(
      [trial.conclusion.subject, trial.conclusion.object],
      graph.endpoints
    );
    const expectedRelation = entailedDirection(
      trial.premises,
      trial.conclusion.subject,
      trial.conclusion.object
    );
    const assertedRelation = trial.conclusion.relation;
    const isEntailed = queryPairValid && expectedRelation === assertedRelation;

    let distinctionClass;
    if (!queryPairValid) distinctionClass = 'wrong-letter-pair';
    else if (isEntailed) distinctionClass = 'exact-relational-entailment';
    else if (opposite(expectedRelation) === assertedRelation) distinctionClass = 'subject-object-reversal';
    else if (circularDistance(expectedRelation, assertedRelation) === 1) distinctionClass = 'adjacent-resolution-substitution';
    else if (coarseNeighbours(expectedRelation).includes(assertedRelation)) distinctionClass = 'coarse-category-substitution';
    else distinctionClass = 'local-or-global-relational-error';

    return {
      graph,
      queryPairValid,
      expectedRelation,
      assertedRelation,
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
    return `${trial.premises.map(renderStatement).join('; ')}; ${renderStatement(trial.conclusion)}.`;
  }

  function explainTrial(trial) {
    const result = evaluateTrial(trial);
    const asserted = direction(result.assertedRelation).name;
    const expected = direction(result.expectedRelation).name;

    if (result.isEntailed) {
      return `MATCH — the first two relations place ${trial.conclusion.subject} exactly ${asserted} of ${trial.conclusion.object}.`;
    }
    if (result.distinctionClass === 'wrong-letter-pair') {
      return `NO MATCH — the composed relation belongs between ${result.graph.endpoints.join(' and ')}, not the tested letter pair.`;
    }
    if (result.distinctionClass === 'subject-object-reversal') {
      return `NO MATCH — the tested letters require ${expected}; ${asserted} is the reversed direction.`;
    }
    if (result.distinctionClass === 'adjacent-resolution-substitution') {
      return `NO MATCH — ${asserted} is adjacent to the exact relation ${expected}, but it is not identical.`;
    }
    if (result.distinctionClass === 'coarse-category-substitution') {
      return `NO MATCH — ${asserted} is a coarser neighbouring direction; the exact relation is ${expected}.`;
    }
    return `NO MATCH — the first two relations place ${trial.conclusion.subject} ${expected} of ${trial.conclusion.object}, not ${asserted}.`;
  }

  function choosePremiseDirections(rng, interferenceLevel) {
    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    const pool = level < 25 ? allowedCodes(4) : level < 70 ? allowedCodes(8) : allowedCodes(16);

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const first = pick(rng, pool);
      const second = pick(rng, pool);
      const [firstX, firstY] = relationVector(first);
      const [secondX, secondY] = relationVector(second);
      const result = directionFromVector(firstX + secondX, firstY + secondY);
      if (result !== 'BALANCE') return [first, second];
    }
    return ['W', 'N'];
  }

  function adjacentRelation(code, rng) {
    const index = direction(code).index;
    const offset = random(rng) < 0.5 ? -1 : 1;
    return DIRECTIONS[(index + offset + 16) % 16].code;
  }

  function deriveEndpointRelations(premises) {
    const graph = analyseGraph(premises);
    const [first, last] = graph.endpoints;
    return {
      graph,
      first,
      last,
      forward: entailedDirection(premises, first, last),
      reverse: entailedDirection(premises, last, first)
    };
  }

  function makeNonMatchConclusion(rng, premises, interferenceLevel) {
    const derived = deriveEndpointRelations(premises);
    const { graph, first, last, forward } = derived;
    const candidates = [];
    const add = (errorClass, conclusion, difficulty) => {
      const result = evaluateTrial({ premises, conclusion });
      if (!result.isEntailed) candidates.push({ errorClass, conclusion, difficulty, result });
    };

    add('adjacent-resolution-substitution', {
      subject: first,
      relation: adjacentRelation(forward, rng),
      object: last
    }, 6);

    add('subject-object-reversal', {
      subject: last,
      relation: forward,
      object: first
    }, 5);

    const wrongPairRelation = entailedDirection(premises, first, graph.bridge);
    if (wrongPairRelation !== forward) {
      add('wrong-letter-pair', {
        subject: first,
        relation: forward,
        object: graph.bridge
      }, 5);
    }

    coarseNeighbours(forward).forEach(relation => {
      add('coarse-category-substitution', {
        subject: first,
        relation,
        object: last
      }, 6);
    });

    premises.forEach(premise => {
      add('local-consistency-global-error', {
        subject: first,
        relation: premise.relation,
        object: last
      }, 3);
    });

    add('contradiction', {
      subject: first,
      relation: opposite(forward),
      object: last
    }, 1);

    if (!candidates.length) throw new Error('Unable to construct a valid NO MATCH conclusion.');
    const target = Math.max(1, Math.min(6, 1 + Math.round((Number(interferenceLevel) || 0) / 20)));
    candidates.sort((a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target));
    return pick(rng, candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.4))));
  }

  function hydrateTrial(trial) {
    const result = evaluateTrial(trial);
    trial.mode = 0;
    trial.letters = trial.letters || result.graph.nodes;
    trial.symbols = [...trial.letters];
    trial.expectedRelation = result.expectedRelation;
    trial.distinctionClass = result.distinctionClass;
    trial.isEntailed = result.isEntailed;
    trial.isMatch = result.isEntailed;
    trial.scored = true;
    trial.signature = [
      'M0-TRIADIC-ENTAILMENT-V3',
      ...trial.premises.flatMap(item => [item.subject, item.relation, item.object]),
      trial.conclusion.subject,
      trial.conclusion.relation,
      trial.conclusion.object,
      `EXPECTED:${result.expectedRelation}`,
      `VALID:${Number(result.isEntailed)}`
    ].join('|');
    trial.interferenceMeta = {
      ...(trial.interferenceMeta || {}),
      mechanism: result.isEntailed ? 'exact-relational-entailment' : (trial.intendedErrorClass || result.distinctionClass),
      expectedRelation: result.expectedRelation,
      assertedRelation: result.assertedRelation,
      distinctionClass: result.distinctionClass,
      answerRecomputedFromLetterGraph: true,
      letteringIdentityIgnored: true
    };
    trial.explanation = explainTrial(trial);
    return trial;
  }

  function generateTrial(rng, options = {}) {
    const matchProbability = Math.max(0, Math.min(1, Number(options.matchProbability ?? 0.5)));
    const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
    const requestedMatch = random(rng) < matchProbability;
    const letters = shuffle(rng, LETTERS).slice(0, 3);
    const [firstLetter, bridgeLetter, lastLetter] = letters;
    const [firstDirection, secondDirection] = choosePremiseDirections(rng, interferenceLevel);

    let premises = [
      { subject: firstLetter, relation: firstDirection, object: bridgeLetter },
      { subject: bridgeLetter, relation: secondDirection, object: lastLetter }
    ];
    premises = premises.map(statement => random(rng) < 0.5 ? invert(statement) : statement);
    if (random(rng) < 0.5) premises.reverse();

    const derived = deriveEndpointRelations(premises);
    let conclusion;
    let intendedErrorClass = null;

    if (requestedMatch) {
      if (random(rng) < 0.5) {
        conclusion = { subject: derived.first, relation: derived.forward, object: derived.last };
      } else {
        conclusion = { subject: derived.last, relation: derived.reverse, object: derived.first };
      }
    } else {
      const selected = makeNonMatchConclusion(rng, premises, interferenceLevel);
      conclusion = selected.conclusion;
      intendedErrorClass = selected.errorClass;
    }

    const trial = hydrateTrial({
      mode: 0,
      letters,
      premises,
      conclusion,
      requestedMatch,
      intendedErrorClass,
      interferenceLevel,
      interferenceMeta: { level: interferenceLevel }
    });

    if (trial.requestedMatch !== trial.isEntailed) {
      throw new Error('Generation branch disagrees with independently recomputed relational entailment.');
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

  function canonicalTrials() {
    return [
      {
        premises: [
          { subject: 'A', relation: 'W', object: 'B' },
          { subject: 'B', relation: 'N', object: 'C' }
        ],
        conclusion: { subject: 'C', relation: 'SE', object: 'A' },
        expected: true
      },
      {
        premises: [
          { subject: 'D', relation: 'N', object: 'E' },
          { subject: 'E', relation: 'E', object: 'F' }
        ],
        conclusion: { subject: 'F', relation: 'SW', object: 'D' },
        expected: true
      },
      {
        premises: [
          { subject: 'G', relation: 'N', object: 'H' },
          { subject: 'H', relation: 'NE', object: 'J' }
        ],
        conclusion: { subject: 'G', relation: 'NNE', object: 'J' },
        expected: true
      },
      {
        premises: [
          { subject: 'K', relation: 'N', object: 'L' },
          { subject: 'L', relation: 'NE', object: 'M' }
        ],
        conclusion: { subject: 'K', relation: 'NE', object: 'M' },
        expected: false
      },
      {
        premises: [
          { subject: 'N', relation: 'E', object: 'P' },
          { subject: 'P', relation: 'S', object: 'Q' }
        ],
        conclusion: { subject: 'Q', relation: 'SE', object: 'N' },
        expected: false
      },
      {
        premises: [
          { subject: 'R', relation: 'W', object: 'S' },
          { subject: 'S', relation: 'S', object: 'T' }
        ],
        conclusion: { subject: 'S', relation: 'SW', object: 'T' },
        expected: false
      },
      {
        premises: [
          { subject: 'U', relation: 'NE', object: 'V' },
          { subject: 'V', relation: 'SE', object: 'W' }
        ],
        conclusion: { subject: 'U', relation: 'E', object: 'W' },
        expected: true
      },
      {
        premises: [
          { subject: 'X', relation: 'NE', object: 'Y' },
          { subject: 'Z', relation: 'SE', object: 'Y' }
        ],
        conclusion: { subject: 'X', relation: 'E', object: 'Z' },
        expected: false
      },
      {
        premises: [
          { subject: 'B', relation: 'W', object: 'C' },
          { subject: 'A', relation: 'N', object: 'B' }
        ],
        conclusion: { subject: 'C', relation: 'SE', object: 'A' },
        expected: true
      },
      {
        premises: [
          { subject: 'H', relation: 'NW', object: 'J' },
          { subject: 'J', relation: 'SW', object: 'K' }
        ],
        conclusion: { subject: 'H', relation: 'WNW', object: 'K' },
        expected: false
      }
    ];
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

  function runAudit(iterations = 8192) {
    const rng = new AuditRng();
    const failures = [];
    const distinctions = new Set();
    const expectedDirections = new Set();
    let matches = 0;
    let nonMatches = 0;
    let invarianceChecks = 0;

    canonicalTrials().forEach((trial, index) => {
      const result = evaluateTrial(trial);
      distinctions.add(result.distinctionClass);
      if (result.isEntailed !== trial.expected) failures.push(`canonical-${index + 1}`);
      const rendered = renderTrial(trial);
      if ((rendered.match(/;/g) || []).length !== 2) failures.push(`canonical-format-${index + 1}`);
      if (/contract:|therefore/i.test(rendered)) failures.push(`canonical-leak-${index + 1}`);
    });

    for (let index = 0; index < iterations; index += 1) {
      const trial = generateTrial(rng, {
        matchProbability: index % 2 === 0 ? 1 : 0,
        interferenceLevel: index % 101
      });
      const result = evaluateTrial(trial);
      distinctions.add(result.distinctionClass);
      expectedDirections.add(result.expectedRelation);
      if (result.isEntailed !== trial.isMatch) failures.push(`answer-${index}`);
      if (trial.requestedMatch !== trial.isMatch) failures.push(`branch-${index}`);
      if (new Set(trial.letters).size !== 3) failures.push(`letters-${index}`);
      if ((renderTrial(trial).match(/;/g) || []).length !== 2) failures.push(`format-${index}`);
      if (/contract:|therefore/i.test(renderTrial(trial))) failures.push(`surface-leak-${index}`);
      if (trial.isMatch) matches += 1;
      else nonMatches += 1;

      if (index % 23 === 0) {
        const [first, second, third] = trial.letters;
        const renamed = renameTrial(trial, { [first]: 'X', [second]: 'Y', [third]: 'Z' });
        if (evaluateTrial(renamed).isEntailed !== trial.isEntailed) failures.push(`rename-${index}`);

        const reordered = clone(trial);
        reordered.premises.reverse();
        if (evaluateTrial(reordered).isEntailed !== trial.isEntailed) failures.push(`order-${index}`);

        const inverted = clone(trial);
        inverted.premises = inverted.premises.map(invert);
        if (evaluateTrial(inverted).isEntailed !== trial.isEntailed) failures.push(`invert-${index}`);
        invarianceChecks += 3;
      }
    }

    if (!matches) failures.push('no-matches');
    if (!nonMatches) failures.push('no-nonmatches');
    if (expectedDirections.size < 14) failures.push(`direction-coverage-${expectedDirections.size}`);
    ['exact-relational-entailment', 'adjacent-resolution-substitution', 'subject-object-reversal', 'wrong-letter-pair']
      .forEach(value => { if (!distinctions.has(value)) failures.push(`missing-${value}`); });

    return {
      passed: failures.length === 0,
      failures,
      iterations,
      matches,
      nonMatches,
      directionCoverage: expectedDirections.size,
      distinctions: [...distinctions].sort(),
      invarianceChecks,
      lettersDriveRelationalComputation: true,
      letteringIdentityIgnored: true,
      conclusionRecomputedFromPremises: true,
      proofBindingRegulation: true,
      directionalResolution: 16,
      directionPools: [4, 8, 16],
      visibleContractText: false,
      exactlyThreeStatements: true
    };
  }

  return {
    version: 3,
    LETTERS,
    DIRECTIONS,
    direction,
    opposite,
    allowedCodes,
    circularDistance,
    directionFromVector,
    derivePositions,
    analyseGraph,
    entailedDirection,
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
