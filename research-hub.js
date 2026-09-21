(function () {
  'use strict';
  const sources = ['research-relational-evidence.json', 'research-nback-evidence.json'];
  const modeNames = {mode1: 'Mode 1', mode2: 'Mode 2', nback: 'Other N-back', method: 'Da Vinci method'};
  const typeNames = {experiment: 'Experiment', observational: 'Observational study', 'meta-analysis': 'Meta-analysis', review: 'Review', theory: 'Theory'};
  const list = document.getElementById('study-list');
  const status = document.getElementById('load-status');
  const count = document.getElementById('results-count');
  const search = document.getElementById('research-search');
  const type = document.getElementById('evidence-type');
  const retry = document.getElementById('retry-load');
  const controls = document.getElementById('research-controls');
  let studies = [];
  let mode = 'all';
  let loading = false;
  let requestedStudy = '';
  try {
    const requested = new URL(window.location.href).searchParams.get('mode');
    if (Object.hasOwn(modeNames, requested)) mode = requested;
    requestedStudy = decodeURIComponent(window.location.hash.slice(1));
  } catch (_) { /* Filtering still works when URL parsing is unavailable. */ }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function sourceURL(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch (_) { return null; }
  }

  function validStudy(item) {
    const fields = ['id', 'title', 'authors', 'url', 'feature', 'positiveFinding', 'limitation', 'evidenceType', 'relevance'];
    return item && fields.every(key => typeof item[key] === 'string' && item[key].trim()) &&
      Number.isInteger(item.year) && item.year > 1900 && item.year < 2100 &&
      Array.isArray(item.modes) && item.modes.length > 0 &&
      item.modes.every(value => Object.hasOwn(modeNames, value)) && sourceURL(item.url);
  }

  function card(study) {
    const article = element('article', 'study-card');
    article.id = study.id;
    article.tabIndex = -1;
    const tags = element('div', 'study-tags');
    tags.append(element('span', 'study-tag evidence-type', typeNames[study.evidenceType] || study.evidenceType));
    tags.append(element('span', 'study-tag', study.relevance));
    study.modes.forEach(key => tags.append(element('span', 'study-tag', modeNames[key])));
    article.append(tags);
    const heading = element('h3');
    const link = element('a', '', study.title);
    link.href = sourceURL(study.url);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    heading.append(link);
    article.append(heading, element('p', 'study-citation', study.authors + ' · ' + study.year));
    const descriptions = element('dl');
    [['Finding', study.positiveFinding, ''], ['Connection to training', study.feature, ''], ['Study context', study.limitation, 'scope']].forEach(([label, value, className]) => {
      descriptions.append(element('dt', '', label), element('dd', className, value));
    });
    article.append(descriptions);
    const source = element('a', 'study-source', 'Read the original source ↗');
    source.href = sourceURL(study.url);
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.setAttribute('aria-label', 'Read the original source for ' + study.title + ' (opens a new tab)');
    article.append(source);
    return article;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const visible = studies.filter(study => (mode === 'all' || study.modes.includes(mode)) &&
      (type.value === 'all' || study.evidenceType === type.value) &&
      (!query || [study.title, study.authors, study.year, study.feature, study.positiveFinding, study.limitation, study.relevance].join(' ').toLocaleLowerCase().includes(query)));
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    const fragment = document.createDocumentFragment();
    visible.forEach(study => fragment.append(card(study)));
    if (studies.length && !visible.length) fragment.append(element('p', 'no-results', 'No studies match these filters. Try a broader word or reset the filters.'));
    list.replaceChildren(fragment);
    count.textContent = studies.length ? visible.length + ' of ' + studies.length + ' sources · ' + (modeNames[mode] || 'All research') : '';
  }

  function setMode(value) {
    mode = Object.hasOwn(modeNames, value) ? value : 'all';
    try {
      const url = new URL(window.location.href);
      if (mode === 'all') url.searchParams.delete('mode');
      else url.searchParams.set('mode', mode);
      window.history.replaceState(null, '', url);
    } catch (_) { /* Filtering does not depend on history access. */ }
    render();
  }

  function revealRequestedStudy() {
    if (!requestedStudy || !studies.some(study => study.id === requestedStudy)) return false;
    search.value = '';
    type.value = 'all';
    setMode('all');
    const target = document.getElementById(requestedStudy);
    if (!target || !target.classList.contains('study-card')) return false;
    try {
      const url = new URL(window.location.href);
      url.hash = requestedStudy;
      window.history.replaceState(null, '', url);
    } catch (_) { /* Revealing a source does not require history access. */ }
    target.focus({preventScroll: true});
    target.scrollIntoView({block: 'start'});
    requestedStudy = '';
    return true;
  }

  async function fetchCollection(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(path + '?v=20260921-transfer-mapping-1', {signal: controller.signal});
      if (!response.ok) throw new Error('Collection unavailable');
      const collection = await response.json();
      if (!collection || !Array.isArray(collection.studies) || !collection.studies.length || !collection.studies.every(validStudy)) throw new Error('Collection format unavailable');
      return collection.studies;
    } finally { clearTimeout(timer); }
  }

  async function load() {
    if (loading) return;
    loading = true;
    retry.hidden = true;
    status.classList.remove('error');
    status.textContent = 'Loading the research collection…';
    const results = await Promise.allSettled(sources.map(fetchCollection));
    const loaded = results.filter(result => result.status === 'fulfilled').flatMap(result => result.value);
    const seen = new Set();
    studies = loaded.filter(study => {
      if (seen.has(study.id)) return false;
      seen.add(study.id);
      return true;
    }).sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
    const failed = results.some(result => result.status === 'rejected');
    controls.hidden = !studies.length;
    status.classList.toggle('error', failed);
    status.textContent = failed ? (studies.length ? 'Part of the collection could not be loaded. The available studies are shown below; try again to load the rest.' : 'The research collection could not be loaded. Please check your connection and try again. The research overview above remains available.') : '';
    retry.hidden = !failed;
    loading = false;
    render();
    revealRequestedStudy();
  }

  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  document.querySelectorAll('[data-mode-link]').forEach(link => link.addEventListener('click', () => {
    search.value = '';
    type.value = 'all';
    setMode(link.dataset.modeLink);
  }));
  document.querySelectorAll('[data-study-link]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    requestedStudy = link.dataset.studyLink;
    if (!revealRequestedStudy() && !loading) load();
  }));
  search.addEventListener('input', render);
  type.addEventListener('change', render);
  document.getElementById('clear-filters').addEventListener('click', () => {
    search.value = '';
    type.value = 'all';
    setMode('all');
  });
  retry.addEventListener('click', load);
  load();
}());
