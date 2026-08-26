# Power

An autonomous engineering team whose stage boundaries are decided by code,
running on your own Claude login. Describe a goal; eight specialists run
research → spec → **your approval** → implement → review → test → verify →
document, with deterministic gates between stages, counted retries, and cost
you can see and cap.

One brain, four shells — full map in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

| Surface | Where | Try it |
|---|---|---|
| Claude Code plugin | `agents/` + `skills/` (generated from `packages/agents`) | `/plugin marketplace add <repo>` → `/plugin install power` → `/power build "…"` |
| Mac app (Electron) | `apps/desktop` | `pnpm dev:desktop` · package: `pnpm package:desktop` |
| Mac app (native Swift) | `apps/macos` | open `Power.xcodeproj` · standalone export: `pnpm export:xcode` |
| Website | `apps/web` | `pnpm dev:web` · static export: `pnpm build:web` |

## Quick start

```bash
pnpm install
pnpm check        # typecheck (builds the CLIs) + registry validation + 300 tests
```

Run a full pipeline **without spending a token**: set `POWER_MOCK_AGENTS=1` for
either app — mock agents write real artifacts, and the real gates judge them.

## What makes the output trustworthy

1. **Gates are code** (`packages/gates`) — schema + cross-field rules over the
   files on disk. An agent cannot see, edit, or argue with a gate.
2. **Retries fix, never redo**, are counted, cap at 2, then the run **blocks
   and explains itself**.
3. **One human approval** (the spec); the state machine refuses it before the
   spec gate has passed.
4. **Honest skips** — run options can turn stages off, and the record says
   `skipped`, never `pass`. Verify has no off switch.
5. **No credential custody** — everything rides your `claude` CLI OAuth login.
6. **Visible, bounded cost** — per-role models, Eco/Balanced/Max tiers, turn
   caps, per-stage $ from stream-json, a Stop that kills the active dispatch.

## Repository map

```
docs/            architecture + ADRs — read ARCHITECTURE.md before moving anything
packages/        the brain: agents (prompts+compiler) · gates · core · knowledge
apps/            the shells: desktop (Electron) · macos (Xcode) · web · orchestrator (dormant hosted path)
agents/ skills/  GENERATED plugin surface — edit packages/agents, run pnpm build:plugin
scripts/         plugin runtime wrappers (part of the runtime ABI)
tools/           repo tooling (export-xcode.mjs)
```

Contributor guide: [CONTRIBUTING.md](CONTRIBUTING.md). Decisions with
consequences: [docs/adr/](docs/adr/). License: proprietary, see
[LICENSE](LICENSE).

## Status, honestly

The chassis is proven (300 tests; gates verified in both directions; both app
engines run the full pipeline headlessly against real gates; research + spec
stages proven against real models with all citations verified live). The full
loop end-to-end against real models is the remaining validation, by design the
next step — see the roadmap in the ADRs and `docs/ARCHITECTURE.md`.
