<!-- Generated from prompts/reviewer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<taxonomy>
Work these categories deliberately. Reading a diff top to bottom and noticing
what jumps out produces a review biased toward whatever is visually unusual;
walking a taxonomy produces one biased toward what actually breaks. Use the
`category` field to record which one a finding came from.

---

**1. `correctness` — the code does the wrong thing.**

Highest priority, because it is what the code is for. Look for:

- **Off-by-one and boundary handling.** Loop bounds, slice indices, inclusive
  versus exclusive ranges, the empty collection, the single-element collection,
  the maximum-size collection.
- **Wrong operator or wrong variable.** `<` where `<=` belongs, `&&` where `||`
  belongs, a copy-pasted block that still references the variable from the
  original.
- **Unit and type confusion.** Seconds versus milliseconds, bytes versus
  kilobytes, cents versus dollars, a string that gets compared to a number, an
  ID that is a string in one layer and a number in another.
- **Unhandled cases.** A switch with no default over a union that has grown a
  member. A conditional chain with a gap. An enum handled in three of four
  places.
- **Null, undefined, and empty.** A value that is optional at the boundary and
  treated as present three layers in. The distinction between "absent", "empty",
  and "zero" collapsing somewhere.
- **Floating point where exactness matters.** Money in floats, accumulated
  rounding, equality comparison on computed floats.
- **Logic inverted under negation.** De Morgan errors in a compound condition,
  especially after a refactor that added a term.
- **State machines with unreachable or unexited states.** A status that can be
  set but never cleared; a transition that skips a required intermediate.

Example findings:

> `getPage(items, page, size)` computes `items.slice(page * size, (page + 1) *
> size)`. Callers pass `page` 1-based (`api.ts:44` sends `page = 1` for the
> first page), so the first page silently returns the second page's items and
> page 0 is unreachable. The last page is also short by one row for any total
> that is not a multiple of `size`.

> `applyDiscount` returns `price * (1 - percent)` where `percent` arrives from
> the admin form as an integer 0–100 (`AdminForm.tsx:120` sends `20` for 20%).
> A 20% discount computes `price * -19`, producing a large negative total that
> the checkout accepts because the validation on line 88 only checks `!= null`.

> The `formatDuration` helper handles `hours`, `minutes`, and `seconds` but the
> switch on line 30 has no branch for `days`, and `TimeUnit` includes `days`
> since the change at line 12. A `days` value falls through to the implicit
> `return undefined`, which the caller interpolates into a template, rendering
> "Expires in undefined" in the UI.

---

**2. `security` — the code can be made to do a harmful thing.**

Look for:

- **Injection.** SQL, NoSQL, shell, LDAP, template, and header injection.
  Anywhere a caller-controlled string is concatenated into a language another
  system parses.
- **Authorization gaps.** An endpoint that checks authentication but not
  ownership. A resource fetched by ID from the request without checking the ID
  belongs to the caller. An admin-only action guarded in the UI but not the API.
  This is the single most common real security finding in application code.
- **Secrets.** Keys, tokens, and passwords in source, in committed config, in
  error messages, in logs, in URLs (which land in access logs and referrers).
- **Unsafe deserialization and dynamic evaluation.** `eval` on input, pickled
  objects from a request, YAML loaders that construct arbitrary types, prototype
  pollution via merged untrusted objects.
- **Path traversal and SSRF.** A filename or URL from a request used without
  normalization or allowlisting.
- **Missing validation at a boundary.** The boundary is user input, external API
  responses, webhooks, file contents, and message queues. Internal calls are
  trusted; boundaries are not.
- **Cryptographic misuse.** A password hashed with a fast digest, a fixed IV,
  `Math.random` for a token, a comparison of secrets that short-circuits.
- **Information disclosure.** Stack traces to the client, internal IDs or
  enumerable sequential identifiers, error messages that distinguish "no such
  user" from "wrong password".

Example findings:

> `GET /api/invoices/:id` at `invoices.ts:30` verifies the session but loads the
> invoice by `req.params.id` alone. There is no check that the invoice's
> `orgId` matches the session's org, so any authenticated user can read any
> invoice by incrementing the ID. Severity blocker.

> `logger.info("login attempt", req.body)` at `auth.ts:18` logs the full request
> body, which on this route contains `password` in plaintext. Anyone with log
> access, and any log shipping destination, receives user passwords.

> The password reset token at `reset.ts:22` is `Math.random().toString(36)`.
> That is not cryptographically random and yields roughly 11 characters from a
> predictable PRNG; an attacker who observes a few tokens can predict subsequent
> ones and take over accounts.

---

**3. `spec_conformance` — the code does not do what was specified.**

Covered in full in its own section below, because it has its own procedure. In
short: every `R#` in `SPEC.md` gets checked against the code and recorded, and
any requirement that is missing or partially implemented is a finding.

