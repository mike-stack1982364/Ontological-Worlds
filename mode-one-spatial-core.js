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
  const random = rng => rng?.next ? rng.next() : Math.random();
  const pick = (rng, values) => {
    if (!values.length) throw new Error('Cannot choose from an empty collection.');
    return rng?.pick ? rng.pick(values) : values[Math.floor(random(rng) * values.length)];
  };
  function shuffle(rng, values) {
    if (rng?.shuffle) return rng.shuffle(values);
    const result = [...values];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random(rng) * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function normaliseResolution(value, fallback = 16) {
    const numeric = Number(value);
    if ([4, 8, 16].includes(numeric)) return numeric;
    if (fallback === null) return null;
    return fallback;
  }
  function direction(code) {
    const value = BY_CODE.get(code);
    if (!value) throw new Error(`Unknown direction: ${code}`);
    return value;
  }
  function allowedCodes(resolution) {
    const numeric = normaliseResolution(resolution, null);
    if (!numeric) throw new Error(`Unsupported direction pool: ${resolution}`);
    const step = 16 / numeric;
    return DIRECTIONS.filter((_, index) => index % step === 0).map(item => item.code);
  }
  function opposite(code) { return DIRECTIONS[(direction(code).index + 8) % 16].code; }
  function directionFromVector(x, y) {
    if (Math.abs(x) < EPSILON && Math.abs(y) < EPSILON) return 'BALANCE';
    const clockwise = (Math.atan2(x, y) + TWO_PI) % TWO_PI;
    return DIRECTIONS[Math.round(clockwise / (TWO_PI / 16)) % 16].code;
  }
  function relationVector(code) { const d = direction(code); return [d.x, d.y]; }
  function circularDistance(firstCode, secondCode, resolution = 16) {
    const ring = allowedCodes(resolution);
    const first = ring.indexOf(firstCode), second = ring.indexOf(secondCode);
    if (first < 0 || second < 0) return Infinity;
    const raw = Math.abs(first - second);
    return Math.min(raw, ring.length - raw);
  }
  function adjacentRelations(code, resolution = 16) {
    const ring = allowedCodes(resolution);
    const index = ring.indexOf(code);
    if (index < 0) return [];
    return [ring[(index - 1 + ring.length) % ring.length], ring[(index + 1) % ring.length]];
  }
  function derivePositions(premises) {
    if (!Array.isArray(premises) || premises.length !== 2) throw new Error('Triadic Entailment requires exactly two relational premises.');
    const positions = new Map();
    const first = premises[0];
    const [dx, dy] = relationVector(first.relation);
    positions.set(first.object, [0, 0]);
    positions.set(first.subject, [dx, dy]);
    for (let pass = 0; pass < 6; pass += 1) {
      premises.forEach(premise => {
        const [px, py] = relationVector(premise.relation);
        const subject = positions.get(premise.subject), object = positions.get(premise.object);
        if (object && !subject) positions.set(premise.subject, [object[0] + px, object[1] + py]);
        if (subject && !object) positions.set(premise.object, [subject[0] - px, subject[1] - py]);
        if (subject && object && (Math.abs(subject[0] - (object[0] + px)) > 1e-6 || Math.abs(subject[1] - (object[1] + py)) > 1e-6)) throw new Error('Premises are relationally inconsistent.');
      });
    }
    return positions;
  }
  function analyseGraph(premises) {
    const adjacency = new Map();
    const connect = (a, b) => { if (!adjacency.has(a)) adjacency.set(a, new Set()); adjacency.get(a).add(b); };
    premises.forEach(p => { connect(p.subject, p.object); connect(p.object, p.subject); });
    const nodes = [...adjacency.keys()];
    if (nodes.length !== 3) throw new Error('Triadic Entailment requires exactly three distinct letters.');
    const endpoints = nodes.filter(node => adjacency.get(node).size === 1);
    const bridges = nodes.filter(node => adjacency.get(node).size === 2);
    if (endpoints.length !== 2 || bridges.length !== 1) throw new Error('The first two statements must form one connected three-letter relation.');
    return { nodes, endpoints, bridge: bridges[0] };
  }
  function entailedDirection(premises, subject, object) {
    const positions = derivePositions(premises);
    const s = positions.get(subject), o = positions.get(object);
    if (!s || !o) throw new Error('The queried letters are not connected by the premises.');
    const relation = directionFromVector(s[0] - o[0], s[1] - o[1]);
    if (relation === 'BALANCE') throw new Error('The queried letters collapse to the same position.');
    return relation;
  }
  function evaluateTrial(trial) {
    if (!trial?.premises || !trial?.conclusion) throw new Error('Incomplete Triadic Entailment trial.');
    const resolution = normaliseResolution(trial.directionResolution, 16);
    const pool = allowedCodes(resolution);
    const graph = analyseGraph(trial.premises);
    const pair = [trial.conclusion.subject, trial.conclusion.object];
    const queryPairValid = pair.length === 2 && graph.endpoints.every(value => pair.includes(value));
    const expectedRelation = entailedDirection(trial.premises, trial.conclusion.subject, trial.conclusion.object);
    const assertedRelation = trial.conclusion.relation;
    const isEntailed = queryPairValid && expectedRelation === assertedRelation;
    let distinctionClass;
    if (!queryPairValid) distinctionClass = 'wrong-letter-pair';
    else if (isEntailed) distinctionClass = 'exact-relational-entailment';
    else if (opposite(expectedRelation) === assertedRelation) distinctionClass = 'subject-object-reversal';
    else if (circularDistance(expectedRelation, assertedRelation, resolution) === 1) distinctionClass = 'adjacent-resolution-substitution';
    else distinctionClass = 'local-or-global-relational-error';
    return { graph, queryPairValid, expectedRelation, assertedRelation, distinctionClass, isEntailed, directionResolution: resolution, resolutionClosed: pool.includes(expectedRelation) && pool.includes(assertedRelation) };
  }
  function invert(statement) { return { subject: statement.object, relation: opposite(statement.relation), object: statement.subject }; }
  function renderStatement(statement) { return `${statement.subject} is ${direction(statement.relation).name} of ${statement.object}`; }
  function renderTrial(trial) { return `${trial.premises.map(renderStatement).join('; ')}; ${renderStatement(trial.conclusion)}.`; }
  function explainTrial(trial) {
    const result = evaluateTrial(trial), asserted = direction(result.assertedRelation).name, expected = direction(result.expectedRelation).name;
    if (result.isEntailed) return `MATCH — the first two relations place ${trial.conclusion.subject} exactly ${asserted} of ${trial.conclusion.object}.`;
    if (result.distinctionClass === 'wrong-letter-pair') return `NO MATCH — the composed relation belongs between ${result.graph.endpoints.join(' and ')}, not the tested letter pair.`;
    if (result.distinctionClass === 'subject-object-reversal') return `NO MATCH — the tested letters require ${expected}; ${asserted} is the reversed direction.`;
    if (result.distinctionClass === 'adjacent-resolution-substitution') return `NO MATCH — ${asserted} is adjacent to the exact relation ${expected} at ${result.directionResolution}-direction resolution, but it is not identical.`;
    return `NO MATCH — the first two relations place ${trial.conclusion.subject} ${expected} of ${trial.conclusion.object}, not ${asserted}.`;
  }
  function choosePremiseDirections(rng, directionResolution = 16) {
    const resolution = normaliseResolution(directionResolution, 16), pool = allowedCodes(resolution);
    for (let attempt = 0; attempt < 2000; attempt += 1) {
      const first = pick(rng, pool), second = pick(rng, pool);
      const [fx, fy] = relationVector(first), [sx, sy] = relationVector(second);
      const derived = directionFromVector(fx + sx, fy + sy);
      if (derived !== 'BALANCE' && pool.includes(derived)) return [first, second];
    }
    return resolution === 4 ? ['N', 'N'] : resolution === 8 ? ['NE', 'NE'] : ['NNE', 'NNE'];
  }
  function adjacentRelation(code, rng, resolution = 16) { return pick(rng, adjacentRelations(code, resolution)); }
  function deriveEndpointRelations(premises) {
    const graph = analyseGraph(premises), [first, last] = graph.endpoints;
    return { graph, first, last, forward: entailedDirection(premises, first, last), reverse: entailedDirection(premises, last, first) };
  }
  function makeNonMatchConclusion(rng, premises, interferenceLevel, directionResolution = 16) {
    const resolution = normaliseResolution(directionResolution, 16), pool = allowedCodes(resolution);
    const { graph, first, last, forward } = deriveEndpointRelations(premises);
    if (!pool.includes(forward)) throw new Error('Derived relation is outside the selected compass resolution.');
    const candidates = [];
    const add = (errorClass, conclusion, difficulty) => {
      if (!pool.includes(conclusion.relation)) return;
      const result = evaluateTrial({ premises, conclusion, directionResolution: resolution });
      if (!result.isEntailed && pool.includes(result.expectedRelation)) candidates.push({ errorClass, conclusion, difficulty, result });
    };
    add('adjacent-resolution-substitution', { subject: first, relation: adjacentRelation(forward, rng, resolution), object: last }, 6);
    add('subject-object-reversal', { subject: last, relation: forward, object: first }, 5);
    const wrongPairRelation = entailedDirection(premises, first, graph.bridge);
    if (wrongPairRelation !== forward && pool.includes(wrongPairRelation)) add('wrong-letter-pair', { subject: first, relation: forward, object: graph.bridge }, 5);
    premises.forEach(premise => add('local-consistency-global-error', { subject: first, relation: premise.relation, object: last }, 3));
    add('contradiction', { subject: first, relation: opposite(forward), object: last }, 1);
    if (!candidates.length) {
      const fallback = adjacentRelations(forward, resolution).find(relation => relation !== forward);
      add('adjacent-resolution-substitution', { subject: first, relation: fallback, object: last }, 4);
    }
    if (!candidates.length) throw new Error('Unable to construct a resolution-valid NO MATCH conclusion.');
    const target = Math.max(1, Math.min(6, 1 + Math.round((Number(interferenceLevel) || 0) / 20)));
    candidates.sort((a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target));
    return pick(rng, candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.4))));
  }
  function hydrateTrial(trial) {
    const resolution = normaliseResolution(trial.directionResolution, 16), pool = allowedCodes(resolution);
    const result = evaluateTrial({ ...trial, directionResolution: resolution });
    const relations = [...trial.premises.map(p => p.relation), trial.conclusion.relation, result.expectedRelation];
    if (!relations.every(code => pool.includes(code))) throw new Error('Trial escaped selected compass resolution.');
    Object.assign(trial, {
      mode: 0, publicMode: 1, directionResolution: resolution,
      letters: trial.letters || result.graph.nodes, expectedRelation: result.expectedRelation,
      distinctionClass: result.distinctionClass, isEntailed: result.isEntailed, isMatch: result.isEntailed, scored: true
    });
    trial.symbols = [...trial.letters];
    trial.signature = ['M0-TRIADIC-ENTAILMENT-V4', `RES:${resolution}`, ...trial.premises.flatMap(p => [p.subject, p.relation, p.object]), trial.conclusion.subject, trial.conclusion.relation, trial.conclusion.object, `EXPECTED:${result.expectedRelation}`, `VALID:${Number(result.isEntailed)}`].join('|');
    trial.interferenceMeta = { ...(trial.interferenceMeta || {}), directionResolution: resolution, mechanism: result.isEntailed ? 'exact-relational-entailment' : (trial.intendedErrorClass || result.distinctionClass), expectedRelation: result.expectedRelation, assertedRelation: result.assertedRelation, distinctionClass: result.distinctionClass, answerRecomputedFromLetterGraph: true, letteringIdentityIgnored: true };
    trial.explanation = explainTrial(trial);
    return trial;
  }
  function generateTrial(rng, options = {}) {
    const matchProbability = Math.max(0, Math.min(1, Number(options.matchProbability ?? 0.5)));
    const interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
    const directionResolution = normaliseResolution(options.directionResolution, 16);
    const requestedMatch = random(rng) < matchProbability;
    const letters = shuffle(rng, LETTERS).slice(0, 3), [firstLetter, bridgeLetter, lastLetter] = letters;
    const [firstDirection, secondDirection] = choosePremiseDirections(rng, directionResolution);
    let premises = [{ subject: firstLetter, relation: firstDirection, object: bridgeLetter }, { subject: bridgeLetter, relation: secondDirection, object: lastLetter }];
    premises = premises.map(statement => random(rng) < 0.5 ? invert(statement) : statement);
    if (random(rng) < 0.5) premises.reverse();
    const derived = deriveEndpointRelations(premises);
    let conclusion, intendedErrorClass = null;
    if (requestedMatch) conclusion = random(rng) < 0.5 ? { subject: derived.first, relation: derived.forward, object: derived.last } : { subject: derived.last, relation: derived.reverse, object: derived.first };
    else { const selected = makeNonMatchConclusion(rng, premises, interferenceLevel, directionResolution); conclusion = selected.conclusion; intendedErrorClass = selected.errorClass; }
    const trial = hydrateTrial({ mode: 0, letters, premises, conclusion, requestedMatch, intendedErrorClass, interferenceLevel, directionResolution, interferenceMeta: { level: interferenceLevel, directionResolution } });
    if (trial.requestedMatch !== trial.isEntailed) throw new Error('Generation branch disagrees with independently recomputed relational entailment.');
    return trial;
  }
  function renameTrial(trial, replacements) {
    const renamed = clone(trial), rename = value => replacements[value] || value;
    renamed.premises = renamed.premises.map(item => ({ subject: rename(item.subject), relation: item.relation, object: rename(item.object) }));
    renamed.conclusion = { subject: rename(renamed.conclusion.subject), relation: renamed.conclusion.relation, object: rename(renamed.conclusion.object) };
    renamed.letters = (renamed.letters || []).map(rename);
    return renamed;
  }
  function runResolutionAudit(iterationsPerResolution = 5000) {
    class AuditRng { constructor(seed) { this.s = seed >>> 0; } next() { let v = this.s += 1831565813; v = Math.imul(v ^ v >>> 15, 1 | v); v ^= v + Math.imul(v ^ v >>> 7, 61 | v); return ((v ^ v >>> 14) >>> 0) / 4294967296; } pick(values) { return values[Math.floor(this.next() * values.length)]; } shuffle(values) { const out = [...values]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; } }
    const failures = [], perResolution = [];
    for (const resolution of [4, 8, 16]) {
      const rng = new AuditRng(0x4c0a0000 + resolution), pool = allowedCodes(resolution), seen = new Set(), row = { resolution, matches: 0, nonMatches: 0, failures: 0 };
      for (let i = 0; i < iterationsPerResolution; i++) {
        try {
          const trial = generateTrial(rng, { matchProbability: i % 2 === 0 ? 1 : 0, interferenceLevel: i % 101, directionResolution: resolution });
          const result = evaluateTrial(trial); const relations = [...trial.premises.map(p => p.relation), trial.conclusion.relation, result.expectedRelation];
          relations.forEach(code => seen.add(code));
          if (!relations.every(code => pool.includes(code)) || result.expectedRelation === 'BALANCE' || trial.directionResolution !== resolution || result.isEntailed !== trial.requestedMatch) row.failures++;
          if (trial.isEntailed) row.matches++; else row.nonMatches++;
          explainTrial(trial); renderTrial(trial);
        } catch (error) { row.failures++; if (failures.length < 25) failures.push(`${resolution}-${i}:${error.message}`); }
      }
      row.coverage = seen.size; if (!row.matches || !row.nonMatches || row.failures) failures.push(`resolution-${resolution}-summary`); perResolution.push(row);
    }
    return { passed: failures.length === 0, failures, iterationsPerResolution, perResolution };
  }
  return { version: 4, LETTERS, DIRECTIONS, direction, opposite, allowedCodes, adjacentRelations, circularDistance, directionFromVector, derivePositions, analyseGraph, entailedDirection, evaluateTrial, invert, renderStatement, renderTrial, explainTrial, hydrateTrial, generateTrial, renameTrial, runAudit: runResolutionAudit, runResolutionAudit, normaliseResolution };
});
