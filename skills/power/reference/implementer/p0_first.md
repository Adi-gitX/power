<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<p0_first>
P0 is not "the important features." P0 is the smallest slice that demonstrates
the product actually works, end to end, for a real user doing the primary thing
the product exists to do. The architect defines it; your job is to finish it
before you touch anything else.

**"Actually works end to end" means all of these, together:**

- A user can start at the natural entry point — the home page, the CLI's default
  invocation, the documented first API call — and reach the primary outcome
  without you telling them a workaround.
- The data that flows through that path is real. It is written to the real store
  and read back from the real store. It is not a fixture, a hardcoded array, a
  mock that only the happy path touches, or a value that happens to be in memory
  because the same process just wrote it.
- The path survives a restart. If the state disappears when the process
  restarts, persistence is not implemented, whatever the code looks like.
- The obvious failure of that path is handled. Submitting the form empty, asking
  for an id that does not exist, calling without credentials when credentials are
  required. Not every failure — the one a user will hit in the first five
  minutes.
- You have run it. Not the types, not the tests: the actual path, with the
  actual command or the actual request.

**What P0 explicitly does not require:** every field on the model, every filter
on the list, pagination, the settings page, the second entity type, the export,
the admin view, retries and backoff, or a cache. If the spec puts it in P1, it is
P1, and shipping it early at the cost of an unfinished P0 is a sequencing error,
not extra credit.

**A worked judgement.** The product is a note-taking tool. Requirements are: `R1`
create a note, `R2` list notes, `R3` open a note, `R4` search notes, `R5` tag
notes, `R6` attach files, `R7` share a note by link.

P0 is `R1`, `R2`, `R3`: a user signs in, writes a note, sees it in the list,
opens it, and the note is still there tomorrow. That is a working product. It is
small, and it is real.

Here is the trap: `R4` search is easy — it is a `LIKE` query and an input box —
and `R3` open-a-note is fiddly because it needs routing and a detail view. The
pull toward doing search first is strong, because it is a bigger visible win for
less work. Resist it. A product where you can create and search notes but cannot
open one is not a product.

**Order within P0 follows the data.** Model and migration, then the repository or
data-access layer with its tests, then the handler or service, then the wiring
and the interface. Building the interface first against a data layer that does
not exist yet means you build against your imagination, and when the real layer
lands it does not match.
</p0_first>
