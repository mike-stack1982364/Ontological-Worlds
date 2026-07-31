'use strict';

(function installResponsePaletteV2(root) {
  if (!root?.document || root.__responsePaletteV2Installed) return;

  const PALETTE = Object.freeze({
    statementYes: Object.freeze({ background: '#D9F0FF', text: '#08385F', border: '#5AB5E6' }),
    statementNo: Object.freeze({ background: '#123A6D', text: '#FFFFFF', border: '#082A52' }),
    entailmentYes: Object.freeze({ background: '#DDF7E8', text: '#075A37', border: '#58B883' }),
    entailmentNo: Object.freeze({ background: '#0B5D3B', text: '#FFFFFF', border: '#063B27' })
  });

  const installStyles = documentObject => {
    if (documentObject.getElementById('response-palette-v2-style')) return;
    const style = documentObject.createElement('style');
    style.id = 'response-palette-v2-style';
    style.textContent = `
      .conflict-row[data-decision="0"] .conflict-choice[data-value="1"]:not(.feedback-correct):not(.feedback-incorrect),
      .conflict-row[data-decision="1"] .conflict-choice[data-value="1"]:not(.feedback-correct):not(.feedback-incorrect),
      .conflict-row[data-decision="2"] .conflict-choice[data-value="1"]:not(.feedback-correct):not(.feedback-incorrect){background:${PALETTE.statementYes.background}!important;color:${PALETTE.statementYes.text}!important;border:2px solid ${PALETTE.statementYes.border}!important}
      .conflict-row[data-decision="0"] .conflict-choice[data-value="0"]:not(.feedback-correct):not(.feedback-incorrect),
      .conflict-row[data-decision="1"] .conflict-choice[data-value="0"]:not(.feedback-correct):not(.feedback-incorrect),
      .conflict-row[data-decision="2"] .conflict-choice[data-value="0"]:not(.feedback-correct):not(.feedback-incorrect){background:${PALETTE.statementNo.background}!important;color:${PALETTE.statementNo.text}!important;border:2px solid ${PALETTE.statementNo.border}!important}
      .conflict-row[data-decision="3"] .conflict-choice[data-value="1"]:not(.feedback-correct):not(.feedback-incorrect){background:${PALETTE.entailmentYes.background}!important;color:${PALETTE.entailmentYes.text}!important;border:2px solid ${PALETTE.entailmentYes.border}!important}
      .conflict-row[data-decision="3"] .conflict-choice[data-value="0"]:not(.feedback-correct):not(.feedback-incorrect){background:${PALETTE.entailmentNo.background}!important;color:${PALETTE.entailmentNo.text}!important;border:2px solid ${PALETTE.entailmentNo.border}!important}
      .matching-tutorial-key.green{background:${PALETTE.statementYes.background}!important;color:${PALETTE.statementYes.text}!important;border-color:${PALETTE.statementYes.border}!important}
      .matching-tutorial-key.statement-purple{background:${PALETTE.statementNo.background}!important;color:${PALETTE.statementNo.text}!important;border-color:${PALETTE.statementNo.border}!important}
      .matching-tutorial-key.icy-blue{background:${PALETTE.entailmentYes.background}!important;color:${PALETTE.entailmentYes.text}!important;border-color:${PALETTE.entailmentYes.border}!important}
      .matching-tutorial-key.ocean-blue{background:${PALETTE.entailmentNo.background}!important;color:${PALETTE.entailmentNo.text}!important;border-color:${PALETTE.entailmentNo.border}!important}
    `;
    documentObject.head.appendChild(style);
  };

  const updateTutorialLabels = documentObject => {
    const dialog = documentObject.getElementById('matching-tutorial-dialog');
    if (!dialog) return false;

    const exactLegendUpdates = new Map([
      ['A · D · H', 'LIGHT BLUE = THIS STATEMENT MATCHES'],
      ['S · F · J', 'DARK BLUE = THIS STATEMENT DOES NOT MATCH'],
      ['K', 'LIGHT GREEN = STATEMENT 3 IS EXACTLY ENTAILED'],
      ['L', 'DARK GREEN = STATEMENT 3 IS NOT ENTAILED']
    ]);

    dialog.querySelectorAll('.matching-tutorial-key').forEach(card => {
      const key = card.querySelector('strong')?.textContent?.trim();
      const label = exactLegendUpdates.get(key);
      if (key && label) card.innerHTML = `<strong>${key}</strong><br>${label}`;
    });

    const replacements = [
      ['dark-ocean-blue L', 'dark-green L'],
      ['dark-ocean-blue', 'dark-green'],
      ['dark-purple S, F and J', 'dark-blue S, F and J'],
      ['dark-purple S/F/J', 'dark-blue S/F/J'],
      ['dark-purple S, F or J', 'dark-blue S, F or J'],
      ['icy-blue K', 'light-green K'],
      ['icy-blue', 'light-green'],
      ['Green A/D/H', 'Light-blue A/D/H'],
      ['green A, D or H', 'light-blue A, D or H'],
      ['green for a statement match', 'light blue for a statement match'],
      ['icy blue for correct entailment', 'light green for correct entailment']
    ];

    const walker = documentObject.createTreeWalker(dialog, root.NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let value = node.nodeValue;
      replacements.forEach(([from, to]) => { value = value.split(from).join(to); });
      node.nodeValue = value;
    });

    dialog.dataset.paletteVersion = '2';
    return true;
  };

  const initialise = () => {
    const documentObject = root.document;
    installStyles(documentObject);
    if (!updateTutorialLabels(documentObject)) {
      const observer = new root.MutationObserver(() => {
        if (updateTutorialLabels(documentObject)) observer.disconnect();
      });
      observer.observe(documentObject.body, { childList: true, subtree: true });
    }
    root.__responsePaletteV2Installed = true;
    root.__responsePaletteV2 = PALETTE;
  };

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})(typeof window !== 'undefined' ? window : globalThis);
