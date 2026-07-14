'use strict';

/*
 * Extends the response-window control to five minutes without changing the
 * response-timing engine. The engine already consumes seconds as milliseconds;
 * this layer only expands, clamps and formats the user-facing control.
 */
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  const slider = document.getElementById('spt-slider');
  const valueLabel = document.getElementById('spt-val');
  if (!app || !slider || !valueLabel) return;

  const MIN_SECONDS = 2;
  const MAX_SECONDS = 5 * 60;
  const STEP_SECONDS = 0.5;
  const clamp = value => Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, value));

  slider.min = String(MIN_SECONDS);
  slider.max = String(MAX_SECONDS);
  slider.step = String(STEP_SECONDS);
  slider.value = String(clamp(Number(slider.value) || 8));

  function formatClock(seconds) {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds - minutes * 60;
    const wholeSeconds = Math.floor(remainder);
    const fraction = Math.abs(remainder - wholeSeconds) >= 0.25 ? '.5' : '';
    return `${minutes}:${String(wholeSeconds).padStart(2, '0')}${fraction}`;
  }

  function formatAccessibleDuration(seconds) {
    if (seconds < 60) return `${seconds.toFixed(1)} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds - minutes * 60;
    const minuteText = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    if (remainder === 0) return minuteText;
    const secondText = `${remainder.toFixed(1)} ${remainder === 1 ? 'second' : 'seconds'}`;
    return `${minuteText} and ${secondText}`;
  }

  function updateResponseWindowLabel() {
    const seconds = clamp(Number(slider.value) || 8);
    if (Number(slider.value) !== seconds) slider.value = String(seconds);
    valueLabel.textContent = formatClock(seconds);
    slider.setAttribute('aria-valuetext', formatAccessibleDuration(seconds));
  }

  const baseUpdateLabels = app.updateLabels.bind(app);
  app.updateLabels = function updateLabelsWithLongResponseWindow() {
    baseUpdateLabels();
    updateResponseWindowLabel();
  };

  updateResponseWindowLabel();

  window.__responseWindowTestAPI = {
    version: 1,
    minSeconds: MIN_SECONDS,
    maxSeconds: MAX_SECONDS,
    stepSeconds: STEP_SECONDS,
    formatClock,
    formatAccessibleDuration
  };
});
