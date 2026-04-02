# Clostridium Pair Sweep

Solver version: `v19`

| Metric | Value |
|---|---:|
| Genomes | 51 |
| Genomes without exactly one [t] | 3 |
| Total directed pairs | 2550 |
| Solvable directed pairs | 1729 |
| Discarded unsolvable pairs | 821 |
| Evaluated pairs | 1729 |
| Solver solved pairs | 1576 |
| Solver parse-error pairs | 153 |
| OrthoAlign scored pairs | 1722 |
| Comparable pairs | 1572 |
| Solver better than OrthoAlign | 1207 |
| Solver equal to OrthoAlign | 123 |
| Solver worse than OrthoAlign | 242 |
| Avg OrthoAlign cost | 43.88 |
| Avg solver moves | 35.57 |
| Avg delta (solver - OrthoAlign) | -8.32 |
| Median delta | -8.00 |
| Avg ratio (solver / OrthoAlign) | 0.840 |
| Median ratio | 0.821 |
| Avg OrthoAlign runtime (ms) | 301.6 |
| Avg solver runtime (ms) | 16153.0 |

## How v19 Works

`v19` is still the terminus-frontier block grower, but with two bounded rollout
mechanisms layered on top of the greedy core.

### High-level decision process

1. It computes the exact anchored core around `[t]`: the longest exact run that
   already matches immediately to the left and right of the terminus.
2. It generates candidate moves from that frontier:
   - exact frontier duplications that would extend the anchored core
   - excess-only frontier deletions that remove genes the target does not need
   - bounded inversions crossing `[t]` as structural reset moves
3. It scores resulting genomes lexicographically by:
   - anchored-core size
   - left/right balance of the core
   - gene-count distance to the target
   - total length difference
   - exact anchored matches
   - distance-weighted anchored matches
4. It keeps only immediately improving moves, then compares a small shortlist
   with one-step lookahead.
5. When the anchored core is still tiny, it runs a short opening rollout over
   promising inversions.
6. When the chosen move is a duplication, it sometimes tests a few shorter
   same-source lengths with a short rollout to avoid overcommitting to the
   longest exact macro.

### What makes `v19` different

Relative to `v18`, the new ingredient is the neutral-inversion opening rollout.
If the opening position has no improving inversion at all, `v19` also tries up
to `3` near-neutral inversions that are closest to break-even on the score
tuple. This lets the solver use a short-term "setup inversion" when that leads
to a shorter overall path.

### Practical bounded search size

With the current constants in `v19`, the move generator is explicitly capped:

- inversions: at most `12 x 12 = 144`
- frontier deletions: at most `64` per side, so `128` total
- frontier duplications: at most `3` block lengths per side and `8` source
  matches per length, so at most `48`

So the raw candidate pool is bounded to roughly `320` moves per state before
deduplication, and the actual comparison set is much smaller:

- lookahead shortlist: top `8` improving moves plus up to `4` extra short
  inversions
- opening inversion rollout: at most `12` rollout candidates
- duplication-length rollout: fallback plus up to `3` shorter same-source
  alternatives

## Algorithmic Analysis

Let:

- `n` = current genome length
- `M` = outer move budget (`150` in evaluation)
- `R` = inversion radius cap (`12`)
- `B` = duplication block cap (`64`)
- `D` = frontier deletion cap (`64`)

### Practical complexity for the actual `v19` implementation

Because `R`, `B`, `D`, the shortlist size, and the rollout depths are all fixed
constants, the practical complexity of `v19` is much better than the generic
uncapped search problem:

- per outer step: approximately `O(n)`
- full solve up to the move budget: approximately `O(Mn)`
- memory: approximately `O(Mn)`

Why this works:

- candidate family sizes are capped
- rollouts are capped to `24` opening moves and `12` duplication-length moves
- rollout solves are non-nested because `rolloutMode=true` disables further
  rollout recursion
- the `seen` set prevents short loops inside each solve

So in the actual code, the asymptotics are dominated by repeated linear passes
over genomes: anchored-core recomputation, score recomputation, serialization,
and applying/scoring bounded candidate sets.

