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

**Managed OmniRoute (2026-08-27):** on request, Power now manages an OmniRoute
instance end to end rather than only detecting one — install (`npm i -g
omniroute`), start/stop, health via `/api/health/ping`, and open-dashboard, all
from the Routing sheet. A run that routes to OmniRoute ensures the server is up
before the first dispatch. OmniRoute is keyless on loopback (its `auto` model
answers with no key), and Power maps each role to a smart alias (`auto/coding`
for code and gate roles, cheaper routes for research/docs). This does not change
the invariants above: OmniRoute is still a local server the user runs with their
own accounts, still off by default, and the quality floor still holds — a
one-click "Maximum free" toggle widens it to every role, with the quality
trade-off stated inline, and it is the user's explicit choice, never the shipped
default. `Provider.omniRoute(maxFree:)` / `omniRouteProvider(maxFree)` is the
single factory both engines build it from.

**Never-stops fallback (2026-08-27):** routing must never make a run *less*
reliable than not routing. So the dispatch degrades gracefully in two layers:
(1) preflight — an unreachable gateway falls back to the Claude default before a
dispatch is spent on a dead endpoint; (2) on error — a gateway dispatch that
fails anyway retries once on the Claude default. Claude is the floor and has no
fallback: its failure is a real failure the gate's retry loop must see, and a
user Stop is never treated as a provider fault. A resume id never crosses
providers (a session belongs to the endpoint that opened it), so a fallback
always goes cold. The managed OmniRoute additionally self-supervises — a
background health monitor respawns it if it dies while enabled, cleared by Stop.
Pinned by an engine test where a gateway fails *every* dispatch and the run still
reaches done through the floor.

**Request compression (2026-08-27):** OmniRoute's token-compression is enabled
per routed stage via Claude Code's `ANTHROPIC_CUSTOM_HEADERS` (verified real,
Claude Code ≥ 2.1.227) carrying `x-omniroute-compression: <mode>`. The managed
provider defaults to `stacked`; the UI offers Off / Standard / Max. It is safe on
a coding run — OmniRoute compresses noisy tool output, never code, and its
cache-aware pass self-downgrades for caching providers so it never breaks Power's
warm-session reuse. The header rides `providerEnv`/`env(for:)`, so it only ever
touches a gateway dispatch's environment, never Claude-direct stages.

**Consequences:** the router, env hook, base-URL normalization, and compaction
live in both engines (`apps/desktop/src/main/engine/providers.ts` and the
`Provider`/`ProviderRouter` types in `apps/macos/Power/Models.swift`) and stay
behaviorally identical per [ADR 0005](0005-typescript-brain-swift-shell.md),
pinned by matching tests (`apps/desktop/test/providers.test.ts` and the Swift
provider smoke). Per-provider cost is tracked and surfaced so a routed run reads
honestly ("N turns routed off Claude") rather than hiding where the work ran.
