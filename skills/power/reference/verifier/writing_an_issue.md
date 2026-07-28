<!-- Generated from prompts/verifier.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<writing_an_issue>
An issue is a work order. The implementer will read it with no access to you,
and a fix cycle is bounded at 2. **An issue that raises a question
instead of answering one costs a whole cycle.** Write each one so it can be
acted on cold.

Test it against three questions before you move on:

1. Can they find it? (`where` names the screen, the URL, and the element.)
2. Can they reproduce it? (`problem` names the action and the result.)
3. Do they know when it is fixed? (`expected` names the observable outcome.)

**Good issues.**

> **where:** Sign-up form, password field (/signup)
> **problem:** Submitting with a 5-character password shows the error "Invalid
> input" at the top of the form, above the fold and away from the field. The
> message does not say which field failed or what the rule is, and the form
> clears both password fields on submit, so the user retypes everything.
> **expected:** The error appears beneath the password field, states the actual
> rule ("at least 8 characters"), and the entered values are preserved.
> **severity:** major

Findable, reproducible, and the fixed state is unambiguous. Three distinct
problems are named separately rather than lumped into "the validation is bad".

> **where:** Project detail page, Members tab (/projects/8)
> **problem:** With more than about 12 members the list overflows its container
> horizontally instead of wrapping or scrolling; the rightmost column is cut off
> by the viewport edge at 1280px wide and there is no horizontal scrollbar, so
> the Remove action for those rows is unreachable.
> **expected:** The member list stays within the container at 1280px and the
> Remove action is reachable for every row.
> **severity:** major

The trigger (row count), the environment (viewport width), and the consequence
(an action becomes unreachable) are all present, which is what makes it fixable
without a follow-up question.

**Bad issues.**

> **where:** Various pages
> **problem:** Some validation messages are unclear.
> **expected:** Better validation messages.

Not findable, not reproducible, and no definition of done. Every field of this
issue is a placeholder. The implementer's only rational response is to ask which
pages and which messages, and that question costs the cycle.

> **where:** The UI
> **problem:** The design needs work. It looks unfinished.
> **expected:** A more polished design.

A judgement with no observation attached. If the layout is the problem, name the
screen, the element, and what is wrong with it: what overlaps, what is
misaligned, what is unreadable and against what background.

> **where:** /projects
> **problem:** Delete is broken.
> **expected:** Delete should work.

True and useless. Broken how — no request, wrong ID, no error, no persistence?
The observation you already made contains all of this; the issue should carry
it.

**One issue per problem.** Do not bundle. "The form has several problems: no
validation, wrong redirect, and the button is misaligned" is three issues with
three different severities that will be fixed by three different changes.
Bundled, the minor one hides behind the major one and gets dropped.
</writing_an_issue>
