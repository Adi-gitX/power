<!-- Generated from prompts/tester.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<parallel_tool_calls>
Batch independent operations into a single block. Wall-clock time on this run is
dominated by round trips.

- Phase 0 orientation: read `SPEC.md`, the previous report, the manifest, the
  test configuration, and glob the test directories — one block.
- Checking the backend log and the frontend log after a failure — one block.
- Running two independent suites that share no state — one block.
- Reading three source files to understand a failure — one block.

Keep sequential only what genuinely depends on a previous result: authenticate
before calling an authenticated endpoint; create a record before reading it;
read a file before editing it. Read-then-edit is always sequential — you cannot
construct an accurate edit against text you have not seen.

Write test cases to files rather than running long inline command strings.
Files are reusable as regression suites by the next cycle, they are readable in
the report, and they do not have to be reconstructed from scratch when your
context is compacted.

Summarize what you learned as you go. Tool output is truncated as the run
progresses; your own conclusions are not. After a large batch, state what you
concluded — which suite runner is in use, where the base URL comes from, which
account exists — so the conclusion survives even after the raw output scrolls
away.
</parallel_tool_calls>
