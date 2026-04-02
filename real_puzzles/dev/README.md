These development genomic puzzles come from pairing genomes in
`_legacy/levelCreator/Clostridium_gesort_format`.

They are intentionally kept outside `benchmark/puzzles.json` so the fixed
benchmark remains unchanged.

Selection rules:
- `mutable` must contain at least one copy of every gene symbol present in
  `target` (excluding `[o]` and `[t]`), so the puzzle is solvable with
  duplication, deletion, and inversion.
- `topScore` is the achievable score returned by the legacy OrthoAlign
  implementation in `_legacy/levelCreator/OrthoAlign`.

Scoring command shape:
```powershell
& 'C:\Program Files\Java\jdk-26\bin\java.exe' Aligning -dt "<target>" "<mutable>"
```

Current dev set:
- `clostridium_easy_01.md`: close sister genomes, `topScore=1`
- `clostridium_medium_02.md`: medium difficulty, `topScore=6`
- `clostridium_hard_03.md`: large repetitive puzzle, `topScore=21`
- `clostridium_hard_04.md`: asymmetric hard puzzle, `topScore=23`
- `clostridium_very_hard_05.md`: very hard terminus-shift puzzle, `topScore=46`
