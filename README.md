# Power

An autonomous engineering team that runs inside your own Claude Code session.

Describe a goal. Power runs the whole pipeline — research, spec, implementation,
review, tests, acceptance, documentation — dispatching eight specialist agents
through a state machine whose stage boundaries are enforced by gates that execute
as code. No API key, no service to deploy, no separate process to watch.

```
/power build "a rate-limited URL shortener with tests"
```

The prompts are an implementation detail. The pipeline is the product.

---

## Install

```bash
cd ~/Library/power
pnpm install          # the gates and the state machine are real code; they need deps
```

Then, once, in any Claude Code session:

```
/plugin marketplace add ~/Library/power
/plugin install power
```

`/power` is now available in every session.

## Using it

| Command | What it does |
|---|---|
| `/power build "<goal>"` | The full pipeline, from a sentence to working code |
| `/power continue` | Resume an interrupted run from `.power/run.json` |
| `/power review` | Reviewer + tester over an existing codebase; changes nothing |
| `/power status` | Where the current run is |

A run is interrupted by closing your laptop, not ruined by it. State lives in
`.power/run.json` in the repository, so `/power continue` picks up in a new
session, on a different day.

## What makes the output trustworthy

Three properties, in order of how much they matter.

**Gates are code, not questions.** Every stage boundary is crossed by passing a
validator that runs in your session over the bytes on disk — `scripts/gate.mjs`,
backed by JSON Schema plus cross-field rules. Nothing asks an agent whether its
own work was good enough. An agent cannot talk its way past a gate, and it cannot
edit one, because the gate is not in its context.

**Retries are bounded and counted.** Each of the three feedback edges is capped at
two attempts. On the third the run enters `blocked` and explains itself instead of
trying again. Unbounded retry is the most expensive failure in an autonomous
system: it burns money while looking like progress.

**One human gate, placed by cost of being wrong.** You approve the spec — once.
Research being wrong is cheap to redo; a built system being wrong is not. The
state machine refuses to accept an approval for a spec that has not passed its
gate, so approval stays a judgement about content and never a way around a
structural defect.

## The team

| Agent | Model | Tools | Job |
|---|---|---|---|
| `power:orchestrator` | opus | files, gate + state scripts, `Agent(…)` | Plans, routes, owns the state machine |
| `power:researcher` | sonnet | files, web | Resolves the brief's unknowns; every claim sourced |
| `power:architect` | opus | files, web, gate | Spec with EARS criteria, data model, interfaces |
| `power:implementer` | opus / **xhigh** | full toolset | Builds it, verifies its own work |
| `power:reviewer` | opus | **read + write only** | Coverage-first review with confidence and severity |
| `power:tester` | opus | full toolset | Real tests, real output |
| `power:verifier` | opus | no `Edit` | Fresh-context acceptance, by real interaction |
| `power:documenter` | sonnet | full toolset | README, ADRs, interface docs |

Role boundaries are tool grants, not instructions. The orchestrator has no
general `Bash` — only two narrowly scoped grants for the gate and state scripts —
so "you conduct, you don't perform" is structural. The reviewer and verifier have
no `Edit`, so neither can fix what it is judging. `prompts.test.ts` and
`build.test.ts` assert these in both profiles; a widened grant fails CI.

## How it is built

```
.claude-plugin/     plugin.json + marketplace.json
agents/             GENERATED — the eight subagents
skills/power/
  SKILL.md          the /power front desk
  jobs/*.md         build, continue, review recipes
  reference/        GENERATED — deep material, read on demand
scripts/            gate.mjs, run-state.mjs — thin launchers
packages/
  agents            prompt sources, interpolation engine, plugin compiler
  gates             JSON schemas + deterministic validators
  core              state machine, artifact bus, goal compiler, run-state CLI
  knowledge         capability packs
apps/orchestrator   the hosted path — dormant, see below
```

**`agents/` and `skills/power/reference/` are generated. Never edit them.** Edit
the prompts in `packages/agents/prompts/` and run `pnpm build:plugin`. CI rebuilds
and diffs, so a prompt edit that was never compiled fails the build rather than
shipping stale text.

### The slim body and its reference files

Each prompt is 40–72KB. Loading all of that on every dispatch is waste, so the
compiler splits each one: the durable role stays inline, and the rest becomes
reference files the agent reads when it needs them.

The risk in any progressive-disclosure design is material going missing quietly.
Two things prevent it here:

- **The pointer table is generated from the split**, never hand-written. A block
  cannot leave the agent body without its pointer appearing in the same pass.
  `verifyPointers` re-derives the relationship from the emitted bytes and runs
  before anything is written.
- **Shared sections are always inline**, enforced in code rather than by eight
  hand-maintained lists. `untrusted_input` is why: it is the prompt-injection
  defence, and every agent reads artifacts other agents wrote. Making that
  defence a file to fetch on demand would invert it — the injected content would
  be in context while the rule about distrusting it was still on disk.

