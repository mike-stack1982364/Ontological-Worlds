# Ontological Worlds

## Canonical training modes

### Mode 1 — Relational Conflict Matrix

Mode 1 is a three-statement, exact 16-direction relational N-back system.

Each visible and spoken trial contains exactly two premises and one conclusion using three arbitrary letter-nodes. Statements 1 and 2 define the current spatial model. Statement 3 is separately evaluated for whether it is logically entailed by those premises.

After the initial N memory-fill trials, every scored trial requires five binary decisions:

1. whether current Statement 1 matches one statement in the trial exactly N positions earlier;
2. whether current Statement 2 matches one historical statement;
3. whether current Statement 3 matches one historical statement;
4. whether current Statement 3 is entailed by current Statements 1 and 2;
5. whether the complete current triad matches the historical triad.

Statement-level matching is not calculated through three independent resemblance checks. The engine requires one globally consistent bijection between the historical and current letters and a one-to-one assignment between statements. A statement counts as a match only when it participates in the best coherent alignment. Equivalent reversed wording is accepted only when subject/object reversal is accompanied by the opposite compass direction. Arbitrary letter renaming and statement reordering do not by themselves break structural equivalence.

A whole-triad MATCH requires all three statements to align under the same mapping. One-statement and two-statement correspondences remain partial matches and are scored as interference rather than being collapsed into a single whole-trial answer.

The cognitive-interference generator uses controlled profiles rather than generic random errors. Depending on the interference setting, it creates:

- zero-, one- and two-of-three statement matches;
- adjacent 16-direction substitutions;
- near, orthogonal and opposite-direction substitutions;
- changed surface letters with preserved structure;
- preserved surface letters with changed relational roles;
- valid inverse wording;
- conflicts between historical familiarity and current entailment;
- globally coherent alignment requirements that suppress incompatible local interpretations.

At the highest interference setting, non-match trials preferentially preserve exactly two globally coherent statements while changing one precise relation. The player must therefore discriminate a near-complete historical structure while independently determining whether the current conclusion is logically valid.

Mode 1 supports N-back levels 1 through 8. The browser interface displays ten response buttons: Match/No Match for each historical statement decision, Entailed/Not Entailed for current conclusion validity, and Match/No Match for complete-triad identity. All five decisions must be entered before submission.

### Mode 2 — Ontological Integration

Mode 2 displays the ontology categories All, Difference, Action, Division, Connection, Multiplication, Projection, Encompassment and Completion, together with Inner and Outer presentation labels.

Its N-back answer is determined by the complete three-statement compass structure of the current and historical trials. Ontology categories and Inner/Outer labels are presentation-level cognitive transformations and are excluded from MATCH/NO MATCH scoring. Consistent letter renaming, premise reordering and logically equivalent reversed wording preserve structural identity.

### Exact relational core

Both modes use the same exact 16-direction compass algebra. The core rejects:

- adjacent but non-identical directions;
- subject/object reversal without direction inversion;
- correct relations assigned to the wrong letter pair;
- incorrect shared-anchor branch comparisons;
- locally plausible relations that fail the complete graph.

## Validation

The repository includes independent tests for:

- all N-back levels from 1 through 8;
- five mandatory Mode 1 decisions per scored trial;
- globally consistent letter mapping;
- one-to-one statement assignment;
- inverse-wording equivalence;
- exact 16-direction discrimination;
- controlled two-of-three interference lures;
- current-trial entailment separated from historical matching;
- complete-triad matching;
- Mode 2 structural comparison;
- ontology and form-label scoring neutrality.

GitHub Actions runs separate Mode 1 conflict-matrix, canonical Mode 2 and deep Mode 2 validation jobs.

This is a theoretically motivated cognitive-training design. It is not validated evidence that training increases general fluid intelligence or GAMSAT performance.
