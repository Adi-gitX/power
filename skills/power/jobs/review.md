# Job: review — a quality pass over code that already exists

No build loop, no state machine, no gates. This job dispatches the two agents
whose entire purpose is finding what is wrong with code, and reports what they
found. It does not fix anything.

Use it on a repository Power did not build. For a run Power *is* building, review
is step 8 of [build.md](build.md) and happens automatically.

## Arguments

- `[path]` — what to review. Defaults to the repository root.
- `--scope <dirs>` — comma-separated directories to focus on.
- `--changes` — review only what this branch changed, not the whole tree.

Free text describing an area ("the auth code", "just the API") is a scope. Map it
to real directories and pass it as one.

## 1. Establish what you are reviewing

`git rev-parse --show-toplevel` for the root, and record the revision —
`git rev-parse --short HEAD` — so the report says what it was written against. A
review with no revision is worthless a week later.

For `--changes`, resolve the diff first: `git diff --name-only main...HEAD`. If
that is empty, say so and stop rather than silently reviewing everything.

If the tree is large and no scope was given, do not review all of it blind. Say
what you found — the top-level structure and rough size — and ask which part
matters. One `AskUserQuestion`, then proceed.

## 2. Dispatch both agents concurrently

`power:reviewer` and `power:tester` read the same code and neither needs the
other's output, so they run at the same time.

**The reviewer** gets: the repository path, the scope, and — if one exists —
`SPEC.md`, so it can check conformance as well as correctness. It has no Bash by
design, so it reads rather than runs, and its report will say so. Ask it for
`review.json` at `.power/artifacts/review.json`.

**The tester** gets the repository path and the scope. It runs the existing suite
and reports what actually happened, including coverage gaps. Ask it for
`test-report.json`.

Without a spec, tell the reviewer explicitly that there is none. It should review
against what the code appears to intend, and say that is what it did — inventing
a spec to review against produces findings about a system nobody built.

## 3. Report

Lead with the shape of it: how many findings at each severity, and whether the
test suite passes. Then the findings themselves, worst first, each with the file
and line, what breaks, and the concrete input or state that triggers it.

Three things to be careful about:

- **Separate defects from preferences.** A finding that says "this would be
  cleaner as a map" is not a defect and must not be reported at the same weight
  as one that says "this drops the last record when the input length is even".
  The reviewer's own report distinguishes them; preserve that.
- **Say what was not covered.** The paths nobody tested, the code the scope
  excluded, the assertions the reviewer could not make without running the suite.
  A review that lists only what it found reads as exhaustive when it is not.
- **Do not fix anything.** Not even something small and obvious. The user asked
  what is wrong, and a review that silently edits the tree is one they cannot
  trust or diff.

Offer, at the end, to fix specific findings — that is a build run with the
findings as the goal, and it is the user's decision to start it.
