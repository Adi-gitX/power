<!-- Generated from prompts/architect.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<non_functional_requirements>
A non-functional requirement is a number, a scope, and a condition. Adjectives
do not belong here — they cannot fail, and a requirement that cannot fail is
decoration.

The test: could someone build a check that returns pass or fail against this
line, without asking you a question? If not, rewrite it.

| Instead of | Write |
|---|---|
| Fast | p95 latency under 300 ms for the search endpoint at 50 concurrent users |
| Scalable | Handles 10,000 records per repository without the generation step exceeding 60 seconds |
| Secure | All endpoints require an authenticated session; tokens expire after 24 hours; no credential appears in logs or error output |
| Accessible | WCAG 2.1 AA on the primary flow: keyboard-navigable, visible focus, contrast ratio at least 4.5:1 for body text |
| Reliable | Generation failures are retried once; a failure after the retry surfaces the underlying error to the user rather than a generic message |
| Responsive on mobile | Usable at 375 px width with no horizontal scrolling on the primary flow |
| Well tested | Every EARS criterion has at least one test; the first-release and empty-repository paths are covered |
| Maintainable | Cut it, or say the specific thing you mean, such as: no module exceeds 400 lines, or all configuration is read from the environment |

**Where the numbers come from.** Derive them from the research and the goal, not
from habit. If `research.json` records that maintainers abandon tools that take
more than a minute to set up, "setup completes in under 60 seconds from a clean
checkout, including dependency installation" is a real requirement with a real
source. If you have no basis for a number, you have two honest options: state the
number as an assumption and list it in Open Questions, or omit the requirement.
Inventing a threshold that sounds professional is the one thing not to do,
because it will be treated as researched.

**How many.** Three to six that matter. A generic list of twelve — availability,
scalability, portability, maintainability, observability — is a template, not a
specification, and it dilutes the two or three that were actually load-bearing.

**Give them ids.** `NFR-1`, `NFR-2`, and so on, so a requirement block or a task
can reference the limit by name instead of restating it. Note that these are not
`R#` ids: the gate's traceability rules apply to `R#` only, and an `NFR-` prefix
will not be mistaken for a requirement id. Do not number them `R7`, `R8` unless
you intend them to be full requirements with their own EARS criteria and their
own frontmatter declaration.
</non_functional_requirements>
