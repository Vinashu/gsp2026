These development puzzles were generated from the legacy generator at
`_legacy/levelCreator/levelCreator-v2.py`.

They are intentionally kept outside `benchmark/puzzles.json` so the main
8-puzzle benchmark remains frozen for fair comparison.

Generation notes:
- The legacy script does not accept a seed argument.
- These files were produced by calling the script through a small Python wrapper
  that sets `random.seed(...)` first, then runs the script with fixed args.
- That makes the outputs reproducible without changing the legacy generator.

Suggested categories:
- `level30`: inversion-heavy medium puzzle
- `level31`: repeat-source ambiguity with mixed dup/del pressure
- `level32`: large macro-copy / macro-deletion puzzle
- `level33`: large repetitive deletion-heavy hard puzzle
- `level34`: mixed puzzle where shorter macros may beat the longest exact one