### More detailed per-step cost

For one outer iteration:

- scoring the current genome is `O(n)`
- candidate generation is roughly linear in practice under the fixed caps
- immediate candidate evaluation is `O(Cn)`, where `C` is the bounded candidate
  count
- one-step lookahead evaluates `bestSuccessorScore` on a bounded shortlist, so
  it is also linear in practice with a larger constant
- opening inversion rollout adds up to `12` bounded inner solves of depth `24`
- duplication-length rollout adds up to `4` bounded inner solves of depth `12`

This is why the solver can still be asymptotically linear under fixed caps while
being slow in wall-clock time: it does many repeated linear passes inside those
bounded rollout solves.

### General asymptotic view without fixed caps

If the caps were allowed to scale with genome size, the picture would be much
less friendly:

- inversion generation would become `O(n^2)` because all `(before, after)`
  windows around `[t]` could be explored
- frontier duplication search would grow toward `O(nB^2)` for segment matching,
  plus sorting matched source positions
- frontier deletion testing would grow toward `O(Dn)`
- evaluating all resulting states would multiply those candidate counts by an
  additional `O(n)` scoring cost

So an uncapped version of this solver would drift toward cubic per-step behavior
in the worst case. The current implementation avoids that by keeping the search
surface explicitly bounded.

### Space complexity

The main memory consumers are:

- the current genome and temporary candidate/result genomes
- the `moves` array
- the `seen` set of serialized genomes

For an outer solve, the `seen` set grows with the number of accepted moves, so
the dominant term is `O(Mn)` characters of stored serialized states. Because the
rollout solves are bounded and non-nested, they add only another bounded
`O(Ln)` working set, where `L` is the rollout depth.

### Interpreting the measured runtime

The Clostridium sweep measured:

- OrthoAlign: about `0.30s` per pair on average
- `v19`: about `16.15s` per pair on average

That gap is consistent with the implementation style. `v19` is not slow because
it has an enormous branching factor; it is slow because it repeatedly rescans
and rescoring bounded neighborhoods many times inside rollout-based move
selection. In other words, the current bottleneck is bounded search overhead,
not uncontrolled combinatorial explosion.

## Analysis

### Main finding

The headline result is strong: on the `1572` pairs where both tools produced a
score, the current `v19` solver was at or below the OrthoAlign score on `1330`
pairs (`84.6%`). It beat OrthoAlign outright on `1207` pairs (`76.8%`), tied on
`123`, and was worse on `242`.

The average head-to-head delta was `-8.32` moves and the median delta was `-8`,
so this is not a "won by a few outliers" result. The center of the distribution
also favors the game-engine solver.

### Coverage and data quality

The solver solved every pair it could parse. The only solver failures were the
`153` pairs involving the `3` genomes that do not contain exactly one `[t]`:

- `CP006902_ 1408284.5`
- `CP006907_ 1408285.4`
- `CP012395_ 1341692.11`

Those are data-format problems, not search failures. OrthoAlign also failed on
`4` additional pairs, so not every filtered pair became a fair comparison.

### What the win pattern suggests

The biggest wins are highly concentrated around `CP006908_ 1408283.5`. That
genome appears repeatedly in the best-pair table, often with deltas around
`-46` to `-48`. This suggests the current frontier-plus-rollout heuristic is
especially effective when one genome can be reorganized with a small number of
large structural edits around `[t]`.

More broadly, the sweep suggests that our restricted move set is still very
competitive on this Clostridium family. Even though OrthoAlign supports a
broader event model, the current solver often finds shorter scenarios under the
game rules we actually care about.

### What the loss pattern suggests

The worst cluster is also very concentrated. `AP012212_ 1042156.4` is by far
the most difficult mutable genome in this sweep, with `21` worse-than-OrthoAlign
pairs and a positive average delta. Its hardest targets are much longer genomes
such as `CP010994_ 1502.177`, `CP010993_ 1502.176`, `CP000721_ 290402.41`, and
`CP006777_ 864803.3`.

