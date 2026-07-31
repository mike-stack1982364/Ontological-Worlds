'use strict';

(function installResponsePaletteV2(root) {
  if (!root?.document || root.__responsePaletteV2Installed) return;

  const PALETTE = Object.freeze({
    version: 3,
    statementYes: Object.freeze({
      keys: 'A · D · H',
      label: 'LIGHT BLUE = THIS STATEMENT MATCHES',
      background: '#D9F0FF',
      text: '#08385F',
      border: '#5AB5E6'
    }),
    statementNo: Object.freeze({
      keys: 'S · F · J',
      label: 'DARK BLUE = THIS STATEMENT DOES NOT MATCH',
      background: '#123A6D',
      text: '#FFFFFF',
      border: '#082A52'
    }),
    entailmentYes: Object.freeze({
      keys: 'K',
      label: 'LIGHT GREEN = STATEMENT 3 IS EXACTLY ENTAILED',
      background: '#DDF7E8',
      text: '#075A37',
      border: '#58B883'
    }),
    entailmentNo: Object.freeze({
      keys: 'L',
      label: 'DARK GREEN = STATEMENT 3 IS NOT ENTAILED',
      background: '#0B5D3B',
      text: '#FFFFFF',
      border: '#063B27'
    }),
    wholeYes: Object.freeze({
      keys: 'SPACEBAR',
      label: 'DEEP PURPLE = THE WHOLE TRIAD MATCHES',
      background: '#4C1D95',
      text: '#FFFFFF',
      border: '#2E1065'
    }),
    wholeNo: Object.freeze({
      keys: 'N',
      label: 'LIGHT PURPLE = THE WHOLE TRIAD DOES NOT MATCH',
      background: '#F1E4FF',
      text: '#6818A5',
      border: '#B96AF4'
    })
  });

  const styleRule = (selector, swatch) =>
    `${selector}{background:${swatch.background}!important;color:${swatch.text}!important;border:2px solid ${swatch.border}!important}`;

  const installStyles = documentObject => {
    if (documentObject.getElementById('response-palette-v2-style')) return;

    const style = documentObject.createElement('style');
    style.id = 'response-palette-v2-style';
    style.textContent = `
      ${styleRule(`
        .conflict-row[data-decision="0"] .conflict-choice[data-value="1"]:not(.feedback-correct):not(.feedback-incorrect),
        .conflict-row[data-decision="1"] .conflict-choice[data-value="1"]:not(.feedback-correct):not(.feedback-incorrect),
        .conflict-row[data-decision="2"] .conflict-choice[data-value="1"]:not(.feedback-correct):not(.feedback-incorrect)`, PALETTE.statementYes)}
      ${styleRule(`
        .conflict-row[data-decision="0"] .conflict-choice[data-value="0"]:not(.feedback-correct):not(.feedback-incorrect),
        .conflict-row[data-decision="1"] .conflict-choice[data-value="0"]:not(.feedback-correct):not(.feedback-incorrect),
        .conflict-row[data-decision="2"] .conflict-choice[data-value="0"]:not(.feedback-correct):not(.feedback-incorrect)`, PALETTE.statementNo)}
      ${styleRule('.conflict-row[data-decision="3"] .conflict-choice[data-value="1"]:not(.feedback-correct):not(.feedback-incorrect)', PALETTE.entailmentYes)}
      ${styleRule('.conflict-row[data-decision="3"] .conflict-choice[data-value="0"]:not(.feedback-correct):not(.feedback-incorrect)', PALETTE.entailmentNo)}
      ${styleRule('.conflict-row[data-decision="4"] .conflict-choice[data-value="1"]:not(.feedback-correct):not(.feedback-incorrect)', PALETTE.wholeYes)}
      ${styleRule('.conflict-row[data-decision="4"] .conflict-choice[data-value="0"]:not(.feedback-correct):not(.feedback-incorrect)', PALETTE.wholeNo)}

      ${styleRule('.matching-tutorial-key.green', PALETTE.statementYes)}
      ${styleRule('.matching-tutorial-key.statement-purple', PALETTE.statementNo)}
      ${styleRule('.matching-tutorial-key.icy-blue', PALETTE.entailmentYes)}
      ${styleRule('.matching-tutorial-key.ocean-blue', PALETTE.entailmentNo)}
      ${styleRule('.matching-tutorial-key.dark-purple', PALETTE.wholeYes)}
      ${styleRule('.matching-tutorial-key.light-purple', PALETTE.wholeNo)}
    `;
    documentObject.head.appendChild(style);
  };

  const LEGEND_BY_KEY = new Map([
    [PALETTE.statementYes.keys, PALETTE.statementYes],
    [PALETTE.statementNo.keys, PALETTE.statementNo],
    [PALETTE.entailmentYes.keys, PALETTE.entailmentYes],
    [PALETTE.entailmentNo.keys, PALETTE.entailmentNo],
    [PALETTE.wholeYes.keys, PALETTE.wholeYes],
    [PALETTE.wholeNo.keys, PALETTE.wholeNo]
  ]);

  const TEXT_REPLACEMENTS = Object.freeze([
    ['dark-ocean-blue L', 'dark-green L'],
    ['dark-ocean-blue', 'dark-green'],
    ['DARK OCEAN BLUE', 'DARK GREEN'],
    ['ocean-blue L', 'dark-green L'],
    ['dark-purple S, F and J', 'dark-blue S, F and J'],
    ['dark-purple S/F/J', 'dark-blue S/F/J'],
    ['dark-purple S, F or J', 'dark-blue S, F or J'],
    ['DARK PURPLE = THIS STATEMENT DOES NOT MATCH', 'DARK BLUE = THIS STATEMENT DOES NOT MATCH'],
    ['icy-blue K', 'light-green K'],
    ['icy-blue', 'light-green'],
    ['ICY BLUE', 'LIGHT GREEN'],
    ['Green A/D/H', 'Light-blue A/D/H'],
    ['green A, D or H', 'light-blue A, D or H'],
    ['GREEN = THIS STATEMENT MATCHES', 'LIGHT BLUE = THIS STATEMENT MATCHES'],
    ['green for a statement match', 'light blue for a statement match'],
    ['icy blue for correct entailment', 'light green for correct entailment'],
    ['Green A, D and H', 'Light-blue A, D and H'],
    ['green A/D/H', 'light-blue A/D/H']
  ]);

  const replaceTextNodes = (documentObject, rootElement) => {
    const walker = documentObject.createTreeWalker(rootElement, root.NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      let nextValue = node.nodeValue;
      TEXT_REPLACEMENTS.forEach(([from, to]) => {
        nextValue = nextValue.split(from).join(to);
      });
      if (nextValue !== node.nodeValue) node.nodeValue = nextValue;
    });
  };

  const synchroniseTutorial = documentObject => {
    const dialog = documentObject.getElementById('matching-tutorial-dialog');
    if (!dialog) return false;

    dialog.querySelectorAll('.matching-tutorial-key').forEach(card => {
      const key = card.querySelector('strong')?.textContent?.trim();
      const swatch = LEGEND_BY_KEY.get(key);
      if (!swatch) return;
      card.innerHTML = `<strong>${swatch.keys}</strong><br>${swatch.label}`;
      card.style.setProperty('background', swatch.background, 'important');
      card.style.setProperty('color', swatch.text, 'important');
      card.style.setProperty('border-color', swatch.border, 'important');
    });

    replaceTextNodes(documentObject, dialog);
    dialog.dataset.paletteVersion = String(PALETTE.version);
    return true;
  };

  const wrapTutorialOpen = documentObject => {
    const originalOpen = root.openMatchingTutorial;
    if (typeof originalOpen !== 'function' || originalOpen.__paletteSynchronised) return;

    const wrapped = function openMatchingTutorialWithCurrentPalette(...args) {
      synchroniseTutorial(documentObject);
      return originalOpen.apply(this, args);
    };
    wrapped.__paletteSynchronised = true;
    root.openMatchingTutorial = wrapped;
  };

  const initialise = () => {
    const documentObject = root.document;
    installStyles(documentObject);

    const completeSync = () => {
      const ready = synchroniseTutorial(documentObject);
      if (ready) wrapTutorialOpen(documentObject);
      return ready;
    };

    if (!completeSync()) {
      const observer = new root.MutationObserver(() => {
        if (completeSync()) observer.disconnect();
      });
      observer.observe(documentObject.body, { childList: true, subtree: true });
    }

    root.addEventListener?.('pageshow', completeSync);
    root.__responsePaletteV2Installed = true;
    root.__responsePaletteV2 = PALETTE;
  };

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})(typeof window !== 'undefined' ? window : globalThis);
