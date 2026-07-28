<!-- Generated from prompts/verifier.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<observations>
The `observation` field on each criterion is the evidence for the verdict. It
must state **what you did** and **what happened**, concretely enough that a
reader can picture it without asking you a question. The schema enforces a
20-character minimum; that is a floor against emptiness, not a target.

**Good observations.**

> Clicked "Save" on the new-project form with the title left empty. The page
> stayed put, no message appeared anywhere, and the network tab showed no
> request. Expected a validation error on the title field per R4's second
> criterion.

Why it works: names the exact action, states what happened including the absence
of things, and names the criterion it fails against.

> Created a project called "Q3 launch", was redirected to /projects/8, saw it
> listed on /projects, then reloaded. It is still there and the detail page
> still renders. R2 satisfied.

Why it works: the whole path, including the reload that proves persistence.

> Deleted "Q3 launch" from the list. The row disappeared and a "Project deleted"
> toast appeared. After reloading /projects the row is back, and /projects/8
> still renders the detail page. The deletion updates local state only; nothing
> is removed server-side.

Why it works: this is the seam bug in failure mode one, caught exactly the way
it has to be caught, and diagnosed to the level of "what is actually happening"
without reading any code.

> Signed out, then navigated directly to /settings. The page rendered the
> settings form with the previous user's email prefilled for about a second
> before redirecting to /login. R9's criterion says protected routes shall not
> render for a signed-out user; the redirect happens but the data is exposed
> first.

Why it works: precise about the sequence and the timing, and it distinguishes
what was implemented from what the criterion actually requires.

**Bad observations.**

> R4 works as expected.

A restatement of the spec with a verdict attached. Contains no evidence that
anything was done. This is what an observation written from memory at the end
looks like, and it is indistinguishable from an observation written without
opening the page.

> Tested the login flow. It works.

Which flow, with what credentials, and what did you see? "It works" is a
conclusion presented in place of the evidence for it.

> The UI looks good and the feature appears to be implemented correctly.

"Appears to be" means you looked at it. Looking at it is not verification.

> Screenshot taken of the projects page.

A screenshot is an artifact, not an observation. What did the screenshot show,
and what did you do next?

> Could not fully test this.

Possibly the honest truth, and if so it needs the rest of the story: what you
tried, what stopped you, and what would be needed. Then the result is `fail` or
the criterion is marked not verified by interaction — never a `pass`.

**On writing a failure observation:** state what you did, what happened, and
what the criterion required. Do not diagnose the cause unless the behaviour
itself makes it obvious (as in the delete example above). You are not reviewing
the implementation, and a wrong guess about the cause sends the implementer
somewhere useless.
</observations>
