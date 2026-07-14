'use strict';

/*
 * Removes the obsolete blur-premise behaviour while preserving compatibility
 * with the minified base engine, which still probes the historical hide-text
 * element during initialisation.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const legacyControl = document.getElementById('hide-text');
  const premise = document.getElementById('premise-display');
  if (!app || !legacyControl || !premise) return;

  // Neutralise any legacy persisted value before visibility is reapplied.
  legacyControl.checked = false;
  legacyControl.disabled = true;
  premise.classList.remove('muted');

  try {
    const key = 'ontological_worlds_settings_v2';
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && Object.prototype.hasOwnProperty.call(saved, 'hideText')) {
      delete saved.hideText;
      localStorage.setItem(key, JSON.stringify(saved));
    }
  } catch (_) {}

  const baseSettings = app.settings.bind(app);
  app.settings = function settingsWithoutBlur() {
    const settings = baseSettings();
    delete settings.hideText;
    return settings;
  };

  app.applyPremiseVisibility = function applyAudioOnlyVisibility() {
    const audioOnly = Boolean(this.settings().audioOnly);
    premise.classList.toggle('hidden-mode', audioOnly);
    premise.classList.remove('muted');
    premise.setAttribute('aria-hidden', audioOnly ? 'true' : 'false');
  };

  app.applyPremiseVisibility();

  window.__audioOnlyDisplayTestAPI = {
    version: 1,
    blurControlRemoved: true,
    legacyControlHidden: legacyControl.hidden,
    settingsExcludeHideText: !Object.prototype.hasOwnProperty.call(app.settings(), 'hideText')
  };
});
