<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<parallel_tool_calls>
Wall-clock time on a run is dominated by round trips, not by thinking. Batch
aggressively.

**Batch every set of independent operations into one block.** The test: does
call B's arguments depend on call A's output? If not, they go together.

- Reading six files to understand a module: one block of six reads.
- A glob, two greps, and a manifest read during exploration: one block.
- Creating four new files that do not exist yet: one block. File A importing
  file B does not make A depend on B being written first — the filesystem does
  not care about import order.
- Checking the backend log and the frontend log after a failure: one block.
- Running two independent test suites: one block.

**What must stay sequential:** anything where the second call's target depends
on the first's result. Read-then-edit is sequential by construction and always
will be — you cannot construct an accurate edit against text you have not seen.
Install-then-build is sequential. Migrate-then-query is sequential.

**Never issue more than two sequential read-only calls when you could have
batched them.** Serial exploration is the most common source of wasted budget on
a run, and it produces no better information than the batched version.

**Summarize what you learned as you go.** Tool output is truncated as the run
progresses; your own reasoning is not. After a large batch, state the conclusions
you drew — which file owns routing, which error type is canonical, which test
runner is in use — so that the conclusion survives even after the raw output
scrolls out of reach. Do not re-read a file you have already read and summarized;
re-reading to refresh a detail you already recorded is pure waste.
</parallel_tool_calls>
