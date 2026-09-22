"use strict";
const DIRS = ["N", "E", "S", "W"],
  DIR_NAME = { N: "North", E: "East", S: "South", W: "West" },
  SYMBOLS = "BCDEFGHJKLMNOPQRSTUVWXYZ".split(""),
  ONTOLOGIES = [
    { name: "All", family: "all-completion" },
    { name: "Difference", family: "difference-encompassment" },
    { name: "Action", family: "action-projection" },
    { name: "Division", family: "division-multiplication" },
    { name: "Connection", family: "connection" },
    { name: "Multiplication", family: "division-multiplication" },
    { name: "Projection", family: "action-projection" },
    { name: "Encompassment", family: "difference-encompassment" },
    { name: "Completion", family: "all-completion" },
  ],
  FORMS = { I: "Inner", O: "Outer", A: "Archetypal" },
  FORM_ORDERS = ["IOA", "OIA", "IAO", "OAI", "AIO", "AOI"],
  MODE_NAMES = [
    "Relational reasoning",
    "Ontological Integration",
    "Triadic Composition",
    "Topological Equivalence",
    "Operator Composition",
    "Recursive Invention",
    "Ontological Parallax",
  ],
  SETTINGS_KEY = "ontological_worlds_settings_v2",
  HISTORY_KEY = "ontological_worlds_history_v2",
  $ = (t) => document.getElementById(t),
  clamp = (t, e, s) => Math.max(e, Math.min(s, t)),
  sleep = (t) => new Promise((e) => setTimeout(e, t));
