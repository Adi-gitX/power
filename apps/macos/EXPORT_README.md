# Power — standalone Xcode project

Open `Power.xcodeproj` in **Xcode 16+** and press **Run**. This folder is
self-contained: no Power repo, no node_modules, no pnpm.

## What is in here

| Path | What it is |
|---|---|
| `Power/` | The app — five Swift files, no dependencies. Add files here; the target picks them up automatically (synchronized folder). |
| `runtime/` | The product's brain, bundled: dependency-free CLI bundles for the state machine, the gates, and the knowledge selector; the eight `agents/*.md` prompts; gate schemas; test fixtures + the mock agent. Copied into the app bundle on every build (folder reference), resolved via `Bundle.main`. |

## Requirements on the machine

- `node` (homebrew) — the runtime CLIs run on it
- the `claude` CLI, signed in (`npm i -g @anthropic-ai/claude-code`) — the app
  signs you in via its own OAuth if not
- **App Sandbox stays OFF** (no entitlements): the engine's job is spawning
  `node` and `claude`; a sandboxed process cannot

## Try it without spending a token

Edit the scheme (Product → Scheme → Edit Scheme → Run → Arguments) and add the
environment variable `POWER_MOCK_AGENTS=1`. Runs then use fixture-writing mock
agents against the REAL state machine and REAL gates — the full pipeline,
approval included, at zero cost.

## The invariants (do not lose these when you build on it)

- Gates run as code over the files on disk; a failing gate is never edited
  around. Retries carry the gate's exact rule violations, are counted by the
  reducer, cap at 2, then the run blocks.
- Exactly one human approval; the reducer refuses it before the spec gate has
  passed. Auto-approve skips only the pause.
- Skipped stages are recorded as `skipped`, never faked as passed. Verify and
  the gates have no off switch.
- Stop terminates the active dispatch.

## Relationship to the Power repo

This is an export (snapshot) of `~/Library/power/apps/macos` plus a bundled
runtime built from that repo's compiled packages. The repo remains canonical
for the gates/state machine/prompts; to refresh `runtime/` after upstream
changes, rebuild the repo (`pnpm typecheck`) and re-run the export.
