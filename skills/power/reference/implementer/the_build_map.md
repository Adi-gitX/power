<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<the_build_map>
The build map is your working memory made durable. Write it after Phase 1 and
update it after every slice. Keep it at
`./.power/build-map.json`.

```json
{
  "trace_id": "run-4f2a",
  "spec_read_at": "2026-02-11T09:14:00Z",
  "requirements": [
    {
      "id": "R1",
      "summary": "A signed-in user can create a note with a title and a body",
      "criterion": "WHEN a signed-in user submits the note form with a non-empty title, THE SYSTEM SHALL persist the note and show it at the top of the note list",
      "priority": "P0",
      "tasks": ["T1", "T2", "T5"],
      "files": [
        "src/models/note.ts",
        "src/repositories/note-repository.ts",
        "src/routes/notes.ts",
        "src/ui/note-form.tsx"
      ],
      "status": "done",
      "evidence": "POST /api/notes returned 201 with the created id; GET /api/notes returned the note first in the list; unit tests in test/note-repository.test.ts pass (7/7)"
    },
    {
      "id": "R4",
      "summary": "Notes are searchable by title substring",
      "criterion": "WHEN a user types at least two characters into the search field, THE SYSTEM SHALL show only notes whose title contains that substring, case-insensitively",
      "priority": "P1",
      "tasks": ["T9"],
      "files": [],
      "status": "not_started",
      "evidence": null
    },
    {
      "id": "R6",
      "summary": "Attachments are stored in object storage",
      "priority": "P1",
      "tasks": ["T11"],
      "files": ["src/routes/attachments.ts"],
      "status": "blocked",
      "evidence": null,
      "blocker": "SPEC.md names no storage backend and no credential source. Route is written against an interface; no implementation bound."
    }
  ],
  "verification": {
    "build": { "command": "pnpm build", "result": "pass", "at": "2026-02-11T10:02:11Z" },
    "typecheck": { "command": "pnpm typecheck", "result": "pass", "at": "2026-02-11T10:02:44Z" },
    "lint": { "command": "pnpm lint", "result": "pass", "at": "2026-02-11T10:03:02Z" },
    "tests": { "command": "pnpm test", "result": "pass", "passed": 41, "failed": 0, "at": "2026-02-11T10:04:19Z" }
  },
  "open_questions": [
    "R6: which object storage backend, and where does the credential come from?"
  ]
}
```

`status` is one of `not_started`, `in_progress`, `done`, `blocked`. There is no
`mostly_done`. If it is not observably working, it is `in_progress`, and your
report says so.

`evidence` is what you observed, in enough detail that someone else could
reproduce it: the request you made and the response you got, the test file and
the count, the command and its exit state. `evidence: "implemented"` is not
evidence. If you cannot fill this field honestly, the status is not `done`.
</the_build_map>
