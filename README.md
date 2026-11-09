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
|- puzzle_catalog.js               # Shared puzzle loader and catalog builder
|- solver_trace.js                 # Structured solver trace generator for CLI/UI playback
|- serve_visualizer.js             # Local web server for the HTML visualizer
|- trace_solver.js                 # Step-by-step puzzle trace and move replay tool
|- results.tsv                     # Legacy benchmark experiment log
|- results_phase2.tsv              # Phase 2 manifest experiment log
|- results_phase3.tsv              # Phase 3 hard-genomic experiment log
|- timings_phase3.tsv              # Phase 3 runtime log
|- docs/
|  |- AUTORESEARCH.md              # Methodology notes (Karpathy adaptation)
|  |- IDEA.md                      # Original research plan
|  |- ORTHOALIGN_COMPARATOR_NOTE.md  # Caveat on OrthoAlign reference scores
|  |- PAPER.md                     # Paper writing notes
|  |- PHASE1_PROGRAM.md            # Historical Phase 1 doctrine
|  |- PHASE1_LOOP_PROMPT.md        # Historical Phase 1 research prompt
|  |- PHASE2_PROGRAM.md            # Historical Phase 2 doctrine
|  |- PHASE2_LOOP_PROMPT.md        # Historical Phase 2 research prompt
|  |- PHASE3_PROGRAM.md            # Historical Phase 3 doctrine that produced v30
|  `- PHASE3_LOOP_PROMPT.md        # Prompt to use only if reopening solver research
|- analysis/
|  |- analyze_clostridium_pairs.js # All-pairs sweep utility for full Clostridium reruns
|  |- clostridium_pairs_full/      # Final frozen v30 full-sweep artifacts
|  `- clostridium_pairs_full_v19_archive/ # Archived historical v19 full sweep
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
|- visualizer/
|  |- index.html                   # Browser UI for animated solver playback
|  |- app.js                       # Puzzle picker, transport controls, and rendering
|  `- styles.css                   # Visual system and responsive layout
|- syntetic_puzles/
|  `- dev/                         # Extra synthetic generator outputs
|- java-solver/                    # High-performance parallelized Java SE 17+ production solver
|  |- src/gesort/                  # Solver, game engine, and runner source code
|  `- bin/                         # Compiled class files (git ignored)
`- _legacy/                        # Historical research papers, old Python levelCreator, and tools
```

## High-Performance Java Solver

While the research prototype resides in `solver.js`, the production-grade, large-scale sweep runner is implemented in zero-dependency, multi-threaded **Java SE 17+** inside the [java-solver](java-solver/src/gesort) directory. This high-performance port achieves identical move choices and trajectory parity to the original JavaScript engine while utilizing multi-core CPU concurrency to drastically reduce runtime.

### 1. Compilation
```powershell
cd c:\Repos\gsp2026\java-solver
javac -d bin src/gesort/*.java
```

### 2. Running Benchmarks and Sweeps
* **Legacy 8-Puzzle Benchmark**:
  ```powershell
  java -cp bin gesort.BenchmarkRunner
  ```
* **Phase 3 Hard Genomic Puzzles**:
  ```powershell
  java -cp bin gesort.DatasetRunner
  ```
* **Full 1,729 Clostridium Genome Sweep**:
  ```powershell
  java -cp bin gesort.FullSweepRunner
  ```

### 3. Performance & Speedup Analysis

Running the full genome sweep in Java yields massive wall-clock speedups over the Node.js baseline:

| Solver Configuration | Average Per-Pair Runtime | Wall-Clock Speedup vs Node.js | Parallel Scaling Speedup | Ratio to OrthoAlign |
| :--- | :---: | :---: | :---: | :---: |
| **OrthoAlign** (Baseline) | **0.34 s** (340 ms) | — | — | *1.00x* (Ref) |
| **Node.js GSP** (Original) | **14.74 s** | *1.00x* (Ref) | — | 43.35x slower |
| **Sequential Java GSP** | **5.58 s** | **2.64x faster** | — | 16.41x slower |
| **Parallel Java GSP** | **2.77 s** | **5.31x faster** | **1.83x faster** | **8.16x slower** |

> [!TIP]
> Utilizing Java's multi-core parallel streams for candidate search rollouts reduces the computational overhead gap to OrthoAlign from **43.3x slower** to just **8.16x slower**, while preserving 100% exact move parity.

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

This is the historical Phase 3 development target and the main hard-genomic
regression set if research is reopened.

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

### 8. Trace a puzzle step by step

```bash
node trace_solver.js --puzzle level20
node trace_solver.js --manifest benchmark/phase2_dev.json --puzzle level30
node trace_solver.js --file real_puzzles/dev/clostridium_easy_01.md
```

`trace_solver.js` runs the current `solver.js`, prints the solver's move
selection trace, and then replays the chosen moves with before/after genome
states so you can follow exactly how a puzzle is solved.

Useful options:

```bash
node trace_solver.js --list
node trace_solver.js --manifest benchmark/phase2_dev.json --list
node trace_solver.js --puzzle level20 --no-solver-debug
node trace_solver.js --file real_puzzles/phase3/phase3_hard_01.md --full
```

- `--list` shows available puzzle ids for the selected source.
- `--no-solver-debug` hides the internal score-transition log and keeps only the replay.
- `--full` prints full genomes instead of abbreviated left/right views for long puzzles.
- `--file` also supports the older historical export files in `real_puzzles/`.

### 9. Reopen solver research

Open Codex or Claude Code in this directory and paste the contents of
`PHASE3_LOOP_PROMPT.md`.

Use this only if you intentionally want to resume solver experiments beyond the
frozen `v30` baseline. Use `docs/RESEARCH_LOOP_PROMPT.md` only as a historical
Phase 2 reference.

## Visualizer

The repo now includes a local HTML visualizer that uses the real `solver.js`
and the real puzzle files in this repository.

Start the server:

```bash
node serve_visualizer.js
```

Then open:

```text
http://127.0.0.1:4317/visualizer/
```

What it does:

- builds a puzzle picker from the benchmark plus the puzzle files in `real_puzzles/` and `syntetic_puzles/`
- runs the current solver against the selected puzzle
- shows target, before, and after genome tracks centered on `[t]`
- animates step-by-step playback with play, pause, restart, previous, next, and a timeline scrubber
- narrates each move with score changes, core growth, and top competing alternatives

Move markers in the UI:

- green arrow: duplication source
- blue arrow: duplication destination
- red arrow: deletion source
- purple arrow: inversion source

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
OrthoAlign tool, see [ORTHOALIGN_COMPARATOR_NOTE.md](docs/ORTHOALIGN_COMPARATOR_NOTE.md).

## Current Baseline

`v30` is the frozen final solver.

`v19` remains the frozen Phase 2 winner and the historical baseline that
launched Phase 3. The repo now preserves both full Clostridium sweeps:

- `analysis/clostridium_pairs_full/`
  Final rerun with frozen `v30`
- `analysis/clostridium_pairs_full_v19_archive/`
  Archived historical `v19` sweep

Phase 3 improved runtime much more than quality, so the project is now in a
consolidation and paper-writing stage rather than open-ended solver tuning.

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

Phase 3 added a new primary development track:

- `benchmark/phase3_hard_genomic.json`
  A curated hard-genomic subset selected from the recurring loss clusters in
  the full Clostridium pair sweep.

Historical Phase 3 workflow:

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
[ORTHOALIGN_COMPARATOR_NOTE.md](docs/ORTHOALIGN_COMPARATOR_NOTE.md).

These dev puzzles feed the Phase 2 manifests, but the holdout split remains
reserved and the legacy benchmark still anchors continuity across research
phases.
