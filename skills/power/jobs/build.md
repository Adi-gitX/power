# Job: build — a goal, taken to working software

You run this yourself, in this session. You dispatch the specialists, you run the
gates, you drive the state machine. There is no separate process to launch and
nothing to poll: each phase is a subagent dispatch followed by a check that its
output is real.

Below, `GATE` means `node "${CLAUDE_PLUGIN_ROOT}/scripts/gate.mjs"` and `STATE`
means `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-state.mjs"`. Run both from the
repository root.

## Arguments

- `<goal>` — a sentence describing what to build. Required.
- `--skip-research` — go straight to the spec. Only honour this if the user says
  so explicitly; research is what the spec is built from.

## 1. Preflight

Establish three things before spending a token on the goal:

1. **This is a git repository.** `git rev-parse --show-toplevel`. If it is not,
   say so and ask whether to `git init` — Power writes real code, and doing that
   in a directory with no version control is how work gets lost. Wait for the
   answer.
2. **No run is already in progress.** If `.power/run.json` exists, stop. Report
   its phase and offer the continue job instead. Never overwrite a run.
3. **The working tree is clean enough.** If `git status --porcelain` shows
   uncommitted changes, say what they are and ask whether to proceed. Do not
   commit them yourself.

## 2. Compile the goal

```
STATE init "<goal>"
```

This writes `.power/artifacts/brief.json` and `.power/artifacts/rubric.md`, and
creates the run at phase `intake`. Read the rubric — it is what this run will be
judged against, and if it does not match what the user asked for, say so now
rather than after the build.

## 3. The kickoff message

The run then goes quiet for a long time, so this one message has to carry
everything the user needs in order to walk away: what you are building, that it
will take a while, that they will be asked exactly once to approve the spec, and
that they can leave until then. Keep it to a short paragraph. No internal
mechanics — no talk of phases, recipes, or event names.

Then open a todo list with the phases, and keep it current as they complete.

## 4. Research

```
STATE apply '{"type":"start_research"}'
```

Dispatch `power:researcher`. Its brief: the goal and the `unknowns[]` from
`brief.json`, the absolute path of the repository, and the instruction to write
`.power/artifacts/research.json` and `research.md`. Tell it the gate it must
satisfy — every claim carries a `source_url` that also appears in `sources[]`.

Then:

```
GATE research
```

- **Exit 0** — `STATE gate research pass`, then
  `STATE apply '{"type":"checkpoint_acknowledged"}'`. This is the soft
  checkpoint: summarise the findings in four or five lines and carry on without
  waiting. The user can interrupt; they should not have to respond.
- **Exit 1** — do not touch the artifact. `STATE retry research_refetch "<the
  rule ids that failed>"`, then dispatch the researcher again with the gate's
  exact errors in its brief. Re-run the gate.
- **`retry` refuses** — the budget is spent. Go to *When a run blocks*.

## 5. Spec

Dispatch `power:architect` with the goal, `research.json`, and the repository
path. It writes `.power/artifacts/SPEC.md` — requirements with ids, at least one
EARS acceptance criterion per requirement, and tasks that each cite a
requirement id.

```
GATE spec
```

Failure here takes the `spec_revision` edge, same shape as research. On success:
`STATE gate spec pass`.

## 6. The one human gate

Present the spec for approval. Show, in the message itself, enough to decide on:
what will be built, the requirement ids and what each covers, what is explicitly
out of scope, and anything the architect flagged as an assumption. Link the file
for the detail.

Call `AskUserQuestion` — `header: "Spec"`, single select, Approve / Reject.

- **Approve** — `STATE apply '{"type":"spec_approved"}'`. The state machine
  refuses this if the spec gate has not passed, which is deliberate: approval is
  a human judgement about content, never a way around a structural defect.
- **Reject** — `STATE apply '{"type":"spec_rejected","reason":"<what they
  said>"}'` and re-dispatch the architect with their words. Their reason is the
  brief.

This is the only time you wait on the user. Everything after it runs unattended.

## 7. Build

**First, select capability packs.** The knowledge registry carries verified
implementation guidance — integrations, design languages, infrastructure
patterns — each pack stating the conditions under which it applies. Run:

```
KNOWLEDGE selector
```

