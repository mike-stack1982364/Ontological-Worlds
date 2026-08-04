# Ontological Worlds

## Canonical training modes

### Mode 1 — Relational Conflict Matrix

Mode 1 is a three-statement relational N-back system with a session-selectable 4-, 8- or 16-direction compass.

Each visible and spoken trial contains exactly two premises and one conclusion using three arbitrary letter-nodes. Statements 1 and 2 define the current spatial model. Statement 3 is separately evaluated for whether it is logically entailed by those premises.

After the initial N memory-fill trials, every scored trial requires five binary decisions:

1. whether current Statement 1 matches one statement in the trial exactly N positions earlier;
2. whether current Statement 2 matches one historical statement;
3. whether current Statement 3 matches one historical statement;
4. whether current Statement 3 is entailed by current Statements 1 and 2;
5. whether the complete current triad matches the historical triad.

Statement-level matching is not calculated through three independent resemblance checks. The engine requires one globally consistent bijection between the historical and current letters and a one-to-one assignment between statements. A statement counts as a match only when it participates in the best coherent alignment. Equivalent reversed wording is accepted only when subject/object reversal is accompanied by the opposite compass direction. Arbitrary letter renaming and statement reordering do not by themselves break structural equivalence.

Mode 1 alternates between two explicit comparison regimes:

- role-flexible comparison, where any current statement may align with any historical statement;
- role-sensitive comparison, where the historical and current conclusions must remain conclusions while the two premises may exchange order.

A whole-triad MATCH requires all three statements to align under the same mapping and active role regime. One-statement and two-statement correspondences remain partial matches and are scored as interference rather than being collapsed into a single whole-trial answer.

The cognitive-interference generator uses controlled profiles rather than generic random errors. Depending on the interference setting, it creates:

- zero-, one- and two-of-three statement matches;
- resolution-valid adjacent substitutions;
- near, orthogonal and opposite-direction substitutions;
- changed surface letters with preserved structure;
- preserved surface letters with changed relational roles;
- valid inverse wording;
- conflicts between historical familiarity and current entailment;
- globally coherent alignment requirements that suppress incompatible local interpretations.

At maximum interference, non-match trials preferentially preserve exactly two globally coherent statements while changing one precise relation. The player must therefore discriminate a near-complete historical structure while independently determining whether the current conclusion is logically valid.

Mode 1 supports N-back levels 1 through 8. The browser interface displays ten response buttons: Match/No Match for each historical statement decision, Entailed/Not Entailed for current conclusion validity, and Match/No Match for complete-triad identity. All five decisions must be entered before submission.

Each of the five decisions is recorded separately, including correctness and first-response time. The trial itself is counted as correct only when all five responses are correct, preserving compatibility with the existing session progression while retaining native multidimensional diagnostic statistics.

### Mode 2 — Ontological Integration

Mode 2 displays the ontology categories All, Difference, Action, Division, Connection, Multiplication, Projection, Encompassment and Completion, together with Inner and Outer presentation labels.

Mode 2 now uses the same customisable 4-, 8- or 16-direction selector as Mode 1. The selected resolution is frozen for the session and every warm-up, MATCH and NO MATCH trial is generated and validated inside that compass pool.

Its N-back answer is determined by the complete three-statement compass structure of the current and historical trials. Ontology categories and Inner/Outer labels are presentation-level cognitive transformations and are excluded from MATCH/NO MATCH scoring. Consistent letter renaming, premise reordering and logically equivalent reversed wording preserve structural identity.

Mode 2 uses a dedicated binary MATCH/NO MATCH response interface and remains fixed at 100% logical interference. Every scored NO MATCH preserves exactly two globally coherent statements under one consistent letter mapping and changes one relation within the selected compass resolution.

### Exact relational core

Both modes use the same relational compass algebra at the selected 4-, 8- or 16-direction resolution. The core rejects:

- adjacent but non-identical directions;
- subject/object reversal without direction inversion;
- correct relations assigned to the wrong letter pair;
- incorrect shared-anchor branch comparisons;
- locally plausible relations that fail the complete graph;
- any generated relation that escapes the selected compass pool.

## Validation

The repository includes independent tests for:

- all N-back levels from 1 through 8;
- all selectable compass resolutions: 4, 8 and 16;
- five mandatory Mode 1 decisions per scored trial;
- globally consistent letter mapping;
- one-to-one statement assignment;
- role-sensitive and role-flexible alignment;
- inverse-wording equivalence;
- exact directional discrimination at the selected resolution;
- all zero-, one- and two-of-three non-match masks;
- controlled maximum-interference two-of-three lures;
- current-trial entailment separated from historical matching;
- complete-triad matching;
- native per-decision scoring metadata;
- Mode 2 binary browser routing and response handling;
- Mode 2 resolution-closed MATCH and exact two-of-three NO MATCH generation;
- ontology and form-label scoring neutrality.

The Mode 2 regression audit runs 1,000 scored simulations at every combination of three compass resolutions and eight N-back levels: 24,000 simulations per validation run.

GitHub Actions runs separate Mode 1 conflict-matrix, canonical Mode 2 and browser-runtime validation jobs.

This is a theoretically motivated cognitive-training design. It is not validated evidence that training increases general fluid intelligence or GAMSAT performance.
