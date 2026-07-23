'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('extra-training-btn');
  if (!button) return;

  const style = document.createElement('style');
  style.textContent = `
    #extra-training-btn{
      min-height:56px!important;
      padding:12px 14px!important;
      border-radius:14px!important;
      border-width:2px!important;
      font-size:clamp(.9rem,2.4vw,1.15rem)!important;
      gap:10px!important;
      box-shadow:0 8px 18px rgba(18,79,140,.28)!important;
    }
    #extra-training-btn::after{
      font-size:1.7em!important;
      line-height:.7!important;
    }
  `;
  document.head.appendChild(style);

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
    version: 7,
    launcher: 'direct-page-navigation-half-size',
    destination,
    dedicatedScreen: true,
    positionalIdentity: true,
    digitRange: [1, 9],
    numbersPerTrial: [1, 2, 3],
    interferenceLevels: [0, 25, 50, 75, 100]
  };
});