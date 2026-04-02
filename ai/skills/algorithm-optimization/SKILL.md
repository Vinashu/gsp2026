---
name: algorithm-optimization
description: Use when improving runtime, memory usage, scalability, or throughput for an existing algorithm or computational pipeline without losing correctness.
---

# Algorithm Optimization

## Use when

- The task is to speed up or scale an existing implementation.
- You need to reduce memory pressure, improve asymptotic behavior, or remove practical bottlenecks.
- The work should be benchmarked and justified rather than guessed.

## Operating defaults

- Measure before optimizing.
- Start with the actual bottleneck, not the most interesting code.
- Preserve correctness with regression tests and reference outputs.
- Consider asymptotics, constant factors, memory locality, and parallelism in that order of impact.
- Make benchmark inputs representative and reproducible.

## Workflow

1. Define the performance target and workload shape.
2. Profile or benchmark to locate the dominant cost.
3. Remove algorithmic inefficiencies before micro-optimizing.
4. Re-measure after each meaningful change.
5. Record tradeoffs in readability, memory, portability, and maintenance.

## Quality bar

- Use before-and-after measurements with the same environment.
- State whether gains come from fewer operations, lower allocations, better caching, or concurrency.
- Keep a correctness oracle for optimized paths.
- Prefer simple optimizations that survive future maintenance.

## Avoid

- Benchmarking toy inputs and extrapolating.
- Combining many optimizations at once so the impact becomes unclear.
- Shipping a faster algorithm that quietly changes semantics.
