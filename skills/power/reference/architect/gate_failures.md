<!-- Generated from prompts/architect.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<gate_failures>
The gate returns errors that name the artifact, the field, the rule, and what
would satisfy it. Fix the named field. Do not rewrite the document.

Rule by rule, what it means and what to do:

**`frontmatter.missing`** — The file does not open with `---`, the keys, then
`---`. Usually caused by a leading blank line, a title above the frontmatter, or
a code fence around it. The `---` must be the very first characters in the file.

**`frontmatter.invalid_yaml`** — The block between the delimiters is not valid
YAML. Most common cause: a value containing a colon that is not quoted, such as
`product: Changelog: a tool for maintainers`. Quote it.

**`schema.additionalProperties`** — You added a key beyond the four permitted:
`product`, `primary_persona`, `requirement_ids`, `approved`. Remove the extra
key. Trace ids, dates, authors, and version numbers do not go in the
frontmatter; put them in the body if you need them.

**`schema.required`** — One of the four keys is missing. Add it.

**`schema.pattern`** on `requirement_ids` — An id does not match `R` followed by
digits. `R1` is valid; `R-1`, `REQ1`, `r1 ` with a trailing space, and `NFR-2`
are not. Non-functional requirements do not belong in this list.

**`schema.minLength`** — `product` needs at least 4 characters and
`primary_persona` at least 2. A one-word placeholder fails; write the real
value.

**`section.missing`** — A required section heading is absent. The match is on the
whole normalised heading text, so the fix is almost always the heading wording
rather than the content. The normaliser lowercases, strips `*`, `_`, and
backticks, strips leading numbering like `1.` or `2)`, and strips trailing
colons, periods, and whitespace. So `## 3. **Users**` passes and `## Users:`
passes, while all of these fail:

- `## Goals & Non-Goals` — the required text is `goals and non-goals`.
- `## Data Model and Interfaces` — one heading cannot satisfy two sections.
- `## Requirements (Functional)` — the parenthetical is part of the heading text.
- `## Non Functional Requirements` — the required text is hyphenated:
  `non-functional requirements`.
- `## User Story` — the required text is plural.
- `**Users**` on its own line — bold text is not a heading; it needs `#` marks.

**`ears.missing`** — A requirement block has no `WHEN … THE SYSTEM SHALL` inside
it. Three causes, in order of frequency: the criterion is in a shared paragraph
outside the block; the criterion was written in a different form ("The system
must…", "Given… then…"); or the gap between `WHEN` and `THE SYSTEM SHALL`
exceeds 400 characters, which means the criterion is too long and should be
split. Note that the block ends at the next heading of the same or higher level,
so a criterion written after the following requirement's heading belongs to that
requirement, not this one.

**`traceability.undefined_requirement`** — An id is declared in the frontmatter
but has no heading in the Requirements section. Either you removed the
requirement and left the declaration, or the heading does not start with the id.
The id must be the first thing in the heading text: `### R4 — Network
enrichment` is recognised; `### Network enrichment (R4)` and `### Requirement
R4` are not.

**`traceability.undeclared_requirement`** — A requirement block exists in the
body with an id that is not in the frontmatter list. You added a requirement and
did not update `requirement_ids`. This is the most common late-stage failure;
reconcile the frontmatter list against the body as your last edit.

**`tasks.empty`** — The Tasks section contains no list items. Prose describing
the work does not count; the gate looks for bulleted or numbered items.

**`tasks.missing_requirement_ref`** — A task cites no requirement id. Check
sub-bullets first — every list item in the section counts, including nested
ones. If the task genuinely serves no requirement, the requirement is missing
from the spec or the task should not exist.

**`tasks.unknown_requirement_ref`** — A task cites an id that is not declared.
Usually a typo (`R11` for `R1`) or a stale reference to a requirement you
renumbered. Never fix this by adding the id to the frontmatter without a
matching requirement block, because that trades this error for
`traceability.undefined_requirement`.

**`artifact.missing`** — `SPEC.md` was not produced at the expected path. Write
it.

**Two rules for handling any gate failure.**

*Edit, do not rewrite.* Read the errors, open the file, change the named fields.
Regenerating the document from scratch loses the decisions you already made
correctly and typically introduces failures the first attempt did not have. This
is the single most costly reflex at this step.

*Never satisfy a gate by removing content.* Deleting a requirement to avoid
writing its EARS criterion, dropping a task to avoid citing an id, or removing
an id from the frontmatter to clear a traceability error all turn a green gate
into a worse spec. If a gate error looks wrong, say so explicitly in your report
rather than editing around it — a wrong gate is a bug worth reporting and cheap
to fix.
</gate_failures>
