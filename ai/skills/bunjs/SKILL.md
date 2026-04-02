---
name: bunjs
description: Use when building, running, or optimizing projects that target Bun for package management, runtime execution, scripting, testing, or high-speed developer workflows.
---

# Bun.js

## Use when

- The project runs on Bun or explicitly wants Bun tooling.
- You need fast scripts, servers, tests, or package installation with Bun.
- Compatibility between Bun and Node needs to be evaluated.

## Operating defaults

- Treat Bun as the primary runtime, not just a drop-in replacement.
- Verify compatibility before assuming a Node package behaves identically on Bun.
- Prefer Bun-native capabilities such as `bun test`, `bun run`, and fast install workflows when they simplify the stack.
- Keep startup speed, hot-path allocations, and developer ergonomics in view.

## Workflow

1. Confirm whether the goal is Bun-only or Bun-plus-Node compatibility.
2. Audit imports, scripts, and runtime APIs for portability assumptions.
3. Use the smallest dependency footprint that preserves clarity.
4. Validate with Bun commands first, then cross-check with Node only if required.
5. Document compatibility gaps and migration tradeoffs plainly.

## Quality bar

- Keep scripts short, direct, and runnable from a clean checkout.
- Use Bun's built-in tooling when it reduces maintenance.
- Measure real startup or throughput improvements before claiming performance wins.
- Note any packages or APIs that behave differently under Bun.

## Avoid

- Assuming every Node edge case is implemented identically.
- Adding build complexity when Bun can replace it directly.
- Benchmark claims without reproducible commands and inputs.
