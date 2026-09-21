# Ontological Worlds

A browser-based relational reasoning and N-back trainer using the Da Vinci cross-domain method. The main screen provides two relational reasoning modes; **Extra Training** opens a separate ordered-number N-back screen. Modes 3–7 are unreleased and cannot be selected.

## Run locally

The application is a static site; no application build or server-side account is required. Serve the repository over HTTP, for example:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Keep all JavaScript files beside the HTML files: Mode 2 loads its engine and runtime dynamically. Speech, available voices and haptics depend on the browser and device.

## Start a relational reasoning session

1. Choose Mode 1 or Mode 2.
2. Select **4, 8 or 16 compass directions**. Both modes require an explicit choice before Start becomes available.
3. Select an N-back level from **1–8**, session length and whole-triad match probability; adjust speech and display preferences as needed.
4. For Mode 2, choose **One descriptor per entity**, **Multiple aspects per entity** (default) or **Worlds within worlds**. Choose whether to keep **Practice break after every 6 answers** enabled (default).
5. Press **Start**. Both main modes are self-paced: there is no per-trial response deadline, but the overall session has a duration.

Mode, N-back level, compass resolution, session duration and Mode 2 complexity/practice settings are fixed during a session. **Adaptive N is unavailable**; choose a different N before the next session. Both main modes use **100% cognitive interference**, so that control is fixed. Pause preserves the current trial and excludes paused time from the session clock and response measurements. Each mode has its own expanded, visible guide below the game and a jump link above the settings.

## What counts as a match?

Each main reasoning trial contains two premises and a candidate conclusion involving three letters. The premises determine a spatial relation; the candidate may or may not be entailed by them. Build the spatial scene from the premises and treat the candidate as a claim, not an additional established fact.

**Spatial inference convention:** each premise denotes an equal-length unit step, including diagonal directions. The candidate asserts only the resulting bearing, not a unit distance. The core rounds the end-to-end bearing to the nearest of sixteen compass points, choosing clockwise at an exact halfway boundary. Generated trials keep the premises, candidate and derived answer within the chosen 4/8/16-direction pool. This explicit metric convention matters: bare real-world compass statements without distances would not generally determine the same precise intermediate bearings.

N-back comparisons use the trial exactly N positions earlier. Matching requires a single consistent one-to-one mapping between the historical and current letters. Letter names may change, the two premises may exchange order, and reversed wording is equivalent only when its compass direction is also reversed. The conclusion retains its conclusion role. Compass directions must match exactly: adjacent directions, an incorrect letter pair, or reversing endpoints without reversing direction do not count.

### Mode 1 — Relational reasoning

Apply the **Da Vinci cross-domain method**: build a concrete world from the two clues, then reconstruct the same relationships in a different domain. Preserve directions and entity roles while changing what the letters represent. Evaluate the candidate as a claim; it does not become a fact merely because it is part of the imagined scene.

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

The alignment first maximizes the number of matching statements. If equally good alignments disagree on the three statement answers, the tie rule compares answers from Statement 1 onward and prefers **No** at the first difference. Thus `[No, Yes, Yes]` precedes `[Yes, No, Yes]`. This determines one reproducible answer vector; it does not affect current-trial entailment. Entailment requires the exact relation between the two ends of the two-premise chain. Merely repeating one premise using its own endpoint pair does not satisfy this question.

After memory fill, every generated non-match preserves exactly two coherent statements and changes one relation. Controlled letter continuity retains two target letter identities, replaces one and maintains overlap with the preceding trial. These presentation constraints do not replace the structural scoring rule.

The score distinguishes **decision accuracy** from **complete-trial accuracy**: a complete trial is correct only when all five answers are correct. Historical hit/miss statistics refer to the complete-triad decision.

### Mode 2 — Ontological Integration

Mode 2 binds an ontology descriptor to **both endpoints of every statement**. A descriptor includes a category and its Inner, Outer or unmarked form. All these bindings now affect scoring. A match preserves the complete **entity–category–form–direction–role configuration** under one consistent entity bijection. Premises may exchange order and wording may reverse with the opposite direction, but descriptors stay attached to their endpoints and the candidate retains its role. Reversing wording never silently changes Inner to Outer.

