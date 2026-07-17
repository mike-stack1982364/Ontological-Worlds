'use strict';

/*
 * Public release gate.
 *
 * Modes 1 and 2 are selectable. Modes 3 through 7 remain dormant and cannot be
 * activated by persisted or programmatic settings through the live interface.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const select = document.getElementById('logic-mode');
  if (!app || !select) return;

  const ACTIVE_MODES = new Set([0, 1]);
  const normalise = value => ACTIVE_MODES.has(Number(value)) ? Number(value) : 0;
  select.value = String(normalise(select.value));

  [...select.options].forEach(option => {
    const active = ACTIVE_MODES.has(Number(option.value));
    option.disabled = !active;
    option.setAttribute('aria-disabled', active ? 'false' : 'true');
  });

  const baseSettings = app.settings.bind(app);
  app.settings = function settingsWithReleaseGate() {
    const settings = baseSettings();
    return { ...settings, mode: normalise(settings.mode) };
  };

  select.addEventListener('change', () => {
    select.value = String(normalise(select.value));
  });

  try {
    const key = 'ontological_worlds_settings_v2';
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && !ACTIVE_MODES.has(Number(saved.mode))) {
      saved.mode = 0;
      localStorage.setItem(key, JSON.stringify(saved));
    }
  } catch (_) {}

  app.updateLabels();
  app.saveSettings();

  window.__modeReleaseTestAPI = {
    version: 2,
    activeModes: [...ACTIVE_MODES],
    selectableModes: [...select.options].filter(option => !option.disabled).map(option => Number(option.value)),
    futureModesDisabled: [...select.options].slice(2).every(option => option.disabled)
  };
});
