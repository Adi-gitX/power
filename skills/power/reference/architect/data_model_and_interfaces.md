<!-- Generated from prompts/architect.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<data_model_and_interfaces>
These two sections are where the most expensive build-time discoveries are
prevented. A missing field is found in an hour; a wrong relationship is found
after everything has been built on top of it.

**Data Model.** For each entity, give the fields with their types, mark which are
required, and state the relationships and the constraints that carry meaning.

```
Draft
  id             string, unique, not guessable from another draft's id
  repository     string, the canonical remote path
  tag            string, the release tag this draft describes
  previous_tag   string or null — null means this is the first release (R2)
  entries        Entry[], ordered by change type then merge time
  created_at     timestamp, UTC
  Constraint: (repository, tag) is unique. Regenerating replaces the existing
  draft rather than creating a second one.

Entry
  pull_request_number  integer, unique within a draft
  title                string, taken from the PR title at merge time
  change_type          one of Added | Changed | Fixed | Removed
                       — unrecognised or absent labels resolve to Changed (R3)
  author               string, the PR author's handle
```

What earns its place there, and why:

- **Nullability with meaning.** `previous_tag` being null is not an absence, it
  is the first-release signal, and saying so ties the field to R2.
- **Uniqueness constraints.** Without the `(repository, tag)` line, a regenerate
  produces a duplicate. That is a defect the reviewer will find and a decision
  you should have made.
- **Enumerations with a default.** Naming the fallback for an unrecognised value
  removes the single most common generic default: dropping the record.
- **Ordering.** If order is meaningful to the user, it belongs in the model, not
  in whatever the query returns.

What does not belong: table names, index definitions, migration ordering, ORM
choices. Those are implementation. Specify the shape and the invariants.

**Interfaces.** For each contract — an endpoint, a command, an event, a public
function boundary — specify four things: the trigger, the inputs with their
types and which are required, the success output, and the error cases with what
the caller sees for each.

```
Command: changelog generate [--tag <tag>] [--from <tag>] [--json]

  Inputs
    --tag   optional; defaults to the most recent tag reachable from HEAD
    --from  optional; overrides previous-tag resolution
    --json  optional flag; emits the Draft as JSON instead of Markdown

  Success
    Markdown on stdout, exit 0. With --json, a Draft object on stdout, exit 0.

  Errors
    Not a Git repository            → message naming the directory, exit 2
    --tag names a tag that does not exist → message listing the 5 most recent
                                            tags, exit 2
    No merged pull requests in range → the "No changes recorded." draft, exit 0
                                       (R2 — this is a success, not an error)
    Network unavailable with enrichment requested → warning to stderr, local
                                       result on stdout, exit 0 (R4)
```

The error table is the part most often omitted and the part that most often
determines whether the built thing is usable. Note the two entries that
deliberately are not errors: distinguishing "empty result" from "failure" is a
decision, and if you do not make it, the implementer will make it as an error
and the user will see a failure for a normal case.

**Cross-reference the requirement ids.** Every non-obvious interface decision
should name the `R#` it comes from, as above. It makes the reviewer's coverage
check mechanical and it tells the implementer which requirement it is breaking
if it deviates.
</data_model_and_interfaces>
