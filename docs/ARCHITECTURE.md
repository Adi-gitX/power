# Power — architecture

One product: an autonomous engineering team whose stage boundaries are decided
by code, running on the customer's own Claude login. One brain, four shells.

```
                    ┌──────────────────────────────────────────────┐
                    │                 THE BRAIN                    │
                    │                packages/                     │
                    │                                              │
                    │  agents/     8 prompts + registry + compiler │
                    │  gates/      schemas + deterministic checks  │
                    │  core/       state machine · goal compiler   │
                    │  knowledge/  126 capability packs + selector │
                    └───────┬──────────┬──────────┬──────────┬─────┘
                            │          │          │          │
                 ┌──────────┴───┐ ┌────┴─────┐ ┌──┴───────┐ ┌┴──────────┐
                 │ Claude Code  │ │ Electron │ │  Xcode   │ │  Website  │
                 │ plugin       │ │ app      │ │  app     │ │           │
                 │ /power       │ │ apps/    │ │ apps/    │ │ apps/web  │
                 │ agents/ +    │ │ desktop  │ │ macos    │ │           │
                 │ skills/      │ │          │ │          │ │           │
                 └──────────────┘ └──────────┘ └──────────┘ └───────────┘
```

Every shell is a **client of the brain**, never a fork of it. The Electron and
Swift engines are ports of the same pipeline; the plugin is the same pipeline
as a recipe an orchestrating model follows.

## The invariants (the product, stated as rules)

1. **Gates are code.** Stage boundaries are decided by validators running over
   the files on disk (`packages/gates`). An agent cannot see, edit, or argue
   with a gate.
2. **Retries fix, never redo — and they are counted.** A failed gate re-briefs
   the producing agent with the exact rule violations. The reducer counts every
   edge, caps at 2, then the run **blocks** and explains itself.
3. **Exactly one human approval** (the spec), and the reducer refuses it before
   the spec gate has passed. Auto-approve skips only the pause.
4. **Skips are honest.** A skipped stage is recorded `skipped`, never faked as
   passed. Verify and the gates have no off switch.
5. **No credential custody.** Everything rides the customer's own `claude` CLI
   login (the VSCode-extension pattern). No API key exists anywhere in the
   product.
6. **Cost is visible and bounded.** Per-role models, tier multipliers, turn
   caps, per-stage cost surfaced from stream-json, Stop kills the active
   dispatch.

## The runtime ABI — paths that must not move

Three shipped shells resolve these paths at runtime. Moving them is a breaking
change across every installed copy; treat them like a public API.

| Path | Consumed by |
|---|---|
| `agents/*.md` (generated) | plugin dispatch, both app engines (system prompts) |
| `skills/power/**` (SKILL + jobs generated reference) | Claude Code plugin |
| `scripts/gate.mjs`, `scripts/run-state.mjs` | plugin (`SKILL.md` allowed-tools) |
| `packages/{core,gates,knowledge}/dist/cli.js` | both app engines |
| `packages/gates/schemas/`, `packages/gates/test/fixtures/` | gates CLI, mock harness |
| `.claude-plugin/{plugin,marketplace}.json` | plugin install |
| `apps/desktop/test/mock-agent.mjs` | both engines' mock mode |

`agents/` and `skills/power/reference/` are **generated** from
`packages/agents` (`pnpm build:plugin`); CI rebuilds and diffs, so a stale
commit fails. Never hand-edit them.

## Language decisions (deliberate, not defaults)

- **TypeScript** for the brain and the Electron shell: the gate layer is JSON
  Schema + text processing, the ecosystem is npm, and one language across
  registry/gates/state/tooling keeps the test suite unified (300 tests, one
  runner).
- **Swift/SwiftUI** for the native shell: the only honest way to be a real Mac
  app. The engine is a line-for-line port, kept faithful by the shared mock
  harness (`POWER_MOCK_AGENTS`) and the shared CLIs.
- **Markdown/YAML** for prompts and packs: prompts are versioned artifacts with
  a compiler, not string literals in code.
- **No Rust/Go rewrite** is planned: nothing here is CPU-bound; every hard
  problem is correctness and cost discipline, which tests and gates address.

## Run data model

Per repository the product works in:

```
<repo>/.power/
  run.json           the state machine's persisted state (survives sessions)
  artifacts/         the typed artifact bus — brief.json, research.json,
                     SPEC.md, review.json, test-report.json, verification.json
```

One writer per artifact. The state file records phase, gate results
(`pass|fail|skipped`), retry counters, and the three deploy conditions.

## Where things run

- **Agent stages**: headless `claude -p`, per-role model + turn caps,
  stream-json parsed for text + cost.
- **Gates/state**: `node` running the compiled CLIs — inside the repo for dev,
  bundled dependency-free (esbuild) for exported/standalone builds
  (`tools/export-xcode.mjs`).
- **The dormant hosted path** (`apps/orchestrator`, `packages/core/client.ts`)
  targets Anthropic Managed Agents. Kept tested; nothing ships it. It exists so
  a managed offering later shares this exact brain.

## Scaling notes

- New shell → new `apps/*` client of the CLIs; never re-implement a gate.
- New agent → `packages/agents/registry` + prompt; the compiler, drift tests,
  and skill-grant sync tests enforce the wiring.
- New capability → a knowledge pack (`packages/knowledge/packs`), not prompt
  edits.
- Decisions with consequences get an ADR in `docs/adr/`.
