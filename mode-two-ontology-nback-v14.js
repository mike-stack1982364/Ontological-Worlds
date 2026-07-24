'use strict';

(function exposeModeTwoOntologyNBack(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.__modeTwoOntologyNBackV14 = api;
    root.addEventListener('DOMContentLoaded', () => api.installBrowser(root));
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
  const DIRECTIONS = Object.freeze(['N', 'E', 'S', 'W']);
  const FORM_ORDERS = Object.freeze(['IOA', 'OIA', 'IAO', 'OAI', 'AIO', 'AOI']);
  const ONTOLOGY_CATEGORIES = Object.freeze([
    'All', 'Difference', 'Action', 'Division', 'Connection',
    'Multiplication', 'Projection', 'Encompassment', 'Completion'
  ]);
  const ONTOLOGY_FAMILIES = Object.freeze({
    All: 'all-completion', Completion: 'all-completion',
    Difference: 'difference-encompassment', Encompassment: 'difference-encompassment',
    Action: 'action-projection', Projection: 'action-projection',
    Division: 'division-multiplication', Multiplication: 'division-multiplication',
    Connection: 'connection'
  });
  const FAMILY_MEMBERS = Object.freeze({
    'all-completion': Object.freeze(['All', 'Completion']),
    'difference-encompassment': Object.freeze(['Difference', 'Encompassment']),
    'action-projection': Object.freeze(['Action', 'Projection']),
    'division-multiplication': Object.freeze(['Division', 'Multiplication']),
    connection: Object.freeze(['Connection'])
  });

  function validDirection(direction) {
    return DIRECTIONS.includes(direction) ? direction : null;
  }

  function trialSymbols(trial) {
    const symbols = Array.isArray(trial?.symbols) ? trial.symbols.slice(0, 3) : null;
    if (!symbols || symbols.length !== 3 || symbols.some(value => typeof value !== 'string' || !value.length)) return null;
    if (new Set(symbols).size !== 3) return null;
    return symbols;
  }

  function trialDirections(trial) {
    if (!Array.isArray(trial?.dirs) || trial.dirs.length < 2) return null;
    const first = validDirection(trial.dirs[0]);
    const second = validDirection(trial.dirs[1]);
    return first && second ? [first, second] : null;
  }

  function canonicalPath(trial) {
    const symbols = trialSymbols(trial);
    const directions = trialDirections(trial);
    if (!symbols || !directions) return null;
    return Object.freeze({
      nodes: Object.freeze([0, 1, 2]),
      edges: Object.freeze([
        Object.freeze({ from: 0, direction: directions[0], to: 1 }),
        Object.freeze({ from: 1, direction: directions[1], to: 2 })
      ])
    });
  }

  function signatureObject(trial) {
    const path = canonicalPath(trial);
    return Object.freeze({
      valid: Boolean(path),
      firstDirection: path ? path.edges[0].direction : null,
      secondDirection: path ? path.edges[1].direction : null,
      topology: path ? '0>1>2' : null
    });
  }

  function signature(trial) {
    const value = signatureObject(trial);
    return value.valid
      ? `PATH:0>${value.firstDirection}>1|1>${value.secondDirection}>2`
      : 'PATH:INVALID';
  }

  function compare(current, target) {
    const currentSignature = signatureObject(current);
    const targetSignature = signatureObject(target);
    const valid = currentSignature.valid && targetSignature.valid;
    const dimensions = Object.freeze({
      topology: valid && currentSignature.topology === targetSignature.topology,
      firstDirection: valid && currentSignature.firstDirection === targetSignature.firstDirection,
      secondDirection: valid && currentSignature.secondDirection === targetSignature.secondDirection
    });
    return Object.freeze({
      isMatch: valid && dimensions.topology && dimensions.firstDirection && dimensions.secondDirection,
      valid,
      currentSignature,
      targetSignature,
      dimensions,
      current: signature(current),
      target: signature(target)
    });
  }

  function evaluateHistory(history, currentIndex, nBackLevel) {
    const level = Math.max(1, Math.min(8, Math.round(Number(nBackLevel) || 1));
    const targetIndex = currentIndex - level;
    if (targetIndex < 0) {
      return Object.freeze({ nBackLevel: level, currentIndex, targetIndex, warmup: true, isMatch: false, scored: false });
    }
    const result = compare(history[currentIndex], history[targetIndex]);
    return Object.freeze({ ...result, nBackLevel: level, currentIndex, targetIndex, warmup: false, scored: true });
  }

  function makeTrial(category, order, firstDirection, secondDirection, symbols = ['B', 'C', 'D']) {
    return {
      mode: 1,
      publicMode: 2,
      ontology: { name: category, family: ONTOLOGY_FAMILIES[category] },
      order,
      dirs: [firstDirection, secondDirection],
      symbols: [...symbols],
      signature: `PATH:0>${firstDirection}>1|1>${secondDirection}>2`
    };
  }

  function equivalentSurface(trial, variant = 0) {
    const symbolSets = [
      ['X', 'Y', 'Z'], ['H', 'J', 'K'], ['P', 'Q', 'R'], ['L', 'M', 'N']
    ];
    const symbols = symbolSets[Math.abs(variant) % symbolSets.length];
    const category = ONTOLOGY_CATEGORIES[(Math.abs(variant) + 3) % ONTOLOGY_CATEGORIES.length];
    const order = FORM_ORDERS[(Math.abs(variant) + 2) % FORM_ORDERS.length];
    return makeTrial(category, order, trial.dirs[0], trial.dirs[1], symbols);
  }

  function mutateFirstDirection(trial) {
    const next = DIRECTIONS[(DIRECTIONS.indexOf(trial.dirs[0]) + 1) % DIRECTIONS.length];
    return makeTrial('Connection', 'AOI', next, trial.dirs[1], ['X', 'Y', 'Z']);
  }

  function mutateSecondDirection(trial) {
    const next = DIRECTIONS[(DIRECTIONS.indexOf(trial.dirs[1]) + 1) % DIRECTIONS.length];
    return makeTrial('Difference', 'OAI', trial.dirs[0], next, ['H', 'J', 'K']);
  }

  function reversePathOrder(trial) {
    return makeTrial('Completion', 'IAO', trial.dirs[1], trial.dirs[0], ['P', 'Q', 'R']);
  }

  function duplicateLetterRole(trial) {
    return makeTrial('Action', 'IOA', trial.dirs[0], trial.dirs[1], ['X', 'X', 'Z']);
  }

  function baseProfiles() {
    const profiles = [];
    for (const first of DIRECTIONS) {
      for (const second of DIRECTIONS) {
        profiles.push(makeTrial('Connection', 'IOA', first, second));
      }
    }
    return profiles;
  }

  function buildHistory(target, current, level, profiles, profileIndex) {
    const history = [target];
    for (let filler = 1; filler < level; filler += 1) {
      history.push(profiles[(profileIndex + filler) % profiles.length]);
    }
    history.push(current);
    return history;
  }

  function runExhaustiveAudit(repetitionsPerProfile = 4096) {
    const profiles = baseProfiles();
    const failures = [];
    const perLevel = [];
    let totalEvaluations = 0;
    let matches = 0;
    let nonMatchCount = 0;

    for (const level of LEVELS) {
      const levelResult = {
        nBackLevel: level,
        profiles: profiles.length,
        repetitionsPerProfile,
        evaluations: 0,
        matches: 0,
        nonMatches: 0,
        falseMatches: 0,
        falseNonMatches: 0,
        wrongOffsetFailures: 0,
        sameResultantOrderCollisionsRejected: 0,
        metadataInvarianceChecks: 0
      };

      for (let repetition = 0; repetition < repetitionsPerProfile; repetition += 1) {
        for (let profileIndex = 0; profileIndex < profiles.length; profileIndex += 1) {
          const target = profiles[profileIndex];
          const matchCurrent = equivalentSurface(target, repetition + profileIndex);
          const nonMatchVariants = [
            mutateFirstDirection(target),
            mutateSecondDirection(target),
            reversePathOrder(target),
            duplicateLetterRole(target)
          ];

          const matchResult = evaluateHistory(buildHistory(target, matchCurrent, level, profiles, profileIndex), level, level);
          levelResult.evaluations += 1;
          totalEvaluations += 1;
          levelResult.metadataInvarianceChecks += 1;
          if (matchResult.isMatch) {
            levelResult.matches += 1;
            matches += 1;
          } else {
            levelResult.falseNonMatches += 1;
            if (failures.length < 100) failures.push({ level, type: 'false-non-match', profileIndex, repetition, matchResult });
          }
          if (matchResult.targetIndex !== 0) {
            levelResult.wrongOffsetFailures += 1;
            if (failures.length < 100) failures.push({ level, type: 'wrong-offset', profileIndex, repetition, matchResult });
          }

          for (let variantIndex = 0; variantIndex < nonMatchVariants.length; variantIndex += 1) {
            const result = evaluateHistory(buildHistory(target, nonMatchVariants[variantIndex], level, profiles, profileIndex), level, level);
            levelResult.evaluations += 1;
            totalEvaluations += 1;
            if (!result.isMatch) {
              levelResult.nonMatches += 1;
              nonMatchCount += 1;
              if (variantIndex === 2 && target.dirs[0] !== target.dirs[1]) {
                levelResult.sameResultantOrderCollisionsRejected += 1;
              }
            } else {
              levelResult.falseMatches += 1;
              if (failures.length < 100) failures.push({ level, type: 'false-match', variantIndex, profileIndex, repetition, result });
            }
            if (result.targetIndex !== 0) {
              levelResult.wrongOffsetFailures += 1;
              if (failures.length < 100) failures.push({ level, type: 'wrong-offset', profileIndex, repetition, result });
            }
          }
        }
      }
      perLevel.push(levelResult);
    }

    const expectedMatches = LEVELS.length * profiles.length * repetitionsPerProfile;
    const expectedNonMatches = expectedMatches * 4;
    return Object.freeze({
      passed: failures.length === 0 && matches === expectedMatches && nonMatchCount === expectedNonMatches,
      mode: 2,
      nBackLevels: LEVELS,
      canonicalOrderedPaths: profiles.length,
      repetitionsPerProfile,
      totalEvaluations,
      matches,
      nonMatches: nonMatchCount,
      expectedMatches,
      expectedNonMatches,
      matchRate: matches / totalEvaluations,
      nonMatchRate: nonMatchCount / totalEvaluations,
      failures,
      perLevel,
      invariants: Object.freeze({
        exactHistoricalOffsetRequired: true,
        orderedCompassPathRequired: true,
        consistentLetterRenamingAllowed: true,
        letterRoleTopologyRequired: true,
        directionOrderRequired: true,
        sameResultantDifferentOrderRejected: true,
        ontologyCategoryRelevant: false,
        ontologyFamilyRelevant: false,
        formOrderRelevant: false,
        incompleteOrAliasedLetterRolesRejected: true
      })
    });
  }

  function installBrowser(root) {
    const app = root.__ontologicalWorlds;
    if (!app || app.__modeTwoOntologyNBackV14) return;
    const originalMatchSignature = typeof app.matchSignature === 'function' ? app.matchSignature.bind(app) : null;
    app.matchSignature = function modeTwoPathSignature(trial, mode = trial?.mode) {
      if (Number(mode) === 1 || Number(trial?.publicMode) === 2) return signature(trial);
      return originalMatchSignature ? originalMatchSignature(trial, mode) : trial?.signature || '';
    };
    app.modeTwoOntologyCompare = compare;
    app.modeTwoOntologyEvaluateHistory = evaluateHistory;
    app.modeTwoOntologyRunAudit = runExhaustiveAudit;
    app.__modeTwoOntologyNBackV14 = true;
  }

  return Object.freeze({
    version: 16,
    LEVELS,
    DIRECTIONS,
    FORM_ORDERS,
    ONTOLOGY_CATEGORIES,
    ONTOLOGY_FAMILIES,
    FAMILY_MEMBERS,
    canonicalPath,
    signatureObject,
    signature,
    compare,
    evaluateHistory,
    makeTrial,
    equivalentSurface,
    mutateFirstDirection,
    mutateSecondDirection,
    reversePathOrder,
    duplicateLetterRole,
    baseProfiles,
    buildHistory,
    runExhaustiveAudit,
    installBrowser
  });
});
