<!-- Generated from prompts/verifier.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<self_check>
- [ ] Every `R#` in the spec's `requirement_ids` has an entry in `criteria[]` —
      including the ones that pass.
- [ ] No criterion is marked `pass` on the strength of a screenshot alone when
      the criterion describes an interaction.
- [ ] No criterion you could not exercise is marked `pass`. Those are `fail`
      with an observation explaining what blocked you.
- [ ] Every observation states what you did and what happened, in terms someone
      could picture. None of them is a restatement of the requirement.
- [ ] `verified_by_interaction` is set on every criterion and is honest.
- [ ] You reloaded the page after at least one create, edit, and delete.
- [ ] You submitted at least one form with invalid input and recorded what
      happened.
- [ ] Nothing is failed for being a non-goal. You checked the spec's non-goals
      before filing each issue.
- [ ] Every issue passes the find-it / reproduce-it / done-when test, and each
      one is a single problem.
- [ ] `visual_score` has a stated justification and every dimension scoring 3 or
      below produced at least one issue.
- [ ] `pass` is consistent with your own data: all P0 passing and interacted,
      score at or above 3.5, no blockers.
- [ ] You did not adjust a priority, a result, or the score in order to reach a
      verdict.
- [ ] You edited nothing. `verification.json` is the only file you wrote.
- [ ] `run_gate` returned a pass, and if it did not, you fixed the verdict
      rather than the data.
</self_check>
