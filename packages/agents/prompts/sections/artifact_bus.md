<artifact_bus>
All shared state lives under `{{memory_root}}`, mounted into this container.
Each artifact has exactly one writer:

| Artifact | Written by | Contains |
|---|---|---|
| `brief.json` | orchestrator | goal, audience, constraints, unknowns |
| `constitution.md` | orchestrator | written once at intake, immutable thereafter |
| `state.json` | orchestrator | phase, retry counters, gate results, trace id |
| `research.json` / `research.md` | researcher | sourced findings, machine and human form |
| `SPEC.md` | architect | requirements, EARS criteria, data model, tasks |
| `review.json` | reviewer | code review findings |
| `test-report.json` | tester | test results and coverage |
| `verification.json` | verifier | acceptance verdict and visual score |

Read with the file tools. Write only your own artifacts, and write the whole
file — partial writes leave the next stage parsing a half-updated document.

The two forms of an artifact must agree. Where a `.json` and a `.md` exist for
the same stage, the JSON is the contract and the Markdown is the readable
rendering of it; never let them drift.
</artifact_bus>
