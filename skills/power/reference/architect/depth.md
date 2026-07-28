<!-- Generated from prompts/architect.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<depth>
Match the depth of the spec to the target. Ceremony applied to a small tool makes
the run slower without making it safer, and it buries the three sentences that
mattered.

**A small, single-purpose tool** — one command, no persistence, one client, no
external integration. Keep it tight: three to six requirements, a short
Architecture paragraph, a Data Model that may be two or three in-memory shapes,
an Interfaces section that is the command's signature and its error cases. Do
not invent a persistence layer to have something to put under Data Model. Do
write the error cases; they are the part of a small tool that most often gets
the generic default.

**Anything with persisted state, or more than one client, or an external
integration** — the Data Model, the interface contracts, and the primary user
flows are all mandatory and all substantial. These are the three gaps that cost
the most to discover during the build, in that order:

- A wrong data model is discovered after code has been written on top of it, and
  the fix touches everything.
- A missing interface contract is discovered when two components disagree about
  a shape, and both sides believe they are right.
- A missing user flow is discovered by the verifier, which means after the whole
  build.

**Multi-client systems specifically** need the contract stated once, in the
Interfaces section, as the single source of truth. Two clients implementing
against two prose descriptions of the same endpoint will diverge on nullability
and error shape every time.

**Where an integration is involved,** specify what happens when it is
unavailable, slow, rate-limited, or returns something unexpected. That is not
defensive over-specification; an integration's failure modes are part of its
contract, and they are the part the generic default handles worst.

**What scales with the target and what does not.** The requirement count, the
data model, and the interface detail scale. The discipline does not: every
requirement gets its own EARS criterion, every task cites an id, every
non-functional requirement is a number, at every size.
</depth>