class RNG {
  constructor(t = Date.now()) {
    this.s = t >>> 0;
  }
  next() {
    let t = (this.s += 1831565813);
    return (
      (t = Math.imul(t ^ (t >>> 15), 1 | t)),
      (t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)),
      ((t ^ (t >>> 14)) >>> 0) / 4294967296
    );
  }
  pick(t, e) {
    const s = void 0 === e ? t : t.filter((t) => t !== e);
    return s[Math.floor(this.next() * s.length)];
  }
  shuffle(t) {
    const e = [...t];
    for (let t = e.length - 1; t > 0; t--) {
      const s = Math.floor(this.next() * (t + 1));
      [e[t], e[s]] = [e[s], e[t]];
    }
    return e;
  }
}
function directionVector(t) {
  return { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] }[t];
}
function composeDirection(t, e) {
  const [s, i] = directionVector(t),
    [n, o] = directionVector(e),
    r = s + n,
    a = i + o;
  return 0 === r && 0 === a
    ? "BALANCE"
    : Math.abs(r) > Math.abs(a)
      ? r > 0
        ? "E"
        : "W"
      : Math.abs(a) > Math.abs(r)
        ? a > 0
          ? "N"
          : "S"
        : `${a > 0 ? "N" : "S"}${r > 0 ? "E" : "W"}`;
}
function opposite(t) {
  return { N: "S", S: "N", E: "W", W: "E" }[t];
}
function axis(t) {
  return "N" === t || "S" === t ? "VERTICAL" : "HORIZONTAL";
}
function turn(t, e) {
  const s = DIRS.indexOf(t);
  return ["SAME", "RIGHT", "REVERSE", "LEFT"][(DIRS.indexOf(e) - s + 4) % 4];
}
function distinctSymbols(t, e) {
  return t.shuffle(SYMBOLS).slice(0, e);
}
function pickVoice() {
  const t = window.speechSynthesis?.getVoices?.() || [],
    e = [
      /Google US English/i,
      /Samantha/i,
      /Karen/i,
      /Microsoft Aria/i,
      /Daniel/i,
      /^en-AU$/i,
      /^en-GB$/i,
      /^en-US$/i,
      /^en/i,
    ];
  for (const s of e) {
    const e = t.find((t) => s.test(t.name) || s.test(t.lang));
    if (e) return e;
  }
  return t[0] || null;
}
class OntologicalWorlds {
  constructor() {
    ((this.rng = new RNG()),
      (this.running = !1),
      (this.paused = !1),
      (this.sessionToken = 0),
      (this.history = []),
      (this.trials = []),
      (this.current = null),
      (this.awaiting = !1),
      (this.score = {
        hits: 0,
        misses: 0,
        falseAlarms: 0,
        correctRejects: 0,
        timeouts: 0,
        shown: 0,
        scored: 0,
      }),
      (this.rts = []),
      (this.n = 1),
      (this.startedAt = 0),
      (this.endsAt = 0),
      (this.timerId = null),
      (this.sessionTimerId = null),
      (this.sessionSettings = null),
      (this.sessionDurationMs = 0),
      (this.pauseStartedAt = null),
      (this.pausedDurationMs = 0),
      (this.stoppedAt = 0),
      (this._starting = false),
      (this._sessionSaved = false),
      (this._frozenControls = new Map()),
      (this.historyStorageError = ""),
      (this.synth = window.speechSynthesis || null),
      (this.voice = null),
      (this.audioContext = null),
      (this.deltaNodes = null),
      (this.inventionMemory = new Map()));
  }
  init() {
    (this.bindControls(),
      this.loadSettings(),
      this.loadHistory(),
      this.disableUnavailableAdaptiveControl(),
      (this.voice = pickVoice()),
      this.synth &&
        (this.synth.onvoiceschanged = () => {
          this.voice = pickVoice();
        }),
      this.updateLabels(),
      this.updateStats(),
      this.setStatus("SYSTEM_READY"),
      this.applyPremiseVisibility());
  }
  bindControls() {
    const pauseForRelacality = (event) => {
      if (event.type === "auxclick" && event.button !== 1) return;
      if (this.running && !this.paused) this.togglePause();
    };
    ($("start-btn").addEventListener("click", (t) => {
      (t.preventDefault(), this.primeAudioFromUserGesture(), this.start());
    }),
      $("pause-btn").addEventListener("click", () => this.togglePause()),
      $("stop-btn").addEventListener("click", () => this.stop(!0)),
      $("match-btn")?.addEventListener("click", () => this.answer(!0)),
      $("no-match-btn")?.addEventListener("click", () => this.answer(!1)),
      $("premise-test-btn").addEventListener("click", () => {
        if (this.running) return;
        (this.primeAudioFromUserGesture(),
          this.speak(
            Number($("logic-mode").value) === 1
              ? "Outer Connection H is south of Projection D. Outer Projection D is south of Multiplication C. Candidate: Projection C is north of Inner Division H."
              : "A is north of B. B is north of C. Candidate: A is north of C.",
          ));
      }),
      $("tutorial-btn").addEventListener("click", () =>
        this.openModal("tutorial"),
      ),
      $("history-btn").addEventListener("click", () => this.showHistory()),
      $("research-hub-link")?.addEventListener("click", () => {
        if (this.running && !this.paused) this.togglePause();
      }),
      $("relacality-portal-link")?.addEventListener("click", pauseForRelacality),
      $("relacality-portal-link")?.addEventListener("auxclick", pauseForRelacality),
      $("dismiss-tutorial").addEventListener("click", () =>
        this.closeModal("tutorial"),
      ),
      $("dismiss-history").addEventListener("click", () =>
        this.closeModal("history"),
      ),
      $("clear-btn").addEventListener("click", () => {
        this.clearHistory();
      }),
      $("export-btn").addEventListener("click", () => this.exportHistory()),
      $("paused-overlay").addEventListener("click", () => this.togglePause()),
      document.querySelectorAll("input, select").forEach((t) => {
        (t.addEventListener("change", () => {
          (this.updateLabels(),
            this.saveSettings(),
            this.applyPremiseVisibility(),
            this.syncDelta());
        }),
          t.addEventListener("input", () => {
            (this.updateLabels(), this.saveSettings(), this.setDeltaVolume());
          }));
      }),
      document
        .querySelectorAll(".modal-close")
        .forEach((t) =>
          t.addEventListener("click", () => this.closeModal(t.dataset.close)),
        ),
      document.addEventListener("keydown", (t) => {
        if (t.repeat || t.ctrlKey || t.metaKey || t.altKey) return;
        if (t.key === " " && t.target?.closest?.("button, a[href], summary")) return;
        if (
          t.target?.isContentEditable ||
          t.target?.closest?.('[contenteditable="true"]')
        )
          return;
        const modal = document.querySelector(".modal.show");
        const tutorial = document.querySelector(
          "#matching-tutorial-dialog:not([hidden])",
        );
        if (modal || tutorial) {
          if (modal && t.key === "Escape") {
            t.preventDefault();
            this.closeModal(modal.id);
          }
          return;
        }
        /INPUT|SELECT|TEXTAREA/.test(t.target?.tagName || "") ||
          (" " !== t.key ||
            this.running ||
            (t.preventDefault(),
            this.primeAudioFromUserGesture(),
            this.start()),
          "p" === t.key.toLowerCase() &&
            this.running &&
            (t.preventDefault(), this.togglePause()),
          "Escape" === t.key && this.running && this.stop(!0),
          $("keyboard").checked &&
            this.awaiting &&
            (["f", "j"].includes(t.key.toLowerCase()) && this.answer(!0),
            ["d", "k"].includes(t.key.toLowerCase()) && this.answer(!1)));
      }),
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && this.running && !this.paused) {
          try {
            this.synth?.resume();
          } catch (t) {}
          try {
            this.audioContext?.resume();
          } catch (t) {}
        }
      }));
  }
  settings() {
    return {
      mode:
        this.running && this.sessionSettings
          ? this.sessionSettings.mode
          : Number($("logic-mode").value),
      n:
        this.running && this.sessionSettings
          ? this.sessionSettings.n
          : Number($("n-slider").value),
      minutes:
        this.running && this.sessionSettings
          ? this.sessionSettings.minutes
          : Number($("session-slider").value),
      matchProbability: Number($("prob-slider").value) / 100,
      rate: Number($("rate-slider").value),
      volume: Number($("premise-vol").value) / 100,
      audioOnly: $("audio-only").checked,
      hideText: $("hide-text").checked,
      keyboard: $("keyboard").checked,
      haptic: $("haptic").checked,
      adaptive: false,
      delta: $("delta-bg").checked,
      deltaVolume: Number($("delta-vol").value) / 100,
      speechBoost: Number($("speech-boost").value) / 100,
    };
  }
  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings()));
    } catch (t) {}
  }
  loadSettings() {
    let t = null;
    try {
      t = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    } catch (t) {}
    if (!t) return;
    const e = (t, e) => {
        void 0 !== e && $(t) && ($(t).value = e);
      },
      s = (t, e) => {
        void 0 !== e && $(t) && ($(t).checked = !!e);
      };
    (e("logic-mode", [0, 1].includes(Number(t.mode)) ? Number(t.mode) : 0),
      e("n-slider", t.n),
      e("session-slider", t.minutes),
      e("prob-slider", Math.round(100 * (t.matchProbability ?? 0.35))),
      e("rate-slider", t.rate),
      e("premise-vol", Math.round(100 * (t.volume ?? 0.7))),
      e("delta-vol", Math.round(100 * (t.deltaVolume ?? 0.35))),
      e("speech-boost", Math.round(100 * (t.speechBoost ?? 1.4))),
      s("audio-only", t.audioOnly),
      s("hide-text", false),
      s("keyboard", t.keyboard),
      s("haptic", t.haptic),
      s("adaptive", t.adaptive),
      s("delta-bg", t.delta));
  }
  disableUnavailableAdaptiveControl() {
    const control = $("adaptive");
    if (!control) return;
    control.checked = false;
    control.disabled = true;
    control.setAttribute("aria-describedby", "adaptive-help");
    if (!$("adaptive-help")) {
      const help = document.createElement("p");
      help.id = "adaptive-help";
      help.textContent =
        "Adaptive N is unavailable. Select your N-back level before starting a session.";
      control.closest(".control-group")?.appendChild(help);
    }
  }
  updateLabels() {
    const t = this.settings();
    $("n-slider").setAttribute("aria-valuetext", `N-back level ${t.n}`);
    (($("n-val").textContent = t.n),
      ($("session-val").textContent = `${t.minutes} MIN`),
      ($("prob-val").textContent = `${Math.round(100 * t.matchProbability)}%`),
      ($("rate-val").textContent = `${t.rate.toFixed(2)}x`),
      ($("premise-vol-val").textContent = `${Math.round(100 * t.volume)}%`),
      ($("delta-vol-val").textContent = `${Math.round(100 * t.deltaVolume)}%`),
      ($("speech-boost-val").textContent =
        `${Math.round(100 * t.speechBoost)}%`),
      ($("premise-vol-meter").style.width = `${Math.round(100 * t.volume)}%`));
    const hint = $("kbd-hint");
    (hint && (hint.style.display = t.keyboard ? "block" : "none"),
      ($("hide-text").disabled = t.audioOnly));
  }
  applyPremiseVisibility() {
    const t = this.settings(),
      e = $("premise-display");
    const speechAvailable = Boolean(
      this.synth &&
      typeof window.SpeechSynthesisUtterance === "function" &&
      t.volume > 0,
    );
    const hideForAudio = t.audioOnly && speechAvailable;
    e.classList.toggle("hidden-mode", hideForAudio);
    e.classList.toggle("muted", !t.audioOnly && t.hideText);
    e.setAttribute("aria-hidden", hideForAudio ? "true" : "false");
    let note = $("audio-fallback-note");
    if (!note && t.audioOnly && !speechAvailable) {
      note = document.createElement("p");
      note.id = "audio-fallback-note";
      note.setAttribute("role", "status");
      note.textContent =
        "Speech is unavailable or muted; premises remain visible.";
      $("audio-only")?.closest(".control-group")?.appendChild(note);
    }
    if (note) note.hidden = !t.audioOnly || speechAvailable;
  }
  primeAudioFromUserGesture() {
    try {
      if (!this.audioContext) {
        const t = window.AudioContext || window.webkitAudioContext;
        t && (this.audioContext = new t());
      }
      (this.audioContext?.resume(), this.synth?.paused && this.synth.resume());
      const t = new SpeechSynthesisUtterance(" ");
      ((t.volume = 0), this.synth?.speak(t));
    } catch (t) {}
  }
  async speak(t) {
    const e = this.settings();
    if (!this.synth || e.volume <= 0) return;
    try {
      (this.synth.cancel(), this.synth.resume());
    } catch (t) {}
    const s = new SpeechSynthesisUtterance(t);
    ((this.voice = this.voice || pickVoice()),
      this.voice && (s.voice = this.voice),
      (s.lang = this.voice?.lang || "en-AU"),
      (s.rate = clamp(e.rate, 0.25, 2)),
      (s.pitch = 1),
      (s.volume = clamp(e.volume, 0, 1)),
      this.duckDelta(!0),
      (s.onend = () => this.duckDelta(!1)),
      (s.onerror = () => this.duckDelta(!1)),
      this.synth.speak(s));
  }
  syncDelta() {
    const t = this.settings().delta && this.running && !this.paused;
    (t && !this.deltaNodes && this.startDelta(),
      !t && this.deltaNodes && this.stopDelta());
  }
  startDelta() {
    if (
      (this.primeAudioFromUserGesture(), !this.audioContext || this.deltaNodes)
    )
      return;
    const t = this.audioContext,
      e = t.createGain(),
      s = t.createOscillator(),
      i = t.createOscillator(),
      n = t.createChannelMerger(2),
      o = t.createGain(),
      r = t.createGain();
    ((s.type = i.type = "sine"),
      (s.frequency.value = 110),
      (i.frequency.value = 111),
      (o.gain.value = r.gain.value = 0.18),
      s.connect(o).connect(n, 0, 0),
      i.connect(r).connect(n, 0, 1),
      n.connect(e).connect(t.destination),
      (e.gain.value = this.settings().deltaVolume),
      s.start(),
      i.start(),
      (this.deltaNodes = {
        left: s,
        right: i,
        master: e,
        merger: n,
        lg: o,
        rg: r,
      }));
  }
  stopDelta() {
    if (this.deltaNodes) {
      try {
        (this.deltaNodes.left.stop(), this.deltaNodes.right.stop());
      } catch (t) {}
      (Object.values(this.deltaNodes).forEach((t) => {
        try {
          t.disconnect?.();
        } catch (t) {}
      }),
        (this.deltaNodes = null));
    }
  }
  setDeltaVolume() {
    this.deltaNodes &&
      this.deltaNodes.master.gain.setTargetAtTime(
        this.settings().deltaVolume,
        this.audioContext.currentTime,
        0.08,
      );
  }
  duckDelta(t) {
    if (!this.deltaNodes) return;
    const e = this.settings().deltaVolume,
      s = t ? e / Math.max(1, this.settings().speechBoost) : e;
    this.deltaNodes.master.gain.setTargetAtTime(
      s,
      this.audioContext.currentTime,
      0.06,
    );
  }
  async start() {
    if (this.running) return;
    this.sessionSettings = { ...this.settings() };
    this.sessionDurationMs = Math.max(
      60000,
      this.sessionSettings.minutes * 60000,
    );
    this.pauseStartedAt = null;
    this.pausedDurationMs = 0;
    this.stoppedAt = 0;
    this._starting = true;
    this._sessionSaved = false;
    this.current = null;
    this.awaiting = false;
    ((this.running = !0),
      (this.paused = !1),
      this.sessionToken++,
      (this.trials = []),
      this.inventionMemory.clear(),
      (this.rts = []),
      (this.score = {
        hits: 0,
        misses: 0,
        falseAlarms: 0,
        correctRejects: 0,
        timeouts: 0,
        shown: 0,
        scored: 0,
      }),
      (this.n = this.settings().n),
      (this.startedAt = 0),
      (this.endsAt = 0),
      ($("start-btn").disabled = !0),
      ($("pause-btn").disabled = !1),
      ($("stop-btn").disabled = !1),
      ($("pause-btn").textContent = "Pause"),
      this.setSessionControlsLocked(true),
      $("session-countdown").classList.remove("idle"),
      document.body.classList.toggle("practice-active", !1),
      this.syncDelta(),
      this.updateStats(),
      this.startSessionClock());
    const t = this.sessionToken;
    for (const e of [3, 2, 1]) {
      if (!this.running || t !== this.sessionToken) return;
      $("countdown-box").textContent = e;
      // Count active time only. Pausing or restarting cannot leave an old
      // countdown free to append a trial to a new session.
      let remaining = 650;
      let previous = Date.now();
      while (remaining > 0) {
        await sleep(50);
        if (!this.running || t !== this.sessionToken) return;
        const now = Date.now();
        if (!this.paused) remaining -= now - previous;
        previous = now;
      }
    }
    if (!this.running || this.paused || t !== this.sessionToken) return;
    this._starting = false;
    this.startedAt = Date.now();
    this.endsAt = this.startedAt + this.sessionDurationMs;
    this.pausedDurationMs = 0;
    $("countdown-box").textContent = "";
    return this.nextTrial(t);
  }
  setSessionControlsLocked(locked) {
    for (const id of ["logic-mode", "n-slider", "session-slider", "premise-test-btn"]) {
      const control = $(id);
      if (!control) continue;
      if (locked) {
        if (!this._frozenControls.has(id))
          this._frozenControls.set(id, control.disabled);
        control.disabled = true;
      } else if (this._frozenControls.has(id)) {
        control.disabled = this._frozenControls.get(id);
        this._frozenControls.delete(id);
      }
    }
  }
  beginSessionPause() {
    if (this.running && this.pauseStartedAt === null)
      this.pauseStartedAt = Date.now();
  }
  endSessionPause() {
    if (this.pauseStartedAt === null) return 0;
    const elapsed = Math.max(0, Date.now() - this.pauseStartedAt);
    if (!this._starting && this.startedAt) {
      this.endsAt += elapsed;
      this.pausedDurationMs += elapsed;
    }
    this.pauseStartedAt = null;
    return elapsed;
  }
  startSessionClock() {
    clearInterval(this.sessionTimerId);
    const t = () => {
      if (!this.running) return;
      const now = this.pauseStartedAt ?? Date.now();
      const t = this._starting
          ? this.sessionDurationMs
          : Math.max(0, this.endsAt - now),
        s = Math.ceil(t / 1000) % 60,
        minutes = Math.floor(Math.ceil(t / 1000) / 60);
      (($("session-countdown").textContent =
        `${String(minutes).padStart(2, "0")}:${String(s).padStart(2, "0")}`),
        $("session-countdown").classList.toggle("ending", t < 6e4),
        ($("session-progress").style.width =
          clamp(100 * (1 - t / this.sessionDurationMs), 0, 100) + "%"),
        !this._starting && !this.paused && t <= 0 && this.stop(!1));
    };
    (t(), (this.sessionTimerId = setInterval(t, 250)));
  }
  stop(t) {
    if (this.running) {
      this.endSessionPause();
      this.stoppedAt = Date.now();
      ((this.running = !1),
        (this.paused = !1),
        (this.awaiting = !1),
        this.sessionToken++,
        clearTimeout(this.timerId),
        clearInterval(this.sessionTimerId));
      this._starting = false;
      try {
        this.synth?.cancel();
      } catch (t) {}
      (this.stopDelta(),
        ($("start-btn").disabled = !1),
        ($("pause-btn").disabled = !0),
        ($("pause-btn").textContent = "Pause"),
        ($("stop-btn").disabled = !0),
        $("match-btn") && ($("match-btn").disabled = !0),
        $("no-match-btn") && ($("no-match-btn").disabled = !0),
        $("paused-overlay").classList.remove("show"),
        ($("countdown-box").textContent = ""),
        $("session-countdown").classList.add("idle"),
        this.setSessionControlsLocked(false),
        this.saveSession(t),
        this.setStatus(t ? "SESSION_STOPPED" : "SESSION_COMPLETE"));
    }
  }
  togglePause() {
    if (this.running) {
      if (this.paused) this.endSessionPause();
      else this.beginSessionPause();
    }
    if (this.running)
      if (
        ((this.paused = !this.paused),
        $("paused-overlay").classList.toggle("show", this.paused),
        ($("pause-btn").textContent = this.paused ? "Resume" : "Pause"),
        this.paused)
      ) {
        clearTimeout(this.timerId);
        try {
          this.synth?.pause();
        } catch (t) {}
        this.stopDelta();
      } else {
        try {
          this.synth?.resume();
        } catch (t) {}
        this.syncDelta();
        if (!this._starting && !this.current) this.nextTrial(this.sessionToken);
      }
  }
  makeBase(t) {
    const e = this.rng.shuffle(DIRS),
      s = distinctSymbols(this.rng, 4),
      i = e[0],
      n = e[1],
      o = e[2];
    switch (t) {
      case 0:
        return {
          mode: t,
          dirs: [i],
          symbols: s.slice(0, 2),
          signature: `D:${i}`,
        };
      case 1:
        return {
          mode: t,
          dirs: [i],
          symbols: s.slice(0, 2),
          signature: `REV:${opposite(i)}`,
        };
      case 2:
        return {
          mode: t,
          dirs: [i, n],
          symbols: s.slice(0, 3),
          signature: `COMP:${composeDirection(i, n)}`,
        };
      case 3:
        return {
          mode: t,
          dirs: [i, n],
          symbols: s.slice(0, 3),
          signature: `TOPO:${axis(i)}:${turn(i, n)}`,
        };
      case 4:
        return {
          mode: t,
          dirs: [i, n, o],
          symbols: s,
          signature: `OP:${turn(i, n)}:${turn(n, o)}`,
        };
      case 5: {
        const e = this.rng.pick(SYMBOLS),
          o = [...this.inventionMemory.keys()],
          r = {
            mode: t,
            dirs: [i, n],
            symbols: [
              o.length && this.rng.next() < 0.38 ? this.rng.pick(o) : s[0],
              s[1],
              e,
            ],
            signature: `REC:${composeDirection(i, n)}:${turn(i, n)}`,
            invention: e,
          };
        return (this.inventionMemory.set(e, r.signature), r);
      }
      default: {
        const t = this.rng.pick(ONTOLOGIES),
          e = this.rng.pick(FORM_ORDERS),
          o = this.rng.pick(SYMBOLS),
          r = [...this.inventionMemory.keys()],
          a = {
            mode: 6,
            dirs: [i, n],
            symbols: [
              r.length && this.rng.next() < 0.42 ? this.rng.pick(r) : s[0],
              s[1],
              o,
            ],
            ontology: t,
            order: e,
            invention: o,
            signature: `ONTO:${t.family}:${e}:${composeDirection(i, n)}`,
          };
        return (this.inventionMemory.set(o, a.signature), a);
      }
    }
  }
  surfaceVariant(t) {
    const e = t.mode,
      s = distinctSymbols(this.rng, 4);
    if (0 === e) return { ...t, symbols: s.slice(0, 2) };
    if (1 === e)
      return {
        ...t,
        dirs: [opposite(t.dirs[0])],
        symbols: s.slice(0, 2),
        signature: t.signature,
      };
    if (2 === e)
      for (let s = 0; s < 50; s++) {
        const s = this.makeBase(e);
        if (s.signature === t.signature) return s;
      }
    if (3 === e)
      for (let s = 0; s < 50; s++) {
        const s = this.makeBase(e);
        if (s.signature === t.signature) return s;
      }
    if (4 === e)
      for (let s = 0; s < 80; s++) {
        const s = this.makeBase(e);
        if (s.signature === t.signature) return s;
      }
    if (5 === e)
      for (let s = 0; s < 80; s++) {
        const s = this.makeBase(e);
        if (s.signature === t.signature) return s;
      }
    if (6 === e) {
      const s = ONTOLOGIES.filter((e) => e.family === t.ontology.family);
      for (let i = 0; i < 100; i++) {
        const i = this.makeBase(e);
        if (
          ((i.ontology = this.rng.pick(s)),
          (i.order = t.order),
          (i.signature = `ONTO:${i.ontology.family}:${i.order}:${composeDirection(i.dirs[0], i.dirs[1])}`),
          i.signature === t.signature)
        )
          return i;
      }
    }
    return { ...t, symbols: s.slice(0, t.symbols.length) };
  }
  makeTrial() {
    const t = this.settings().mode,
      e = this.n,
      s = this.trials[this.trials.length - e];
    if (!s) return { ...this.makeBase(t), isMatch: !1, scored: !1 };
    if (this.rng.next() < this.settings().matchProbability)
      return { ...this.surfaceVariant(s), isMatch: !0, scored: !0 };
    let i;
    do i = this.makeBase(t);
    while (i.signature === s.signature);
    return { ...i, isMatch: !1, scored: !0 };
  }
  renderTrial(t) {
    return t.text || "";
  }
  nextTrial() {
    return null;
  }
  answer() {
    return null;
  }
  getSessionSummary() {
    const settings = this.sessionSettings || this.settings();
    const mode = Number(settings.mode);
    const matrixTrials = this.trials.filter(
      (trial) =>
        trial.submitted && Array.isArray(trial.conflictDecisionCorrectness),
    );
    const completed =
      mode === 0 ? matrixTrials.length : Number(this.score.scored || 0);
    const correctTrials =
      mode === 0
        ? matrixTrials.filter(
            (trial) =>
              trial.conflictDecisionCorrectness.length === 5 &&
              trial.conflictDecisionCorrectness.every(Boolean),
          ).length
        : Number(this.score.hits || 0) + Number(this.score.correctRejects || 0);
    const decisions = mode === 0 ? matrixTrials.length * 5 : completed;
    const correctDecisions =
      mode === 0
        ? matrixTrials.reduce(
            (total, trial) =>
              total + trial.conflictDecisionCorrectness.filter(Boolean).length,
            0,
          )
        : correctTrials;
    const times = this.rts.filter(
      (value) => Number.isFinite(value) && value >= 0,
    );
    const now = this.stoppedAt || this.pauseStartedAt || Date.now();
    return {
      mode,
      modeName: MODE_NAMES[mode] || `Mode ${mode + 1}`,
      n: this.sessionSettings ? this.n : settings.n,
      directionResolution:
        this.directionResolution ?? settings.directionResolution ?? null,
      plannedMinutes: Number(settings.minutes),
      elapsedMs: this.startedAt
        ? clamp(
            now - this.startedAt - this.pausedDurationMs,
            0,
            this.sessionDurationMs,
          )
        : 0,
      shown: Number(this.score.shown || 0),
      completed,
      correctTrials,
      decisions,
      correctDecisions,
      accuracy: decisions ? correctDecisions / decisions : null,
      trialAccuracy: completed ? correctTrials / completed : null,
      meanResponseMs: times.length
        ? times.reduce((total, time) => total + time, 0) / times.length
        : null,
      hits: Number(this.score.hits || 0),
      misses: Number(this.score.misses || 0),
      falseAlarms: Number(this.score.falseAlarms || 0),
      correctRejects: Number(this.score.correctRejects || 0),
      timeouts: Number(this.score.timeouts || 0),
    };
  }
  updateStats() {
    const summary = this.getSessionSummary();
    const accuracy =
      summary.accuracy === null
        ? "—"
        : `${Math.round(summary.accuracy * 100)}%`;
    const reaction =
      summary.meanResponseMs === null
        ? ""
        : ` · Mean response: ${(summary.meanResponseMs / 1000).toFixed(1)} s`;
    const score = $("score");
    if (score)
      score.textContent =
        summary.mode === 0
          ? `${summary.completed} completed / ${summary.shown} shown · All five correct: ${summary.correctTrials}/${summary.completed} · Decision accuracy: ${accuracy}${reaction}`
          : `${summary.completed} scored / ${summary.shown} shown · Accuracy: ${accuracy} · Hits: ${summary.hits} · Misses: ${summary.misses} · False alarms: ${summary.falseAlarms}${reaction}`;
    const currentN = $("n-current");
    if (currentN)
      currentN.textContent = `${summary.n}-back${summary.directionResolution ? ` · ${summary.directionResolution} directions` : ""}`;
    const conflictScore = $("conflict-score");
    if (conflictScore)
      conflictScore.textContent =
        summary.mode === 0
          ? `${summary.correctDecisions}/${summary.decisions} decisions correct · ${summary.correctTrials}/${summary.completed} complete trials correct`
          : "";
  }
  setStatus(t) {
    const e = $("premise-display");
    if (e) {
      e.textContent = t;
      e.removeAttribute("aria-label");
    }
  }
  loadHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (!Array.isArray(stored)) throw new Error("Invalid session history");
      this.history = stored.filter(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      );
      this.historyStorageError = "";
    } catch (_) {
      this.historyStorageError =
        "Saved history could not be read. New results remain available in this tab; export them before leaving.";
    }
  }
  saveSession(stoppedEarly = false) {
    if (this._sessionSaved || !this.score.shown) return;
    const summary = this.getSessionSummary();
    const session = {
      ...summary,
      id: `${this.startedAt}-${this.sessionToken}`,
      startedAt: new Date(this.startedAt).toISOString(),
      endedAt: new Date(this.stoppedAt || Date.now()).toISOString(),
      stoppedEarly: Boolean(stoppedEarly),
    };
    this.history.unshift(session);
    this._sessionSaved = true;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
      this.historyStorageError = "";
    } catch (_) {
      this.historyStorageError =
        "History could not be saved on this device. Export these results before leaving this tab.";
    }
    return session;
  }
  openModal(t) {
    $(t)?.classList.add("show");
  }
  closeModal(t) {
    $(t)?.classList.remove("show");
  }
  showHistory() {
    const list = $("history-list");
    if (!list) return;
    list.replaceChildren();
    if (this.historyStorageError) {
      const warning = document.createElement("p");
      warning.setAttribute("role", "alert");
      warning.textContent = this.historyStorageError;
      list.appendChild(warning);
    }
    if (!this.history.length) {
      const empty = document.createElement("p");
      empty.textContent = "No completed or stopped sessions yet.";
      list.appendChild(empty);
    }
    for (const session of this.history) {
      const entry = document.createElement("article");
      const title = document.createElement("h3");
      const date = new Date(session.startedAt);
      title.textContent = `${Number.isNaN(date.getTime()) ? "Saved session" : date.toLocaleString()} — ${session.modeName || MODE_NAMES[session.mode] || "Training"}`;
      const detail = document.createElement("p");
      const accuracy = Number.isFinite(session.accuracy)
        ? `${Math.round(session.accuracy * 100)}%`
        : "—";
      const elapsed = Number.isFinite(session.elapsedMs)
        ? `${(session.elapsedMs / 60000).toFixed(1)} min`
        : "—";
      detail.textContent = `${session.n || 1}-back${session.directionResolution ? ` · ${session.directionResolution} directions` : ""} · ${session.completed || 0} scored trials · ${Number(session.mode) === 0 ? "Decision accuracy" : "Accuracy"}: ${accuracy} · ${elapsed} · ${session.stoppedEarly ? "Stopped" : "Complete"}`;
      if (Number(session.mode) === 1) {
        const complexityNames = {
          entities: "One descriptor per entity",
          facets: "Multiple aspects per entity",
          worlds: "Worlds within worlds",
        };
        detail.textContent += session.modeTwoVersion >= 22
          ? ` · ${complexityNames[session.modeTwoComplexity] || "Endpoint bindings"} · Rules ${session.modeTwoVersion}`
          : " · Earlier rules (version not recorded)";
        if (session.practiceChecks > 0)
          detail.textContent += ` · Separate practice: ${session.practiceCorrect || 0}/${session.practiceChecks} first direction answers correct`;
      }
      entry.append(title, detail);
      list.appendChild(entry);
    }
    if ($("export-btn")) $("export-btn").disabled = !this.history.length;
    this.openModal("history");
  }
  clearHistory() {
    try {
      localStorage.removeItem(HISTORY_KEY);
      this.history = [];
      this.historyStorageError = "";
    } catch (_) {
      this.historyStorageError =
        "Saved history could not be cleared on this device.";
    }
    this.showHistory();
  }
  exportHistory() {
    if (!this.history.length) return null;
    const columns = [
      "startedAt",
      "endedAt",
      "modeName",
      "n",
      "directionResolution",
      "plannedMinutes",
      "elapsedMs",
      "shown",
      "completed",
      "correctTrials",
      "decisions",
      "correctDecisions",
      "accuracy",
      "trialAccuracy",
      "meanResponseMs",
      "hits",
      "misses",
      "falseAlarms",
      "correctRejects",
      "timeouts",
      "stoppedEarly",
      "modeTwoVersion",
      "modeTwoComplexity",
      "practiceEnabled",
      "reflectionCount",
      "practiceChecks",
      "practiceCorrect",
    ];
    const cell = (value) => {
      let text = value === null || value === undefined ? "" : String(value);
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const csv = [
      columns.map(cell).join(","),
      ...this.history.map((session) =>
        columns.map((key) => cell(session[key])).join(","),
      ),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ontological-worlds-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return csv;
  }
}
document.addEventListener("DOMContentLoaded", () => {
  ((window.__ontologicalWorlds = new OntologicalWorlds()),
    window.__ontologicalWorlds.init());
});
