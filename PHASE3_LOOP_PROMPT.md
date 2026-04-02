# Autoresearch Session: Genome Sorting Problem (Phase 3)

Read `PHASE3_PROGRAM.md` carefully before starting. It is your active Phase 3
doctrine.

## Your Loop

Repeat until I tell you to stop.

### Step 1 - Read current state

Read:

- `PHASE3_PROGRAM.md`
- the current `solver.js`
- the most recent row in `results_phase3.tsv` for the current Phase 3 baseline
- the most recent row in `timings_phase3.tsv` for the current runtime baseline
- the most recent `phase2-dev` row in `results_phase2.tsv`
- the last row of `results.tsv`

### Step 2 - Form one hypothesis

Propose exactly one change in plain English.

State whether it is mainly aimed at:

- hard-genomic quality
- runtime
- or both

### Step 3 - Implement

Modify only `solver.js`.

- increment the `// @version` comment at the top
- do not change the `solve(mutableGenome, targetGenome, options)` signature
- do not change any evaluation harness or manifest

### Step 4 - Evaluate the Phase 3 quality target

Run:

```bash
HYPOTHESIS="<your hypothesis in one sentence>" node evaluate_dataset.js --manifest benchmark/phase3_hard_genomic.json
```

### Step 5 - Evaluate Phase 3 runtime

Run:

```bash
HYPOTHESIS="<your hypothesis in one sentence>" node measure_dataset_runtime.js --manifest benchmark/phase3_hard_genomic.json
```

### Step 6 - Guardrail checks

If the Phase 3 quality is clearly worse, revert immediately.

If the Phase 3 result improved, or if it stayed effectively stable while
runtime improved materially, run:

```bash
HYPOTHESIS="<your hypothesis in one sentence>" node evaluate_dataset.js --manifest benchmark/phase2_dev.json
HYPOTHESIS="<your hypothesis in one sentence>" node evaluate.js
```

### Step 7 - Decide

Compare against:

- the previous row in `results_phase3.tsv`
- the previous row in `timings_phase3.tsv`
- the latest `phase2-dev` row in `results_phase2.tsv`
- the latest row in `results.tsv`

Decision rule:

- Better Phase 3 quality and no meaningful guardrail regression -> keep.
- Similar Phase 3 quality, materially better Phase 3 runtime, and no meaningful
  guardrail regression -> keep.
- Otherwise -> revert `solver.js` and report a brief failure note.

### Step 8 - Use holdout sparingly

Do not tune against `benchmark/phase2_holdout.json`.

Run it only:

- after a cluster of accepted Phase 3 changes
- or before claiming a new milestone baseline

### Step 9 - Repeat

Do not pause to ask whether to continue. Run autonomously until told to stop.

## Experiment Report Format

For every kept change, report:

```text
### Experiment - [solver version]

Hypothesis: [what you tested]
Primary objective: [quality / runtime / both]
Change: [what you modified in solver.js]
Expected benefit: [why it should help]
Result:
- Phase 3 avgRatio: [before] -> [after]
- Phase 3 solved: [before] -> [after]
- Phase 3 total runtime: [before] -> [after]
- Phase 2 dev avgRatio: [before] -> [after]
- Legacy avgRatio: [before] -> [after]
- Optional holdout check: [not run / summary]
Failure modes: [which puzzles got worse, if any]
Interpretation: [what this tells us]
Recommendation: Keep / Discard / Revise
```

## Hard Rules

| Rule | Why |
|------|-----|
| Never modify `gameEngine.js` | Rules must stay fixed |
| Never modify `evaluate.js` | Legacy harness must stay fixed |
| Never modify `evaluate_dataset.js` | Quality harness must stay fixed |
| Never modify `measure_dataset_runtime.js` during a solver loop | Runtime harness must stay fixed |
| Never modify any manifest during a solver loop | Dataset split must stay fixed |
| Never hardcode puzzle IDs in solver logic | Overfitting |
| Propose exactly one change per iteration | Interpretability |
| You may only modify `solver.js` during a loop | Everything else is fixed environment |

## How to Revert `solver.js`

```bash
git checkout HEAD -- solver.js
```

## What Counts as Improvement

Primary Phase 3 criteria:

- lower `phase3-hard-genomic` `avgRatio`
- higher `phase3-hard-genomic` `solvedCount`
- or materially lower runtime at similar Phase 3 quality

Guardrails:

- no clear regression on `phase2_dev`
- no clear regression on the frozen 8-puzzle benchmark

Secondary signals:

- better hard-pair behavior on the `AP012212` cluster
- lower rollout overhead
- simpler and more explainable search behavior

The goal is now broader than "lower score." It is a stronger and faster
heuristic with a clean research story.