(`KNOWLEDGE` means `node "${CLAUDE_PLUGIN_ROOT}/scripts/knowledge.mjs"`.) Read
the catalogue it prints and match the spec's requirements against each pack's
criteria — criteria, not titles, and a pack whose anti-criteria apply does not
match. For each match, fetch the body with `KNOWLEDGE show <name>` and include
it in the implementer's brief under a heading naming the pack. Expect zero to
three matches for most goals; if nothing matches, say so in the dispatch so the
implementer knows to build from first principles rather than wonder.

A pack that `requires_secrets` the user has not configured is a match to
*mention*, not to follow silently: the implementer must surface the missing
configuration rather than invent values.

Then dispatch `power:implementer` with the spec, the repository path, the P0
tasks, and the selected pack bodies. Give it the whole P0 slice, not one task at
a time — it plans its own order and needs to see the shape of the work.

Where the spec's tasks are genuinely independent — separate modules with no
shared files — dispatch several implementers concurrently, one per component,
each told exactly which paths it owns. Where they are not, run one. Two agents
editing the same file is not parallelism, it is a merge conflict you will have
to resolve by hand.

When the implementer reports its own build and tests green:

```
STATE apply '{"type":"self_verify","green":true}'
```

Record `false` if they are not. That flag is one of the three deploy conditions,
and recording it honestly is the whole reason it exists.

## 8. Review and tests

Dispatch `power:reviewer` and `power:tester` **concurrently** — they read the
same code and neither depends on the other's output.

The reviewer writes `review.json`; it has no Bash, so its report will record that
it could not run the suite. That is expected. The tester writes
`test-report.json` and actually runs things.

If capability packs were selected in step 7, pass the tester their
`testing_instructions` (printed at the end of `KNOWLEDGE selector`) — a pack
that shipped guidance also ships the checks that prove the guidance was
followed.

Then decide, from the two reports together:

- Any `blocker` or `high` finding, or a failing test → `STATE retry needs_fixes
  "<summary>"`, dispatch the implementer with the specific findings, and return
  to step 7. Do not send it vague instructions to "address the review"; send it
  the findings.
- Otherwise, carry on.

## 9. Verification

```
STATE apply '{"type":"start_verification"}'
```

Dispatch `power:verifier`. It arrives with no memory of the build, which is the
point. It exercises the primary paths by actually running the system and writes
`verification.json`.

```
GATE verification
```

This gate is stricter than the others, and deliberately so: it fails unless every
P0 requirement passes, `verified_by_interaction` is not false, and the visual
score clears the bar. A verifier that says "looks good" without having run
anything does not get through it.

- **Exit 0** — `STATE gate verification pass`. The run is `done`.
- **Exit 1** — `STATE retry needs_fixes "<what failed>"` and back to step 7 with
  the verifier's issues as the brief.

## 10. Documentation

Dispatch `power:documenter` last, once the system has stopped changing. It has
Bash and it verifies every command it writes down. It documents what the code
does, not what the spec said — where those differ, it records the divergence.

## 11. Close out

Report, in plain language:

- What was built, and where it lives.
- What the tests actually cover, quoting the tester's real numbers.
- Every divergence the documenter found between spec and code.
- Anything still open: unresolved unknowns from research, `medium`/`low` findings
  nobody fixed, requirements deferred to P1/P2.
- `STATE show`, so the final state is on the record.

Do not commit or push unless the user asks. The work is theirs to review first.

## When a run blocks

A retry budget running out is not a failure to work around. It means the same
stage failed three times, and a fourth attempt is not going to be the one that
works.

```
STATE apply '{"type":"block","reason":"<specific, quoted from the gate>"}'
```

Then tell the user: which stage, what the gate said each time, what you think is
actually wrong, and the narrowest thing they could change to unblock it. A
blocked run that explains itself is worth more than a green run that quietly
lowered its own standard.

Unblock with `STATE apply '{"type":"unblock","note":"<what changed>"}'` once they
have acted — and only then.

## Dispatching a specialist

Every brief you send a subagent carries the same five things. They have no
context but what you give them:

1. **The absolute path of the repository.** Never assume their working directory.
2. **The goal**, in one sentence.
3. **The artifacts they should read**, by absolute path — not their contents.
4. **The artifact they must write**, by absolute path, and that they write that
   file and no other.
5. **The gate their output must satisfy**, named, so they can check their own
   work before handing it back.

When re-dispatching after a failure, add the gate's exact errors — rule ids and
details, verbatim. "Fix the research" produces another failing artifact;
`sources.unlisted on claim 3` produces a fix.
