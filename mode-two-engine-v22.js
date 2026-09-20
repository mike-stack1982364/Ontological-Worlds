'use strict';

(function expose(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.__modeTwoOntologyNBackV14 = api;
    root.__modeTwoOntologyNBackV21 = api;
    root.__modeTwoOntologyNBackV22 = api;
    if (typeof root.addEventListener === 'function') {
      root.addEventListener('DOMContentLoaded', () => api.installBrowser(root));
    }
  }
})(typeof window !== 'undefined' ? window : globalThis, root => {
  const VERSION = 22;
  const LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
  const RESOLUTIONS = Object.freeze([4, 8, 16]);
  const COMPLEXITIES = Object.freeze(['entities', 'facets', 'worlds']);
  const ONTOLOGY_CATEGORIES = Object.freeze([
    'All', 'Difference', 'Action', 'Division', 'Connection',
    'Multiplication', 'Projection', 'Encompassment', 'Completion'
  ]);
  const FORM_ORDERS = Object.freeze(['IO', 'OI']); // Legacy API only; forms now belong to endpoints.
  const FORM_NAMES = Object.freeze({ I: 'Inner', O: 'Outer', A: '' });
  // Existing v4 meanings, with Connection/Projection clarified for endpoint operations;
  // no experimental category-composition algebra is applied to any category.
  const MEANINGS = Object.freeze(Object.fromEntries(Object.entries({
    All: { I: 'form a collection or whole', O: 'generate copies or likenesses', A: 'totality' },
    Difference: { I: 'locate or distinguish what is inside', O: 'locate or distinguish what is outside', A: 'distinction' },
    Action: { I: 'act upon the self', O: 'act from the self upon what is outside', A: 'action' },
    Division: { I: 'remove or isolate the divided self', O: 'subdivide or pluralise what is observed', A: 'division' },
    Connection: { I: 'form a centre, nexus, middle or hub', O: 'connected member or endpoint of a linking medium', A: 'connection' },
    Multiplication: { I: 'support, sustain or heal from within', O: 'unfold, grow or blossom outward', A: 'multiplication' },
    Projection: { I: 'receive or project toward the self', O: 'project away from the self without bound', A: 'whole source–trajectory–destination span' },
    Encompassment: { I: 'push outward or expand from the inside', O: 'engulf or expand from the outside', A: 'encompassment' },
    Completion: { I: 'become upright or virtuous within', O: 'become sturdy in outward form', A: 'completion' }
  }).map(([category, meanings]) => [category, Object.freeze(meanings)])));
  const WORLD_RULE = 'If the inner candidate follows from its premises, this world projects outward; otherwise it receives inward.';
  const LURE_KINDS = Object.freeze(['category', 'perspective', 'facet-role', 'spatial', 'nested']);
  const core = root?.__modeOneTriadicEntailmentCore || root?.__modeOneSpatialCore
    || (typeof require === 'function' ? require('./mode-one-spatial-core.js') : null);
  const requireCore = () => {
    if (!core) throw new Error('Mode 2 requires the shared spatial core.');
    return core;
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const random = rng => rng?.next ? rng.next() : Math.random();
  const pick = (rng, values) => {
    if (!values.length) throw new Error('Cannot choose from an empty collection.');
    return rng?.pick ? rng.pick(values) : values[Math.floor(random(rng) * values.length)];
  };
  function shuffled(rng, values) {
    if (rng?.shuffle) return rng.shuffle(values.slice());
    const out = values.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random(rng) * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function permutations(values) {
    if (values.length < 2) return [values.slice()];
    return values.flatMap((value, i) => permutations(values.filter((_, j) => j !== i))
      .map(rest => [value, ...rest]));
  }
  function resolutionOf(trial) {
    const value = trial?.directionResolution ?? 16;
    const resolution = Number(value);
    if (!RESOLUTIONS.includes(resolution)) throw new Error(`Unsupported Mode 2 compass resolution: ${value}`);
    return resolution;
  }
  function complexityOf(trial) {
    const complexity = trial?.complexity ?? 'facets';
    if (!COMPLEXITIES.includes(complexity)) throw new Error(`Unsupported Mode 2 complexity: ${complexity}`);
    return complexity;
  }
  function statements(trial) {
    if (!trial || !Array.isArray(trial.premises) || trial.premises.length !== 2 || !trial.conclusion) {
      throw new Error('Mode 2 requires exactly two premises and one candidate conclusion.');
    }
    return [...trial.premises, trial.conclusion];
  }
  function trialLetters(trial) {
    const letters = [...new Set(statements(trial).flatMap(s => [s.subject, s.object]))];
    if (letters.length !== 3) throw new Error('Mode 2 requires exactly three distinct letters.');
    if (letters.some(letter => typeof letter !== 'string' || !/^[A-Z]$/.test(letter))) {
      throw new Error('Mode 2 entities must use single capital letters.');
    }
    return letters;
  }
  function validateFacet(facet) {
    if (!facet || !ONTOLOGY_CATEGORIES.includes(facet.category)
      || !Object.prototype.hasOwnProperty.call(FORM_NAMES, facet.form)) {
      throw new Error('Each Mode 2 endpoint needs a known category and form I, O or A.');
    }
  }
  const facetKey = facet => `${facet.form}:${facet.category}`;
  function facetLabel(facet) {
    validateFacet(facet);
    return [FORM_NAMES[facet.form], facet.category].filter(Boolean).join(' ');
  }
  function occurrences(trial, letter) {
    const out = [];
    statements(trial).forEach((statement, slot) => {
      for (const endpoint of ['subject', 'object']) {
        if (statement[endpoint] === letter) out.push({ statement, slot, endpoint, key: `${endpoint}Facet` });
      }
    });
    return out;
  }
  function outputFacet(trial) {
    return { category: 'Projection', form: requireCore().evaluateTrial(trial).isEntailed ? 'O' : 'I' };
  }
  function validateTrial(trial, depth = 0, expectedResolution) {
    const c = requireCore();
    const resolution = resolutionOf(trial);
    const complexity = complexityOf(trial);
    if (expectedResolution != null && resolution !== expectedResolution) throw new Error('Inner and outer compass resolutions must agree.');
    if (depth > 1 || (depth === 1 && complexity !== 'facets')) throw new Error('Worlds have exactly one inner level, using facet triads.');
    const letters = trialLetters(trial);
    const all = statements(trial);
    for (const statement of all) {
      if (statement.subject === statement.object) throw new Error('An endpoint cannot relate to itself.');
      validateFacet(statement.subjectFacet);
      validateFacet(statement.objectFacet);
      if (!c.allowedCodes(resolution).includes(statement.relation)) throw new Error(`Mode 2 statement escaped ${resolution}-direction resolution.`);
    }
    const evaluation = c.evaluateTrial(trial);
    if (!evaluation.queryPairValid) throw new Error('The candidate must connect the two endpoints of the premise chain.');
    if (!evaluation.resolutionClosed) throw new Error(`Mode 2 derived relation escaped ${resolution}-direction resolution.`);
    for (const letter of letters) {
      const refs = occurrences(trial, letter);
      const distinct = new Set(refs.map(ref => facetKey(ref.statement[ref.key])));
      if (refs.length !== 2) throw new Error('Each entity must appear at exactly two endpoints.');
      if (complexity === 'entities' && distinct.size !== 1) throw new Error('Entity complexity requires one stable facet per entity.');
      if (complexity !== 'entities' && distinct.size !== 2) throw new Error('Facet complexity requires two different aspects of each entity.');
    }
    if (complexity === 'worlds') {
      if (!trial.worlds || typeof trial.worlds !== 'object' || Array.isArray(trial.worlds)
        || Object.keys(trial.worlds).length !== 3
        || letters.some(letter => !Object.prototype.hasOwnProperty.call(trial.worlds, letter))) {
        throw new Error('World complexity requires exactly one inner world for each outer letter.');
      }
      for (const letter of letters) validateTrial(trial.worlds[letter], depth + 1, resolution);
    } else if (trial.worlds != null) {
      throw new Error('Only world complexity may contain inner worlds.');
    }
    if (trial.worldRule != null && trial.worldRule !== WORLD_RULE) throw new Error('Unknown inner-world dependency rule.');
    if (trial.outputFacet != null) {
      validateFacet(trial.outputFacet);
      if (facetKey(trial.outputFacet) !== facetKey(outputFacet(trial))) throw new Error('World output does not follow the stated dependency rule.');
    }
    return { letters, resolution, complexity, evaluation };
  }
  function ensureResolutionClosed(trial, expectedResolution = trial?.directionResolution ?? 16) {
    try { validateTrial(trial, 0, resolutionOf({ directionResolution: expectedResolution })); return true; }
    catch (_) { return false; }
  }
  function invert(statement) {
    return {
      subject: statement.object, subjectFacet: clone(statement.objectFacet),
      relation: requireCore().opposite(statement.relation),
      object: statement.subject, objectFacet: clone(statement.subjectFacet)
    };
  }
  function normalisedStatement(statement, mapping, attachments = {}) {
    const node = (letter, facet) => [mapping[letter], facetKey(facet), attachments[letter] || ''];
    const direct = JSON.stringify([node(statement.subject, statement.subjectFacet), statement.relation, node(statement.object, statement.objectFacet)]);
    const reverse = JSON.stringify([node(statement.object, statement.objectFacet), requireCore().opposite(statement.relation), node(statement.subject, statement.subjectFacet)]);
    return direct < reverse ? direct : reverse;
  }
  function attachmentSignatures(trial) {
    if (complexityOf(trial) !== 'worlds') return {};
    return Object.fromEntries(trialLetters(trial).map(letter => [letter,
      `${WORLD_RULE}|OUTPUT:${facetKey(outputFacet(trial.worlds[letter]))}|${signatureValidated(trial.worlds[letter])}`]));
  }
  function signatureValidated(trial) {
    const letters = trialLetters(trial);
    const attachments = attachmentSignatures(trial);
    return permutations(['A', 'B', 'C']).map(labels => {
      const mapping = Object.fromEntries(letters.map((letter, i) => [letter, labels[i]]));
      const premises = trial.premises.map(s => normalisedStatement(s, mapping, attachments)).sort();
      return `MODE2-ENDPOINT-NBACK-V22|RES:${resolutionOf(trial)}|TYPE:${complexityOf(trial)}|P:${premises.join('&')}|C:${normalisedStatement(trial.conclusion, mapping, attachments)}`;
    }).sort()[0];
  }
  function relationalSignature(trial) { validateTrial(trial); return signatureValidated(trial); }
  function analyseAlignment(target, current) {
    const first = validateTrial(target), second = validateTrial(current);
    if (first.resolution !== second.resolution || first.complexity !== second.complexity) {
      return Object.freeze({ matchedCount: 0, statementMatches: Object.freeze([false, false, false]), wholeTrialMatch: false, mapping: null });
    }
    const targetAttachments = attachmentSignatures(target), currentAttachments = attachmentSignatures(current);
    const identity = Object.fromEntries(second.letters.map(letter => [letter, letter]));
    const now = statements(current).map(s => normalisedStatement(s, identity, currentAttachments));
    let best;
    for (const assigned of permutations(second.letters)) {
      const mapping = Object.fromEntries(first.letters.map((letter, i) => [letter, assigned[i]]));
      const prior = statements(target).map(s => normalisedStatement(s, mapping, targetAttachments));
      for (const assignment of [[0, 1, 2], [1, 0, 2]]) {
        const vector = now.map((statement, i) => statement === prior[assignment[i]]);
        const count = vector.filter(Boolean).length;
        if (!best || count > best.matchedCount) best = { matchedCount: count, statementMatches: Object.freeze(vector), wholeTrialMatch: count === 3, mapping: Object.freeze(mapping), premiseAssignment: Object.freeze(assignment.slice()) };
      }
    }
    return Object.freeze(best);
  }
  function evaluate(trial) {
    const { evaluation, resolution } = validateTrial(trial);
    return Object.freeze({
      ...evaluation, isMatch: evaluation.isEntailed, withinTrialEntailed: evaluation.isEntailed,
      ontologyRelevant: true, formOrderRelevant: true, endpointBindingsRelevant: true,
      directionResolution: resolution, resolutionClosed: true, signature: signatureValidated(trial),
      outputFacet: Object.freeze(outputFacet(trial))
    });
  }
  function compare(target, current) {
    if (!current) { current = target; target = null; }
    const currentSignature = relationalSignature(current);
    const targetSignature = target ? relationalSignature(target) : null;
    return Object.freeze({ isMatch: Boolean(target && targetSignature === currentSignature), valid: Boolean(target),
      target: targetSignature, current: currentSignature, alignment: target ? analyseAlignment(target, current) : null,
      currentWithinTrial: evaluate(current) });
  }
  function validLevel(value = 1) {
    const level = Number(value);
    if (!LEVELS.includes(level)) throw new Error('Mode 2 N-back level must be an integer from 1 through 8.');
    return level;
  }
  function evaluateHistory(history, currentIndex, nBackLevel) {
    if (!Array.isArray(history) || !Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= history.length || !history[currentIndex]) {
      throw new Error('Mode 2 history requires an existing current trial and a valid index.');
    }
    const level = validLevel(nBackLevel), targetIndex = currentIndex - level;
    validateTrial(history[currentIndex]);
    if (targetIndex < 0) return Object.freeze({ nBackLevel: level, currentIndex, targetIndex, warmup: true, isMatch: false, scored: false });
    if (!history[targetIndex]) throw new Error('Mode 2 history is missing the N-back target.');
    return Object.freeze({ ...compare(history[targetIndex], history[currentIndex]), nBackLevel: level, currentIndex, targetIndex, warmup: false, scored: true });
  }
  function refreshTrial(trial) {
    const result = requireCore().evaluateTrial(trial);
    trial.mode = 1;
    trial.publicMode = 2;
    trial.directionResolution = resolutionOf(trial);
    trial.complexity = complexityOf(trial);
    trial.letters = trialLetters(trial);
    trial.symbols = trial.letters.slice();
    trial.ontologyScoringNeutral = false;
    trial.withinTrialEntailed = result.isEntailed;
    trial.expectedRelation = result.expectedRelation;
    if (trial.worldRule != null || trial.outputFacet != null) {
      trial.worldRule = WORLD_RULE;
      trial.outputFacet = outputFacet(trial);
    }
    trial.signature = relationalSignature(trial);
    return trial;
  }
  function ontologyDecorations(trial) {
    validateTrial(trial);
    return { endpoints: statements(trial).map(s => ({ subjectFacet: clone(s.subjectFacet), objectFacet: clone(s.objectFacet) })), complexity: complexityOf(trial) };
  }
  function decorateTrial(trial) {
    // V21's name is retained, but missing endpoint bindings are never silently invented.
    return refreshTrial(clone(trial));
  }
  function renderStatement(statement) {
    return `${facetLabel(statement.subjectFacet)} ${statement.subject} is ${requireCore().direction(statement.relation).name} of ${facetLabel(statement.objectFacet)} ${statement.object}`;
  }
  function renderOntologicalTrial(trial) {
    validateTrial(trial);
    const outer = statements(trial).map((statement, index) => `${index < 2 ? `Premise ${index + 1}` : 'Candidate'}: ${renderStatement(statement)}.`).join('\n');
    if (complexityOf(trial) !== 'worlds') return outer;
    return outer + '\n\n' + trialLetters(trial).map(letter => {
      const inner = trial.worlds[letter];
      return `Inside world ${letter} — infer its output using the world rule:\n${renderOntologicalTrial(inner)}`;
    }).join('\n\n') + `\n\nWorld rule: ${WORLD_RULE}`;
  }
  function explainTrial(trial, target) {
    const result = evaluate(trial), c = requireCore(), end = trial.conclusion;
    const nested = complexityOf(trial) === 'worlds' ? ' ' + trialLetters(trial).map(letter => {
      const output = outputFacet(trial.worlds[letter]);
      return `World ${letter}: its inner candidate ${output.form === 'O' ? 'follows' : 'does not follow'}, so its output is ${facetLabel(output)}.`;
    }).join(' ') : '';
    const spatial = `The two premises put ${end.subject} ${c.direction(result.expectedRelation).name} of ${end.object}. The candidate ${result.isEntailed ? 'follows' : 'does not follow'}.${nested}`;
    if (!target) return `${spatial} A history match separately requires every endpoint category, perspective, relationship and inner world to fit one consistent letter map.`;
    const comparison = compare(target, trial);
    return `${comparison.isMatch ? 'Match: all endpoint bindings and relationships fit one consistent letter map.' : 'No Match: no single letter map preserves the complete structure.'} ${spatial}`;
  }
  function randomFacet(rng, excluding = []) {
    const pool = ONTOLOGY_CATEGORIES.flatMap(category => ['I', 'O', 'A'].map(form => ({ category, form })))
      .filter(facet => !excluding.includes(facetKey(facet)));
    return clone(pick(rng, pool));
  }
  function assignFacets(rng, trial) {
    const used = [];
    for (const letter of trialLetters(trial)) {
      const refs = occurrences(trial, letter);
      const first = randomFacet(rng, used);
      used.push(facetKey(first));
      const second = complexityOf(trial) === 'entities' ? first : randomFacet(rng, [facetKey(first)]);
      refs[0].statement[refs[0].key] = clone(first);
      refs[1].statement[refs[1].key] = clone(second);
    }
    return trial;
  }
  function generateTrial(rng, options = {}) {
    const c = requireCore(), resolution = resolutionOf(options), complexity = complexityOf(options);
    const ring = c.allowedCodes(resolution);
    const pairs = [];
    for (const first of ring) for (const second of ring) {
      const a = c.direction(first), b = c.direction(second), sum = c.directionFromVector(a.x + b.x, a.y + b.y);
      if (ring.includes(sum)) pairs.push([first, second, sum]);
    }
    const [first, bridge, last] = shuffled(rng, c.LETTERS).slice(0, 3);
    const [directionA, directionB, expected] = pick(rng, pairs);
    const probability = Number(options.matchProbability ?? 0.5);
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new Error('Mode 2 probability must be between zero and one.');
    const entailed = random(rng) < probability;
    const trial = assignFacets(rng, {
      complexity, directionResolution: resolution,
      premises: [{ subject: first, relation: directionA, object: bridge }, { subject: bridge, relation: directionB, object: last }],
      conclusion: { subject: first, relation: entailed ? expected : pick(rng, ring.filter(code => code !== expected)), object: last }
    });
    trial.premises = trial.premises.map(s => random(rng) < 0.5 ? invert(s) : s);
    if (random(rng) < 0.5) trial.premises.reverse();
    if (random(rng) < 0.5) trial.conclusion = invert(trial.conclusion);
    if (complexity === 'worlds') {
      trial.worlds = Object.fromEntries(trialLetters(trial).map(letter => {
        const child = generateTrial(rng, { directionResolution: resolution, complexity: 'facets', matchProbability: 0.5 });
        child.worldRule = WORLD_RULE;
        child.outputFacet = outputFacet(child);
        return [letter, child];
      }));
    }
    trial.interferenceLevel = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
    trial.seedGenerator = 'mode-two-endpoint-binding-v22';
    return refreshTrial(trial);
  }
  function transformedCopy(rng, target, options = {}) {
    validateTrial(target);
    const resolution = resolutionOf({ directionResolution: options.directionResolution ?? target.directionResolution });
    if (resolution !== resolutionOf(target)) throw new Error('Mode 2 target and selected compass resolution disagree.');
    if (options.complexity != null && options.complexity !== complexityOf(target)) throw new Error('Mode 2 target and selected complexity disagree.');
    const source = trialLetters(target), destination = shuffled(rng, requireCore().LETTERS).slice(0, 3);
    const mapping = Object.fromEntries(source.map((letter, i) => [letter, destination[i]]));
    const rename = s => ({ subject: mapping[s.subject], subjectFacet: clone(s.subjectFacet), relation: s.relation, object: mapping[s.object], objectFacet: clone(s.objectFacet) });
    // Whitelist structural data: answers, old targets, diagnostic mappings and timing never propagate.
    const out = { complexity: complexityOf(target), directionResolution: resolution, premises: target.premises.map(rename), conclusion: rename(target.conclusion) };
    if (random(rng) < 0.5) out.premises.reverse();
    out.premises = out.premises.map(s => random(rng) < 0.5 ? invert(s) : s);
    if (random(rng) < 0.5) out.conclusion = invert(out.conclusion);
    if (out.complexity === 'worlds') {
      out.worlds = Object.fromEntries(source.map(letter => [mapping[letter], transformedCopy(rng, target.worlds[letter])]));
      for (const child of Object.values(out.worlds)) { child.worldRule = WORLD_RULE; child.outputFacet = outputFacet(child); }
    }
    if (target.worldRule != null) { out.worldRule = WORLD_RULE; out.outputFacet = outputFacet(out); }
    return refreshTrial(out);
  }
  function mutate(trial, kind, rng, interferenceLevel) {
    const all = statements(trial), letters = trialLetters(trial), letter = pick(rng, letters);
    const refs = occurrences(trial, letter);
    const selected = pick(rng, refs);
    const details = [];
    if (kind === 'category' || kind === 'perspective') {
      const before = clone(selected.statement[selected.key]), after = clone(before);
      const otherFacet = refs.find(ref => ref !== selected).statement[refs.find(ref => ref !== selected).key];
      if (kind === 'category') after.category = pick(rng, ONTOLOGY_CATEGORIES.filter(category => category !== before.category
        && (trial.complexity === 'entities' || `${after.form}:${category}` !== facetKey(otherFacet))));
      else after.form = pick(rng, ['I', 'O', 'A'].filter(form => form !== before.form
        && (trial.complexity === 'entities' || `${form}:${after.category}` !== facetKey(otherFacet))));
      for (const ref of trial.complexity === 'entities' ? refs : [selected]) {
        ref.statement[ref.key] = clone(after);
        details.push({ slot: ref.slot + 1, endpoint: ref.endpoint, letter, before, after: clone(after) });
      }
    } else if (kind === 'facet-role') {
      if (trial.complexity === 'entities') {
        const other = pick(rng, letters.filter(value => value !== letter));
        const otherRefs = occurrences(trial, other), first = clone(refs[0].statement[refs[0].key]), second = clone(otherRefs[0].statement[otherRefs[0].key]);
        if (facetKey(first) === facetKey(second)) return null;
        for (const [group, before, after, id] of [[refs, first, second, letter], [otherRefs, second, first, other]]) {
          for (const ref of group) { ref.statement[ref.key] = clone(after); details.push({ slot: ref.slot + 1, endpoint: ref.endpoint, letter: id, before, after: clone(after) }); }
        }
      } else {
        const first = clone(refs[0].statement[refs[0].key]), second = clone(refs[1].statement[refs[1].key]);
        refs[0].statement[refs[0].key] = second;
        refs[1].statement[refs[1].key] = first;
        refs.forEach((ref, i) => details.push({ slot: ref.slot + 1, endpoint: ref.endpoint, letter, before: i ? second : first, after: i ? first : second }));
      }
    } else if (kind === 'spatial') {
      // Changing the candidate preserves valid, resolution-closed premise geometry at every resolution.
      const before = trial.conclusion.relation, ring = requireCore().allowedCodes(resolutionOf(trial));
      const distance = interferenceLevel >= 80 ? 1 : interferenceLevel >= 50 ? Math.min(2, ring.length - 1) : ring.length / 2;
      trial.conclusion.relation = ring[(ring.indexOf(before) + (random(rng) < 0.5 ? distance : -distance) + ring.length) % ring.length];
      details.push({ slot: 3, endpoint: 'relation', before, after: trial.conclusion.relation });
    } else if (kind === 'nested') {
      const child = trial.worlds[letter];
      const inner = mutate(child, pick(rng, ['category', 'perspective', 'facet-role', 'spatial']), rng, interferenceLevel);
      if (!inner) return null;
      refreshTrial(child);
      details.push(...inner.map(detail => ({ world: letter, ...detail })));
    } else throw new Error(`Unsupported Mode 2 lure kind: ${kind}`);
    return details;
  }
  function generateNBackTrial(rng, target, options = {}) {
    if (!target) throw new Error('A historical N-back target is required.');
    validateTrial(target);
    const level = validLevel(options.nBackLevel ?? 1), requestedMatch = Boolean(options.match);
    const interference = Math.max(0, Math.min(100, Number(options.interferenceLevel) || 0));
    const available = LURE_KINDS.filter(kind => kind !== 'nested' || complexityOf(target) === 'worlds');
    if (options.lureKind != null && !available.includes(options.lureKind)) throw new Error('Requested lure kind is unavailable at this complexity.');
    let trial, result;
    const requestedKind = options.lureKind || pick(rng, available);
    for (let attempt = 0; attempt < 128; attempt += 1) {
      trial = transformedCopy(rng, target, options);
      if (!requestedMatch) {
        const kind = attempt < 64 || options.lureKind ? requestedKind : pick(rng, available);
        const details = mutate(trial, kind, rng, interference);
        if (!details) continue;
        refreshTrial(trial);
        trial.lureKind = kind;
        trial.changedDetails = details;
        trial.lureGenerationAttempts = attempt + 1;
      }
      result = compare(target, trial);
      if (result.isMatch === requestedMatch) break;
      result = null;
    }
    if (!result) throw new Error('Unable to generate the requested complete endpoint-binding relation.');
    Object.assign(trial, {
      nBackLevel: level, nBackWarmup: false, nBackRequestedMatch: requestedMatch,
      nBackMatch: result.isMatch, isMatch: result.isMatch, scored: true,
      nBackTargetSignature: result.target, nBackCurrentSignature: result.current,
      interferenceLevel: interference, alignment: result.alignment
    });
    if (!requestedMatch) {
      trial.partialStatementCompatibility = result.alignment.matchedCount;
      trial.statementMatchVector = result.alignment.statementMatches.slice();
    }
    return trial;
  }
  function generateProbe(trial) {
    validateTrial(trial);
    const original = evaluate(trial), changed = {
      complexity: complexityOf(trial), directionResolution: resolutionOf(trial),
      premises: clone(trial.premises), conclusion: clone(trial.conclusion)
    };
    if (trial.worlds) changed.worlds = clone(trial.worlds);
    if (trial.worldRule) changed.worldRule = WORLD_RULE;
    // A genuine intervention changes both directions while preserving their endpoints and facets.
    changed.premises.forEach(s => { s.relation = requireCore().opposite(s.relation); });
    if (changed.worldRule) changed.outputFacet = outputFacet(changed);
    refreshTrial(changed);
    const counterfactual = evaluate(changed);
    const candidate = renderStatement(trial.conclusion);
    const spatial = Object.freeze({ question: `Does this candidate follow from these two premises: ${candidate}?`, answer: original.isEntailed, options: Object.freeze([true, false]), expectedRelation: original.expectedRelation, explanation: explainTrial(trial) });
    return Object.freeze({
      spatial,
      inference: spatial,
      counterfactual: Object.freeze({ question: `Reverse the direction in both premises, keeping every letter and facet fixed. Does the unchanged candidate now follow: ${candidate}?`, answer: counterfactual.isEntailed, options: Object.freeze([true, false]),
        expectedRelation: counterfactual.expectedRelation, trial: changed,
        explanation: `The endpoint relation changes from ${requireCore().direction(original.expectedRelation).name} to ${requireCore().direction(counterfactual.expectedRelation).name}. The unchanged candidate ${counterfactual.isEntailed ? 'now follows' : 'does not follow'}.`,
        outputFacet: counterfactual.outputFacet })
    });
  }
  class AuditRng {
    constructor(seed) { this.state = seed >>> 0; }
    next() { let value = this.state += 0x6D2B79F5; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; }
    pick(values) { return values[Math.floor(this.next() * values.length)]; }
  }
  function runExhaustiveAudit(iterationsPerLevel = 1000) {
    const iterations = Math.max(1, Math.round(Number(iterationsPerLevel) || 1000));
    const failures = [], rows = [];
    let totalEvaluations = 0, matches = 0, nonMatches = 0, partialLureChecks = 0;
    for (const complexity of COMPLEXITIES) for (const resolution of RESOLUTIONS) for (const level of LEVELS) {
      const rng = new AuditRng(0x4d320000 + resolution * 257 + level + COMPLEXITIES.indexOf(complexity) * 65536), history = [];
      const row = { complexity, resolution, nBackLevel: level, evaluations: 0, matches: 0, nonMatches: 0, falseMatches: 0, falseNonMatches: 0, wrongOffsetFailures: 0, resolutionFailures: 0, partialLureFailures: 0, lureKinds: {} };
      for (let i = 0; i < level; i += 1) history.push(generateTrial(rng, { directionResolution: resolution, complexity }));
      for (let i = 0; i < iterations; i += 1) {
        const requestedMatch = i % 2 === 0;
        const trial = generateNBackTrial(rng, history[history.length - level], { match: requestedMatch, nBackLevel: level, directionResolution: resolution, complexity, interferenceLevel: 100 });
        history.push(trial);
        const currentIndex = history.length - 1, result = evaluateHistory(history, currentIndex, level);
        row.evaluations += 1; totalEvaluations += 1;
        if (result.targetIndex !== currentIndex - level) row.wrongOffsetFailures += 1;
        if (!ensureResolutionClosed(trial, resolution)) row.resolutionFailures += 1;
        if (result.isMatch !== requestedMatch) { if (requestedMatch) row.falseNonMatches += 1; else row.falseMatches += 1; }
        else if (result.isMatch) { row.matches += 1; matches += 1; } else { row.nonMatches += 1; nonMatches += 1; }
        if (!requestedMatch) {
          partialLureChecks += 1;
          row.lureKinds[trial.lureKind] = (row.lureKinds[trial.lureKind] || 0) + 1;
          if (!trial.changedDetails?.length || result.alignment.wholeTrialMatch || trial.partialStatementCompatibility !== result.alignment.matchedCount) row.partialLureFailures += 1;
        }
        // Only N recent targets are needed by this audit; avoid retaining growing signature histories.
        if (history.length > level + 1) history.splice(0, history.length - level - 1);
      }
      if (row.falseMatches || row.falseNonMatches || row.wrongOffsetFailures || row.resolutionFailures || row.partialLureFailures) failures.push(`${complexity}-resolution-${resolution}-level-${level}`);
      rows.push(row);
    }
    return Object.freeze({ passed: failures.length === 0, mode: 2, version: VERSION, resolutions: RESOLUTIONS, complexities: COMPLEXITIES, nBackLevels: LEVELS, iterationsPerLevel: iterations,
      totalEvaluations, matches, nonMatches, matchRate: matches / totalEvaluations, nonMatchRate: nonMatches / totalEvaluations, partialLureChecks, failures, rows,
      invariants: Object.freeze({ completeThreeStatementCrossTrialComparison: true, exactTwoStatementNonMatchLures: false,
        selectableCompassResolution: true, resolutionClosedGeneration: true, ontologyCategoriesScoringNeutral: false, formOrderScoringNeutral: false,
        endpointBindingsScored: true, nestedCompleteStructureScored: true, stableEntityIdentity: true,
        letteringIdentityIgnored: true, premiseOrderIgnored: true, equivalentWordingInversionIgnored: true,
        inversionPreservesEndpointFacets: true, allNBackLevelsUseSameComparator: true, collapsedGraphsRejectedAndRegenerated: true }) });
  }
  function installBrowser(rootObject) {
    const app = rootObject.__ontologicalWorlds;
    if (!app || !requireCore() || app.__modeTwoOntologyNBackV22) return;
    const originalRender = app.renderTrial.bind(app), originalSignature = app.matchSignature?.bind(app);
    app.renderTrial = function(trial) { return Number(trial?.mode) === 1 || Number(trial?.publicMode) === 2 ? renderOntologicalTrial(trial) : originalRender(trial); };
    app.matchSignature = function(trial, mode = trial?.mode) { return Number(mode) === 1 || Number(trial?.publicMode) === 2 ? relationalSignature(trial) : (originalSignature ? originalSignature(trial, mode) : trial?.signature || ''); };
    Object.assign(app, { modeTwoOntologyCompare: compare, modeTwoOntologyEvaluate: evaluate, modeTwoOntologyEvaluateHistory: evaluateHistory,
      modeTwoOntologyGenerateTrial: generateTrial, modeTwoOntologyGenerateNBackTrial: generateNBackTrial, modeTwoOntologyRenderTrial: renderOntologicalTrial,
      modeTwoOntologyRunAudit: runExhaustiveAudit, modeTwoOntologyGenerateProbe: generateProbe,
      __modeTwoOntologyNBackV14: true, __modeTwoOntologyNBackV21: true, __modeTwoOntologyNBackV22: true });
  }
  return Object.freeze({ version: VERSION, LEVELS, RESOLUTIONS, COMPLEXITIES, ONTOLOGY_CATEGORIES, FORM_ORDERS, FORM_NAMES,
    MEANINGS, WORLD_RULE, LURE_KINDS, facetLabel, outputFacet, validateTrial, invert, ontologyDecorations, decorateTrial,
    relationalSignature, analyseAlignment, ensureResolutionClosed, evaluate, compare, evaluateHistory, renderOntologicalTrial,
    explainTrial, generateTrial, generateNBackTrial, generateProbe, runExhaustiveAudit, installBrowser });
});
