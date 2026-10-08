# Ontological Worlds

A browser-based relational reasoning and N-back trainer using the Da Vinci cross-domain method. The main screen provides two relational reasoning modes; **Extra Training** opens a separate ordered-number N-back screen. Modes 3–7 are unreleased and cannot be selected.

## Relacality — independent expansion

The compact **PROTOTYPE: Relacality** button at the top-left of the screen opens [the local Relacality app](relacality/index.html) in its own tab: a temporal synchronisation and relational reasoning piano with **27 ontological keys (9 Archetypal + 9 Inner + 9 Outer)**. It supports free play, guided challenges and up to six optional independent metronomes at 1–240 BPM, with odd and even metres.

The complete app is maintained here in [`relacality/`](relacality/), including its engines, styles, tests, offline builder and [downloadable HTML](relacality/offline/relacality.html). All runtime assets load from this repository. There is no external repository link, submodule, remote import or automatic synchronisation. Its game runtime, saved settings, notes, recordings and audio stay separate from the main training modes. The native portal link works without JavaScript; when the main game is running, normal activation or middle-click pauses the current session before opening the piano. Already paused sessions stay paused. Return to the original tab and press P or tap the paused screen to continue.

## Run locally

The application is a static site; no application build or server-side account is required. Serve the repository over HTTP, for example:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Keep all JavaScript files beside the HTML files: Mode 2 loads its engine and runtime dynamically. Speech, available voices and haptics depend on the browser and device.

## Start a relational reasoning session

1. Choose Mode 1 or Mode 2.
2. Select **4, 8 or 16 compass directions**. Both modes require an explicit choice before Start becomes available.
3. Select an N-back level from **1–8**, a session length of up to **6 hours**, and whole-triad match probability; adjust speech and display preferences as needed.
4. For Mode 2, choose **One descriptor per entity**, **Multiple aspects per entity** (default) or **Worlds within worlds**. Choose whether to keep **Practice break after every 6 answers** enabled (default).
5. Choose listening practice or entered responses and their timing settings, then press **Start**. Entered responses are untimed by default; a finite response window is optional.

Mode, N-back level, compass resolution, session duration, pacing controls and Mode 2 complexity/practice settings are fixed during a session. **Adaptive N is unavailable**; choose a different N before the next session. Both main modes use **100% cognitive interference**, so that control is fixed. Pause preserves the current trial and excludes paused time from the session clock and response measurements. Each mode has its own expanded, visible guide below the game and a jump link above the settings.

### Listening and response timing

Main-mode speech reads each complete trial continuously without announcing visual role labels or turn prompts. The optional binaural background is muted while speech is queued or playing. These modes use installed browser voices, so voice quality depends on the device.

**Listening mode — no response input** advances both main modes automatically and leaves all answers to mental practice. Choose **1–300 seconds per trial (up to 5 minutes)**, including decimals. This is a target interval between trial starts, not a delay added after speech. Speech always finishes before the next trial starts; longer speech extends the interval. Listening mode does not record answers, accuracy, omissions or timeout penalties. Mode 2's optional practice breaks are disabled during listening. Visible text and audio-only display remain available; if speech is muted or unavailable, the visible trial remains usable.

With listening off, **Response time after speech** controls an optional scored deadline: **0 means no time limit**, and a positive setting allows up to **300 seconds (5 minutes) after speech completes**. The setting applies to initial trials too. If speech is muted or unavailable, the window begins when the text is presented. In Mode 1, incomplete answers at a finite deadline are scored as unanswered; in Mode 2, memory-fill trials remain unscored and only later missed responses affect accuracy.

**Advance by trial response** lets a completed response advance after feedback. Turn it off to keep each trial for the full finite response interval even when you answer early. If this option is off while response time is 0, the application uses **30 seconds** so automatic progression has a defined interval. A pause freezes the remaining interval and session clock. Pausing during speech replays the same trial on Resume; in listening mode, its start-to-start interval restarts with that replay.

## What counts as a match?

Each main reasoning trial contains **three equal-status relational statements** involving three letters. Every statement participates in N-back matching. No statement is a conclusion, and no statement is restricted to its original position. Compare the complete stated pattern, including any relational conflict, with the trial exactly N places earlier.

**Separate inference convention:** Mode 1’s retained K/L matrix question and Mode 2’s optional practice treat current Statements 1 and 2 as equal-length unit steps, including diagonals. They check the bearing between Statement 3’s endpoint letters. The core rounds that bearing to the nearest of sixteen compass points, clockwise at an exact halfway boundary. This game convention is independent of N-back matching; inferred directions never replace the written statements. Bare real-world compass statements without distances do not generally determine the same precise intermediate bearings.

