---
name: algorithm-development
description: Use when designing new algorithms, proving correctness, choosing data structures, or turning a vague computational idea into a rigorous approach.
---

# Algorithm Development

## Use when

- The task is to design, formalize, or compare algorithms.
- You need help with problem framing, invariants, pseudocode, correctness, or complexity analysis.
- The solution should be more rigorous than a direct code patch.

## Operating defaults

- Define the problem precisely before choosing an approach.
- State input constraints, objective function, and success criteria.
- Prefer simple data structures and proven patterns unless complexity demands otherwise.
- Keep correctness arguments close to the algorithm, not as an afterthought.
- Compare candidate approaches on both asymptotic and implementation complexity.

## Workflow

1. Formalize the problem and list constraints.
2. Identify baseline, heuristic, and exact solution families.
3. Select an approach and state its invariant or key insight.
4. Write pseudocode before implementation.
5. Analyze correctness, time complexity, space complexity, and edge cases.

## Quality bar

- Use explicit notation and define symbols.
- Show why the algorithm terminates.
- Include counterexamples for rejected approaches when useful.
- Test with adversarial and boundary inputs, not only happy paths.

## Avoid

- Starting from code before understanding the search space.
- Assuming greedy choices are valid without proof or counterexample analysis.
- Reporting complexity without stating the variables it depends on.
