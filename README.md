# Power

An autonomous AI engineering organisation. You connect your Claude account,
describe a goal, and a coordinated team of specialist agents — researcher,
architect, implementer, reviewer, tester, verifier, documenter — works
continuously until the goal is met to a production standard.

The prompts are an implementation detail. The platform is the product.

---

## What this actually is

Power is a **control plane over Anthropic's Managed Agents**, not a new agent
runtime. Managed Agents already supplies the two hard parts — the agent loop and
a per-session cloud sandbox where tools execute — plus a coordinator/subagent
roster, persistent memory stores, rubric-graded outcome loops, cron deployments,
and credential vaults. Rebuilding that on Firecracker would reproduce it worse.

What Power adds is the part that is missing everywhere in the reference
material: **the orchestration layer, and the gates that make its output
trustworthy.**

| Vision requirement | How it is met |
|---|---|
| A team of specialised agents | A coordinator with a 7-agent roster, one context-isolated thread each, sharing the container filesystem |
| Loop until the goal is done | A generated, independently-gradeable rubric drives an iterate → grade → revise loop |
| Deterministic quality bar | `@power/gates` — schema, traceability, and cross-field checks that run as code |
| Shared memory across agents and runs | A per-run memory store as a typed artifact bus, one writer per artifact |
| Bring your own key | Every API call is made with the customer's key, in their workspace, on their rate limits |

## Architecture

```
apps/
  orchestrator      run driver: event stream, host-side gate execution, state machine
packages/
  agents            agent definitions, prompt sections, the interpolation engine
  gates             JSON schemas + deterministic validators
  core              Managed Agents client, artifact bus, run state machine, goal compiler
  knowledge         capability packs (reserved)
```

### The agent roster

| Agent | Model | Tools | Job |
|---|---|---|---|
| `power_orchestrator` | opus-5 / high | files, `run_gate` — **no capability tools** | Plans, routes, owns the state machine and the human gate |
| `power_researcher` | sonnet-5 / medium | web search + fetch | Resolves the brief's unknowns; every claim sourced |
| `power_architect` | opus-5 / high | files, web search | Spec with EARS criteria, data model, interfaces |
| `power_implementer` | opus-5 / **xhigh** | full toolset | Builds it, verifies its own work |
| `power_reviewer` | opus-5 / high | read-only | Coverage-first review with confidence + severity |
| `power_tester` | opus-5 / high | full toolset | Real tests, real output |
| `power_verifier` | opus-5 / high | look and click, **no edit** | Fresh-context acceptance + visual score |
| `power_documenter` | sonnet-5 / medium | files, bash | README, ADRs, interface docs |

The coordinator has no web search, no bash, and no editor. "You conduct, you
don't perform" is enforced by the toolset rather than by an instruction the
model might drift from. The same logic gives the reviewer and verifier no write
access to what they judge.

### Three ideas that carry the design

**Files are the handoff.** Agents never pass conversation. Each writes typed
artifacts to a shared memory store, and exactly one agent may write each one —
enforced in `assertCanWrite`, not merely requested in a prompt. That is what
makes every stage independently re-runnable and a crashed run resumable.

**Gates are code.** Every stage boundary is crossed by passing a validator, not
by an agent asserting it is done. Deterministic checks run first because they are
cheap and exact; the model-graded rubric handles only what code cannot check.
Gates execute in the orchestrator process — a gate the agent could edit is not a
gate.

**Retries are bounded and counted.** Each of the three feedback edges is capped
at two attempts. On the third the run enters `blocked` and asks a human.
Unbounded retry is the most expensive failure mode in an autonomous system: it
burns budget while looking like progress.

## Quick start

```bash
pnpm install
pnpm check                 # typecheck + registry validation + tests

export ANTHROPIC_API_KEY=sk-ant-...
pnpm --filter @power/orchestrator run sync         # push the registry to your workspace
pnpm --filter @power/orchestrator run run "Build a changelog digest service"
```

Inspect what an agent will actually be sent:

```bash
cd packages/agents
pnpm exec tsx src/cli.ts list
pnpm exec tsx src/cli.ts render power_orchestrator
```

Run a gate against artifacts on disk:

