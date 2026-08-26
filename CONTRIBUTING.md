# Contributing to Power

## Setup

```bash
pnpm install
pnpm check        # typecheck (builds dists) + registry validation + 300 tests
```

Node ≥ 22 (`.nvmrc`), pnpm 10 (`packageManager` pins it). Xcode 16+ only for
`apps/macos`.

## The one rule that outranks the others

**Read `docs/ARCHITECTURE.md` before moving anything.** Several paths are a
runtime ABI (ADR 0004) consumed by shipped shells; renaming them for tidiness
breaks installed software.

## Generated code

`agents/` and `skills/power/reference/` are compiled from `packages/agents` —
never hand-edit them. Edit the prompt sources, then:

```bash
pnpm build:plugin
```

CI rebuilds and diffs; a stale generate fails the build. `.gitattributes` marks
these trees `linguist-generated` so review diffs collapse them.

## Per-surface commands

| Surface | Dev | Build | Test |
|---|---|---|---|
| Brain (`packages/*`) | — | `pnpm typecheck` | `pnpm test` |
| Plugin | `/plugin marketplace add <repo>` | `pnpm build:plugin` | drift tests in `pnpm test` |
| Electron (`apps/desktop`) | `pnpm dev:desktop` | `pnpm build:desktop` | engine tests in `pnpm test`; `POWER_MOCK_AGENTS=1` for free full-pipeline runs |
| Native (`apps/macos`) | open in Xcode | Xcode | mock harness via scheme env `POWER_MOCK_AGENTS=1` |
| Website (`apps/web`) | `pnpm dev:web` | `pnpm build:web` | Lighthouse against a **compressing** server (dev servers read ~20 points low) |
| Xcode export | — | `pnpm export:xcode` | self-verifying |

## Engine parity

Two engine implementations exist (TypeScript in `apps/desktop`, Swift in
`apps/macos`) and must stay behaviorally identical (ADR 0005). Any pipeline
change lands in **both** in the same commit, and both mock-driven
full-pipeline proofs must pass.

## Invariants

The six product invariants in `docs/ARCHITECTURE.md` are not style — tests pin
them. A PR that weakens one (a gate an agent can edit, an uncounted retry, a
faked skip, a stored credential) is wrong even if green.

## Commits

Conventional commits (`feat(desktop): …`). The body explains *why* and records
what was verified, not just what changed — read `git log` for the house style.
