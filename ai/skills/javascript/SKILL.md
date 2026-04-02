---
name: javascript
description: Use when working on modern JavaScript applications, browser code, shared libraries, build tooling, or debugging runtime behavior in ECMAScript projects.
---

# JavaScript

## Use when

- The task is primarily JavaScript rather than framework-specific.
- The code runs in browsers, workers, or mixed front-end tooling.
- You need help with modules, async logic, DOM behavior, testing, or performance.

## Operating defaults

- Prefer modern ECMAScript syntax and built-in APIs before external dependencies.
- Confirm the target runtime before using platform-specific APIs.
- Favor small pure functions, explicit data flow, and clear error handling.
- Keep modules cohesive and avoid hidden global state.
- Add tests for parsing, async control flow, and edge-case handling when practical.

## Workflow

1. Identify the runtime, module system, and bundling assumptions.
2. Clarify the input and output contract before changing code.
3. Implement the simplest correct solution first.
4. Tighten ergonomics, readability, and performance only after correctness is clear.
5. Validate behavior with tests, sample inputs, or reproducible commands.

## Quality bar

- Use descriptive names and avoid clever but opaque one-liners.
- Be explicit about async boundaries, retries, cancellation, and timeouts.
- Prefer immutable transforms unless mutation clearly improves performance or API fit.
- Document non-obvious browser or engine assumptions close to the code.

## Avoid

- Pulling in a package for something already covered by the language or runtime.
- Mixing CommonJS and ESM without a deliberate compatibility plan.
- Silent failure paths, swallowed exceptions, and ad hoc type coercion.
