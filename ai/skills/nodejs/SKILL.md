---
name: nodejs
description: Use when building or debugging Node.js services, CLIs, scripts, workers, or libraries that depend on the Node runtime and ecosystem.
---

# Node.js

## Use when

- The task targets server-side JavaScript on Node.js.
- You are working with filesystems, streams, processes, HTTP servers, package management, or observability.
- The solution depends on Node runtime behavior rather than browser behavior.

## Operating defaults

- Start from the deployed Node version and package manager constraints.
- Prefer built-in modules when they meet the need cleanly.
- Treat I/O, streams, child processes, and network boundaries as failure-prone surfaces.
- Design for clear startup, shutdown, logging, and exit semantics.
- Keep configuration explicit and environment-driven.

## Workflow

1. Confirm the Node version, module format, and process entrypoint.
2. Trace data flow across I/O boundaries such as files, sockets, queues, and subprocesses.
3. Make error handling and resource cleanup explicit.
4. Add or update tests around integration edges and failure modes.
5. Verify behavior using deterministic commands and logs.

## Quality bar

- Respect backpressure for stream-heavy code paths.
- Avoid blocking the event loop with unnecessary synchronous work.
- Use structured logging where possible.
- Make retries, concurrency limits, and timeouts explicit.
- Keep scripts portable across local development and CI.

## Avoid

- Unbounded parallelism.
- Hidden process-wide state that makes tests flaky.
- Depending on Bun or browser-only behavior unless compatibility is intentional.
