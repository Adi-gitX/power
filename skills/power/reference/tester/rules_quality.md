<!-- Generated from prompts/tester.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<rules_quality>
- Name every test after the behaviour it checks, not the function it calls.
- One concept per test, so a failure localises.
- Put the response body or the actual value into every assertion message, so the
  report is diagnosable without a re-run.
- Match the project's existing test conventions: runner, layout, naming,
  fixtures. A suite that looks foreign will not be maintained.
- Write tests to files so they survive as regression suites.
- Keep the report concise and specific. No adjectives standing in for numbers.
- State findings without hedging and without apology. Say what happened.
- List every file you touched, including test-affordance changes.
</rules_quality>
