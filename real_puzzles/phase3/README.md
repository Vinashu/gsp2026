These Phase 3 genomic puzzles are a curated hard subset mined from the full
Clostridium pair sweep in `analysis/clostridium_pairs_full/`.

They are not random additions. They were selected because `v19` underperformed
its external OrthoAlign reference on them in recurring patterns, especially:

- short mutable genomes that must grow into much longer 23-gene-family targets
- compact mutables from `AP012212_ 1042156.4`
- repeated loss clusters around `CP000721_ 290402.41` and `CP006777_ 864803.3`

These files are intended for Phase 3 research:

- Phase 2 artifacts remain historical reference points
- `v19` is the frozen Phase 2 winner
- Phase 3 focuses on generalizing `v19` and reducing runtime without losing its
  Phase 2 quality

Each puzzle file records:

- the source genome pair
- the OrthoAlign score captured during the all-pairs sweep
- the current `v19` move count from that same sweep

The format matches the markdown puzzle format already used by
`evaluate_dataset.js`.