The main modes retain **three statements per trial** and their existing answer layouts: Mode 1 uses the five-decision matrix, and Mode 2 uses one Match/No Match response.

N-back comparisons use the trial exactly N positions earlier. Matching requires a single consistent one-to-one mapping between the historical and current letters. Letter names may change, all three statements may exchange positions, and reversed wording is equivalent only when its compass direction is also reversed. The third statement has no privileged N-back position; any separate within-trial diagnostic does not control historical matching. Compass directions and endpoints must match exactly under the chosen mapping. Reversal requires the opposite direction under that mapping; another global renaming is allowed only when it preserves the complete pattern.

### Mode 1 — Relational reasoning

Apply the **Da Vinci cross-domain method**: build a concrete world from the stated relationships, then reconstruct the same pattern in a different domain. Preserve all directions, conflicts and entity roles while changing what the letters represent.

When entering responses, answer all five decisions on **every trial**, including the initial N memory-fill trials:

| Decision | Positive key | Negative key |
| --- | --- | --- |
| Statement 1 matches the N-back structure | A | S |
| Statement 2 matches the N-back structure | D | F |
| Statement 3 matches the N-back structure | H | J |
| Separate check: current Statements 1 and 2 entail Statement 3 | K | L |
| Complete triad matches the N-back structure | Space | N |

Buttons provide the same choices. Each answer is locked after entry and gets immediate feedback. Entering all five advances after feedback when **Advance by trial response** is enabled; otherwise the trial stays until its finite response interval ends. During memory fill, no historical target exists, so the three statement-match answers and complete-triad answer are **No**; judge current-trial entailment normally.

Statement matches are evaluated together under a coherent letter mapping and statement assignment, not as independent visual similarities. Current-trial entailment is a separate decision from historical matching. A complete-triad match requires all three statements to align.

The alignment first maximizes the number of matching statements. If equally good alignments disagree on the three statement answers, the tie rule compares answers from Statement 1 onward and prefers **No** at the first difference. Thus `[No, Yes, Yes]` precedes `[Yes, No, Yes]`. This determines one reproducible answer vector; it does not affect current-trial entailment. For the separate K/L check, current Statements 1 and 2 must form a connected three-letter chain and Statement 3 must give its exact end-to-end relation. Repeating one of the first two statements on its own endpoint pair does not satisfy that additional check. If those two statements cannot establish an end-to-end bearing, K/L is No and all N-back comparisons still proceed independently.

After memory fill, every generated non-match preserves exactly two coherent statements and changes one relation. Letter presentation now varies independently of the requested match: a trial can retain **zero, one or two** letter names from its N-back target, and letters can change relational roles. There is no required shared letter with the immediately preceding trial. A soft random weighting based on the most recent **32 trials** reduces repeated names and long streaks without forcing a predictable rotation or guaranteeing a hard streak limit. Exposure history resets with a new session. These presentation choices do not replace the structural scoring rule.

The score distinguishes **decision accuracy** from **complete-trial accuracy**: a complete trial is correct only when all five answers are correct. Historical hit/miss statistics refer to the complete-triad decision.

### Mode 2 — Ontological Integration

Mode 2 uses the same variable letter overlap and soft 32-trial exposure weighting while preserving its descriptor rules. It binds an ontology descriptor to **both endpoints of every statement**. A descriptor includes a category and its Inner, Outer or unmarked form. All these bindings now affect scoring. A match preserves the complete **entity–category–form–direction configuration** under one consistent entity bijection. All three statements may exchange positions and wording may reverse with the opposite direction, while descriptors stay attached to their endpoints. Reversing wording never silently changes Inner to Outer.

Each letter denotes one stable entity throughout a trial. Its aspects share its spatial anchor; different descriptors do not imply movement, separate entities or time steps. The complexity setting is independent of N:

| Complexity | Required bindings |
| --- | --- |
| One descriptor per entity | Each entity retains one category/form across its appearances. |
| Multiple aspects per entity | Each endpoint occurrence can express a different operational aspect of the same entity. Preserve which aspect participates in each relationship. |
| Worlds within worlds | Each outer entity owns a complete inner triad. Match all inner structures under consistent local bijections, keep them attached to the correct outer entities, and match the outer structure. One inner layer is used. |

Worlds retain a separate imagination rule: **if inner Statements 1 and 2 imply inner Statement 3 under the equal-step convention, this world projects outward; otherwise it receives inward.** This inferred output is excluded from N-back matching. The complete inner category/form/endpoint graph and its attachment to the outer entity still matter, with all three inner statements allowed to change places under a consistent local bijection. Equal outputs do not make different inner patterns equivalent; changing only this derived output does not make equivalent stated patterns different. Inner entity letters are local to their containing world. This is an explicit practice rule, not an inferred category algebra.

