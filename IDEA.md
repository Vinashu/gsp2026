# Research Plan: AutoResearch for Genome Sorting Heuristic Discovery

## Objective

Develop a **novel heuristic algorithm for the genome sorting problem** using an iterative autoresearch loop where an AI agent:

- proposes solver strategies,
- tests them on a frozen benchmark,
- refines them based on performance.

The goal is not a black-box winner. It is a **generalizable, explainable heuristic** grounded in both player behavior (GeSort insights) and emergent agent-discovered patterns.

---

## Core Analogy (Karpathy Autoresearch)

| Karpathy autoresearch | This project |
|-----------------------|--------------|
| Editable artifact: `train.py` | Editable artifact: `solver.js` |
| Fixed environment | Fixed puzzle benchmark + rules |
| Metric: validation loss | Metric: avgRatio (moves / known best) |
| Iterative experiments | Iterative solver refinement |
| Keep best version | Keep best heuristic (revert with git) |

The agent evolves the solver strategy. Nothing else changes.

---

## System Architecture

### Fixed components (never change)

- `benchmark/puzzles.json` — 8 benchmark puzzles (5 synthetic + 3 real bacterial)
- `gameEngine.js` — rules engine implementing all three operations with constraints
- `evaluate.js` — evaluation harness; fixed budget, fixed metric
- `program.md` — research doctrine the agent reads before each session

### Mutable component (only this evolves)

- `solver.js` — the heuristic strategy
  - move selection logic
  - prioritization of inversions vs dup/del
  - search strategy (greedy, beam, two-phase, etc.)
  - move scoring functions

---

## Benchmark Design

8 puzzles across difficulty categories:

| Category | Puzzles | Notes |
|----------|---------|-------|
| Small synthetic | level20, level21, level22 | 15–22 genes, known solution count |
| Medium synthetic | level28 | 26 genes |
| Large synthetic | level29 | ~115 genes, hardest synthetic |
| Real bacterial | ed81, ed89 | ~100 genes, human beat OrthoAlign by 45% |
| Real bacterial (hard) | ed91 | ~107 genes, 1723s human solve time |

In addition to the frozen benchmark, the repo now includes auxiliary
development sets that are useful for exploratory testing but should not replace
the headline benchmark:

- `syntetic_puzles/dev/` - extra synthetic puzzles generated from the legacy
  level creator to stress inversion-heavy, repeat-heavy, and macro-move cases
- `real_puzzles/dev/` - extra genomic puzzles built from Clostridium genome
  pairs, filtered so the mutable genome contains all target gene symbols and
  annotated with OrthoAlign `topScore` estimates

---

## Evaluation Protocol

Primary metric: **avgRatio** (mean of solver_moves / known_best across solved puzzles).

Secondary:
- `solvedCount` — puzzles solved within budget (150 moves max)
- `optimalCount` — puzzles matched at known best score
- `avgRatioSynthetic` / `avgRatioReal` — per-source breakdown

Every experiment uses the same 8 puzzles, the same 150-move budget, and the same metric formula. This is the controlled comparison that makes iterations comparable.

The new dev-only puzzle sets are still valuable, but they should be used as a
secondary diagnostic track:

- use dev puzzles to probe whether a hypothesis generalizes beyond the 8 fixed
  benchmark cases
- use the frozen 8-puzzle benchmark for the official keep/revert decision
- if a change only helps the dev set but not the benchmark, treat it as an
  exploratory clue rather than a confirmed improvement

---

## Baseline Solver (v0)

Implemented in `solver.js`. Strategy: **terminus-anchored greedy with inversion priority**.

Current result: **0/8 solved**. The solver gets stuck because it uses positional alignment score (from index 0), which fails when genomes have different lengths. This is the deliberate research starting point.

First natural hypothesis for the agent: compare alignment relative to terminus position rather than absolute index 0.

---

## Autoresearch Loop

```
1. Agent reads program.md + solver.js
2. Proposes ONE hypothesis in plain English
3. Implements it in solver.js (only)
4. Runs: HYPOTHESIS="..." node evaluate.js
5. Compares new avgRatio to last row in results.tsv
6. Improved → keep change, write experiment report
   Not improved → git checkout HEAD -- solver.js
7. Repeat
```

To start a session: open Claude Code in this directory, paste `RESEARCH_LOOP_PROMPT.md`.

---

## Heuristic Extraction Phase

After many iterations, patterns that appear repeatedly across successful experiments should be promoted into explicit algorithmic rules. For example:

- "score inversions by bilateral improvement (both sides of [t])"
- "prefer moves that reduce genome length difference before fixing positions"
- "align terminus-adjacent region before addressing periphery"

These recurring discoveries become the final algorithm.

---

## Final Deliverable

Not "the best run." A **structured, explainable heuristic algorithm** that can be described in plain language, validated on the benchmark, and written up as a research contribution.

Example structure (to be discovered, not prescribed):
1. Phase 1: Align terminus-adjacent region
2. Phase 2: Identify major structural mismatches
3. Phase 3: Evaluate high-value inversion candidates
4. Phase 4: Apply globally beneficial dup/del operations
5. Phase 5: Clean residual local mismatches

---

## Optional Extensions

### Multi-agent roles
- Explorer agent — proposes ambitious hypotheses
- Critic agent — rejects weak reasoning
- Archivist agent — updates doctrine with confirmed principles

### Dual-track experiment
- Track A: vanilla agents without accumulated doctrine
- Track B: agents with doctrine updated after each successful experiment

Compare which track discovers stronger strategies faster.

---

## Expected Research Contributions

- A novel heuristic for the genome sorting problem
- Insights into: inversion timing, global vs local optimization, terminus anchoring
- A methodology template for applying autoresearch to combinatorial biology problems
