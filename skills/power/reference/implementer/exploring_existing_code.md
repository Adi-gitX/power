<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<exploring_existing_code>
Exploration is not optional and it is not slow if you do it correctly. The
mistake is doing it serially — one grep, read the result, think, another grep.
Fan out instead.

**Batch your reads.** When you have several independent questions, issue every
tool call for them in a single block. Reading four files takes the same wall
clock time as reading one. A concrete opening batch for a task that adds an
endpoint to an unfamiliar service:

- glob for the route or controller files
- glob for the test files
- grep for the framework's route registration call
- grep for the project's error type or error helper
- read the dependency manifest
- read the entry point

That is six calls in one block, and it answers most of what you need to know
before you write anything.

**Never issue two sequential read-only calls when their inputs do not depend on
each other.** Sequential exploration is the single biggest waste of a run's
budget. The test is simple: ask whether the second call's arguments are
determined by the first call's output. If they are not, batch them.

**What you are looking for, specifically:**

1. *Where does this kind of thing live?* Find two or three existing examples of
   the same category of code — another endpoint, another model, another
   component — and read them fully. One example might be an outlier; three tell
   you the convention.
2. *How are errors produced and surfaced?* Does the project throw a custom
   error class, return a result type, or return an error response directly? Does
   it have a central error middleware? Match it exactly. Introducing a second
   error convention is one of the most damaging things you can do to a codebase,
   because now every caller has to handle both.
3. *How is input validated?* A schema library, hand-written guards, framework
   decorators, nothing at all at that layer? Use what is there.
4. *How is configuration read?* Find the existing pattern for environment access
   and use it. Do not add a second configuration mechanism.
5. *How are tests written?* Which runner, which assertion style, where do the
   files live, what is the naming convention, are there shared fixtures? Your
   tests must be indistinguishable from the existing ones.
6. *What is already there that you were about to write?* Grep for the function
   before you write it. Codebases accumulate helpers that nobody remembers, and
   a duplicate helper is worse than no helper because the two drift.

**Idiom matching is the point, not a nicety.** Consider a project whose handlers
all look like this:

```ts
export const getNote = handler(async (ctx) => {
  const note = await notes.byId(ctx.params.id);
  if (!note) throw new NotFound('note', ctx.params.id);
  return note;
});
```

Writing this instead — which works, typechecks, and passes a smoke test — is a
defect:

```ts
export async function getNote(req: Request, res: Response) {
  try {
    const note = await db.collection('notes').findOne({ id: req.params.id });
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json(note);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
```

It bypasses the `handler` wrapper, so it loses whatever that wrapper does —
request logging, tracing, transaction scoping, error normalization. It reaches
past the repository into the driver, so the next schema change misses it. Its
error body has a different shape than every other error in the system, so the
client's error handling does not fire. And it swallows every exception into a
500 with a stringified message, which is how a validation error becomes an
opaque server error in production.

None of that is visible from "it returns the note."

**When there is no existing convention** — a genuinely new project, or a
genuinely new kind of module — pick the most boring option that the project's
existing dependencies already support, and stay consistent with yourself across
every file you write in this run.
</exploring_existing_code>
