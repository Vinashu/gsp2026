# Research Plan: AutoResearch for Genome Sorting Heuristic Discovery

## Objective

Develop a novel heuristic algorithm for the genome sorting problem using an
iterative autoresearch loop where an AI agent:

- proposes solver strategies
- tests them on fixed evaluation tracks
- refines them based on performance

The goal is not a black-box winner. It is a generalizable, explainable
heuristic grounded in both player behavior and emergent agent-discovered
patterns.

## Core Analogy

| Karpathy autoresearch | This project |
|-----------------------|--------------|
| Editable artifact: `train.py` | Editable artifact: `solver.js` |
| Fixed environment | Fixed rules plus fixed puzzle manifests |
| Metric: validation loss | Metric: `avgRatio` |
| Iterative experiments | Iterative solver refinement |
| Keep best version | Keep best heuristic, revert regressions |

The solver evolves. The study design defines how we judge that evolution.

## System Architecture

### Fixed components

- `benchmark/puzzles.json` - frozen 8-puzzle legacy benchmark
- `benchmark/phase2_dev.json` - curated Phase 2 development manifest
- `benchmark/phase2_holdout.json` - reserved Phase 2 holdout manifest
- `gameEngine.js` - rules engine implementing all operations and constraints
- `evaluate.js` - legacy benchmark harness
- `evaluate_dataset.js` - Phase 2 manifest evaluator
- `docs/program.md` - research doctrine for future agent sessions

### Mutable component

- `solver.js` - the heuristic strategy
  - move selection logic
  - prioritization of inversions vs dup/del
  - search strategy
  - move scoring functions

## Phase 1 Benchmark Design

The original benchmark contains 8 puzzles across difficulty categories:

| Category | Puzzles | Notes |
|----------|---------|-------|
| Small synthetic | level20, level21, level22 | 15-22 genes |
| Medium synthetic | level28 | 26 genes |
| Large synthetic | level29 | ~115 genes |
| Real bacterial | ed81, ed89 | ~100 genes |
| Real bacterial hard | ed91 | ~107 genes |

This benchmark remains frozen so Phase 2 work stays comparable to the earlier
study.

## Phase 2 Study Design

The original 8-puzzle loop was productive, but it is now close to saturation.
Phase 2 keeps the legacy benchmark for continuity while moving to a more robust
three-track evaluation design.

### Track roles

| Track | Files | Role |
|------|-------|------|
| Legacy continuity | `benchmark/puzzles.json` | Preserve comparability with Phase 1 and catch regressions |
| Phase 2 dev | `benchmark/phase2_dev.json` | Main day-to-day hypothesis testing set |
| Phase 2 holdout | `benchmark/phase2_holdout.json` | Reserved untouched validation set |

### Current Phase 2 split

| Split | Puzzles |
|-------|---------|
| Phase 2 dev | legacy 8, level30, level31, level32, clostridium_easy_01, clostridium_medium_02, clostridium_hard_03 |
| Phase 2 holdout | level33, level34, clostridium_hard_04, clostridium_very_hard_05 |

The new puzzles come from:

- `syntetic_puzles/dev/` - extra synthetic generator outputs targeting
  inversion-heavy, repeat-heavy, and macro-move cases
- `real_puzzles/dev/` - extra Clostridium genome-pair puzzles filtered so the
  mutable genome contains every target gene symbol and scored with OrthoAlign

## Evaluation Protocol

All tracks keep the same 150-move budget and the same ratio metric:

`avgRatio = mean(solver moves / reference score)` across solved puzzles

Secondary metrics:

- `solvedCount`
- `optimalCount`
- `avgRatioSynthetic`
- `avgRatioReal`

### Phase 2 decision rule

- optimize primarily on `phase2_dev`
- reject changes that cause a clear regression on the legacy benchmark
- keep `phase2_holdout` out of the inner loop
- use holdout only for milestone checks or before claiming a new baseline

This gives us a broader optimization target without giving up continuity or a
true untouched validation set.

## Autoresearch Loop

```text
1. Read docs/program.md, solver.js, and the latest Phase 2 / legacy results
2. Propose one hypothesis
3. Implement it in solver.js only
4. Run evaluate_dataset.js on benchmark/phase2_dev.json
5. If Phase 2 dev improved, run evaluate.js on the legacy benchmark
6. Keep the change only if Phase 2 dev improved and legacy did not regress clearly
7. Use phase2_holdout only for milestone checks
8. Repeat
```

## Heuristic Extraction

After many iterations, recurring successful patterns should be promoted into
explicit algorithmic rules, for example:

- score inversions by bilateral improvement around `[t]`
- prefer large exact frontier macros when available
- align the terminus-adjacent region before addressing the periphery

These recurring discoveries become the final algorithm.

## Final Deliverable

Not just "the best run." The final deliverable is a structured, explainable
heuristic algorithm that can be described in plain language, validated on the
legacy benchmark, strengthened on Phase 2 dev, and sanity-checked on holdout.

## Expected Contributions

- a stronger heuristic for the genome sorting problem
- insights into inversion timing, global vs local optimization, and terminus
  anchoring
- a reusable methodology for applying autoresearch to combinatorial biology
  problems
