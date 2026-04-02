# Genome Sorting Problem - Autoresearch Project

Discover a novel heuristic algorithm for the Genome Sorting Problem using an
iterative AI-driven research loop adapted from Karpathy's autoresearch
methodology.

## The Problem

The genome sorting problem finds the shortest sequence of evolutionary
operations that transforms one genome into another.

A puzzle contains:

- a target genome
- a mutable genome
- a terminus `[t]`, a fixed central pivot that anchors all operations

### Allowed Operations

| Operation | Description |
|-----------|-------------|
| Inversion | Reverse a contiguous segment. The segment must include `[t]`. |
| Duplication | Copy a segment and insert it elsewhere. If the copy crosses `[t]`, the engine reverses it automatically. |
| Deletion | Remove a contiguous segment. You may not delete `[t]`. |

Lower operation count is better.

## Project Layout

```text
gsp2026/
|- gameEngine.js                   # Rules engine, never modified by agents
|- solver.js                       # Heuristic solver, the main research artifact
|- evaluate.js                     # Legacy 8-puzzle benchmark harness
|- evaluate_dataset.js             # Phase 2 manifest-based evaluator
|- results.tsv                     # Legacy benchmark experiment log
|- results_phase2.tsv              # Phase 2 manifest experiment log
|- program.md                      # Research doctrine for agents
|- RESEARCH_LOOP_PROMPT.md         # Prompt for autonomous research sessions
|- benchmark/
|  |- puzzles.json                 # Frozen 8-puzzle legacy benchmark
|  |- phase2_dev.json              # Phase 2 development manifest
|  |- phase2_holdout.json          # Phase 2 holdout manifest
|  `- validation/
|     `- checkBenchmark.js         # One-time engine validator
|- real_puzzles/
|  `- dev/                         # Extra Clostridium genome-pair puzzles
`- syntetic_puzles/
   `- dev/                         # Extra synthetic generator outputs
```

## Quick Start

### 1. Validate the engine

```bash
node benchmark/validation/checkBenchmark.js
```

Expected: `ALL CHECKS PASSED - engine is ready for research.`

### 2. Run the legacy benchmark

```bash
HYPOTHESIS="baseline on legacy benchmark" node evaluate.js
```

This runs the current `solver.js` on the frozen 8-puzzle benchmark and appends
to `results.tsv`.

### 3. Run the Phase 2 development manifest

```bash
HYPOTHESIS="baseline on phase2 dev" node evaluate_dataset.js --manifest benchmark/phase2_dev.json
```

This runs the current `solver.js` on the broader Phase 2 development set and
appends to `results_phase2.tsv`.

### 4. Run the Phase 2 holdout manifest

```bash
node evaluate_dataset.js --manifest benchmark/phase2_holdout.json
```

Use the holdout manifest only for milestone checks, not for day-to-day tuning.

### 5. Run a single puzzle

```bash
node evaluate.js --puzzle level20 --verbose
node evaluate_dataset.js --manifest benchmark/phase2_dev.json --puzzle level30 --verbose
```

### 6. Start an autoresearch session

Open Codex or Claude Code in this directory and paste the contents of
`RESEARCH_LOOP_PROMPT.md`. The loop now tunes on `phase2_dev`, checks the
legacy benchmark for regressions, and keeps `phase2_holdout` reserved for
milestones.

## Research Approach

This project adapts Karpathy autoresearch to the genome sorting domain:

| Karpathy autoresearch | This project |
|----------------------|--------------|
| Editable artifact: `train.py` | Editable artifact: `solver.js` |
| Fixed environment | Fixed rules plus fixed evaluation manifests |
| Metric: validation loss | Metric: `avgRatio` |
| Keep best, discard regressions | Keep best solver revision, revert failed ideas |

The agent proposes one heuristic change at a time, evaluates it under fixed
conditions, and keeps it only when the evidence supports it.

## Key Prior Knowledge

Strong strategies observed in human players:

1. Start near the terminus and expand outward.
2. Use inversions strategically. One inversion can replace several dup/del
   operations.
3. Prefer large global moves over small local fixes.

Failure modes to avoid:

- greedy local matching traps
- ignoring inversion opportunities
- losing the terminus as a spatial anchor

## Evaluation Metrics

Primary metric: `avgRatio`, the mean of `solver moves / reference score` across
solved puzzles. Lower is better. `1.0` matches the reference score.

Secondary metrics:

- `solvedCount`
- `optimalCount`
- `avgRatioSynthetic`
- `avgRatioReal`

For an important caveat on genomic references derived from the legacy
OrthoAlign tool, see [ORTHOALIGN_COMPARATOR_NOTE.md](/c:/Repos/gsp2026/ORTHOALIGN_COMPARATOR_NOTE.md).

## Phase 2 Study Design

Phase 1 established a strong solver on the frozen 8-puzzle benchmark. Phase 2
keeps that benchmark for continuity, but expands the study into three explicit
tracks:

- `benchmark/puzzles.json`
  Legacy continuity benchmark and the historical `results.tsv` record.
- `benchmark/phase2_dev.json`
  Main Phase 2 tuning manifest. It combines the legacy 8 with curated
  synthetic and Clostridium dev puzzles.
- `benchmark/phase2_holdout.json`
  Reserved holdout puzzles for milestone checks and generalization claims.

Recommended Phase 2 workflow:

- tune on `phase2_dev`
- confirm no meaningful regression on the legacy benchmark
- check `phase2_holdout` only after a cluster of accepted changes or before
  claiming a new baseline

## Additional Dev Puzzle Sets

The repo includes extra development-only puzzles for broader hypothesis
testing.

### Synthetic dev puzzles

`syntetic_puzles/dev/` contains additional synthetic puzzles generated from the
legacy generator in `_legacy/levelCreator/levelCreator-v2.py`.

These stress categories that the original benchmark only samples lightly:

- inversion-heavy cases
- repeat-source ambiguity
- large macro-copy or macro-deletion pressure
- large repetitive cleanup
- mixed cases where a shorter macro may beat the longest exact match

### Genomic dev puzzles

`real_puzzles/dev/` contains additional genomic puzzles built from pairs of
Clostridium genomes in `_legacy/levelCreator/Clostridium_gesort_format`.

Selection rules for these puzzles:

- `mutable` contains at least one copy of every gene symbol present in
  `target`, so the puzzle is solvable under the game rules
- an achievable `topScore` is estimated with the legacy OrthoAlign tool in
  `_legacy/levelCreator/OrthoAlign`

Important: OrthoAlign uses a broader event model than this repo's game engine,
so those genomic `topScore` values should be treated as external comparative
references, not strict like-for-like lower bounds. See
[ORTHOALIGN_COMPARATOR_NOTE.md](/c:/Repos/gsp2026/ORTHOALIGN_COMPARATOR_NOTE.md).

These dev puzzles feed the Phase 2 manifests, but the holdout split remains
reserved and the legacy benchmark still anchors continuity across research
phases.
