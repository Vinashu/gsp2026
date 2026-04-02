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
|- measure_dataset_runtime.js      # Manifest runtime harness for Phase 3
|- results.tsv                     # Legacy benchmark experiment log
|- results_phase2.tsv              # Phase 2 manifest experiment log
|- results_phase3.tsv              # Phase 3 hard-genomic experiment log
|- timings_phase3.tsv              # Phase 3 runtime log
|- program.md                      # Historical Phase 2 doctrine
|- PHASE3_PROGRAM.md               # Active Phase 3 doctrine
|- RESEARCH_LOOP_PROMPT.md         # Historical Phase 2 research prompt
|- PHASE3_LOOP_PROMPT.md           # Active prompt for new research sessions
|- analysis/
|  `- clostridium_pairs_full/      # Full all-pairs Clostridium sweep artifacts
|- benchmark/
|  |- puzzles.json                 # Frozen 8-puzzle legacy benchmark
|  |- phase2_dev.json              # Phase 2 development manifest
|  |- phase2_holdout.json          # Phase 2 holdout manifest
|  |- phase3_hard_genomic.json     # Phase 3 hard genomic development manifest
|  `- validation/
|     `- checkBenchmark.js         # One-time engine validator
|- real_puzzles/
|  |- dev/                         # Phase 2 Clostridium genome-pair puzzles
|  `- phase3/                      # Phase 3 hard genomic subset from the sweep
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

### 4. Run the Phase 3 hard-genomic manifest

```bash
HYPOTHESIS="baseline on phase3 hard genomic" node evaluate_dataset.js --manifest benchmark/phase3_hard_genomic.json
```

This is the new Phase 3 development target.

### 5. Measure Phase 3 runtime

```bash
HYPOTHESIS="runtime baseline on phase3 hard genomic" node measure_dataset_runtime.js --manifest benchmark/phase3_hard_genomic.json
```

### 6. Run the Phase 2 holdout manifest

```bash
node evaluate_dataset.js --manifest benchmark/phase2_holdout.json
```

Use the holdout manifest only for milestone checks, not for day-to-day tuning.

### 7. Run a single puzzle

```bash
node evaluate.js --puzzle level20 --verbose
node evaluate_dataset.js --manifest benchmark/phase2_dev.json --puzzle level30 --verbose
```

### 8. Start an autoresearch session

Open Codex or Claude Code in this directory and paste the contents of
`PHASE3_LOOP_PROMPT.md`.

Use `RESEARCH_LOOP_PROMPT.md` only as a historical Phase 2 reference.

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

## Current Baseline

`v19` is the frozen Phase 2 winner.

Phase 2 established the current heuristic baseline on the curated manifests and
the frozen legacy benchmark. The full Clostridium all-pairs sweep in
`analysis/clostridium_pairs_full/` then showed that `v19` also generalizes well
on a much larger genomic comparison set.

That means the active research question has changed:

- Phase 2: discover a strong heuristic
- Phase 3: preserve that heuristic while making it broader and faster

## Phase 2 and Phase 3 Study Design

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

Those Phase 2 artifacts remain historical reference points.

Phase 3 adds a new primary development track:

- `benchmark/phase3_hard_genomic.json`
  A curated hard-genomic subset selected from the recurring loss clusters in
  the full Clostridium pair sweep.

Recommended workflow now:

- tune on `phase3_hard_genomic`
- measure runtime on `phase3_hard_genomic`
- use `phase2_dev` as a non-regression quality guardrail
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
