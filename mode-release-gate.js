'use strict';

/*
 * Public release gate.
 *
 * Mode 1 is the only selectable mode in this release. The dormant engines are
 * retained for future development and regression testing, but persisted or
 * programmatic settings cannot activate them through the live application.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const select = document.getElementById('logic-mode');
  if (!app || !select) return;

  const ACTIVE_MODE = 0;
  select.value = String(ACTIVE_MODE);

  [...select.options].forEach(option => {
    const active = Number(option.value) === ACTIVE_MODE;
    option.disabled = !active;
    option.setAttribute('aria-disabled', active ? 'false' : 'true');
  });

  const baseSettings = app.settings.bind(app);
  app.settings = function settingsWithReleaseGate() {
    return { ...baseSettings(), mode: ACTIVE_MODE };
  };

  select.addEventListener('change', () => {
    if (Number(select.value) !== ACTIVE_MODE) select.value = String(ACTIVE_MODE);
  });

  try {
    const key = 'ontological_worlds_settings_v2';
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && saved.mode !== ACTIVE_MODE) {
      saved.mode = ACTIVE_MODE;
      localStorage.setItem(key, JSON.stringify(saved));
    }
  } catch (_) {}

  app.updateLabels();
  app.saveSettings();

  window.__modeReleaseTestAPI = {
    version: 1,
    activeMode: ACTIVE_MODE,
    selectableModes: [...select.options].filter(option => !option.disabled).map(option => Number(option.value)),
    futureModesDisabled: [...select.options].slice(1).every(option => option.disabled)
  };
});
