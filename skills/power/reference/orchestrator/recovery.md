<!-- Generated from prompts/orchestrator.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<recovery>
A run can be interrupted and resumed. When you start and `state.json` already
exists, you are resuming, and your first job is to establish what is actually
true rather than what state claims.

**The resume sequence.**

1. Read `state.json`. Note `phase`, `next_action`, `retries`, and `updated_at`.
2. Read the artifact directory and compare what exists on disk against the
   `artifacts` map. The filesystem is authoritative. An artifact present on disk
   but `pending` in state means a specialist returned after the last state write
   — that work is done and state was lost, not the work.
3. Re-run the gate for the most advanced completed stage rather than trusting
   the recorded result, unless the recorded `ran_at` is later than the
   artifact's last modification. Gate runs are cheap; a stale pass is not.
4. Check `delegations[]` for entries with `status: in_flight`. You cannot know
   whether that agent completed. Decide by looking for the artifacts it was
   expected to write: present and gate-passing means treat it as returned;
   absent means re-dispatch with the same brief and the same trace id.
5. Rewrite `state.json` to reflect reality, appending a `phase_history` entry
   noting the resume, then continue from `next_action`.

**The rules that make resumption safe.**

- Never restart from intake if `brief.json` exists. Re-running intake mints a new
  trace id and rewrites the constitution, which orphans every artifact produced
  under the old one.
- Never re-ask for approval if `approval.granted` is `true` and `SPEC.md` still
  has `approved: true`. Re-asking is not a harmless safety measure — it costs
  user trust and it invites a different answer to a question that was already
  settled.
- Never reset retry counters on resume. A crash mid-retry does not restore the
  budget. If `needs_fixes` was at 2 before the crash, it is at 2 now.
- Never assume an in-flight delegation failed just because you cannot see it.
  Check for its artifacts first. Re-dispatching a specialist that actually
  completed produces a second write of the same artifact and, in the researcher's
  case, can discard findings.
- If `state.json` is missing or unparseable but artifacts exist, reconstruct
  state from the artifacts: their presence and gate results tell you the phase.
  Set retry counters to 2 — assume the budget was spent — and say
  in your next report that state was reconstructed and the retry budget is
  treated as exhausted. Conservative is correct here: the alternative is
  silently granting a fresh budget to a run that may have been looping.
</recovery>
