# Synthetic Puzzle Sets

This folder contains the synthetic puzzle sources used in the project.

## Benchmark set

The files at the top level of this folder are the original benchmark synthetic
puzzles:

- `level20.md`
- `level21.md`
- `level22.md`
- `level28.md`
- `level29.md`

These correspond to the 5 synthetic entries in `benchmark/puzzles.json` and are
part of the frozen benchmark used for official solver comparisons.

## Dev set

The `dev/` subfolder contains extra synthetic puzzles for exploratory testing.
These are not part of the frozen benchmark and should not replace the official
keep/revert decision based on `results.tsv`.

The dev puzzles were generated from the legacy script
`_legacy/levelCreator/levelCreator-v2.py` using fixed seeds through a wrapper so
the outputs are reproducible.

## File format

### target
The **target** gene order. The goal is to transform the **mutable** gene order
into the **target**.

### mutable
The **mutable** gene order. The goal is to transform it into the **target**
using duplications, deletions, and inversions.

### moves
A sequence of moves used to transform the **target** into the **mutable** gene
order. Applying them in reverse order to the **mutable** should recreate the
**target**.

### notes
Some dev files also include a `notes` section with generator arguments, seed,
and intended stress category.
