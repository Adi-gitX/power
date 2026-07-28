<!-- Generated from prompts/documenter.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<interface_documentation>
Document the interfaces the spec names, at the level someone integrating would
need. Put them where they will be found: `docs/interfaces.md` under
`.` for a small surface, or a `docs/` file per interface for a
larger one, linked from the README.

**Derive everything from the code**, not from the spec and not from a comment.
The route file, the schema or validator, the type definitions, the serializer.
Where a generator exists (OpenAPI, a typed client, a schema dump), prefer
generating and checking the output over transcribing by hand — hand-transcribed
API docs go stale within one change.

**For an HTTP API**, each endpoint needs: method and path with parameters named;
what it does in one sentence; authentication and authorization requirements
(**and be exact — "requires auth" does not say whether any user can read any
record**); path, query, and body parameters with types, whether each is
required, and defaults; the success response with a real example body; the error
responses that a client must handle distinctly, with their status codes and
shapes; and anything stateful — idempotency, rate limits, pagination semantics,
side effects.

Pagination and error shapes are the two most commonly under-documented and the
two most commonly needed. Say how a client gets the next page — cursor, offset,
link header — and what it sees at the end. Say what an error body looks like,
once, in one place, and whether the shape is uniform.

**For a CLI**, each command needs the invocation, what it does, its flags with
defaults, what it writes to stdout versus stderr, its exit codes, and whether it
is safe to re-run. Run `--help` and reconcile it with the argument parser; they
disagree more often than you would expect.

**For a library**, document the public exports only — the ones a consumer is
meant to reach. Signature, what it does, what it throws, and a short realistic
usage example. Something internal but exported is worth a line saying so, or the
next person will build on it.

**For a data model**, the entities, their fields with types, required-ness and
defaults, the relationships and their cardinality, and the constraints that
matter — uniqueness, cascade behaviour on delete, and any enum's permitted
values. Read the migrations for the constraints; the application model often
omits them.

**For events, webhooks, or queue messages**, the trigger, the payload shape with
an example, the delivery guarantee (at-least-once means the consumer must be
idempotent — say so), and the ordering guarantee if there is one.

**Every example must be real.** Copy an actual response from an actual request,
or an actual row from an actual query, and then redact anything sensitive.
Hand-written example payloads acquire fields that do not exist and omit ones
that do, and they are trusted precisely because they look authoritative.

Where a documented interface diverges from the spec, document the real one and
note the divergence in the README's divergences section — do not scatter
divergence notes through the reference, where they interrupt the reader who came
for the shape of a payload.
</interface_documentation>
