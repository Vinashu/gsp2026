## 1. Genome Sorting Problem (Definition)

* The **genome sorting problem** aims to find the **shortest sequence of evolutionary operations** that transforms one genome (gene order) into another. 
* Genomes are represented as **ordered sequences of genes (labels)**, possibly with duplicates.
* The problem becomes **NP-hard when duplicate genes exist**, so solutions rely on heuristics or optimization methods. 

---

## 2. GeSort Model (Ruleset)

GeSort translates the problem into a puzzle with **three operations**:

### Operations

* **Duplication**: copy one or more genes
* **Deletion**: remove one or more genes
* **Inversion**: reverse a segment of genes

### Key Constraints (Biologically Inspired)

* **Inversion constraint**:

  * Must occur **around or including the terminus (pivot)**
  * Only allowed if the segment includes or is adjacent to the terminus 

* **Duplication constraint (with implicit inversion)**:

  * When genes are duplicated **to the opposite side of the terminus**, they are **automatically inverted**
  * Example: A–B → duplicated across → B–A 

* **Genome structure constraint**:

  * Genomes are **anchored at the terminus**, which acts as a fixed reference point
  * All transformations are relative to this central pivot 

---

## 3. Heuristic Insights from Player Strategies

Analysis of player solutions revealed **effective human heuristics**:

### Strong Strategies (What works)

* **Start from the terminus and expand outward**

  * Alignments naturally propagate from the center
  * Prevents breaking previously aligned regions 

* **Use inversions strategically**

  * Can replace multiple operations (duplication + deletion sequences)
  * Leads to significantly shorter solutions 

* **Look for global moves**

  * Large operations can fix multiple mismatches at once
  * Often outperform greedy/local fixes

---

### Weak Strategies (What to avoid)

* **Local/greedy fixes**

  * Matching small regions first often leads to extra operations later
* **Ignoring inversion opportunities**

  * Leads to unnecessarily long solutions

---

### Additional Observations

* **Puzzles are harder when changes are far from the terminus** (loss of reference point) 
* **Visual patterns can mislead players**, causing suboptimal choices

---

## 🔑 Takeaway Heuristic (from players)

A good human-inspired strategy:

> **Work from the terminus outward, prioritize large/global transformations, and exploit inversions whenever possible instead of chaining local edits.**