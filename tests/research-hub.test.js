'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const test = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..');
const files = ['research-relational-evidence.json', 'research-nback-evidence.json'];
const collections = Object.fromEntries(files.map(file => [file, JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))]));
const allStudies = files.flatMap(file => collections[file].studies);

async function waitFor(predicate, label, timeout = 3000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= end) throw new Error(`Timed out waiting for ${label}`);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

async function fixture(t, { url = 'https://research.test/research.html', fetchCollection } = {}) {
  const errors = [];
  const calls = [];
  const scrolled = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'research.html'), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''), {
    url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console
  });
  const { window } = dom;
  t.after(() => window.close());
  window.HTMLElement.prototype.scrollIntoView = function () { scrolled.push(this.id); };
  window.fetch = async (url, options) => {
    const filename = new URL(url, window.location.href).pathname.split('/').at(-1);
    calls.push(filename);
    const value = fetchCollection ? await fetchCollection(filename, calls, options) : collections[filename];
    return { ok: true, json: async () => JSON.parse(JSON.stringify(value)) };
  };
  window.eval(fs.readFileSync(path.join(root, 'research-hub.js'), 'utf8'));
  await waitFor(() => !window.document.getElementById('load-status').textContent.startsWith('Loading'), 'research collection');
  const byId = id => window.document.getElementById(id);
  const cards = () => Array.from(byId('study-list').querySelectorAll('.study-card'));
  function change(id, value, event = 'change') {
    byId(id).value = value;
    byId(id).dispatchEvent(new window.Event(event, { bubbles: true }));
  }
  return { window, byId, cards, change, calls, errors, scrolled };
}

test('research collections contain unique studies with complete HTTPS citations and load together', async t => {
  assert.ok(files.every(file => collections[file].studies.length > 0), 'both curated collections remain available');
  assert.equal(new Set(allStudies.map(study => study.id)).size, allStudies.length);
  for (const study of allStudies) {
    for (const field of ['id', 'title', 'authors', 'feature', 'positiveFinding', 'limitation', 'evidenceType', 'relevance']) {
      assert.equal(typeof study[field], 'string', `${study.id} ${field}`);
      assert.ok(study[field].trim());
    }
    assert.equal(new URL(study.url).protocol, 'https:');
    assert.ok(Number.isInteger(study.year));
    assert.ok(study.modes.length > 0);
  }
  const f = await fixture(t);
  assert.deepEqual(f.calls.sort(), [...files].sort());
  assert.equal(f.cards().length, allStudies.length);
  assert.ok(f.byId('results-count').textContent.startsWith(`${allStudies.length} of ${allStudies.length} sources`));
  assert.equal(f.byId('research-controls').hidden, false);
  assert.equal(f.byId('retry-load').hidden, true);
  for (const card of f.cards()) {
    for (const link of card.querySelectorAll('a')) {
      assert.equal(new URL(link.href).protocol, 'https:');
      assert.equal(link.target, '_blank');
      assert.ok(link.rel.includes('noopener'));
    }
  }
  assert.deepEqual(f.errors, []);
});

test('mode, search and evidence filters combine, empty results explain recovery, and reset clears them', async t => {
  const f = await fixture(t, { url: 'https://research.test/research.html?mode=mode2' });
  assert.equal(f.cards().length, allStudies.filter(study => study.modes.includes('mode2')).length);
  assert.equal(f.window.document.querySelector('[data-mode="mode2"]').getAttribute('aria-pressed'), 'true');
  f.window.document.querySelector('[data-mode="nback"]').click();
  assert.equal(new URL(f.window.location.href).searchParams.get('mode'), 'nback');
  f.change('evidence-type', 'meta-analysis');
  assert.equal(f.cards().length, allStudies.filter(study => study.modes.includes('nback') && study.evidenceType === 'meta-analysis').length);
  f.change('research-search', 'Working memory training revisited', 'input');
  assert.equal(f.cards().length, 1);
  assert.match(f.cards()[0].textContent, /Soveri/);
  f.change('research-search', 'unfindable-12345', 'input');
  assert.equal(f.cards().length, 0);
  assert.match(f.byId('study-list').textContent, /No studies match/);
  f.byId('clear-filters').click();
  assert.equal(f.cards().length, allStudies.length);
  assert.equal(f.byId('research-search').value, '');
  assert.equal(f.byId('evidence-type').value, 'all');
  assert.equal(new URL(f.window.location.href).searchParams.has('mode'), false);
  f.change('research-search', 'unfindable-12345', 'input');
  f.change('evidence-type', 'review');
  f.window.document.querySelector('[data-mode-link="method"]').click();
  assert.equal(f.cards().length, allStudies.filter(study => study.modes.includes('method')).length);
  assert.equal(f.byId('research-search').value, '');
  assert.equal(f.byId('evidence-type').value, 'all');
  assert.deepEqual(f.errors, []);
});

test('study content is rendered as text and duplicate IDs do not duplicate cards', async t => {
  const malicious = '<img src=x onerror="window.researchInjected=true"><script>window.researchInjected=true</script>';
  const changed = JSON.parse(JSON.stringify(collections));
  changed[files[0]].studies[0].title = malicious;
  changed[files[0]].studies[0].feature = malicious;
  changed[files[1]].studies.push(changed[files[0]].studies[0]);
  const f = await fixture(t, { fetchCollection: file => changed[file] });
  assert.equal(f.cards().length, allStudies.length);
  assert.ok(f.byId('study-list').textContent.includes(malicious));
  assert.equal(f.byId('study-list').querySelector('img,script,iframe'), null);
  assert.equal(f.window.researchInjected, undefined);
  assert.deepEqual(f.errors, []);
});

