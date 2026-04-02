# Autoresearch Session: Genome Sorting Problem

Read `program.md` carefully before starting. It is your research doctrine.

---

## Your loop — repeat until I tell you to stop

### Step 1 — Read current state
Read `program.md` and the current `solver.js`.  
Also read the last row of `results.tsv` to know the current best scores.

### Step 2 — Form one hypothesis
Propose **ONE** heuristic change in plain English.  
Example: *"I will try scoring inversions by how many positions they fix on both sides of [t], not just raw alignment."*

Your hypothesis must explain:
- What you are changing
- Why you expect it to help
- Which puzzle categories it should benefit

### Step 3 — Implement
Modify **ONLY** `solver.js` to implement the hypothesis.  
- Increment the `// @version` comment at the top (v0 → v1 → v2 …)
- Do not change the `solve(mutableGenome, targetGenome, options)` signature
- Do not change `MAX_MOVES_BUDGET` in `evaluate.js`

### Step 4 — Evaluate
Run:
```
HYPOTHESIS="<your hypothesis in one sentence>" node evaluate.js
```

### Step 5 — Decide
Compare the new `avgRatio` and `solvedCount` to the previous row in `results.tsv`.

- **Improved** → keep the change. Write a structured experiment report (see below).
- **No improvement** → revert `solver.js` to the previous version. Log a brief note about what failed and why.

### Step 6 — Repeat from Step 1

Do not pause to ask me whether to continue. Run the loop autonomously.

---

## Experiment report format (for every kept change)

```
### Experiment — [solver version]

**Hypothesis:** [what you tested]

**Change:** [what you modified in solver.js]

**Expected benefit:** [why it should help]

**Result:**
- avgRatio: [before] → [after]
- Solved: [before] → [after]
- Optimal: [before] → [after]
- Per category: synthetic=[x], real=[y]

**Failure modes:** [which puzzles got worse, if any]

**Interpretation:** [what this tells us about the problem]

**Recommendation:** Keep / Discard / Revise
```

---

## Hard rules

| Rule | Why |
|------|-----|
| Never modify `gameEngine.js` | Rules must stay fixed for fair comparison |
| Never modify `evaluate.js` | Harness must stay fixed for fair comparison |
| Never modify `benchmark/puzzles.json` | Benchmark must stay fixed for fair comparison |
| Never hardcode puzzle IDs in solver logic | Overfitting, not research |
| Propose exactly ONE change per iteration | Interpretability |
| You may only modify `solver.js` | Everything else is the fixed environment |

---

## How to revert `solver.js`

If a change does not improve results, restore the previous version:
```bash
git checkout HEAD -- solver.js
```
Then continue from Step 2 with a new hypothesis.

---

## What counts as improvement

Primary criterion (both must hold or at least one must improve without the other worsening):
- Lower `avgRatio` (fewer moves relative to known best)
- Higher `solvedCount` (more puzzles solved within budget)

Secondary (useful signals, not primary criteria):
- Higher `optimalCount`
- Better `avgRatioSynthetic` or `avgRatioReal`

A change that helps on one category but significantly harms another is **not** an improvement — investigate why before deciding.

---

## Research mindset

You are not searching for a winning benchmark run.  
You are searching for **reusable heuristic principles**.

If multiple successful iterations independently converge on the same pattern (e.g., "inversions that fix both sides of [t] are worth more"), promote that pattern from an experimental tweak into an explicit rule in the solver design.

The final goal is a solver whose strategy you can describe clearly in one paragraph — and that performs well because of that strategy, not despite it.
