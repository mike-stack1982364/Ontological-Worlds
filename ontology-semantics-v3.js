'use strict';

/*
 * Source-faithful semantic vocabulary for the nine ontological categories.
 * Loaded after ontology-integration-v3.js. The algebra stays unchanged; this
 * layer corrects the spoken/visible generative constraints to Woodson's stated
 * Inner and Outer meanings, and exposes the analytic/bridge/synthetic phase.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  if (!app) return;

  const CATEGORIES = [
    { id: 'ALL', name: 'All', family: 'all-completion', mirror: 'COMPLETION', phase: 'analytic', forms: { I: 'form a collection or whole', O: 'generate copies or likenesses', A: 'instantiate totality' } },
    { id: 'DIFFERENCE', name: 'Difference', family: 'difference-encompassment', mirror: 'ENCOMPASSMENT', phase: 'analytic', forms: { I: 'locate or distinguish what is inside', O: 'locate or distinguish what is outside', A: 'instantiate distinction' } },
    { id: 'ACTION', name: 'Action', family: 'action-projection', mirror: 'PROJECTION', phase: 'analytic', forms: { I: 'act upon the self', O: 'act from the self upon what is outside', A: 'instantiate action' } },
    { id: 'DIVISION', name: 'Division', family: 'division-multiplication', mirror: 'MULTIPLICATION', phase: 'analytic', forms: { I: 'remove or isolate the divided self', O: 'subdivide or pluralise what is observed', A: 'instantiate division' } },
    { id: 'CONNECTION', name: 'Connection', family: 'connection', mirror: 'CONNECTION', phase: 'bridge', forms: { I: 'form a centre, nexus, middle or hub', O: 'possess or hold in ownership', A: 'instantiate connection' } },
    { id: 'MULTIPLICATION', name: 'Multiplication', family: 'division-multiplication', mirror: 'DIVISION', phase: 'synthetic', forms: { I: 'support, sustain or heal from within', O: 'unfold, grow or blossom outward', A: 'instantiate multiplication' } },
    { id: 'PROJECTION', name: 'Projection', family: 'action-projection', mirror: 'ACTION', phase: 'synthetic', forms: { I: 'receive or project toward the self', O: 'project away from the self without bound', A: 'instantiate projection' } },
    { id: 'ENCOMPASSMENT', name: 'Encompassment', family: 'difference-encompassment', mirror: 'DIFFERENCE', phase: 'synthetic', forms: { I: 'push outward or expand from the inside', O: 'engulf or expand from the outside', A: 'instantiate encompassment' } },
    { id: 'COMPLETION', name: 'Completion', family: 'all-completion', mirror: 'ALL', phase: 'synthetic', forms: { I: 'become upright or virtuous within', O: 'become sturdy in outward form', A: 'instantiate completion' } }
  ];

  const REPLACEMENTS = new Map([
    ['unify the whole within', CATEGORIES[0].forms.I],
    ['include the surrounding field', CATEGORIES[0].forms.O],
    ['instantiate undivided totality', CATEGORIES[0].forms.A],
    ['differentiate within', CATEGORIES[1].forms.I],
    ['mark a boundary against the field', CATEGORIES[1].forms.O],
    ['mobilise an internal change', CATEGORIES[2].forms.I],
    ['act upon the surrounding field', CATEGORIES[2].forms.O],
    ['instantiate directed change', CATEGORIES[2].forms.A],
    ['separate internal parts', CATEGORIES[3].forms.I],
    ['partition outward relations', CATEGORIES[3].forms.O],
    ['instantiate separation', CATEGORIES[3].forms.A],
    ['integrate internal parts', CATEGORIES[4].forms.I],
    ['link external elements', CATEGORIES[4].forms.O],
    ['instantiate relation', CATEGORIES[4].forms.A],
    ['replicate an internal pattern', CATEGORIES[5].forms.I],
    ['amplify across the field', CATEGORIES[5].forms.O],
    ['instantiate proliferation', CATEGORIES[5].forms.A],
    ['model an outward possibility within', CATEGORIES[6].forms.I],
    ['express a pattern outward', CATEGORIES[6].forms.O],
    ['instantiate mapping', CATEGORIES[6].forms.A],
    ['contain plurality within a frame', CATEGORIES[7].forms.I],
    ['surround the field with context', CATEGORIES[7].forms.O],
    ['instantiate contextual containment', CATEGORIES[7].forms.A],
    ['close an internal sequence', CATEGORIES[8].forms.I],
    ['fulfil an external process', CATEGORIES[8].forms.O],
    ['instantiate closure', CATEGORIES[8].forms.A]
  ]);

  const correct = text => {
    let result = String(text);
    REPLACEMENTS.forEach((replacement, original) => {
      result = result.split(original).join(replacement);
    });
    return result;
  };

  const originalOperationClause = app.operationClause.bind(app);
  app.operationClause = function operationClauseWithFaithfulSemantics(...args) {
    return correct(originalOperationClause(...args));
  };

  const originalRenderTrial = app.renderTrial.bind(app);
  app.renderTrial = function renderTrialWithFaithfulSemantics(trial) {
    return correct(originalRenderTrial(trial));
  };

  if (window.__ontologyTestAPI) {
    window.__ontologyTestAPI.categories = JSON.parse(JSON.stringify(CATEGORIES));
    window.__ontologyTestAPI.semanticVocabulary = 'woodson-inner-outer-v1';
  }
});
