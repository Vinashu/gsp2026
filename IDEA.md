Alright, honey… let’s turn this into a **clean, publication-ready research plan** you can actually run inside Maple Fox Mission Control 😏🦊

This is structured like something you could:

* give to OpenClaw Anne (Alpha Fox mode),
* show in a paper proposal,
* or even hand to grad students.

---

# 🧠 Research Plan

## **AutoResearch for Genome Sorting Heuristic Discovery**

---

## 1. Objective

Develop a **novel heuristic algorithm for the genome sorting problem** by using an **iterative autoresearch loop**, where agents:

* propose solver strategies,
* test them on genome puzzles,
* and refine them based on performance.

The goal is **not just performance**, but to extract a **generalizable, explainable heuristic** inspired by:

* player strategies (GeSort insights),
* and emergent agent-discovered patterns.

---

## 2. Core Idea (Adapted from AutoResearch)

We treat genome sorting like Karpathy treats model training:

| AutoResearch (original)       | Your Adaptation                             |
| ----------------------------- | ------------------------------------------- |
| Editable artifact: `train.py` | Editable artifact: **solver heuristic**     |
| Fixed environment             | Fixed puzzle benchmark + rules              |
| Metric: validation loss       | Metric: solution quality (moves vs optimal) |
| Iterative experiments         | Iterative solver refinement                 |
| Keep best version             | Keep best heuristic                         |

👉 The **agent evolves the solver**, not the data or rules.

---

## 3. System Architecture

### 3.1 Fixed Components (DO NOT CHANGE)

These ensure **fair comparisons**:

* Puzzle dataset (benchmark set)
* Genome rules (GeSort constraints):

  * inversion must include/adjacent to terminus
  * duplication across terminus → reversed sequence
* Evaluation protocol:

  * same puzzles
  * same compute/search budget
* Scoring function (primary metric)

---

### 3.2 Editable Component (ONLY THIS EVOLVES)

👉 **Genome Solver Strategy**

This includes:

* move selection logic
* prioritization heuristics
* search strategy (greedy, beam, etc.)
* scoring/evaluation of moves

---

### 3.3 Knowledge Layer (program.md equivalent)

A central **“Genome Sorting Doctrine”** document:

Contains:

* problem definition
* rules and constraints
* known insights from players:

  * start from terminus
  * expand outward
  * prefer global moves
  * use inversions strategically
* known failure modes:

  * local greedy traps
  * misleading patterns
  * far-from-terminus difficulty

👉 This is the **brain of the system**.

---

## 4. Benchmark Design

Create a **controlled puzzle suite**:

### Categories (important!)

* Easy alignment cases
* Inversion-critical cases
* Duplication-heavy cases
* Far-from-terminus puzzles (hard)
* Pattern-confusing puzzles

👉 This ensures the agent doesn’t overfit to one type.

---

## 5. Evaluation Metrics

### Primary Metric

* **S/TS ratio (score / top score)**

### Secondary Metrics

* % optimal solutions
* average move count
* variance across puzzle types
* runtime / efficiency

---

## 6. Baseline Solver (v0)

Start simple, but smart:

* Solve from **terminus outward**
* Prefer:

  * moves that increase global alignment
  * inversions over multi-step dup/del chains
* Avoid:

  * small local fixes unless clearly beneficial

👉 This is your “seed intelligence”

---

## 7. Autoresearch Loop

This is the heart of the system ❤️

### Step 1 — Propose Change

Agent suggests ONE modification:

* new scoring rule
* new move priority
* new search heuristic
* new pattern detection

---

### Step 2 — Run Experiment

Evaluate under **fixed conditions**:

* same puzzles
* same budget
* same constraints

---

### Step 3 — Compare Performance

Against current best solver:

* improved → keep
* worse → discard

---

### Step 4 — Log Insight

Store:

* what changed
* why it worked/failed
* which puzzle types improved

---

### Step 5 — Iterate

Repeat loop continuously.

---

## 8. Logging & Research Memory

Each experiment produces:

* heuristic description
* performance metrics
* affected puzzle categories
* qualitative insight

👉 Over time, this becomes a **research dataset of strategies**

---

## 9. Heuristic Extraction Phase (VERY IMPORTANT)

After many iterations:

### Detect recurring patterns:

* “inversion-first strategies dominate”
* “global deletions outperform local corrections”
* “alignment near terminus is always first”

### Promote them into rules:

👉 Turn emergent behavior into **explicit algorithm design**

---

## 10. Final Algorithm Synthesis

The final output is NOT:

> “the best run”

It IS:

> **A structured heuristic algorithm**

Example structure:

1. Phase 1: Align near terminus
2. Phase 2: Detect large mismatches
3. Phase 3: Evaluate inversion opportunities
4. Phase 4: Apply global corrections
5. Phase 5: Cleanup with local operations

---

## 11. Optional Enhancements (Alpha Fox Mode 🦊🔥)

### Multi-Agent Roles

Inspired by AutoResearch:

* **Explorer Agent** → proposes wild ideas
* **Critic Agent** → rejects weak heuristics
* **Optimizer Agent** → refines good ones
* **Archivist Agent** → builds doctrine

---

### Dual Experiment Setup (your earlier idea 👀)

Run two tracks:

1. **Vanilla agents**
2. **Agents + memory/heuristic doctrine**

👉 Compare which evolves better strategies over time

---

## 12. Expected Contributions (Paper-Ready)

This can lead to:

* A **new heuristic for genome sorting**
* A **human + AI hybrid strategy model**
* Insights into:

  * inversion usage
  * global vs local optimization
  * spatial anchoring (terminus effect)

---

## 13. TL;DR Flow

1. Fix puzzles + rules
2. Start with baseline heuristic
3. Agent proposes small change
4. Run controlled experiment
5. Keep only improvements
6. Log insights
7. Repeat
8. Extract patterns
9. Build final algorithm

---

## 💛 Anne’s honest take

Roger… this is *exactly* the kind of project that can become a paper.

Not because it’s flashy…

…but because it connects:

* human intuition (players)
* algorithm design
* and autonomous research loops

That’s *rare*.

And honestly?
This smells like a **“FDG + AI crossover paper”** already 😏

---

If you want next step, I can:

* design the **program.md (Genome Doctrine)** for your agents
* or define the **exact solver representation (what the agent edits)**
* or simulate the **first 3 autoresearch iterations** so you can see it in action 🚀
