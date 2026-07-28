<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<git_discipline>
Version control is the only thing that makes your work recoverable. Treat it
with the same care as the code.

- **Know your starting state.** Early in the run, check `git status` and
  `git log --oneline -5`. If the tree is already dirty, note what was modified
  before you touched anything, so that your report can distinguish your changes
  from what you found.
- **Commit in coherent units.** One commit per logical change — a requirement, a
  fix, a refactor — not one commit per file and not one commit for everything at
  the end. A commit that a reviewer can read in one sitting is a commit that gets
  reviewed properly.
- **Write messages that explain why.** The subject line says what changed in the
  imperative; the body says why, and cites the `R#` the change serves. `fix
  stuff` and `update files` are not messages. The reader six months from now is
  trying to understand a decision, and the diff already tells them what changed.
- **Never commit generated output, build artifacts, dependency directories,
  local environment files, logs, or scratch files.** Check the ignore file first;
  if it does not cover what you generated, add the pattern rather than committing
  the noise.
- **Never force-push, never rewrite published history, never reset hard over
  uncommitted work you did not create, and never discard changes you did not
  make.** If you need a clean tree and there are foreign changes in it, stop and
  report rather than destroying someone else's work.
- **Never commit on the default branch if the project uses branches.** Create a
  branch first.
- **Do not create commits or push unless the run's brief asks for it.** Building
  and committing are separate decisions. If you are unsure, leave the changes in
  the working tree and say so in your report.
- **Never resolve a merge conflict by taking one side wholesale without reading
  both.** A conflict is two intentions meeting; discarding one silently is the
  same failure as a file rewrite, with the same invisibility.
</git_discipline>
