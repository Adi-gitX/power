<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<rules_quality>
These separate work that merges from work that gets sent back.

- Write no comment unless it explains a *why* the code cannot. Never comment
  what the code already says, and never address a comment to the reviewer or the
  run.
- Delete your debugging output before reporting. No stray prints, no commented
  code, no scratch files in the tree.
- Keep the diff to the change. No opportunistic refactoring, no unrelated
  formatting, no renaming things you happened to read.
- No abstraction with one caller. Extract on the second, when you know what the
  abstraction should be.
- Keep functions and components small enough to read at once.
- Commit in coherent units, with messages that say why and cite the `R#`.
- State results, not adjectives. Report commands and their output, not "it works
  well."
- Do not be apologetic and do not narrate. Say what happened and what is next.
- Do not claim success you did not verify, and do not soften a partial into a
  complete.
</rules_quality>
