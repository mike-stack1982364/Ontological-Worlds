'use strict';

/*
 * Ontological integration v4
 *
 * Design goals:
 * - Every spoken symbol is constitutively bound to its own ontology and form.
 * - Bare category names are the unmarked/archetypal form; only Inner and Outer
 *   are spoken.
 * - Premises use one fixed auditory grammar: NODE; DIRECTION to NODE.
 * - Relational load comes from simultaneous bindings, transformations,
 *   relations-between-relations, recursion and reification—not verbose prose.
 * - The exact renderTrial string remains the shared visible and spoken premise.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  if (!app) return;

  const DIRS = ['N', 'E', 'S', 'W'];
  const DIR_NAME = { N: 'north', E: 'east', S: 'south', W: 'west' };
  const SYMBOLS = 'BCDEFGHJKLMNOPQRSTUVWXYZ'.split('');
  const FORMS = { I: 'Inner', O: 'Outer', A: '' };
  const FORM_IDS = ['I', 'O', 'A'];
  const FORM_ORDERS = ['IOA', 'OIA', 'IAO', 'OAI', 'AIO', 'AOI'];

  /*
   * Source-faithful Inner/Outer meanings are retained for instruction and test
   * metadata. The 3 x 3 coordinates are an explicit computational
   * formalisation, not a claim that Woodson published this exact algebra.
   */
  const CATEGORIES = [
    {
      id: 'ALL', name: 'All', family: 'all-completion', mirror: 'COMPLETION',
      phase: 'analytic', coord: [-1, -1],
      meanings: { I: 'form a collection or whole', O: 'generate copies or likenesses', A: 'totality' }
    },
    {
      id: 'DIFFERENCE', name: 'Difference', family: 'difference-encompassment', mirror: 'ENCOMPASSMENT',
      phase: 'analytic', coord: [0, -1],
      meanings: { I: 'locate or distinguish what is inside', O: 'locate or distinguish what is outside', A: 'distinction' }
    },
    {
      id: 'ACTION', name: 'Action', family: 'action-projection', mirror: 'PROJECTION',
      phase: 'analytic', coord: [1, -1],
      meanings: { I: 'act upon the self', O: 'act from the self upon what is outside', A: 'action' }
    },
    {
      id: 'DIVISION', name: 'Division', family: 'division-multiplication', mirror: 'MULTIPLICATION',
      phase: 'analytic', coord: [-1, 0],
      meanings: { I: 'remove or isolate the divided self', O: 'subdivide or pluralise what is observed', A: 'division' }
    },
    {
      id: 'CONNECTION', name: 'Connection', family: 'connection', mirror: 'CONNECTION',
      phase: 'bridge', coord: [0, 0],
      meanings: { I: 'form a centre, nexus, middle or hub', O: 'possess or hold in ownership', A: 'connection' }
    },
    {
      id: 'MULTIPLICATION', name: 'Multiplication', family: 'division-multiplication', mirror: 'DIVISION',
      phase: 'synthetic', coord: [1, 0],
      meanings: { I: 'support, sustain or heal from within', O: 'unfold, grow or blossom outward', A: 'multiplication' }
    },
    {
      id: 'PROJECTION', name: 'Projection', family: 'action-projection', mirror: 'ACTION',
      phase: 'synthetic', coord: [-1, 1],
      meanings: { I: 'receive or project toward the self', O: 'project away from the self without bound', A: 'projection' }
    },
    {
      id: 'ENCOMPASSMENT', name: 'Encompassment', family: 'difference-encompassment', mirror: 'DIFFERENCE',
      phase: 'synthetic', coord: [0, 1],
      meanings: { I: 'push outward or expand from the inside', O: 'engulf or expand from the outside', A: 'encompassment' }
    },
    {
      id: 'COMPLETION', name: 'Completion', family: 'all-completion', mirror: 'ALL',
      phase: 'synthetic', coord: [1, 1],
      meanings: { I: 'become upright or virtuous within', O: 'become sturdy in outward form', A: 'completion' }
    }
  ];

  const BY_ID = new Map(CATEGORIES.map(item => [item.id, item]));
  const BY_COORD = new Map(CATEGORIES.map(item => [item.coord.join(','), item]));
  const category = id => {
    const item = BY_ID.get(id);
    if (!item) throw new Error(`Unknown ontology: ${id}`);
    return item;
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const canonical = values => values.map(value => String(value)).join('|');
  const opposite = direction => ({ N: 'S', S: 'N', E: 'W', W: 'E' })[direction];
  const rotateDirection = (direction, quarters) => DIRS[(DIRS.indexOf(direction) + quarters + 4) % 4];
  const turnIndex = (first, second) => (DIRS.indexOf(second) - DIRS.indexOf(first) + 4) % 4;
  const turn = (first, second) => ['SAME', 'RIGHT', 'REVERSE', 'LEFT'][turnIndex(first, second)];
  const directionTurn = direction => turn('N', direction);
  const mirrorCategory = id => category(id).mirror;
  const mirrorForm = form => (form === 'I' ? 'O' : form === 'O' ? 'I' : 'A');

  function stableHash(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
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

  /*
   * Form integration is order-independent: a direct Inner/Outer opposition
   * resolves to the unmarked relation; otherwise the unmarked form is neutral.
   */
  function composeForms(forms) {
    const unique = new Set(forms);
    if (unique.size === 1) return forms[0];
    if (unique.has('I') && unique.has('O')) return 'A';
    if (unique.has('I')) return 'I';
    if (unique.has('O')) return 'O';
    return 'A';
  }

  function ontologyLabel(categoryId, form = 'A') {
    const prefix = FORMS[form];
    return `${prefix ? `${prefix} ` : ''}${category(categoryId).name}`;
  }

  function nodePhrase(node) {
    return `${ontologyLabel(node.categoryId, node.form)} ${node.memory ? 'invention ' : ''}${node.symbol}`;
  }

  function descriptor(node, includeMemory = true) {
    return canonical([
      node.categoryId,
      node.form,
      includeMemory ? (node.memory?.canonicalDigest || node.memory?.digest || 'NEW') : 'SURFACE'
    ]);
  }

  function mirrorNode(node) {
    return {
      ...clone(node),
      categoryId: mirrorCategory(node.categoryId),
      form: mirrorForm(node.form),
      memory: null
    };
  }

  function effectiveNode(node) {
    if (!node.memory) {
      return { categoryId: node.categoryId, form: node.form };
    }
    return {
      categoryId: composeCategory(node.memory.categoryId, node.categoryId, 'SAME'),
      form: composeForms([node.memory.form, node.form])
    };
  }

  function composeNodeCategories(nodes, dirs, absoluteFirst = false) {
    const effective = nodes.map(effectiveNode);
    if (effective.length === 1) return effective[0].categoryId;
    let result = composeCategory(
      effective[0].categoryId,
      effective[1].categoryId,
      absoluteFirst ? directionTurn(dirs[0]) : 'SAME'
    );
    for (let index = 2; index < effective.length; index += 1) {
      result = composeCategory(result, effective[index].categoryId, turn(dirs[index - 2], dirs[index - 1]));
    }
    return result;
  }

  function composeNodeForms(nodes) {
    return composeForms(nodes.map(node => effectiveNode(node).form));
  }

  function distinctSymbols(count, excluded = []) {
    const blocked = new Set(excluded);
    return app.rng.shuffle(SYMBOLS.filter(symbol => !blocked.has(symbol))).slice(0, count);
  }

  function stripRuntimeFields(trial) {
    delete trial.isMatch;
    delete trial.scored;
    delete trial.started;
    delete trial._answered;
    return trial;
  }

  function rotateAll(dirs, quarters) {
    return dirs.map(direction => rotateDirection(direction, quarters));
  }

  function makeDirectionChain(count) {
    const result = [app.rng.pick(DIRS)];
    for (let index = 1; index < count; index += 1) {
      const quarter = app.nextTurnQuarter();
      result.push(rotateDirection(result[index - 1], quarter));
    }
    return result;
  }

  app.ontologyVersion = 4;
  app.categoryDeck = [];
  app.formDeck = [];
  app.turnDeck = [];

  app.nextCategory = function nextCategory(excluded = []) {
    const blocked = new Set(excluded);
    if (!this.categoryDeck.length) this.categoryDeck = this.rng.shuffle(CATEGORIES.map(item => item.id));
    let index = this.categoryDeck.findIndex(id => !blocked.has(id));
    if (index < 0) {
      this.categoryDeck = this.rng.shuffle(CATEGORIES.map(item => item.id));
      index = this.categoryDeck.findIndex(id => !blocked.has(id));
    }
    return this.categoryDeck.splice(index, 1)[0];
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

  app.nextTurnQuarter = function nextTurnQuarter(allowSame = true) {
    const allowed = allowSame ? [0, 1, 2, 3] : [1, 2, 3];
    if (!this.turnDeck.length) this.turnDeck = this.rng.shuffle([0, 1, 2, 3]);
    let index = this.turnDeck.findIndex(value => allowed.includes(value));
    if (index < 0) {
      this.turnDeck = this.rng.shuffle([0, 1, 2, 3]);
      index = this.turnDeck.findIndex(value => allowed.includes(value));
    }
    return this.turnDeck.splice(index, 1)[0];
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

  app.makePlainNodes = function makePlainNodes(count, fixedForms = null) {
    const symbols = distinctSymbols(count);
    const categories = [];
    const forms = [];
    return symbols.map((symbol, index) => {
      const categoryId = this.nextCategory(categories);
      categories.push(categoryId);
      const form = fixedForms ? fixedForms[index] : this.nextForm(index > 0 && this.rng.next() < 0.7 ? forms : []);
      forms.push(form);
      return { symbol, categoryId, form, memory: null };
    });
  };

  app.makeRecursiveNodes = function makeRecursiveNodes(count, probabilities, fixedForms = null, maxMemories = count) {
    const memories = [];
    const usedMemorySymbols = [];
    for (let index = 0; index < count; index += 1) {
      const probability = usedMemorySymbols.length >= maxMemories ? 0 : (probabilities[index] || 0);
      const memory = this.pickPrior(probability, usedMemorySymbols);
      memories.push(memory);
      if (memory) usedMemorySymbols.push(memory.symbol);
    }

    const newSymbols = distinctSymbols(memories.filter(memory => !memory).length, usedMemorySymbols);
    const categories = [];
    const forms = [];
    return memories.map((memory, index) => {
      const categoryId = this.nextCategory(categories);
      categories.push(categoryId);
      const form = fixedForms ? fixedForms[index] : this.nextForm(index > 0 && this.rng.next() < 0.7 ? forms : []);
      forms.push(form);
      return {
        symbol: memory?.symbol || newSymbols.shift(),
        categoryId,
        form,
        memory
      };
    });
  };

  app.buildInventionData = function buildInventionData(trial, categoryId, form) {
    const parents = trial.nodes.map(node => node.memory).filter(Boolean);
    const depth = Math.max(0, ...parents.map(memory => memory.depth || 1)) + 1;
    const parentDigests = parents.map(memory => memory.canonicalDigest || memory.digest);
    const topology = canonical([
      `M${trial.mode}`,
      ...(trial.turns || []),
      ...(trial.dirs || [])
    ]);
    const canonicalDigest = `V4-${stableHash(canonical([trial.signature, ...parentDigests, `D${depth}`]))}`;
    return {
      categoryId,
      form,
      topology,
      depth,
      digest: canonicalDigest,
      canonicalDigest,
      lineage: parents.map(memory => memory.symbol)
    };
  };

  app.deriveTrial = function deriveTrial(trial) {
    trial.nodes = trial.nodes || [];
    trial.symbols = trial.nodes.map(node => node.symbol);
    trial.turns = trial.dirs.length > 1
      ? trial.dirs.slice(1).map((direction, index) => turn(trial.dirs[index], direction))
      : [];

    if (trial.mode === 0) {
      trial.signature = canonical([
        'M0', descriptor(trial.nodes[0]), trial.dirs[0], descriptor(trial.nodes[1])
      ]);
      return trial;
    }

    if (trial.mode === 1) {
      trial.reverseNodes = [mirrorNode(trial.nodes[1]), mirrorNode(trial.nodes[0])];
      trial.reverseDir = opposite(trial.dirs[0]);
      const raw = canonical([
        descriptor(trial.nodes[0], false), trial.dirs[0], descriptor(trial.nodes[1], false)
      ]);
      const reversed = canonical([
        descriptor(trial.reverseNodes[0], false), trial.reverseDir, descriptor(trial.reverseNodes[1], false)
      ]);
      trial.signature = `M1|${raw < reversed ? raw : reversed}`;
      return trial;
    }

    if (trial.mode === 2) {
      trial.resultCategory = composeNodeCategories(trial.nodes, trial.dirs);
      trial.resultForm = composeNodeForms(trial.nodes);
      trial.signature = canonical([
        'M2', ...trial.nodes.map(node => descriptor(node)), ...trial.turns,
        trial.resultCategory, trial.resultForm
      ]);
      return trial;
    }

    if (trial.mode === 3) {
      const quarter = turnIndex(trial.dirs[0], trial.dirs[1]);
      trial.mappingQuarter = quarter;
      const raw = canonical([
        descriptor(trial.nodes[0], false), descriptor(trial.nodes[1], false), `Q${quarter}`
      ]);
      const swapped = canonical([
        descriptor(trial.nodes[2], false), descriptor(trial.nodes[3], false), `Q${(4 - quarter) % 4}`
      ]);
      trial.signature = `M3|${raw < swapped ? raw : swapped}`;
      return trial;
    }

    if (trial.mode === 4) {
      trial.resultCategory = composeNodeCategories(trial.nodes, trial.dirs);
      trial.resultForm = composeNodeForms(trial.nodes);
      trial.signature = canonical([
        'M4', ...trial.nodes.map(node => descriptor(node)), ...trial.turns,
        trial.resultCategory, trial.resultForm
      ]);
      return trial;
    }

    if (trial.mode === 5) {
      trial.effectiveNodes = trial.nodes.map(effectiveNode);
      trial.resultCategory = composeNodeCategories(trial.nodes, trial.dirs, true);
      trial.resultForm = composeNodeForms(trial.nodes);
      trial.signature = canonical([
        'M5', ...trial.nodes.map(node => descriptor(node)), trial.dirs[0],
        ...trial.effectiveNodes.flatMap(node => [node.categoryId, node.form]),
        trial.resultCategory, trial.resultForm
      ]);
      trial.inventionData = this.buildInventionData(trial, trial.resultCategory, trial.resultForm);
      return trial;
    }

    trial.effectiveNodes = trial.nodes.map(effectiveNode);
    const [first, middle, last] = trial.effectiveNodes;
    trial.leftRelationCategory = relationCategory(first.categoryId, middle.categoryId);
    trial.rightRelationCategory = relationCategory(middle.categoryId, last.categoryId);
    trial.relationSynthesisCategory = composeCategory(
      trial.leftRelationCategory,
      trial.rightRelationCategory,
      trial.turns[0]
    );
    trial.nodeSynthesisCategory = composeNodeCategories(trial.nodes, trial.dirs);
    trial.reifiedCategory = composeCategory(
      trial.nodeSynthesisCategory,
      trial.relationSynthesisCategory,
      trial.turns[0]
    );
    trial.resultForm = 'A';
    trial.transferCategory = mirrorCategory(trial.reifiedCategory);
    trial.transferForm = 'A';

    const memoryDigests = trial.nodes.map(node => node.memory?.canonicalDigest || node.memory?.digest || 'NEW');
    const raw = canonical([
      ...trial.nodes.map(node => descriptor(node)), ...trial.turns, ...memoryDigests,
      trial.leftRelationCategory, trial.rightRelationCategory,
      trial.relationSynthesisCategory, trial.nodeSynthesisCategory,
      trial.reifiedCategory, trial.transferCategory
    ]);

    let canonicalBody = raw;
    if (!trial.nodes.some(node => node.memory)) {
      const mirrored = canonical([
        ...trial.nodes.map(node => descriptor(mirrorNode(node))), ...trial.turns, ...memoryDigests,
        mirrorCategory(trial.leftRelationCategory), mirrorCategory(trial.rightRelationCategory),
        mirrorCategory(trial.relationSynthesisCategory), mirrorCategory(trial.nodeSynthesisCategory),
        mirrorCategory(trial.reifiedCategory), mirrorCategory(trial.transferCategory)
      ]);
      canonicalBody = raw < mirrored ? raw : mirrored;
    }

    trial.signature = `M6|${canonicalBody}`;
    trial.inventionData = this.buildInventionData(trial, trial.reifiedCategory, trial.resultForm);
    return trial;
  };

  app.makeBase = function makeBase(mode) {
    if (mode === 0 || mode === 1) {
      return this.deriveTrial({
        mode,
        nodes: this.makePlainNodes(2),
        dirs: [this.rng.pick(DIRS)]
      });
    }

    if (mode === 2) {
      return this.deriveTrial({
        mode,
        nodes: this.makePlainNodes(3),
        dirs: makeDirectionChain(2)
      });
    }

    if (mode === 3) {
      const source = this.makePlainNodes(2);
      const targetSymbols = distinctSymbols(2, source.map(node => node.symbol));
      const target = source.map((node, index) => ({
        ...mirrorNode(node),
        symbol: targetSymbols[index]
      }));
      const baseDirection = this.rng.pick(DIRS);
      const quarter = this.nextTurnQuarter(false);
      return this.deriveTrial({
        mode,
        nodes: [...source, ...target],
        dirs: [baseDirection, rotateDirection(baseDirection, quarter)]
      });
    }

    if (mode === 4) {
      return this.deriveTrial({
        mode,
        nodes: this.makePlainNodes(4),
        dirs: makeDirectionChain(3)
      });
    }

    if (mode === 5) {
      const nodes = this.makeRecursiveNodes(2, [0.48, 0.28]);
      const invention = this.chooseInventionSymbol(nodes.map(node => node.symbol));
      return this.deriveTrial({
        mode,
        nodes,
        dirs: [this.rng.pick(DIRS)],
        invention
      });
    }

    const forms = [...this.rng.pick(FORM_ORDERS)];
    const nodes = this.makeRecursiveNodes(3, [0.58, 0.34, 0.18], forms, 2);
    const invention = this.chooseInventionSymbol(nodes.map(node => node.symbol));
    return this.deriveTrial({
      mode,
      nodes,
      dirs: makeDirectionChain(2),
      invention
    });
  };

  app.renameSurfaceSymbols = function renameSurfaceSymbols(trial) {
    const fixed = trial.nodes.filter(node => node.memory).map(node => node.memory.symbol);
    const replacements = distinctSymbols(trial.nodes.filter(node => !node.memory).length, fixed);
    trial.nodes.forEach(node => {
      node.symbol = node.memory?.symbol || replacements.shift();
    });
    if (trial.mode >= 5) {
      trial.invention = this.chooseInventionSymbol(trial.nodes.map(node => node.symbol));
    }
  };

  app.surfaceVariant = function surfaceVariant(target) {
    const variant = stripRuntimeFields(clone(target));

    if (variant.mode === 0) {
      this.renameSurfaceSymbols(variant);
      return this.deriveTrial(variant);
    }

    if (variant.mode === 1) {
      if (this.rng.next() < 0.5) {
        variant.nodes = clone(variant.reverseNodes);
        variant.dirs = [variant.reverseDir];
      }
      this.renameSurfaceSymbols(variant);
      return this.deriveTrial(variant);
    }

    if (variant.mode === 2 || variant.mode === 4 || variant.mode === 6) {
      variant.dirs = rotateAll(variant.dirs, 1 + Math.floor(this.rng.next() * 3));
      if (variant.mode === 6 && !variant.nodes.some(node => node.memory) && this.rng.next() < 0.5) {
        variant.nodes = variant.nodes.map(mirrorNode);
      }
      this.renameSurfaceSymbols(variant);
      return this.deriveTrial(variant);
    }

    if (variant.mode === 3) {
      if (this.rng.next() < 0.5) {
        variant.nodes = [variant.nodes[2], variant.nodes[3], variant.nodes[0], variant.nodes[1]];
        variant.dirs = [variant.dirs[1], variant.dirs[0]];
      }
      variant.dirs = rotateAll(variant.dirs, 1 + Math.floor(this.rng.next() * 3));
      this.renameSurfaceSymbols(variant);
      return this.deriveTrial(variant);
    }

    this.renameSurfaceSymbols(variant);
    return this.deriveTrial(variant);
  };

  app.forceDifferentTrial = function forceDifferentTrial(trial, forbiddenSignature) {
    const candidate = stripRuntimeFields(clone(trial));
    for (let attempt = 0; attempt < 30; attempt += 1) {
      candidate.nodes[0].categoryId = this.nextCategory([candidate.nodes[0].categoryId]);
      if (candidate.mode === 3) {
        candidate.nodes[2].categoryId = mirrorCategory(candidate.nodes[0].categoryId);
        candidate.nodes[2].form = mirrorForm(candidate.nodes[0].form);
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
    while (this.inventionMemory.size > 18) {
      this.inventionMemory.delete(this.inventionMemory.keys().next().value);
    }
  };

  app.makeTrial = function makeTrial() {
    const mode = this.settings().mode;
    const candidateTarget = this.trials[this.trials.length - this.n];
    const target = candidateTarget?.mode === mode ? candidateTarget : null;
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
      } while (trial.signature === target.signature && attempts < 300);
      if (trial.signature === target.signature) trial = this.forceDifferentTrial(trial, target.signature);
    }

    trial.isMatch = isMatch;
    trial.scored = Boolean(target);
    this.rememberInvention(trial);
    return trial;
  };

  app.renderTrial = function renderTrial(trial) {
    const node = index => nodePhrase(trial.nodes[index]);
    const direction = index => DIR_NAME[trial.dirs[index]];

    if (trial.mode === 0) {
      return `${node(0)}; ${direction(0)} to ${node(1)}.`;
    }

    if (trial.mode === 1) {
      return `${node(0)}; ${direction(0)} to ${node(1)}. Reverse.`;
    }

    if (trial.mode === 2) {
      return `${node(0)}; ${direction(0)} to ${node(1)}; ${direction(1)} to ${node(2)}. Integrate as ${ontologyLabel(trial.resultCategory, trial.resultForm)}.`;
    }

    if (trial.mode === 3) {
      return `${node(0)}; ${direction(0)} to ${node(1)}. Equivalent: ${node(2)}; ${direction(1)} to ${node(3)}.`;
    }

    if (trial.mode === 4) {
      return `${node(0)}; ${direction(0)} to ${node(1)}; ${direction(1)} to ${node(2)}; ${direction(2)} to ${node(3)}. Compose as ${ontologyLabel(trial.resultCategory, trial.resultForm)}.`;
    }

    if (trial.mode === 5) {
      return `${node(0)}; ${direction(0)} to ${node(1)}. Name ${ontologyLabel(trial.resultCategory, trial.resultForm)} ${trial.invention}.`;
    }

    return `${node(0)}; ${direction(0)} to ${node(1)}; ${direction(1)} to ${node(2)}. Reify as ${ontologyLabel(trial.reifiedCategory, trial.resultForm)} ${trial.invention}. Reverse as ${ontologyLabel(trial.transferCategory, trial.transferForm)}.`;
  };

  const originalStart = app.start.bind(app);
  app.start = async function startWithFreshOntologyState() {
    this.categoryDeck = [];
    this.formDeck = [];
    this.turnDeck = [];
    this.inventionMemory.clear();
    return originalStart();
  };

  /* Replace the old verbose test utterance without touching the base engine. */
  const oldTestButton = document.getElementById('premise-test-btn');
  if (oldTestButton) {
    const testButton = oldTestButton.cloneNode(true);
    testButton.textContent = '🔊 Test compact premise';
    oldTestButton.replaceWith(testButton);
    testButton.addEventListener('click', event => {
      event.preventDefault();
      app.primeAudioFromUserGesture();
      app.speak('Inner Division U; east to Outer Multiplication M.');
    });
  }

  const failures = [];
  CATEGORIES.forEach(item => {
    if (mirrorCategory(mirrorCategory(item.id)) !== item.id) failures.push(`mirror:${item.id}`);
    if (composeCategory(item.id, mirrorCategory(item.id), 'SAME') !== 'CONNECTION') failures.push(`cancel:${item.id}`);
  });
  FORM_IDS.forEach(form => {
    if (mirrorForm(mirrorForm(form)) !== form) failures.push(`form:${form}`);
  });
  if (ontologyLabel('CONNECTION', 'A') !== 'Connection') failures.push('unmarked-form-label');
  ['makeTrial', 'renderTrial', 'nextTrial', 'speak', 'applyPremiseVisibility'].forEach(method => {
    if (typeof app[method] !== 'function') failures.push(`contract:${method}`);
  });
  if (failures.length) console.error('Ontological integration v4 self-test failed', failures);

  window.__ontologyTestAPI = {
    version: 4,
    categories: clone(CATEGORIES),
    composeCategory,
    relationCategory,
    mirrorCategory,
    mirrorForm,
    composeForms,
    ontologyLabel,
    nodePhrase,
    turn,
    selfTestPassed: failures.length === 0,
    premiseGrammar: 'NODE; DIRECTION to NODE',
    auditoryBannedTerms: ['Archetypal', 'connects', 'constrains', 'transforms', ' of ']
  };
});
