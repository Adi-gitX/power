# ADR 0006 — Provider routing with a quality floor

**Status:** accepted · 2026-08-27

**Context:** every Power stage is a headless `claude` dispatch on the user's own
Claude login, and a user asked to route stages to cheaper or free providers
(evaluating OmniRoute, an AI gateway that fronts 350+ providers behind an
Anthropic-compatible endpoint). The mechanism is a one-line hook: Claude Code
honours `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN`, so any dispatch can be
redirected to a gateway the user runs. The temptation is to bundle a fleet of
third-party free tiers and route everything through them for a "$0" product.

**Decision:** Power ships a **provider layer** — a router that can send a stage
to any Anthropic-compatible endpoint via the env hook — but with two hard
constraints that make it safe for a gated, commercial product:

1. **Quality floor, not blanket routing.** A cheap/unproven provider is trusted
   by default only with the roles where a miss is cheap and self-correcting —
   `researcher` and `documenter`. Every role a gate directly grades, and every
   role that writes code (`architect`, `implementer`, `reviewer`, `tester`,
   `verifier`), stays on the user's trusted default unless the user explicitly
   widens the floor. Output is only as trustworthy as the gate that passes it;
   routing a code stage to a weak model doesn't save money, it spends more turns
   failing gates.

2. **No bundled providers.** Power ships zero third-party providers and no
   anonymous free tiers. The only provider that exists until the user adds one
   is their own Claude login. Adding a gateway is a choice the user makes, on
   their machine, pointing at an endpoint they run (e.g. a local OmniRoute on
   `:20128`). The product never routes a customer's traffic through someone
   else's free tier on their behalf — that would move the providers' ToS risk
   onto every install and corrupt the trust the gates exist to earn.

The default provider injects no environment overlay: a run with no configured
providers behaves exactly as it did before this feature. Alongside routing, the
layer does conservative, lossless brief compaction (drop trailing whitespace,
blank-line runs, exact duplicate lines) — the safe half of "token compression",
never rewriting instructions to a model.

**Consequences:** the router, env hook, base-URL normalization, and compaction
live in both engines (`apps/desktop/src/main/engine/providers.ts` and the
`Provider`/`ProviderRouter` types in `apps/macos/Power/Models.swift`) and stay
behaviorally identical per [ADR 0005](0005-typescript-brain-swift-shell.md),
pinned by matching tests (`apps/desktop/test/providers.test.ts` and the Swift
provider smoke). Per-provider cost is tracked and surfaced so a routed run reads
honestly ("N turns routed off Claude") rather than hiding where the work ran.
