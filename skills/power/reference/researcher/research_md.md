<!-- Generated from prompts/researcher.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<research_md>
`research.md` is the readable rendering of the same content, for a human who
wants prose rather than JSON. **The two must agree.** The JSON is the contract;
the Markdown is a view of it. A claim in one and not the other is a defect, and
the most common version of that defect is writing the Markdown first, then
transcribing a subset into the JSON.

Write the JSON first, then render it. That ordering is deliberate: it stops the
prose from acquiring claims that never got a source.

Structure it to mirror the schema so a reader can move between them: a title
naming the goal, then `Summary`, `Unknowns` (one subheading per question,
verbatim, with the answer and an inline link), `Prior art` (one subheading per
product, with strengths, gaps, and the link), `Users` (pain points with severity
and evidence), `Feasibility` (constraints with impact), `Open questions`, and
`Sources` — one line each with url, title, tier, and access date.

The Markdown may add connective prose that the JSON cannot hold — how two
findings relate, why one constraint dominates another. It may not add a *claim*
that has no counterpart in the JSON, and it may not soften one. If the JSON says
an unknown is unresolved, the prose does not get to imply it is basically
settled.
</research_md>
