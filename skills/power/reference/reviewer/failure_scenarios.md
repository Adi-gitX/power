<!-- Generated from prompts/reviewer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<failure_scenarios>
Every finding with `kind: "defect"` carries a `failure_scenario`. This is the
field that makes the report actionable, and it is the field most often filled
with a restatement of the summary.

A failure scenario has three parts, in this order:

1. **The trigger** — the concrete input, state, sequence, or timing. Actual
   values, not categories. "An empty `items` array", not "invalid input".
2. **What the code does** — the specific path taken, named by line or function.
3. **The consequence** — the wrong output, the exception, the corrupted state,
   the leak, the hang. What the user or the caller observes.

If you cannot fill all three, you are not sure this is a bug. That is fine —
lower the confidence and say which part you could not establish.

**Good failure scenarios.**

> `parseRange("5-")` — a range with no upper bound, which the CSV importer
> produces for open-ended tiers. `end` is `parseInt("")` which is `NaN`; the
> comparison on line 42 is `start <= NaN`, which is false, so the function
> returns an empty array instead of the open range. The importer then treats the
> tier as having no members and silently drops those rows — no error is raised,
> so the operator sees a successful import with missing data.

Why it works: exact input, exact line, exact mechanism, and a consequence stated
in terms of what someone observes. Anyone can confirm this in thirty seconds.

> Two requests for the same user hit `POST /credits/redeem` within the same
> event loop turn. Both read `balance` at line 88 before either writes at line
> 94. There is no transaction, no optimistic version check, and no unique
> constraint on the redemption table. Both succeed; the user redeems a 100-credit
> balance twice and the balance goes to -100, which the display code renders as
> a negative number rather than rejecting.

Why it works: names the interleaving, points at the exact read and write, names
the three things that would have prevented it, and states the observable result.

> The 30-day retention job at `cleanup.ts:61` compares `createdAt` against
> `Date.now() - THIRTY_DAYS` where `THIRTY_DAYS` is `30 * 24 * 60 * 60` —
> seconds, while `createdAt` and `Date.now()` are milliseconds. The cutoff is
> therefore ~2.6 million milliseconds ago, so every record older than about 43
> minutes is deleted on the first run. Confidence high: `createdAt` is written
> from `Date.now()` at `record.ts:20`.

Why it works: shows the unit mismatch arithmetically, states the blast radius,
and cites the second location that establishes the premise.

**Bad failure scenarios.**

> The function may not handle edge cases correctly, which could lead to
> unexpected behavior.

No trigger, no mechanism, no consequence. This is a sentence that can be
attached to any function ever written, which is how you can tell it carries no
information. If this is all you have, you have not found a bug — you have a
suspicion, and the honest version is to say what you were worried about and what
you could not check.

> Potential null pointer exception.

Where? On what input? Which line dereferences it? "Potential" is doing all the
work and it is doing none of it.

> This code is vulnerable to SQL injection.

Possibly true and possibly not. Which parameter reaches which query
unparameterized, by what path, and what does a caller control? Without those, an
implementer has to redo the entire analysis, and if you were wrong they burn a
cycle proving it.

> Race condition in the handler.

Between which two operations, under what concurrency, producing what wrong
state? "Race condition" names a category, not a bug.

**A note on speculative scenarios.** It is legitimate to write a scenario you
have not confirmed, as long as you say which link is unconfirmed:

> If `config.retries` can be zero — I could not find where it is set, only that
> it is read at line 12 — then the `do/while` at line 30 still executes once and
> the "no retries" configuration silently performs one attempt. Confidence
> medium; the gap is that I could not locate the config's source.

That is a good finding. It names the trigger, the mechanism, the consequence,
and the exact thing that would confirm or kill it. It is the kind of finding a
filtering instinct would delete, and it is the kind that turns out to be real.
</failure_scenarios>
