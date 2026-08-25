# Power for macOS — native (Xcode)

Open `Power.xcodeproj` in **Xcode 16 or newer** and press Run. No dependencies,
no packages — four Swift files.

This app is a peer of the Electron shell (`apps/desktop`), not a replacement.
Both drive the same machinery:

- state transitions through `packages/core/dist/cli.js`
- gates through `packages/gates/dist/cli.js`
- agent stages through your own `claude` CLI login, with `agents/<role>.md`
  appended as the system prompt

so the plugin, the Electron app, and this app stay one product with three
shells. Keep the repo built (`pnpm typecheck` at the repo root compiles the
CLIs this app calls).

## Layout

| File | What it is |
|---|---|
| `Power/PowerApp.swift` | App entry; hidden-titlebar window |
| `Power/Theme.swift` | The Power palette (same values as the other shells) |
| `Power/Models.swift` | Run options, stages, history store, path/auth plumbing |
| `Power/Engine.swift` | The orchestrator — a faithful port of `apps/desktop/src/main/engine/runner.ts` |
| `Power/ContentView.swift` | Sidebar, home + options chips, run timeline, approval, connect screen |

## The invariants (do not lose these when you build on it)

- A failing gate is never edited around; retries carry the gate's exact rule
  violations and are counted by the reducer (cap 2, then the run blocks).
- Exactly one human approval; the reducer refuses it before the spec gate has
  passed. Auto-approve skips only the pause.
- Skipped stages are recorded as `skipped`, never faked as passed. Verify and
  the gates have no off switch.
- **The app sandbox must stay OFF** (no entitlements): the engine's job is
  spawning `node` and `claude`, which a sandboxed process cannot do.

## Headless engine proof

The engine runs without the UI. `POWER_MOCK_AGENTS=1` swaps the model for
fixture-writing mocks (same harness as the Electron engine tests), so the full
pipeline — real state machine, real gates — was executed headlessly in Swift
before this project was committed: a full run passes three gates to
`deployable yes`, and the cheapest run records `research=skipped` and never
pauses.

## Requirements

- The Power repo at `~/Library/power` (or `POWER_ROOT` env / `powerRoot` in
  `~/.power-desktop.json`), with `pnpm typecheck` run once
- `node` and the `claude` CLI on a homebrew-ish path; sign in happens in-app
