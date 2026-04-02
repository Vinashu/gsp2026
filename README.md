# Genome Sorting Problem — Autoresearch Project

Discover a novel heuristic algorithm for the **Genome Sorting Problem** using an iterative AI-driven research loop adapted from Karpathy's autoresearch methodology.

---

## The Problem

The genome sorting problem finds the shortest sequence of evolutionary operations that transforms one genome (ordered gene sequence) into another.

A puzzle contains:
- a **target genome** — the goal state
- a **mutable genome** — the starting state
- a **terminus `[t]`** — a fixed central pivot that anchors all operations

### Allowed Operations

| Operation | Description |
|-----------|-------------|
| **Inversion** | Reverse a contiguous segment. **Constraint:** segment must include `[t]`. |
| **Duplication** | Copy a segment and insert it elsewhere. If crossing `[t]`, the copy is automatically reversed. |
| **Deletion** | Remove a contiguous segment. Cannot delete `[t]`. |

Lower operation count = better solution.

---

## Project Layout

```
gsp2026/
├── gameEngine.js                      # Rules engine — never modified by agents
├── solver.js                          # Heuristic solver — the ONLY file the agent edits
├── evaluate.js                        # Fixed evaluation harness
├── results.tsv                        # Append-only experiment log
├── program.md                         # Research doctrine for agents
├── RESEARCH_LOOP_PROMPT.md            # Paste into Claude Code to start a session
├── benchmark/
│   ├── puzzles.json                   # 8 benchmark puzzles (5 synthetic + 3 real)
│   └── validation/
│       └── checkBenchmark.js          # One-time engine validator (87 checks)
├── real_puzzles/                      # Source: 3 real bacterial genome puzzles
└── syntetic_puzles/                   # Source: 5 synthetic puzzles
```

---

## Quick Start

### 1. Validate the engine (once, after cloning)
```bash
node benchmark/validation/checkBenchmark.js
```
Expected: `ALL CHECKS PASSED — engine is ready for research.`

### 2. Run the baseline evaluation
```bash
HYPOTHESIS="v0 baseline" node evaluate.js
```
This runs the current `solver.js` on all 8 benchmark puzzles and appends results to `results.tsv`.

### 3. Run a single puzzle (debugging)
```bash
node evaluate.js --puzzle level20
node evaluate.js --puzzle level20 --verbose
```

### 4. Start an autoresearch session
Open Claude Code in this directory and paste the contents of `RESEARCH_LOOP_PROMPT.md`. The agent will autonomously iterate on `solver.js`, evaluating each hypothesis and reverting failures with:
```bash
git checkout HEAD -- solver.js
```

---

## Research Approach

This project adapts Karpathy's autoresearch methodology to the genome sorting domain:

| Karpathy autoresearch | This project |
|----------------------|--------------|
| Editable artifact: `train.py` | Editable artifact: `solver.js` |
| Fixed environment | Fixed puzzle benchmark + rules |
| Metric: validation loss | Metric: `avgRatio` (solver moves / known best) |
| Keep best, discard regressions | Keep best, revert with git |

The agent proposes **one heuristic change at a time**, evaluates it under identical conditions, and keeps it only if `avgRatio` improves. Over many iterations, recurring successful patterns are promoted into explicit algorithmic rules.

---

## Key Prior Knowledge (from player studies)

Strong strategies observed in human players:
1. Start near the **terminus** and expand outward
2. Use **inversions strategically** — one inversion can replace a chain of dup/del operations
3. Prefer **large global moves** over small local fixes

Failure modes to avoid:
- Greedy local matching traps (fix one position, break three others)
- Ignoring inversion opportunities
- Losing the terminus as a spatial anchor

---

## Evaluation Metric

Primary: **avgRatio** = average of (solver moves / known best score) across solved puzzles. Lower is better. 1.0 = matches best known. A run that solves 0 puzzles reports N/A.

Secondary: `solvedCount`, `optimalCount`, `avgRatioSynthetic`, `avgRatioReal`.

The benchmark is frozen for the duration of the research. Only `solver.js` evolves.
