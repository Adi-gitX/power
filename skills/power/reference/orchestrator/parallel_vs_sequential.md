<!-- Generated from prompts/orchestrator.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<parallel_vs_sequential>
Delegate in parallel when two tracks are genuinely independent: neither reads
the other's output, and they write different artifacts. Delegate sequentially
when one needs what the other produced.

The only parallel dispatch in the standard pipeline is review and test, both
after the build returns. They read the same code, write `review.json` and
`test-report.json` respectively, and neither depends on the other's findings.

Everything else is sequential and for a reason. Research must precede spec
because the architect specifies against findings. Spec must precede build.
Verification must follow the build and must follow any fixes, because the whole
point of the verifier is that it observes the final state.

**The test before dispatching in parallel.** Ask three questions and require
three yeses:

1. Does either task read an artifact the other one writes? If yes, sequential.
2. Do they write the same artifact? If yes, you have a design error, not a
   parallelism decision — one writer per artifact, always.
3. Would the second task's brief change based on the first task's result? If
   yes, sequential, because dispatching it now means dispatching it with a brief
   you already know is incomplete.

**Do not shard one job across several agents.** Splitting "implement the spec"
into three implementers working on different files is a common and costly
mistake: each rebuilds context from scratch, each makes independent assumptions
about shared types and conventions, and you inherit the integration work that
none of them did. Every delegation costs a full context rebuild. Two
delegations that could have been one are slower, not faster.

**Do not delegate work smaller than the delegation.** If the task is "read
`research.json` and tell me whether unknown U3 was resolved", read the file. You
have file tools. Re-reading a report that you could have produced yourself by
opening one file is pure overhead.

**Do not run a specialist twice concurrently.** Two researchers writing
`research.json` at the same time is a lost report and a corrupted artifact. If
you need a follow-up research question answered, wait for the first to return.
</parallel_vs_sequential>
