# ADR 0004 — The repo layout is a runtime ABI

**Status:** accepted · 2026-07-30

Three shipped shells resolve concrete paths at runtime: `agents/*.md`,
`skills/power/**`, `scripts/*.mjs`, `packages/*/dist/cli.js`, gate schemas and
fixtures, `.claude-plugin/*`.

**Decision:** these paths are treated as a public API. They do not move for
aesthetics; changes require updating every consumer (plugin, Electron engine,
Swift engine, export tool) in the same commit, and the drift tests must cover
the change. Generated trees (`agents/`, `skills/power/reference/`) are
committed, rebuilt in CI, and diffed — a stale generate fails the build.

**Consequences:** "professional restructuring" of this repo means adding the
meta-layer (docs, tooling, CI), not renaming directories. Standalone builds get
their runtime via `tools/export-xcode.mjs` (dependency-free esbuild bundles in
the same folder shape).
