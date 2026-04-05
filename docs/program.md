# Genome Sorting AutoResearch Program

## Mission

Your mission is to help discover, refine, and validate a strong heuristic
algorithm for the genome sorting problem.

This is not a code generation contest.
This is not a benchmark gaming exercise.
This is not a search for brittle tricks that only work on a few puzzles.

The goal is to produce a solver strategy that is:

1. correct under the puzzle rules
2. strong across a range of puzzle types
3. explainable in human terms
4. expressible as a coherent heuristic algorithm

You are part of an iterative research loop. You will propose, test, analyze,
and refine solver strategies.

## File Responsibilities

| File | Your access |
|------|-------------|
| `solver.js` | Read and write freely. This is the only file you modify. |
| `gameEngine.js` | Read only. Never modify. |
| `evaluate.js` | Read only. Never modify. Legacy benchmark harness. |
| `evaluate_dataset.js` | Read only. Never modify. Phase 2 manifest harness. |
| `benchmark/puzzles.json` | Read only. Never modify. Legacy continuity benchmark. |
| `benchmark/phase2_dev.json` | Read only. Never modify. Main Phase 2 tuning manifest. |
| `benchmark/phase2_holdout.json` | Read only. Never modify. Reserved Phase 2 holdout manifest. |
| `results.tsv` | Read only. Written automatically by `evaluate.js`. |
| `results_phase2.tsv` | Read only. Written automatically by `evaluate_dataset.js`. |
| `docs/program.md` | Read only. Your operating manual. |

Additional puzzle files under `syntetic_puzles/dev/` and `real_puzzles/dev/`
may be read for context, but Phase 2 research should use the curated manifests
rather than ad hoc puzzle picking.

## Phase 2 Study Tracks

The study now has three explicit evaluation tracks:

1. `benchmark/puzzles.json`
   Legacy continuity benchmark. Keep this frozen so Phase 2 work can still be
   compared to the original study.
2. `benchmark/phase2_dev.json`
   Main Phase 2 tuning manifest. This is where day-to-day hypothesis testing
   happens.
3. `benchmark/phase2_holdout.json`
   Reserved holdout manifest. Do not tune against it. Use it only for periodic
   milestone checks or before claiming a new solver baseline.

## Problem Definition

We are solving a version of the genome sorting problem.

A puzzle contains:

- a target genome
- a mutable genome
- a distinguished central pivot called the terminus `[t]`

The objective is to transform the mutable genome into the target genome using
the fewest valid operations possible.

## Allowed Operations

There are exactly three allowed operations, implemented in `gameEngine.js`:

1. Duplication
   Copy one or more genes from one location and insert them elsewhere.
2. Deletion
   Remove one or more genes.
3. Inversion
   Invert a contiguous sequence of genes that includes the terminus.

## Critical Constraints

These constraints are enforced by `gameEngine.js`. Invalid operations throw an
error and must not be used.

### Inversion Constraint

An inversion is only valid if the selected segment includes `[t]`.

### Cross-Terminus Duplication Constraint

If genes are duplicated from one side of the terminus to the other side, the
copied sequence is automatically reversed by the engine.

### Terminus Anchoring

The terminus is a structural reference point that strongly affects good
solution strategies. You cannot delete it.

## How to Run an Experiment

Primary Phase 2 evaluation:

```bash
HYPOTHESIS="description of what you are testing" node evaluate_dataset.js --manifest benchmark/phase2_dev.json
```

This:

1. runs `solver.js` on the curated Phase 2 development manifest with a fixed
   150-move budget
2. prints per-puzzle results and a summary
3. appends one row to `results_phase2.tsv`

Legacy continuity check:

```bash
HYPOTHESIS="description of what you are testing" node evaluate.js
```

This runs the frozen 8-puzzle benchmark and appends to `results.tsv`.

Single-puzzle debugging:

```bash
node evaluate.js --puzzle level20 --verbose
node evaluate_dataset.js --manifest benchmark/phase2_dev.json --puzzle level30 --verbose
```

Revert after a failed idea:

```bash
git checkout HEAD -- solver.js
```

## Research Objective

We are not trying to memorize solutions to fixed puzzles.

We are trying to discover strong and general solver behavior.

Search for:

- good move ordering strategies
- better move evaluation heuristics
- useful search decompositions
- robust global alignment strategies
- effective inversion usage
- reusable principles that can later be written as an explicit algorithm

Avoid:

- overfitting to tiny subsets
- arbitrary hacks
- hidden puzzle-specific assumptions
- changes that improve scores while making the solver less understandable

## Key Prior Knowledge

Human player observations suggest:

1. Good solutions often start near the terminus and expand outward.
2. Good solvers often prefer larger global moves over short local fixes.
3. Inversions can be highly valuable because one inversion may replace multiple
   duplication and deletion operations.
4. Greedy local matching can trap the solver into longer solutions.
5. Regions far from the terminus are often harder to reason about correctly.
6. Repetitive local patterns can mislead both humans and algorithms.

## Solver Philosophy

The solver should behave like a careful researcher, not a reckless optimizer.

Prefer strategies that:

- reduce global disorder
- preserve already-good alignment when possible
- exploit inversion opportunities
- reason about future consequences of a move

Do not focus only on immediate local matches.

## Experimental Discipline

This project depends on controlled comparisons.

Keep the roles of the evaluation tracks separate:

- optimize primarily on `benchmark/phase2_dev.json`
- use `benchmark/puzzles.json` as a non-regression continuity check
- keep `benchmark/phase2_holdout.json` mostly untouched during iteration

Do not change multiple unrelated ideas at once if it makes the result hard to
interpret.

Small, interpretable improvements are preferred over chaotic leaps.

## What Counts as Success

A proposed solver revision is good if it improves one or more of the following
without causing unacceptable regressions:

- average solution quality (`avgRatio`)
- number of puzzles solved within budget (`solvedCount`)
- robustness across puzzle categories
- clarity of decision-making
- usefulness as a general heuristic principle

For the current Phase 2 study, interpret that as:

- primary improvement on `phase2_dev`
- no clear regression on the legacy benchmark
- holdout used for milestone validation, not iterative score chasing

## Evaluation Questions

When analyzing a solver revision, ask:

1. Does it produce fewer moves on average?
2. Does it help on inversion-heavy puzzles?
3. Does it help on duplication and deletion heavy puzzles?
4. Does it generalize across easy and hard puzzles?
5. Does it improve global reasoning rather than local greediness?
6. Does it remain understandable?

## Required Logging for Every Experiment

Every experiment should produce a short structured report.

Include:

- Hypothesis
- Change
- Expected benefit
- Result on `phase2_dev`
- Result on the legacy benchmark
- Failure modes
- Interpretation
- Recommendation

If you run holdout, report it separately and do not use it as a tuning target.

## Anti-Goals

Do not do the following:

- do not hardcode puzzle answers or use puzzle IDs in solver logic
- do not exploit benchmark artifacts
- do not silently change puzzle rules
- do not optimize purely for one category while harming all others
- do not present unexplained improvements as research progress
- do not produce solver logic that no human can describe afterward

## Solver Version Tracking

The top of `solver.js` must always contain:

```js
// @version vN
```

Increment the version number with each accepted revision.

## Core Principle

Do not just search for lower scores.

Search for understanding.

Lower scores matter because they reveal better reasoning. The real success
condition is discovering a strong and explainable heuristic for the genome
sorting problem.
