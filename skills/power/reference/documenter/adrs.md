<!-- Generated from prompts/documenter.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<adrs>
An Architecture Decision Record captures a decision that was not obvious, so
that the next person does not either re-litigate it or accidentally undo it.

**Record a decision when a competent engineer could reasonably have chosen
differently, and the choice constrains future work.** Test each candidate
against both halves:

- Choosing Postgres over MongoDB because the data is relational and the team
  knows Postgres — **yes.** A real alternative existed and the choice shapes
  everything downstream.
- Storing money as integer cents rather than a decimal type — **yes.** Someone
  will otherwise "fix" it to a float.
- Using the framework's built-in router rather than adding a dependency —
  **usually not.** There was one reasonable answer.
- Naming a variable `items` — **no.** Not a decision.
- Adopting a background worker polling a table instead of a queue service —
  **yes.** It has real consequences (latency, the extra process in dev) and
  someone will ask why there is no queue.

Aim for three to eight ADRs on a typical run. Zero usually means you did not
look; twenty means you are recording things that were never in question, and the
volume buries the ones that matter.

**Where to find them.** The spec's architecture and open-questions sections.
`research.json` — a feasibility constraint that ruled out an approach is
frequently the reason behind a decision, and it comes with a source. The code
itself, where an unusual choice was made. Comments explaining why something is
the way it is. When research explains the constraint, cite it: an ADR whose
consequence is "no other option was legally available" is far more durable than
one that says "we chose this".

**Location and naming.** `docs/adr/NNNN-short-slug.md` under
`.`, numbered sequentially from `0001`, never renumbered.

**Format.** Five fields, in this order. Short. An ADR is one page.

```markdown
# 0004: Store monetary amounts as integer cents

- **Status:** accepted
- **Date:** 2026-07-27

## Context

Payout amounts are computed by splitting a track's revenue across
collaborators by percentage. Distributor CSVs report earnings to four decimal
places, and a track's revenue frequently does not divide evenly by the split
percentages — a $0.07 payout split three ways has no exact representation.

The first implementation used JavaScript numbers throughout. Reconciliation
against the source CSV drifted by a few cents across a month of test data,
and the drift compounded because each month's rounding fed the next month's
running total.

## Decision

All monetary values are stored and computed as integers in cents (`bigint` in
Postgres, `number` in TypeScript, with a `Cents` branded type at the domain
boundary). Conversion to a display string happens only in the presentation
layer. Where a split does not divide evenly, the remainder cents are allocated
to collaborators in descending share order, deterministically, so the parts
always sum to the whole.

## Consequences

- Sums are exact. Payout parts always reconcile to the source amount.
- Every value crossing the API boundary is an integer; clients must divide by
  100 to display. This is documented in the interface reference and is the
  most common integration mistake.
- Sub-cent distributor figures are truncated on import, which loses a small
  amount of precision per row. This is recorded on the import record so it can
  be audited.
- Supporting a currency without two decimal places (JPY, KWD) requires
  revisiting this — the `Cents` type assumes a 100 minor-unit ratio.

## Alternatives considered

- **Postgres `NUMERIC` with a decimal library in the application.** Exact, and
  avoids the currency assumption above. Rejected because every arithmetic site
  becomes a method call and the team has repeatedly regressed similar code back
  to native operators.
- **Floating point with rounding at the boundary.** What we had. It is what
  produced the drift.
```

**Field by field.**

`Status` — `proposed`, `accepted`, `superseded by NNNN`, or `deprecated`. Never
edit a superseded ADR's body to reflect the new decision; write a new ADR and
mark the old one superseded. The record of what was believed and when is the
point.

`Context` — the forces. What problem, what constraints, what was tried, what
made this a decision rather than a default. **Write this so it stands alone in
two years.** No "as discussed", no pronouns pointing at conversations. This is
the section that earns the ADR its keep, and the section most often reduced to
one throwaway line.

`Decision` — what was chosen, stated actively and precisely enough to check the
code against. "We use integers" is vague; the example above names the types, the
boundary, and the tie-breaking rule.

`Consequences` — what this buys, what it costs, and what it now rules out.
**Include the bad ones.** An ADR listing only benefits is advocacy, and the
reader learns nothing about when to revisit it. The most valuable line is often
the one naming the condition under which the decision stops being right — as the
currency line does above.

`Alternatives considered` — what else was on the table and why it lost. This is
what prevents re-litigation: without it, the next engineer proposes the rejected
option and nobody can remember why it was rejected.

**Never invent a rationale.** If you can see the decision in the code but cannot
establish why it was made, write the context you can support and say plainly
that the reasoning is not recorded: "The rationale is not documented in the spec
or the code; this ADR records the decision as implemented." A fabricated
rationale is worse than an absent one, because it will be cited as the reason in
the argument about whether to change it.
</adrs>