Each letter denotes one stable entity throughout a trial. Its aspects share its spatial anchor; different descriptors do not imply movement, separate entities or time steps. The complexity setting is independent of N:

| Complexity | Required bindings |
| --- | --- |
| One descriptor per entity | Each entity retains one category/form across its appearances. |
| Multiple aspects per entity | Each endpoint occurrence can express a different operational aspect of the same entity. Preserve which aspect participates in each relationship. |
| Worlds within worlds | Each outer entity owns a complete inner triad. Match all inner structures under consistent local bijections, keep them attached to the correct outer entities, and match the outer structure. One inner layer is used. |

Worlds use an explicit game rule: **If the inner candidate follows from its premises, this world projects outward; otherwise it receives inward.** The inner category/form/endpoint bindings remain part of the match identity. Equal output states do not make different inner structures equivalent. Inner entity letters are local to their containing world. This is an explicit extension of the game, not an inferred category algebra.

The first N trials are unscored memory fill. They advance shortly after successful speech finishes. When speech is silent or unavailable, **Remember this world — Continue** lets the user finish reading the complete stimulus before advancing. Match/No Match remain unavailable during memory fill. Subsequent trials wait for one **Match** or **No Match** response after speech completes. Close non-matches can alter a category, form, endpoint-role binding, direction or inner-world binding. Remembering only the compass shape or the set of vocabulary words is insufficient. Use **F/J** for Match and **D/K** for No Match, or the on-screen buttons.

#### Worked 1-back example: multiple aspects

| Line | Trial 1 | Trial 2 |
| --- | --- | --- |
| Premise 1 | Outer Connection H is south of Projection D. | Multiplication Z is north of Outer Projection Y. |
| Premise 2 | Outer Projection D is south of Multiplication C. | Projection Y is north of Outer Connection X. |
| Candidate | Projection C is north of Inner Division H. | Inner Division X is south of Projection Z. |

**Match:** H→X, D→Y, C→Z. The premises swap order and all three statements invert equivalently. Every endpoint descriptor retains its relational role.

Swap only `Multiplication Z` and `Projection Z` between Trial 2's first and third lines: the result is **No Match**. The vocabulary and geometry remain the same, but two aspects have exchanged premise/candidate roles. Likewise, the candidate's logical truth and its historical match are separate: two structurally identical false candidates can form a memory match.

#### Da Vinci cross-domain practice

Use the category meanings to construct one integrated concrete world and reconstruct its relational pattern in a distant domain. Preserve each entity, its operational aspects and all written relationships. The domain cue and self-written stories do not change the formal match identity and are not automatically graded. Compass directions have no permanently assigned category meanings.

After every six scored responses, optional practice pauses the session clock without adding or replacing an N-back trial. Derive the candidate subject's direction relative to its object from the two premises. Then reverse **both premise direction codes**, keeping their endpoints and facets fixed, and derive the new direction. This is a spatial intervention, distinct from equivalent sentence inversion. Practice feedback is separate from N-back accuracy and response-time measurements. Each question's first checked answer is retained for the separate practice metric; feedback retries remain available for learning. Optional prompts/notes support cross-domain reconstruction, an explicit causal rule, a predicted consequence and a boundary where the analogy breaks. Notes remain in the open session and are not graded or persisted to History. **Continue training** also permits skipping practice.

Causal predictions need an explicit rule in the imagined model: compass position alone does not establish causation. No rule such as “Division plus Projection equals Connection” is used. The guide includes the nine-category, three-form operational glossary. In particular, Outer Connection means a connected member/endpoint of a linking medium, and unmarked Projection spans source, trajectory and destination.

For either main mode, **P** pauses/resumes and **Escape** stops, independently of the Keyboard controls option. Response shortcuts follow that option and ignore held-key repetition and text-entry fields. During the Mode 2 practice panel, use its explicit controls to continue the paused session.

## Extra Training — Ordered Number N-back

This separate screen supports **1–20 back**, **1–3 ordered digits per trial**, digits **1–9**, configurable match probability, interference, speech and a timed response window. Sessions can have a fixed duration or be open-ended.

A trial is a **Match if at least one digit is identical in the same position** as it was N trials earlier. The whole sequence need not match. For example, target `1, 2, 3` and current `1, 8, 9` match; current `2, 3, 1` does not. Digits repeated in different positions are interference.

