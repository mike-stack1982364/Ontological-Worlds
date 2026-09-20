'use strict';

// Speech is cancellable independently of the self-paced response lifecycle.
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  if (!app) return;
  let active = null;

  app.cancelSpeech = function() {
    const previous = active;
    active = null;
    previous?.finish(false);
    try { this.synth?.cancel(); } catch (_) {}
  };

  app.primeAudioFromUserGesture = function() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext && AudioContext) this.audioContext = new AudioContext();
      if (this.audioContext?.state === 'suspended') this.audioContext.resume().catch(() => {});
      this.synth?.resume();
      if (!this.running && this.synth && window.SpeechSynthesisUtterance) {
        const primer = new window.SpeechSynthesisUtterance(' ');
        primer.volume = 0;
        this.synth.speak(primer);
      }
    } catch (_) {}
  };

  const originalVisibility = app.applyPremiseVisibility.bind(app);
  app.applyPremiseVisibility = function() {
    originalVisibility();
    if (this._speechUnavailable || !this.synth || !window.SpeechSynthesisUtterance || this.settings().volume <= 0) {
      const premise = document.getElementById('premise-display');
      premise.classList.remove('hidden-mode', 'muted');
      premise.setAttribute('aria-hidden', 'false');
    }
  };

  app.speak = function(text, rate = null) {
    this.cancelSpeech();
    const settings = this.settings();
    if (!text || !this.synth || !window.SpeechSynthesisUtterance || settings.volume <= 0) {
      this._speechUnavailable = true;
      this.applyPremiseVisibility();
      return Promise.resolve(false);
    }
    const token = this.sessionToken, allowIdle = !this.running;
    this._speechUnavailable = false;
    this.applyPremiseVisibility();
    return new Promise(resolve => {
      let done = false, safety, poll;
      const utterance = new window.SpeechSynthesisUtterance(text);
      const item = { finish: success => {
        if (done) return;
        done = true;
        clearTimeout(safety);
        clearInterval(poll);
        if (active === item) active = null;
        this._speakInProgress = false;
        if (!success && (!this.running || (!this.paused && token === this.sessionToken))) {
          this._speechUnavailable = true;
          this.applyPremiseVisibility();
        }
        try { this.duckDelta(false); } catch (_) {}
        resolve(success);
      }};
      active = item;
      this._speakInProgress = true;
      utterance.voice = this.voice || this.synth.getVoices?.()[0] || null;
      utterance.lang = utterance.voice?.lang || 'en-AU';
      utterance.rate = Math.max(.1, Math.min(2, rate ?? settings.rate));
      utterance.volume = Math.max(0, Math.min(1, settings.volume));
      utterance.onstart = () => { if (active === item) this.duckDelta(true); };
      utterance.onend = () => item.finish(true);
      utterance.onerror = () => item.finish(false);
      const words = text.trim().split(/\s+/).length;
      // Nested Mode 2 worlds can take longer than 90 seconds at a slow rate.
      // Scale the stall watchdog to the complete utterance instead of cutting
      // off healthy speech at an unrelated fixed duration.
      safety = setTimeout(() => { if (active === item) this.cancelSpeech(); }, (words / utterance.rate * 700 + 1500) * 2.5);
      poll = setInterval(() => {
        if (active === item && !allowIdle && (token !== this.sessionToken || !this.running || this.paused)) this.cancelSpeech();
      }, 100);
      try { this.synth.resume(); this.synth.speak(utterance); } catch (_) { item.finish(false); }
    });
  };

  const originalStop = app.stop.bind(app);
  app.stop = function(...args) { this.cancelSpeech(); return originalStop(...args); };
  app.applyPremiseVisibility();
});