That pattern points to a specific weakness: the solver struggles more when it
must grow a short mutable genome into a much longer repeated target. In other
words, the current heuristic is better at structural reordering and cleanup than
at long repeated expansion from compact starting states.

There is a second, smaller loss cluster around targets `CP000721_ 290402.41`
and `CP006777_ 864803.3` from several 23-gene-family mutables such as
`CP001078_ 508767.5`, `CP010520_ 1491.354`, and `CP010521_ 1491.355`. Those
look like good candidates for a future hard-genomic dev subset.

### Runtime tradeoff

The solver is much slower than OrthoAlign on average: about `16.2s` per pair
versus `0.3s`. So the current position is "better scores, much slower search,"
not "strictly better algorithm in every dimension." That is still promising, but
it means future work should separate heuristic quality improvements from search
cost control.

### Practical takeaway

This sweep is good evidence that the Phase 2 solver generalizes beyond the small
benchmark. The most useful next step is probably not adding more easy genomic
pairs. It is extracting a focused hard set from the recurring loss clusters:

- `AP012212_ 1042156.4` as mutable against long 23-gene targets
- `CP001078_ 508767.5`, `CP010520_ 1491.354`, and `CP010521_ 1491.355` against
  `CP000721_ 290402.41` / `CP006777_ 864803.3`
- optionally, a separate cleanup task to repair or exclude the `3` invalid
  genomes without `[t]`

## Best Pairs

| Mutable | Target | OrthoAlign | Solver | Delta | Ratio |
|---|---|---:|---:|---:|---:|
| AP014696_ 1491.356 | CP006908_ 1408283.5 | 55 | 7 | -48 | 0.127 |
| CP000939_ 498213.7 | CP006908_ 1408283.5 | 53 | 6 | -47 | 0.113 |
| CP006908_ 1408283.5 | CP000939_ 498213.7 | 56 | 9 | -47 | 0.161 |
| CP000728_ 441772.13 | CP006908_ 1408283.5 | 52 | 6 | -46 | 0.115 |
| CP000962_ 498214.7 | CP006908_ 1408283.5 | 52 | 6 | -46 | 0.115 |
| CP011663_ 1509.39 | CP006908_ 1408283.5 | 52 | 6 | -46 | 0.115 |
| CP009225_ 1509.28 | CP006908_ 1408283.5 | 53 | 7 | -46 | 0.132 |
| CP006908_ 1408283.5 | CP000728_ 441772.13 | 54 | 8 | -46 | 0.148 |
| CP006908_ 1408283.5 | CP000962_ 498214.7 | 54 | 8 | -46 | 0.148 |
| CP006908_ 1408283.5 | CP011663_ 1509.39 | 54 | 8 | -46 | 0.148 |

## Worst Pairs

| Mutable | Target | OrthoAlign | Solver | Delta | Ratio |
|---|---|---:|---:|---:|---:|
| AP012212_ 1042156.4 | CP010994_ 1502.177 | 52 | 66 | 14 | 1.269 |
| AP012212_ 1042156.4 | CP002160_ 573061.5 | 48 | 61 | 13 | 1.271 |
| AP012212_ 1042156.4 | CP010993_ 1502.176 | 53 | 66 | 13 | 1.245 |
| AP012212_ 1042156.4 | CP000721_ 290402.41 | 60 | 73 | 13 | 1.217 |
| AP012212_ 1042156.4 | CP006777_ 864803.3 | 60 | 73 | 13 | 1.217 |
| CP001078_ 508767.5 | CP000721_ 290402.41 | 25 | 36 | 11 | 1.440 |
| CP001078_ 508767.5 | CP006777_ 864803.3 | 25 | 36 | 11 | 1.440 |
| CP010520_ 1491.354 | CP000721_ 290402.41 | 25 | 36 | 11 | 1.440 |
| CP010520_ 1491.354 | CP006777_ 864803.3 | 25 | 36 | 11 | 1.440 |
| CP010521_ 1491.355 | CP000721_ 290402.41 | 25 | 36 | 11 | 1.440 |
