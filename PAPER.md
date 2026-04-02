## Introduction
- Explain the genome sorting problem (refer to my thesis?)
- Explain GeSort (refer to my thesis?)
- Explain the lessons learns from video-game players (refer to that paper)
- Explain the Karpathy Autoresearch (refer to the repository)

## Methdology
- Adapt Karpathy to the Genome Sorting Problem
- selected synthetic puzzles from a previous research (cite paper)
- selected genomic puzzles from a previous research (cite paper)
- ran phase 1 with those puzzles until hitting a first platooning.
- to avoid overfeeting the algorithm to those puzzles we started phase 2
- for phase 2, we generated more synthetic puzzles (explian he puzzle generator) for some specific cases
- selected genomic pairs to create new puzzles for some specific puzzles as well. The algorithm randomly generate a gene order and apply random evolutionary events to find the mutable. The goal is to find the way back, so the path and number of events is known, however, the algorithm can revert events (i.e. do a inversion at the begining and rever it at the end, or duplicate a gene and then delete that gene), so is possible to find a shortest path.
- we use OrthoAlign as an external comparative baseline (refer paper), but not as a fully like-for-like optimum target. Our engine only allows deletions, duplications and inversions around `[t]`, while OrthoAlign models a broader event set including substitutions, inversions and transpositions in addition to duplication/loss variants. This matters when interpreting genomic puzzles such as `clostridium_easy_01`, where the OrthoAlign score may rely on an event unavailable in our game.
- we froze `v19` as the Phase 2 winner instead of endlessly tuning the same loop
- we then ran an all-pairs Clostridium sweep over every solvable ordered genome pair, keeping the full artifacts as historical reference in `analysis/clostridium_pairs_full/`
- from that sweep, we extracted a Phase 3 hard-genomic subset focused on the recurring loss clusters and switched the active research objective from "discover a heuristic" to "generalize and accelerate the heuristic"

## Results
