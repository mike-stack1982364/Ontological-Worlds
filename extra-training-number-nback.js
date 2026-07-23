'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('extra-training-btn');
  if (!button) return;

  const destination = 'extra-training.html';
  const navigate = event => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
    window.location.assign(destination);
  };

  button.setAttribute('aria-label', 'Open dedicated Ordered Number N-back training screen');
  button.setAttribute('title', 'Open dedicated Ordered Number N-back training screen');
  button.style.cursor = 'pointer';

  button.addEventListener('click', navigate, true);
  button.addEventListener('pointerup', navigate, true);
  button.addEventListener('touchend', navigate, { capture: true, passive: false });
  button.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') navigate(event);
  }, true);

  window.__extraTrainingNumberNBack = {
    version: 6,
    launcher: 'direct-page-navigation',
    destination,
    dedicatedScreen: true,
    positionalIdentity: true,
    digitRange: [1, 9],
    numbersPerTrial: [1, 2, 3],
    interferenceLevels: [0, 25, 50, 75, 100]
  };
});