The first N trials are unscored memory fill. A finite response-time setting gives them that full interval after speech; listening mode follows its start-to-start interval. With untimed entered responses, memory fill advances shortly after successful speech. Only in this untimed case, when speech is silent or unavailable, **Remember this world — Continue** lets the user finish reading before advancing. Match/No Match remain unavailable during memory fill. Subsequent trials accept one **Match** or **No Match** response after speech, subject to the chosen deadline and advancement setting. Close non-matches can alter a category, form, endpoint-role binding, direction or inner-world binding. Remembering only the compass shape or the set of vocabulary words is insufficient. Use **F/J** for Match and **D/K** for No Match, or the on-screen buttons.

#### Worked 1-back example: multiple aspects

| Line | Trial 1 | Trial 2 |
| --- | --- | --- |
| Statement 1 | Outer Connection H is south of Projection D. | Multiplication Z is north of Outer Projection Y. |
| Statement 2 | Outer Projection D is south of Multiplication C. | Projection Y is north of Outer Connection X. |
| Statement 3 | Projection C is north of Inner Division H. | Inner Division X is south of Projection Z. |

**Match:** H→X, D→Y, C→Z. Statements 1 and 2 swap order and all three statements invert equivalently. Every endpoint descriptor retains its relational role.

Swap only `Multiplication Z` and `Projection Z` between Trial 2's first and third lines: the result is **No Match**. The vocabulary and geometry remain the same, but two aspects are attached to different relationships. Moving a complete statement is allowed; moving only its endpoint descriptor changes its meaning. Likewise, an internal relational conflict does not disqualify a memory match: the full stated pattern is compared under one shared mapping.

#### Da Vinci cross-domain practice

Use the category meanings to construct one integrated concrete world and reconstruct its relational pattern in a distant domain. Preserve each entity, its operational aspects and all written relationships. The domain cue and self-written stories do not change the formal match identity and are not automatically graded. Compass directions have no permanently assigned category meanings.

Outside listening mode, after every six scored responses, optional practice pauses the session clock without adding or replacing an N-back trial. Derive Statement 3’s subject direction relative to its object from current Statements 1 and 2 under the equal-step convention. Then reverse **the direction codes of Statements 1 and 2**, keeping their endpoints and facets fixed, and derive the new direction. This is a spatial intervention, distinct from equivalent sentence inversion. Practice feedback is separate from N-back accuracy and response-time measurements. Each question's first checked answer is retained for the separate practice metric; feedback retries remain available for learning. Optional prompts/notes support cross-domain reconstruction, an explicit causal rule, a predicted consequence and a boundary where the analogy breaks. Notes remain in the open session and are not graded or persisted to History. **Continue training** also permits skipping practice.

Causal predictions need an explicit rule in the imagined model: compass position alone does not establish causation. No rule such as “Division plus Projection equals Connection” is used. The guide includes the nine-category, three-form operational glossary. In particular, Outer Connection means a connected member/endpoint of a linking medium, and unmarked Projection spans source, trajectory and destination.

For either main mode, **P** pauses/resumes and **Escape** stops, independently of the Keyboard controls option. Response shortcuts follow that option and ignore held-key repetition and text-entry fields. During the Mode 2 practice panel, use its explicit controls to continue the paused session.

## Extra Training — Ordered Number N-back

This separate screen supports **1–20 back**, **1–6 ordered digits per trial** (default: 3), digits **1–9**, configurable match probability, interference, speech and a timed response window. Fixed sessions include **1, 2, 3, 4, 5 and 6 hours** as well as shorter choices; open-ended sessions remain available. The main-page launcher navigates directly to this screen, and **Main Training** returns to the main page.

A trial is a **Match if at least one digit is identical in the same position** as it was N trials earlier. The whole sequence need not match. For example, target `1, 2, 3` and current `1, 8, 9` match; current `2, 3, 1` does not. Digits repeated in different positions are interference.

Each digit appears at most **twice per sequence**. No digit repeats three times consecutively in the number stream, including across trial boundaries, or in the same sequence position across three trials. These constraints take priority over the requested match probability; scoring always uses the actual generated sequence.

With listening off, the first N trials are unscored memory fill and advance automatically. Thereafter use Match/No Match buttons or **F/J** and **D/K**. The response timer begins after speech completes. Timeouts count as incorrect; d′ uses corrected hit and false-alarm rates, excludes omitted responses, and remains unavailable until both match and non-match responses exist.

**Listening mode — no response input** is also available here with a **1–300-second start-to-start interval**, including decimals. It disables response input and scoring, keeps speech enabled, and counts only fully heard trials. Longer speech completes before advancing. If audio cannot play, the session pauses for a retry without counting the trial or applying a penalty. Pausing during speech replays that sequence and restarts its interval; a pause between trials freezes the remaining interval.

