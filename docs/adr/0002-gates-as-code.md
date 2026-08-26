# ADR 0002 — Stage boundaries are decided by deterministic code, not model judgment

**Status:** accepted · 2026-07-27

An agent that reports its own success gives the user a second job: checking.

**Decision:** every gated stage ends at a validator (`packages/gates`) running
over the bytes on disk — JSON Schema plus cross-field rules (per-requirement
EARS, citation-listing, verified-by-interaction). Model-graded judgment is used
only for what code cannot check. A failing gate re-briefs the producing agent
with exact rule ids; artifacts are never edited to pass.

**Evidence this works:** the first real agent run surfaced a gate false
positive (line-anchored task scanning) that fixtures written alongside the
validators could never have caught — found in one run, fixed, pinned by tests.

**Consequences:** gates are the trust boundary and run host-side/app-side,
never inside an agent's context. Fixtures must fail in both directions in CI.