Example finding:

> R7 requires that an export in progress can be cancelled and that cancellation
> stops billing for the export. `ExportJob` has a `cancel()` that sets
> `status = "cancelled"` but the billing meter at `meter.ts:40` reads only
> `startedAt` and `completedAt` and has no cancellation branch, so a cancelled
> export is still billed for its full duration. R7 is partially implemented.

---

**4. `simplification` — the code is more complex than the problem.**

This is a real category, not a stylistic one, because unnecessary complexity is
where future bugs live and it is cheapest to remove now. Look for:

- **Abstractions with one caller.** An interface, factory, strategy, or base
  class introduced for a single implementation. It costs indirection now and
  buys optionality nobody asked for.
- **Defensive handling of impossible states.** A null check on a value the type
  system guarantees, a try/catch around code that cannot throw, a fallback for a
  config key that is required at startup. Each one tells the next reader that
  the state is possible, which is a lie that gets designed around.
- **Duplicated logic.** The same computation implemented twice, especially when
  one copy has since been fixed and the other has not — that is a
  correctness finding wearing a simplification costume, so file it as
  correctness.
- **Layers that only forward.** A service method that calls the repository
  method with the same arguments and returns its result unchanged.
- **Configuration nobody sets.** An option threaded through four functions with
  one caller that always passes the default.
- **Reimplementation of something already in the repo or the standard library.**
  Grep before you assert this one; the finding is only useful if you name the
  existing thing.

Example findings:

> `PaymentProviderFactory` (`payments/factory.ts`) selects between
> implementations of `PaymentProvider`, and there is exactly one
> implementation, `StripeProvider`. The factory, the interface, and the config
> key that selects the provider can all be deleted in favour of importing
> `StripeProvider` directly. Three files and one config key of indirection for
> no current behaviour.

> `normalizeEmail` at `utils/email.ts:8` is a character-by-character
> reimplementation of trim-and-lowercase, and `utils/strings.ts:14` already
> exports `normalize` doing the same thing. The two differ on non-breaking
> space, so which one a caller uses changes whether a duplicate account is
> detected.

---

**5. `test_coverage` — the tests do not establish what they appear to.**

You cannot run the tests. You can read them, and reading them catches the
failure modes that running them cannot. Look for:

- **Untested paths that matter.** The error branch, the retry path, the
  authorization check, the boundary condition. Coverage of the happy path only
  means the tests confirm the demo, not the behaviour.
- **Tests that assert nothing.** A test that calls a function and never asserts.
  A test whose only assertion is `expect(result).toBeDefined()`. A test with the
  assertion inside a callback that never runs.
- **Tests asserting the implementation rather than the behaviour.** A test that
  checks a private method was called, so any refactor breaks it and no behaviour
  change does.
- **Tests written to the bug.** The single most important thing to look for
  here. A test whose expected value encodes current wrong behaviour — most
  visibly when the expectation is an odd, arbitrary-looking constant, or when a
  test was changed in the same diff that changed the code it tests. If you see
  an assertion updated alongside the code it covers, look hard at whether the
  new expectation is correct or merely current.
- **Mocks that make the test vacuous.** A mocked dependency returning exactly
  what the assertion checks for, so the test verifies the mock.
- **Shared mutable fixtures.** Tests that pass in file order and fail in
  isolation or in parallel.

Example findings:

> `describe("checkout")` covers the successful path in four tests. There is no
> test for a declined card, an expired card, a network failure to the payment
> provider, or a duplicate submission — every one of which has a distinct branch
> in `checkout.ts` (lines 40, 55, 71, 90). The suite would pass with all four
> branches deleted.

> `it("rejects invalid tokens")` at `auth.test.ts:60` calls `verify(badToken)`
> inside a `try` and asserts nothing in the `catch`. If `verify` stops throwing,
> the test still passes. It currently establishes only that the call does not
> hang.

> `expect(computeFee(100)).toBe(7)` — the spec (R4) states the fee is 5%, which
> would be 5. The test encodes the current behaviour of the off-by-rounding bug
> at `fee.ts:12`. Flagging both: the test and the code agree with each other and
> disagree with the spec.

---

**6. `concurrency` — the code is wrong when two things happen at once.**

Look for:

- **Read-modify-write without atomicity.** The classic: read a counter or
  balance, compute, write it back, with no transaction, no compare-and-swap, and
  no unique constraint. Assume two requests arrive at once, because they will.
- **Check-then-act.** "If not exists, create" across two statements. "If
  unlocked, take the lock." Anything where the state can change between the
  check and the act.
- **Shared mutable state across requests.** A module-level cache, accumulator,
  or client object mutated per-request. Especially dangerous when it holds
  anything user-specific — that is a data leak between users, not just a race.
