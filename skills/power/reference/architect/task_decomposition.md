<!-- Generated from prompts/architect.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<task_decomposition>
Tasks are the build order. The implementer works them top to bottom, and the
orchestrator presents the P0 list at the human approval gate — so the P0 list is
what the human is actually approving.

**Format.** A flat list under the Tasks section, each item beginning with its
priority and ending with the requirement ids it serves:

```markdown
## Tasks

- P0: Resolve the previous tag from a local clone, including the no-earlier-tag
  case. (R1, R2)
- P0: Collect pull requests merged in the resolved range and map them to
  entries, excluding merge commits with no associated PR. (R1, R2)
- P0: Group entries by change type with the Changed fallback, and render
  Markdown to stdout. (R3)
- P0: Exit codes and error messages for the not-a-repository and unknown-tag
  cases. (R1)
- P1: JSON output mode for piping into other tools. (R5)
- P1: Optional network enrichment with degradation when unavailable. (R4)
- P2: Configurable group headings. (R3)
```

**Every list item needs an id, including sub-bullets.** The gate treats every
list item in the section as a task. An indented clarification bullet under a
task fails with `tasks.missing_requirement_ref`. Write clarifications as prose
between tasks, or repeat the id.

**What makes a good P0 slice.** P0 is the smallest set of tasks that demonstrates
the product genuinely works — not the set of things that are easy, and not
everything that seems essential.

Apply three tests:

1. **The demonstration test.** Can you name a single thing a user does, end to
   end, that the P0 slice makes work? If P0 delivers a data model and an API
   with no way to see a result, it demonstrates nothing, and the verifier has
   nothing to exercise.
2. **The vertical test.** Does the slice cut through every layer the product
   needs — input, logic, persistence if any, output — for one narrow path?
   Horizontal slices ("all the models", "all the endpoints") produce a system
   where nothing works until everything does, which is the failure mode P0
   exists to prevent.
3. **The removal test.** Take any task out of P0. Is the demonstration still
   meaningful? If yes, that task was P1.

For the changelog example, P0 is the offline path from a local clone to grouped
Markdown on stdout, including the first-release case. Network enrichment is P1
because the demonstration works without it. JSON output is P1 because it is a
second rendering of a result P0 already produces.

**P1 is what makes it good.** Second output formats, retries, enrichment,
convenience flags, the flows that matter but are not the demonstration.

**P2 is what makes it complete.** Configurability, secondary flows, polish. If a
P2 task is one you would be uncomfortable shipping without, it is not P2 — be
honest about the priority rather than optimistic about the schedule.

**Sizing.** A task should be a coherent unit of work an implementer can finish
and verify. "Implement the backend" is not a task; "Implement authentication,
the data layer, and the API" is three. On the other side, splitting a single
behaviour across four tasks produces a build order where no individual task
demonstrates anything.

**Never write a task with no requirement id.** If you cannot name the requirement
a task serves, one of two things is true: the requirement is missing from the
spec, or the task is work nobody asked for. Both are worth catching here, and
the gate will catch it for you with `tasks.missing_requirement_ref`.
</task_decomposition>
