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

## Problem Definition

We are solving a version of the genome sorting problem.

A puzzle contains:

- a **target genome**
- a **mutable genome**
- a distinguished central pivot called the **terminus**

The objective is to transform the mutable genome into the target genome using the fewest valid operations possible.

A solution is a sequence of valid operations that transforms the mutable genome exactly into the target genome.

Lower scores are better.

---

## Allowed Operations

There are exactly three allowed operations:

### 1. Duplication
Copy one or more genes from one location and insert them elsewhere.

### 2. Deletion
Remove one or more genes.

### 3. Inversion
Invert a contiguous sequence of genes around the terminus.

---

## Critical Constraints

These constraints are mandatory and must always be respected.

### Inversion Constraint
An inversion is only valid if the selected segment:

- includes the terminus, or
- is directly adjacent to the terminus.

Do not invent generalized inversions that ignore this rule.

### Cross-Terminus Duplication Constraint
If genes are duplicated from one side of the terminus to the other side, the copied sequence is inverted.

Example:

- source: `A B`
- duplicated across the terminus
- result inserted as: `B A`

This is a structural rule of the model, not an implementation detail.

### Terminus Anchoring
The genomes are conceptually anchored on the terminus.
The terminus is not just a marker.
It is a structural reference point that strongly affects good solution strategies.

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

These are useful starting priors.
Your job is to test, refine, confirm, or challenge them.

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
- keep the evaluation budget fixed,
- keep the rules fixed,
- and change only the solver logic under study.

Do not change multiple unrelated ideas at once if it makes the result hard to interpret.

Small, interpretable improvements are preferred over chaotic leaps.

---

## What Counts as Success

A proposed solver revision is good if it improves one or more of the following without causing unacceptable regressions:

- average solution quality,
- number of puzzles solved at or near best-known score,
- robustness across puzzle categories,
- clarity of decision-making,
- and usefulness as a general heuristic principle.

A solver revision is especially valuable if it reveals a reusable pattern such as:

- "evaluate inversion candidates before short local edits"
- "solve central alignment before edge cleanup"
- "prefer moves that resolve multiple mismatches simultaneously"

---

## Primary Evaluation Questions

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

The benchmark may contain different categories of puzzles.
You should pay attention to whether a strategy helps or hurts specific classes such as:

- terminus-centered easy cases,
- inversion-critical cases,
- duplication-heavy cases,
- deletion-heavy cleanup cases,
- far-from-terminus difficult cases,
- repetitive-pattern misleading cases.

Do not assume one strategy fits all cases equally well.

Part of the research goal is to understand which heuristic ideas work best for which puzzle structures.

---

## Search Strategy Guidelines

You may explore different solver styles, but do so methodically.

Examples of acceptable directions:

- greedy heuristics,
- beam search with heuristic ranking,
- two-phase solving,
- move scoring functions,
- mismatch clustering,
- inversion-first policies,
- or hybrid strategies.

Examples of unacceptable directions:

- invalid operations,
- hidden manual solutions,
- hardcoding answers for known puzzles,
- or unrestricted search that wins only by spending more compute.

If a strategy performs better only because it uses substantially more search effort, that is not a true heuristic improvement.

---

## Preferred Research Style

When proposing a new idea, state it in plain language first.

Bad:
- "Adjusted some weights and got a better score."

Good:
- "I changed move scoring so that inversions that resolve mismatches on both sides of the terminus are evaluated before local deletions."

Every change should have:
1. a hypothesis,
2. an implementation target,
3. an evaluation result,
4. and an interpretation.

---

## Required Logging for Every Experiment

Every experiment should produce a short structured report.

Include:

### A. Hypothesis
What idea is being tested?

### B. Change
What was changed in the solver?

### C. Expected Benefit
Why should this help?

### D. Result
What happened on the benchmark?

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

## Global vs Local Reasoning

This project strongly values global reasoning.

You should explicitly compare:

- a local move that fixes one mismatch now,
versus
- a larger move that resolves multiple structural problems.

When possible, prefer the move that creates a better global arrangement, even if it seems less immediately obvious.

However, do not blindly favor large moves.
Large moves are valuable only when they improve total structure.

The right goal is not "large moves".
The right goal is "globally efficient moves".

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

## Attitude Toward Duplication and Deletion

Duplication and deletion are essential, but can easily become a crutch for greedy solvers.

Watch for these anti-patterns:
- duplicating to patch a tiny local mismatch,
- deleting small surplus regions too early,
- or using multiple short repairs where one structural move would be better.

You should favor duplication/deletion usage that supports a broader plan.

---

## Anti-Goals

Do not do the following:

- do not hardcode puzzle answers,
- do not exploit benchmark artifacts,
- do not silently change puzzle rules,
- do not optimize purely for one category while harming all others,
- do not present unexplained improvements as research progress,
- do not produce solver logic that no human can describe afterward.

If a strategy is strong but impossible to explain, it is less valuable for this project.

---

## Promotion Criteria for Ideas

An idea should be considered promotion-worthy if:

1. it improves results on multiple puzzles,
2. it appears robust across puzzle categories,
3. it is conceptually understandable,
4. and it contributes to a coherent final solver design.

Repeatedly successful ideas should graduate from "experimental tweak" to "heuristic rule".

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

## JavaScript Environment Assumptions

The implementation language is JavaScript.

Prioritize:
- clarity,
- modularity,
- deterministic behavior where possible,
- and readable solver logic.

Avoid clever but opaque tricks.

The purpose of the code is to support research, not to impress with style.

---

## Decision Rule

For any solver revision, ask:

- Is it valid?
- Is it better?
- Is it interpretable?
- Is it generalizable?

If the answer is not clearly yes to most of these, the revision is not yet good enough.

---

## Core Principle

Do not just search for lower scores.

Search for understanding.

Lower scores matter because they reveal better reasoning.
The real success condition is discovering a strong and explainable heuristic for the genome sorting problem.