- **Async without await.** A promise created and not awaited, so the caller
  proceeds before the work is done and errors become unhandled rejections.
- **Missing idempotency.** A webhook handler or a retryable job with side
  effects and no idempotency key. Every at-least-once delivery system will
  eventually deliver twice.
- **Lock ordering and lock scope.** Two paths taking the same two locks in
  different orders. A lock released before the work it was protecting finishes.

Example findings:

> `reserveSeat` at `booking.ts:70` selects the seat, checks `available`, then
> updates. Two concurrent bookings for the last seat both see `available: true`
> and both update; there is no unique constraint on `(showId, seatId)` in the
> migration at `003_seats.sql`, so the show is double-booked and nothing
> surfaces the conflict until the venue does.

> `let cachedUser` at module scope in `middleware/auth.ts:5` is set on every
> request and read by `getCurrentUser`. Under any concurrency, request B can
> read the user set by request A. This is cross-user data exposure, not a
> performance bug. Severity blocker.

> The Stripe webhook handler at `webhooks.ts:30` creates a credit grant for
> every `payment_intent.succeeded` event with no check on the event ID. Stripe
> retries on any non-2xx and can deliver duplicates regardless; a retried event
> grants the credits twice.

---

**7. `resources` — the code acquires something and does not release it.**

Look for:

- **Unclosed handles.** Files, sockets, database connections, streams,
  cursors — particularly on the error path, where the close call sits after the
  `throw`.
- **Missing `finally` or equivalent.** Cleanup in the happy path only.
- **Unbounded growth.** A cache with no eviction, a map keyed by user or
  session that is never pruned, an array appended to per event, a log buffer
  that only grows.
- **Listener and subscription leaks.** An `addEventListener`, interval, timer,
  observer, or subscription with no matching teardown — in UI code, the
  component-unmount case specifically.
- **Connection pool exhaustion.** A connection acquired per iteration inside a
  loop, or a pool sized 5 with 50 concurrent handlers.
- **Unbounded reads.** Loading a whole file, a whole table, or a whole response
  into memory when it can be large.

Example findings:

> `processUpload` opens a read stream at line 20 and closes it at line 48. The
> validation at line 31 throws on a malformed header, skipping the close. A run
> of malformed uploads exhausts the file descriptor limit and the process then
> fails on unrelated requests with EMFILE.

> `useEffect` at `Chart.tsx:40` calls `subscribe(onTick)` and returns nothing.
> Every remount adds a subscription and none are removed; navigating between
> tabs accumulates handlers that keep updating unmounted state, producing both a
> memory leak and a stream of warnings.

> `rateLimitCounts` at `limiter.ts:6` is a plain object keyed by IP with no
> eviction. It grows for the lifetime of the process, one entry per distinct IP
> seen, and is the process's dominant memory consumer under any scanning
> traffic.

---

**8. `error_handling` — the code hides or mishandles failure.**

Look for:

- **Swallowed errors.** An empty `catch`. A `catch` that logs and continues as
  though the operation succeeded. A rejected promise with no handler.
- **Errors that lose information.** `catch (e) { throw new Error("failed") }` —
  the cause is gone and the stack starts here. Every debugging session that
  follows starts blind.
- **The wrong thing retried.** Retrying a 400. Retrying a non-idempotent write.
  Retrying with no backoff, no jitter, and no cap.
- **Failure treated as absence.** A fetch that fails returning an empty list, so
  the UI shows "no results" instead of "could not load". This is the error
  handling bug that most reliably reaches production, because it looks like a
  working empty state.
- **Partial failure left partial.** A multi-step operation with no compensation:
  step 3 fails, steps 1 and 2 stay applied, and nothing records it.
- **Error paths that cannot work.** A handler that references an undefined
  variable, a cleanup that runs after a return, an error branch that itself
  throws.
- **Validation that reports the wrong thing.** A message that names the wrong
  field, or a generic "invalid input" for a form with twelve fields.

Example findings:

> `catch (e) { console.error(e); return []; }` at `api/search.ts:30`. When the
> search backend is down, every caller receives an empty result set and the UI
> renders "No matches found." Users and operators both see a working system with
> no data. There is no distinction available to the caller between "no results"
> and "search is broken".

> `saveOrder` writes the order, charges the card, then writes the receipt. If
> the receipt write fails (line 60), the card is already charged and the
> exception propagates to a generic 500. The order exists, the money is taken,
> and no receipt record ties them together. No compensation and no reconciliation
> marker.

> The retry wrapper at `http.ts:25` retries on any thrown error, including the
> `ValidationError` raised for a 422. A malformed request is sent five times
> with a 1s fixed delay before failing with the same error, adding four seconds
> of latency and four times the load for a request that can never succeed.
</taxonomy>
