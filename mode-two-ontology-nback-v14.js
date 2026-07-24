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

  function directionVector(direction) {
    return { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] }[direction];
  }

  function composeDirection(first, second) {
    const a = directionVector(first);
    const b = directionVector(second);
    if (!a || !b) return null;
    const x = a[0] + b[0];
    const y = a[1] + b[1];
    if (x === 0 && y === 0) return 'BALANCE';
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'E' : 'W';
    if (Math.abs(y) > Math.abs(x)) return y > 0 ? 'N' : 'S';
    return `${y > 0 ? 'N' : 'S'}${x > 0 ? 'E' : 'W'}`;
  }

  function ontologyFamily(trial) {
    if (trial?.ontology?.family) return trial.ontology.family;
    const name = trial?.ontology?.name || trial?.ontologyName || trial?.ontology;
    return ONTOLOGY_FAMILIES[name] || null;
  }

  function formOrder(trial) {
    return trial?.order || trial?.formOrder || null;
  }

  function composedDirection(trial) {
    if (trial?.composedDirection) return trial.composedDirection;
    if (!Array.isArray(trial?.dirs) || trial.dirs.length < 2) return null;
    return composeDirection(trial.dirs[0], trial.dirs[1]);
  }

  function signatureObject(trial) {
    return Object.freeze({
      family: ontologyFamily(trial),
      order: formOrder(trial),
      direction: composedDirection(trial)
    });
  }

  function signature(trial) {
    const value = signatureObject(trial);
    return `ONTO:${value.family}:${value.order}:${value.direction}`;
  }

  function compare(current, target) {
    const currentSignature = signatureObject(current);
    const targetSignature = signatureObject(target);
    const valid = Boolean(
      currentSignature.family && targetSignature.family &&
      currentSignature.order && targetSignature.order &&
      currentSignature.direction && targetSignature.direction
    );
    const dimensions = Object.freeze({
      family: valid && currentSignature.family === targetSignature.family,
      order: valid && currentSignature.order === targetSignature.order,
      direction: valid && currentSignature.direction === targetSignature.direction
    });
    return Object.freeze({
      isMatch: valid && dimensions.family && dimensions.order && dimensions.direction,
      valid,
      currentSignature,
      targetSignature,
      dimensions,
      current: signature(current),
      target: signature(target)
    });
  }

  function evaluateHistory(history, currentIndex, nBackLevel) {
    const level = Math.max(1, Math.min(8, Math.round(Number(nBackLevel) || 1)));
    const targetIndex = currentIndex - level;
    if (targetIndex < 0) {
      return Object.freeze({ nBackLevel: level, currentIndex, targetIndex, warmup: true, isMatch: false, scored: false });
    }
    const result = compare(history[currentIndex], history[targetIndex]);
    return Object.freeze({ ...result, nBackLevel: level, currentIndex, targetIndex, warmup: false, scored: true });
  }

  function makeTrial(family, order, firstDirection, secondDirection, ontologyName) {
    const members = FAMILY_MEMBERS[family];
    const name = ontologyName || members[0];
    return {
      mode: 1,
      publicMode: 2,
      ontology: { name, family },
      order,
      dirs: [firstDirection, secondDirection],
      symbols: ['B', 'C', 'D'],
      signature: `ONTO:${family}:${order}:${composeDirection(firstDirection, secondDirection)}`
    };
  }

  function mutateFamily(trial) {
    const families = Object.keys(FAMILY_MEMBERS);
    const original = ontologyFamily(trial);
    const family = families[(families.indexOf(original) + 1) % families.length];
    return makeTrial(family, formOrder(trial), trial.dirs[0], trial.dirs[1]);
  }

  function mutateOrder(trial) {
    const original = formOrder(trial);
    const order = FORM_ORDERS[(FORM_ORDERS.indexOf(original) + 1) % FORM_ORDERS.length];
    return makeTrial(ontologyFamily(trial), order, trial.dirs[0], trial.dirs[1]);
  }

  function mutateDirection(trial) {
    const original = composedDirection(trial);
    for (const first of DIRECTIONS) {
      for (const second of DIRECTIONS) {
        if (composeDirection(first, second) !== original) {
          return makeTrial(ontologyFamily(trial), formOrder(trial), first, second);
        }
      }
    }
    throw new Error('Unable to mutate direction');
  }

  function equivalentSurface(trial, variant) {
    const members = FAMILY_MEMBERS[ontologyFamily(trial)];
    const ontologyName = members[variant % members.length];
    const swap = variant % 2 === 1;
    return makeTrial(
      ontologyFamily(trial),
      formOrder(trial),
      swap ? trial.dirs[1] : trial.dirs[0],
      swap ? trial.dirs[0] : trial.dirs[1],
      ontologyName
    );
  }

  function baseProfiles() {
    const profiles = [];
    let index = 0;
    for (const family of Object.keys(FAMILY_MEMBERS)) {
      for (const order of FORM_ORDERS) {
        for (const first of DIRECTIONS) {
          for (const second of DIRECTIONS) {
            profiles.push(makeTrial(family, order, first, second, FAMILY_MEMBERS[family][index % FAMILY_MEMBERS[family].length]));
            index += 1;
          }
        }
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

  function runExhaustiveAudit(repetitionsPerProfile = 128) {
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
        wrongOffsetFailures: 0
      };

      for (let repetition = 0; repetition < repetitionsPerProfile; repetition += 1) {
        for (let profileIndex = 0; profileIndex < profiles.length; profileIndex += 1) {
          const target = profiles[profileIndex];
          const matchCurrent = equivalentSurface(target, repetition + profileIndex);
          const nonMatchVariants = [mutateFamily(target), mutateOrder(target), mutateDirection(target)];

          const matchHistory = buildHistory(target, matchCurrent, level, profiles, profileIndex);
          const matchResult = evaluateHistory(matchHistory, level, level);
          levelResult.evaluations += 1;
          totalEvaluations += 1;
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

          for (const current of nonMatchVariants) {
            const history = buildHistory(target, current, level, profiles, profileIndex);
            const result = evaluateHistory(history, level, level);
            levelResult.evaluations += 1;
            totalEvaluations += 1;
            if (!result.isMatch) {
              levelResult.nonMatches += 1;
              nonMatchCount += 1;
            } else {
              levelResult.falseMatches += 1;
              if (failures.length < 100) failures.push({ level, type: 'false-match', profileIndex, repetition, result });
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
    const expectedNonMatches = expectedMatches * 3;
    return Object.freeze({
      passed: failures.length === 0 && matches === expectedMatches && nonMatchCount === expectedNonMatches,
      mode: 2,
      nBackLevels: LEVELS,
      ontologyFamilies: Object.keys(FAMILY_MEMBERS).length,
      formOrders: FORM_ORDERS.length,
      cardinalDirectionPairs: DIRECTIONS.length * DIRECTIONS.length,
      canonicalProfiles: profiles.length,
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
        ontologyFamilyRequired: true,
        exactFormOrderRequired: true,
        composedDirectionRequired: true,
        categorySubstitutionWithinFamilyAllowed: true,
        letterIdentityRelevant: false,
        directionOperandOrderRelevantOnlyThroughComposition: true,
        incompleteSignaturesRejected: true
      })
    });
  }

  function installBrowser(root) {
    const app = root.__ontologicalWorlds;
    if (!app || app.__modeTwoOntologyNBackV14) return;
    const originalMatchSignature = typeof app.matchSignature === 'function' ? app.matchSignature.bind(app) : null;
    app.matchSignature = function modeTwoOntologySignature(trial, mode = trial?.mode) {
      if (Number(mode) === 1 || Number(trial?.publicMode) === 2) return signature(trial);
      return originalMatchSignature ? originalMatchSignature(trial, mode) : trial?.signature || '';
    };
    app.modeTwoOntologyCompare = compare;
    app.modeTwoOntologyEvaluateHistory = evaluateHistory;
    app.modeTwoOntologyRunAudit = runExhaustiveAudit;
    app.__modeTwoOntologyNBackV14 = true;
  }

  return Object.freeze({
    version: 14,
    LEVELS,
    DIRECTIONS,
    FORM_ORDERS,
    ONTOLOGY_FAMILIES,
    FAMILY_MEMBERS,
    composeDirection,
    ontologyFamily,
    formOrder,
    composedDirection,
    signatureObject,
    signature,
    compare,
    evaluateHistory,
    baseProfiles,
    runExhaustiveAudit,
    installBrowser
  });
});