The first N trials are unscored memory fill and advance automatically. Thereafter use Match/No Match buttons or **F/J** and **D/K**. The response timer begins after speech completes. Timeouts count as incorrect; d′ uses corrected hit and false-alarm rates, excludes omitted responses, and remains unavailable until both match and non-match responses exist.

Number speech uses studio recordings of a human Australian English speaker. Complete digits and the selected gaps are assembled into one continuous audio sequence, with a protected startup lead-in and ending. Average uses the original recording with volume normalization and quiet padding; faster settings accelerate the whole word without changing pitch or splicing individual phonemes. The seven tempos run from 1× to 1.85×, keeping pronunciation intact instead of compressing the middle of a word up to 6×. No network speech service or installed system voice is required. The response timer waits for the full audio sequence and output latency. A session ending automatically finishes its current spoken sequence; Pause or Stop interrupts it immediately, and Resume replays an interrupted sequence from the beginning. See [voice attribution and build details](NUMBER-SPEECH-ASSETS.md).

Settings are fixed until the session stops. Pause preserves the sequence and remaining response time; returning from a pause never inserts a replacement trial. If audio is unavailable, audio-only mode reveals the sequence so the trial remains usable. Switching away from this screen automatically pauses it. Number-session results are shown on this screen and are not saved to the main training-session history.

## Results and storage

Completed or stopped reasoning sessions appear under **History**. Results include mode, N, compass resolution, active duration, accuracy and response statistics. Mode 2's practice questions are excluded from N-back accuracy. **Export CSV** downloads those summaries; **Clear** removes saved history from this browser.

History and preferences use browser storage on the current site and device. They are not synced across devices. If storage is unavailable, the app reports the problem and keeps new results in the current tab for export. Export before clearing browser data or leaving a tab with unsaved results.

## Research hub

Open **Research & Evidence** at the top right of the training page, or visit [the research hub](research.html). It maps individual Mode 1, Mode 2, ordered N-back and Da Vinci features to named research sources. Search by author or skill and filter by mode or evidence type. Selecting a source in the feature map clears filters and reveals its full study card.

The collection includes distant-analogy generation, relational category learning, spatial-to-verbal transfer, self-explanation, structured manipulation, item–context binding, interference and distributed practice. Three worked practice examples show how to apply these connections while preserving each mode's scoring rules. The feature map separates intervention findings, immediate task effects, mechanism evidence and proposed applications. Mode 1’s central cross-domain mapping cites analogy generation and explicit structural comparison. Spatial-skill training and spatial-to-verbal transfer are mapped separately as supporting representation research, with their specific contributions and limits stated in both the map and source cards. Shared analogy and imagination studies appear under both main modes; spatial training alone is not tagged as evidence for the Da Vinci method.

Every card distinguishes the reported finding, its connection to training and the limits of that connection. The custom nine-category taxonomy, multiple-facet and nested-world variations, and inner-world output rule are explicitly identified as proposed extensions rather than validated interventions. Sources are maintained in `research-relational-evidence.json` and `research-nback-evidence.json`; the page loads both collections independently and offers a retry if one is unavailable.

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
npm run test:audio:browser
```

Alternatively, set `CHROMIUM_EXECUTABLE_PATH` to an existing Chromium executable.

Focused checks can also run directly:

```sh
node tests/core-correctness-regression.test.js
node tests/mode-two-session-regression.test.js
node tests/extra-training-runtime.test.js
```

Tests cover compass algebra, structural equivalence, exact N-back targets, maximum-interference lures, warm-up scoring, session timing, pause/restart, keyboard input, speech fallbacks, history and production-page integration. Physical speech output and haptics still require checks on the intended device.

`index.html` and its loaded scripts define the current application. The Mode 2 loader `mode-two-ontology-nback-v14.js` loads `mode-two-engine-v22.js` and `mode-two-runtime-v22.js`. The extra screen uses `extra-training-runtime.js`. Older versioned scripts and tests remain as historical references; files absent from the production loading chain are not additional active modes.

This is a theoretically motivated training design, not validated evidence that practice increases general fluid intelligence or GAMSAT performance.
