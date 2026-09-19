# Ontological Worlds

A browser-based spatial reasoning and N-back trainer. The main screen provides two spatial modes; **Extra Training** opens a separate ordered-number N-back screen. Modes 3–7 are unreleased and cannot be selected.

## Run locally

The application is a static site; no application build or server-side account is required. Serve the repository over HTTP, for example:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Keep all JavaScript files beside the HTML files: Mode 2 loads its engine and runtime dynamically. Speech, available voices and haptics depend on the browser and device.

## Start a spatial session

1. Choose Mode 1 or Mode 2.
2. Select **4, 8 or 16 compass directions**. Both modes require an explicit choice before Start becomes available.
3. Select an N-back level from **1–8**, session length and whole-triad match probability; adjust speech and display preferences as needed.
4. Press **Start**. Both spatial modes are self-paced: there is no per-trial response deadline, but the overall session has a duration.

Mode, N-back level, compass resolution and session duration are fixed during a session. **Adaptive N is unavailable**; choose a different N before the next session. Both spatial modes use **100% cognitive interference**, so that control is fixed. Pause preserves the current trial and excludes paused time from the session clock and response measurements.

## What counts as a match?

Each spatial trial contains two premises and a conclusion involving three letters. The premises determine a spatial relation; the conclusion may or may not be entailed by them.

N-back comparisons use the trial exactly N positions earlier. Matching requires a single consistent one-to-one mapping between the historical and current letters. Letter names may change, the two premises may exchange order, and reversed wording is equivalent only when its compass direction is also reversed. The conclusion retains its conclusion role. Compass directions must match exactly: adjacent directions, an incorrect letter pair, or reversing endpoints without reversing direction do not count.

### Mode 1 — Relational Conflict Matrix

Answer all five decisions on **every trial**, including the initial N memory-fill trials:

| Decision | Positive key | Negative key |
| --- | --- | --- |
| Statement 1 matches the N-back structure | A | S |
| Statement 2 matches the N-back structure | D | F |
| Statement 3 matches the N-back structure | H | J |
| Statement 3 is entailed by the current premises | K | L |
| Complete triad matches the N-back structure | Space | N |

Buttons provide the same choices. Each answer is locked after entry and gets immediate feedback; entering all five advances the trial. During memory fill, no historical target exists, so the three statement-match answers and complete-triad answer are **No**; judge current-trial entailment normally.

Statement matches are evaluated together under a coherent letter mapping and statement assignment, not as independent visual similarities. Current-trial entailment is a separate decision from historical matching. A complete-triad match requires all three statements to align.

After memory fill, every generated non-match preserves exactly two coherent statements and changes one relation. Controlled letter continuity retains two target letter identities, replaces one and maintains overlap with the preceding trial. These presentation constraints do not replace the structural scoring rule.

The score distinguishes **decision accuracy** from **complete-trial accuracy**: a complete trial is correct only when all five answers are correct. Historical hit/miss statistics refer to the complete-triad decision.

### Mode 2 — Ontological Integration

Mode 2 adds ontology categories and Inner/Outer labels to the spatial statements. Those labels do not affect scoring. Decide only whether the **complete three-statement compass structure** matches the N-back target.

The first N trials are unscored memory fill and advance automatically. Subsequent trials wait for **Match** or **No Match** after speech completes. Non-match trials preserve exactly two coherent statements while changing one relation within the selected compass resolution. Use **F/J** for Match and **D/K** for No Match, or the on-screen buttons.

For either spatial mode, **P** pauses/resumes and **Escape** stops. Keyboard response shortcuts follow the Keyboard controls option and ignore held-key repetition and text-entry fields.

## Extra Training — Ordered Number N-back

This separate screen supports **1–20 back**, **1–3 ordered digits per trial**, digits **1–9**, configurable match probability, interference, speech and a timed response window. Sessions can have a fixed duration or be open-ended.

A trial is a **Match if at least one digit is identical in the same position** as it was N trials earlier. The whole sequence need not match. For example, target `1, 2, 3` and current `1, 8, 9` match; current `2, 3, 1` does not. Digits repeated in different positions are interference.

The first N trials are unscored memory fill and advance automatically. Thereafter use Match/No Match buttons or **F/J** and **D/K**. The response timer begins after speech completes. Timeouts count as incorrect; d′ uses corrected hit and false-alarm rates, excludes omitted responses, and remains unavailable until both match and non-match responses exist.

Settings are fixed until the session stops. Pause preserves the sequence and remaining response time; returning from a pause never inserts a replacement trial. If audio is unavailable, audio-only mode reveals the sequence so the trial remains usable. Switching away from this screen automatically pauses it. Number-session results are shown on this screen and are not saved to the main spatial-session history.

## Results and storage

Completed or stopped spatial sessions appear under **History**. Results include mode, N, compass resolution, active duration, accuracy and response statistics. **Export CSV** downloads those summaries; **Clear** removes saved history from this browser.

History and preferences use browser storage on the current site and device. They are not synced across devices. If storage is unavailable, the app reports the problem and keeps new results in the current tab for export. Export before clearing browser data or leaving a tab with unsaved results.

## Development and validation

Install test dependencies and run the current regression suite:

```sh
npm ci
npm test
```

For the desktop and mobile Chromium interaction checks:

```sh
npx playwright install chromium
npm run test:browser
```

Alternatively, set `CHROMIUM_EXECUTABLE_PATH` to an existing Chromium executable.

Focused checks can also run directly:

```sh
node tests/core-correctness-regression.test.js
node tests/mode-two-session-regression.test.js
node tests/extra-training-runtime.test.js
```

Tests cover compass algebra, structural equivalence, exact N-back targets, maximum-interference lures, warm-up scoring, session timing, pause/restart, keyboard input, speech fallbacks, history and production-page integration. Physical speech output and haptics still require checks on the intended device.

`index.html` and its loaded scripts define the current application. The Mode 2 loader `mode-two-ontology-nback-v14.js` loads `mode-two-engine-v21.js` and `mode-two-runtime-v21.js`. The extra screen uses `extra-training-runtime.js`. Older versioned scripts and tests remain as historical references; files absent from the production loading chain are not additional active modes.

This is a theoretically motivated training design, not validated evidence that practice increases general fluid intelligence or GAMSAT performance.
