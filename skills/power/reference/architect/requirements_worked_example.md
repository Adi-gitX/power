<!-- Generated from prompts/architect.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<requirements_worked_example>
A requirement block has four parts: the id heading, one or two sentences of
context, the EARS criterion, and — where the generic default would be wrong —
the explicit edge cases. Here is the same requirement written badly and written
well.

**Bad.**

```markdown
### R2 — Handle the first release

The tool should handle the case where a repository has no previous tag. It
should be robust and handle errors gracefully. Users expect the first release to
work smoothly, so this is important. We should also make sure performance is
reasonable when there are many pull requests.

WHEN the user runs the tool, THE SYSTEM SHALL handle first releases correctly.
```

Everything wrong with it, in order of cost:

- The criterion is unverifiable. "Correctly" is exactly the word the criterion
  exists to replace. A verifier cannot click "correctly".
- "Robust" and "gracefully" are adjectives standing in for behaviour. What
  should the tool actually do — include everything, refuse, or ask?
- "Performance is reasonable when there are many pull requests" is a
  non-functional requirement in the wrong section with no number attached, so
  nobody will ever check it.
- "Users expect this to work smoothly, so this is important" is motivation. It
  consumes the reader's attention and constrains nothing.
- The block does not say what happens in the failure case, so the implementer
  will pick one: probably exit non-zero with a stack trace.

**Good.**

```markdown
### R2 — First release with no earlier tag

A repository may be tagged for the first time, in which case there is no
previous tag to bound the pull request range. The tool includes the full history
rather than failing, because a maintainer running this for the first time is
exactly the user with the most work to save.

WHEN a release tag is pushed and no earlier tag exists in the repository, THE
SYSTEM SHALL include every pull request merged into the default branch before
that tag, in the same grouped format as an incremental release.

WHEN a release tag is pushed and no earlier tag exists and the repository
contains no merged pull requests, THE SYSTEM SHALL emit a changelog containing
the tag heading and the line "No changes recorded." and exit zero.

Edge cases:
- Merge commits that do not correspond to a pull request are excluded, not
  counted as untitled entries.
- The full-history scan is bounded by the non-functional limit in NFR-2; beyond
  it, the tool reports the truncation in the output rather than silently
  dropping entries.
```

Why the good version costs the implementer nothing to interpret:

- Two criteria, because there are two observable behaviours: the normal
  first-release case and the empty repository. Each is separately testable and
  separately verifiable.
- The empty case names the exact output and the exit code. Without that, the
  generic default is an empty file and exit zero, which reads as a silent
  failure to the user.
- The context sentence explains why the decision went this way. When the
  implementer hits a tension between this requirement and another, the "why"
  tells it which way to resolve it.
- The edge cases are the ones where the generic default would be wrong. Merge
  commits without a pull request would otherwise become blank entries. The
  truncation case would otherwise silently drop data.
- No adjectives, no motivation, no performance target smuggled in — the limit
  lives in the non-functional section and is referenced by name.

**The re-read test.** Before you move on from a requirement block, read it as the
literal builder: what is the laziest implementation that satisfies every sentence
here? For the good version, the laziest implementation is correct. For the bad
version, the laziest implementation prints nothing and exits zero.
</requirements_worked_example>
