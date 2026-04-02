# Karpathy Autoresearch — Adapted for Genome Sorting

This document describes how Karpathy's autoresearch methodology is adapted to the genome sorting domain, and maps each principle to the concrete files in this repository.

Original repo: [karpathy/autoresearch](https://github.com/karpathy/autoresearch)

---

## The Analogy

In Karpathy's system, an AI agent iterates on `train.py` (a GPT training script) inside a fixed environment (dataset, optimizer, evaluation metric). Each experiment takes ~5 minutes, keeps only improvements, and discards regressions via git. Over many cycles the model improves autonomously.

Here, the agent iterates on `solver.js` (the genome sorting heuristic) inside a fixed environment (benchmark puzzles, game rules, evaluation harness). Each experiment runs in seconds, keeps only improvements, and discards regressions via `git checkout HEAD -- solver.js`.

| Karpathy autoresearch | This project |
|-----------------------|--------------|
| `train.py` — editable artifact | `solver.js` — editable artifact |
| `prepare.py` — fixed environment | `gameEngine.js` + `evaluate.js` + `benchmark/puzzles.json` |
| `program.md` — research doctrine | `program.md` — research doctrine |
| Metric: validation bits-per-byte | Metric: `avgRatio` (moves / known best) |
| ~5 min per experiment | <30 s per experiment |
| git revert on regression | `git checkout HEAD -- solver.js` |

---

## Methodology Principles (Implemented)

### 1. Freeze the world, vary only the solver

The benchmark puzzles, game rules, evaluation budget, and scoring formula are all fixed. Only `solver.js` changes between experiments. This gives clean, comparable results across every iteration.

**Implementation:** `gameEngine.js`, `evaluate.js`, and `benchmark/puzzles.json` are committed to git and must never be modified by the agent.

### 2. The research doctrine (`program.md`)

`program.md` is the agent's operating manual. It contains:
- the full problem definition and operation constraints,
- known player insights and failure modes,
- the known weakness of the current baseline,
- and the experimental discipline rules.

The agent reads it at the start of every session.

### 3. A stable fitness metric

Primary metric: **avgRatio** = mean of (solver moves / known best score) across solved puzzles. Secondary: `solvedCount`, `optimalCount`, per-category ratios.

All metrics are computed identically every run by `evaluate.js`. The 150-move budget is a constant that never changes.

Phase 2 adds one important nuance: some genomic reference scores come from the
legacy OrthoAlign tool, which uses a broader event model than this repo's game
engine. Those scores are still useful comparative references, but they are not
always fair like-for-like lower bounds for our solver. See
[ORTHOALIGN_COMPARATOR_NOTE.md](/c:/Repos/gsp2026/ORTHOALIGN_COMPARATOR_NOTE.md).

### 4. A curated benchmark set

`benchmark/puzzles.json` contains 8 puzzles across categories:
- easy synthetic cases (level20–22)
- medium synthetic (level28)
- large/hard synthetic (level29)
- real bacterial genome pairs (3 puzzles, human-validated solutions)

This range prevents overfitting to a single difficulty class.

### 5. Start from a working baseline

`solver.js` v0 implements a simple terminus-anchored greedy strategy. It gets stuck on all 8 puzzles (0/8 solved) because its alignment score uses absolute position instead of terminus-relative position. This is the intentional, interpretable starting point — not a blank slate.

### 6. One revision at a time

Each experiment proposes **one** hypothesis, implements it in `solver.js`, and evaluates it. This makes experiments interpretable and regressions diagnosable. The agent must not bundle multiple ideas.

### 7. Fixed-budget experiments

Every experiment uses:
- the same 8 puzzles
- the same 150-move maximum per puzzle
- the same scoring formula

A solver that "wins" only by spending more search iterations is not a true heuristic improvement.

### 8. Log behavioral evidence, not just scores

Every kept revision produces a structured report:
- what changed,
- why it was expected to help,
- which categories improved/worsened,
- and what the result tells us about the problem.

The agent writes this report to the session log. Over time, these reports become a research dataset of heuristic strategies.

On genomic puzzles, that interpretation must be careful: a missed OrthoAlign
reference does not automatically falsify a heuristic if the missed improvement
likely depends on an event our engine does not support.

### 9. Keep improvements, discard regressions

If `avgRatio` improves (or `solvedCount` increases without avgRatio worsening): keep the commit.
If not: `git checkout HEAD -- solver.js` and try the next hypothesis.

### 10. Promote recurring discoveries into doctrine

If multiple successful experiments independently converge on the same pattern — for example, "scoring inversions by bilateral improvement beats unilateral" — that pattern is promoted from an experimental observation into an explicit rule. The doctrine in `program.md` may be updated to reflect confirmed findings.

---

## Running the Loop

### One-time setup
```bash
node benchmark/validation/checkBenchmark.js   # verify engine (87 checks)
HYPOTHESIS="v0 baseline" node evaluate.js     # establish baseline in results.tsv
git add solver.js results.tsv && git commit -m "feat: v0 baseline"
```

### Starting a research session
Open Claude Code in this directory and paste the contents of `RESEARCH_LOOP_PROMPT.md`.

The agent will run autonomously until you tell it to stop.

### Reviewing progress
```bash
cat results.tsv          # full log of all experiments
tail -1 results.tsv      # latest result only
git log --oneline        # history of kept improvements
```

---

## What the Final Output Should Look Like

Not "the agent's best run."

A **human-readable heuristic algorithm** for genome sorting that:
- is grounded in benchmark evidence,
- is validated on a stable, diverse puzzle set,
- is partly inspired by human player behavior and partly by agent-discovered patterns,
- and can be described and justified to a research audience.

That is the real adaptation of autoresearch to this domain: not autonomous coding for its own sake, but an **autonomous heuristic discovery pipeline**.
