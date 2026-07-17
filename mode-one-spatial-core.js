'use strict';

(function exposeSpatialEntailmentCore(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.__modeOneSpatialCore = api;
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
  const BY_CODE = new Map(DIRECTIONS.map((direction, index) => [direction.code, { ...direction, index }]));
  const TWO_PI = Math.PI * 2;
  const STEP = TWO_PI / DIRECTIONS.length;
  const EPSILON = 1e-8;

  function pick(rng, values) {
    if (!values.length) throw new Error('Cannot choose from an empty collection.');
    if (rng && typeof rng.pick === 'function') return rng.pick(values);
    const random = rng && typeof rng.next === 'function' ? rng.next() : Math.random();
    return values[Math.floor(random * values.length)];
  }

  function random(rng) {
    return rng && typeof rng.next === 'function' ? rng.next() : Math.random();
  }

  function shuffle(rng, values) {
    if (rng && typeof rng.shuffle === 'function') return rng.shuffle(values);
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random(rng) * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
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
    return DIRECTIONS[Math.round(clockwiseFromNorth / STEP) % 16].code;
  }

  function circularDistance(firstCode, secondCode) {
    const first = direction(firstCode).index;
    const second = direction(secondCode).index;
    const raw = Math.abs(first - second);
    return Math.min(raw, 16 - raw);
  }

  function relationVector(relation) {
    const value = direction(relation);
    return [value.x, value.y];
  }

  function derivePositions(premises) {
    if (!Array.isArray(premises) || premises.length !== 2) {
      throw new Error('Mode 1 requires exactly two premises.');
    }
    const positions = new Map();
    const first = premises[0];
    const [vx, vy] = relationVector(first.relation);
    positions.set(first.object, [0, 0]);
    positions.set(first.subject, [vx, vy]);

    for (let pass = 0; pass < 4; pass += 1) {
      for (const premise of premises) {
        const [dx, dy] = relationVector(premise.relation);
        const subject = positions.get(premise.subject);
        const object = positions.get(premise.object);
        if (object && !subject) positions.set(premise.subject, [object[0] + dx, object[1] + dy]);
        if (subject && !object) positions.set(premise.object, [subject[0] - dx, subject[1] - dy]);
        if (subject && object) {
          const expected = [object[0] + dx, object[1] + dy];
          if (Math.abs(expected[0] - subject[0]) > 1e-6 || Math.abs(expected[1] - subject[1]) > 1e-6) {
            throw new Error('Premises are spatially inconsistent.');
          }
        }
      }
    }
    return positions;
  }

  function entailedDirection(premises, subject, object) {
    const positions = derivePositions(premises);
    const subjectPosition = positions.get(subject);
    const objectPosition = positions.get(object);
    if (!subjectPosition || !objectPosition) throw new Error('The queried letters are not connected by the premises.');
    const result = directionFromVector(
      subjectPosition[0] - objectPosition[0],
      subjectPosition[1] - objectPosition[1]
    );
    if (result === 'BALANCE') throw new Error('The queried letters collapse to the same position.');
    return result;
  }

  function evaluateTrial(trial) {
    if (!trial || !Array.isArray(trial.premises) || !trial.conclusion) {
      throw new Error('Incomplete spatial-entailment trial.');
    }
    const expectedRelation = entailedDirection(
      trial.premises,
      trial.conclusion.subject,
      trial.conclusion.object
    );
    return {
      expectedRelation,
      isEntailed: expectedRelation === trial.conclusion.relation
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

  function choosePremiseDirections(rng, interferenceLevel) {
    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    const cardinal = ['N', 'E', 'S', 'W'];
    const octants = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const pool = level < 25 ? cardinal : level < 60 ? octants : DIRECTIONS.map(item => item.code);

    for (let attempt = 0; attempt < 500; attempt += 1) {
      const first = pick(rng, pool);
      const second = pick(rng, pool);
      const firstIndex = direction(first).index;
      const secondIndex = direction(second).index;
      const separation = Math.min(
        (secondIndex - firstIndex + 16) % 16,
        (firstIndex - secondIndex + 16) % 16
      );
      if (separation === 8) continue;
      const [ax, ay] = relationVector(first);
      const [bx, by] = relationVector(second);
      const result = directionFromVector(ax + bx, ay + by);
      if (result === 'BALANCE') continue;
      return [first, second];
    }
    return ['W', 'N'];
  }

  function chooseNearMiss(rng, expected, interferenceLevel) {
    const level = Math.max(0, Math.min(100, Number(interferenceLevel) || 0));
    let offsets;
    if (level >= 75) offsets = [-1, 1];
    else if (level >= 45) offsets = [-2, -1, 1, 2];
    else if (level >= 20) offsets = [-4, -3, 3, 4];
    else offsets = [-8, -6, -4, 4, 6, 8];
    const index = direction(expected).index;
    return DIRECTIONS[(index + pick(rng, offsets) + 16) % 16].code;
  }

  function generateTrial(rng, options = {}) {
    const matchProbability = Math.max(0, Math.min(1, Number(options.matchProbability ?? 0.5)));
    const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
    const letters = shuffle(rng, LETTERS).slice(0, 3);
    const [firstLetter, middleLetter, lastLetter] = letters;
    const [firstDirection, secondDirection] = choosePremiseDirections(rng, interferenceLevel);

    let premises = [
      { subject: firstLetter, relation: firstDirection, object: middleLetter },
      { subject: middleLetter, relation: secondDirection, object: lastLetter }
    ];
    premises = premises.map(statement => random(rng) < 0.5 ? invert(statement) : statement);
    if (random(rng) < 0.5) premises.reverse();

    const queryForward = random(rng) < 0.5;
    const querySubject = queryForward ? firstLetter : lastLetter;
    const queryObject = queryForward ? lastLetter : firstLetter;
    const expectedRelation = entailedDirection(premises, querySubject, queryObject);
    const requestedMatch = random(rng) < matchProbability;
    const conclusion = {
      subject: querySubject,
      relation: requestedMatch ? expectedRelation : chooseNearMiss(rng, expectedRelation, interferenceLevel),
      object: queryObject
    };

    const trial = {
      mode: 0,
      letters,
      premises,
      conclusion,
      requestedMatch,
      interferenceLevel
    };
    const evaluated = evaluateTrial(trial);
    trial.expectedRelation = evaluated.expectedRelation;
    trial.isEntailed = evaluated.isEntailed;
    trial.isMatch = evaluated.isEntailed;
    trial.scored = true;
    trial.signature = [
      'M0-SPATIAL-ENTAILMENT',
      ...premises.flatMap(item => [item.subject, item.relation, item.object]),
      conclusion.subject,
      conclusion.relation,
      conclusion.object,
      `EXPECTED:${evaluated.expectedRelation}`,
      `VALID:${Number(evaluated.isEntailed)}`
    ].join('|');
    trial.interferenceMeta = {
      level: interferenceLevel,
      mechanism: evaluated.isEntailed ? 'exact-relational-entailment' : 'directional-meta-distinction-near-miss',
      expectedRelation: evaluated.expectedRelation,
      assertedRelation: conclusion.relation,
      directionalDistance: circularDistance(evaluated.expectedRelation, conclusion.relation),
      answerRecomputedFromLetterGraph: true
    };

    if (requestedMatch !== evaluated.isEntailed) {
      throw new Error('Generation branch disagrees with recomputed letter-graph entailment.');
    }
    return trial;
  }

  class AuditRng {
    constructor(seed = 0x51a71a1) { this.s = seed >>> 0; }
    next() {
      let value = this.s += 1831565813;
      value = Math.imul(value ^ value >>> 15, 1 | value);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }
    pick(values) { return values[Math.floor(this.next() * values.length)]; }
    shuffle(values) {
      const copy = [...values];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(this.next() * (index + 1));
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
      }
      return copy;
    }
  }

  function runAudit(iterations = 4096) {
    const rng = new AuditRng();
    const failures = [];
    const reachedExpectedDirections = new Set();
    let matches = 0;
    let nonMatches = 0;
    let adjacentNearMisses = 0;

    for (let index = 0; index < iterations; index += 1) {
      const interferenceLevel = index % 101;
      const trial = generateTrial(rng, {
        matchProbability: index % 2 === 0 ? 1 : 0,
        interferenceLevel
      });
      const recomputed = evaluateTrial(trial);
      reachedExpectedDirections.add(recomputed.expectedRelation);
      if (recomputed.isEntailed !== trial.isMatch) failures.push(`answer:${index}`);
      if (trial.requestedMatch !== trial.isMatch) failures.push(`branch:${index}`);
      if (new Set(trial.letters).size !== 3) failures.push(`letters:${index}`);
      if (trial.premises.length !== 2) failures.push(`premises:${index}`);
      if (trial.isMatch) matches += 1;
      else {
        nonMatches += 1;
        if (interferenceLevel >= 75 && trial.interferenceMeta.directionalDistance === 1) adjacentNearMisses += 1;
      }
    }

    if (!matches) failures.push('no-matches');
    if (!nonMatches) failures.push('no-nonmatches');
    if (!adjacentNearMisses) failures.push('no-adjacent-near-misses');
    if (reachedExpectedDirections.size < 12) failures.push(`direction-coverage:${reachedExpectedDirections.size}`);

    const canonical = {
      premises: [
        { subject: 'A', relation: 'W', object: 'J' },
        { subject: 'J', relation: 'N', object: 'P' }
      ],
      conclusion: { subject: 'P', relation: 'SE', object: 'A' }
    };
    const canonicalResult = evaluateTrial(canonical);
    if (!canonicalResult.isEntailed || canonicalResult.expectedRelation !== 'SE') {
      failures.push('canonical-west-north-southeast');
    }

    return {
      passed: failures.length === 0,
      failures,
      iterations,
      matches,
      nonMatches,
      directionCoverage: reachedExpectedDirections.size,
      adjacentNearMisses,
      lettersDriveRelationalComputation: true,
      conclusionRecomputedFromPremises: true,
      directionalResolution: 16
    };
  }

  return {
    version: 1,
    LETTERS,
    DIRECTIONS,
    direction,
    opposite,
    circularDistance,
    directionFromVector,
    derivePositions,
    entailedDirection,
    evaluateTrial,
    invert,
    renderStatement,
    renderTrial,
    generateTrial,
    runAudit
  };
});
