# Real Puzzle Sets

This folder contains genomic puzzle sources derived from real bacterial genomes.

## Benchmark set

The top-level files in this folder are the original benchmark real puzzles.
They are exported gameplay records with human solutions and OrthoAlign scores.
These are the 3 real entries represented in `benchmark/puzzles.json`.

## Dev set

The `dev/` subfolder contains extra genomic puzzles built from pairs of
Clostridium genomes in `_legacy/levelCreator/Clostridium_gesort_format`.

Selection rules for the dev set:

- the `mutable` genome must contain at least one copy of every gene symbol in
  the `target` genome, otherwise the puzzle would be unsolvable
- `topScore` is estimated with the legacy OrthoAlign implementation in
  `_legacy/levelCreator/OrthoAlign`

These dev puzzles are for exploration and diagnostics. They are not part of the
frozen benchmark used for official `results.tsv` comparisons.

## Benchmark file fields

### _id
The match identifier in the historical `match` collection.

### moves
The sequence of moves used by a human to solve the puzzle.

- `I47:33;` an inversion starting at position 47 with 33 genes
- `L69:1;` a deletion starting at position 69 with 1 gene
- `D85:3:65;` a duplication starting at position 85 with 3 genes, pasted at
  position 65

### topScore
The number of operations returned by the OrthoAlign algorithm.

### score
The number of operations used by a human player, equal to the length of the
`moves` list.

### targetGenome / mutableGenome
The genomes involved in the puzzle.

`[o]` marks the origin of replication and `[t]` marks the terminus region.

## Dev file fields

The dev files use a simpler markdown format:

- `notes`
- `target_genome`
- `mutable_genome`

They omit historical gameplay metadata and keep only the information needed for
research and solver testing.