### Two build profiles, one registry

The same prompts compile for two targets. `variables.cma.yaml` describes a
Managed Agents container; `variables.plugin.yaml` describes your repository. The
loader requires both profiles to declare identical keys, so a prompt cannot
render cleanly under one and break the other.

```bash
pnpm --filter @power/agents exec tsx src/cli.ts validate --profile plugin
pnpm build:plugin
```

## The gate layer

Three stages are gated. Review and test are deliberately absent rather than
stubbed — a stage listed but unimplemented would pass silently, which is the
exact failure this layer exists to prevent.

| Stage | Checks |
|---|---|
| `research` | Schema; every cited `source_url` appears in `sources[]`; a resolved unknown carries a source |
| `spec` | Frontmatter schema; all 12 sections present; **one EARS criterion per requirement**; two-way traceability; every task cites a real `R#` |
| `verification` | Schema; `pass: true` requires every P0 criterion verified *by interaction* and a visual score ≥ 3.5 |

Two of these fix real bugs in the reference harness this design came from:

- Its EARS check counts criteria **in aggregate** — three under `R1` with `R2`
  and `R3` bare would satisfy it. Ours attributes each criterion to the
  requirement block it appears in.
- Its section check is a substring test over the whole document, so "Goals" is
  satisfied by "Non-Goals". Ours matches the normalised whole heading.

Run one by hand:

```bash
node scripts/gate.mjs research packages/gates/test/fixtures/golden   # exit 0
node scripts/gate.mjs research packages/gates/test/fixtures/broken   # exit 1
```

## Known limitations

Stated plainly, because a system that claims more than it enforces is the thing
this design exists to avoid.

- **Single-writer artifact ownership is prompt-enforced in the plugin, not
  structural.** `assertCanWrite` in `packages/core` enforces it whenever writes go
  through the artifact store, which is how the hosted path works. In a Claude Code
  session agents hold the `Write` tool directly, so the rule rests on each
  agent's hard `never_do` rules. A `PreToolUse` hook could close this.
- **The reviewer cannot run the test suite** — it has no `Bash`, by design. Its
  report records that as an explicit limit rather than implying coverage it does
  not have.
- **The verifier has `Bash` in the plugin profile but not under Managed Agents.**
  Claude Code has no browser tool, so without it the verifier could not exercise
  anything — and the verification gate rejects a report whose
  `verified_by_interaction` is false. It still has no `Edit`, which is the
  boundary that matters.
- **The end-to-end pipeline is newly wired.** Components are covered by 276 tests
  and the gates are exercised in both directions, but a full `/power build` run is
  the least-tested path in the repository.

## Authoring agents

An agent is a YAML definition plus a Markdown template. Definitions support
`extends` overlays: objects merge key-wise, arrays replace wholesale.

```yaml
extends: _base
name: power_researcher
description: Resolves the brief's unknowns with sourced evidence.
template: researcher.md
plugin:
  name: researcher
  model: sonnet
  tools: [Read, Glob, Grep, Write, WebSearch, WebFetch]
  core_blocks: [identity, workflow, research_json_schema, never_do, critical_rules]
```

Templates use three interpolation layers with deliberately distinct syntax:

| Syntax | When | Source |
|---|---|---|
| `{{name}}` | build time | `variables.<profile>.yaml` |
| `{name}` | build time | a section in `sections.yaml`, or a declared runtime placeholder |
| `{% if name == "x" %}…{% endif %}` | build time | evaluated against the variables |

**Everything resolves at render time, and anything left over is a build
failure.** A missing template, a dead section reference, an unknown model id, an
orphan section, an `extends` cycle, a duplicate name, a core block that does not
exist — each fails the build.

This is a deliberate correction. The reference prompt repository warns and ships
anyway, which is how nine registered prompts pointing at deleted files and an
unsubstituted `{{test-lakshya}}` all reached production.

## Testing

```bash
pnpm check       # typecheck + both profiles validate + 276 tests
```

The gate suite asserts in both directions: golden fixtures pass, and the
deliberately broken ones fail **with the specific expected rule**, not merely
fail. CI enforces that, plus that the generated plugin tree is reproducible.

## The hosted path, dormant

`packages/core/client.ts` and `apps/orchestrator/` implement Power as a control
plane over Anthropic Managed Agents — BYOK, cloud sandboxes, webhook-driven
continuity. It typechecks and its tests pass, and nothing in `/power` calls it.

It is kept because the plugin and the hosted product want the same registry,
the same gates, and the same state machine; only the delivery differs. It has
never been run against a live API key.

## Relationship to the master prompts repository

`packages/agents` is the source of truth so prompts stay versioned and
CI-validated alongside the code that depends on them. Improvements are
contributed back to the master `prompts` repository periodically, and discoveries
about prompt authoring itself go into its `Guideline.md`.
