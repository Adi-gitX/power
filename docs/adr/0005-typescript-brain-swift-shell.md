# ADR 0005 — TypeScript brain, Swift native shell, Markdown prompts

**Status:** accepted · 2026-07-30

**Decision:** the brain (registry, gates, state machine, knowledge, tooling)
stays TypeScript — schema/text-processing work, npm ecosystem, one unified test
runner. The native Mac shell is Swift/SwiftUI — the only honest way to be a
real Mac app — kept faithful to the TS engine via the shared mock harness and
shared CLIs. Prompts and packs are Markdown/YAML compiled by
`packages/agents`, never string literals in code.

No Rust/Go rewrite: nothing is CPU-bound; the hard problems are correctness
and cost discipline, addressed by gates and tests.

**Consequences:** two engine implementations exist (TS, Swift) and must stay
behaviorally identical; both run the same mock-driven full-pipeline proof, and
any pipeline change lands in both in the same commit.
