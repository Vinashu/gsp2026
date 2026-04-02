# Genome Sorting AutoResearch Program

## Mission

Your mission is to help discover, refine, and validate a strong heuristic algorithm for the genome sorting problem.

This is not a code generation contest.
This is not a benchmark gaming exercise.
This is not a search for brittle tricks that only work on a few puzzles.

The goal is to produce a solver strategy that is:

1. correct under the puzzle rules,
2. strong across a range of puzzle types,
3. explainable in human terms,
4. and eventually expressible as a coherent heuristic algorithm.

You are part of an iterative research loop.
You will propose, test, analyze, and refine solver strategies.

The final output of this project should be more than "the best run".
It should be a set of reusable algorithmic ideas.

---

## File Responsibilities

| File | Your access |
|------|-------------|
| `solver.js` | **Read and write freely.** This is the only file you modify. |
| `gameEngine.js` | Read only. Never modify. |
| `evaluate.js` | Read only. Never modify. |
| `benchmark/puzzles.json` | Read only. Never modify. |
| `results.tsv` | Read only (written automatically by evaluate.js). |
| `program.md` | Read only. Your operating manual. |

---

## Problem Definition

We are solving a version of the genome sorting problem.

A puzzle contains:

- a **target genome**
- a **mutable genome**
- a distinguished central pivot called the **terminus `[t]`**

The objective is to transform the mutable genome into the target genome using the fewest valid operations possible.

A solution is a sequence of valid operations that transforms the mutable genome exactly into the target genome.

Lower scores are better.

---

## Allowed Operations

There are exactly three allowed operations, implemented in `gameEngine.js`:

### 1. Duplication
Copy one or more genes from one location and insert them elsewhere.

### 2. Deletion
Remove one or more genes.

### 3. Inversion
Invert a contiguous sequence of genes that includes the terminus.

---

## Critical Constraints

These constraints are enforced by `gameEngine.js`. Operations that violate them throw an error and must not be used.

### Inversion Constraint
An inversion is only valid if the selected segment **includes `[t]`** (the terminus index must be strictly inside the inverted range).

### Cross-Terminus Duplication Constraint
If genes are duplicated from one side of the terminus to the other side, the copied sequence is **automatically reversed** by the engine.

Example:
- source: `A B` (left of `[t]`)
- duplicated to right of `[t]`
- result inserted as: `B A`

### Terminus Anchoring
The terminus is not just a marker. It is a structural reference point that strongly affects good solution strategies. You cannot delete it.

---

## How to Run an Experiment

```bash
HYPOTHESIS="description of what you are testing" node evaluate.js
```

This:
1. Runs `solver.js` on all 8 benchmark puzzles with a fixed 150-move budget
2. Prints per-puzzle results and a summary
3. Appends one row to `results.tsv`

To test a single puzzle during development:
```bash
node evaluate.js --puzzle level20 --verbose
```

To revert `solver.js` after a failed experiment:
```bash
git checkout HEAD -- solver.js
```

---

## Research Objective

We are not trying to memorize solutions to fixed puzzles.

We are trying to discover strong and general solver behavior.

You should search for:

- good move ordering strategies,
- better move evaluation heuristics,
- useful search decompositions,
- robust global alignment strategies,
- effective inversion usage,
- and reusable principles that can later be written as an explicit algorithm.

You should avoid:

- overfitting to a tiny subset of puzzles,
- arbitrary hacks,
- hidden puzzle-specific assumptions,
- and changes that improve scores while making the solver less understandable.

---

## Key Prior Knowledge

The following prior knowledge is important and should be treated as strong guidance, but not as unquestionable truth.

### Human Player Insights
Prior observations from puzzle players suggest:

1. Good solutions often start near the **terminus** and expand outward.
2. Good solvers often prefer **larger global moves** over short local fixes.
3. Inversions can be highly valuable because a single inversion may replace multiple duplication/deletion operations.
4. Greedy local matching can trap the solver into longer solutions.
5. Puzzle regions far from the terminus are often harder to reason about correctly.
6. Repetitive local patterns can mislead both humans and algorithms.

### Known v0 Baseline Weakness
The current v0 solver uses a positional alignment score from absolute index 0. This fails when genomes have different lengths, because insertions and deletions shift all downstream positions. The solver gets stuck on all 8 benchmark puzzles. This is the deliberate starting point. The most natural first improvement is to score alignment relative to the terminus position, not absolute index.

---

## Solver Philosophy

The solver should behave like a careful researcher, not like a reckless optimizer.

Prefer strategies that:
- reduce global disorder,
- preserve already-good alignment when possible,
- exploit inversion opportunities,
- and reason about future consequences of a move.

Do not focus only on immediate local matches.
A move that creates one match now may destroy better structure or prevent a shorter solution later.

A strong move is often one that improves the puzzle globally, not just cosmetically.

