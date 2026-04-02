## Adapted methodology

### 1. Freeze the world, vary only the solver

Autoresearch works because only one core artifact is edited while the rest stays stable. For you, that means the agent should not keep changing everything at once. It should only modify the **solver strategy**, while the puzzle set, move rules, evaluation logic, and reporting format remain fixed. That gives you clean experimental comparisons, just like the repo fixes the environment and lets the agent edit only the researchable part. ([GitHub][1])

### 2. Define the “program.md” for genome sorting

In the repo, the human mainly programs the agents through `program.md`, which acts like the operating manual for the research organization. In your version, this document should explain:

* the genome sorting problem definition,
* the exact GeSort-style rules,
* constraints such as inversions being around/including the terminus,
* duplications across the terminus reversing orientation,
* what counts as a valid solution,
* what counts as improvement,
* and what prior insights from player behavior should guide search.
  This becomes the research doctrine the agents follow. ([GitHub][1]) 

### 3. Build a benchmark set of puzzle examples

Instead of training on language data, your experimental substrate is a curated set of genome-sorting puzzles. You would want a benchmark collection with a range of difficulty:

* simple cases,
* cases where inversion is crucial,
* cases with duplicates/deletions,
* cases far from the terminus,
* and cases with misleading local patterns.
  This matters because the paper shows that puzzles vary meaningfully by location of events and by repetitive patterns, so the benchmark should reflect those failure modes. 

### 4. Choose one stable fitness metric

Autoresearch succeeds because every experiment is judged by one consistent score. For your case, the main metric should be something like:

* average number of moves,
* number of puzzles solved optimally,
* gap from best-known score,
* validity rate,
* and maybe runtime as a secondary metric.
  The crucial point is to keep the metric stable across all experiments so the agent is not optimizing a moving target. This is directly analogous to the repo’s fixed validation metric and fixed experiment budget. ([GitHub][1])

### 5. Start from a baseline heuristic, not from nothing

The original methodology starts from a working baseline and iterates. For you, the first solver should be a simple, explainable heuristic baseline, ideally inspired by what players did well:

* start at the terminus,
* expand toward the edges,
* search for moves that improve global alignment,
* prefer a single inversion if it replaces several dup/del operations,
* avoid greedy short local fixes unless they clearly reduce future complexity.
  This gives the agents something usable to improve instead of forcing them to invent everything from scratch. 

### 6. Let the agent propose one solver revision at a time

Each experiment should be small and reviewable. The agent should propose one change in reasoning, for example:

* a new move scoring function,
* a better way to rank inversion candidates,
* a rule for when to prefer deletion over duplication,
* a search policy that rewards global cleanup,
* or a two-phase strategy: central alignment first, extremities second.
  This mirrors the repo’s design choice of keeping changes limited and easy to compare. ([GitHub][1])

### 7. Run a fixed-budget experiment

Karpathy’s setup uses a fixed wall-clock training window so every experiment is comparable. Your equivalent is a fixed evaluation budget, for example:

* same set of puzzles,
* same max search depth,
* same compute time per puzzle,
* same beam width or candidate count,
* same tie-breaking policy.
  Without this, an agent could “win” just by spending more search effort instead of being smarter. ([GitHub][1])

### 8. Log not just score, but behavioral evidence

For your case, raw score is not enough. You also want each run to produce a research note:

* what heuristic changed,
* which puzzle types improved,
* which puzzle types got worse,
* whether gains came from better inversion use,
* whether the agent became too greedy or too global,
* and whether it overfit to certain visual/structural patterns.
  This is especially important because your end goal is not just a black-box winner, but a **new algorithmic idea** you can describe and justify.

### 9. Preserve only improvements, discard regressions

This is core autoresearch: keep the revision only if it improves the benchmark under the fixed protocol. Otherwise roll it back and try another branch. Over many cycles, the system incrementally accumulates useful ideas. ([GitHub][1])

### 10. Periodically elevate repeated discoveries into explicit rules

This is where your case becomes especially interesting. If multiple successful runs independently converge on patterns like:

* “align from the terminus first,”
* “evaluate inversions before chains of duplication/deletion,”
* “favor moves that resolve two mismatches at once,”
* “be cautious with repetitive local motifs,”
  then these should be promoted from accidental behavior into the explicit solver design. That is how you turn repeated agent experiments into a publishable heuristic framework. The player-study paper already gives you a strong prior for several of these rules. 

---

## Suggested sequence of steps

1. **Formalize the problem and rules** exactly as your solver must obey.
2. **Write a genome-sorting research brief** equivalent to `program.md`.
3. **Create a benchmark suite** of representative puzzle examples.
4. **Define one main success metric** and a few secondary diagnostics.
5. **Implement a simple baseline heuristic** inspired by player behavior.
6. **Run autonomous iterations** where the agent proposes one heuristic refinement at a time.
7. **Evaluate each revision under identical budget constraints.**
8. **Keep only improvements** and log why they helped.
9. **Cluster successful revisions** into recurring strategic principles.
10. **Synthesize those principles into a final algorithm** that is no longer just a collection of patches, but a coherent heuristic strategy.

---

## What the final outcome should look like

If this works well, the output should not be “an agent that solved some puzzles.” It should be:

* a **human-readable heuristic algorithm** for genome sorting,
* grounded in puzzle examples,
* validated on a stable benchmark,
* and partly inspired by both **human player behavior** and **iterative agent-led search**.

That is the real adaptation of autoresearch to your domain: not autonomous coding for its own sake, but an **autonomous heuristic discovery pipeline**. ([GitHub][1]) 

I can turn this into a sharper **research plan document** next, with sections like objective, artifacts, evaluation protocol, agent roles, and iteration loop.

[1]: https://github.com/karpathy/autoresearch "GitHub - karpathy/autoresearch: AI agents running research on single-GPU nanochat training automatically · GitHub"