```bash
cd packages/gates
pnpm exec tsx src/cli.ts spec test/fixtures/golden    # passes
pnpm exec tsx src/cli.ts spec test/fixtures/broken    # fails, exit 1
```

## Authoring agents

An agent is a YAML definition plus a Markdown template. Definitions support
`extends` overlays: objects merge key-wise, arrays replace wholesale (matching
Managed Agents' own update semantics).

```yaml
extends: _base
name: power_researcher
description: Resolves the brief's unknowns with sourced evidence.
template: researcher.md
model:
  id: claude-sonnet-5
  effort: medium
```

Templates use three interpolation layers with deliberately distinct syntax, so
the two lifecycles are never ambiguous:

| Syntax | When | Source |
|---|---|---|
| `{{name}}` | build time | `variables.yaml` |
| `{name}` | build time | a section in `sections.yaml`, or a declared runtime placeholder |
| `{% if name == "x" %}…{% endif %}` | build time | evaluated against the variables |

**Everything resolves at render time, and anything left over is a build
failure.** A missing template file, a dead section reference, an unknown model
id, an orphan section, an `extends` cycle, a duplicate agent name, a roster
entry pointing at an agent that does not exist — each fails the build.

This is a deliberate correction. The reference prompt repository warns and ships
anyway, which is how nine registered prompts pointing at deleted files, seven
orphan files, and an unsubstituted `{{test-lakshya}}` all survived in
production. Braces inside code fences and backticks are ignored by the
unresolved check, so JSON and shell samples in prompts are safe.

## The gate layer

Three stages are gated. Review and test are deliberately absent rather than
stubbed — a stage listed but unimplemented would pass silently, which is the
exact failure this layer exists to prevent.

| Stage | Checks |
|---|---|
| `research` | Schema; every cited `source_url` appears in `sources[]`; a resolved unknown carries a source |
| `spec` | Frontmatter schema; all 12 sections present; **one EARS criterion per requirement**; two-way traceability; every task cites a real `R#` |
| `verification` | Schema; `pass: true` requires every P0 criterion verified *by interaction* and a visual score ≥ 3.5 |

Two of these fix real bugs in the reference harness:

- Its EARS check counts criteria **in aggregate** — three under `R1` with `R2`
  and `R3` bare would satisfy it. Ours attributes each criterion to the
  requirement block it appears in.
- Its section check is a substring test on the whole document, so "Goals" is
  satisfied by "Non-Goals" and by any sentence mentioning the word. Ours matches
  the normalised whole heading.

## Deployment guardrail

Deploying requires all three of:

1. a human approved the spec,
2. the implementer's own checks are green, and
3. `verification.json` passed its gate.

A green build is not a pass. `canDeploy` returns every unmet condition at once,
so an operator sees the whole picture rather than fixing one and rediscovering
the next.

## Security posture

- **BYOK.** The customer's key is the only credential we hold at rest, envelope
  encrypted. Sessions run in their workspace at their cost.
- **Secrets never enter the sandbox.** GitHub tokens are injected by Anthropic's
  git proxy; MCP and API credentials live in vaults and are substituted at
  egress. Code in the container cannot read them, even under prompt injection.
- **Untrusted input is data, not instruction.** Every agent carries a section
  stating that fetched pages, repository files, and tool output are material to
  summarize and never commands to obey.

## Testing

```bash
pnpm check       # typecheck + registry/pack validation + 176 tests
```

The gate suite asserts in both directions: golden fixtures must pass, and the
deliberately broken fixtures must fail **with the specific expected rule**, not
merely fail. CI enforces the same property.

## Relationship to the master prompts repository

`packages/agents` is the source of truth so prompts stay versioned and
CI-validated alongside the code that depends on them. Improvements are
contributed back to the master `prompts` repository periodically, and discoveries
about prompt authoring itself go into its `Guideline.md`.

## Status

Milestone M0 and part of M1 are implemented: the registry, the interpolation
engine, the gate layer, the artifact bus, the run state machine, the goal
compiler, the Managed Agents client, and the run driver. Still ahead: webhook-
driven continuity, scheduled deployments, the product surface, and key
management hardening.
