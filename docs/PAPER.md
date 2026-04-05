## Paper Direction

- Position the paper as an AI-assisted heuristic discovery study, not as a pure benchmark paper.
- The solver story has two main stages:
  `v19` is the frozen Phase 2 winner that established the heuristic.
  `v30` is the frozen final solver, obtained by Phase 3 pruning and acceleration.
- Present `v30` as the main method and describe `v19` as the historical milestone that exposed the asymmetry and runtime bottlenecks.

## Introduction

- Explain the genome sorting problem and how this project differs from unrestricted edit-distance formulations.
- Explain GeSort and the `[t]`-anchored game restriction.
- Explain what was learned from human video-game players and how those lessons shaped the heuristic search.
- Explain the Karpathy autoresearch analogy: fixed environment, one editable artifact, repeated hypothesis-testing.

## Methodology

- Adapt Karpathy autoresearch to the genome sorting problem.
- Use historical synthetic puzzles from previous work and genomic puzzles from previous work as the starting benchmark.
- Phase 1: iterate until the initial solver family plateaus on the legacy benchmark.
- Phase 2: broaden the evaluation to mixed synthetic plus genomic manifests to avoid overfitting.
- Describe the synthetic generator used for Phase 2 diagnostics.
- Describe the genomic puzzle generation pipeline:
  start from a random gene order, apply random evolutionary events to produce a mutable genome, and ask the solver to recover a path back.
  The generating process gives a known feasible path length, but cancellations and reversible event sequences mean the generated path is not guaranteed to be shortest.
- Describe OrthoAlign as an external comparative baseline, not as a fully like-for-like optimum:
  our engine allows deletions, duplications, and inversions around `[t]`;
  OrthoAlign models a broader event set including substitutions, inversions, and transpositions in addition to duplication/loss variants.
- Emphasize the research discipline:
  one change per iteration, fixed manifests, fixed move budget, keep improvements and discard regressions.
- State that `v19` was frozen as the Phase 2 winner instead of endlessly tuning the same loop.
- State that the full all-pairs Clostridium sweep was then run across every solvable ordered genome pair.
- State that the original `v19` full sweep is preserved in `analysis/clostridium_pairs_full_v19_archive/`.
- State that a fresh final rerun was executed with frozen `v30`, replacing the live artifacts in `analysis/clostridium_pairs_full/`.
- Explain that the Phase 3 hard-genomic subset was mined from the recurring loss clusters in the archived sweep.

## Frozen Solver Story

- `v19` established the core heuristic:
  anchored growth from `[t]`, frontier duplications/deletions, bounded inversions, one-step lookahead, opening inversion rollout, and bounded duplication-length rollout.
- `v30` keeps that same heuristic family.
- The main difference from `v19` to `v30` is growth-aware pruning in strong expansion states:
  delayed deletions,
  no duplication-length rollout,
  tighter duplication-source caps,
  less inversion generation after the opening.
- The paper should be explicit that Phase 3 improved efficiency much more than quality.

## Final Numbers To Cite

- Final solver: `v30`
- Phase 2 holdout on `v30`:
  solved `4/4`
  optimal `3/4`
  avg ratio `0.8887`
  synthetic avg ratio `0.9513`
  real avg ratio `0.8261`
- Full Clostridium sweep on `v30`:
  genomes `51`
  solvable directed pairs `1729`
  comparable pairs `1572`
  solver better / equal / worse `1210 / 113 / 249`
  at-or-below OrthoAlign `1323 / 1572 = 84.2%`
  average delta `-8.309`
  median delta `-7.5`
  average ratio `0.84038`
  average solver runtime `14737.85 ms`
  average OrthoAlign runtime `340.13 ms`
- Archived `v19` full sweep for comparison:
  average ratio `0.84007`
  solver better / equal / worse `1207 / 123 / 242`
  average solver runtime `16152.99 ms`
- Main interpretation:
  the final rerun is quality-flat relative to `v19`, but about `8.8%` faster on average solver runtime.

## Figures To Use

- Use `analysis/clostridium_pairs_full/figures/quality_runtime_overview.svg` as the high-level result figure.
- Use `analysis/clostridium_pairs_full/figures/loss_cluster_heatmap.svg` to show that failures are concentrated rather than diffuse.
- Use `analysis/clostridium_pairs_full/figures/directional_asymmetry.svg` to support the directional-asymmetry discussion.
- If space is tight, Figure 1 plus the asymmetry figure are the most important pair.

## Results Narrative

- Main claim:
  within the restricted GeSort move set, the learned heuristic is highly competitive with OrthoAlign on this Clostridium family.
- Secondary claim:
  the main Phase 3 gain was computational efficiency, not a new qualitative jump in score quality.
- Failure pattern:
  losses are concentrated in long-growth cases, especially `AP012212_ 1042156.4` and the long repeated targets `CP000721_ 290402.41` and `CP006777_ 864803.3`.
- Directional asymmetry:
  growth is materially harder than contraction for the solver, and the effect scales strongly with the length gap.

## Limitations And Discussion

- OrthoAlign is not a strict lower bound because it can use events our engine does not support.
- The solver remains much slower than OrthoAlign in absolute runtime.
- Three genomes are excluded from fair solver comparison because they do not contain exactly one `[t]`.
- The clearest open algorithmic weakness is directional asymmetry in long repeated growth cases.

## Artifact References

- Final live full sweep: `analysis/clostridium_pairs_full/`
- Archived historical sweep: `analysis/clostridium_pairs_full_v19_archive/`
- Holdout milestone log row: `results_phase2.tsv`
- Phase 3 experiment history: `results_phase3.tsv` and `timings_phase3.tsv`
