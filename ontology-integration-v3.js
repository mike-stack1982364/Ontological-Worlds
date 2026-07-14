'use strict';

/*
 * Ontological integration v3
 *
 * Loaded after app.js and before audio-accessibility.js. It replaces only the
 * relational trial grammar. Session controls, scoring, visible premises,
 * speech synthesis, pause/resume, binaural audio and accessibility remain in
 * the existing engine. The exact string returned by renderTrial continues to
 * feed both the visible and spoken premise channels.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  if (!app) return;

  const DIRS = ['N', 'E', 'S', 'W'];
  const DIR_NAME = { N: 'North', E: 'East', S: 'South', W: 'West' };
  const SYMBOLS = 'BCDEFGHJKLMNOPQRSTUVWXYZ'.split('');
  const FORMS = { I: 'Inner', O: 'Outer', A: 'Archetypal' };
  const FORM_IDS = Object.keys(FORMS);
  const FORM_ORDERS = ['IOA', 'OIA', 'IAO', 'OAI', 'AIO', 'AOI'];

  /*
   * The 3 x 3 field makes the category system computationally composable.
   * A 180-degree mirror yields the established complementary pairs:
   * All/Completion, Difference/Encompassment, Action/Projection,
   * Division/Multiplication, with Connection self-mirroring.
   */
  const CATEGORIES = [
    { id: 'ALL', name: 'All', family: 'all-completion', mirror: 'COMPLETION', coord: [-1, -1], verbs: { I: 'unify the whole within', O: 'include the surrounding field', A: 'instantiate undivided totality' } },
    { id: 'DIFFERENCE', name: 'Difference', family: 'difference-encompassment', mirror: 'ENCOMPASSMENT', coord: [0, -1], verbs: { I: 'differentiate within', O: 'mark a boundary against the field', A: 'instantiate distinction' } },
    { id: 'ACTION', name: 'Action', family: 'action-projection', mirror: 'PROJECTION', coord: [1, -1], verbs: { I: 'mobilise an internal change', O: 'act upon the surrounding field', A: 'instantiate directed change' } },
    { id: 'DIVISION', name: 'Division', family: 'division-multiplication', mirror: 'MULTIPLICATION', coord: [-1, 0], verbs: { I: 'separate internal parts', O: 'partition outward relations', A: 'instantiate separation' } },
    { id: 'CONNECTION', name: 'Connection', family: 'connection', mirror: 'CONNECTION', coord: [0, 0], verbs: { I: 'integrate internal parts', O: 'link external elements', A: 'instantiate relation' } },
    { id: 'MULTIPLICATION', name: 'Multiplication', family: 'division-multiplication', mirror: 'DIVISION', coord: [1, 0], verbs: { I: 'replicate an internal pattern', O: 'amplify across the field', A: 'instantiate proliferation' } },
    { id: 'PROJECTION', name: 'Projection', family: 'action-projection', mirror: 'ACTION', coord: [-1, 1], verbs: { I: 'model an outward possibility within', O: 'express a pattern outward', A: 'instantiate mapping' } },
    { id: 'ENCOMPASSMENT', name: 'Encompassment', family: 'difference-encompassment', mirror: 'DIFFERENCE', coord: [0, 1], verbs: { I: 'contain plurality within a frame', O: 'surround the field with context', A: 'instantiate contextual containment' } },
    { id: 'COMPLETION', name: 'Completion', family: 'all-completion', mirror: 'ALL', coord: [1, 1], verbs: { I: 'close an internal sequence', O: 'fulfil an external process', A: 'instantiate closure' } }
  ];

  const BY_ID = new Map(CATEGORIES.map(item => [item.id, item]));
  const BY_COORD = new Map(CATEGORIES.map(item => [item.coord.join(','), item]));
  const category = id => {
    const item = BY_ID.get(id);
    if (!item) throw new Error(`Unknown ontology: ${id}`);
    return item;
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const canonical = values => values.map(String).join('|');
  const opposite = direction => ({ N: 'S', S: 'N', E: 'W', W: 'E' })[direction];
  const axis = direction => (direction === 'N' || direction === 'S' ? 'VERTICAL' : 'HORIZONTAL');
  const turn = (first, second) => ['SAME', 'RIGHT', 'REVERSE', 'LEFT'][(DIRS.indexOf(second) - DIRS.indexOf(first) + 4) % 4];
  const rotateDirection = (direction, quarters) => DIRS[(DIRS.indexOf(direction) + quarters + 4) % 4];
  const mirrorCategory = id => category(id).mirror;
  const mirrorForm = form => (form === 'I' ? 'O' : form === 'O' ? 'I' : 'A');

  function directionVector(direction) {
    return { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] }[direction];
  }

  function composeDirection(first, second) {
    const [ax, ay] = directionVector(first);
    const [bx, by] = directionVector(second);
    const x = ax + bx;
    const y = ay + by;
    if (x === 0 && y === 0) return 'BALANCE';
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'E' : 'W';
    if (Math.abs(y) > Math.abs(x)) return y > 0 ? 'N' : 'S';
    return `${y > 0 ? 'N' : 'S'}${x > 0 ? 'E' : 'W'}`;
  }

  function rotateCoord([x, y], relationTurn) {
    if (relationTurn === 'RIGHT') return [y, -x];
    if (relationTurn === 'REVERSE') return [-x, -y];
    if (relationTurn === 'LEFT') return [-y, x];
    return [x, y];
  }

  function coordCategory(x, y) {
    return (BY_COORD.get(`${Math.sign(x)},${Math.sign(y)}`) || category('CONNECTION')).id;
  }

  function composeCategory(firstId, secondId, relationTurn = 'SAME') {
    const [ax, ay] = category(firstId).coord;
    const [bx, by] = rotateCoord(category(secondId).coord, relationTurn);
    return coordCategory(ax + bx, ay + by);
  }

  function relationCategory(firstId, secondId) {
    const [ax, ay] = category(firstId).coord;
    const [bx, by] = category(secondId).coord;
    return coordCategory(bx - ax, by - ay);
  }

  function composeForms(first, second) {
    if (first === second) return first;
    const pair = [first, second].sort().join('');
    if (pair === 'IO') return 'A';
    if (pair === 'AI') return 'O';
    return 'I';
  }

  function distinctSymbols(count, excluded = []) {
    const blocked = new Set(excluded);
    return app.rng.shuffle(SYMBOLS.filter(symbol => !blocked.has(symbol))).slice(0, count);
  }

  app.ontologyVersion = 3;
  app.ontologyDeck = [];
  app.formDeck = [];

  app.nextOntology = function nextOntology(excluded = []) {
    const blocked = new Set(excluded);
    if (!this.ontologyDeck.length) this.ontologyDeck = this.rng.shuffle(CATEGORIES.map(item => item.id));
    let index = this.ontologyDeck.findIndex(id => !blocked.has(id));
    if (index < 0) {
      this.ontologyDeck = this.rng.shuffle(CATEGORIES.map(item => item.id));
      index = this.ontologyDeck.findIndex(id => !blocked.has(id));
    }
    return this.ontologyDeck.splice(index, 1)[0];
  };

  app.nextForm = function nextForm(excluded = []) {
    const blocked = new Set(excluded);
    if (!this.formDeck.length) this.formDeck = this.rng.shuffle(FORM_IDS);
    let index = this.formDeck.findIndex(id => !blocked.has(id));
    if (index < 0) {
      this.formDeck = this.rng.shuffle(FORM_IDS);
      index = this.formDeck.findIndex(id => !blocked.has(id));
    }
    return this.formDeck.splice(index, 1)[0];
  };

  app.pickPrior = function pickPrior(probability, excludedSymbols = []) {
    if (!this.inventionMemory.size || this.rng.next() >= probability) return null;
    const blocked = new Set(excludedSymbols);
    const choices = [...this.inventionMemory.values()].filter(memory => !blocked.has(memory.symbol));
    return choices.length ? clone(this.rng.pick(choices)) : null;
  };

  app.chooseInventionSymbol = function chooseInventionSymbol(excluded = []) {
    const blocked = new Set(excluded);
    const unused = SYMBOLS.filter(symbol => !blocked.has(symbol) && !this.inventionMemory.has(symbol));
    if (unused.length) return this.rng.pick(unused);
    const choices = SYMBOLS.filter(symbol => !blocked.has(symbol));
    const chosen = this.rng.pick(choices);
    this.inventionMemory.delete(chosen);
    return chosen;
  };

  app.effectiveCategory = function effectiveCategory(base, memory, relationTurn = 'SAME') {
    return memory ? composeCategory(memory.categoryId, base, relationTurn) : base;
  };

  app.buildInventionData = function buildInventionData(trial, categoryId, form, memoryDigests, canonicalDigest = null) {
    const parentDepth = Math.max(0, ...trial.memories.filter(Boolean).map(memory => memory.depth || 1));
    const topology = canonical([
      trial.turns?.join('>') || 'NONE',
      composeDirection(trial.dirs[0], trial.dirs[trial.dirs.length - 1])
    ]);
    const digest = canonical(['INV', categoryId, form, topology, `D${parentDepth + 1}`, ...memoryDigests]);
    return {
      categoryId,
      form,
      topology,
      depth: parentDepth + 1,
      digest,
      canonicalDigest: canonicalDigest || digest,
      lineage: trial.memories.filter(Boolean).map(memory => memory.symbol)
    };
  };

  app.deriveTrial = function deriveTrial(trial) {
    if (trial.mode === 0) {
      trial.signature = canonical(['M0', trial.category, trial.form, trial.dirs[0]]);
      return trial;
    }

    if (trial.mode === 1) {
      trial.reverseCategory = mirrorCategory(trial.category);
      trial.reverseForm = mirrorForm(trial.form);
      trial.signature = canonical([
        'M1', category(trial.category).family,
        [trial.form, trial.reverseForm].sort().join(''), axis(trial.dirs[0])
      ]);
      return trial;
    }

    if (trial.mode === 2) {
      trial.turns = [turn(trial.dirs[0], trial.dirs[1])];
      trial.resultCategory = composeCategory(trial.categories[0], trial.categories[1], trial.turns[0]);
      trial.resultForm = composeForms(trial.forms[0], trial.forms[1]);
      trial.signature = canonical([
        'M2', trial.categories[0], trial.forms[0], trial.categories[1], trial.forms[1],
        trial.turns[0], trial.resultCategory, trial.resultForm
      ]);
      return trial;
    }

    if (trial.mode === 3) {
      trial.targetCategory = mirrorCategory(trial.category);
      trial.targetForm = mirrorForm(trial.form);
      trial.turns = [turn(trial.dirs[0], trial.dirs[1])];
      trial.signature = canonical([
        'M3', category(trial.category).family,
        [trial.form, trial.targetForm].sort().join(''), axis(trial.dirs[0]), trial.turns[0]
      ]);
      return trial;
    }

    if (trial.mode === 4) {
      trial.turns = [
        turn(trial.dirs[0], trial.dirs[1]),
        turn(trial.dirs[1], trial.dirs[2]),
        turn(trial.dirs[2], trial.dirs[3])
      ];
      trial.intermediateCategory = composeCategory(trial.categories[0], trial.categories[1], trial.turns[0]);
      trial.intermediateForm = composeForms(trial.forms[0], trial.forms[1]);
      trial.resultCategory = composeCategory(trial.intermediateCategory, trial.categories[2], trial.turns[1]);
      trial.resultForm = composeForms(trial.intermediateForm, trial.forms[2]);
      trial.signature = canonical([
        'M4', ...trial.categories, ...trial.forms, ...trial.turns,
        trial.intermediateCategory, trial.intermediateForm, trial.resultCategory, trial.resultForm
      ]);
      return trial;
    }

    if (trial.mode === 5) {
      trial.turns = [turn(trial.dirs[0], trial.dirs[1]), turn(trial.dirs[1], trial.dirs[2])];
      trial.effectiveCategories = [
        this.effectiveCategory(trial.categories[0], trial.memories[0], trial.turns[0]),
        this.effectiveCategory(trial.categories[1], trial.memories[1], trial.turns[1])
      ];
      trial.resultCategory = composeCategory(trial.effectiveCategories[0], trial.effectiveCategories[1], trial.turns[0]);
      trial.resultForm = composeForms(trial.forms[0], trial.forms[1]);
      const memoryDigests = trial.memories.map(memory => memory?.digest || 'NEW');
      trial.signature = canonical([
        'M5', ...trial.categories, ...trial.forms, ...trial.turns, ...memoryDigests,
        ...trial.effectiveCategories, trial.resultCategory, trial.resultForm
      ]);
      trial.inventionData = this.buildInventionData(trial, trial.resultCategory, trial.resultForm, memoryDigests);
      return trial;
    }

    trial.turns = [turn(trial.dirs[0], trial.dirs[1]), turn(trial.dirs[1], trial.dirs[2])];
    trial.effectiveCategories = [
      this.effectiveCategory(trial.categories[0], trial.memories[0], trial.turns[0]),
      this.effectiveCategory(trial.categories[1], trial.memories[1], trial.turns[1])
    ];
    trial.synthesisCategory = composeCategory(trial.effectiveCategories[0], trial.effectiveCategories[1], trial.turns[0]);
    trial.relationCategory = relationCategory(trial.effectiveCategories[0], trial.effectiveCategories[1]);
    trial.reifiedCategory = composeCategory(trial.synthesisCategory, trial.relationCategory, trial.turns[1]);
    trial.resultForm = trial.forms[2];
    trial.transferCategory = mirrorCategory(trial.reifiedCategory);
    trial.transferForm = mirrorForm(trial.resultForm);

    const memoryDigests = trial.memories.map(memory => memory?.canonicalDigest || memory?.digest || 'NEW');
    const raw = canonical([
      ...trial.categories, ...trial.forms, ...trial.turns, ...memoryDigests,
      ...trial.effectiveCategories, trial.synthesisCategory, trial.relationCategory,
      trial.reifiedCategory, trial.resultForm, trial.transferCategory, trial.transferForm
    ]);
    const mirrored = canonical([
      ...trial.categories.map(mirrorCategory), ...trial.forms.map(mirrorForm), ...trial.turns, ...memoryDigests,
      ...trial.effectiveCategories.map(mirrorCategory), mirrorCategory(trial.synthesisCategory),
      mirrorCategory(trial.relationCategory), mirrorCategory(trial.reifiedCategory),
      mirrorForm(trial.resultForm), mirrorCategory(trial.transferCategory), mirrorForm(trial.transferForm)
    ]);
    trial.signature = `M6|${raw < mirrored ? raw : mirrored}`;
    trial.inventionData = this.buildInventionData(
      trial, trial.reifiedCategory, trial.resultForm, memoryDigests, trial.signature
    );
    return trial;
  };

  app.makeBase = function makeBase(mode) {
    if (mode === 0 || mode === 1) {
      return this.deriveTrial({
        mode,
        dirs: [this.rng.pick(DIRS)],
        symbols: distinctSymbols(2),
        category: this.nextOntology(),
        form: this.nextForm(),
        memories: []
      });
    }

    if (mode === 2) {
      const categories = [this.nextOntology(), null];
      categories[1] = this.nextOntology(categories);
      const forms = [this.nextForm(), null];
      forms[1] = this.nextForm(forms);
      return this.deriveTrial({
        mode,
        dirs: this.rng.shuffle(DIRS).slice(0, 2),
        symbols: distinctSymbols(3),
        categories,
        forms,
        memories: []
      });
    }

    if (mode === 3) {
      return this.deriveTrial({
        mode,
        dirs: this.rng.shuffle(DIRS).slice(0, 2),
        symbols: distinctSymbols(2),
        category: this.nextOntology(),
        form: this.nextForm(),
        memories: []
      });
    }

    if (mode === 4) {
      const categories = [this.nextOntology(), null, null];
      categories[1] = this.nextOntology(categories);
      categories[2] = this.nextOntology(categories);
      return this.deriveTrial({
        mode,
        dirs: this.rng.shuffle(DIRS),
        symbols: distinctSymbols(5),
        categories,
        forms: [...this.rng.pick(FORM_ORDERS)],
        memories: []
      });
    }

    const memoryA = this.pickPrior(mode === 5 ? 0.48 : 0.58);
    const memoryB = this.pickPrior(mode === 5 ? 0.22 : 0.32, memoryA ? [memoryA.symbol] : []);
    const categories = [this.nextOntology(), null];
    categories[1] = this.nextOntology(categories);
    const fixed = [memoryA?.symbol, memoryB?.symbol].filter(Boolean);
    const newSymbols = distinctSymbols(2, fixed);
    const operandA = memoryA?.symbol || newSymbols.shift();
    const operandB = memoryB?.symbol || newSymbols.shift();
    const invention = this.chooseInventionSymbol([operandA, operandB]);
    const forms = mode === 5
      ? (() => {
          const first = this.nextForm();
          return [first, this.nextForm([first])];
        })()
      : [...this.rng.pick(FORM_ORDERS)];

    return this.deriveTrial({
      mode,
      dirs: this.rng.shuffle(DIRS).slice(0, 3),
      symbols: [operandA, operandB, invention],
      categories,
      forms,
      memories: [memoryA, memoryB],
      invention
    });
  };

  app.renameSurfaceSymbols = function renameSurfaceSymbols(trial) {
    if (trial.mode < 5) {
      trial.symbols = distinctSymbols(trial.symbols.length);
      return;
    }
    const fixed = trial.memories.map(memory => memory?.symbol).filter(Boolean);
    const replacements = distinctSymbols(2, fixed);
    trial.symbols[0] = trial.memories[0]?.symbol || replacements.shift();
    trial.symbols[1] = trial.memories[1]?.symbol || replacements.shift();
    trial.invention = this.chooseInventionSymbol(trial.symbols.slice(0, 2));
    trial.symbols[2] = trial.invention;
  };

  app.surfaceVariant = function surfaceVariant(target) {
    const variant = clone(target);
    delete variant.isMatch;
    delete variant.scored;
    delete variant.started;
    delete variant._answered;
    this.renameSurfaceSymbols(variant);

    if (variant.mode === 0) return this.deriveTrial(variant);
    if (variant.mode === 1) {
      variant.dirs[0] = opposite(variant.dirs[0]);
      variant.symbols.reverse();
      variant.category = mirrorCategory(variant.category);
      variant.form = mirrorForm(variant.form);
      return this.deriveTrial(variant);
    }

    const quarters = variant.mode === 3 ? 2 : 1 + Math.floor(this.rng.next() * 3);
    variant.dirs = variant.dirs.map(direction => rotateDirection(direction, quarters));
    if (variant.mode === 3) {
      variant.category = mirrorCategory(variant.category);
      variant.form = mirrorForm(variant.form);
    }
    if (variant.mode === 6 && !variant.memories.some(Boolean) && this.rng.next() < 0.5) {
      variant.categories = variant.categories.map(mirrorCategory);
      variant.forms = variant.forms.map(mirrorForm);
    }
    return this.deriveTrial(variant);
  };

  app.forceDifferentTrial = function forceDifferentTrial(trial, forbiddenSignature) {
    const candidate = clone(trial);
    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (candidate.mode === 0) {
        candidate.category = this.nextOntology([candidate.category]);
      } else if (candidate.mode === 1 || candidate.mode === 3) {
        const family = category(candidate.category).family;
        candidate.category = this.nextOntology(CATEGORIES.filter(item => item.family === family).map(item => item.id));
      } else {
        candidate.categories[0] = this.nextOntology([candidate.categories[0]]);
      }
      this.deriveTrial(candidate);
      if (candidate.signature !== forbiddenSignature) return candidate;
    }
    throw new Error(`Unable to construct a non-match for mode ${candidate.mode}`);
  };

  app.rememberInvention = function rememberInvention(trial) {
    if (trial.mode < 5 || !trial.inventionData) return;
    const memory = {
      ...clone(trial.inventionData),
      symbol: trial.invention,
      createdAt: this.score.shown + 1
    };
    this.inventionMemory.delete(memory.symbol);
    this.inventionMemory.set(memory.symbol, memory);
    while (this.inventionMemory.size > 12) {
      this.inventionMemory.delete(this.inventionMemory.keys().next().value);
    }
  };

  app.makeTrial = function makeTrial() {
    const mode = this.settings().mode;
    const target = this.trials[this.trials.length - this.n];
    let trial;
    let isMatch = false;

    if (!target) {
      trial = this.makeBase(mode);
    } else if (this.rng.next() < this.settings().matchProbability) {
      trial = this.surfaceVariant(target);
      isMatch = true;
    } else {
      let attempts = 0;
      do {
        trial = this.makeBase(mode);
        attempts += 1;
      } while (trial.signature === target.signature && attempts < 250);
      if (trial.signature === target.signature) trial = this.forceDifferentTrial(trial, target.signature);
    }

    trial.isMatch = isMatch;
    trial.scored = Boolean(target);
    this.rememberInvention(trial);
    return trial;
  };

  app.operationClause = function operationClause(categoryId, form, symbol, from, to, memory = null) {
    const item = category(categoryId);
    const carrier = memory ? `prior invention ${symbol}` : symbol;
    return `${FORMS[form]} ${item.name} transforms ${carrier} by ${item.verbs[form]}, from ${DIR_NAME[from]} to ${DIR_NAME[to]}`;
  };

  app.renderTrial = function renderTrial(trial) {
    const symbols = trial.symbols;

    if (trial.mode === 0) {
      const item = category(trial.category);
      return `${FORMS[trial.form]} ${item.name} constrains ${symbols[0]} ${DIR_NAME[trial.dirs[0]]} of ${symbols[1]}: ${item.verbs[trial.form]}. Generate one relation satisfying both constraints.`;
    }

    if (trial.mode === 1) {
      const source = category(trial.category);
      const reverse = category(trial.reverseCategory);
      return `${FORMS[trial.form]} ${source.name} constrains ${symbols[0]} ${DIR_NAME[trial.dirs[0]]} of ${symbols[1]}: ${source.verbs[trial.form]}. Reverse it as ${FORMS[trial.reverseForm]} ${reverse.name}, with ${symbols[1]} ${DIR_NAME[opposite(trial.dirs[0])]} of ${symbols[0]}: ${reverse.verbs[trial.reverseForm]}. Hold both as one reversible structure.`;
    }

    if (trial.mode === 2) {
      const first = category(trial.categories[0]);
      const second = category(trial.categories[1]);
      const result = category(trial.resultCategory);
      return `${FORMS[trial.forms[0]]} ${first.name} constrains ${symbols[0]} ${DIR_NAME[trial.dirs[0]]} of ${symbols[1]}: ${first.verbs[trial.forms[0]]}. ${FORMS[trial.forms[1]]} ${second.name} constrains ${symbols[1]} ${DIR_NAME[trial.dirs[1]]} of ${symbols[2]}: ${second.verbs[trial.forms[1]]}. Integrate ${symbols[0]} to ${symbols[2]} as ${FORMS[trial.resultForm]} ${result.name}: ${result.verbs[trial.resultForm]}.`;
    }

    if (trial.mode === 3) {
      const source = category(trial.category);
      const target = category(trial.targetCategory);
      return `Transfer ${FORMS[trial.form]} ${source.name} through ${symbols[0]}, from ${DIR_NAME[trial.dirs[0]]} to ${DIR_NAME[trial.dirs[1]]}, into ${FORMS[trial.targetForm]} ${target.name} through ${symbols[1]}. Preserve the ${trial.turns[0].toLowerCase()}-turn topology and the ${source.name}-${target.name} invariant.`;
    }

    if (trial.mode === 4) {
      const clauses = trial.categories.map((id, index) => this.operationClause(
        id, trial.forms[index], symbols[index], trial.dirs[index], trial.dirs[index + 1]
      ));
      const result = category(trial.resultCategory);
      return `${clauses.join('. ')}. Compose all three operators as ${FORMS[trial.resultForm]} ${result.name} through ${symbols[4]}: ${result.verbs[trial.resultForm]}.`;
    }

    if (trial.mode === 5) {
      const first = this.operationClause(trial.categories[0], trial.forms[0], symbols[0], trial.dirs[0], trial.dirs[1], trial.memories[0]);
      const second = this.operationClause(trial.categories[1], trial.forms[1], symbols[1], trial.dirs[1], trial.dirs[2], trial.memories[1]);
      const result = category(trial.resultCategory);
      return `${first}. ${second}. Bind their ${FORMS[trial.resultForm]} ${result.name} composite as invention ${symbols[2]}. Preserve every inherited relation carried by any prior invention.`;
    }

    const first = this.operationClause(trial.categories[0], trial.forms[0], symbols[0], trial.dirs[0], trial.dirs[1], trial.memories[0]);
    const second = this.operationClause(trial.categories[1], trial.forms[1], symbols[1], trial.dirs[1], trial.dirs[2], trial.memories[1]);
    const synthesis = category(trial.synthesisCategory);
    const relation = category(trial.relationCategory);
    const reified = category(trial.reifiedCategory);
    const transfer = category(trial.transferCategory);
    return `${first}. ${second}. Synthesize ${FORMS[trial.forms[2]]} ${synthesis.name}, then reify the relation itself as ${FORMS[trial.resultForm]} ${reified.name}, governed by Archetypal ${relation.name}, in invention ${symbols[2]}. Finally reinterpret ${symbols[2]} as ${FORMS[trial.transferForm]} ${transfer.name} while preserving both turn relations and the complete inherited structure.`;
  };

  const originalStart = app.start.bind(app);
  app.start = async function startWithFreshOntologyState() {
    this.ontologyDeck = [];
    this.formDeck = [];
    this.inventionMemory.clear();
    return originalStart();
  };

  /* Algebraic and accessibility-contract self-checks. */
  const failures = [];
  CATEGORIES.forEach(item => {
    if (mirrorCategory(mirrorCategory(item.id)) !== item.id) failures.push(`mirror:${item.id}`);
    if (composeCategory(item.id, mirrorCategory(item.id), 'SAME') !== 'CONNECTION') failures.push(`cancel:${item.id}`);
  });
  FORM_IDS.forEach(form => {
    if (mirrorForm(mirrorForm(form)) !== form) failures.push(`form:${form}`);
  });
  ['makeTrial', 'renderTrial', 'nextTrial', 'speak', 'applyPremiseVisibility'].forEach(method => {
    if (typeof app[method] !== 'function') failures.push(`contract:${method}`);
  });
  if (failures.length) console.error('Ontological integration self-test failed', failures);

  window.__ontologyTestAPI = {
    categories: clone(CATEGORIES),
    composeCategory,
    relationCategory,
    mirrorCategory,
    mirrorForm,
    composeForms,
    turn,
    composeDirection,
    selfTestPassed: failures.length === 0
  };
});
