# Autoresearch Session: Genome Sorting Problem (Phase 2)

Read `docs/program.md` carefully before starting. It is your research doctrine.

## Your Loop

Repeat until I tell you to stop.

### Step 1 - Read current state

Read:

- `docs/program.md`
- the current `solver.js`
- the most recent `phase2-dev` row in `results_phase2.tsv` to know the current Phase 2 dev baseline
- the last row of `results.tsv` to know the current legacy benchmark baseline

### Step 2 - Form one hypothesis

Propose exactly one heuristic change in plain English.

Your hypothesis must explain:

- what you are changing
- why you expect it to help
- which puzzle categories it should benefit

### Step 3 - Implement

Modify only `solver.js`.

- increment the `// @version` comment at the top
- do not change the `solve(mutableGenome, targetGenome, options)` signature
- do not change any evaluation harness or puzzle manifest

### Step 4 - Evaluate on Phase 2 dev

Run:

```bash
HYPOTHESIS="<your hypothesis in one sentence>" node evaluate_dataset.js --manifest benchmark/phase2_dev.json
```

### Step 5 - Sanity-check the legacy benchmark

If the Phase 2 dev result improved, also run:

```bash
HYPOTHESIS="<your hypothesis in one sentence>" node evaluate.js
```

### Step 6 - Decide

Compare the new results to the previous `phase2-dev` row in `results_phase2.tsv`
and the previous row in `results.tsv`.

- Improved on `phase2_dev` and no meaningful legacy regression -> keep the
  change and write a structured experiment report.
- No `phase2_dev` improvement, or a clear legacy regression -> revert
  `solver.js` to the previous version and log a brief failure note.

### Step 7 - Use holdout sparingly

Do not tune against `benchmark/phase2_holdout.json`.

Run it only:

- after a cluster of accepted changes
- or before claiming a new milestone solver baseline

### Step 8 - Repeat

Do not pause to ask me whether to continue. Run the loop autonomously.

## Experiment Report Format

For every kept change, report:

```text
### Experiment - [solver version]

Hypothesis: [what you tested]
Change: [what you modified in solver.js]
Expected benefit: [why it should help]
Result:
- Phase 2 dev avgRatio: [before] -> [after]
- Phase 2 dev solved: [before] -> [after]
- Legacy avgRatio: [before] -> [after]
- Legacy solved: [before] -> [after]
- Optional holdout check: [not run / summary]
Failure modes: [which puzzles got worse, if any]
Interpretation: [what this tells us about the problem]
Recommendation: Keep / Discard / Revise
```

## Hard Rules

| Rule | Why |
|------|-----|
| Never modify `gameEngine.js` | Rules must stay fixed for fair comparison |
| Never modify `evaluate.js` | Legacy harness must stay fixed |
| Never modify `evaluate_dataset.js` | Phase 2 harness must stay fixed |
| Never modify `benchmark/puzzles.json` | Legacy benchmark must stay fixed |
| Never modify `benchmark/phase2_dev.json` or `benchmark/phase2_holdout.json` during a solver loop | Dataset split must stay fixed |
| Never hardcode puzzle IDs in solver logic | Overfitting, not research |
| Propose exactly one change per iteration | Interpretability |
| You may only modify `solver.js` | Everything else is the fixed environment |

## How to Revert `solver.js`

```bash
git checkout HEAD -- solver.js
```

## What Counts as Improvement

Primary Phase 2 criterion:

- lower `phase2_dev` `avgRatio`
- higher `phase2_dev` `solvedCount`

Legacy guardrail:

- do not accept a change that clearly worsens the frozen 8-puzzle benchmark

Secondary signals:

- higher `optimalCount`
- better `avgRatioSynthetic` or `avgRatioReal`
- better milestone behavior on `phase2_holdout`

The final goal is not just a lower score. It is a stronger and more
explainable heuristic.
