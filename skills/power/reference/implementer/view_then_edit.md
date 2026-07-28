<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<view_then_edit>
**Read the file, then change the part that needs changing. Never regenerate a
file you have not just read in full, and never regenerate a whole file to change
part of it.**

This is the failure mode that destroys the most work on long runs, and the pull
toward it is strong precisely because rewriting *feels* faster and produces
cleaner-looking output. It is not faster. It is the fastest way to silently
delete behaviour that took several previous stages to get right.

**Why rewriting loses.** A file you did not write in this session contains
decisions you cannot see: a `.trim()` that fixes a real bug, an ordering
dependency between two calls, an early return that handles a case discovered in
testing, a comment that records why the obvious approach fails. When you
regenerate the file from your understanding of what it should contain, every one
of those decisions that you did not happen to reproduce is gone. Nothing errors.
The build is green. The regression surfaces two stages later as a mysterious
verifier failure, and whoever debugs it has no reason to suspect a file that
"was not part of this change."

**The mechanics.**

1. Read the file. If it is long, read the region you are changing plus enough
   surrounding context to understand the local conventions — imports, helpers,
   the shape of neighbouring functions.
2. Make a targeted edit against exact existing text.
3. If the edit tool reports the target text was not found or was ambiguous, that
   is information: your model of the file is wrong or stale. Re-read, do not
   loosen your match, and do not fall back to rewriting the file.
4. Verify.

**Worked example — the wrong way.** The task: `R12` says the note list must
exclude archived notes.

The file, `src/repositories/note-repository.ts`, currently reads:

```ts
export async function listNotes(userId: string, limit = 50): Promise<Note[]> {
  // ordering is by updated_at, not created_at: R2 says "most recently edited first"
  const rows = await db.query(
    'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2',
    [userId, Math.min(limit, 200)],
  );
  return rows.map(fromRow);
}
```

The wrong move is to write the file fresh with the new filter:

```ts
export async function listNotes(userId: string): Promise<Note[]> {
  const rows = await db.query(
    'SELECT * FROM notes WHERE user_id = $1 AND archived = false ORDER BY created_at DESC',
    [userId],
  );
  return rows.map(fromRow);
}
```

Count what was destroyed. The `limit` parameter and its callers' expectations.
The 200-row cap, which was there because someone found a slow query. The
`updated_at` ordering, which is `R2`, now silently changed to `created_at` —
`R12` will pass and `R2` will regress. And the comment recording why the
ordering is what it is, so the next person will make the same mistake again.

**The right way** is a single targeted edit to the SQL string:

```ts
export async function listNotes(userId: string, limit = 50): Promise<Note[]> {
  // ordering is by updated_at, not created_at: R2 says "most recently edited first"
  const rows = await db.query(
    'SELECT * FROM notes WHERE user_id = $1 AND archived = false ORDER BY updated_at DESC LIMIT $2',
    [userId, Math.min(limit, 200)],
  );
  return rows.map(fromRow);
}
```

One clause changed. Everything else preserved. The diff is one line, which is
also what makes it reviewable.

**When a full rewrite is legitimate.** Exactly two cases. First, you are
creating the file — it did not exist before this change. Second, the file's
entire contents are being replaced by design, you have read the current contents
in full in this session, and you have stated in your report what behaviour is
being removed and why. There is no third case. "It was easier" is not one, and
neither is "the file was messy."

**A related trap: editing without reading.** Jumping straight to an edit because
you are confident you remember the file is the same failure with a smaller blast
radius. Your memory of a file you read forty tool calls ago is stale — a review
cycle or a test fix may have changed it since. Read first. Every time.
</view_then_edit>
