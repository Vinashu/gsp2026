# OrthoAlign Comparator Note

This repo uses two different kinds of reference scores:

- like-for-like references under the game engine used by this project
- external reference scores produced by the legacy OrthoAlign tool

Those two categories should not be interpreted the same way.

## Our Engine vs OrthoAlign

The puzzle engine in this repo allows exactly three operations:

- duplication
- deletion
- inversion, with the additional rule that the inverted segment must include `[t]`

The legacy OrthoAlign code uses a broader event model.

Evidence in the local source:

- `_legacy/levelCreator/OrthoAlign/Readme.txt` says OrthoAlign aligns gene orders under `duplication`, `loss`, `substitutions`, and rearrangement events including `inversions` and `transpositions`.
- `_legacy/levelCreator/OrthoAlign/Coordinates2.java` encodes event categories including `sub`, `transp`, `inversion`, and several duplication/loss variants.
- `_legacy/levelCreator/OrthoAlign/Align.java` explicitly prints `transposition`, `Inversion`, and `Inverted duplication` events in its scenario output.

So OrthoAlign is not solving exactly the same optimization problem as this repo.

## What This Means for Interpretation

For synthetic puzzles and the legacy benchmark, the reference scores are still reasonable like-for-like targets for our solver.

For genomic puzzles whose `referenceScore` comes from OrthoAlign:

- the score is an external comparative reference, not a proven lower bound for our engine
- failing to match it does not automatically mean our heuristic is weak
- beating it is still meaningful, because it shows our restricted move set can compete well on some cases

In particular, a very low OrthoAlign score on a genomic puzzle may rely on an event that our engine does not have. A puzzle such as `clostridium_easy_01` may therefore stay above the OrthoAlign score even when the current solver is behaving sensibly under our rules.

## Recommended Research Rule

Do not discard a heuristic idea solely because it fails to improve one or two OrthoAlign-referenced genomic puzzles.

Instead:

- prioritize overall `phase2_dev` performance
- preserve the frozen legacy benchmark as the hard non-regression guardrail
- treat OrthoAlign-referenced genomic ratios as informative but not fully comparable

If this becomes a recurring source of confusion, a future study phase can introduce an additional genomic reference track based only on solutions valid under this repo's engine.
