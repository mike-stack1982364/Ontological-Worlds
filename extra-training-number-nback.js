'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('extra-training-btn');
  if (!button) return;

  const style = document.createElement('style');
  style.textContent = `
    #extra-training-launcher-wrap{
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
    }
    #extra-training-launcher-wrap>label,
    #extra-training-launcher-help{
      align-self:stretch!important;
    }
    #extra-training-btn{
      width:50%!important;
      min-width:220px!important;
      max-width:460px!important;
      min-height:56px!important;
      padding:10px 14px!important;
      border-radius:11px!important;
      border-width:2px!important;
      font-size:clamp(.78rem,2vw,1rem)!important;
      line-height:1.15!important;
      gap:9px!important;
      letter-spacing:.04em!important;
      box-shadow:0 7px 17px rgba(18,79,140,.24)!important;
      margin-left:auto!important;
      margin-right:auto!important;
    }
    #extra-training-btn::after{
      font-size:1.3em!important;
      line-height:.8!important;
    }
    @media(max-width:560px){
      #extra-training-btn{
        width:50%!important;
        min-width:210px!important;
      }
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
  button.style.setProperty('cursor', 'pointer', 'important');

  button.addEventListener('click', navigate, true);
  button.addEventListener('pointerup', navigate, true);
  button.addEventListener('touchend', navigate, { capture: true, passive: false });
  button.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') navigate(event);
  }, true);

  window.__extraTrainingNumberNBack = {
    version: 8,
    launcher: 'direct-page-navigation-half-width-half-height',
    destination,
    dedicatedScreen: true,
    positionalIdentity: true,
    digitRange: [1, 9],
    numbersPerTrial: [1, 2, 3],
    interferenceLevels: [0, 25, 50, 75, 100]
  };
});