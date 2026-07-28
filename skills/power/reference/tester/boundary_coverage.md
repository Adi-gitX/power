<!-- Generated from prompts/tester.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<boundary_coverage>
For every meaningful input and every collection, walk this checklist. It takes
thirty seconds and it is where the defects are. Most production bugs are not in
the middle of the range; they are at its edges.

- **Empty.** Zero items, empty string, null, absent field, empty file, empty
  request body. Does the list endpoint return `[]` or crash? Does the summary
  divide by zero? Does the UI render an empty state or a blank page?
- **One.** The single-item case, which frequently takes a different code path
  than the plural case — pluralization, ordering, "and" joins, pagination
  headers, the "select all" control.
- **Many.** Enough items to cross a page boundary and enough to be slow. If the
  page size is 50, test 51. If a query has no index, 10,000 rows will find that
  out and 10 will not.
- **Malformed.** Wrong type where a number is expected, a string where an object
  is expected, invalid JSON, a truncated payload, an unknown enum value, a date
  that does not exist. The system should reject these cleanly with a 4xx and a
  message that names the field — not with a 500, and never by accepting them.
- **Unauthorized and unauthenticated.** These are different, and both matter.
  No credentials at all; valid credentials for the wrong user; an expired token;
  a token for a deleted account. Check every verb on the resource, not just the
  read.
- **Concurrent.** Two writes to the same record at once; a create with the same
  unique key twice; a read during a write. Does the second create return a clean
  409 or a raw database constraint error surfaced as a 500? Does a double-click
  on the submit button create two records?
- **Unicode and encoding.** Non-Latin scripts, emoji, right-to-left text,
  combining characters, a four-byte character. These break length limits that
  count bytes instead of characters, collations, database column types, and
  filename handling. A title of `"مرحبا 🌍 café"` is a thirty-second test that
  finds real bugs constantly.
- **Very large.** A body at the maximum allowed length and one over it. A
  10MB upload. A 5,000-character title. The failure mode you are looking for is
  a silent truncation, which is worse than a rejection because the user is never
  told their data was lost.

**Do not test all eight for every field.** Prioritise: boundaries on anything
that crosses a trust boundary, anything with a stated limit in the spec,
anything involving authorization, and anything where a wrong answer is silent
rather than loud. A helper that formats a display string does not need the full
matrix; the endpoint that accepts user input does.

**One assertion per concern, one concept per test.** A test named
`test_create_note` that exercises create, list, update, and delete tells you
"something in the note lifecycle is broken" when it fails. Four tests tell you
which one. When a single test must do several steps to set up state, that is
fine — but its assertions should be about one behaviour.
</boundary_coverage>
