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
  const EPSILON = 1e-8;
  const CONTRACTS = {
    EXACT_16: {
      id: 'EXACT_16',
      algebra: 'equal-unit-directed-vector-composition',
      frame: 'allocentric',
      metric: 'equal-unit',
      resolution: 16,
      policy: 'exact-entailment'
    }
  };

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

  function rotateDirection(code, steps) {
    const offset = ((Number(steps) % 16) + 16) % 16;
    return DIRECTIONS[(direction(code).index + offset) % 16].code;
  }

  function circularDistance(firstCode, secondCode) {
    const first = direction(firstCode).index;
    const second = direction(secondCode).index;
    const raw = Math.abs(first - second);
    return Math.min(raw, 16 - raw);
  }

  function directionFromVector(x, y) {
    if (Math.abs(x) < EPSILON && Math.abs(y) < EPSILON) return 'BALANCE';
    const clockwiseFromNorth = (Math.atan2(x, y) + Math.PI * 2) % (Math.PI * 2);
    return DIRECTIONS[Math.round(clockwiseFromNorth / (Math.PI / 8)) % 16].code;
  }

  function relationVector(code) {
    const value = direction(code);
    return [value.x, value.y];
  }

  function analyseGraph(premises) {
    if (!Array.isArray(premises) || premises.length !== 2) {
      throw new Error('Triadic Entailment requires exactly two premises.');
    }
    const adjacency = new Map();
    const add = (first, second) => {
      if (!adjacency.has(first)) adjacency.set(first, new Set());
      adjacency.get(first).add(second);
    };
    for (const premise of premises) {
      add(premise.subject, premise.object);
      add(premise.object, premise.subject);
    }
    const nodes = [...adjacency.keys()];
    if (nodes.length !== 3) throw new Error('Triadic Entailment requires exactly three distinct letter-nodes.');
    const endpoints = nodes.filter(node => adjacency.get(node).size === 1);
    const bridges = nodes.filter(node => adjacency.get(node).size === 2);
    if (endpoints.length !== 2 || bridges.length !== 1) {
      throw new Error('The first two statements must form one connected three-letter relation graph.');
    }
    return { nodes, endpoints, bridge: bridges[0], adjacency };
  }

  function derivePositions(premises) {
    analyseGraph(premises);
    const positions = new Map();
    const first = premises[0];
    const [firstX, firstY] = relationVector(first.relation);
    positions.set(first.object, [0, 0]);
    positions.set(first.subject, [firstX, firstY]);

    for (let pass = 0; pass < 6; pass += 1) {
      for (const premise of premises) {
        const [dx, dy] = relationVector(premise.relation);
        const subject = positions.get(premise.subject);
        const object = positions.get(premise.object);
        if (object && !subject) positions.set(premise.subject, [object[0] + dx, object[1] + dy]);
        if (subject && !object) positions.set(premise.object, [subject[0] - dx, subject[1] - dy]);
        if (subject && object) {
          const expected = [object[0] + dx, object[1] + dy];
          if (Math.abs(subject[0] - expected[0]) > 1e-6 || Math.abs(subject[1] - expected[1]) > 1e-6) {
            throw new Error('The first two statements are relationally inconsistent.');
          }
        }
      }
    }
    return positions;
  }

  function exactRelation(premises, subject, object) {
    const positions = derivePositions(premises);
    const subjectPosition = positions.get(subject);
    const objectPosition = positions.get(object);
    if (!subjectPosition || !objectPosition) throw new Error('The tested letters are absent from the first two statements.');
    const result = directionFromVector(
      subjectPosition[0] - objectPosition[0],
      subjectPosition[1] - objectPosition[1]
    );
    if (result === 'BALANCE') throw new Error('The tested letters collapse to the same position.');
    return result;
  }

  function possibleRelationsForPair(premises, subject, object) {
    return [exactRelation(premises, subject, object)];
  }

  function findPairWithRelation(premises, relation, excludedSubject, excludedObject) {
    const graph = analyseGraph(premises);
    for (const subject of graph.nodes) {
      for (const object of graph.nodes) {
        if (subject === object) continue;
        if (subject === excludedSubject && object === excludedObject) continue;
        if (exactRelation(premises, subject, object) === relation) return [subject, object];
      }
    }
    return null;
  }

  function evaluateTrial(trial) {
    if (!trial || !Array.isArray(trial.premises) || !trial.conclusion) {
      throw new Error('Incomplete Triadic Entailment trial.');
    }
    const graph = analyseGraph(trial.premises);
    const expectedRelation = exactRelation(
      trial.premises,
      trial.conclusion.subject,
      trial.conclusion.object
    );
    const assertedRelation = trial.conclusion.relation;
    const isEntailed = assertedRelation === expectedRelation;
    const relationBelongsElsewhere = !isEntailed
      ? findPairWithRelation(
          trial.premises,
          assertedRelation,
          trial.conclusion.subject,
          trial.conclusion.object
        )
      : null;

    let distinctionClass = 'exact-entailment';
    if (!isEntailed) {
      if (assertedRelation === opposite(expectedRelation)) distinctionClass = 'subject-object-reversal';
      else if (circularDistance(assertedRelation, expectedRelation) === 1) distinctionClass = 'adjacent-resolution-substitution';
      else if (relationBelongsElsewhere) distinctionClass = 'wrong-letter-pair';
      else distinctionClass = 'relational-composition-error';
    }

    return {
      contract: CONTRACTS.EXACT_16,
      graph: { nodes: graph.nodes, endpoints: graph.endpoints, bridge: graph.bridge },
      expectedRelation,
      assertedRelation,
      possibleRelations: [expectedRelation],
      modalStatus: isEntailed ? 'necessary' : 'impossible',
      distinctionClass,
      isEntailed,
      relationBelongsElsewhere
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
    const expectedName = direction(result.expectedRelation).name;
    const assertedName = direction(result.assertedRelation).name;
    const pair = `${trial.conclusion.subject} and ${trial.conclusion.object}`;
    if (result.isEntailed) {
      return `MATCH — combining the first two relations places ${trial.conclusion.subject} exactly ${expectedName} of ${trial.conclusion.object}.`;
    }
    if (result.distinctionClass === 'subject-object-reversal') {
      return `NO MATCH — the tested letters require the inverse direction: ${trial.conclusion.subject} is ${expectedName} of ${trial.conclusion.object}.`;
    }
    if (result.distinctionClass === 'adjacent-resolution-substitution') {
      return `NO MATCH — ${assertedName} is adjacent to, but not identical with, the exact relation ${expectedName}.`;
    }
    if (result.distinctionClass === 'wrong-letter-pair' && result.relationBelongsElsewhere) {
      return `NO MATCH — ${assertedName} is accurate for ${result.relationBelongsElsewhere[0]} and ${result.relationBelongsElsewhere[1]}, not for ${pair}.`;
    }
    return `NO MATCH — ${trial.conclusion.subject} is ${expectedName} of ${trial.conclusion.object}, not ${assertedName}.`;
  }

  function canonicalTrials() {
    return [
      {
        id: 'T1', difficulty: 1, expected: true,
        premises: [
          { subject: 'A', relation: 'W', object: 'B' },
          { subject: 'B', relation: 'N', object: 'C' }
        ],
        conclusion: { subject: 'C', relation: 'SE', object: 'A' }
      },
      {
        id: 'T2', difficulty: 2, expected: true,
        premises: [
          { subject: 'E', relation: 'S', object: 'D' },
          { subject: 'F', relation: 'W', object: 'E' }
        ],
        conclusion: { subject: 'F', relation: 'SW', object: 'D' }
      },
      {
        id: 'T3', difficulty: 5, expected: true,
        premises: [
          { subject: 'G', relation: 'N', object: 'H' },
          { subject: 'H', relation: 'NE', object: 'J' }
        ],
        conclusion: { subject: 'G', relation: 'NNE', object: 'J' }
      },
      {
        id: 'T4', difficulty: 6, expected: false,
        premises: [
          { subject: 'K', relation: 'N', object: 'L' },
          { subject: 'L', relation: 'NE', object: 'M' }
        ],
        conclusion: { subject: 'K', relation: 'NE', object: 'M' },
        intendedErrorClass: 'adjacent-resolution-substitution'
      },
      {
        id: 'T5', difficulty: 4, expected: false,
        premises: [
          { subject: 'N', relation: 'E', object: 'P' },
          { subject: 'P', relation: 'S', object: 'Q' }
        ],
        conclusion: { subject: 'Q', relation: 'SE', object: 'N' },
        intendedErrorClass: 'subject-object-reversal'
      },
      {
        id: 'T6', difficulty: 5, expected: false,
        premises: [
          { subject: 'R', relation: 'W', object: 'S' },
          { subject: 'S', relation: 'S', object: 'T' }
        ],
        conclusion: { subject: 'S', relation: 'SW', object: 'T' },
        intendedErrorClass: 'wrong-letter-pair'
      },
      {
        id: 'T7', difficulty: 1, expected: true,
        premises: [
          { subject: 'U', relation: 'S', object: 'V' },
          { subject: 'V', relation: 'E', object: 'W' }
        ],
        conclusion: { subject: 'U', relation: 'SE', object: 'W' }
      },
      {
        id: 'T8', difficulty: 6, expected: false,
        premises: [
          { subject: 'X', relation: 'W', object: 'Y' },
          { subject: 'Y', relation: 'N', object: 'Z' }
        ],
        conclusion: { subject: 'X', relation: 'NNW', object: 'Z' },
        intendedErrorClass: 'adjacent-resolution-substitution'
      },
      {
        id: 'T9', difficulty: 4, expected: true,
        premises: [
          { subject: 'A', relation: 'NE', object: 'B' },
          { subject: 'B', relation: 'SE', object: 'C' }
        ],
        conclusion: { subject: 'A', relation: 'E', object: 'C' }
      },
      {
        id: 'T10', difficulty: 5, expected: false,
        premises: [
          { subject: 'H', relation: 'NE', object: 'J' },
          { subject: 'K', relation: 'SE', object: 'J' }
        ],
        conclusion: { subject: 'H', relation: 'E', object: 'K' },
        intendedErrorClass: 'relational-composition-error'
      }
    ];
  }

  function renameTrial(trial, replacements) {
    const renamed = clone(trial);
    const rename = value => replacements[value] || value;
    renamed.premises = renamed.premises.map(statement => ({
      subject: rename(statement.subject),
      relation: statement.relation,
      object: rename(statement.object)
    }));
    renamed.conclusion = {
      subject: rename(renamed.conclusion.subject),
      relation: renamed.conclusion.relation,
      object: rename(renamed.conclusion.object)
    };
    renamed.letters = (renamed.letters || []).map(rename);
    return renamed;
  }

  function transformTemplate(rng, template, interferenceLevel) {
    const trial = clone(template);
    const originalLetters = [...new Set([
      ...trial.premises.flatMap(statement => [statement.subject, statement.object]),
      trial.conclusion.subject,
      trial.conclusion.object
    ])];
    const replacementLetters = shuffle(rng, LETTERS).slice(0, 3);
    const replacements = Object.fromEntries(
      originalLetters.map((letter, index) => [letter, replacementLetters[index]])
    );
    let transformed = renameTrial(trial, replacements);

    const rotationSteps = Math.floor(random(rng) * 16);
    transformed.premises = transformed.premises.map(statement => ({
      ...statement,
      relation: rotateDirection(statement.relation, rotationSteps)
    }));
    transformed.conclusion = {
      ...transformed.conclusion,
      relation: rotateDirection(transformed.conclusion.relation, rotationSteps)
    };

    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    const inversionChance = 0.15 + level * 0.0055;
    transformed.premises = transformed.premises.map(statement =>
      random(rng) < inversionChance ? invert(statement) : statement
    );
    if (random(rng) < inversionChance) transformed.conclusion = invert(transformed.conclusion);
    if (random(rng) < 0.5) transformed.premises.reverse();

    transformed.templateId = template.id;
    transformed.templateExpected = template.expected;
    transformed.rotationSteps = rotationSteps;
    transformed.letters = replacementLetters;
    transformed.contractId = CONTRACTS.EXACT_16.id;
    transformed.contract = clone(CONTRACTS.EXACT_16);
    transformed.intendedErrorClass = template.intendedErrorClass || null;
    transformed.interferenceLevel = level;
    return transformed;
  }

  function hydrateTrial(trial) {
    const result = evaluateTrial(trial);
    trial.mode = 0;
    trial.contractId = CONTRACTS.EXACT_16.id;
    trial.contract = clone(CONTRACTS.EXACT_16);
    trial.letters = trial.letters || result.graph.nodes;
    trial.symbols = [...trial.letters];
    trial.expectedRelation = result.expectedRelation;
    trial.possibleRelations = [result.expectedRelation];
    trial.modalStatus = result.modalStatus;
    trial.distinctionClass = result.distinctionClass;
    trial.isEntailed = result.isEntailed;
    trial.isMatch = result.isEntailed;
    trial.scored = true;
    trial.signature = [
      'M0-TRIADIC-ENTAILMENT-V3',
      ...trial.premises.flatMap(statement => [statement.subject, statement.relation, statement.object]),
      trial.conclusion.subject,
      trial.conclusion.relation,
      trial.conclusion.object,
      `EXPECTED:${result.expectedRelation}`,
      `VALID:${Number(result.isEntailed)}`
    ].join('|');
    trial.interferenceMeta = {
      level: Number(trial.interferenceLevel) || 0,
      templateId: trial.templateId || null,
      mechanism: result.distinctionClass,
      exactRelation: result.expectedRelation,
      assertedRelation: result.assertedRelation,
      directionalDistance: circularDistance(result.expectedRelation, result.assertedRelation),
      lettersDriveRelationalComputation: true,
      answerRecomputedFromLetterGraph: true,
      visibleContract: false
    };
    trial.explanation = explainTrial(trial);
    return trial;
  }

  function generateTrial(rng, options = {}) {
    const matchProbability = Math.max(0, Math.min(1, Number(options.matchProbability ?? 0.5)));
    const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
    const requestedMatch = random(rng) < matchProbability;
    const templates = canonicalTrials().filter(template => template.expected === requestedMatch);
    const targetDifficulty = 1 + Math.round(interferenceLevel / 20);
    const ranked = templates
      .map(template => ({ template, gap: Math.abs(template.difficulty - targetDifficulty) }))
      .sort((first, second) => first.gap - second.gap);
    const bestGap = ranked[0]?.gap ?? 0;
    const shortlist = ranked.filter(item => item.gap <= bestGap + 1).map(item => item.template);
    const template = pick(rng, shortlist.length ? shortlist : templates);
    const trial = hydrateTrial(transformTemplate(rng, template, interferenceLevel));
    trial.requestedMatch = requestedMatch;
    if (trial.isMatch !== requestedMatch) {
      throw new Error(`Template ${template.id} changed truth value under a supposedly invariant transformation.`);
    }
    return trial;
  }

  class AuditRng {
    constructor(seed = 0x731ad1c) { this.s = seed >>> 0; }
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

  function runAudit(iterations = 16384) {
    const rng = new AuditRng();
    const failures = [];
    const templatesReached = new Set();
    const distinctionsReached = new Set();
    const directionsReached = new Set();
    let matches = 0;
    let nonMatches = 0;
    let invarianceChecks = 0;

    for (const [index, trial] of canonicalTrials().entries()) {
      const result = evaluateTrial(trial);
      if (result.isEntailed !== trial.expected) failures.push(`canonical-${index + 1}`);
      const rendered = renderTrial(trial);
      if ((rendered.match(/;/g) || []).length !== 2) failures.push(`canonical-format-${index + 1}`);
      if (/contract:|therefore/i.test(rendered)) failures.push(`canonical-leak-${index + 1}`);
    }

    for (let index = 0; index < iterations; index += 1) {
      const requestedMatch = index % 2 === 0;
      const trial = generateTrial(rng, {
        matchProbability: requestedMatch ? 1 : 0,
        interferenceLevel: index % 101
      });
      const result = evaluateTrial(trial);
      templatesReached.add(trial.templateId);
      distinctionsReached.add(result.distinctionClass);
      directionsReached.add(result.expectedRelation);
      if (result.isEntailed !== trial.isMatch) failures.push(`answer:${index}`);
      if (trial.isMatch !== requestedMatch) failures.push(`branch:${index}`);
      if (new Set(trial.letters).size !== 3) failures.push(`letters:${index}`);
      if (trial.premises.length !== 2) failures.push(`premises:${index}`);
      const rendered = renderTrial(trial);
      if ((rendered.match(/;/g) || []).length !== 2) failures.push(`format:${index}`);
      if (/contract:|therefore/i.test(rendered)) failures.push(`surface-leak:${index}`);
      if (trial.isMatch) matches += 1;
      else nonMatches += 1;

      if (index % 19 === 0) {
        const replacements = Object.fromEntries(
          trial.letters.map((letter, letterIndex) => [letter, LETTERS[(letterIndex + index + 7) % LETTERS.length]])
        );
        const renamed = renameTrial(trial, replacements);
        if (evaluateTrial(renamed).isEntailed !== result.isEntailed) failures.push(`rename:${index}`);

        const reordered = clone(trial);
        reordered.premises.reverse();
        if (evaluateTrial(reordered).isEntailed !== result.isEntailed) failures.push(`reorder:${index}`);

        const invertedPremises = clone(trial);
        invertedPremises.premises = invertedPremises.premises.map(invert);
        if (evaluateTrial(invertedPremises).isEntailed !== result.isEntailed) failures.push(`premise-invert:${index}`);

        const invertedConclusion = clone(trial);
        invertedConclusion.conclusion = invert(invertedConclusion.conclusion);
        if (evaluateTrial(invertedConclusion).isEntailed !== result.isEntailed) failures.push(`conclusion-invert:${index}`);

        const rotated = clone(trial);
        rotated.premises = rotated.premises.map(statement => ({ ...statement, relation: rotateDirection(statement.relation, 3) }));
        rotated.conclusion = { ...rotated.conclusion, relation: rotateDirection(rotated.conclusion.relation, 3) };
        if (evaluateTrial(rotated).isEntailed !== result.isEntailed) failures.push(`rotation:${index}`);
        invarianceChecks += 5;
      }
    }

    if (templatesReached.size !== canonicalTrials().length) failures.push(`template-coverage:${templatesReached.size}`);
    if (directionsReached.size !== 16) failures.push(`direction-coverage:${directionsReached.size}`);
    if (!distinctionsReached.has('adjacent-resolution-substitution')) failures.push('missing-adjacent-distinction');
    if (!distinctionsReached.has('subject-object-reversal')) failures.push('missing-reversal-distinction');
    if (!distinctionsReached.has('wrong-letter-pair')) failures.push('missing-binding-distinction');
    if (!matches || !nonMatches) failures.push('answer-balance');

    return {
      passed: failures.length === 0,
      failures,
      iterations,
      matches,
      nonMatches,
      templateCoverage: templatesReached.size,
      templates: [...templatesReached].sort(),
      distinctionCoverage: distinctionsReached.size,
      distinctions: [...distinctionsReached].sort(),
      directionCoverage: directionsReached.size,
      invarianceChecks,
      lettersDriveRelationalComputation: true,
      conclusionRecomputedFromPremises: true,
      visibleContract: false,
      fixedLogicalRegime: CONTRACTS.EXACT_16.id,
      directionalResolutions: [16]
    };
  }

  return {
    version: 3,
    LETTERS,
    DIRECTIONS,
    CONTRACTS,
    direction,
    opposite,
    rotateDirection,
    circularDistance,
    directionFromVector,
    analyseGraph,
    derivePositions,
    exactRelation,
    possibleRelationsForPair,
    evaluateTrial,
    invert,
    renderStatement,
    renderTrial,
    explainTrial,
    canonicalTrials,
    renameTrial,
    transformTemplate,
    hydrateTrial,
    generateTrial,
    runAudit
  };
});
