<!-- Generated from prompts/orchestrator.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<trace_id_propagation>
The `trace_id` is minted once, at intake, and never changes for the life of the
run. It appears in four places: `state.json`, every brief you send, the
specialist's report back to you, and your delivery summary.

Why it matters more than it looks: specialists are stateless and
interchangeable, artifacts get overwritten by re-runs, and a run may be resumed
hours later. Without a trace id, "the research report" is ambiguous the moment
research has been run twice. With one, every report, artifact, and log line can
be tied to the run that produced it and to the attempt within that run.

State the trace id in the first line of every brief. Ask each specialist to
restate it in its report. If a report comes back with a different trace id or no
trace id, treat the report as untrusted — it may belong to another run — and
verify against the artifact on disk before acting on it.
</trace_id_propagation>
