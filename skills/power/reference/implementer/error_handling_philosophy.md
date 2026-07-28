<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<error_handling_philosophy>
The purpose of error handling is to make failures **loud, specific, and
actionable**. Its purpose is not to prevent crashes. A process that crashes with
a precise message is in a much better state than a process that continues with
corrupted data.

**Handle an error only where you can do something about it.** There are exactly
three useful things to do: recover meaningfully (retry a transient failure,
fall back to a genuinely equivalent source), translate it into the right
representation for the caller (a validation failure becomes a 400 with the field
that failed), or add context and re-raise. If you are doing none of the three,
do not catch it. Let it propagate to the boundary that knows how to report it.

**Never swallow an exception.** An empty catch block, a catch that logs and
continues, or a catch that returns a default value, all convert a specific
failure into a mysterious wrong answer. The bug is now unfindable, because the
information that would have identified it was destroyed at the point it was
generated.

*Wrong:*

```ts
try {
  await syncProfile(user);
} catch (e) {
  // ignore
}
```

*Wrong in a subtler way — the log makes it feel handled, but the caller still
proceeds as though the sync succeeded:*

```ts
try {
  await syncProfile(user);
} catch (e) {
  console.error('sync failed', e);
}
```

*Right — either it matters, in which case it propagates:*

```ts
await syncProfile(user);
```

*Or it genuinely does not block the caller, in which case say so explicitly and
record enough to diagnose it later:*

```ts
try {
  await syncProfile(user);
} catch (cause) {
  // Profile sync is best-effort: R11 says signup completes regardless.
  logger.warn({ cause, userId: user.id }, 'profile sync failed; signup continues');
}
```

The third version is acceptable only because a requirement says the failure is
non-blocking, the comment records that, and the log carries the identifier
needed to find it.

**Preserve the cause.** When you wrap an error, attach the original. A stack
trace that stops at your wrapper is worth much less than one that reaches the
driver call that actually failed.

```ts
throw new StorageError(`failed to load note ${id}`, { cause });
```

**Error messages are read under pressure.** Include what was being attempted,
the identifying values, and — where the fix is knowable — what to do. `Invalid
input` is useless. `title must be 1-200 characters, got 0` tells the caller
exactly what to change. Never put a secret, a full credential, or an entire
request body into a message.

**Fail fast at startup.** Missing configuration, an unreachable required
dependency, or an invalid schema should stop the process immediately with a
clear message rather than surfacing as a confusing runtime failure on the first
request.

**Distinguish expected outcomes from exceptional ones.** "Not found" on a lookup
that routinely misses is an expected outcome; model it in the return type. A
database connection failure is exceptional; throw. Using exceptions for ordinary
control flow makes real failures harder to see; using return codes for genuine
failures makes them easy to ignore.
</error_handling_philosophy>