Number speech uses recordings of a human Australian English speaker. Complete digits and the selected gaps are assembled into one continuous audio sequence, with a protected startup lead-in and ending. Average uses the original recording with volume normalization and quiet padding; faster settings accelerate the whole word without changing pitch or splicing individual phonemes. The seven tempos run from 1× to 1.85×. All selected digits, including positions four through six, are included in the same complete buffer; **Test speech** uses the selected sequence length. Perceived speech quality still depends on the browser, device and sound output. No network speech service or installed system voice is required. The response timer waits for the full audio sequence and output latency. A session ending automatically finishes its current spoken sequence; Pause or Stop interrupts it immediately, and Resume replays an interrupted sequence from the beginning. See [voice attribution and build details](NUMBER-SPEECH-ASSETS.md).

Settings are fixed until the session stops. Pause preserves the sequence and remaining response time; returning from a pause never inserts a replacement trial. In entered-response mode, if audio is unavailable, audio-only mode reveals the sequence so the trial remains usable; listening mode instead pauses for an audio retry. Switching away from this screen automatically pauses it. Number-session results are shown on this screen and are not saved to the main training-session history.

## Results and storage

Completed or stopped reasoning sessions appear under **History**. Results include mode, N, compass resolution, active duration, accuracy and response statistics. Listening sessions are identified as unscored and retain shown/heard counts without invented response or accuracy results. Mode 2's practice questions are excluded from N-back accuracy. **Export CSV** downloads those summaries; **Clear** removes saved history from this browser.

History and preferences use browser storage on the current site and device. They are not synced across devices. If storage is unavailable, the app reports the problem and keeps new results in the current tab for export. Export before clearing browser data or leaving a tab with unsaved results.

## Research hub

Open **Research & Evidence** at the top right of the training page, or visit [the research hub](research.html). It maps individual Mode 1, Mode 2, ordered N-back and Da Vinci features to named research sources. Search by author or skill and filter by mode or evidence type. Selecting a source in the feature map clears filters and reveals its full study card.

The collection includes distant-analogy generation, relational category learning, self-explanation, structured manipulation, item–context binding, interference and distributed practice. Three worked practice examples show how to apply these connections while preserving each mode's scoring rules. The feature map separates intervention findings, immediate task effects, mechanism evidence and proposed applications. Mode 1’s central cross-domain mapping cites analogy generation and explicit structural comparison. Shared analogy and imagination studies appear under both main modes. Each mapping explains the researched operation, its positive finding and a concrete application; study cards retain the population, outcome and material qualifications.

The new research connections combine progressive alignment, concrete-to-abstract representations, explanatory comparison, retrieval of lived examples, delayed inference and diagnostic questions. A visible practice panel shows how to apply these findings. Mode 2 adds a separate audit of entity, category, perspective and endpoint after extracting a shared rule. The mappings preserve conditions such as cued transfer, integrated presentation and the difference between learning category commonalities and distinctions. The N-back additions map selective running-span transfer and visual-to-auditory transfer to maintaining an advancing sequence and applying updating across presentation formats. These are research-informed practice suggestions; scoring rules are unchanged.

Further mappings cover meaningful relational labels, misleading analogies, connected systems of relations, improving generated-analogy quality, preparing to learn from corrective examples, choosing informative interventions and checking durable reasoning. N-back entries separately examine strategy instruction, response-inhibition demands and transfer across shared updating operations. The three mode summaries link directly to representative studies. The ACTIVE ten-year report is included once, and its domain-specific reasoning result is distinguished from general intelligence and everyday-function outcomes.

A further synthesis asks what changes and what carries over: domain, component combination, contextual conditions and delayed reconstruction. New sources connect function-first imagination, causal-schema learning, counterfactual operations and observer perspectives with the Da Vinci method; role–entity separation and human compositional generalization with Mode 2; and memory selection, task-relevant bindings and metacognitive practice with N-back. The transfer table offers optional reflection exercises, with direct links to each source. Study contexts distinguish human results from computational theory, immediate performance from training effects, and self-guided proposals from coached interventions.

Further connections link category membership to spontaneous retrieval, deliberate analogy search to explanatory hypotheses, and learner-created analogous problems to solution transfer. The practice panel now combines these operations with controlled comparisons and contrasting cases. New studies distinguish relational encoding for insight, imagination-based event construction, operational category knowledge, retained reasoning strategies, durable N-back discrimination and selective attentional maintenance. Primary programme reports add detail to existing reviews without being presented as independent replications. The three mode summaries link to representative new findings; each proposed application preserves formal scoring and session timing.

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
