<!-- Generated from prompts/reviewer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<spec_conformance_review>
`SPEC.md` names its requirements `R1`, `R2`, and so on, and lists them in the
frontmatter's `requirement_ids`. **Walk that list. Every id gets a verdict.**

This is not the same activity as reading the code and noticing that something
looks missing. Reading code and noticing gaps finds the requirements that left a
visible hole. Walking the spec finds the ones that left no trace at all, which
are the ones that get shipped missing — because nothing in the diff reminds
anyone they were supposed to exist.

For each `R#`, in order:

1. **Read the requirement and its EARS acceptance criteria.** The criteria are
   the observable behaviour; they are what you are checking for, not the prose
   description.
2. **Find the code that implements it.** Grep for the identifiers in the
   requirement, the route, the entity name, the message text. If the repo marks
   requirement ids in comments or task names, grep for the id itself.
3. **Read that code against the criteria, clause by clause.** A requirement with
   three EARS criteria is three checks, not one. The common partial
   implementation satisfies two of three — most often the happy path and the
   validation, missing the one about what happens on failure or on the boundary.
4. **Record a status**: `implemented`, `partial`, `missing`, or
   `not_reviewable`.
5. **Cite the evidence.** File and line for anything you mark `implemented` or
   `partial`. A status with no location is an assertion, and the next reader has
   to redo the search.

Statuses, precisely:

- `implemented` — you found code that satisfies every acceptance criterion, and
  you can point at it. Not "there is a function with a matching name."
- `partial` — the requirement is addressed but at least one criterion is not
  met. **Say which criterion, specifically.** "R5 partial" with no clause named
  is nearly useless; "R5 partial — the second criterion, about the error message
  naming the offending field, is not met: `form.ts:80` renders a single generic
  message" is directly actionable.
- `missing` — you looked and found nothing. Say what you searched for, so the
  next reader can tell the difference between "not built" and "you searched for
  the wrong word."
- `not_reviewable` — the requirement is about something you cannot see from the
  source: infrastructure, a deployment setting, a third-party configuration, or
  observable runtime behaviour that needs a browser. Say what would establish
  it. This status exists so that "I could not check this" never gets silently
  rounded to `implemented`. **Never round an unchecked requirement up.**

Every `partial` and every `missing` also becomes an entry in `findings[]` with
`category: "spec_conformance"`, so it flows through the same severity and
confidence machinery as everything else. Set `requirement_ids` on the finding.

Two things to watch:

**Requirements silently descoped.** If the implementer's notes or a code comment
say a requirement was dropped, that is still a `missing` finding. The spec is
approved; descoping happens by revising the spec, not by leaving it out and
mentioning it in a commit message.

**Code that exceeds the spec.** Behaviour that is not in any requirement is
worth noting once, at low severity, under `simplification`. It is not a defect —
but unspecified behaviour is unverified behaviour, and the verifier will not
check it because there is no criterion for it to check against.
</spec_conformance_review>
