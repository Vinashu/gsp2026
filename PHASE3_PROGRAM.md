# Genome Sorting AutoResearch Program - Phase 3

## Phase Definition

Phase 2 is complete.

The current baseline winner is `v19` in `solver.js`.

Phase 2 artifacts remain historical reference points and must be preserved:

- `docs/program.md`
- `docs/RESEARCH_LOOP_PROMPT.md`
- `results.tsv`
- `results_phase2.tsv`
- `analysis/clostridium_pairs_full/`

Do not reinterpret those files as the new active doctrine. They document how we
arrived at `v19`.

Phase 3 has a different goal:

1. preserve the quality of `v19`
2. generalize it on a harder genomic subset
3. reduce runtime where possible
4. keep the solver explainable

## Active Phase 3 Tracks

There are now four distinct reference tracks:

1. `benchmark/phase3_hard_genomic.json`
   Primary Phase 3 development target. This is the new optimization surface.
2. `benchmark/phase2_dev.json`
   Historical Phase 2 development set. Use as a non-regression guardrail.
3. `benchmark/puzzles.json`
   Legacy 8-puzzle continuity benchmark. Keep this frozen.
4. `benchmark/phase2_holdout.json`
   Reserved milestone set. Use sparingly.

The full Clostridium sweep in `analysis/clostridium_pairs_full/` is not an
inner-loop benchmark. It is historical evidence and a source for puzzle
selection, failure analysis, and paper writing.

## File Responsibilities

| File | Your access |
|------|-------------|
| `solver.js` | Read and write freely. This remains the only file you modify during a Phase 3 loop. |
| `gameEngine.js` | Read only. Never modify. |
| `evaluate.js` | Read only. Legacy benchmark harness. |
| `evaluate_dataset.js` | Read only. Quality evaluator. |
| `measure_dataset_runtime.js` | Read only during loops. Runtime evaluator. |
| `benchmark/phase3_hard_genomic.json` | Read only. Main Phase 3 manifest. |
| `benchmark/phase2_dev.json` | Read only. Guardrail manifest. |
| `benchmark/phase2_holdout.json` | Read only. Milestone-only holdout. |
| `benchmark/puzzles.json` | Read only. Legacy continuity benchmark. |
| `results_phase3.tsv` | Read only. Written automatically by `evaluate_dataset.js`. |
| `timings_phase3.tsv` | Read only. Written automatically by `measure_dataset_runtime.js`. |
| `results_phase2.tsv` | Read only. Historical Phase 2 quality log. |
| `results.tsv` | Read only. Historical legacy log. |
| `PHASE3_PROGRAM.md` | Read only. Your active Phase 3 doctrine. |

## Phase 3 Objective

The Phase 2 question was:

"Can we discover a strong heuristic?"

The Phase 3 question is:

"Can we preserve that heuristic while making it broader and cheaper?"

Search for:

- better handling of hard genomic growth cases
- smarter duplication-length choice on long repeated targets
- lower rollout overhead
- reuse of score information or cached structure
- pruning rules that preserve solution quality

Avoid:

- reopening Phase 2 with tiny score-chasing changes on already-easy puzzles
- runtime reductions that clearly damage hard-genomic quality
- changes that win only on one pathological pair
- obscure implementation tricks that weaken the algorithmic story

## What Counts as Success in Phase 3

A candidate revision is good if it satisfies one of these:

1. It improves `phase3-hard-genomic` quality with no meaningful regression on
   `phase2_dev` or the legacy benchmark.
2. It preserves `phase3-hard-genomic` quality closely enough, while materially
   improving runtime on that same manifest and not regressing the guardrails.

Interpret "materially improving runtime" conservatively. Tiny timing noise does
not count as research progress.

## Required Evaluations

Primary quality evaluation:

```bash
HYPOTHESIS="description" node evaluate_dataset.js --manifest benchmark/phase3_hard_genomic.json
```

Primary timing evaluation:

```bash
HYPOTHESIS="description" node measure_dataset_runtime.js --manifest benchmark/phase3_hard_genomic.json
```

Guardrail evaluation:

```bash
HYPOTHESIS="description" node evaluate_dataset.js --manifest benchmark/phase2_dev.json
HYPOTHESIS="description" node evaluate.js
```

Holdout milestone check:

```bash
node evaluate_dataset.js --manifest benchmark/phase2_holdout.json
```

## Experimental Discipline

Phase 3 still uses one change per iteration.

Do not mix:

- one heuristic change
- one caching change
- one pruning change

into a single experiment unless they are inseparable.

If a change is mainly about speed, say so explicitly.
If a change is mainly about hard-genomic quality, say so explicitly.

## Required Reporting

Every accepted Phase 3 revision should report:

- hypothesis
- whether the goal was quality, runtime, or both
- `phase3-hard-genomic` quality change
- `phase3-hard-genomic` runtime change
- `phase2_dev` guardrail result
- legacy benchmark guardrail result
- optional holdout note
- failure modes
- interpretation

## Core Principle

Do not treat Phase 3 as a new blank-slate search.

Treat it as the generalization and efficiency phase of the same solver story.