---

## Experimental Discipline

This project depends on controlled comparisons.

When evaluating changes:

- keep the puzzle set fixed unless explicitly told otherwise,
- keep the evaluation budget fixed (150 moves, set in `evaluate.js`),
- keep the rules fixed,
- and change only the solver logic under study.

Do not change multiple unrelated ideas at once if it makes the result hard to interpret.

Small, interpretable improvements are preferred over chaotic leaps.

---

## What Counts as Success

A proposed solver revision is good if it improves one or more of the following without causing unacceptable regressions:

- average solution quality (`avgRatio`),
- number of puzzles solved within budget (`solvedCount`),
- robustness across puzzle categories,
- clarity of decision-making,
- and usefulness as a general heuristic principle.

A solver revision is especially valuable if it reveals a reusable pattern such as:

- "evaluate inversion candidates before short local edits"
- "solve central alignment before edge cleanup"
- "prefer moves that resolve multiple mismatches simultaneously"

---

## Evaluation Questions

When analyzing a solver revision, ask:

1. Does it produce fewer moves on average?
2. Does it help on inversion-heavy puzzles?
3. Does it help on duplication/deletion-heavy puzzles?
4. Does it generalize across easy and hard puzzles?
5. Does it improve global reasoning rather than just local greediness?
6. Does it remain understandable?

A change that helps on one puzzle but makes the solver conceptually worse is usually not a good research contribution.

---

## Puzzle Categories to Respect

The benchmark contains:

- `small` — level20, level21, level22 (synthetic, 15–22 genes)
- `medium` — level28 (synthetic, 26 genes)
- `large` — level29 (synthetic, ~115 genes), and all three real bacterial puzzles
- `inversion-critical` — level20
- `inversion-heavy` — level21
- `real-bacterial` — three real bacterial genome pairs
- `hard` — level29 (synthetic), ed91 (real)

Do not assume one strategy fits all cases equally well.

---

## Required Logging for Every Experiment

Every experiment should produce a short structured report.

Include:

### A. Hypothesis
What idea is being tested?

### B. Change
What was changed in `solver.js`?

### C. Expected Benefit
Why should this help?

### D. Result
What happened on the benchmark? (paste key numbers from evaluate.js output)

### E. Failure Modes
Where did it do worse?

### F. Interpretation
What did we learn?

### G. Recommendation
Keep, discard, or revise?

If the result is ambiguous, say so clearly.
Do not exaggerate weak evidence.

---

## Heuristic Discovery Mindset

The point of repeated experiments is not just to find a winner.
It is to discover recurring principles.

If multiple good revisions independently converge on the same idea, that idea should be promoted into the doctrine.

Examples:
- central-first solving,
- inversion opportunism,
- global cleanup preference,
- or pattern-aware caution.

When this happens, update your mental model of the problem.

---

## How to Think About the Terminus

The terminus is a strategic anchor.

You should think carefully about:
- how alignment propagates outward from it,
- how inversions depend on it,
- how cross-terminus moves transform orientation,
- and how the visibility of structure near the terminus may make it the best starting region.

A solver that ignores the strategic role of the terminus is unlikely to become strong.

---

## Attitude Toward Inversions

Inversions deserve special attention.

Because inversions can substitute for multiple other operations, they may create major gains.
However, inversion opportunities may be visually or structurally harder to detect.

You should actively test policies such as:
- checking inversion candidates before local edits,
- estimating inversion impact on both sides of the terminus,
- and preferring inversions when they collapse multiple mismatches.

At the same time, do not force inversions where they are not beneficial.

---

## Anti-Goals

Do not do the following:

- do not hardcode puzzle answers or use puzzle IDs in solver logic,
- do not exploit benchmark artifacts,
- do not silently change puzzle rules,
- do not optimize purely for one category while harming all others,
- do not present unexplained improvements as research progress,
- do not produce solver logic that no human can describe afterward.

If a strategy is strong but impossible to explain, it is less valuable for this project.

---

## Solver Version Tracking

The top of `solver.js` must always contain:
```js
// @version vN
```
Increment the version number with each accepted revision (v0 → v1 → v2 ...).
`evaluate.js` reads this automatically and logs it to `results.tsv`.

---

## Final Deliverable Vision

The final result should look like a real algorithmic strategy.

For example, a final solver may eventually be expressible as:

1. align central region near terminus,
2. identify major structural mismatches,
3. test high-value inversion candidates,
4. choose globally beneficial duplication/deletion moves,
5. clean residual local mismatches,
6. stop when exact target alignment is reached.

This is just an example shape, not a final prescription.

Your work should help discover the real version.

---

## Core Principle

Do not just search for lower scores.

Search for understanding.

Lower scores matter because they reveal better reasoning.
The real success condition is discovering a strong and explainable heuristic for the genome sorting problem.
