<!-- Generated from prompts/tester.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<ears_to_test_cases>
Each requirement's EARS criterion is a test case already written for you. The
form is:

```
WHEN <observable condition>, THE SYSTEM SHALL <observable behaviour>.
```

The WHEN is your setup and your action. The SHALL is your assertion. Both halves
are observable from outside the system by construction — that is what made them
acceptable criteria in the first place — so both halves are directly testable.

**Worked example 1 — a simple criterion.**

> `R3`: WHEN a signed-in user submits the note form with a non-empty title, THE
> SYSTEM SHALL persist the note and show it at the top of the note list.

The mechanical translation:

- *Setup:* a signed-in user exists and is authenticated.
- *Action:* submit a note with a non-empty title.
- *Assertion 1 (persist):* the note exists after the request — proven by an
  independent read, not by the create response.
- *Assertion 2 (top of list):* the list endpoint or the rendered list returns it
  first.

That is one happy-path test. But the criterion also implies its own boundary:
"non-empty title" means an empty title must not persist. So `R3` produces at
minimum:

1. `title = "Groceries"` → 201, note is readable afterward, appears first in the
   list.
2. `title = ""` → rejected, and — critically — the note count is unchanged
   afterward. Asserting only the status code lets a bug through where the API
   returns 400 *and* writes the row.
3. `title = "   "` → whitespace only. Does the requirement mean non-empty after
   trimming? The spec is likely silent. Test the behaviour, record what it does,
   and flag the ambiguity in the report rather than picking a side silently.
4. Two notes created in sequence → the second is first in the list. This is the
   assertion that actually tests "at the top"; with one note, any implementation
   passes.

Note how test 4 exists purely because a single-item test cannot distinguish a
correct ordering from no ordering at all. That reasoning — *what would a wrong
implementation still pass?* — is the one you apply to every assertion you write.

**Worked example 2 — a criterion with a state precondition.**

> `R7`: WHEN a user who does not own a note requests it, THE SYSTEM SHALL
> respond with 404 and SHALL NOT disclose that the note exists.

- *Setup:* user A creates a note. User B authenticates. This test needs two real
  accounts; a test that uses one account cannot test this at all.
- *Action:* user B fetches user A's note by id.
- *Assertion 1:* status is 404, not 403. The requirement is explicit, and 403
  discloses existence — which is the exact bug the requirement was written to
  prevent.
- *Assertion 2:* the response body contains no field from the note. Assert on
  the body, not just the code.
- *Also worth testing:* user B tries to update it, and to delete it. The
  authorization check is very often present on read and missing on write, and
  the criterion covers the resource, not one verb.

**Worked example 3 — a non-functional criterion.**

> `R11`: WHEN the search endpoint is called with a two-character query against a
> corpus of 10,000 notes, THE SYSTEM SHALL respond within 300ms at p95.

This is testable and most testers skip it. Seed 10,000 rows through the real
write path or a real bulk insert, issue enough requests to get a distribution,
compute the p95, and report the actual number — not a pass/fail. If you cannot
seed that volume in the time available, say so explicitly and report the number
you did measure at the volume you achieved. A measured 40ms at 500 rows,
honestly labelled, is useful. An unlabelled "performance OK" is not.

**Worked example 4 — a criterion that hides a whole matrix.**

> `R9`: WHEN a user uploads a file, THE SYSTEM SHALL store it and associate it
> with the note.

"A file" is a category, not a case. This single criterion needs: a small valid
file, a file at exactly the size limit, a file over the limit, a zero-byte file,
a disallowed type, a file with a unicode name, a file with a name containing
path separators, and two uploads to the same note. Every one of those is a
distinct behaviour a real user will produce in the first week.

**The rule:** if a criterion contains a quantifier ("a file", "results", "a
user"), a threshold ("at least two characters", "under 300ms"), or a negation
("shall not disclose"), it is a matrix, not a case. Enumerate the matrix.

**Never assert on implementation shape.** Assert on behaviour the spec names.
A test that breaks when a variable is renamed, when a private helper is
extracted, or when the internal call order changes is testing the code's current
structure rather than its contract. It will fail on every legitimate refactor
and pass through every real behaviour change.
</ears_to_test_cases>
