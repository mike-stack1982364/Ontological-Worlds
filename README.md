# Ontological Worlds

## Canonical training modes

### Mode 1 — Relational Conflict Matrix

Mode 1 is a three-statement relational N-back system with selectable 4-, 8- or 16-direction compass resolution and N-back levels 1 through 8.

Each visible and spoken trial contains exactly two premises and one conclusion using three letter-nodes. Statements 1 and 2 define the current spatial model. Statement 3 is separately evaluated for whether it is logically entailed by those premises.

After the initial N memory-fill trials, every scored trial requires five binary decisions:

1. whether current Statement 1 matches one statement in the trial exactly N positions earlier;
2. whether current Statement 2 matches one historical statement;
3. whether current Statement 3 matches one historical statement;
4. whether Statement 3 is logically entailed by current Statements 1 and 2;
5. whether the complete current triad matches the historical triad.

Statement-level matching is not calculated through three independent resemblance checks. The engine requires one globally consistent bijection between historical and current letters and a one-to-one assignment between statements. Equivalent reversed wording is accepted only when subject/object reversal is accompanied by the opposite compass direction.

A whole-triad MATCH requires all three statements to align under the same mapping and the active role-sensitive policy. Partial correspondence remains interference and never becomes a complete-triad match.

#### Fixed maximum logical interference

Mode 1 is permanently fixed at **100% logical interference**. The former interference slider is locked at 100% and is no longer a variable difficulty control.

Every scored trial is generated from the trial exactly N positions back and must satisfy all of these invariants:

- exactly two N-back-target letter identities remain in their corresponding logical roles;
- exactly one target identity is inhibited and replaced;
- at least one letter also remains active from the immediately preceding trial;
- at N=1, every consecutive pair therefore shares exactly two letters and introduces exactly one new letter;
- MATCH and NO MATCH trials use the same two-retained/one-replaced identity rule, so letter repetition is not an answer cue;
- every NO MATCH is an exact two-of-three statement lure with one controlled relational conflict;
- all five correct response values are independently recomputed after relettering and must remain unchanged;
- a trial that violates any invariant is rejected before it can be rendered.

The first trial is an unconstrained seed. Further memory-fill trials preserve exactly two letters from the preceding trial while their unavailable historical-match decisions remain false.

Mode 1 records each decision separately, including correctness and first-response latency. A trial counts as completely correct only when all five responses are correct.

Keyboard pairs are A/S, D/F, H/J, K/L and Spacebar/N. In each pair, the first key is the positive response and the second is the negative response.

### Mode 2 — Ontological Integration

Mode 2 displays the ontology categories All, Difference, Action, Division, Connection, Multiplication, Projection, Encompassment and Completion, together with Inner and Outer presentation labels.

Its N-back answer is determined by the complete three-statement compass structure of the current and historical trials. Ontology categories and Inner/Outer labels are presentation-level cognitive transformations and are excluded from MATCH/NO MATCH scoring. Consistent letter renaming, premise reordering and logically equivalent reversed wording preserve structural identity.

The Mode 1 maximum-interference override explicitly delegates Mode 2 generation back through the preserved Mode 2 router. Switching to Mode 2 hides the five-decision conflict matrix and restores its original response controls.

### Exact relational core

Both modes use the same exact compass algebra. The core rejects:

- adjacent but non-identical directions;
- subject/object reversal without direction inversion;
- correct relations assigned to the wrong letter pair;
- incorrect shared-anchor branch comparisons;
- locally plausible relations that fail the complete graph.

## Validation

GitHub Actions independently validate:

- every N-back level from 1 through 8;
- 4-, 8- and 16-direction sessions;
- exact two-retained/one-replaced N-back identity updates;
- mandatory immediate-predecessor continuity;
- the direct N=1 zero-overlap regression;
- exact two-of-three NO MATCH lures;
- five mandatory decisions per scored trial;
- globally consistent letter mapping and one-to-one statement assignment;
- role-sensitive and role-flexible alignment;
- inverse-wording equivalence;
- current-trial entailment independently from historical matching;
- logical-response-vector invariance after relettering;
- browser script order, fail-closed installation and cache-key deployment;
- a real Chromium session that starts Mode 1, answers all five controls, advances through live trials and verifies the displayed premises;
- preservation of Mode 2 generation and controls;
- the deployed GitHub Pages application after changes reach `main`.

This is a theoretically motivated cognitive-training design. It is not validated evidence that training increases general fluid intelligence or GAMSAT performance.
