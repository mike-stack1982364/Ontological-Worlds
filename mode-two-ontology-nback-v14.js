'use strict';

(function loadModeTwoV21(root) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = require('./mode-two-engine-v21.js');
    return;
  }
  if (!root?.document) return;

  const loadScript = source => new Promise((resolve, reject) => {
    const script = root.document.createElement('script');
    script.src = source;
    script.async = false;
    script.onload = () => resolve(source);
    script.onerror = () => reject(new Error(`Unable to load ${source}.`));
    root.document.head.appendChild(script);
  });

  const start = root.document.getElementById('start-btn');
  if (start) start.disabled = true;

  root.__modeTwoV21Ready = loadScript('mode-two-engine-v21.js?v=20260804-1')
    .then(() => loadScript('mode-two-runtime-v21.js?v=20260804-1'))
    .catch(error => {
      root.__modeTwoV21LoadError = error;
      console.error('Mode 2 v21 failed to load.', error);
      const display = root.document.getElementById('premise-display');
      if (display) display.textContent = `MODE_2_LOAD_FAILED: ${error?.message || error}`;
      if (start) start.disabled = true;
      throw error;
    });
})(typeof window !== 'undefined' ? window : globalThis);
