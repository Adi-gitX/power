# Job: continue — resume an interrupted run

A run's state lives in `.power/run.json`, not in a session's memory. That is what
makes this possible: the session that started the run is gone, and it does not
matter.

`GATE` and `STATE` are as defined in [build.md](build.md).

## 1. Find out where the run actually is

```
STATE show
```

Do not trust it alone. A run is interrupted at an arbitrary moment, and the state
file records the last transition that *completed* — work may have finished
without being recorded. Reconcile before acting:

- `ls .power/artifacts/` — which artifacts exist.
- For each artifact the current phase should have produced, run its gate. An
  artifact that exists and passes is done, whatever the phase says.
- `git status` and `git log --oneline -10` — did an implementer get partway
  through, and is there uncommitted work?

Where the state file and the artifacts disagree, **the artifacts are what
happened**. The state file is a record of the run; the files are the run.

## 2. Report before resuming

Tell the user, in a few lines: which phase the run stopped in, what exists on
disk, what you believe was in flight, and where you intend to pick up. Then
continue without waiting — unless the reconciliation turned up something they
need to decide about, which is the next section.

## 3. Resume

Re-enter [build.md](build.md) at the step matching the phase:

| Phase | Resume at |
|---|---|
| `intake` | step 4, research |
| `research` | step 4 — re-dispatch the researcher, then gate |
| `research_review` | step 5, spec |
| `spec` | step 5 — re-dispatch the architect, then gate |
| `spec_approval` | step 6, the human gate |
| `build` | step 7 — but read the reconciliation first |
| `verify` | step 9, verification |
| `done` | nothing to resume; report and stop |
| `blocked` | the section below |

**Resuming a `build` phase needs care.** An implementer interrupted mid-task
leaves the tree in a state no artifact describes. Read the diff before
dispatching anyone: `git diff` and `git status`. Then dispatch the implementer
with what is already done and what remains, explicitly. Sending it the original
task list unchanged makes it redo finished work and, worse, second-guess code it
wrote itself.

Do not re-run a phase whose artifact already exists and passes its gate. Research
that passed does not improve by being run again; it just costs the user money and
produces different citations.

## 4. A blocked run

`blocked` means a retry budget ran out — the same stage failed three times. It
does not resume on its own, and it should not.

Report the `blocked_reason` verbatim, then what the gate said, then the narrowest
change that would let it through. Ask the user what they want to do.

Once they have actually changed something:

```
STATE apply '{"type":"unblock","note":"<what changed>"}'
```

The run returns to the phase that blocked it, with its retry counters intact —
so it gets one more attempt, not a fresh budget. That is deliberate. If the same
stage fails again, the problem is the goal or the code, not the number of tries.

## 5. A run that should not continue

Sometimes the honest answer is that the run is not worth resuming: the goal
changed, the repository moved on, the spec is stale.

Say so plainly, and say why. Deleting `.power/` and starting fresh is a
legitimate outcome — offer it. Do not delete anything yourself.
