'use strict';

(function installExtraTrainingLauncher() {
  var destination = 'extra-training.html';

  function navigate(event) {
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    if (window.location && typeof window.location.assign === 'function') {
      window.location.assign(destination);
    } else if (window.location) {
      window.location.href = destination;
    }
    return false;
  }

  // The button's inline handler calls this immediately, so navigation remains
  // independent of the main training runtime and its start-up state.
  window.openExtraTrainingScreenFallback = navigate;

  function bindLauncher() {
    var launcher = document.getElementById('extra-training-btn');
    if (!launcher) return;

    launcher.setAttribute('aria-label', 'Open dedicated Ordered Number N-back training screen');
    launcher.setAttribute('title', 'Open dedicated Ordered Number N-back training screen');
    launcher.onclick = navigate;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLauncher, { once: true });
  } else {
    bindLauncher();
  }

  window.__extraTrainingLauncher = {
    version: 1,
    destination: destination,
    directNavigation: true,
    dependencyIndependent: true
  };
})();
