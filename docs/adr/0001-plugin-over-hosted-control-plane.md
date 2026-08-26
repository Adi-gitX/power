# ADR 0001 — Ship as clients of the user's Claude session, not a hosted control plane

**Status:** accepted · 2026-07-28

Power was first built as a hosted control plane over Anthropic Managed Agents:
our servers, the customer's API key, webhooks, billing. It was complete, tested
— and had never made a live call, because it required key custody, a deploy
target, and persistence that did not exist.

**Decision:** deliver inside the user's own Claude session (plugin, then
desktop shells driving the `claude` CLI headless). This deleted the three
hardest problems — API key custody, deployment, billing — and made the biggest
risk ("never run for real") testable immediately.

**Consequences:** the hosted path stays in-repo, dormant and tested
(`apps/orchestrator`, `packages/core/client.ts`), so a managed offering later
shares the same brain. All auth is the CLI's OAuth; the product never holds a
credential.
