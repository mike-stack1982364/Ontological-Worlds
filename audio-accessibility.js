'use strict';

// Loaded after app.js. It hardens the existing engine without changing the
// relational generator: the response window opens only after the spoken
// premise finishes, and pause/resume preserves the current trial.
window.addEventListener('DOMContentLoaded', () => {
  const app = window.__ontologicalWorlds;
  if (!app) return;

  app._speakInProgress = false;
  app._responseDeadline = 0;
  app._responseRemaining = 0;
  app._pausedElapsed = 0;

  app.primeAudioFromUserGesture = function primeAudioFromUserGesture() {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.audioContext?.state === 'suspended') this.audioContext.resume().catch(() => {});
      if (this.audioContext) {
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        gain.gain.value = 0;
        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.01);
      }
    } catch (_) {}

    try {
      if (this.synth) {
        this.synth.cancel();
        this.synth.resume();
        const primer = new SpeechSynthesisUtterance(' ');
        primer.volume = 0;
        primer.rate = 1;
        this.synth.speak(primer);
      }
    } catch (_) {}
  };

  app.speak = function speak(text, rate = null) {
    return new Promise(resolve => {
      if (!this.synth || !text) { resolve(); return; }
      const settings = this.settings();
      if (settings.volume <= 0) { resolve(); return; }
      if (rate === null) rate = settings.rate;
      const token = this.sessionToken;
      const allowIdle = !this.running;

      try {
        if (this.synth.paused) this.synth.resume();
        this.synth.resume();
        if (this.synth.speaking && !this._speakInProgress) this.synth.cancel();
      } catch (_) {}

      const utterance = new SpeechSynthesisUtterance(text);
      this.voice = this.voice || (window.speechSynthesis?.getVoices?.() || [])[0] || null;
      if (this.voice) utterance.voice = this.voice;
      utterance.lang = this.voice?.lang || 'en-AU';
      utterance.rate = Math.max(0.1, Math.min(2, rate));
      utterance.pitch = 1;
      utterance.volume = Math.max(0, Math.min(1, settings.volume));

      let done = false;
      this._speakInProgress = true;
      const keepAudioAlive = () => {
        try {
          if (this.deltaNodes && this.audioContext?.state !== 'running') this.audioContext.resume();
        } catch (_) {}
      };
      const finish = () => {
        if (done) return;
        done = true;
        this._speakInProgress = false;
        clearTimeout(safety);
        clearInterval(poll);
        keepAudioAlive();
        try { this.duckDelta(false); } catch (_) {}
        resolve();
      };

      utterance.onstart = () => {
        keepAudioAlive();
        try { this.duckDelta(true); } catch (_) {}
      };
      utterance.onboundary = keepAudioAlive;
      utterance.onend = finish;
      utterance.onerror = finish;

      const words = text.trim().split(/\s+/).length;
      const estimatedMs = (words / Math.max(0.4, rate)) * 700 + 1500;
      const safety = setTimeout(() => {
        try { this.synth.cancel(); } catch (_) {}
        finish();
      }, Math.min(30000, estimatedMs * 2.5));

      const poll = setInterval(() => {
        keepAudioAlive();
        if (!allowIdle && (token !== this.sessionToken || !this.running || this.paused)) {
          try { this.synth.cancel(); } catch (_) {}
          finish();
        }
      }, 100);

      try { this.synth.speak(utterance); } catch (_) { finish(); }
    });
  };

  const originalMakeTrial = app.makeTrial.bind(app);
  app.makeTrial = function patchedMakeTrial() {
    const trial = originalMakeTrial();
    trial._answered = false;
    return trial;
  };

  const originalNextTrial = app.nextTrial.bind(app);
  app.nextTrial = async function patchedNextTrial(token) {
    await originalNextTrial(token);
    if (this.awaiting && this.current && !this.current._answered) {
      this._responseRemaining = this.settings().seconds * 1000;
      this._responseDeadline = performance.now() + this._responseRemaining;
    }
  };

  const originalAnswer = app.answer.bind(app);
  app.answer = function patchedAnswer(response) {
    if (this.running && !this.paused && this.awaiting && this.current) this.current._answered = true;
    return originalAnswer(response);
  };

  app._openResponseWindow = function openResponseWindow(milliseconds, preserveElapsed = false) {
    if (!this.running || this.paused || !this.current || this.current._answered) return;
    const duration = Math.max(1, milliseconds);
    this.awaiting = true;
    if (!preserveElapsed) this.current.started = performance.now();
    else this.current.started = performance.now() - this._pausedElapsed;
    this._responseRemaining = duration;
    this._responseDeadline = performance.now() + duration;
    document.getElementById('match-btn').disabled = false;
    document.getElementById('no-match-btn').disabled = false;
    const bar = document.getElementById('timer-bar');
    bar.style.transition = 'none';
    bar.style.width = `${100 * duration / (this.settings().seconds * 1000)}%`;
    requestAnimationFrame(() => {
      bar.style.transition = `width ${duration / 1000}s linear`;
      bar.style.width = '0%';
    });
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => this.answer(null), duration);
  };

  app._replayCurrentPremise = async function replayCurrentPremise() {
    if (!this.running || this.paused || !this.current || this.current._answered) return;
    const token = this.sessionToken;
    const text = this.renderTrial(this.current);

    // The exact same canonical string is exposed visually and audibly.
    const premise = document.getElementById('premise-display');
    premise.textContent = text;
    premise.setAttribute('aria-label', text);
    this.applyPremiseVisibility();
    await this.speak(text);

    if (!this.running || this.paused || token !== this.sessionToken || this.current._answered) return;
    this._openResponseWindow(this.settings().seconds * 1000, false);
  };

  app.togglePause = function togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    document.getElementById('paused-overlay').classList.toggle('show', this.paused);
    document.getElementById('pause-btn').textContent = this.paused ? 'Resume' : 'Pause';

    if (this.paused) {
      if (this.awaiting) {
        this._responseRemaining = Math.max(1, this._responseDeadline - performance.now());
        this._pausedElapsed = Math.max(0, performance.now() - this.current.started);
      }
      clearTimeout(this.timerId);
      try { this.synth?.cancel(); } catch (_) {}
      try { this.stopDelta(); } catch (_) {}
      return;
    }

    try { this.synth?.resume(); } catch (_) {}
    try { this.syncDelta(); } catch (_) {}
    if (this.awaiting && this.current && !this.current._answered) {
      this._openResponseWindow(this._responseRemaining, true);
    } else if (this.current && !this.current._answered) {
      this._replayCurrentPremise();
    } else {
      this.nextTrial(this.sessionToken);
    }
  };
});