test('partial load keeps available studies usable and retry restores the missing collection without duplicates', async t => {
  let failing = true;
  const f = await fixture(t, { fetchCollection: file => {
    if (failing && file === files[1]) throw new Error('simulated offline collection');
    return collections[file];
  } });
  assert.equal(f.cards().length, collections[files[0]].studies.length);
  assert.match(f.byId('load-status').textContent, /Part of the collection/);
  assert.equal(f.byId('retry-load').hidden, false);
  assert.equal(f.byId('research-controls').hidden, false);
  f.window.document.querySelector('[data-mode="mode2"]').click();
  failing = false;
  f.byId('retry-load').click();
  await waitFor(() => f.byId('load-status').textContent === '', 'successful retry');
  assert.equal(f.calls.length, 4);
  assert.equal(f.cards().length, allStudies.filter(study => study.modes.includes('mode2')).length);
  assert.equal(f.window.document.querySelector('[data-mode="mode2"]').getAttribute('aria-pressed'), 'true');
  f.byId('clear-filters').click();
  assert.equal(f.cards().length, allStudies.length);
  assert.equal(f.byId('retry-load').hidden, true);
  assert.deepEqual(f.errors, []);
});

test('failed or unsafe collections expose retry and preserve the research overview', async t => {
  const unsafe = JSON.parse(JSON.stringify(collections));
  unsafe[files[0]].studies[0].url = 'javascript:window.researchInjected=true';
  unsafe[files[1]].studies[0].url = 'http://insecure.example/paper';
  const f = await fixture(t, { fetchCollection: file => unsafe[file] });
  assert.equal(f.cards().length, 0);
  assert.equal(f.byId('research-controls').hidden, true);
  assert.equal(f.byId('retry-load').hidden, false);
  assert.match(f.byId('load-status').textContent, /could not be loaded/);
  assert.ok(f.byId('mode-map-title').textContent);
  assert.ok(f.byId('method-title').textContent);
  assert.equal(f.window.researchInjected, undefined);
  assert.deepEqual(f.errors, []);
});

test('feature-map study links reveal their cited paper even when the current filters exclude it', async t => {
  const f = await fixture(t);
  const links = Array.from(f.window.document.querySelectorAll('[data-study-link]'));
  assert.ok(links.length > 0, 'feature-to-study map includes concrete citations');
  for (const link of links) {
    const id = link.dataset.studyLink;
    assert.ok(allStudies.some(study => study.id === id), `unknown mapped study ${id}`);
    f.change('research-search', 'unfindable-12345', 'input');
    f.change('evidence-type', 'review');
    assert.equal(f.cards().length, 0);
    link.click();
    const target = f.byId(id);
    assert.ok(target?.classList.contains('study-card'), `study ${id} is revealed`);
    assert.equal(f.byId('research-search').value, '');
    assert.equal(f.byId('evidence-type').value, 'all');
    assert.equal(f.window.document.activeElement, target);
    assert.ok(f.scrolled.includes(id));
    assert.equal(f.window.location.hash, '#' + id);
  }
  assert.deepEqual(f.errors, []);
});

test('research hub fits desktop and phone viewports and retains its top-right navigation', {
  skip: !process.env.CHROMIUM_EXECUTABLE_PATH && !process.env.RUN_RESEARCH_BROWSER
}, async t => {
  const { chromium } = require('playwright');
  const screenshotDirectory = '/tmp/research-browser-check';
  fs.mkdirSync(screenshotDirectory, { recursive: true });
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const filename = path.resolve(root, '.' + url.pathname);
    if (!filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(filename, (error, data) => {
      response.writeHead(error ? 404 : 200, {
        'Content-Type': filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : filename.endsWith('.json') ? 'application/json' : 'text/html'
      });
      response.end(error ? 'Not found' : data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  t.after(() => browser.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const width of [1280, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/research.html');
    await page.waitForFunction(expected => document.querySelectorAll('.study-card').length === expected, allStudies.length);
    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('.back-link').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1,
        navTop: nav.top, navRight: nav.right, width: innerWidth };
    });
    assert.equal(geometry.overflow, false, `${width}px research page overflows horizontally`);
    assert.ok(geometry.navTop < 80 && geometry.navRight > width / 2 && geometry.navRight <= width,
      `${width}px return link is at the top right`);
    await page.screenshot({ path: path.join(screenshotDirectory, `research-top-${width}.png`) });
    await page.locator('#research-controls').screenshot({ path: path.join(screenshotDirectory, `research-controls-${width}.png`) });
    await page.locator('[data-mode="mode2"]').click();
    assert.equal(await page.locator('.study-card').count(), allStudies.filter(study => study.modes.includes('mode2')).length);
    await page.locator('#research-search').fill('unfindable-12345');
    await page.locator('[data-study-link]').first().click();
    const studyId = await page.locator('[data-study-link]').first().getAttribute('data-study-link');
    const card = page.locator('#' + studyId);
    await card.screenshot({ path: path.join(screenshotDirectory, `research-study-${width}.png`) });
    assert.equal(await page.locator('#research-search').inputValue(), '');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.goto(base + '/index.html');
    await page.waitForFunction(() => window.__ontologicalWorlds?.__modeTwoFinalRuntimeV22);
    const launcher = await page.locator('#research-hub-link').boundingBox();
    assert.ok(launcher.y < 80 && launcher.x + launcher.width > width / 2 && launcher.x + launcher.width <= width,
      `${width}px main-game research link is at the top right`);
    await page.screenshot({ path: path.join(screenshotDirectory, `training-research-link-${width}.png`) });
    assert.deepEqual(errors, []);
    await page.close();
  }
});
