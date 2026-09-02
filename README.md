# Power

An autonomous engineering team whose **stage boundaries are decided by code**,
running on your own Claude login. Describe a goal; specialists run
research → spec → **approval** → implement → review → test → verify → document,
with deterministic gates between stages, counted retries, cost you can see and
cap, and a first-party router that sends cheap work to the providers you bring.

One brain, many shells. This README is the complete map — architecture, flow,
and every moving part, with diagrams.

---

## Table of contents

- [The idea in one picture](#the-idea-in-one-picture)
- [System architecture](#system-architecture)
- [The pipeline, end to end](#the-pipeline-end-to-end)
- [Anatomy of a dispatch](#anatomy-of-a-dispatch)
- [Gates: the part an agent cannot argue with](#gates-the-part-an-agent-cannot-argue-with)
- [Relay: Power's own inference router](#relay-powers-own-inference-router)
- [Provider routing & cost modes](#provider-routing--cost-modes)
- [The agent prompt system](#the-agent-prompt-system)
- [Speed: the express pipeline](#speed-the-express-pipeline)
- [Runtime & bundling](#runtime--bundling)
- [The surfaces](#the-surfaces)
- [Quick start](#quick-start)
- [Repository map](#repository-map)
- [What makes the output trustworthy](#what-makes-the-output-trustworthy)

---

## The idea in one picture

Power is a **control plane** wrapped around a fixed, gated agent workflow. The
model does the thinking; **code** decides when a stage is allowed to end. Every
artifact an agent writes is judged by a deterministic gate before the run moves
on, and nothing routes anywhere or spends anything you didn't choose.

```mermaid
flowchart LR
    you([You: a goal]) --> engine
    subgraph engine["Engine (the control plane)"]
        direction TB
        sm["state machine<br/>packages/core"]
        gate["gates (code)<br/>packages/gates"]
        route["routing + never-stops fallback"]
    end
    engine -->|"claude -p, agent = system prompt"| claude["claude CLI · your login"]
    engine -.->|routed, cheap stages| relay["Relay router :20199"]
    relay --> providers["providers you bring<br/>Groq · OpenRouter · DeepSeek · Ollama · …"]
    claude --> anthropic["Anthropic"]
    engine --> artifacts[(".power/artifacts<br/>brief, research, SPEC, verification")]
    gate -. judges .-> artifacts
```

Two invariants hold the whole thing together:

1. **Agents cannot see, edit, or argue with a gate.** Gates are pure functions
   over the files on disk (`packages/gates`), run by the engine, not the model.
2. **No credential custody.** Every dispatch rides your `claude` CLI OAuth login;
   Power holds no keys of its own. (Upstream provider keys you add for Relay live
   app-private on your machine, never in the repo.)

---

## System architecture

One TypeScript **brain** is compiled into a dependency-free runtime that every
shell resolves by identical relative paths (ADR 0004). A shell is just an engine
that drives that runtime and renders progress.

```mermaid
flowchart TB
    subgraph shells["Shells — one brain, many surfaces"]
        macos["macOS app · SwiftUI<br/>apps/macos"]
        desktop["Desktop · Electron<br/>apps/desktop"]
        plugin["Claude Code plugin<br/>agents/ + skills/"]
        web["Website<br/>apps/web"]
    end

    subgraph engine["Engine — per shell, one contract"]
        state["run state machine<br/>packages/core/dist/cli.js"]
        routing["provider routing<br/>+ never-stops fallback"]
        supervisor["stage supervisor<br/>dispatch · gate · retry"]
    end

    subgraph brain["The brain — bundled runtime"]
        prompts["8 agents<br/>agents/*.md + skills/reference/**"]
        gatespkg["deterministic gates<br/>packages/gates + schemas"]
        knowledge["capability packs<br/>packages/knowledge"]
    end

    relay["Relay router<br/>packages/relay · 127.0.0.1:20199"]
    claude["claude CLI (your login)"]
    upstreams["OpenAI-compatible providers"]

    macos --> engine
    desktop --> engine
    plugin --> engine
    web -. showcase .-> engine

    supervisor -->|"reads agent as system prompt"| claude
    supervisor --> gatespkg
    state --> supervisor
    routing --> relay
    routing --> claude
    relay --> upstreams
    relay -. "no upstream / error" .-> claude
    claude -. "reads on demand" .-> prompts
    prompts -. "implementer only" .-> knowledge
```

| Layer | Lives in | Job |
|---|---|---|
| **Shells** | `apps/macos`, `apps/desktop`, `agents/`+`skills/`, `apps/web` | Launch runs, render progress, own no logic the others don't |
| **Engine** | `apps/*/…/engine` (Swift & TS twins) | Drive the state machine, dispatch stages, run gates, route, fall back |
| **State machine** | `packages/core` | The only writer of the run state file; a reducer that refuses illegal transitions |
| **Gates** | `packages/gates` (+ `schemas/`) | Judge artifacts on disk; schema + cross-field rules; pass/fail with quoted violations |
| **Agents** | `packages/agents` → `agents/*.md` + `skills/` | The eight role prompts and their on-demand playbooks |
| **Knowledge** | `packages/knowledge` | Capability packs the implementer can pull in at build time |
| **Relay** | `packages/relay` | First-party Anthropic-compatible router to cheap providers |

---

## The pipeline, end to end

Every run walks the same stations. Gates sit at **research**, **spec**, and
**verification**; a human (or auto) approval sits after the spec; the
**never-stops** rule means a failed dispatch falls back to your Claude login
rather than dying. Simple goals take the **express** shortcut (see below).

```mermaid
flowchart TD
    goal([Goal]) --> init["init — compile the brief"]
    init --> exp{"auto tier<br/>and simple goal?"}

    exp -->|yes · EXPRESS| spec
    exp -->|no| research["research — researcher"]

    research --> rg{{research gate}}
    rg -->|fail · retry ≤ 2| research
    rg -->|pass| spec["spec — architect"]

    spec --> sg{{spec gate}}
    sg -->|fail · retry ≤ 2| spec
    sg -->|pass| appr{approval}

    appr -->|human ✓ or auto| impl["implement — implementer"]
    appr -->|rejected| spec

    impl --> rt{review + test?}
    rt -->|yes| review["review — reviewer"] --> test["test — tester"] --> verify
    rt -->|no · express| verify["verify — verifier"]

    verify --> vg{{verification gate}}
    vg -->|fail · retry ≤ 2| impl
    vg -->|pass| docs{docs?}

    docs -->|yes| document["document — documenter"] --> done([done ✓])
    docs -->|no| done

    rg -. retries spent .-> blocked([blocked — and explains itself])
    sg -. retries spent .-> blocked
    vg -. retries spent .-> blocked
```

- **Gates** (`{{ … }}`) are code. A stage cannot pass its gate by asserting it did.
- **Retries fix, never redo** — the retry brief quotes the *specific* rule
  violations (and now the offending value), caps at 2, then the run **blocks and
  explains itself** rather than looping or lying.
- **Honest skips** — run options can turn research, review/test, or docs off; the
  record says `skipped`, never `pass`. **Verify has no off switch.**

---

## Anatomy of a dispatch

Each stage is one `claude -p` process with the role's `agents/<role>.md` as its
system prompt. The engine chooses a provider first, runs the model, then judges
the result with a gate — and if the provider fails, it falls back to your Claude
login without stopping the run.

```mermaid
sequenceDiagram
    participant E as Engine
    participant P as chooseProvider
    participant C as claude + agent prompt
    participant R as Relay :20199
    participant U as Upstream provider
    participant A as Anthropic · your login
    participant G as Gate · code

    E->>P: role → cheapest provider trusted with it
    alt routed (Free / Mixed, role above the floor)
        E->>C: spawn · ANTHROPIC_BASE_URL = Relay
        C->>R: POST /v1/messages (Anthropic)
        R->>U: translated request (OpenAI)
        U-->>R: token stream
        R-->>C: Anthropic SSE
    else default (Paid, or a gate-graded role)
        E->>C: spawn (your login)
        C->>A: POST /v1/messages
        A-->>C: token stream
    end
    Note over C,R: dispatch fails? → fall back to Anthropic. The run never stops.
    C-->>E: writes artifacts to .power/artifacts
    E->>G: run the stage's gate over those files
    G-->>E: pass · or errors quoting the bad value + file:line
    E->>E: pass → next stage — fail → retry brief (≤ 2) — spent → block
```

---

## Gates: the part an agent cannot argue with

Gates (`packages/gates`) are the reason the output is trustworthy. They are pure
functions over the artifacts on disk — **JSON-schema validation plus cross-field
rules** — run by the engine, invisible and unwritable to the model.

```mermaid
flowchart LR
    art[(artifact on disk<br/>research.json · SPEC.md · verification.json)] --> schema{schema valid?}
    schema -->|no| err["errors: field · rule · detail<br/>— found &lt;the actual bad value&gt;"]
    schema -->|yes| cross{cross-field rules?}
    cross -->|no| err
    cross -->|yes| pass([pass])
    err --> retry["retry brief: fix ONLY these,<br/>quoting each violation"]
    retry -.->|attempt ≤ 3| art
    retry -.->|budget spent| block([block + explain])
```

- Three gated stages: **research**, **spec**, **verification** (schemas in
  `packages/gates/schemas/`).
- A schema failure now **quotes what the model actually wrote** (`— found "16"`),
  so a retry can converge instead of guessing at the same broken value.
- Golden **and** broken fixtures are asserted in both directions; the export step
  refuses to ship if a gate ever passes a broken fixture.

---

## Relay: Power's own inference router

Relay (`packages/relay`) is a small **first-party** HTTP server bundled inside
the runtime — no install, no third-party dependency. It speaks the Anthropic
Messages API in (what `claude` sends via `ANTHROPIC_BASE_URL`) and translates to
any OpenAI-compatible provider out, compressing on the way.

```mermaid
flowchart LR
    claude["claude -p<br/>ANTHROPIC_BASE_URL → Relay"] -->|Anthropic /v1/messages| box

    subgraph box["Relay · packages/relay · :20199"]
        direction TB
        compress["compress<br/>(off / safe / max)"] --> kind{provider.kind}
        kind -->|openai| xlate["translate<br/>Anthropic ⇄ OpenAI Chat"]
        kind -->|passthrough| fwd["forward as-is"]
    end

    xlate -->|Bearer key| oai["OpenAI-compatible upstream<br/>Groq · OpenRouter · DeepSeek · Together · Gemini · Ollama"]
    fwd --> anth["Anthropic-compatible upstream"]
    oai -->|SSE| rev["translate stream back → Anthropic SSE"] --> claude
    box -. "no upstream / upstream error → 503" .-> fb["engine falls back to Claude (never-stops)"]
```

- Endpoints: `POST /v1/messages` (streaming + non-streaming), `GET /health`,
  `GET /stats` (requests served, characters saved by compression).
- **Compression** trims only oversized `tool_result` output (re-derivable machine
  noise) — never user text, the system prompt, tools, or code.
- Because a bad routed stage returns non-2xx and the run falls back to Claude,
  **Relay is safe to ship even when imperfect.**
- Manage it in **Routing**: Start/Stop, compression, and bring-your-own upstream
  providers (name · base URL · key · model map). Keys stay app-private.

---

## Provider routing & cost modes

Routing lets you spend Claude only where it's worth it. Each provider declares a
**quality floor** — the roles it is trusted with — and the lowest-cost eligible
provider wins per role. Code-writing and gate-graded roles stay on your trusted
Claude login unless you widen the floor yourself.

```mermaid
flowchart TD
    mode{Cost mode} -->|Paid| paid["every role → Claude"]
    mode -->|Mixed| mixed["research + docs → Relay<br/>code & gate-graded → Claude"]
    mode -->|Free| free["every role → Relay<br/>(Claude only if Relay is down)"]

    subgraph choose["chooseProvider(role)"]
        pool["candidates = Claude default + configured providers"] --> floor{"role in provider's quality floor?"}
        floor -->|no| dropped["not eligible"]
        floor -->|yes| cost["lowest costWeight wins"]
    end
    mixed --> choose
    free --> choose
    cost --> env["set ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN<br/>on that one dispatch"]
```

- The redirect is just two environment variables Claude Code already reads —
  `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` — set per dispatch (ADR 0006).
- The safe default floor is research + docs (`safeCheapRoles`); a miss there is
  caught by a later gate or is low-stakes prose.
- Cost is **visible and bounded**: per-role models, Eco/Balanced/Max tiers, turn
  caps, per-stage `$` from stream-json, and a Stop that kills the active dispatch.

---

## The agent prompt system

The eight agent prompts are **compiled**, not hand-written. Source blocks in
`packages/agents/prompts/<role>.md` are split by the build into two kinds:
**core blocks** stay inline in `agents/<role>.md` (always in the system prompt),
and everything else becomes an **on-demand reference playbook** under
`skills/power/reference/<role>/` that the agent reads only when the moment
arrives — keeping the prompt lean without losing depth.

```mermaid
flowchart LR
    src["packages/agents/prompts/&lt;role&gt;.md<br/>top-level &lt;xml&gt; blocks"] --> build["pnpm build:plugin"]
    reg["registry/&lt;role&gt;.agent.yaml<br/>core_blocks · reference_hints"] --> build

    build -->|core_blocks| inline["agents/&lt;role&gt;.md<br/>INLINE — always sent"]
    build -->|other blocks| ref["skills/power/reference/&lt;role&gt;/*.md<br/>on-demand playbooks (~74)"]

    inline -->|--append-system-prompt| model["claude"]
    model -. "reads when the moment arrives" .-> ref

    resolve["engine resolves the plugin-root variable<br/>→ real runtime root"]
    resolve -. "makes the ref paths load in the app" .-> ref
```

- **`${CLAUDE_PLUGIN_ROOT}` is resolved by the engine.** The prompts reference
  their playbooks by that variable, which only Claude Code's plugin host sets.
  Since Power runs `claude` headless, both engines substitute it for the real
  runtime root at dispatch — otherwise the reference playbooks (an agent's real
  operating detail) never load in the app.
- **Playbooks borrowed from [gstack](https://github.com/garrytan/gstack)**, adapted
  to Power's autonomous model and shipped as inline core blocks:
  - architect · **product interrogation** — challenge the premise, find the
    narrowest wedge, weigh and record alternatives before speccing.
  - reviewer · **security audit** — "think like an attacker, report like a
    defender": input→sink, authz, secrets, SSRF, prompt injection, supply chain,
    each with a concrete exploit path + `file:line`.
  - implementer · **design conviction** — the anti-convergence rule: never ship
    the generic default; commit to one intentional, coherent direction.
- To change an agent, **edit the prompt, not the generated file**, then
  `pnpm --filter @power/agents build:plugin`. The build rewrites `agents/` and
  `skills/` and enforces that every reference file is pointed at exactly once.

---

## Speed: the express pipeline

A small prompt should not pay for a seven-stage pipeline — each stage is a
separate cold `claude` round-trip. So the default **auto** tier, faced with a
simple goal, runs **express**: spec → implement → verify, auto-approved. Three
model calls instead of seven, dropping the slowest stages, while **verify (the
deploy gate) always survives**. An explicit tier (Eco/Balanced/Max) is honored
verbatim, and a complex goal keeps the full pipeline even on auto.

```mermaid
flowchart LR
    g([goal]) --> t{"tier is auto<br/>and simple goal?"}
    t -->|yes| e["EXPRESS<br/>research off · review/test off · docs off · auto-approve"]
    t -->|no| f["full pipeline<br/>(as configured)"]
    e --> stages["spec → implement → verify"]
    f --> stagesF["research → spec → approval → implement → review → test → verify → document"]
```

---

## Runtime & bundling

The brain ships as a **dependency-free runtime** the app spawns with the `node`
already on the machine — no `node_modules`, no `pnpm` on the destination.

```mermaid
flowchart LR
    subgraph repo["repo (dev)"]
        pkgs["packages/*/dist/cli.js (tsc)"]
    end
    pkgs --> ex["tools/export-xcode.mjs<br/>esbuild single-file bundles"]
    ex --> rt["runtime/<br/>packages/{core,gates,knowledge,relay}/dist/cli.js<br/>+ agents/ + skills/ + scripts/ + packs + schemas"]
    rt --> app["exported app resolves it via PowerPaths.resolveRoot()<br/>and spawns: node packages/&lt;x&gt;/dist/cli.js"]
```

- CLIs (`core`, `gates`, `knowledge`, `relay`) are esbuilt into single files;
  `agents/`, `skills/`, `scripts/`, packs and schemas ride along so reference
  playbooks and the gate script resolve in the standalone app.
- The export is **self-verifying**: it runs the bundled CLIs (state init, a gate
  in both directions) from a temp dir and fails the export if a bundle is broken.

---

## The surfaces

| Surface | Where | Try it |
|---|---|---|
| Claude Code plugin | `agents/` + `skills/` (generated from `packages/agents`) | `/plugin marketplace add <repo>` → `/plugin install power` → `/power build "…"` |
| Mac app (native Swift) | `apps/macos` | open `Power.xcodeproj` · standalone export: `pnpm export:xcode` |
| Mac app (Electron) | `apps/desktop` | `pnpm dev:desktop` · package: `pnpm package:desktop` |
| Website | `apps/web` | `pnpm dev:web` · static export: `pnpm build:web` |

---

## Quick start

```bash
pnpm install
pnpm check        # typecheck (builds the CLIs) + registry validation + tests (346)
```

Run a full pipeline **without spending a token**: set `POWER_MOCK_AGENTS=1` for
either app — mock agents write real artifacts, and the real gates judge them.

```mermaid
flowchart LR
    mock["POWER_MOCK_AGENTS=1"] --> agents["mock agents write<br/>REAL artifacts"] --> gates["REAL gates judge them"] --> done["full pipeline, $0"]
```

---

## Repository map

```
docs/            architecture + ADRs — read ARCHITECTURE.md before moving anything
packages/        the brain:
  core/            run state machine + reducer (the only state writer)
  gates/           deterministic gates + JSON schemas
  agents/          agent prompt sources + compiler (build:plugin)
  knowledge/       capability packs + selector
  relay/           first-party Anthropic-compatible inference router
apps/            the shells: macos (Swift) · desktop (Electron) · web · orchestrator (dormant hosted path)
agents/ skills/  GENERATED plugin surface — edit packages/agents, run pnpm build:plugin
scripts/         plugin runtime wrappers (part of the runtime ABI)
tools/           repo tooling (export-xcode.mjs)
```

Contributor guide: [CONTRIBUTING.md](CONTRIBUTING.md). Deeper prose and decisions
with consequences: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/adr/](docs/adr/). License: proprietary, see [LICENSE](LICENSE).

---

## What makes the output trustworthy

1. **Gates are code** (`packages/gates`) — schema + cross-field rules over the
   files on disk. An agent cannot see, edit, or argue with a gate.
2. **Retries fix, never redo**, quote the exact violation, are counted, cap at 2,
   then the run **blocks and explains itself**.
3. **One approval** (the spec); the state machine refuses it before the spec gate
   has passed. Express auto-approves trivial goals; it can never loosen a gate.
4. **Honest skips** — options turn stages off and the record says `skipped`,
   never `pass`. Verify has no off switch.
5. **No credential custody** — every dispatch rides your `claude` CLI OAuth login.
6. **Visible, bounded cost** — per-role models, tiers, turn caps, per-stage `$`
   from stream-json, a Stop that kills the active dispatch, and a first-party
   router that sends cheap work to providers you bring.
